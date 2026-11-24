import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/session";
import { extractSubdomainFromHost } from "@/lib/subdomain";

// Rotas públicas (sem autenticação)
const PUBLIC_ROUTES = ["/login", "/register", "/cotacao", "/cupom", "/loja"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rawHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const subdomain = extractSubdomainFromHost(rawHost);

  const requestHeaders = new Headers(request.headers);
  if (subdomain) {
    requestHeaders.set("x-tenant-slug", subdomain);
  }

  const passNext = () => NextResponse.next({ request: { headers: requestHeaders } });

  // Subdomínio dedicado "master.*" abre o Painel Master na raiz
  if (subdomain === "master" && pathname === "/") {
    return NextResponse.redirect(new URL("/master", request.url));
  }

  // Subdomínio de cliente em "/loja" acessa direto o Cardápio Digital daquela empresa
  if (subdomain && subdomain !== "master" && (pathname === "/loja" || pathname === "/loja/")) {
    const url = request.nextUrl.clone();
    url.pathname = `/loja/${subdomain}`;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  // Permitir rotas públicas, assets e APIs internas
  if (
    PUBLIC_ROUTES.some((r) => pathname.startsWith(r)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return passNext();
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
    return passNext();
  }

  // === Rota do Tenant: exige companyId e não pode ser Master (exceto para rotas de PDV e PDV Mobile) ===
  if (session.isSuperAdmin) {
    if (pathname.startsWith("/pdv")) {
      return passNext();
    }
    // Super admins não podem acessar outras rotas administrativas de tenant — manda pro master
    return NextResponse.redirect(new URL("/master", request.url));
  }

  if (!session.companyId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Se o colaborador for operador de caixa dedicado e acessar a raiz ou dashboard, vai direto pro PDV
  const roleUpper = (session.role || "").trim().toUpperCase();
  const isCashier = roleUpper === "OPERATOR" || roleUpper === "CASHIER";

  // Bloqueia Configurações e Suporte/Migração para usuários que não são ADMIN
  if (
    roleUpper !== "ADMIN" &&
    (pathname.startsWith("/settings") || pathname.startsWith("/migration") || pathname.startsWith("/audit"))
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isCashier && (pathname === "/" || pathname === "/dashboard")) {
    return NextResponse.redirect(new URL("/pdv", request.url));
  }

  // Tudo certo: deixar passar com x-tenant-slug propagado
  return passNext();
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
