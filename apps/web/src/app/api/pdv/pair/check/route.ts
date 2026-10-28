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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code")?.trim().toUpperCase();

    if (!code) {
      return NextResponse.json({ error: "Parâmetro code é obrigatório" }, { status: 400, headers: corsHeaders });
    }

    const terminal = await prisma.pdvTerminal.findUnique({
      where: { code },
      include: {
        company: {
          select: { id: true, name: true, document: true }
        },
        store: {
          select: { id: true, name: true, code: true, tradeName: true, city: true, state: true }
        }
      }
    });

    if (!terminal) {
      return NextResponse.json({ paired: false, status: "NOT_FOUND" }, { headers: corsHeaders });
    }

    // Atualiza último heartbeat
    await prisma.pdvTerminal.update({
      where: { id: terminal.id },
      data: { lastHeartbeat: new Date() }
    }).catch(() => null);

    if (terminal.status === "ACTIVE" && terminal.company && terminal.store) {
      return NextResponse.json({
        paired: true,
        status: "ACTIVE",
        terminalId: terminal.id,
        terminalName: terminal.name,
        cashierNumber: terminal.cashierNumber,
        token: terminal.token,
        company: {
          id: terminal.company.id,
          name: terminal.company.name,
          document: terminal.company.document,
        },
        store: {
          id: terminal.store.id,
          name: terminal.store.name,
          code: terminal.store.code,
          tradeName: terminal.store.tradeName,
          city: terminal.store.city,
          state: terminal.store.state,
        }
      }, { headers: corsHeaders });
    }

    return NextResponse.json({
      paired: false,
      status: terminal.status,
      code: terminal.code
    }, { headers: corsHeaders });
  } catch (err) {
    console.error("Erro ao verificar pareamento:", err);
    return NextResponse.json({ error: String(err) }, { status: 500, headers: corsHeaders });
  }
}
