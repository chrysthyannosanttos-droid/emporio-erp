import { NextResponse } from "next/server";
import { prisma } from "@emporio/database";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

function generateActivationCode(): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const suffix = chars[Math.floor(Math.random() * chars.length)] + chars[Math.floor(Math.random() * chars.length)];
  return `PDV-${rand}-${suffix}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    let code = body.code ? String(body.code).trim().toUpperCase() : null;
    const version = body.version || "2.0.0";
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";

    if (!code) {
      let attempts = 0;
      while (!code && attempts < 10) {
        const candidate = generateActivationCode();
        const exists = await prisma.pdvTerminal.findUnique({ where: { code: candidate } });
        if (!exists) {
          code = candidate;
        }
        attempts++;
      }
    }

    if (!code) {
      code = `PDV-${Date.now().toString().slice(-6)}`;
    }

    const existing = await prisma.pdvTerminal.findUnique({
      where: { code }
    });

    if (existing && existing.status === "ACTIVE") {
      return NextResponse.json({
        code: existing.code,
        status: existing.status,
        paired: true
      }, { headers: corsHeaders });
    }

    const terminal = await prisma.pdvTerminal.upsert({
      where: { code },
      update: {
        version,
        ipAddress,
        lastHeartbeat: new Date(),
      },
      create: {
        code,
        status: "PENDING",
        version,
        ipAddress,
        name: "Novo Terminal PDV",
        lastHeartbeat: new Date(),
      }
    });

    return NextResponse.json({
      code: terminal.code,
      status: terminal.status,
      paired: false,
      message: "Código de ativação gerado. Digite este código no Painel Web da empresa para vincular à loja."
    }, { headers: corsHeaders });
  } catch (err) {
    console.error("Erro ao registrar código PDV:", err);
    return NextResponse.json({ error: String(err) }, { status: 500, headers: corsHeaders });
  }
}
