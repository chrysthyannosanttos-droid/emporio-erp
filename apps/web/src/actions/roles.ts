"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { logAudit } from "./audit";

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



export async function listRolesWithPermissions() {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { roles: [], permissions: [], error: "Não autorizado" };
    }

    const [roles, permissions] = await Promise.all([
      prisma.role.findMany({
        where: {
          OR: [
            { companyId: session.companyId },
            { companyId: null, isSystem: true }
          ]
        },
        orderBy: { createdAt: "asc" },
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
    if (!session?.companyId || session.role !== "ADMIN") {
      return { error: "Apenas administradores podem alterar permissões de perfis." };
    }

    const role = await prisma.role.findFirst({
      where: { id: roleId }
    });

    if (!role) {
      return { error: "Perfil não encontrado." };
    }

    // Se o perfil for de sistema e ainda não for clonado para a empresa, podemos atualizar ou criar relação
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
    if (!session?.companyId || session.role !== "ADMIN") {
      return { error: "Não autorizado." };
    }

    const key = data.key.trim().toUpperCase().replace(/\s+/g, "_");
    const name = data.name.trim();

    if (!key || !name) {
      return { error: "Código e Nome do perfil são obrigatórios." };
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
      }
    });

    await logAudit({
      operation: "roles.manage",
      action: "CREATE",
      entity: "Role",
      entityId: role.id,
      newValue: JSON.stringify({ key, name }),
      reason: "Criação de novo perfil customizado",
    });

    revalidatePath("/settings/roles");
    return { success: true, role: toPlain(role) };
  } catch (err: any) {
    return { error: err.message || "Erro ao criar perfil." };
  }
}

