"use server";

import fs from "fs";
import path from "path";
import forge from "node-forge";
import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export interface CertificateInfo {
  isValid: boolean;
  status: "VALID" | "EXPIRING_SOON" | "EXPIRED" | "INVALID_PASSWORD" | "ERROR" | "NOT_FOUND";
  statusText: string;
  subjectName?: string;
  cnpj?: string;
  issuer?: string;
  serialNumber?: string;
  validFrom?: string;
  validTo?: string;
  daysRemaining?: number;
  error?: string;
}

/**
 * Extrai informações e valida a senha de um buffer PKCS#12 (.pfx / .p12)
 */
export async function inspectPfxBuffer(buffer: Buffer, password: string): Promise<CertificateInfo> {
  try {
    const pfxDer = buffer.toString("binary");
    const pfxAsn1 = forge.asn1.fromDer(pfxDer);

    let p12: any;
    try {
      p12 = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, false, password);
    } catch (pwErr: any) {
      return {
        isValid: false,
        status: "INVALID_PASSWORD",
        statusText: "Senha Incorreta",
        error: "A senha informada não abre este arquivo de certificado digital (.pfx). Verifique a senha cadastrada na emissora.",
      };
    }

    // Extrai o CertBag
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBagList = certBags[forge.pki.oids.certBag] || [];

    if (!certBagList.length) {
      return {
        isValid: false,
        status: "ERROR",
        statusText: "Certificado não encontrado",
        error: "Nenhum certificado digital X.509 foi encontrado dentro do arquivo .pfx.",
      };
    }

    // O primeiro certificado é o certificado final do titular
    const mainCert = certBagList[0].cert;
    if (!mainCert) {
      return {
        isValid: false,
        status: "ERROR",
        statusText: "Certificado corrompido",
        error: "Não foi possível interpretar os dados do certificado.",
      };
    }

    // Extrai atributos do Subject
    const subjectAttrs = mainCert.subject.attributes;
    const getAttr = (nameOrOid: string) => {
      const a = subjectAttrs.find((x: any) => x.name === nameOrOid || x.type === nameOrOid);
      return a ? a.value : null;
    };

    const commonName = getAttr("commonName") || "Certificado A1";

    // Extrai CNPJ do ICP-Brasil (costuma vir no CN ou na extensão 2.16.76.1.3.3)
    let cnpj = "";
    const cnpjMatch = commonName.match(/:(\d{14})/);
    if (cnpjMatch) {
      cnpj = cnpjMatch[1].replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    } else {
      const docMatch = commonName.match(/\d{14}/);
      if (docMatch) {
        cnpj = docMatch[0].replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
      }
    }

    // Extrai Emissor
    const issuerAttrs = mainCert.issuer.attributes;
    const issuerCn = issuerAttrs.find((x: any) => x.name === "commonName")?.value || "Autoridade Certificadora ICP-Brasil";

    // Validade
    const notBefore = mainCert.validity.notBefore;
    const notAfter = mainCert.validity.notAfter;
    const now = new Date();

    const diffTime = notAfter.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let status: CertificateInfo["status"] = "VALID";
    let statusText = "Certificado Válido";

    if (daysRemaining <= 0) {
      status = "EXPIRED";
      statusText = "Certificado Expirado";
    } else if (daysRemaining <= 30) {
      status = "EXPIRING_SOON";
      statusText = `Vence em ${daysRemaining} dias`;
    }

    return {
      isValid: status !== "EXPIRED",
      status,
      statusText,
      subjectName: commonName,
      cnpj: cnpj || undefined,
      issuer: issuerCn,
      serialNumber: mainCert.serialNumber,
      validFrom: notBefore.toISOString(),
      validTo: notAfter.toISOString(),
      daysRemaining,
    };
  } catch (err: any) {
    return {
      isValid: false,
      status: "ERROR",
      statusText: "Erro na leitura do certificado",
      error: err.message || "Erro ao decodificar arquivo PKCS#12",
    };
  }
}

/**
 * Obtém o status do certificado atual da empresa
 */
