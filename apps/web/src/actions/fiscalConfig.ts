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

export async function getFiscalConfig() {
  try {
    const company = await getOrCreateCompany();
    const config = await prisma.fiscalConfig.findUnique({
      where: { companyId: company.id }
    });
    return { config };
  } catch (err: any) {
    return { error: err.message, config: null };
  }
}

export async function saveFiscalConfig(formData: FormData) {
  try {
    const company = await getOrCreateCompany();

    const data = {
      cnpj: formData.get("cnpj") as string,
      ie: formData.get("ie") as string || null,
      im: formData.get("im") as string || null,
      companyName: formData.get("companyName") as string,
      tradeName: formData.get("tradeName") as string || null,
      taxRegime: formData.get("taxRegime") as string || "SN",
      environment: formData.get("environment") as string || "homologacao",
      nfeSeries: formData.get("nfeSeries") as string || "1",
      nfceeSeries: formData.get("nfceeSeries") as string || "1",
      street: formData.get("street") as string || null,
      number: formData.get("number") as string || null,
      district: formData.get("district") as string || null,
      city: formData.get("city") as string || null,
      state: formData.get("state") as string || null,
      zipCode: formData.get("zipCode") as string || null,
      focusNfeToken: formData.get("focusNfeToken") as string || null,
      companyId: company.id,
    };

    await prisma.fiscalConfig.upsert({
      where: { companyId: company.id },
      update: data,
      create: data,
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao salvar configuração fiscal" };
  }
}
