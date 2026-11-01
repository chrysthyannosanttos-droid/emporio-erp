"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search, ScanBarcode, ShoppingCart, Plus, Minus, Trash2, X, Check,
  Banknote, QrCode, CreditCard, Landmark, MessageCircle, Share2, Mail,
  MessageSquare, Link2, ExternalLink, Loader2, AlertCircle, ArrowLeft, Receipt,
} from "lucide-react";
import {
  searchMobileProducts,
  lookupMobileBarcode,
  createMobileSale,
} from "@/actions/mobilePdv";
import type { MobileProduct } from "@/actions/mobilePdv";
import {
  ReceiptData,
  buildReceiptText,
  buildWhatsAppUrl,
  buildSmsUrl,
  buildMailtoUrl,
  formatBRL,
} from "@/lib/receiptFormat";

interface CartLine {
  product: MobileProduct;
  qty: number;
  qtyText: string;
}

interface Props {
  userName: string;
  companyName: string;
  canDiscountLimited: boolean;
  canDiscountUnlimited: boolean;
}

const PAYMENTS = [
  { key: "MONEY", label: "Dinheiro", icon: Banknote },
  { key: "PIX", label: "PIX", icon: QrCode },
  { key: "CREDIT_CARD", label: "Crédito", icon: CreditCard },
  { key: "DEBIT_CARD", label: "Débito", icon: Landmark },
];

const parseNum = (text: string) => {
  const n = parseFloat(String(text).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/* ───────────────────────── Leitor de código de barras (câmera) ───────────────────────── */
function BarcodeScanner({ onDetected, onClose }: { onDetected: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let stopped = false;

    (async () => {
      try {
        const Detector = (window as any).BarcodeDetector;
        if (!Detector) {
          setError("Seu navegador não suporta leitura por câmera. Digite o código de barras na busca.");
          return;
        }
        const detector = new Detector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] });
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (stopped || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        timer = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0 && codes[0].rawValue) {
              if (timer) clearInterval(timer);
              onDetected(codes[0].rawValue);
            }
          } catch {}
        }, 250);
      } catch {
        setError("Não foi possível acessar a câmera. Verifique a permissão do navegador.");
      }
    })();

    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between p-4 text-white">
        <p className="font-bold text-base">Aponte para o código de barras</p>
        <button onClick={onClose} className="p-2 rounded-full bg-white/15" aria-label="Fechar leitor">
          <X size={22} />
        </button>
      </div>
      <div className="flex-1 relative flex items-center justify-center">
        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        <div className="relative w-[78%] h-40 border-4 border-emerald-400 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
      </div>
      {error && <p className="p-4 text-center text-sm font-semibold text-amber-300 bg-black">{error}</p>}
    </div>
  );
}

