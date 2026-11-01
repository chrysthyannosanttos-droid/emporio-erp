import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/apiAuth";

/**
 * GET /api/v1/integrations
 * Endpoint de Ping / Handshake para outros apps testarem a conexão com o cliente.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.authenticated || !auth.company) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  return NextResponse.json({
    success: true,
    message: "Conexão com o ERP Cybertech Nuvem estabelecida com sucesso!",
    serverTime: new Date().toISOString(),
    client: {
      id: auth.company.id,
      name: auth.company.name,
      document: auth.company.document,
      slug: auth.company.clientSlug,
      status: "ONLINE",
    },
    version: "v2.2.0-cloud",
  });
}

