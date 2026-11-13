"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { toPlain } from "@/lib/serialize";
import {
  GatewayProvider,
  validateGatewayCredentials,
  createLivePixCharge,
  checkLivePixStatus,
  GatewayCredentials,
} from "@/lib/paymentGateways";

function maskSecret(val?: string | null): string {
  if (!val) return "";
  const clean = val.trim();
  if (clean.length <= 8) return "••••••••";
  return `${clean.slice(0, 4)}••••${clean.slice(-4)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. LISTAR GATEWAYS DA EMPRESA
// ─────────────────────────────────────────────────────────────────────────────

export async function getCompanyPaymentGateways() {
  try {
    const session = await getSession();
    if (!session?.companyId) return { error: "Não autorizado." };

    const configs = await prisma.paymentGatewayConfig.findMany({
      where: { companyId: session.companyId },
    });

    const masked = configs.map((c) => ({
      id: c.id,
      provider: c.provider as GatewayProvider,
      active: c.active,
      isSandbox: c.isSandbox,
      apiKeyMasked: maskSecret(c.apiKey),
      hasApiKey: Boolean(c.apiKey),
      publicKey: c.publicKey || "",
      clientSecretMasked: maskSecret(c.clientSecret),
      pixKey: c.pixKey || "",
      status: c.status,
      merchantName: c.merchantName || "",
      lastValidatedAt: c.lastValidatedAt?.toISOString() || null,
      lastValidationError: c.lastValidationError || null,
    }));

    return {
      success: true,
      configs: toPlain(masked),
      gateways: toPlain(masked),
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao carregar configurações de pagamento." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. TESTAR E SALVAR CREDENCIAIS NA API OFICIAL (ZERO FAKE)
// ─────────────────────────────────────────────────────────────────────────────

export async function saveAndValidatePaymentGateway(input: {
  provider: GatewayProvider;
  apiKey: string;
  publicKey?: string;
  clientSecret?: string;
  pixKey?: string;
  isSandbox?: boolean;
  active?: boolean;
  makeActive?: boolean;
}) {
  try {
    const session = await getSession();
    if (!session?.companyId) return { success: false, error: "Não autorizado." };
    const companyId = session.companyId;

    const apiKey = (input.apiKey || "").trim();
    const publicKey = (input.publicKey || "").trim();
    const clientSecret = (input.clientSecret || "").trim();
    const pixKey = (input.pixKey || "").trim();
    const isSandbox = Boolean(input.isSandbox);
    const shouldActivate = Boolean(input.active ?? input.makeActive);

    // Se a chave veio como "••••", preserva a que já está gravada
    const existing = await prisma.paymentGatewayConfig.findUnique({
      where: {
        companyId_provider: {
          companyId,
          provider: input.provider,
        },
      },
    });

    const effectiveApiKey =
      apiKey && !apiKey.includes("••••") ? apiKey : existing?.apiKey || "";
    const effectivePublicKey = publicKey || existing?.publicKey || "";
    const effectiveClientSecret =
      clientSecret && !clientSecret.includes("••••")
        ? clientSecret
        : existing?.clientSecret || "";

    const credsToTest: GatewayCredentials = {
      apiKey: effectiveApiKey,
      publicKey: effectivePublicKey,
      clientSecret: effectiveClientSecret,
      pixKey,
      isSandbox,
    };

    // ── VALIDAÇÃO REAL NA API DO PROVEDOR ──
    const validation = await validateGatewayCredentials(input.provider, credsToTest);

    const now = new Date();
    const status = validation.valid ? "CONNECTED" : "INVALID_KEY";
    const lastValidationError = validation.valid ? null : validation.error;
    const merchantName = validation.merchantName || null;

    // Se marcado como ativo e chave válida, desativa os outros para manter 1 principal
    if (input.makeActive && validation.valid) {
      await prisma.paymentGatewayConfig.updateMany({
        where: { companyId },
        data: { active: false },
      });
    }

    const saved = await prisma.paymentGatewayConfig.upsert({
      where: {
        companyId_provider: {
          companyId,
          provider: input.provider,
        },
      },
      update: {
        apiKey: effectiveApiKey || null,
        publicKey: effectivePublicKey || null,
        clientSecret: effectiveClientSecret || null,
        pixKey: pixKey || null,
        isSandbox,
        active: input.makeActive !== undefined ? input.makeActive : validation.valid,
        status,
        merchantName,
        accountInfo: validation.details ? JSON.stringify(validation.details) : null,
        lastValidatedAt: now,
        lastValidationError,
      },
      create: {
        companyId,
        provider: input.provider,
        apiKey: effectiveApiKey || null,
        publicKey: effectivePublicKey || null,
        clientSecret: effectiveClientSecret || null,
        pixKey: pixKey || null,
        isSandbox,
        active: input.makeActive !== undefined ? input.makeActive : validation.valid,
        status,
        merchantName,
        accountInfo: validation.details ? JSON.stringify(validation.details) : null,
        lastValidatedAt: now,
        lastValidationError,
      },
    });

    revalidatePath("/ecommerce");
    revalidatePath(`/loja/${companyId}`);

    return {
      success: true,
      valid: validation.valid,
      merchantName: validation.merchantName,
      message: validation.valid
        ? `Chave validada com sucesso na API oficial!${validation.merchantName ? ` Titular: ${validation.merchantName}` : ""}`
        : `Chave não validada: ${validation.error || "Erro desconhecido"}`,
      error: validation.error,
      gateway: {
        id: saved.id,
        provider: saved.provider,
        status: saved.status,
        active: saved.active,
        merchantName: saved.merchantName,
        lastValidatedAt: saved.lastValidatedAt?.toISOString(),
        lastValidationError: saved.lastValidationError,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao validar credenciais do gateway." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ATIVAR / DESATIVAR GATEWAY
// ─────────────────────────────────────────────────────────────────────────────

export async function togglePaymentGatewayActive(
  provider: GatewayProvider,
  active: boolean
) {
  try {
    const session = await getSession();
    if (!session?.companyId) return { success: false, error: "Não autorizado." };
    const companyId = session.companyId;

    if (active) {
      // Confere se está validado
      const target = await prisma.paymentGatewayConfig.findUnique({
        where: { companyId_provider: { companyId, provider } },
      });
      if (!target || target.status !== "CONNECTED") {
        return {
          success: false,
          error:
            "A chave deste gateway ainda não foi validada na API oficial. Valide a chave antes de ativá-lo.",
        };
      }

      // Desativa os outros para manter 1 gateway ativo
      await prisma.paymentGatewayConfig.updateMany({
        where: { companyId, provider: { not: provider } },
        data: { active: false },
      });
    }

    await prisma.paymentGatewayConfig.update({
      where: { companyId_provider: { companyId, provider } },
      data: { active },
    });

    revalidatePath("/ecommerce");
    revalidatePath(`/loja/${companyId}`);
    return { success: true, message: active ? "Gateway ativado com sucesso!" : "Gateway desativado com sucesso!" };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao alterar status do gateway." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. GERAR PIX DINÂMICO PARA O PEDIDO DO CLIENTE
// ─────────────────────────────────────────────────────────────────────────────

export async function generateOrderLivePix(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { company: true },
    });

    if (!order) return { error: "Pedido não encontrado." };

    // Se já foi gerado e ainda está na validade, reaproveita
    if (
      order.pixQrCodeText &&
      order.pixExpiresAt &&
      new Date(order.pixExpiresAt) > new Date()
    ) {
      return {
        success: true,
        isDynamic: true,
        qrCodeUrl: order.pixQrCodeUrl,
        qrCodeText: order.pixQrCodeText,
        expiresAt: order.pixExpiresAt.toISOString(),
        paymentStatus: order.paymentStatus || "PENDING",
      };
    }

    // Busca o gateway ativo da empresa
    const activeGateway = await prisma.paymentGatewayConfig.findFirst({
      where: {
        companyId: order.companyId,
        active: true,
        status: "CONNECTED",
      },
    });

    if (!activeGateway || !activeGateway.apiKey) {
      // Fallback: PIX Manual (Chave Pix cadastrada na empresa)
      return {
        success: true,
        isDynamic: false,
        chaveManual: order.company.whatsapp || order.company.phone || "empório@agrobelém",
        titular: order.company.name,
      };
    }

    const creds: GatewayCredentials = {
      apiKey: activeGateway.apiKey,
      publicKey: activeGateway.publicKey,
      clientSecret: activeGateway.clientSecret,
      pixKey: activeGateway.pixKey,
      isSandbox: activeGateway.isSandbox,
    };

    const pixRes = await createLivePixCharge(
      activeGateway.provider as GatewayProvider,
      creds,
      {
        orderId: order.id,
        orderNumber: order.orderNumber || order.id.slice(0, 6).toUpperCase(),
        amount: Number(order.total),
        customerName: order.customerName || "Cliente",
        customerPhone: order.customerPhone || undefined,
      }
    );

    if (!pixRes.success || !pixRes.qrCodeText) {
      return {
        error: pixRes.error || "Não foi possível gerar o QR Code Pix dinâmico.",
      };
    }

    const expiresDate = pixRes.expiresAt ? new Date(pixRes.expiresAt) : new Date(Date.now() + 1200000);

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentGateway: activeGateway.provider,
        paymentTransactionId: pixRes.transactionId || null,
        paymentStatus: "PENDING",
        pixQrCodeUrl: pixRes.qrCodeUrl || null,
        pixQrCodeText: pixRes.qrCodeText,
        pixExpiresAt: expiresDate,
      },
    });

    return {
      success: true,
      isDynamic: true,
      transactionId: pixRes.transactionId || null,
      qrCodeUrl: pixRes.qrCodeUrl,
      qrCodeText: pixRes.qrCodeText,
      expiresAt: expiresDate.toISOString(),
      provider: activeGateway.provider,
      merchantName: activeGateway.merchantName,
    };
  } catch (err: any) {
    return { error: err.message || "Erro ao processar cobrança Pix." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CONSULTA EM TEMPO REAL DO PAGAMENTO PIX
// ─────────────────────────────────────────────────────────────────────────────

export async function checkLiveOrderPixStatus(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) return { paid: false, status: "NOT_FOUND" };

    if (order.paymentStatus === "PAID" || order.status === "CONFIRMED") {
      return { paid: true, status: "PAID", paidAt: order.pixPaidAt?.toISOString() };
    }

    if (!order.paymentGateway || !order.paymentTransactionId) {
      return { paid: false, status: "PENDING" };
    }

    const gateway = await prisma.paymentGatewayConfig.findUnique({
      where: {
        companyId_provider: {
          companyId: order.companyId,
          provider: order.paymentGateway,
        },
      },
    });

    if (!gateway || !gateway.apiKey) {
      return { paid: false, status: "NO_GATEWAY" };
    }

    const creds: GatewayCredentials = {
      apiKey: gateway.apiKey,
      publicKey: gateway.publicKey,
      clientSecret: gateway.clientSecret,
      pixKey: gateway.pixKey,
      isSandbox: gateway.isSandbox,
    };

    const statusRes = await checkLivePixStatus(
      gateway.provider as GatewayProvider,
      creds,
      order.paymentTransactionId
    );

    if (statusRes.paid) {
      const now = new Date();
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "PAID",
          status: "CONFIRMED", // Muda o pedido para confirmado automaticamente!
          pixPaidAt: statusRes.paidAt ? new Date(statusRes.paidAt) : now,
        },
      });

      revalidatePath(`/loja/${order.companyId}`);
      revalidatePath("/ecommerce");
      return { paid: true, status: "PAID", paidAt: now.toISOString() };
    }

    return { paid: false, status: statusRes.status };
  } catch (err: any) {
    return { paid: false, status: "ERROR", error: err.message };
  }
}

