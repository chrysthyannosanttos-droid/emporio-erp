"use client";

import { useState, useEffect, useRef } from "react";
import { ShieldCheck, Cpu, HardDrive, ArrowRight } from "lucide-react";
import { CybertechBrand } from "@/components/CybertechBrand";

interface PdvSplashScreenProps {
  onFinish?: () => void;
  minDuration?: number;
}

const BOOT_STEPS = [
  "Iniciando módulos do sistema...",
  "Conectando ao banco de dados...",
  "Carregando catálogo e tabela de preços...",
  "Configurando periféricos e balança...",
  "Sistema pronto para vendas!",
];

export function PdvSplashScreen({ onFinish, minDuration = 1000 }: PdvSplashScreenProps) {
  const [progress, setProgress] = useState(10);
  const [stepIndex, setStepIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const handleFinish = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onFinishRef.current) onFinishRef.current();
    }, 100);
  };

  useEffect(() => {
    const startTime = Date.now();

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / minDuration) * 100));
      setProgress(pct);
      
      if (pct < 25) setStepIndex(0);
      else if (pct < 50) setStepIndex(1);
      else if (pct < 75) setStepIndex(2);
      else if (pct < 95) setStepIndex(3);
      else setStepIndex(4);

      if (elapsed >= minDuration) {
        clearInterval(timer);
        handleFinish();
      }
    }, 25);

    const handleKeyDown = () => {
      clearInterval(timer);
      handleFinish();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearInterval(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [minDuration]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-white text-gray-800 select-none transition-opacity duration-500 ease-in-out px-6 py-10 ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Top Header / Marca */}
      <div className="w-full flex justify-between items-center max-w-4xl pt-4">
        <CybertechBrand size="md" />
        <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Terminal PDV Caixa
        </div>
      </div>

      {/* Centro: Barra e Status */}
      <div className="w-full max-w-xl flex flex-col items-center text-center space-y-6">
        <div className="space-y-1.5">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            Inicializando o Caixa...
          </h2>
          <p className="text-sm font-semibold text-blue-600 transition-all duration-200">
            {BOOT_STEPS[stepIndex]}
          </p>
        </div>

        {/* Barra de Progresso Cristalina */}
        <div className="w-full space-y-3">
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200 shadow-inner p-0.5">
            <div
              className="h-full rounded-full transition-all duration-75 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] font-bold text-gray-400">
            <span>Carregando recursos</span>
            <span>{progress}%</span>
          </div>
          <button
            type="button"
            onClick={handleFinish}
            className="text-xs text-blue-600 hover:text-blue-800 font-bold bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors inline-flex items-center gap-1.5 mx-auto"
          >
            Entrar no Caixa Agora <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Rodapé com Informações Técnicas Claras */}
      <div className="w-full max-w-4xl flex items-center justify-between border-t border-gray-100 pt-6 text-xs text-gray-500">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Cpu size={16} className="text-blue-600" />
            <span className="font-semibold text-gray-700">Raspberry Pi 4 / Linux 64-bit</span>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive size={16} className="text-blue-600" />
            <span className="font-semibold text-gray-700">Terminal Kiosk v2.2</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-gray-400">
          <ShieldCheck size={16} className="text-green-600" />
          <span className="font-medium text-[11px]">Tecnologia que impulsiona seu negócio</span>
        </div>
      </div>
    </div>
  );
}
