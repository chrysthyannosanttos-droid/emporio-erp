"use server";

import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function toPlain<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_key, val) => {
      if (
        val !== null &&
        typeof val === "object" &&
        "toNumber" in val &&
        typeof (val as { toNumber: () => number }).toNumber === "function"
      ) {
        return (val as { toNumber: () => number }).toNumber();
      }
      if (typeof val === "bigint") return Number(val);
      return val;
    })
  );
}

function getErrMessage(err: unknown, fallback = "Erro inesperado."): string {
  return err instanceof Error ? err.message : fallback;
}

function isMasterAuthorized(session: Awaited<ReturnType<typeof getSession>>) {
  return Boolean(session && (session.isSuperAdmin || session.role === "ADMIN"));
}

function normalizeSlug(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function parseJsonArray(raw: unknown, fallback: string[] = []): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function safeParseSefazMeta(emitterEndpoint?: string | null) {
  const defaults = {
    cscId: "000001",
    cscToken: "",
    ibgeCode: "2700805",
    hasCertBase64: false,
  };
  if (!emitterEndpoint) return defaults;
  try {
    if (emitterEndpoint.trim().startsWith("{")) {
      const parsed = JSON.parse(emitterEndpoint);
      return {
        cscId: parsed.cscId || "000001",
        cscToken: parsed.cscToken || "",
        ibgeCode: parsed.ibgeCode || "2700805",
        hasCertBase64: Boolean(parsed.certBase64),
      };
    }
  } catch {
    // ignore malformed metadata
  }
  return defaults;
}

export async function updateCompanyStatus(companyId: string, status: string) {
  const session = await getSession();
  if (!isMasterAuthorized(session)) redirect("/login");

  if (!companyId || !status) return { error: "Parâmetros inválidos." };

  try {
    const company = await prisma.company.update({
      where: { id: companyId },
      data: { licenseStatus: status },
    });
    revalidatePath(`/master/companies/${companyId}`);
    revalidatePath("/master/companies");
    revalidatePath("/master");
    return { success: true, company: toPlain(company) };
  } catch (err: unknown) {
    return { error: getErrMessage(err) };
  }
}

export async function renewCompanyLicense(companyId: string, days: number) {
  const session = await getSession();
  if (!isMasterAuthorized(session)) redirect("/login");

  if (!companyId || !Number.isFinite(days) || days <= 0) {
    return { error: "Parâmetros inválidos para renovação." };
  }

  try {
    const current = await prisma.company.findUnique({ where: { id: companyId } });
    if (!current) return { error: "Empresa não encontrada." };

    // Renovar a partir de hoje ou da data atual de expiração (o que for maior)
    const baseDate =
      new Date(current.licenseExpiresAt) > new Date()
        ? new Date(current.licenseExpiresAt)
        : new Date();
    const newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

    const company = await prisma.company.update({
      where: { id: companyId },
      data: { licenseExpiresAt: newExpiry, licenseStatus: "ACTIVE" },
    });
    revalidatePath(`/master/companies/${companyId}`);
    revalidatePath("/master/companies");
    revalidatePath("/master");
    return { success: true, company: toPlain(company) };
  } catch (err: unknown) {
    return { error: getErrMessage(err) };
  }
}

export async function getCompanyDetails(companyId: string) {
  const session = await getSession();
  if (!isMasterAuthorized(session)) return { company: null };
  if (!companyId) return { company: null };

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      plan: true,
      users: {
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      },
      _count: {
        select: {
          users: true,
          products: true,
          customers: true,
          sales: true,
          invoices: true,
        },
      },
    },
  });

  return { company: toPlain(company) };
}

