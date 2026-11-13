"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Download,
  Printer,
  Layers,
  RefreshCw,
} from "lucide-react";
import { getChartOfAccountsData } from "@/actions/finance";

interface AccountItem {
  code: string;
  name: string;
  type: "SINTETICA" | "ANALITICA";
  nature: "DEVEDORA" | "CREDORA";
  level: number;
  balance: number;
  description?: string;
}

function buildLiveAccounts(b: any): AccountItem[] {
  const cashTotal = (b?.openCashBalance || 0) + (b?.salesCash || 0) + (b?.salesPix || 0);
  const recTotal = (b?.salesDebit || 0) + (b?.salesCredit || 0) + (b?.openReceivables || 0);
  const stockTotal =
    (b?.stockRevenda || 0) +
    (b?.stockInsumos || 0) +
    (b?.stockBebidas || 0) +
    (b?.stockEmbalagens || 0);
  const imobTotal = (b?.imobMaquinas || 0) + (b?.imobInstalacoes || 0);
  const ativoCirculante = cashTotal + recTotal + stockTotal;
  const ativoTotal = ativoCirculante + imobTotal;

  const passivoCirculante = b?.openPayables || 0;
  const receitasBrutas = (b?.revPdv || 0) + (b?.revRevenda || 0);
  const deducoes = 0;
  const receitasTotais = receitasBrutas - deducoes;
  const custosTotais = (b?.cmvVendas || 0) + (b?.perdasTotal || 0);
  const despesasTotais = b?.despOutflows || 0;

  return [
    // 1. ATIVO
    { code: "1", name: "ATIVO TOTAL", type: "SINTETICA", nature: "DEVEDORA", level: 1, balance: ativoTotal },
    { code: "1.1", name: "Ativo Circulante", type: "SINTETICA", nature: "DEVEDORA", level: 2, balance: ativoCirculante },
    { code: "1.1.1", name: "Disponibilidades Financeiras", type: "SINTETICA", nature: "DEVEDORA", level: 3, balance: cashTotal },
    { code: "1.1.1.01", name: "Caixa Geral / Vendas em Dinheiro", type: "ANALITICA", nature: "DEVEDORA", level: 4, balance: (b?.openCashBalance || 0) + (b?.salesCash || 0), description: "Saldo de abertura de caixa + recebimentos em espécie PDV" },
    { code: "1.1.1.02", name: "Recebimentos PIX (PDV / Conta)", type: "ANALITICA", nature: "DEVEDORA", level: 4, balance: b?.salesPix || 0, description: "Total liquidado via PIX no banco de vendas" },
    { code: "1.1.1.03", name: "Bancos Conta Movimento (Conciliação)", type: "ANALITICA", nature: "DEVEDORA", level: 4, balance: 0, description: "Depende de importação OFX / lançamento bancário inicial" },

    { code: "1.1.2", name: "Contas e Direitos a Receber", type: "SINTETICA", nature: "DEVEDORA", level: 3, balance: recTotal },
    { code: "1.1.2.01", name: "Cartão de Débito (PDV)", type: "ANALITICA", nature: "DEVEDORA", level: 4, balance: b?.salesDebit || 0, description: "Vendas registradas em débito no banco" },
    { code: "1.1.2.02", name: "Cartão de Crédito (PDV)", type: "ANALITICA", nature: "DEVEDORA", level: 4, balance: b?.salesCredit || 0, description: "Vendas registradas em crédito no banco" },
    { code: "1.1.2.03", name: "Títulos a Receber em Aberto (Financeiro)", type: "ANALITICA", nature: "DEVEDORA", level: 4, balance: b?.openReceivables || 0, description: "Contas a receber cadastradas como pendentes" },

    { code: "1.1.3", name: "Estoques de Mercadorias e Insumos (Preço de Custo)", type: "SINTETICA", nature: "DEVEDORA", level: 3, balance: stockTotal },
    { code: "1.1.3.01", name: "Estoque de Mercadorias para Revenda", type: "ANALITICA", nature: "DEVEDORA", level: 4, balance: b?.stockRevenda || 0, description: "Saldo real atual de cafés, doces e mercearia contados" },
    { code: "1.1.3.02", name: "Estoque de Insumos & Matérias-Primas", type: "ANALITICA", nature: "DEVEDORA", level: 4, balance: b?.stockInsumos || 0, description: "Saldo real atual de carnes e ingredientes da cozinha" },
    { code: "1.1.3.03", name: "Estoque de Bebidas e Adega", type: "ANALITICA", nature: "DEVEDORA", level: 4, balance: b?.stockBebidas || 0, description: "Saldo real atual de cachaças, vinhos e refrigerantes" },
    { code: "1.1.3.04", name: "Estoque de Embalagens e Descartáveis", type: "ANALITICA", nature: "DEVEDORA", level: 4, balance: b?.stockEmbalagens || 0, description: "Embalagens cadastradas no estoque ativo" },

    { code: "1.2", name: "Ativo Não Circulante (Imobilizado Próprio)", type: "SINTETICA", nature: "DEVEDORA", level: 2, balance: imobTotal },
    { code: "1.2.1", name: "Máquinas, Refrigeração e Equipamentos TI", type: "SINTETICA", nature: "DEVEDORA", level: 3, balance: b?.imobMaquinas || 0 },
    { code: "1.2.1.01", name: "Balanças, Freezers Próprios, Gerador e Automação", type: "ANALITICA", nature: "DEVEDORA", level: 4, balance: b?.imobMaquinas || 0, description: `Bens ativos próprios cadastrados em Patrimônio (Comodatos de terceiros R$ ${Number(b?.comodatosRecebidos || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} não integram ativo próprio)` },
    { code: "1.2.2", name: "Instalações Comerciais e Benfeitorias", type: "SINTETICA", nature: "DEVEDORA", level: 3, balance: b?.imobInstalacoes || 0 },

    // 2. PASSIVO
    { code: "2", name: "PASSIVO E PATRIMÔNIO LÍQUIDO", type: "SINTETICA", nature: "CREDORA", level: 1, balance: passivoCirculante },
    { code: "2.1", name: "Passivo Circulante (Obrigações em Aberto)", type: "SINTETICA", nature: "CREDORA", level: 2, balance: passivoCirculante },
    { code: "2.1.1", name: "Contas a Pagar / Fornecedores Nacionais", type: "ANALITICA", nature: "CREDORA", level: 3, balance: passivoCirculante, description: "Soma real de títulos PAYABLE pendentes no financeiro" },
    { code: "2.1.2", name: "Obrigações Tributárias e Trabalhistas (DAS / FGTS)", type: "ANALITICA", nature: "CREDORA", level: 3, balance: 0, description: "Sem guias provisionadas no módulo financeiro" },
    { code: "2.2", name: "Patrimônio Líquido", type: "SINTETICA", nature: "CREDORA", level: 2, balance: 0 },
    { code: "2.2.1", name: "Capital Social Integralizado", type: "ANALITICA", nature: "CREDORA", level: 3, balance: 0, description: "Disponível para lançamento contábil de abertura" },

    // 3. RECEITAS
    { code: "3", name: "RECEITAS OPERACIONAIS", type: "SINTETICA", nature: "CREDORA", level: 1, balance: receitasTotais },
    { code: "3.1", name: "Receita Bruta de Vendas (Realizada)", type: "SINTETICA", nature: "CREDORA", level: 2, balance: receitasBrutas },
    { code: "3.1.1", name: "Vendas PDV Balcão / Consumidor Final", type: "ANALITICA", nature: "CREDORA", level: 3, balance: b?.revPdv || 0, description: "Soma real das vendas COMPLETED no PDV" },
    { code: "3.1.2", name: "Vendas Atacado e Clientes Revenda", type: "ANALITICA", nature: "CREDORA", level: 3, balance: b?.revRevenda || 0, description: "Soma real de vendas faturadas para clientes REVENDA" },
    { code: "3.2", name: "Deduções, Devoluções e Cancelamentos", type: "ANALITICA", nature: "DEVEDORA", level: 2, balance: deducoes },

    // 4. CUSTOS
    { code: "4", name: "CUSTOS DAS MERCADORIAS E PERDAS (CMV / CPV)", type: "SINTETICA", nature: "DEVEDORA", level: 1, balance: custosTotais },
    { code: "4.1", name: "Custo das Mercadorias Vendidas (CMV Real)", type: "ANALITICA", nature: "DEVEDORA", level: 2, balance: b?.cmvVendas || 0, description: "Calculado sobre o custo unitário real dos itens vendidos" },
    { code: "4.2", name: "Perdas, Quebras e Avarias Registradas", type: "ANALITICA", nature: "DEVEDORA", level: 2, balance: b?.perdasTotal || 0, description: "Soma real de baixas em Perdas (/losses)" },

    // 5. DESPESAS
    { code: "5", name: "DESPESAS OPERACIONAIS", type: "SINTETICA", nature: "DEVEDORA", level: 1, balance: despesasTotais },
    { code: "5.1", name: "Saídas e Despesas Lançadas no Financeiro", type: "ANALITICA", nature: "DEVEDORA", level: 2, balance: despesasTotais, description: "Soma real das transações OUTFLOW e PAYABLE lançadas no banco" },
  ];
}

