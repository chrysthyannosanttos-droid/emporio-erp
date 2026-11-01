// ─────────────────────────────────────────────────────────────────────────────
// MATRIZ COMPLETA DE PERMISSÕES TÍPICAS DE SUPERMERCADO & PDV
// ─────────────────────────────────────────────────────────────────────────────
export const SUPERMARKET_PERMISSIONS = [
  // 1. Frente de Caixa & PDV
  { code: "pdv.access", name: "Acesso ao PDV", module: "Frente de Caixa (PDV)", description: "Permite abrir o PDV e realizar login no caixa" },
  { code: "pdv.sale", name: "Registrar Vendas", module: "Frente de Caixa (PDV)", description: "Passar itens no leitor, carrinho e receber pagamentos" },
  { code: "pdv.price_check", name: "Consulta de Preço (F4)", module: "Frente de Caixa (PDV)", description: "Consultar preços de mercadorias no terminal" },
  { code: "pdv.discount.limited", name: "Aplicar Desconto Padrão (até 5%)", module: "Frente de Caixa (PDV)", description: "Conceder descontos manuais dentro do limite do operador" },
  { code: "pdv.discount.unlimited", name: "Desconto Livre / Acima do Limite", module: "Frente de Caixa (PDV)", description: "Aplicar descontos especiais sem limite percentual" },
  { code: "pdv.cancel_item", name: "Cancelar Item do Cupom", module: "Frente de Caixa (PDV)", description: "Excluir produtos já registrados no cupom fiscal" },
  { code: "pdv.cancel_sale", name: "Cancelar Venda Inteira (ESC)", module: "Frente de Caixa (PDV)", description: "Cancelar venda completa com itens em andamento" },
  { code: "pdv.withdrawal", name: "Realizar Sangria", module: "Frente de Caixa (PDV)", description: "Retirar dinheiro da gaveta do caixa para o cofre" },
  { code: "pdv.supplement", name: "Realizar Suprimento", module: "Frente de Caixa (PDV)", description: "Entrada de troco ou reforço de dinheiro na gaveta" },
  { code: "pdv.closing", name: "Fechamento de Caixa", module: "Frente de Caixa (PDV)", description: "Realizar contagem cega e encerrar o turno do PDV" },
  { code: "pdv.reprint", name: "Reimprimir Cupom", module: "Frente de Caixa (PDV)", description: "Reimprimir comprovantes fiscais e não-fiscais anteriores" },
  { code: "pdv.offline_force", name: "Contingência Offline", module: "Frente de Caixa (PDV)", description: "Operar em modo contingência local quando sem internet" },
  { code: "pdv.supervisor_auth", name: "Autorizar Liberações com PIN", module: "Frente de Caixa (PDV)", description: "Atuar como fiscal de caixa e liberar cancelamentos/descontos com PIN" },

  // 2. Estoque, Compras & Depósito
  { code: "stock.view", name: "Consultar Estoque", module: "Estoque & Mercadológico", description: "Ver produtos cadastrados e saldo físico em estoque" },
  { code: "stock.create_edit", name: "Cadastrar e Alterar Produtos", module: "Estoque & Mercadológico", description: "Cadastrar novos produtos, código de barras, NCM e tributação" },
  { code: "stock.delete", name: "Excluir Produtos", module: "Estoque & Mercadológico", description: "Remover produtos do cadastro do supermercado" },
  { code: "stock.costs.view", name: "Visualizar Custo de Compra", module: "Estoque & Mercadológico", description: "Ver preço de custo pago ao fornecedor e margem bruta" },
  { code: "stock.pricing.change", name: "Alterar Preço de Venda", module: "Estoque & Mercadológico", description: "Modificar preços de venda na retaguarda e promoções" },
  { code: "stock.inventory", name: "Realizar Inventário", module: "Estoque & Mercadológico", description: "Fazer contagem de estoque e ajustes de balanço" },
  { code: "stock.invoices.import", name: "Entrada de Notas & XML", module: "Estoque & Mercadológico", description: "Importar XML de fornecedores e alimentar o estoque" },
  { code: "stock.losses", name: "Lançar Quebras e Perdas", module: "Estoque & Mercadológico", description: "Registrar mercadorias avariadas, vencidas ou desossa" },
  { code: "stock.labels", name: "Impressão de Etiquetas", module: "Estoque & Mercadológico", description: "Imprimir etiquetas de gôndola e cartazes de oferta" },
  { code: "stock.suppliers", name: "Gerenciar Fornecedores", module: "Estoque & Mercadológico", description: "Cadastro e cotações com fornecedores" },

  // 3. Perecíveis & Balanças (Açougue / FLV / Padaria / Frios)
  { code: "scale.view", name: "Consultar Produtos de Balança", module: "Balanças & Perecíveis", description: "Ver produtos com código de balança (PLU pesáveis)" },
  { code: "scale.export", name: "Exportar Carga Toledo MGV6", module: "Balanças & Perecíveis", description: "Gerar arquivo ITENSMGV.TXT para carga das balanças Prix" },
  { code: "scale.config", name: "Configurar Parâmetros de Balança", module: "Balanças & Perecíveis", description: "Definir departamentos, dias de validade e setores" },

  // 4. Financeiro & Tesouraria
  { code: "finance.cash_audit", name: "Auditoria & Conferência de Caixas", module: "Financeiro & Faturamento", description: "Conferir fechamento cego de caixas e diferenças de valores" },
  { code: "finance.pos_conciliation", name: "Conciliação de Cartões POS / TEF", module: "Financeiro & Faturamento", description: "Conferência de taxas de maquinetas e comprovantes" },
  { code: "finance.payables", name: "Contas a Pagar e Receber", module: "Financeiro & Faturamento", description: "Gestão de despesas, boletos e recebimentos" },
  { code: "finance.reports", name: "Relatórios de Vendas e Faturamento", module: "Financeiro & Faturamento", description: "Ver relatórios de faturamento diário, mensal e formas de pagamento" },
  { code: "finance.profit", name: "Lucro & DRE da Loja", module: "Financeiro & Faturamento", description: "Visualizar margem líquida, lucratividade e DRE" },

  // 5. Fiscal (NFC-e / NF-e)
  { code: "fiscal.emit", name: "Emissão de NFC-e / NF-e", module: "Fiscal & Tributário", description: "Emitir cupons fiscais e notas fiscais eletrônicas" },
  { code: "fiscal.cancel", name: "Cancelar Documentos Fiscais", module: "Fiscal & Tributário", description: "Cancelar notas emitidas dentro do prazo legal da SEFAZ" },
  { code: "fiscal.inutilization", name: "Inutilizar Numeração Fiscal", module: "Fiscal & Tributário", description: "Inutilizar quebra de sequência numérica de notas" },
  { code: "fiscal.config", name: "Configurações Fiscais & Certificado", module: "Fiscal & Tributário", description: "Configurar Certificado Digital A1, CSC e ambiente de emissão" },

  // 6. Configurações & Gestão
  { code: "settings.users", name: "Gerenciar Usuários & Permissões", module: "Configurações & Acesso", description: "Criar colaboradores, alterar cargos, PINs e permissões" },
  { code: "settings.terminals", name: "Gerenciar Terminais PDV", module: "Configurações & Acesso", description: "Cadastrar e gerar códigos de ativação de caixas" },
  { code: "settings.stores", name: "Gerenciar Lojas & Filiais", module: "Configurações & Acesso", description: "Cadastro e parâmetros das lojas da rede" },
];

