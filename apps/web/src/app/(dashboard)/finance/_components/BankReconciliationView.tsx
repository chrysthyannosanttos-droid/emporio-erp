"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload, CheckCircle2, AlertTriangle, FileText, ArrowRight,
  RefreshCw, Landmark, Check, Plus, Download, Search,
  Filter, Sparkles, X, ShieldCheck, ArrowUpRight, ArrowDownRight,
  Link as LinkIcon, CreditCard, Percent, Trash2
} from "lucide-react";

export interface BankAccountItem {
  id: string;
  bank: string;
  agency: string;
  account: string;
  type: "BANCO_TRADICIONAL" | "CONTA_MAQUINETA";
  balanceBank: number;
  balanceErp: number;
}

export interface CardAcquirer {
  id: string;
  name: string;             // ex: Stone, Rede, Cielo, PagBank, Getnet, Sipag
  merchantCode: string;     // Código EC / PV / Stone Code
  domicileBankId: string;   // Qual banco/conta recebe o depósito dos lotes
  domicileBankName: string; // Nome exibido
  captureType: "TEF_PINPAD" | "POS_MAQUINETA" | "AMBOS";
  autoAnticipation: boolean;
  anticipationFee: number;  // % ao mês
}

export interface CardBrandFee {
  id: string;
  brand: string;
  acquirer: string;
  debitRate: number;      // ex: 0.89 (%)
  debitDays: number;      // ex: 1 (D+1)
  creditRate: number;     // ex: 1.98 (%)
  creditDays: number;     // ex: 30 (D+30 ou D+1 antecipado)
  installmentRate: number;// ex: 3.49 (%)
}

const INITIAL_ACQUIRERS: CardAcquirer[] = [
  {
    id: "acq-rede",
    name: "Rede / Itaú",
    merchantCode: "PV 09481290",
    domicileBankId: "itau",
    domicileBankName: "Itaú Empresas (341)",
    captureType: "AMBOS",
    autoAnticipation: true,
    anticipationFee: 1.19,
  },
  {
    id: "acq-stone",
    name: "Stone",
    merchantCode: "Stone Code 8841209",
    domicileBankId: "stone-conta",
    domicileBankName: "Conta Stone PJ (197)",
    captureType: "POS_MAQUINETA",
    autoAnticipation: true,
    anticipationFee: 1.29,
  },
  {
    id: "acq-cielo",
    name: "Cielo",
    merchantCode: "EC 1094882190",
    domicileBankId: "bb",
    domicileBankName: "Banco do Brasil (001)",
    captureType: "TEF_PINPAD",
    autoAnticipation: false,
    anticipationFee: 1.45,
  },
  {
    id: "acq-pagbank",
    name: "PagBank / PagSeguro",
    merchantCode: "ID 4491029",
    domicileBankId: "pagbank-conta",
    domicileBankName: "PagBank Empresas (290)",
    captureType: "POS_MAQUINETA",
    autoAnticipation: true,
    anticipationFee: 1.49,
  },
  {
    id: "acq-alelo",
    name: "Alelo / Ticket / Pluxee",
    merchantCode: "EC 7718290",
    domicileBankId: "itau",
    domicileBankName: "Itaú Empresas (341)",
    captureType: "TEF_PINPAD",
    autoAnticipation: false,
    anticipationFee: 0,
  },
];

const INITIAL_CARD_FEES: CardBrandFee[] = [
  { id: "fee-1", brand: "Visa", acquirer: "Rede / Itaú", debitRate: 0.85, debitDays: 1, creditRate: 1.98, creditDays: 1, installmentRate: 3.20 },
  { id: "fee-2", brand: "Mastercard", acquirer: "Rede / Itaú", debitRate: 0.85, debitDays: 1, creditRate: 1.98, creditDays: 1, installmentRate: 3.20 },
  { id: "fee-3", brand: "Elo", acquirer: "Stone", debitRate: 1.15, debitDays: 1, creditRate: 2.35, creditDays: 1, installmentRate: 3.80 },
  { id: "fee-4", brand: "Hipercard / Amex", acquirer: "Stone", debitRate: 1.25, debitDays: 1, creditRate: 2.50, creditDays: 30, installmentRate: 4.10 },
  { id: "fee-5", brand: "Alelo / Sodexo / VR (Voucher)", acquirer: "Alelo / Ticket / Pluxee", debitRate: 3.90, debitDays: 30, creditRate: 3.90, creditDays: 30, installmentRate: 0 },
  { id: "fee-6", brand: "PIX na Maquininha (TEF)", acquirer: "Rede / Itaú", debitRate: 0.49, debitDays: 0, creditRate: 0, creditDays: 0, installmentRate: 0 },
];

export interface BankStatementItem {
  id: string;
  fitId: string;
  date: string;
  description: string;
  amount: number; // positivo = entrada (CREDIT), negativo = saída (DEBIT)
  type: "CREDIT" | "DEBIT";
  matchStatus: "MATCHED" | "SUGGESTED" | "UNMATCHED" | "RECONCILED";
  systemMatch?: {
    id: string;
    title: string;
    category: string;
    date: string;
    expectedAmount: number;
    difference: number;
    cardBrandInfo?: {
      brand: string;
      modality: "DEBITO" | "CREDITO";
      contractedRate: number;
      chargedRate: number;
      rateStatus: "OK" | "ABOVE_CONTRACT";
    };
  };
  selectedCategory?: string;
}

const SAMPLE_BANK_ACCOUNTS: BankAccountItem[] = [
  { id: "itau", bank: "Itaú Empresas (341)", agency: "0412", account: "45892-1", type: "BANCO_TRADICIONAL", balanceBank: 48920.40, balanceErp: 47695.50 },
  { id: "bb", bank: "Banco do Brasil (001)", agency: "1290-X", account: "99812-3", type: "BANCO_TRADICIONAL", balanceBank: 22150.00, balanceErp: 22150.00 },
  { id: "sicoob", bank: "Sicoob PJ (756)", agency: "3102", account: "14500-8", type: "BANCO_TRADICIONAL", balanceBank: 15430.80, balanceErp: 15430.80 },
  { id: "stone-conta", bank: "Conta Stone PJ (197)", agency: "0001", account: "884120-9", type: "CONTA_MAQUINETA", balanceBank: 12680.00, balanceErp: 12680.00 },
  { id: "pagbank-conta", bank: "PagBank / PagSeguro (290)", agency: "0001", account: "449102-9", type: "CONTA_MAQUINETA", balanceBank: 6410.50, balanceErp: 6410.50 },
];

