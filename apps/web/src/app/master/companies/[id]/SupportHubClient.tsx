"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  Clock,
  Building2,
  FileText,
  Upload,
  Users,
  Globe,
  Copy,
  Check,
  ExternalLink,
  Save,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  FileCode,
  Plus,
  KeyRound,
  Smartphone,
  BedDouble,
  Power,
  Trash2,
  Sparkles,
  Package,
  ClipboardCheck,
  Truck,
  UserCheck,
} from "lucide-react";
import {
  updateTenantFullConfig,
  updateTenantFiscalConfig,
  type CompanySupportBundle,
} from "@/actions/masterCompany";
import {
  supportCreateTenantUser,
  supportResetTenantUserPassword,
  supportToggleTenantUser,
  supportToggleTenantUserMobilePdv,
  supportImportProducts,
  supportImportStockBalance,
  supportImportCustomers,
  supportImportSuppliers,
  supportImportXmlBatch,
  type SupportImportProductInput,
  type SupportImportStockBalanceInput,
  type SupportImportCustomerInput,
  type SupportImportSupplierInput,
} from "@/actions/masterSupport";
import { SYSTEM_MODULES_CATALOG, SEGMENT_PRESETS } from "@/lib/modules-catalog";
import { AccessTenantButton } from "@/components/AccessTenantButton";
import { CompanyActions } from "./CompanyActions";

type TabId = "geral" | "fiscal" | "importacao" | "usuarios";
type ImportKind = "products" | "stock_balance" | "customers" | "suppliers" | "xml_batch";

const OPERATION_TYPE_OPTIONS = [
  { key: "RETAIL", label: "Varejo / Supermercado" },
  { key: "FOOD", label: "Alimentação / Restaurante" },
  { key: "DISTRIBUTOR", label: "Distribuidora" },
  { key: "WHOLESALE", label: "Atacado" },
  { key: "FACTORY", label: "Fábrica / Indústria" },
  { key: "PRODUCTION", label: "Produção Própria" },
];

const ROLE_OPTIONS = [
  { key: "ADMIN", label: "Administrador (ADMIN)" },
  { key: "MANAGER", label: "Gerente (MANAGER)" },
  { key: "SUPERVISOR", label: "Fiscal / Supervisor (SUPERVISOR)" },
  { key: "OPERATOR", label: "Operador de Caixa (OPERATOR)" },
  { key: "STOCKIST", label: "Estoquista (STOCKIST)" },
  { key: "VIEWER", label: "Consulta (VIEWER)" },
];

const CSV_TEMPLATES: Record<Exclude<ImportKind, "xml_batch">, { filename: string; content: string; hint: string }> = {
  products: {
    filename: "modelo_importacao_produtos.csv",
    hint: "Colunas: Nome; CodigoBarras; PrecoVenda; Custo; Estoque; Unidade; UnidadeCompra; UnidadeVenda; FatorConversao; Categoria; NCM",
    content: [
      "Nome;CodigoBarras;PrecoVenda;Custo;Estoque;Unidade;UnidadeCompra;UnidadeVenda;FatorConversao;Categoria;NCM",
      "COCA COLA LATA 350ML;7894900010015;5,50;3,40;48;UN;FD;UN;12;Bebidas;22021000",
      "ARROZ TIPO 1 5KG;7891234560012;28,90;21,50;30;UN;FD;UN;6;Mercearia;10063021",
    ].join("\n"),
  },
  stock_balance: {
    filename: "modelo_balanco_estoque.csv",
    hint: "Colunas: CodigoBarras; Nome; EstoqueContado; Custo; PrecoVenda; Validade (AAAA-MM-DD ou DD/MM/AAAA)",
    content: [
      "CodigoBarras;Nome;EstoqueContado;Custo;PrecoVenda;Validade",
      "7894900010015;COCA COLA LATA 350ML;60;3,40;5,50;2027-06-30",
      "7891234560012;ARROZ TIPO 1 5KG;24;21,50;28,90;",
    ].join("\n"),
  },
  customers: {
    filename: "modelo_importacao_clientes.csv",
    hint: "Colunas: Nome; CPF_CNPJ; Telefone; Email; Endereco; LimiteCredito",
    content: [
      "Nome;CPF_CNPJ;Telefone;Email;Endereco;LimiteCredito",
      "MARIA DA SILVA;12345678900;(82) 99999-1111;maria@email.com;Rua das Flores 120 - Centro;500,00",
      "MERCADINHO SAO JOSE LTDA;12345678000190;(82) 3322-4455;compras@saojose.com.br;Av Principal 450;5000,00",
    ].join("\n"),
  },
  suppliers: {
    filename: "modelo_importacao_fornecedores.csv",
    hint: "Colunas: Nome; CNPJ_CPF; Telefone; Email; Categoria; SaiposAntigo (SIM/NAO)",
    content: [
      "Nome;CNPJ_CPF;Telefone;Email;Categoria;SaiposAntigo",
      "DISTRIBUIDORA ALAGOANA LTDA;11222333000144;(82) 3311-9000;vendas@distalagoana.com.br;Bebidas;SIM",
      "LATICINIOS SERTAO;44555666000177;(82) 98888-7766;contato@sertao.com.br;Frios e Laticinios;NAO",
    ].join("\n"),
  },
};

