"use server";

import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

// ─── Criar empresa + usuário admin ───────────────────────────────────────────
export async function createCompany(formData: FormData) {
  const session = await getSession();
  if (!session?.isSuperAdmin) redirect("/login");

  const name = formData.get("name") as string;
  const document = formData.get("document") as string;
  const adminName = formData.get("adminName") as string;
  const adminEmail = formData.get("adminEmail") as string;
  const adminPassword = formData.get("adminPassword") as string;
  const days = Number(formData.get("licenseDays") || "30");

  if (!name || !document || !adminName || !adminEmail || !adminPassword) {
    return { error: "Todos os campos são obrigatórios." };
  }

  // Verificar se documento já existe
  const existing = await prisma.company.findFirst({ where: { document } });
  if (existing) return { error: "CNPJ/CPF já cadastrado." };

  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const company = await prisma.company.create({
    data: {
      name,
      document,
      licenseStatus: "ACTIVE",
      licenseExpiresAt: expiresAt,
      users: {
        create: {
          name: adminName,
          email: adminEmail,
          password: adminPassword,
          role: "ADMIN",
          active: true,
        },
      },
    },
    include: { users: true },
  });

  return { success: true, company };
}

// ─── Listar todas as empresas ─────────────────────────────────────────────────
export async function listCompanies() {
  const session = await getSession();
  if (!session?.isSuperAdmin) return { companies: [] };

  const companies = await prisma.company.findMany({
    include: {
      users: {
        where: { role: "ADMIN" },
        take: 1,
        select: { name: true, email: true },
      },
      _count: {
        select: { users: true, products: true, sales: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return { companies };
}

// ─── Atualizar licença da empresa ─────────────────────────────────────────────
export async function updateCompanyLicense(companyId: string, status: string, expiresAtStr: string) {
  const session = await getSession();
  if (!session?.isSuperAdmin) redirect("/login");

  if (!companyId || !status || !expiresAtStr) {
    return { error: "Parâmetros inválidos." };
  }

  try {
    const company = await prisma.company.update({
      where: { id: companyId },
      data: {
        licenseStatus: status,
        licenseExpiresAt: new Date(expiresAtStr),
      },
    });
    return { success: true, company };
  } catch (err: any) {
    return { error: err.message };
  }
}

// ─── Dados públicos de uma empresa (para a página da loja) ───────────────────
export async function getPublicCompany(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      fiscalConfig: {
        select: { city: true, state: true, street: true, companyName: true, tradeName: true },
      },
      products: {
        where: { stock: { gt: 0 } },
        take: 48,
        select: {
          id: true,
          name: true,
          price: true,
          stock: true,
          unit: true,
          barcode: true,
          category: { select: { name: true } },
        },
        orderBy: { name: "asc" },
      },
      theme: {
        select: {
          logoPrincipal: true,
          corPrimaria: true,
          corSecundaria: true,
          backgroundSistema: true,
        },
      },
    },
  });

  // Verificar se a licença não está suspensa ou expirada
  if (company && (company.licenseStatus === "SUSPENDED" || new Date(company.licenseExpiresAt) < new Date())) {
    return { company: null, licenseIssue: true };
  }

  return { company };
}
