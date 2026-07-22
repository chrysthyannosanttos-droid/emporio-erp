"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function listTenantUsers() {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { users: [], error: "Não autorizado" };
    }

    const users = await prisma.user.findMany({
      where: { companyId: session.companyId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    return { users };
  } catch (err: any) {
    return { users: [], error: err.message };
  }
}

export async function createTenantUser(formData: FormData) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Sessão inválida ou não autorizada." };
    }

    // Apenas ADMIN ou MANAGER podem criar usuários
    if (session.role !== "ADMIN" && session.role !== "MANAGER") {
      return { error: "Apenas administradores podem criar usuários." };
    }

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const role = (formData.get("role") as string) || "OPERATOR";

    if (!name || !email || !password) {
      return { error: "Nome, e-mail e senha são obrigatórios." };
    }

    // Verificar se e-mail já existe
    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) {
      return { error: "E-mail já está em uso por outro usuário." };
    }

    // Hash da senha com bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        companyId: session.companyId,
        active: true,
      },
    });

    revalidatePath("/settings");
    return { success: true, user: newUser };
  } catch (err: any) {
    return { error: err.message || "Erro ao criar usuário." };
  }
}

export async function toggleTenantUserActive(userId: string, active: boolean) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Não autorizado" };
    }

    if (session.role !== "ADMIN") {
      return { error: "Apenas o Administrador pode ativar/desativar usuários." };
    }

    await prisma.user.updateMany({
      where: { id: userId, companyId: session.companyId },
      data: { active },
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}
