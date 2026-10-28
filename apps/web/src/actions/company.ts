"use server";

import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// ─── Obter dados da empresa do Tenant logado ──────────────────────────────
export async function getTenantCompanyInfo() {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Não autorizado", company: null };
    }

    const company = await prisma.company.findUnique({
      where: { id: session.companyId },
      include: {
        fiscalConfig: true,
      },
    });

    return { company };
  } catch (err: any) {
    return { error: err.message, company: null };
  }
}

// ─── Atualizar dados gerais da empresa do Tenant logado ───────────────────
export async function updateTenantCompanyInfo(formData: FormData) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Sessão não autorizada ou empresa não identificada." };
    }

    const name = formData.get("name") as string;
    const document = formData.get("document") as string;
    const tradeName = formData.get("tradeName") as string;

    if (!name || !document) {
      return { error: "Razão Social e CNPJ/CPF são obrigatórios." };
    }

    const company = await prisma.company.update({
      where: { id: session.companyId },
      data: {
        name,
        document,
      },
    });

    // Se houver fiscalConfig, atualizar nome fantasia nela também
    if (tradeName) {
      await prisma.fiscalConfig.upsert({
        where: { companyId: session.companyId },
        update: { tradeName, companyName: name, cnpj: document },
        create: {
          companyId: session.companyId,
          tradeName,
          companyName: name,
          cnpj: document,
        },
      });
    }

    revalidatePath("/settings");
    return { success: true, company };
  } catch (err: any) {
    return { error: err.message || "Erro ao atualizar informações da empresa." };
  }
}

