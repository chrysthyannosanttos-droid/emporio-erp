import { NextResponse } from "next/server";
import { prisma } from "@emporio/database";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { terminalId, token, sales } = body;

    if (!terminalId || !Array.isArray(sales)) {
      return NextResponse.json({ error: "terminalId e lista de sales são obrigatórios" }, { status: 400 });
    }

    const terminal = await prisma.pdvTerminal.findUnique({
      where: { id: terminalId },
    });

    if (!terminal || (token && terminal.token && terminal.token !== token)) {
      return NextResponse.json({ error: "Terminal inválido ou não autorizado" }, { status: 401 });
    }

    const companyId = terminal.companyId;
    if (!companyId) {
      return NextResponse.json({ error: "Terminal não vinculado a uma empresa" }, { status: 400 });
    }

    const syncedIds: string[] = [];

    // Busca um usuário padrão da empresa caso o operador não tenha ID de usuário no banco
    const defaultUser = await prisma.user.findFirst({
      where: { companyId },
    });
    const fallbackUserId = defaultUser?.id || terminalId;

    for (const sale of sales) {
      try {
        // Verifica se a venda já foi importada anteriormente para evitar duplicidade
        const existing = await prisma.sale.findUnique({
          where: { id: sale.localId },
        });

        if (existing) {
          syncedIds.push(sale.localId);
          continue;
        }

        // Cria a venda no banco central
        await prisma.sale.create({
          data: {
            id: sale.localId,
            companyId,
            userId: fallbackUserId,
            subtotal: sale.subtotal,
            discount: sale.discount || 0,
            total: sale.total,
            status: "COMPLETED",
            createdAt: sale.createdAt ? new Date(sale.createdAt) : new Date(),
            items: {
              create: (sale.items || []).map((it: any) => ({
                productId: it.productId,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                total: it.total,
              })),
            },
            payments: {
              create: (sale.payments || []).map((pm: any) => ({
                amount: pm.amount,
                paymentMethod: pm.method,
              })),
            },
          },
        });

        // Atualiza estoque dos produtos vendidos
        for (const it of sale.items || []) {
          try {
            await prisma.product.update({
              where: { id: it.productId },
              data: {
                stock: {
                  decrement: it.quantity,
                },
              },
            });
          } catch (stockErr) {
            console.warn(`[PDV Sync Sales] Não foi possível decrementar estoque do produto ${it.productId}:`, stockErr);
          }
        }

        syncedIds.push(sale.localId);
      } catch (saleErr) {
        console.error(`[PDV Sync Sales] Erro ao sincronizar venda ${sale.localId}:`, saleErr);
      }
    }

    return NextResponse.json({ ok: true, syncedIds });
  } catch (err: any) {
    console.error("[PDV Sync Sales] Erro geral:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