export async function updateCompanyMaster(
  companyId: string,
  data: {
    name: string;
    document: string;
    planId?: string | null;
    licenseExpiresAt?: string;
    activeModules?: string[];
  }
) {
  const session = await getSession();
  if (!isMasterAuthorized(session)) redirect("/login");

  if (!companyId || !data.name?.trim() || !data.document?.trim()) {
    return { error: "Razão Social e CNPJ/CPF são obrigatórios." };
  }

  try {
    const updateData: Record<string, unknown> = {
      name: data.name.trim(),
      document: data.document.trim(),
      planId: data.planId || null,
    };

    if (data.licenseExpiresAt) {
      updateData.licenseExpiresAt = new Date(data.licenseExpiresAt);
    }

    if (data.activeModules) {
      updateData.activeModules = JSON.stringify(data.activeModules);
    }

    const company = await prisma.company.update({
      where: { id: companyId },
      data: updateData,
    });

    revalidatePath(`/master/companies/${companyId}`);
    revalidatePath("/master/companies");
    return { success: true, company: toPlain(company) };
  } catch (err: unknown) {
    return { error: `Erro ao atualizar empresa: ${getErrMessage(err)}` };
  }
}

export interface CompanySupportBundle {
  company: {
    id: string;
    name: string;
    document: string;
    licenseStatus: string;
    licenseExpiresAt: string;
    segment: string;
    operationTypes: string[];
    activeModules: string[];
    defaultOperationalRate: number;
    defaultProfitMargin: number;
    defaultFreightOther: number;
    slug: string;
    phone: string;
    whatsapp: string;
    address: string;
    digitalMenuEnabled: boolean;
    digitalMenuBannerUrl: string;
    digitalMenuNotes: string;
    hasHotelTabs: boolean;
    planId: string | null;
    plan: { id: string; name: string; price: number } | null;
    createdAt: string;
    updatedAt: string;
  };
  fiscalConfig: {
    id: string;
    cnpj: string;
    ie: string;
    im: string;
    companyName: string;
    tradeName: string;
    taxRegime: string;
    environment: string;
    nfeSeries: string;
    nfceeSeries: string;
    nextNfeNumber: number;
    nextNfceNumber: number;
    street: string;
    number: string;
    district: string;
    city: string;
    state: string;
    zipCode: string;
    focusNfeToken: string;
    cscId: string;
    cscToken: string;
    ibgeCode: string;
    certUploaded: boolean;
    certPath: string | null;
    certExpiration: string | null;
  } | null;
  counts: {
    users: number;
    products: number;
    customers: number;
    suppliers: number;
    legacySaiposSuppliers: number;
    stockEntries: number;
    sales: number;
    pdvTerminals: number;
    invoices: number;
    digitalMenuProducts: number;
    customerRooms: number;
  };
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    roleId: string | null;
    roleName: string | null;
    active: boolean;
    hasPin: boolean;
    allowMobilePdv: boolean;
    lastLogin: string | null;
    createdAt: string;
  }>;
  customerRooms: Array<{
    id: string;
    code: string;
    name: string;
    guestName: string | null;
    active: boolean;
    customerId: string;
    customerName: string;
  }>;
}

/**
 * Carrega o pacote completo de dados reais do tenant para o Painel de Suporte (/master/companies/[id]).
 */
