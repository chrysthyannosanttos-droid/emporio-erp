"use client";

import { useState, useEffect, use } from "react";
import { CheckCircle2, Lock, Package, Send, AlertCircle, Loader2, Building2 } from "lucide-react";

// ─── Types ──────────────────────────────────────────────
interface QuoteProduct {
  id: string;
  name: string;
  barcode?: string;
  unit: string;
  qty: number;
}

interface QuoteSession {
  id: string;
  token: string;
  companyName: string;
  deadline: string;
  products: QuoteProduct[];
  supplierName: string;
  supplierCnpj: string;
}

// ─── Mock data ───────────────────────────────────────────
const MOCK_QUOTE_SESSIONS: Record<string, QuoteSession> = {
  "COTA-2026-001": {
    id: "COTA-2026-001",
    token: "COTA-2026-001",
    companyName: "Empório Distribuidora LTDA",
    deadline: "2026-07-20",
    supplierName: "Distribuidora Norte LTDA",
    supplierCnpj: "12.345.678/0001-99",
    products: [
      { id: "p1", name: "Heineken Long Neck 330ml", barcode: "7891991011909", unit: "UN", qty: 24 },
      { id: "p2", name: "Skol Pilsen Lata 350ml",   barcode: "7891991010001", unit: "UN", qty: 48 },
      { id: "p3", name: "Coca-Cola 2L",             barcode: "7894900011517", unit: "UN", qty: 12 },
      { id: "p4", name: "Óleo de Soja Liza 900ml",  barcode: "7896102502813", unit: "UN", qty: 36 },
    ]
  },
  "COTA-2026-002": {
    id: "COTA-2026-002",
    token: "COTA-2026-002",
    companyName: "Empório Distribuidora LTDA",
    deadline: "2026-07-18",
    supplierName: "Bebidas Premium S.A.",
    supplierCnpj: "98.765.432/0001-11",
    products: [
      { id: "p1", name: "Heineken Long Neck 330ml", barcode: "7891991011909", unit: "UN", qty: 24 },
      { id: "p2", name: "Skol Pilsen Lata 350ml",   barcode: "7891991010001", unit: "UN", qty: 48 },
      { id: "p3", name: "Coca-Cola 2L",             barcode: "7894900011517", unit: "UN", qty: 12 },
      { id: "p4", name: "Óleo de Soja Liza 900ml",  barcode: "7896102502813", unit: "UN", qty: 36 },
    ]
  }
};

// ─── Mock credentials ────────────────────────────────────
const MOCK_CREDENTIALS: Record<string, { password: string; supplierName: string }> = {
  "12.345.678/0001-99": { password: "norte123",    supplierName: "Distribuidora Norte LTDA" },
  "98.765.432/0001-11": { password: "bebidas2026", supplierName: "Bebidas Premium S.A." },
  "11.222.333/0001-44": { password: "limpeza456",  supplierName: "Limpeza Total Distribuidora" },
  "55.666.777/0001-88": { password: "frios789",    supplierName: "Frios & Laticínios Nordeste" },
};

