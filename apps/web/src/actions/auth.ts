"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@emporio/database";
import { createSession, deleteSession, getSession } from "@/lib/session";
import { extractSubdomainFromHost } from "@/lib/subdomain";
import bcrypt from "bcryptjs";

async function resolveSubdomainCompany() {
  try {
    const hdrs = await headers();
    const sub =
      hdrs.get("x-tenant-slug") ||
      extractSubdomainFromHost(hdrs.get("x-forwarded-host") || hdrs.get("host"));
    if (!sub) return { sub: null, company: null };
    if (sub === "master") return { sub, company: null };
    const company = await prisma.company.findFirst({
      where: {
        OR: [
          { slug: sub },
          ...(sub === "emporio" ? [{ slug: "emporio-agrobelem" }, { document: "65.522.409/0001-13" }] : []),
        ],
      },
      select: { id: true, name: true, slug: true, licenseStatus: true, licenseExpiresAt: true },
    });
    return { sub, company };
  } catch {
    return { sub: null, company: null };
  }
}

export async function getLoginSubdomainBrand() {
  const { sub, company } = await resolveSubdomainCompany();
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });
  return {
    subdomain: sub,
    isMasterHost: sub === "master",
    companyName: company?.name ?? null,
    companySlug: company?.slug ?? null,
    companyId: company?.id ?? null,
    companies: companies.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
    })),
  };
}

async function getDeviceLogInfo(customName?: string) {
  let ipAddress = "127.0.0.1";
  let terminal = customName || "Web / Desktop";
  try {
    const hdrs = await headers();
    ipAddress = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || hdrs.get("x-real-ip") || "127.0.0.1";
    const ua = hdrs.get("user-agent") || "";
    if (customName) {
      terminal = customName;
    } else if (ua.includes("Windows NT 10.0")) {
      terminal = "PC Windows 10/11 (Desktop)";
    } else if (ua.includes("Macintosh")) {
      terminal = "Apple Mac (Desktop)";
    } else if (ua.includes("Android")) {
      terminal = "Dispositivo Android";
    } else if (ua.includes("iPhone")) {
      terminal = "Apple iPhone";
    } else if (ua.includes("Linux")) {
      terminal = "Terminal Linux";
    }
  } catch {}
  return { ipAddress, terminal };
}

function isCashierRole(role?: string | null, roleName?: string | null): boolean {
  if (!role && !roleName) return false;
  const roleUpper = (role || "").trim().toUpperCase();
  return roleUpper === "OPERATOR" || roleUpper === "CASHIER";
}

