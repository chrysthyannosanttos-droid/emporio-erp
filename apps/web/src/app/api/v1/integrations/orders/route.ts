import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/apiAuth";
import { prisma } from "@emporio/database";
import { toPlain } from "@/lib/serialize";

/**
 * GET /api/v1/integrations/orders
 * Consulta os pedidos do cliente na nuvem
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.authenticated || !auth.company) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  try {
    const orders = await prisma.order.findMany({
      where: {
        companyId: auth.company.id,
        ...(status ? { status } : {}),
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        items: {
          include: {
            product: { select: { name: true, unit: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      count: orders.length,
      orders: toPlain(orders),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao consultar pedidos." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/integrations/orders
 * Recebe novos pedidos vindos de apps externos (Garçom, iFood, Delivery, Anota AI, etc.)
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.authenticated || !auth.company) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: "O pedido precisa conter ao menos 1 item." },
        { status: 400 }
      );
    }

    let customerId = body.customerId;

    // Se veio nome/telefone de cliente de delivery, localiza ou cadastra
    if (!customerId && (body.customerName || body.customerPhone)) {
      const existing = await prisma.customer.findFirst({
        where: {
          companyId: auth.company.id,
          OR: [
            ...(body.customerPhone ? [{ phone: body.customerPhone }] : []),
            ...(body.customerName ? [{ name: body.customerName }] : []),
          ],
        },
      });

      if (existing) {
        customerId = existing.id;
      } else {
        const newCust = await prisma.customer.create({
          data: {
            name: body.customerName || "Cliente Delivery",
            phone: body.customerPhone || null,
            document: body.customerCpf || null,
            address: body.deliveryAddress || null,
            companyId: auth.company.id,
          },
        });
        customerId = newCust.id;
      }
    }

    // Calcula totais
    let subtotal = 0;
    const itemsData: any[] = [];

    for (const item of body.items) {
      // Localiza o produto pelo ID ou pelo código de barras
      const product = await prisma.product.findFirst({
        where: {
          companyId: auth.company.id,
          OR: [
            ...(item.productId ? [{ id: item.productId }] : []),
            ...(item.barcode ? [{ barcode: item.barcode }] : []),
            ...(item.name ? [{ name: item.name }] : []),
          ],
        },
      });

      if (!product) {
        continue;
      }

      const qty = Number(item.quantity) || 1;
      const unitPrice = item.unitPrice ? Number(item.unitPrice) : Number(product.price || 0);
      const discount = Number(item.discount || 0);
      const total = qty * unitPrice - discount;

      subtotal += qty * unitPrice;

      itemsData.push({
        productId: product.id,
        quantity: qty,
        unitPrice,
        discount,
        total,
      });
    }

    if (itemsData.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nenhum produto correspondente foi encontrado no cadastro deste cliente." },
        { status: 400 }
      );
    }

    const orderDiscount = Number(body.discount || 0);
    const orderTotal = Math.max(0, subtotal - orderDiscount);
    const orderNumber = body.orderNumber || `EXT-${Date.now().toString().slice(-6)}`;

    // Cria o pedido no banco do cliente
    const order = await prisma.order.create({
      data: {
        companyId: auth.company.id,
        customerId,
        orderNumber,
        status: "CONFIRMED",
        paymentTerm: body.paymentMethod || "INTEGRACAO_APP",
        freightType: body.freightType || "DELIVERY",
        notes: body.notes || `Pedido recebido via integração: ${body.sourceApp || "App Externo"}`,
        subtotal,
        discount: orderDiscount,
        total: orderTotal,
        items: {
          create: itemsData,
        },
      },
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Pedido integrado com sucesso e disponibilizado no PDV / KDS!",
      order: toPlain({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
        subtotal: order.subtotal,
        discount: order.discount,
        customerName: order.customer?.name || "Balcão",
        itemCount: order.items.length,
        createdAt: order.createdAt,
      }),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao processar pedido externo." },
      { status: 500 }
    );
  }
}

