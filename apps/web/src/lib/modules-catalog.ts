// Catálogo de módulos e presets de segmento — arquivo de dados puro (sem "use server")

export interface SystemModuleInfo {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: "SALES" | "OPERATIONS" | "FINANCE" | "PRODUCTION" | "LOGISTICS" | "MANAGEMENT";
  defaultActiveFor: string[];
}

export const SYSTEM_MODULES_CATALOG: SystemModuleInfo[] = [
  // Varejo / Frente de Loja
  { key: "PDV", name: "Frente de Caixa (PDV)", description: "Ponto de venda com emissão de NFC-e e cupom", icon: "Store", category: "SALES", defaultActiveFor: ["RETAIL", "FOOD"] },
  { key: "ECOMMERCE", name: "Cardápio Digital & E-commerce", description: "Loja virtual e controle de pedidos de entrega", icon: "ShoppingBag", category: "SALES", defaultActiveFor: ["RETAIL", "FOOD"] },
  { key: "HOTEL_TABS", name: "Comandas & Quartos (Hotel/Pousada)", description: "Controle de comandas de consumo e apartamentos", icon: "BedDouble", category: "SALES", defaultActiveFor: ["FOOD", "RETAIL"] },
  { key: "CRM", name: "Clientes & Fidelidade (CRM)", description: "Cadastro de clientes, crédito e fidelização", icon: "Users", category: "SALES", defaultActiveFor: ["RETAIL", "DISTRIBUTOR"] },
  { key: "CONTRACTS", name: "Contratos de Venda", description: "Gestão e impressão de contratos de fornecimento", icon: "FileText", category: "SALES", defaultActiveFor: ["DISTRIBUTOR"] },
  { key: "RETURNS", name: "Trocas & Devoluções", description: "Gestão de trocas com geração de crédito ao cliente", icon: "ArrowLeftRight", category: "SALES", defaultActiveFor: ["RETAIL", "DISTRIBUTOR"] },
  // Estoque & Suprimentos
  { key: "STOCK", name: "Estoque & Produtos", description: "Controle de produtos, movimentações e inventário", icon: "Package", category: "OPERATIONS", defaultActiveFor: ["RETAIL", "DISTRIBUTOR", "FACTORY", "FOOD"] },
  { key: "COI", name: "Operações de Estoque (COI)", description: "Centros de operação interna e movimentações específicas", icon: "Sliders", category: "OPERATIONS", defaultActiveFor: ["RETAIL", "DISTRIBUTOR"] },
  { key: "MERCADOLOGICO", name: "Estrutura Mercadológica", description: "Departamentos, seções e categorias de produtos", icon: "FolderTree", category: "OPERATIONS", defaultActiveFor: ["RETAIL", "DISTRIBUTOR"] },
  { key: "PURCHASES", name: "Pedidos de Compra & Cotações", description: "Cotações e ordens de compra de fornecedores", icon: "ShoppingCart", category: "OPERATIONS", defaultActiveFor: ["RETAIL", "DISTRIBUTOR", "FACTORY"] },
  { key: "SUPPLIERS", name: "Fornecedores", description: "Cadastro e gestão de fornecedores parceiros", icon: "Truck", category: "OPERATIONS", defaultActiveFor: ["RETAIL", "DISTRIBUTOR", "FACTORY", "FOOD"] },
  { key: "FISCAL_RADAR", name: "Radar XML / Entrada NF-e", description: "Importação e manifestação automática de notas fiscais", icon: "Receipt", category: "OPERATIONS", defaultActiveFor: ["RETAIL", "DISTRIBUTOR", "FACTORY"] },
  { key: "LOSSES", name: "Avarias & Perdas", description: "Controle de descartes, avarias e quebras de estoque", icon: "AlertTriangle", category: "OPERATIONS", defaultActiveFor: ["RETAIL", "DISTRIBUTOR", "FACTORY", "FOOD"] },
  { key: "EXPIRATIONS", name: "Controle de Validades", description: "Monitoramento de lotes e produtos próximos ao vencimento", icon: "Calendar", category: "OPERATIONS", defaultActiveFor: ["RETAIL", "DISTRIBUTOR", "FOOD"] },
  { key: "ASSETS", name: "Ativo Imobilizado", description: "Patrimônio, equipamentos e bens da empresa", icon: "Shield", category: "OPERATIONS", defaultActiveFor: ["RETAIL", "DISTRIBUTOR", "FACTORY"] },
  { key: "LABELS", name: "Impressão de Etiquetas", description: "Etiquetas de gôndola, preço e código de barras", icon: "Tag", category: "OPERATIONS", defaultActiveFor: ["RETAIL"] },
  { key: "SCALES", name: "Balanças (Toledo MGV6)", description: "Carga de balanças e exportação de itens pesáveis", icon: "Scale", category: "OPERATIONS", defaultActiveFor: ["RETAIL"] },
  { key: "WAREHOUSES", name: "Armazéns & CDs", description: "Controle por depósitos, filiais e transferências", icon: "Landmark", category: "OPERATIONS", defaultActiveFor: ["DISTRIBUTOR", "FACTORY"] },
  // Financeiro
  { key: "FINANCE", name: "Financeiro Completo", description: "Contas a pagar/receber e fluxo de caixa", icon: "Wallet", category: "FINANCE", defaultActiveFor: ["RETAIL", "DISTRIBUTOR", "FACTORY", "FOOD"] },
  { key: "RECONCILIATION", name: "Conciliação Bancária", description: "Extratos bancários e conciliação de lançamentos", icon: "Landmark", category: "FINANCE", defaultActiveFor: ["RETAIL", "DISTRIBUTOR", "FACTORY"] },
  { key: "CASH_CLOSINGS", name: "Fechamento & Tesouraria", description: "Conferência de caixas e fechamento de períodos", icon: "Receipt", category: "FINANCE", defaultActiveFor: ["RETAIL", "FOOD"] },
  { key: "PRICING", name: "Margens & Precificação", description: "Cálculo de margem, markup e preço sugerido", icon: "Percent", category: "FINANCE", defaultActiveFor: ["RETAIL", "DISTRIBUTOR", "FACTORY"] },
  { key: "PRICE_TABLES", name: "Tabelas de Preço B2B", description: "Múltiplas tabelas (Varejo, Atacado, Distribuição)", icon: "Tag", category: "FINANCE", defaultActiveFor: ["DISTRIBUTOR", "FACTORY"] },
  { key: "FISCAL", name: "Grade Fiscal & Decretos AL", description: "Emissão de NF-e, Sped e parametrização fiscal", icon: "Scale", category: "FINANCE", defaultActiveFor: ["RETAIL", "DISTRIBUTOR", "FACTORY"] },
  // Logística & Vendas B2B
  { key: "DISTRIBUTION_ORDERS", name: "Pedidos de Venda B2B", description: "Orçamentos, pedidos faturados e faturamento em lote", icon: "ClipboardList", category: "LOGISTICS", defaultActiveFor: ["DISTRIBUTOR", "FACTORY"] },
  { key: "SELLERS", name: "Gestão de Vendedores", description: "Comissões, metas e carteira de clientes", icon: "Users", category: "LOGISTICS", defaultActiveFor: ["DISTRIBUTOR", "FACTORY"] },
  { key: "EXPEDITION", name: "Expedição & Picking", description: "Separação, conferência por barcode e embalagem", icon: "Truck", category: "LOGISTICS", defaultActiveFor: ["DISTRIBUTOR", "FACTORY"] },
  { key: "ROUTES", name: "Rotas & Entregas", description: "Gestão de frotas, motoristas e sequenciamento de entregas", icon: "Truck", category: "LOGISTICS", defaultActiveFor: ["DISTRIBUTOR", "FACTORY"] },
  // Produção & Indústria
  { key: "PRODUCTION", name: "Produção Própria (OP)", description: "Ordens de produção industriais, insumos e custos", icon: "Hammer", category: "PRODUCTION", defaultActiveFor: ["FACTORY", "FOOD"] },
  { key: "RECIPES", name: "Fichas Técnicas & Receitas", description: "Composição de produtos, rendimento e modo de preparo", icon: "BookOpen", category: "PRODUCTION", defaultActiveFor: ["FACTORY", "FOOD"] },
  { key: "QUALITY_CONTROL", name: "Controle de Qualidade", description: "Inspeção de lotes e laudos de fabricação", icon: "ShieldCheck", category: "PRODUCTION", defaultActiveFor: ["FACTORY"] },
  // Restaurante
  { key: "RESTAURANT", name: "Módulo Restaurante / KDS", description: "Comandas, controle de mesas e tela da cozinha", icon: "Utensils", category: "SALES", defaultActiveFor: ["FOOD"] },
  // Gestão & Sistema
  { key: "MIGRATION", name: "Migração Saipos / Importação", description: "Migração e sincronização de dados Saipos e relatórios", icon: "RefreshCw", category: "MANAGEMENT", defaultActiveFor: ["RETAIL", "FOOD"] },
  { key: "HR", name: "Recursos Humanos (RH)", description: "Cadastro de colaboradores e equipes", icon: "Users", category: "MANAGEMENT", defaultActiveFor: ["RETAIL", "DISTRIBUTOR", "FACTORY"] },
  { key: "REPORTS", name: "Relatórios & BI", description: "Dashboards analíticos e exportação de dados", icon: "BarChart2", category: "MANAGEMENT", defaultActiveFor: ["RETAIL", "DISTRIBUTOR", "FACTORY", "FOOD"] },
  { key: "APPROVALS", name: "Central de Liberações", description: "Alçadas e aprovações de descontos/cancelamentos", icon: "ShieldAlert", category: "MANAGEMENT", defaultActiveFor: ["RETAIL", "DISTRIBUTOR", "FACTORY"] },
];

