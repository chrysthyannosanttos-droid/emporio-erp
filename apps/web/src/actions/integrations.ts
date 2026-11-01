"use server";

import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export interface IntegrationCredentials {
  companyId: string;
  companyName: string;
  document: string;
  clientSlug: string;
  apiToken: string;
  cloudHost: string;
  cloudIp: string;
  localGatewayIp?: string;
  webhookUrl?: string;
  allowedApps: string[];
  active: boolean;
  createdAt: string;
}

/**
 * Busca ou gera automaticamente as credenciais de conexão do Cliente
 * para conectar outros apps (iFood, Anota AI, App Garçom, Balança, etc.)
 */
export async function getCompanyIntegrationCredentials(): Promise<{
  success: boolean;
  credentials?: IntegrationCredentials;
  error?: string;
}> {
  try {
    const session = await getSession();
    let companyId = session?.companyId;

    if (!companyId) {
      const firstComp = await prisma.company.findFirst();
      companyId = firstComp?.id;
    }

    if (!companyId) {
      return { success: false, error: "Empresa não autenticada." };
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        companyModules: {
          where: { moduleKey: "INTEGRATION_API" },
        },
        pdvTerminals: {
          where: { status: "ACTIVE" },
          take: 1,
        },
      },
    });

    if (!company) {
      return { success: false, error: "Empresa não encontrada." };
    }

    // Procura configuração salva no CompanyModule
    const mod = company.companyModules[0];
    let configData: any = {};
    if (mod?.config) {
      try {
        configData = JSON.parse(mod.config);
      } catch {}
    }

    // Se ainda não tiver token de API gerado para a empresa, gera um exclusivo
    let apiToken = configData.apiToken;
    let clientSlug = configData.clientSlug;

    if (!apiToken) {
      apiToken = `cyb_live_${crypto.randomBytes(20).toString("hex")}`;
      const docClean = (company.document || "").replace(/\D/g, "");
      const shortId = company.id.slice(0, 6);
      clientSlug = `emp_${docClean ? docClean.slice(-6) : shortId}`;

      configData = {
        apiToken,
        clientSlug,
        cloudHost: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        cloudIp: "164.92.215.80", // IP público de referência para VPS
        allowedApps: ["IFOOD", "ANOTA_AI", "GARCOM_APP", "CARDAPIO_DIGITAL", "BALANCA_TOLEDO"],
        active: true,
      };

      await prisma.companyModule.upsert({
        where: {
          companyId_moduleKey: {
            companyId,
            moduleKey: "INTEGRATION_API",
          },
        },
        update: {
          active: true,
          config: JSON.stringify(configData),
        },
        create: {
          companyId,
          moduleKey: "INTEGRATION_API",
          active: true,
          config: JSON.stringify(configData),
        },
      });
    }

    const localIp = company.pdvTerminals[0]?.ipAddress || "192.168.1.100";

    return {
      success: true,
      credentials: {
        companyId: company.id,
        companyName: company.name,
        document: company.document,
        clientSlug: configData.clientSlug || `emp_${company.id.slice(0, 6)}`,
        apiToken: configData.apiToken,
        cloudHost: configData.cloudHost || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        cloudIp: configData.cloudIp || "164.92.215.80",
        localGatewayIp: localIp,
        webhookUrl: configData.webhookUrl || "",
        allowedApps: configData.allowedApps || ["IFOOD", "ANOTA_AI", "GARCOM_APP"],
        active: configData.active !== false,
        createdAt: company.createdAt.toISOString(),
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao carregar credenciais" };
  }
}

/**
 * Regenera a Chave de API / Token Secreto do Cliente
 */
export async function regenerateApiToken(): Promise<{
  success: boolean;
  newToken?: string;
  error?: string;
}> {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { success: false, error: "Não autorizado" };
    }

    const newToken = `cyb_live_${crypto.randomBytes(20).toString("hex")}`;

    const existingMod = await prisma.companyModule.findUnique({
      where: {
        companyId_moduleKey: {
          companyId: session.companyId,
          moduleKey: "INTEGRATION_API",
        },
      },
    });

    let currentConfig: any = {};
    if (existingMod?.config) {
      try {
        currentConfig = JSON.parse(existingMod.config);
      } catch {}
    }

    currentConfig.apiToken = newToken;
    currentConfig.updatedAt = new Date().toISOString();

    await prisma.companyModule.upsert({
      where: {
        companyId_moduleKey: {
          companyId: session.companyId,
          moduleKey: "INTEGRATION_API",
        },
      },
      update: {
        config: JSON.stringify(currentConfig),
      },
      create: {
        companyId: session.companyId,
        moduleKey: "INTEGRATION_API",
        active: true,
        config: JSON.stringify(currentConfig),
      },
    });

    revalidatePath("/settings/integrations");
    return { success: true, newToken };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao regenerar token" };
  }
}

/**
 * Salva configurações de IP / Host / Webhook da Empresa
 */
export async function saveIntegrationSettings(data: {
  clientSlug?: string;
  cloudHost?: string;
  cloudIp?: string;
  webhookUrl?: string;
  allowedApps?: string[];
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { success: false, error: "Não autorizado" };
    }

    const existingMod = await prisma.companyModule.findUnique({
      where: {
        companyId_moduleKey: {
          companyId: session.companyId,
          moduleKey: "INTEGRATION_API",
        },
      },
    });

    let currentConfig: any = {};
    if (existingMod?.config) {
      try {
        currentConfig = JSON.parse(existingMod.config);
      } catch {}
    }

    const nextConfig = {
      ...currentConfig,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    await prisma.companyModule.upsert({
      where: {
        companyId_moduleKey: {
          companyId: session.companyId,
          moduleKey: "INTEGRATION_API",
        },
      },
      update: {
        config: JSON.stringify(nextConfig),
      },
      create: {
        companyId: session.companyId,
        moduleKey: "INTEGRATION_API",
        active: true,
        config: JSON.stringify(nextConfig),
      },
    });

    revalidatePath("/settings/integrations");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao salvar configurações" };
  }
}

