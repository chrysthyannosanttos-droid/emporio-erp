"use server";

import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { toPlain } from "@/lib/serialize";

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

    // Se houver fiscalConfig, atualizar nome fantasia, razão social e certificado nela também
    const certPassword = formData.get("certPassword") as string;
    const updateData: any = { companyName: name, cnpj: document };
    if (tradeName) updateData.tradeName = tradeName;
    if (certPassword) {
      updateData.certPassword = certPassword;
      updateData.certUploaded = true;
    }

    await prisma.fiscalConfig.upsert({
      where: { companyId: session.companyId },
      update: updateData,
      create: {
        companyId: session.companyId,
        tradeName: tradeName || null,
        companyName: name,
        cnpj: document,
        ...(certPassword ? { certPassword, certUploaded: true } : {}),
      },
    });

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
  if (!session?.isSuperAdmin && session?.role !== "ADMIN") redirect("/login");

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
  if (!session?.isSuperAdmin && session?.role !== "ADMIN") return { companies: [] };

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
  if (!session?.isSuperAdmin && session?.role !== "ADMIN") redirect("/login");

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

// ─── Dados públicos de uma empresa (para o Cardápio Digital da loja) ─────────
export async function getPublicCompany(companyIdOrSlug: string) {
  const key = (companyIdOrSlug || "").trim();
  if (!key) return { company: null };

  const company = await prisma.company.findFirst({
    where: {
      OR: [{ id: key }, { slug: key }],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      phone: true,
      whatsapp: true,
      address: true,
      licenseStatus: true,
      licenseExpiresAt: true,
      digitalMenuEnabled: true,
      digitalMenuBannerUrl: true,
      digitalMenuNotes: true,
      digitalMenuDeliveryFee: true,
      digitalMenuMinOrder: true,
      digitalMenuDeliveryEta: true,
      digitalMenuHours: true,
      digitalMenuPaymentMethods: true,
      digitalMenuInstagram: true,
      digitalMenuFacebook: true,
      digitalMenuStoreInfo: true,
      fiscalConfig: {
        select: {
          city: true,
          state: true,
          street: true,
          number: true,
          district: true,
          companyName: true,
          tradeName: true,
        },
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

  if (!company) {
    return { company: null };
  }

  // Verificar se a licença não está suspensa ou expirada
  if (
    company.licenseStatus === "SUSPENDED" ||
    new Date(company.licenseExpiresAt) < new Date()
  ) {
    return { company: null, licenseIssue: true };
  }

  const fiscalAddress = [
    company.fiscalConfig?.street,
    company.fiscalConfig?.number,
    company.fiscalConfig?.district,
    company.fiscalConfig?.city,
    company.fiscalConfig?.state,
  ]
    .filter(Boolean)
    .join(", ");

  const resolvedAddress = company.address || fiscalAddress || null;
  const themeFormatted = company.theme
    ? {
        ...company.theme,
        primaryColor: company.theme.corPrimaria || "#4f46e5",
      }
    : {
        logoPrincipal: null,
        corPrimaria: "#4f46e5",
        corSecundaria: null,
        backgroundSistema: null,
        primaryColor: "#4f46e5",
      };

  // Se o cardápio digital estiver desativado para esta empresa, retorna indicador claro
  if (company.digitalMenuEnabled === false) {
    return {
      digitalMenuDisabled: true,
      company: toPlain({
        id: company.id,
        slug: company.slug,
        name: company.name,
        phone: company.phone,
        whatsapp: company.whatsapp,
        address: resolvedAddress,
        digitalMenuEnabled: false,
        digitalMenuBannerUrl: company.digitalMenuBannerUrl,
        digitalMenuNotes: company.digitalMenuNotes,
        fiscalConfig: company.fiscalConfig,
        theme: themeFormatted,
        products: [],
        categories: [],
      }),
    };
  }

  const [products, allCategories] = await Promise.all([
    prisma.product.findMany({
      where: {
        companyId: company.id,
        showInDigitalMenu: true,
        isRawMaterial: false,
        isPackaging: false,
      },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        price: true,
        promoPrice: true,
        promoStartDate: true,
        promoEndDate: true,
        featured: true,
        stock: true,
        unit: true,
        barcode: true,
        internalCode: true,
        brand: true,
        isSelfProduced: true,
        categoryId: true,
        category: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            active: true,
            sortOrder: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: {
        companyId: company.id,
        active: true,
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        sortOrder: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  const now = new Date();
  const activeCategoryIds = new Set(allCategories.map((c) => c.id));

  const normalizedProducts = products
    .filter((p) => !p.categoryId || activeCategoryIds.has(p.categoryId))
    .map((p) => {
      const regularPrice = Number(p.price || 0);
      const rawPromo = p.promoPrice !== null && p.promoPrice !== undefined ? Number(p.promoPrice) : null;
      const promoInWindow =
        rawPromo !== null &&
        rawPromo > 0 &&
        rawPromo < regularPrice &&
        (!p.promoStartDate || new Date(p.promoStartDate) <= now) &&
        (!p.promoEndDate || new Date(p.promoEndDate) >= now);

      const effectivePrice = promoInWindow && rawPromo !== null ? rawPromo : regularPrice;
      const discountPercent =
        promoInWindow && rawPromo !== null && regularPrice > 0
          ? Math.round(((regularPrice - rawPromo) / regularPrice) * 100)
          : 0;

      return {
        ...p,
        price: regularPrice,
        promoPrice: promoInWindow ? rawPromo : null,
        effectivePrice,
        discountPercent,
        stock: Number(p.stock || 0),
      };
    });

  // Mostrar categorias ativas que tenham produtos publicados (ou todas ativas se houver produtos)
  const usedCatIds = new Set(normalizedProducts.map((p) => p.categoryId).filter(Boolean));
  const categories = allCategories.filter((c) => usedCatIds.has(c.id));

  let parsedPaymentMethods: string[] = ["PIX", "DINHEIRO", "CARTAO"];
  try {
    if (company.digitalMenuPaymentMethods) {
      const arr = JSON.parse(company.digitalMenuPaymentMethods);
      if (Array.isArray(arr) && arr.length > 0) parsedPaymentMethods = arr;
    }
  } catch {}

  const activeGateway = await prisma.paymentGatewayConfig.findFirst({
    where: { companyId: company.id, active: true, status: "CONNECTED" },
    select: { provider: true, merchantName: true, pixKey: true },
  });

  return {
    digitalMenuDisabled: false,
    company: toPlain({
      id: company.id,
      slug: company.slug,
      name: company.name,
      phone: company.phone,
      whatsapp: company.whatsapp,
      address: resolvedAddress,
      digitalMenuEnabled: true,
      digitalMenuBannerUrl: company.digitalMenuBannerUrl,
      digitalMenuNotes: company.digitalMenuNotes,
      digitalMenuDeliveryFee: Number(company.digitalMenuDeliveryFee || 0),
      digitalMenuMinOrder: Number(company.digitalMenuMinOrder || 0),
      digitalMenuDeliveryEta: company.digitalMenuDeliveryEta || "30 a 50 min",
      digitalMenuHours: company.digitalMenuHours || null,
      digitalMenuPaymentMethods: parsedPaymentMethods,
      digitalMenuInstagram: company.digitalMenuInstagram || null,
      digitalMenuFacebook: company.digitalMenuFacebook || null,
      digitalMenuStoreInfo: company.digitalMenuStoreInfo || null,
      hasDynamicPix: Boolean(activeGateway),
      pixProvider: activeGateway?.provider || null,
      pixMerchantName: activeGateway?.merchantName || null,
      fiscalConfig: company.fiscalConfig,
      theme: themeFormatted,
      products: normalizedProducts,
      categories,
    }),
  };
}
