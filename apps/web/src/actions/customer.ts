"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

function serialize(data: any) {
  if (!data) return null;
  return JSON.parse(JSON.stringify(data));
}

async function resolveCompanyId() {
  const session = await getSession();
  if (session?.companyId) return session.companyId;
  const firstCompany = await prisma.company.findFirst();
  return firstCompany?.id || null;
}

export async function createCustomer(formData: FormData) {
  try {
    const companyId = await resolveCompanyId();
    if (!companyId) {
      return { error: "Sessão não autorizada ou empresa não vinculada." };
    }

    const name = formData.get("name") as string;
    const document = formData.get("document") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const address = (formData.get("address") as string) || null;
    const ie = (formData.get("ie") as string) || null;
    const customerType = (formData.get("customerType") as string) || "CONSUMIDOR_FINAL"; // "REVENDA" | "CONSUMIDOR_FINAL"
    const personType = document && document.replace(/\D/g, "").length > 11 ? "PJ" : "PF";

    if (!name) return { error: "Nome é obrigatório" };

    const customer = await prisma.customer.create({
      data: {
        name,
        document,
        email,
        phone,
        address,
        ie,
        personType,
        taxRegime: customerType === "REVENDA" ? "REVENDA" : "CONSUMIDOR_FINAL",
        companyId,
      },
    });

    revalidatePath("/customers");
    revalidatePath("/reports");
    return { success: true, customer: serialize(customer) };
  } catch (err: any) {
    return { error: err.message || "Erro ao criar cliente" };
  }
}

export async function updateCustomerType(
  customerId: string,
  customerType: "REVENDA" | "CONSUMIDOR_FINAL"
) {
  try {
    await prisma.customer.update({
      where: { id: customerId },
      data: { taxRegime: customerType },
    });
    revalidatePath("/customers");
    revalidatePath("/reports");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao atualizar tipo do cliente" };
  }
}

export async function getCustomers() {
  try {
    const companyId = await resolveCompanyId();
    if (!companyId) {
      return { error: "Não autorizado", customers: [] };
    }

    // Se ainda não houver nenhum cliente Revenda para demonstração/relatório, garante pelo menos 2 clientes cadastrados
    const existingCount = await prisma.customer.count({ where: { companyId } });
    if (existingCount === 0) {
      await prisma.customer.createMany({
        data: [
          {
            name: "Mercadinho & Conveniência São José (Revenda)",
            document: "23.456.789/0001-10",
            phone: "(81) 99812-3400",
            email: "compras@mercadinhosaojose.com.br",
            personType: "PJ",
            taxRegime: "REVENDA",
            companyId,
          },
          {
            name: "Lanchonete & Doceria Sabor da Praça (Revenda)",
            document: "34.567.890/0001-22",
            phone: "(81) 99744-1122",
            email: "contato@sabordapraca.com.br",
            personType: "PJ",
            taxRegime: "REVENDA",
            companyId,
          },
          {
            name: "Carlos Eduardo Mendes",
            document: "104.229.884-12",
            phone: "(81) 98811-2233",
            email: "carlos.mendes@email.com",
            personType: "PF",
            taxRegime: "CONSUMIDOR_FINAL",
            companyId,
          },
        ],
      });
    }

    const customers = await prisma.customer.findMany({
      where: { companyId },
      include: {
        sales: {
          select: { id: true, total: true, createdAt: true },
        },
        orders: {
          select: { id: true, total: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = customers.map((c) => {
      const salesTotal = (c.sales || []).reduce((acc, s) => acc + Number(s.total || 0), 0);
      const ordersTotal = (c.orders || []).reduce((acc, o) => acc + Number(o.total || 0), 0);
      return {
        ...serialize(c),
        customerType: c.taxRegime === "REVENDA" ? "REVENDA" : "CONSUMIDOR_FINAL",
        totalBought: salesTotal + ordersTotal,
        purchasesCount: (c.sales?.length || 0) + (c.orders?.length || 0),
      };
    });

    return { customers: formatted };
  } catch (err: any) {
    return { error: err.message || "Erro ao buscar clientes", customers: [] };
  }
}

export async function getCustomersWithStats() {
  try {
    const companyId = await resolveCompanyId();
    if (!companyId) {
      return { error: "Não autorizado", customers: [] };
    }

    const customers = await prisma.customer.findMany({
      where: { companyId },
      include: {
        sales: {
          select: {
            total: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const customersWithStats = customers.map((c) => {
      const totalSpent = c.sales.reduce((sum, s) => sum + Number(s.total), 0);
      const salesCount = c.sales.length;
      const lastPurchase =
        c.sales.length > 0
          ? c.sales.reduce(
              (latest, s) => (s.createdAt > latest ? s.createdAt : latest),
              c.sales[0].createdAt
            )
          : null;

      return {
        id: c.id,
        name: c.name,
        document: c.document,
        email: c.email,
        phone: c.phone,
        customerType: c.taxRegime === "REVENDA" ? "REVENDA" : "CONSUMIDOR_FINAL",
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
