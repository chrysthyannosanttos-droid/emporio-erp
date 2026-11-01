"use server";

import { redirect } from "next/navigation";
import { prisma } from "@emporio/database";
import { createSession, deleteSession, getSession } from "@/lib/session";
import bcrypt from "bcryptjs";

export function isCashierRole(role?: string | null, roleName?: string | null): boolean {
  if (!role && !roleName) return false;
  const roleUpper = (role || "").trim().toUpperCase();
  const nameUpper = (roleName || "").trim().toUpperCase();
  return (
    roleUpper === "OPERATOR" ||
    roleUpper === "CASHIER" ||
    roleUpper.includes("OPERATOR") ||
    roleUpper.includes("OPERADOR") ||
    roleUpper.includes("CAIXA") ||
    roleUpper.includes("CASHIER") ||
    nameUpper.includes("OPERADOR") ||
    nameUpper.includes("CAIXA") ||
    nameUpper.includes("OPERATOR") ||
    nameUpper.includes("CASHIER")
  );
}

export async function quickLogin(identifier?: string) {
  try {
    // Painel SaaS somente com o alias explícito "master"
    if (identifier === "master") {
      const sysUser = await prisma.systemUser.findFirst({
        where: { active: true },
      });
      if (sysUser) {
        const sessionToken = crypto.randomUUID();
        await prisma.systemUser.update({
          where: { id: sysUser.id },
          data: { activeSessionToken: sessionToken },
        });
        await createSession({
          userId: sysUser.id,
          name: sysUser.name,
          role: sysUser.role,
          isSuperAdmin: true,
          sessionToken,
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
          roleRelation: {
            select: { key: true, name: true },
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
          roleRelation: {
            select: { key: true, name: true },
          },
        },
      });
    }

    if (!user) {
      return { error: "Nenhum usuário cadastrado no sistema." };
    }

    const sessionToken = crypto.randomUUID();
    await prisma.user.update({
      where: { id: user.id },
      data: { activeSessionToken: sessionToken, lastLogin: new Date() },
    });

    await createSession({
      userId: user.id,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      companyName: user.company.name,
      isSuperAdmin: false,
      sessionToken,
    });

    // Redireciona operadores e caixas diretamente para o PDV
    const isCashier = isCashierRole(user.role, user.roleRelation?.name || user.roleRelation?.key);
    const redirectUrl = isCashier ? "/pdv" : "/";

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

      const sessionToken = crypto.randomUUID();
      await prisma.systemUser.update({
        where: { id: sysUser.id },
        data: { activeSessionToken: sessionToken },
      });

      await createSession({
        userId: sysUser.id,
        name: sysUser.name,
        role: sysUser.role,
        isSuperAdmin: true,
        sessionToken,
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
        const sessionToken = crypto.randomUUID();
        await prisma.user.update({
          where: { id: cashier.id },
          data: { activeSessionToken: sessionToken, lastLogin: new Date() },
        });

        await createSession({
          userId: cashier.id,
          name: cashier.name,
          role: cashier.role,
          companyId: cashier.companyId,
          companyName: company.name,
          isSuperAdmin: false,
          sessionToken,
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
        },
        roleRelation: {
          select: { key: true, name: true }
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

    const sessionToken = crypto.randomUUID();
    await prisma.user.update({
      where: { id: user.id },
      data: { activeSessionToken: sessionToken, lastLogin: new Date() },
    });

    await createSession({
      userId: user.id,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      companyName: user.company.name,
      isSuperAdmin: false,
      sessionToken,
    });

    // Redireciona operadores e caixas diretamente para o PDV
    const isCashier = isCashierRole(user.role, user.roleRelation?.name || user.roleRelation?.key);
    const redirectUrl = isCashier ? "/pdv" : "/";

    return { success: true, redirectUrl };
  } catch (err) {
    return { error: `Erro ao autenticar. Detalhes: ${String(err)}` };
  }
}

export async function logout() {
  try {
    const session = await getSession();
    if (session?.userId) {
      if (session.isSuperAdmin) {
        await prisma.systemUser.updateMany({
          where: { id: session.userId, activeSessionToken: session.sessionToken || undefined },
          data: { activeSessionToken: null },
        });
      } else {
        await prisma.user.updateMany({
          where: { id: session.userId, activeSessionToken: session.sessionToken || undefined },
          data: { activeSessionToken: null },
        });
      }
    }
  } catch (err) {
    console.warn("Erro ao limpar activeSessionToken no logout:", err);
  }

  await deleteSession();
  redirect("/login");
}

/**
 * Valida se a sessão do usuário ainda é a sessão ativa autorizada no banco de dados.
 * Caso outro login tenha sido efetuado com o mesmo usuário em outro aparelho/navegador,
 * esta função detecta o conflito para encerrar a sessão duplicada.
 */
export async function validateActiveSession(): Promise<{
  valid: boolean;
  reason?: "CONCURRENT_LOGIN" | "USER_INACTIVE" | "NO_SESSION";
  userName?: string;
}> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { valid: false, reason: "NO_SESSION" };
    }

    // Se o JWT ainda não tiver sessionToken (sessões legadas antes do update),
    // vincula o token atual ao banco para não deslogar bruscamente na primeira vez
    if (!session.sessionToken) {
      return { valid: true, userName: session.name };
    }

    if (session.isSuperAdmin) {
      const sysUser = await prisma.systemUser.findUnique({
        where: { id: session.userId },
        select: { activeSessionToken: true, active: true },
      });

      if (!sysUser || !sysUser.active) {
        await deleteSession();
        return { valid: false, reason: "USER_INACTIVE" };
      }

      if (sysUser.activeSessionToken && sysUser.activeSessionToken !== session.sessionToken) {
        await deleteSession();
        return { valid: false, reason: "CONCURRENT_LOGIN", userName: session.name };
      }

      return { valid: true, userName: session.name };
    } else {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { activeSessionToken: true, active: true },
      });

      if (!user || !user.active) {
        await deleteSession();
        return { valid: false, reason: "USER_INACTIVE" };
      }

      // Se há um token ativo no banco e é diferente do token gravado neste navegador,
      // significa que o mesmo usuário fez login em outro dispositivo!
      if (user.activeSessionToken && user.activeSessionToken !== session.sessionToken) {
        await deleteSession();
        return { valid: false, reason: "CONCURRENT_LOGIN", userName: session.name };
      }

      return { valid: true, userName: session.name };
    }
  } catch (err) {
    // Fail-open em caso de oscilação momentânea do pooler para não prejudicar operadores
    return { valid: true };
  }
}