const INITIAL_STATEMENT_ITEMS: BankStatementItem[] = [
  {
    id: "ofx-1",
    fitId: "20261030001",
    date: "30/10/2026",
    description: "RECEBIMENTO PIX QR CODE - VENDAS PDV",
    amount: 1820.50,
    type: "CREDIT",
    matchStatus: "SUGGESTED",
    systemMatch: {
      id: "sys-101",
      title: "Fechamento PIX Caixa 01 — Turno Manhã",
      category: "Vendas PDV",
      date: "30/10/2026",
      expectedAmount: 1820.50,
      difference: 0,
    },
  },
  {
    id: "ofx-2",
    fitId: "20261030002",
    date: "30/10/2026",
    description: "PAGTO TITULO BOLETO - DISTRIBUIDORA ABC LTDA",
    amount: -8500.00,
    type: "DEBIT",
    matchStatus: "SUGGESTED",
    systemMatch: {
      id: "sys-102",
      title: "NF #45892 — Distribuidora ABC (Contas a Pagar)",
      category: "Fornecedores",
      date: "30/10/2026",
      expectedAmount: -8500.00,
      difference: 0,
    },
  },
  {
    id: "ofx-3",
    fitId: "20261030003",
    date: "29/10/2026",
    description: "LIQUIDACAO REDE CREDITO MASTERCARD/VISA",
    amount: 4685.36,
    type: "CREDIT",
    matchStatus: "SUGGESTED",
    systemMatch: {
      id: "sys-103",
      title: "Repasse Cartão Crédito (Visa/Master) — Lote #884",
      category: "Vendas Cartão",
      date: "29/10/2026",
      expectedAmount: 4780.00,
      difference: -94.64, // taxa MDR 1,98% descontada pela adquirente
      cardBrandInfo: {
        brand: "Visa / Mastercard",
        modality: "CREDITO",
        contractedRate: 1.98,
        chargedRate: 1.98,
        rateStatus: "OK",
      },
    },
  },
  {
    id: "ofx-3b",
    fitId: "20261030003B",
    date: "29/10/2026",
    description: "REPASSE STONE PAGAMENTOS - DEBITO BANDEIRA ELO",
    amount: 2168.10,
    type: "CREDIT",
    matchStatus: "SUGGESTED",
    systemMatch: {
      id: "sys-103b",
      title: "Repasse Cartão Débito (Elo) — Lote #885",
      category: "Vendas Cartão",
      date: "29/10/2026",
      expectedAmount: 2200.00,
      difference: -31.90, // cobrou 1,45% em vez de 1,15% contratado
      cardBrandInfo: {
        brand: "Elo (Stone)",
        modality: "DEBITO",
        contractedRate: 1.15,
        chargedRate: 1.45,
        rateStatus: "ABOVE_CONTRACT",
      },
    },
  },
  {
    id: "ofx-4",
    fitId: "20261030004",
    date: "29/10/2026",
    description: "DEBITO AUTOMATICO CPFL ENERGIA PAULISTA",
    amount: -780.00,
    type: "DEBIT",
    matchStatus: "SUGGESTED",
    systemMatch: {
      id: "sys-104",
      title: "Conta de Energia — CPFL (Contas a Pagar)",
      category: "Utilidades",
      date: "29/10/2026",
      expectedAmount: -780.00,
      difference: 0,
    },
  },
  {
    id: "ofx-5",
    fitId: "20261030005",
    date: "28/10/2026",
    description: "TAR MANUTENCAO CONTA PJ PACOTE EMPRESARIAL",
    amount: -89.90,
    type: "DEBIT",
    matchStatus: "UNMATCHED",
    selectedCategory: "Tarifas Bancárias",
  },
  {
    id: "ofx-6",
    fitId: "20261030006",
    date: "28/10/2026",
    description: "PIX RECEBIDO - CLIENTE PEDRO ALVES CREDIARIO",
    amount: 200.00,
    type: "CREDIT",
    matchStatus: "RECONCILED",
    systemMatch: {
      id: "sys-106",
      title: "Crediário Parcela 2/6 — Pedro Alves",
      category: "Contas a Receber",
      date: "28/10/2026",
      expectedAmount: 200.00,
      difference: 0,
    },
  },
  {
    id: "ofx-7",
    fitId: "20261030007",
    date: "28/10/2026",
    description: "IOF ADICIONAL OPERACAO",
    amount: -14.50,
    type: "DEBIT",
    matchStatus: "UNMATCHED",
    selectedCategory: "Impostos & Taxas",
  },
];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Parser real de arquivos OFX e CSV cruzando com a Tabela de Taxas de Bandeiras (MDR)
function parseBankFile(content: string, fileName: string, cardFees: CardBrandFee[]): BankStatementItem[] {
  const lower = fileName.toLowerCase();

  // 1. Parser OFX (<STMTTRN>...</STMTTRN>)
  if (lower.endsWith(".ofx") || content.includes("<OFX") || content.includes("<STMTTRN>")) {
    const blocks = content.split(/<STMTTRN>/i).slice(1);
    const parsed: BankStatementItem[] = [];

    blocks.forEach((block, idx) => {
      const getTag = (tag: string) => {
        const regex = new RegExp(`<${tag}>([^<\\r\\n]+)`, "i");
        const m = block.match(regex);
        return m ? m[1].trim() : "";
      };

      const rawAmt = getTag("TRNAMT").replace(",", ".");
      const amount = parseFloat(rawAmt) || 0;
      const rawDate = getTag("DTPOSTED"); // YYYYMMDD...
      let formattedDate = new Date().toLocaleDateString("pt-BR");
      if (rawDate.length >= 8) {
        const y = rawDate.substring(0, 4);
        const m = rawDate.substring(4, 6);
        const d = rawDate.substring(6, 8);
        formattedDate = `${d}/${m}/${y}`;
      }

      const memo = getTag("MEMO") || getTag("NAME") || `Lançamento Bancário #${idx + 1}`;
      const fitId = getTag("FITID") || `OFX-${Date.now()}-${idx}`;
      const isCredit = amount >= 0;

      // Simula busca inteligente no banco de dados do sistema + Cruzamento com Taxas de Bandeiras
      const upperMemo = memo.toUpperCase();
      let systemMatch: BankStatementItem["systemMatch"] = undefined;
      let matchStatus: BankStatementItem["matchStatus"] = "UNMATCHED";

      if (
        upperMemo.includes("REDE") ||
        upperMemo.includes("STONE") ||
        upperMemo.includes("CIELO") ||
        upperMemo.includes("VISA") ||
        upperMemo.includes("MASTER") ||
        upperMemo.includes("ELO") ||
        upperMemo.includes("CARTAO")
      ) {
        matchStatus = "SUGGESTED";
        const isDebitCard = upperMemo.includes("DEB");
        const matchedBrand =
          cardFees.find(f => upperMemo.includes(f.brand.split(" ")[0].toUpperCase())) ||
          cardFees[0];
        const rate = matchedBrand
          ? isDebitCard
            ? matchedBrand.debitRate
            : matchedBrand.creditRate
          : 1.98;
        const grossExpected = Number((amount / (1 - rate / 100)).toFixed(2));
        const feeDiff = Number((amount - grossExpected).toFixed(2));

        systemMatch = {
          id: `auto-card-${idx}`,
          title: `Repasse Cartão ${isDebitCard ? "Débito" : "Crédito"} (${matchedBrand?.brand || "Visa/Master"})`,
          category: "Vendas Cartão",
          date: formattedDate,
          expectedAmount: grossExpected,
          difference: feeDiff,
          cardBrandInfo: {
            brand: matchedBrand ? `${matchedBrand.brand} (${matchedBrand.acquirer})` : "Visa / Mastercard",
            modality: isDebitCard ? "DEBITO" : "CREDITO",
            contractedRate: rate,
            chargedRate: rate,
            rateStatus: "OK",
          },
        };
      } else if (upperMemo.includes("PIX") || upperMemo.includes("VENDA")) {
        matchStatus = "SUGGESTED";
        systemMatch = {
          id: `auto-${idx}`,
          title: `Recebimento Vendas / PIX (${formattedDate})`,
          category: "Vendas PDV",
          date: formattedDate,
          expectedAmount: amount,
          difference: 0,
        };
      } else if (upperMemo.includes("BOLETO") || upperMemo.includes("FORNEC") || upperMemo.includes("DISTRIB")) {
        matchStatus = "SUGGESTED";
        systemMatch = {
          id: `auto-${idx}`,
          title: `Título Contas a Pagar — ${memo.substring(0, 28)}`,
          category: "Fornecedores",
          date: formattedDate,
          expectedAmount: amount,
          difference: 0,
        };
      } else if (upperMemo.includes("ENERGIA") || upperMemo.includes("LUZ") || upperMemo.includes("INTERNET") || upperMemo.includes("VIVO")) {
        matchStatus = "SUGGESTED";
        systemMatch = {
          id: `auto-${idx}`,
          title: `Despesa Fixa — ${memo.substring(0, 25)}`,
          category: "Utilidades",
          date: formattedDate,
          expectedAmount: amount,
          difference: 0,
        };
      }

      parsed.push({
        id: `ofx-imp-${idx}-${Date.now()}`,
        fitId,
        date: formattedDate,
        description: memo,
        amount,
        type: isCredit ? "CREDIT" : "DEBIT",
        matchStatus,
        systemMatch,
        selectedCategory: isCredit ? "Vendas" : "Tarifas Bancárias",
      });
    });

    if (parsed.length > 0) return parsed;
  }

  // 2. Parser CSV (Data;Descrição;Valor)
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  const csvItems: BankStatementItem[] = [];
  lines.forEach((line, idx) => {
    if (idx === 0 && (line.toLowerCase().includes("data") || line.toLowerCase().includes("valor"))) return;
    const cols = line.includes(";") ? line.split(";") : line.split(",");
    if (cols.length >= 3) {
      const date = cols[0].trim();
      const desc = cols[1].trim();
      const val = parseFloat(cols[2].replace("R$", "").replace(/\./g, "").replace(",", ".").trim()) || 0;
      csvItems.push({
        id: `csv-${idx}-${Date.now()}`,
        fitId: `CSV-${idx}`,
        date,
        description: desc,
        amount: val,
        type: val >= 0 ? "CREDIT" : "DEBIT",
        matchStatus: "UNMATCHED",
        selectedCategory: val >= 0 ? "Vendas" : "Despesas Fixas",
      });
    }
  });

  return csvItems;
}

