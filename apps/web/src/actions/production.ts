"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";

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

export async function getRecipes() {
  try {
    const recipes = await prisma.recipe.findMany({
      include: {
        product: true,
        items: {
          include: { product: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    return { recipes };
  } catch (err: any) {
    return { error: err.message || "Erro ao buscar receitas", recipes: [] };
  }
}

export async function createRecipe(data: {
  productId: string;
  yield: number;
  instructions?: string;
  items: { productId: string; quantity: number; unit: string }[];
}) {
  try {
    const company = await getOrCreateCompany();

    // Check if recipe already exists for this product
    const existing = await prisma.recipe.findUnique({
      where: { productId: data.productId }
    });

    if (existing) {
      return { error: "Este produto já possui uma ficha técnica cadastrada." };
    }

    const recipe = await prisma.recipe.create({
      data: {
        productId: data.productId,
        yield: data.yield,
        instructions: data.instructions || null,
        companyId: company.id,
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unit: item.unit
          }))
        }
      },
      include: {
        items: true
      }
    });

    revalidatePath("/production");
    return { success: true, recipe };
  } catch (err: any) {
    return { error: err.message || "Erro ao criar ficha técnica" };
  }
}

export async function recordProduction(recipeId: string, quantityProduced: number) {
  try {
    const company = await getOrCreateCompany();
    const user = await getOrCreateUser(company.id);

    // Fetch recipe with items
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        items: {
          include: { product: true }
        },
        product: true
      }
    });

    if (!recipe) return { error: "Receita não encontrada" };

    // Start database transaction
    const log = await prisma.$transaction(async (tx) => {
      // 1. Decrement raw materials (insumos)
      for (const item of recipe.items) {
        const quantityRequired = (item.quantity / recipe.yield) * quantityProduced;
        
        // Check if we have enough stock
        if (Number(item.product.stock) < quantityRequired) {
          throw new Error(`Estoque insuficiente de ${item.product.name}. Necessário: ${quantityRequired.toFixed(2)}, Em estoque: ${item.product.stock}`);
        }

        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: quantityRequired
            }
          }
        });
      }

      // 2. Increment stock of finished product
      await tx.product.update({
        where: { id: recipe.productId },
        data: {
          stock: {
            increment: quantityProduced
          }
        }
      });

      // 3. Create production log
      const batchNumber = `LOTE-${Date.now().toString().slice(-6)}`;
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 10); // default 10 days expiration for fresh products

      const prodLog = await tx.productionLog.create({
        data: {
          recipeId,
          quantityProduced,
          batchNumber,
          expirationDate,
          userId: user.id,
          companyId: company.id
        }
      });

      return prodLog;
    });

    revalidatePath("/production");
    revalidatePath("/stock");
    return { success: true, log };
  } catch (err: any) {
    return { error: err.message || "Erro ao registrar produção" };
  }
}

export async function getProductionLogs() {
  try {
    const logs = await prisma.productionLog.findMany({
      include: {
        recipe: {
          include: { product: true }
        },
        user: true
      },
      orderBy: { createdAt: "desc" }
    });
    return { logs };
  } catch (err: any) {
    return { error: err.message || "Erro ao buscar logs de produção", logs: [] };
  }
}
