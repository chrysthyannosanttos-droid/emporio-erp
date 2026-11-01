import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const POOLER_FALLBACK_URL =
  "postgresql://postgres.icacwongmlfzqsdotmdy:THJ88XluQxM0xwn9@aws-1-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true";

function resolveDatabaseUrl(): string | undefined {
  const envUrl = process.env.DATABASE_URL;
  // Se a URL na Vercel estiver vazia ou apontando para a conexão direta (IPv6)
  // que o ambiente Serverless da AWS/Vercel não consegue alcançar,
  // utiliza o pooler IPv4 dedicado garantido
  if (!envUrl || envUrl.includes("db.icacwongmlfzqsdotmdy.supabase.co") || !envUrl.includes("pooler.supabase.com")) {
    return POOLER_FALLBACK_URL;
  }
  return envUrl;
}

const resolvedUrl = resolveDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: resolvedUrl,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
