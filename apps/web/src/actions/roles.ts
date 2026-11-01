"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { logAudit } from "./audit";
import {
  SUPERMARKET_PERMISSIONS,
  SUPERMARKET_DEFAULT_ROLES
} from "@/lib/supermarketRoles";

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

// As matrizes e perfis padrões de supermercado foram centralizados em '@/lib/supermarketRoles'
// para conformidade com Server Actions do Next.js Turbopack.

const seededCompanies = new Set<string>();

/**
 * Garante que a matriz de permissões e os grupos padrões de supermercado
 * estejam criados no banco para a empresa (executado com verificação rápida em lote).
 */
export async function seedSupermarketRolesAndPermissions(companyId: string) {
  if (seededCompanies.has(companyId)) {
    return;
  }

  try {
    const [permCount, roleCount] = await Promise.all([
      prisma.permission.count(),
      prisma.role.count({
        where: {
          OR: [{ companyId }, { companyId: null, isSystem: true }]
        }
      })
    ]);

    // Se já existem as permissões e cargos básicos, pula para resposta instantânea (< 5ms)
    if (permCount >= SUPERMARKET_PERMISSIONS.length && roleCount >= SUPERMARKET_DEFAULT_ROLES.length) {
      seededCompanies.add(companyId);
      return;
    }

    // 1. Criação em lote (batch) de permissões
    await prisma.permission.createMany({
      data: SUPERMARKET_PERMISSIONS.map(p => ({
        code: p.code,
        name: p.name,
        module: p.module,
        description: p.description,
      })),
      skipDuplicates: true,
    });

    const allPerms = await prisma.permission.findMany({ select: { id: true, code: true } });
    const dbPermissions: Record<string, string> = {};
    for (const p of allPerms) {
      dbPermissions[p.code] = p.id;
    }

    // 2. Criação dos grupos/setores padrões de supermercado para a empresa
    for (const r of SUPERMARKET_DEFAULT_ROLES) {
      let role = await prisma.role.findFirst({
        where: {
          key: r.key,
          OR: [{ companyId }, { companyId: null, isSystem: true }]
        },
        include: { permissions: true }
      });

      if (!role) {
        role = await prisma.role.create({
          data: {
            companyId,
            key: r.key,
            name: r.name,
            description: `${r.sector} — ${r.description}`,
            isSystem: r.isSystem,
          },
          include: { permissions: true }
        });
      }

      // Se o perfil ainda não tem permissões vinculadas (ou é ADMIN com ALL), garante vínculo
      if (role.permissions.length === 0 || r.permissionCodes === "ALL") {
        const codesToLink: string[] = Array.isArray(r.permissionCodes)
          ? r.permissionCodes
          : SUPERMARKET_PERMISSIONS.map(p => p.code);

        const permIds = codesToLink
          .map((code: string) => dbPermissions[code])
          .filter((id): id is string => Boolean(id));

        if (permIds.length > 0) {
          await prisma.rolePermission.createMany({
            data: permIds.map((permissionId: string) => ({
              roleId: role!.id,
              permissionId,
            })),
            skipDuplicates: true,
          });
        }
      }
    }

    seededCompanies.add(companyId);
  } catch (err) {
    console.warn("Notice ao semear permissões de supermercado:", err);
  }
}

export async function listRolesWithPermissions() {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { roles: [], permissions: [], error: "Não autorizado" };
    }

    // Garante que a empresa tenha a matriz completa de supermercado
    await seedSupermarketRolesAndPermissions(session.companyId);

    const [roles, permissions] = await Promise.all([
      prisma.role.findMany({
        where: {
          OR: [
            { companyId: session.companyId },
            { companyId: null, isSystem: true }
          ]
        },
        orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
        include: {
          permissions: {
            include: { permission: true }
          },
          _count: {
            select: { users: true }
          }
        }
      }),
      prisma.permission.findMany({
        orderBy: [{ module: "asc" }, { code: "asc" }]
      })
    ]);

    return { roles: toPlain(roles), permissions: toPlain(permissions) };
  } catch (err: any) {
    return { roles: [], permissions: [], error: err.message };
  }
}