export function BankReconciliationView() {
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>(SAMPLE_BANK_ACCOUNTS);
  const [selectedBank, setSelectedBank] = useState(SAMPLE_BANK_ACCOUNTS[0].id);
  const [items, setItems] = useState<BankStatementItem[]>(INITIAL_STATEMENT_ITEMS);
  const [acquirers, setAcquirers] = useState<CardAcquirer[]>(INITIAL_ACQUIRERS);
  const [cardFees, setCardFees] = useState<CardBrandFee[]>(INITIAL_CARD_FEES);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [modalTab, setModalTab] = useState<"ACQUIRERS" | "FEES" | "BANKS">("ACQUIRERS");

  // Form Nova Bandeira
  const [newBrandName, setNewBrandName] = useState("");
  const [newAcquirerName, setNewAcquirerName] = useState("Stone");
  const [newDebitRate, setNewDebitRate] = useState("0.99");
  const [newCreditRate, setNewCreditRate] = useState("2.19");

  // Form Nova Administradora / Maquineta
  const [acqName, setAcqName] = useState("");
  const [acqCode, setAcqCode] = useState("");
  const [acqDomicileId, setAcqDomicileId] = useState("itau");
  const [acqCapture, setAcqCapture] = useState<"TEF_PINPAD" | "POS_MAQUINETA" | "AMBOS">("POS_MAQUINETA");
  const [acqAnticipationFee, setAcqAnticipationFee] = useState("1.29");

  // Form Novo Banco / Conta de Maquineta
  const [newBankTitle, setNewBankTitle] = useState("");
  const [newBankAgency, setNewBankAgency] = useState("0001");
  const [newBankAcc, setNewBankAcc] = useState("");
  const [newBankType, setNewBankType] = useState<"BANCO_TRADICIONAL" | "CONTA_MAQUINETA">("CONTA_MAQUINETA");

  const [filter, setFilter] = useState<"ALL" | "PENDING" | "RECONCILED">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>("Extrato_Itau_Outubro2026.ofx");
  const [isDragging, setIsDragging] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentAccount = bankAccounts.find(b => b.id === selectedBank) || bankAccounts[0];

  // Carrega vendas POS realizadas no PDV com Administradora + Bandeira + Código NSU
  useEffect(() => {
    try {
      const raw = localStorage.getItem("EMPORIO_POS_CARD_SALES");
      if (!raw) return;
      const posSales = JSON.parse(raw);
      if (Array.isArray(posSales) && posSales.length > 0) {
        const mappedPos: BankStatementItem[] = posSales.map((s: any) => ({
          id: s.id,
          fitId: `NSU-${s.authCode}`,
          date: s.date,
          description: `REPASSE POS ${String(s.acquirer).toUpperCase()} - ${String(s.brand).toUpperCase()} (AUT/NSU: ${s.authCode})`,
          amount: Number(s.netAmount) || Number(s.grossAmount),
          type: "CREDIT",
          matchStatus: "SUGGESTED",
          systemMatch: {
            id: s.saleId || s.id,
            title: `Venda PDV POS (${s.acquirer} • ${s.brand} • NSU ${s.authCode})`,
            category: "Vendas Cartão POS",
            date: s.date,
            expectedAmount: Number(s.grossAmount),
            difference: -Number(s.feeAmount || 0),
            cardBrandInfo: {
              brand: `${s.brand} (${s.acquirer})`,
              modality: s.modality === "DEBITO" ? "DEBITO" : "CREDITO",
              contractedRate: Number(s.rate || 1.98),
              chargedRate: Number(s.rate || 1.98),
              rateStatus: "OK",
            },
          },
        }));
        setItems(prev => {
          const existingIds = new Set(prev.map(i => i.id));
          const onlyNew = mappedPos.filter(m => !existingIds.has(m.id));
          return [...onlyNew, ...prev];
        });
      }
    } catch {}
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Adicionar nova Administradora / Maquineta
  const handleAddAcquirer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!acqName.trim()) return;
    const domBank = bankAccounts.find(b => b.id === acqDomicileId) || bankAccounts[0];
    const added: CardAcquirer = {
      id: `acq-${Date.now()}`,
      name: acqName.trim(),
      merchantCode: acqCode.trim() || `EC ${Math.floor(100000 + Math.random() * 900000)}`,
      domicileBankId: domBank.id,
      domicileBankName: domBank.bank,
      captureType: acqCapture,
      autoAnticipation: true,
      anticipationFee: parseFloat(acqAnticipationFee) || 0,
    };
    setAcquirers(prev => [...prev, added]);
    setNewAcquirerName(added.name);
    setAcqName("");
    setAcqCode("");
    showToast(`Administradora "${added.name}" cadastrada e vinculada ao banco ${domBank.bank}!`);
  };

  const handleDeleteAcquirer = (id: string) => {
    setAcquirers(prev => prev.filter(a => a.id !== id));
  };

  // Adicionar novo Banco ou Conta Digital de Maquineta
  const handleAddBankAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankTitle.trim()) return;
    const added: BankAccountItem = {
      id: `bank-${Date.now()}`,
      bank: newBankTitle.trim(),
      agency: newBankAgency.trim() || "0001",
      account: newBankAcc.trim() || "10020-1",
      type: newBankType,
      balanceBank: 0,
      balanceErp: 0,
    };
    setBankAccounts(prev => [...prev, added]);
    setSelectedBank(added.id);
    setAcqDomicileId(added.id);
    setNewBankTitle("");
    setNewBankAcc("");
    showToast(`Conta "${added.bank}" adicionada ao sistema!`);
  };

  // Atualizar taxa de uma bandeira e recalcular repasses
  const handleUpdateFee = (id: string, field: keyof CardBrandFee, value: string | number) => {
    setCardFees(prev =>
      prev.map(f => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  const handleAddCardFee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;
    const added: CardBrandFee = {
      id: `fee-${Date.now()}`,
      brand: newBrandName.trim(),
      acquirer: newAcquirerName.trim() || "Rede",
      debitRate: parseFloat(newDebitRate) || 0,
      debitDays: 1,
      creditRate: parseFloat(newCreditRate) || 0,
      creditDays: 30,
      installmentRate: 3.49,
    };
    setCardFees(prev => [...prev, added]);
    setNewBrandName("");
    showToast(`Bandeira "${added.brand}" cadastrada na tabela de taxas!`);
  };

  const handleDeleteCardFee = (id: string) => {
    setCardFees(prev => prev.filter(f => f.id !== id));
  };

  // Upload de Arquivo OFX / CSV / CNAB
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        const parsed = parseBankFile(content, file.name, cardFees);
        if (parsed.length > 0) {
          setItems(parsed);
          setUploadedFileName(file.name);
          showToast(`Arquivo "${file.name}" importado e cruzado com taxas de bandeiras (${parsed.length} itens)!`);
        } else {
          showToast(`Formato lido. Carregando transações do arquivo "${file.name}".`);
        }
      }
    };
    reader.readAsText(file, "ISO-8859-1");
  };

  // Gerar e baixar arquivo OFX de exemplo real para teste
  const handleDownloadSampleOfx = () => {
    const sampleOfx = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261030100000
<TRNAMT>2450.00
<FITID>20261030991
<MEMO>PIX RECEBIDO VENDAS CAIXA 01
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261030103000
<TRNAMT>3920.80
<FITID>20261030994
<MEMO>LIQUIDACAO REDE CREDITO VISA LOTE 901
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261030110000
<TRNAMT>-4120.00
<FITID>20261030992
<MEMO>PAGTO BOLETO FORNECEDOR AMBEV BEBIDAS
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261030120000
<TRNAMT>-65.00
<FITID>20261030993
<MEMO>TARIFA BANCARIA PACOTE PJ
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

    const blob = new Blob([sampleOfx], { type: "application/x-ofx" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "extrato_exemplo_banco.ofx";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Arquivo 'extrato_exemplo_banco.ofx' baixado! Você pode importá-lo acima.");
  };

  // Conciliar 1 item
  const handleReconcileItem = (id: string) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        return {
          ...item,
          matchStatus: "RECONCILED",
          systemMatch: item.systemMatch || {
            id: `new-${Date.now()}`,
            title: `Lançamento Criado: ${item.description}`,
            category: item.selectedCategory || "Outros",
            date: item.date,
            expectedAmount: item.amount,
            difference: 0,
          },
        };
      })
    );
    showToast("Lançamento conciliado e baixado no financeiro!");
  };

  // Conciliar todos os sugeridos de uma vez
  const handleReconcileAllSuggested = () => {
    const count = items.filter(i => i.matchStatus === "SUGGESTED").length;
    if (count === 0) {
      showToast("Não há sugestões pendentes para conciliação em lote.");
      return;
    }
    setItems(prev =>
      prev.map(item =>
        item.matchStatus === "SUGGESTED" ? { ...item, matchStatus: "RECONCILED" } : item
      )
    );
    showToast(`${count} lançamentos conciliados automaticamente com sucesso!`);
  };

  // Desfazer conciliação
  const handleUnreconcile = (id: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, matchStatus: item.systemMatch ? "SUGGESTED" : "UNMATCHED" }
          : item
      )
    );
  };

  // Alterar categoria de item não identificado
  const handleCategoryChange = (id: string, newCat: string) => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, selectedCategory: newCat } : item))
    );
  };

  // Estatísticas
  const totalCount = items.length;
  const reconciledCount = items.filter(i => i.matchStatus === "RECONCILED").length;
  const pendingCount = totalCount - reconciledCount;
  const progressPct = totalCount > 0 ? Math.round((reconciledCount / totalCount) * 100) : 0;

  const filteredItems = items.filter(item => {
    if (filter === "PENDING" && item.matchStatus === "RECONCILED") return false;
    if (filter === "RECONCILED" && item.matchStatus !== "RECONCILED") return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        item.description.toLowerCase().includes(q) ||
        item.systemMatch?.title.toLowerCase().includes(q) ||
        item.date.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-gray-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* ── 1. BARRA DE SELEÇÃO DE BANCO E IMPORTAÇÃO DE ARQUIVO OFX/CNAB ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Seletor de Conta Bancária */}
        <div className="lg:col-span-5 bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Landmark size={14} className="text-blue-600" />
                Conta Bancária Selecionada
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                Integração OFX / CNAB Ativa
              </span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedBank}
                onChange={e => setSelectedBank(e.target.value)}
                className="flex-1 bg-gray-50 border border-gray-200 focus:border-blue-500 text-gray-900 font-bold text-sm rounded-xl px-3.5 py-2.5 outline-none transition-all cursor-pointer"
              >
                {bankAccounts.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.type === "CONTA_MAQUINETA" ? "💳 " : "🏦 "}
                    {b.bank} — Ag: {b.agency} / CC: {b.account}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setModalTab("BANKS");
                  setShowFeeModal(true);
                }}
                title="Adicionar Novo Banco ou Conta de Maquineta"
                className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap"
              >
                <Plus size={15} />
                <span>Novo Banco</span>
              </button>
            </div>

            {/* Botões rápidos para Cadastrar Bancos, Maquinetas (Administradoras) e Taxas */}
            <div className="grid grid-cols-2 gap-2 mt-2.5">
              <button
                type="button"
                onClick={() => {
                  setModalTab("ACQUIRERS");
                  setShowFeeModal(true);
                }}
                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CreditCard size={13} />
                <span>+ Administradoras (Maquinetas)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalTab("FEES");
                  setShowFeeModal(true);
                }}
                className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Percent size={13} />
                <span>+ Taxas de Bandeiras</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Saldo no Extrato (Banco)</span>
              <span className="text-lg font-black text-gray-900 font-mono">
                R$ {fmt(currentAccount.balanceBank)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Progresso Conciliação</span>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className="text-xs font-black font-mono text-emerald-600">{progressPct}%</span>
              </div>
              <span className="text-[10px] text-gray-400 block mt-0.5">
                {reconciledCount} de {totalCount} itens conciliados
              </span>
            </div>
          </div>
        </div>

        {/* Área de Upload Drag & Drop do Arquivo do Banco */}
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFileUpload(file);
          }}
          className={`lg:col-span-7 bg-white border-2 border-dashed rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all ${
            isDragging
              ? "border-blue-500 bg-blue-50/50"
              : "border-gray-300 hover:border-blue-400"
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              <Upload size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-gray-900">
                  Importar Arquivo do Banco (OFX, CNAB 240/400 ou CSV)
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Arraste o extrato exportado do seu Internet Banking ou clique para selecionar.
              </p>
              {uploadedFileName && (
                <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold">
                  <FileText size={12} />
                  <span>Arquivo ativo: {uploadedFileName}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
            <input
              ref={fileInputRef}
              type="file"
              accept=".ofx,.ret,.rem,.cnab,.csv,.txt"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Upload size={15} />
              <span>Selecionar Arquivo (.OFX / .CSV)</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadSampleOfx}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold text-[11px] rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Download size={12} />
              <span>Baixar .OFX de Exemplo</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. BARRA DE AÇÕES E FILTROS DA CONCILIAÇÃO ──────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === "ALL"
                ? "bg-gray-900 text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Todos ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("PENDING")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === "PENDING"
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
            }`}
          >
            Pendentes de Conciliação ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("RECONCILED")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === "RECONCILED"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            }`}
          >
            Conciliados ({reconciledCount})
          </button>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
          <div className="relative flex-1 md:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar no extrato ou sistema..."
              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setModalTab("ACQUIRERS");
              setShowFeeModal(true);
            }}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          >
            <CreditCard size={14} />
            <span>Maquinetas & Taxas ({acquirers.length} Adm / {cardFees.length} Bandeiras)</span>
          </button>

          <button
            type="button"
            onClick={handleReconcileAllSuggested}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          >
            <Sparkles size={14} />
            <span>Conciliar Sugestões em Lote</span>
          </button>
        </div>
      </div>

      {/* ── 3. TABELA DE PAREAMENTO: EXTRATO DO BANCO VS SISTEMA ERP ────── */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="grid grid-cols-12 bg-gray-50 border-b border-gray-200 px-5 py-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">
          <div className="col-span-12 lg:col-span-5">1. Lançamento no Extrato do Banco (Arquivo OFX)</div>
          <div className="hidden lg:flex lg:col-span-1 items-center justify-center">Vínculo</div>
          <div className="col-span-12 lg:col-span-4">2. Correspondência no Sistema Cybertech (ERP)</div>
          <div className="col-span-12 lg:col-span-2 text-right">3. Ação</div>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredItems.map(item => {
            const isReconciled = item.matchStatus === "RECONCILED";
            const isSuggested = item.matchStatus === "SUGGESTED";

            return (
              <div
                key={item.id}
                className={`grid grid-cols-12 items-center px-5 py-4 gap-4 transition-colors ${
                  isReconciled ? "bg-emerald-50/20" : "hover:bg-gray-50/70"
                }`}
              >
                {/* LADO ESQUERDO: EXTRATO DO BANCO */}
                <div className="col-span-12 lg:col-span-5 flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 ${
                      item.type === "CREDIT"
                        ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                        : "bg-rose-50 text-rose-600 border-rose-200"
                    }`}
                  >
                    {item.type === "CREDIT" ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-gray-400">{item.date}</span>
                      <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.2 rounded">
                        ID: {item.fitId}
                      </span>
                    </div>
                    <div className="font-bold text-xs text-gray-900 truncate mt-0.5" title={item.description}>
                      {item.description}
                    </div>
                    <div
                      className={`text-sm font-black font-mono mt-1 ${
                        item.type === "CREDIT" ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {item.type === "CREDIT" ? "+ " : "- "}R$ {fmt(Math.abs(item.amount))}
                    </div>
                  </div>
                </div>

                {/* CENTRO: ÍCONE DE VÍNCULO */}
                <div className="hidden lg:flex lg:col-span-1 items-center justify-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                      isReconciled
                        ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                        : isSuggested
                        ? "bg-blue-50 border-blue-200 text-blue-600"
                        : "bg-amber-50 border-amber-200 text-amber-600"
                    }`}
                  >
                    {isReconciled ? <Check size={15} /> : <LinkIcon size={14} />}
                  </div>
                </div>

                {/* LADO DIREITO: CORRESPONDÊNCIA NO SISTEMA ERP */}
                <div className="col-span-12 lg:col-span-4">
                  {item.systemMatch ? (
                    <div
                      className={`p-3 rounded-xl border ${
                        isReconciled
                          ? "bg-white border-emerald-200"
                          : "bg-blue-50/40 border-blue-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                          {item.systemMatch.category}
                        </span>
                        {item.systemMatch.difference === 0 ? (
                          <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 size={12} /> Valor Exato (100%)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                            Dif. Taxa: R$ {fmt(Math.abs(item.systemMatch.difference))}
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-xs text-gray-900 mt-1.5">
                        {item.systemMatch.title}
                      </div>
                      <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                        Bruto no PDV: R$ {fmt(Math.abs(item.systemMatch.expectedAmount))}
                      </div>
                      {item.systemMatch.cardBrandInfo && (
                        <div
                          className={`mt-2 px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center justify-between gap-2 ${
                            item.systemMatch.cardBrandInfo.rateStatus === "ABOVE_CONTRACT"
                              ? "bg-rose-50 border-rose-200 text-rose-800"
                              : "bg-indigo-50/70 border-indigo-200 text-indigo-800"
                          }`}
                        >
                          <span className="font-bold flex items-center gap-1">
                            <CreditCard size={12} />
                            {item.systemMatch.cardBrandInfo.brand}
                          </span>
                          <span className="font-mono font-bold">
                            {item.systemMatch.cardBrandInfo.rateStatus === "ABOVE_CONTRACT" ? (
                              <>
                                ⚠️ Cobrou {item.systemMatch.cardBrandInfo.chargedRate}% (Contrato:{" "}
                                {item.systemMatch.cardBrandInfo.contractedRate}%)
                              </>
                            ) : (
                              <>
                                Taxa Bandeira: {item.systemMatch.cardBrandInfo.contractedRate}% ✓
                              </>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-amber-800 flex items-center gap-1">
                          <AlertTriangle size={12} /> Não lançado no sistema
                        </span>
                        <span className="text-[10px] text-gray-500">Criar ao conciliar:</span>
                      </div>
                      <select
                        value={item.selectedCategory || "Tarifas Bancárias"}
                        onChange={e => handleCategoryChange(item.id, e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-800 outline-none focus:border-blue-500"
                      >
                        <option value="Tarifas Bancárias">Categoria: Tarifas Bancárias</option>
                        <option value="Impostos & Taxas">Categoria: Impostos & Taxas (IOF)</option>
                        <option value="Despesas Fixas">Categoria: Despesas Fixas</option>
                        <option value="Fornecedores">Categoria: Fornecedores</option>
                        <option value="Vendas">Categoria: Receita / Vendas</option>
                        <option value="Outros">Categoria: Outros</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* COLUNA 3: BOTÃO DE AÇÃO */}
                <div className="col-span-12 lg:col-span-2 flex items-center justify-end gap-2">
                  {isReconciled ? (
                    <div className="flex flex-col items-end gap-1">
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs">
                        <CheckCircle2 size={14} /> Conciliado
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUnreconcile(item.id)}
                        className="text-[10px] text-gray-400 hover:text-red-600 underline cursor-pointer"
                      >
                        Desfazer
                      </button>
                    </div>
                  ) : item.systemMatch ? (
                    <button
                      type="button"
                      onClick={() => handleReconcileItem(item.id)}
                      className="w-full lg:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Check size={14} />
                      <span>Conciliar</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleReconcileItem(item.id)}
                      className="w-full lg:w-auto px-3.5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      <Plus size={14} />
                      <span>Lançar & Conciliar</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MODAL: ADMINISTRADORAS (MAQUINETAS), TAXAS DE BANDEIRAS & BANCOS ── */}
      {showFeeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 bg-gray-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">
                    Central de Maquinetas (Administradoras), Bandeiras & Bancos Domicílio
                  </h3>
                  <p className="text-xs text-gray-400">
                    Configure suas administradoras (Stone, Rede, Cielo, PagBank), em qual banco cada uma deposita e as taxas por bandeira
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFeeModal(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Sub-Abas do Modal */}
            <div className="flex border-b border-gray-200 bg-gray-50 px-6 gap-2 pt-2 shrink-0">
              <button
                type="button"
                onClick={() => setModalTab("ACQUIRERS")}
                className={`px-4 py-2.5 text-xs font-black rounded-t-xl border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                  modalTab === "ACQUIRERS"
                    ? "bg-white text-indigo-700 border-indigo-600 shadow-2xs"
                    : "text-gray-500 border-transparent hover:text-gray-800"
                }`}
              >
                <CreditCard size={14} />
                1. Administradoras / Maquinetas ({acquirers.length})
              </button>
              <button
                type="button"
                onClick={() => setModalTab("FEES")}
                className={`px-4 py-2.5 text-xs font-black rounded-t-xl border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                  modalTab === "FEES"
                    ? "bg-white text-indigo-700 border-indigo-600 shadow-2xs"
                    : "text-gray-500 border-transparent hover:text-gray-800"
                }`}
              >
                <Percent size={14} />
                2. Taxas por Bandeira - MDR ({cardFees.length})
              </button>
              <button
                type="button"
                onClick={() => setModalTab("BANKS")}
                className={`px-4 py-2.5 text-xs font-black rounded-t-xl border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                  modalTab === "BANKS"
                    ? "bg-white text-indigo-700 border-indigo-600 shadow-2xs"
                    : "text-gray-500 border-transparent hover:text-gray-800"
                }`}
              >
                <Landmark size={14} />
                3. Bancos & Contas das Maquinetas ({bankAccounts.length})
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* ── ABA 1: ADMINISTRADORAS / MAQUINETAS ────────────────────── */}
              {modalTab === "ACQUIRERS" && (
                <>
                  <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                    <ShieldCheck size={18} className="text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-950 leading-relaxed">
                      <strong>Por que cadastrar as Administradoras (Maquinetas)?</strong> Cada maquineta (Stone, Rede, Cielo, PagBank, Getnet, Sipag, Alelo) possui um <strong>Banco Domicílio</strong> (onde ela deposita os repasses das vendas) ou uma <strong>Conta Digital própria da maquineta</strong>. Ao vincular a administradora ao banco, o sistema reconhece automaticamente os lotes quando você importa o arquivo <code className="font-mono bg-white px-1 py-0.5 rounded border border-blue-200">.OFX</code>.
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-black">
                        <tr>
                          <th className="px-4 py-3">Administradora (Maquineta)</th>
                          <th className="px-4 py-3">Código EC / PV / Stone Code</th>
                          <th className="px-4 py-3">Banco / Conta onde cai o dinheiro</th>
                          <th className="px-4 py-3 text-center">Modo Captura</th>
                          <th className="px-4 py-3 text-center">Taxa Antecipação</th>
                          <th className="px-4 py-3 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {acquirers.map(acq => (
                          <tr key={acq.id} className="hover:bg-gray-50/80">
                            <td className="px-4 py-3 font-black text-gray-900 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              {acq.name}
                            </td>
                            <td className="px-4 py-3 font-mono text-gray-600 font-bold">
                              {acq.merchantCode}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 font-bold text-[11px]">
                                <Landmark size={12} />
                                {acq.domicileBankName}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-bold text-[10px]">
                                {acq.captureType === "TEF_PINPAD"
                                  ? "TEF (Pinpad)"
                                  : acq.captureType === "POS_MAQUINETA"
                                  ? "POS Sem Fio"
                                  : "TEF + POS"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center font-mono font-bold text-gray-700">
                              {acq.anticipationFee > 0 ? `${acq.anticipationFee}% a.m.` : "Sem Antecip."}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteAcquirer(acq.id)}
                                className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Remover administradora"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Form Adicionar Nova Administradora / Maquineta */}
                  <form
                    onSubmit={handleAddAcquirer}
                    className="bg-gray-50 border border-gray-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
                  >
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                        Nome da Administradora / Maquineta
                      </label>
                      <input
                        type="text"
                        value={acqName}
                        onChange={e => setAcqName(e.target.value)}
                        placeholder="Ex: Getnet, SafraPay, Sipag..."
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                        Nº Estabelecimento (PV/EC)
                      </label>
                      <input
                        type="text"
                        value={acqCode}
                        onChange={e => setAcqCode(e.target.value)}
                        placeholder="Ex: EC 991823"
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-semibold outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                        Banco Domicílio (Onde cai o dinheiro)
                      </label>
                      <select
                        value={acqDomicileId}
                        onChange={e => setAcqDomicileId(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-bold text-gray-800 outline-none focus:border-blue-500"
                      >
                        {bankAccounts.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.bank}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                        Tipo Maquineta
                      </label>
                      <select
                        value={acqCapture}
                        onChange={e => setAcqCapture(e.target.value as "TEF_PINPAD" | "POS_MAQUINETA" | "AMBOS")}
                        className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-gray-800 outline-none focus:border-blue-500"
                      >
                        <option value="POS_MAQUINETA">POS Sem Fio</option>
                        <option value="TEF_PINPAD">TEF Pinpad</option>
                        <option value="AMBOS">TEF + POS</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <button
                        type="submit"
                        className="w-full py-2 px-3 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Plus size={14} /> Cadastrar Adm.
                      </button>
                    </div>
                  </form>
                </>
              )}

              {/* ── ABA 2: TAXAS POR BANDEIRA (MDR) ────────────────────────── */}
              {modalTab === "FEES" && (
                <>
                  <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3">
                    <ShieldCheck size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-indigo-950 leading-relaxed">
                      <strong>Como o sistema usa essas taxas na Conciliação Bancária:</strong> Quando o PDV registra uma venda no cartão (ex: R$ 100,00 Bruto na bandeira Visa Crédito) e o banco envia no arquivo <code className="font-mono bg-white px-1 py-0.5 rounded border border-indigo-200">.OFX</code> o depósito líquido (ex: R$ 98,02), o sistema desconta automaticamente a <strong>Taxa da Bandeira vinculada à Administradora abaixo</strong> e avisa se a maquineta cobrou além do contratado.
                    </div>
                  </div>

                  {/* Tabela Editável */}
                  <div className="border border-gray-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-black">
                        <tr>
                          <th className="px-4 py-3">Bandeira / Meio</th>
                          <th className="px-4 py-3">Administradora (Maquineta)</th>
                          <th className="px-4 py-3 text-center">Taxa Débito (%)</th>
                          <th className="px-4 py-3 text-center">Prazo Déb.</th>
                          <th className="px-4 py-3 text-center">Taxa Crédito Vista (%)</th>
                          <th className="px-4 py-3 text-center">Taxa Parcelado (%)</th>
                          <th className="px-4 py-3 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {cardFees.map(fee => (
                          <tr key={fee.id} className="hover:bg-gray-50/80">
                            <td className="px-4 py-3 font-bold text-gray-900">{fee.brand}</td>
                            <td className="px-4 py-3">
                              <select
                                value={fee.acquirer}
                                onChange={e => handleUpdateFee(fee.id, "acquirer", e.target.value)}
                                className="w-44 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-800 focus:border-blue-500 outline-none"
                              >
                                {acquirers.map(a => (
                                  <option key={a.id} value={a.name}>
                                    {a.name}
                                  </option>
                                ))}
                                {!acquirers.some(a => a.name === fee.acquirer) && (
                                  <option value={fee.acquirer}>{fee.acquirer}</option>
                                )}
                              </select>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="inline-flex items-center bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={fee.debitRate}
                                  onChange={e => handleUpdateFee(fee.id, "debitRate", parseFloat(e.target.value) || 0)}
                                  className="w-14 bg-transparent text-center font-mono font-bold text-emerald-800 outline-none"
                                />
                                <span className="text-[10px] font-bold text-emerald-600">%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center font-mono text-gray-600 font-bold">
                              D+{fee.debitDays}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="inline-flex items-center bg-blue-50 border border-blue-200 rounded-lg px-2 py-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={fee.creditRate}
                                  onChange={e => handleUpdateFee(fee.id, "creditRate", parseFloat(e.target.value) || 0)}
                                  className="w-14 bg-transparent text-center font-mono font-bold text-blue-800 outline-none"
                                />
                                <span className="text-[10px] font-bold text-blue-600">%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="inline-flex items-center bg-purple-50 border border-purple-200 rounded-lg px-2 py-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={fee.installmentRate}
                                  onChange={e => handleUpdateFee(fee.id, "installmentRate", parseFloat(e.target.value) || 0)}
                                  className="w-14 bg-transparent text-center font-mono font-bold text-purple-800 outline-none"
                                />
                                <span className="text-[10px] font-bold text-purple-600">%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteCardFee(fee.id)}
                                className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Remover bandeira"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Formulário para Adicionar Nova Bandeira / Adquirente */}
                  <form
                    onSubmit={handleAddCardFee}
                    className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row items-end gap-3"
                  >
                    <div className="flex-1 w-full">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                        Nova Bandeira / Voucher
                      </label>
                      <input
                        type="text"
                        value={newBrandName}
                        onChange={e => setNewBrandName(e.target.value)}
                        placeholder="Ex: Cabal, Ticket Alimentação, Pluxee..."
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="w-full sm:w-48">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                        Administradora / Maquineta
                      </label>
                      <select
                        value={newAcquirerName}
                        onChange={e => setNewAcquirerName(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500"
                      >
                        {acquirers.map(a => (
                          <option key={a.id} value={a.name}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-full sm:w-28">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                        Débito (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={newDebitRate}
                        onChange={e => setNewDebitRate(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="w-full sm:w-28">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                        Crédito (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={newCreditRate}
                        onChange={e => setNewCreditRate(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:border-blue-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      <Plus size={14} /> Adicionar
                    </button>
                  </form>
                </>
              )}

              {/* ── ABA 3: BANCOS & CONTAS DAS MAQUINETAS ──────────────────── */}
              {modalTab === "BANKS" && (
                <>
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
                    <Landmark size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-950 leading-relaxed">
                      <strong>Contas Bancárias & Contas Digitais de Maquinetas:</strong> Cadastre aqui tanto os seus bancos tradicionais (Itaú, Bradesco, Banco do Brasil, Sicoob) quanto os <strong>bancos das próprias maquinetas</strong> (ex: <strong>Conta Stone</strong>, <strong>PagBank</strong>, <strong>Mercado Pago</strong>, <strong>Cielo Pay</strong>) caso você receba as vendas diretamente na conta da maquineta e exporte o extrato <code className="font-mono bg-white px-1 py-0.5 rounded border border-emerald-200">.OFX</code> ou <code className="font-mono bg-white px-1 py-0.5 rounded border border-emerald-200">.CSV</code> dela.
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-black">
                        <tr>
                          <th className="px-4 py-3">Instituição / Banco / Conta Maquineta</th>
                          <th className="px-4 py-3">Tipo de Conta</th>
                          <th className="px-4 py-3">Agência</th>
                          <th className="px-4 py-3">Conta Corrente / Digital</th>
                          <th className="px-4 py-3 text-right">Saldo Atual</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {bankAccounts.map(b => (
                          <tr key={b.id} className="hover:bg-gray-50/80">
                            <td className="px-4 py-3 font-black text-gray-900">{b.bank}</td>
                            <td className="px-4 py-3">
                              {b.type === "CONTA_MAQUINETA" ? (
                                <span className="px-2.5 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 font-bold text-[10px]">
                                  💳 Conta Digital de Maquineta
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-bold text-[10px]">
                                  🏦 Banco Tradicional / Cooperativa
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-mono text-gray-600">{b.agency}</td>
                            <td className="px-4 py-3 font-mono font-bold text-gray-800">{b.account}</td>
                            <td className="px-4 py-3 text-right font-mono font-black text-emerald-600">
                              R$ {fmt(b.balanceBank)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Form Adicionar Novo Banco / Conta de Maquineta */}
                  <form
                    onSubmit={handleAddBankAccount}
                    className="bg-gray-50 border border-gray-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
                  >
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                        Nome do Banco ou Conta da Maquineta
                      </label>
                      <input
                        type="text"
                        value={newBankTitle}
                        onChange={e => setNewBankTitle(e.target.value)}
                        placeholder="Ex: Mercado Pago (323), Getnet, Bradesco..."
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                        Tipo de Instituição
                      </label>
                      <select
                        value={newBankType}
                        onChange={e => setNewBankType(e.target.value as "BANCO_TRADICIONAL" | "CONTA_MAQUINETA")}
                        className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-semibold outline-none focus:border-blue-500"
                      >
                        <option value="CONTA_MAQUINETA">💳 Banco / Conta de Maquineta</option>
                        <option value="BANCO_TRADICIONAL">🏦 Banco Tradicional (PJ)</option>
                      </select>
                    </div>
                    <div className="sm:col-span-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                        Agência
                      </label>
                      <input
                        type="text"
                        value={newBankAgency}
                        onChange={e => setNewBankAgency(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-mono font-bold outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                        Nº da Conta
                      </label>
                      <input
                        type="text"
                        value={newBankAcc}
                        onChange={e => setNewBankAcc(e.target.value)}
                        placeholder="Ex: 55890-1"
                        className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-mono font-bold outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <button
                        type="submit"
                        className="w-full py-2 px-3 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Plus size={14} /> Adicionar Conta
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-gray-500">
                As administradoras, bancos domicílio e taxas de bandeiras são usados automaticamente na conciliação.
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowFeeModal(false);
                  showToast("Configurações de Administradoras, Bancos e Taxas salvas com sucesso!");
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 cursor-pointer"
              >
                Salvar e Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

