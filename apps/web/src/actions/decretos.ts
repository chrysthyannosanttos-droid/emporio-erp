"use server";

import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { BANCO_NCMS_ALAGOAS, DecretoItem } from "@/data/decretosAlagoas";

/**
 * Consulta NCMs e Regras Fiscais de Alagoas por Termo ou Código NCM
 */
export async function searchNcmAndDecretos(query: string, filterRegra?: string) {
  const q = (query || "").toLowerCase().trim();

  const results = BANCO_NCMS_ALAGOAS.filter((item) => {
    const matchQuery =
      !q ||
      item.ncm.includes(q.replace(/\D/g, "")) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.decretoNome.toLowerCase().includes(q) ||
      item.dicaPratica.toLowerCase().includes(q);

    const matchFilter = !filterRegra || filterRegra === "TODOS" || item.regraAlagoas === filterRegra;

    return matchQuery && matchFilter;
  });

  return { results };
}

/**
 * Retorna os produtos cadastrados na empresa vinculados ao respectivo enquadramento de Alagoas
 */
export async function getCompanyProductsByDecreto() {
  const session = await getSession();
  let companyId = session?.companyId;

  if (!companyId) {
    const agrobelem = await prisma.company.findFirst({
      where: { document: "65.522.409/0001-13" },
    });
    companyId = agrobelem?.id || (await prisma.company.findFirst())?.id;
  }

  if (!companyId) return { products: [] };

  const products = await prisma.product.findMany({
    where: { companyId },
    select: {
      id: true,
      name: true,
      barcode: true,
      ncm: true,
      cest: true,
      csosn: true,
      cfop: true,
      price: true,
      category: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  const classified = products.map((p) => {
    const cleanNcm = (p.ncm || "").replace(/\D/g, "");
    const match = BANCO_NCMS_ALAGOAS.find((b) => b.ncm === cleanNcm || cleanNcm.startsWith(b.ncm.substring(0, 4)));

    return {
      id: p.id,
      name: p.name,
      barcode: p.barcode,
      ncm: p.ncm || "Sem NCM",
      cest: p.cest,
      csosn: p.csosn || "102",
      cfop: p.cfop || "5102",
      price: Number(p.price || 0),
      categoryName: p.category?.name || "Sem categoria",
      decretoEnquadrado: match ? match.decretoNome : "Decreto nº 90.309/2023 (RICMS-AL)",
      regraAlagoas: match ? match.regraAlagoas : p.csosn === "500" ? "SUBSTITUICAO_TRIBUTARIA" : "TRIBUTADO_SIMPLES",
      regraTitulo: match
        ? match.regraTitulo
        : p.csosn === "500"
        ? "ICMS Substituição Tributária (ST)"
        : "Tributado pelo Simples Nacional",
      dicaPratica: match
        ? match.dicaPratica
        : p.csosn === "500"
        ? "Imposto retido na fonte. Sai com CSOSN 500 no caixa."
        : "Tributação normal pelo Simples Nacional.",
    };
  });

  return { products: classified };
}

/**
 * Aplica um NCM e suas regras tributárias de Alagoas a um produto específico do catálogo
 */
export async function applyNcmToProduct(productId: string, ncmConfig: { ncm: string; cest?: string | null; csosn: string; cfop: string }) {
  try {
    const session = await getSession();
    let companyId = session?.companyId;

    if (!companyId) {
      const agrobelem = await prisma.company.findFirst({
        where: { document: "65.522.409/0001-13" },
      });
      companyId = agrobelem?.id || (await prisma.company.findFirst())?.id;
    }

    if (!companyId) return { error: "Empresa não identificada." };

    const updated = await prisma.product.update({
      where: { id: productId, companyId },
      data: {
        ncm: ncmConfig.ncm,
        cest: ncmConfig.cest || null,
        csosn: ncmConfig.csosn,
        cfop: ncmConfig.cfop,
      },
    });

    revalidatePath("/stock");
    revalidatePath("/fiscal/decretos");
    revalidatePath("/fiscal/tax-grid");

    return {
      success: true,
      product: {
        id: updated.id,
        name: updated.name,
        ncm: updated.ncm,
        cest: updated.cest,
        csosn: updated.csosn,
        cfop: updated.cfop,
      },
    };
  } catch (err: any) {
    return { error: err.message || "Erro ao aplicar NCM ao produto" };
  }
}
