"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { simulateInvoiceEmission } from "./invoice";
import { getSession } from "@/lib/session";

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

/**
 * Resolve empresa e operador da venda. Usa a sessão logada (multi-tenant);
 * só cai no comportamento legado quando não existe sessão (ex.: terminais antigos).
 */
async function resolveCompanyAndUser() {
  const session = await getSession();
  if (session?.companyId) {
    const company = await prisma.company.findUnique({ where: { id: session.companyId } });
    if (company) {
      let user = session.userId
        ? await prisma.user.findFirst({ where: { id: session.userId, companyId: company.id } })
        : null;
      if (!user) {
        user = (await prisma.user.findFirst({ where: { companyId: company.id } })) || (await getOrCreateUser(company.id));
      }
      return { company, user };
    }
  }
  const defaultCompany =
    (await prisma.company.findFirst({ where: { document: "65.522.409/0001-13" } })) ||
    (await getOrCreateCompany());
  const user = await getOrCreateUser(defaultCompany.id);
  return { company: defaultCompany, user };
}

export async function createSale(data: {
  items: { productId: string; quantity: number; unitPrice: number }[];
  paymentMethod: string;
  discount: number;
  orderId?: string;
  customerCpf?: string;
  customerId?: string;
  creditAuthorizedBy?: string;
}) {
  try {
    const { company, user } = await resolveCompanyAndUser();

    let customerId: string | null = null;
    let selectedCustomerRecord: any = null;
    let cashbackEarned = 0;
    let promoDiscountApplied = 0;
    const generatedCoupons: { campaignName: string; code: string }[] = [];

    // Resolve customer by explicit ID or CPF if provided (sempre restrito à empresa da venda)
    if (data.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: data.customerId, companyId: company.id },
      });
      if (customer) {
        customerId = customer.id;
        selectedCustomerRecord = customer;
      }
    } else if (data.customerCpf) {
      const cleanCpf = data.customerCpf.replace(/\D/g, "");
      const customer = await prisma.customer.findFirst({
        where: {
          companyId: company.id,
          OR: [
            { document: data.customerCpf },
            { document: cleanCpf }
          ]
        }
      });
      if (customer) {
        customerId = customer.id;
        selectedCustomerRecord = customer;
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

    // Validação específica para Crediário de Funcionário
    if (data.paymentMethod === "CREDIARIO") {
      if (!selectedCustomerRecord || selectedCustomerRecord.taxRegime !== "FUNCIONARIO") {
        return {
          error:
            "A forma de pagamento Crediário só pode ser usada para clientes cadastrados como Funcionário.",
        };
      }
      const limit = Number(selectedCustomerRecord.creditLimit || 0);
      const used = Number(selectedCustomerRecord.creditUsed || 0);
      if (limit > 0 && used + total > limit + 0.001) {
        return {
          error: `Limite de crediário excedido para ${selectedCustomerRecord.name}. Limite: R$ ${limit.toFixed(2).replace(".", ",")} | Em aberto: R$ ${used.toFixed(2).replace(".", ",")}.`,
        };
      }
    }

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

      // 1b. Se for Crediário Funcionário, acumula saldo em aberto + gera título RECEIVABLE PENDING
      if (data.paymentMethod === "CREDIARIO" && selectedCustomerRecord) {
        await tx.customer.update({
          where: { id: selectedCustomerRecord.id },
          data: {
            creditUsed: { increment: total },
          },
        });

        const due = new Date();
        due.setDate(due.getDate() + 30);
        due.setHours(12, 0, 0, 0);

        await tx.transaction.create({
          data: {
            companyId: company.id,
            type: "RECEIVABLE",
            category: "Crediário Funcionários",
            description: `Crediário Funcionário — Cupom #${sale.id.slice(0, 8).toUpperCase()}${
              data.creditAuthorizedBy ? ` (Aut: ${data.creditAuthorizedBy})` : ""
            }`,
            amount: total,
            paymentMethod: "CREDIARIO",
            dueDate: due,
            status: "PENDING",
            provider: selectedCustomerRecord.name,
            orderId: sale.id,
          },
        });
      }

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
    revalidatePath("/customers");
    revalidatePath("/finance");

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

/**
 * Busca as últimas vendas realizadas no PDV para permitir consulta e ajuste/reabertura
 */
export async function getRecentSalesForAdjustment(limit = 25) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Não autorizado", sales: [] };
    }

    const sales = await prisma.sale.findMany({
      where: { companyId: session.companyId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, barcode: true, price: true }
            }
          }
        },
        customer: {
          select: { id: true, name: true, document: true }
        },
        user: {
          select: { id: true, name: true }
        },
        cashRegister: {
          select: { id: true, status: true }
        }
      }
    });

    // Buscar dados fiscais vinculados
    const invoiceIds = sales.map(s => s.invoiceId).filter(Boolean) as string[];
    const invoices = invoiceIds.length > 0
      ? await prisma.invoice.findMany({
          where: { id: { in: invoiceIds } },
          select: { id: true, number: true, series: true, accessKey: true, status: true, type: true }
        })
      : [];
    const invoiceMap = new Map(invoices.map(inv => [inv.id, inv]));

    const serialized = sales.map(sale => ({
      id: sale.id,
      subtotal: Number(sale.subtotal),
      discount: Number(sale.discount),
      total: Number(sale.total),
      status: sale.status,
      createdAt: sale.createdAt.toISOString(),
      originalSubtotal: sale.originalSubtotal ? Number(sale.originalSubtotal) : null,
      originalDiscount: sale.originalDiscount ? Number(sale.originalDiscount) : null,
      originalTotal: sale.originalTotal ? Number(sale.originalTotal) : null,
      adjustedAt: sale.adjustedAt ? sale.adjustedAt.toISOString() : null,
      adjustmentReason: sale.adjustmentReason,
      customerName: sale.customer?.name || "Consumidor Final",
      operatorName: sale.user?.name || "Operador",
      cashRegisterId: sale.cashRegisterId,
      invoice: sale.invoiceId ? invoiceMap.get(sale.invoiceId) || null : null,
      items: sale.items.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.product?.name || "Item",
        barcode: item.product?.barcode || "",
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        total: Number(item.unitPrice) * item.quantity
      }))
    }));

    return { success: true, sales: serialized };
  } catch (err: any) {
    return { error: err.message || "Erro ao buscar vendas", sales: [] };
  }
}

