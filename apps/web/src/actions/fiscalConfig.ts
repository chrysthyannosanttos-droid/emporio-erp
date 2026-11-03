"use server";

import fs from "fs";
import path from "path";
import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { inspectPfxBuffer } from "./certificate";

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

    const certFile = formData.get("certFile") as File | null;
    const certPassword = formData.get("certPassword") as string;

    if (certPassword) {
      data.certPassword = certPassword;
    }

    if (certFile && certFile.size > 0) {
      const buffer = Buffer.from(await certFile.arrayBuffer());
      if (certPassword) {
        const certInfo = await inspectPfxBuffer(buffer, certPassword);
        if (certInfo.isValid) {
          const certsDir = path.join(process.cwd(), "packages", "database", "certs");
          if (!fs.existsSync(certsDir)) fs.mkdirSync(certsDir, { recursive: true });
          const finalPath = path.join(certsDir, `cert_${companyId}.pfx`);
          fs.writeFileSync(finalPath, buffer);
          data.certPath = finalPath;
          data.certExpiration = certInfo.validTo ? new Date(certInfo.validTo) : null;
          data.certUploaded = true;
        } else {
          return { error: certInfo.error || "A senha informada não é válida para este certificado." };
        }
      } else {
        return { error: "Para carregar o certificado, digite a senha do arquivo .pfx." };
      }
    }

    await prisma.fiscalConfig.upsert({
      where: { companyId: companyId },
      update: data,
      create: data,
    });

    revalidatePath("/settings");
    revalidatePath("/invoices");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao salvar configuração fiscal" };
  }
}
