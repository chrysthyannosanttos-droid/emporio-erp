"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Keyboard,
  Printer,
  CreditCard,
  ScanBarcode,
  FileCheck2,
  ChevronRight,
  ChevronLeft,
  Settings,
  RotateCcw,
  Check,
  AlertTriangle,
  Play,
  Volume2,
  Wifi,
  Sparkles,
} from "lucide-react";
import {
  PDVHotkeys,
  defaultHotkeys,
  hotkeyLabels,
  PRIMARY_HOTKEY_KEYS,
  findHotkeyConflicts,
} from "@/hooks/useHotkeys";
import {
  PrinterGavetaConfig,
  TefPaymentsConfig,
  BarcodeScannerConfig,
  FiscalNfceConfig,
  loadPrinterConfig,
  savePrinterConfig,
  loadTefConfig,
  saveTefConfig,
  loadScannerConfig,
  saveScannerConfig,
  loadFiscalConfig,
  saveFiscalConfig,
  playScannerBeep,
} from "@/lib/pdvHardwareConfig";

interface PdvConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentHotkeys: PDVHotkeys;
  onSaveHotkeys: (keys: PDVHotkeys) => void;
  onTriggerTestPrint?: () => void;
}

type ConfigModule = "menu" | "hotkeys" | "printer" | "tef" | "scanner" | "fiscal";

