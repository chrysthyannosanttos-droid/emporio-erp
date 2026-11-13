"use server";

import { prisma } from "@emporio/database";
import { getSession, createSession, type SessionPayload } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { seedSupermarketRolesAndPermissions } from "./roles";

function toPlain<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_key, val) => {
      if (
        val !== null &&
        typeof val === "object" &&
        "toNumber" in val &&
        typeof (val as { toNumber: () => number }).toNumber === "function"
      ) {
        return (val as { toNumber: () => number }).toNumber();
      }
      if (typeof val === "bigint") return Number(val);
      return val;
    })
  );
}

function getErrMessage(err: unknown, fallback = "Erro inesperado."): string {
  return err instanceof Error ? err.message : fallback;
}

async function requireMasterSupportSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session) return null;
  if (!session.isSuperAdmin && session.role !== "ADMIN") return null;
  return session;
}

async function requireValidCompany(companyId: string) {
  if (!companyId || typeof companyId !== "string" || !companyId.trim()) {
    return null;
  }
  return prisma.company.findUnique({ where: { id: companyId.trim() } });
}

async function getRequestMeta() {
  let ipAddress = "127.0.0.1";
  const terminal = "Portal Master & Suporte Técnico";
  try {
    const hdrs = await headers();
    ipAddress =
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      hdrs.get("x-real-ip") ||
      "127.0.0.1";
  } catch {
    // ignore outside request headers
  }
  return { ipAddress, terminal };
}

/**
 * Resolve um User.id real pertencente ao tenant alvo para chaves estrangeiras (StockEntry, AuditLog).
 * SuperAdmins autenticados em SystemUser não possuem registro direto na tabela `users`.
 */
