"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { logAudit } from "./audit";
import { seedSupermarketRolesAndPermissions } from "./roles";

// Converte qualquer objeto Prisma (Decimal, Date, BigInt) para tipos serializáveis simples
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

export async function getCurrentUserSession() {
  try {
    const session = await getSession();
    if (!session) return null;
    return {
      userId: session.userId,
      role: session.role,
      isSuperAdmin: Boolean(session.isSuperAdmin),
      name: session.name,
      isAdmin: session.role === "ADMIN" || Boolean(session.isSuperAdmin),
    };
  } catch (err) {
    return null;
  }
}


export async function listTenantUsers(filters?: {
  search?: string;
  role?: string;
  storeId?: string;
  active?: boolean;
}) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { users: [], error: "Não autorizado" };
    }

    // Garante que os cargos e permissões padrões de supermercado estejam ativos para a empresa
    await seedSupermarketRolesAndPermissions(session.companyId);

    const where: any = { companyId: session.companyId };

    if (filters?.role && filters.role !== "ALL") {
      where.role = filters.role;
    }
    if (filters?.active !== undefined) {
      where.active = filters.active;
    }
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
      ];
    }
    if (filters?.storeId) {
      where.userStores = {
        some: { storeId: filters.storeId }
      };
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: [{ role: "asc" }, { createdAt: "desc" }],
      include: {
        userStores: {
          include: { store: true }
        },
        roleRelation: {
          select: { id: true, name: true, key: true }
        },
        userPermissions: {
          select: { id: true, permissionId: true, granted: true }
        },
        _count: {
          select: {
            sales: true,
            requestedApprovals: true,
            authorizedApprovals: true,
          }
        }
      }
    });

    return { users: toPlain(users) };
  } catch (err: any) {
    return { users: [], error: err.message };
  }
}

export async function getUserDetails(userId: string) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { user: null, error: "Não autorizado" };
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, companyId: session.companyId },
      include: {
        userStores: {
          include: { store: true }
        },
        roleRelation: {
          include: {
            permissions: {
              include: { permission: true }
            }
          }
        },
        userPermissions: {
          include: { permission: true }
        },
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 30,
        },
        requestedApprovals: {
          orderBy: { createdAt: "desc" },
          take: 15,
          include: {
            approver: { select: { name: true, role: true } },
            store: { select: { code: true, name: true } },
          }
        },
        authorizedApprovals: {
          orderBy: { createdAt: "desc" },
          take: 15,
          include: {
            requester: { select: { name: true, role: true } },
            store: { select: { code: true, name: true } },
          }
        }
      }
    });

    if (!user) {
      return { user: null, error: "Usuário não encontrado." };
    }

    const serializedUser = {
      ...user,
      requestedApprovals: user.requestedApprovals.map(req => ({
        ...req,
        value: req.value !== null && req.value !== undefined ? Number(req.value) : null,
      })),
      authorizedApprovals: user.authorizedApprovals.map(req => ({
        ...req,
        value: req.value !== null && req.value !== undefined ? Number(req.value) : null,
      })),
    };

    return { user: toPlain(user) };
  } catch (err: any) {
    return { user: null, error: err.message };
  }
}

export async function createTenantUser(data: {
  name: string;
  email: string;
  password: string;
  pin?: string;
  role: string;
  storeIds?: string[];
  defaultStoreId?: string;
}) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Sessão inválida." };
    }

    // Apenas ADMIN ou MANAGER podem criar usuários
    if (session.role !== "ADMIN" && session.role !== "MANAGER") {
      return { error: "Apenas administradores e gerentes podem cadastrar novos colaboradores." };
    }

    const name = data.name?.trim();
    const email = data.email?.trim().toLowerCase();
    const password = data.password?.trim();
    const pin = data.pin?.trim();
    const role = data.role || "OPERATOR";

    if (!name || !email || !password) {
      return { error: "Nome, e-mail e senha são obrigatórios." };
    }

    // Verificar e-mail duplicado
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { error: "Este e-mail já está sendo utilizado por outro usuário." };
    }

    // Buscar Role correspondente
    const roleObj = await prisma.role.findFirst({
      where: {
        key: role,
        OR: [{ companyId: session.companyId }, { companyId: null }]
      }
    });

    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedPin = pin ? await bcrypt.hash(pin, 10) : null;

    const newUser = await prisma.user.create({
      data: {
        companyId: session.companyId,
        name,
        email,
        password: hashedPassword,
        pin: hashedPin,
        role,
        roleId: roleObj?.id || null,
        active: true,
      }
    });

    // Vincular Lojas
    if (data.storeIds && data.storeIds.length > 0) {
      const defaultStoreId = data.defaultStoreId || data.storeIds[0];
      await prisma.userStore.createMany({
        data: data.storeIds.map(storeId => ({
          userId: newUser.id,
          storeId,
          isDefault: storeId === defaultStoreId,
        }))
      });
    }

    await logAudit({
      operation: "users.manage",
      action: "CREATE",
      entity: "User",
      entityId: newUser.id,
      newValue: JSON.stringify({ name, email, role, stores: data.storeIds }),
      reason: "Cadastro de novo usuário no sistema",
    });

    revalidatePath("/settings/users");
    revalidatePath("/users");
    return { success: true, user: newUser };
  } catch (err: any) {
    return { error: err.message || "Erro ao criar usuário." };
  }
}

