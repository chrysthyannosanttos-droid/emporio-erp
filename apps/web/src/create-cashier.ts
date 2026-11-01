import { prisma } from "@emporio/database";
import bcrypt from "bcryptjs";

async function main() {
  const company = await prisma.company.findFirst();
  if (!company) {
    console.error("Nenhuma empresa cadastrada.");
    return;
  }

  const hashedPassword = await bcrypt.hash("123456", 10);

  // Cria ou atualiza o usuário caixa
  const user = await prisma.user.upsert({
    where: { email: "caixa@emporio.com" },
    update: {
      password: hashedPassword,
      pin: "1234",
      active: true,
      role: "OPERATOR",
      name: "Operador de Caixa",
    },
    create: {
      email: "caixa@emporio.com",
      name: "Operador de Caixa",
      password: hashedPassword,
      pin: "1234",
      role: "OPERATOR",
      companyId: company.id,
      active: true,
    },
  });

  // Também garante que o admin tenha a senha 123456
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" }
  });
  if (admin) {
    await prisma.user.update({
      where: { id: admin.id },
      data: { password: hashedPassword }
    });
    console.log("Admin atualizado:", admin.email);
  }

  console.log("Operador criado com sucesso!");
  console.log("Email:", user.email);
  console.log("Senha: 123456");
  console.log("PIN: 1234");
}

main().catch(console.error).finally(() => process.exit(0));

