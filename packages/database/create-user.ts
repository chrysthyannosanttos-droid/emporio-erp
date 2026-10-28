import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();
async function main() {
  const company = await prisma.company.findFirst({ where: { document: "12.345.678/0001-99" } });
  if (!company) { console.error("Empresa nao encontrada!"); return; }
  const hashedPassword = await bcrypt.hash("123456", 10);
  const user = await prisma.user.upsert({
    where: { email: "cristiano@emporio.com" },
    update: { name: "Cristiano Admin", password: hashedPassword, role: "ADMIN", companyId: company.id, active: true },
    create: { name: "Cristiano Admin", email: "cristiano@emporio.com", password: hashedPassword, role: "ADMIN", companyId: company.id, active: true },
  });
  console.log("Usuario criado: " + user.name + " | Email: cristiano@emporio.com | Senha: 123456");
}
main().catch(console.error).finally(() => prisma.$disconnect());
