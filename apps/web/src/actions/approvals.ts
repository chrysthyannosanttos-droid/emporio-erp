"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { verifyQuickAuthorization, checkOperationThreshold } from "@/lib/permissions";
import { logAudit } from "./audit";

// ─── REGRAS DE ALÇADA (APPROVAL RULES) ─────────────────────────────

// Converte qualquer objeto Prisma (Decimal, Date, BigInt) para tipos primitivos simples
// usando JSON.parse(JSON.stringify()) para garantir compatibilidade total com Client Components
function toPlain<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_key, val) => {
      // Decimal do Prisma possui método toNumber()
      if (val !== null && typeof val === "object" && typeof (val as any).toNumber === "function") {
        return (val as any).toNumber();
      }
      // BigInt
      if (typeof val === "bigint") return Number(val);
      return val;
    })
  );
}

export async function listApprovalRules() {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { rules: [], error: "Não autorizado" };
    }

    const rules = await prisma.approvalRule.findMany({
      where: { companyId: session.companyId },
      orderBy: [{ operation: "asc" }, { minValue: "asc" }],
    });

    return { rules: rules.map(toPlain) };
  } catch (err: any) {
    return { rules: [], error: err.message };
  }
}

export async function saveApprovalRule(data: {
  id?: string;
  operation: string;
  name: string;
  minValue: number;
  maxValue?: number | null;
  minRole: string;
  requiresPin: boolean;
}) {
  try {
    const session = await getSession();
    if (!session?.companyId || session.role !== "ADMIN") {
      return { error: "Apenas administradores podem configurar regras de liberação." };
    }

    let rule;
    if (data.id) {
      rule = await prisma.approvalRule.update({
        where: { id: data.id },
        data: {
          operation: data.operation,
          name: data.name,
          minValue: data.minValue,
          maxValue: data.maxValue ?? null,
          minRole: data.minRole,
          requiresPin: data.requiresPin,
        },
      });

      await logAudit({
        operation: "approvals.rules",
        action: "UPDATE",
        entity: "ApprovalRule",
        entityId: rule.id,
        newValue: JSON.stringify(data),
        reason: `Atualização da regra de alçada ${data.name}`,
      });
    } else {
      rule = await prisma.approvalRule.create({
        data: {
          companyId: session.companyId,
          operation: data.operation,
          name: data.name,
          minValue: data.minValue,
          maxValue: data.maxValue ?? null,
          minRole: data.minRole,
          requiresPin: data.requiresPin,
          active: true,
        },
      });

      await logAudit({
        operation: "approvals.rules",
        action: "CREATE",
        entity: "ApprovalRule",
        entityId: rule.id,
        newValue: JSON.stringify(data),
        reason: `Criação da regra de alçada ${data.name}`,
      });
    }

    revalidatePath("/settings/approval-rules");
    return { success: true, rule: toPlain(rule) };
  } catch (err: any) {
    return { error: err.message || "Erro ao salvar regra de liberação." };
  }
}

