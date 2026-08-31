"use server";

import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { headers } from "next/headers";

// Converte objetos Prisma para tipos primitivos serializáveis
function toPlain<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_key, val) => {
      if (val !== null && typeof val === "object" && typeof (val as any).toNumber === "function") {
        return (val as any).toNumber();
      }
      if (typeof val === "bigint") return Number(val);
      return val;
    })
  );
}


export async function logAudit(data: {
  operation: string;
  action: string;
  entity?: string;
  entityId?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  terminal?: string;
  result?: string;
  authorizerId?: string;
  storeId?: string;
  userId?: string;
  companyId?: string;
}) {
  try {
    let companyId = data.companyId;
    let userId = data.userId;

    if (!companyId || !userId) {
      const session = await getSession();
      if (!companyId) companyId = session?.companyId;
      if (!userId) userId = session?.userId;
    }

    if (!companyId || !userId) return;

    let ipAddress = "127.0.0.1";
    try {
      const hdrs = await headers();
      ipAddress = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || hdrs.get("x-real-ip") || "127.0.0.1";
    } catch {
      // Ignore if headers not available
    }

    await prisma.auditLog.create({
      data: {
        companyId,
        storeId: data.storeId || null,
        userId,
        authorizerId: data.authorizerId || null,
        operation: data.operation,
        action: data.action,
        entity: data.entity || null,
        entityId: data.entityId || null,
        oldValue: data.oldValue || null,
        newValue: data.newValue || null,
        reason: data.reason || null,
        terminal: data.terminal || null,
        ipAddress,
        result: data.result || "SUCCESS",
      },
    });
  } catch (err) {
    console.error("Erro ao registrar log de auditoria:", err);
  }
}

export async function listAuditLogs(filters?: {
  storeId?: string;
  userId?: string;
  operation?: string;
  result?: string;
  search?: string;
  limit?: number;
}) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { logs: [], error: "Não autorizado" };
    }

    const where: any = { companyId: session.companyId };

    if (filters?.storeId) where.storeId = filters.storeId;
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.operation) where.operation = { contains: filters.operation, mode: "insensitive" };
    if (filters?.result) where.result = filters.result;
    if (filters?.search) {
      where.OR = [
        { operation: { contains: filters.search, mode: "insensitive" } },
        { reason: { contains: filters.search, mode: "insensitive" } },
        { terminal: { contains: filters.search, mode: "insensitive" } },
        { user: { name: { contains: filters.search, mode: "insensitive" } } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: filters?.limit || 100,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        authorizer: { select: { id: true, name: true, email: true, role: true } },
        store: { select: { id: true, code: true, name: true } },
      },
    });

    return { logs: toPlain(logs) };
  } catch (err: any) {
    return { logs: [], error: err.message };
  }
}
