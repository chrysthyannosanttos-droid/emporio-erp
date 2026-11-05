"use server";

import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import nodemailer from "nodemailer";
import type { Transporter, SendMailOptions } from "nodemailer";

export interface SmtpEmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  senderName: string;
  senderEmail: string;
  useBuyerReplyTo: boolean;
  active: boolean;
}

const DEFAULT_CONFIG: SmtpEmailConfig = {
  smtpHost: "smtp.gmail.com",
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: "",
  smtpPass: "",
  senderName: "Empório Agrobelém - Compras",
  senderEmail: "",
  useBuyerReplyTo: true,
  active: false,
};

/**
 * Obtém a configuração de e-mail/SMTP da empresa do usuário logado
 */
export async function getEmailConfig(): Promise<{
  success: boolean;
  config: SmtpEmailConfig;
  userEmail?: string;
  userName?: string;
  error?: string;
}> {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { success: false, config: DEFAULT_CONFIG, error: "Não autorizado" };
    }

    // Buscar e-mail do usuário logado
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true, name: true },
    });

    const mod = await prisma.companyModule.findUnique({
      where: {
        companyId_moduleKey: {
          companyId: session.companyId,
          moduleKey: "SMTP_EMAIL_CONFIG",
        },
      },
    });

    let config: SmtpEmailConfig = { ...DEFAULT_CONFIG };
    if (mod?.config) {
      try {
        const parsed = JSON.parse(mod.config);
        config = {
          ...DEFAULT_CONFIG,
          ...parsed,
          // Não envia a senha em texto aberto se já estiver gravada
          smtpPass: parsed.smtpPass ? "••••••••" : "",
        };
      } catch {}
    }

    return {
      success: true,
      config,
      userEmail: user?.email || "",
      userName: user?.name || session.name || "",
    };
  } catch (err: any) {
    return { success: false, config: DEFAULT_CONFIG, error: err.message };
  }
}

/**
 * Salva a configuração de e-mail/SMTP da empresa
 */
export async function saveEmailConfig(data: {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass?: string;
  senderName: string;
  senderEmail: string;
  useBuyerReplyTo: boolean;
  active: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { success: false, error: "Sessão expirada ou não autorizada" };
    }

    // Buscar config existente para não sobrescrever senha com "••••••••"
    const existing = await prisma.companyModule.findUnique({
      where: {
        companyId_moduleKey: {
          companyId: session.companyId,
          moduleKey: "SMTP_EMAIL_CONFIG",
        },
      },
    });

    let currentPass = "";
    if (existing?.config) {
      try {
        const parsed = JSON.parse(existing.config);
        currentPass = parsed.smtpPass || "";
      } catch {}
    }

    // Se o usuário não alterou a senha (manteve os pontinhos), mantém a senha antiga
    const finalPass =
      data.smtpPass && data.smtpPass !== "••••••••" ? data.smtpPass : currentPass;

    const payload: SmtpEmailConfig = {
      smtpHost: data.smtpHost.trim(),
      smtpPort: Number(data.smtpPort) || 587,
      smtpSecure: Boolean(data.smtpSecure),
      smtpUser: data.smtpUser.trim(),
      smtpPass: finalPass,
      senderName: data.senderName.trim(),
      senderEmail: data.senderEmail.trim(),
      useBuyerReplyTo: Boolean(data.useBuyerReplyTo),
      active: Boolean(data.active),
    };

    await prisma.companyModule.upsert({
      where: {
        companyId_moduleKey: {
          companyId: session.companyId,
          moduleKey: "SMTP_EMAIL_CONFIG",
        },
      },
      update: {
        active: payload.active,
        config: JSON.stringify(payload),
      },
      create: {
        companyId: session.companyId,
        moduleKey: "SMTP_EMAIL_CONFIG",
        active: payload.active,
        config: JSON.stringify(payload),
      },
    });

    revalidatePath("/settings");
    revalidatePath("/purchases");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao salvar configuração" };
  }
}

/**
 * Cria o transporte nodemailer a partir das configurações da empresa
 */
