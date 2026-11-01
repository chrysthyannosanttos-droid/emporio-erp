import { NextResponse } from "next/server";
import { prisma } from "@emporio/database";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { terminalId, token, shift } = body;

    if (!terminalId || !shift) {
      return NextResponse.json({ error: "terminalId e shift são obrigatórios" }, { status: 400 });
    }

    const terminal = await prisma.pdvTerminal.findUnique({
      where: { id: terminalId },
    });

    if (!terminal || (token && terminal.token && terminal.token !== token)) {
      return NextResponse.json({ error: "Terminal inválido ou não autorizado" }, { status: 401 });
    }

    const companyId = terminal.companyId;
    if (!companyId) {
      return NextResponse.json({ error: "Terminal sem empresa vinculada" }, { status: 400 });
    }

    const defaultUser = await prisma.user.findFirst({
      where: { companyId },
    });
    const fallbackUserId = defaultUser?.id || terminalId;

    // Procura ou cria o CashRegister correspondente
    let register = await prisma.cashRegister.findUnique({
      where: { id: shift.id },
    });

    if (!register) {
      register = await prisma.cashRegister.create({
        data: {
          id: shift.id,
          companyId,
          operatorId: fallbackUserId,
          initialValue: shift.initialBalance || 0,
          openingTime: shift.openedAt ? new Date(shift.openedAt) : new Date(),
          closingTime: shift.closedAt ? new Date(shift.closedAt) : null,
          finalValue: shift.finalCounted?.total ? shift.finalCounted.total : null,
          expectedValue: shift.expectedCash || null,
          status: shift.status === "CLOSED" ? "CLOSED" : "OPEN",
        },
      });
    } else {
      register = await prisma.cashRegister.update({
        where: { id: shift.id },
        data: {
          closingTime: shift.closedAt ? new Date(shift.closedAt) : register.closingTime,
          finalValue: shift.finalCounted?.total ? shift.finalCounted.total : register.finalValue,
          expectedValue: shift.expectedCash || register.expectedValue,
          status: shift.status === "CLOSED" ? "CLOSED" : register.status,
        },
      });
    }

    // Sincroniza movimentações (sangrias e suprimentos)
    if (Array.isArray(shift.movements)) {
      for (const mov of shift.movements) {
        const existingMov = await prisma.cashMovement.findUnique({
          where: { id: mov.id },
        });

        if (!existingMov) {
          await prisma.cashMovement.create({
            data: {
              id: mov.id,
              cashRegisterId: register.id,
              userId: fallbackUserId,
              type: mov.type === "WITHDRAWAL" ? "SANGRIA" : "SUPRIMENTO",
              amount: mov.amount,
              description: mov.reason || mov.type,
              timestamp: mov.createdAt ? new Date(mov.createdAt) : new Date(),
            },
          });
        }
      }
    }

    return NextResponse.json({ ok: true, shiftId: register.id });
  } catch (err: any) {
    console.error("[PDV Sync Shift] Erro:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