export async function updateTenantUser(
  userId: string,
  data: {
    name: string;
    email: string;
    role: string;
    pin?: string;
    password?: string;
    active?: boolean;
    storeIds?: string[];
    defaultStoreId?: string;
    customPermissions?: { permissionId: string; granted: boolean; storeId?: string }[];
  }
) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Sessão inválida." };
    }

    // Regra: Somente administradores podem alterar dados, perfil ou permissões
    const isAdmin = session.role === "ADMIN" || Boolean(session.isSuperAdmin);
    if (!isAdmin) {
      return { error: "Apenas administradores podem editar colaboradores." };
    }

    // Regra: se o usuário estiver alterando o próprio cargo sem ser ADMIN
    if (session.userId === userId && !isAdmin && data.role !== session.role) {
      return { error: "Você não pode alterar seu próprio cargo." };
    }

    const oldUser = await prisma.user.findFirst({
      where: { id: userId, companyId: session.companyId },
      include: { userStores: true, userPermissions: true }
    });

    if (!oldUser) {
      return { error: "Usuário não encontrado." };
    }

    // Preparar dados a atualizar
    const updateData: any = {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      role: data.role,
    };

    if (data.active !== undefined) {
      updateData.active = data.active;
    }

    if (data.password && data.password.trim().length > 0) {
      updateData.password = await bcrypt.hash(data.password.trim(), 10);
    }

    if (data.pin !== undefined) {
      if (data.pin.trim().length > 0) {
        updateData.pin = await bcrypt.hash(data.pin.trim(), 10);
      } else {
        updateData.pin = null;
      }
    }

    // Atualizar roleId correspondente
    const roleObj = await prisma.role.findFirst({
      where: {
        key: data.role,
        OR: [{ companyId: session.companyId }, { companyId: null }]
      }
    });
    if (roleObj) {
      updateData.roleId = roleObj.id;
    }

    await prisma.$transaction(async (tx) => {
      // 1. Atualizar dados principais
      await tx.user.update({
        where: { id: userId },
        data: updateData,
      });

      // 2. Atualizar Lojas vinculadas
      if (data.storeIds !== undefined) {
        await tx.userStore.deleteMany({ where: { userId } });
        if (data.storeIds.length > 0) {
          const defaultStoreId = data.defaultStoreId || data.storeIds[0];
          await tx.userStore.createMany({
            data: data.storeIds.map(storeId => ({
              userId,
              storeId,
              isDefault: storeId === defaultStoreId,
            }))
          });
        }
      }

      // 3. Atualizar Permissões Específicas / Customizadas (Overrides)
      if (data.customPermissions !== undefined) {
        await tx.userPermission.deleteMany({ where: { userId } });
        if (data.customPermissions.length > 0) {
          await tx.userPermission.createMany({
            data: data.customPermissions.map(cp => ({
              userId,
              permissionId: cp.permissionId,
              storeId: cp.storeId || null,
              granted: cp.granted,
            }))
          });
        }
      }
    });

    await logAudit({
      operation: "users.manage",
      action: "UPDATE",
      entity: "User",
      entityId: userId,
      oldValue: JSON.stringify({ name: oldUser.name, role: oldUser.role, active: oldUser.active }),
      newValue: JSON.stringify({ name: data.name, role: data.role, active: data.active, customPermsCount: data.customPermissions?.length }),
      reason: `Atualização de cadastro e permissões de ${data.name}`,
    });

    revalidatePath("/settings/users");
    revalidatePath("/users");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao atualizar usuário." };
  }
}

export async function toggleTenantUserActive(userId: string, active: boolean) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Não autorizado" };
    }

    const isAdmin = session.role === "ADMIN" || Boolean(session.isSuperAdmin);
    if (!isAdmin) {
      return { error: "Apenas Administradores podem ativar ou bloquear colaboradores." };
    }

    if (session.userId === userId) {
      return { error: "Você não pode bloquear o seu próprio usuário." };
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, companyId: session.companyId }
    });

    if (!user) {
      return { error: "Usuário não encontrado." };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { active }
    });

    await logAudit({
      operation: "users.manage",
      action: active ? "UNBLOCK" : "BLOCK",
      entity: "User",
      entityId: userId,
      newValue: `Status: ${active ? "Ativo" : "Bloqueado"}`,
      reason: active ? `Desbloqueio de acesso do usuário ${user.name}` : `Bloqueio imediato do usuário ${user.name}`,
    });

    revalidatePath("/settings/users");
    revalidatePath("/users");
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

/**
 * Exclui colaborador. Restrito exclusivamente a ADMINISTRADORES.
 * Se o usuário tiver histórico de vendas, caixas ou estoque, ele é desativado permanentemente
 * para resguardar a integridade e auditoria fiscal dos registros existentes.
 */
