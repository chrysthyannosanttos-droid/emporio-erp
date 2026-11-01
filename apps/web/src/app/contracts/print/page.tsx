"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

const AVAILABLE_MODULES: Record<string, { name: string; desc: string }> = {
  pdv: {
    name: "PDV Frente de Caixa (Touch / Kiosk)",
    desc: "Operação rápida de caixa, sangria, suprimento, integração TEF e balança Prix/Filizola."
  },
  fiscal: {
    name: "Emissor Fiscal (NF-e, NFC-e, SAT & MDF-e)",
    desc: "Transmissão automática para SEFAZ, contingência offline e cálculo tributário (IBS/CBS/IS)."
  },
  stock: {
    name: "Controle de Estoque & Entrada XML",
    desc: "Importação de notas fiscais, controle de lotes, validade e inventário."
  },
  finance: {
    name: "Gestão Financeira & DRE Gerencial",
    desc: "Contas a pagar e receber, fluxo de caixa diário, conciliação e centro de custos."
  },
  restaurant: {
    name: "Gastronomia (Mesas, Comandas & KDS)",
    desc: "Gestão de salão, delivery integrado, fichas técnicas e tela de cozinha (KDS)."
  },
  distribution: {
    name: "Distribuidora & Força de Vendas",
    desc: "Gestão de pedidos externos, faturamento em lote, rotas e comissões."
  },
  factory: {
    name: "Produção Industrial (PCP & Fichas)",
    desc: "Ordens de produção, consumo de matéria-prima e custos industriais."
  },
  reports: {
    name: "BI Avançado & Relatórios Gerenciais",
    desc: "Curva ABC, rentabilidade por produto e métricas em tempo real."
  }
};

