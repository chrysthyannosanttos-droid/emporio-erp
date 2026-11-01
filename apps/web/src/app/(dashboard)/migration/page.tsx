"use client";

import { useState } from "react";
import {
  FileSpreadsheet,
  Users,
  FileCode,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Download,
  FileText,
  Sparkles,
  HelpCircle,
  Table,
  Check,
  RefreshCw,
  Eye,
} from "lucide-react";
import {
  importSaiposProducts,
  importSaiposCustomers,
  importSaiposXmls,
  SaiposProductItem,
  SaiposCustomerItem,
} from "@/actions/migrationSaipos";

export default function MigrationSaiposPage() {
  const [activeTab, setActiveTab] = useState<"PRODUCTS" | "CUSTOMERS" | "XML">("PRODUCTS");

  // Estado Produtos
  const [productItems, setProductItems] = useState<SaiposProductItem[]>([]);
  const [productPasteText, setProductPasteText] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productResult, setProductResult] = useState<any>(null);

  // Estado Clientes
  const [customerItems, setCustomerItems] = useState<SaiposCustomerItem[]>([]);
  const [customerPasteText, setCustomerPasteText] = useState("");
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerResult, setCustomerResult] = useState<any>(null);

  // Estado XML
  const [xmlFiles, setXmlFiles] = useState<{ name: string; content: string }[]>([]);
  const [loadingXml, setLoadingXml] = useState(false);
  const [xmlResult, setXmlResult] = useState<any>(null);

  // ── Parseador de Produtos (CSV / TSV / Colar do Excel) ──
  const parseProductText = (rawText: string) => {
    const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return;

    const parsed: SaiposProductItem[] = [];
    // Detecta separador (tab ou ponto e vírgula ou vírgula)
    const firstLine = lines[0];
    const separator = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ",";

    // Header check
    let startIndex = 0;
    const headerLower = firstLine.toLowerCase();
    if (
      headerLower.includes("nome") ||
      headerLower.includes("produto") ||
      headerLower.includes("item") ||
      headerLower.includes("descri")
    ) {
      startIndex = 1;
    }

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(separator).map((p) => p.trim().replace(/^["']|["']$/g, ""));
      if (parts.length >= 2) {
        // Assume posições comuns da Saipos:
        // Coluna 0: Nome ou Código
        // Se Coluna 0 for numérica curta e Coluna 1 for texto, 0 é código e 1 é nome
        let name = parts[0];
        let priceStr = parts[1];
        let categoryName = parts[2] || "";
        let barcode = "";
        let cost = 0;

        if (/^\d+$/.test(parts[0]) && parts.length >= 3 && isNaN(Number(parts[1].replace(",", ".")))) {
          barcode = parts[0];
          name = parts[1];
          priceStr = parts[2];
          categoryName = parts[3] || "";
        }

        // Se encontrar coluna de código de barras longa (EAN 8..14)
        for (const col of parts) {
          if (/^\d{8,14}$/.test(col)) {
            barcode = col;
            break;
          }
        }

        // Limpa preço (ex: "R$ 15,90" -> 15.90)
        const cleanPrice = parseFloat(
          priceStr.replace("R$", "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
        );

        if (name && !isNaN(cleanPrice)) {
          parsed.push({
            name,
            price: cleanPrice,
            categoryName: categoryName || "Geral",
            barcode: barcode || undefined,
            stock: 0,
          });
        }
      }
    }

    setProductItems(parsed);
  };

  // ── Parseador de Clientes (CSV / TSV) ──
  const parseCustomerText = (rawText: string) => {
    const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return;

    const parsed: SaiposCustomerItem[] = [];
    const firstLine = lines[0];
    const separator = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ",";

    let startIndex = 0;
    if (
      firstLine.toLowerCase().includes("nome") ||
      firstLine.toLowerCase().includes("cliente") ||
      firstLine.toLowerCase().includes("telefone")
    ) {
      startIndex = 1;
    }

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(separator).map((p) => p.trim().replace(/^["']|["']$/g, ""));
      if (parts.length >= 1 && parts[0]) {
        const name = parts[0];
        let phone = parts[1] || "";
        let doc = parts[2] || "";
        let address = parts[3] || "";

        // Se a coluna 1 parece telefone
        if (/^\d{8,14}$/.test(parts[0].replace(/\D/g, "")) && isNaN(Number(parts[1]))) {
          phone = parts[0];
          parsed.push({ name: parts[1], phone, document: doc, address });
          continue;
        }

        parsed.push({
          name,
          phone,
          document: doc,
          address,
        });
      }
    }

    setCustomerItems(parsed);
  };

  // ── Handler de Upload de Arquivo de Produtos ──
  const handleProductFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setProductPasteText(text);
        parseProductText(text);
      }
    };
    reader.readAsText(file, "ISO-8859-1"); // Padrão comum de exportação Windows/Excel no Brasil
  };

  // ── Handler de Upload de Arquivo de Clientes ──
  const handleCustomerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setCustomerPasteText(text);
        parseCustomerText(text);
      }
    };
    reader.readAsText(file, "ISO-8859-1");
  };

  // ── Handler de Upload de XMLs Múltiplos ──
  const handleXmlFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const loadedXmls: { name: string; content: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.name.endsWith(".xml")) {
        const text = await f.text();
        loadedXmls.push({ name: f.name, content: text });
      }
    }

    setXmlFiles(loadedXmls);
  };

  // Executar importação de produtos
  const handleExecuteImportProducts = async () => {
    if (productItems.length === 0) return;
    setLoadingProducts(true);
    setProductResult(null);

    const res = await importSaiposProducts(productItems);
    setLoadingProducts(false);
    setProductResult(res);
  };

  // Executar importação de clientes
  const handleExecuteImportCustomers = async () => {
    if (customerItems.length === 0) return;
    setLoadingCustomers(true);
    setCustomerResult(null);

    const res = await importSaiposCustomers(customerItems);
    setLoadingCustomers(false);
    setCustomerResult(res);
  };

  // Executar importação de XMLs
  const handleExecuteImportXml = async () => {
    if (xmlFiles.length === 0) return;
    setLoadingXml(true);
    setXmlResult(null);

    const contents = xmlFiles.map((x) => x.content);
    const res = await importSaiposXmls(contents);
    setLoadingXml(false);
    setXmlResult(res);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      
      {/* ── HEADER ── */}
      <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-black rounded-full uppercase tracking-wider">
              Migração Automática
            </span>
            <span className="text-gray-400 text-xs">•</span>
            <span className="text-xs font-bold text-gray-500">De Saipos para CyberTech RP</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            Importador de Dados do Saipos
          </h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Transfira seu cardápio, produtos, clientes e notas fiscais do antigo sistema Saipos sem precisar cadastrar tudo manualmente um por um.
          </p>
        </div>

        {/* Link / Botão do Guia */}
        <a
          href="/manual-saipos.html"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-blue-500/20 transition-all cursor-pointer shrink-0"
        >
          <FileText size={16} />
          <span>Ver Passo a Passo Ilustrado (PDF)</span>
        </a>
      </div>

      {/* ── SELETOR DE ABAS ── */}
      <div className="flex gap-3 border-b border-gray-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("PRODUCTS")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "PRODUCTS"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          <FileSpreadsheet size={16} />
          <span>1. Produtos e Cardápio (Planilha / CSV)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("CUSTOMERS")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "CUSTOMERS"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          <Users size={16} />
          <span>2. Clientes e Delivery</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("XML")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "XML"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          <FileCode size={16} />
          <span>3. Notas Fiscais Emitidas (XMLs NFC-e)</span>
        </button>
      </div>

      {/* ═════════════════════════════════════════════════════════
          ABA 1: PRODUTOS E CARDÁPIO
      ═════════════════════════════════════════════════════════ */}
      {activeTab === "PRODUCTS" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-6">
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-900">Upload da Planilha de Produtos do Saipos</h2>
                <p className="text-xs text-gray-500">
                  Exporte no Saipos em: <strong>Cardápio ➔ Produtos ➔ Exportar Planilha</strong>.
                </p>
              </div>

              <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all cursor-pointer">
                <Upload size={14} />
                <span>Escolher Arquivo (.csv ou .xlsx)</span>
                <input
                  type="file"
                  accept=".csv,.txt,.tsv"
                  onChange={handleProductFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Alternativa: Colar direto do Excel */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Ou Cole aqui as linhas copiadas direto do Excel:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const sample =
                      "Cerveja Heineken Long Neck 330ml\t12.90\tBebidas\t7891991000803\nRefrigerante Coca-Cola Lata 350ml\t6.50\tBebidas\t7894900010015\nX-Bacon Especial Artesanal\t32.00\tLanches\t\nBatata Frita Rustica 400g\t24.90\tPorções\t";
                    setProductPasteText(sample);
                    parseProductText(sample);
                  }}
                  className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  Preencher com Exemplo de Teste
                </button>
              </div>

              <textarea
                rows={4}
                value={productPasteText}
                onChange={(e) => {
                  setProductPasteText(e.target.value);
                  parseProductText(e.target.value);
                }}
                placeholder="Exemplo copiado do Excel:&#10;Nome do Produto [TAB] Preço [TAB] Categoria [TAB] Código de Barras"
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs font-mono text-gray-800 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
              />
            </div>

            {/* Tabela de Pré-visualização */}
            {productItems.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-gray-100 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-gray-800">
                      Pré-visualização dos Itens Encontrados:
                    </span>
                    <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
                      {productItems.length} produtos prontos para cadastrar
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={loadingProducts}
                    onClick={handleExecuteImportProducts}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    {loadingProducts ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Cadastrando...</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>Confirmar &amp; Importar Todos os Produtos</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="border border-gray-200 rounded-2xl overflow-hidden max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-gray-50 sticky top-0 border-b border-gray-200 font-bold text-gray-600 uppercase tracking-wider">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Nome do Produto</th>
                        <th className="p-3">Categoria</th>
                        <th className="p-3">Código de Barras</th>
                        <th className="p-3 text-right">Preço de Venda</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                      {productItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                          <td className="p-3 text-gray-400 font-mono">{idx + 1}</td>
                          <td className="p-3 font-bold text-gray-900">{item.name}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-semibold text-[11px]">
                              {item.categoryName}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-gray-500">
                            {item.barcode || <span className="text-gray-300">Automático</span>}
                          </td>
                          <td className="p-3 text-right font-bold font-mono text-emerald-600">
                            R$ {item.price.toFixed(2).replace(".", ",")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Resultado da Importação */}
            {productResult && (
              <div
                className={`p-5 rounded-2xl border text-xs flex items-start gap-3 animate-in fade-in ${
                  productResult.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-red-50 border-red-200 text-red-900"
                }`}
              >
                {productResult.success ? (
                  <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <strong className="text-sm font-black block">
                    {productResult.success
                      ? "Importação de Produtos Concluída com Sucesso!"
                      : "Erro durante a importação"}
                  </strong>
                  {productResult.success ? (
                    <p className="mt-1 text-emerald-800">
                      ✓ <strong>{productResult.createdCount}</strong> novos produtos cadastrados no banco.
                      <br />
                      ✓ <strong>{productResult.updatedCount}</strong> produtos já existentes tiveram preços e categorias atualizados.
                      <br />
                      Todos já estão imediatamente disponíveis no <strong>PDV Caixa</strong> e no <strong>Estoque</strong>!
                    </p>
                  ) : (
                    <p className="mt-1 text-red-800">{productResult.error}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════
          ABA 2: CLIENTES
      ═════════════════════════════════════════════════════════ */}
      {activeTab === "CUSTOMERS" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-6">
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-900">Upload da Base de Clientes do Saipos</h2>
                <p className="text-xs text-gray-500">
                  Exporte no Saipos em: <strong>Clientes ➔ Exportar Clientes (Excel / CSV)</strong>.
                </p>
              </div>

              <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all cursor-pointer">
                <Upload size={14} />
                <span>Escolher Arquivo de Clientes</span>
                <input
                  type="file"
                  accept=".csv,.txt,.tsv"
                  onChange={handleCustomerFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Ou Cole aqui as linhas copiadas do Excel de Clientes:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const sample =
                      "Maria Silva\t11987654321\t123.456.789-00\tRua das Flores, 120 - Centro\nJoão Santos\t11999887766\t987.654.321-99\tAv. Paulista, 1000 - Bela Vista";
                    setCustomerPasteText(sample);
                    parseCustomerText(sample);
                  }}
                  className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  Preencher com Exemplo de Teste
                </button>
              </div>

              <textarea
                rows={4}
                value={customerPasteText}
                onChange={(e) => {
                  setCustomerPasteText(e.target.value);
                  parseCustomerText(e.target.value);
                }}
                placeholder="Nome do Cliente [TAB] WhatsApp/Telefone [TAB] CPF [TAB] Endereço Completo"
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs font-mono text-gray-800 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
              />
            </div>

            {customerItems.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-gray-100 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-gray-800">
                      Clientes Detectados:
                    </span>
                    <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
                      {customerItems.length} clientes
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={loadingCustomers}
                    onClick={handleExecuteImportCustomers}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    {loadingCustomers ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Cadastrando...</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>Cadastrar Base de Clientes</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="border border-gray-200 rounded-2xl overflow-hidden max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-gray-50 sticky top-0 border-b border-gray-200 font-bold text-gray-600 uppercase tracking-wider">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Nome</th>
                        <th className="p-3">Telefone / WhatsApp</th>
                        <th className="p-3">CPF</th>
                        <th className="p-3">Endereço</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                      {customerItems.map((c, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                          <td className="p-3 text-gray-400 font-mono">{idx + 1}</td>
                          <td className="p-3 font-bold text-gray-900">{c.name}</td>
                          <td className="p-3 font-mono text-blue-600 font-bold">{c.phone || "-"}</td>
                          <td className="p-3 font-mono text-gray-500">{c.document || "-"}</td>
                          <td className="p-3 text-gray-600 truncate max-w-xs">{c.address || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {customerResult && (
              <div
                className={`p-5 rounded-2xl border text-xs flex items-start gap-3 animate-in fade-in ${
                  customerResult.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-red-50 border-red-200 text-red-900"
                }`}
              >
                {customerResult.success ? (
                  <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <strong className="text-sm font-black block">
                    {customerResult.success
                      ? "Clientes Importados com Sucesso!"
                      : "Erro durante a importação"}
                  </strong>
                  {customerResult.success && (
                    <p className="mt-1 text-emerald-800">
                      ✓ <strong>{customerResult.createdCount}</strong> clientes cadastrados.
                      <br />
                      ✓ <strong>{customerResult.updatedCount}</strong> clientes atualizados.
                      <br />
                      A busca de clientes no <strong>PDV Caixa (F8)</strong> já reconhecerá todos esses cadastros.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════
          ABA 3: XMLS DE NOTAS FISCAIS
      ═════════════════════════════════════════════════════════ */}
      {activeTab === "XML" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-6">
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-900">
                  Extração Automática por XMLs Fiscais da Saipos
                </h2>
                <p className="text-xs text-gray-500">
                  Baixe os arquivos XML emitidos no Saipos em: <strong>Fiscal ➔ Notas Emitidas ➔ Baixar XMLs</strong>.
                </p>
              </div>

              <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all cursor-pointer">
                <Upload size={14} />
                <span>Selecionar Arquivos .XML (Múltiplos)</span>
                <input
                  type="file"
                  multiple
                  accept=".xml"
                  onChange={handleXmlFilesUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-start gap-3">
              <Sparkles size={18} className="text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Por que o XML é a forma mais recomendada?</strong>
                <p className="mt-0.5 text-blue-800">
                  O XML da NFC-e/NF-e contém os dados fiscais exatos que foram validados pela Receita Estadual: Código de Barras EAN oficial, NCM, Unidade Comercial e Preço Praticado.
                </p>
              </div>
            </div>

            {xmlFiles.length > 0 && (
              <div className="space-y-4 pt-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700">
                    <strong>{xmlFiles.length}</strong> arquivos XML selecionados prontos para leitura.
                  </span>

                  <button
                    type="button"
                    disabled={loadingXml}
                    onClick={handleExecuteImportXml}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    {loadingXml ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Extraindo Produtos...</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>Extrair e Cadastrar Produtos dos XMLs</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {xmlResult && (
              <div
                className={`p-5 rounded-2xl border text-xs flex items-start gap-3 animate-in fade-in ${
                  xmlResult.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-red-50 border-red-200 text-red-900"
                }`}
              >
                {xmlResult.success ? (
                  <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <strong className="text-sm font-black block">
                    {xmlResult.success
                      ? "Produtos Extraídos e Cadastrados com Sucesso!"
                      : "Erro ao processar XMLs"}
                  </strong>
                  {xmlResult.success && (
                    <p className="mt-1 text-emerald-800">
                      ✓ <strong>{xmlResult.createdCount}</strong> produtos novos adicionados.
                      <br />
                      ✓ <strong>{xmlResult.updatedCount}</strong> produtos existentes atualizados com código NCM e EAN.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

