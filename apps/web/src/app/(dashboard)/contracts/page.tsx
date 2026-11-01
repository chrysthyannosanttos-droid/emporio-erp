"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Printer,
  Building2,
  DollarSign,
  Layers,
  Check,
  Briefcase,
  ShieldCheck,
  Lock,
  Scale
} from "lucide-react";

interface ModuleOption {
  id: string;
  name: string;
  category: string;
  description: string;
}

const AVAILABLE_MODULES: ModuleOption[] = [
  {
    id: "pdv",
    name: "PDV Frente de Caixa (Touch / Kiosk)",
    category: "Vendas",
    description: "Operação rápida de caixa, sangria, suprimento, integração TEF e balança Prix/Filizola."
  },
  {
    id: "fiscal",
    name: "Emissor Fiscal (NF-e, NFC-e, SAT & MDF-e)",
    category: "Fiscal",
    description: "Transmissão para SEFAZ, contingência offline e cálculo tributário (IBS/CBS/IS)."
  },
  {
    id: "stock",
    name: "Controle de Estoque & Entrada XML",
    category: "Suprimentos",
    description: "Importação de notas fiscais, controle de lotes, validade e inventário."
  },
  {
    id: "finance",
    name: "Gestão Financeira & DRE Gerencial",
    category: "Financeiro",
    description: "Contas a pagar e receber, fluxo de caixa diário, conciliação e centro de custos."
  },
  {
    id: "restaurant",
    name: "Gastronomia (Mesas, Comandas & KDS)",
    category: "Alimentação",
    description: "Gestão de salão, delivery integrado, fichas técnicas e tela de cozinha (KDS)."
  },
  {
    id: "distribution",
    name: "Distribuidora & Força de Vendas",
    category: "Logística",
    description: "Gestão de pedidos externos, faturamento em lote, rotas e comissões."
  },
  {
    id: "factory",
    name: "Produção Industrial (PCP & Fichas)",
    category: "Indústria",
    description: "Ordens de produção, consumo de matéria-prima e custos industriais."
  },
  {
    id: "reports",
    name: "BI Avançado & Relatórios Gerenciais",
    category: "Gestão",
    description: "Curva ABC, rentabilidade por produto e métricas em tempo real."
  }
];