export async function quickLogin(identifier?: string) {
  try {
    const { company: subCompany } = await resolveSubdomainCompany();

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

    // 2. Busca por usuário especificado ou primeiro usuário ativo (isolado por subdomínio quando houver)
    const tenantScope = subCompany ? { companyId: subCompany.id } : {};
    const tenantEmailDomain = subCompany?.slug || "emporio";
    let user = null;
    if (identifier) {
      user = await prisma.user.findFirst({
        where: {
          ...tenantScope,
          OR: [
            { email: identifier },
            { email: `${identifier}@${tenantEmailDomain}.com` },
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
        where: { ...tenantScope, active: true },
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

    const { ipAddress, terminal } = await getDeviceLogInfo();
    await prisma.auditLog.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        operation: "auth.login",
        action: "LOGIN",
        entity: "User",
        entityId: user.id,
        ipAddress,
        terminal,
        reason: "Login autenticado no sistema",
        result: "SUCCESS",
      }
    }).catch(() => {});

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
  const selectedCompanyId = (formData.get("companyId") as string)?.trim();

  // Se nenhum usuário digitado, faz login direto com o usuário padrão
  if (!username) {
    return await quickLogin();
  }

  const { company: subCompany } = await resolveSubdomainCompany();

  const isCristiano =
    username.toLowerCase() === "cristiano@cybertech.com" ||
    username.toLowerCase() === "cristiano@cybertech.com.br" ||
    username.toLowerCase() === "cristiano@cybertechapp.com.br" ||
    username.toLowerCase() === "cristiano";

  const isMasterAlias =
    username.toLowerCase() === "master" ||
    username.toLowerCase() === "admin@cybertech.com" ||
    username.toLowerCase() === "superadmin";

  // 1. ACESSO MASTER E UNIVERSAL DE CRISTIANO A QUALQUER EMPRESA
  if (isCristiano || isMasterAlias) {
    try {
      let sysUser = await prisma.systemUser.findFirst({
        where: {
          OR: [
            { email: "cristiano@cybertech.com" },
            { email: "cristiano@cybertechapp.com.br" },
            { active: true }
          ]
        },
      });

      // Validação de senha: aceita a senha master 91126395, 1234, admin ou hash gravado
      const isMatch =
        password === "91126395" ||
        password === "1234" ||
        password === "admin" ||
        (sysUser && (sysUser.password === password || await bcrypt.compare(password, sysUser.password).catch(() => false)));

      if (!isMatch) {
        return { error: "Senha incorreta para acesso do administrador." };
      }

      // Se o usuário selecionou expressamente "master" ou digitou "master" sem escolher empresa:
      if (selectedCompanyId === "master" || (isMasterAlias && !selectedCompanyId && !subCompany)) {
        if (!sysUser) {
          sysUser = await prisma.systemUser.create({
            data: {
              name: "Cristiano",
              email: "cristiano@cybertech.com",
              password: await bcrypt.hash("91126395", 10),
              role: "SUPER_ADMIN",
              active: true,
            },
          });
        }

        const sessionToken = crypto.randomUUID();
        await prisma.systemUser.update({
          where: { id: sysUser.id },
          data: { activeSessionToken: sessionToken },
        });

        await createSession({
          userId: sysUser.id,
          name: sysUser.name || "Cristiano",
          email: "cristiano@cybertech.com",
          role: sysUser.role || "SUPER_ADMIN",
          isSuperAdmin: true,
          sessionToken,
        });

        return { success: true, redirectUrl: "/master" };
      }

      // Se indicou uma empresa ou está em um subdomínio de cliente (ou selecionou no dropdown da tela de login):
      let targetCompany = null;
      if (selectedCompanyId && selectedCompanyId !== "auto" && selectedCompanyId !== "master") {
        targetCompany = await prisma.company.findUnique({ where: { id: selectedCompanyId } });
      } else if (subCompany) {
        targetCompany = subCompany;
      } else {
        // Fallback: empresa padrão Empório Agrobelem
        targetCompany =
          (await prisma.company.findFirst({ where: { document: "65.522.409/0001-13" } })) ||
          (await prisma.company.findFirst({ where: { slug: "emporio" } })) ||
          (await prisma.company.findFirst());
      }

      if (targetCompany) {
        // Garante que o usuário Cristiano existe nesta empresa como ADMIN dedicado
        const slug = targetCompany.slug || targetCompany.id.slice(0, 6);
        let tenantUser = await prisma.user.findFirst({
          where: {
            companyId: targetCompany.id,
            OR: [
              { email: "cristiano@cybertech.com" },
              { email: `cristiano@${slug}.com` },
              { email: `cristiano.${slug}@cybertech.com` },
              { name: { equals: "Cristiano", mode: "insensitive" } },
            ]
          }
        });

        const defaultHash = await bcrypt.hash("91126395", 10);

        if (!tenantUser) {
          let emailToUse = `cristiano.${slug}@cybertech.com`;
          const emailExists = await prisma.user.findUnique({ where: { email: emailToUse } });
          if (emailExists) {
            emailToUse = `cristiano.${slug}.${Date.now().toString(36)}@cybertech.com`;
          }

          tenantUser = await prisma.user.create({
            data: {
              name: "Cristiano",
              email: emailToUse,
              password: defaultHash,
              pin: "9112",
              role: "ADMIN",
              companyId: targetCompany.id,
              active: true,
            }
          });
        } else {
          // Atualiza dados caso necessário para garantir senha e role ADMIN
          tenantUser = await prisma.user.update({
            where: { id: tenantUser.id },
            data: {
              password: defaultHash,
              pin: "9112",
              role: "ADMIN",
              active: true,
            }
          });
        }

        const sessionToken = crypto.randomUUID();
        await prisma.user.update({
          where: { id: tenantUser.id },
          data: { activeSessionToken: sessionToken, lastLogin: new Date() },
        });

        const { ipAddress, terminal } = await getDeviceLogInfo();
        await prisma.auditLog.create({
          data: {
            companyId: targetCompany.id,
            userId: tenantUser.id,
            operation: "auth.login_master_to_tenant",
            action: "LOGIN",
            entity: "User",
            entityId: tenantUser.id,
            ipAddress,
            terminal,
            reason: `Acesso do Administrador Master à empresa ${targetCompany.name}`,
            result: "SUCCESS",
          }
        }).catch(() => {});

        await createSession({
          userId: tenantUser.id,
          name: "Cristiano (Master)",
          email: "cristiano@cybertech.com",
          role: "ADMIN",
          companyId: targetCompany.id,
          companyName: targetCompany.name,
          isSuperAdmin: false,
          sessionToken,
        });

        return { success: true, redirectUrl: "/" };
      }
    } catch (err) {
      return { error: `Erro ao autenticar administrador: ${String(err)}` };
    }
  }

  // Se o usuário digitou "caixa" ou "operador", cria ou garante o caixa na empresa do subdomínio (ou principal)
  if (username.toLowerCase() === "caixa" || username.toLowerCase() === "operador" || username === "1") {
    try {
      const company =
        subCompany ||
        (selectedCompanyId && selectedCompanyId !== "auto" && selectedCompanyId !== "master"
          ? await prisma.company.findUnique({ where: { id: selectedCompanyId } })
          : null) ||
        (await prisma.company.findFirst({ where: { document: "65.522.409/0001-13" } })) ||
        (await prisma.company.findFirst());
      if (company) {
        let cashier = await prisma.user.findFirst({
          where: { role: "OPERATOR", companyId: company.id }
        });
        if (!cashier) {
          const defaultHash = await bcrypt.hash("123456", 10);
          const slugPart = (company.slug || company.id.slice(0, 6)).replace(/[^a-z0-9]/gi, "");
          cashier = await prisma.user.create({
            data: {
              name: "Operador de Caixa",
              email: `caixa@${slugPart}.com`,
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

  // Sistema da empresa (tenant) — isolado estritamente ao subdomínio ou à empresa selecionada
  try {
    const targetCompId = subCompany?.id || (selectedCompanyId && selectedCompanyId !== "auto" && selectedCompanyId !== "master" ? selectedCompanyId : undefined);
    const tenantEmailDomain = subCompany?.slug || "emporio";
    const user = await prisma.user.findFirst({
      where: {
        ...(targetCompId ? { companyId: targetCompId } : {}),
        OR: [
          { email: username },
          { email: `${username}@${tenantEmailDomain}.com` },
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

    const { ipAddress, terminal } = await getDeviceLogInfo();
    await prisma.auditLog.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        operation: "auth.login",
        action: "LOGIN",
        entity: "User",
        entityId: user.id,
        ipAddress,
        terminal,
        reason: "Login autenticado no sistema",
        result: "SUCCESS",
      }
    }).catch(() => {});

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

    // Administradores e SuperAdmins possuem acesso multi-dispositivo garantido
    // para permitir gerência e mobilidade operacional (celular, tablet e computador)
    if (session.isSuperAdmin || session.role === "ADMIN") {
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

/**
 * Alterna a sessão do usuário administrador diretamente para o Painel Master SaaS (/master)
 */
export async function switchToMaster() {
  try {
    let sysUser = await prisma.systemUser.findFirst({
      where: { active: true },
    });

    if (!sysUser) {
      sysUser = await prisma.systemUser.create({
        data: {
          name: "Cristiano",
          email: "cristiano@cybertechapp.com.br",
          password: await bcrypt.hash("1234", 10),
          role: "SUPER_ADMIN",
          active: true,
        },
      });
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
  } catch (err: any) {
    return { error: `Erro ao alternar para o Painel Master: ${err.message}` };
  }
}

/**
 * Alterna do Painel Master para a visão de uma empresa cliente (ex: Empório)
 */
export async function switchToTenant(targetCompanyId?: string) {
  try {
    const session = await getSession();
    if (!session?.isSuperAdmin && session?.role !== "ADMIN" && !session?.name?.toLowerCase().includes("cristiano")) {
      return { error: "Apenas Super Admin ou Administradores Master podem alternar para empresas clientes." };
    }

    const company = targetCompanyId
      ? await prisma.company.findUnique({ where: { id: targetCompanyId } })
      : (await prisma.company.findFirst({
          where: {
            NOT: { name: { contains: "Demonstrativo", mode: "insensitive" } },
          },
        })) || (await prisma.company.findFirst());

    if (!company) {
      return { error: "Empresa cliente não encontrada." };
    }

    let adminUser =
      (await prisma.user.findFirst({
        where: { companyId: company.id, role: "ADMIN", active: true },
      })) ||
      (await prisma.user.findFirst({
        where: { companyId: company.id, active: true },
      }));

    if (!adminUser) {
      const defaultHash = await bcrypt.hash("1234", 10);
      adminUser = await prisma.user.create({
        data: {
          name: "Administrador " + company.name,
          email: `admin@${company.document ? company.document.replace(/\D/g, "") : "empresa"}.com`,
          password: defaultHash,
          pin: defaultHash,
          role: "ADMIN",
          companyId: company.id,
          active: true,
        },
      });
    }

    const sessionToken = crypto.randomUUID();
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { activeSessionToken: sessionToken, lastLogin: new Date() },
    });

    const { ipAddress, terminal } = await getDeviceLogInfo("Painel Master (Super Admin)");
    await prisma.auditLog.create({
      data: {
        companyId: company.id,
        userId: adminUser.id,
        operation: "auth.switch_tenant",
        action: "LOGIN",
        entity: "Company",
        entityId: company.id,
        ipAddress,
        terminal,
        reason: "Acesso administrativo via Painel Master",
        result: "SUCCESS",
      }
    }).catch(() => {});

    await createSession({
      userId: adminUser.id,
      name: adminUser.name,
      role: adminUser.role,
      companyId: company.id,
      companyName: company.name,
      isSuperAdmin: false,
      sessionToken,
    });

    return { success: true, redirectUrl: "/" };
  } catch (err: any) {
    return { error: `Erro ao entrar na empresa: ${err.message}` };
  }
}
