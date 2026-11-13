"use client";

import { useState, useEffect } from "react";
import {
  X, Search, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw,
  DollarSign, Receipt, Clock, User, ShieldCheck, ArrowRight, Printer,
  Tag, Percent, Undo2, Lock
} from "lucide-react";
import { getRecentSalesForAdjustment, adjustSale } from "@/actions/sale";

interface PdvAdjustSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

export function PdvAdjustSaleModal({ isOpen, onClose, onSuccess }: PdvAdjustSaleModalProps) {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSale, setSelectedSale] = useState<any | null>(null);

  // Form states
  const [discountType, setDiscountType] = useState<"BRL" | "PERCENT">("BRL");
  const [discountInput, setDiscountInput] = useState<string>("0");
  const [refundMethod, setRefundMethod] = useState<"CASH" | "PIX" | "STORE_CREDIT" | "CARD_REVERSAL" | "NONE">("CASH");
  const [reason, setReason] = useState<string>("Desconto concedido não aplicado pelo operador de caixa");
  const [reissueInvoice, setReissueInvoice] = useState<boolean>(true);
  const [managerPin, setManagerPin] = useState<string>("");
  
  // Status feedback
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSales();
      setSelectedSale(null);
      setErrorMsg(null);
      setSuccessMsg(null);
      setDiscountInput("0");
      setManagerPin("");
    }
  }, [isOpen]);

  const loadSales = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getRecentSalesForAdjustment(30);
      if (res.success && res.sales) {
        setSales(res.sales);
      } else {
        setErrorMsg(res.error || "Não foi possível carregar as vendas.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erro de conexão ao buscar vendas.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSale = (sale: any) => {
    setSelectedSale(sale);
    setDiscountInput(String(sale.discount || 0));
    setDiscountType("BRL");
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // Calculations
  const currentSubtotal = selectedSale ? Number(selectedSale.subtotal) : 0;
  const currentTotal = selectedSale ? Number(selectedSale.total) : 0;
  
  let calculatedDiscount = 0;
  const numInput = parseFloat(discountInput.replace(",", ".")) || 0;
  if (discountType === "BRL") {
    calculatedDiscount = Math.min(numInput, currentSubtotal);
  } else {
    calculatedDiscount = Math.min((currentSubtotal * numInput) / 100, currentSubtotal);
  }

  const newTotal = Math.max(0, currentSubtotal - calculatedDiscount);
  const differenceToRefund = Math.max(0, currentTotal - newTotal);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) return;
    if (!reason.trim()) {
      setErrorMsg("Informe o motivo do ajuste da venda.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await adjustSale({
        saleId: selectedSale.id,
        newDiscount: calculatedDiscount,
        discountReason: reason.trim(),
        refundMethod,
        managerPin: managerPin.trim() || undefined,
        reissueInvoice: reissueInvoice && Boolean(selectedSale.invoice)
      });

      if (res.success) {
        setSuccessMsg(res.message);
        if (onSuccess) onSuccess(res.message);
        // Refresh list
        loadSales();
        setSelectedSale(null);
      } else {
        setErrorMsg(res.error || "Erro ao processar ajuste da venda.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Falha ao comunicar com o servidor.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const filteredSales = sales.filter(s =>
    s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.operatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(s.total).includes(searchTerm)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-emerald-300">
              <Undo2 size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">Ajuste & Reabertura de Vendas</h3>
                <span className="bg-emerald-500/30 text-emerald-200 text-xs px-2 py-0.5 rounded font-mono font-bold">
                  F8
                </span>
              </div>
              <p className="text-xs text-emerald-100/80">
                Corrija descontos, itens, devolução de troco e reemissão de NFC-e sem erros fiscais
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-3">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Atenção</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-start gap-3">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Ajuste Realizado com Sucesso!</p>
                <p>{successMsg}</p>
              </div>
            </div>
          )}

          {!selectedSale ? (
            /* Lista de Vendas Recentes */
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por código da venda, cliente, operador ou valor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={loadSales}
                  disabled={loading}
                  className="px-3.5 py-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                  Atualizar
                </button>
              </div>

              {loading ? (
                <div className="py-16 text-center text-slate-400 text-sm">
                  <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-emerald-600" />
                  Carregando vendas recentes...
                </div>
              ) : filteredSales.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                  Nenhuma venda recente encontrada para ajuste.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Venda / Data</th>
                        <th className="px-4 py-3">Cliente / Operador</th>
                        <th className="px-4 py-3 text-center">Itens</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 text-center">Fiscal</th>
                        <th className="px-4 py-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSales.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-mono font-bold text-slate-900 block">
                              #{s.id.slice(0, 8)}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {new Date(s.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} - {new Date(s.createdAt).toLocaleDateString("pt-BR")}
                            </span>
                            {s.adjustedAt && (
                              <span className="inline-block mt-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-1.5 py-0.2 rounded font-semibold">
                                Já Ajustada
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-800 block">{s.customerName}</span>
                            <span className="text-[11px] text-slate-500">Cx: {s.operatorName}</span>
                          </td>
                          <td className="px-4 py-3 text-center text-slate-600">
                            {s.items?.length || 0} un
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-800">
                            R$ {s.total.toFixed(2)}
                            {s.discount > 0 && (
                              <span className="text-[10px] text-emerald-600 block">
                                Desc: R$ {s.discount.toFixed(2)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {s.invoice ? (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                s.invoice.status === "AUTHORIZED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-red-100 text-red-800"
                              }`}>
                                {s.invoice.type} #{s.invoice.number || "OK"}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Sem NFC-e</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleSelectSale(s)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 ml-auto cursor-pointer"
                            >
                              Ajustar
                              <ArrowRight size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* Painel de Ajuste da Venda Selecionada */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Card Resumo da Venda */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      Venda #{selectedSale.id.slice(0, 8)}
                    </span>
                    <span className="text-xs text-slate-500">
                      ({new Date(selectedSale.createdAt).toLocaleString("pt-BR")})
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Cliente: <span className="font-semibold">{selectedSale.customerName}</span> | Operador: {selectedSale.operatorName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSale(null)}
                  className="text-xs text-slate-600 hover:text-slate-900 underline cursor-pointer"
                >
                  ← Escolher outra venda
                </button>
              </div>

              {/* Grid de Valores: Antes vs Depois */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <p className="text-xs text-slate-500 font-semibold uppercase">Total Original</p>
                  <p className="text-xl font-mono font-bold text-slate-700 mt-1">
                    R$ {currentTotal.toFixed(2)}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Subtotal: R$ {currentSubtotal.toFixed(2)}
                  </p>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <p className="text-xs text-emerald-700 font-semibold uppercase">Novo Total Ajustado</p>
                  <p className="text-2xl font-mono font-black text-emerald-700 mt-1">
                    R$ {newTotal.toFixed(2)}
                  </p>
                  <p className="text-[11px] text-emerald-600 font-bold mt-0.5">
                    Desconto: R$ {calculatedDiscount.toFixed(2)}
                  </p>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <p className="text-xs text-amber-700 font-semibold uppercase">Diferença a Devolver</p>
                  <p className="text-2xl font-mono font-black text-amber-700 mt-1">
                    R$ {differenceToRefund.toFixed(2)}
                  </p>
                  <p className="text-[11px] text-amber-600 mt-0.5">
                    Estorno / Troco ao Cliente
                  </p>
                </div>
              </div>

              {/* Campos de Ajuste do Desconto */}
              <div className="border border-slate-200 rounded-xl p-5 space-y-4">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Tag size={16} className="text-emerald-600" />
                  Aplicação de Desconto Corrigido
                </h4>

                <div className="flex items-center gap-3">
                  <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setDiscountType("BRL")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        discountType === "BRL"
                          ? "bg-white text-emerald-700 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      R$ Reais
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType("PERCENT")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        discountType === "PERCENT"
                          ? "bg-white text-emerald-700 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      % Porcentagem
                    </button>
                  </div>

                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                      {discountType === "BRL" ? "R$" : "%"}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-base font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Forma de Devolução da Diferença */}
                {differenceToRefund > 0 && (
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      Como a diferença de R$ {differenceToRefund.toFixed(2)} será devolvida ao cliente?
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: "CASH", label: "Dinheiro (Gaveta)" },
                        { id: "PIX", label: "Estorno Pix" },
                        { id: "CARD_REVERSAL", label: "Estorno Cartão" },
                        { id: "STORE_CREDIT", label: "Crédito em Loja" }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setRefundMethod(item.id as any)}
                          className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                            refundMethod === item.id
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Motivo do Ajuste */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Motivo do Ajuste (Auditoria) *
                  </label>
                  <input
                    type="text"
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Tratamento Fiscal */}
                {selectedSale.invoice && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                    <div className="text-xs">
                      <p className="font-bold text-blue-900">Nota Fiscal / Cupom NFC-e Vinculado</p>
                      <p className="text-blue-700">Chave: {selectedSale.invoice.accessKey ? `${selectedSale.invoice.accessKey.slice(0, 20)}...` : "Identificada"}</p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-blue-900">
                      <input
                        type="checkbox"
                        checked={reissueInvoice}
                        onChange={(e) => setReissueInvoice(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      Cancelar e Reemitir na SEFAZ
                    </label>
                  </div>
                )}

                {/* PIN / Senha de Gerente */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Lock size={13} className="text-slate-500" />
                    PIN ou Senha de Supervisor / Gerente
                  </label>
                  <input
                    type="password"
                    placeholder="Digite seu PIN de 4 dígitos ou senha..."
                    value={managerPin}
                    onChange={(e) => setManagerPin(e.target.value)}
                    className="w-full sm:w-64 px-3.5 py-2 border border-slate-300 rounded-xl text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Exige autorização para registrar a sangria/devolução de valores.
                  </span>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedSale(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Processando Ajuste...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      Confirmar Ajuste da Venda
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

