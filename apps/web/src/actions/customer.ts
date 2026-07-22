"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

function serialize(data: any) {
  if (!data) return null;
  return JSON.parse(JSON.stringify(data));
}

export async function createCustomer(formData: FormData) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Sessão não autorizada ou empresa não vinculada." };
    }

    const name = formData.get("name") as string;
    const document = formData.get("document") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;

    if (!name) return { error: "Nome é obrigatório" };

    const customer = await prisma.customer.create({
      data: {
        name,
        document,
        email,
        phone,
        companyId: session.companyId,
      }
    });

    revalidatePath("/customers");
    return { success: true, customer: serialize(customer) };
  } catch (err: any) {
    return { error: err.message || "Erro ao criar cliente" };
  }
}

export async function getCustomers() {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Não autorizado", customers: [] };
    }

    const customers = await prisma.customer.findMany({
      where: { companyId: session.companyId },
      orderBy: { createdAt: 'desc' }
    });
    return { customers: serialize(customers) };
  } catch (err: any) {
    return { error: err.message || "Erro ao buscar clientes", customers: [] };
  }
}

export async function getCustomersWithStats() {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Não autorizado", customers: [] };
    }

    const customers = await prisma.customer.findMany({
      where: { companyId: session.companyId },
      include: {
        sales: {
          select: {
            total: true,
            createdAt: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const customersWithStats = customers.map(c => {
      const totalSpent = c.sales.reduce((sum, s) => sum + Number(s.total), 0);
      const salesCount = c.sales.length;
      const lastPurchase = c.sales.length > 0 
        ? c.sales.reduce((latest, s) => s.createdAt > latest ? s.createdAt : latest, c.sales[0].createdAt)
        : null;

      return {
        id: c.id,
        name: c.name,
        document: c.document,
        email: c.email,
        phone: c.phone,
        cashbackBalance: Number(c.cashbackBalance),
        pointsBalance: c.pointsBalance,
        totalSpent,
        salesCount,
        lastPurchase: lastPurchase ? lastPurchase.toISOString() : null,
      };
    });

    return { customers: customersWithStats };
  } catch (err: any) {
    return { error: err.message || "Erro ao buscar estatísticas dos clientes", customers: [] };
  }
}