// ─────────────────────────────────────────────────────────────────────────────
// GRUPOS DE SETORES PRÉ-DEFINIDOS DE SUPERMERCADO
// ─────────────────────────────────────────────────────────────────────────────
export const SUPERMARKET_DEFAULT_ROLES = [
  {
    key: "OPERATOR",
    name: "Operador de Caixa",
    sector: "Frente de Caixa",
    description: "Atendimento no caixa. Registra vendas, consulta preços, recebe pagamentos, sangrias e fechamento. Bloqueado para cancelamentos sem fiscal de caixa.",
    color: "emerald",
    isSystem: true,
    permissionCodes: [
      "pdv.access",
      "pdv.sale",
      "pdv.price_check",
      "pdv.discount.limited",
      "pdv.withdrawal",
      "pdv.supplement",
      "pdv.closing",
      "fiscal.emit",
    ]
  },
  {
    key: "SUPERVISOR",
    name: "Fiscal de Caixa & Supervisão",
    sector: "Frente de Caixa & Salão",
    description: "Líder de frente de caixa. Autoriza cancelamentos de itens, cancelamentos de cupom, descontos especiais, contingência e sangrias com seu PIN.",
    color: "amber",
    isSystem: true,
    permissionCodes: [
      "pdv.access",
      "pdv.sale",
      "pdv.price_check",
      "pdv.discount.limited",
      "pdv.discount.unlimited",
      "pdv.cancel_item",
      "pdv.cancel_sale",
      "pdv.withdrawal",
      "pdv.supplement",
      "pdv.closing",
      "pdv.reprint",
      "pdv.offline_force",
      "pdv.supervisor_auth",
      "fiscal.emit",
    ]
  },
  {
    key: "STOCKIST",
    name: "Encarregado de Estoque & Depósito",
    sector: "Depósito & Mercearia",
    description: "Recebimento de mercadorias, entrada de notas XML, contagem de inventário, registro de perdas/vencidos e impressão de etiquetas de gôndola.",
    color: "blue",
    isSystem: true,
    permissionCodes: [
      "stock.view",
      "stock.create_edit",
      "stock.inventory",
      "stock.invoices.import",
      "stock.losses",
      "stock.labels",
      "stock.suppliers",
    ]
  },
  {
    key: "SCALE_SECTOR",
    name: "Encarregado de Balança & Perecíveis",
    sector: "Açougue, Hortifrúti (FLV) & Padaria",
    description: "Pesagem e setores de perecíveis. Configura produtos pesáveis, gera arquivos de carga para balanças Toledo Prix e lança quebras/desossa.",
    color: "orange",
    isSystem: true,
    permissionCodes: [
      "stock.view",
      "stock.losses",
      "stock.labels",
      "scale.view",
      "scale.export",
      "scale.config",
    ]
  },
  {
    key: "FINANCIAL",
    name: "Financeiro & Faturamento",
    sector: "Tesouraria & Fiscal",
    description: "Conferência cega de sangrias e gavetas dos operadores, conciliação de maquinetas de cartões, contas a pagar e controle de notas fiscais.",
    color: "purple",
    isSystem: true,
    permissionCodes: [
      "finance.cash_audit",
      "finance.pos_conciliation",
      "finance.payables",
      "finance.reports",
      "fiscal.emit",
      "fiscal.cancel",
      "fiscal.inutilization",
    ]
  },
  {
    key: "MANAGER",
    name: "Gerente Geral de Loja",
    sector: "Gerência & Operações",
    description: "Gestão operacional ampla da unidade. Altera preços de venda e margens, cadastra operadores, visualiza relatórios de faturamento e lucros da loja.",
    color: "indigo",
    isSystem: true,
    permissionCodes: [
      "pdv.access", "pdv.sale", "pdv.price_check", "pdv.discount.limited", "pdv.discount.unlimited",
      "pdv.cancel_item", "pdv.cancel_sale", "pdv.withdrawal", "pdv.supplement", "pdv.closing",
      "pdv.reprint", "pdv.offline_force", "pdv.supervisor_auth",
      "stock.view", "stock.create_edit", "stock.costs.view", "stock.pricing.change", "stock.inventory",
      "stock.invoices.import", "stock.losses", "stock.labels", "stock.suppliers",
      "scale.view", "scale.export", "scale.config",
      "finance.cash_audit", "finance.pos_conciliation", "finance.payables", "finance.reports", "finance.profit",
      "fiscal.emit", "fiscal.cancel", "fiscal.inutilization",
      "settings.users", "settings.terminals"
    ]
  },
  {
    key: "ADMIN",
    name: "Administrador / Proprietário",
    sector: "Diretoria & Matriz",
    description: "Acesso total irrestrito a todas as funcionalidades do sistema, certificados digitais, multi-lojas e auditoria.",
    color: "violet",
    isSystem: true,
    permissionCodes: "ALL"
  }
];