export async function deleteTenantUser(userId: string) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Sessão inválida ou não autorizada." };
    }

    const isAdmin = session.role === "ADMIN" || Boolean(session.isSuperAdmin);
    if (!isAdmin) {
      return { error: "Apenas administradores podem excluir colaboradores." };
    }

    if (session.userId === userId) {
      return { error: "Você não pode excluir o seu próprio usuário." };
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, companyId: session.companyId },
      include: {
        _count: {
          select: {
            sales: true,
            cashRegisters: true,
            cashMovements: true,
            stockEntries: true,
          }
        }
      }
    });

    if (!user) {
      return { error: "Usuário não encontrado." };
    }

    const hasHistory =
      user._count.sales > 0 ||
      user._count.cashRegisters > 0 ||
      user._count.cashMovements > 0 ||
      user._count.stockEntries > 0;

    if (hasHistory) {
      // Preservação de auditoria fiscal: desativa o usuário e encerra a sessão ativa
      await prisma.user.update({
        where: { id: userId },
        data: { active: false, activeSessionToken: null }
      });

      await logAudit({
        operation: "users.manage",
        action: "DELETE",
        entity: "User",
        entityId: userId,
        reason: `Exclusão solicitada para ${user.name}. Como possui histórico de vendas/movimentações fiscais, o usuário foi permanentemente desativado e seu histórico mantido para auditoria.`,
      });

      revalidatePath("/settings/users");
      revalidatePath("/users");
      return {
        success: true,
        deactivated: true,
        message: `O colaborador "${user.name}" possui movimentações fiscais/vendas registradas. Seu acesso foi permanentemente desativado e o histórico preservado para conformidade fiscal.`
      };
    }

    // Se não tiver registros fiscais/vendas, remove as dependências e o usuário
    await prisma.$transaction(async (tx) => {
      await tx.userStore.deleteMany({ where: { userId } });
      await tx.userPermission.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });

    await logAudit({
      operation: "users.manage",
      action: "DELETE",
      entity: "User",
      entityId: userId,
      reason: `Exclusão definitiva do colaborador ${user.name} realizada por administrador.`,
    });

    revalidatePath("/settings/users");
    revalidatePath("/users");
    return { success: true, message: `Colaborador "${user.name}" excluído com sucesso.` };
  } catch (err: any) {
    return { error: err.message || "Erro ao excluir colaborador." };
  }
}


/**
 * Retorna os operadores habilitados para Frente de Caixa (PDV)
 */
export async function getPdvOperators(companyIdParam?: string) {
  try {
    const session = await getSession();
    let companyId = companyIdParam || session?.companyId;
    if (!companyId) {
      const firstComp = await prisma.company.findFirst();
      companyId = firstComp?.id;
    }
    if (!companyId) return { operators: [] };

    const users = await prisma.user.findMany({
      where: {
        companyId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        role: true,
        pin: true,
      },
      orderBy: { name: "asc" },
    });

    const roleLabels: Record<string, string> = {
      OPERATOR: "Operador de Caixa",
      SUPERVISOR: "Fiscal de Caixa",
      MANAGER: "Gerente de Loja",
      ADMIN: "Administrador",
      STOCKIST: "Estoque",
      SCALE_SECTOR: "Balança / Perecíveis",
      FINANCIAL: "Financeiro",
    };

    return {
      operators: users.map(u => ({
        id: u.id,
        name: u.name,
        role: roleLabels[u.role] || u.role,
        hasPin: Boolean(u.pin),
      })),
    };
  } catch (err) {
    return { operators: [] };
  }
}

/**
 * Valida o PIN do operador ou fiscal de caixa
 */
export async function verifyPdvPin(data: { userId?: string; userName?: string; pin: string }) {
  try {
    const session = await getSession();
    const companyId = session?.companyId;

    let user;
    if (data.userId) {
      user = await prisma.user.findUnique({ where: { id: data.userId } });
    } else if (data.userName) {
      user = await prisma.user.findFirst({
        where: {
          name: data.userName,
          ...(companyId ? { companyId } : {}),
        },
      });
    }

    if (!user) {
      // Fallback para PIN padrão de teste em ambiente offline ou de demonstração
      if (data.pin === "1234") {
        return { success: true, verified: true, role: "OPERATOR", userName: data.userName || "Operador" };
      }
      return { success: false, error: "Usuário não localizado." };
    }

    // Se o usuário não tem PIN configurado, permite o PIN padrão 1234
    if (!user.pin) {
      if (data.pin === "1234") {
        return { success: true, verified: true, role: user.role, userName: user.name };
      }
      return { success: false, error: "PIN incorreto. Defina um PIN de 4 dígitos nas configurações de usuários." };
    }

    const isValid = await bcrypt.compare(data.pin, user.pin);
    if (!isValid) {
      return { success: false, error: "PIN inválido." };
    }

    return {
      success: true,
      verified: true,
      userId: user.id,
      userName: user.name,
      role: user.role,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao validar PIN." };
  }
}

