import type { Metadata } from "next";
import { getReceiptBySaleId } from "@/lib/receiptData";
import { PAYMENT_LABELS, formatBRL, formatQty } from "@/lib/receiptFormat";
import { PrintButton } from "./PrintButton";

// Cupom público: não deve ser indexado por buscadores.
export const metadata: Metadata = {
  title: "Cupom de compra",
  robots: { index: false, follow: false },
};

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const receipt = await getReceiptBySaleId(id);

  if (!receipt) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6 overflow-auto">
        <div className="bg-white rounded-2xl shadow p-8 max-w-sm w-full text-center">
          <p className="text-5xl mb-3">🧾</p>
          <h1 className="text-lg font-bold text-slate-900">Cupom não encontrado</h1>
          <p className="text-sm text-slate-700 mt-2">
            O link pode estar incompleto ou o cupom não existe mais. Confira com a loja.
          </p>
        </div>
      </main>
    );
  }

  const date = new Date(receipt.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  return (
    <main className="h-screen overflow-y-auto bg-slate-100 print:bg-white print:h-auto print:overflow-visible p-4 sm:p-8">
      <div className="mx-auto max-w-sm space-y-4">
        <article className="bg-white text-slate-900 rounded-2xl shadow-lg print:shadow-none print:rounded-none p-5 font-mono text-[13px] leading-relaxed">
          <header className="text-center border-b border-dashed border-slate-400 pb-3 mb-3">
            <h1 className="text-base font-bold uppercase tracking-tight">{receipt.companyName}</h1>
            <p className="text-xs text-slate-700">CNPJ/CPF: {receipt.companyDocument}</p>
            <p className="text-xs text-slate-700 mt-1">Cupom nº {receipt.number}</p>
            <p className="text-xs text-slate-700">{date}</p>
          </header>

          <ul className="space-y-2 border-b border-dashed border-slate-400 pb-3 mb-3">
            {receipt.items.map((item, idx) => (
              <li key={idx}>
                <p className="font-bold">{item.name}</p>
                <div className="flex justify-between text-slate-800">
                  <span>
                    {formatQty(item.quantity, item.unit)} x {formatBRL(item.unitPrice)}
                  </span>
                  <span className="font-bold text-slate-900">{formatBRL(item.total)}</span>
                </div>
              </li>
            ))}
          </ul>

          <div className="space-y-1">
            {receipt.discount > 0 && (
              <>
                <div className="flex justify-between text-slate-800">
                  <span>Subtotal</span>
                  <span>{formatBRL(receipt.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-800">
                  <span>Desconto</span>
                  <span>-{formatBRL(receipt.discount)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-lg font-black pt-1">
              <span>TOTAL</span>
              <span>{formatBRL(receipt.total)}</span>
            </div>
            <div className="flex justify-between text-slate-800">
              <span>Pagamento</span>
              <span>{PAYMENT_LABELS[receipt.paymentMethod] || receipt.paymentMethod}</span>
            </div>
          </div>

          <footer className="text-center border-t border-dashed border-slate-400 mt-3 pt-3 text-xs text-slate-700">
            <p>Atendido por: {receipt.operatorName}</p>
            <p className="mt-1">Obrigado pela preferência!</p>
            <p className="mt-2 text-[10px] text-slate-500">
              Comprovante de venda sem valor fiscal. Cybertech RP
            </p>
          </footer>
        </article>

        <PrintButton />
      </div>
    </main>
  );
}

