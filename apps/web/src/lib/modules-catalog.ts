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
  { key: "ECOMMERCE", name: "E-commerce & Delivery", description: "Loja virtual e controle de pedidos de entrega", icon: "ShoppingBag", category: "SALES", defaultActiveFor: ["RETAIL", "FOOD"] },
  { key: "CRM", name: "CRM & Fidelidade", description: "Pontos, cashback e campanhas para clientes", icon: "HeartHandshake", category: "SALES", defaultActiveFor: ["RETAIL", "DISTRIBUTOR"] },
  { key: "RETURNS", name: "Trocas & Devoluções", description: "Gestão de trocas com geração de crédito ao cliente", icon: "ArrowLeftRight", category: "SALES", defaultActiveFor: ["RETAIL", "DISTRIBUTOR"] },
  // Estoque & Suprimentos
  { key: "STOCK", name: "Gestão de Estoque", description: "Controle de produtos, movimentações e inventário", icon: "Package", category: "OPERATIONS", defaultActiveFor: ["RETAIL", "DISTRIBUTOR", "FACTORY", "FOOD"] },
  { key: "MERCADOLOGICO", name: "Estrutura Mercadológica", description: "Departamentos, seções e categorias de produtos", icon: "FolderTree", category: "OPERATIONS", defaultActiveFor: ["RETAIL", "DISTRIBUTOR"] },
  { key: "PURCHASES", name: "Pedidos de Compra", description: "Cotações e ordens de compra de fornecedores", icon: "ShoppingCart", category: "OPERATIONS", defaultActiveFor: ["RETAIL", "DISTRIBUTOR", "FACTORY"] },
  { key: "FISCAL_RADAR", name: "Radar XML / Entrada NF-e", description: "Importação e manifestação automática de notas fiscais", icon: "FileText", category: "OPERATIONS", defaultActiveFor: ["RETAIL", "DISTRIBUTOR", "FACTORY"] },
  { key: "WAREHOUSES", name: "Armazéns & CDs", description: "Controle por depósitos, filiais e transferências", icon: "Landmark", category: "OPERATIONS", defaultActiveFor: ["DISTRIBUTOR", "FACTORY"] },
  { key: "LOSSES", name: "Perdas & Validades", description: "Controle de lotes, produtos a vencer e avarias", icon: "AlertTriangle", category: "OPERATIONS", defaultActiveFor: ["RETAIL", "DISTRIBUTOR", "FACTORY", "FOOD"] },
  // Financeiro
  { key: "FINANCE", name: "Financeiro & Caixa", description: "Contas a pagar/receber e fluxo de caixa", icon: "Wallet", category: "FINANCE", defaultActiveFor: ["RETAIL", "DISTRIBUTOR", "FACTORY", "FOOD"] },
  { key: "PRICING", name: "Margens & Precificação", description: "Cálculo de margem, markup e preço sugerido", icon: "Percent", category: "FINANCE", defaultActiveFor: ["RETAIL", "DISTRIBUTOR", "FACTORY"] },
  { key: "PRICE_TABLES", name: "Tabelas de Preço B2B", description: "Múltiplas tabelas (Varejo, Atacado, Distribuição)", icon: "Tag", category: "FINANCE", defaultActiveFor: ["DISTRIBUTOR", "FACTORY"] },
  { key: "FISCAL", name: "Grade & Fechamento Fiscal", description: "Emissão de NF-e, Sped e parametrização fiscal", icon: "Landmark", category: "FINANCE", defaultActiveFor: ["RETAIL", "DISTRIBUTOR", "FACTORY"] },
  // Logística
  { key: "DISTRIBUTION_ORDERS", name: "Pedidos de Venda B2B", description: "Orçamentos, pedidos faturados e faturamento em lote", icon: "ClipboardList", category: "LOGISTICS", defaultActiveFor: ["DISTRIBUTOR", "FACTORY"] },
  { key: "SELLERS", name: "Gestão de Vendedores", description: "Comissões, metas e carteira de clientes", icon: "Users", category: "LOGISTICS", defaultActiveFor: ["DISTRIBUTOR", "FACTORY"] },
  { key: "EXPEDITION", name: "Expedição & Picking", description: "Separação, conferência por barcode e embalagem", icon: "Truck", category: "LOGISTICS", defaultActiveFor: ["DISTRIBUTOR", "FACTORY"] },
  { key: "ROUTES", name: "Rotas & Entregas", description: "Gestão de frotas, motoristas e sequenciamento de entregas", icon: "Truck", category: "LOGISTICS", defaultActiveFor: ["DISTRIBUTOR", "FACTORY"] },
  // Produção
  { key: "PRODUCTION", name: "Ordem de Produção (OP)", description: "Ordens de produção industriais, insumos e custos", icon: "Hammer", category: "PRODUCTION", defaultActiveFor: ["FACTORY", "FOOD"] },
  { key: "RECIPES", name: "Ficha Técnica & Fórmulas", description: "Composição de produtos, rendimento e modo de preparo", icon: "BookOpen", category: "PRODUCTION", defaultActiveFor: ["FACTORY", "FOOD"] },
  { key: "QUALITY_CONTROL", name: "Controle de Qualidade", description: "Inspeção de lotes e laudos de fabricação", icon: "ShieldCheck", category: "PRODUCTION", defaultActiveFor: ["FACTORY"] },
  // Restaurante
  { key: "RESTAURANT", name: "Módulo Restaurante / KDS", description: "Comandas, controle de mesas e tela da cozinha", icon: "Utensils", category: "SALES", defaultActiveFor: ["FOOD"] },
  // Gestão
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
