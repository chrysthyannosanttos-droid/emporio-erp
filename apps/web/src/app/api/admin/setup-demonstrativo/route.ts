import { NextResponse } from "next/server";
import { setupDemonstrativoAndCleanReal } from "@/actions/maintenance";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");

    // Permite via chave secreta ou via sessão de administrador logado
    const session = await getSession();
    const isAuthorized = secret === "cybertech2026demo" || session?.role === "ADMIN" || Boolean(session?.isSuperAdmin);

    if (!isAuthorized) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const result = await setupDemonstrativoAndCleanReal(session?.companyId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
