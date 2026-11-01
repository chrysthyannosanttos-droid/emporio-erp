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
      where: { id: terminalId },
    });

    if (!terminal || (token && terminal.token && terminal.token !== token)) {
      return NextResponse.json({ error: "Terminal inválido ou não autorizado" }, { status: 401 });
    }

    const companyId = terminal.companyId;

    // Busca os produtos da empresa vinculada
    const products = await prisma.product.findMany({
      where: companyId ? { companyId } : undefined,
      select: {
        id: true,
        name: true,
        barcode: true,
        price: true,
        cost: true,
        unit: true,
        stock: true,
      },
      take: 10000,
    });

    const formatted = products.map((p) => ({
      id: p.id,
      name: p.name,
      barcode: p.barcode || "",
      price: Number(p.price) || 0,
      costPrice: Number(p.cost) || 0,
      unit: p.unit || "UN",
      isWeighable: p.unit === "KG" || p.unit === "G",
      stock: p.stock ? Number(p.stock) : 0,
      category: "Geral",
    }));

    return NextResponse.json({ ok: true, products: formatted });
  } catch (err: any) {
    console.error("[PDV Sync Products] Erro:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