export async function getCompanySupportBundle(companyId: string): Promise<{
  bundle: CompanySupportBundle | null;
  error?: string;
}> {
  const session = await getSession();
  if (!isMasterAuthorized(session)) {
    return { bundle: null, error: "Acesso negado. Apenas Super Admin ou Administrador." };
  }

  if (!companyId || !companyId.trim()) {
    return { bundle: null, error: "ID da empresa não informado." };
  }

  try {
    const [company, digitalMenuProducts, legacySaiposSuppliers] = await Promise.all([
      prisma.company.findUnique({
        where: { id: companyId },
        include: {
          plan: true,
          fiscalConfig: true,
          users: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              roleId: true,
              active: true,
              pin: true,
              lastLogin: true,
              createdAt: true,
              roleRelation: {
                select: { name: true, key: true },
              },
              userPermissions: {
                where: { permission: { code: "pdv.mobile" } },
                select: { granted: true },
              },
            },
          },
          customerRooms: {
            orderBy: { code: "asc" },
            include: {
              customer: { select: { id: true, name: true } },
            },
          },
          _count: {
            select: {
              users: true,
              products: true,
              customers: true,
              suppliers: true,
              stockEntries: true,
              sales: true,
              pdvTerminals: true,
              invoices: true,
            },
          },
        },
      }),
      prisma.product.count({
        where: { companyId, showInDigitalMenu: true },
      }),
      prisma.supplier.count({
        where: { companyId, isLegacySaipos: true },
      }),
    ]);

    if (!company) {
      return { bundle: null, error: "Empresa não encontrada." };
    }

    const plain = toPlain(company);
    const fc = plain.fiscalConfig;
    const sefazMeta = safeParseSefazMeta(fc?.emitterEndpoint);

    const bundle: CompanySupportBundle = {
      company: {
        id: plain.id,
        name: plain.name,
        document: plain.document,
        licenseStatus: plain.licenseStatus || "ACTIVE",
        licenseExpiresAt: String(plain.licenseExpiresAt),
        segment: plain.segment || "SUPERMARKET",
        operationTypes: parseJsonArray(plain.operationTypes, ["RETAIL"]),
        activeModules: parseJsonArray(plain.activeModules, []),
        defaultOperationalRate: Number(plain.defaultOperationalRate ?? 15),
        defaultProfitMargin: Number(plain.defaultProfitMargin ?? 25),
        defaultFreightOther: Number(plain.defaultFreightOther ?? 0),
        slug: plain.slug || "",
        phone: plain.phone || "",
        whatsapp: plain.whatsapp || "",
        address: plain.address || "",
        digitalMenuEnabled: Boolean(plain.digitalMenuEnabled),
        digitalMenuBannerUrl: plain.digitalMenuBannerUrl || "",
        digitalMenuNotes: plain.digitalMenuNotes || "",
        hasHotelTabs: Boolean(plain.hasHotelTabs),
        planId: plain.planId || null,
        plan: plain.plan
          ? { id: plain.plan.id, name: plain.plan.name, price: Number(plain.plan.price || 0) }
          : null,
        createdAt: String(plain.createdAt),
        updatedAt: String(plain.updatedAt),
      },
      fiscalConfig: fc
        ? {
            id: fc.id,
            cnpj: fc.cnpj || "",
            ie: fc.ie || "",
            im: fc.im || "",
            companyName: fc.companyName || plain.name,
            tradeName: fc.tradeName || "",
            taxRegime: fc.taxRegime || "SN",
            environment: fc.environment || "homologacao",
            nfeSeries: fc.nfeSeries || "1",
            nfceeSeries: fc.nfceeSeries || "1",
            nextNfeNumber: Number(fc.nextNfeNumber || 1),
            nextNfceNumber: Number(fc.nextNfceNumber || 1),
            street: fc.street || "",
            number: fc.number || "",
            district: fc.district || "",
            city: fc.city || "",
            state: fc.state || "",
            zipCode: fc.zipCode || "",
            focusNfeToken: fc.focusNfeToken || "",
            cscId: sefazMeta.cscId,
            cscToken: sefazMeta.cscToken,
            ibgeCode: sefazMeta.ibgeCode,
            certUploaded: Boolean(fc.certUploaded || fc.certPath || sefazMeta.hasCertBase64),
            certPath: fc.certPath || null,
            certExpiration: fc.certExpiration ? String(fc.certExpiration) : null,
          }
        : null,
      counts: {
        users: Number(plain._count?.users || 0),
        products: Number(plain._count?.products || 0),
        customers: Number(plain._count?.customers || 0),
        suppliers: Number(plain._count?.suppliers || 0),
        legacySaiposSuppliers: Number(legacySaiposSuppliers || 0),
        stockEntries: Number(plain._count?.stockEntries || 0),
        sales: Number(plain._count?.sales || 0),
        pdvTerminals: Number(plain._count?.pdvTerminals || 0),
        invoices: Number(plain._count?.invoices || 0),
        digitalMenuProducts: Number(digitalMenuProducts || 0),
        customerRooms: Array.isArray(plain.customerRooms) ? plain.customerRooms.length : 0,
      },
      users: (plain.users || []).map((u) => {
        const permOverride = Array.isArray(u.userPermissions) && u.userPermissions.length > 0
          ? u.userPermissions[0]
          : null;
        const allowMobilePdv =
          u.role === "ADMIN" ||
          u.role === "SUPERVISOR" ||
          u.role === "OPERATOR" ||
          u.role === "CASHIER"
            ? permOverride
              ? Boolean(permOverride.granted)
              : true
            : Boolean(permOverride?.granted);

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          roleId: u.roleId || null,
          roleName: u.roleRelation?.name || null,
          active: Boolean(u.active),
          hasPin: Boolean(u.pin),
          allowMobilePdv,
          lastLogin: u.lastLogin ? String(u.lastLogin) : null,
          createdAt: String(u.createdAt),
        };
      }),
      customerRooms: (plain.customerRooms || []).map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        guestName: r.guestName || null,
        active: Boolean(r.active),
        customerId: r.customerId,
        customerName: r.customer?.name || "Cliente",
      })),
    };

    return { bundle };
  } catch (err: unknown) {
    return { bundle: null, error: getErrMessage(err, "Erro ao carregar dados de suporte da empresa.") };
  }
}

