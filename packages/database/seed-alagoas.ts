import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst();
  if (!company) {
    console.error("No company found.");
    return;
  }

  // Desativar grids anteriores
  await prisma.taxGrid.updateMany({
    where: { companyId: company.id },
    data: { active: false },
  });

  const grid = await prisma.taxGrid.create({
    data: {
      name: "Grade Tributária Alagoas (ICMS 20.5%) - Lei 9.776/2025",
      description: "Regras atualizadas para o estado de Alagoas com ICMS Modal 20.5% (Abril 2026)",
      companyId: company.id,
      active: true,
      rules: {
        create: [
          {
            ncmPattern: "*",
            cfopOrigin: "5102",
            cstIcms: "00",
            csosn: "102",
            icmsRate: 20.5,
            pisRate: 1.65,
            cofinsRate: 7.6,
            ibsRate: 0,
            cbsRate: 0,
            isRate: 0,
          },
          {
            ncmPattern: "02*", // Exemplo genérico de carnes (Cesta Básica)
            cfopOrigin: "5102",
            cstIcms: "20",
            csosn: "102",
            icmsRate: 7.0,
            pisRate: 0,
            cofinsRate: 0,
            ibsRate: 0,
            cbsRate: 0,
            isRate: 0,
          }
        ]
      }
    }
  });

  console.log("Grade de Alagoas criada com sucesso:", grid.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
