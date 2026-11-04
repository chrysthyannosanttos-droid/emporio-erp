"use server";

import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export interface AssetDTO {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  serialNumber: string | null;
  brand: string | null;
  model: string | null;
  location: string;
  status: string;
  condition: string;
  acquisitionDate: string;
  acquisitionValue: number;
  currentValue: number;
  depreciationRate: number;
  usefulLifeMonths: number;
  accumulatedDepreciation: number;
  supplier: string | null;
  invoiceNumber: string | null;
  warrantyExpiresAt: string | null;
  nextMaintenanceDate: string | null;
  lastInventoryDate: string | null;
  responsibleName: string | null;
  notes: string | null;
  qrCode: string | null;
  maintenancesCount?: number;
}

export interface AssetStats {
  totalAssets: number;
  totalAcquisitionValue: number;
  totalCurrentValue: number;
  totalDepreciated: number;
  inMaintenanceCount: number;
  pendingAuditCount: number; // Sem auditoria nos últimos 60 dias
}

async function resolveTenantContext() {
  const session = await getSession();
  let companyId = session?.companyId;

  if (!companyId) {
    const agrobelem = await prisma.company.findFirst({
      where: { document: "65.522.409/0001-13" },
    });
    companyId = agrobelem?.id || (await prisma.company.findFirst())?.id;
  }

  if (!companyId) {
    throw new Error("Nenhuma empresa identificada para o patrimônio.");
  }

  let userId = session?.userId;
  if (!userId) {
    const user = (await prisma.user.findFirst({ where: { companyId } })) || (await prisma.user.findFirst());
    userId = user?.id || "";
  }

  return { companyId, userId, userName: session?.name || "Operador de Patrimônio" };
}

/**
 * Calcula depreciação contábil mensal com base na data de aquisição
 */
function calculateDepreciation(acquisitionDate: Date, acquisitionValue: number, annualRate: number) {
  const now = new Date();
  const diffTime = Math.max(0, now.getTime() - acquisitionDate.getTime());
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  const diffMonths = diffDays / 30.4375;

  const monthlyRate = (annualRate / 100) / 12;
  const accumulatedDepreciation = Math.min(acquisitionValue, Math.round(acquisitionValue * monthlyRate * diffMonths * 100) / 100);
  const currentValue = Math.max(0, Math.round((acquisitionValue - accumulatedDepreciation) * 100) / 100);

  return {
    accumulatedDepreciation,
    currentValue,
  };
}

function formatAsset(a: any): AssetDTO {
  const acqVal = Number(a.acquisitionValue || 0);
  const rate = Number(a.depreciationRate || 10);
  const acqDate = a.acquisitionDate ? new Date(a.acquisitionDate) : new Date();
  const { accumulatedDepreciation, currentValue } = calculateDepreciation(acqDate, acqVal, rate);

  return {
    id: a.id,
    code: a.code,
    name: a.name,
    description: a.description || null,
    category: a.category || "EQUIPMENT",
    serialNumber: a.serialNumber || null,
    brand: a.brand || null,
    model: a.model || null,
    location: a.location || "SALÃO DE VENDAS",
    status: a.status || "ACTIVE",
    condition: a.condition || "GOOD",
    acquisitionDate: acqDate.toISOString().split("T")[0],
    acquisitionValue: acqVal,
    currentValue: a.status === "DISPOSED" ? 0 : currentValue,
    depreciationRate: rate,
    usefulLifeMonths: a.usefulLifeMonths || 120,
    accumulatedDepreciation: a.status === "DISPOSED" ? acqVal : accumulatedDepreciation,
    supplier: a.supplier || null,
    invoiceNumber: a.invoiceNumber || null,
    warrantyExpiresAt: a.warrantyExpiresAt ? new Date(a.warrantyExpiresAt).toISOString().split("T")[0] : null,
    nextMaintenanceDate: a.nextMaintenanceDate ? new Date(a.nextMaintenanceDate).toISOString().split("T")[0] : null,
    lastInventoryDate: a.lastInventoryDate ? new Date(a.lastInventoryDate).toISOString().split("T")[0] : null,
    responsibleName: a.responsibleName || null,
    notes: a.notes || null,
    qrCode: a.qrCode || `AGROBELEM:PAT:${a.code}`,
    maintenancesCount: a.maintenances ? a.maintenances.length : 0,
  };
}