export async function toggleApprovalRule(id: string, active: boolean) {
  try {
    const session = await getSession();
    if (!session?.companyId || session.role !== "ADMIN") {
      return { error: "Não autorizado." };
    }

    await prisma.approvalRule.updateMany({
      where: { id, companyId: session.companyId },
      data: { active },
    });

    revalidatePath("/settings/approval-rules");
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function deleteApprovalRule(id: string) {
  try {
    const session = await getSession();
    if (!session?.companyId || session.role !== "ADMIN") {
      return { error: "Não autorizado." };
    }

    await prisma.approvalRule.deleteMany({
      where: { id, companyId: session.companyId },
    });

    revalidatePath("/settings/approval-rules");
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

// ─── SOLICITAÇÕES E CENTRAL DE LIBERAÇÕES ──────────────────────────

export async function createApprovalRequest(data: {
  operation: string;
  value?: number;
  reason: string;
  terminal?: string;
  storeId?: string;
  details?: any;
}) {
  try {
    const session = await getSession();
    if (!session?.companyId || !session?.userId) {
      return { error: "Sessão inválida" };
    }

    if (!data.operation || !data.reason) {
      return { error: "Operação e Motivo são obrigatórios." };
    }

    const request = await prisma.approvalRequest.create({
      data: {
        companyId: session.companyId,
        storeId: data.storeId || null,
        requesterId: session.userId,
        operation: data.operation,
        value: data.value !== undefined ? data.value : null,
        reason: data.reason,
        terminal: data.terminal || "PDV Principal",
        status: "PENDING",
        details: data.details ? JSON.stringify(data.details) : null,
      },
      include: {
        requester: { select: { id: true, name: true, email: true, role: true } },
        store: { select: { id: true, code: true, name: true } },
      },
    });

    await logAudit({
      operation: data.operation,
      action: "REQUEST_APPROVAL",
      entity: "ApprovalRequest",
      entityId: request.id,
      newValue: `Valor: R$ ${data.value || 0} - Motivo: ${data.reason}`,
      reason: `Abertura de solicitação de liberação para ${data.operation}`,
      terminal: data.terminal,
      storeId: data.storeId,
    });

    revalidatePath("/settings/approvals");
    return { success: true, request: toPlain(request) };
  } catch (err: any) {
    return { error: err.message || "Erro ao criar solicitação de liberação." };
  }
}

export async function listApprovalRequests(filters?: {
  status?: string;
  storeId?: string;
  requesterId?: string;
  operation?: string;
  search?: string;
}) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { requests: [], error: "Não autorizado" };
    }

    const where: any = { companyId: session.companyId };

    if (filters?.status && filters.status !== "ALL") {
      where.status = filters.status;
    }
    if (filters?.storeId) where.storeId = filters.storeId;
    if (filters?.requesterId) where.requesterId = filters.requesterId;
    if (filters?.operation) where.operation = filters.operation;
    if (filters?.search) {
      where.OR = [
        { operation: { contains: filters.search, mode: "insensitive" } },
        { reason: { contains: filters.search, mode: "insensitive" } },
        { terminal: { contains: filters.search, mode: "insensitive" } },
        { requester: { name: { contains: filters.search, mode: "insensitive" } } },
      ];
    }

    const requests = await prisma.approvalRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        requester: { select: { id: true, name: true, email: true, role: true } },
        approver: { select: { id: true, name: true, email: true, role: true } },
        store: { select: { id: true, code: true, name: true } },
      },
    });

    // Contadores de status para os cards do topo
    const [pendingCount, approvedCount, rejectedCount] = await Promise.all([
      prisma.approvalRequest.count({ where: { companyId: session.companyId, status: "PENDING" } }),
      prisma.approvalRequest.count({ where: { companyId: session.companyId, status: "APPROVED" } }),
      prisma.approvalRequest.count({ where: { companyId: session.companyId, status: "REJECTED" } }),
    ]);

    return {
      requests: requests.map(toPlain),
      counts: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        total: pendingCount + approvedCount + rejectedCount,
      },
    };
  } catch (err: any) {
    return { requests: [], counts: { pending: 0, approved: 0, rejected: 0, total: 0 }, error: err.message };
  }
}

export async function approveRequest(
  requestId: string,
  authorizerIdentifier: string,
  pinOrPassword: string
) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Sessão inválida." };
    }

    const request = await prisma.approvalRequest.findFirst({
      where: { id: requestId, companyId: session.companyId },
    });

    if (!request) {
      return { error: "Solicitação de liberação não encontrada." };
    }

    if (request.status !== "PENDING") {
      return { error: `Esta solicitação já foi finalizada com status ${request.status}.` };
    }

    // Verificar alçada mínima exigida pela operação e valor
    const threshold = await checkOperationThreshold(
      session.companyId,
      request.operation,
      Number(request.value || 0)
    );

    // Validação do autorizador (PIN/Senha, nível de cargo e NÃO AUTO-APROVAÇÃO)
    const authCheck = await verifyQuickAuthorization({
      companyId: session.companyId,
      authorizerIdentifier,
      pinOrPassword,
      requiredMinRole: threshold.requiredMinRole || "SUPERVISOR",
      requesterId: request.requesterId, // Proíbe solicitante aprovar a si mesmo!
    });

    if (!authCheck.success || !authCheck.authorizer) {
      return { error: authCheck.error || "Falha na validação do autorizador." };
    }

    const updated = await prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        approverId: authCheck.authorizer.id,
        authorizedAt: new Date(),
      },
    });

    // Registrar no Log de Auditoria
    await logAudit({
      companyId: session.companyId,
      storeId: request.storeId || undefined,
      userId: request.requesterId,
      authorizerId: authCheck.authorizer.id,
      operation: request.operation,
      action: "APPROVE",
      entity: "ApprovalRequest",
      entityId: requestId,
      oldValue: `Status: PENDING - Valor: R$ ${request.value || 0}`,
      newValue: `Status: APPROVED - Autorizado por ${authCheck.authorizer.name} (${authCheck.authorizer.role})`,
      reason: request.reason,
      terminal: request.terminal || undefined,
      result: "SUCCESS",
    });

    revalidatePath("/settings/approvals");
    return { success: true, request: toPlain(updated) };
  } catch (err: any) {
    return { error: err.message || "Erro ao aprovar solicitação." };
  }
}

