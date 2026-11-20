"use server";

import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

let backupTableEnsured = false;

async function ensureBackupTable() {
  if (backupTableEnsured) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "company_backups" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "companyId" TEXT NOT NULL,
        "companyName" TEXT NOT NULL,
        "backupType" TEXT NOT NULL,
        "baseBackupId" TEXT,
        "sinceTimestamp" TEXT,
        "recordCount" INTEGER NOT NULL DEFAULT 0,
        "sizeBytes" INTEGER NOT NULL DEFAULT 0,
        "tablesSummary" TEXT NOT NULL,
        "payloadJson" TEXT NOT NULL,
        "createdBy" TEXT NOT NULL,
        "createdAt" TEXT NOT NULL
      )
    `);
    backupTableEnsured = true;
  } catch (err) {
    console.error("Erro ao garantir tabela company_backups:", err);
  }
}

async function assertCristianoMaster() {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "Sessão expirada." };

  const nameLower = (session.name || "").toLowerCase();
  const emailLower = (session.email || "").toLowerCase();
  const isCristiano =
    nameLower.includes("cristiano") ||
    emailLower.includes("cristiano") ||
    Boolean(session.isSuperAdmin);

  if (!isCristiano) {
    return { ok: false as const, error: "Acesso restrito exclusivamente ao Cristiano (Admin Master)." };
  }
  return { ok: true as const, session };
}

export interface BackupSummaryDTO {
  id: string;
  companyId: string;
  companyName: string;
  backupType: "FULL" | "INCREMENTAL";
  baseBackupId: string | null;
  sinceTimestamp: string | null;
  recordCount: number;
  sizeBytes: number;
  tablesSummary: Record<string, number>;
  createdBy: string;
  createdAt: string;
}

export async function listCompaniesAndBackupsAction() {
  try {
    const auth = await assertCristianoMaster();
    if (!auth.ok) return { success: false, error: auth.error, companies: [], backups: [] };

    await ensureBackupTable();

    const [companies, rawBackups] = await Promise.all([
      prisma.company.findMany({
        select: { id: true, name: true, document: true, licenseStatus: true },
        orderBy: { name: "asc" },
      }),
      prisma.$queryRawUnsafe<Array<any>>(
        `SELECT "id", "companyId", "companyName", "backupType", "baseBackupId", "sinceTimestamp", "recordCount", "sizeBytes", "tablesSummary", "createdBy", "createdAt"
         FROM "company_backups"
         ORDER BY "createdAt" DESC
         LIMIT 300`
      ),
    ]);

    const backups: BackupSummaryDTO[] = rawBackups.map((b) => {
      let summary: Record<string, number> = {};
      try {
        summary = JSON.parse(b.tablesSummary || "{}");
      } catch {}
      return {
        id: String(b.id),
        companyId: String(b.companyId),
        companyName: String(b.companyName),
        backupType: b.backupType === "INCREMENTAL" ? "INCREMENTAL" : "FULL",
        baseBackupId: b.baseBackupId ? String(b.baseBackupId) : null,
        sinceTimestamp: b.sinceTimestamp ? String(b.sinceTimestamp) : null,
        recordCount: Number(b.recordCount || 0),
        sizeBytes: Number(b.sizeBytes || 0),
        tablesSummary: summary,
        createdBy: String(b.createdBy || "Cristiano"),
        createdAt: String(b.createdAt),
      };
    });

    return { success: true, companies, backups };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao carregar backups.", companies: [], backups: [] };
  }
}

export async function runCompanyBackupAction(
  companyId: string,
  mode: "AUTO" | "FULL" | "INCREMENTAL" = "AUTO"
) {
  try {
    const auth = await assertCristianoMaster();
    if (!auth.ok) return { success: false, error: auth.error };

    await ensureBackupTable();

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true },
    });
    if (!company) return { success: false, error: "Empresa/cliente não encontrado." };

    const lastBackups = await prisma.$queryRawUnsafe<Array<any>>(
      `SELECT "id", "backupType", "createdAt" FROM "company_backups" WHERE "companyId" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
      companyId
    );
    const lastBackup = lastBackups[0] || null;

    const effectiveType: "FULL" | "INCREMENTAL" =
      mode === "FULL" ? "FULL" : mode === "INCREMENTAL" && lastBackup ? "INCREMENTAL" : lastBackup && mode === "AUTO" ? "INCREMENTAL" : "FULL";

    const sinceDate = effectiveType === "INCREMENTAL" && lastBackup?.createdAt
      ? new Date(lastBackup.createdAt)
      : null;

    const updatedFilter = sinceDate ? { updatedAt: { gt: sinceDate } } : {};
    const createdFilter = sinceDate ? { createdAt: { gt: sinceDate } } : {};

    const [
      categories,
      suppliers,
      customers,
      products,
      sales,
      orders,
      invoices,
      transactions,
      deletedAuditLogs,
    ] = await Promise.all([
      prisma.category.findMany({ where: { companyId } }),
      prisma.supplier.findMany({ where: { companyId, ...updatedFilter } }),
      prisma.customer.findMany({ where: { companyId, ...updatedFilter } }),
      prisma.product.findMany({ where: { companyId, ...updatedFilter } }),
      prisma.sale.findMany({
        where: { companyId, ...updatedFilter },
        include: { items: true, payments: true },
      }),
      prisma.order.findMany({
        where: { companyId, ...updatedFilter },
        include: { items: true },
      }),
      prisma.invoice.findMany({ where: { companyId, ...updatedFilter } }),
      prisma.transaction.findMany({ where: { companyId, ...updatedFilter } }),
      sinceDate
        ? prisma.auditLog.findMany({
            where: {
              companyId,
              action: "DELETE",
              createdAt: { gt: sinceDate },
            },
          })
        : Promise.resolve([]),
    ]);

    const payload = {
      meta: {
        companyId: company.id,
        companyName: company.name,
        backupType: effectiveType,
        sinceTimestamp: sinceDate ? sinceDate.toISOString() : null,
        generatedAt: new Date().toISOString(),
      },
      categories: effectiveType === "FULL" ? categories : [],
      suppliers,
      customers,
      products,
      sales,
      orders,
      invoices,
      transactions,
      deletedAuditLogs,
    };

    const tablesSummary = {
      categories: payload.categories.length,
      suppliers: suppliers.length,
      customers: customers.length,
      products: products.length,
      sales: sales.length,
      orders: orders.length,
      invoices: invoices.length,
      transactions: transactions.length,
      deletedAuditLogs: deletedAuditLogs.length,
    };

    const recordCount = Object.values(tablesSummary).reduce((a, b) => a + b, 0);
    const payloadJson = JSON.stringify(payload);
    const sizeBytes = Buffer.byteLength(payloadJson, "utf8");
    const id = `bkp_${companyId.slice(0, 8)}_${Date.now()}`;
    const nowIso = new Date().toISOString();

    await prisma.$executeRawUnsafe(
      `INSERT INTO "company_backups" ("id", "companyId", "companyName", "backupType", "baseBackupId", "sinceTimestamp", "recordCount", "sizeBytes", "tablesSummary", "payloadJson", "createdBy", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      id,
      company.id,
      company.name,
      effectiveType,
      effectiveType === "INCREMENTAL" ? String(lastBackup?.id || "") : null,
      sinceDate ? sinceDate.toISOString() : null,
      recordCount,
      sizeBytes,
      JSON.stringify(tablesSummary),
      payloadJson,
      auth.session.name || "Cristiano",
      nowIso
    );

    revalidatePath("/master/backups");
    return {
      success: true,
      backupId: id,
      backupType: effectiveType,
      recordCount,
      sizeBytes,
      tablesSummary,
    };
  } catch (err: any) {
    console.error("Erro ao gerar backup:", err);
    return { success: false, error: err?.message || "Erro ao gerar backup do cliente." };
  }
}

export async function runAllCompaniesEndOfDayBackupAction() {
  try {
    const auth = await assertCristianoMaster();
    if (!auth.ok) return { success: false, error: auth.error };

    const companies = await prisma.company.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    const results: Array<{ companyName: string; backupType: string; recordCount: number }> = [];
    for (const c of companies) {
      const r = await runCompanyBackupAction(c.id, "AUTO");
      if (r.success) {
        results.push({
          companyName: c.name,
          backupType: r.backupType || "FULL",
          recordCount: r.recordCount || 0,
        });
      }
    }

    revalidatePath("/master/backups");
    return { success: true, count: results.length, results };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro no backup em lote." };
  }
}

export async function restoreDeletedFromBackupAction(backupId: string) {
  try {
    const auth = await assertCristianoMaster();
    if (!auth.ok) return { success: false, error: auth.error };

    await ensureBackupTable();

    const rows = await prisma.$queryRawUnsafe<Array<any>>(
      `SELECT "id", "companyId", "companyName", "payloadJson" FROM "company_backups" WHERE "id" = $1 LIMIT 1`,
      backupId
    );
    const row = rows[0];
    if (!row) return { success: false, error: "Backup não encontrado." };

    const payload = JSON.parse(row.payloadJson || "{}");
    const companyId = String(row.companyId);
    const restored: Record<string, number> = {
      categories: 0,
      suppliers: 0,
      customers: 0,
      products: 0,
      sales: 0,
    };

    // Restaura apenas registros que foram apagados (não existem mais no banco atual)
    for (const cat of payload.categories || []) {
      const exists = await prisma.category.findUnique({ where: { id: cat.id }, select: { id: true } });
      if (!exists) {
        await prisma.category.create({
          data: {
            id: cat.id,
            name: cat.name,
            companyId,
          },
        }).catch(() => {});
        restored.categories++;
      }
    }

    for (const sup of payload.suppliers || []) {
      const exists = await prisma.supplier.findUnique({ where: { id: sup.id }, select: { id: true } });
      if (!exists) {
        await prisma.supplier.create({
          data: {
            id: sup.id,
            name: sup.name,
            tradeName: sup.tradeName ?? null,
            document: sup.document ?? null,
            phone: sup.phone ?? null,
            email: sup.email ?? null,
            companyId,
          },
        }).catch(() => {});
        restored.suppliers++;
      }
    }

    for (const cust of payload.customers || []) {
      const exists = await prisma.customer.findUnique({ where: { id: cust.id }, select: { id: true } });
      if (!exists) {
        await prisma.customer.create({
          data: {
            id: cust.id,
            name: cust.name,
            document: cust.document ?? null,
            phone: cust.phone ?? null,
            email: cust.email ?? null,
            address: cust.address ?? null,
            taxRegime: cust.taxRegime ?? "CONSUMIDOR_FINAL",
            companyId,
          },
        }).catch(() => {});
        restored.customers++;
      }
    }

    for (const prod of payload.products || []) {
      const exists = await prisma.product.findUnique({ where: { id: prod.id }, select: { id: true } });
      if (!exists) {
        await prisma.product.create({
          data: {
            id: prod.id,
            name: prod.name,
            barcode: prod.barcode ?? null,
            internalCode: prod.internalCode ?? null,
            price: prod.price ?? 0,
            cost: prod.cost ?? 0,
            stock: prod.stock ?? 0,
            unit: prod.unit ?? "UN",
            ncm: prod.ncm ?? null,
            cfop: prod.cfop ?? null,
            csosn: prod.csosn ?? null,
            companyId,
          },
        }).catch(() => {});
        restored.products++;
      }
    }

    for (const sale of payload.sales || []) {
      const exists = await prisma.sale.findUnique({ where: { id: sale.id }, select: { id: true } });
      if (!exists && sale.userId) {
        await prisma.sale.create({
          data: {
            id: sale.id,
            subtotal: sale.subtotal ?? 0,
            discount: sale.discount ?? 0,
            total: sale.total ?? 0,
            status: sale.status ?? "COMPLETED",
            userId: sale.userId,
            customerId: sale.customerId ?? null,
            companyId,
            createdAt: sale.createdAt ? new Date(sale.createdAt) : new Date(),
            items: {
              create: (sale.items || []).map((it: any) => ({
                productId: it.productId,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                total: it.total,
              })),
            },
            payments: {
              create: (sale.payments || []).map((pm: any) => ({
                amount: pm.amount,
                paymentMethod: pm.paymentMethod,
              })),
            },
          },
        }).catch(() => {});
        restored.sales++;
      }
    }

    const totalRestored = Object.values(restored).reduce((a, b) => a + b, 0);
    return {
      success: true,
      totalRestored,
      restored,
      message:
        totalRestored > 0
          ? `Restauração concluída: ${totalRestored} registro(s) recuperado(s) (${restored.products} produtos, ${restored.customers} clientes, ${restored.sales} vendas, ${restored.suppliers} fornecedores, ${restored.categories} categorias).`
          : "Nenhum registro apagado precisou ser restaurado deste backup (tudo já está presente no banco).",
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao restaurar backup." };
  }
}

export async function downloadBackupJsonAction(backupId: string) {
  try {
    const auth = await assertCristianoMaster();
    if (!auth.ok) return { success: false, error: auth.error, json: "" };

    await ensureBackupTable();
    const rows = await prisma.$queryRawUnsafe<Array<any>>(
      `SELECT "companyName", "backupType", "createdAt", "payloadJson" FROM "company_backups" WHERE "id" = $1 LIMIT 1`,
      backupId
    );
    const row = rows[0];
    if (!row) return { success: false, error: "Backup não encontrado.", json: "" };

    return {
      success: true,
      filename: `backup-${String(row.companyName).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${String(row.backupType).toLowerCase()}-${String(row.createdAt).slice(0, 10)}.json`,
      json: String(row.payloadJson || "{}"),
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao baixar backup.", json: "" };
  }
}