async function getTransporterForCompany(companyId: string): Promise<{
  transporter: Transporter;
  config: SmtpEmailConfig;
}> {
  const mod = await prisma.companyModule.findUnique({
    where: {
      companyId_moduleKey: {
        companyId,
        moduleKey: "SMTP_EMAIL_CONFIG",
      },
    },
  });

  if (!mod?.config) {
    throw new Error(
      "Configuração de e-mail não encontrada. Configure o SMTP em Configurações > E-mail & Disparos."
    );
  }

  const config: SmtpEmailConfig = JSON.parse(mod.config);
  if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
    throw new Error(
      "Credenciais de SMTP incompletas. Preencha Servidor, Usuário e Senha de App."
    );
  }

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure || config.smtpPort === 465,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  return { transporter, config };
}

/**
 * Testa a conexão SMTP e envia um e-mail de teste
 */
export async function testEmailConnection(
  targetEmail: string,
  tempConfig?: Partial<SmtpEmailConfig>
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { success: false, error: "Não autorizado" };
    }

    if (!targetEmail || !targetEmail.includes("@")) {
      return { success: false, error: "Informe um e-mail de destinatário válido para o teste." };
    }

    let transporter: Transporter;
    let senderName = "Empório Agrobelém";
    let senderEmail = targetEmail;

    if (tempConfig && tempConfig.smtpHost && tempConfig.smtpUser && tempConfig.smtpPass && tempConfig.smtpPass !== "••••••••") {
      // Usa dados fornecidos no formulário (ainda não salvos)
      senderName = tempConfig.senderName || "Empório Agrobelém";
      senderEmail = tempConfig.senderEmail || tempConfig.smtpUser;
      transporter = nodemailer.createTransport({
        host: tempConfig.smtpHost,
        port: Number(tempConfig.smtpPort) || 587,
        secure: Boolean(tempConfig.smtpSecure) || Number(tempConfig.smtpPort) === 465,
        auth: {
          user: tempConfig.smtpUser,
          pass: tempConfig.smtpPass,
        },
        tls: { rejectUnauthorized: false },
      });
    } else {
      const res = await getTransporterForCompany(session.companyId);
      transporter = res.transporter;
      senderName = res.config.senderName;
      senderEmail = res.config.senderEmail || res.config.smtpUser;
    }

    // 1. Verificar credenciais com o servidor SMTP
    await transporter.verify();

    // 2. Disparar e-mail teste
    const info = await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to: targetEmail,
      subject: "✅ Teste de Conexão SMTP - Sistema Empório",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded-xl: 12px; background: #ffffff;">
          <h2 style="color: #0f172a; margin-top: 0;">🎉 Conexão SMTP Configurada com Sucesso!</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            Este é um e-mail de confirmação enviado automaticamente pelo sistema <strong>Empório</strong>.
          </p>
          <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 20px 0; font-size: 13px; color: #334155;">
            <p style="margin: 4px 0;"><strong>Remetente Oficial:</strong> ${senderEmail}</p>
            <p style="margin: 4px 0;"><strong>Testado por:</strong> ${session.name || "Administrador"}</p>
            <p style="margin: 4px 0;"><strong>Data/Hora do Teste:</strong> ${new Date().toLocaleString("pt-BR")}</p>
          </div>
          <p style="color: #16a34a; font-weight: bold; font-size: 14px;">
            ✓ Seu servidor está pronto para disparar cotações para os fornecedores.
          </p>
        </div>
      `,
    });

    return {
      success: true,
      message: `E-mail de teste enviado com sucesso para ${targetEmail}! (ID: ${info.messageId})`,
    };
  } catch (err: any) {
    let msg = err.message || "Erro desconhecido ao conectar ao servidor SMTP.";
    if (msg.includes("EAUTH") || msg.includes("Invalid login")) {
      msg = "Falha de autenticação (usuário ou senha incorretos). Para Gmail, certifique-se de usar uma 'Senha de Aplicativo' de 16 letras.";
    } else if (msg.includes("ETIMEDOUT") || msg.includes("ESOCKET")) {
      msg = "Tempo limite de conexão esgotado. Verifique o servidor SMTP e a porta (587 ou 465).";
    }
    return { success: false, error: msg };
  }
}

/**
 * Envia e-mail de cotação para um fornecedor
 */
export async function sendQuotationEmailAction(params: {
  quoteId: string;
  quoteToken: string;
  deadline: string;
  supplierEmail: string;
  supplierName: string;
  products: { id: string; name: string; qty: number; unit: string }[];
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { success: false, error: "Não autorizado" };
    }

    if (!params.supplierEmail || !params.supplierEmail.includes("@")) {
      return { success: false, error: `Fornecedor "${params.supplierName}" não possui e-mail válido.` };
    }

    const { transporter, config } = await getTransporterForCompany(session.companyId);

    // Buscar dados do usuário logado (comprador)
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, email: true },
    });

    const buyerName = user?.name || session.name || "Setor de Compras";
    const buyerEmail = user?.email || config.senderEmail || config.smtpUser;

    const portalUrl = `https://emporio.cybertechapp.com.br/cotacao/${params.quoteToken}`;

    // Montar tabela de produtos HTML
    const productRows = params.products
      .map(
        (p, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 0 ? "background: #f8fafc;" : ""}">
          <td style="padding: 10px 12px; font-size: 13px; color: #1e293b;">${p.name}</td>
          <td style="padding: 10px 12px; font-size: 13px; text-align: center; font-weight: bold; color: #0f172a;">${p.qty}</td>
          <td style="padding: 10px 12px; font-size: 13px; text-align: center; color: #475569;">${p.unit || "UN"}</td>
        </tr>
      `
      )
      .join("");

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; border: 1px solid #cbd5e1; border-radius: 12px; background: #ffffff;">
        <div style="border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 20px;">
          <h1 style="color: #0f172a; font-size: 20px; margin: 0;">SOLICITAÇÃO DE COTAÇÃO DE PREÇOS</h1>
          <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Cotação Ref: <strong>#${params.quoteId}</strong></p>
        </div>

        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          Olá, <strong>${params.supplierName}</strong>!
        </p>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          Solicitamos sua melhor proposta de preços, prazos e condições de entrega para os itens descritos abaixo:
        </p>

        <!-- Informações do Comprador Responsável -->
        <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 12px 16px; border-radius: 4px; margin: 20px 0; font-size: 13px; color: #1e3a8a;">
          <p style="margin: 2px 0;"><strong>Comprador Responsável:</strong> ${buyerName}</p>
          <p style="margin: 2px 0;"><strong>E-mail de Contato:</strong> ${buyerEmail}</p>
          <p style="margin: 2px 0;"><strong>Data Limite para Resposta:</strong> <span style="color: #dc2626; font-weight: bold;">${params.deadline}</span></p>
        </div>

        <!-- Tabela de Itens -->
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-family: Arial, sans-serif;">
          <thead>
            <tr style="background: #0f172a; color: #ffffff; text-align: left;">
              <th style="padding: 10px 12px; font-size: 12px; text-transform: uppercase;">Item / Descrição</th>
              <th style="padding: 10px 12px; font-size: 12px; text-transform: uppercase; text-align: center; width: 90px;">Qtd</th>
              <th style="padding: 10px 12px; font-size: 12px; text-transform: uppercase; text-align: center; width: 70px;">UN</th>
            </tr>
          </thead>
          <tbody>
            ${productRows}
          </tbody>
        </table>

        <!-- Botão de Ação -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="${portalUrl}" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; font-size: 14px; font-weight: bold; border-radius: 8px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.3);">
            👉 Preencher Valores no Portal de Cotações
          </a>
          <p style="color: #64748b; font-size: 11px; margin-top: 10px;">
            Ou acesse pelo link direto: <a href="${portalUrl}" style="color: #2563eb;">${portalUrl}</a>
          </p>
        </div>

        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
          Você pode responder diretamente a este e-mail para falar com ${buyerName} (${buyerEmail}).
        </p>
      </div>
    `;

    const mailOptions: SendMailOptions = {
      from: `"${config.senderName}" <${config.senderEmail || config.smtpUser}>`,
      to: params.supplierEmail,
      subject: `Solicitação de Cotação de Preços #${params.quoteId} - ${config.senderName}`,
      html: emailHtml,
    };

    // Atribui o Reply-To para o e-mail do usuário logado se a opção estiver ativa
    if (config.useBuyerReplyTo && buyerEmail) {
      mailOptions.replyTo = `"${buyerName}" <${buyerEmail}>`;
    }

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error("Erro ao enviar e-mail de cotação:", err);
    return { success: false, error: err.message || "Falha ao enviar e-mail" };
  }
}
