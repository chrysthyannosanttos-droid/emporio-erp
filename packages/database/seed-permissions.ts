import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Catálogo padronizado de permissões por módulo
const PERMISSIONS_CATALOG = [
  // ─── PDV ──────────────────────────────────────────────────────────
  { code: "pdv.open_cashier",    name: "Abrir caixa",               module: "PDV",         description: "Permite iniciar o turno do caixa" },
  { code: "pdv.close_cashier",   name: "Fechar caixa",              module: "PDV",         description: "Permite encerrar o turno do caixa" },
  { code: "pdv.cancel_sale",     name: "Cancelar venda",            module: "PDV",         description: "Permite cancelar cupom ou venda completa" },
  { code: "pdv.cancel_item",     name: "Cancelar item",             module: "PDV",         description: "Permite remover item registrado no cupom" },
  { code: "pdv.apply_discount",  name: "Aplicar desconto",          module: "PDV",         description: "Permite conceder desconto em item ou total" },
  { code: "pdv.change_price",    name: "Alterar preço",             module: "PDV",         description: "Permite alterar o preço unitário no PDV" },
  { code: "pdv.refund_sale",     name: "Estornar venda",            module: "PDV",         description: "Permite realizar estorno ou devolução" },
  { code: "pdv.bleed",           name: "Sangria de caixa",          module: "PDV",         description: "Permite retirar numerário do caixa" },
  { code: "pdv.supply",          name: "Suprimento de caixa",       module: "PDV",         description: "Permite adicionar fundo de troco no caixa" },
  { code: "pdv.reprint_receipt", name: "Reimpressão de cupom",      module: "PDV",         description: "Permite reimprimir cupons de vendas anteriores" },

  // ─── ESTOQUE ──────────────────────────────────────────────────────
  { code: "stock.inbound",       name: "Entrada de mercadoria",     module: "ESTOQUE",     description: "Permite dar entrada manual ou via XML" },
  { code: "stock.adjust",        name: "Ajuste de estoque",         module: "ESTOQUE",     description: "Permite corrigir saldo físico de produtos" },
  { code: "stock.loss",          name: "Registrar perda",           module: "ESTOQUE",     description: "Permite lançar perdas de produtos" },
  { code: "stock.damage",        name: "Registrar avaria",          module: "ESTOQUE",     description: "Permite registrar itens danificados/vencidos" },
  { code: "stock.inventory",     name: "Inventário",                module: "ESTOQUE",     description: "Permite abrir, contar e fechar inventário" },
  { code: "stock.transfer",      name: "Transferência entre lojas", module: "ESTOQUE",     description: "Permite transferir produtos para outra filial" },

  // ─── COMPRAS ──────────────────────────────────────────────────────
  { code: "purchases.create_order",  name: "Criar pedido",          module: "COMPRAS",     description: "Permite gerar pedidos de compra" },
  { code: "purchases.edit_order",    name: "Editar pedido",         module: "COMPRAS",     description: "Permite alterar pedidos em aberto" },
  { code: "purchases.approve_order", name: "Aprovar pedido",        module: "COMPRAS",     description: "Permite autorizar pedido para faturamento" },
  { code: "purchases.cancel_order",  name: "Cancelar pedido",       module: "COMPRAS",     description: "Permite cancelar pedidos de compra" },

  // ─── FINANCEIRO ───────────────────────────────────────────────────
  { code: "finance.create_entry",    name: "Criar lançamento",      module: "FINANCEIRO",  description: "Permite lançar contas a pagar/receber" },
  { code: "finance.edit_entry",      name: "Editar lançamento",     module: "FINANCEIRO",  description: "Permite modificar títulos e lançamentos" },
  { code: "finance.cancel_entry",    name: "Cancelar lançamento",   module: "FINANCEIRO",  description: "Permite cancelar títulos e contas" },
  { code: "finance.refund_entry",    name: "Estornar lançamento",   module: "FINANCEIRO",  description: "Permite estornar baixas e recebimentos" },
  { code: "finance.approve_payment", name: "Aprovar pagamento",     module: "FINANCEIRO",  description: "Permite autorizar pagamentos a fornecedores" },

  // ─── RELATÓRIOS ───────────────────────────────────────────────────
  { code: "reports.view",            name: "Visualizar relatórios", module: "RELATÓRIOS",  description: "Permite abrir telas e relatórios analíticos" },
  { code: "reports.export",          name: "Exportar relatórios",   module: "RELATÓRIOS",  description: "Permite baixar relatórios em PDF/Excel" },
  { code: "reports.view_financial",  name: "Visualizar financeiro", module: "RELATÓRIOS",  description: "Permite ver DRE, fluxo de caixa e custos" },
  { code: "reports.view_sales",      name: "Visualizar vendas",     module: "RELATÓRIOS",  description: "Permite ver ranking de vendas e curvas ABC" },

  // ─── ADMINISTRAÇÃO & CONFIGURAÇÕES ────────────────────────────────
  { code: "users.manage",            name: "Gerenciar usuários",    module: "CONFIGURAÇÕES", description: "Permite cadastrar e gerenciar operadores" },
  { code: "roles.manage",            name: "Gerenciar perfis",      module: "CONFIGURAÇÕES", description: "Permite alterar permissões e perfis" },
  { code: "approvals.manage",        name: "Central de liberações", module: "CONFIGURAÇÕES", description: "Permite aprovar e negar solicitações" },
  { code: "approvals.rules",         name: "Regras de alçada",      module: "CONFIGURAÇÕES", description: "Permite configurar limites de liberação" },
  { code: "audit.view",              name: "Visualizar auditoria",  module: "CONFIGURAÇÕES", description: "Permite consultar logs e histórico" },
  { code: "stores.manage",           name: "Gerenciar lojas",       module: "CONFIGURAÇÕES", description: "Permite cadastrar e editar filiais" },
];

