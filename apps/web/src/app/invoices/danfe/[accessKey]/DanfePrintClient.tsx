"use client";

import { useEffect } from "react";
import { Printer, Download, ArrowLeft, CheckCircle2, ShieldCheck, FileText } from "lucide-react";
import { type RadarInvoice } from "@/actions/invoices";

// Gerador de código de barras Code 128 simplificado em SVG para a DANFE
function BarcodeSvg({ value }: { value: string }) {
  // Simula padrão de linhas de código de barras Code 128
  const bars: { width: number; isBlack: boolean }[] = [];
  let isBlack = true;
  for (let i = 0; i < value.length; i++) {
    const digit = parseInt(value[i], 10) || 3;
    const w1 = (digit % 3) + 1;
    const w2 = ((digit + 1) % 3) + 1;
    bars.push({ width: w1, isBlack });
    isBlack = !isBlack;
    bars.push({ width: w2, isBlack });
    isBlack = !isBlack;
  }

  let currentX = 0;
  return (
    <svg viewBox="0 0 340 45" className="w-full h-10 overflow-hidden">
      {bars.map((b, idx) => {
        const x = currentX;
        currentX += b.width * 1.8;
        if (!b.isBlack) return null;
        return <rect key={idx} x={x} y="0" width={b.width * 1.8} height="45" fill="#000000" />;
      })}
    </svg>
  );
}