async function resolveTenantActorUserId(companyId: string, session: SessionPayload): Promise<string> {
  if (!session.isSuperAdmin && session.userId) {
    const direct = await prisma.user.findFirst({
      where: { id: session.userId, companyId },
      select: { id: true },
    });
    if (direct) return direct.id;
  }

  const existing =
    (await prisma.user.findFirst({
      where: { companyId, role: "ADMIN", active: true },
      select: { id: true },
    })) ||
    (await prisma.user.findFirst({
      where: { companyId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }));

  if (existing) return existing.id;

  const uniqueEmail = `suporte.${companyId.slice(0, 8)}.${Date.now().toString(36)}@cybertech.local`;
  const defaultHash = await bcrypt.hash("123456", 10);
  const created = await prisma.user.create({
    data: {
      companyId,
      name: `Suporte Master (${session.name || "Admin"})`,
      email: uniqueEmail,
      password: defaultHash,
      pin: defaultHash,
      role: "ADMIN",
      active: true,
    },
    select: { id: true },
  });

  return created.id;
}

function cleanBarcodeValue(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed || trimmed.toUpperCase() === "SEM GTIN" || /^0+$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function digitsOnly(raw?: string | null): string {
  return String(raw || "").replace(/\D/g, "");
}

function parseSafeNumber(val: unknown, fallback = 0): number {
  if (typeof val === "number") return Number.isFinite(val) ? val : fallback;
  if (typeof val === "string") {
    let s = val.replace(/R\$/gi, "").replace(/\s+/g, "").trim();
    if (!s) return fallback;
    if (s.includes(",") && s.includes(".")) {
      if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
        s = s.replace(/\./g, "").replace(",", ".");
      } else {
        s = s.replace(/,/g, "");
      }
    } else if (s.includes(",")) {
      s = s.replace(",", ".");
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function parseOptionalDate(raw?: string | null): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  // Suporte DD/MM/AAAA
  const brMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (brMatch) {
    const dt = new Date(Number(brMatch[3]), Number(brMatch[2]) - 1, Number(brMatch[1]));
    return isNaN(dt.getTime()) ? null : dt;
  }

  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. ACESSO AO TENANT PELO SUPORTE
// ─────────────────────────────────────────────────────────────────────────────

export async function switchSupportToTenant(companyId: string) {
  try {
    const session = await requireMasterSupportSession();
    if (!session) {
      return { error: "Apenas Super Admin ou Administradores podem acessar empresas clientes." };
    }

    if (!companyId || !companyId.trim()) {
      return { error: "Selecione uma empresa cliente válida para acessar." };
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId.trim() },
    });

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
      const uniqueEmail = `admin.${company.id.slice(0, 8)}@suporte.cybertech.local`;
      const existingEmail = await prisma.user.findUnique({ where: { email: uniqueEmail } });
      const finalEmail = existingEmail
        ? `admin.${company.id.slice(0, 8)}.${Date.now().toString(36)}@suporte.cybertech.local`
        : uniqueEmail;

      adminUser = await prisma.user.create({
        data: {
          name: `Suporte (${company.name})`,
          email: finalEmail,
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

    const { ipAddress, terminal } = await getRequestMeta();
    await prisma.auditLog
      .create({
        data: {
          companyId: company.id,
          userId: adminUser.id,
          operation: "auth.support_switch_tenant",
          action: "LOGIN",
          entity: "Company",
          entityId: company.id,
          ipAddress,
          terminal,
          reason: `Acesso administrativo de suporte (${session.name}) em ${company.name}`,
          result: "SUCCESS",
        },
      })
      .catch(() => {});

    await createSession({
      userId: adminUser.id,
      name: adminUser.name,
      role: adminUser.role,
      companyId: company.id,
      companyName: company.name,
      isSuperAdmin: false,
      sessionToken,
    });

    const hdrs = await headers();
    const host = hdrs.get("x-forwarded-host") || hdrs.get("host") || "";
    let redirectUrl = "/";
    if (host.includes("cybertechapp.com.br") && company.slug) {
      redirectUrl = `https://${company.slug}.cybertechapp.com.br/`;
    }

    return {
      success: true,
      redirectUrl,
      companyId: company.id,
      companyName: company.name,
    };
  } catch (err: unknown) {
    return { error: `Erro ao entrar no sistema do cliente: ${getErrMessage(err)}` };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. GESTÃO DE USUÁRIOS DA EMPRESA PELO SUPORTE
// ─────────────────────────────────────────────────────────────────────────────

export async function supportCreateTenantUser(
  companyId: string,
  input: {
    name: string;
    email: string;
    password: string;
    role: string;
    pin?: string;
    allowMobilePdv?: boolean;
  }
) {
  const session = await requireMasterSupportSession();
  if (!session) return { error: "Acesso negado." };

  const company = await requireValidCompany(companyId);
  if (!company) return { error: "Empresa cliente não encontrada." };

  const name = input.name?.trim();
  const email = input.email?.trim().toLowerCase();
  const password = input.password?.trim();
  const role = (input.role || "OPERATOR").trim().toUpperCase();
  const pin = input.pin?.trim();

  if (!name || !email || !password) {
    return { error: "Nome, e-mail e senha são obrigatórios." };
  }
  if (password.length < 4) {
    return { error: "A senha deve ter pelo menos 4 caracteres." };
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { error: "Este e-mail já está em uso por outro usuário." };
    }

    try {
      await seedSupermarketRolesAndPermissions(company.id);
    } catch {
      // non-fatal
    }

    const roleObj = await prisma.role.findFirst({
      where: {
        key: role,
        OR: [{ companyId: company.id }, { companyId: null }],
      },
    });

    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedPin = pin ? await bcrypt.hash(pin, 10) : null;

    const createdUser = await prisma.user.create({
      data: {
        companyId: company.id,
        name,
        email,
        password: hashedPassword,
        pin: hashedPin,
        role,
        roleId: roleObj?.id || null,
        active: true,
      },
    });

    if (input.allowMobilePdv !== undefined) {
      const mobilePerm = await prisma.permission.upsert({
        where: { code: "pdv.mobile" },
        update: {},
        create: {
          code: "pdv.mobile",
          name: "PDV Mobile (Celular/Tablet)",
          module: "Frente de Caixa (PDV)",
          description: "Permite usar o PDV Mobile pelo celular/tablet",
        },
      });

      const existingOverride = await prisma.userPermission.findFirst({
        where: { userId: createdUser.id, permissionId: mobilePerm.id, storeId: null },
      });

      if (existingOverride) {
        await prisma.userPermission.update({
          where: { id: existingOverride.id },
          data: { granted: Boolean(input.allowMobilePdv) },
        });
      } else {
        await prisma.userPermission.create({
          data: {
            userId: createdUser.id,
            permissionId: mobilePerm.id,
            storeId: null,
            granted: Boolean(input.allowMobilePdv),
          },
        });
      }
    }

    const { ipAddress, terminal } = await getRequestMeta();
    await prisma.auditLog
      .create({
        data: {
          companyId: company.id,
          userId: createdUser.id,
          operation: "support.create_user",
          action: "CREATE",
          entity: "User",
          entityId: createdUser.id,
          newValue: JSON.stringify({ name, email, role, allowMobilePdv: input.allowMobilePdv }),
          ipAddress,
          terminal,
          reason: `Usuário criado pelo suporte (${session.name})`,
          result: "SUCCESS",
        },
      })
      .catch(() => {});

    revalidatePath(`/master/companies/${company.id}`);
    return { success: true, user: toPlain({ id: createdUser.id, name: createdUser.name, email: createdUser.email, role: createdUser.role }) };
  } catch (err: unknown) {
    return { error: getErrMessage(err, "Erro ao criar usuário da empresa.") };
  }
}

export async function supportResetTenantUserPassword(
  companyId: string,
  userId: string,
  newPassword: string
) {
  const session = await requireMasterSupportSession();
  if (!session) return { error: "Acesso negado." };

  const company = await requireValidCompany(companyId);
  if (!company) return { error: "Empresa cliente não encontrada." };

  const cleanPass = newPassword?.trim();
  if (!cleanPass || cleanPass.length < 4) {
    return { error: "A nova senha deve ter pelo menos 4 caracteres." };
  }

  try {
    const user = await prisma.user.findFirst({
      where: { id: userId, companyId: company.id },
    });
    if (!user) return { error: "Usuário não encontrado nesta empresa." };

    const hashedPassword = await bcrypt.hash(cleanPass, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    const { ipAddress, terminal } = await getRequestMeta();
    await prisma.auditLog
      .create({
        data: {
          companyId: company.id,
          userId: user.id,
          operation: "support.reset_user_password",
          action: "UPDATE",
          entity: "User",
          entityId: user.id,
          ipAddress,
          terminal,
          reason: `Redefinição de senha pelo suporte (${session.name})`,
          result: "SUCCESS",
        },
      })
      .catch(() => {});

    revalidatePath(`/master/companies/${company.id}`);
    return { success: true };
  } catch (err: unknown) {
    return { error: getErrMessage(err, "Erro ao redefinir senha.") };
  }
}

export async function supportToggleTenantUser(
  companyId: string,
  userId: string,
  active: boolean
) {
  const session = await requireMasterSupportSession();
  if (!session) return { error: "Acesso negado." };

  const company = await requireValidCompany(companyId);
  if (!company) return { error: "Empresa cliente não encontrada." };

  try {
    const user = await prisma.user.findFirst({
      where: { id: userId, companyId: company.id },
    });
    if (!user) return { error: "Usuário não encontrado nesta empresa." };

    await prisma.user.update({
      where: { id: user.id },
      data: {
        active: Boolean(active),
        ...(active ? {} : { activeSessionToken: null }),
      },
    });

    const { ipAddress, terminal } = await getRequestMeta();
    await prisma.auditLog
      .create({
        data: {
          companyId: company.id,
          userId: user.id,
          operation: "support.toggle_user",
          action: "UPDATE",
          entity: "User",
          entityId: user.id,
          oldValue: JSON.stringify({ active: user.active }),
          newValue: JSON.stringify({ active: Boolean(active) }),
          ipAddress,
          terminal,
          reason: `Status do usuário alterado pelo suporte (${session.name})`,
          result: "SUCCESS",
        },
      })
      .catch(() => {});

    revalidatePath(`/master/companies/${company.id}`);
    return { success: true };
  } catch (err: unknown) {
    return { error: getErrMessage(err, "Erro ao alterar status do usuário.") };
  }
}

export async function supportToggleTenantUserMobilePdv(
  companyId: string,
  userId: string,
  allowMobilePdv: boolean
) {
  const session = await requireMasterSupportSession();
  if (!session) return { error: "Acesso negado." };

  const company = await requireValidCompany(companyId);
  if (!company) return { error: "Empresa cliente não encontrada." };

  try {
    const user = await prisma.user.findFirst({
      where: { id: userId, companyId: company.id },
    });
    if (!user) return { error: "Usuário não encontrado nesta empresa." };

    const mobilePerm = await prisma.permission.upsert({
      where: { code: "pdv.mobile" },
      update: {},
      create: {
        code: "pdv.mobile",
        name: "PDV Mobile (Celular/Tablet)",
        module: "Frente de Caixa (PDV)",
        description: "Permite usar o PDV Mobile pelo celular/tablet",
      },
    });

    const existingOverride = await prisma.userPermission.findFirst({
      where: { userId: user.id, permissionId: mobilePerm.id, storeId: null },
    });

    if (existingOverride) {
      await prisma.userPermission.update({
        where: { id: existingOverride.id },
        data: { granted: Boolean(allowMobilePdv) },
      });
    } else {
      await prisma.userPermission.create({
        data: {
          userId: user.id,
          permissionId: mobilePerm.id,
          storeId: null,
          granted: Boolean(allowMobilePdv),
        },
      });
    }

    revalidatePath(`/master/companies/${company.id}`);
    return { success: true };
  } catch (err: unknown) {
    return { error: getErrMessage(err, "Erro ao atualizar permissão de PDV Mobile.") };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CENTRAL DE IMPORTAÇÃO MULTI-TENANT POR EMPRESA
// ─────────────────────────────────────────────────────────────────────────────

export interface SupportImportProductInput {
  name: string;
  barcode?: string;
  price: number;
  cost?: number;
  stock?: number;
  unit?: string;
  unitPurchase?: string;
  unitSale?: string;
  unitConvFactor?: number;
  categoryName?: string;
  ncm?: string;
}

export async function supportImportProducts(
  companyId: string,
  items: SupportImportProductInput[]
): Promise<{
  success: boolean;
  created: number;
  updated: number;
  errors: string[];
  error?: string;
}> {
  const session = await requireMasterSupportSession();
  if (!session) {
    return { success: false, created: 0, updated: 0, errors: [], error: "Acesso negado." };
  }

  const company = await requireValidCompany(companyId);
  if (!company) {
    return { success: false, created: 0, updated: 0, errors: [], error: "Empresa cliente inválida ou não encontrada." };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { success: false, created: 0, updated: 0, errors: [], error: "Nenhum produto informado para importação." };
  }

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  try {
    const existingCategories = await prisma.category.findMany({ where: { companyId } });
    const categoryMap = new Map<string, string>();
    for (const c of existingCategories) {
      categoryMap.set(c.name.trim().toLowerCase(), c.id);
    }

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const lineNum = idx + 1;

      try {
        const cleanName = item.name?.trim();
        if (!cleanName) {
          errors.push(`Linha ${lineNum}: Nome do produto obrigatório.`);
          continue;
        }

        const price = parseSafeNumber(item.price, -1);
        if (price < 0) {
          errors.push(`Linha ${lineNum} (${cleanName}): Preço inválido.`);
          continue;
        }

        const cleanBarcode = cleanBarcodeValue(item.barcode);
        const cost =
          item.cost !== undefined && item.cost !== null && String(item.cost).trim() !== ""
            ? Math.max(0, parseSafeNumber(item.cost, 0))
            : undefined;
        const stock =
          item.stock !== undefined && item.stock !== null && String(item.stock).trim() !== ""
            ? Math.max(0, parseSafeNumber(item.stock, 0))
            : undefined;

        const unit = (item.unit || item.unitSale || "UN").trim().toUpperCase() || "UN";
        const unitSale = (item.unitSale || unit).trim().toUpperCase();
        const unitPurchase = (item.unitPurchase || unit).trim().toUpperCase();
        const unitConvFactor = Math.max(0.0001, parseSafeNumber(item.unitConvFactor, 1) || 1);

        let categoryId: string | null = null;
        if (item.categoryName?.trim()) {
          const catKey = item.categoryName.trim().toLowerCase();
          if (categoryMap.has(catKey)) {
            categoryId = categoryMap.get(catKey)!;
          } else {
            const newCat = await prisma.category.create({
              data: { name: item.categoryName.trim(), companyId },
            });
            categoryMap.set(catKey, newCat.id);
            categoryId = newCat.id;
          }
        }

        let existing = cleanBarcode
          ? await prisma.product.findFirst({ where: { companyId, barcode: cleanBarcode } })
          : null;

        if (!existing) {
          existing = await prisma.product.findFirst({
            where: { companyId, name: { equals: cleanName, mode: "insensitive" } },
          });
        }

        if (existing) {
          // Evitar conflito de barcode pertencente a outro produto do mesmo tenant
          let safeBarcode = existing.barcode;
          if (cleanBarcode && cleanBarcode !== existing.barcode) {
            const barcodeOwner = await prisma.product.findFirst({
              where: { companyId, barcode: cleanBarcode, NOT: { id: existing.id } },
              select: { id: true },
            });
            if (!barcodeOwner) {
              safeBarcode = cleanBarcode;
            }
          }

          await prisma.product.update({
            where: { id: existing.id },
            data: {
              name: cleanName,
              barcode: safeBarcode,
              price,
              ...(cost !== undefined ? { cost } : {}),
              ...(stock !== undefined ? { stock } : {}),
              unit,
              unitSale,
              unitPurchase,
              unitConvFactor,
              ncm: item.ncm?.trim() || existing.ncm,
              categoryId: categoryId || existing.categoryId,
            },
          });
          updated++;
        } else {
          await prisma.product.create({
            data: {
              companyId,
              name: cleanName,
              barcode: cleanBarcode,
              price,
              cost: cost ?? null,
              stock: stock ?? 0,
              unit,
              unitSale,
              unitPurchase,
              unitConvFactor,
              ncm: item.ncm?.trim() || null,
              categoryId,
              cfop: "5102",
              csosn: "102",
            },
          });
          created++;
        }
      } catch (rowErr: unknown) {
        errors.push(`Linha ${lineNum} (${item?.name || "sem nome"}): ${getErrMessage(rowErr)}`);
      }
    }

    const actorId = await resolveTenantActorUserId(companyId, session);
    const { ipAddress, terminal } = await getRequestMeta();
    await prisma.auditLog
      .create({
        data: {
          companyId,
          userId: actorId,
          operation: "support.import_products",
          action: "CREATE",
          entity: "Product",
          newValue: JSON.stringify({ created, updated, errorsCount: errors.length }),
          ipAddress,
          terminal,
          reason: `Importação de produtos via suporte (${session.name})`,
          result: "SUCCESS",
        },
      })
      .catch(() => {});

    revalidatePath(`/master/companies/${companyId}`);
    revalidatePath("/stock");
    revalidatePath("/pdv");

    return { success: true, created, updated, errors };
  } catch (err: unknown) {
    return {
      success: false,
      created,
      updated,
      errors,
      error: getErrMessage(err, "Erro ao importar produtos."),
    };
  }
}

export interface SupportImportStockBalanceInput {
  barcode?: string;
  name: string;
  countedStock: number;
  cost?: number;
  price?: number;
  expirationDate?: string;
}

export async function supportImportStockBalance(
  companyId: string,
  items: SupportImportStockBalanceInput[]
): Promise<{
  success: boolean;
  created: number;
  updated: number;
  stockEntryId?: string;
  totalAmount?: number;
  errors: string[];
  error?: string;
}> {
  const session = await requireMasterSupportSession();
  if (!session) {
    return { success: false, created: 0, updated: 0, errors: [], error: "Acesso negado." };
  }

  const company = await requireValidCompany(companyId);
  if (!company) {
    return { success: false, created: 0, updated: 0, errors: [], error: "Empresa cliente inválida ou não encontrada." };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { success: false, created: 0, updated: 0, errors: [], error: "Nenhum item informado para balanço." };
  }

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  try {
    const actorUserId = await resolveTenantActorUserId(companyId, session);
    const now = new Date();
    const dateStamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const batchLabel = `BALANCO-${dateStamp}`;

    const entryItemsData: Array<{
      productId: string;
      quantity: number;
      unitCost: number;
      expirationDate: Date | null;
      batchNumber: string | null;
    }> = [];
    let totalAmount = 0;

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const lineNum = idx + 1;

      try {
        const cleanName = item.name?.trim();
        const cleanBarcode = cleanBarcodeValue(item.barcode);
        const countedStock = Math.max(0, Math.round(parseSafeNumber(item.countedStock, -1) * 1000) / 1000);

        if (!cleanName && !cleanBarcode) {
          errors.push(`Linha ${lineNum}: Informe o Nome ou Código de Barras do produto.`);
          continue;
        }
        if (countedStock < 0 || !Number.isFinite(countedStock)) {
          errors.push(`Linha ${lineNum} (${cleanName || cleanBarcode}): Estoque contado inválido.`);
          continue;
        }

        const parsedCost =
          item.cost !== undefined && item.cost !== null && String(item.cost).trim() !== ""
            ? Math.max(0, parseSafeNumber(item.cost, 0))
            : undefined;
        const parsedPrice =
          item.price !== undefined && item.price !== null && String(item.price).trim() !== ""
            ? Math.max(0, parseSafeNumber(item.price, 0))
            : undefined;
        const expDate = parseOptionalDate(item.expirationDate);

        let product = cleanBarcode
          ? await prisma.product.findFirst({ where: { companyId, barcode: cleanBarcode } })
          : null;

        if (!product && cleanName) {
          product = await prisma.product.findFirst({
            where: { companyId, name: { equals: cleanName, mode: "insensitive" } },
          });
        }

        if (product) {
          const updatedProduct = await prisma.product.update({
            where: { id: product.id },
            data: {
              stock: countedStock,
              ...(parsedCost !== undefined ? { cost: parsedCost } : {}),
              ...(parsedPrice !== undefined && parsedPrice > 0 ? { price: parsedPrice } : {}),
            },
          });
          product = updatedProduct;
          updated++;
        } else {
          const fallbackName = cleanName || `PRODUTO ${cleanBarcode}`;
          const initialCost = parsedCost ?? 0;
          const initialPrice =
            parsedPrice !== undefined && parsedPrice > 0
              ? parsedPrice
              : initialCost > 0
                ? Number((initialCost * 1.35).toFixed(2))
                : 0;

          product = await prisma.product.create({
            data: {
              companyId,
              name: fallbackName,
              barcode: cleanBarcode,
              price: initialPrice,
              cost: parsedCost ?? null,
              stock: countedStock,
              unit: "UN",
              cfop: "5102",
              csosn: "102",
            },
          });
          created++;
        }

        if (expDate && countedStock > 0) {
          await prisma.productBatch.create({
            data: {
              productId: product.id,
              batchNumber: batchLabel,
              expirationDate: expDate,
              initialStock: countedStock,
              currentStock: countedStock,
            },
          });
        }

        const effectiveUnitCost =
          parsedCost ??
          (product.cost !== null ? Number(product.cost) : Number(product.price || 0) * 0.6);

        totalAmount += countedStock * effectiveUnitCost;
        entryItemsData.push({
          productId: product.id,
          quantity: countedStock,
          unitCost: effectiveUnitCost,
          expirationDate: expDate,
          batchNumber: expDate ? batchLabel : null,
        });
      } catch (rowErr: unknown) {
        errors.push(`Linha ${lineNum} (${item?.name || item?.barcode || "?"}): ${getErrMessage(rowErr)}`);
      }
    }

    let stockEntryId: string | undefined;
    if (entryItemsData.length > 0) {
      const entry = await prisma.stockEntry.create({
        data: {
          companyId,
          userId: actorUserId,
          invoiceNum: `${batchLabel}-${Date.now().toString().slice(-4)}`,
          totalAmount: Math.round(totalAmount * 100) / 100,
          entryDate: now,
          items: {
            create: entryItemsData,
          },
        },
      });
      stockEntryId = entry.id;

      const { ipAddress, terminal } = await getRequestMeta();
      await prisma.auditLog
        .create({
          data: {
            companyId,
            userId: actorUserId,
            operation: "support.stock_balance",
            action: "CREATE",
            entity: "StockEntry",
            entityId: entry.id,
            newValue: JSON.stringify({
              created,
              updated,
              itemsCount: entryItemsData.length,
              totalAmount: Math.round(totalAmount * 100) / 100,
            }),
            ipAddress,
            terminal,
            reason: `Balanço / inventário importado pelo suporte (${session.name})`,
            result: "SUCCESS",
          },
        })
        .catch(() => {});
    }

    revalidatePath(`/master/companies/${companyId}`);
    revalidatePath("/stock");
    revalidatePath("/stock/inventory");

    return {
      success: true,
      created,
      updated,
      stockEntryId,
      totalAmount: Math.round(totalAmount * 100) / 100,
      errors,
    };
  } catch (err: unknown) {
    return {
      success: false,
      created,
      updated,
      errors,
      error: getErrMessage(err, "Erro ao importar balanço de estoque."),
    };
  }
}

export interface SupportImportCustomerInput {
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  address?: string;
  creditLimit?: number;
}

export async function supportImportCustomers(
  companyId: string,
  items: SupportImportCustomerInput[]
): Promise<{
  success: boolean;
  created: number;
  updated: number;
  errors: string[];
  error?: string;
}> {
  const session = await requireMasterSupportSession();
  if (!session) {
    return { success: false, created: 0, updated: 0, errors: [], error: "Acesso negado." };
  }

  const company = await requireValidCompany(companyId);
  if (!company) {
    return { success: false, created: 0, updated: 0, errors: [], error: "Empresa cliente inválida ou não encontrada." };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { success: false, created: 0, updated: 0, errors: [], error: "Nenhum cliente informado para importação." };
  }

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  try {
    const existingList = await prisma.customer.findMany({
      where: { companyId },
      select: { id: true, name: true, document: true, phone: true, email: true, address: true },
    });

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const lineNum = idx + 1;

      try {
        const cleanName = item.name?.trim();
        if (!cleanName) {
          errors.push(`Linha ${lineNum}: Nome do cliente obrigatório.`);
          continue;
        }

        const docDigits = digitsOnly(item.document);
        const cleanDoc = docDigits || item.document?.trim() || null;
        const cleanPhone = item.phone?.trim() || null;
        const cleanEmail = item.email?.trim().toLowerCase() || null;
        const cleanAddress = item.address?.trim() || null;
        const creditLimit =
          item.creditLimit !== undefined && item.creditLimit !== null && String(item.creditLimit).trim() !== ""
            ? Math.max(0, parseSafeNumber(item.creditLimit, 0))
            : undefined;

        const existing = existingList.find((c) => {
          if (docDigits && digitsOnly(c.document) === docDigits) return true;
          if (cleanPhone && c.phone && digitsOnly(c.phone) === digitsOnly(cleanPhone) && digitsOnly(cleanPhone).length >= 8) {
            return true;
          }
          return c.name.trim().toLowerCase() === cleanName.toLowerCase();
        });

        if (existing) {
          await prisma.customer.update({
            where: { id: existing.id },
            data: {
              name: cleanName,
              ...(cleanDoc ? { document: cleanDoc } : {}),
              ...(cleanPhone ? { phone: cleanPhone } : {}),
              ...(cleanEmail ? { email: cleanEmail } : {}),
              ...(cleanAddress ? { address: cleanAddress } : {}),
              ...(creditLimit !== undefined ? { creditLimit } : {}),
              ...(docDigits.length === 14 ? { personType: "PJ" } : docDigits.length === 11 ? { personType: "PF" } : {}),
            },
          });
          updated++;
        } else {
          const createdRec = await prisma.customer.create({
            data: {
              companyId,
              name: cleanName,
              document: cleanDoc,
              phone: cleanPhone,
              email: cleanEmail,
              address: cleanAddress,
              creditLimit: creditLimit ?? 0,
              personType: docDigits.length === 14 ? "PJ" : "PF",
            },
            select: { id: true, name: true, document: true, phone: true, email: true, address: true },
          });
          existingList.push(createdRec);
          created++;
        }
      } catch (rowErr: unknown) {
        errors.push(`Linha ${lineNum} (${item?.name || "?"}): ${getErrMessage(rowErr)}`);
      }
    }

    revalidatePath(`/master/companies/${companyId}`);
    revalidatePath("/customers");
    return { success: true, created, updated, errors };
  } catch (err: unknown) {
    return {
      success: false,
      created,
      updated,
      errors,
      error: getErrMessage(err, "Erro ao importar clientes."),
    };
  }
}

export interface SupportImportSupplierInput {
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  category?: string;
  isLegacySaipos?: boolean;
}

export async function supportImportSuppliers(
  companyId: string,
  items: SupportImportSupplierInput[],
  markAllLegacySaipos: boolean
): Promise<{
  success: boolean;
  created: number;
  updated: number;
  errors: string[];
  error?: string;
}> {
  const session = await requireMasterSupportSession();
  if (!session) {
    return { success: false, created: 0, updated: 0, errors: [], error: "Acesso negado." };
  }

  const company = await requireValidCompany(companyId);
  if (!company) {
    return { success: false, created: 0, updated: 0, errors: [], error: "Empresa cliente inválida ou não encontrada." };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { success: false, created: 0, updated: 0, errors: [], error: "Nenhum fornecedor informado." };
  }

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  try {
    const existingList = await prisma.supplier.findMany({
      where: { companyId },
      select: { id: true, name: true, document: true },
    });

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const lineNum = idx + 1;

      try {
        const cleanName = item.name?.trim();
        if (!cleanName) {
          errors.push(`Linha ${lineNum}: Nome do fornecedor obrigatório.`);
          continue;
        }

        const docDigits = digitsOnly(item.document);
        const cleanDoc = docDigits || item.document?.trim() || null;
        const cleanPhone = item.phone?.trim() || null;
        const cleanEmail = item.email?.trim().toLowerCase() || null;
        const cleanCategory = item.category?.trim() || "Outros";
        const isSaipos = Boolean(markAllLegacySaipos || item.isLegacySaipos);

        const existing = existingList.find((s) => {
          if (docDigits && digitsOnly(s.document) === docDigits) return true;
          return s.name.trim().toLowerCase() === cleanName.toLowerCase();
        });

        if (existing) {
          await prisma.supplier.update({
            where: { id: existing.id },
            data: {
              name: cleanName,
              ...(cleanDoc ? { document: cleanDoc } : {}),
              ...(cleanPhone ? { phone: cleanPhone } : {}),
              ...(cleanEmail ? { email: cleanEmail } : {}),
              ...(item.category?.trim() ? { category: cleanCategory } : {}),
              ...(isSaipos ? { isLegacySaipos: true, legacySystem: "SAIPOS" } : {}),
            },
          });
          updated++;
        } else {
          const createdSup = await prisma.supplier.create({
            data: {
              companyId,
              name: cleanName,
              document: cleanDoc,
              phone: cleanPhone,
              email: cleanEmail,
              category: cleanCategory,
              isLegacySaipos: isSaipos,
              legacySystem: isSaipos ? "SAIPOS" : null,
              status: "ACTIVE",
            },
            select: { id: true, name: true, document: true },
          });
          existingList.push(createdSup);
          created++;
        }
      } catch (rowErr: unknown) {
        errors.push(`Linha ${lineNum} (${item?.name || "?"}): ${getErrMessage(rowErr)}`);
      }
    }

    revalidatePath(`/master/companies/${companyId}`);
    revalidatePath("/suppliers");
    return { success: true, created, updated, errors };
  } catch (err: unknown) {
    return {
      success: false,
      created,
      updated,
      errors,
      error: getErrMessage(err, "Erro ao importar fornecedores."),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. IMPORTAÇÃO DE XMLs NF-e EM LOTE
// ─────────────────────────────────────────────────────────────────────────────

function decodeXmlEntities(str: string): string {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .trim();
}

function extractFirstBlock(xml: string, tagName: string): string | null {
  const re = new RegExp(`<(?:[a-zA-Z0-9_-]+:)?${tagName}\\b[^>]*>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_-]+:)?${tagName}>`, "i");
  const match = re.exec(xml);
  return match ? match[1] : null;
}

function extractAllBlocks(xml: string, tagName: string): string[] {
  const re = new RegExp(`<(?:[a-zA-Z0-9_-]+:)?${tagName}\\b[^>]*>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_-]+:)?${tagName}>`, "gi");
  const blocks: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
}

function extractTagValue(xml: string | null | undefined, tagName: string): string {
  if (!xml) return "";
  const re = new RegExp(`<(?:[a-zA-Z0-9_-]+:)?${tagName}\\b[^>]*>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_-]+:)?${tagName}>`, "i");
  const match = re.exec(xml);
  return match ? decodeXmlEntities(match[1]) : "";
}

export async function supportImportXmlBatch(
  companyId: string,
  files: Array<{ name: string; content: string }>,
  options: {
    markSuppliersSaipos: boolean;
    createProductsAndStock: boolean;
  }
): Promise<{
  success: boolean;
  processedFiles: number;
  suppliersCreated: number;
  suppliersUpdated: number;
  productsCreated: number;
  productsUpdated: number;
  stockEntriesCreated: number;
  warnings: string[];
  errors: string[];
  error?: string;
}> {
  const session = await requireMasterSupportSession();
  if (!session) {
    return {
      success: false,
      processedFiles: 0,
      suppliersCreated: 0,
      suppliersUpdated: 0,
      productsCreated: 0,
      productsUpdated: 0,
      stockEntriesCreated: 0,
      warnings: [],
      errors: [],
      error: "Acesso negado.",
    };
  }

  const company = await requireValidCompany(companyId);
  if (!company) {
    return {
      success: false,
      processedFiles: 0,
      suppliersCreated: 0,
      suppliersUpdated: 0,
      productsCreated: 0,
      productsUpdated: 0,
      stockEntriesCreated: 0,
      warnings: [],
      errors: [],
      error: "Empresa cliente inválida ou não encontrada.",
    };
  }

  if (!Array.isArray(files) || files.length === 0) {
    return {
      success: false,
      processedFiles: 0,
      suppliersCreated: 0,
      suppliersUpdated: 0,
      productsCreated: 0,
      productsUpdated: 0,
      stockEntriesCreated: 0,
      warnings: [],
      errors: [],
      error: "Nenhum arquivo XML enviado.",
    };
  }

  let processedFiles = 0;
  let suppliersCreated = 0;
  let suppliersUpdated = 0;
  let productsCreated = 0;
  let productsUpdated = 0;
  let stockEntriesCreated = 0;
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const actorUserId = await resolveTenantActorUserId(companyId, session);
    const existingSuppliers = await prisma.supplier.findMany({
      where: { companyId },
      select: { id: true, name: true, document: true },
    });

    for (const file of files) {
      const fileName = file?.name || "arquivo.xml";
      const xml = file?.content || "";

      try {
        if (!xml || xml.length > 5_000_000) {
          errors.push(`${fileName}: XML vazio ou excede o tamanho máximo suportado (5MB).`);
          continue;
        }

        const infNFe = extractFirstBlock(xml, "infNFe") || xml;
        const emitBlock = extractFirstBlock(infNFe, "emit");
        if (!emitBlock) {
          errors.push(`${fileName}: Bloco <emit> (fornecedor emitente) não encontrado no XML.`);
          continue;
        }

        const ideBlock = extractFirstBlock(infNFe, "ide");
        const totalBlock = extractFirstBlock(infNFe, "ICMSTot") || extractFirstBlock(infNFe, "total");

        const emitCnpj = digitsOnly(extractTagValue(emitBlock, "CNPJ") || extractTagValue(emitBlock, "CPF"));
        const emitName = extractTagValue(emitBlock, "xNome") || extractTagValue(emitBlock, "xFant");
        const emitTradeName = extractTagValue(emitBlock, "xFant") || null;
        const emitIe = extractTagValue(emitBlock, "IE") || null;
        const enderEmit = extractFirstBlock(emitBlock, "enderEmit");
        const emitPhone = extractTagValue(enderEmit, "fone") || null;
        const emitStreet = extractTagValue(enderEmit, "xLgr") || null;
        const emitNumber = extractTagValue(enderEmit, "nro") || null;
        const emitNeighborhood = extractTagValue(enderEmit, "xBairro") || null;
        const emitCity = extractTagValue(enderEmit, "xMun") || null;
        const emitState = extractTagValue(enderEmit, "UF") || null;
        const emitZip = extractTagValue(enderEmit, "CEP") || null;

        if (!emitName && !emitCnpj) {
          errors.push(`${fileName}: Emitente sem Nome ou CNPJ válido.`);
          continue;
        }

        const supplierName = emitName || `Fornecedor ${emitCnpj}`;
        const supplierRecord = existingSuppliers.find((s) => {
          if (emitCnpj && digitsOnly(s.document) === emitCnpj) return true;
          return s.name.trim().toLowerCase() === supplierName.toLowerCase();
        });

        let supplierId: string;
        if (supplierRecord) {
          await prisma.supplier.update({
            where: { id: supplierRecord.id },
            data: {
              name: supplierName,
              ...(emitTradeName ? { tradeName: emitTradeName } : {}),
              ...(emitCnpj ? { document: emitCnpj } : {}),
              ...(emitIe ? { stateReg: emitIe } : {}),
              ...(emitPhone ? { phone: emitPhone } : {}),
              ...(emitStreet ? { street: emitStreet } : {}),
              ...(emitNumber ? { number: emitNumber } : {}),
              ...(emitNeighborhood ? { neighborhood: emitNeighborhood } : {}),
              ...(emitCity ? { city: emitCity } : {}),
              ...(emitState ? { state: emitState } : {}),
              ...(emitZip ? { zipCode: emitZip } : {}),
              ...(options.markSuppliersSaipos ? { isLegacySaipos: true, legacySystem: "SAIPOS" } : {}),
            },
          });
          supplierId = supplierRecord.id;
          suppliersUpdated++;
        } else {
          const createdSup = await prisma.supplier.create({
            data: {
              companyId,
              name: supplierName,
              tradeName: emitTradeName,
              document: emitCnpj || null,
              stateReg: emitIe,
              phone: emitPhone,
              street: emitStreet,
              number: emitNumber,
              neighborhood: emitNeighborhood,
              city: emitCity,
              state: emitState,
              zipCode: emitZip,
              isLegacySaipos: Boolean(options.markSuppliersSaipos),
              legacySystem: options.markSuppliersSaipos ? "SAIPOS" : null,
              status: "ACTIVE",
            },
            select: { id: true, name: true, document: true },
          });
          existingSuppliers.push(createdSup);
          supplierId = createdSup.id;
          suppliersCreated++;
        }

        processedFiles++;

        if (options.createProductsAndStock) {
          const invoiceNum = extractTagValue(ideBlock, "nNF") || fileName.replace(/\.xml$/i, "");
          const issueDateStr = extractTagValue(ideBlock, "dhEmi") || extractTagValue(ideBlock, "dEmi");
          const entryDate = parseOptionalDate(issueDateStr) || new Date();
          const totalNf = parseSafeNumber(extractTagValue(totalBlock, "vNF"), 0);

          // Prevenir duplicidade de entrada de estoque da mesma NF + fornecedor
          const existingEntry = invoiceNum
            ? await prisma.stockEntry.findFirst({
                where: { companyId, supplierId, invoiceNum },
                select: { id: true },
              })
            : null;

          if (existingEntry) {
            warnings.push(
              `${fileName}: NF ${invoiceNum} deste fornecedor já possuía entrada de estoque (fornecedor atualizado; estoque mantido).`
            );
            continue;
          }

          const detBlocks = extractAllBlocks(infNFe, "det");
          const entryItems: Array<{
            productId: string;
            quantity: number;
            unitCost: number;
            expirationDate: Date | null;
            batchNumber: string | null;
          }> = [];
          let computedTotal = 0;

          for (const det of detBlocks) {
            const prodBlock = extractFirstBlock(det, "prod");
            if (!prodBlock) continue;

            const prodName = extractTagValue(prodBlock, "xProd");
            if (!prodName) continue;

            const barcode = cleanBarcodeValue(
              extractTagValue(prodBlock, "cEAN") || extractTagValue(prodBlock, "cEANTrib")
            );
            const ncm = extractTagValue(prodBlock, "NCM") || null;
            const unit = (extractTagValue(prodBlock, "uCom") || extractTagValue(prodBlock, "uTrib") || "UN").toUpperCase();
            const qty = Math.max(0, parseSafeNumber(extractTagValue(prodBlock, "qCom") || extractTagValue(prodBlock, "qTrib"), 1));
            const unitCost = Math.max(
              0,
              parseSafeNumber(extractTagValue(prodBlock, "vUnCom") || extractTagValue(prodBlock, "vUnTrib"), 0)
            );
            const vProd = parseSafeNumber(extractTagValue(prodBlock, "vProd"), qty * unitCost);

            const rastroBlock = extractFirstBlock(prodBlock, "rastro") || extractFirstBlock(det, "rastro");
            const batchNumber = extractTagValue(rastroBlock, "nLote") || null;
            const expDate = parseOptionalDate(extractTagValue(rastroBlock, "dVal"));

            let product = barcode
              ? await prisma.product.findFirst({ where: { companyId, barcode } })
              : null;

            if (!product) {
              product = await prisma.product.findFirst({
                where: { companyId, name: { equals: prodName, mode: "insensitive" } },
              });
            }

            if (product) {
              await prisma.product.update({
                where: { id: product.id },
                data: {
                  stock: Number(product.stock || 0) + qty,
                  ...(unitCost > 0 ? { cost: unitCost } : {}),
                  ...(!product.ncm && ncm ? { ncm } : {}),
                },
              });
              productsUpdated++;
            } else {
              const suggestedPrice = unitCost > 0 ? Number((unitCost * 1.35).toFixed(2)) : 0;
              product = await prisma.product.create({
                data: {
                  companyId,
                  name: prodName,
                  barcode,
                  price: suggestedPrice,
                  cost: unitCost,
                  stock: qty,
                  unit,
                  unitSale: unit,
                  unitPurchase: unit,
                  ncm,
                  cfop: "5102",
                  csosn: "102",
                },
              });
              productsCreated++;
            }

            if (expDate && qty > 0) {
              await prisma.productBatch.create({
                data: {
                  productId: product.id,
                  batchNumber: batchNumber || `NF-${invoiceNum}`,
                  expirationDate: expDate,
                  initialStock: qty,
                  currentStock: qty,
                },
              });
            }

            computedTotal += vProd > 0 ? vProd : qty * unitCost;
            entryItems.push({
              productId: product.id,
              quantity: qty,
              unitCost,
              expirationDate: expDate,
              batchNumber,
            });
          }

          if (entryItems.length > 0) {
            await prisma.stockEntry.create({
              data: {
                companyId,
                userId: actorUserId,
                supplierId,
                invoiceNum,
                totalAmount: Math.round((totalNf > 0 ? totalNf : computedTotal) * 100) / 100,
                entryDate,
                items: { create: entryItems },
              },
            });
            stockEntriesCreated++;
          }
        }
      } catch (fileErr: unknown) {
        errors.push(`${fileName}: ${getErrMessage(fileErr)}`);
      }
    }

    const { ipAddress, terminal } = await getRequestMeta();
    await prisma.auditLog
      .create({
        data: {
          companyId,
          userId: actorUserId,
          operation: "support.import_xml_batch",
          action: "CREATE",
          entity: "Supplier",
          newValue: JSON.stringify({
            processedFiles,
            suppliersCreated,
            suppliersUpdated,
            productsCreated,
            productsUpdated,
            stockEntriesCreated,
            markSuppliersSaipos: options.markSuppliersSaipos,
          }),
          ipAddress,
          terminal,
          reason: `Importação em lote de XMLs pelo suporte (${session.name})`,
          result: "SUCCESS",
        },
      })
      .catch(() => {});

    revalidatePath(`/master/companies/${companyId}`);
    revalidatePath("/suppliers");
    revalidatePath("/stock");
    revalidatePath("/invoices");

    return {
      success: true,
      processedFiles,
      suppliersCreated,
      suppliersUpdated,
      productsCreated,
      productsUpdated,
      stockEntriesCreated,
      warnings,
      errors,
    };
  } catch (err: unknown) {
    return {
      success: false,
      processedFiles,
      suppliersCreated,
      suppliersUpdated,
      productsCreated,
      productsUpdated,
      stockEntriesCreated,
      warnings,
      errors,
      error: getErrMessage(err, "Erro ao processar lote de XMLs."),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. GESTÃO DA EQUIPE DE SUPORTE / SUPER USUÁRIOS (SystemUser)
// ─────────────────────────────────────────────────────────────────────────────

export async function createSystemSupportUser(input: {
  name: string;
  email: string;
  password: string;
  role: string;
}) {
  const session = await requireMasterSupportSession();
  if (!session) return { error: "Acesso negado." };

  const name = input.name?.trim();
  const email = input.email?.trim().toLowerCase();
  const password = input.password?.trim();
  const allowedRoles = new Set(["SUPER_ADMIN", "SUPPORT", "ADMIN"]);
  const role = allowedRoles.has((input.role || "").toUpperCase())
    ? input.role.toUpperCase()
    : "SUPPORT";

  if (!name || !email || !password) {
    return { error: "Nome, e-mail e senha são obrigatórios." };
  }
  if (password.length < 4) {
    return { error: "A senha deve ter no mínimo 4 caracteres." };
  }

  try {
    const existing = await prisma.systemUser.findUnique({ where: { email } });
    if (existing) {
      return { error: "Já existe um usuário Master/Suporte com este e-mail." };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.systemUser.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    revalidatePath("/master/users");
    return { success: true, user: toPlain(user) };
  } catch (err: unknown) {
    return { error: getErrMessage(err, "Erro ao cadastrar usuário de suporte.") };
  }
}

export async function toggleSystemSupportUser(systemUserId: string, active: boolean) {
  const session = await requireMasterSupportSession();
  if (!session) return { error: "Acesso negado." };

  if (!systemUserId) return { error: "Usuário inválido." };

  if (session.userId === systemUserId && !active) {
    return { error: "Você não pode bloquear a sua própria conta conectada." };
  }

  try {
    const target = await prisma.systemUser.findUnique({ where: { id: systemUserId } });
    if (!target) return { error: "Usuário da equipe não encontrado." };

    if (!active) {
      const activeCount = await prisma.systemUser.count({ where: { active: true } });
      if (activeCount <= 1 && target.active) {
        return { error: "Não é possível bloquear o único usuário Master ativo do sistema." };
      }
    }

    const updated = await prisma.systemUser.update({
      where: { id: systemUserId },
      data: {
        active: Boolean(active),
        ...(active ? {} : { activeSessionToken: null }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    revalidatePath("/master/users");
    return { success: true, user: toPlain(updated) };
  } catch (err: unknown) {
    return { error: getErrMessage(err, "Erro ao alterar status do usuário.") };
  }
}

export async function resetSystemSupportPassword(systemUserId: string, newPassword: string) {
  const session = await requireMasterSupportSession();
  if (!session) return { error: "Acesso negado." };

  const cleanPass = newPassword?.trim();
  if (!systemUserId || !cleanPass || cleanPass.length < 4) {
    return { error: "A nova senha deve ter pelo menos 4 caracteres." };
  }

  try {
    const target = await prisma.systemUser.findUnique({ where: { id: systemUserId } });
    if (!target) return { error: "Usuário da equipe não encontrado." };

    const hashedPassword = await bcrypt.hash(cleanPass, 10);
    await prisma.systemUser.update({
      where: { id: systemUserId },
      data: { password: hashedPassword },
    });

    revalidatePath("/master/users");
    return { success: true };
  } catch (err: unknown) {
    return { error: getErrMessage(err, "Erro ao redefinir senha.") };
  }
}