// Matriz padrão de permissões por perfil
const ROLE_PERMISSIONS_MATRIX: Record<string, string[]> = {
  ADMIN: PERMISSIONS_CATALOG.map(p => p.code), // Admin tem todas as permissões

  MANAGER: [
    // PDV completo + autorizações
    "pdv.open_cashier", "pdv.close_cashier", "pdv.cancel_sale", "pdv.cancel_item",
    "pdv.apply_discount", "pdv.change_price", "pdv.refund_sale", "pdv.bleed", "pdv.supply", "pdv.reprint_receipt",
    // Estoque
    "stock.inbound", "stock.adjust", "stock.loss", "stock.damage", "stock.inventory", "stock.transfer",
    // Compras
    "purchases.create_order", "purchases.edit_order", "purchases.approve_order", "purchases.cancel_order",
    // Financeiro
    "finance.create_entry", "finance.edit_entry", "finance.cancel_entry", "finance.refund_entry", "finance.approve_payment",
    // Relatórios
    "reports.view", "reports.export", "reports.view_financial", "reports.view_sales",
    // Configurações
    "users.manage", "approvals.manage", "audit.view", "stores.manage",
  ],

  SUPERVISOR: [
    // PDV essencial + liberações de alçada média
    "pdv.open_cashier", "pdv.close_cashier", "pdv.cancel_item", "pdv.apply_discount",
    "pdv.bleed", "pdv.supply", "pdv.reprint_receipt",
    // Estoque operacional
    "stock.inbound", "stock.adjust", "stock.loss", "stock.damage", "stock.inventory",
    // Compras básico
    "purchases.create_order", "purchases.edit_order",
    // Financeiro básico
    "finance.create_entry",
    // Relatórios de vendas e auditoria
    "reports.view", "reports.view_sales", "approvals.manage", "audit.view",
  ],

  OPERATOR: [
    // Operações normais de caixa
    "pdv.open_cashier", "pdv.close_cashier", "pdv.reprint_receipt", "pdv.supply",
    // Contagem de estoque
    "stock.inventory",
  ],

  VIEWER: [
    // Apenas visualização
    "reports.view", "reports.view_sales",
  ],
};