/* ───────────────────────── Componente principal ───────────────────────── */
export function MobilePdvClient({ userName, companyName, canDiscountLimited, canDiscountUnlimited }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MobileProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerSupported, setScannerSupported] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState("MONEY");
  const [discountText, setDiscountText] = useState("");
  const [cpf, setCpf] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [cashback, setCashback] = useState(0);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);

  const searchSeq = useRef(0);
  const canDiscount = canDiscountLimited || canDiscountUnlimited;

  useEffect(() => {
    setScannerSupported(typeof window !== "undefined" && "BarcodeDetector" in window);
  }, []);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  }, []);

  /* Busca com debounce */
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    const seq = ++searchSeq.current;
    setSearching(true);
    const timer = setTimeout(async () => {
      const res = await searchMobileProducts(q);
      if (seq !== searchSeq.current) return; // resposta antiga, descarta
      setResults(res.products);
      setSearching(false);
      if (res.error) setError(res.error);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  /* Carrinho */
  const addProduct = useCallback((product: MobileProduct) => {
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.product.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        const isWeight = product.unit.toUpperCase() === "KG";
        const qty = Math.round((next[idx].qty + (isWeight ? 0.1 : 1)) * 1000) / 1000;
        next[idx] = { ...next[idx], qty, qtyText: String(qty).replace(".", ",") };
        return next;
      }
      return [...prev, { product, qty: 1, qtyText: "1" }];
    });
    flash(`+ ${product.name}`);
  }, [flash]);

  const changeQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((l) => {
        if (l.product.id !== id) return l;
        const step = l.product.unit.toUpperCase() === "KG" ? 0.1 : 1;
        const qty = Math.max(0, Math.round((l.qty + delta * step) * 1000) / 1000);
        return { ...l, qty, qtyText: String(qty).replace(".", ",") };
      })
    );
  };

  const setQtyText = (id: string, text: string) => {
    setCart((prev) => prev.map((l) => (l.product.id === id ? { ...l, qtyText: text, qty: parseNum(text) } : l)));
  };

  const removeLine = (id: string) => setCart((prev) => prev.filter((l) => l.product.id !== id));

  const subtotal = useMemo(() => cart.reduce((acc, l) => acc + l.qty * l.product.price, 0), [cart]);
  const discount = Math.max(0, parseNum(discountText));
  const total = Math.max(0, subtotal - discount);
  const itemCount = cart.length;
  const hasInvalidQty = cart.some((l) => l.qty <= 0);

  /* Código de barras (digitado ou lido pela câmera) */
  const handleBarcode = useCallback(async (code: string) => {
    setShowScanner(false);
    const res = await lookupMobileBarcode(code);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.product) {
      addProduct(res.product);
      setQuery("");
      setResults([]);
    } else {
      setError(`Nenhum produto com o código ${code}.`);
      setQuery(code);
    }
  }, [addProduct]);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (/^\d{8,14}$/.test(q)) handleBarcode(q);
  };

  /* Finalizar venda */
  const finalizeSale = async () => {
    setError("");
    if (cart.length === 0) return setError("O carrinho está vazio.");
    if (hasInvalidQty) return setError("Corrija as quantidades zeradas.");

    setSubmitting(true);
    const res = await createMobileSale({
      items: cart.map((l) => ({ productId: l.product.id, quantity: l.qty })),
      paymentMethod,
      discount,
      customerCpf: cpf.replace(/\D/g, "") || undefined,
    });
    setSubmitting(false);

    if ("error" in res) {
      setError(res.error);
      return;
    }
    setReceipt(res.receipt);
    setCashback(res.cashbackEarned);
    setShowCart(false);
  };

  const newSale = () => {
    setReceipt(null);
    setCashback(0);
    setCart([]);
    setQuery("");
    setResults([]);
    setDiscountText("");
    setCpf("");
    setPaymentMethod("MONEY");
    setPhone("");
    setEmail("");
    setError("");
    setCopied(false);
  };

  /* Envio do cupom */
  const receiptUrl = receipt ? `${window.location.origin}/cupom/${receipt.saleId}` : "";
  const receiptText = receipt ? buildReceiptText(receipt, receiptUrl) : "";

  const shareWhatsApp = () => window.open(buildWhatsAppUrl(phone, receiptText), "_blank");
  const shareSms = () => { window.location.href = buildSmsUrl(phone, receiptText); };
  const shareEmail = () => {
    if (!receipt) return;
    window.location.href = buildMailtoUrl(email, receipt.companyName, receipt.number, receiptText);
  };
  const shareNative = async () => {
    if (!receipt) return;
    try {
      await navigator.share({ title: `Cupom ${receipt.number} — ${receipt.companyName}`, text: receiptText });
    } catch {}
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(receiptUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Não foi possível copiar. Use o botão Ver cupom e copie o endereço.");
    }
  };

  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  /* ───────── Tela: venda concluída ───────── */
  if (receipt) {
    const actionBtn = "w-full flex items-center justify-center gap-2 rounded-xl font-bold text-base py-3.5 active:scale-[0.98] transition-transform";
    return (
      <div className="fixed inset-0 bg-slate-100 overflow-y-auto">
        <div className="max-w-md mx-auto p-4 pb-10 space-y-4">
          <div className="bg-emerald-600 text-white rounded-2xl p-6 text-center shadow-lg">
            <div className="mx-auto w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mb-3">
              <Check size={32} />
            </div>
            <p className="text-sm font-semibold opacity-95">Venda concluída — Cupom nº {receipt.number}</p>
            <p className="text-4xl font-black mt-1">{formatBRL(receipt.total)}</p>
            {cashback > 0 && (
              <p className="mt-2 text-sm font-bold bg-white/20 rounded-lg inline-block px-3 py-1">
                Cashback creditado: {formatBRL(cashback)}
              </p>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow p-4 space-y-3">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Receipt size={18} className="text-blue-700" /> Enviar cupom ao cliente
            </h2>

            <label className="block">
              <span className="text-sm font-semibold text-slate-800">Celular do cliente (opcional)</span>
              <input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 91234-5678"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>

            <button onClick={shareWhatsApp} className={`${actionBtn} bg-emerald-600 text-white`}>
              <MessageCircle size={20} /> Enviar no WhatsApp
            </button>
            <p className="text-xs text-slate-600 -mt-1">
              Sem número, o WhatsApp abre para você escolher o contato.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={shareSms} className={`${actionBtn} bg-slate-800 text-white`}>
                <MessageSquare size={18} /> SMS
              </button>
              {canNativeShare ? (
                <button onClick={shareNative} className={`${actionBtn} bg-slate-800 text-white`}>
                  <Share2 size={18} /> Outros apps
                </button>
              ) : (
                <button onClick={copyLink} className={`${actionBtn} bg-slate-800 text-white`}>
                  {copied ? <Check size={18} /> : <Link2 size={18} />} {copied ? "Copiado!" : "Copiar link"}
                </button>
              )}
            </div>

            <label className="block pt-1">
              <span className="text-sm font-semibold text-slate-800">E-mail do cliente (opcional)</span>
              <input
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@email.com"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>
            <button onClick={shareEmail} className={`${actionBtn} bg-blue-700 text-white`}>
              <Mail size={18} /> Enviar por e-mail
            </button>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {canNativeShare && (
                <button onClick={copyLink} className={`${actionBtn} bg-slate-200 text-slate-900`}>
                  {copied ? <Check size={18} /> : <Link2 size={18} />} {copied ? "Copiado!" : "Copiar link"}
                </button>
              )}
              <a
                href={receiptUrl}
                target="_blank"
                rel="noreferrer"
                className={`${actionBtn} bg-slate-200 text-slate-900 ${canNativeShare ? "" : "col-span-2"}`}
              >
                <ExternalLink size={18} /> Ver cupom
              </a>
            </div>
          </div>

          {error && (
            <p className="flex items-start gap-2 rounded-xl bg-red-100 text-red-900 text-sm font-semibold p-3">
              <AlertCircle size={18} className="shrink-0 mt-0.5" /> {error}
            </p>
          )}

          <button onClick={newSale} className={`${actionBtn} bg-blue-700 text-white text-lg py-4`}>
            <Plus size={22} /> Nova venda
          </button>
        </div>
      </div>
    );
  }

  /* ───────── Tela: venda em andamento ───────── */
  return (
    <div className="fixed inset-0 flex flex-col bg-slate-100">
      <header className="bg-slate-900 text-white px-4 py-3 shrink-0">
        <p className="text-xs font-semibold text-slate-300 truncate">{companyName}</p>
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-black tracking-tight">PDV Mobile</h1>
          <span className="text-xs font-semibold text-slate-200 truncate max-w-[50%]">{userName}</span>
        </div>
      </header>

      <form onSubmit={onSearchSubmit} className="p-3 bg-white border-b border-slate-200 shrink-0 flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome, código ou código de barras"
            className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 py-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        {scannerSupported && (
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="shrink-0 rounded-xl bg-blue-700 text-white px-4 flex items-center justify-center active:scale-95"
            aria-label="Ler código de barras com a câmera"
          >
            <ScanBarcode size={22} />
          </button>
        )}
      </form>

      {error && (
        <div className="mx-3 mt-3 flex items-start gap-2 rounded-xl bg-red-100 text-red-900 text-sm font-semibold p-3 shrink-0">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError("")} aria-label="Fechar aviso"><X size={16} /></button>
        </div>
      )}

      <main className="flex-1 overflow-y-auto p-3 space-y-2">
        {searching && (
          <p className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-700 py-4">
            <Loader2 size={16} className="animate-spin" /> Buscando...
          </p>
        )}

        {!searching && query.trim().length >= 2 && results.length === 0 && (
          <p className="text-center text-sm font-semibold text-slate-700 py-6">Nenhum produto encontrado.</p>
        )}

        {!query.trim() && cart.length === 0 && (
          <div className="text-center py-12 px-6 text-slate-700">
            <ShoppingCart size={40} className="mx-auto text-slate-400 mb-3" />
            <p className="font-bold text-slate-900">Comece a venda</p>
            <p className="text-sm mt-1">Busque o produto pelo nome{scannerSupported ? " ou toque no ícone da câmera para ler o código de barras" : " ou digite o código de barras e confirme"}.</p>
          </div>
        )}

        {results.map((p) => {
          const inCart = cart.find((l) => l.product.id === p.id);
          return (
            <button
              key={p.id}
              onClick={() => addProduct(p)}
              className="w-full text-left bg-white rounded-xl border border-slate-200 shadow-sm p-3 flex items-center gap-3 active:bg-blue-50"
            >
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 text-[15px] leading-snug">{p.name}</p>
                <p className="text-xs text-slate-700 mt-0.5">
                  {p.unit.toUpperCase() === "KG" ? "Por kg" : "Unidade"} · Estoque: {p.stock}
                  {p.barcode ? ` · ${p.barcode}` : ""}
                </p>
              </div>
              <div className="text-right shrink-0">
                {p.originalPrice !== undefined && (
                  <p className="text-xs text-slate-500 line-through">{formatBRL(p.originalPrice)}</p>
                )}
                <p className="font-black text-blue-800 text-base">{formatBRL(p.price)}</p>
                {inCart && <p className="text-[11px] font-bold text-emerald-700">No carrinho</p>}
              </div>
            </button>
          );
        })}
      </main>

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-40 bg-slate-900 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg max-w-[90%] truncate">
          {toast}
        </div>
      )}

      <footer className="shrink-0 bg-white border-t border-slate-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          onClick={() => { setError(""); setShowCart(true); }}
          disabled={cart.length === 0}
          className="w-full flex items-center justify-between rounded-xl bg-blue-700 disabled:bg-slate-300 disabled:text-slate-600 text-white font-bold px-4 py-4 text-base active:scale-[0.99]"
        >
          <span className="flex items-center gap-2">
            <ShoppingCart size={20} />
            Carrinho ({itemCount})
          </span>
          <span className="text-lg font-black">{formatBRL(subtotal)}</span>
        </button>
      </footer>

      {/* ───────── Carrinho / Pagamento ───────── */}
      {showCart && (
        <div className="fixed inset-0 z-40 bg-slate-100 flex flex-col">
          <header className="bg-slate-900 text-white px-4 py-3 flex items-center gap-3 shrink-0">
            <button onClick={() => setShowCart(false)} className="p-1.5 rounded-full bg-white/15" aria-label="Voltar">
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-lg font-black">Carrinho e pagamento</h2>
          </header>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <ul className="space-y-2">
              {cart.map((l) => {
                const isWeight = l.product.unit.toUpperCase() === "KG";
                return (
                  <li key={l.product.id} className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-slate-900 text-[15px] leading-snug">{l.product.name}</p>
                      <button onClick={() => removeLine(l.product.id)} className="p-1.5 text-red-700" aria-label={`Remover ${l.product.name}`}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => changeQty(l.product.id, -1)} className="w-10 h-10 rounded-lg bg-slate-200 text-slate-900 flex items-center justify-center active:bg-slate-300" aria-label="Diminuir">
                          <Minus size={18} />
                        </button>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={l.qtyText}
                          onChange={(e) => setQtyText(l.product.id, e.target.value)}
                          aria-label={isWeight ? "Peso em kg" : "Quantidade"}
                          className="w-20 h-10 text-center rounded-lg border border-slate-300 bg-white text-base font-bold text-slate-900 focus:border-blue-600 focus:outline-none"
                        />
                        <button onClick={() => changeQty(l.product.id, 1)} className="w-10 h-10 rounded-lg bg-slate-200 text-slate-900 flex items-center justify-center active:bg-slate-300" aria-label="Aumentar">
                          <Plus size={18} />
                        </button>
                        <span className="text-xs font-semibold text-slate-700 ml-1">{isWeight ? "kg" : "un"}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-700">{formatBRL(l.product.price)} {isWeight ? "/kg" : "cada"}</p>
                        <p className="font-black text-slate-900 text-base">{formatBRL(l.qty * l.product.price)}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <section className="bg-white rounded-xl border border-slate-200 p-3 space-y-3">
              <h3 className="font-bold text-slate-900 text-sm">Forma de pagamento</h3>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENTS.map(({ key, label, icon: Icon }) => {
                  const active = paymentMethod === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setPaymentMethod(key)}
                      className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 font-bold text-base ${
                        active ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 bg-white text-slate-900"
                      }`}
                    >
                      <Icon size={18} /> {label}
                    </button>
                  );
                })}
              </div>

              <label className="block">
                <span className="text-sm font-semibold text-slate-800">CPF na nota / cashback (opcional)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value.replace(/[^\d.\-/]/g, "").slice(0, 18))}
                  placeholder="Somente números"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </label>

              {canDiscount && (
                <label className="block">
                  <span className="text-sm font-semibold text-slate-800">Desconto em R$ (opcional)</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={discountText}
                    onChange={(e) => setDiscountText(e.target.value)}
                    placeholder="0,00"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  {!canDiscountUnlimited && (
                    <span className="text-xs text-slate-600">Seu perfil permite até 5% de desconto.</span>
                  )}
                </label>
              )}
            </section>

            {error && (
              <p className="flex items-start gap-2 rounded-xl bg-red-100 text-red-900 text-sm font-semibold p-3">
                <AlertCircle size={18} className="shrink-0 mt-0.5" /> {error}
              </p>
            )}
          </div>

          <footer className="shrink-0 bg-white border-t border-slate-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2">
            <div className="flex items-center justify-between text-sm text-slate-800">
              <span>Subtotal</span>
              <span className="font-semibold">{formatBRL(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex items-center justify-between text-sm text-slate-800">
                <span>Desconto</span>
                <span className="font-semibold">-{formatBRL(discount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">Total</span>
              <span className="text-2xl font-black text-slate-900">{formatBRL(total)}</span>
            </div>
            <p className="text-[11px] text-slate-600">Promoções e campanhas ativas são aplicadas ao finalizar.</p>
            <button
              onClick={finalizeSale}
              disabled={submitting || cart.length === 0 || hasInvalidQty}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 disabled:bg-slate-300 disabled:text-slate-600 text-white font-black text-lg py-4 active:scale-[0.99]"
            >
              {submitting ? <Loader2 size={22} className="animate-spin" /> : <Check size={22} />}
              {submitting ? "Registrando..." : "Finalizar venda"}
            </button>
          </footer>
        </div>
      )}

      {showScanner && <BarcodeScanner onDetected={handleBarcode} onClose={() => setShowScanner(false)} />}
    </div>
  );
}

