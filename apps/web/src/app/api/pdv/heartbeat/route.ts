import { NextResponse } from "next/server";
import { prisma } from "@emporio/database";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { terminalId, token } = body;

    if (!terminalId) {
      return NextResponse.json({ error: "terminalId é obrigatório" }, { status: 400 });
    }

    const terminal = await prisma.pdvTerminal.findUnique({
      where: { id: terminalId }
    });

    if (!terminal || (token && terminal.token && terminal.token !== token)) {
      return NextResponse.json({ error: "Terminal inválido ou não autorizado" }, { status: 401 });
    }

    await prisma.pdvTerminal.update({
      where: { id: terminalId },
      data: {
        lastHeartbeat: new Date(),
        status: terminal.status === "ACTIVE" ? "ACTIVE" : terminal.status
      }
    });

    return NextResponse.json({ ok: true, status: terminal.status });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