export interface UpdateTenantFullConfigInput {
  name: string;
  document: string;
  slug?: string | null;
  whatsapp?: string | null;
  phone?: string | null;
  address?: string | null;
  segment?: string | null;
  operationTypes?: string[];
  activeModules?: string[];
  digitalMenuEnabled?: boolean;
  digitalMenuNotes?: string | null;
  hasHotelTabs?: boolean;
  defaultOperationalRate?: number;
  defaultProfitMargin?: number;
  defaultFreightOther?: number;
  licenseStatus?: string;
  licenseExpiresAt?: string;
  planId?: string | null;
}

/**
 * Atualiza todas as configurações operacionais, cardápio digital, módulos e licença do cliente.
 */
export async function updateTenantFullConfig(
  companyId: string,
  data: UpdateTenantFullConfigInput
) {
  const session = await getSession();
  if (!isMasterAuthorized(session)) {
    return { error: "Acesso negado. Apenas Super Admin ou Administrador." };
  }

  if (!companyId || !companyId.trim()) {
    return { error: "Empresa inválida." };
  }

  const name = data.name?.trim();
  const document = data.document?.trim();
  if (!name || !document) {
    return { error: "Razão Social e CNPJ/CPF são obrigatórios." };
  }

  try {
    const existing = await prisma.company.findUnique({ where: { id: companyId } });
    if (!existing) {
      return { error: "Empresa não encontrada." };
    }

    // Validar documento único
    const docOwner = await prisma.company.findFirst({
      where: { document, NOT: { id: companyId } },
      select: { id: true, name: true },
    });
    if (docOwner) {
      return { error: `Este CNPJ/CPF já está cadastrado para a empresa "${docOwner.name}".` };
    }

    // Normalizar e validar slug único do Cardápio Digital
    let finalSlug: string | null = existing.slug;
    if (data.slug !== undefined) {
      const normalized = normalizeSlug(data.slug || "");
      if (normalized.length > 0) {
        if (normalized.length < 3) {
          return { error: "O slug do cardápio digital deve ter ao menos 3 caracteres válidos (letras/números)." };
        }
        const slugOwner = await prisma.company.findFirst({
          where: { slug: normalized, NOT: { id: companyId } },
          select: { id: true, name: true },
        });
        if (slugOwner) {
          return {
            error: `O slug "/loja/${normalized}" já está em uso pela empresa "${slugOwner.name}". Escolha outro.`,
          };
        }
        finalSlug = normalized;
      } else {
        finalSlug = null;
      }
    }

    const opRate = Number(data.defaultOperationalRate);
    const profitMargin = Number(data.defaultProfitMargin);
    const freightOther = Number(data.defaultFreightOther);

    const activeModulesList = Array.isArray(data.activeModules)
      ? data.activeModules.map((m) => String(m).trim()).filter(Boolean)
      : parseJsonArray(existing.activeModules, []);

    const operationTypesList = Array.isArray(data.operationTypes) && data.operationTypes.length > 0
      ? data.operationTypes.map((o) => String(o).trim()).filter(Boolean)
      : parseJsonArray(existing.operationTypes, ["RETAIL"]);

    const updated = await prisma.company.update({
      where: { id: companyId },
      data: {
        name,
        document,
        slug: finalSlug,
        whatsapp: data.whatsapp !== undefined ? (data.whatsapp?.trim() || null) : existing.whatsapp,
        phone: data.phone !== undefined ? (data.phone?.trim() || null) : existing.phone,
        address: data.address !== undefined ? (data.address?.trim() || null) : existing.address,
        segment: data.segment || existing.segment || "SUPERMARKET",
        operationTypes: JSON.stringify(operationTypesList),
        activeModules: JSON.stringify(activeModulesList),
        digitalMenuEnabled:
          data.digitalMenuEnabled !== undefined
            ? Boolean(data.digitalMenuEnabled)
            : existing.digitalMenuEnabled,
        digitalMenuNotes:
          data.digitalMenuNotes !== undefined
            ? (data.digitalMenuNotes?.trim() || null)
            : existing.digitalMenuNotes,
        hasHotelTabs:
          data.hasHotelTabs !== undefined ? Boolean(data.hasHotelTabs) : existing.hasHotelTabs,
        defaultOperationalRate: Number.isFinite(opRate)
          ? Math.max(0, Math.min(100, opRate))
          : existing.defaultOperationalRate,
        defaultProfitMargin: Number.isFinite(profitMargin)
          ? Math.max(0, Math.min(500, profitMargin))
          : existing.defaultProfitMargin,
        defaultFreightOther: Number.isFinite(freightOther)
          ? Math.max(0, Math.min(100, freightOther))
          : existing.defaultFreightOther,
        licenseStatus: data.licenseStatus || existing.licenseStatus,
        licenseExpiresAt: data.licenseExpiresAt
          ? new Date(data.licenseExpiresAt)
          : existing.licenseExpiresAt,
        planId: data.planId !== undefined ? (data.planId || null) : existing.planId,
      },
    });

    // Sincronizar tabela company_modules se activeModules foi informado
    if (Array.isArray(data.activeModules)) {
      await prisma.companyModule.updateMany({
        where: { companyId, moduleKey: { notIn: activeModulesList } },
        data: { active: false },
      });
      for (const moduleKey of activeModulesList) {
        await prisma.companyModule.upsert({
          where: { companyId_moduleKey: { companyId, moduleKey } },
          update: { active: true },
          create: { companyId, moduleKey, active: true },
        });
      }
    }

    revalidatePath(`/master/companies/${companyId}`);
    revalidatePath("/master/companies");
    revalidatePath("/master");
    if (finalSlug) revalidatePath(`/loja/${finalSlug}`);
    revalidatePath(`/loja/${companyId}`);

    return { success: true, company: toPlain(updated) };
  } catch (err: unknown) {
    return { error: `Erro ao atualizar configuração da empresa: ${getErrMessage(err)}` };
  }
}

