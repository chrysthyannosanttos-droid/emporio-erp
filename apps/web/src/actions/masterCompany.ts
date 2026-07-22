"use server";

import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function updateCompanyStatus(companyId: string, status: string) {
  const session = await getSession();
  if (!session?.isSuperAdmin) redirect("/login");

  if (!companyId || !status) return { error: "Parâmetros inválidos." };

  try {
    const company = await prisma.company.update({
      where: { id: companyId },
      data: { licenseStatus: status },
    });
    return { success: true, company };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function renewCompanyLicense(companyId: string, days: number) {
  const session = await getSession();
  if (!session?.isSuperAdmin) redirect("/login");

  try {
    const current = await prisma.company.findUnique({ where: { id: companyId } });
    if (!current) return { error: "Empresa não encontrada." };

    // Renovar a partir de hoje ou da data atual de expiração (o que for maior)
    const baseDate = new Date(current.licenseExpiresAt) > new Date()
      ? new Date(current.licenseExpiresAt)
      : new Date();
    const newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

    const company = await prisma.company.update({
      where: { id: companyId },
      data: { licenseExpiresAt: newExpiry, licenseStatus: "ACTIVE" },
    });
    return { success: true, company };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function getCompanyDetails(companyId: string) {
  const session = await getSession();
  if (!session?.isSuperAdmin) return { company: null };

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      plan: true,
      users: {
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      },
      _count: {
        select: {
          users: true,
          products: true,
          customers: true,
          sales: true,
          invoices: true,
        },
      },
    },
  });

  return { company };
}
