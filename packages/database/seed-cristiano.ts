import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.systemUser.upsert({
    where: { email: "cristiano@emporio.com" },
    update: {
      name: "Cristiano",
      password: "91126395",
      role: "SUPER_ADMIN",
      active: true,
    },
    create: {
      name: "Cristiano",
      email: "cristiano@emporio.com",
      password: "91126395",
      role: "SUPER_ADMIN",
      active: true,
    },
  });

  console.log("✅ Super Admin Cristiano configurado no banco com sucesso!");
  console.log("   ID:", user.id);
  console.log("   Nome:", user.name);
  console.log("   E-mail:", user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
