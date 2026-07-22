"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

export async function getFiscalConfig() {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Não autorizado ou empresa não vinculada.", config: null };
    }

    const config = await prisma.fiscalConfig.findUnique({
      where: { companyId: session.companyId }
    });

    return { config };
  } catch (err: any) {
    return { error: err.message, config: null };
  }
}

export async function saveFiscalConfig(formData: FormData) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Sessão inválida ou empresa não identificada." };
    }

    const companyId = session.companyId;

    const data: any = {
      cnpj: formData.get("cnpj") as string,
      ie: (formData.get("ie") as string) || null,
      im: (formData.get("im") as string) || null,
      companyName: formData.get("companyName") as string,
      tradeName: (formData.get("tradeName") as string) || null,
      taxRegime: (formData.get("taxRegime") as string) || "SN",
      environment: (formData.get("environment") as string) || "homologacao",
      nfeSeries: (formData.get("nfeSeries") as string) || "1",
      nfceeSeries: (formData.get("nfceeSeries") as string) || "1",
      street: (formData.get("street") as string) || null,
      number: (formData.get("number") as string) || null,
      district: (formData.get("district") as string) || null,
      city: (formData.get("city") as string) || null,
      state: (formData.get("state") as string) || null,
      zipCode: (formData.get("zipCode") as string) || null,
      focusNfeToken: (formData.get("focusNfeToken") as string) || null,
      companyId: companyId,
    };

    const certPassword = formData.get("certPassword") as string;
    if (certPassword) {
      data.certPassword = certPassword;
      data.certUploaded = true;
    }

    await prisma.fiscalConfig.upsert({
      where: { companyId: companyId },
      update: data,
      create: data,
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao salvar configuração fiscal" };
  }
}
