"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  ScaleSectorConfig,
  DEFAULT_SCALE_SECTORS,
  detectScaleSector
} from "@/lib/scaleConfig";

let dbColumnsEnsured = false;

export async function ensureScaleColumns() {
  if (dbColumnsEnsured) return;
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sendToScale" BOOLEAN DEFAULT false;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "scaleDays" INTEGER DEFAULT 0;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "scaleDept" INTEGER DEFAULT 1;
    `);
    dbColumnsEnsured = true;
  } catch (err) {
    console.warn("ensureScaleColumns notice:", err);
  }
}

/**
 * Gera o próximo código sequencial de balança para a empresa no setor indicado.
 * @param sectorId Id do setor ("carnes", "horti", etc.) ou número do prefixo (ex: 5, 6)
 * @param digits 4 ou 5 dígitos (padrão Toledo Prix)
 */
export async function getNextScaleCode(sectorIdOrPrefix: string | number, digits: 4 | 5 = 5): Promise<{
  success: boolean;
  code: string;
  prefix: number;
  sectorName: string;
  deptCode: number;
  error?: string;
}> {
  await ensureScaleColumns();

  try {
    const session = await getSession();
    let companyId = session?.companyId;
    if (!companyId) {
      const comp = await prisma.company.findFirst();
      companyId = comp?.id;
    }
    if (!companyId) {
      return { success: false, code: "", prefix: 5, sectorName: "Carnes", deptCode: 1, error: "Empresa não identificada." };
    }

    let sector = DEFAULT_SCALE_SECTORS.find(s => s.id === sectorIdOrPrefix || s.prefix === Number(sectorIdOrPrefix));
    if (!sector) {
      sector = DEFAULT_SCALE_SECTORS[0];
    }

    const prefix = sector.prefix;
    const prefixStr = String(prefix);

    // Busca todos os produtos da empresa que já possuem código interno/balança
    const existingProducts = await prisma.product.findMany({
      where: {
        companyId,
        internalCode: { not: null }
      },
      select: { internalCode: true }
    });

    // Filtra códigos que começam com o prefixo do setor e têm o mesmo tamanho de dígitos
    const usedNumbers = existingProducts
      .map(p => p.internalCode?.trim())
      .filter((code): code is string => Boolean(code && code.startsWith(prefixStr) && code.length === digits))
      .map(code => parseInt(code, 10))
      .filter(num => !isNaN(num));

    const baseMin = digits === 4 ? prefix * 1000 + 1 : prefix * 10000 + 1;
    const baseMax = digits === 4 ? prefix * 1000 + 999 : prefix * 10000 + 9999;

    let nextNumber = baseMin;
    if (usedNumbers.length > 0) {
      const maxUsed = Math.max(...usedNumbers);
      nextNumber = maxUsed + 1;
      if (nextNumber > baseMax) {
        // Encontra o menor buraco livre na sequência
        const usedSet = new Set(usedNumbers);
        let foundHole = false;
        for (let candidate = baseMin; candidate <= baseMax; candidate++) {
          if (!usedSet.has(candidate)) {
            nextNumber = candidate;
            foundHole = true;
            break;
          }
        }
        if (!foundHole) {
          return {
            success: false,
            code: "",
            prefix,
            sectorName: sector.name,
            deptCode: sector.deptCode,
            error: `Faixa de códigos do setor ${sector.name} esgotada (${digits} dígitos: ${baseMin} a ${baseMax}).`
          };
        }
      }
    }

    const code = String(nextNumber).padStart(digits, "0");
    return {
      success: true,
      code,
      prefix,
      sectorName: sector.name,
      deptCode: sector.deptCode
    };
  } catch (err: any) {
    return {
      success: false,
      code: "",
      prefix: 5,
      sectorName: "Carnes",
      deptCode: 1,
      error: err.message || "Erro ao gerar código de balança"
    };
  }
}

/**
 * Retorna todos os produtos configurados para balança
 */
export async function getScaleProducts(options?: { sectorId?: string; search?: string }) {
  await ensureScaleColumns();

  try {
    const session = await getSession();
    let companyId = session?.companyId;
    if (!companyId) {
      const comp = await prisma.company.findFirst();
      companyId = comp?.id;
    }
    if (!companyId) {
      return { products: [], total: 0 };
    }

    // Busca produtos marcados com sendToScale = true OU que possuem internalCode definido
    const products = await prisma.product.findMany({
      where: {
        companyId,
        OR: [
          { sendToScale: true },
          { internalCode: { not: null }, unit: "KG" },
          { isSelfProduced: true, internalCode: { not: null } }
        ]
      },
      include: {
        category: true
      },
      orderBy: [
        { internalCode: "asc" },
        { name: "asc" }
      ]
    });

    let mapped = products.map(p => {
      const sector = detectScaleSector(p.name, p.category?.name || "");
      return {
        id: p.id,
        name: p.name,
        barcode: p.barcode,
        internalCode: p.internalCode || "",
        price: Number(p.price),
        cost: p.cost ? Number(p.cost) : null,
        stock: p.stock,
        unit: p.unit || "KG",
        sendToScale: p.sendToScale ?? true,
        scaleDays: p.scaleDays ?? sector.defaultDays,
        scaleDept: p.scaleDept ?? sector.deptCode,
        sectorName: sector.name,
        sectorId: sector.id,
        sectorPrefix: sector.prefix,
        categoryName: p.category?.name || "Sem categoria",
        updatedAt: p.updatedAt
      };
    });

    if (options?.sectorId && options.sectorId !== "ALL") {
      mapped = mapped.filter(p => p.sectorId === options.sectorId);
    }

    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      mapped = mapped.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.internalCode.includes(q) ||
        (p.barcode && p.barcode.includes(q))
      );
    }

    return { products: mapped, total: mapped.length };
  } catch (err: any) {
    return { error: err.message || "Erro ao carregar produtos da balança", products: [], total: 0 };
  }
}

/**
 * Ativa ou desativa um produto para envio à balança
 */
export async function toggleProductScale(productId: string, sendToScale: boolean) {
  await ensureScaleColumns();

  try {
    const session = await getSession();
    let companyId = session?.companyId;
    if (!companyId) {
      const comp = await prisma.company.findFirst();
      companyId = comp?.id;
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { sendToScale }
    });

    revalidatePath("/scales");
    revalidatePath("/stock");
    return { success: true, product: updated };
  } catch (err: any) {
    return { error: err.message || "Erro ao atualizar produto para balança" };
  }
}

/**
 * Atualiza os parâmetros de balança de um produto (código PLU, dias de validade, departamento)
 */
export async function updateProductScaleInfo(data: {
  productId: string;
  internalCode: string;
  scaleDays?: number;
  scaleDept?: number;
  sendToScale?: boolean;
}) {
  await ensureScaleColumns();

  try {
    const session = await getSession();
    let companyId = session?.companyId;
    if (!companyId) {
      const comp = await prisma.company.findFirst();
      companyId = comp?.id;
    }

    // Se informou código, verifica se já existe outro produto com esse código na empresa
    if (data.internalCode && companyId) {
      const existing = await prisma.product.findFirst({
        where: {
          companyId,
          internalCode: data.internalCode.trim(),
          id: { not: data.productId }
        }
      });
      if (existing) {
        return { error: `O código de balança ${data.internalCode} já está em uso pelo produto "${existing.name}".` };
      }
    }

    await prisma.product.update({
      where: { id: data.productId },
      data: {
        internalCode: data.internalCode.trim() || null,
        scaleDays: data.scaleDays !== undefined ? data.scaleDays : undefined,
        scaleDept: data.scaleDept !== undefined ? data.scaleDept : undefined,
        sendToScale: data.sendToScale !== undefined ? data.sendToScale : true
      }
    });

    revalidatePath("/scales");
    revalidatePath("/stock");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao atualizar dados de balança" };
  }
}

/**
 * Gera o conteúdo do arquivo TXT para importação no Toledo MGV6
 * Formato padrão: ITENS.TXT ou ITENSMGV.TXT
 */
export async function generateToledoMGV6File(options?: {
  sectorId?: string;
  format?: "COMPACT" | "STANDARD_MGV6";
}) {
  await ensureScaleColumns();

  try {
    const res = await getScaleProducts({ sectorId: options?.sectorId });
    if (!res.products || res.products.length === 0) {
      return { error: "Nenhum produto pesável marcado para balança foi encontrado.", txt: "", count: 0 };
    }

    // Somente produtos que vão para a balança
    const scaleOnly = res.products.filter(p => p.sendToScale !== false);
    if (scaleOnly.length === 0) {
      return { error: "Nenhum produto está marcado com a flag de envio para balança.", txt: "", count: 0 };
    }

    const isStandard = options?.format !== "COMPACT"; // por padrão gera layout completo MGV6
    let content = "";

    for (const p of scaleOnly) {
      // 1. Departamento: 2 dígitos numéricos
      const dept = String(p.scaleDept || 1).padStart(2, "0").slice(0, 2);

      // 2. Tipo de produto: 0 = Pesável (venda por peso), 1 = Unitário (venda por unidade)
      const isWeight = (p.unit || "").toUpperCase() === "KG" || (p.unit || "").toUpperCase() === "KILO";
      const tipo = isWeight ? "0" : "1";

      // 3. Código do item (PLU): 6 dígitos numéricos completados com zeros à esquerda
      // O código de 4 ou 5 dígitos do sistema entra completado com zeros à esquerda (ex: 5001 -> 005001, 50001 -> 050001)
      const rawCode = p.internalCode ? p.internalCode.replace(/\D/g, "") : "";
      const code = rawCode.padStart(6, "0").slice(-6);

      // 4. Preço do item: 6 dígitos em centavos sem vírgula (ex: 29.90 -> 002990)
      const priceCents = Math.round((p.price || 0) * 100);
      const price = String(priceCents).padStart(6, "0").slice(0, 6);

      // 5. Dias de Validade: 3 dígitos numéricos (000 a 999)
      const days = String(p.scaleDays || 0).padStart(3, "0").slice(0, 3);

      // 6. Descritivo 1 (25 chars) e Descritivo 2 (25 chars)
      // Remove acentos especiais se necessário ou mantém caracteres seguros ASCII
      const cleanName = p.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove diacríticos para evitar caracteres corrompidos em balanças antigas
        .trim();

      const desc1 = cleanName.slice(0, 25).padEnd(25, " ");
      const desc2 = cleanName.length > 25 ? cleanName.slice(25, 50).padEnd(25, " ") : "".padEnd(25, " ");

      if (!isStandard) {
        // Layout Compacto (MGV5/MGV6 básico)
        content += `${dept}${tipo}${code}${price}${days}${desc1}${desc2}\r\n`;
      } else {
        // Layout Padrão Completo ITENSMGV.TXT do Toledo MGV6
        // Campos complementares com valores padrão Toledo:
        const receita = "000000";      // 6 bytes
        const fornecedor = "0000";     // 4 bytes
        const imagem = "000000";       // 6 bytes
        const dv = "0";                // 1 byte
        const de = "0";                // 1 byte
        const cf = "0000";             // 4 bytes
        const lote = "".padEnd(12, " "); // 12 bytes
        const gEan = "".padEnd(11, " "); // 11 bytes
        const versaoPreco = "0";       // 1 byte
        const som = "0000";            // 4 bytes
        const tara = "0000";           // 4 bytes
        const fracionador = "0000";    // 4 bytes
        const ce1 = "0000";            // 4 bytes
        const ce2 = "0000";            // 4 bytes
        const conservacao = "0000";    // 4 bytes
        const eanFornecedor = "".padEnd(12, " "); // 12 bytes
        const glaciamento = "000000";  // 6 bytes

        content += `${dept}${tipo}${code}${price}${days}${desc1}${desc2}${receita}${fornecedor}${imagem}${dv}${de}${cf}${lote}${gEan}${versaoPreco}${som}${tara}${fracionador}${ce1}${ce2}${conservacao}${eanFornecedor}${glaciamento}\r\n`;
      }
    }

    return {
      success: true,
      txt: content,
      count: scaleOnly.length,
      filename: "ITENSMGV.TXT"
    };
  } catch (err: any) {
    return { error: err.message || "Erro ao gerar arquivo para Toledo MGV6", txt: "", count: 0 };
  }
}

