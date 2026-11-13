import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Truck } from "lucide-react";
import { getLossReceipt, type LossTypeValue } from "@/actions/losses";
import { PrintLossReceiptButton } from "./PrintLossReceiptButton";

export const metadata: Metadata = {
  title: "Recibo Oficial de Avaria — Cybertech RP",
  robots: { index: false, follow: false },
};

const LOSS_TYPE_CONFIG: Record<
  LossTypeValue,
  { title: string; badgeClass: string; subtitle: string }
> = {
  DISCARD: {
    title: "DESCARTE",
    badgeClass: "bg-red-100 text-red-800 border-red-300",
    subtitle: "Baixa definitiva de mercadoria imprópria para comercialização",
  },
  SUPPLIER_EXCHANGE: {
    title: "TROCA COM FORNECEDOR",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
    subtitle: "Mercadoria separada para devolução, troca ou bonificação junto ao fornecedor",
  },
  EXPIRED: {
    title: "VENCIMENTO DE VALIDADE",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
    subtitle: "Retirada de gôndola/estoque por prazo de validade expirado",
  },
  OTHER: {
    title: "OUTROS MOTIVOS",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-300",
    subtitle: "Registro interno de quebra ou divergência operacional",
  },
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  MANAGER: "Gerente Geral",
  SUPERVISOR: "Fiscal / Supervisão",
  OPERATOR: "Operador de Caixa",
  STOCKIST: "Estoque & Depósito",
  SCALE_SECTOR: "Balança & Perecíveis",
  FINANCIAL: "Financeiro",
  VIEWER: "Consulta",
};

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default async function LossReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await getLossReceipt(id);

  if (!res.success || !res.receipt) {
    return (
      <main className="h-screen overflow-y-auto bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-[#ffffff] border border-slate-200 rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <AlertTriangle size={28} />
          </div>
          <h1 className="text-lg font-bold text-slate-900">Recibo de Avaria não encontrado</h1>
          <p className="text-sm text-slate-600">
            {res.error ||
              "O registro não existe ou você precisa estar conectado na empresa proprietária deste lançamento."}
          </p>
          <Link
            href="/losses"
            className="inline-block w-full rounded-xl bg-slate-900 text-white font-bold py-3 text-sm"
          >
            Voltar para Perdas &amp; Avarias
          </Link>
        </div>
      </main>
    );
  }

  const r = res.receipt;
  const typeInfo = LOSS_TYPE_CONFIG[r.lossType] || LOSS_TYPE_CONFIG.DISCARD;
  const exactDateTime = new Date(r.createdAt).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const isSupplierExchange = r.lossType === "SUPPLIER_EXCHANGE";

  return (
    <main className="h-screen overflow-y-auto bg-slate-200/80 print:bg-white print:h-auto print:overflow-visible p-4 sm:p-8">
      <style>{`
        @media print {
          html, body {
            overflow: visible !important;
            height: auto !important;
            background: #ffffff !important;
          }
          @page {
            size: A4;
            margin: 12mm;
          }
        }
      `}</style>

      <div className="mx-auto max-w-3xl space-y-4">
        <PrintLossReceiptButton />

        <article className="bg-[#ffffff] text-slate-900 rounded-2xl border border-slate-300 shadow-xl print:shadow-none print:border-slate-400 print:rounded-none p-6 sm:p-10 space-y-6">
          {/* Cabeçalho Oficial Empresa + Número do Recibo */}
          <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-900 pb-5">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">
                Comprovante Interno de Controle de Estoque
              </p>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 mt-1">
                {r.company.name}
              </h1>
              <p className="text-xs font-mono text-slate-700 mt-1">
                CNPJ/CPF: <strong>{r.company.document}</strong>
                {r.company.phone ? ` • Tel: ${r.company.phone}` : ""}
              </p>
              {r.company.address && (
                <p className="text-xs text-slate-600 mt-0.5">{r.company.address}</p>
              )}
            </div>

            <div className="sm:text-right bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 shrink-0">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 block">
                Recibo Oficial de Avaria
              </span>
              <span className="text-lg font-black font-mono text-slate-900 block mt-0.5">
                {r.receiptCode}
              </span>
              <span className="text-[11px] font-mono text-slate-700 block mt-1">
                Data/Hora: <strong>{exactDateTime}</strong>
              </span>
            </div>
          </header>

          {/* Motivo Oficial em Destaque + Responsável */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/70 space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 block">
                Classificação / Motivo Oficial
              </span>
              <div>
                <span
                  className={`inline-block text-xs font-black px-3 py-1 rounded-full border uppercase tracking-wide ${typeInfo.badgeClass}`}
                >
                  {typeInfo.title}
                </span>
              </div>
              <p className="text-xs text-slate-600 pt-0.5">{typeInfo.subtitle}</p>
              <p className="text-sm font-bold text-slate-900 pt-1">
                Descrição: <span className="font-semibold">{r.reason}</span>
              </p>
            </div>

            <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/70 space-y-2">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 block">
                  Usuário Responsável pelo Lançamento
                </span>
                <p className="text-sm font-black text-slate-900 mt-0.5">{r.user.name}</p>
                <p className="text-xs text-slate-600">
                  Perfil: {ROLE_LABELS[r.user.role] || r.user.role} • {r.user.email}
                </p>
              </div>
              <div className="pt-1 border-t border-slate-200 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                <CheckCircle2 size={14} />
                <span>Estoque baixado em {exactDateTime}</span>
              </div>
            </div>
          </section>

          {/* Dados do Fornecedor (quando Troca com Fornecedor ou vinculado) */}
          {r.supplier && (
            <section className="border-2 border-blue-200 bg-blue-50/40 rounded-xl p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-blue-900">
                <Truck size={15} />
                <span className="text-xs font-black uppercase tracking-wider">
                  Fornecedor Vinculado ({isSupplierExchange ? "Troca / Devolução" : "Referência"})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                <div>
                  <span className="text-slate-500 block">Razão Social / Fantasia</span>
                  <strong className="text-slate-900">
                    {r.supplier.tradeName ? `${r.supplier.tradeName} (${r.supplier.name})` : r.supplier.name}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">CNPJ / CPF</span>
                  <strong className="font-mono text-slate-900">
                    {r.supplier.document || "Não informado"}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Contato / Telefone</span>
                  <strong className="text-slate-900">
                    {[r.supplier.contactName, r.supplier.phone].filter(Boolean).join(" • ") ||
                      "Não informado"}
                  </strong>
                </div>
              </div>
            </section>
          )}

          {/* Quadro do Produto Avariado */}
          <section className="space-y-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-600">
              Item Avariado / Baixado do Estoque
            </h2>
            <div className="border border-slate-300 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase">
                  <tr>
                    <th className="px-4 py-2.5 font-extrabold">Produto</th>
                    <th className="px-4 py-2.5 font-extrabold">Cód. Barras / PLU</th>
                    <th className="px-4 py-2.5 font-extrabold text-right">Quantidade</th>
                    <th className="px-4 py-2.5 font-extrabold text-right">Custo Unit.</th>
                    <th className="px-4 py-2.5 font-extrabold text-right">Custo Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-[#ffffff]">
                    <td className="px-4 py-3 font-bold text-slate-900 text-sm">
                      {r.product.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {r.product.barcode || r.product.internalCode || "S/N"}
                    </td>
                    <td className="px-4 py-3 font-black text-red-700 text-right font-mono text-sm">
                      {r.quantity} {r.product.unit}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-800">
                      {formatBRL(r.unitCost)}
                    </td>
                    <td className="px-4 py-3 text-right font-black font-mono text-slate-900 text-sm">
                      {formatBRL(r.totalCost)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Observações */}
          {r.notes && (
            <section className="border border-slate-300 rounded-xl p-4 bg-slate-50/50">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 block mb-1">
                Observações Registradas
              </span>
              <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">{r.notes}</p>
            </section>
          )}

          {/* Foto da Avaria Anexada */}
          <section className="break-inside-avoid space-y-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-600">
              Evidência Fotográfica da Avaria
            </h2>
            {r.photoData ? (
              <div className="border border-slate-300 rounded-xl p-3 bg-slate-50 flex flex-col items-center">
                <img
                  src={r.photoData}
                  alt={`Foto da avaria - ${r.product.name}`}
                  className="max-h-[420px] w-auto max-w-full rounded-lg object-contain border border-slate-200"
                />
                <p className="text-[11px] text-slate-500 font-mono mt-2">
                  Foto registrada no lançamento • Recibo {r.receiptCode}
                </p>
              </div>
            ) : (
              <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center text-xs text-slate-500">
                Nenhuma fotografia foi anexada a este registro de avaria.
              </div>
            )}
          </section>

          {/* Assinaturas */}
          <footer className="break-inside-avoid pt-8 mt-4 border-t border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6">
              <div className="text-center">
                <div className="border-t border-slate-800 pt-2">
                  <p className="text-xs font-bold text-slate-900 uppercase">{r.user.name}</p>
                  <p className="text-[11px] text-slate-600">
                    Responsável da Loja • Data/Hora: {exactDateTime}
                  </p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t border-slate-800 pt-2">
                  <p className="text-xs font-bold text-slate-900 uppercase">
                    {isSupplierExchange
                      ? "Representante / Fornecedor"
                      : "Conferente / Gerência"}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    {isSupplierExchange
                      ? r.supplier?.tradeName || r.supplier?.name || "Assinatura e RG/CPF do recebedor"
                      : "Conferência e ciência da baixa de estoque"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-dashed border-slate-300 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>Documento gerado por Cybertech RP</span>
              <span>Recibo: {r.receiptCode}</span>
            </div>
          </footer>
        </article>
      </div>
    </main>
  );
}
