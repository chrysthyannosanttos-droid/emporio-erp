"use client";

import { useState } from "react";
import { ShieldCheck, Lock, AlertCircle, X, Key, Check, UserCheck, Loader2 } from "lucide-react";
import { quickAuthorizeInline } from "@/actions/approvals";

interface QuickAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  operation: string;
  operationLabel: string;
  value?: number;
  terminal?: string;
  storeId?: string;
  onAuthorized: (data: { authorizer: { id: string; name: string; role: string }; requestId: string }) => void;
}

export function QuickAuthModal({
  isOpen,
  onClose,
  operation,
  operationLabel,
  value = 0,
  terminal = "PDV Principal",
  storeId,
  onAuthorized,
}: QuickAuthModalProps) {
  const [authType, setAuthType] = useState<"PIN" | "PASSWORD">("PIN");
  const [identifier, setIdentifier] = useState("");
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePinClick = (digit: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + digit);
    }
  };

  const handlePinBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handlePinClear = () => {
    setPin("");
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError("Informe o nome ou e-mail do autorizador (Gerente/Supervisor).");
      return;
    }

    const secret = authType === "PIN" ? pin : password;
    if (!secret) {
      setError(authType === "PIN" ? "Digite o PIN de autorização de 4 a 6 dígitos." : "Digite a senha do autorizador.");
      return;
    }

    if (!reason.trim()) {
      setError("Informe o motivo da solicitação da liberação.");
      return;
    }

    setLoading(true);
    try {
      const res = await quickAuthorizeInline({
        operation,
        value,
        reason: reason.trim(),
        terminal,
        storeId,
        authorizerIdentifier: identifier.trim(),
        pinOrPassword: secret,
      });

      if (res.success && res.authorizer && res.requestId) {
        onAuthorized({
          authorizer: res.authorizer,
          requestId: res.requestId,
        });
        onClose();
      } else {
        setError(res.error || "Autorização negada pelo sistema.");
      }
    } catch (err: any) {
      setError(err.message || "Erro de comunicação ao autorizar operação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#101426] border border-indigo-500/25 rounded-3xl w-full max-w-md shadow-2xl shadow-indigo-950/50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header com gradiente */}
        <div className="p-5 bg-gradient-to-r from-indigo-900/40 via-purple-900/20 to-transparent border-b border-indigo-500/15 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">Solicitação de Liberação</h3>
              <p className="text-xs text-amber-400/80 font-medium">{operationLabel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Resumo da Operação */}
        <div className="px-5 py-3.5 bg-[#0c0f1e] border-b border-indigo-500/10 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 block">Terminal:</span>
            <span className="text-slate-300 font-semibold">{terminal}</span>
          </div>
          {value > 0 && (
            <div className="text-right">
              <span className="text-slate-500 block">Valor envolvido:</span>
              <span className="text-amber-400 font-bold text-sm">
                {operation.includes("discount") ? `${value}%` : `R$ ${value.toFixed(2)}`}
              </span>
            </div>
          )}
        </div>

        {/* Mensagem de Erro se houver */}
        {error && (
          <div className="mx-5 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-2.5 text-xs text-red-300">
            <AlertCircle size={16} className="shrink-0 text-red-400" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* Formulário */}
        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          {/* Motivo */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Motivo da Operação <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ex: Cliente desistiu da compra / Desconto fidelidade"
              className="w-full bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white px-3.5 py-2.5 rounded-xl outline-none text-xs placeholder:text-slate-600 transition-colors"
            />
          </div>

          {/* Autorizador Identificador */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Usuário Autorizador (Supervisor / Gerente) <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="Nome ou e-mail do autorizador"
              className="w-full bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white px-3.5 py-2.5 rounded-xl outline-none text-xs placeholder:text-slate-600 transition-colors"
            />
          </div>

          {/* Tipo de Autenticação: PIN ou Senha */}
          <div className="flex gap-2 p-1 bg-[#0c0f1a] border border-indigo-500/15 rounded-xl">
            <button
              type="button"
              onClick={() => setAuthType("PIN")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                authType === "PIN" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Key size={13} />
              PIN de Autorização
            </button>
            <button
              type="button"
              onClick={() => setAuthType("PASSWORD")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                authType === "PASSWORD" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Lock size={13} />
              Senha Completa
            </button>
          </div>

          {authType === "PASSWORD" ? (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Senha do Autorizador</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white px-3.5 py-2.5 rounded-xl outline-none text-xs transition-colors"
              />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Display do PIN Mascarado */}
              <div className="flex justify-center items-center gap-3 py-2 bg-[#0c0f1a] border border-indigo-500/15 rounded-2xl">
                {[0, 1, 2, 3, 4, 5].map(idx => (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full transition-all ${
                      idx < pin.length
                        ? "bg-amber-400 scale-110 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                        : "bg-slate-800 border border-slate-700"
                    }`}
                  />
                ))}
              </div>

              {/* Teclado Numérico */}
              <div className="grid grid-cols-3 gap-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(digit => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handlePinClick(digit)}
                    className="h-11 bg-[#14192d] hover:bg-indigo-600/30 active:bg-indigo-600 border border-indigo-500/10 hover:border-indigo-500/30 text-white text-base font-bold rounded-xl transition-all flex items-center justify-center cursor-pointer select-none"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handlePinClear}
                  className="h-11 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold rounded-xl border border-red-500/15 transition-all flex items-center justify-center"
                >
                  Limpar
                </button>
                <button
                  type="button"
                  onClick={() => handlePinClick("0")}
                  className="h-11 bg-[#14192d] hover:bg-indigo-600/30 text-white text-base font-bold rounded-xl border border-indigo-500/10 transition-all flex items-center justify-center cursor-pointer select-none"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handlePinBackspace}
                  className="h-11 bg-[#14192d] hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold rounded-xl border border-indigo-500/10 transition-all flex items-center justify-center"
                >
                  ⌫
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer com Ações */}
        <div className="p-5 bg-[#0c0f1e] border-t border-indigo-500/10 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 px-4 bg-[#14192d] hover:bg-[#1a203a] text-slate-300 font-semibold rounded-2xl text-xs border border-indigo-500/10 transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={loading || (authType === "PIN" ? pin.length === 0 : password.length === 0)}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-black font-bold rounded-2xl text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin text-black" />
                <span>Validando...</span>
              </>
            ) : (
              <>
                <UserCheck size={15} />
                <span>Autorizar Operação</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
