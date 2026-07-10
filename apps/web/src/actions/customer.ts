"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";

export async function createCustomer(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const document = formData.get("document") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;

    if (!name) return { error: "Nome é obrigatório" };

    // Find the first company for testing, or we should use session
    const company = await prisma.company.findFirst();
    let companyId = company?.id;

    if (!companyId) {
      // Create a default company if none exists
      const newCompany = await prisma.company.create({
        data: { name: "Emporio Default", document: "00.000.000/0001-00" }
      });
      companyId = newCompany.id;
    }

    await prisma.customer.create({
      data: {
        name,
        document,
        email,
        phone,
        companyId,
      }
    });

    revalidatePath("/customers");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao criar cliente" };
  }
}

export async function getCustomers() {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return { customers };
  } catch (err: any) {
    return { error: err.message || "Erro ao buscar clientes", customers: [] };
  }
}

export async function getCustomersWithStats() {
  try {
    const customers = await prisma.customer.findMany({
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
        lastPurchase,
      };
    });

    return { customers: customersWithStats };
  } catch (err: any) {
    return { error: err.message || "Erro ao buscar estatísticas dos clientes", customers: [] };
  }
}