/**
 * Consulta lista de ativos imobilizados com filtros
 */
export async function getAssets(filters?: {
  category?: string;
  location?: string;
  status?: string;
  search?: string;
}): Promise<{ assets: AssetDTO[]; error?: string }> {
  try {
    const { companyId } = await resolveTenantContext();

    const where: any = { companyId };

    if (filters?.category && filters.category !== "ALL") {
      where.category = filters.category;
    }

    if (filters?.location && filters.location !== "ALL") {
      where.location = filters.location;
    }

    if (filters?.status && filters.status !== "ALL") {
      where.status = filters.status;
    }

    if (filters?.search?.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { code: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { serialNumber: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
        { model: { contains: q, mode: "insensitive" } },
        { location: { contains: q, mode: "insensitive" } },
      ];
    }

    const assets = await (prisma as any).asset.findMany({
      where,
      include: {
        maintenances: { select: { id: true } },
      },
      orderBy: { code: "asc" },
    });

    return { assets: assets.map(formatAsset) };
  } catch (err: any) {
    return { assets: [], error: err.message || "Erro ao consultar patrimônio." };
  }
}

/**
 * Obtém estatísticas do patrimônio para o Dashboard
 */
export async function getAssetStats(): Promise<AssetStats> {
  try {
    const { companyId } = await resolveTenantContext();

    const assets = await (prisma as any).asset.findMany({
      where: { companyId },
      select: {
        status: true,
        acquisitionValue: true,
        acquisitionDate: true,
        depreciationRate: true,
        lastInventoryDate: true,
      },
    });

    let totalAcquisitionValue = 0;
    let totalCurrentValue = 0;
    let totalDepreciated = 0;
    let inMaintenanceCount = 0;
    let pendingAuditCount = 0;

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    for (const a of assets) {
      const acq = Number(a.acquisitionValue || 0);
      const rate = Number(a.depreciationRate || 10);
      const date = a.acquisitionDate ? new Date(a.acquisitionDate) : new Date();

      if (a.status === "MAINTENANCE") {
        inMaintenanceCount++;
      }

      if (!a.lastInventoryDate || new Date(a.lastInventoryDate) < sixtyDaysAgo) {
        pendingAuditCount++;
      }

      if (a.status !== "DISPOSED") {
        const { accumulatedDepreciation, currentValue } = calculateDepreciation(date, acq, rate);
        totalAcquisitionValue += acq;
        totalCurrentValue += currentValue;
        totalDepreciated += accumulatedDepreciation;
      }
    }

    return {
      totalAssets: assets.length,
      totalAcquisitionValue: Math.round(totalAcquisitionValue * 100) / 100,
      totalCurrentValue: Math.round(totalCurrentValue * 100) / 100,
      totalDepreciated: Math.round(totalDepreciated * 100) / 100,
      inMaintenanceCount,
      pendingAuditCount,
    };
  } catch {
    return {
      totalAssets: 0,
      totalAcquisitionValue: 0,
      totalCurrentValue: 0,
      totalDepreciated: 0,
      inMaintenanceCount: 0,
      pendingAuditCount: 0,
    };
  }
}

/**
 * Detalhes de um ativo com histórico de manutenções e auditorias
 */
export async function getAssetDetails(id: string) {
  try {
    const { companyId } = await resolveTenantContext();

    const asset = await (prisma as any).asset.findFirst({
      where: { id, companyId },
      include: {
        maintenances: { orderBy: { performedAt: "desc" } },
        audits: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    if (!asset) return { asset: null, error: "Ativo não encontrado." };

    return {
      asset: {
        ...formatAsset(asset),
        maintenances: asset.maintenances.map((m: any) => ({
          id: m.id,
          type: m.type,
          description: m.description,
          cost: Number(m.cost || 0),
          provider: m.provider,
          performedAt: new Date(m.performedAt).toISOString().split("T")[0],
          nextDueDate: m.nextDueDate ? new Date(m.nextDueDate).toISOString().split("T")[0] : null,
          notes: m.notes,
        })),
        audits: asset.audits.map((au: any) => ({
          id: au.id,
          scannedLocation: au.scannedLocation,
          condition: au.condition,
          operatorName: au.operatorName,
          createdAt: new Date(au.createdAt).toLocaleString("pt-BR"),
          notes: au.notes,
        })),
      },
    };
  } catch (err: any) {
    return { asset: null, error: err.message };
  }
}

/**
 * Criação de novo bem patrimonial com auto-numeração de plaqueta (PAT-XXXX)
 */
export async function createAsset(data: {
  code?: string;
  name: string;
  description?: string;
  category: string;
  serialNumber?: string;
  brand?: string;
  model?: string;
  location: string;
  condition?: string;
  acquisitionDate?: string;
  acquisitionValue: number;
  depreciationRate?: number;
  usefulLifeMonths?: number;
  supplier?: string;
  invoiceNumber?: string;
  warrantyExpiresAt?: string;
  nextMaintenanceDate?: string;
  responsibleName?: string;
  notes?: string;
}): Promise<{ success: boolean; asset?: AssetDTO; error?: string }> {
  try {
    const { companyId } = await resolveTenantContext();

    let finalCode = data.code?.trim();

    if (!finalCode) {
      // Auto-gerar próximo número de plaqueta PAT-0001, PAT-0002...
      const count = await (prisma as any).asset.count({ where: { companyId } });
      finalCode = `PAT-${String(count + 1).padStart(4, "0")}`;
    }

    // Verificar unicidade
    const existing = await (prisma as any).asset.findFirst({
      where: { companyId, code: finalCode },
    });

    if (existing) {
      return { success: false, error: `Já existe um ativo com a plaqueta "${finalCode}".` };
    }

    const acqDate = data.acquisitionDate ? new Date(data.acquisitionDate) : new Date();
    const acqVal = Math.max(0, Number(data.acquisitionValue || 0));
    const rate = Number(data.depreciationRate || 10);
    const { currentValue } = calculateDepreciation(acqDate, acqVal, rate);

    const asset = await (prisma as any).asset.create({
      data: {
        companyId,
        code: finalCode,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        category: data.category || "EQUIPMENT",
        serialNumber: data.serialNumber?.trim() || null,
        brand: data.brand?.trim() || null,
        model: data.model?.trim() || null,
        location: data.location?.trim() || "SALÃO DE VENDAS",
        status: "ACTIVE",
        condition: data.condition || "GOOD",
        acquisitionDate: acqDate,
        acquisitionValue: acqVal,
        currentValue,
        depreciationRate: rate,
        usefulLifeMonths: data.usefulLifeMonths || 120,
        supplier: data.supplier?.trim() || null,
        invoiceNumber: data.invoiceNumber?.trim() || null,
        warrantyExpiresAt: data.warrantyExpiresAt ? new Date(data.warrantyExpiresAt) : null,
        nextMaintenanceDate: data.nextMaintenanceDate ? new Date(data.nextMaintenanceDate) : null,
        responsibleName: data.responsibleName?.trim() || null,
        notes: data.notes?.trim() || null,
        qrCode: `AGROBELEM:PAT:${finalCode}`,
      },
    });

    revalidatePath("/assets");
    return { success: true, asset: formatAsset(asset) };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao cadastrar bem patrimonial." };
  }
}

/**
 * Atualização de ativo existente
 */
export async function updateAsset(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    category: string;
    serialNumber: string;
    brand: string;
    model: string;
    location: string;
    status: string;
    condition: string;
    acquisitionValue: number;
    depreciationRate: number;
    usefulLifeMonths: number;
    supplier: string;
    invoiceNumber: string;
    warrantyExpiresAt: string;
    nextMaintenanceDate: string;
    responsibleName: string;
    notes: string;
  }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { companyId } = await resolveTenantContext();

    const updateData: any = { ...data };

    if (data.warrantyExpiresAt !== undefined) {
      updateData.warrantyExpiresAt = data.warrantyExpiresAt ? new Date(data.warrantyExpiresAt) : null;
    }
    if (data.nextMaintenanceDate !== undefined) {
      updateData.nextMaintenanceDate = data.nextMaintenanceDate ? new Date(data.nextMaintenanceDate) : null;
    }

    await (prisma as any).asset.update({
      where: { id, companyId },
      data: updateData,
    });

    revalidatePath("/assets");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao atualizar ativo." };
  }
}

/**
 * Auditoria / Inventário Físico Patrimonial por Smartphone (bip de QR Code ou Plaqueta)
 */
export async function registerAssetAudit(input: {
  codeOrQr: string;
  scannedLocation: string;
  condition?: string;
  notes?: string;
}): Promise<{
  success: boolean;
  asset?: AssetDTO;
  locationMatched: boolean;
  message: string;
  error?: string;
}> {
  try {
    const { companyId, userName } = await resolveTenantContext();
    const cleanCode = input.codeOrQr.replace(/^AGROBELEM:PAT:/, "").trim();

    const asset = await (prisma as any).asset.findFirst({
      where: {
        companyId,
        OR: [
          { code: cleanCode },
          { qrCode: input.codeOrQr.trim() },
          { serialNumber: cleanCode },
        ],
      },
    });

    if (!asset) {
      return {
        success: false,
        locationMatched: false,
        message: `Nenhum bem patrimonial localizado para "${cleanCode}".`,
        error: "Ativo não encontrado.",
      };
    }

    const locationMatched = asset.location.trim().toUpperCase() === input.scannedLocation.trim().toUpperCase();

    // Registra conferência na tabela de auditoria
    await (prisma as any).assetAudit.create({
      data: {
        companyId,
        assetId: asset.id,
        scannedLocation: input.scannedLocation.trim(),
        condition: input.condition || asset.condition,
        operatorName: userName,
        notes: input.notes?.trim() || (locationMatched ? "Conferência física confirmada no setor" : `Movido: estava cadastrado em ${asset.location}`),
      },
    });

    // Atualiza data da última conferência física e se necessário atualiza a localização real
    await (prisma as any).asset.update({
      where: { id: asset.id },
      data: {
        lastInventoryDate: new Date(),
        location: input.scannedLocation.trim(), // Atualiza para a localização real onde foi bipado
        condition: input.condition || asset.condition,
      },
    });

    revalidatePath("/assets");

    return {
      success: true,
      asset: formatAsset(asset),
      locationMatched,
      message: locationMatched
        ? `Auditoria confirmada! ${asset.name} (${asset.code}) no setor ${input.scannedLocation}.`
        : `Ativo transferido: ${asset.name} (${asset.code}) agora alocado em ${input.scannedLocation}.`,
    };
  } catch (err: any) {
    return {
      success: false,
      locationMatched: false,
      message: err.message || "Erro na auditoria.",
      error: err.message,
    };
  }
}

/**
 * Registro de Manutenção ou Calibração IPEM
 */
export async function addAssetMaintenance(data: {
  assetId: string;
  type: string; // PREVENTIVE, CORRECTIVE, CALIBRATION_IPEM
  description: string;
  cost: number;
  provider?: string;
  performedAt?: string;
  nextDueDate?: string;
  notes?: string;
  setAssetStatusActive?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { companyId } = await resolveTenantContext();

    await (prisma as any).assetMaintenance.create({
      data: {
        companyId,
        assetId: data.assetId,
        type: data.type || "PREVENTIVE",
        description: data.description.trim(),
        cost: Math.max(0, Number(data.cost || 0)),
        provider: data.provider?.trim() || null,
        performedAt: data.performedAt ? new Date(data.performedAt) : new Date(),
        nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : null,
        notes: data.notes?.trim() || null,
      },
    });

    // Se informou próxima revisão, atualiza o ativo
    const assetUpdate: any = {};
    if (data.nextDueDate) {
      assetUpdate.nextMaintenanceDate = new Date(data.nextDueDate);
    }
    if (data.setAssetStatusActive) {
      assetUpdate.status = "ACTIVE";
    }

    if (Object.keys(assetUpdate).length > 0) {
      await (prisma as any).asset.update({
        where: { id: data.assetId },
        data: assetUpdate,
      });
    }

    revalidatePath("/assets");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao registrar manutenção." };
  }
}

/**
 * Busca produtos do catálogo para puxar / converter em Ativo Imobilizado
 */
export async function searchProductsForAsset(query: string) {
  try {
    const { companyId } = await resolveTenantContext();
    const q = (query || "").trim();

    const where: any = { companyId };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { barcode: { contains: q } },
        { internalCode: { contains: q } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        barcode: true,
        internalCode: true,
        price: true,
        cost: true,
        unit: true,
        stock: true,
        category: { select: { name: true } },
      },
      take: 20,
      orderBy: { name: "asc" },
    });

    return {
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        barcode: p.barcode,
        internalCode: p.internalCode,
        price: Number(p.price || 0),
        cost: Number(p.cost || (Number(p.price || 0) * 0.6)),
        unit: p.unit,
        stock: Number(p.stock || 0),
        categoryName: p.category?.name || "Sem categoria",
      })),
    };
  } catch (err: any) {
    return { products: [], error: err.message };
  }
}

