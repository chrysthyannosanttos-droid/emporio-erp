"use client";

import { useState, useEffect } from "react";
import {
  Monitor, Plus, Download, ShieldCheck, Store, RefreshCw,
  Trash2, AlertCircle, CheckCircle2, Copy, Check, Terminal,
  Laptop, ExternalLink, HardDrive, Wifi, Radio, Clock,
  ArrowRight, Key, Sparkles, X, Layers
} from "lucide-react";
import { getTerminals, getCompanyStores, pairTerminal, deleteTerminal } from "@/actions/terminals";

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

  // Modal de Pareamento
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
        setTerminals(termsRes.terminals as unknown as PdvTerminalData[]);
      }
      if (storesRes) {
        setStores(storesRes);
        if (storesRes.length > 0 && !pairStoreId) {
          setPairStoreId(storesRes[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Polling a cada 10s para atualizar status
    return () => clearInterval(interval);
  }, []);

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

    if (res.error) {
      setPairError(res.error);
      setPairLoading(false);
    } else {
      setPairLoading(false);
      setIsPairModalOpen(false);
      setPairCode("");
      setPairName("");
      loadData();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente desvincular o terminal "${name}"? O caixa precisará de um novo pareamento para operar.`)) {
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0e1222] border border-indigo-500/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
              Frente de Caixa & Desktops
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Monitor className="text-indigo-400" size={26} />
            Terminais e Caixas PDV
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Vincule os caixas instalados nos computadores às lojas do grupo pelo código de ativação e baixe o instalador oficial.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsInstallModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white font-semibold text-xs transition-all shadow-sm"
          >
            <Download size={16} />
            <span>Baixar Instalador (.exe)</span>
          </button>

          <button
            onClick={() => setIsPairModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/30"
          >
            <Plus size={16} />
            <span>Vincular Novo Caixa</span>
          </button>

          <button
            onClick={loadData}
            disabled={refreshing}
            className="p-2.5 text-slate-400 hover:text-white bg-[#101526] border border-indigo-500/10 rounded-xl hover:bg-indigo-500/10 transition-colors"
            title="Atualizar lista"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin text-indigo-400" : ""} />
          </button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0e1222] border border-indigo-500/10 rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <Monitor size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total de Caixas</p>
            <p className="text-xl font-bold text-white mt-0.5">{terminals.length}</p>
          </div>
        </div>

        <div className="bg-[#0e1222] border border-indigo-500/10 rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Wifi size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Caixas Ativos / Online</p>
            <p className="text-xl font-bold text-emerald-400 mt-0.5">
              {terminals.filter(t => t.status === "ACTIVE").length}
            </p>
          </div>
        </div>

        <div className="bg-[#0e1222] border border-indigo-500/10 rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
            <Store size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Lojas com PDV</p>
            <p className="text-xl font-bold text-white mt-0.5">
              {new Set(terminals.map(t => t.store?.id).filter(Boolean)).size} / {stores.length}
            </p>
          </div>
        </div>

        <div className="bg-[#0e1222] border border-indigo-500/10 rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Versão Oficial PDV</p>
            <p className="text-xl font-bold text-amber-300 mt-0.5">v2.0.0 (CyberSync)</p>
          </div>
        </div>
      </div>

      {/* Como Funciona o Pareamento (Banner explicativo) */}
      <div className="bg-gradient-to-r from-indigo-950/40 via-[#0e1222] to-violet-950/30 border border-indigo-500/20 rounded-2xl p-5">
        <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider mb-3">
          <Sparkles size={15} />
          Fluxo de Instalação e Ativação em 3 Passos
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-[#12162a]/80 border border-indigo-500/10 rounded-xl p-3.5 flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0">
              1
            </div>
            <div>
              <p className="font-bold text-white">Instale o PDV no Caixa</p>
              <p className="text-slate-400 mt-0.5 leading-relaxed">
                Baixe o instalador no computador do caixa. Ele funciona de forma autônoma e offline.
              </p>
            </div>
          </div>

          <div className="bg-[#12162a]/80 border border-indigo-500/10 rounded-xl p-3.5 flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0">
              2
            </div>
            <div>
              <p className="font-bold text-white">Anote o Código de Ativação</p>
              <p className="text-slate-400 mt-0.5 leading-relaxed">
                Ao abrir pela primeira vez, o PDV gera um código na tela (ex: <span className="font-mono text-indigo-300">PDV-7842</span>).
              </p>
            </div>
          </div>

          <div className="bg-[#12162a]/80 border border-indigo-500/10 rounded-xl p-3.5 flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">
              3
            </div>
            <div>
              <p className="font-bold text-white">Vincule à Loja do Grupo</p>
              <p className="text-slate-400 mt-0.5 leading-relaxed">
                Clique em "Vincular Novo Caixa", informe o código e selecione a filial. O PDV ativa na hora!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Caixas Cadastrados */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Radio size={16} className="text-indigo-400" />
            Caixas e Terminais Cadastrados
          </h2>
          <span className="text-xs text-slate-400">
            {terminals.length} {terminals.length === 1 ? "terminal encontrado" : "terminais encontrados"}
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 bg-[#0e1222] border border-indigo-500/10 rounded-2xl text-slate-400 gap-3">
            <RefreshCw size={24} className="animate-spin text-indigo-400" />
            <p className="text-xs">Carregando terminais...</p>
          </div>
        ) : terminals.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-[#0e1222] border border-dashed border-indigo-500/20 rounded-2xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 flex items-center justify-center text-indigo-400 mb-4">
              <Monitor size={32} />
            </div>
            <h3 className="text-base font-bold text-white">Nenhum Caixa / PDV Vinculado</h3>
            <p className="text-xs text-slate-400 max-w-md mt-1 mb-5">
              Instale o PDV nos computadores da sua loja e vincule-os pelo código gerado na tela de cada caixa.
            </p>
            <button
              onClick={() => setIsPairModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors"
            >
              <Plus size={16} />
              <span>Vincular Primeiro Caixa</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {terminals.map((term) => {
              const isOnline = term.status === "ACTIVE";
              return (
                <div
                  key={term.id}
                  className="bg-[#0e1222] border border-indigo-500/15 hover:border-indigo-500/30 rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-lg hover:shadow-indigo-950/30"
                >
                  <div>
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                          isOnline
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}>
                          #{term.cashierNumber || 1}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white leading-tight">{term.name}</h3>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock size={11} /> Caixa Nº {term.cashierNumber || 1}
                          </span>
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isOnline
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}>
                        {isOnline ? "● Ativo / Pareado" : "Aguardando"}
                      </span>
                    </div>

                    {/* Loja Vinculada */}
                    <div className="bg-[#121628] border border-indigo-500/10 rounded-xl p-3 mb-3">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1.5 mb-1">
                        <Store size={12} className="text-indigo-400" />
                        Loja / Filial do Grupo:
                      </div>
                      <p className="text-xs font-bold text-white">
                        {term.store?.name || "Loja Geral"}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Código: {term.store?.code || "MATRIZ"} {term.store?.city ? `— ${term.store.city}/${term.store.state}` : ""}
                      </p>
                    </div>

                    {/* Dados Técnicos */}
                    <div className="space-y-1.5 text-[11px] text-slate-400 border-t border-slate-800/80 pt-2.5">
                      <div className="flex items-center justify-between">
                        <span>Código do Terminal:</span>
                        <div className="flex items-center gap-1.5 font-mono text-indigo-300 font-bold bg-indigo-500/10 px-2 py-0.5 rounded">
                          <span>{term.code}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(term.code)}
                            className="hover:text-white"
                            title="Copiar código"
                          >
                            {copiedCode === term.code ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span>IP Registrado:</span>
                        <span className="font-mono text-slate-300">{term.ipAddress || "127.0.0.1"}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span>Versão do PDV:</span>
                        <span className="text-slate-300 font-semibold">{term.version || "v2.0.0"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="border-t border-slate-800/80 pt-3 mt-4 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Wifi size={10} className="text-emerald-400" /> Conexão Segura
                    </span>

                    <button
                      type="button"
                      onClick={() => handleDelete(term.id, term.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors text-xs flex items-center gap-1 font-medium"
                      title="Desvincular Caixa"
                    >
                      <Trash2 size={13} />
                      <span>Desvincular</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: Vincular Novo Caixa */}
      {isPairModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0e1224] border border-indigo-500/20 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => setIsPairModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                <Key size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Vincular Novo Terminal PDV</h3>
                <p className="text-xs text-slate-400">Ative um ponto de venda físico em sua empresa</p>
              </div>
            </div>

            {pairError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{pairError}</span>
              </div>
            )}

            <form onSubmit={handlePairSubmit} className="space-y-4">
              {/* Código de Ativação */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Código de Ativação do PDV <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Ex: PDV-7842-AX"
                    value={pairCode}
                    onChange={(e) => setPairCode(e.target.value.toUpperCase())}
                    className="w-full bg-[#12162a] border border-indigo-500/20 focus:border-indigo-500 rounded-xl px-4 py-3 text-white font-mono font-bold text-base tracking-widest placeholder:text-slate-600 outline-none transition-all uppercase"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">
                    Código do Terminal
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Este código é gerado na tela inicial do aplicativo PDV instalado no computador do caixa.
                </p>
              </div>

              {/* Loja / Filial do Grupo */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Loja do Grupo (Filial) <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={pairStoreId}
                  onChange={(e) => setPairStoreId(e.target.value)}
                  className="w-full bg-[#12162a] border border-indigo-500/20 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-white text-xs font-medium outline-none transition-all cursor-pointer"
                >
                  {stores.length === 0 ? (
                    <option value="">Nenhuma loja cadastrada</option>
                  ) : (
                    stores.map((st) => (
                      <option key={st.id} value={st.id} className="bg-[#12162a]">
                        [{st.code}] {st.name} {st.city ? `(${st.city})` : ""}
                      </option>
                    ))
                  )}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  O caixa venderá com o estoque, emissão fiscal e regras desta loja.
                </p>
              </div>

              {/* Nome e Número do Caixa */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Identificação / Nome
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Caixa 01 - Frente"
                    value={pairName}
                    onChange={(e) => setPairName(e.target.value)}
                    className="w-full bg-[#12162a] border border-indigo-500/20 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-white text-xs outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Número do Caixa
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    required
                    value={pairNumber}
                    onChange={(e) => setPairNumber(Number(e.target.value))}
                    className="w-full bg-[#12162a] border border-indigo-500/20 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-white text-xs outline-none transition-all"
                  />
                </div>
              </div>

              {/* Botões */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPairModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pairLoading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                >
                  {pairLoading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Vinculando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      Vincular e Ativar Caixa
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Baixar Instalador */}
      {isInstallModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0e1224] border border-indigo-500/20 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsInstallModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                <Download size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Instalador Desktop do PDV</h3>
                <p className="text-xs text-slate-400">Aplicativo de alta performance para Windows</p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="bg-[#12162a] border border-indigo-500/10 rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-white text-sm flex items-center gap-2">
                    <span>Emporio-PDV-Setup-2.0.0.exe</span>
                    <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">
                      Pronto (97.5 MB)
                    </span>
                  </p>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Instalador Convencional do Windows (Assistente Passo a Passo • Atalho na Área de Trabalho)
                  </p>
                </div>
                <a
                  href="/api/pdv/installer/download"
                  download="Emporio-PDV-Setup-2.0.0.exe"
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition-all text-xs shrink-0 cursor-pointer"
                >
                  <Download size={15} />
                  <span>Baixar Instalador .exe</span>
                </a>
              </div>

              <div className="border border-slate-800 rounded-xl p-4 space-y-2 bg-[#0a0d18]">
                <p className="font-bold text-white flex items-center gap-2">
                  <Terminal size={14} className="text-indigo-400" />
                  Instalação Convencional no Computador do Caixa:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-400 pl-1 leading-relaxed">
                  <li>Clique no botão acima para baixar o instalador oficial <strong>Emporio-PDV-Setup-2.0.0.exe</strong>.</li>
                  <li>Execute o arquivo baixado. O <strong>Assistente de Instalação Padrão</strong> abrirá na tela.</li>
                  <li>Siga os passos normais: Escolha a pasta e clique em <em>Instalar</em> (o atalho será criado na Área de Trabalho).</li>
                  <li>Ao abrir o aplicativo pela primeira vez, ele exibirá o <strong>Código de Ativação</strong>.</li>
                  <li>Volte a esta tela no painel, clique em <strong>"Vincular Novo Caixa"</strong>, digite o código e selecione a Loja correspondente.</li>
                  <li>O PDV será ativado instantaneamente e pronto para vender!</li>
                </ol>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsInstallModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
