/**
 * Seed: Cria o Super Admin padrão do sistema (SystemUser)
 * Executar com: npx ts-node seed-master.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.systemUser.findFirst({
    where: { email: "admin@emporio.com" },
  });

  if (existing) {
    console.log("✅ Super Admin já existe:", existing.email);
    return;
  }

  const admin = await prisma.systemUser.create({
    data: {
      name: "Admin Master",
      email: "admin@emporio.com",
      // IMPORTANTE: Troque esta senha em produção!
      password: "admin123",
      role: "SUPER_ADMIN",
      active: true,
    },
  });

  console.log("✅ Super Admin criado com sucesso!");
  console.log("   Nome:", admin.name);
  console.log("   E-mail:", admin.email);
  console.log("   Senha: admin123 (troque imediatamente em produção!)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