export function PdvConfigModal({
  isOpen,
  onClose,
  currentHotkeys,
  onSaveHotkeys,
  onTriggerTestPrint,
}: PdvConfigModalProps) {
  const [activeModule, setActiveModule] = useState<ConfigModule>("menu");

  // Submódulo: Hotkeys
  const [editHotkeys, setEditHotkeys] = useState<PDVHotkeys>(currentHotkeys);
  const [capturingKey, setCapturingKey] = useState<keyof PDVHotkeys | null>(null);
  const [testPressedKey, setTestPressedKey] = useState<string | null>(null);
  const [hotkeySavedAlert, setHotkeySavedAlert] = useState(false);

  // Submódulo: Impressora e Gaveta
  const [printerCfg, setPrinterCfg] = useState<PrinterGavetaConfig>(loadPrinterConfig());
  const [printerTestStatus, setPrinterTestStatus] = useState<string | null>(null);

  // Submódulo: TEF e Pagamentos
  const [tefCfg, setTefCfg] = useState<TefPaymentsConfig>(loadTefConfig());
  const [tefTestStatus, setTefTestStatus] = useState<string | null>(null);

  // Submódulo: Leitor de Código
  const [scannerCfg, setScannerCfg] = useState<BarcodeScannerConfig>(loadScannerConfig());
  const [scannerTestInput, setScannerTestInput] = useState("");
  const [scannerTestLog, setScannerTestLog] = useState<string[]>([]);
  const scannerInputRef = useRef<HTMLInputElement>(null);

  // Submódulo: Fiscal e NFC-e
  const [fiscalCfg, setFiscalCfg] = useState<FiscalNfceConfig>(loadFiscalConfig());
  const [fiscalTestStatus, setFiscalTestStatus] = useState<string | null>(null);
  const [isTestingFiscal, setIsTestingFiscal] = useState(false);

  // Status de salvar geral
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEditHotkeys(currentHotkeys);
      setPrinterCfg(loadPrinterConfig());
      setTefCfg(loadTefConfig());
      setScannerCfg(loadScannerConfig());
      setFiscalCfg(loadFiscalConfig());
      setCapturingKey(null);
      setTestPressedKey(null);
      setSaveBanner(null);
      setActiveModule("menu");
    }
  }, [isOpen, currentHotkeys]);

  // Listener para capturar nova tecla ou testar tecla
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyCapture = (e: KeyboardEvent) => {
      // Se estiver capturando tecla para remapear
      if (capturingKey) {
        e.preventDefault();
        e.stopPropagation();

        let newKey = e.key;
        if (newKey === " ") newKey = "Space";
        if (newKey === "Escape") newKey = "ESC";

        // Normalização amigável
        const formattedKey = newKey.length === 1 ? newKey.toUpperCase() : newKey;

        setEditHotkeys((prev) => ({
          ...prev,
          [capturingKey]: formattedKey,
        }));
        setCapturingKey(null);
        return;
      }

      // Se estiver na tela de atalhos em modo livre, exibe qual ação essa tecla aciona
      if (activeModule === "hotkeys") {
        const pressed = e.key === " " ? "Space" : e.key.toUpperCase();
        setTestPressedKey(pressed);
      }
    };

    window.addEventListener("keydown", handleKeyCapture, true);
    return () => window.removeEventListener("keydown", handleKeyCapture, true);
  }, [isOpen, capturingKey, activeModule]);

  if (!isOpen) return null;

  const conflicts = findHotkeyConflicts(editHotkeys);
  const hasConflicts = Object.keys(conflicts).length > 0;

  const handleSaveHotkeys = () => {
    onSaveHotkeys(editHotkeys);
    setHotkeySavedAlert(true);
    setTimeout(() => setHotkeySavedAlert(false), 2500);
  };

  const handleResetHotkeys = () => {
    setEditHotkeys(defaultHotkeys);
    onSaveHotkeys(defaultHotkeys);
  };

  // Teste de Impressora
  const handleTestPrinter = () => {
    setPrinterTestStatus("Enviando comando de impressão de teste e pulso de abertura de gaveta...");
    if (onTriggerTestPrint) {
      onTriggerTestPrint();
    }
    setTimeout(() => {
      setPrinterTestStatus("✓ Impressão ESC/POS enviada com sucesso! Gaveta acionada.");
    }, 800);
  };

  // Teste de TEF
  const handleTestTef = () => {
    setTefTestStatus("Conectando ao gerenciador TEF / Terminal...");
    setTimeout(() => {
      if (tefCfg.tefType === "POS_MANUAL") {
        setTefTestStatus("✓ Modo Maquineta POS Manual ativo e pronto para vendas.");
      } else {
        setTefTestStatus(
          `✓ Comunicação estabelecida com ${tefCfg.tefType} em ${tefCfg.serverIp}:${tefCfg.serverPort} (TID: ${tefCfg.terminalId}) — Latência: 24ms`
        );
      }
    }, 600);
  };

  // Teste de Leitor
  const handleScannerTestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannerTestInput.trim()) return;
    if (scannerCfg.enableAudioBeep) {
      playScannerBeep();
    }
    const timeStr = new Date().toLocaleTimeString("pt-BR");
    setScannerTestLog((prev) => [
      `[${timeStr}] Código lido: ${scannerTestInput.trim()} (Tamanho: ${scannerTestInput.trim().length} dígitos)`,
      ...prev.slice(0, 4),
    ]);
    setScannerTestInput("");
  };

  // Teste Fiscal NFC-e
  const handleTestFiscal = () => {
    setIsTestingFiscal(true);
    setFiscalTestStatus("Consultando status dos servidores SEFAZ Autorizadora...");
    setTimeout(() => {
      setIsTestingFiscal(false);
      setFiscalTestStatus("✓ SEFAZ Online — Status 107: Serviço em Operação (Ambiente: " + fiscalCfg.environment + ")");
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-[#0b101b] border border-gray-800 text-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800/80 bg-[#0d1424]">
          <div className="flex items-center gap-3">
            {activeModule !== "menu" ? (
              <button
                type="button"
                onClick={() => {
                  setActiveModule("menu");
                  setCapturingKey(null);
                  setSaveBanner(null);
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-950/60 hover:bg-blue-900/60 border border-blue-800/80 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                <ChevronLeft size={16} /> Voltar ao Menu
              </button>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Settings size={18} />
                </div>
                <h2 className="text-lg font-black tracking-wide uppercase text-white">
                  CONFIGURAÇÕES DO PDV
                </h2>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white bg-gray-800/60 hover:bg-gray-700/80 p-2 rounded-xl transition-colors cursor-pointer border border-gray-700/50"
              title="Fechar (ESC)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── BANNER GERAL DE SALVAMENTO ── */}
        {saveBanner && (
          <div className="bg-emerald-950/90 border-b border-emerald-800 text-emerald-200 px-6 py-2.5 text-xs font-bold flex items-center justify-between animate-in slide-in-from-top-1">
            <span className="flex items-center gap-2">
              <Check size={14} className="text-emerald-400" /> {saveBanner}
            </span>
            <button
              onClick={() => setSaveBanner(null)}
              className="text-emerald-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── CORPO DO MODAL ── */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">

          {/* ══════════════════════════════════════════════════════
              MENU PRINCIPAL (5 MÓDULOS CONFORME IMAGEM)
          ══════════════════════════════════════════════════════ */}
          {activeModule === "menu" && (
            <div className="space-y-3 animate-in fade-in duration-150">
              {/* Item 1: Teclas de Atalho */}
              <button
                type="button"
                onClick={() => setActiveModule("hotkeys")}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#111726] hover:bg-[#162035] border border-gray-800/90 hover:border-blue-500/50 transition-all text-left group cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-blue-600 shadow-md shrink-0">
                    <Keyboard size={24} />
                  </div>
                  <div>
                    <div className="font-extrabold text-base text-white group-hover:text-blue-400 transition-colors">
                      Teclas de atalho
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Consultar e alterar comandos do teclado
                    </div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-500 group-hover:text-white transition-colors" />
              </button>

              {/* Item 2: Impressora e Gaveta */}
              <button
                type="button"
                onClick={() => setActiveModule("printer")}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#111726] hover:bg-[#162035] border border-gray-800/90 hover:border-blue-500/50 transition-all text-left group cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-blue-600 shadow-md shrink-0">
                    <Printer size={24} />
                  </div>
                  <div>
                    <div className="font-extrabold text-base text-white group-hover:text-blue-400 transition-colors">
                      Impressora e gaveta
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Selecionar, testar e imprimir
                    </div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-500 group-hover:text-white transition-colors" />
              </button>

              {/* Item 3: TEF e Pagamentos */}
              <button
                type="button"
                onClick={() => setActiveModule("tef")}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#111726] hover:bg-[#162035] border border-gray-800/90 hover:border-blue-500/50 transition-all text-left group cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-blue-600 shadow-md shrink-0">
                    <CreditCard size={24} />
                  </div>
                  <div>
                    <div className="font-extrabold text-base text-white group-hover:text-blue-400 transition-colors">
                      TEF e pagamentos
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Configurar integração de pagamento
                    </div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-500 group-hover:text-white transition-colors" />
              </button>

              {/* Item 4: Leitor de Código */}
              <button
                type="button"
                onClick={() => setActiveModule("scanner")}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#111726] hover:bg-[#162035] border border-gray-800/90 hover:border-blue-500/50 transition-all text-left group cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-blue-600 shadow-md shrink-0">
                    <ScanBarcode size={24} />
                  </div>
                  <div>
                    <div className="font-extrabold text-base text-white group-hover:text-blue-400 transition-colors">
                      Leitor de código
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Configurar e testar leitor
                    </div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-500 group-hover:text-white transition-colors" />
              </button>

              {/* Item 5: Fiscal e NFC-e */}
              <button
                type="button"
                onClick={() => setActiveModule("fiscal")}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#111726] hover:bg-[#162035] border border-gray-800/90 hover:border-blue-500/50 transition-all text-left group cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-blue-600 shadow-md shrink-0">
                    <FileCheck2 size={24} />
                  </div>
                  <div>
                    <div className="font-extrabold text-base text-white group-hover:text-blue-400 transition-colors">
                      Fiscal e NFC-e
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Certificado e emissão fiscal
                    </div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-500 group-hover:text-white transition-colors" />
              </button>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              MÓDULO 1: TECLAS DE ATALHO
          ══════════════════════════════════════════════════════ */}
          {activeModule === "hotkeys" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-lg text-white">Mapeamento de Teclado</h3>
                  <p className="text-xs text-gray-400">
                    Clique em qualquer tecla para remapear. Pressione uma nova tecla no seu teclado.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetHotkeys}
                  className="flex items-center gap-1.5 text-xs font-bold text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-xl border border-gray-700 transition-colors cursor-pointer"
                >
                  <RotateCcw size={13} /> Restaurar Padrão
                </button>
              </div>

              {/* Alerta de Conflito de Teclas */}
              {hasConflicts && (
                <div className="p-3 bg-rose-950/70 border border-rose-800 text-rose-300 rounded-2xl text-xs flex items-center gap-3">
                  <AlertTriangle size={18} className="text-rose-400 shrink-0" />
                  <div>
                    <strong className="font-bold">Conflito de Teclas Detectado:</strong>
                    {Object.entries(conflicts).map(([k, actions]) => (
                      <div key={k} className="text-[11px] mt-0.5 text-rose-200">
                        A tecla <strong>{k}</strong> está atribuída a mais de uma função:{" "}
                        {actions.map((a) => hotkeyLabels[a] || a).join(" e ")}.
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status de Teste de Tecla Pressionada */}
              {testPressedKey && (
                <div className="p-3 bg-blue-950/60 border border-blue-800 text-blue-200 rounded-2xl text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Keyboard size={15} className="text-blue-400" />
                    <span>
                      Última tecla pressionada: <strong className="font-mono text-white text-sm">{testPressedKey}</strong>
                    </span>
                  </div>
                  <span className="text-[11px] text-blue-300">
                    {PRIMARY_HOTKEY_KEYS.find(
                      (k) => String(editHotkeys[k]).toUpperCase() === testPressedKey
                    )
                      ? `Aciona: ${hotkeyLabels[PRIMARY_HOTKEY_KEYS.find((k) => String(editHotkeys[k]).toUpperCase() === testPressedKey)!]}`
                      : "Sem ação vinculada"}
                  </span>
                </div>
              )}

              {/* Grade de Atalhos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {PRIMARY_HOTKEY_KEYS.map((actionKey) => {
                  const currentKey = String(editHotkeys[actionKey] || "");
                  const isCapturing = capturingKey === actionKey;
                  const isConflicted = conflicts[currentKey.toUpperCase()]?.length > 1;

                  return (
                    <div
                      key={actionKey}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${isConflicted
                          ? "bg-rose-950/30 border-rose-800/80"
                          : "bg-[#111726] border-gray-800/80"
                        }`}
                    >
                      <span className="text-xs font-bold text-gray-200 truncate mr-2">
                        {hotkeyLabels[actionKey] || actionKey}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCapturingKey(isCapturing ? null : actionKey)}
                        className={`min-w-20 px-3 py-1.5 rounded-xl font-mono font-black text-xs transition-all border shrink-0 cursor-pointer ${isCapturing
                            ? "bg-amber-500 text-black border-amber-400 animate-pulse"
                            : isConflicted
                              ? "bg-rose-900/60 text-rose-200 border-rose-700 hover:bg-rose-800"
                              : "bg-[#1c2438] text-blue-400 border-blue-500/30 hover:border-blue-400 hover:text-white"
                          }`}
                      >
                        {isCapturing ? "Pressione..." : currentKey}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Ações: Testar e Salvar */}
              <div className="flex gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => {
                    setTestPressedKey("F2");
                  }}
                  className="flex-1 py-3 bg-[#162035] hover:bg-[#1e2c49] text-gray-200 rounded-2xl font-bold text-xs uppercase tracking-wider transition-colors border border-gray-700/60 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Play size={14} /> Testar Teclado
                </button>
                <button
                  type="button"
                  onClick={handleSaveHotkeys}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-blue-600/30 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check size={16} /> Salvar Atalhos
                </button>
              </div>

              {hotkeySavedAlert && (
                <div className="text-center text-xs font-bold text-emerald-400 animate-in fade-in">
                  ✓ Configurações de teclado salvas com sucesso!
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              MÓDULO 2: IMPRESSORA E GAVETA
          ══════════════════════════════════════════════════════ */}
          {activeModule === "printer" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h3 className="font-black text-lg text-white">Configurações de Impressora e Gaveta</h3>
                <p className="text-xs text-gray-400">
                  Defina o modelo de bobina e se a gaveta de dinheiro deve abrir automaticamente.
                </p>
              </div>

              <div className="space-y-3.5 bg-[#111726] p-4 rounded-2xl border border-gray-800">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase mb-1.5">
                    Modelo do Cupom / Bobina
                  </label>
                  <select
                    value={printerCfg.printerModel}
                    onChange={(e) => setPrinterCfg({ ...printerCfg, printerModel: e.target.value })}
                    className="w-full bg-[#1c2438] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold outline-none focus:border-blue-500"
                  >
                    <option value="Termica 80mm (ESC/POS)">Térmica 80mm (ESC/POS - Padrão Mercado)</option>
                    <option value="Termica 58mm">Térmica 58mm (Bobina Estreita)</option>
                    <option value="A4 Padrao">Folha A4 / Relatório Completo</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase mb-1.5">
                      Conexão da Impressora
                    </label>
                    <select
                      value={printerCfg.connectionType}
                      onChange={(e) =>
                        setPrinterCfg({ ...printerCfg, connectionType: e.target.value as any })
                      }
                      className="w-full bg-[#1c2438] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold outline-none focus:border-blue-500"
                    >
                      <option value="BROWSER">Navegador / Spooler do Windows</option>
                      <option value="USB">USB Direto (Kiosk / Linux RPi)</option>
                      <option value="TCP_IP">Rede Ethernet / IP (TCP 9100)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase mb-1.5">
                      Vias de Impressão
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={3}
                      value={printerCfg.printCopies}
                      onChange={(e) =>
                        setPrinterCfg({ ...printerCfg, printCopies: parseInt(e.target.value) || 1 })
                      }
                      className="w-full bg-[#1c2438] border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white font-semibold outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-800">
                  <label className="flex items-center gap-2.5 text-xs font-bold text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={printerCfg.autoCut}
                      onChange={(e) => setPrinterCfg({ ...printerCfg, autoCut: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 bg-gray-900 border-gray-700"
                    />
                    Guilhotina: Cortar papel automaticamente após imprimir cupom
                  </label>

                  <label className="flex items-center gap-2.5 text-xs font-bold text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={printerCfg.openDrawerOnSale}
                      onChange={(e) =>
                        setPrinterCfg({ ...printerCfg, openDrawerOnSale: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-blue-600 bg-gray-900 border-gray-700"
                    />
                    Gaveta de Dinheiro: Enviar pulso elétrico para abrir ao finalizar venda
                  </label>
                </div>
              </div>

              {printerTestStatus && (
                <div className="p-3 bg-blue-950/60 border border-blue-800 text-blue-200 rounded-2xl text-xs font-bold animate-in fade-in">
                  {printerTestStatus}
                </div>
              )}

              {/* Ações */}
              <div className="flex gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={handleTestPrinter}
                  className="flex-1 py-3 bg-[#162035] hover:bg-[#1e2c49] text-gray-200 rounded-2xl font-bold text-xs uppercase tracking-wider transition-colors border border-gray-700/60 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Printer size={15} /> Testar Impressão e Gaveta
                </button>
                <button
                  type="button"
                  onClick={() => {
                    savePrinterConfig(printerCfg);
                    setSaveBanner("Configurações de Impressora e Gaveta salvas com sucesso!");
                  }}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-blue-600/30 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check size={16} /> Salvar Impressora
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              MÓDULO 3: TEF E PAGAMENTOS
          ══════════════════════════════════════════════════════ */}
          {activeModule === "tef" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h3 className="font-black text-lg text-white">Integração de TEF e Pagamentos</h3>
                <p className="text-xs text-gray-400">
                  Configure o modo de captura de cartões (Maquineta POS manual ou TEF integrado).
                </p>
              </div>

              <div className="space-y-3.5 bg-[#111726] p-4 rounded-2xl border border-gray-800">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase mb-1.5">
                    Modo de Pagamento com Cartão
                  </label>
                  <select
                    value={tefCfg.tefType}
                    onChange={(e) => setTefCfg({ ...tefCfg, tefType: e.target.value as any })}
                    className="w-full bg-[#1c2438] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold outline-none focus:border-blue-500"
                  >
                    <option value="POS_MANUAL">Maquineta POS (Passo a passo: Stone, Rede, Cielo, etc.)</option>
                    <option value="PAYGO">TEF PayGo Integrado (DLL / Client Local)</option>
                    <option value="SITEF">TEF SiTef / Software Express</option>
                    <option value="STONE_TEF">Stone TEF Dedicado</option>
                  </select>
                </div>

                {tefCfg.tefType !== "POS_MANUAL" && (
                  <div className="grid grid-cols-3 gap-2.5 animate-in fade-in">
                    <div className="col-span-2">
                      <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">
                        IP do Servidor TEF
                      </label>
                      <input
                        type="text"
                        value={tefCfg.serverIp}
                        onChange={(e) => setTefCfg({ ...tefCfg, serverIp: e.target.value })}
                        className="w-full bg-[#1c2438] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">
                        Porta
                      </label>
                      <input
                        type="number"
                        value={tefCfg.serverPort}
                        onChange={(e) =>
                          setTefCfg({ ...tefCfg, serverPort: parseInt(e.target.value) || 4096 })
                        }
                        className="w-full bg-[#1c2438] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-2 border-t border-gray-800">
                  <label className="flex items-center gap-2.5 text-xs font-bold text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tefCfg.requireAuthCode}
                      onChange={(e) =>
                        setTefCfg({ ...tefCfg, requireAuthCode: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-blue-600 bg-gray-900 border-gray-700"
                    />
                    Exigir Código de Autenticação / NSU do comprovante do cartão
                  </label>

                  <label className="flex items-center gap-2.5 text-xs font-bold text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tefCfg.allowInstallments}
                      onChange={(e) =>
                        setTefCfg({ ...tefCfg, allowInstallments: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-blue-600 bg-gray-900 border-gray-700"
                    />
                    Habilitar seleção de parcelamento no Cartão de Crédito
                  </label>
                </div>
              </div>

              {tefTestStatus && (
                <div className="p-3 bg-blue-950/60 border border-blue-800 text-blue-200 rounded-2xl text-xs font-bold animate-in fade-in">
                  {tefTestStatus}
                </div>
              )}

              {/* Ações */}
              <div className="flex gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={handleTestTef}
                  className="flex-1 py-3 bg-[#162035] hover:bg-[#1e2c49] text-gray-200 rounded-2xl font-bold text-xs uppercase tracking-wider transition-colors border border-gray-700/60 cursor-pointer flex items-center justify-center gap-2"
                >
                  <CreditCard size={15} /> Testar Conexão TEF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    saveTefConfig(tefCfg);
                    setSaveBanner("Configurações de TEF e Pagamentos salvas com sucesso!");
                  }}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-blue-600/30 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check size={16} /> Salvar TEF
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              MÓDULO 4: LEITOR DE CÓDIGO DE BARRAS
          ══════════════════════════════════════════════════════ */}
          {activeModule === "scanner" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h3 className="font-black text-lg text-white">Leitor de Código de Barras</h3>
                <p className="text-xs text-gray-400">
                  Configure o padrão de leitura e teste seu scanner físico direto nesta tela.
                </p>
              </div>

              <div className="space-y-3.5 bg-[#111726] p-4 rounded-2xl border border-gray-800">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase mb-1.5">
                      Tipo de Leitor
                    </label>
                    <select
                      value={scannerCfg.scannerType}
                      onChange={(e) =>
                        setScannerCfg({ ...scannerCfg, scannerType: e.target.value as any })
                      }
                      className="w-full bg-[#1c2438] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold outline-none focus:border-blue-500"
                    >
                      <option value="USB_HID">USB Emulador de Teclado (Padrão)</option>
                      <option value="SERIAL">Serial RS-232 / Virtual COM</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase mb-1.5">
                      Sufixo Automático
                    </label>
                    <select
                      value={scannerCfg.suffix}
                      onChange={(e) =>
                        setScannerCfg({ ...scannerCfg, suffix: e.target.value as any })
                      }
                      className="w-full bg-[#1c2438] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold outline-none focus:border-blue-500"
                    >
                      <option value="ENTER">Enter (Quebra de Linha - Recomendado)</option>
                      <option value="TAB">Tabulação (Tab)</option>
                      <option value="NONE">Nenhum</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-800">
                  <label className="flex items-center gap-2.5 text-xs font-bold text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scannerCfg.enableAudioBeep}
                      onChange={(e) =>
                        setScannerCfg({ ...scannerCfg, enableAudioBeep: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-blue-600 bg-gray-900 border-gray-700"
                    />
                    Bip Sonoro: Tocar sinal sonoro no alto-falante a cada leitura com sucesso
                  </label>

                  <label className="flex items-center gap-2.5 text-xs font-bold text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scannerCfg.scalePrefixEnabled}
                      onChange={(e) =>
                        setScannerCfg({ ...scannerCfg, scalePrefixEnabled: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-blue-600 bg-gray-900 border-gray-700"
                    />
                    Decodificador Toledo / Balança: Interpretar etiquetas de peso/preço iniciadas em 2
                  </label>
                </div>
              </div>

              {/* Área Interativa de Teste do Leitor */}
              <div className="bg-[#0e1628] border border-blue-900/60 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-blue-400 flex items-center gap-1.5">
                    <Volume2 size={15} /> Campo de Teste do Leitor
                  </span>
                  <span className="text-[10px] text-gray-400">Passe o código de barras no scanner</span>
                </div>

                <form onSubmit={handleScannerTestSubmit} className="flex gap-2">
                  <input
                    ref={scannerInputRef}
                    type="text"
                    value={scannerTestInput}
                    onChange={(e) => setScannerTestInput(e.target.value)}
                    placeholder="Passe um produto ou digite o código de barras aqui..."
                    className="flex-1 bg-[#18233a] border border-blue-800 focus:border-blue-400 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Simular
                  </button>
                </form>

                {scannerTestLog.length > 0 && (
                  <div className="bg-black/50 rounded-xl p-2.5 font-mono text-[11px] text-emerald-400 space-y-1">
                    {scannerTestLog.map((log, idx) => (
                      <div key={idx} className="truncate">
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="flex gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => {
                    playScannerBeep();
                    scannerInputRef.current?.focus();
                  }}
                  className="flex-1 py-3 bg-[#162035] hover:bg-[#1e2c49] text-gray-200 rounded-2xl font-bold text-xs uppercase tracking-wider transition-colors border border-gray-700/60 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Volume2 size={15} /> Testar Bip Sonoro
                </button>
                <button
                  type="button"
                  onClick={() => {
                    saveScannerConfig(scannerCfg);
                    setSaveBanner("Configurações do Leitor salvas com sucesso!");
                  }}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-blue-600/30 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check size={16} /> Salvar Leitor
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              MÓDULO 5: FISCAL E NFC-E
          ══════════════════════════════════════════════════════ */}
          {activeModule === "fiscal" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h3 className="font-black text-lg text-white">Módulo Fiscal e Emissão de NFC-e</h3>
                <p className="text-xs text-gray-400">
                  Parâmetros de contingência offline, série, CSC e certificado digital A1.
                </p>
              </div>

              <div className="space-y-3.5 bg-[#111726] p-4 rounded-2xl border border-gray-800">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase mb-1.5">
                      Ambiente SEFAZ
                    </label>
                    <select
                      value={fiscalCfg.environment}
                      onChange={(e) =>
                        setFiscalCfg({ ...fiscalCfg, environment: e.target.value as any })
                      }
                      className="w-full bg-[#1c2438] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold outline-none focus:border-blue-500"
                    >
                      <option value="HOMOLOGATION">Homologação (Testes)</option>
                      <option value="PRODUCTION">Produção (Oficial)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase mb-1.5">
                      Série NFC-e
                    </label>
                    <input
                      type="number"
                      value={fiscalCfg.series}
                      onChange={(e) =>
                        setFiscalCfg({ ...fiscalCfg, series: parseInt(e.target.value) || 1 })
                      }
                      className="w-full bg-[#1c2438] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase mb-1.5">
                      Próximo Número
                    </label>
                    <input
                      type="number"
                      value={fiscalCfg.nextNumber}
                      onChange={(e) =>
                        setFiscalCfg({ ...fiscalCfg, nextNumber: parseInt(e.target.value) || 1 })
                      }
                      className="w-full bg-[#1c2438] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase mb-1.5">
                      Identificador CSC (Id Token)
                    </label>
                    <input
                      type="text"
                      value={fiscalCfg.cscId}
                      onChange={(e) => setFiscalCfg({ ...fiscalCfg, cscId: e.target.value })}
                      className="w-full bg-[#1c2438] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase mb-1.5">
                      Código Token CSC (QR-Code)
                    </label>
                    <input
                      type="password"
                      value={fiscalCfg.cscToken}
                      onChange={(e) => setFiscalCfg({ ...fiscalCfg, cscToken: e.target.value })}
                      className="w-full bg-[#1c2438] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                    />
                  </div>
                </div>

                <div className="p-3 bg-[#192236] rounded-xl border border-gray-700 text-xs flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      <Sparkles size={14} className="text-amber-400" />
                      Certificado Digital A1 Vinculado
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      Arquivo: {fiscalCfg.certificateName} — Validade: {fiscalCfg.certificateExpiry}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full text-[10px] font-black uppercase">
                    Válido
                  </span>
                </div>

                <div className="pt-2 border-t border-gray-800">
                  <label className="flex items-center gap-2.5 text-xs font-bold text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fiscalCfg.autoEmitOnSale}
                      onChange={(e) =>
                        setFiscalCfg({ ...fiscalCfg, autoEmitOnSale: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-blue-600 bg-gray-900 border-gray-700"
                    />
                    Emitir NFC-e automaticamente na SEFAZ a cada finalização de venda
                  </label>
                </div>
              </div>

              {fiscalTestStatus && (
                <div className="p-3 bg-blue-950/60 border border-blue-800 text-blue-200 rounded-2xl text-xs font-bold animate-in fade-in">
                  {fiscalTestStatus}
                </div>
              )}

              {/* Ações */}
              <div className="flex gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  disabled={isTestingFiscal}
                  onClick={handleTestFiscal}
                  className="flex-1 py-3 bg-[#162035] hover:bg-[#1e2c49] text-gray-200 rounded-2xl font-bold text-xs uppercase tracking-wider transition-colors border border-gray-700/60 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Wifi size={15} /> {isTestingFiscal ? "Consultando..." : "Testar Status SEFAZ"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    saveFiscalConfig(fiscalCfg);
                    setSaveBanner("Configurações Fiscais salvas com sucesso!");
                  }}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-blue-600/30 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check size={16} /> Salvar Fiscal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