export function ChartOfAccountsView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL");
  const [expandedLevels, setExpandedLevels] = useState<number>(4);
  const [accounts, setAccounts] = useState<AccountItem[]>(() => buildLiveAccounts(null));
  const [companyName, setCompanyName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  async function loadLiveChart() {
    setLoading(true);
    try {
      const res = await getChartOfAccountsData();
      if (res.success && res.balances) {
        setAccounts(buildLiveAccounts(res.balances));
        if (res.companyName) setCompanyName(res.companyName);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLiveChart();
  }, []);

  const groupTotal = (code: string) =>
    accounts.find((a) => a.code === code)?.balance || 0;

  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      acc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (acc.description && acc.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesGroup =
      selectedGroup === "ALL" || acc.code.startsWith(selectedGroup);

    const matchesLevel = acc.level <= expandedLevels;

    return matchesSearch && matchesGroup && matchesLevel;
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const header = "Codigo;Classificacao;Nome da Conta;Tipo;Natureza;Nivel;Saldo Real;Descricao\n";
    const rows = accounts
      .map(
        (a) =>
          `"${a.code}";"${a.code}";"${a.name}";"${a.type}";"${a.nature}";${a.level};${(a.balance || 0).toFixed(2).replace(".", ",")};"${a.description || ""}"`
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plano_de_contas_real_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Aviso de Transparência 100% Real */}
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-900">
        <div>
          <strong>100% Conectado ao Banco Real{companyName ? ` (${companyName})` : ""}:</strong>{" "}
          Todos os saldos abaixo refletem exclusivamente os produtos contados em estoque, bens patrimoniais, vendas e lançamentos reais gravados no sistema. Contas sem lançamento contábil aparecem zeradas (R$ 0,00).
        </div>
        <button
          type="button"
          onClick={loadLiveChart}
          disabled={loading}
          className="px-3 py-1 bg-white border border-emerald-300 rounded-lg font-bold text-emerald-800 hover:bg-emerald-100 flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Atualizar Saldos
        </button>
      </div>

      {/* Top Bar com Filtros e Ações */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative min-w-[260px] flex-1 md:flex-initial">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Buscar conta ou código contábil..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="ALL">Todos os Grupos (1 a 5)</option>
            <option value="1">1. ATIVO (Circulante & Imobilizado)</option>
            <option value="2">2. PASSIVO & PATRIMÔNIO LÍQUIDO</option>
            <option value="3">3. RECEITAS OPERACIONAIS</option>
            <option value="4">4. CUSTOS (CMV / CPV)</option>
            <option value="5">5. DESPESAS OPERACIONAIS</option>
          </select>

          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600">
            <Layers size={14} className="text-gray-400" />
            <span>Níveis:</span>
            {[2, 3, 4].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setExpandedLevels(lvl)}
                className={`px-2 py-0.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  expandedLevels === lvl
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "hover:bg-gray-200 text-gray-700"
                }`}
              >
                {lvl}º
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors border border-gray-200 cursor-pointer"
          >
            <Download size={14} /> Exportar CSV
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm shadow-emerald-600/20 cursor-pointer"
          >
            <Printer size={14} /> Imprimir Plano
          </button>
        </div>
      </div>

      {/* Cards de Resumo dos 5 Grupos (100% REAIS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { code: "1", title: "1. Ativo Real", sub: "Estoques + Caixa + Imobilizado", color: "emerald" },
          { code: "2", title: "2. Passivo Real", sub: "Fornecedores / A Pagar", color: "blue" },
          { code: "3", title: "3. Receitas Reais", sub: "Vendas concluídas no PDV", color: "teal" },
          { code: "4", title: "4. Custos (CMV)", sub: "Custo itens vendidos + Perdas", color: "amber" },
          { code: "5", title: "5. Despesas Reais", sub: "Lançamentos OUTFLOW / PAYABLE", color: "rose" },
        ].map((grp) => (
          <div
            key={grp.code}
            onClick={() => setSelectedGroup(selectedGroup === grp.code ? "ALL" : grp.code)}
            className={`cursor-pointer p-4 rounded-2xl border transition-all ${
              selectedGroup === grp.code
                ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20"
                : "bg-white border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="text-[10px] uppercase font-black tracking-wider text-gray-600">{grp.title}</div>
            <div className="text-lg font-black text-gray-900 mt-1 font-mono">
              {loading
                ? "..."
                : `R$ ${groupTotal(grp.code).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">{grp.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabela do Plano de Contas Hierárquico */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs font-bold uppercase tracking-wider">
                <th className="py-3 px-4 w-32">Código</th>
                <th className="py-3 px-4">Classificação Contábil & Descrição</th>
                <th className="py-3 px-4 w-28 text-center">Tipo</th>
                <th className="py-3 px-4 w-28 text-center">Natureza</th>
                <th className="py-3 px-4 w-36 text-right">Saldo Real</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAccounts.map((account) => {
                const isGroupHeader = account.level === 1;
                const isSubHeader = account.level === 2;
                const isAnalytic = account.type === "ANALITICA";

                return (
                  <tr
                    key={account.code}
                    className={`transition-colors ${
                      isGroupHeader
                        ? "bg-gray-100/70 font-black text-gray-900"
                        : isSubHeader
                        ? "bg-gray-50/50 font-bold text-gray-800"
                        : "hover:bg-emerald-50/30 text-gray-700"
                    }`}
                  >
                    <td className="py-2.5 px-4 font-mono font-bold text-xs text-gray-600">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md ${
                          isGroupHeader
                            ? "bg-gray-900 text-white"
                            : isSubHeader
                            ? "bg-gray-200 text-gray-800"
                            : "bg-emerald-50 text-emerald-800 border border-emerald-200/60"
                        }`}
                      >
                        {account.code}
                      </span>
                    </td>

                    <td className="py-2.5 px-4">
                      <div
                        style={{ paddingLeft: `${(account.level - 1) * 20}px` }}
                        className="flex flex-col"
                      >
                        <span
                          className={`${
                            isGroupHeader
                              ? "text-base font-black text-gray-900 tracking-tight"
                              : isSubHeader
                              ? "text-sm font-bold text-gray-800"
                              : "text-sm font-medium text-gray-700"
                          }`}
                        >
                          {account.name}
                        </span>
                        {account.description && (
                          <span className="text-[11px] text-gray-400 font-normal mt-0.5">
                            {account.description}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isAnalytic
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-purple-50 text-purple-700 border border-purple-200"
                        }`}
                      >
                        {account.type}
                      </span>
                    </td>

                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          account.nature === "DEVEDORA"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {account.nature}
                      </span>
                    </td>

                    <td className="py-2.5 px-4 text-right font-mono font-bold text-sm">
                      <span
                        className={
                          account.balance < 0
                            ? "text-rose-600"
                            : account.balance === 0
                            ? "text-gray-400 font-normal"
                            : isGroupHeader
                            ? "text-gray-900 font-black"
                            : "text-gray-800"
                        }
                      >
                        R${" "}
                        {Math.abs(account.balance).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
