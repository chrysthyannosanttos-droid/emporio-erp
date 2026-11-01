import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/apiAuth";
import { prisma } from "@emporio/database";
import { toPlain } from "@/lib/serialize";

/**
 * GET /api/v1/integrations/products
 * Retorna os produtos e cardápio ativos do cliente para outros apps.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.authenticated || !auth.company) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  try {
    const where: any = {
      companyId: auth.company.id,
    };

    if (category) {
      where.category = {
        name: { contains: category, mode: "insensitive" },
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: "asc" },
      take: 200,
    });

    const formatted = products.map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price || 0),
      barcode: p.barcode,
      unit: p.unit || "UN",
      stock: p.stock || 0,
      category: p.category?.name || "Geral",
      categoryId: p.categoryId,
      available: (p.stock || 0) > 0,
    }));

    return NextResponse.json({
      success: true,
      count: formatted.length,
      client: {
        id: auth.company.id,
        name: auth.company.name,
      },
      products: toPlain(formatted),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao consultar produtos." },
      { status: 500 }
    );
  }
}

