"use server";

import { prisma } from "@emporio/database";
import { cookies } from "next/headers";

export async function getTenantTheme(customCompanyId?: string) {
  try {
    const cookieStore = await cookies();
    const sessionCompanyId = cookieStore.get("session_company")?.value;
    const companyId = customCompanyId || sessionCompanyId;

    if (!companyId) {
      const firstCompany = await prisma.company.findFirst({ include: { theme: true } });
      return { theme: firstCompany?.theme || null };
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { theme: true }
    });

    return { theme: company?.theme || null };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function updateTenantTheme(data: any, customCompanyId?: string) {
  try {
    const cookieStore = await cookies();
    const sessionCompanyId = cookieStore.get("session_company")?.value;
    const companyId = customCompanyId || sessionCompanyId;

    if (!companyId) {
      const company = await prisma.company.findFirst();
      if (!company) throw new Error("Nenhuma empresa cadastrada.");
      const theme = await prisma.tenantTheme.upsert({
        where: { companyId: company.id },
        update: data,
        create: {
          ...data,
          companyId: company.id,
        }
      });
      return { success: true, theme };
    }

    const theme = await prisma.tenantTheme.upsert({
      where: { companyId },
      update: data,
      create: {
        ...data,
        companyId,
      }
    });

    return { success: true, theme };
  } catch (err: any) {
    return { error: err.message };
  }
}
