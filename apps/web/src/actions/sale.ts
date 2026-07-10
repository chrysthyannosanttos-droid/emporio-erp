"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { simulateInvoiceEmission } from "./invoice";

async function getOrCreateCompany() {
  let company = await prisma.company.findFirst();
  if (!company) {
    company = await prisma.company.create({
      data: { name: "Emporio Default", document: "00.000.000/0001-00" }
    });
  }
  return company;
}

async function getOrCreateUser(companyId: string) {
  let user = await prisma.user.findFirst({ where: { companyId } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: "Operador Padrão",
        email: "caixa@emporio.com",
        password: "password",
        role: "OPERATOR",
        companyId
      }
    });
  }
  return user;
}

export async function createSale(data: {
  items: { productId: string; quantity: number; unitPrice: number }[];
  paymentMethod: string;
  discount: number;
  orderId?: string;
  customerCpf?: string;
}) {
  try {
    const company = await getOrCreateCompany();
    const user = await getOrCreateUser(company.id);

    let customerId: string | null = null;
    let cashbackEarned = 0;
    let promoDiscountApplied = 0;
    const generatedCoupons: { campaignName: string; code: string }[] = [];

    // Find customer by CPF if provided
    if (data.customerCpf) {
      const cleanCpf = data.customerCpf.replace(/\D/g, "");
      const customer = await prisma.customer.findFirst({
        where: {
          OR: [
            { document: data.customerCpf },
            { document: cleanCpf }
          ]
        }
      });
      if (customer) {
        customerId = customer.id;
      }
    }

    let subtotal = data.items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);

    // Evaluate CRM campaigns if customer is identified OR for anyone if product-specific
    const now = new Date();
    const activeCampaigns = await prisma.campaign.findMany({
      where: {
        active: true,
        companyId: company.id,
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: now } }
        ]
      },
      include: {
        product: true
      }
    });

    for (const camp of activeCampaigns) {
      let rules: any = null;
      try {
        rules = camp.rules ? JSON.parse(camp.rules) : null;
      } catch (_) {}

      if (!rules) continue;

      // Check if product matches
      let matches = false;
      let matchedQty = 0;
      let matchedValue = 0;

      if (rules.productIds && Array.isArray(rules.productIds) && rules.productIds.length > 0) {
        const matchingItems = data.items.filter(i => rules.productIds.includes(i.productId));
        if (matchingItems.length > 0) {
          matches = true;
          matchedQty = matchingItems.reduce((acc, i) => acc + i.quantity, 0);
          matchedValue = matchingItems.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0);
        }
      } else if (camp.productId) {
        const item = data.items.find(i => i.productId === camp.productId);
        if (item) {
          matches = true;
          matchedQty = item.quantity;
          matchedValue = item.quantity * item.unitPrice;
        }
      } else {
        // General campaign matches whole cart
        matches = true;
        matchedQty = data.items.reduce((acc, i) => acc + i.quantity, 0);
        matchedValue = subtotal;
      }

      if (!matches) continue;

      // Check Activation Rule (Quantity or Amount)
      let rulePassed = false;
      if (rules.ruleType === "QTY") {
        if (matchedQty >= (rules.minQty || 1)) {
          rulePassed = true;
        }
      } else if (rules.ruleType === "AMT") {
        if (matchedValue >= (rules.minAmount || 0)) {
          rulePassed = true;
        }
      }

      if (rulePassed) {
        if (camp.type === "DISCOUNT" && rules.discountValue > 0) {
          // Direct instant discount
          promoDiscountApplied += rules.discountValue;
        } else if (camp.type === "CASHBACK" && rules.cashbackPercent > 0 && customerId) {
          // Cashback calculation
          cashbackEarned += (matchedValue * rules.cashbackPercent) / 100;
        } else if (camp.type === "BOGO" && rules.buyQty && rules.payQty) {
          // Calculate BOGO discount (cheapest matching items are free)
          const matchingCartItems = data.items.filter(i => {
            if (rules.productIds && Array.isArray(rules.productIds) && rules.productIds.length > 0) {
              return rules.productIds.includes(i.productId);
            }
            return i.productId === camp.productId;
          });

          const units: number[] = [];
          for (const item of matchingCartItems) {
            for (let k = 0; k < item.quantity; k++) {
              units.push(item.unitPrice);
            }
          }

          units.sort((a, b) => a - b);
          const freeCount = Math.floor(units.length / rules.buyQty) * (rules.buyQty - rules.payQty);
          
          for (let k = 0; k < freeCount; k++) {
            promoDiscountApplied += units[k];
          }
        } else if (camp.type === "PROMO") {
          // General Promotion (applies to all customers, no CPF required)
          if (rules.promoType === "DISCOUNT_FIXED" && rules.discountValue > 0) {
            promoDiscountApplied += rules.discountValue;
          } else if (rules.promoType === "DISCOUNT_PERCENT" && rules.discountPercent > 0) {
            promoDiscountApplied += (matchedValue * rules.discountPercent) / 100;
          } else if (rules.promoType === "BOGO" && rules.buyQty && rules.payQty) {
            const matchingCartItems = data.items.filter(i => {
              if (rules.productIds && Array.isArray(rules.productIds) && rules.productIds.length > 0) {
                return rules.productIds.includes(i.productId);
              }
              return i.productId === camp.productId;
            });

            const units: number[] = [];
            for (const item of matchingCartItems) {
              for (let k = 0; k < item.quantity; k++) {
                units.push(item.unitPrice);
              }
            }

            units.sort((a, b) => a - b);
            const freeCount = Math.floor(units.length / rules.buyQty) * (rules.buyQty - rules.payQty);
            
            for (let k = 0; k < freeCount; k++) {
              promoDiscountApplied += units[k];
            }
          }
        } else if (camp.type === "RAFFLE" && customerId) {
          // Lucky Coupon Generation
          const code = "LUCKY-" + Math.floor(100000 + Math.random() * 900000);
          generatedCoupons.push({
            campaignName: camp.name,
            code
          });
        }
      }
    }

    const finalDiscount = data.discount + promoDiscountApplied;
    const total = Math.max(0, subtotal - finalDiscount);

    // Start a transaction to ensure atomic updates
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the Sale
      const sale = await tx.sale.create({
        data: {
          subtotal,
          discount: finalDiscount,
          total,
          status: "COMPLETED",
          userId: user.id,
          customerId,
          companyId: company.id,
          orderId: data.orderId || null,
          items: {
            create: data.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.quantity * item.unitPrice,
            }))
          },
          payments: {
            create: {
              amount: total,
              paymentMethod: data.paymentMethod,
            }
          }
        }
      });

      // 2. Decrement stock for each product
      for (const item of data.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity
            }
          }
        });
      }

      // 3. If linked to an order, update the status
      if (data.orderId) {
        await tx.order.update({
          where: { id: data.orderId },
          data: { status: "INVOICED" }
        });
      }

      // 4. Update Customer Cashback/Logs
      if (customerId) {
        if (cashbackEarned > 0) {
          await tx.customer.update({
            where: { id: customerId },
            data: {
              cashbackBalance: {
                increment: cashbackEarned
              }
            }
          });

          await tx.cashbackLog.create({
            data: {
              amount: cashbackEarned,
              type: "EARN",
              description: `Campanha cashback`,
              customerId,
              saleId: sale.id
            }
          });
        }

        // 5. Create Lucky Coupons in DB
        for (const coup of generatedCoupons) {
          const campObj = activeCampaigns.find(c => c.name === coup.campaignName);
          if (campObj) {
            await tx.luckyCoupon.create({
              data: {
                code: coup.code,
                campaignId: campObj.id,
                customerId,
                companyId: company.id
              }
            });
          }
        }
      }

      return sale;
    });

    // 6. Simulate Fiscal Invoice Emission
    try {
      await simulateInvoiceEmission(result.id);
    } catch (fiscErr) {
      console.error("Falha ao simular nota fiscal:", fiscErr);
    }

    revalidatePath("/stock");
    revalidatePath("/telesales");
    revalidatePath("/pdv");
    revalidatePath("/crm");

    return { 
      success: true, 
      saleId: result.id, 
      cashbackEarned, 
      promoDiscountApplied, 
      generatedCoupons 
    };
  } catch (err: any) {
    return { error: err.message || "Erro ao realizar venda" };
  }
}
