import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Iniciando criação da Empresa Demonstração (Demo SaaS)...");

  // 1. Criar ou Atualizar Plano Pro
  const plan = await prisma.plan.upsert({
    where: { id: "demo-plan-pro" },
    update: {
      name: "Plano Pro ERP Demo",
      description: "Plano completo com NF-e, NFC-e, PDV e Televendas",
      price: 299.90,
      maxUsers: 10,
      maxProducts: 1000,
      active: true,
    },
    create: {
      id: "demo-plan-pro",
      name: "Plano Pro ERP Demo",
      description: "Plano completo com NF-e, NFC-e, PDV e Televendas",
      price: 299.90,
      maxUsers: 10,
      maxProducts: 1000,
      active: true,
    },
  });

  // 2. Criar ou Atualizar a Empresa Demo (Tenant)
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 ano de validade

  const company = await prisma.company.upsert({
    where: { document: "12.345.678/0001-99" },
    update: {
      name: "Mercado & Empório Modelo LTDA",
      licenseStatus: "ACTIVE",
      licenseExpiresAt: expiryDate,
      planId: plan.id,
    },
    create: {
      name: "Mercado & Empório Modelo LTDA",
      document: "12.345.678/0001-99",
      licenseStatus: "ACTIVE",
      licenseExpiresAt: expiryDate,
      planId: plan.id,
    },
  });

  console.log(`✅ Empresa Demo criada/atualizada: ${company.name} (ID: ${company.id})`);

  // Limpar dados anteriores da empresa demo para evitar duplicatas
  await prisma.invoice.deleteMany({ where: { companyId: company.id } });
  await prisma.saleItem.deleteMany({ where: { companyId: company.id } });
  await prisma.sale.deleteMany({ where: { companyId: company.id } });
  await prisma.customer.deleteMany({ where: { companyId: company.id } });
  await prisma.supplier.deleteMany({ where: { companyId: company.id } });
  await prisma.product.deleteMany({ where: { companyId: company.id } });
  await prisma.category.deleteMany({ where: { companyId: company.id } });

  // 3. Criar Usuários da Empresa Demo
  const userDemo = await prisma.user.upsert({
    where: { email: "teste@emporio.com" },
    update: {
      name: "Usuário Demonstração",
      password: "123", // Permite login direto com "123" ou "teste"
      role: "ADMIN",
      companyId: company.id,
      active: true,
    },
    create: {
      name: "Usuário Demonstração",
      email: "teste@emporio.com",
      password: "123",
      role: "ADMIN",
      companyId: company.id,
      active: true,
    },
  });

  console.log(`✅ Usuário Demo criado: ${userDemo.name} (E-mail: teste@emporio.com | Senha: 123)`);

  // 4. Configuração Fiscal da Empresa Demo
  await prisma.fiscalConfig.upsert({
    where: { companyId: company.id },
    update: {
      cnpj: "12.345.678/0001-99",
      ie: "123.456.789.111",
      companyName: "Mercado & Empório Modelo LTDA",
      tradeName: "Empório Modelo",
      taxRegime: "SN",
      environment: "homologacao",
      nfeSeries: "1",
      nfceeSeries: "1",
      street: "Avenida Paulista",
      number: "1000",
      district: "Bela Vista",
      city: "São Paulo",
      state: "SP",
      zipCode: "01310-100",
      focusNfeToken: "token_demo_focus_nfe_12345",
      certUploaded: true,
      certExpiration: new Date("2027-12-31"),
    },
    create: {
      companyId: company.id,
      cnpj: "12.345.678/0001-99",
      ie: "123.456.789.111",
      companyName: "Mercado & Empório Modelo LTDA",
      tradeName: "Empório Modelo",
      taxRegime: "SN",
      environment: "homologacao",
      nfeSeries: "1",
      nfceeSeries: "1",
      street: "Avenida Paulista",
      number: "1000",
      district: "Bela Vista",
      city: "São Paulo",
      state: "SP",
      zipCode: "01310-100",
      focusNfeToken: "token_demo_focus_nfe_12345",
      certUploaded: true,
      certExpiration: new Date("2027-12-31"),
    },
  });

  console.log("✅ Configuração Fiscal & Certificado A1 Simulado configurados!");

  // 5. Categorias
  const catBebidas = await prisma.category.create({
    data: { name: "Bebidas", companyId: company.id },
  });
  const catMercearia = await prisma.category.create({
    data: { name: "Mercearia", companyId: company.id },
  });
  const catPadaria = await prisma.category.create({
    data: { name: "Padaria & Confeitaria", companyId: company.id },
  });
  const catFrios = await prisma.category.create({
    data: { name: "Frios & Laticínios", companyId: company.id },
  });

  console.log("✅ Categorias de demonstração criadas!");

  // 6. Produtos
  const productsData = [
    { name: "Café Gourmet Torrado 500g", barcode: "7891000123456", price: 24.90, cost: 14.50, stock: 120, unit: "UN", ncm: "0901.21.00", categoryId: catMercearia.id },
    { name: "Azeite de Oliva Extra Virgem 500ml", barcode: "7891000654321", price: 39.90, cost: 26.00, stock: 45, unit: "UN", ncm: "1509.10.00", categoryId: catMercearia.id },
    { name: "Vinho Tinto Reserva Cabernet 750ml", barcode: "7892000112233", price: 89.90, cost: 48.00, stock: 30, unit: "UN", ncm: "2204.21.00", categoryId: catBebidas.id },
    { name: "Cerveja Artesanal IPA 500ml", barcode: "7892000445566", price: 18.50, cost: 9.80, stock: 200, unit: "UN", ncm: "2203.00.00", categoryId: catBebidas.id },
    { name: "Queijo Parmesão Fracionado kg", barcode: "7893000778899", price: 79.90, cost: 45.00, stock: 15.5, unit: "KG", ncm: "0406.90.20", categoryId: catFrios.id },
    { name: "Presunto Pardo Artesanal kg", barcode: "7893000998877", price: 64.90, cost: 36.00, stock: 22.0, unit: "KG", ncm: "1602.41.00", categoryId: catFrios.id },
    { name: "Pão de Fermentação Natural 400g", barcode: "7894000123123", price: 16.90, cost: 6.20, stock: 40, unit: "UN", ncm: "1905.90.90", categoryId: catPadaria.id },
    { name: "Bolo de Rolo Pernambucano 500g", barcode: "7894000321321", price: 29.90, cost: 13.00, stock: 25, unit: "UN", ncm: "1905.90.90", categoryId: catPadaria.id },
  ];

  const createdProducts = [];
  for (const p of productsData) {
    const prod = await prisma.product.create({
      data: {
        name: p.name,
        barcode: p.barcode,
        price: p.price,
        cost: p.cost,
        stock: p.stock,
        unit: p.unit,
        ncm: p.ncm,
        categoryId: p.categoryId,
        companyId: company.id,
      },
    });
    createdProducts.push(prod);
  }

  console.log(`✅ ${createdProducts.length} Produtos de demonstração cadastrados!`);

  // 7. Clientes Demo
  const customer1 = await prisma.customer.create({
    data: {
      name: "Carlos Eduardo Silva",
      document: "111.222.333-44",
      email: "carlos.silva@email.com",
      phone: "(11) 98765-4321",
      address: "Av. Paulista, 1500 - São Paulo/SP",
      companyId: company.id,
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      name: "Restaurante e Bistro Sabor Divino LTDA",
      document: "98.765.432/0001-11",
      email: "contato@sabordivino.com.br",
      phone: "(11) 3344-5566",
      address: "Rua Augusta, 500 - São Paulo/SP",
      companyId: company.id,
    },
  });

  console.log("✅ Clientes de demonstração cadastrados!");

  // 8. Fornecedores Demo
  await prisma.supplier.create({
    data: {
      name: "Distribuidora de Bebidas Prime LTDA",
      document: "44.555.666/0001-88",
      email: "vendas@bebidasprime.com",
      phone: "(11) 4004-9900",
      companyId: company.id,
    },
  });

  // 9. Vendas & Notas Fiscais (NF-e / NFC-e) de Demonstração
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  // Venda 1 (Com NF-e Emitida e Autorizada)
  const sale1 = await prisma.sale.create({
    data: {
      subtotal: 219.70,
      discount: 10.00,
      total: 209.70,
      status: "COMPLETED",
      companyId: company.id,
      userId: userDemo.id,
      customerId: customer2.id,
      createdAt: twoDaysAgo,
      items: {
        create: [
          { productId: createdProducts[2].id, quantity: 2, unitPrice: 89.90, total: 179.80, companyId: company.id },
          { productId: createdProducts[3].id, quantity: 2, unitPrice: 18.50, total: 37.00, companyId: company.id },
        ],
      },
    },
  });

  // Nota Fiscal NF-e 001 Autorizada
  await prisma.invoice.create({
    data: {
      type: "NFe",
      number: "1001",
      series: "1",
      accessKey: "35260712345678000199550010000010011987654321",
      status: "AUTHORIZED",
      environment: "homologacao",
      xmlUrl: "https://sefaz.sp.gov.br/nfe/xml/demo-1001.xml",
      pdfUrl: "https://sefaz.sp.gov.br/nfe/danfe/demo-1001.pdf",
      companyId: company.id,
      createdAt: twoDaysAgo,
    },
  });

  // Venda 2 (Com NFC-e Emitida e Autorizada no PDV)
  const sale2 = await prisma.sale.create({
    data: {
      subtotal: 104.70,
      discount: 0.00,
      total: 104.70,
      status: "COMPLETED",
      companyId: company.id,
      userId: userDemo.id,
      customerId: customer1.id,
      createdAt: yesterday,
      items: {
        create: [
          { productId: createdProducts[0].id, quantity: 2, unitPrice: 24.90, total: 49.80, companyId: company.id },
          { productId: createdProducts[1].id, quantity: 1, unitPrice: 39.90, total: 39.90, companyId: company.id },
          { productId: createdProducts[6].id, quantity: 1, unitPrice: 16.90, total: 16.90, companyId: company.id },
        ],
      },
    },
  });

  // Nota Fiscal NFC-e 501 Autorizada
  await prisma.invoice.create({
    data: {
      type: "NFCe",
      number: "5001",
      series: "1",
      accessKey: "35260712345678000199650010000050011876543210",
      status: "AUTHORIZED",
      environment: "homologacao",
      xmlUrl: "https://sefaz.sp.gov.br/nfce/xml/demo-5001.xml",
      pdfUrl: "https://sefaz.sp.gov.br/nfce/danfe/demo-5001.pdf",
      companyId: company.id,
      createdAt: yesterday,
    },
  });

  // Venda 3 (Hoje)
  await prisma.sale.create({
    data: {
      subtotal: 144.80,
      discount: 5.00,
      total: 139.80,
      status: "COMPLETED",
      companyId: company.id,
      userId: userDemo.id,
      createdAt: now,
      items: {
        create: [
          { productId: createdProducts[4].id, quantity: 1, unitPrice: 79.90, total: 79.90, companyId: company.id },
          { productId: createdProducts[5].id, quantity: 1, unitPrice: 64.90, total: 64.90, companyId: company.id },
        ],
      },
    },
  });

  console.log("✅ Vendas e Notas Fiscais NF-e / NFC-e de demonstração geradas!");

  console.log("\n=======================================================");
  console.log("🎉 EMPRESA DE DEMONSTRAÇÃO PRONTA PARA APRESENTAÇÃO!");
  console.log("=======================================================");
  console.log("🏢 Empresa: Mercado & Empório Modelo LTDA");
  console.log("📄 Documento: 12.345.678/0001-99");
  console.log("👤 Usuário: teste (ou teste@emporio.com)");
  console.log("🔑 Senha: 123");
  console.log("=======================================================\n");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
