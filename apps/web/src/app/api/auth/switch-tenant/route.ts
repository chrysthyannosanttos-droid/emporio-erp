import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@emporio/database";
import { getSession, createSession } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (!session.isSuperAdmin && session.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Apenas Super Admin ou Administradores podem acessar empresas clientes." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId")?.trim();

    if (!companyId) {
      return NextResponse.json({ error: "companyId é obrigatório" }, { status: 400 });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
    }

    let adminUser =
      (await prisma.user.findFirst({
        where: { companyId: company.id, role: "ADMIN", active: true },
      })) ||
      (await prisma.user.findFirst({
        where: { companyId: company.id, active: true },
      }));

    if (!adminUser) {
      const defaultHash = await bcrypt.hash("1234", 10);
      const uniqueEmail = `admin.${company.id.slice(0, 8)}.${Date.now().toString(36)}@suporte.cybertech.local`;

      adminUser = await prisma.user.create({
        data: {
          name: `Suporte (${company.name})`,
          email: uniqueEmail,
          password: defaultHash,
          pin: defaultHash,
          role: "ADMIN",
          companyId: company.id,
          active: true,
        },
      });
    }

    const sessionToken = crypto.randomUUID();
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { activeSessionToken: sessionToken, lastLogin: new Date() },
    });

    await createSession({
      userId: adminUser.id,
      name: adminUser.name,
      role: adminUser.role,
      companyId: company.id,
      companyName: company.name,
      isSuperAdmin: false,
      sessionToken,
    });

    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
    let destinationUrl = "/";
    if (host.includes("cybertechapp.com.br") && company.slug) {
      destinationUrl = `https://${company.slug}.cybertechapp.com.br/`;
    }

    return NextResponse.redirect(new URL(destinationUrl, request.url));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