export const SEGMENT_PRESETS: Record<string, { label: string; operationTypes: string[]; modules: string[] }> = {
  SUPERMARKET: {
    label: "RP Supermercado / Varejo",
    operationTypes: ["RETAIL"],
    modules: ["PDV", "STOCK", "MERCADOLOGICO", "PURCHASES", "FISCAL_RADAR", "LOSSES", "FINANCE", "PRICING", "FISCAL", "HR", "REPORTS", "APPROVALS"],
  },
  BAKERY: {
    label: "RP Padaria & Confeitaria",
    operationTypes: ["RETAIL", "PRODUCTION", "FOOD"],
    modules: ["PDV", "STOCK", "RECIPES", "PRODUCTION", "PURCHASES", "LOSSES", "FINANCE", "PRICING", "FISCAL", "HR", "REPORTS"],
  },
  RESTAURANT: {
    label: "RP Restaurante / Pizzaria / Lanchonete",
    operationTypes: ["FOOD"],
    modules: ["PDV", "RESTAURANT", "RECIPES", "ECOMMERCE", "STOCK", "PURCHASES", "FINANCE", "FISCAL", "REPORTS"],
  },
  DISTRIBUTOR: {
    label: "RP Distribuidora & Atacado",
    operationTypes: ["DISTRIBUTOR", "WHOLESALE"],
    modules: ["DISTRIBUTION_ORDERS", "PRICE_TABLES", "SELLERS", "EXPEDITION", "ROUTES", "WAREHOUSES", "STOCK", "PURCHASES", "FISCAL_RADAR", "FINANCE", "PRICING", "FISCAL", "CRM", "RETURNS", "REPORTS"],
  },
  FACTORY: {
    label: "RP Indústria & Fábrica",
    operationTypes: ["FACTORY", "PRODUCTION"],
    modules: ["PRODUCTION", "RECIPES", "QUALITY_CONTROL", "WAREHOUSES", "STOCK", "PURCHASES", "FISCAL_RADAR", "FINANCE", "PRICING", "FISCAL", "REPORTS"],
  },
  ENTERPRISE: {
    label: "RP Multissetorial Enterprise (Todas as Funções)",
    operationTypes: ["RETAIL", "DISTRIBUTOR", "FACTORY", "FOOD"],
    modules: SYSTEM_MODULES_CATALOG.map(m => m.key),
  },
};