export async function updateRolePermissions(roleId: string, permissionIds: string[]) {
  try {
    const session = await getSession();
    if (!session?.companyId || (session.role !== "ADMIN" && session.role !== "MANAGER")) {
      return { error: "Apenas administradores e gerentes podem alterar permissões de perfis." };
    }

    const role = await prisma.role.findFirst({
      where: { id: roleId }
    });

    if (!role) {
      return { error: "Perfil não encontrado." };
    }

    await prisma.$transaction(async (tx) => {
      // Limpar permissões anteriores
      await tx.rolePermission.deleteMany({
        where: { roleId }
      });

      // Inserir novas permissões
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map(permissionId => ({
            roleId,
            permissionId,
          }))
        });
      }
    });

    await logAudit({
      operation: "roles.manage",
      action: "UPDATE",
      entity: "Role",
      entityId: roleId,
      newValue: `Total de permissões: ${permissionIds.length}`,
      reason: `Atualização da matriz de permissões do perfil ${role.name}`,
    });

    revalidatePath("/settings");
    revalidatePath("/settings/roles");
    revalidatePath("/settings/users");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao atualizar permissões do perfil." };
  }
}

export async function createCustomRole(data: {
  key: string;
  name: string;
  description?: string;
  permissionIds: string[];
}) {
  try {
    const session = await getSession();
    if (!session?.companyId || (session.role !== "ADMIN" && session.role !== "MANAGER")) {
      return { error: "Não autorizado." };
    }

    const key = data.key.trim().toUpperCase().replace(/\s+/g, "_");
    const name = data.name.trim();

    if (!key || !name) {
      return { error: "Código e Nome do perfil são obrigatórios." };
    }

    // Verifica se já existe um perfil com esse código na empresa
    const existing = await prisma.role.findFirst({
      where: {
        key,
        companyId: session.companyId,
      }
    });

    if (existing) {
      return { error: `Já existe um grupo de setor com o código "${key}".` };
    }

    const role = await prisma.role.create({
      data: {
        companyId: session.companyId,
        key,
        name,
        description: data.description || null,
        isSystem: false,
        permissions: {
          create: data.permissionIds.map(permissionId => ({ permissionId }))
        }
      },
      include: {
        permissions: {
          include: { permission: true }
        },
        _count: {
          select: { users: true }
        }
      }
    });

    await logAudit({
      operation: "roles.manage",
      action: "CREATE",
      entity: "Role",
      entityId: role.id,
      newValue: JSON.stringify({ key, name }),
      reason: "Criação de novo grupo de setor de supermercado",
    });

    revalidatePath("/settings/roles");
    revalidatePath("/settings/users");
    return { success: true, role: toPlain(role) };
  } catch (err: any) {
    return { error: err.message || "Erro ao criar grupo de setor." };
  }
}

export async function resetRoleToSupermarketDefaults(roleId: string) {
  try {
    const session = await getSession();
    if (!session?.companyId || session.role !== "ADMIN") {
      return { error: "Apenas administradores podem restaurar permissões padrões." };
    }

    const role = await prisma.role.findFirst({
      where: { id: roleId }
    });

    if (!role) {
      return { error: "Perfil não encontrado." };
    }

    const defaultRole = SUPERMARKET_DEFAULT_ROLES.find(r => r.key === role.key);
    if (!defaultRole) {
      return { error: "Não há padrão de supermercado predefinido para este cargo customizado." };
    }

    const allPerms = await prisma.permission.findMany();
    const permMap = new Map(allPerms.map(p => [p.code, p.id]));

    const targetCodes: string[] = Array.isArray(defaultRole.permissionCodes)
      ? defaultRole.permissionCodes
      : SUPERMARKET_PERMISSIONS.map(p => p.code);

    const targetIds = targetCodes.map((c: string) => permMap.get(c)).filter((id): id is string => Boolean(id));

    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      await tx.rolePermission.createMany({
        data: targetIds.map(permissionId => ({ roleId, permissionId }))
      });
    });

    revalidatePath("/settings/roles");
    revalidatePath("/settings/users");
    return { success: true, count: targetIds.length };
  } catch (err: any) {
    return { error: err.message || "Erro ao restaurar padrões." };
  }
}

export async function deleteCustomRole(roleId: string) {
  try {
    const session = await getSession();
    if (!session?.companyId || session.role !== "ADMIN") {
      return { error: "Não autorizado." };
    }

    const role = await prisma.role.findFirst({
      where: { id: roleId, companyId: session.companyId },
      include: { _count: { select: { users: true } } }
    });

    if (!role) {
      return { error: "Perfil não encontrado ou é um perfil fixo de sistema." };
    }

    if (role.isSystem) {
      return { error: "Perfis essenciais do sistema não podem ser excluídos." };
    }

    if (role._count.users > 0) {
      return { error: `Existem ${role._count.users} usuário(s) vinculado(s) a este perfil. Reatribua-os antes de excluir.` };
    }

    await prisma.role.delete({ where: { id: roleId } });

    revalidatePath("/settings/roles");
    revalidatePath("/settings/users");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao excluir perfil." };
  }
}
