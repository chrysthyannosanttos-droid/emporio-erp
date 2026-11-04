"use client";

import { useState, useMemo } from "react";
import {
  Search, ShieldCheck, BookOpen, Scale, Sparkles, Filter, Check,
  Copy, ArrowRight, CheckCircle2, AlertTriangle, FileText, ExternalLink,
  ChevronRight, Building2, Tag, Percent, RefreshCw, X, ChevronDown, ChevronUp
} from "lucide-react";
import {
  DecretoItem, DecretoInfo, DECRETOS_ALAGOAS, BANCO_NCMS_ALAGOAS
} from "@/data/decretosAlagoas";
import { applyNcmToProduct } from "@/actions/decretos";

interface Props {
  initialProducts: any[];
}

export function DecretosClient({ initialProducts }: Props) {
  const [activeTab, setActiveTab] = useState<"consulta" | "decretos" | "produtos">("consulta");
  const [search, setSearch] = useState("");
  const [filterRegra, setFilterRegra] = useState<string>("TODOS");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal para aplicar NCM a um produto da loja
  const [applyingItem, setApplyingItem] = useState<DecretoItem | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [savingLink, setSavingLink] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Lista local de produtos da empresa para atualização reativa
  const [companyProducts, setCompanyProducts] = useState<any[]>(initialProducts);

  // Filtro de consulta
  const searchResults = useMemo(() => {
    const q = search.toLowerCase().trim();
    return BANCO_NCMS_ALAGOAS.filter((item) => {
      const matchQ =
        !q ||
        item.ncm.includes(q.replace(/\D/g, "")) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.decretoNome.toLowerCase().includes(q) ||
        item.dicaPratica.toLowerCase().includes(q);

      const matchF = filterRegra === "TODOS" || item.regraAlagoas === filterRegra;
      return matchQ && matchF;
    });
  }, [search, filterRegra]);

  // Estatísticas do Catálogo da Loja
  const stats = useMemo(() => {
    const total = companyProducts.length;
    const stCount = companyProducts.filter((p) => p.csosn === "500").length;
    const cestaCount = companyProducts.filter((p) => p.regraAlagoas === "CESTA_BASICA" || p.csosn === "102").length;
    const isentoCount = companyProducts.filter((p) => p.regraAlagoas === "ISENCAO" || p.regraAlagoas === "DIFERIMENTO").length;
    return { total, stCount, cestaCount, isentoCount };
  }, [companyProducts]);

  // Copiar NCM para a área de transferência
  const handleCopyNcm = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Salvar vinculação do NCM no produto da loja
  const handleConfirmApply = async () => {
    if (!applyingItem || !selectedProductId) return;
    setSavingLink(true);
    setFeedback(null);

    try {
      const res = await applyNcmToProduct(selectedProductId, {
        ncm: applyingItem.ncm,
        cest: applyingItem.cest || null,
        csosn: applyingItem.csosnRecomendado,
        cfop: applyingItem.cfopRecomendado,
      });

      if (res.success) {
        setCompanyProducts((prev) =>
          prev.map((p) =>
            p.id === selectedProductId
              ? {
                  ...p,
                  ncm: applyingItem.ncm,
                  cest: applyingItem.cest || p.cest,
                  csosn: applyingItem.csosnRecomendado,
                  cfop: applyingItem.cfopRecomendado,
                }
              : p
          )
        );
        setFeedback({
          type: "success",
          text: `NCM ${applyingItem.ncmFormatted} aplicado com sucesso ao produto!`,
        });
        setTimeout(() => {
          setApplyingItem(null);
          setSelectedProductId("");
          setFeedback(null);
        }, 1800);
      } else {
        setFeedback({ type: "error", text: res.error || "Erro ao salvar" });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Erro de conexão" });
    } finally {
      setSavingLink(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ─── Top Header ──────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm">
              <Scale size={14} />
              <span>SEFAZ-AL • Legislação Tributária &amp; Decretos Alimentícios</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Decretos de Alagoas &amp; Consulta de NCM
            </h1>
            <p className="text-emerald-100/80 text-xs sm:text-sm max-w-2xl font-medium">
              Consulte a classificação fiscal correta, alíquotas do ICMS, Decretos Estaduais vigentes e enquadramento de Substituição Tributária (ST) para o Empório Agrobelém.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => {
                setActiveTab("consulta");
                setSearch("");
                setFilterRegra("TODOS");
              }}
              className="w-full sm:w-auto bg-white hover:bg-emerald-50 text-emerald-950 font-black text-xs px-5 py-3 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Search size={15} className="text-emerald-700" />
              <span>Nova Pesquisa de NCM</span>
            </button>
          </div>
        </div>

        {/* Métricas Rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10 text-white">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-sm">
            <div className="text-[11px] font-bold text-emerald-300 uppercase">Produtos da Loja</div>
            <div className="text-xl sm:text-2xl font-black mt-0.5">{stats.total} itens</div>
            <div className="text-[10px] text-emerald-200/70 mt-0.5">100% com NCM ativo</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-sm">
            <div className="text-[11px] font-bold text-amber-300 uppercase">ICMS-ST (Anexo XII)</div>
            <div className="text-xl sm:text-2xl font-black mt-0.5">{stats.stCount} itens</div>
            <div className="text-[10px] text-amber-200/70 mt-0.5">CSOSN 500 (Retido na Fonte)</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-sm">
            <div className="text-[11px] font-bold text-sky-300 uppercase">Cesta Básica (7%)</div>
            <div className="text-xl sm:text-2xl font-black mt-0.5">{DECRETOS_ALAGOAS[1].numero}</div>
            <div className="text-[10px] text-sky-200/70 mt-0.5">RICMS-AL Anexo II</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-sm">
            <div className="text-[11px] font-bold text-purple-300 uppercase">Carnes &amp; Aves AL</div>
            <div className="text-xl sm:text-2xl font-black mt-0.5">{DECRETOS_ALAGOAS[2].numero}</div>
            <div className="text-[10px] text-purple-200/70 mt-0.5">Diferimento &amp; Isenção</div>
          </div>
        </div>
      </div>

      {/* ─── Navegação por Abas ──────────────────────────────────────────────── */}
      <div className="flex border-b border-gray-200 gap-2 overflow-x-auto custom-scrollbar pb-1">
        <button
          onClick={() => setActiveTab("consulta")}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "consulta"
              ? "border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl"
              : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
          }`}
        >
          <Search size={16} />
          <span>Consulta Inteligente de NCM &amp; Decretos</span>
        </button>
        <button
          onClick={() => setActiveTab("decretos")}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "decretos"
              ? "border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl"
              : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
          }`}
        >
          <BookOpen size={16} />
          <span>Os Decretos de Alagoas na Íntegra ({DECRETOS_ALAGOAS.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("produtos")}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "produtos"
              ? "border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl"
              : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
          }`}
        >
          <Building2 size={16} />
          <span>Produtos da Loja por Decreto ({companyProducts.length})</span>
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          ABA 1: CONSULTA INTELIGENTE DE NCM & DECRETOS
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "consulta" && (
        <div className="space-y-5">
          {/* Barra de Busca e Filtros */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-gray-200 shadow-sm space-y-4">
            <div className="relative">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Busque por produto (ex: picanha, queijo coalho, macaxeira, refrigerante, café) ou NCM (ex: 02102000)..."
                className="w-full pl-12 pr-10 py-3.5 bg-gray-50 hover:bg-gray-100/70 focus:bg-white border border-gray-200 focus:border-emerald-500 rounded-2xl text-sm font-semibold text-gray-900 placeholder:text-gray-400 outline-none transition-all shadow-inner"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 rounded-full"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Pílulas de Filtro Rápido */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-bold">
              <span className="text-gray-400 flex items-center gap-1 mr-1">
                <Filter size={13} /> Filtrar por:
              </span>
              {[
                { id: "TODOS", label: "Todos os Itens" },
                { id: "SUBSTITUICAO_TRIBUTARIA", label: "ICMS-ST (Anexo XII)", badge: "ST" },
                { id: "CESTA_BASICA", label: "Cesta Básica (7%)", badge: "7%" },
                { id: "ISENCAO", label: "Isenção / Hortifruti", badge: "0%" },
                { id: "DIFERIMENTO", label: "Carnes & Abate AL", badge: "Diferimento" },
                { id: "TRIBUTADO_SIMPLES", label: "Tributados Simples Nacional", badge: "SN" },
              ].map((f) => {
                const active = filterRegra === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFilterRegra(f.id)}
                    className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                      active
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30"
                    }`}
                  >
                    <span>{f.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lista de Resultados da Busca */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {searchResults.length === 0 ? (
              <div className="col-span-full bg-white rounded-3xl p-12 text-center border border-dashed border-gray-300 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                  <Search size={24} />
                </div>
                <h3 className="font-black text-gray-800 text-base">Nenhum NCM encontrado para "{search}"</h3>
                <p className="text-gray-500 text-xs max-w-md mx-auto">
                  Tente buscar por termos mais genéricos como "carne", "queijo", "doce", "água" ou navegue pelas categorias acima.
                </p>
              </div>
            ) : (
              searchResults.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl border border-gray-200 hover:border-emerald-400 hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-2.5">
                    {/* Linha 1: Badges & NCM */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-emerald-950 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl text-sm tracking-wide">
                          NCM {item.ncmFormatted}
                        </span>
                        {item.cest && (
                          <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
                            CEST {item.cest}
                          </span>
                        )}
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg border ${
                          item.regraAlagoas === "SUBSTITUICAO_TRIBUTARIA"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : item.regraAlagoas === "CESTA_BASICA"
                            ? "bg-sky-50 text-sky-800 border-sky-200"
                            : item.regraAlagoas === "ISENCAO"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-purple-50 text-purple-800 border-purple-200"
                        }`}>
                          {item.regraTitulo}
                        </span>
                      </div>

                      {/* Botão Copiar */}
                      <button
                        onClick={() => handleCopyNcm(item.ncm, item.id)}
                        className="text-gray-400 hover:text-emerald-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
                        title="Copiar NCM"
                      >
                        {copiedId === item.id ? (
                          <Check size={16} className="text-emerald-600" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    </div>

                    {/* Descrição do Produto / NCM */}
                    <div>
                      <h4 className="text-sm font-black text-gray-900 group-hover:text-emerald-950 transition-colors leading-snug">
                        {item.description}
                      </h4>
                      <p className="text-xs text-gray-500 font-medium mt-1">
                        Categoria: <span className="text-gray-700 font-bold">{item.category}</span>
                      </p>
                    </div>

                    {/* Decreto de Alagoas Enquadrado */}
                    <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100 space-y-1 text-xs">
                      <div className="font-bold text-gray-800 flex items-center gap-1.5">
                        <BookOpen size={13} className="text-emerald-600" />
                        <span>{item.decretoNome}</span>
                      </div>
                      <div className="text-gray-500 text-[11px] font-medium">
                        Dispositivo: <span className="text-gray-700">{item.decretoArtigo}</span>
                      </div>
                      <div className="text-gray-600 text-[11px] leading-relaxed pt-1 border-t border-gray-200/60">
                        {item.regraDescricao}
                      </div>
                    </div>

                    {/* Dica Prática de Balcão */}
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-3 text-xs text-emerald-950 space-y-1">
                      <div className="font-black text-[11px] uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                        <Sparkles size={12} className="text-emerald-600" /> Dica de Operação no Empório
                      </div>
                      <p className="text-[11px] text-emerald-900/90 leading-relaxed font-medium">
                        {item.dicaPratica}
                      </p>
                    </div>
                  </div>

                  {/* Rodapé: Tags Fiscais & Ação */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-[11px] font-mono">
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-bold">
                        CSOSN {item.csosnRecomendado}
                      </span>
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-bold">
                        CFOP {item.cfopRecomendado}
                      </span>
                      <span className="text-gray-400 font-sans text-[10px]">
                        Efetivo: <strong className="text-gray-700">{item.aliquotaEfetivaAL}</strong>
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setApplyingItem(item);
                        setSelectedProductId("");
                        setFeedback(null);
                      }}
                      className="text-xs font-black text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>Aplicar a Produto</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          ABA 2: OS DECRETOS DE ALAGOAS NA ÍNTEGRA
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "decretos" && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-3xl p-5 text-blue-950 flex items-start gap-3">
            <BookOpen size={20} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm space-y-1">
              <strong className="font-black text-blue-900">Legislação Consolidada de Alagoas (SEFAZ-AL):</strong>
              <p className="text-blue-800 leading-relaxed font-medium">
                Estes são os decretos estaduais que regem as regras de ICMS, Cesta Básica, Substituição Tributária e isenções para alimentos em Alagoas. Todos os cálculos fiscais do seu sistema obedecem a estas diretrizes.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {DECRETOS_ALAGOAS.map((dec, idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 space-y-5"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg text-xs">
                        {dec.numero}
                      </span>
                      <span className="text-xs text-gray-500 font-bold">• {dec.ano}</span>
                    </div>
                    <h3 className="text-lg font-black text-gray-900">{dec.titulo}</h3>
                    <p className="text-xs font-bold text-gray-600">{dec.subtitulo}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/70 px-3 py-1 rounded-full">
                      {dec.vigencia}
                    </span>
                    <div className="text-[10px] text-gray-400 font-medium mt-1">{dec.orgao}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-1.5">
                    <div className="font-bold text-gray-800 uppercase tracking-wider text-[11px] flex items-center gap-1">
                      <FileText size={13} className="text-gray-500" /> O que estabelece o Decreto
                    </div>
                    <p className="text-gray-600 leading-relaxed font-medium">{dec.resumo}</p>
                  </div>

                  <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-100 space-y-1.5 text-emerald-950">
                    <div className="font-bold text-emerald-900 uppercase tracking-wider text-[11px] flex items-center gap-1">
                      <Sparkles size={13} className="text-emerald-700" /> Impacto Prático no Empório Agrobelém
                    </div>
                    <p className="text-emerald-900 leading-relaxed font-medium">{dec.impactoLoja}</p>
                  </div>
                </div>

                {/* Artigos Principais */}
                <div className="space-y-2 pt-2">
                  <div className="text-xs font-black text-gray-700 uppercase tracking-wider">
                    Artigos &amp; Dispositivos Relevantes:
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {dec.artigosPrincipais.map((art, aIdx) => (
                      <div
                        key={aIdx}
                        className="border border-gray-200 rounded-2xl p-3 bg-white space-y-1 text-xs"
                      >
                        <div className="font-bold text-emerald-800 font-mono text-[11px]">
                          {art.artigo}
                        </div>
                        <p className="text-gray-600 text-[11px] leading-snug">{art.conteudo}</p>
                        <div className="pt-1.5 text-[10px] font-bold text-gray-500 border-t border-gray-100">
                          Aplicação: <span className="text-emerald-700">{art.aplicacaoPratica}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          ABA 3: PRODUTOS DA LOJA POR DECRETO (399 itens)
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "produtos" && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-gray-900">
                  Enquadramento Fiscal do Catálogo da Loja ({companyProducts.length} itens)
                </h3>
                <p className="text-xs text-gray-500">
                  Veja como cada produto cadastrado no seu banco de dados está associado à regra tributária e ao decreto estadual de Alagoas.
                </p>
              </div>

              <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                ✓ 100% com NCM vinculado
              </div>
            </div>

            {/* Tabela de Produtos da Empresa */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 sticky top-0 border-b border-gray-200 font-bold text-gray-600 uppercase text-[10px] tracking-wider z-10">
                    <tr>
                      <th className="px-4 py-3">Produto</th>
                      <th className="px-3 py-3">NCM</th>
                      <th className="px-3 py-3">CEST</th>
                      <th className="px-3 py-3">CSOSN / CFOP</th>
                      <th className="px-4 py-3">Decreto Estadual Enquadrado</th>
                      <th className="px-4 py-3">Regra em Alagoas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                    {companyProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-gray-900">{p.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            {p.barcode || "Sem barras"} • {p.categoryName}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                            {p.ncm}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {p.cest ? (
                            <span className="font-mono font-bold text-blue-700 text-[11px]">
                              {p.cest}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 font-mono text-[11px]">
                          <span className="font-bold text-gray-900">{p.csosn}</span> /{" "}
                          <span className="text-gray-500">{p.cfop}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 font-semibold text-[11px]">
                          {p.decretoEnquadrado}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                              p.csosn === "500"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-emerald-50 text-emerald-800 border-emerald-200"
                            }`}
                          >
                            {p.regraTitulo}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal para Aplicar NCM a um Produto do Catálogo ─────────────────── */}
      {applyingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                  Vincular NCM ao Produto
                </span>
                <h3 className="text-lg font-black text-gray-900 mt-0.5">
                  NCM {applyingItem.ncmFormatted}
                </h3>
              </div>
              <button
                onClick={() => setApplyingItem(null)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Dados do NCM a ser aplicado */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-2 text-xs">
              <div className="font-bold text-gray-800">{applyingItem.description}</div>
              <div className="flex items-center gap-2 flex-wrap font-mono text-[11px]">
                <span className="bg-white px-2 py-0.5 rounded border text-gray-700 font-bold">
                  CSOSN {applyingItem.csosnRecomendado}
                </span>
                <span className="bg-white px-2 py-0.5 rounded border text-gray-700 font-bold">
                  CFOP {applyingItem.cfopRecomendado}
                </span>
                {applyingItem.cest && (
                  <span className="bg-white px-2 py-0.5 rounded border text-blue-700 font-bold">
                    CEST {applyingItem.cest}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-gray-500 pt-1 border-t border-gray-200/60">
                Regra Alagoas: <strong>{applyingItem.regraTitulo}</strong> ({applyingItem.decretoNome})
              </div>
            </div>

            {/* Seleção do Produto */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                Escolha o produto da sua loja para receber esse NCM:
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-300 focus:border-emerald-500 rounded-xl text-xs font-semibold text-gray-800 outline-none cursor-pointer"
              >
                <option value="">Selecione um produto cadastrado...</option>
                {companyProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Atual: NCM {p.ncm})
                  </option>
                ))}
              </select>
            </div>

            {/* Feedback */}
            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  feedback.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {feedback.type === "success" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                <span>{feedback.text}</span>
              </div>
            )}

            {/* Ações */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setApplyingItem(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmApply}
                disabled={!selectedProductId || savingLink}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                {savingLink ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                <span>Gravar no Cadastro</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

