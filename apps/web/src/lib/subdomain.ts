const RESERVED_SUBDOMAINS = new Set(["www", "app", "erp", "api", "admin"]);

/**
 * Extrai o subdomínio de cliente a partir do cabeçalho Host (ex: emporio.cybertechapp.com.br -> "emporio").
 * Retorna null em localhost, IPs ou domínios padrão *.vercel.app.
 */
export function extractSubdomainFromHost(hostHeader: string | null | undefined): string | null {
  if (!hostHeader) return null;
  const host = hostHeader.split(":")[0].trim().toLowerCase();
  if (!host || host === "localhost" || host === "127.0.0.1" || host.endsWith(".vercel.app")) {
    return null;
  }

  const parts = host.split(".");
  if (host.endsWith(".cybertechapp.com.br") && parts.length >= 4) {
    const sub = parts[0];
    return RESERVED_SUBDOMAINS.has(sub) ? null : sub;
  }

  if (!/^\d+\.\d+\.\d+\.\d+$/.test(host) && parts.length >= 3 && parts[0] !== "cybertechapp") {
    const sub = parts[0];
    return RESERVED_SUBDOMAINS.has(sub) ? null : sub;
  }

  return null;
}

