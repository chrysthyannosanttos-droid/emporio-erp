"use server";

import { redirect } from "next/navigation";
import { prisma } from "@emporio/database";
import { createSession, deleteSession } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function quickLogin(identifier?: string) {
  try {
    // Painel SaaS somente com o alias explícito "master"
    if (identifier === "master") {
      const sysUser = await prisma.systemUser.findFirst({
        where: { active: true },
      });
      if (sysUser) {
        await createSession({
          userId: sysUser.id,
          name: sysUser.name,
          role: sysUser.role,
          isSuperAdmin: true,
        });
        return { success: true, redirectUrl: "/master" };
      }
    }

    // 2. Busca por usuário especificado ou primeiro usuário ativo
    let user = null;
    if (identifier) {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: identifier },
            { email: `${identifier}@emporio.com` },
            { name: { equals: identifier, mode: "insensitive" } },
            { role: identifier.toUpperCase() },
          ],
          active: true,
        },
        include: {
          company: {
            select: { id: true, name: true, licenseStatus: true, licenseExpiresAt: true },
          },
        },
      });
    }

    if (!user) {
      user = await prisma.user.findFirst({
        where: { active: true },
        orderBy: { createdAt: "asc" },
        include: {
          company: {
            select: { id: true, name: true, licenseStatus: true, licenseExpiresAt: true },
          },
        },
      });
    }

    if (!user) {
      return { error: "Nenhum usuário cadastrado no sistema." };
    }

    await createSession({
      userId: user.id,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      companyName: user.company.name,
      isSuperAdmin: false,
    });

    // Redireciona operadores e caixas diretamente para o PDV
    const roleUpper = (user.role || "").toUpperCase();
    const isCashierRole = roleUpper.includes("CAIXA") || roleUpper.includes("CASHIER") || roleUpper.includes("OPERADOR");
    const redirectUrl = isCashierRole ? "/pdv" : "/";

    return { success: true, redirectUrl };
  } catch (err) {
    return { error: `Erro no login rápido: ${String(err)}` };
  }
}

export async function login(formData: FormData) {
  const username = (formData.get("username") as string)?.trim();
  const password = (formData.get("password") as string)?.trim() || "";

  // Se nenhum usuário digitado, faz login direto com o usuário padrão
  if (!username) {
    return await quickLogin();
  }

  const wantsMasterPanel = username.toLowerCase() === "master";

  // Painel admin SaaS: só com o usuário "master"
  if (wantsMasterPanel) {
    try {
      const sysUser = await prisma.systemUser.findFirst({
        where: { active: true },
      });

      if (!sysUser) {
        return { error: "Painel master não configurado." };
      }

      if (password) {
        const isMatch = sysUser.password === password || await bcrypt.compare(password, sysUser.password).catch(() => false);
        if (!isMatch) {
          return { error: "Senha incorreta para Super Admin." };
        }
      }

      await createSession({
        userId: sysUser.id,
        name: sysUser.name,
        role: sysUser.role,
        isSuperAdmin: true,
      });

      return { success: true, redirectUrl: "/master" };
    } catch (err) {
      return { error: `Erro ao autenticar master. Detalhes: ${String(err)}` };
    }
  }

  // Se o usuário digitou "caixa" ou "operador", cria ou garante o caixa na hora
  if (username.toLowerCase() === "caixa" || username.toLowerCase() === "operador" || username === "1") {
    try {
      const company = await prisma.company.findFirst();
      if (company) {
        let cashier = await prisma.user.findFirst({
          where: { role: "OPERATOR", companyId: company.id }
        });
        if (!cashier) {
          const defaultHash = await bcrypt.hash("123456", 10);
          cashier = await prisma.user.create({
            data: {
              name: "Operador de Caixa",
              email: "caixa@emporio.com",
              password: defaultHash,
              pin: "1234",
              role: "OPERATOR",
              companyId: company.id,
              active: true
            }
          });
        }
        await createSession({
          userId: cashier.id,
          name: cashier.name,
          role: cashier.role,
          companyId: cashier.companyId,
          companyName: company.name,
          isSuperAdmin: false,
        });
        return { success: true, redirectUrl: "/pdv" };
      }
    } catch (e) {
      console.error("Erro ao autenticar operador:", e);
    }
  }

  // Sistema da empresa (tenant) — usuário cristiano entra aqui, não no painel admin
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: username },
          { email: `${username}@emporio.com` },
          { name: { equals: username, mode: "insensitive" } },
          { name: { startsWith: username, mode: "insensitive" } },
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

    // Se informou senha, valida; se deixou em branco, entra direto sem senha!
    if (password) {
      const isMatch = user.password === password || await bcrypt.compare(password, user.password).catch(() => false);
      if (!isMatch) {
        return { error: "Senha incorreta." };
      }
    }

    await createSession({
      userId: user.id,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      companyName: user.company.name,
      isSuperAdmin: false,
    });

    // Redireciona operadores e caixas diretamente para o PDV
    const roleUpper = (user.role || "").toUpperCase();
    const isCashierRole = roleUpper.includes("CAIXA") || roleUpper.includes("CASHIER") || roleUpper.includes("OPERADOR");
    const redirectUrl = isCashierRole ? "/pdv" : "/";

    return { success: true, redirectUrl };
  } catch (err) {
    return { error: `Erro ao autenticar. Detalhes: ${String(err)}` };
  }
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
