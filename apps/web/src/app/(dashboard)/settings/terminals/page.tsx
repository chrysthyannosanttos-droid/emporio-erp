"use client";

import { useState, useEffect } from "react";
import {
  Monitor, Plus, Download, ShieldCheck, Store, RefreshCw,
  Trash2, AlertCircle, CheckCircle2, Copy, Check, Terminal,
  Clock, Sparkles, X, Key, Wifi, Radio, Send, QrCode, ExternalLink
} from "lucide-react";
import {
  getTerminals,
  getCompanyStores,
  pairTerminal,
  deleteTerminal,
  createTerminalActivation
} from "@/actions/terminals";

interface PdvTerminalData {
  id: string;
  code: string;
  name: string;
  cashierNumber: number;
  status: string;
  ipAddress: string | null;
  version: string | null;
  lastHeartbeat: Date | string | null;
  pairedAt: Date | string | null;
  createdAt: Date | string;
  store: {
    id: string;
    name: string;
    code: string;
    city: string | null;
    state: string | null;
  } | null;
}

interface StoreOption {
  id: string;
  name: string;
  code: string;
  city: string | null;
  tradeName: string | null;
}

export default function TerminalsPage() {
  const [terminals, setTerminals] = useState<PdvTerminalData[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal de Geração Automática de Código de Ativação (Cloud)
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [genStoreId, setGenStoreId] = useState("");
  const [genName, setGenName] = useState("");
  const [genNumber, setGenNumber] = useState(1);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Voucher / Cartão de Ativação em Destaque
  const [voucherTerminal, setVoucherTerminal] = useState<any | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [copiedVoucher, setCopiedVoucher] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  // Modal de Pareamento Manual (legado / fallback)
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [pairCode, setPairCode] = useState("");
  const [pairStoreId, setPairStoreId] = useState("");
  const [pairName, setPairName] = useState("");
  const [pairNumber, setPairNumber] = useState(1);
  const [pairLoading, setPairLoading] = useState(false);
  const [pairError, setPairError] = useState<string | null>(null);

  // Modal do Instalador
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadData = async () => {
    setRefreshing(true);
    try {
      const [termsRes, storesRes] = await Promise.all([
        getTerminals(),
        getCompanyStores()
      ]);

      if (termsRes.terminals) {
        setTerminals(termsRes.terminals as any);
        // Sugere o próximo número de caixa livre
        const numbers = (termsRes.terminals as any[]).map(t => t.cashierNumber || 0);
        const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
        setGenNumber(nextNum);
        setGenName(`Caixa ${String(nextNum).padStart(2, "0")} - Frente`);
      }
      if (storesRes.stores) {
        setStores(storesRes.stores);
        if (storesRes.stores.length > 0 && !genStoreId) {
          setGenStoreId(storesRes.stores[0].id);
          setPairStoreId(storesRes.stores[0].id);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar terminais:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  // 1. Gerar Código de Ativação Automático
  const handleGenerateActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenLoading(true);
    setGenError(null);

    const res = await createTerminalActivation({
      storeId: genStoreId,
      cashierNumber: genNumber,
      name: genName || `Caixa ${String(genNumber).padStart(2, "0")}`
    });

    setGenLoading(false);

    if (res.error) {
      setGenError(res.error);
    } else if (res.terminal) {
      setIsGenerateModalOpen(false);
      setVoucherTerminal(res.terminal);
      setIsVoucherModalOpen(true);
      loadData();
    }
  };

  // 2. Pareamento manual legado
  const handlePairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPairLoading(true);
    setPairError(null);

    const res = await pairTerminal({
      code: pairCode,
      storeId: pairStoreId,
      name: pairName || `Caixa ${pairNumber}`,
      cashierNumber: pairNumber
    });

    setPairLoading(false);

    if (res.error) {
      setPairError(res.error);
    } else {
      setIsPairModalOpen(false);
      setPairCode("");
      setPairName("");
      loadData();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente desvincular o terminal "${name}"? O caixa precisará de um novo código de ativação para operar.`)) {
      return;
    }

    const res = await deleteTerminal(id);
    if (res.success) {
      loadData();
    } else {
      alert(res.error || "Erro ao remover terminal");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const copyVoucherMessage = (term: any) => {
    const storeName = term.store?.name || "Loja Principal";
    const msg = `🚀 ATIVAÇÃO DE CAIXA PDV — CYBERTECH RP\n` +
      `-----------------------------------------\n` +
      `🏪 Filial: ${storeName}\n` +
      `🖥️ Terminal: ${term.name} (Caixa Nº ${term.cashierNumber})\n` +
      `🔑 CÓDIGO DE ATIVAÇÃO: ${term.code}\n` +
      `-----------------------------------------\n` +
      `Passo a passo no computador do caixa:\n` +
      `1. Abra o aplicativo PDV (ou acesse o link do PDV).\n` +
      `2. Digite o código de ativação: ${term.code}\n` +
      `3. O sistema reconhecerá automaticamente este cliente e configurará o Caixa Nº ${term.cashierNumber} via internet!`;

    navigator.clipboard.writeText(msg);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 select-none">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100 flex items-center gap-1.5">
              <Sparkles size={12} className="text-blue-600" />
              Gestão de Caixas & Ativação em Nuvem
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
            <Monitor className="text-blue-600" size={26} />
            Terminais e Caixas PDV
          </h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Gere códigos de autenticação online para cada caixa físico. Ao digitar o código no computador do cliente, o PDV se vincula e configura sozinho.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={() => setIsInstallModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold text-xs transition-all shadow-sm"
          >
            <Download size={15} className="text-gray-500" />
            <span>Instalador (.exe / Web)</span>
          </button>

          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-md shadow-blue-500/20"
          >
            <Key size={15} />
            <span>+ Gerar Código de Ativação</span>
          </button>

          <button
            onClick={loadData}
            disabled={refreshing}
            className="p-2.5 text-gray-400 hover:text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
            title="Atualizar lista de caixas"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin text-blue-600" : ""} />
          </button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Monitor size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold">Total de Caixas</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{terminals.length}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Wifi size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold">Caixas Ativos / Online</p>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">
              {terminals.filter(t => t.status === "ACTIVE").length}
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold">Aguardando Ativação</p>
            <p className="text-2xl font-black text-amber-600 mt-0.5">
              {terminals.filter(t => t.status !== "ACTIVE").length}
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
            <Store size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold">Lojas com PDV</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">
              {new Set(terminals.map(t => t.store?.id).filter(Boolean)).size} / {stores.length || 1}
            </p>
          </div>
        </div>
      </div>

      {/* Como Funciona a Ativação Instantânea */}
      <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/60 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-blue-800 font-bold text-xs uppercase tracking-wider">
            <Sparkles size={15} className="text-blue-600" />
            Como Funciona a Ativação Automática do PDV
          </div>
          <button
            onClick={() => setIsPairModalOpen(true)}
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline"
          >
            Pareamento Manual Alternativo
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-white border border-blue-100 rounded-xl p-4 flex gap-3 shadow-xs">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
              1
            </div>
            <div>
              <p className="font-bold text-gray-900">Gere o Código na Nuvem</p>
              <p className="text-gray-500 mt-0.5 leading-relaxed text-[11px]">
                Defina a loja e o número do caixa (ex: Caixa 01). O sistema gera um código único (ex: <span className="font-mono text-blue-600 font-bold">CYBER-7419</span>).
              </p>
            </div>
          </div>

          <div className="bg-white border border-blue-100 rounded-xl p-4 flex gap-3 shadow-xs">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
              2
            </div>
            <div>
              <p className="font-bold text-gray-900">Instale o PDV no Caixa</p>
              <p className="text-gray-500 mt-0.5 leading-relaxed text-[11px]">
                No computador do cliente, abra o PDV pela primeira vez. A tela solicitará o código de autenticação.
              </p>
            </div>
          </div>

          <div className="bg-white border border-blue-100 rounded-xl p-4 flex gap-3 shadow-xs">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
              3
            </div>
            <div>
              <p className="font-bold text-gray-900">Sincronização 100% Automática</p>
              <p className="text-gray-500 mt-0.5 leading-relaxed text-[11px]">
                Ao digitar o código, o PDV autentica na internet, puxa o número do caixa, produtos, preços e fica pronto para operar offline!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Caixas Cadastrados */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Radio size={16} className="text-blue-600" />
            Caixas e Terminais Cadastrados
          </h2>
          <span className="text-xs text-gray-500 font-medium">
            {terminals.length} {terminals.length === 1 ? "terminal cadastrado" : "terminais cadastrados"}
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white border border-gray-200 rounded-2xl text-gray-400 gap-3 shadow-sm">
            <RefreshCw size={24} className="animate-spin text-blue-600" />
            <p className="text-xs font-medium">Carregando terminais...</p>
          </div>
        ) : terminals.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white border border-dashed border-gray-300 rounded-2xl text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4 border border-blue-100">
              <Key size={32} />
            </div>
            <h3 className="text-base font-bold text-gray-900">Nenhum Caixa / PDV Cadastrado</h3>
            <p className="text-xs text-gray-500 max-w-md mt-1 mb-5">
              Gere o primeiro código de ativação para cadastrar o Caixa 01 do seu cliente.
            </p>
            <button
              onClick={() => setIsGenerateModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-md shadow-blue-500/20"
            >
              <Key size={16} />
              <span>Gerar Primeiro Código de Ativação</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {terminals.map((term) => {
              const isOnline = term.status === "ACTIVE";
              return (
                <div
                  key={term.id}
                  className={`bg-white border rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-md shadow-sm ${
                    isOnline ? "border-gray-200 hover:border-emerald-300" : "border-amber-200 bg-amber-50/20 hover:border-amber-400"
                  }`}
                >
                  <div>
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm ${
                          isOnline
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                            : "bg-amber-100 text-amber-800 border border-amber-300 animate-pulse"
                        }`}>
                          #{String(term.cashierNumber || 1).padStart(2, "0")}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-gray-900 leading-tight">{term.name}</h3>
                          <span className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <Clock size={11} /> Caixa Nº {term.cashierNumber || 1}
                          </span>
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                        isOnline
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-300 flex items-center gap-1"
                      }`}>
                        {isOnline ? "● Ativado / Online" : "⏳ Aguardando Ativação"}
                      </span>
                    </div>

                    {/* Destaque do Código de Ativação para caixas pendentes */}
                    {!isOnline && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
                        <div className="text-[10px] text-amber-700 uppercase font-black tracking-wider flex items-center justify-between mb-1">
                          <span>Código de Ativação do Caixa:</span>
                          <span className="text-[10px] lowercase font-normal">digitar no PDV</span>
                        </div>
                        <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-amber-300 font-mono font-black text-lg text-amber-900 tracking-wider">
                          <span>{term.code}</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(term.code)}
                              className="p-1 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded"
                              title="Copiar código"
                            >
                              {copiedCode === term.code ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setVoucherTerminal(term);
                                setIsVoucherModalOpen(true);
                              }}
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                              title="Ver instruções de ativação"
                            >
                              <ExternalLink size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Loja Vinculada */}
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 mb-3">
                      <div className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1.5 mb-1">
                        <Store size={12} className="text-blue-600" />
                        Loja / Filial do Grupo:
                      </div>
                      <p className="text-xs font-bold text-gray-900">
                        {term.store?.name || "Loja Geral / Matriz"}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        Código: {term.store?.code || "MATRIZ"} {term.store?.city ? `— ${term.store.city}/${term.store.state}` : ""}
                      </p>
                    </div>

                    {/* Dados Técnicos */}
                    <div className="space-y-1.5 text-[11px] text-gray-600 border-t border-gray-100 pt-2.5">
                      {isOnline && (
                        <div className="flex items-center justify-between">
                          <span>Código Vinculado:</span>
                          <span className="font-mono text-gray-700 font-semibold">{term.code}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span>Status da Conexão:</span>
                        <span className={`font-semibold ${isOnline ? "text-emerald-600" : "text-amber-600"}`}>
                          {isOnline ? "Conectado via Nuvem" : "Aguardando primeiro acesso"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span>Versão do PDV:</span>
                        <span className="text-gray-700 font-semibold">{term.version || "v2.0.0 (CyberSync)"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="border-t border-gray-100 pt-3 mt-4 flex items-center justify-between">
                    {!isOnline ? (
                      <button
                        type="button"
                        onClick={() => {
                          setVoucherTerminal(term);
                          setIsVoucherModalOpen(true);
                        }}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5"
                      >
                        <Key size={13} />
                        <span>Ver Cartão de Ativação</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-gray-500 flex items-center gap-1">
                        <Wifi size={11} className="text-emerald-500" /> Online e Operando
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(term.id, term.name)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs flex items-center gap-1 font-medium ml-auto"
                      title="Desvincular Caixa"
                    >
                      <Trash2 size={13} />
                      <span>Excluir</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: Gerar Novo Código de Ativação (Cloud) */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => setIsGenerateModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-xs">
                <Key size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Gerar Código de Ativação para Novo Caixa</h3>
                <p className="text-xs text-gray-500">Cadastre o ponto de venda e obtenha o código para colocar no terminal</p>
              </div>
            </div>

            {genError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{genError}</span>
              </div>
            )}

            <form onSubmit={handleGenerateActivation} className="space-y-4">
              {/* Loja / Filial do Grupo */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Loja do Cliente (Filial) <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={genStoreId}
                  onChange={(e) => setGenStoreId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-2.5 text-gray-900 text-xs font-medium outline-none transition-all cursor-pointer"
                >
                  {stores.length === 0 ? (
                    <option value="">Loja Principal</option>
                  ) : (
                    stores.map((st) => (
                      <option key={st.id} value={st.id}>
                        [{st.code}] {st.name} {st.city ? `(${st.city})` : ""}
                      </option>
                    ))
                  )}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  O caixa usará o catálogo de produtos, preços e emissor fiscal desta loja.
                </p>
              </div>

              {/* Número e Nome do Caixa */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Nº do Caixa
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    required
                    value={genNumber}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setGenNumber(val);
                      if (!genName || genName.startsWith("Caixa ")) {
                        setGenName(`Caixa ${String(val).padStart(2, "0")} - Frente`);
                      }
                    }}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl px-3.5 py-2 text-gray-900 text-xs outline-none transition-all font-bold text-center"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Nome / Localização do Caixa
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Caixa 01 - Balcão"
                    value={genName}
                    onChange={(e) => setGenName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl px-3.5 py-2 text-gray-900 text-xs outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-xs text-blue-900 flex items-center gap-2.5">
                <Sparkles size={16} className="text-blue-600 shrink-0" />
                <p className="text-[11px] leading-relaxed">
                  Ao clicar em <strong>Gerar Código</strong>, o sistema criará uma autenticação segura na nuvem para você passar ao operador ou técnico.
                </p>
              </div>

              {/* Botões */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={genLoading}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
                >
                  {genLoading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Gerando Código...
                    </>
                  ) : (
                    <>
                      <Key size={15} />
                      Gerar Código de Ativação ➔
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Cartão / Voucher de Ativação Gerado */}
      {isVoucherModalOpen && voucherTerminal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-lg p-7 shadow-2xl relative text-center">
            <button
              onClick={() => setIsVoucherModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <CheckCircle2 size={28} />
            </div>

            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Código Gerado com Sucesso!
            </span>

            <h3 className="text-xl font-black text-gray-900 mt-2">
              Autenticação do {voucherTerminal.name} (Caixa #{voucherTerminal.cashierNumber})
            </h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Informe este código no PDV do cliente para ativar e sincronizar este caixa automaticamente via internet:
            </p>

            {/* Código Gigante */}
            <div className="my-5 p-5 bg-gradient-to-b from-gray-50 to-blue-50/40 border-2 border-blue-400 rounded-2xl relative shadow-inner">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                Código de Ativação Online
              </span>
              <div className="font-mono text-3xl sm:text-4xl font-black text-blue-700 tracking-widest select-all">
                {voucherTerminal.code}
              </div>

              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(voucherTerminal.code);
                    setCopiedVoucher(true);
                    setTimeout(() => setCopiedVoucher(false), 2000);
                  }}
                  className="px-4 py-2 rounded-xl bg-white border border-blue-300 hover:border-blue-500 text-blue-700 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  {copiedVoucher ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copiedVoucher ? "Código Copiado!" : "Copiar Código"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => copyVoucherMessage(voucherTerminal)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  {copiedMsg ? <Check size={14} /> : <Send size={14} />}
                  <span>{copiedMsg ? "Mensagem Copiada!" : "Copiar p/ WhatsApp"}</span>
                </button>
              </div>
            </div>

            {/* Detalhes do Caixa */}
            <div className="bg-gray-50 rounded-xl p-3 text-left text-xs space-y-1.5 border border-gray-100 text-gray-600">
              <div className="flex justify-between">
                <span>Loja / Filial:</span>
                <span className="font-bold text-gray-900">{voucherTerminal.store?.name || "Loja Geral"}</span>
              </div>
              <div className="flex justify-between">
                <span>Número do Caixa:</span>
                <span className="font-bold text-gray-900">Caixa Nº {voucherTerminal.cashierNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Status Atual:</span>
                <span className="font-bold text-amber-600">Aguardando digitação no PDV</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsVoucherModalOpen(false)}
              className="w-full mt-5 py-3 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs transition-all cursor-pointer shadow-md"
            >
              Fechar e Voltar aos Caixas
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: Pareamento Manual Legado (Fallback) */}
      {isPairModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => setIsPairModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-gray-100 text-gray-700 border border-gray-200 flex items-center justify-center shadow-xs">
                <Terminal size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Pareamento Manual (Código Informado pelo PDV)</h3>
                <p className="text-xs text-gray-500">Utilize caso o PDV tenha gerado um código próprio local</p>
              </div>
            </div>

            {pairError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{pairError}</span>
              </div>
            )}

            <form onSubmit={handlePairSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Código Mostrado na Tela do PDV <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: PDV-7842"
                  value={pairCode}
                  onChange={(e) => setPairCode(e.target.value.toUpperCase())}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-2.5 text-gray-900 font-mono font-bold text-base tracking-widest placeholder:text-gray-400 outline-none transition-all uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Loja do Grupo (Filial) <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={pairStoreId}
                  onChange={(e) => setPairStoreId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-2.5 text-gray-900 text-xs font-medium outline-none transition-all cursor-pointer"
                >
                  {stores.map((st) => (
                    <option key={st.id} value={st.id}>
                      [{st.code}] {st.name} {st.city ? `(${st.city})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Nome / Localização
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Caixa 01"
                    value={pairName}
                    onChange={(e) => setPairName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl px-3.5 py-2 text-gray-900 text-xs outline-none transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Número do Caixa
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    required
                    value={pairNumber}
                    onChange={(e) => setPairNumber(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl px-3.5 py-2 text-gray-900 text-xs outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsPairModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pairLoading}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
                >
                  {pairLoading ? "Salvando..." : "Vincular"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Como Instalar o PDV nos Computadores */}
      {isInstallModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => setIsInstallModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-xs">
                <Download size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Instalação nos Computadores dos Clientes</h3>
                <p className="text-xs text-gray-500">Opções para rodar o PDV no balcão da loja</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4">
                <span className="font-bold text-blue-900 text-sm block mb-1">
                  1. Modo Kiosk em Tela Cheia (Recomendado)
                </span>
                <p className="text-blue-800 text-[11px] leading-relaxed mb-3">
                  Crie um atalho no Windows com o comando abaixo para iniciar o PDV travado em tela cheia, sem barra de abas ou navegação do Windows:
                </p>
                <div className="bg-gray-900 text-blue-200 p-2.5 rounded-xl font-mono text-[10px] flex items-center justify-between">
                  <code>chrome.exe --kiosk --app=http://seusistema.com/pdv</code>
                  <button
                    onClick={() => copyToClipboard("chrome.exe --kiosk --app=http://seusistema.com/pdv")}
                    className="p-1 hover:text-white"
                  >
                    {copiedCode === "chrome.exe --kiosk --app=http://seusistema.com/pdv" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                <span className="font-bold text-gray-900 text-sm block mb-1">
                  2. Acesso Direto Web
                </span>
                <p className="text-gray-600 text-[11px] leading-relaxed">
                  Basta abrir o navegador no link <span className="font-mono text-blue-600 font-bold">/pdv</span>. Ao abrir pela primeira vez, o PDV pede o Código de Ativação e se auto-configura.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsInstallModalOpen(false)}
              className="w-full mt-4 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
