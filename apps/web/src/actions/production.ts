"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { resolveActiveCompany } from "@/lib/tenant";

async function resolveCompanyContext() {
  const session = await getSession();
  if (session?.companyId) {
    return {
      companyId: session.companyId,
      sessionUserId: session.userId || null,
    };
  }
  const company = await resolveActiveCompany();
  if (!company) {
    throw new Error("Empresa ativa não encontrada.");
  }
  return {
    companyId: company.id,
    sessionUserId: session?.userId || null,
  };
}

function serializeProductCompact(p: any) {
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    barcode: p.barcode || null,
    internalCode: p.internalCode || null,
    unit: p.unitSale || p.unit || "UN",
    price: Number(p.price || 0),
    cost: p.cost !== null && p.cost !== undefined ? Number(p.cost) : 0,
    stock: Number(p.stock || 0),
    minStock: Number(p.minStock || 0),
    isRawMaterial: Boolean(p.isRawMaterial),
    isPackaging: Boolean(p.isPackaging),
    isFinishedGood: Boolean(p.isFinishedGood),
    isSelfProduced: Boolean(p.isSelfProduced),
    active: p.active ?? true,
    scaleDays: p.scaleDays ?? 0,
    categoryId: p.categoryId || null,
    categoryName: p.category?.name || "Geral",
  };
}

function serializeRecipe(r: any) {
  return {
    id: r.id,
    productId: r.productId,
    yield: Number(r.yield || 1),
    instructions: r.instructions || null,
    companyId: r.companyId,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
    product: serializeProductCompact(r.product),
    items: (r.items || []).map((it: any) => ({
      id: it.id,
      recipeId: it.recipeId,
      productId: it.productId,
      quantity: Number(it.quantity || 0),
      unit: it.unit || it.product?.unit || "UN",
      itemRole: (it.itemRole === "PACKAGING" ? "PACKAGING" : "INGREDIENT") as
        | "INGREDIENT"
        | "PACKAGING",
      product: serializeProductCompact(it.product),
    })),
  };
}

function estimateLegacyLogCost(log: any): number {
  if (log.totalCost !== null && log.totalCost !== undefined) {
    return Number(log.totalCost);
  }
  const items = log.recipe?.items || [];
  const recipeYield = Number(log.recipe?.yield || 1) || 1;
  const factor = Number(log.quantityProduced || 0) / recipeYield;
  const sum = items.reduce((acc: number, it: any) => {
    return acc + Number(it.quantity || 0) * factor * Number(it.product?.cost ?? 0);
  }, 0);
  return Number(sum.toFixed(2));
}

function serializeProductionLog(l: any) {
  return {
    id: l.id,
    recipeId: l.recipeId,
    quantityProduced: Number(l.quantityProduced || 0),
    batchNumber: l.batchNumber || null,
    expirationDate: l.expirationDate ? new Date(l.expirationDate).toISOString() : null,
    totalCost: estimateLegacyLogCost(l),
    notes: l.notes || null,
    userId: l.userId,
    companyId: l.companyId,
    createdAt: l.createdAt instanceof Date ? l.createdAt.toISOString() : l.createdAt,
    recipe: l.recipe
      ? {
          id: l.recipe.id,
          productId: l.recipe.productId,
          yield: Number(l.recipe.yield || 1),
          product: serializeProductCompact(l.recipe.product),
        }
      : null,
    user: l.user
      ? {
          id: l.user.id,
          name: l.user.name,
          role: l.user.role,
          email: l.user.email,
        }
      : null,
  };
}

