"use server";

import fs from "fs";
import path from "path";
import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { inspectPfxBuffer } from "./certificate";
import { checkSefazServiceStatus, parseSefazMetadata } from "@/lib/sefazClient";

export async function getFiscalConfig() {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Não autorizado ou empresa não vinculada.", config: null };
    }

    const config = await prisma.fiscalConfig.findUnique({
      where: { companyId: session.companyId }
    });

    if (!config) return { config: null };

    const meta = parseSefazMetadata(config.emitterEndpoint);

    return {
      config: {
        ...config,
        cscId: meta.cscId || "000001",
        cscToken: meta.cscToken || "",
        ibgeCode: meta.ibgeCode || "2700805",
      },
    };
  } catch (err: any) {
    return { error: err.message, config: null };
  }
}

export async function testSefazConnectionAction() {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { ok: false, error: "Sessão inválida." };
    }
    const res = await checkSefazServiceStatus(session.companyId);
    return res;
  } catch (err: any) {
    return { ok: false, error: err.message || "Erro ao testar comunicação com a SEFAZ." };
  }
}

export async function saveFiscalConfig(formData: FormData) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Sessão inválida ou empresa não identificada." };
    }

    const companyId = session.companyId;
    const existing = await prisma.fiscalConfig.findUnique({ where: { companyId } });
    const prevMeta = parseSefazMetadata(existing?.emitterEndpoint);

    const cscId = (formData.get("cscId") as string) || prevMeta.cscId || "000001";
    const cscToken = (formData.get("cscToken") as string) ?? prevMeta.cscToken ?? "";
    const ibgeCode = (formData.get("ibgeCode") as string) || prevMeta.ibgeCode || "2700805";

    const nextMeta: Record<string, any> = {
      ...prevMeta,
      cscId,
      cscToken,
      ibgeCode,
    };

    const data: any = {
      cnpj: formData.get("cnpj") as string,
      ie: (formData.get("ie") as string) || null,
      im: (formData.get("im") as string) || null,
      companyName: formData.get("companyName") as string,
      tradeName: (formData.get("tradeName") as string) || null,
      taxRegime: (formData.get("taxRegime") as string) || "SN",
      environment: (formData.get("environment") as string) || "producao",
      nfeSeries: (formData.get("nfeSeries") as string) || "1",
      nfceeSeries: (formData.get("nfceeSeries") as string) || "1",
      street: (formData.get("street") as string) || null,
      number: (formData.get("number") as string) || "S/N",
      district: (formData.get("district") as string) || null,
      city: (formData.get("city") as string) || null,
      state: (formData.get("state") as string) || "AL",
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
      const pwToUse = certPassword || existing?.certPassword || "";
      if (pwToUse) {
        const certInfo = await inspectPfxBuffer(buffer, pwToUse);
        if (certInfo.isValid) {
          let finalPath = `cert_${companyId}.pfx`;
          try {
            const certsDir = path.join(process.cwd(), "packages", "database", "certs");
            if (!fs.existsSync(certsDir)) fs.mkdirSync(certsDir, { recursive: true });
            finalPath = path.join(certsDir, `cert_${companyId}.pfx`);
            fs.writeFileSync(finalPath, buffer);
          } catch {}
          nextMeta.certBase64 = buffer.toString("base64");
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

    data.emitterEndpoint = JSON.stringify(nextMeta);

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