export default function ContractGeneratorPage() {
  // ── 1. DADOS DA CONTRATADA (CYBERTECH) ──
  const [providerName, setProviderName] = useState("CYBERTECH DESENVOLVIMENTO DE SISTEMAS LTDA");
  const [providerCnpj, setProviderCnpj] = useState("45.892.104/0001-92");
  const [providerIe, setProviderIe] = useState("Isento");
  const [providerAddress, setProviderAddress] = useState("Av. Central de Tecnologia, 1000 - Centro");
  const [providerCity, setProviderCity] = useState("São Paulo - SP");
  const [providerPhone, setProviderPhone] = useState("(81) 98800-4521");
  const [providerEmail, setProviderEmail] = useState("suporte@cybertechrp.com.br");
  const [providerSigner, setProviderSigner] = useState("Cristiano (Diretor Comercial)");
  const [pixKey, setPixKey] = useState("45.892.104/0001-92");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cybertech_provider_info");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name) setProviderName(parsed.name);
        if (parsed.cnpj) setProviderCnpj(parsed.cnpj);
        if (parsed.ie) setProviderIe(parsed.ie);
        if (parsed.address) setProviderAddress(parsed.address);
        if (parsed.city) setProviderCity(parsed.city);
        if (parsed.phone) setProviderPhone(parsed.phone);
        if (parsed.email) setProviderEmail(parsed.email);
        if (parsed.signer) setProviderSigner(parsed.signer);
        if (parsed.pix) setPixKey(parsed.pix);
      }
    } catch (_) {}
  }, []);

  const saveProviderData = () => {
    try {
      localStorage.setItem("cybertech_provider_info", JSON.stringify({
        name: providerName,
        cnpj: providerCnpj,
        ie: providerIe,
        address: providerAddress,
        city: providerCity,
        phone: providerPhone,
        email: providerEmail,
        signer: providerSigner,
        pix: pixKey
      }));
    } catch (_) {}
  };

  // ── 2. DADOS DO CLIENTE (CONTRATANTE) ──
  const [clientName, setClientName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [cityState, setCityState] = useState("");

  // ── 3. DADOS COMERCIAIS ──
  const [selectedModules, setSelectedModules] = useState<string[]>([
    "pdv",
    "fiscal",
    "stock",
    "finance"
  ]);
  const [setupFee, setSetupFee] = useState("600,00");
  const [monthlyFee, setMonthlyFee] = useState("350,00");
  const [dueDay, setDueDay] = useState("10");
  const [contractTerm, setContractTerm] = useState("12");
  const [terminalCount, setTerminalCount] = useState("1");
  const [observations, setObservations] = useState(
    "Incluso treinamento operacional presencial/remoto de até 4 horas, suporte técnico de segunda a sábado e atualizações de legislação tributária."
  );

  const [viewMode, setViewMode] = useState<"form" | "preview">("form");

  const toggleModule = (id: string) => {
    if (selectedModules.includes(id)) {
      setSelectedModules(selectedModules.filter(m => m !== id));
    } else {
      setSelectedModules([...selectedModules, id]);
    }
  };

  const handlePrint = () => {
    saveProviderData();
    const params = new URLSearchParams({
      providerName,
      providerCnpj,
      providerIe,
      providerAddress,
      providerCity,
      providerPhone,
      providerEmail,
      providerSigner,
      pixKey,
      clientName,
      tradeName,
      cnpj,
      contactPerson,
      cpf,
      phone,
      email,
      address,
      cityState,
      modules: selectedModules.join(","),
      setupFee,
      monthlyFee,
      dueDay,
      contractTerm,
      terminalCount,
      observations,
    });
    window.open(`/contracts/print?${params.toString()}`, "_blank");
  };

  const todayFormatted = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 12mm 10mm 12mm;
          }
          html, body {
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: 'Times New Roman', Times, serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header, footer, nav, aside, .print\\:hidden, #ai-chatbot-widget {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          .page-break {
            page-break-after: always !important;
            break-after: page !important;
          }
          .a4-sheet {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: 275mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
        }
      `}</style>

      <div className="space-y-6 max-w-6xl mx-auto pb-16 select-none print:m-0 print:p-0 print:max-w-none">
        {/* BARRA SUPERIOR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm print:hidden">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
              <FileText className="text-blue-600" size={26} />
              Gerador de Contratos Jurídicos SaaS (LGPD &amp; Lei 9.609/98)
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Contrato profissional com cláusulas de LGPD, propriedade intelectual, SLA de atendimento e validade jurídica.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {viewMode === "form" ? (
              <button
                onClick={() => {
                  saveProviderData();
                  setViewMode("preview");
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-500/20 text-sm"
              >
                <FileText size={17} />
                <span>Visualizar Contrato Pronto</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => setViewMode("form")}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors border border-gray-200"
                >
                  Voltar à Edição
                </button>
                <button
                  onClick={handlePrint}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 text-sm active:scale-95"
                >
                  <Printer size={17} />
                  <span>Imprimir / Salvar PDF</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── MODO 1: FORMULÁRIO ── */}
        {viewMode === "form" && (
          <div className="space-y-6 print:hidden">
            {/* MEUS DADOS */}
            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-blue-100 pb-3">
                <div className="flex items-center gap-2 text-blue-700">
                  <Briefcase size={20} />
                  <h2 className="text-base font-bold text-gray-900">
                    Meus Dados (Empresa Contratada / Emissora)
                  </h2>
                </div>
                <span className="text-[11px] font-semibold text-blue-600 bg-white px-3 py-1 rounded-full border border-blue-200">
                  Fica gravado no sistema
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Minha Razão Social / Nome Comercial
                  </label>
                  <input
                    type="text"
                    value={providerName}
                    onChange={e => setProviderName(e.target.value)}
                    placeholder="CYBERTECH DESENVOLVIMENTO DE SISTEMAS LTDA"
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Meu CNPJ ou CPF
                  </label>
                  <input
                    type="text"
                    value={providerCnpj}
                    onChange={e => setProviderCnpj(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-mono text-gray-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Representante Legal (Quem assina por você)
                  </label>
                  <input
                    type="text"
                    value={providerSigner}
                    onChange={e => setProviderSigner(e.target.value)}
                    placeholder="Seu Nome / Cargo"
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Telefone / WhatsApp Comercial
                  </label>
                  <input
                    type="text"
                    value={providerPhone}
                    onChange={e => setProviderPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Chave PIX (Para Recebimento)
                  </label>
                  <input
                    type="text"
                    value={pixKey}
                    onChange={e => setPixKey(e.target.value)}
                    placeholder="CNPJ / Celular / E-mail"
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-mono text-gray-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Meu Endereço Comercial
                  </label>
                  <input
                    type="text"
                    value={providerAddress}
                    onChange={e => setProviderAddress(e.target.value)}
                    placeholder="Rua, Número, Bairro"
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Cidade / Estado
                  </label>
                  <input
                    type="text"
                    value={providerCity}
                    onChange={e => setProviderCity(e.target.value)}
                    placeholder="São Paulo - SP"
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* DADOS DO CLIENTE */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Building2 className="text-blue-600" size={20} />
                <h2 className="text-base font-bold text-gray-900">1. Dados do Cliente Contratante</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Razão Social do Cliente *
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="Ex: Supermercado e Padaria Modelo LTDA"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Nome Fantasia
                  </label>
                  <input
                    type="text"
                    value={tradeName}
                    onChange={e => setTradeName(e.target.value)}
                    placeholder="Ex: Supermercado Modelo"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    CNPJ ou CPF do Cliente *
                  </label>
                  <input
                    type="text"
                    value={cnpj}
                    onChange={e => setCnpj(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-gray-900 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Representante Legal (Responsável)
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    placeholder="Nome do Proprietário / Sócio"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Endereço Completo do Cliente
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Rua, Número, Bairro"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Cidade / Estado
                  </label>
                  <input
                    type="text"
                    value={cityState}
                    onChange={e => setCityState(e.target.value)}
                    placeholder="Recife - PE"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* SELEÇÃO DE MÓDULOS */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="text-blue-600" size={20} />
                  <h2 className="text-base font-bold text-gray-900">2. Módulos Contratados</h2>
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                  {selectedModules.length} módulo(s) ativo(s)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {AVAILABLE_MODULES.map(mod => {
                  const isSelected = selectedModules.includes(mod.id);
                  return (
                    <div
                      key={mod.id}
                      onClick={() => toggleModule(mod.id)}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                        isSelected
                          ? "bg-blue-50/50 border-blue-600 text-blue-900"
                          : "bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-colors mt-0.5 ${
                          isSelected
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "bg-white border-gray-300 text-transparent"
                        }`}
                      >
                        <Check size={12} strokeWidth={3} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-gray-900">{mod.name}</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">
                            {mod.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">
                          {mod.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* VALORES */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <DollarSign className="text-blue-600" size={20} />
                <h2 className="text-base font-bold text-gray-900">3. Condições Comerciais</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Implantação (R$) *
                  </label>
                  <input
                    type="text"
                    value={setupFee}
                    onChange={e => setSetupFee(e.target.value)}
                    placeholder="600,00"
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Mensalidade (R$) *
                  </label>
                  <input
                    type="text"
                    value={monthlyFee}
                    onChange={e => setMonthlyFee(e.target.value)}
                    placeholder="350,00"
                    className="w-full px-4 py-2 bg-blue-50 border border-blue-300 rounded-xl text-sm font-extrabold text-blue-700 outline-none focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Dia Vencimento
                  </label>
                  <select
                    value={dueDay}
                    onChange={e => setDueDay(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 outline-none focus:border-blue-500"
                  >
                    <option value="05">Todo dia 05</option>
                    <option value="10">Todo dia 10</option>
                    <option value="15">Todo dia 15</option>
                    <option value="20">Todo dia 20</option>
                    <option value="25">Todo dia 25</option>
                    <option value="30">Todo dia 30</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Terminais Inclusos
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={terminalCount}
                    onChange={e => setTerminalCount(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Observações Especiais
                  </label>
                  <textarea
                    rows={2}
                    value={observations}
                    onChange={e => setObservations(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  saveProviderData();
                  setViewMode("preview");
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 text-base"
              >
                <FileText size={20} />
                <span>Visualizar Contrato Jurídico Pronto</span>
              </button>
            </div>
          </div>
        )}

        {/* ── MODO 2: CONTRATO FORMAL EM EXATAMENTE 2 PÁGINAS A4 COM LEIS COMPLETAS ── */}
        {viewMode === "preview" && (
          <div className="space-y-8 print:space-y-0">
            {/* ═══════════════ FOLHA 1 DE 2 ═══════════════ */}
            <div className="a4-sheet page-break bg-white p-8 md:p-11 rounded-3xl border border-gray-200 shadow-xl max-w-4xl mx-auto font-serif text-gray-900 leading-snug">
              <div>
                {/* Cabeçalho Timbrado */}
                <div className="border-b-2 border-blue-600 pb-2.5 mb-3 font-sans">
                  <div className="flex items-center justify-between gap-4">
                    <img
                      src="/logo-cybertech.png"
                      alt="Cybertech RP"
                      className="h-12 w-auto object-contain"
                    />
                    <div className="text-right text-[9.5px] text-gray-600 leading-tight">
                      <div className="font-extrabold text-gray-900 uppercase text-[10.5px]">{providerName}</div>
                      <div>CNPJ: {providerCnpj} • {providerAddress}, {providerCity}</div>
                      <div className="text-blue-600 font-semibold">{providerEmail} • {providerPhone}</div>
                      {pixKey && <div className="text-emerald-700 font-bold font-mono">Chave PIX Oficial: {pixKey}</div>}
                    </div>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-gray-200 flex justify-between text-[8.5px] text-gray-400 uppercase tracking-widest font-bold">
                    <span>Instrumento Particular de Licenciamento SaaS</span>
                    <span>Ref: CTR-{new Date().getFullYear()}-{Math.floor(1000 + Math.random() * 9000)}</span>
                    <span>Página 1 de 2</span>
                  </div>
                </div>

                {/* Título */}
                <div className="text-center mb-3">
                  <h2 className="text-xs md:text-sm font-black uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1 inline-block font-sans">
                    CONTRATO DE LICENCIAMENTO DE SOFTWARE (SAAS), SUPORTE E PROTEÇÃO DE DADOS
                  </h2>
                </div>

                {/* Qualificação */}
                <div className="space-y-2.5 text-justify text-[10.5px] text-gray-800 leading-relaxed font-serif">
                  <p>
                    <strong>CONTRATADA:</strong> <strong>{providerName}</strong>, pessoa jurídica de direito privado, inscrita no CNPJ sob nº <strong>{providerCnpj}</strong>, com sede em {providerAddress}, {providerCity}, neste ato representada na forma de seus atos constitutivos;
                  </p>
                  <p>
                    <strong>CONTRATANTE:</strong> <strong>{clientName || "________________________________________________"}</strong>
                    {tradeName ? ` (Nome Fantasia: ${tradeName})` : ""}, inscrita no CNPJ/CPF sob nº <strong>{cnpj || "_______________________"}</strong>, com sede em {address || "________________________"}, {cityState}, representada por <strong>{contactPerson || "_______________________"}</strong>.
                  </p>

                  <p className="text-[9.5px] text-gray-500 italic">
                    Têm entre si, justo e contratado, o presente instrumento sob a égide da Lei Federal nº 9.609/1998 (Lei do Software), Lei nº 9.610/1998 (Direitos Autorais), Lei Federal nº 13.709/2018 (LGPD) e Código Civil Brasileiro:
                  </p>

                  {/* Cláusula 1 - Objeto e Módulos */}
                  <div className="pt-1">
                    <h3 className="font-bold uppercase text-[10.5px] text-gray-900 font-sans border-b border-gray-200 pb-0.5">
                      CLÁUSULA 1ª – DO OBJETO E MÓDULOS CONTRATADOS
                    </h3>
                    <p className="mt-1 text-[10.5px]">
                      1.1. O presente contrato tem por objeto a concessão de licença de uso temporária, contínua e não exclusiva do sistema <strong>CYBERTECH RP</strong>, hospedado em infraestrutura de nuvem com redundância de servidores e operação em <strong>{terminalCount} terminal(is) PDV</strong>, contemplando os módulos assinalados:
                    </p>

                    <div className="grid grid-cols-2 gap-1.5 mt-1.5 font-sans">
                      {AVAILABLE_MODULES.filter(m => selectedModules.includes(m.id)).map(m => (
                        <div key={m.id} className="p-1.5 rounded-lg bg-gray-50 border border-gray-200 flex items-start gap-1.5">
                          <div className="w-3 h-3 rounded bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-[8px] font-bold">
                            ✓
                          </div>
                          <div>
                            <span className="font-bold text-[9.5px] text-gray-900 leading-tight">{m.name}: </span>
                            <span className="text-[8.5px] text-gray-500 leading-tight">{m.description}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cláusula 2 - Valores */}
                  <div className="pt-1.5">
                    <h3 className="font-bold uppercase text-[10.5px] text-gray-900 font-sans border-b border-gray-200 pb-0.5">
                      CLÁUSULA 2ª – DOS VALORES, IMPLANTAÇÃO E MENSALIDADES
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-2 mt-1.5 font-sans">
                      <div className="p-2 bg-gray-50 rounded-xl border border-gray-200 text-center">
                        <div className="text-[9px] font-bold text-gray-500 uppercase">Taxa de Implantação e Treinamento</div>
                        <div className="text-sm font-black text-gray-900 font-mono mt-0.5">R$ {setupFee}</div>
                        <div className="text-[8px] text-gray-500">Valor único referente à configuração inicial</div>
                      </div>

                      <div className="p-2 bg-blue-50/70 rounded-xl border border-blue-200 text-center">
                        <div className="text-[9px] font-bold text-blue-700 uppercase">Mensalidade de Licenciamento (SaaS)</div>
                        <div className="text-sm font-black text-blue-700 font-mono mt-0.5">R$ {monthlyFee} / mês</div>
                        <div className="text-[8px] text-blue-600 font-medium">Vencimento todo dia {dueDay}</div>
                      </div>
                    </div>

                    <p className="mt-1 text-[10px]">
                      2.1. O valor mensal contempla o direito de uso contínuo, hospedagem de banco de dados, backups diários, suporte técnico especializado e atualizações normativas fiscais da SEFAZ (incluindo IBS, CBS e Imposto Seletivo).
                    </p>
                    <p className="mt-0.5 text-[10px]">
                      2.2. Os pagamentos serão realizados via Chave PIX Oficial (<strong>{pixKey}</strong>) ou Boleto Bancário. O atraso superior a 15 (quinze) dias ensejará a suspensão temporária do acesso aos serviços de nuvem, sem prejuízo da cobrança de juros de 1% ao mês e multa de 2%.
                    </p>
                  </div>

                  {/* Cláusula 3 - Propriedade Intelectual */}
                  <div className="pt-1.5">
                    <h3 className="font-bold uppercase text-[10.5px] text-gray-900 font-sans border-b border-gray-200 pb-0.5">
                      CLÁUSULA 3ª – DA PROPRIEDADE INTELECTUAL (LEI Nº 9.609/98)
                    </h3>
                    <p className="mt-1 text-[10px]">
                      3.1. O software Cybertech RP, seus algoritmos, código-fonte, marcas e documentações são de propriedade exclusiva da CONTRATADA. É expressamente vedado à CONTRATANTE copiar, alterar, ceder, sublicenciar, transferir a terceiros ou realizar engenharia reversa do sistema.
                    </p>
                  </div>
                </div>
              </div>

              {/* Rodapé Folha 1 */}
              <div className="pt-2 mt-2 border-t border-gray-200 flex justify-between text-[8.5px] text-gray-400 font-sans">
                <span>Rubrica CONTRATADA: ____________________</span>
                <span>Rubrica CONTRATANTE: ____________________</span>
              </div>
            </div>

            {/* ═══════════════ FOLHA 2 DE 2 ═══════════════ */}
            <div className="a4-sheet bg-white p-8 md:p-11 rounded-3xl border border-gray-200 shadow-xl max-w-4xl mx-auto font-serif text-gray-900 leading-snug">
              <div>
                {/* Cabeçalho Compacto Folha 2 */}
                <div className="border-b border-gray-200 pb-1.5 mb-3 flex justify-between items-center text-[9px] text-gray-500 font-sans">
                  <div className="flex items-center gap-2">
                    <img src="/logo-cybertech.png" alt="Cybertech" className="h-5 w-auto" />
                    <span className="font-bold text-gray-700">{providerName}</span>
                  </div>
                  <div className="font-bold uppercase tracking-widest text-[8.5px]">
                    Contrato de Software – Página 2 de 2
                  </div>
                </div>

                <div className="space-y-3 text-justify text-[10.5px] text-gray-800 leading-relaxed font-serif">
                  {/* Cláusula 4 - LGPD */}
                  <div>
                    <h3 className="font-bold uppercase text-[10.5px] text-gray-900 font-sans border-b border-gray-200 pb-0.5">
                      CLÁUSULA 4ª – DA PROTEÇÃO DE DADOS PESSOAIS (LGPD – LEI Nº 13.709/2018)
                    </h3>
                    <p className="mt-1 text-[10px]">
                      4.1. As partes comprometem-se a cumprir integralmente as disposições da Lei Geral de Proteção de Dados (Lei nº 13.709/2018). Para fins contratuais, a <strong>CONTRATANTE atua como Controladora</strong> dos dados de seus clientes, produtos e funcionários cadastrados, e a <strong>CONTRATADA atua estritamente como Operadora</strong> técnica da infraestrutura.
                    </p>
                    <p className="mt-0.5 text-[10px]">
                      4.2. A CONTRATADA tratará os dados única e exclusivamente para a execução do software e obrigações fiscais, sendo estritamente vedada a venda, cessão, cruzamento ou compartilhamento de dados comerciais com terceiros.
                    </p>
                    <p className="mt-0.5 text-[10px]">
                      4.3. A CONTRATADA adota medidas técnicas e administrativas aptas a proteger os dados contra acessos não autorizados, perdas acidentais ou destruição ilícita, com backups diários e criptografia SSL/TLS em trânsito.
                    </p>
                  </div>

                  {/* Cláusula 5 - Suporte e SLA */}
                  <div>
                    <h3 className="font-bold uppercase text-[10.5px] text-gray-900 font-sans border-b border-gray-200 pb-0.5">
                      CLÁUSULA 5ª – DO SUPORTE TÉCNICO E NÍVEL DE SERVIÇO (SLA)
                    </h3>
                    <p className="mt-1 text-[10px]">
                      5.1. O suporte técnico é prestado de segunda a sábado em horário comercial via WhatsApp (<strong>{providerPhone}</strong>), telefone e acesso remoto via AnyDesk / RustDesk, com SLA de até 2 horas para paradas críticas de frente de caixa.
                    </p>
                    <p className="mt-0.5 text-[10px]">
                      5.2. A CONTRATADA garante disponibilidade de infraestrutura de nuvem de 99,5% (noventa e nove vírgula cinco por cento) ao mês, ressalvadas manutenções preventivas programadas em horários de menor fluxo (madrugadas).
                    </p>
                  </div>

                  {/* Cláusula 6 - Vigência e Rescisão */}
                  <div>
                    <h3 className="font-bold uppercase text-[10.5px] text-gray-900 font-sans border-b border-gray-200 pb-0.5">
                      CLÁUSULA 6ª – DA VIGÊNCIA, RESCISÃO E PROPRIEDADE DOS DADOS
                    </h3>
                    <p className="mt-1 text-[10px]">
                      6.1. O presente contrato vigorará pelo prazo determinado de <strong>{contractTerm} meses</strong>, renovando-se automaticamente caso não haja manifestação expressa em contrário com aviso prévio de 30 (trinta) dias.
                    </p>
                    <p className="mt-0.5 text-[10px]">
                      6.2. Em caso de encerramento contratual, é garantido à CONTRATANTE o direito de exportar integralmente suas bases de dados em formatos universais (XML, Excel e CSV) sem custo adicional, procedendo-se a eliminação segura dos dados dos servidores após 60 dias.
                    </p>
                  </div>

                  {/* Cláusula 7 - Observações */}
                  {observations && (
                    <div>
                      <h3 className="font-bold uppercase text-[10.5px] text-gray-900 font-sans border-b border-gray-200 pb-0.5">
                        CLÁUSULA 7ª – CONDIÇÕES E DISPOSIÇÕES ESPECIAIS
                      </h3>
                      <p className="mt-1 italic text-[9.5px] bg-gray-50 p-1.5 rounded border border-gray-200 font-sans">
                        "{observations}"
                      </p>
                    </div>
                  )}

                  {/* Data e Local */}
                  <div className="pt-2 text-center text-xs font-semibold text-gray-800 font-sans">
                    <p>{cityState || providerCity || "Local"}, {todayFormatted}.</p>
                  </div>

                  {/* Assinaturas */}
                  <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs font-sans">
                    <div>
                      <div className="border-t border-gray-900 w-4/5 mx-auto pt-1 font-bold text-gray-900 text-[11px]">
                        {providerSigner || providerName}
                      </div>
                      <div className="text-[9.5px] text-gray-500">CONTRATADA (Cybertech RP)</div>
                    </div>

                    <div>
                      <div className="border-t border-gray-900 w-4/5 mx-auto pt-1 font-bold text-gray-900 text-[11px]">
                        {contactPerson || clientName || "CONTRATANTE"}
                      </div>
                      <div className="text-[9.5px] text-gray-500">CONTRATANTE (Assinatura do Responsável)</div>
                    </div>
                  </div>

                  {/* Testemunhas */}
                  <div className="pt-4 grid grid-cols-2 gap-8 text-center text-[9.5px] text-gray-400 font-sans">
                    <div>
                      <div className="border-t border-gray-300 w-3/5 mx-auto pt-1">
                        1ª Testemunha (Nome e CPF)
                      </div>
                    </div>
                    <div>
                      <div className="border-t border-gray-300 w-3/5 mx-auto pt-1">
                        2ª Testemunha (Nome e CPF)
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rodapé Timbrado Final */}
              <div className="mt-4 pt-2 border-t border-gray-200 flex items-center justify-between text-[8.5px] text-gray-400 font-sans">
                <div className="flex items-center gap-1.5">
                  <img src="/logo-cybertech.png" alt="Cybertech" className="h-3 w-auto opacity-70" />
                  <span>{providerName} • Soluções em Automação Comercial</span>
                </div>
                <div>Regido pela Lei nº 9.609/98 (Lei do Software) e Lei nº 13.709/18 (LGPD) • Foro da Comarca da Contratada</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
