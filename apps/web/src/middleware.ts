import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/session";

// Rotas públicas (sem autenticação)
const PUBLIC_ROUTES = ["/login", "/register", "/cotacao", "/cupom"];

// Rotas exclusivas do Super Admin
const MASTER_ROUTES = ["/master"];

// Rotas do Tenant (exigem companyId)
const TENANT_ROUTES = ["/", "/dashboard", "/products", "/customers", "/sales"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir rotas públicas, assets e APIs internas
  if (
    PUBLIC_ROUTES.some((r) => pathname.startsWith(r)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Ler e validar JWT da sessão
  const sessionCookie = request.cookies.get("session")?.value;
  const session = await decrypt(sessionCookie);

  // === Sem sessão: redirecionar para login ===
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // === Rota do Master: exige isSuperAdmin ou ADMIN ===
  if (pathname.startsWith("/master")) {
    if (!session.isSuperAdmin && session.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // === Rota do Tenant: exige companyId e não pode ser Master ===
  if (session.isSuperAdmin) {
    // Super admins não podem acessar rotas de tenant — manda pro master
    return NextResponse.redirect(new URL("/master", request.url));
  }

  if (!session.companyId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Se o colaborador for operador de caixa e acessar a raiz ou dashboard, vai direto pro PDV
  const roleUpper = (session.role || "").trim().toUpperCase();
  const isCashier =
    roleUpper === "OPERATOR" ||
    roleUpper === "CASHIER" ||
    roleUpper.includes("OPERATOR") ||
    roleUpper.includes("OPERADOR") ||
    roleUpper.includes("CAIXA") ||
    roleUpper.includes("CASHIER");

  if (isCashier && (pathname === "/" || pathname === "/dashboard")) {
    return NextResponse.redirect(new URL("/pdv", request.url));
  }

  // Tudo certo: deixar passar
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Aplica middleware a todas as rotas EXCETO:
     * - _next/static (arquivos estáticos)
     * - _next/image (imagens otimizadas)
     * - favicon.ico
     * - arquivos de imagem públicos
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
