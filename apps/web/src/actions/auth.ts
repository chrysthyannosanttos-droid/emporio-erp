"use server";

import { redirect } from "next/navigation";
import { prisma } from "@emporio/database";
import { createSession, deleteSession } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function login(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { error: "Preencha todos os campos." };
  }

  // 1. Tentar login como Super Admin (Painel Master)
  try {
    const sysUser = await prisma.systemUser.findFirst({
      where: {
        OR: [
          { email: username },
          { email: `${username}@emporio.com` },
          { name: { equals: username, mode: "insensitive" } },
        ],
        active: true,
      },
    });

    if (sysUser) {
      // Comparar senha com bcrypt, fallback temporário para texto puro
      const isMatch = sysUser.password === password || await bcrypt.compare(password, sysUser.password).catch(() => false);
      
      if (!isMatch) {
        return { error: "Senha incorreta para Super Admin." };
      }

      await createSession({
        userId: sysUser.id,
        name: sysUser.name,
        role: sysUser.role,
        isSuperAdmin: true,
      });

      return { success: true, redirectUrl: "/master" };
    }
  } catch (err) {
    console.error("Erro na busca de admin", err);
  }

  // 2. Tentar login como Usuário de Empresa (Tenant)
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: username },
          { name: { equals: username, mode: "insensitive" } },
        ],
        active: true,
      },
      include: { 
        company: { 
          select: { id: true, name: true, licenseStatus: true, licenseExpiresAt: true } 
        } 
      },
    });

    if (!user) {
      return { error: "Usuário não encontrado." };
    }

    if (user.company.licenseStatus === "SUSPENDED" || user.company.licenseStatus === "EXPIRED") {
      return { error: "A licença da sua empresa expirou ou está suspensa. Contate o administrador." };
    }

    // Senha (suporta fallback temporário texto puro ou bcrypt)
    const isMatch = user.password === password || await bcrypt.compare(password, user.password).catch(() => false);
    if (!isMatch) {
      return { error: "Senha incorreta." };
    }

    await createSession({
      userId: user.id,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      companyName: user.company.name,
      isSuperAdmin: false,
    });

    return { success: true, redirectUrl: "/" };
  } catch {
    return { error: "Erro ao autenticar. Tente novamente." };
  }
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