export async function getCurrentCertificateStatus(): Promise<CertificateInfo> {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { isValid: false, status: "NOT_FOUND", statusText: "Sessão inválida" };
    }

    const fiscal = await prisma.fiscalConfig.findUnique({
      where: { companyId: session.companyId },
    });

    if (!fiscal || (!fiscal.certUploaded && !fiscal.certPath)) {
      return {
        isValid: false,
        status: "NOT_FOUND",
        statusText: "Nenhum certificado cadastrado",
        error: "Envie o arquivo .pfx do seu Certificado Digital A1 para habilitar emissão fiscal e Radar SEFAZ.",
      };
    }

    // Se temos o arquivo salvo no certPath
    if (fiscal.certPath && fs.existsSync(fiscal.certPath)) {
      const buffer = fs.readFileSync(fiscal.certPath);
      return inspectPfxBuffer(buffer, fiscal.certPassword || "");
    }

    // Se o arquivo estiver em Downloads (caso o usuário tenha acabado de baixar ou testar)
    const downloadCert = "C:\\Users\\tisup\\Downloads\\certificado_digital.pfx";
    if (fs.existsSync(downloadCert)) {
      const buffer = fs.readFileSync(downloadCert);
      return inspectPfxBuffer(buffer, fiscal.certPassword || "");
    }

    // Se temos data de expiração salva no banco
    if (fiscal.certExpiration) {
      const expDate = new Date(fiscal.certExpiration);
      const diff = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return {
        isValid: diff > 0,
        status: diff <= 0 ? "EXPIRED" : diff <= 30 ? "EXPIRING_SOON" : "VALID",
        statusText: diff <= 0 ? "Certificado Expirado" : diff <= 30 ? `Vence em ${diff} dias` : "Certificado Válido",
        validTo: expDate.toISOString(),
        daysRemaining: diff,
      };
    }

    return {
      isValid: false,
      status: "NOT_FOUND",
      statusText: "Certificado pendente de validação",
      error: "O arquivo do certificado foi marcado no sistema mas não pôde ser lido. Por favor, recarregue o arquivo .pfx e digite a senha.",
    };
  } catch (err: any) {
    return {
      isValid: false,
      status: "ERROR",
      statusText: "Erro ao consultar certificado",
      error: err.message,
    };
  }
}

/**
 * Valida o arquivo .pfx enviado via formulário ou testa a senha informada
 */
export async function validateAndUploadCertificate(formData: FormData): Promise<{
  success: boolean;
  certInfo?: CertificateInfo;
  error?: string;
}> {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { success: false, error: "Sessão não identificada ou expirada." };
    }

    const companyId = session.companyId;
    const file = formData.get("certFile") as File | null;
    const password = (formData.get("certPassword") as string) || "";

    if (!password) {
      return { success: false, error: "Digite a senha do certificado digital para validação." };
    }

    let buffer: Buffer | null = null;

    if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      // Tenta ler do certPath existente
      const fiscal = await prisma.fiscalConfig.findUnique({ where: { companyId } });
      if (fiscal?.certPath && fs.existsSync(fiscal.certPath)) {
        buffer = fs.readFileSync(fiscal.certPath);
      } else {
        // Fallback para arquivo em Downloads se existir
        const downloadCert = "C:\\Users\\tisup\\Downloads\\certificado_digital.pfx";
        if (fs.existsSync(downloadCert)) {
          buffer = fs.readFileSync(downloadCert);
        }
      }
    }

    if (!buffer) {
      return { success: false, error: "Nenhum arquivo de certificado (.pfx) foi enviado ou encontrado no sistema." };
    }

    // Valida criptografia e senha
    const certInfo = await inspectPfxBuffer(buffer, password);

    if (!certInfo.isValid && certInfo.status === "INVALID_PASSWORD") {
      return {
        success: false,
        certInfo,
        error: "Senha incorreta! O certificado rejeitou a senha informada. Digite a senha cadastrada na sua Autoridade Certificadora.",
      };
    }

    if (certInfo.status === "EXPIRED") {
      return {
        success: false,
        certInfo,
        error: `Certificado digital expirado em ${new Date(certInfo.validTo!).toLocaleDateString("pt-BR")}. Renove seu certificado para emitir notas.`,
      };
    }

    if (!certInfo.isValid) {
      return {
        success: false,
        certInfo,
        error: certInfo.error || "Arquivo de certificado digital inválido.",
      };
    }

    // Salva o arquivo .pfx de forma persistente
    const certsDir = path.join(process.cwd(), "packages", "database", "certs");
    if (!fs.existsSync(certsDir)) {
      fs.mkdirSync(certsDir, { recursive: true });
    }
    const finalPath = path.join(certsDir, `cert_${companyId}.pfx`);
    fs.writeFileSync(finalPath, buffer);

    // Atualiza fiscalConfig no banco
    await prisma.fiscalConfig.upsert({
      where: { companyId },
      update: {
        certPath: finalPath,
        certPassword: password,
        certExpiration: certInfo.validTo ? new Date(certInfo.validTo) : null,
        certUploaded: true,
      },
      create: {
        companyId,
        cnpj: certInfo.cnpj || "65.522.409/0001-13",
        companyName: certInfo.subjectName || "EMPORIO AGROBELEM LTDA",
        certPath: finalPath,
        certPassword: password,
        certExpiration: certInfo.validTo ? new Date(certInfo.validTo) : null,
        certUploaded: true,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/invoices");

    return {
      success: true,
      certInfo,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Erro inesperado ao processar certificado.",
    };
  }
}