function slugifyText(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function normalizeHeaderKey(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function parseLocaleNumber(raw: string | undefined, fallback = 0): number {
  if (!raw) return fallback;
  let s = raw.replace(/R\$/gi, "").replace(/\s+/g, "").trim();
  if (!s) return fallback;
  if (s.includes(",") && s.includes(".")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function detectDelimiter(firstLine: string): string {
  const tabs = (firstLine.match(/\t/g) || []).length;
  const semis = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  if (tabs >= semis && tabs >= commas && tabs > 0) return "\t";
  if (semis >= commas && semis > 0) return ";";
  if (commas > 0) return ",";
  return ";";
}

function parseBooleanFlag(raw: string | undefined): boolean {
  if (!raw) return false;
  const norm = normalizeHeaderKey(raw);
  return norm === "sim" || norm === "s" || norm === "true" || norm === "1" || norm === "yes" || norm === "saipos";
}

type SpreadsheetRow = Record<string, string | number | boolean | undefined>;

interface ParsedSpreadsheetResult {
  headers: string[];
  rows: SpreadsheetRow[];
}

interface ImportExecutionResult {
  kind?: ImportKind;
  success: boolean;
  error?: string;
  created?: number;
  updated?: number;
  stockEntryId?: string;
  totalAmount?: number;
  processedFiles?: number;
  suppliersCreated?: number;
  suppliersUpdated?: number;
  productsCreated?: number;
  productsUpdated?: number;
  stockEntriesCreated?: number;
  warnings?: string[];
  errors?: string[];
}

function parseSpreadsheetData(rawText: string, kind: Exclude<ImportKind, "xml_batch">): ParsedSpreadsheetResult {
  const cleaned = rawText.replace(/^\uFEFF/, "").trim();
  if (!cleaned) return { headers: [], rows: [] };

  const lines = cleaned
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const delimiter = detectDelimiter(lines[0]);
  const firstCells = splitDelimitedLine(lines[0], delimiter);
  const firstNorm = firstCells.map(normalizeHeaderKey);

  const knownHeaders = new Set([
    "nome", "produto", "descricao", "cliente", "fornecedor", "razaosocial", "xprod",
    "codigobarras", "codigodebarras", "barcode", "ean", "gtin",
    "precovenda", "preco", "valor", "price", "custo", "cost",
    "estoque", "estoquecontado", "countedstock", "qtd", "quantidade", "stock",
    "unidade", "unit", "unidadecompra", "unitpurchase", "unidadevenda", "unitsale",
    "fatorconversao", "unitconvfactor", "categoria", "category", "ncm",
    "cpfcnpj", "cnpjcpf", "cnpj", "cpf", "documento", "document",
    "telefone", "fone", "celular", "whatsapp", "phone",
    "email", "endereco", "address", "limitecredito", "limite", "creditlimit",
    "validade", "expirationdate", "saiposantigo", "saipos", "islegacysaipos",
  ]);

  const hasHeader = firstNorm.some((h) => knownHeaders.has(h));
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const findIndex = (aliases: string[], fallbackIdx: number) => {
    if (!hasHeader) return fallbackIdx;
    for (const a of aliases) {
      const idx = firstNorm.indexOf(a);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  if (kind === "products") {
    const iName = findIndex(["nome", "produto", "descricao", "xprod", "name"], 0);
    const iBar = findIndex(["codigobarras", "codigodebarras", "barcode", "ean", "gtin", "codigo"], 1);
    const iPrice = findIndex(["precovenda", "preco", "valor", "price", "venda"], 2);
    const iCost = findIndex(["custo", "precocusto", "cost"], 3);
    const iStock = findIndex(["estoque", "qtd", "quantidade", "stock", "saldo"], 4);
    const iUnit = findIndex(["unidade", "un", "unit"], 5);
    const iUnitPurchase = findIndex(["unidadecompra", "unitpurchase"], 6);
    const iUnitSale = findIndex(["unidadevenda", "unitsale"], 7);
    const iConv = findIndex(["fatorconversao", "unitconvfactor", "conversao", "fator"], 8);
    const iCat = findIndex(["categoria", "category", "categoryname", "grupo", "secao"], 9);
    const iNcm = findIndex(["ncm"], 10);

    const rows = dataLines.map((line) => {
      const c = splitDelimitedLine(line, delimiter);
      return {
        name: iName >= 0 ? c[iName] || "" : "",
        barcode: iBar >= 0 ? c[iBar] || "" : "",
        price: iPrice >= 0 ? parseLocaleNumber(c[iPrice], 0) : 0,
        cost: iCost >= 0 && c[iCost] ? parseLocaleNumber(c[iCost], 0) : undefined,
        stock: iStock >= 0 && c[iStock] ? parseLocaleNumber(c[iStock], 0) : undefined,
        unit: (iUnit >= 0 ? c[iUnit] : "") || "UN",
        unitPurchase: iUnitPurchase >= 0 ? c[iUnitPurchase] || undefined : undefined,
        unitSale: iUnitSale >= 0 ? c[iUnitSale] || undefined : undefined,
        unitConvFactor: iConv >= 0 && c[iConv] ? parseLocaleNumber(c[iConv], 1) : 1,
        categoryName: iCat >= 0 ? c[iCat] || "" : "",
        ncm: iNcm >= 0 ? c[iNcm] || "" : "",
      };
    });

    return {
      headers: ["Nome", "Cód. Barras", "Preço", "Custo", "Estoque", "Unid.", "Categoria", "NCM"],
      rows,
    };
  }

  if (kind === "stock_balance") {
    const iBar = findIndex(["codigobarras", "codigodebarras", "barcode", "ean", "gtin", "codigo"], 0);
    const iName = findIndex(["nome", "produto", "descricao", "name"], 1);
    const iCount = findIndex(["estoquecontado", "countedstock", "estoque", "contagem", "qtd", "quantidade", "stock"], 2);
    const iCost = findIndex(["custo", "cost", "precocusto"], 3);
    const iPrice = findIndex(["precovenda", "preco", "price", "venda"], 4);
    const iExp = findIndex(["validade", "vencimento", "expirationdate", "datavalidade"], 5);

    const rows = dataLines.map((line) => {
      const c = splitDelimitedLine(line, delimiter);
      return {
        barcode: iBar >= 0 ? c[iBar] || "" : "",
        name: iName >= 0 ? c[iName] || "" : "",
        countedStock: iCount >= 0 ? parseLocaleNumber(c[iCount], 0) : 0,
        cost: iCost >= 0 && c[iCost] ? parseLocaleNumber(c[iCost], 0) : undefined,
        price: iPrice >= 0 && c[iPrice] ? parseLocaleNumber(c[iPrice], 0) : undefined,
        expirationDate: iExp >= 0 ? c[iExp] || "" : "",
      };
    });

    return {
      headers: ["Cód. Barras", "Produto", "Estoque Contado", "Custo", "Preço Venda", "Validade"],
      rows,
    };
  }

  if (kind === "customers") {
    const iName = findIndex(["nome", "cliente", "razaosocial", "name"], 0);
    const iDoc = findIndex(["cpfcnpj", "cnpjcpf", "cnpj", "cpf", "documento", "document"], 1);
    const iPhone = findIndex(["telefone", "fone", "celular", "whatsapp", "phone"], 2);
    const iEmail = findIndex(["email"], 3);
    const iAddr = findIndex(["endereco", "address", "logradouro"], 4);
    const iLimit = findIndex(["limitecredito", "limite", "creditlimit"], 5);

    const rows = dataLines.map((line) => {
      const c = splitDelimitedLine(line, delimiter);
      return {
        name: iName >= 0 ? c[iName] || "" : "",
        document: iDoc >= 0 ? c[iDoc] || "" : "",
        phone: iPhone >= 0 ? c[iPhone] || "" : "",
        email: iEmail >= 0 ? c[iEmail] || "" : "",
        address: iAddr >= 0 ? c[iAddr] || "" : "",
        creditLimit: iLimit >= 0 && c[iLimit] ? parseLocaleNumber(c[iLimit], 0) : undefined,
      };
    });

    return {
      headers: ["Nome", "CPF/CNPJ", "Telefone", "E-mail", "Endereço", "Limite Crédito"],
      rows,
    };
  }

  // suppliers
  const iName = findIndex(["nome", "fornecedor", "razaosocial", "name"], 0);
  const iDoc = findIndex(["cnpjcpf", "cpfcnpj", "cnpj", "cpf", "documento", "document"], 1);
  const iPhone = findIndex(["telefone", "fone", "whatsapp", "phone"], 2);
  const iEmail = findIndex(["email"], 3);
  const iCat = findIndex(["categoria", "category", "segmento"], 4);
  const iSaipos = findIndex(["saiposantigo", "saipos", "islegacysaipos", "legacysaipos"], 5);

  const rows = dataLines.map((line) => {
    const c = splitDelimitedLine(line, delimiter);
    return {
      name: iName >= 0 ? c[iName] || "" : "",
      document: iDoc >= 0 ? c[iDoc] || "" : "",
      phone: iPhone >= 0 ? c[iPhone] || "" : "",
      email: iEmail >= 0 ? c[iEmail] || "" : "",
      category: iCat >= 0 ? c[iCat] || "" : "",
      isLegacySaipos: iSaipos >= 0 ? parseBooleanFlag(c[iSaipos]) : false,
    };
  });

  return {
    headers: ["Nome", "CNPJ/CPF", "Telefone", "E-mail", "Categoria", "Saipos Antigo"],
    rows,
  };
}

interface XmlPreviewItem {
  name: string;
  content: string;
  valid: boolean;
  invoiceNum: string;
  emitterName: string;
  emitterCnpj: string;
  itemsCount: number;
  totalAmount: number;
  error?: string;
}

function previewXmlFileClient(name: string, content: string): XmlPreviewItem {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "application/xml");
    const parseErr = doc.querySelector("parsererror");
    if (parseErr) {
      return {
        name,
        content,
        valid: false,
        invoiceNum: "—",
        emitterName: "XML malformado",
        emitterCnpj: "—",
        itemsCount: 0,
        totalAmount: 0,
        error: "Estrutura XML inválida",
      };
    }

    const infNFe = doc.querySelector("infNFe");
    const emit = infNFe?.querySelector("emit");
    if (!infNFe || !emit) {
      return {
        name,
        content,
        valid: false,
        invoiceNum: "—",
        emitterName: "Não é NF-e/NFC-e",
        emitterCnpj: "—",
        itemsCount: 0,
        totalAmount: 0,
        error: "Tags <infNFe>/<emit> não encontradas",
      };
    }

    const get = (parent: Element | null, tag: string) =>
      parent?.querySelector(tag)?.textContent?.trim() || "";

    const ide = infNFe.querySelector("ide");
    const total = infNFe.querySelector("ICMSTot");
    const dets = infNFe.querySelectorAll("det");

    return {
      name,
      content,
      valid: true,
      invoiceNum: get(ide, "nNF") || "S/N",
      emitterName: get(emit, "xNome") || get(emit, "xFant") || "Fornecedor",
      emitterCnpj: get(emit, "CNPJ") || get(emit, "CPF") || "—",
      itemsCount: dets.length,
      totalAmount: parseFloat((get(total, "vNF") || "0").replace(",", ".")) || 0,
    };
  } catch (err: unknown) {
    return {
      name,
      content,
      valid: false,
      invoiceNum: "—",
      emitterName: "Erro",
      emitterCnpj: "—",
      itemsCount: 0,
      totalAmount: 0,
      error: err instanceof Error ? err.message : "Erro ao ler XML",
    };
  }
}

export function SupportHubClient({
  bundle,
  plans,
}: {
  bundle: CompanySupportBundle;
  plans: Array<{ id: string; name: string; price: number }>;
}) {
  const router = useRouter();
  const { company, fiscalConfig, counts, users, customerRooms } = bundle;

  const [activeTab, setActiveTab] = useState<TabId>("geral");

  // ── Aba 1: Configuração Geral & Cardápio Digital ──────────────────────────
  const [genName, setGenName] = useState(company.name);
  const [genDocument, setGenDocument] = useState(company.document);
  const [genPhone, setGenPhone] = useState(company.phone);
  const [genWhatsapp, setGenWhatsapp] = useState(company.whatsapp);
  const [genAddress, setGenAddress] = useState(company.address);
  const [genSlug, setGenSlug] = useState(company.slug);
  const [genDigitalMenuEnabled, setGenDigitalMenuEnabled] = useState(company.digitalMenuEnabled);
  const [genDigitalMenuNotes, setGenDigitalMenuNotes] = useState(company.digitalMenuNotes);
  const [genHasHotelTabs, setGenHasHotelTabs] = useState(company.hasHotelTabs);
  const [genSegment, setGenSegment] = useState(company.segment || "SUPERMARKET");
  const [genOperationTypes, setGenOperationTypes] = useState<string[]>(
    company.operationTypes.length > 0 ? company.operationTypes : ["RETAIL"]
  );
  const [genActiveModules, setGenActiveModules] = useState<string[]>(company.activeModules);
  const [genOpRate, setGenOpRate] = useState(String(company.defaultOperationalRate ?? 15));
  const [genProfitMargin, setGenProfitMargin] = useState(String(company.defaultProfitMargin ?? 25));
  const [genFreightOther, setGenFreightOther] = useState(String(company.defaultFreightOther ?? 0));
  const [genPlanId, setGenPlanId] = useState(company.planId || "");
  const [genLicenseStatus, setGenLicenseStatus] = useState(company.licenseStatus || "ACTIVE");
  const [genLicenseExpiresAt, setGenLicenseExpiresAt] = useState(
    company.licenseExpiresAt ? new Date(company.licenseExpiresAt).toISOString().split("T")[0] : ""
  );
  const [genSaving, setGenSaving] = useState(false);
  const [genFeedback, setGenFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // ── Aba 2: Fiscal & Tributário ────────────────────────────────────────────
  const [fisCnpj, setFisCnpj] = useState(fiscalConfig?.cnpj || company.document);
  const [fisCompanyName, setFisCompanyName] = useState(fiscalConfig?.companyName || company.name);
  const [fisTradeName, setFisTradeName] = useState(fiscalConfig?.tradeName || company.name);
  const [fisIe, setFisIe] = useState(fiscalConfig?.ie || "");
  const [fisIm, setFisIm] = useState(fiscalConfig?.im || "");
  const [fisRegime, setFisRegime] = useState(fiscalConfig?.taxRegime || "SN");
  const [fisEnv, setFisEnv] = useState(fiscalConfig?.environment || "homologacao");
  const [fisNfeSeries, setFisNfeSeries] = useState(fiscalConfig?.nfeSeries || "1");
  const [fisNfceSeries, setFisNfceSeries] = useState(fiscalConfig?.nfceeSeries || "1");
  const [fisNextNfe, setFisNextNfe] = useState(String(fiscalConfig?.nextNfeNumber ?? 1));
  const [fisNextNfce, setFisNextNfce] = useState(String(fiscalConfig?.nextNfceNumber ?? 1));
  const [fisIbge, setFisIbge] = useState(fiscalConfig?.ibgeCode || "2700805");
  const [fisCscId, setFisCscId] = useState(fiscalConfig?.cscId || "000001");
  const [fisCscToken, setFisCscToken] = useState(fiscalConfig?.cscToken || "");
  const [fisFocusToken, setFisFocusToken] = useState(fiscalConfig?.focusNfeToken || "");
  const [fisZip, setFisZip] = useState(fiscalConfig?.zipCode || "");
  const [fisStreet, setFisStreet] = useState(fiscalConfig?.street || "");
  const [fisNumber, setFisNumber] = useState(fiscalConfig?.number || "");
  const [fisDistrict, setFisDistrict] = useState(fiscalConfig?.district || "");
  const [fisCity, setFisCity] = useState(fiscalConfig?.city || "");
  const [fisState, setFisState] = useState(fiscalConfig?.state || "AL");
  const [fisSaving, setFisSaving] = useState(false);
  const [fisFeedback, setFisFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  // ── Aba 3: Importação de Dados ────────────────────────────────────────────
  const [importKind, setImportKind] = useState<ImportKind>("products");
  const [rawImportText, setRawImportText] = useState("");
  const [markAllSaipos, setMarkAllSaipos] = useState(false);
  const [xmlMarkSaipos, setXmlMarkSaipos] = useState(true);
  const [xmlCreateProductsStock, setXmlCreateProductsStock] = useState(true);
  const [xmlFiles, setXmlFiles] = useState<XmlPreviewItem[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportExecutionResult | null>(null);

  // ── Aba 4: Usuários & Suporte ─────────────────────────────────────────────
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("OPERATOR");
  const [newUserPin, setNewUserPin] = useState("");
  const [newUserMobilePdv, setNewUserMobilePdv] = useState(true);
  const [creatingUser, setCreatingUser] = useState(false);
  const [userFeedback, setUserFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("123456");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  // ── Checklist de Implantação (100% Real) ──────────────────────────────────
  const checklistSteps = useMemo(() => {
    const hasBasicData = Boolean(company.name && company.document);
    const hasContact = Boolean(company.whatsapp || company.phone || company.address);
    const step1Done = hasBasicData && hasContact;
    const step1Partial = hasBasicData && !hasContact;

    const step2Done = counts.users > 0;

    const step3Done = counts.products > 0 && counts.suppliers > 0;
    const step3Partial = (counts.products > 0 || counts.suppliers > 0) && !step3Done;

    const hasFiscalBasic = Boolean(fiscalConfig?.ie && fiscalConfig?.taxRegime);
    const hasCert = Boolean(fiscalConfig?.certUploaded);
    const step4Done = hasFiscalBasic && hasCert;
    const step4Partial = Boolean(fiscalConfig) && !step4Done;

    const hasSlugAndActive = Boolean(company.digitalMenuEnabled && company.slug);
    const step5Done = hasSlugAndActive && counts.digitalMenuProducts > 0;
    const step5Partial = hasSlugAndActive && counts.digitalMenuProducts === 0;

    return [
      {
        id: "dados",
        label: "Empresa & Dados",
        detail: step1Done ? "Cadastro completo" : step1Partial ? "Falta WhatsApp/End." : "Pendente",
        status: step1Done ? "done" : step1Partial ? "partial" : "pending",
        tab: "geral" as TabId,
      },
      {
        id: "usuarios",
        label: "Usuários da Loja",
        detail: `${counts.users} cadastrado(s)`,
        status: step2Done ? "done" : "pending",
        tab: "usuarios" as TabId,
      },
      {
        id: "catalogo",
        label: "Fornecedores & Produtos",
        detail: `${counts.products} prod. • ${counts.suppliers} forn.`,
        status: step3Done ? "done" : step3Partial ? "partial" : "pending",
        tab: "importacao" as TabId,
      },
      {
        id: "fiscal",
        label: "Fiscal & Certificado A1",
        detail: step4Done ? "SEFAZ + A1 prontos" : step4Partial ? "Certificado A1 pendente" : "Não configurado",
        status: step4Done ? "done" : step4Partial ? "partial" : "pending",
        tab: "fiscal" as TabId,
      },
      {
        id: "cardapio",
        label: "Cardápio Digital",
        detail: step5Done
          ? `/loja/${company.slug} (${counts.digitalMenuProducts})`
          : step5Partial
            ? "Sem itens no cardápio"
            : company.slug
              ? "Desativado"
              : "Slug pendente",
        status: step5Done ? "done" : step5Partial ? "partial" : "pending",
        tab: "geral" as TabId,
      },
    ];
  }, [company, counts, fiscalConfig]);

  const completedStepsCount = checklistSteps.filter((s) => s.status === "done").length;
  const progressPercent = Math.round((completedStepsCount / checklistSteps.length) * 100);

  // ── Preview de Planilha CSV/Excel ─────────────────────────────────────────
  const parsedPreview = useMemo(() => {
    if (importKind === "xml_batch") return { headers: [], rows: [] };
    return parseSpreadsheetData(rawImportText, importKind);
  }, [rawImportText, importKind]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const menuPath = `/loja/${genSlug.trim() || company.id}`;

  const handleCopyMenuLink = async () => {
    try {
      const fullUrl = `${window.location.origin}${menuPath}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleApplySegmentPreset = () => {
    const preset = SEGMENT_PRESETS[genSegment];
    if (!preset) return;
    setGenOperationTypes(preset.operationTypes);
    setGenActiveModules(preset.modules);
  };

  const handleToggleOperationType = (key: string) => {
    setGenOperationTypes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleToggleModule = (key: string) => {
    setGenActiveModules((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  async function handleSaveGeneral(e: React.FormEvent) {
    e.preventDefault();
    setGenSaving(true);
    setGenFeedback(null);

    const res = await updateTenantFullConfig(company.id, {
      name: genName,
      document: genDocument,
      phone: genPhone,
      whatsapp: genWhatsapp,
      address: genAddress,
      slug: genSlug,
      digitalMenuEnabled: genDigitalMenuEnabled,
      digitalMenuNotes: genDigitalMenuNotes,
      hasHotelTabs: genHasHotelTabs,
      segment: genSegment,
      operationTypes: genOperationTypes,
      activeModules: genActiveModules,
      defaultOperationalRate: Number(genOpRate),
      defaultProfitMargin: Number(genProfitMargin),
      defaultFreightOther: Number(genFreightOther),
      planId: genPlanId || null,
      licenseStatus: genLicenseStatus,
      licenseExpiresAt: genLicenseExpiresAt,
    });

    setGenSaving(false);
    if (res.error) {
      setGenFeedback({ type: "err", msg: res.error });
    } else {
      const updatedSlug = (res.company as { slug?: string | null } | undefined)?.slug;
      if (updatedSlug !== undefined) {
        setGenSlug(updatedSlug || "");
      }
      setGenFeedback({ type: "ok", msg: "Configurações gerais, módulos e cardápio salvos com sucesso!" });
      router.refresh();
    }
  }

  async function handleSaveFiscal(e: React.FormEvent) {
    e.preventDefault();
    setFisSaving(true);
    setFisFeedback(null);

    const res = await updateTenantFiscalConfig(company.id, {
      cnpj: fisCnpj,
      companyName: fisCompanyName,
      tradeName: fisTradeName,
      ie: fisIe,
      im: fisIm,
      taxRegime: fisRegime,
      environment: fisEnv,
      nfeSeries: fisNfeSeries,
      nfceeSeries: fisNfceSeries,
      nextNfeNumber: Number(fisNextNfe),
      nextNfceNumber: Number(fisNextNfce),
      ibgeCode: fisIbge,
      cscId: fisCscId,
      cscToken: fisCscToken,
      focusNfeToken: fisFocusToken,
      zipCode: fisZip,
      street: fisStreet,
      number: fisNumber,
      district: fisDistrict,
      city: fisCity,
      state: fisState,
    });

    setFisSaving(false);
    if (res.error) {
      setFisFeedback({ type: "err", msg: res.error });
    } else {
      setFisFeedback({ type: "ok", msg: "Configuração fiscal SEFAZ salva com sucesso!" });
      router.refresh();
    }
  }

  function handleDownloadTemplate() {
    if (importKind === "xml_batch") return;
    const tpl = CSV_TEMPLATES[importKind];
    const blob = new Blob(["\uFEFF" + tpl.content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = tpl.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCsvFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setRawImportText(text);
    setImportResult(null);
    e.target.value = "";
  }

  async function handleXmlFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = Array.from(e.target.files || []);
    if (fileList.length === 0) return;
    const previews: XmlPreviewItem[] = [];
    for (const f of fileList) {
      const content = await f.text();
      previews.push(previewXmlFileClient(f.name, content));
    }
    setXmlFiles((prev) => [...prev, ...previews]);
    setImportResult(null);
    e.target.value = "";
  }

  async function handleExecuteImport() {
    setImporting(true);
    setImportResult(null);

    try {
      if (importKind === "xml_batch") {
        const validFiles = xmlFiles
          .filter((f) => f.valid)
          .map((f) => ({ name: f.name, content: f.content }));
        if (validFiles.length === 0) {
          setImportResult({ success: false, error: "Nenhum arquivo XML válido selecionado." });
          setImporting(false);
          return;
        }
        const res = await supportImportXmlBatch(company.id, validFiles, {
          markSuppliersSaipos: xmlMarkSaipos,
          createProductsAndStock: xmlCreateProductsStock,
        });
        setImportResult({ kind: "xml_batch", ...res });
      } else if (importKind === "products") {
        const res = await supportImportProducts(
          company.id,
          parsedPreview.rows as unknown as SupportImportProductInput[]
        );
        setImportResult({ kind: "products", ...res });
      } else if (importKind === "stock_balance") {
        const res = await supportImportStockBalance(
          company.id,
          parsedPreview.rows as unknown as SupportImportStockBalanceInput[]
        );
        setImportResult({ kind: "stock_balance", ...res });
      } else if (importKind === "customers") {
        const res = await supportImportCustomers(
          company.id,
          parsedPreview.rows as unknown as SupportImportCustomerInput[]
        );
        setImportResult({ kind: "customers", ...res });
      } else if (importKind === "suppliers") {
        const res = await supportImportSuppliers(
          company.id,
          parsedPreview.rows as unknown as SupportImportSupplierInput[],
          markAllSaipos
        );
        setImportResult({ kind: "suppliers", ...res });
      }
      router.refresh();
    } catch (err: unknown) {
      setImportResult({
        success: false,
        error: err instanceof Error ? err.message : "Erro ao executar importação.",
      });
    } finally {
      setImporting(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreatingUser(true);
    setUserFeedback(null);

    const res = await supportCreateTenantUser(company.id, {
      name: newUserName,
      email: newUserEmail,
      password: newUserPassword,
      role: newUserRole,
      pin: newUserPin || undefined,
      allowMobilePdv: newUserMobilePdv,
    });

    setCreatingUser(false);
    if (res.error) {
      setUserFeedback({ type: "err", msg: res.error });
    } else {
      setUserFeedback({ type: "ok", msg: `Usuário "${newUserName}" criado com sucesso!` });
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserPin("");
      router.refresh();
    }
  }

  async function handleToggleUserActive(userId: string, nextActive: boolean) {
    setBusyUserId(userId);
    setUserFeedback(null);
    const res = await supportToggleTenantUser(company.id, userId, nextActive);
    setBusyUserId(null);
    if (res.error) {
      setUserFeedback({ type: "err", msg: res.error });
    } else {
      setUserFeedback({
        type: "ok",
        msg: nextActive ? "Usuário ativado com sucesso." : "Usuário bloqueado com sucesso.",
      });
      router.refresh();
    }
  }

  async function handleToggleUserMobilePdv(userId: string, nextVal: boolean) {
    setBusyUserId(userId);
    setUserFeedback(null);
    const res = await supportToggleTenantUserMobilePdv(company.id, userId, nextVal);
    setBusyUserId(null);
    if (res.error) {
      setUserFeedback({ type: "err", msg: res.error });
    } else {
      setUserFeedback({
        type: "ok",
        msg: nextVal ? "PDV Mobile liberado para o usuário." : "PDV Mobile revogado para o usuário.",
      });
      router.refresh();
    }
  }

  async function handleConfirmResetPassword(userId: string) {
    setBusyUserId(userId);
    setUserFeedback(null);
    const res = await supportResetTenantUserPassword(company.id, userId, resetPasswordValue);
    setBusyUserId(null);
    if (res.error) {
      setUserFeedback({ type: "err", msg: res.error });
    } else {
      setUserFeedback({ type: "ok", msg: "Senha redefinida com sucesso!" });
      setResettingUserId(null);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Checklist Visual de Implantação ──────────────────────────────── */}
      <div className="bg-[#fbfdff] border border-emerald-500/[0.12] rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Sparkles size={16} className="text-emerald-600" />
              Checklist de Implantação do Cliente
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Acompanhamento em tempo real da ativação completa desta loja no ERP
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-36 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              {completedStepsCount}/5 etapas ({progressPercent}%)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {checklistSteps.map((step, idx) => {
            const isDone = step.status === "done";
            const isPartial = step.status === "partial";
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveTab(step.tab)}
                className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                  isDone
                    ? "bg-emerald-50/70 border-emerald-200 hover:border-emerald-300"
                    : isPartial
                      ? "bg-amber-50/70 border-amber-200 hover:border-amber-300"
                      : "bg-slate-50/80 border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Etapa {idx + 1}
                  </span>
                  {isDone ? (
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  ) : isPartial ? (
                    <Clock size={16} className="text-amber-600" />
                  ) : (
                    <Circle size={16} className="text-slate-300" />
                  )}
                </div>
                <p className="text-xs font-bold text-gray-900 truncate">{step.label}</p>
                <p
                  className={`text-[11px] mt-0.5 truncate font-medium ${
                    isDone ? "text-emerald-700" : isPartial ? "text-amber-700" : "text-slate-500"
                  }`}
                >
                  {step.detail}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Navegação das 4 Abas ─────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 border-b border-emerald-500/[0.12] pb-3">
        {[
          { id: "geral" as TabId, label: "1. Configuração Geral & Cardápio Digital", icon: <Building2 size={15} /> },
          { id: "fiscal" as TabId, label: "2. Fiscal & Tributário", icon: <FileText size={15} /> },
          { id: "importacao" as TabId, label: "3. Importação de Dados (CSV / Excel / XML)", icon: <Upload size={15} /> },
          { id: "usuarios" as TabId, label: "4. Usuários & Suporte Rápido", icon: <Users size={15} /> },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                active
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                  : "bg-[#fbfdff] text-slate-600 border border-emerald-500/[0.1] hover:bg-emerald-50 hover:text-emerald-700"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ABA 1: CONFIGURAÇÃO GERAL & CARDÁPIO DIGITAL                        */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "geral" && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <form onSubmit={handleSaveGeneral} className="xl:col-span-3 flex flex-col gap-5">
            {/* Dados Básicos */}
            <div className="bg-[#fbfdff] border border-emerald-500/[0.08] rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-gray-900">Dados Cadastrais &amp; Contato</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Razão Social / Nome da Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    value={genName}
                    onChange={(e) => setGenName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    CNPJ ou CPF *
                  </label>
                  <input
                    type="text"
                    required
                    value={genDocument}
                    onChange={(e) => setGenDocument(e.target.value)}
                    className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    WhatsApp (Pedidos / Suporte)
                  </label>
                  <input
                    type="text"
                    value={genWhatsapp}
                    onChange={(e) => setGenWhatsapp(e.target.value)}
                    placeholder="Ex: 5582999990000"
                    className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Telefone Fixo / Secundário
                  </label>
                  <input
                    type="text"
                    value={genPhone}
                    onChange={(e) => setGenPhone(e.target.value)}
                    placeholder="(82) 3333-0000"
                    className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Endereço Completo
                  </label>
                  <input
                    type="text"
                    value={genAddress}
                    onChange={(e) => setGenAddress(e.target.value)}
                    placeholder="Rua, Número, Bairro, Cidade - UF"
                    className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Cardápio Digital & Comandas de Quartos */}
            <div className="bg-[#fbfdff] border border-emerald-500/[0.08] rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Globe size={16} className="text-emerald-600" />
                    Cardápio Digital &amp; Comandas Especiais
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configure a vitrine pública (/loja/slug) e recursos de hospedagem do cliente
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {counts.digitalMenuProducts} produto(s) no cardápio
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#f3f7fe] border border-slate-200 cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-gray-900">Cardápio Digital Ativo</p>
                    <p className="text-[11px] text-slate-500">
                      Libera pedidos online via link público da loja
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={genDigitalMenuEnabled}
                    onChange={(e) => setGenDigitalMenuEnabled(e.target.checked)}
                    className="w-5 h-5 accent-emerald-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#f3f7fe] border border-slate-200 cursor-pointer">
                  <div className="flex items-start gap-2.5">
                    <BedDouble size={18} className="text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-gray-900">
                        Comandas de Quartos / Hotel (hasHotelTabs)
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {customerRooms.length > 0
                          ? `${customerRooms.length} quarto(s) já cadastrado(s)`
                          : "Habilita lançamento por quartos/apartamentos"}
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={genHasHotelTabs}
                    onChange={(e) => setGenHasHotelTabs(e.target.checked)}
                    className="w-5 h-5 accent-emerald-600 rounded"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Slug Exclusivo do Cardápio (/loja/[slug])
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={genSlug}
                      onChange={(e) => setGenSlug(e.target.value)}
                      placeholder="ex: emporio-agrobelem"
                      className="flex-1 px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900 font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setGenSlug(slugifyText(genName))}
                      className="px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 cursor-pointer whitespace-nowrap"
                    >
                      Gerar do Nome
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex-1 min-w-[180px] px-3 py-2 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs font-mono text-emerald-800 truncate">
                    {menuPath}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyMenuLink}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    <span>{copiedLink ? "Copiado!" : "Copiar Link"}</span>
                  </button>
                  <a
                    href={menuPath}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                  >
                    <ExternalLink size={14} />
                    <span>Abrir Cardápio</span>
                  </a>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Observações / Horário no Cardápio Digital
                </label>
                <input
                  type="text"
                  value={genDigitalMenuNotes}
                  onChange={(e) => setGenDigitalMenuNotes(e.target.value)}
                  placeholder="Ex: Aberto todos os dias das 07h às 22h • Entrega grátis acima de R$ 50"
                  className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Segmento, Precificação & Licença */}
            <div className="bg-[#fbfdff] border border-emerald-500/[0.08] rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-gray-900">
                  Segmento, Margens Padrão &amp; Licenciamento
                </h3>
                <button
                  type="button"
                  onClick={handleApplySegmentPreset}
                  className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 cursor-pointer"
                >
                  Aplicar Módulos Padrão do Segmento
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Segmento</label>
                  <select
                    value={genSegment}
                    onChange={(e) => setGenSegment(e.target.value)}
                    className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-emerald-500"
                  >
                    {Object.entries(SEGMENT_PRESETS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Plano</label>
                  <select
                    value={genPlanId}
                    onChange={(e) => setGenPlanId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Sem plano</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — R$ {Number(p.price).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Status da Licença
                  </label>
                  <select
                    value={genLicenseStatus}
                    onChange={(e) => setGenLicenseStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ACTIVE">ACTIVE (Ativa)</option>
                    <option value="TRIAL">TRIAL (Teste)</option>
                    <option value="SUSPENDED">SUSPENDED (Suspensa)</option>
                    <option value="READ_ONLY">READ_ONLY (Somente Leitura)</option>
                    <option value="EXPIRED">EXPIRED (Expirada)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Vencimento Licença
                  </label>
                  <input
                    type="date"
                    value={genLicenseExpiresAt}
                    onChange={(e) => setGenLicenseExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Custo Operacional Padrão (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={genOpRate}
                    onChange={(e) => setGenOpRate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Margem de Lucro Padrão (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="500"
                    value={genProfitMargin}
                    onChange={(e) => setGenProfitMargin(e.target.value)}
                    className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Frete / Outras Despesas (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={genFreightOther}
                    onChange={(e) => setGenFreightOther(e.target.value)}
                    className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  Tipos de Operação (operationTypes)
                </label>
                <div className="flex flex-wrap gap-2">
                  {OPERATION_TYPE_OPTIONS.map((op) => {
                    const checked = genOperationTypes.includes(op.key);
                    return (
                      <button
                        key={op.key}
                        type="button"
                        onClick={() => handleToggleOperationType(op.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                          checked
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-[#f3f7fe] text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {op.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Módulos Ativos */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-600">
                    Módulos Liberados ({genActiveModules.length}/{SYSTEM_MODULES_CATALOG.length})
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setGenActiveModules(
                        genActiveModules.length === SYSTEM_MODULES_CATALOG.length
                          ? []
                          : SYSTEM_MODULES_CATALOG.map((m) => m.key)
                      )
                    }
                    className="text-xs font-semibold text-emerald-600 hover:underline cursor-pointer"
                  >
                    {genActiveModules.length === SYSTEM_MODULES_CATALOG.length
                      ? "Desmarcar Todos"
                      : "Marcar Todos"}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {SYSTEM_MODULES_CATALOG.map((mod) => {
                    const checked = genActiveModules.includes(mod.key);
                    return (
                      <button
                        key={mod.key}
                        type="button"
                        onClick={() => handleToggleModule(mod.key)}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          checked
                            ? "bg-emerald-50/70 border-emerald-300 text-gray-900"
                            : "bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 text-white ${
                            checked ? "bg-emerald-600" : "border border-slate-300 bg-white"
                          }`}
                        >
                          {checked && <Check size={11} strokeWidth={3} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{mod.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{mod.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {genFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold border ${
                  genFeedback.type === "ok"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                {genFeedback.msg}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={genSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-sm cursor-pointer"
              >
                {genSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>{genSaving ? "Salvando..." : "Salvar Configuração Geral"}</span>
              </button>
            </div>
          </form>

          {/* Coluna Direita: Ações Rápidas da Licença & Quartos */}
          <div className="flex flex-col gap-5">
            <CompanyActions companyId={company.id} currentStatus={company.licenseStatus} />

            {genHasHotelTabs && (
              <div className="bg-[#fbfdff] border border-emerald-500/[0.08] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BedDouble size={16} className="text-blue-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Quartos / Comandas</h3>
                </div>
                {customerRooms.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Nenhum quarto cadastrado ainda para este cliente.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {customerRooms.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between text-xs p-2 rounded-lg bg-[#f3f7fe]"
                      >
                        <div>
                          <span className="font-bold text-gray-900">{r.code}</span> — {r.name}
                          <p className="text-[10px] text-slate-500">{r.customerName}</p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded font-semibold ${
                            r.active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {r.active ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ABA 2: FISCAL & TRIBUTÁRIO                                          */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "fiscal" && (
        <form onSubmit={handleSaveFiscal} className="flex flex-col gap-5">
          {/* Status Certificado A1 */}
          <div
            className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${
              fiscalConfig?.certUploaded
                ? "bg-emerald-50/70 border-emerald-200"
                : "bg-amber-50/70 border-amber-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  fiscalConfig?.certUploaded
                    ? "bg-emerald-600 text-white"
                    : "bg-amber-500 text-white"
                }`}
              >
                {fiscalConfig?.certUploaded ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Certificado Digital A1:{" "}
                  {fiscalConfig?.certUploaded ? "Enviado e Configurado" : "Pendente de Envio"}
                </h3>
                <p className="text-xs text-slate-600">
                  {fiscalConfig?.certUploaded
                    ? fiscalConfig.certExpiration
                      ? `Validade do certificado: ${new Date(fiscalConfig.certExpiration).toLocaleDateString("pt-BR")}`
                      : "Arquivo .pfx vinculado ao emissor SEFAZ deste cliente."
                    : "O arquivo .pfx e a senha do certificado A1 podem ser enviados dentro do painel do cliente em Configurações > Fiscal."}
                </p>
              </div>
            </div>

            <AccessTenantButton
              companyId={company.id}
              companyName={company.name}
              label="Acessar Painel p/ Enviar A1"
              size={14}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer"
            />
          </div>

          <div className="bg-[#fbfdff] border border-emerald-500/[0.08] rounded-xl p-5 space-y-5">
            <h3 className="text-sm font-bold text-gray-900">Parâmetros SEFAZ (NF-e / NFC-e)</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">CNPJ Emissor *</label>
                <input
                  type="text"
                  required
                  value={fisCnpj}
                  onChange={(e) => setFisCnpj(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Razão Social Fiscal *
                </label>
                <input
                  type="text"
                  required
                  value={fisCompanyName}
                  onChange={(e) => setFisCompanyName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nome Fantasia</label>
                <input
                  type="text"
                  value={fisTradeName}
                  onChange={(e) => setFisTradeName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Inscrição Estadual (IE)
                </label>
                <input
                  type="text"
                  value={fisIe}
                  onChange={(e) => setFisIe(e.target.value)}
                  placeholder="Somente dígitos ou ISENTO"
                  className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Inscrição Municipal (IM)
                </label>
                <input
                  type="text"
                  value={fisIm}
                  onChange={(e) => setFisIm(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Regime Tributário
                </label>
                <select
                  value={fisRegime}
                  onChange={(e) => setFisRegime(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900"
                >
                  <option value="SN">Simples Nacional (SN)</option>
                  <option value="LP">Lucro Presumido (LP)</option>
                  <option value="LR">Lucro Real (LR)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Ambiente SEFAZ</label>
                <select
                  value={fisEnv}
                  onChange={(e) => setFisEnv(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900"
                >
                  <option value="homologacao">Homologação (Testes)</option>
                  <option value="producao">Produção (Validade Jurídica)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Série NF-e</label>
                <input
                  type="text"
                  value={fisNfeSeries}
                  onChange={(e) => setFisNfeSeries(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Próximo Nº NF-e
                </label>
                <input
                  type="number"
                  min={1}
                  value={fisNextNfe}
                  onChange={(e) => setFisNextNfe(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Série NFC-e</label>
                <input
                  type="text"
                  value={fisNfceSeries}
                  onChange={(e) => setFisNfceSeries(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Próximo Nº NFC-e
                </label>
                <input
                  type="number"
                  min={1}
                  value={fisNextNfce}
                  onChange={(e) => setFisNextNfce(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Código IBGE</label>
                <input
                  type="text"
                  value={fisIbge}
                  onChange={(e) => setFisIbge(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">ID CSC (NFC-e)</label>
                <input
                  type="text"
                  value={fisCscId}
                  onChange={(e) => setFisCscId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Token CSC</label>
                <input
                  type="text"
                  value={fisCscToken}
                  onChange={(e) => setFisCscToken(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Token Focus NFe (opcional)
                </label>
                <input
                  type="text"
                  value={fisFocusToken}
                  onChange={(e) => setFisFocusToken(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 pt-2 border-t border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">CEP</label>
                <input
                  type="text"
                  value={fisZip}
                  onChange={(e) => setFisZip(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Logradouro</label>
                <input
                  type="text"
                  value={fisStreet}
                  onChange={(e) => setFisStreet(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Número</label>
                <input
                  type="text"
                  value={fisNumber}
                  onChange={(e) => setFisNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Bairro</label>
                <input
                  type="text"
                  value={fisDistrict}
                  onChange={(e) => setFisDistrict(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={fisCity}
                    onChange={(e) => setFisCity(e.target.value)}
                    className="w-full px-2 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">UF</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={fisState}
                    onChange={(e) => setFisState(e.target.value.toUpperCase())}
                    className="w-full px-2 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900 text-center"
                  />
                </div>
              </div>
            </div>
          </div>

          {fisFeedback && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold border ${
                fisFeedback.type === "ok"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              {fisFeedback.msg}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={fisSaving}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-sm cursor-pointer"
            >
              {fisSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{fisSaving ? "Salvando..." : "Salvar Configuração Fiscal"}</span>
            </button>
          </div>
        </form>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ABA 3: IMPORTAÇÃO DE DADOS DO CLIENTE (CSV / EXCEL / XML)           */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "importacao" && (
        <div className="flex flex-col gap-5">
          {/* Seletor de Tipo de Importação */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { id: "products" as ImportKind, label: "Produtos", desc: "Catálogo, preços e categorias", icon: <Package size={16} /> },
              { id: "stock_balance" as ImportKind, label: "Balanço / Estoque", desc: "Contagem, validades e StockEntry", icon: <ClipboardCheck size={16} /> },
              { id: "customers" as ImportKind, label: "Clientes", desc: "CPF/CNPJ, contatos e crédito", icon: <UserCheck size={16} /> },
              { id: "suppliers" as ImportKind, label: "Fornecedores", desc: "Com marcação Saipos Antigo", icon: <Truck size={16} /> },
              { id: "xml_batch" as ImportKind, label: "XMLs NF-e em Lote", desc: "Extrai fornecedores e estoque", icon: <FileCode size={16} /> },
            ].map((opt) => {
              const selected = importKind === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setImportKind(opt.id);
                    setImportResult(null);
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selected
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-[#fbfdff] text-gray-900 border-emerald-500/[0.12] hover:bg-emerald-50"
                  }`}
                >
                  <div className={`mb-1.5 ${selected ? "text-white" : "text-emerald-600"}`}>
                    {opt.icon}
                  </div>
                  <p className="text-xs font-bold">{opt.label}</p>
                  <p className={`text-[10px] mt-0.5 ${selected ? "text-emerald-100" : "text-slate-500"}`}>
                    {opt.desc}
                  </p>
                </button>
              );
            })}
          </div>

          {importKind !== "xml_batch" ? (
            <div className="bg-[#fbfdff] border border-emerald-500/[0.08] rounded-xl p-5 space-y-4">
              {/* Barra de Ações Planilha Modelo + Upload */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-emerald-600" />
                    Importar {importKind === "products" ? "Produtos" : importKind === "stock_balance" ? "Balanço / Estoque" : importKind === "customers" ? "Clientes" : "Fornecedores"} para {company.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">{CSV_TEMPLATES[importKind].hint}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    <Download size={14} className="text-emerald-600" />
                    <span>Baixar Planilha Modelo (.CSV)</span>
                  </button>

                  <label className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold cursor-pointer">
                    <Upload size={14} />
                    <span>Enviar Arquivo .CSV / .TXT</span>
                    <input
                      type="file"
                      accept=".csv,.txt,.tsv"
                      onChange={handleCsvFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {importKind === "suppliers" && (
                <label className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={markAllSaipos}
                    onChange={(e) => setMarkAllSaipos(e.target.checked)}
                    className="w-4 h-4 accent-amber-600 rounded"
                  />
                  <div>
                    <p className="text-xs font-bold text-amber-900">
                      Fornecedor Antigo Saipos (isLegacySaipos = true)
                    </p>
                    <p className="text-[11px] text-amber-700">
                      Marque para identificar todos os fornecedores importados deste lote como migrados do sistema antigo Saipos.
                    </p>
                  </div>
                </label>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-600">
                    Colar dados direto do Excel / Planilha ou editar CSV:
                  </label>
                  {rawImportText && (
                    <button
                      type="button"
                      onClick={() => {
                        setRawImportText("");
                        setImportResult(null);
                      }}
                      className="text-xs text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={12} /> Limpar texto
                    </button>
                  )}
                </div>
                <textarea
                  rows={5}
                  value={rawImportText}
                  onChange={(e) => {
                    setRawImportText(e.target.value);
                    setImportResult(null);
                  }}
                  placeholder={`Cole aqui as células copiadas do Excel ou o conteúdo do CSV...\nExemplo:\n${CSV_TEMPLATES[importKind].content}`}
                  className="w-full p-3 bg-[#f3f7fe] border border-slate-200 rounded-xl text-xs font-mono text-gray-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Pré-visualização da Tabela */}
              {parsedPreview.rows.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-gray-900">
                      Pré-visualização antes de importar: {parsedPreview.rows.length} registro(s) detectado(s)
                    </span>
                    <button
                      type="button"
                      onClick={handleExecuteImport}
                      disabled={importing}
                      className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                    >
                      {importing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      <span>
                        {importing
                          ? "Gravando no banco..."
                          : `Importar ${parsedPreview.rows.length} registro(s) para ${company.name}`}
                      </span>
                    </button>
                  </div>

                  <div className="max-h-72 overflow-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-[#f3f7fe] sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2 text-slate-500 font-semibold">#</th>
                          {parsedPreview.headers.map((h) => (
                            <th key={h} className="px-3 py-2 text-slate-600 font-semibold whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedPreview.rows.slice(0, 50).map((r, i) => (
                          <tr key={i} className="hover:bg-emerald-50/40">
                            <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                            {importKind === "products" && (
                              <>
                                <td className="px-3 py-2 font-medium text-gray-900">{r.name || "—"}</td>
                                <td className="px-3 py-2 font-mono text-slate-600">{r.barcode || "—"}</td>
                                <td className="px-3 py-2 text-emerald-700 font-semibold">R$ {Number(r.price || 0).toFixed(2)}</td>
                                <td className="px-3 py-2 text-slate-600">{r.cost !== undefined ? `R$ ${Number(r.cost).toFixed(2)}` : "—"}</td>
                                <td className="px-3 py-2 text-slate-600">{r.stock ?? "—"}</td>
                                <td className="px-3 py-2 text-slate-600">{r.unit}</td>
                                <td className="px-3 py-2 text-slate-600">{r.categoryName || "—"}</td>
                                <td className="px-3 py-2 font-mono text-slate-600">{r.ncm || "—"}</td>
                              </>
                            )}
                            {importKind === "stock_balance" && (
                              <>
                                <td className="px-3 py-2 font-mono text-slate-600">{r.barcode || "—"}</td>
                                <td className="px-3 py-2 font-medium text-gray-900">{r.name || "—"}</td>
                                <td className="px-3 py-2 font-bold text-emerald-700">{r.countedStock}</td>
                                <td className="px-3 py-2 text-slate-600">{r.cost !== undefined ? `R$ ${Number(r.cost).toFixed(2)}` : "—"}</td>
                                <td className="px-3 py-2 text-slate-600">{r.price !== undefined ? `R$ ${Number(r.price).toFixed(2)}` : "—"}</td>
                                <td className="px-3 py-2 text-slate-600">{r.expirationDate || "—"}</td>
                              </>
                            )}
                            {importKind === "customers" && (
                              <>
                                <td className="px-3 py-2 font-medium text-gray-900">{r.name || "—"}</td>
                                <td className="px-3 py-2 font-mono text-slate-600">{r.document || "—"}</td>
                                <td className="px-3 py-2 text-slate-600">{r.phone || "—"}</td>
                                <td className="px-3 py-2 text-slate-600">{r.email || "—"}</td>
                                <td className="px-3 py-2 text-slate-600">{r.address || "—"}</td>
                                <td className="px-3 py-2 text-slate-600">{r.creditLimit !== undefined ? `R$ ${Number(r.creditLimit).toFixed(2)}` : "—"}</td>
                              </>
                            )}
                            {importKind === "suppliers" && (
                              <>
                                <td className="px-3 py-2 font-medium text-gray-900">{r.name || "—"}</td>
                                <td className="px-3 py-2 font-mono text-slate-600">{r.document || "—"}</td>
                                <td className="px-3 py-2 text-slate-600">{r.phone || "—"}</td>
                                <td className="px-3 py-2 text-slate-600">{r.email || "—"}</td>
                                <td className="px-3 py-2 text-slate-600">{r.category || "—"}</td>
                                <td className="px-3 py-2">
                                  {markAllSaipos || r.isLegacySaipos ? (
                                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                                      Saipos
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">Não</span>
                                  )}
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedPreview.rows.length > 50 && (
                    <p className="text-[11px] text-slate-500">
                      Mostrando os primeiros 50 registros na pré-visualização. Todos os {parsedPreview.rows.length} serão importados.
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ── Importação XML em Lote ───────────────────────────────────── */
            <div className="bg-[#fbfdff] border border-emerald-500/[0.08] rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <FileCode size={16} className="text-emerald-600" />
                    Importação de Notas Fiscais XML em Lote ({company.name})
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Lê emitentes (fornecedores) e itens das NF-e/NFC-e em lote diretamente para esta empresa.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {xmlFiles.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setXmlFiles([]);
                        setImportResult(null);
                      }}
                      className="px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 cursor-pointer"
                    >
                      Limpar Lote
                    </button>
                  )}
                  <label className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer shadow-sm">
                    <Upload size={14} />
                    <span>Selecionar Arquivos .XML (Lote)</span>
                    <input
                      type="file"
                      accept=".xml"
                      multiple
                      onChange={handleXmlFilesChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={xmlMarkSaipos}
                    onChange={(e) => setXmlMarkSaipos(e.target.checked)}
                    className="w-4 h-4 accent-amber-600 rounded"
                  />
                  <div>
                    <p className="text-xs font-bold text-amber-900">
                      Marcar fornecedores como Antigo Saipos
                    </p>
                    <p className="text-[11px] text-amber-700">
                      Define isLegacySaipos=true e legacySystem=&quot;SAIPOS&quot; nos emitentes dos XMLs.
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3.5 rounded-xl bg-[#f3f7fe] border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={xmlCreateProductsStock}
                    onChange={(e) => setXmlCreateProductsStock(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                  <div>
                    <p className="text-xs font-bold text-gray-900">
                      Importar Produtos &amp; Lançar Entrada de Estoque
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Cadastra/atualiza produtos, soma quantidades e cria registro de StockEntry.
                    </p>
                  </div>
                </label>
              </div>

              {xmlFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900">
                      Pré-visualização do Lote: {xmlFiles.length} arquivo(s) ({xmlFiles.filter((f) => f.valid).length} válido(s))
                    </span>
                    <button
                      type="button"
                      onClick={handleExecuteImport}
                      disabled={importing || xmlFiles.filter((f) => f.valid).length === 0}
                      className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                    >
                      {importing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      <span>{importing ? "Processando XMLs..." : "Importar Lote XML"}</span>
                    </button>
                  </div>

                  <div className="max-h-72 overflow-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-[#f3f7fe] sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2 text-slate-600 font-semibold">Arquivo</th>
                          <th className="px-3 py-2 text-slate-600 font-semibold">NF</th>
                          <th className="px-3 py-2 text-slate-600 font-semibold">Fornecedor (Emitente)</th>
                          <th className="px-3 py-2 text-slate-600 font-semibold">CNPJ</th>
                          <th className="px-3 py-2 text-slate-600 font-semibold">Itens</th>
                          <th className="px-3 py-2 text-slate-600 font-semibold">Total NF</th>
                          <th className="px-3 py-2 text-slate-600 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {xmlFiles.map((xf, idx) => (
                          <tr key={`${xf.name}-${idx}`}>
                            <td className="px-3 py-2 font-mono text-slate-700">{xf.name}</td>
                            <td className="px-3 py-2 font-semibold">{xf.invoiceNum}</td>
                            <td className="px-3 py-2 text-gray-900">{xf.emitterName}</td>
                            <td className="px-3 py-2 font-mono text-slate-600">{xf.emitterCnpj}</td>
                            <td className="px-3 py-2 text-slate-600">{xf.itemsCount}</td>
                            <td className="px-3 py-2 font-semibold text-emerald-700">
                              R$ {xf.totalAmount.toFixed(2)}
                            </td>
                            <td className="px-3 py-2">
                              {xf.valid ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">
                                  Pronto
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold">
                                  {xf.error || "Inválido"}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resultado Detalhado da Importação */}
          {importResult && (
            <div
              className={`p-4 rounded-xl border space-y-2 ${
                importResult.success
                  ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                  : "bg-red-50/80 border-red-200 text-red-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold">
                  {importResult.success
                    ? "Importação Concluída no Banco da Empresa!"
                    : "Falha na Importação"}
                </h4>
                {importResult.stockEntryId && (
                  <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-emerald-200">
                    StockEntry: {importResult.stockEntryId.slice(0, 8)}
                  </span>
                )}
              </div>

              {importResult.error && <p className="text-xs font-semibold">{importResult.error}</p>}

              {importResult.success && importResult.kind !== "xml_batch" && (
                <div className="flex flex-wrap gap-4 text-xs font-semibold">
                  <span>Criados: {importResult.created ?? 0}</span>
                  <span>Atualizados: {importResult.updated ?? 0}</span>
                  {importResult.totalAmount !== undefined && (
                    <span>Valor Total Inventário: R$ {Number(importResult.totalAmount).toFixed(2)}</span>
                  )}
                  <span>Erros de linha: {importResult.errors?.length ?? 0}</span>
                </div>
              )}

              {importResult.success && importResult.kind === "xml_batch" && (
                <div className="flex flex-wrap gap-4 text-xs font-semibold">
                  <span>XMLs processados: {importResult.processedFiles}</span>
                  <span>Fornecedores criados: {importResult.suppliersCreated}</span>
                  <span>Fornecedores atualizados: {importResult.suppliersUpdated}</span>
                  <span>Produtos criados: {importResult.productsCreated}</span>
                  <span>Produtos atualizados: {importResult.productsUpdated}</span>
                  <span>Entradas de estoque: {importResult.stockEntriesCreated}</span>
                </div>
              )}

              {Array.isArray(importResult.warnings) && importResult.warnings.length > 0 && (
                <div className="pt-2 space-y-1">
                  <p className="text-xs font-bold text-amber-800">Avisos:</p>
                  <ul className="list-disc pl-5 text-[11px] text-amber-800 space-y-0.5 max-h-32 overflow-auto">
                    {importResult.warnings.map((w: string, idx: number) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(importResult.errors) && importResult.errors.length > 0 && (
                <div className="pt-2 space-y-1">
                  <p className="text-xs font-bold text-red-700">Erros detalhados:</p>
                  <ul className="list-disc pl-5 text-[11px] text-red-700 space-y-0.5 max-h-36 overflow-auto">
                    {importResult.errors.map((errMsg: string, idx: number) => (
                      <li key={idx}>{errMsg}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ABA 4: USUÁRIOS & SUPORTE RÁPIDO                                    */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "usuarios" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Criar Novo Usuário da Loja */}
          <div className="flex flex-col gap-5">
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex flex-col gap-3">
              <div>
                <h3 className="text-sm font-bold text-blue-950">Suporte Remoto Direto</h3>
                <p className="text-xs text-blue-700 mt-0.5">
                  Entre instantaneamente na sessão administrativa desta empresa cliente.
                </p>
              </div>
              <AccessTenantButton
                companyId={company.id}
                companyName={company.name}
                label={`Acessar Sistema (${company.name})`}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer"
              />
            </div>

            <form
              onSubmit={handleCreateUser}
              className="bg-[#fbfdff] border border-emerald-500/[0.08] rounded-xl p-5 space-y-3.5"
            >
              <div className="flex items-center gap-2">
                <Plus size={16} className="text-emerald-600" />
                <h3 className="text-sm font-bold text-gray-900">Novo Usuário da Loja</h3>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nome *</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Ex: Maria Operadora"
                  className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">E-mail *</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="maria@loja.com.br"
                  className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Senha *</label>
                  <input
                    type="text"
                    required
                    minLength={4}
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Mín. 4 caracteres"
                    className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    PIN PDV (opcional)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={newUserPin}
                    onChange={(e) => setNewUserPin(e.target.value)}
                    placeholder="Ex: 1234"
                    className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Perfil / Cargo</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#f3f7fe] border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newUserMobilePdv}
                  onChange={(e) => setNewUserMobilePdv(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
                <span className="text-xs font-semibold text-gray-800">
                  Liberar acesso ao PDV Mobile (pdv.mobile)
                </span>
              </label>

              <button
                type="submit"
                disabled={creatingUser}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
              >
                {creatingUser ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                <span>{creatingUser ? "Cadastrando..." : "Cadastrar Usuário"}</span>
              </button>
            </form>
          </div>

          {/* Lista de Usuários do Tenant */}
          <div className="lg:col-span-2 bg-[#fbfdff] border border-emerald-500/[0.08] rounded-xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-emerald-500/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-emerald-600" />
                <h3 className="text-sm font-bold text-gray-900">
                  Usuários da Loja ({users.length})
                </h3>
              </div>
            </div>

            {userFeedback && (
              <div
                className={`mx-5 mt-4 p-3 rounded-lg text-xs font-semibold border ${
                  userFeedback.type === "ok"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                {userFeedback.msg}
              </div>
            )}

            <div className="divide-y divide-emerald-500/[0.06]">
              {users.map((u) => {
                const isBusy = busyUserId === u.id;
                const isResetting = resettingUserId === u.id;

                return (
                  <div key={u.id} className="px-5 py-3.5 flex flex-col gap-2.5 hover:bg-emerald-500/[0.02]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-900 truncate">{u.name}</p>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {u.roleName || u.role}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              u.active
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            {u.active ? "Ativo" : "Bloqueado"}
                          </span>
                          {u.hasPin && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              PIN OK
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {u.email}
                          {u.lastLogin
                            ? ` • Último acesso: ${new Date(u.lastLogin).toLocaleString("pt-BR")}`
                            : " • Nunca acessou"}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggleUserMobilePdv(u.id, !u.allowMobilePdv)}
                          title="Alternar acesso ao PDV Mobile"
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border cursor-pointer transition-colors ${
                            u.allowMobilePdv
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <Smartphone size={12} />
                          <span>PDV Mobile: {u.allowMobilePdv ? "Sim" : "Não"}</span>
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            if (isResetting) {
                              setResettingUserId(null);
                            } else {
                              setResettingUserId(u.id);
                              setResetPasswordValue("123456");
                            }
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 cursor-pointer"
                        >
                          <KeyRound size={12} />
                          <span>Redefinir Senha</span>
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggleUserActive(u.id, !u.active)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                            u.active
                              ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                          }`}
                        >
                          <Power size={12} />
                          <span>{u.active ? "Desativar" : "Ativar"}</span>
                        </button>
                      </div>
                    </div>

                    {isResetting && (
                      <div className="flex flex-wrap items-center gap-2 p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg">
                        <span className="text-xs font-semibold text-amber-900">Nova senha:</span>
                        <input
                          type="text"
                          value={resetPasswordValue}
                          onChange={(e) => setResetPasswordValue(e.target.value)}
                          placeholder="Mínimo 4 caracteres"
                          className="px-2.5 py-1 bg-white border border-amber-300 rounded text-xs font-mono text-gray-900"
                        />
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleConfirmResetPassword(u.id)}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold cursor-pointer"
                        >
                          {isBusy ? "Salvando..." : "Confirmar Troca"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setResettingUserId(null)}
                          className="px-2.5 py-1 text-xs text-slate-600 hover:underline cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {users.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-10">
                  Nenhum usuário cadastrado nesta empresa ainda. Use o formulário ao lado para criar o primeiro acesso.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