export default function DanfePrintClient({ invoice }: { invoice: RadarInvoice }) {
  // Formata chave em blocos de 4
  const formattedKey = invoice.accessKey.replace(/(\d{4})/g, "$1 ").trim();
  const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div>
      {/* Barra de Ações Superior (Visível apenas na tela, oculta na impressão/PDF) */}
      <div className="no-print fixed top-0 left-0 right-0 bg-gray-900/95 backdrop-blur-md text-white p-3 z-50 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.close()}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-300 hover:text-white bg-gray-800 px-3 py-2 rounded-xl transition-colors"
          >
            <ArrowLeft size={14} /> Fechar
          </button>
          <div>
            <h1 className="text-sm font-black flex items-center gap-2">
              <FileText size={16} className="text-blue-400" />
              DANFE Oficial em PDF · NF-e Nº {invoice.invoiceNum}
            </h1>
            <p className="text-[11px] text-gray-400">Pronta para impressão ou salvar como arquivo PDF oficial</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center gap-2"
          >
            <Printer size={16} /> Salvar como PDF / Imprimir
          </button>
        </div>
      </div>

      {/* Espaço para a barra fixa na tela */}
      <div className="no-print h-16" />

      {/* Folha DANFE Oficial A4 */}
      <div className="danfe-sheet bg-white mx-auto my-4 text-black text-[9px] leading-tight select-text" style={{ width: "200mm", minHeight: "287mm", padding: "4mm", boxSizing: "border-box" }}>
        
        {/* ── CANHOTO SUPERIOR DESTACÁVEL ── */}
        <div className="border border-black mb-1 p-1">
          <div className="flex text-[8px]">
            <div className="flex-1 pr-2 border-r border-black">
              RECEBEMOS DE <strong>{invoice.supplierName}</strong> OS PRODUTOS E/OU SERVIÇOS CONSTANTES DA NOTA FISCAL ELETRÔNICA INDICADA ABAIXO. EMISSÃO: {new Date(invoice.issueDate).toLocaleDateString("pt-BR")} - VALOR TOTAL: R$ {fmt(invoice.totalAmount)}
            </div>
            <div className="w-40 pl-2 text-center flex flex-col justify-between">
              <span className="font-bold text-[10px]">NF-e</span>
              <span className="font-black text-xs">Nº {invoice.invoiceNum}</span>
              <span className="text-[8px]">SÉRIE: {invoice.series || "1"}</span>
            </div>
          </div>
          <div className="flex border-t border-black mt-1 pt-1 text-[7px]">
            <div className="w-32 border-r border-black pr-1">
              DATA DE RECEBIMENTO:
              <div className="h-5" />
            </div>
            <div className="flex-1 pl-2">
              IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR:
              <div className="h-5" />
            </div>
          </div>
        </div>

        {/* Linha pontilhada de corte */}
        <div className="border-b border-dashed border-gray-400 my-1" />

        {/* ── CABEÇALHO DANFE ── */}
        <div className="border border-black mb-1">
          <div className="flex">
            {/* Emitente */}
            <div className="w-[45%] p-2 border-r border-black flex flex-col justify-center">
              <h2 className="font-black text-xs leading-tight uppercase">{invoice.supplierName}</h2>
              <p className="text-[8px] text-gray-700 mt-1">{invoice.supplierAddress || "Endereço Fiscal Homologado na SEFAZ"}</p>
              <div className="mt-1 text-[8px]">
                <span><strong>CNPJ:</strong> {invoice.supplierCnpj}</span><br />
                <span><strong>INSCRIÇÃO ESTADUAL:</strong> {invoice.supplierIe || "ISENTO"}</span>
              </div>
            </div>

            {/* Box DANFE */}
            <div className="w-[20%] p-1 border-r border-black text-center flex flex-col justify-between">
              <div>
                <h3 className="font-black text-sm">DANFE</h3>
                <p className="text-[7px] leading-tight">DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRÔNICA</p>
              </div>

              <div className="border border-black my-1 py-0.5 text-center">
                <span className="text-[7px] block">0 - ENTRADA</span>
                <span className="text-[7px] block font-bold">1 - SAÍDA</span>
                <span className="font-black text-sm border border-black inline-block px-1.5 mt-0.5">1</span>
              </div>

              <div>
                <div className="font-black text-[10px]">Nº {invoice.invoiceNum}</div>
                <div className="text-[8px]">SÉRIE {invoice.series || "1"}</div>
                <div className="text-[7px]">FOLHA 1/1</div>
              </div>
            </div>

            {/* Código de Barras e Chave */}
            <div className="w-[35%] p-1 flex flex-col justify-between">
              <div>
                <BarcodeSvg value={invoice.accessKey} />
                <div className="font-mono text-[7.5px] text-center font-bold mt-1 tracking-wider">
                  {formattedKey}
                </div>
              </div>

              <div className="border-t border-black pt-1 text-[7.5px]">
                <p className="leading-tight text-center font-bold">
                  Consulta de autenticidade no portal nacional da NF-e www.nfe.fazenda.gov.br ou no site da Sefaz Autorizadora
                </p>
                <div className="border border-black mt-1 p-0.5 text-[7px] font-mono text-center">
                  <strong>PROTOCOLO DE AUTORIZAÇÃO DE USO:</strong><br />
                  {invoice.manifestProtocolo || "135260098412345"} - {new Date(invoice.issueDate).toLocaleDateString("pt-BR")}
                </div>
              </div>
            </div>
          </div>

          {/* Natureza da Operação */}
          <div className="border-t border-black flex text-[8px] bg-gray-50">
            <div className="flex-1 p-1 border-r border-black">
              <span className="block text-[7px] text-gray-600">NATUREZA DA OPERAÇÃO</span>
              <strong>{invoice.naturezaOp || "VENDA DE MERCADORIA ADQUIRIDA DE TERCEIROS"}</strong>
            </div>
            <div className="w-56 p-1 border-r border-black">
              <span className="block text-[7px] text-gray-600">INSCRIÇÃO ESTADUAL</span>
              <strong>{invoice.supplierIe || "ISENTO"}</strong>
            </div>
            <div className="w-48 p-1">
              <span className="block text-[7px] text-gray-600">CNPJ</span>
              <strong className="font-mono">{invoice.supplierCnpj}</strong>
            </div>
          </div>
        </div>

        {/* ── DESTINATÁRIO / REMETENTE ── */}
        <div className="mb-1">
          <div className="bg-gray-200 px-1 py-0.5 text-[8px] font-bold border-t border-l border-r border-black">
            DESTINATÁRIO / REMETENTE
          </div>
          <div className="border border-black">
            <div className="flex border-b border-black text-[8px]">
              <div className="flex-1 p-1 border-r border-black">
                <span className="block text-[7px] text-gray-600">NOME / RAZÃO SOCIAL</span>
                <strong>CYBERTECH DESENVOLVIMENTO DE SISTEMAS LTDA</strong>
              </div>
              <div className="w-48 p-1 border-r border-black">
                <span className="block text-[7px] text-gray-600">CNPJ / CPF</span>
                <strong className="font-mono">45.892.104/0001-92</strong>
              </div>
              <div className="w-32 p-1">
                <span className="block text-[7px] text-gray-600">DATA DA EMISSÃO</span>
                <strong>{new Date(invoice.issueDate).toLocaleDateString("pt-BR")}</strong>
              </div>
            </div>

            <div className="flex text-[8px]">
              <div className="flex-1 p-1 border-r border-black">
                <span className="block text-[7px] text-gray-600">ENDEREÇO</span>
                <span>Av. Central de Tecnologia, 1000 - Centro</span>
              </div>
              <div className="w-48 p-1 border-r border-black">
                <span className="block text-[7px] text-gray-600">MUNICÍPIO / UF</span>
                <span>São Paulo - SP</span>
              </div>
              <div className="w-32 p-1">
                <span className="block text-[7px] text-gray-600">DATA SAÍDA/ENTRADA</span>
                <strong>{new Date(invoice.issueDate).toLocaleDateString("pt-BR")}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* ── CÁLCULO DO IMPOSTO ── */}
        <div className="mb-1">
          <div className="bg-gray-200 px-1 py-0.5 text-[8px] font-bold border-t border-l border-r border-black">
            CÁLCULO DO IMPOSTO
          </div>
          <div className="border border-black grid grid-cols-6 text-[8px] font-mono">
            <div className="p-1 border-r border-black">
              <span className="block text-[6.5px] text-gray-600 font-sans">BASE DE CÁLCULO ICMS</span>
              <strong>{fmt(invoice.totalAmount * 0.8)}</strong>
            </div>
            <div className="p-1 border-r border-black">
              <span className="block text-[6.5px] text-gray-600 font-sans">VALOR DO ICMS</span>
              <strong>{fmt(invoice.totalIcms || invoice.totalAmount * 0.18)}</strong>
            </div>
            <div className="p-1 border-r border-black">
              <span className="block text-[6.5px] text-gray-600 font-sans">BASE CÁLC. ICMS S.T.</span>
              <strong>0,00</strong>
            </div>
            <div className="p-1 border-r border-black">
              <span className="block text-[6.5px] text-gray-600 font-sans">VALOR DO ICMS S.T.</span>
              <strong>0,00</strong>
            </div>
            <div className="p-1 border-r border-black">
              <span className="block text-[6.5px] text-gray-600 font-sans">V. TOTAL PRODUTOS</span>
              <strong>{fmt(invoice.totalAmount)}</strong>
            </div>
            <div className="p-1 bg-gray-100">
              <span className="block text-[6.5px] text-gray-600 font-sans">VALOR TOTAL DA NOTA</span>
              <strong className="text-[10px]">{fmt(invoice.totalAmount)}</strong>
            </div>
          </div>
        </div>

        {/* ── TRANSPORTADOR / VOLUMES TRANSPORTADOS ── */}
        <div className="mb-1">
          <div className="bg-gray-200 px-1 py-0.5 text-[8px] font-bold border-t border-l border-r border-black">
            TRANSPORTADOR / VOLUMES TRANSPORTADOS
          </div>
          <div className="border border-black text-[8px]">
            <div className="flex border-b border-black">
              <div className="flex-1 p-1 border-r border-black">
                <span className="block text-[6.5px] text-gray-600">RAZÃO SOCIAL</span>
                <strong>O MESMO / TRANSPORTE PRÓPRIO</strong>
              </div>
              <div className="w-36 p-1 border-r border-black">
                <span className="block text-[6.5px] text-gray-600">FRETE POR CONTA</span>
                <strong>0 - EMITENTE (CIF)</strong>
              </div>
              <div className="w-32 p-1 border-r border-black">
                <span className="block text-[6.5px] text-gray-600">PLACA VEÍCULO</span>
                <span>BRA2E19</span>
              </div>
              <div className="w-32 p-1">
                <span className="block text-[6.5px] text-gray-600">CNPJ / CPF</span>
                <span className="font-mono">{invoice.supplierCnpj}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── DADOS DOS PRODUTOS / SERVIÇOS ── */}
        <div className="mb-1">
          <div className="bg-gray-200 px-1 py-0.5 text-[8px] font-bold border-t border-l border-r border-black">
            DADOS DOS PRODUTOS / SERVIÇOS
          </div>
          <div className="border border-black">
            <table className="w-full text-left text-[7.5px] border-collapse">
              <thead>
                <tr className="border-b border-black bg-gray-100 font-bold">
                  <th className="p-1 border-r border-black w-14">CÓDIGO</th>
                  <th className="p-1 border-r border-black">DESCRIÇÃO DO PRODUTO / SERVIÇO</th>
                  <th className="p-1 border-r border-black w-14">NCM/SH</th>
                  <th className="p-1 border-r border-black w-10">CST</th>
                  <th className="p-1 border-r border-black w-10">CFOP</th>
                  <th className="p-1 border-r border-black w-8 text-center">UN</th>
                  <th className="p-1 border-r border-black w-12 text-right">QTD</th>
                  <th className="p-1 border-r border-black w-16 text-right">V. UNITÁRIO</th>
                  <th className="p-1 border-r border-black w-16 text-right">V. TOTAL</th>
                  <th className="p-1 border-r border-black w-14 text-right">BC ICMS</th>
                  <th className="p-1 text-right w-12">V. ICMS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/30 font-mono">
                {invoice.itemsPreview.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-1 border-r border-black/40">{item.barcode ? item.barcode.slice(-7) : `P00${idx + 1}`}</td>
                    <td className="p-1 border-r border-black/40 font-sans font-bold">{item.name}</td>
                    <td className="p-1 border-r border-black/40">{item.ncm || "22030000"}</td>
                    <td className="p-1 border-r border-black/40">000</td>
                    <td className="p-1 border-r border-black/40">{item.cfop || "5102"}</td>
                    <td className="p-1 border-r border-black/40 text-center font-sans">{item.unit}</td>
                    <td className="p-1 border-r border-black/40 text-right font-black">{item.quantity}</td>
                    <td className="p-1 border-r border-black/40 text-right">{fmt(item.unitCost)}</td>
                    <td className="p-1 border-r border-black/40 text-right font-black">{fmt(item.totalCost)}</td>
                    <td className="p-1 border-r border-black/40 text-right">{fmt(item.totalCost * 0.8)}</td>
                    <td className="p-1 text-right">{fmt(item.totalCost * 0.18)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── DADOS ADICIONAIS / INFORMAÇÕES COMPLEMENTARES ── */}
        <div>
          <div className="bg-gray-200 px-1 py-0.5 text-[8px] font-bold border-t border-l border-r border-black">
            DADOS ADICIONAIS
          </div>
          <div className="border border-black p-1 text-[7.5px] min-h-[16mm] flex flex-col justify-between">
            <div>
              <span className="font-bold block">INFORMAÇÕES COMPLEMENTARES:</span>
              <p className="text-gray-700 leading-tight">
                Documento emitido por ME ou EPP optante pelo Simples Nacional ou Regime Normal. Permite aproveitamento de crédito conforme art. 23 da LC 123/2006.
                {invoice.manifestProtocolo && ` Protocolo SEFAZ: ${invoice.manifestProtocolo}.`}
                {invoice.manifestJustificativa && ` NOTA RECUSADA: "${invoice.manifestJustificativa}".`}
              </p>
            </div>
            <div className="text-right text-[7px] text-gray-500 font-mono">
              Emissor: Cybertech RP · Sistema de Gestão Empresarial e PDV Fiscal
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

