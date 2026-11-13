"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

function serializeSupplier(supplier: any) {
  if (!supplier) return null;
  return JSON.parse(JSON.stringify(supplier));
}

export async function getSuppliers(
  search?: string,
  category?: string,
  originFilter?: "ALL" | "CURRENT" | "SAIPOS"
) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Não autorizado", suppliers: [] };
    }

    const where: any = { companyId: session.companyId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { tradeName: { contains: search, mode: "insensitive" } },
        { document: { contains: search, mode: "insensitive" } },
        { contactName: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category && category !== "Todos") {
      where.category = category;
    }

    if (originFilter === "SAIPOS") {
      where.isLegacySaipos = true;
    } else if (originFilter === "CURRENT") {
      where.isLegacySaipos = false;
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return { success: true, suppliers: serializeSupplier(suppliers) };
  } catch (err: any) {
    return { error: err.message || "Erro ao buscar fornecedores", suppliers: [] };
  }
}

export async function createSupplier(data: {
  name: string;
  tradeName?: string;
  document?: string;
  stateReg?: string;
  municipalReg?: string;
  taxRegime?: string;
  isIcmsContributor: boolean;
  suframa?: string;
  defaultPaymentTerm?: string;
  discountPercent?: number;
  email?: string;
  phone?: string;
  phone2?: string;
  quoteEmail?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  zipCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  country?: string;
  deliveryDays?: string;
  deliveryLeadDays?: number;
  minOrderValue?: number;
  deliveryNotes?: string;
  category?: string;
  segment?: string;
  systemType?: string;
  isLegacySaipos?: boolean;
  legacySystem?: string;
  rating?: number;
  status?: string;
  notes?: string;
}) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Sessão inválida ou empresa não identificada." };
    }

    const isLegacy = Boolean(data.isLegacySaipos);

    const supplier = await prisma.supplier.create({
      data: {
        ...data,
        isLegacySaipos: isLegacy,
        legacySystem: isLegacy ? (data.legacySystem?.trim() || "SAIPOS") : (data.legacySystem?.trim() || null),
        discountPercent: data.discountPercent || 0,
        minOrderValue: data.minOrderValue || 0,
        companyId: session.companyId,
      },
    });

    revalidatePath("/suppliers");
    return { success: true, supplier: serializeSupplier(supplier) };
  } catch (err: any) {
    return { error: err.message || "Erro ao cadastrar fornecedor" };
  }
}

export async function updateSupplier(
  id: string,
  data: {
    name: string;
    tradeName?: string;
    document?: string;
    stateReg?: string;
    municipalReg?: string;
    taxRegime?: string;
    isIcmsContributor: boolean;
    suframa?: string;
    defaultPaymentTerm?: string;
    discountPercent?: number;
    email?: string;
    phone?: string;
    phone2?: string;
    quoteEmail?: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    zipCode?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    country?: string;
    deliveryDays?: string;
    deliveryLeadDays?: number;
    minOrderValue?: number;
    deliveryNotes?: string;
    category?: string;
    segment?: string;
    systemType?: string;
    isLegacySaipos?: boolean;
    legacySystem?: string;
    rating?: number;
    status?: string;
    notes?: string;
  }
) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Não autorizado" };
    }

    const existing = await prisma.supplier.findFirst({
      where: { id, companyId: session.companyId },
      select: { id: true },
    });
    if (!existing) {
      return { error: "Fornecedor não encontrado nesta empresa." };
    }

    const updatePayload: any = {
      ...data,
      discountPercent: data.discountPercent || 0,
      minOrderValue: data.minOrderValue || 0,
    };

    if (data.isLegacySaipos !== undefined) {
      updatePayload.isLegacySaipos = Boolean(data.isLegacySaipos);
      updatePayload.legacySystem = data.isLegacySaipos
        ? (data.legacySystem?.trim() || "SAIPOS")
        : null;
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: updatePayload,
    });

    revalidatePath("/suppliers");
    return { success: true, supplier: serializeSupplier(supplier) };
  } catch (err: any) {
    return { error: err.message || "Erro ao atualizar fornecedor" };
  }
}

/**
 * Verifica fornecedores da empresa cuja primeira entrada/nota é anterior a 2026-11-04
 * ou cujo cadastro/observações indiquem origem Saipos, marcando-os como antigos do Saipos.
 */
export async function syncLegacySaiposSuppliers() {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { success: false, error: "Não autorizado", updatedCount: 0, totalLegacy: 0 };
    }

    const cutoffDate = new Date("2026-11-04T00:00:00-03:00");

    const suppliers = await prisma.supplier.findMany({
      where: { companyId: session.companyId },
      select: {
        id: true,
        isLegacySaipos: true,
        legacySystem: true,
        systemType: true,
        notes: true,
        stockEntries: {
          orderBy: { entryDate: "asc" },
          take: 1,
          select: { entryDate: true },
        },
        purchaseOrders: {
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    const idsToMark: string[] = [];

    for (const s of suppliers) {
      const firstEntryDate = s.stockEntries[0]?.entryDate;
      const firstOrderDate = s.purchaseOrders[0]?.createdAt;

      const hasLegacyEntry =
        (firstEntryDate && firstEntryDate < cutoffDate) ||
        (firstOrderDate && firstOrderDate < cutoffDate);

      const hasSaiposOrigin =
        Boolean(s.legacySystem?.toUpperCase().includes("SAIPOS")) ||
        Boolean(s.systemType?.toUpperCase().includes("SAIPOS")) ||
        Boolean(s.notes?.toUpperCase().includes("SAIPOS"));

      if ((hasLegacyEntry || hasSaiposOrigin) && (!s.isLegacySaipos || s.legacySystem !== "SAIPOS")) {
        idsToMark.push(s.id);
      }
    }

    let updatedCount = 0;
    if (idsToMark.length > 0) {
      const result = await prisma.supplier.updateMany({
        where: {
          id: { in: idsToMark },
          companyId: session.companyId,
        },
        data: {
          isLegacySaipos: true,
          legacySystem: "SAIPOS",
        },
      });
      updatedCount = result.count;
    }

    const totalLegacy = await prisma.supplier.count({
      where: { companyId: session.companyId, isLegacySaipos: true },
    });

    revalidatePath("/suppliers");
    return {
      success: true,
      updatedCount,
      totalLegacy,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Erro ao detectar fornecedores antigos (Saipos).",
      updatedCount: 0,
      totalLegacy: 0,
    };
  }
}

export async function deleteSupplier(id: string) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Não autorizado" };
    }

    await prisma.supplier.update({
      where: { id },
      data: { status: "INACTIVE" },
    });

    revalidatePath("/suppliers");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao desativar fornecedor" };
  }
}

export async function getSupplierById(id: string) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Não autorizado", supplier: null };
    }

    const supplier = await prisma.supplier.findFirst({
      where: { id, companyId: session.companyId },
      include: {
        purchaseOrders: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });
    return { success: true, supplier: serializeSupplier(supplier) };
  } catch (err: any) {
    return { error: err.message || "Erro ao obter fornecedor" };
  }
}