export async function getRecipes() {
  try {
    const { companyId } = await resolveCompanyContext();
    const recipes = await prisma.recipe.findMany({
      where: { companyId },
      include: {
        product: { include: { category: true } },
        items: {
          include: { product: { include: { category: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return { recipes: recipes.map(serializeRecipe) };
  } catch (err: any) {
    return { error: err.message || "Erro ao buscar receitas", recipes: [] };
  }
}

export async function getProductionLogs() {
  try {
    const { companyId } = await resolveCompanyContext();
    const logs = await prisma.productionLog.findMany({
      where: { companyId },
      include: {
        recipe: {
          include: {
            product: { include: { category: true } },
            items: { include: { product: true } },
          },
        },
        user: { select: { id: true, name: true, role: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return { logs: logs.map(serializeProductionLog) };
  } catch (err: any) {
    return { error: err.message || "Erro ao buscar logs de produção", logs: [] };
  }
}

export async function getProductionWorkspace() {
  try {
    const { companyId, sessionUserId } = await resolveCompanyContext();

    const [recipes, logs, users, products] = await Promise.all([
      prisma.recipe.findMany({
        where: { companyId },
        include: {
          product: { include: { category: true } },
          items: {
            include: { product: { include: { category: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.productionLog.findMany({
        where: { companyId },
        include: {
          recipe: {
            include: {
              product: { include: { category: true } },
              items: { include: { product: true } },
            },
          },
          user: { select: { id: true, name: true, role: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 150,
      }),
      prisma.user.findMany({
        where: { companyId, active: true },
        select: { id: true, name: true, role: true, email: true },
        orderBy: { name: "asc" },
      }),
      prisma.product.findMany({
        where: { companyId, active: true },
        include: { category: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return {
      success: true,
      currentUserId: sessionUserId,
      recipes: recipes.map(serializeRecipe),
      logs: logs.map(serializeProductionLog),
      users,
      ingredients: products.map(serializeProductCompact),
    };
  } catch (err: any) {
    console.error("Erro em getProductionWorkspace:", err);
    return {
      success: false,
      error: err.message || "Erro ao carregar workspace de produção.",
      currentUserId: null,
      recipes: [],
      logs: [],
      users: [],
      ingredients: [],
    };
  }
}

export async function saveRecipe(data: {
  productId: string;
  yieldAmount: number;
  instructions?: string | null;
  items: {
    productId: string;
    quantity: number;
    unit: string;
    itemRole?: "INGREDIENT" | "PACKAGING";
  }[];
}) {
  try {
    const { companyId } = await resolveCompanyContext();
    const yieldAmount = Number(data.yieldAmount);

    if (!data.productId) {
      return { error: "Selecione o produto acabado da ficha técnica." };
    }
    if (!Number.isFinite(yieldAmount) || yieldAmount <= 0) {
      return { error: "Informe um rendimento válido maior que zero." };
    }
    if (!Array.isArray(data.items) || data.items.length === 0) {
      return { error: "Adicione pelo menos um insumo ou embalagem na ficha técnica." };
    }

    const finishedProd = await prisma.product.findFirst({
      where: { id: data.productId, companyId },
      select: { id: true },
    });
    if (!finishedProd) {
      return { error: "Produto acabado não encontrado para esta empresa." };
    }

    const cleanItems = data.items
      .filter((it) => it.productId && Number(it.quantity) > 0 && it.productId !== data.productId)
      .map((it) => ({
        productId: it.productId,
        quantity: Number(it.quantity),
        unit: (it.unit || "UN").trim() || "UN",
        itemRole: (it.itemRole === "PACKAGING" ? "PACKAGING" : "INGREDIENT") as
          | "INGREDIENT"
          | "PACKAGING",
      }));

    if (cleanItems.length === 0) {
      return { error: "Informe ao menos um insumo/embalagem válido diferente do produto acabado." };
    }

    const itemProductIds = Array.from(new Set(cleanItems.map((i) => i.productId)));
    const validItemProducts = await prisma.product.findMany({
      where: { id: { in: itemProductIds }, companyId },
      select: { id: true, cost: true },
    });
    if (validItemProducts.length !== itemProductIds.length) {
      return { error: "Um ou mais insumos/embalagens não pertencem à empresa ativa." };
    }

    const costById = new Map(validItemProducts.map((p) => [p.id, Number(p.cost || 0)]));
    const totalRecipeCost = cleanItems.reduce(
      (acc, it) => acc + it.quantity * (costById.get(it.productId) || 0),
      0
    );
    const unitRecipeCost = Number((totalRecipeCost / yieldAmount).toFixed(4));

    const saved = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: finishedProd.id },
        data: {
          isSelfProduced: true,
          ...(unitRecipeCost > 0 ? { cost: unitRecipeCost } : {}),
        },
      });

      const existing = await tx.recipe.findUnique({
        where: { productId: finishedProd.id },
      });

      if (existing) {
        await tx.recipeItem.deleteMany({ where: { recipeId: existing.id } });
        return await tx.recipe.update({
          where: { id: existing.id },
          data: {
            yield: yieldAmount,
            instructions: data.instructions?.trim() || null,
            items: {
              create: cleanItems,
            },
          },
          include: {
            product: { include: { category: true } },
            items: { include: { product: { include: { category: true } } } },
          },
        });
      }

      return await tx.recipe.create({
        data: {
          productId: finishedProd.id,
          yield: yieldAmount,
          instructions: data.instructions?.trim() || null,
          companyId,
          items: {
            create: cleanItems,
          },
        },
        include: {
          product: { include: { category: true } },
          items: { include: { product: { include: { category: true } } } },
        },
      });
    });

    revalidatePath("/production");
    revalidatePath("/restaurant/recipes");
    revalidatePath("/stock");
    return { success: true, recipe: serializeRecipe(saved) };
  } catch (err: any) {
    console.error("Erro em saveRecipe:", err);
    return { error: err.message || "Erro ao salvar ficha técnica." };
  }
}

export async function createRecipe(data: {
  productId: string;
  yield: number;
  instructions?: string;
  items: { productId: string; quantity: number; unit: string; itemRole?: "INGREDIENT" | "PACKAGING" }[];
}) {
  return saveRecipe({
    productId: data.productId,
    yieldAmount: data.yield,
    instructions: data.instructions,
    items: data.items,
  });
}

export async function deleteRecipe(recipeId: string) {
  try {
    const { companyId } = await resolveCompanyContext();
    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId, companyId },
      include: {
        _count: {
          select: { productions: true, productionOrders: true },
        },
      },
    });
    if (!recipe) {
      return { error: "Ficha técnica não encontrada para esta empresa." };
    }
    if (recipe._count.productions > 0 || recipe._count.productionOrders > 0) {
      return {
        error:
          "Esta ficha técnica já possui produções registradas e não pode ser excluída (edite-a para atualizar os itens).",
      };
    }

    await prisma.recipe.delete({ where: { id: recipe.id } });
    revalidatePath("/production");
    revalidatePath("/restaurant/recipes");
    revalidatePath("/stock");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao remover ficha técnica." };
  }
}

export async function saveRawMaterialProduct(input: {
  id?: string;
  name: string;
  unit: string;
  cost: number;
  stock: number;
  minStock?: number;
  isPackaging?: boolean;
}) {
  try {
    const { companyId } = await resolveCompanyContext();
    const name = input.name?.trim();
    const cost = Number(input.cost || 0);
    const stock = Number(input.stock || 0);
    const minStock = Number(input.minStock || 0);
    const unit = (input.unit || "UN").trim() || "UN";

    if (!name) return { error: "Informe o nome do insumo ou embalagem." };

    if (input.id) {
      const existing = await prisma.product.findFirst({
        where: { id: input.id, companyId },
        select: { id: true },
      });
      if (!existing) return { error: "Insumo não encontrado na empresa." };

      const updated = await prisma.product.update({
        where: { id: existing.id },
        data: {
          name,
          unit,
          unitSale: unit,
          unitPurchase: unit,
          cost,
          stock,
          minStock,
          isRawMaterial: !input.isPackaging,
          isPackaging: Boolean(input.isPackaging),
        },
        include: { category: true },
      });
      revalidatePath("/production");
      revalidatePath("/restaurant/recipes");
      revalidatePath("/stock");
      return { success: true, product: serializeProductCompact(updated) };
    }

    const created = await prisma.product.create({
      data: {
        name,
        unit,
        unitSale: unit,
        unitPurchase: unit,
        price: cost > 0 ? cost : 0,
        cost,
        stock,
        minStock,
        isRawMaterial: !input.isPackaging,
        isPackaging: Boolean(input.isPackaging),
        companyId,
      },
      include: { category: true },
    });

    revalidatePath("/production");
    revalidatePath("/restaurant/recipes");
    revalidatePath("/stock");
    return { success: true, product: serializeProductCompact(created) };
  } catch (err: any) {
    return { error: err.message || "Erro ao salvar insumo/embalagem." };
  }
}

export async function deleteRawMaterialProduct(productId: string) {
  try {
    const { companyId } = await resolveCompanyContext();
    const prod = await prisma.product.findFirst({
      where: { id: productId, companyId },
      include: {
        _count: {
          select: {
            recipeItems: true,
            saleItems: true,
            orderItems: true,
            losses: true,
            stockEntryItems: true,
          },
        },
      },
    });
    if (!prod) return { error: "Insumo não encontrado para esta empresa." };

    if (prod._count.recipeItems > 0) {
      return {
        error: `Não é possível excluir "${prod.name}" porque ele está vinculado a ${prod._count.recipeItems} item(ns) de ficha técnica.`,
      };
    }
    if (
      prod._count.saleItems > 0 ||
      prod._count.orderItems > 0 ||
      prod._count.losses > 0 ||
      prod._count.stockEntryItems > 0
    ) {
      return {
        error: `Não é possível excluir "${prod.name}" porque já possui movimentações fiscais/estoque registradas.`,
      };
    }

    await prisma.product.delete({ where: { id: prod.id } });
    revalidatePath("/production");
    revalidatePath("/restaurant/recipes");
    revalidatePath("/stock");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao excluir insumo." };
  }
}

export async function recordProduction(input: {
  recipeId: string;
  quantityProduced: number;
  producerUserId?: string;
  batchNumber?: string;
  shelfLifeDays?: number;
  expirationDate?: string;
  notes?: string;
}) {
  try {
    const { companyId, sessionUserId } = await resolveCompanyContext();
    const quantityProduced = Number(input.quantityProduced);

    if (!input.recipeId || !Number.isFinite(quantityProduced) || quantityProduced <= 0) {
      return { error: "Informe a receita e uma quantidade produzida válida (> 0)." };
    }

    // Validar que producerUserId pertence à empresa
    let producerUser = null;
    if (input.producerUserId) {
      producerUser = await prisma.user.findFirst({
        where: { id: input.producerUserId, companyId, active: true },
        select: { id: true, name: true },
      });
      if (!producerUser) {
        return { error: "O usuário produtor selecionado não pertence a esta empresa ou está inativo." };
      }
    } else if (sessionUserId) {
      producerUser = await prisma.user.findFirst({
        where: { id: sessionUserId, companyId },
        select: { id: true, name: true },
      });
    }

    if (!producerUser) {
      producerUser = await prisma.user.findFirst({
        where: { companyId, active: true },
        select: { id: true, name: true },
      });
    }

    if (!producerUser) {
      return { error: "Nenhum usuário ativo encontrado na empresa para registrar a produção." };
    }

    const recipe = await prisma.recipe.findFirst({
      where: { id: input.recipeId, companyId },
      include: {
        items: {
          include: { product: true },
        },
        product: true,
      },
    });

    if (!recipe) {
      return { error: "Ficha técnica não encontrada para esta empresa." };
    }

    // Calcular validade (se informada por data ou dias)
    let expDate: Date | null = null;
    if (input.expirationDate && input.expirationDate.trim()) {
      const parsed = new Date(`${input.expirationDate.trim().slice(0, 10)}T12:00:00`);
      if (isNaN(parsed.getTime())) {
        return { error: "Data de validade informada é inválida." };
      }
      expDate = parsed;
    } else if (input.shelfLifeDays && Number(input.shelfLifeDays) > 0) {
      const target = new Date();
      target.setDate(target.getDate() + Math.round(Number(input.shelfLifeDays)));
      target.setHours(12, 0, 0, 0);
      expDate = target;
    }

    const batchNumber =
      input.batchNumber?.trim() ||
      `LOTE-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Date.now().toString().slice(-4)}`;

    const log = await prisma.$transaction(async (tx) => {
      let totalCost = 0;
      const recipeYield = Number(recipe.yield || 1) || 1;
      const factor = quantityProduced / recipeYield;

      // 1. Baixar estoque proporcionalmente de todos os RecipeItem (insumos e embalagens)
      for (const item of recipe.items) {
        const qtyConsumed = Number(item.quantity) * factor;
        const currentStock = Number(item.product.stock || 0);

        if (currentStock < qtyConsumed) {
          throw new Error(
            `Estoque insuficiente de ${item.product.name}. Necessário: ${qtyConsumed.toFixed(3)} ${item.unit}, Em estoque: ${currentStock.toFixed(3)}.`
          );
        }

        const itemUnitCost = Number(item.product.cost ?? 0);
        totalCost += qtyConsumed * itemUnitCost;

        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: qtyConsumed,
            },
          },
        });
      }

      // 2. Incrementar estoque do produto acabado
      await tx.product.update({
        where: { id: recipe.productId },
        data: {
          stock: {
            increment: quantityProduced,
          },
        },
      });

      // 3. Criar ProductBatch caso haja validade
      if (expDate) {
        await tx.productBatch.create({
          data: {
            productId: recipe.productId,
            batchNumber,
            expirationDate: expDate,
            initialStock: quantityProduced,
            currentStock: quantityProduced,
          },
        });
      }

      // 4. Gravar ProductionLog com userId, totalCost e notes
      return await tx.productionLog.create({
        data: {
          recipeId: recipe.id,
          quantityProduced,
          batchNumber,
          expirationDate: expDate,
          totalCost: Number(totalCost.toFixed(2)),
          notes: input.notes?.trim() || null,
          userId: producerUser.id,
          companyId,
        },
        include: {
          recipe: { include: { product: { include: { category: true } } } },
          user: { select: { id: true, name: true, role: true, email: true } },
        },
      });
    });

    revalidatePath("/production");
    revalidatePath("/stock");
    revalidatePath("/expirations");
    revalidatePath("/reports");
    revalidatePath("/restaurant/recipes");
    return { success: true, log: serializeProductionLog(log) };
  } catch (err: any) {
    console.error("Erro em recordProduction:", err);
    return { error: err.message || "Erro ao registrar produção" };
  }
}

export async function getProductionReportByUser(filters?: {
  startDate?: string;
  endDate?: string;
  userId?: string;
}) {
  try {
    const { companyId } = await resolveCompanyContext();

    const where: any = { companyId };
    if (filters?.userId && filters.userId !== "ALL") {
      where.userId = filters.userId;
    }
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(`${filters.startDate.slice(0, 10)}T00:00:00`);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(`${filters.endDate.slice(0, 10)}T23:59:59.999`);
      }
    }

    const [logs, users] = await Promise.all([
      prisma.productionLog.findMany({
        where,
        include: {
          recipe: {
            include: {
              product: { include: { category: true } },
              items: { include: { product: true } },
            },
          },
          user: { select: { id: true, name: true, role: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findMany({
        where: { companyId, active: true },
        select: { id: true, name: true, role: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const groupedMap = new Map<
      string,
      {
        userId: string;
        userName: string;
        userRole: string;
        totalLotes: number;
        totalProduzido: number;
        custoInsumos: number;
        recipeIds: Set<string>;
        lastProductionAt: string;
      }
    >();

    const serializedLogs = logs.map((l) => {
      const sLog = serializeProductionLog(l);
      const uId = l.userId;
      const existing = groupedMap.get(uId);
      if (existing) {
        existing.totalLotes += 1;
        existing.totalProduzido += sLog.quantityProduced;
        existing.custoInsumos += sLog.totalCost;
        existing.recipeIds.add(l.recipeId);
      } else {
        groupedMap.set(uId, {
          userId: uId,
          userName: l.user?.name || "Operador",
          userRole: l.user?.role || "OPERATOR",
          totalLotes: 1,
          totalProduzido: sLog.quantityProduced,
          custoInsumos: sLog.totalCost,
          recipeIds: new Set([l.recipeId]),
          lastProductionAt: sLog.createdAt,
        });
      }
      return sLog;
    });

    const byUser = Array.from(groupedMap.values())
      .map((g) => ({
        userId: g.userId,
        userName: g.userName,
        userRole: g.userRole,
        totalLotes: g.totalLotes,
        totalProduzido: Number(g.totalProduzido.toFixed(3)),
        custoInsumos: Number(g.custoInsumos.toFixed(2)),
        receitasDistintas: g.recipeIds.size,
        lastProductionAt: g.lastProductionAt,
      }))
      .sort((a, b) => b.totalLotes - a.totalLotes);

    return {
      success: true,
      byUser,
      logs: serializedLogs,
      users,
    };
  } catch (err: any) {
    console.error("Erro em getProductionReportByUser:", err);
    return {
      success: false,
      error: err.message || "Erro ao gerar relatório de produção por usuário.",
      byUser: [],
      logs: [],
      users: [],
    };
  }
}
