import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@emporio/database";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider: rawProvider } = await context.params;
    const provider = (rawProvider || "").toLowerCase();
    const body = await req.json().catch(() => ({}));

    let orderId: string | null = null;
    let isPaid = false;
    let transactionId: string | null = null;

    if (provider === "stone" || provider === "pagarme") {
      // Pagar.me V5 / Stone webhook
      const eventType = body?.type || body?.event || "";
      const charge = body?.data?.charges?.[0] || body?.data;
      transactionId = charge?.id || body?.data?.id || null;
      orderId = body?.data?.code || body?.data?.metadata?.orderId || charge?.metadata?.orderId || null;

      if (
        eventType === "order.paid" ||
        eventType === "charge.paid" ||
        charge?.status === "paid" ||
        body?.data?.status === "paid"
      ) {
        isPaid = true;
      }
    } else if (provider === "mercadopago") {
      // Mercado Pago webhook
      const action = body?.action || body?.type || "";
      transactionId = String(body?.data?.id || body?.id || "");
      if (action === "payment.created" || action === "payment.updated" || body?.type === "payment") {
        // Quando webhook vem com payment ID, podemos checar external_reference
        if (body?.data?.id) {
          try {
            // Tenta localizar a ordem pelo transactionId salvo previamente
            const existingOrder = await prisma.order.findFirst({
              where: { paymentTransactionId: String(body.data.id) },
              select: { id: true },
            });
            if (existingOrder) {
              orderId = existingOrder.id;
              isPaid = true;
            }
          } catch {}
        }
      }
    } else if (provider === "asaas") {
      // Asaas webhook
      const event = body?.event;
      transactionId = body?.payment?.id || null;
      orderId = body?.payment?.externalReference || null;
      if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
        isPaid = true;
      }
    } else if (provider === "efi") {
      // Efí (Gerencianet) Pix webhook
      const pixEvents = body?.pix || [];
      if (Array.isArray(pixEvents) && pixEvents.length > 0) {
        const item = pixEvents[0];
        const txid = item?.txid;
        if (txid) {
          const matchedOrder = await prisma.order.findFirst({
            where: { paymentTransactionId: txid },
            select: { id: true },
          });
          if (matchedOrder) {
            orderId = matchedOrder.id;
            isPaid = true;
            transactionId = item.endToEndId || txid;
          }
        }
      }
    }

    if (orderId && isPaid) {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "PAID",
          pixPaidAt: new Date(),
          status: "CONFIRMED", // Confirma automaticamente para a cozinha/separação
          ...(transactionId ? { paymentTransactionId: transactionId } : {}),
        },
      });
    }

    return NextResponse.json({ received: true, provider, orderId, isPaid });
  } catch (err: any) {
    console.error("[Webhook Payments Error]:", err);
    return NextResponse.json(
      { error: "Webhook processing failed", details: err?.message },
      { status: 500 }
    );
  }
}
