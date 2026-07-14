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

export async function getSuppliers(search?: string, category?: string) {
  try {
    const company = await getOrCreateCompany();
    const where: any = { companyId: company.id };

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

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return { success: true, suppliers };
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
  rating?: number;
  status?: string;
  notes?: string;
}) {
  try {
    const company = await getOrCreateCompany();
    const supplier = await prisma.supplier.create({
      data: {
        ...data,
        discountPercent: data.discountPercent || 0,
        minOrderValue: data.minOrderValue || 0,
        companyId: company.id,
      },
    });

    revalidatePath("/suppliers");
    return { success: true, supplier };
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
    rating?: number;
    status?: string;
    notes?: string;
  }
) {
  try {
    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...data,
        discountPercent: data.discountPercent || 0,
        minOrderValue: data.minOrderValue || 0,
      },
    });

    revalidatePath("/suppliers");
    return { success: true, supplier };
  } catch (err: any) {
    return { error: err.message || "Erro ao atualizar fornecedor" };
  }
}

export async function deleteSupplier(id: string) {
  try {
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
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        purchaseOrders: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });
    return { success: true, supplier };
  } catch (err: any) {
    return { error: err.message || "Erro ao obter fornecedor" };
  }
}