// ─── Obter Configurações de Custo Operacional ─────────────────────────────
export async function getOperationalCostConfig() {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Não autorizado", config: null };
    }

    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT "defaultOperationalRate", "defaultProfitMargin", "defaultFreightOther", "operationalCostDetails" 
       FROM companies WHERE id = $1 LIMIT 1`,
      session.companyId
    );

    if (!rows || rows.length === 0) {
      return { 
        config: {
          defaultOperationalRate: 15,
          defaultProfitMargin: 25,
          defaultFreightOther: 0,
          operationalCostDetails: {}
        } 
      };
    }

    const row = rows[0];
    let details: Record<string, number> = {};
    try {
      details = typeof row.operationalCostDetails === "string" 
        ? JSON.parse(row.operationalCostDetails || "{}") 
        : (row.operationalCostDetails || {});
    } catch {
      details = {};
    }

    return {
      config: {
        defaultOperationalRate: row.defaultOperationalRate !== null && row.defaultOperationalRate !== undefined ? Number(row.defaultOperationalRate) : 15,
        defaultProfitMargin: row.defaultProfitMargin !== null && row.defaultProfitMargin !== undefined ? Number(row.defaultProfitMargin) : 25,
        defaultFreightOther: row.defaultFreightOther !== null && row.defaultFreightOther !== undefined ? Number(row.defaultFreightOther) : 0,
        operationalCostDetails: details,
      }
    };
  } catch (err: any) {
    return { error: err.message, config: null };
  }
}

// ─── Atualizar Configurações de Custo Operacional ──────────────────────────
export async function updateOperationalCostConfig(data: {
  defaultOperationalRate: number;
  defaultProfitMargin: number;
  defaultFreightOther: number;
  operationalCostDetails?: Record<string, number>;
}) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Sessão não autorizada ou empresa não identificada." };
    }

    const rate = Math.max(0, Math.min(100, Number(data.defaultOperationalRate) || 0));
    const margin = Math.max(0, Math.min(100, Number(data.defaultProfitMargin) || 0));
    const freight = Math.max(0, Math.min(100, Number(data.defaultFreightOther) || 0));
    const detailsStr = JSON.stringify(data.operationalCostDetails || {});

    await prisma.$executeRawUnsafe(
      `UPDATE companies 
       SET "defaultOperationalRate" = $1, 
           "defaultProfitMargin" = $2, 
           "defaultFreightOther" = $3, 
           "operationalCostDetails" = $4,
           "updatedAt" = NOW()
       WHERE id = $5`,
      rate,
      margin,
      freight,
      detailsStr,
      session.companyId
    );

    revalidatePath("/settings");
    revalidatePath("/stock/new");
    revalidatePath("/pricing");

    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao salvar configurações de custo operacional." };
  }
}

// ─── Atualizar Perfil Completo & Módulos da Empresa ──────────────────────────
export async function updateCompanyFullProfile(data: {
  name: string;
  document: string;
  tradeName?: string;
  segment?: string;
  ie?: string;
  im?: string;
  taxRegime?: string;
  environment?: string;
  street?: string;
  number?: string;
  district?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  operationTypes: string[];
  activeModules: string[];
}) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Sessão não autorizada ou empresa não identificada." };
    }

    const company = await prisma.company.update({
      where: { id: session.companyId },
      data: {
        name: data.name,
        document: data.document,
        segment: data.segment || "SUPERMARKET",
        operationTypes: JSON.stringify(data.operationTypes),
        activeModules: JSON.stringify(data.activeModules),
      },
    });

    // Atualizar ou criar FiscalConfig
    await prisma.fiscalConfig.upsert({
      where: { companyId: session.companyId },
      update: {
        companyName: data.name,
        tradeName: data.tradeName || data.name,
        cnpj: data.document,
        ie: data.ie,
        im: data.im,
        taxRegime: data.taxRegime || "SN",
        environment: data.environment || "homologacao",
        street: data.street,
        number: data.number,
        district: data.district,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
      },
      create: {
        companyId: session.companyId,
        companyName: data.name,
        tradeName: data.tradeName || data.name,
        cnpj: data.document,
        ie: data.ie,
        im: data.im,
        taxRegime: data.taxRegime || "SN",
        environment: data.environment || "homologacao",
        street: data.street,
        number: data.number,
        district: data.district,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
      },
    });

    // Atualizar companyModules
    for (const moduleKey of data.activeModules) {
      await prisma.companyModule.upsert({
        where: {
          companyId_moduleKey: {
            companyId: session.companyId,
            moduleKey,
          },
        },
        update: { active: true },
        create: {
          companyId: session.companyId,
          moduleKey,
          active: true,
        },
      });
    }

    revalidatePath("/", "layout");
    revalidatePath("/settings/modules");
    return { success: true, company };
  } catch (err: any) {
    return { error: err.message || "Erro ao atualizar perfil completo da empresa." };
  }
}

// ─── Criar empresa + usuário admin ───────────────────────────────────────────
import { SEGMENT_PRESETS } from "@/lib/modules-catalog";

export async function createCompany(formData: FormData) {
  const session = await getSession();
  if (!session?.isSuperAdmin) redirect("/login");

  const name = formData.get("name") as string;
  const document = formData.get("document") as string;
  const adminName = formData.get("adminName") as string;
  const adminEmail = formData.get("adminEmail") as string;
  const adminPassword = formData.get("adminPassword") as string;
  const days = Number(formData.get("licenseDays") || "30");
  const segment = (formData.get("segment") as string) || "SUPERMARKET";

  if (!name || !document || !adminName || !adminEmail || !adminPassword) {
    return { error: "Todos os campos são obrigatórios." };
  }

  // Verificar se documento já existe
  const existing = await prisma.company.findFirst({ where: { document } });
  if (existing) return { error: "CNPJ/CPF já cadastrado." };

  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const preset = SEGMENT_PRESETS[segment] || SEGMENT_PRESETS.SUPERMARKET;
  const operationTypesJson = JSON.stringify(preset.operationTypes);
  const activeModulesJson = JSON.stringify(preset.modules);

  const company = await prisma.company.create({
    data: {
      name,
      document,
      licenseStatus: "ACTIVE",
      licenseExpiresAt: expiresAt,
      segment,
      operationTypes: operationTypesJson,
      activeModules: activeModulesJson,
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
