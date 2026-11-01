import { prisma } from "@emporio/database";
import { NextRequest } from "next/server";

export interface AuthenticatedCompany {
  id: string;
  name: string;
  document: string;
  licenseStatus: string;
  clientSlug?: string;
}

/**
 * Valida a autenticação da API para chamadas externas de outros apps.
 * Aceita:
 * - Header: Authorization: Bearer <token>
 * - Header: X-Client-Token: <token>
 * - Header: X-Client-Slug: <slug>
 * - Query param: ?token=<token>
 */
export async function authenticateApiRequest(req: NextRequest): Promise<{
  authenticated: boolean;
  company?: AuthenticatedCompany;
  error?: string;
  status: number;
}> {
  try {
    const authHeader = req.headers.get("authorization");
    const clientTokenHeader = req.headers.get("x-client-token");
    const clientSlugHeader = req.headers.get("x-client-slug");
    const { searchParams } = new URL(req.url);
    const tokenQuery = searchParams.get("token");
    const slugQuery = searchParams.get("slug");

    let token = "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    } else if (clientTokenHeader) {
      token = clientTokenHeader.trim();
    } else if (tokenQuery) {
      token = tokenQuery.trim();
    }

    const slug = clientSlugHeader || slugQuery;

    if (!token && !slug) {
      return {
        authenticated: false,
        error: "Chave de autenticação não fornecida. Envie o header 'Authorization: Bearer <token>' ou 'X-Client-Token'.",
        status: 401,
      };
    }

    // Busca o CompanyModule com essa configuração
    const modules = await prisma.companyModule.findMany({
      where: {
        moduleKey: "INTEGRATION_API",
        active: true,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            document: true,
            licenseStatus: true,
          },
        },
      },
    });

    let matchedCompany: any = null;

    for (const m of modules) {
      if (m.config) {
        try {
          const cfg = JSON.parse(m.config);
          if (token && cfg.apiToken === token) {
            matchedCompany = { ...m.company, clientSlug: cfg.clientSlug };
            break;
          }
          if (slug && cfg.clientSlug === slug && !token) {
            matchedCompany = { ...m.company, clientSlug: cfg.clientSlug };
            break;
          }
        } catch {}
      }
    }

    // Fallback: Se não encontrou por módulo mas temos token com prefixo cyb_live_, verifica token de terminal PDV
    if (!matchedCompany && token) {
      const terminal = await prisma.pdvTerminal.findFirst({
        where: {
          OR: [{ token }, { code: token }],
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              document: true,
              licenseStatus: true,
            },
          },
        },
      });

      if (terminal?.company) {
        matchedCompany = terminal.company;
      }
    }

    if (!matchedCompany) {
      return {
        authenticated: false,
        error: "Chave de autenticação ou código de cliente inválido.",
        status: 403,
      };
    }

    if (matchedCompany.licenseStatus === "SUSPENDED" || matchedCompany.licenseStatus === "EXPIRED") {
      return {
        authenticated: false,
        error: "A licença desta empresa está suspensa ou expirada na nuvem.",
        status: 402,
      };
    }

    return {
      authenticated: true,
      company: matchedCompany,
      status: 200,
    };
  } catch (err: any) {
    return {
      authenticated: false,
      error: `Erro ao validar credenciais: ${err.message}`,
      status: 500,
    };
  }
}