export async function rejectRequest(
  requestId: string,
  authorizerIdentifier: string,
  pinOrPassword: string,
  rejectionReason: string
) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Sessão inválida." };
    }

    if (!rejectionReason || rejectionReason.trim().length < 3) {
      return { error: "O motivo da negação é obrigatório (mínimo 3 caracteres)." };
    }

    const request = await prisma.approvalRequest.findFirst({
      where: { id: requestId, companyId: session.companyId },
    });

    if (!request) {
      return { error: "Solicitação não encontrada." };
    }

    if (request.status !== "PENDING") {
      return { error: `Esta solicitação já foi finalizada com status ${request.status}.` };
    }

    // Validação do autorizador
    const authCheck = await verifyQuickAuthorization({
      companyId: session.companyId,
      authorizerIdentifier,
      pinOrPassword,
      requiredMinRole: "SUPERVISOR",
      requesterId: request.requesterId,
    });

    if (!authCheck.success || !authCheck.authorizer) {
      return { error: authCheck.error || "Falha na validação do autorizador." };
    }

    const updated = await prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        approverId: authCheck.authorizer.id,
        rejectionReason: rejectionReason.trim(),
        authorizedAt: new Date(),
      },
    });

    // Registrar no Log de Auditoria
    await logAudit({
      companyId: session.companyId,
      storeId: request.storeId || undefined,
      userId: request.requesterId,
      authorizerId: authCheck.authorizer.id,
      operation: request.operation,
      action: "REJECT",
      entity: "ApprovalRequest",
      entityId: requestId,
      oldValue: "Status: PENDING",
      newValue: `Status: REJECTED - Motivo da recusa: ${rejectionReason}`,
      reason: request.reason,
      terminal: request.terminal || undefined,
      result: "DENIED",
    });

    revalidatePath("/settings/approvals");
    return { success: true, request: toPlain(updated) };
  } catch (err: any) {
    return { error: err.message || "Erro ao rejeitar solicitação." };
  }
}

// ─── AUTORIZAÇÃO RÁPIDA INLINE (MODAL NO PDV / OPERAÇÃO) ──────────

export async function quickAuthorizeInline(data: {
  operation: string;
  value?: number;
  reason: string;
  terminal?: string;
  storeId?: string;
  authorizerIdentifier: string;
  pinOrPassword: string;
}) {
  try {
    const session = await getSession();
    if (!session?.companyId || !session?.userId) {
      return { error: "Sessão inválida" };
    }

    // 1. Avaliar alçada necessária
    const threshold = await checkOperationThreshold(
      session.companyId,
      data.operation,
      Number(data.value || 0)
    );

    // 2. Validar credenciais do autorizador com proibição de auto-aprovação
    const authCheck = await verifyQuickAuthorization({
      companyId: session.companyId,
      authorizerIdentifier: data.authorizerIdentifier,
      pinOrPassword: data.pinOrPassword,
      requiredMinRole: threshold.requiredMinRole || "SUPERVISOR",
      requesterId: session.userId,
    });

    if (!authCheck.success || !authCheck.authorizer) {
      // Registrar tentativa negada na auditoria
      await logAudit({
        operation: data.operation,
        action: "QUICK_AUTH_FAILED",
        reason: data.reason,
        terminal: data.terminal,
        storeId: data.storeId,
        result: "DENIED",
        newValue: `Tentativa por ${data.authorizerIdentifier}: ${authCheck.error}`,
      });

      return { error: authCheck.error || "Credenciais de autorização inválidas." };
    }

    // 3. Registrar solicitação aprovada automaticamente
    const request = await prisma.approvalRequest.create({
      data: {
        companyId: session.companyId,
        storeId: data.storeId || null,
        requesterId: session.userId,
        approverId: authCheck.authorizer.id,
        operation: data.operation,
        value: data.value !== undefined ? data.value : null,
        reason: data.reason,
        terminal: data.terminal || "PDV Caixa",
        status: "APPROVED",
        authorizedAt: new Date(),
      },
    });

    // 4. Registrar auditoria do sucesso
    await logAudit({
      operation: data.operation,
      action: "QUICK_AUTH_APPROVED",
      entity: "ApprovalRequest",
      entityId: request.id,
      authorizerId: authCheck.authorizer.id,
      newValue: `Liberado por ${authCheck.authorizer.name} (${authCheck.authorizer.role}) - Valor: R$ ${data.value || 0}`,
      reason: data.reason,
      terminal: data.terminal,
      storeId: data.storeId,
      result: "SUCCESS",
    });

    revalidatePath("/settings/approvals");
    return {
      success: true,
      authorizer: authCheck.authorizer,
      requestId: request.id,
    };
  } catch (err: any) {
    return { error: err.message || "Erro durante a autorização rápida." };
  }
}
