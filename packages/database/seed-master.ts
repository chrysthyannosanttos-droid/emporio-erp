/**
 * Seed: Cria o Super Admin padrão do sistema (SystemUser)
 * Executar com: npx ts-node seed-master.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.systemUser.upsert({
    where: { email: "cristiano@emporio.com" },
    update: {
      name: "cristiano",
      password: "91126395",
      role: "SUPER_ADMIN",
      active: true,
    },
    create: {
      name: "cristiano",
      email: "cristiano@emporio.com",
      password: "91126395",
      role: "SUPER_ADMIN",
      active: true,
    },
  });

  console.log("✅ Super Admin configurado com sucesso!");
  console.log("   Nome:", admin.name);
  console.log("   E-mail:", admin.email);
  console.log("   Senha:", admin.password);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