/**
 * Converte um item do estoque/catálogo diretamente para o Ativo Imobilizado
 */
export async function convertProductToAsset(input: {
  productId: string;
  code?: string;
  location: string;
  category: string;
  condition?: string;
  depreciationRate?: number;
  removeFromStock?: boolean;
}): Promise<{ success: boolean; asset?: AssetDTO; error?: string }> {
  try {
    const { companyId } = await resolveTenantContext();

    const product = await prisma.product.findFirst({
      where: { id: input.productId, companyId },
    });

    if (!product) {
      return { success: false, error: "Produto não encontrado no catálogo." };
    }

    let finalCode = input.code?.trim();
    if (!finalCode) {
      const count = await (prisma as any).asset.count({ where: { companyId } });
      finalCode = `PAT-${String(count + 1).padStart(4, "0")}`;
    }

    const acqVal = Number(product.cost || product.price || 0);
    const rate = Number(input.depreciationRate || 10);

    const asset = await (prisma as any).asset.create({
      data: {
        companyId,
        code: finalCode,
        name: product.name,
        category: input.category || "EQUIPMENT",
        location: input.location || "SALÃO DE VENDAS",
        condition: input.condition || "GOOD",
        status: "ACTIVE",
        acquisitionDate: new Date(),
        acquisitionValue: acqVal,
        currentValue: acqVal,
        depreciationRate: rate,
        usefulLifeMonths: 120,
        notes: `Importado a partir do produto cadastrado (PLU ${product.internalCode || "-"}, EAN ${product.barcode || "-"})`,
        qrCode: `AGROBELEM:PAT:${finalCode}`,
      },
    });

    // Se solicitado, remove 1 unidade do estoque de revenda
    if (input.removeFromStock && Number(product.stock || 0) > 0) {
      await prisma.product.update({
        where: { id: product.id },
        data: { stock: Math.max(0, Number(product.stock || 0) - 1) },
      });
    }

    revalidatePath("/assets");
    return { success: true, asset: formatAsset(asset) };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao converter produto em imobilizado." };
  }
}


