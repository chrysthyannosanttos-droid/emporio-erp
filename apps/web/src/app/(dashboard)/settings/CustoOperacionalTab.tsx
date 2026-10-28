"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Calculator,
  Percent,
  TrendingUp,
  Save,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Building2,
  DollarSign,
  HelpCircle,
  ShoppingBag,
  Zap,
  CreditCard,
  Trash2,
  Package,
  Cpu,
  Loader2
} from "lucide-react";
import { getOperationalCostConfig, updateOperationalCostConfig } from "@/actions/company";

interface CostDetails {
  payroll?: number;
  rent?: number;
  utilities?: number;
  cardFees?: number;
  losses?: number;
  packaging?: number;
  adminMarketing?: number;
}

export function CustoOperacionalTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Principais alíquotas
  const [operationalRate, setOperationalRate] = useState<number>(15.0);
  const [desiredMargin, setDesiredMargin] = useState<number>(25.0);
  const [freightOther, setFreightOther] = useState<number>(0.0);

  // Composição detalhada
  const [mode, setMode] = useState<"direto" | "detalhado">("direto");
  const [details, setDetails] = useState<CostDetails>({
    payroll: 6.0,
    rent: 3.0,
    utilities: 2.0,
    cardFees: 2.0,
    losses: 1.0,
    packaging: 0.5,
    adminMarketing: 0.5,
  });

  // Simulador de Preço
  const [simPurchaseCost, setSimPurchaseCost] = useState<number>(50.0);
  const [simTaxRate, setSimTaxRate] = useState<number>(10.0); // % de impostos médios (ex: Simples Nacional)

  useEffect(() => {
    async function loadConfig() {
      setLoading(true);
      const res = await getOperationalCostConfig();
      if (res?.config) {
        if (res.config.defaultOperationalRate !== undefined) {
          setOperationalRate(res.config.defaultOperationalRate);
        }
        if (res.config.defaultProfitMargin !== undefined) {
          setDesiredMargin(res.config.defaultProfitMargin);
        }
        if (res.config.defaultFreightOther !== undefined) {
          setFreightOther(res.config.defaultFreightOther);
        }
        if (res.config.operationalCostDetails && Object.keys(res.config.operationalCostDetails).length > 0) {
          setDetails(prev => ({ ...prev, ...res.config.operationalCostDetails }));
        }
      }
      setLoading(false);
    }
    loadConfig();
  }, []);

  // Soma detalhada calculada
  const detailedSum = useMemo(() => {
    const sum =
      (Number(details.payroll) || 0) +
      (Number(details.rent) || 0) +
      (Number(details.utilities) || 0) +
      (Number(details.cardFees) || 0) +
      (Number(details.losses) || 0) +
      (Number(details.packaging) || 0) +
      (Number(details.adminMarketing) || 0);
    return Math.round(sum * 100) / 100;
  }, [details]);

  const handleApplyDetailedSum = () => {
    setOperationalRate(detailedSum);
  };

  // Cálculo da Simulação de Preço
  const simulation = useMemo(() => {
    const cost = Math.max(0, Number(simPurchaseCost) || 0);
    const taxes = Math.max(0, Number(simTaxRate) || 0);
    const op = Math.max(0, Number(operationalRate) || 0);
    const margin = Math.max(0, Number(desiredMargin) || 0);
    const freight = Math.max(0, Number(freightOther) || 0);

    const landedCost = cost * (1 + freight / 100);
    const totalDeduction = taxes + op + margin;

    if (totalDeduction >= 100) {
      return {
        error: "A soma de Impostos + Custo Operacional + Margem deve ser menor que 100%.",
        suggestedPrice: 0,
        profitAmount: 0,
        operationalAmount: 0,
        taxAmount: 0,
        markupFactor: 0,
        landedCost,
      };
    }

    const suggestedPrice = landedCost / (1 - totalDeduction / 100);
    const operationalAmount = suggestedPrice * (op / 100);
    const taxAmount = suggestedPrice * (taxes / 100);
    const profitAmount = suggestedPrice * (margin / 100);
    const markupFactor = cost > 0 ? suggestedPrice / cost : 0;

    return {
      error: null,
      suggestedPrice,
      profitAmount,
      operationalAmount,
      taxAmount,
      markupFactor,
      landedCost,
      totalDeduction,
    };
  }, [simPurchaseCost, simTaxRate, operationalRate, desiredMargin, freightOther]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

    const res = await updateOperationalCostConfig({
      defaultOperationalRate: operationalRate,
      defaultProfitMargin: desiredMargin,
      defaultFreightOther: freightOther,
      operationalCostDetails: details,
    });

    setSaving(false);
    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="animate-spin text-indigo-400" size={32} />
        <p className="text-sm font-medium">Carregando configurações de custo operacional...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-500/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Calculator size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Custo Operacional & Precificação</h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                Defina a alíquota padrão de despesas fixas para cálculo de markup e formação de preço de venda.
              </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 text-sm shrink-0"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Salvar Configurações
        </button>
      </div>

      {saved && (
        <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 rounded-xl animate-in fade-in">
          <CheckCircle2 size={18} /> Configurações de custo operacional salvas com sucesso! Novos produtos usarão essas taxas.
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 text-red-400 text-sm font-bold bg-red-500/10 border border-red-500/30 px-4 py-3 rounded-xl">
          <AlertTriangle size={18} /> {errorMsg}
        </div>
      )}

      {/* Grid de Principais Parâmetros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Custo Operacional */}
        <div className="p-5 rounded-2xl bg-[#161b33] border border-indigo-500/20 relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 size={14} className="text-indigo-400" /> Custo Operacional Padrão
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
              Taxa Geral
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="number"
              step="0.01"
              min="0"
              max="99"
              value={operationalRate}
              onChange={(e) => setOperationalRate(parseFloat(e.target.value) || 0)}
              className="text-3xl font-black text-white bg-[#0c0f1a] border border-indigo-500/25 rounded-xl px-3 py-2 w-32 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 font-mono"
            />
            <span className="text-2xl font-bold text-indigo-400">%</span>
          </div>
          <p className="text-xs text-slate-400 mt-2.5">
            Cobre despesas operacionais da empresa (folha, aluguel, energia, impostos administrativos).
          </p>
        </div>

        {/* Card 2: Margem Desejada */}
        <div className="p-5 rounded-2xl bg-[#161b33] border border-indigo-500/20 relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp size={14} className="text-emerald-400" /> Margem de Lucro Alvo
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
              Lucro Líquido
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="number"
              step="0.01"
              min="0"
              max="99"
              value={desiredMargin}
              onChange={(e) => setDesiredMargin(parseFloat(e.target.value) || 0)}
              className="text-3xl font-black text-white bg-[#0c0f1a] border border-indigo-500/25 rounded-xl px-3 py-2 w-32 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 font-mono"
            />
            <span className="text-2xl font-bold text-emerald-400">%</span>
          </div>
          <p className="text-xs text-slate-400 mt-2.5">
            Lucro líquido desejado sobre o preço final de venda de cada mercadoria.
          </p>
        </div>

        {/* Card 3: Frete & Adicionais */}
        <div className="p-5 rounded-2xl bg-[#161b33] border border-indigo-500/20 relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Package size={14} className="text-amber-400" /> Frete / Outras Despesas
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
              Sobre Custo
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="number"
              step="0.01"
              min="0"
              max="99"
              value={freightOther}
              onChange={(e) => setFreightOther(parseFloat(e.target.value) || 0)}
              className="text-3xl font-black text-white bg-[#0c0f1a] border border-indigo-500/25 rounded-xl px-3 py-2 w-32 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-mono"
            />
            <span className="text-2xl font-bold text-amber-400">%</span>
          </div>
          <p className="text-xs text-slate-400 mt-2.5">
            Acréscimo percentual médio de frete, seguro e descarregamento na compra.
          </p>
        </div>
      </div>

      {/* Tabs / Modos: Alíquota Direta vs Composição Detalhada */}
      <div className="bg-[#161b33] p-5 rounded-2xl border border-indigo-500/15 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-indigo-500/10">
          <div>
            <h3 className="text-white font-bold text-base flex items-center gap-2">
              <Layers size={18} className="text-indigo-400" /> Como deseja definir seu Custo Operacional?
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Você pode usar uma alíquota única direta ou somar os centros de custos da sua empresa.
            </p>
          </div>

          <div className="flex gap-1.5 p-1 bg-[#0c0f1a] rounded-xl border border-indigo-500/15">
            <button
              type="button"
              onClick={() => setMode("direto")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mode === "direto"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Alíquota Direta (Fixa)
            </button>
            <button
              type="button"
              onClick={() => setMode("detalhado")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mode === "detalhado"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Calculadora Detalhada (Centros de Custo)
            </button>
          </div>
        </div>

        {mode === "direto" ? (
          <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/15 flex items-start gap-3">
            <Info className="text-indigo-400 shrink-0 mt-0.5" size={18} />
            <div className="text-xs sm:text-sm text-slate-300 space-y-1">
              <p>
                O modo <strong>Alíquota Direta</strong> utiliza o percentual de{" "}
                <strong className="text-indigo-300">{operationalRate.toFixed(2)}%</strong> configurado no card acima como
                a taxa padrão em todos os cálculos do sistema (novos cadastros de produtos, markup e sugestão de preço).
              </p>
              <p className="text-slate-400 text-xs">
                Se desejar discriminar despesas como folha, aluguel, energia e maquininhas de cartão para apurar a alíquota exata, selecione a aba <strong>Calculadora Detalhada</strong>.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="shrink-0" />
                <span>
                  Preencha o peso médio estimado de cada despesa em relação ao seu faturamento bruto.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-bold text-white">Soma: {detailedSum.toFixed(2)}%</span>
                <button
                  type="button"
                  onClick={handleApplyDetailedSum}
                  className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <ArrowRight size={13} /> Aplicar {detailedSum.toFixed(2)}%
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Folha */}
              <DetailField
                icon={<ShoppingBag size={16} className="text-blue-400" />}
                title="Folha & Encargos (%)"
                desc="Salários, FGTS, INSS, benefícios e pró-labore"
                value={details.payroll ?? 0}
                onChange={(val) => setDetails((prev) => ({ ...prev, payroll: val }))}
              />
              {/* Ocupação */}
              <DetailField
                icon={<Building2 size={16} className="text-purple-400" />}
                title="Aluguel & Ocupação (%)"
                desc="Aluguel do imóvel/galpão, IPTU, condomínio"
                value={details.rent ?? 0}
                onChange={(val) => setDetails((prev) => ({ ...prev, rent: val }))}
              />
              {/* Energia & Água */}
              <DetailField
                icon={<Zap size={16} className="text-amber-400" />}
                title="Energia, Água & Conectividade (%)"
                desc="Luz, água, gás, internet e telefonia"
                value={details.utilities ?? 0}
                onChange={(val) => setDetails((prev) => ({ ...prev, utilities: val }))}
              />
              {/* Taxas de Cartão */}
              <DetailField
                icon={<CreditCard size={16} className="text-emerald-400" />}
                title="Taxas de Cartão & Financeiras (%)"
                desc="Débito, crédito, antecipações e PIX com taxa"
                value={details.cardFees ?? 0}
                onChange={(val) => setDetails((prev) => ({ ...prev, cardFees: val }))}
              />
              {/* Perdas e Quebras */}
              <DetailField
                icon={<Trash2 size={16} className="text-red-400" />}
                title="Perdas, Quebras & Avarias (%)"
                desc="Vencimentos, perdas em gôndola e quebras"
                value={details.losses ?? 0}
                onChange={(val) => setDetails((prev) => ({ ...prev, losses: val }))}
              />
              {/* Embalagens */}
              <DetailField
                icon={<Package size={16} className="text-cyan-400" />}
                title="Embalagens & Descartáveis (%)"
                desc="Sacolas, bandejas, filme PVC, caixas e fitas"
                value={details.packaging ?? 0}
                onChange={(val) => setDetails((prev) => ({ ...prev, packaging: val }))}
              />
              {/* Admin e Marketing */}
              <DetailField
                icon={<Cpu size={16} className="text-indigo-400" />}
                title="Sistemas, Contabilidade & MKT (%)"
                desc="Software ERP, contabilidade, marketing e escritório"
                value={details.adminMarketing ?? 0}
                onChange={(val) => setDetails((prev) => ({ ...prev, adminMarketing: val }))}
              />
            </div>
          </div>
        )}
      </div>

      {/* Simulador de Formação de Preço em Tempo Real */}
      <div className="bg-[#161b33] p-5 rounded-2xl border border-indigo-500/15 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-white font-bold text-base flex items-center gap-2">
              <DollarSign size={18} className="text-emerald-400" /> Simulador de Formação de Preço (Demonstrativo)
            </h3>
            <p className="text-slate-400 text-xs">
              Teste um produto modelo para ver como as configurações afetam o preço sugerido e sua margem líquida real.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Inputs do teste */}
          <div className="p-4 bg-[#0c0f1a] rounded-xl border border-indigo-500/15 space-y-3.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dados do Produto Modelo</span>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Custo de Compra (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={simPurchaseCost}
                  onChange={(e) => setSimPurchaseCost(parseFloat(e.target.value) || 0)}
                  className="w-full pl-10 pr-3 py-2 bg-[#161b33] border border-indigo-500/20 text-white rounded-lg font-mono text-sm outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Alíquota Média de Impostos de Saída (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="99"
                  value={simTaxRate}
                  onChange={(e) => setSimTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-[#161b33] border border-indigo-500/20 text-white rounded-lg font-mono text-sm outline-none focus:border-indigo-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">%</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Ex: 8% a 12% para Simples Nacional, ou soma ICMS+PIS+COFINS.</p>
            </div>
          </div>

          {/* Resultado do Simulador */}
          <div className="p-4 bg-gradient-to-br from-[#12162a] to-[#1a1f3d] rounded-xl border border-indigo-500/30 flex flex-col justify-between">
            {simulation.error ? (
              <div className="text-red-400 text-xs font-bold p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                {simulation.error}
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">Preço de Venda Sugerido</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-bold">
                      Markup: {simulation.markupFactor.toFixed(2)}x
                    </span>
                  </div>
                  <div className="text-3xl font-black text-emerald-400 font-mono">
                    {simulation.suggestedPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-indigo-500/15 text-xs">
                    <div>
                      <p className="text-slate-500">Custo Op. ({operationalRate}%)</p>
                      <p className="font-mono font-bold text-slate-200">
                        {simulation.operationalAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Impostos ({simTaxRate}%)</p>
                      <p className="font-mono font-bold text-slate-200">
                        {simulation.taxAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Lucro Líquido ({desiredMargin}%)</p>
                      <p className="font-mono font-bold text-emerald-400">
                        {simulation.profitAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Barra de composição */}
                <div className="mt-4 pt-3 border-t border-indigo-500/15">
                  <div className="h-3 w-full rounded-full bg-[#0c0f1a] overflow-hidden flex">
                    <div
                      style={{
                        width: `${Math.min(100, (simulation.landedCost / simulation.suggestedPrice) * 100)}%`,
                      }}
                      className="bg-blue-500"
                      title="Custo da Mercadoria"
                    />
                    <div
                      style={{ width: `${operationalRate}%` }}
                      className="bg-indigo-500"
                      title="Custo Operacional"
                    />
                    <div
                      style={{ width: `${simTaxRate}%` }}
                      className="bg-amber-500"
                      title="Impostos"
                    />
                    <div
                      style={{ width: `${desiredMargin}%` }}
                      className="bg-emerald-500"
                      title="Lucro Líquido"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 flex-wrap gap-1">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Custo Compra
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> Custo Operacional
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Impostos
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Lucro
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Aplicação no Sistema */}
      <div className="p-4 rounded-2xl bg-[#161b33] border border-indigo-500/15 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="text-white text-xs sm:text-sm font-bold">Onde essa alíquota é aplicada automaticamente?</p>
            <p className="text-slate-400 text-xs">
              No cadastro de novos produtos no estoque, sugestões do módulo de precificação inteligente e cálculo de markup.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-[#0c0f1a] text-slate-300 text-xs font-semibold border border-indigo-500/15">
            Estoque
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-[#0c0f1a] text-slate-300 text-xs font-semibold border border-indigo-500/15">
            Precificação
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-[#0c0f1a] text-slate-300 text-xs font-semibold border border-indigo-500/15">
            PDV
          </span>
        </div>
      </div>

      {/* Rodapé com botão de salvar */}
      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 text-sm"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Salvar Custo Operacional
        </button>
      </div>
    </form>
  );
}

function DetailField({
  icon,
  title,
  desc,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  value: number;
  onChange: (val: number) => void;
}) {
  return (
    <div className="p-3 bg-[#0c0f1a] rounded-xl border border-indigo-500/15 flex flex-col justify-between gap-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-bold text-white leading-tight">{title}</span>
      </div>
      <p className="text-[11px] text-slate-400 leading-snug line-clamp-1">{desc}</p>
      <div className="relative mt-1">
        <input
          type="number"
          step="0.01"
          min="0"
          max="99"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full px-3 py-1.5 bg-[#161b33] border border-indigo-500/20 text-white rounded-lg font-mono text-sm outline-none focus:border-indigo-400"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">%</span>
      </div>
    </div>
  );
}