async function main() {
  console.log("🚀 Iniciando Seed de Permissões, Perfis, Lojas e Regras de Alçadas...");

  // 1. Obter ou criar Empresa Principal
  let company = await prisma.company.findFirst();
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: "Mercado & Empório Modelo LTDA",
        document: "12.345.678/0001-99",
        licenseStatus: "ACTIVE",
      },
    });
  }
  console.log(`🏢 Empresa: ${company.name} (ID: ${company.id})`);

  // 2. Criar Lojas (Multi-Store)
  const store1 = await prisma.store.upsert({
    where: { companyId_code: { companyId: company.id, code: "LJ01" } },
    update: {
      name: "Loja 1 - Matriz Centro",
      tradeName: "Empório Matriz",
      document: "12.345.678/0001-99",
      city: "São Paulo",
      state: "SP",
      active: true,
    },
    create: {
      companyId: company.id,
      code: "LJ01",
      name: "Loja 1 - Matriz Centro",
      tradeName: "Empório Matriz",
      document: "12.345.678/0001-99",
      city: "São Paulo",
      state: "SP",
      active: true,
    },
  });

  const store2 = await prisma.store.upsert({
    where: { companyId_code: { companyId: company.id, code: "LJ02" } },
    update: {
      name: "Loja 2 - Filial Zona Sul",
      tradeName: "Empório Zona Sul",
      document: "12.345.678/0002-70",
      city: "São Paulo",
      state: "SP",
      active: true,
    },
    create: {
      companyId: company.id,
      code: "LJ02",
      name: "Loja 2 - Filial Zona Sul",
      tradeName: "Empório Zona Sul",
      document: "12.345.678/0002-70",
      city: "São Paulo",
      state: "SP",
      active: true,
    },
  });
  console.log(`🏬 Lojas criadas/atualizadas: ${store1.name}, ${store2.name}`);

  // 3. Cadastrar Catálogo de Permissões
  console.log("📦 Cadastrando catálogo de permissões...");
  const permissionMap = new Map<string, string>();
  for (const p of PERMISSIONS_CATALOG) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: { name: p.name, module: p.module, description: p.description },
      create: { code: p.code, name: p.name, module: p.module, description: p.description },
    });
    permissionMap.set(p.code, perm.id);
  }
  console.log(`✅ ${PERMISSIONS_CATALOG.length} permissões catalogadas.`);

  // 4. Criar Perfis Padrão (Roles) e Vincular Permissões
  console.log("🛡️ Configurando Perfis do Sistema...");
  const rolesDefinitions = [
    { key: "ADMIN",      name: "Administrador da Empresa", desc: "Acesso irrestrito a todas as funções e filiais", isSystem: true },
    { key: "MANAGER",    name: "Gerente Geral",            desc: "Gestão operacional, aprovações, financeiro e relatórios", isSystem: true },
    { key: "SUPERVISOR", name: "Supervisor de Loja",       desc: "Supervisão de frente de caixa, perdas e alçadas médias", isSystem: true },
    { key: "OPERATOR",   name: "Operador de Caixa / Loja", desc: "Operação padrão de vendas e frentes de caixa", isSystem: true },
    { key: "VIEWER",     name: "Usuário de Consulta",      desc: "Apenas visualização de relatórios e painéis", isSystem: true },
  ];

  const roleMap = new Map<string, string>();
  for (const r of rolesDefinitions) {
    const role = await prisma.role.upsert({
      where: { companyId_key: { companyId: company.id, key: r.key } },
      update: { name: r.name, description: r.desc, isSystem: r.isSystem },
      create: { companyId: company.id, key: r.key, name: r.name, description: r.desc, isSystem: r.isSystem },
    });
    roleMap.set(r.key, role.id);

    // Vincular permissões da matriz
    const allowedCodes = ROLE_PERMISSIONS_MATRIX[r.key] || [];
    for (const code of allowedCodes) {
      const permId = permissionMap.get(code);
      if (permId) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permId } },
          update: {},
          create: { roleId: role.id, permissionId: permId },
        });
      }
    }
  }
  console.log("✅ Perfis e matrizes de permissões vinculados!");

  // 5. Configurar Regras de Alçadas de Liberação (ApprovalRules)
  console.log("⚖️ Configurando Regras de Liberação e Alçadas...");
  const rules = [
    // Cancelamento de Venda: até R$50 operador, R$50-200 supervisor, >R$200 gerente
    { operation: "pdv.cancel_sale", name: "Cancelamento de Venda (Até R$ 50)", minValue: 0, maxValue: 50, minRole: "OPERATOR", requiresPin: false },
    { operation: "pdv.cancel_sale", name: "Cancelamento de Venda (R$ 50 a R$ 200)", minValue: 50.01, maxValue: 200, minRole: "SUPERVISOR", requiresPin: true },
    { operation: "pdv.cancel_sale", name: "Cancelamento de Venda (Acima de R$ 200)", minValue: 200.01, maxValue: null, minRole: "MANAGER", requiresPin: true },

    // Descontos no PDV: até 5% operador, até 10% supervisor, >10% gerente
    { operation: "pdv.apply_discount", name: "Desconto no PDV (Até 5%)", minValue: 0, maxValue: 5, minRole: "OPERATOR", requiresPin: false },
    { operation: "pdv.apply_discount", name: "Desconto no PDV (5% a 10%)", minValue: 5.01, maxValue: 10, minRole: "SUPERVISOR", requiresPin: true },
    { operation: "pdv.apply_discount", name: "Desconto no PDV (Acima de 10%)", minValue: 10.01, maxValue: null, minRole: "MANAGER", requiresPin: true },

    // Cancelamento de Item
    { operation: "pdv.cancel_item", name: "Cancelamento de Item (Até R$ 30)", minValue: 0, maxValue: 30, minRole: "OPERATOR", requiresPin: false },
    { operation: "pdv.cancel_item", name: "Cancelamento de Item (Acima de R$ 30)", minValue: 30.01, maxValue: null, minRole: "SUPERVISOR", requiresPin: true },

    // Sangria e Estorno
    { operation: "pdv.bleed", name: "Sangria de Caixa", minValue: 0, maxValue: null, minRole: "SUPERVISOR", requiresPin: true },
    { operation: "pdv.refund_sale", name: "Estorno de Venda", minValue: 0, maxValue: null, minRole: "MANAGER", requiresPin: true },
    { operation: "stock.loss", name: "Registro de Perda de Estoque", minValue: 0, maxValue: 200, minRole: "SUPERVISOR", requiresPin: true },
  ];

  await prisma.approvalRule.deleteMany({ where: { companyId: company.id } });
  for (const rule of rules) {
    await prisma.approvalRule.create({
      data: {
        companyId: company.id,
        operation: rule.operation,
        name: rule.name,
        minValue: rule.minValue,
        maxValue: rule.maxValue,
        minRole: rule.minRole,
        requiresPin: rule.requiresPin,
        active: true,
      },
    });
  }
  console.log("✅ Regras de alçadas cadastradas!");

  // 6. Cadastrar / Atualizar Usuários da Hierarquia de Teste
  console.log("👥 Configurando usuários de demonstração da hierarquia...");
  const sampleUsers = [
    { name: "Carlos Administrador", email: "admin.empresa@emporio.com", password: "123", pin: "1234", role: "ADMIN", stores: [store1.id, store2.id] },
    { name: "Mariana Gerente",      email: "gerente@emporio.com",       password: "123", pin: "4321", role: "MANAGER", stores: [store1.id, store2.id] },
    { name: "Roberto Supervisor",   email: "supervisor@emporio.com",    password: "123", pin: "8888", role: "SUPERVISOR", stores: [store1.id] },
    { name: "teste",                email: "teste@emporio.com",         password: "123", pin: "1111", role: "OPERATOR", stores: [store1.id] },
    { name: "Lucas Consulta",       email: "consulta@emporio.com",      password: "123", pin: "0000", role: "VIEWER", stores: [store1.id] },
  ];

  for (const u of sampleUsers) {
    const hashedPassword = await bcrypt.hash(u.password, 10);
    const hashedPin = u.pin ? await bcrypt.hash(u.pin, 10) : null;
    const roleId = roleMap.get(u.role);

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        roleId,
        password: hashedPassword,
        pin: hashedPin,
        active: true,
      },
      create: {
        name: u.name,
        email: u.email,
        role: u.role,
        roleId,
        password: hashedPassword,
        pin: hashedPin,
        companyId: company.id,
        active: true,
      },
    });

    // Vincular Lojas
    for (const storeId of u.stores) {
      await prisma.userStore.upsert({
        where: { userId_storeId: { userId: user.id, storeId } },
        update: { isDefault: storeId === u.stores[0] },
        create: { userId: user.id, storeId, isDefault: storeId === u.stores[0] },
      });
    }
  }

  // 7. Criar Solicitações e Logs de Auditoria de Demonstração
  const demoOperator = await prisma.user.findFirst({ where: { email: "teste@emporio.com" } });
  const demoManager = await prisma.user.findFirst({ where: { email: "gerente@emporio.com" } });

  if (demoOperator && demoManager) {
    await prisma.approvalRequest.deleteMany({ where: { companyId: company.id } });
    
    // Solicitação 1: Pendente
    await prisma.approvalRequest.create({
      data: {
        companyId: company.id,
        storeId: store1.id,
        requesterId: demoOperator.id,
        operation: "pdv.cancel_sale",
        value: 285.50,
        reason: "Cliente desistiu da compra por esquecimento de cartão de crédito",
        terminal: "PDV-01 (Caixa Frente)",
        status: "PENDING",
      },
    });

    // Solicitação 2: Aprovada
    await prisma.approvalRequest.create({
      data: {
        companyId: company.id,
        storeId: store1.id,
        requesterId: demoOperator.id,
        approverId: demoManager.id,
        operation: "pdv.apply_discount",
        value: 15.00, // 15%
        reason: "Desconto de fidelidade autorizado para compra no atacado",
        terminal: "PDV-01 (Caixa Frente)",
        status: "APPROVED",
        authorizedAt: new Date(),
      },
    });

    // Log de auditoria inicial
    await prisma.auditLog.deleteMany({ where: { companyId: company.id } });
    await prisma.auditLog.create({
      data: {
        companyId: company.id,
        storeId: store1.id,
        userId: demoOperator.id,
        authorizerId: demoManager.id,
        operation: "pdv.apply_discount",
        action: "APPROVE",
        entity: "Sale",
        oldValue: "Desconto: 0%",
        newValue: "Desconto: 15%",
        reason: "Desconto de fidelidade autorizado para compra no atacado",
        terminal: "PDV-01",
        ipAddress: "127.0.0.1",
        result: "SUCCESS",
      },
    });
  }

  console.log("\n=======================================================");
  console.log("🎉 SISTEMA DE ACESSO, PERMISSÕES E LIBERAÇÕES CONFIGURADO!");
  console.log("=======================================================");
  console.log("👑 Super Admin (Master): cristiano (91126395)");
  console.log("👔 Administrador Empresa: admin.empresa@emporio.com (123 | PIN: 1234)");
  console.log("💼 Gerente: gerente@emporio.com (123 | PIN: 4321)");
  console.log("🎯 Supervisor: supervisor@emporio.com (123 | PIN: 8888)");
  console.log("🛒 Operador Caixa: teste (123 | PIN: 1111)");
  console.log("📊 Consulta: consulta@emporio.com (123 | PIN: 0000)");
  console.log("=======================================================\n");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