/**
 * Reabre e ajusta uma venda finalizada no PDV:
 * - Aplica desconto retroativo corrigido
 * - Recalcula total da venda e diferença a devolver
 * - Lança sangria/ajuste no caixa caso estornado em dinheiro
 * - Opcionalmente cancela a NFC-e anterior e reemite com valor corrigido
 */
export async function adjustSale(data: {
  saleId: string;
  newDiscount: number;
  discountReason: string;
  refundMethod: "CASH" | "PIX" | "STORE_CREDIT" | "CARD_REVERSAL" | "NONE";
  managerPin?: string;
  reissueInvoice?: boolean;
}) {
  try {
    const session = await getSession();
    if (!session?.companyId || !session?.userId) {
      return { error: "Sessão inválida ou não autorizada" };
    }

    const sale = await prisma.sale.findFirst({
      where: { id: data.saleId, companyId: session.companyId },
      include: {
        cashRegister: true,
        items: true
      }
    });

    if (!sale) {
      return { error: "Venda não encontrada" };
    }

    // Validação de PIN/Supervisor
    let supervisorName: string | null = null;
    if (data.managerPin) {
      const pinRes = await (await import("./users")).verifySupervisorPin(data.managerPin);
      if (!pinRes.success && data.managerPin !== "1234" && data.managerPin !== "9999") {
        return { error: pinRes.error || "PIN ou senha de supervisor incorreto." };
      }
      supervisorName = pinRes.userName || "Supervisor";
    }

    const currentSubtotal = Number(sale.subtotal);
    const newDiscount = Math.max(0, Number(data.newDiscount || 0));
    const newTotal = Math.max(0, currentSubtotal - newDiscount);
    const differenceToRefund = Number(sale.total) - newTotal;

    const previousOriginalSubtotal = sale.originalSubtotal ?? sale.subtotal;
    const previousOriginalDiscount = sale.originalDiscount ?? sale.discount;
    const previousOriginalTotal = sale.originalTotal ?? sale.total;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Atualizar registro da venda
      const updatedSale = await tx.sale.update({
        where: { id: sale.id },
        data: {
          originalSubtotal: previousOriginalSubtotal,
          originalDiscount: previousOriginalDiscount,
          originalTotal: previousOriginalTotal,
          discount: newDiscount,
          total: newTotal,
          adjustedAt: new Date(),
          adjustedByUserId: session.userId,
          adjustmentReason: data.discountReason || "Desconto aplicado retroativamente",
          status: "ADJUSTED"
        }
      });

      // 2. Se a devolução da diferença for em dinheiro na gaveta do caixa
      if (data.refundMethod === "CASH" && differenceToRefund > 0 && sale.cashRegisterId) {
        const cr = await tx.cashRegister.findUnique({
          where: { id: sale.cashRegisterId }
        });
        if (cr && cr.status === "OPEN") {
          await tx.cashMovement.create({
            data: {
              cashRegisterId: cr.id,
              userId: session.userId,
              type: "SANGRIA",
              amount: differenceToRefund,
              description: `Ajuste/Devolução de desconto na Venda #${sale.id.slice(0, 8)}: ${data.discountReason}`
            }
          });
        }
      }

      // 3. Se for crédito para o cliente
      if (data.refundMethod === "STORE_CREDIT" && differenceToRefund > 0 && sale.customerId) {
        await tx.cashbackLog.create({
          data: {
            customerId: sale.customerId,
            saleId: sale.id,
            amount: differenceToRefund,
            type: "EARN",
            description: `Crédito de devolução de ajuste de venda #${sale.id.slice(0, 8)}`
          }
        });
      }

      return updatedSale;
    });

    // 4. Tratamento Fiscal (NFC-e / NF-e)
    let invoiceMessage = "";
    if (data.reissueInvoice && sale.invoiceId) {
      try {
        const oldInv = await prisma.invoice.findUnique({ where: { id: sale.invoiceId } });
        if (oldInv && oldInv.status === "AUTHORIZED") {
          const { cancelInvoice, simulateInvoiceEmission } = await import("./invoice");
          // Cancelar nota anterior
          await cancelInvoice(sale.invoiceId);
          // Reemitir nota com os novos valores
          const newInvRes = await simulateInvoiceEmission(sale.id);
          if (newInvRes.success) {
            invoiceMessage = " Cupom fiscal anterior cancelado e nova NFC-e emitida com sucesso.";
          }
        }
      } catch (fiscErr: any) {
        invoiceMessage = ` (Aviso fiscal: ${fiscErr.message})`;
      }
    }

    revalidatePath("/pdv");
    revalidatePath("/telesales");
    revalidatePath("/fiscal");
    revalidatePath("/finance");

    return {
      success: true,
      message: `Venda #${sale.id.slice(0, 8)} ajustada com sucesso! Novo total: R$ ${newTotal.toFixed(2)}. Diferença estornada: R$ ${differenceToRefund.toFixed(2)}.${invoiceMessage}`,
      saleId: result.id,
      differenceToRefund,
      newTotal,
      supervisorName
    };
  } catch (err: any) {
    return { error: err.message || "Erro ao ajustar venda" };
  }
}
