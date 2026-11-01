"use server";

import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function setupDemonstrativoAndCleanReal(companyIdParam?: string) {
  try {
    let currentCompanyId = companyIdParam;
    if (!currentCompanyId) {
      const session = await getSession();
      currentCompanyId = session?.companyId;
    }

    if (!currentCompanyId) {
      const firstComp = await prisma.company.findFirst({
        where: {
          NOT: { name: { contains: "Demonstrativo", mode: "insensitive" } }
        },
        orderBy: { createdAt: "asc" }
      });
      currentCompanyId = firstComp?.id;
    }

    if (!currentCompanyId) {
      return { success: false, error: "Nenhuma empresa localizada para manutenção." };
    }

    const currentCompany = await prisma.company.findUnique({
      where: { id: currentCompanyId },
      include: { stores: true }
    });

    if (!currentCompany) {
      return { success: false, error: "Empresa atual não encontrada." };
    }

    // 1. Obter ou criar a Empresa Demonstrativa
    let demoCompany = await prisma.company.findFirst({
      where: {
        OR: [
          { document: "00000000000199" },
          { name: { contains: "Demonstrativo", mode: "insensitive" } },
        ]
      }
    });

    if (!demoCompany) {
      const expDate = new Date();
      expDate.setFullYear(expDate.getFullYear() + 10);

      demoCompany = await prisma.company.create({
        data: {
          name: "Cybertech RP - Modo Demonstrativo",
          document: "00000000000199",
          licenseStatus: "ACTIVE",
          licenseExpiresAt: expDate,
          operationTypes: currentCompany.operationTypes || "[\"RETAIL\"]",
          activeModules: currentCompany.activeModules || "[]",
          segment: currentCompany.segment || "SUPERMARKET",
        }
      });
    }

    // 2. Garantir Loja Matriz para a Empresa Demonstrativa
    let demoStore = await prisma.store.findFirst({
      where: { companyId: demoCompany.id }
    });
    if (!demoStore) {
      demoStore = await prisma.store.create({
        data: {
          companyId: demoCompany.id,
          code: "LJ01",
          name: "Loja Matriz (Demonstração)",
          tradeName: "Supermercado Demo",
        }
      });
    }

    // 3. Obter ou criar o Usuário Demonstrativo (demonstrativo / 1234)
    const hashedPassword = await bcrypt.hash("1234", 10);
    let demoUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: "demonstrativo@emporio.com" },
          { name: { equals: "demonstrativo", mode: "insensitive" } },
        ]
      }
    });

    if (!demoUser) {
      demoUser = await prisma.user.create({
        data: {
          name: "demonstrativo",
          email: "demonstrativo@emporio.com",
          password: hashedPassword,
          pin: hashedPassword,
          role: "ADMIN",
          companyId: demoCompany.id,
          active: true,
        }
      });
    } else {
      demoUser = await prisma.user.update({
        where: { id: demoUser.id },
        data: {
          name: "demonstrativo",
          email: "demonstrativo@emporio.com",
          password: hashedPassword,
          pin: hashedPassword,
          role: "ADMIN",
          companyId: demoCompany.id,
          active: true,
        }
      });
    }

    // Vincular usuário demonstrativo à loja demo
    const existingUserStore = await prisma.userStore.findFirst({
      where: { userId: demoUser.id, storeId: demoStore.id }
    });
    if (!existingUserStore) {
      await prisma.userStore.create({
        data: {
          userId: demoUser.id,
          storeId: demoStore.id,
          isDefault: true,
        }
      }).catch(() => {});
    }

    // 4. Copiar dados fictícios da empresa atual para a empresa Demonstrativa (se a demo ainda não tiver produtos)
    const demoProductCount = await prisma.product.count({
      where: { companyId: demoCompany.id }
    });

    if (demoProductCount === 0 && currentCompanyId !== demoCompany.id) {
      // Copiar categorias
      const currentCategories = await prisma.category.findMany({
        where: { companyId: currentCompanyId }
      });
      const categoryMap = new Map<string, string>();
      for (const cat of currentCategories) {
        const newCat = await prisma.category.create({
          data: {
            name: cat.name,
            companyId: demoCompany.id,
          }
        });
        categoryMap.set(cat.id, newCat.id);
      }

      // Copiar produtos atuais para o demo
      const currentProducts = await prisma.product.findMany({
        where: { companyId: currentCompanyId }
      });

      for (const p of currentProducts) {
        await prisma.product.create({
          data: {
            companyId: demoCompany.id,
            name: p.name,
            barcode: p.barcode,
            internalCode: p.internalCode,
            price: p.price,
            cost: p.cost,
            stock: p.stock || 10,
            unit: p.unit || "UN",
            ncm: p.ncm,
            cest: p.cest,
            cfop: p.cfop,
            origin: p.origin,
            categoryId: p.categoryId ? categoryMap.get(p.categoryId) || null : null,
          }
        }).catch(() => {});
      }
    }

    // 5. LIMPEZA TOTAL DA EMPRESA REAL (currentCompanyId)
    let cleanedCounts = {
      sales: 0,
      cashRegisters: 0,
      losses: 0,
      products: 0,
      customers: 0,
    };

    if (currentCompanyId !== demoCompany.id) {
      // 5.1 Deletar Vendas e Itens
      await prisma.saleItem.deleteMany({
        where: { sale: { companyId: currentCompanyId } }
      });
      await prisma.salePayment.deleteMany({
        where: { sale: { companyId: currentCompanyId } }
      });
      const delSales = await prisma.sale.deleteMany({
        where: { companyId: currentCompanyId }
      });
      cleanedCounts.sales = delSales.count;

      // 5.2 Deletar Caixas e Movimentações
      await prisma.cashMovement.deleteMany({
        where: { register: { companyId: currentCompanyId } }
      });
      const delRegisters = await prisma.cashRegister.deleteMany({
        where: { companyId: currentCompanyId }
      });
      cleanedCounts.cashRegisters = delRegisters.count;

      // 5.3 Deletar Perdas e Movimentações de Estoque
      const delLosses = await prisma.loss.deleteMany({
        where: { companyId: currentCompanyId }
      });
      cleanedCounts.losses = delLosses.count;

      await prisma.stockEntryItem.deleteMany({
        where: { stockEntry: { companyId: currentCompanyId } }
      }).catch(() => {});
      await prisma.stockEntry.deleteMany({
        where: { companyId: currentCompanyId }
      }).catch(() => {});

      await prisma.orderItem.deleteMany({
        where: { order: { companyId: currentCompanyId } }
      }).catch(() => {});
      await prisma.order.deleteMany({
        where: { companyId: currentCompanyId }
      }).catch(() => {});

      await prisma.purchaseOrderItem.deleteMany({
        where: { purchaseOrder: { companyId: currentCompanyId } }
      }).catch(() => {});
      await prisma.purchaseOrder.deleteMany({
        where: { companyId: currentCompanyId }
      }).catch(() => {});

      await prisma.returnItem.deleteMany({
        where: { return: { companyId: currentCompanyId } }
      }).catch(() => {});
      await prisma.return.deleteMany({
        where: { companyId: currentCompanyId }
      }).catch(() => {});

      // 5.4 Deletar Produtos
      const delProducts = await prisma.product.deleteMany({
        where: { companyId: currentCompanyId }
      });
      cleanedCounts.products = delProducts.count;

      // 5.5 Deletar Clientes Fictícios
      const delCustomers = await prisma.customer.deleteMany({
        where: { companyId: currentCompanyId }
      });
      cleanedCounts.customers = delCustomers.count;

      // 5.6 Deletar Categorias Fictícias
      await prisma.category.deleteMany({
        where: { companyId: currentCompanyId }
      }).catch(() => {});
    }

    revalidatePath("/");
    revalidatePath("/pdv");
    revalidatePath("/inventory");
    revalidatePath("/sales");
    revalidatePath("/settings");

    return {
      success: true,
      demoAccount: {
        username: "demonstrativo",
        password: "1234",
        companyName: demoCompany.name,
      },
      cleaned: cleanedCounts,
      message: `Ambiente demonstrativo configurado com sucesso! Usuário 'demonstrativo' (senha '1234') criado. A conta real foi limpa (${cleanedCounts.products} produtos removidos, ${cleanedCounts.sales} vendas zeradas). Pronto para importar os dados reais do cliente.`,
    };
  } catch (err: any) {
    console.error("Erro na rotina de demonstração e limpeza:", err);
    return { success: false, error: err.message || "Erro desconhecido na manutenção." };
  }
}