export interface UpdateTenantFiscalConfigInput {
  cnpj: string;
  companyName?: string;
  tradeName?: string | null;
  ie?: string | null;
  im?: string | null;
  taxRegime: string;
  environment: string;
  nfeSeries?: string;
  nfceeSeries?: string;
  nextNfeNumber?: number;
  nextNfceNumber?: number;
  street?: string | null;
  number?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  cscId?: string | null;
  cscToken?: string | null;
  ibgeCode?: string | null;
  focusNfeToken?: string | null;
}

/**
 * Cria ou atualiza a configuração fiscal (SEFAZ / NF-e / NFC-e) do tenant alvo.
 */
export async function updateTenantFiscalConfig(
  companyId: string,
  data: UpdateTenantFiscalConfigInput
) {
  const session = await getSession();
  if (!isMasterAuthorized(session)) {
    return { error: "Acesso negado. Apenas Super Admin ou Administrador." };
  }

  if (!companyId || !companyId.trim()) {
    return { error: "Empresa inválida." };
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { fiscalConfig: true },
    });
    if (!company) {
      return { error: "Empresa não encontrada." };
    }

    const cnpj = (data.cnpj || company.document || "").trim();
    const companyName = (data.companyName || company.name || "").trim();
    if (!cnpj || !companyName) {
      return { error: "CNPJ e Razão Social Fiscal são obrigatórios." };
    }

    const allowedRegimes = new Set(["SN", "LP", "LR"]);
    const taxRegime = allowedRegimes.has(data.taxRegime) ? data.taxRegime : "SN";

    const allowedEnvs = new Set(["homologacao", "producao"]);
    const environment = allowedEnvs.has(data.environment) ? data.environment : "homologacao";

    const nextNfeNumber = Math.max(1, Math.floor(Number(data.nextNfeNumber) || 1));
    const nextNfceNumber = Math.max(1, Math.floor(Number(data.nextNfceNumber) || 1));

    // Preservar metadados existentes (como certBase64 / lastNsu) em emitterEndpoint
    let prevMeta: Record<string, unknown> = {};
    if (company.fiscalConfig?.emitterEndpoint) {
      try {
        if (company.fiscalConfig.emitterEndpoint.trim().startsWith("{")) {
          prevMeta = JSON.parse(company.fiscalConfig.emitterEndpoint);
        }
      } catch {
        prevMeta = {};
      }
    }

    const nextMeta = {
      ...prevMeta,
      cscId: data.cscId?.trim() || (prevMeta.cscId as string) || "000001",
      cscToken: data.cscToken !== undefined ? (data.cscToken?.trim() || "") : ((prevMeta.cscToken as string) || ""),
      ibgeCode: data.ibgeCode?.trim() || (prevMeta.ibgeCode as string) || "2700805",
    };

    const payload = {
      cnpj,
      companyName,
      tradeName: data.tradeName?.trim() || null,
      ie: data.ie?.trim() || null,
      im: data.im?.trim() || null,
      taxRegime,
      environment,
      nfeSeries: data.nfeSeries?.trim() || "1",
      nfceeSeries: data.nfceeSeries?.trim() || "1",
      nextNfeNumber,
      nextNfceNumber,
      street: data.street?.trim() || null,
      number: data.number?.trim() || null,
      district: data.district?.trim() || null,
      city: data.city?.trim() || null,
      state: data.state?.trim().toUpperCase().slice(0, 2) || null,
      zipCode: data.zipCode?.trim() || null,
      focusNfeToken: data.focusNfeToken?.trim() || null,
      emitterEndpoint: JSON.stringify(nextMeta),
    };

    const fiscal = await prisma.fiscalConfig.upsert({
      where: { companyId },
      update: payload,
      create: {
        companyId,
        ...payload,
      },
    });

    revalidatePath(`/master/companies/${companyId}`);
    revalidatePath("/settings");
    revalidatePath("/invoices");

    return { success: true, fiscalConfig: toPlain(fiscal) };
  } catch (err: unknown) {
    return { error: `Erro ao salvar configuração fiscal: ${getErrMessage(err)}` };
  }
}
