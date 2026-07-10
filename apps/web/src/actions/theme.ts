"use server";

import { prisma } from "@emporio/database";

export async function getTenantTheme() {
  try {
    let company = await prisma.company.findFirst({
      include: {
        theme: true
      }
    });

    if (!company) {
      company = await prisma.company.create({
        data: { name: "Emporio Default", document: "00.000.000/0001-00" },
        include: { theme: true }
      });
    }

    return { theme: company.theme };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function updateTenantTheme(data: any) {
  try {
    const company = await prisma.company.findFirst();
    if (!company) throw new Error("Company not found");

    const theme = await prisma.tenantTheme.upsert({
      where: { companyId: company.id },
      update: data,
      create: {
        ...data,
        companyId: company.id,
      }
    });

    return { success: true, theme };
  } catch (err: any) {
    return { error: err.message };
  }
}