function PrintContractContent() {
  const searchParams = useSearchParams();

  // Dados da Contratada
  const providerName = searchParams.get("providerName") || "CYBERTECH DESENVOLVIMENTO DE SISTEMAS LTDA";
  const providerCnpj = searchParams.get("providerCnpj") || "45.892.104/0001-92";
  const providerAddress = searchParams.get("providerAddress") || "Av. Central de Tecnologia, 1000 - Centro";
  const providerCity = searchParams.get("providerCity") || "São Paulo - SP";
  const providerPhone = searchParams.get("providerPhone") || "(81) 98800-4521";
  const providerEmail = searchParams.get("providerEmail") || "suporte@cybertechrp.com.br";
  const providerSigner = searchParams.get("providerSigner") || "Cristiano (Diretor Comercial)";
  const pixKey = searchParams.get("pixKey") || "45.892.104/0001-92";

  // Dados da Contratante
  const clientName = searchParams.get("clientName") || "________________________________________________";
  const tradeName = searchParams.get("tradeName") || "";
  const cnpj = searchParams.get("cnpj") || "_______________________";
  const contactPerson = searchParams.get("contactPerson") || "_______________________";
  const cpf = searchParams.get("cpf") || "";
  const phone = searchParams.get("phone") || "_______________________";
  const address = searchParams.get("address") || "________________________________________________";
  const cityState = searchParams.get("cityState") || "";

  // Dados Comerciais
  const modulesParam = searchParams.get("modules") || "pdv,fiscal,stock,finance";
  const activeModules = modulesParam.split(",").filter(Boolean);
  const setupFee = searchParams.get("setupFee") || "600,00";
  const monthlyFee = searchParams.get("monthlyFee") || "350,00";
  const dueDay = searchParams.get("dueDay") || "10";
  const contractTerm = searchParams.get("contractTerm") || "12";
  const terminalCount = searchParams.get("terminalCount") || "1";
  const observations = searchParams.get("observations") || "Incluso treinamento operacional de até 4 horas, suporte técnico de segunda a sábado e atualizações de legislação tributária.";

  const todayFormatted = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

  useEffect(() => {
    // Abre a janela de impressão automaticamente após carregar
    const timer = setTimeout(() => {
      window.print();
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-white text-gray-900 font-sans leading-normal">
      {/* ── BOTÃO FLUTUANTE NA TELA (SOME NA IMPRESSÃO) ── */}
      <div className="fixed top-4 right-4 z-50 print:hidden flex gap-3 bg-white p-3 rounded-2xl shadow-xl border border-gray-200">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2"
        >
          <span>🖨️ Imprimir / Salvar em PDF</span>
        </button>
        <button
          onClick={() => window.close()}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-bold text-sm transition-all"
        >
          Fechar Aba
        </button>
      </div>

      {/* ══════════════════════════════════════════════════
          PÁGINA 1 DE 2 (A4 FORMAL)
      ══════════════════════════════════════════════════ */}
      <div className="sheet-a4 flex flex-col justify-between">
        <div>
          {/* Cabeçalho Timbrado Oficial */}
          <div className="border-b-2 border-blue-600 pb-3 mb-4">
            <div className="flex items-center justify-between gap-6">
              <img
                src="/logo-cybertech.png"
                alt="Cybertech RP"
                className="h-16 w-auto object-contain"
              />
              <div className="text-right text-[11px] text-gray-600 leading-tight">
                <div className="font-extrabold text-gray-900 text-xs uppercase">{providerName}</div>
                <div>CNPJ: {providerCnpj} • {providerAddress}</div>
                <div>{providerCity} • {providerPhone}</div>
                <div className="text-blue-600 font-bold">{providerEmail}</div>
                {pixKey && <div className="text-emerald-700 font-bold font-mono text-[10px]">Chave PIX: {pixKey}</div>}
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between text-[9px] text-gray-400 uppercase tracking-widest font-bold">
              <span>Instrumento Particular de Licenciamento SaaS</span>
              <span>Ref: CTR-{new Date().getFullYear()}-{Math.floor(1000 + Math.random() * 9000)}</span>
              <span>Página 1 de 2</span>
            </div>
          </div>

          {/* Título Centralizado */}
          <div className="text-center mb-4">
            <h1 className="text-sm font-black uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1.5 inline-block">
              CONTRATO DE LICENCIAMENTO DE SOFTWARE (SAAS), SUPORTE E PROTEÇÃO DE DADOS
            </h1>
          </div>

          {/* Qualificação das Partes */}
          <div className="space-y-3 text-justify text-xs text-gray-800 leading-relaxed font-serif">
            <p>
              <strong>CONTRATADA:</strong> <strong>{providerName}</strong>, pessoa jurídica de direito privado, inscrita no CNPJ sob nº <strong>{providerCnpj}</strong>, com sede em {providerAddress}, {providerCity}, neste ato representada por <strong>{providerSigner}</strong>.
            </p>
            <p>
              <strong>CONTRATANTE:</strong> <strong>{clientName}</strong>
              {tradeName ? ` (Nome Fantasia: ${tradeName})` : ""}, inscrita no CNPJ/CPF sob nº <strong>{cnpj}</strong>, com sede em {address}, {cityState}, neste ato representada por <strong>{contactPerson}</strong> {cpf ? `(CPF: ${cpf})` : ""}, fone: {phone}.
            </p>

            <p className="text-[11px] text-gray-500 italic">
              Têm entre si, justo e contratado, o presente instrumento sob a égide da Lei Federal nº 9.609/1998 (Lei do Software), Lei nº 9.610/1998 (Direitos Autorais), Lei Federal nº 13.709/2018 (LGPD) e Código Civil Brasileiro, mediante as cláusulas a seguir:
            </p>

            {/* Cláusula 1 - Objeto e Módulos */}
            <div className="pt-2">
              <h2 className="font-bold uppercase text-xs text-gray-900 font-sans border-b border-gray-200 pb-1">
                CLÁUSULA 1ª – DO OBJETO E MÓDULOS CONTRATADOS
              </h2>
              <p className="mt-1 text-xs">
                1.1. O presente instrumento tem por objeto a concessão de licença de uso temporária, contínua e não exclusiva do sistema <strong>CYBERTECH RP</strong>, hospedado em infraestrutura de nuvem com redundância de servidores e operação em <strong>{terminalCount} terminal(is) PDV</strong>, contemplando os seguintes módulos contratados:
              </p>

              <div className="grid grid-cols-2 gap-2 mt-2 font-sans">
                {activeModules.map(mKey => {
                  const mod = AVAILABLE_MODULES[mKey];
                  if (!mod) return null;
                  return (
                    <div key={mKey} className="p-2 rounded-lg bg-gray-50 border border-gray-200 flex items-start gap-2">
                      <div className="w-4 h-4 rounded bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                        ✓
                      </div>
                      <div>
                        <div className="font-bold text-[11px] text-gray-900 leading-tight">{mod.name}</div>
                        <div className="text-[10px] text-gray-500 leading-tight mt-0.5">{mod.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cláusula 2 - Valores */}
            <div className="pt-2">
              <h2 className="font-bold uppercase text-xs text-gray-900 font-sans border-b border-gray-200 pb-1">
                CLÁUSULA 2ª – DOS VALORES, IMPLANTAÇÃO E MENSALIDADES
              </h2>
              
              <div className="grid grid-cols-2 gap-3 mt-2 font-sans">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center">
                  <div className="text-[10px] font-bold text-gray-500 uppercase">Taxa de Implantação e Configuração</div>
                  <div className="text-base font-black text-gray-900 font-mono mt-0.5">R$ {setupFee}</div>
                  <div className="text-[9px] text-gray-500 mt-0.5">Pagamento único na ativação do sistema</div>
                </div>

                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-center">
                  <div className="text-[10px] font-bold text-blue-700 uppercase">Mensalidade de Licença de Uso (SaaS)</div>
                  <div className="text-base font-black text-blue-700 font-mono mt-0.5">R$ {monthlyFee} / mês</div>
                  <div className="text-[9px] text-blue-600 font-medium mt-0.5">Vencimento todo dia {dueDay} de cada mês</div>
                </div>
              </div>

              <p className="mt-2 text-xs">
                2.1. O valor mensal contempla o direito de uso contínuo, hospedagem de banco de dados, backups diários, suporte técnico especializado e atualizações normativas fiscais da SEFAZ (incluindo IBS, CBS e Imposto Seletivo).
              </p>
              <p className="mt-1 text-xs">
                2.2. Os pagamentos serão realizados via Chave PIX Oficial (<strong>{pixKey}</strong>) ou Boleto Bancário. O atraso superior a 15 (quinze) dias ensejará a suspensão temporária do acesso, com multa de 2% e juros legais de 1% a.m.
              </p>
            </div>

            {/* Cláusula 3 - Propriedade Intelectual */}
            <div className="pt-2">
              <h2 className="font-bold uppercase text-xs text-gray-900 font-sans border-b border-gray-200 pb-1">
                CLÁUSULA 3ª – DA PROPRIEDADE INTELECTUAL (LEI Nº 9.609/98)
              </h2>
              <p className="mt-1 text-xs">
                3.1. O software Cybertech RP, seus algoritmos, código-fonte, marcas e documentações são de propriedade exclusiva da CONTRATADA. É expressamente vedado à CONTRATANTE copiar, alterar, ceder, sublicenciar, transferir a terceiros ou realizar engenharia reversa do sistema.
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé da Página 1 */}
        <div className="pt-3 border-t border-gray-200 flex justify-between text-[10px] text-gray-400 font-sans">
          <span>Rubrica CONTRATADA: __________________________________</span>
          <span>Rubrica CONTRATANTE: __________________________________</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          PÁGINA 2 DE 2 (A4 FORMAL COM ASSINATURAS)
      ══════════════════════════════════════════════════ */}
      <div className="sheet-a4 flex flex-col justify-between">
        <div>
          {/* Cabeçalho Compacto Página 2 */}
          <div className="border-b-2 border-blue-600 pb-2.5 mb-4 flex justify-between items-center text-[10px] text-gray-600 font-sans">
            <div className="flex items-center gap-2">
              <img src="/logo-cybertech.png" alt="Cybertech" className="h-7 w-auto object-contain" />
              <span className="font-extrabold text-gray-800 uppercase">{providerName}</span>
            </div>
            <div className="font-bold uppercase tracking-widest text-[9px] text-gray-400">
              Contrato de Licenciamento de Software – Página 2 de 2
            </div>
          </div>

          <div className="space-y-4 text-justify text-xs text-gray-800 leading-relaxed font-serif">
            {/* Cláusula 4 - LGPD */}
            <div>
              <h2 className="font-bold uppercase text-xs text-gray-900 font-sans border-b border-gray-200 pb-1">
                CLÁUSULA 4ª – DA PROTEÇÃO DE DADOS PESSOAIS (LGPD – LEI Nº 13.709/2018)
              </h2>
              <p className="mt-1.5 text-xs">
                4.1. As partes comprometem-se a cumprir integralmente a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). Para todos os efeitos legais, a <strong>CONTRATANTE figura como Controladora</strong> dos dados de seus clientes, vendas e funcionários cadastrados, cabendo à <strong>CONTRATADA a condição estrita de Operadora</strong> técnica da infraestrutura.
              </p>
              <p className="mt-1 text-xs">
                4.2. A CONTRATADA tratará os dados única e exclusivamente para viabilizar a operação do sistema e emissão fiscal, sendo estritamente vedada a venda, compartilhamento ou cruzamento de dados comerciais com terceiros.
              </p>
              <p className="mt-1 text-xs">
                4.3. A CONTRATADA implementa medidas técnicas de segurança da informação, mantendo criptografia SSL/TLS em trânsito e rotinas automáticas de backup diário com retenção segura.
              </p>
            </div>

            {/* Cláusula 5 - Suporte e SLA */}
            <div>
              <h2 className="font-bold uppercase text-xs text-gray-900 font-sans border-b border-gray-200 pb-1">
                CLÁUSULA 5ª – DO SUPORTE TÉCNICO E NÍVEL DE SERVIÇO (SLA)
              </h2>
              <p className="mt-1.5 text-xs">
                5.1. O suporte técnico é prestado de segunda a sábado em horário comercial via WhatsApp oficial (<strong>{providerPhone}</strong>), telefone e acesso remoto via AnyDesk / RustDesk, com SLA de até 2 horas para paradas críticas de frente de caixa.
              </p>
              <p className="mt-1 text-xs">
                5.2. A CONTRATADA assegura índice de disponibilidade de infraestrutura de nuvem de 99,5% (noventa e nove vírgula cinco por cento) ao mês, ressalvadas manutenções preventivas programadas.
              </p>
            </div>

            {/* Cláusula 6 - Vigência e Rescisão */}
            <div>
              <h2 className="font-bold uppercase text-xs text-gray-900 font-sans border-b border-gray-200 pb-1">
                CLÁUSULA 6ª – DA VIGÊNCIA, RESCISÃO E PROPRIEDADE DOS DADOS
              </h2>
              <p className="mt-1.5 text-xs">
                6.1. O presente contrato vigorará pelo prazo determinado de <strong>{contractTerm} meses</strong>, renovando-se automaticamente caso não haja manifestação expressa em contrário com aviso prévio de 30 (trinta) dias.
              </p>
              <p className="mt-1 text-xs">
                6.2. É garantido à CONTRATANTE a qualquer momento o direito de exportar integralmente sua base de dados (XMLs, cadastros e relatórios em Excel/CSV) sem qualquer cobrança adicional.
              </p>
            </div>

            {/* Cláusula 7 - Observações */}
            {observations && (
              <div>
                <h2 className="font-bold uppercase text-xs text-gray-900 font-sans border-b border-gray-200 pb-1">
                  CLÁUSULA 7ª – CONDIÇÕES E DISPOSIÇÕES ESPECIAIS
                </h2>
                <p className="mt-1.5 italic text-[11px] bg-gray-50 p-2.5 rounded-lg border border-gray-200 font-sans">
                  "{observations}"
                </p>
              </div>
            )}

            {/* Data e Local */}
            <div className="pt-3 text-center text-xs font-semibold text-gray-800 font-sans">
              <p>{cityState || providerCity}, {todayFormatted}.</p>
            </div>

            {/* BLOCOS FORMAIS DE ASSINATURA */}
            <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs font-sans">
              <div>
                <div className="border-t-2 border-gray-900 w-4/5 mx-auto pt-2 font-bold text-gray-900">
                  {providerSigner}
                </div>
                <div className="text-[11px] font-bold text-gray-800 uppercase mt-0.5">{providerName}</div>
                <div className="text-[10px] text-gray-500">CONTRATADA (Cybertech RP)</div>
              </div>

              <div>
                <div className="border-t-2 border-gray-900 w-4/5 mx-auto pt-2 font-bold text-gray-900">
                  {contactPerson || clientName}
                </div>
                <div className="text-[11px] font-bold text-gray-800 uppercase mt-0.5">{clientName || "CONTRATANTE"}</div>
                <div className="text-[10px] text-gray-500">CONTRATANTE (Assinatura do Responsável)</div>
              </div>
            </div>

            {/* TESTEMUNHAS */}
            <div className="pt-8 grid grid-cols-2 gap-8 text-center text-[10px] text-gray-500 font-sans">
              <div>
                <div className="border-t border-gray-300 w-3/5 mx-auto pt-1 font-semibold text-gray-600">
                  1ª Testemunha
                </div>
                <div className="text-[9px]">Nome: ___________________________</div>
                <div className="text-[9px]">CPF: ____________________________</div>
              </div>
              <div>
                <div className="border-t border-gray-300 w-3/5 mx-auto pt-1 font-semibold text-gray-600">
                  2ª Testemunha
                </div>
                <div className="text-[9px]">Nome: ___________________________</div>
                <div className="text-[9px]">CPF: ____________________________</div>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé da Página 2 */}
        <div className="pt-3 border-t border-gray-200 flex items-center justify-between text-[9px] text-gray-400 font-sans">
          <div className="flex items-center gap-1.5">
            <img src="/logo-cybertech.png" alt="Cybertech" className="h-3.5 w-auto opacity-70" />
            <span>{providerName} • Soluções em Automação Comercial</span>
          </div>
          <div>Regido pela Lei nº 9.609/98 (Lei do Software) e Lei nº 13.709/18 (LGPD) • Foro da Comarca da Contratada</div>
        </div>
      </div>
    </div>
  );
}

export default function PrintContractPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-bold">Carregando contrato para impressão...</div>}>
      <PrintContractContent />
    </Suspense>
  );
}