// ─── Main Component ──────────────────────────────────────
export default function CotacaoPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [phase, setPhase] = useState<"login" | "filling" | "submitted" | "expired" | "notfound">("login");
  const [cnpj, setCnpj] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [session, setSession] = useState<QuoteSession | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [paymentProposal, setPaymentProposal] = useState("À Vista");
  const [observations, setObservations] = useState("");
  const [loggedSupplierName, setLoggedSupplierName] = useState("");

  useEffect(() => {
    const s = MOCK_QUOTE_SESSIONS[token];
    if (!s) { setPhase("notfound"); return; }
    if (new Date(s.deadline) < new Date()) { setPhase("expired"); return; }
    setSession(s);
    const init: Record<string, string> = {};
    s.products.forEach(p => { init[p.id] = ""; });
    setPrices(init);
  }, [token]);

  const total = session
    ? session.products.reduce((acc, p) => acc + (parseFloat(prices[p.id] || "0") * p.qty), 0)
    : 0;

  const filledCount = session
    ? session.products.filter(p => prices[p.id] && parseFloat(prices[p.id]) > 0).length
    : 0;

  const allFilled = session ? filledCount === session.products.length : false;

  // ─── Login ───────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoggingIn(true);
    await new Promise(r => setTimeout(r, 900));
    const cred = MOCK_CREDENTIALS[cnpj.trim()];
    if (!cred || cred.password !== password) {
      setLoginError("CNPJ ou senha incorretos. Verifique suas credenciais.");
      setLoggingIn(false);
      return;
    }
    setLoggedSupplierName(cred.supplierName);
    setLoggingIn(false);
    setPhase("filling");
  };

  // ─── Submit ──────────────────────────────────────────
  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allFilled) {
      alert("Preencha o preço de todos os produtos antes de enviar.");
      return;
    }
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 2000));
    setSubmitting(false);
    setPhase("submitted");
  };

  // ─── NOT FOUND ───────────────────────────────────────
  if (phase === "notfound") return (
    <div className="min-h-screen bg-[#060919] flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <AlertCircle size={56} className="mx-auto text-rose-400" />
        <h1 className="text-2xl font-bold text-white">Link Inválido</h1>
        <p className="text-slate-400 max-w-sm">Este link de cotação não existe ou foi removido.</p>
      </div>
    </div>
  );

  // ─── EXPIRED ─────────────────────────────────────────
  if (phase === "expired") return (
    <div className="min-h-screen bg-[#060919] flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <AlertCircle size={56} className="mx-auto text-amber-400" />
        <h1 className="text-2xl font-bold text-white">Cotação Encerrada</h1>
        <p className="text-slate-400 max-w-sm">O prazo para envio de propostas já foi encerrado.</p>
      </div>
    </div>
  );

  // ─── LOGIN ───────────────────────────────────────────
  if (phase === "login") return (
    <div className="min-h-screen bg-[#060919] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-600/40">
            <Building2 size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">Portal de Cotação</h1>
          {session && (
            <p className="text-slate-400 mt-1 text-sm">
              Solicitado por <span className="text-indigo-400 font-semibold">{session.companyName}</span>
            </p>
          )}
          {session && (
            <div className="mt-3 inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold px-3 py-1.5 rounded-full">
              Prazo: {new Date(session.deadline).toLocaleDateString("pt-BR")}
            </div>
          )}
        </div>

        <div className="bg-[#111528] border border-indigo-500/15 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-indigo-500/[0.08] bg-[#0c0f1a]/60">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Lock size={14} className="text-indigo-400" /> Acesso do Fornecedor
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Insira seu CNPJ e a senha recebida por e-mail</p>
          </div>

          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">CNPJ da Empresa</label>
              <input
                type="text" value={cnpj} onChange={e => setCnpj(e.target.value)}
                placeholder="00.000.000/0001-00" required autoFocus
                className="w-full bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white px-3 py-2.5 rounded-lg outline-none text-sm font-mono transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Senha de Acesso</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Senha recebida no e-mail" required
                className="w-full bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white px-3 py-2.5 rounded-lg outline-none text-sm transition-all"
              />
            </div>
            {loginError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" /> {loginError}
              </div>
            )}
            <button type="submit" disabled={loggingIn}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/30 text-sm transition-all active:scale-95 flex items-center justify-center gap-2">
              {loggingIn ? <><Loader2 size={14} className="animate-spin" /> Verificando...</> : "Entrar e Preencher Cotação"}
            </button>
            <p className="text-center text-[10px] text-slate-600">Problemas? Entre em contato com a empresa solicitante.</p>
          </form>
        </div>
      </div>
    </div>
  );

  // ─── SUBMITTED ───────────────────────────────────────
  if (phase === "submitted") return (
    <div className="min-h-screen bg-[#060919] flex items-center justify-center p-6">
      <div className="text-center space-y-5 max-w-md">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
          <CheckCircle2 size={40} className="text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Cotação Enviada!</h1>
          <p className="text-slate-400 mt-2 text-sm leading-relaxed">
            Obrigado, <span className="text-white font-semibold">{loggedSupplierName}</span>!
            Sua proposta foi registrada com sucesso.
          </p>
        </div>
        <div className="bg-[#111528] border border-indigo-500/10 rounded-2xl p-5 text-left space-y-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Resumo da Proposta</p>
          <p className="text-xs text-slate-300">Condição: <span className="text-white font-semibold">{paymentProposal}</span></p>
          <p className="text-xs text-slate-300">Total: <span className="text-indigo-400 font-bold text-base font-mono">
            R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span></p>
          {observations && <p className="text-xs text-slate-400 italic">"{observations}"</p>}
        </div>
        <p className="text-[10px] text-slate-600">Você pode fechar esta janela.</p>
      </div>
    </div>
  );

  // ─── FILLING (main form with sticky footer) ──────────
  return (
    <div className="min-h-screen bg-[#060919] flex flex-col">

      {/* ── Sticky top header ── */}
      <div className="sticky top-0 z-20 bg-[#060919]/95 backdrop-blur-sm border-b border-indigo-500/10 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Building2 size={12} className="text-white" />
              </div>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Portal de Cotação</span>
            </div>
            <p className="text-xs text-slate-400">
              <span className="text-white font-semibold">{session?.companyName}</span>
              {" · "}
              Logado como <span className="text-indigo-300 font-semibold">{loggedSupplierName}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase">Prazo</p>
            <p className="text-sm font-bold text-amber-400">
              {session && new Date(session.deadline).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>
      </div>

      {/* ── Scrollable content (pb-28 leaves space for footer) ── */}
      <div className="flex-1 pb-28 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <form id="quote-form" onSubmit={handleSubmitQuote} className="space-y-4">

            {/* Products table */}
            <div className="bg-[#111528] border border-indigo-500/10 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-indigo-500/[0.08] bg-[#0c0f1a]/50">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Package size={16} className="text-indigo-400" /> Produtos para Cotar
                </h2>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Preencha o seu <strong>preço unitário</strong> para cada item. Todos os campos são obrigatórios.
                </p>
              </div>

              <table className="w-full text-sm">
                <thead className="bg-[#0c0f1a]/40 text-slate-500 text-[10px] font-bold uppercase border-b border-indigo-500/[0.06]">
                  <tr>
                    <th className="px-5 py-3 text-left">Produto</th>
                    <th className="px-5 py-3 text-right w-16">Qtd</th>
                    <th className="px-5 py-3 text-right w-16">Un.</th>
                    <th className="px-5 py-3 text-right w-40">Seu Preço Unit. (R$)</th>
                    <th className="px-5 py-3 text-right w-32">Total Estimado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-500/[0.06]">
                  {session?.products.map(p => {
                    const itemTotal = parseFloat(prices[p.id] || "0") * p.qty;
                    const filled = !!prices[p.id] && parseFloat(prices[p.id]) > 0;
                    return (
                      <tr key={p.id} className="hover:bg-indigo-500/[0.03] transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-white text-xs">{p.name}</p>
                          {p.barcode && <p className="text-[10px] text-slate-500 font-mono mt-0.5">{p.barcode}</p>}
                        </td>
                        <td className="px-5 py-4 text-right text-slate-400 text-xs font-mono">{p.qty}</td>
                        <td className="px-5 py-4 text-right text-slate-400 text-xs font-mono">{p.unit}</td>
                        <td className="px-5 py-4">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-semibold">R$</span>
                            <input
                              type="number" step="0.01" min="0.01"
                              value={prices[p.id] || ""}
                              onChange={e => setPrices(prev => ({ ...prev, [p.id]: e.target.value }))}
                              required placeholder="0,00"
                              className={`w-full rounded-xl pl-9 pr-3 py-2.5 outline-none text-sm font-mono text-right font-bold transition-all border bg-[#0c0f1a] ${
                                filled
                                  ? "border-emerald-500/40 text-emerald-300 focus:border-emerald-400"
                                  : "border-indigo-500/20 text-white focus:border-indigo-500"
                              }`}
                            />
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className={`font-mono text-sm font-bold ${itemTotal > 0 ? "text-emerald-400" : "text-slate-600"}`}>
                            {itemTotal > 0 ? `R$ ${itemTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t border-indigo-500/10 bg-[#0c0f1a]/60">
                  <tr>
                    <td colSpan={4} className="px-5 py-4 text-right text-slate-400 font-bold text-xs uppercase">Total Geral da Proposta:</td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-indigo-400 font-black text-lg font-mono">
                        R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Condições Comerciais */}
            <div className="bg-[#111528] border border-indigo-500/10 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white">Condições Comerciais</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Condição de Pagamento Proposta</label>
                  <select value={paymentProposal} onChange={e => setPaymentProposal(e.target.value)}
                    className="w-full bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white px-3 py-2.5 rounded-lg outline-none text-sm font-semibold">
                    {["À Vista","7 dias","14 dias","28 dias","30 dias","30/60 dias","30/60/90 dias","45 dias","60 dias"].map(c => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Observações (opcional)</label>
                <textarea value={observations} onChange={e => setObservations(e.target.value)}
                  placeholder="Prazo de entrega, disponibilidade, informações adicionais..."
                  rows={3}
                  className="w-full bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white px-3 py-2.5 rounded-lg outline-none text-sm resize-none transition-all"
                />
              </div>
            </div>

          </form>
        </div>
      </div>

      {/* ── STICKY FOOTER — sempre visível ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#0b0e1f]/96 backdrop-blur-md border-t border-indigo-500/15 shadow-[0_-8px_40px_rgba(0,0,0,0.6)]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-5">

          {/* Progress bar */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Itens preenchidos</p>
              <p className="text-[10px] text-slate-400 font-mono font-bold">
                {filledCount} / {session?.products.length ?? 0}
              </p>
            </div>
            <div className="h-2 bg-[#1a1f3a] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${session ? (filledCount / session.products.length) * 100 : 0}%`,
                  background: allFilled
                    ? "linear-gradient(90deg, #10b981, #34d399)"
                    : "linear-gradient(90deg, #4f46e5, #818cf8)"
                }}
              />
            </div>
            {allFilled && (
              <p className="text-[10px] text-emerald-400 font-semibold mt-1">✓ Todos os preços preenchidos. Pronto para enviar!</p>
            )}
          </div>

          {/* Total */}
          <div className="text-right shrink-0">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total</p>
            <p className="text-xl font-black text-indigo-400 font-mono leading-none">
              R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{paymentProposal}</p>
          </div>

          {/* CTA Button */}
          <button
            type="submit"
            form="quote-form"
            disabled={submitting}
            className={`shrink-0 font-black px-8 py-4 rounded-2xl text-sm transition-all active:scale-95 flex items-center gap-2 min-w-[200px] justify-center shadow-lg ${
              allFilled
                ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/40"
                : "bg-indigo-600/40 text-white/60 cursor-not-allowed"
            } disabled:opacity-50`}
          >
            {submitting
              ? <><Loader2 size={18} className="animate-spin" /> Enviando...</>
              : <><Send size={18} /> Enviar Cotação</>
            }
          </button>

        </div>
      </div>
    </div>
  );
}
