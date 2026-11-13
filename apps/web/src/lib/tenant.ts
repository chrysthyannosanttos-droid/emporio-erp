import { headers } from "next/headers";
import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { extractSubdomainFromHost } from "@/lib/subdomain";

/**
 * Resolve a empresa ativa priorizando:
 * 1) A sessão autenticada do usuário
 * 2) O subdomínio da requisição (ex: emporio.cybertechapp.com.br -> Company.slug)
 * 3) Fallback seguro para a empresa principal, evitando vazar dados da empresa demonstrativa.
 */
export async function resolveActiveCompany() {
  const session = await getSession();
  if (session?.companyId) {
    const company = await prisma.company.findUnique({
      where: { id: session.companyId },
    });
    if (company) return company;
  }

  try {
    const hdrs = await headers();
    const slugHeader = hdrs.get("x-tenant-slug");
    const sub = slugHeader || extractSubdomainFromHost(hdrs.get("x-forwarded-host") || hdrs.get("host"));
    if (sub && sub !== "master") {
      const bySlug = await prisma.company.findFirst({
        where: {
          OR: [
            { slug: sub },
            ...(sub === "emporio" ? [{ slug: "emporio-agrobelem" }, { document: "65.522.409/0001-13" }] : []),
          ],
        },
      });
      if (bySlug) return bySlug;
    }
  } catch {
    // fora de contexto HTTP de request
  }

  const agrobelem = await prisma.company.findFirst({
    where: { document: "65.522.409/0001-13" },
  });
  if (agrobelem) return agrobelem;

  const nonDemo = await prisma.company.findFirst({
    where: {
      NOT: { document: "00.000.000/0001-99" },
    },
  });
  if (nonDemo) return nonDemo;

  return await prisma.company.findFirst();
}

