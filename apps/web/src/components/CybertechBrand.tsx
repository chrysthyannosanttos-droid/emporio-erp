"use client";

import React from "react";

interface CybertechBrandProps {
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

export function CybertechBrand({ size = "md", showIcon = true }: CybertechBrandProps) {
  const titleSizes = {
    sm: "text-[18px]",
    md: "text-[25px]",
    lg: "text-[30px]",
  }[size];

  const subSizes = {
    sm: "text-[7px] tracking-[0.18em]",
    md: "text-[8.5px] tracking-[0.24em]",
    lg: "text-[10px] tracking-[0.28em]",
  }[size];

  const diamondSizes = {
    sm: "w-[42px] h-[38px]",
    md: "w-[56px] h-[50px]",
    lg: "w-[68px] h-[60px]",
  }[size];

  return (
    <div className="inline-flex items-center gap-1 select-none">
      {showIcon && (
        <svg
          viewBox="0 0 100 92"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${diamondSizes} shrink-0 drop-shadow-[0_2px_3px_rgba(3,27,78,0.35)]`}
        >
          <defs>
            {/* Gradiente Metálico Azul 3D (Base Principal) */}
            <linearGradient id="blueMetalBase" x1="4" y1="6" x2="96" y2="86" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="25%" stopColor="#0284c7" />
              <stop offset="50%" stopColor="#00e5ff" />
              <stop offset="75%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#0a2463" />
            </linearGradient>

            {/* Gradiente de Brilho / Chanfro Superior Metálico */}
            <linearGradient id="blueMetalHighlight" x1="15" y1="4" x2="85" y2="86" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#e0f7ff" />
              <stop offset="35%" stopColor="#38bdf8" />
              <stop offset="70%" stopColor="#00b4ff" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>
          </defs>

          {/* Camada Base Metálica (Traçado exato do diamante com M central) */}
          <g
            stroke="url(#blueMetalBase)"
            strokeWidth="4.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Contorno Externo do Diamante */}
            <polygon points="18,6 82,6 96,34 50,86 4,34" />

            {/* Asas Horizontais (Esquerda e Direita) */}
            <line x1="4" y1="34" x2="26" y2="34" />
            <line x1="74" y1="34" x2="96" y2="34" />

            {/* Diagonais Internas da Coroa Superior */}
            <line x1="18" y1="6" x2="26" y2="34" />
            <line x1="82" y1="6" x2="74" y2="34" />
            <line x1="18" y1="6" x2="35" y2="25" />
            <line x1="82" y1="6" x2="65" y2="25" />
            <line x1="50" y1="6" x2="35" y2="25" />
            <line x1="50" y1="6" x2="65" y2="25" />
            <line x1="26" y1="34" x2="35" y2="25" />
            <line x1="74" y1="34" x2="65" y2="25" />

            {/* Diagonais Inferiores até a Ponta */}
            <line x1="26" y1="34" x2="50" y2="86" />
            <line x1="74" y1="34" x2="50" y2="86" />

            {/* Letra M Central (Hastes Verticais + V Central) */}
            <polyline points="35,54 35,25 50,47 65,25 65,54" />
          </g>

          {/* Camada de Brilho Chanfrado 3D (Dá o efeito metálico idêntico à referência, porém em Azul) */}
          <g
            stroke="url(#blueMetalHighlight)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          >
            <polygon points="18,6 82,6 96,34 50,86 4,34" />
            <line x1="4" y1="34" x2="26" y2="34" />
            <line x1="74" y1="34" x2="96" y2="34" />
            <line x1="18" y1="6" x2="26" y2="34" />
            <line x1="82" y1="6" x2="74" y2="34" />
            <line x1="18" y1="6" x2="35" y2="25" />
            <line x1="82" y1="6" x2="65" y2="25" />
            <line x1="50" y1="6" x2="35" y2="25" />
            <line x1="50" y1="6" x2="65" y2="25" />
            <line x1="26" y1="34" x2="35" y2="25" />
            <line x1="74" y1="34" x2="65" y2="25" />
            <line x1="26" y1="34" x2="50" y2="86" />
            <line x1="74" y1="34" x2="50" y2="86" />
            <polyline points="35,54 35,25 50,47 65,25 65,54" />
          </g>
        </svg>
      )}

      <div className="flex flex-col items-center leading-none">
        {/* Nome Principal: CYBERTECH RP */}
        <div
          className={`${titleSizes} font-black uppercase tracking-tight flex items-baseline gap-1.5 leading-none`}
          style={{ fontFamily: "'Orbitron', 'Rajdhani', 'Inter', system-ui, sans-serif" }}
        >
          <span className="bg-gradient-to-b from-[#041533] via-[#0c2d63] to-[#04122b] bg-clip-text text-transparent">
            CYBERTECH
          </span>
          <span className="bg-gradient-to-b from-[#00e5ff] via-[#00a8ff] to-[#0051ff] bg-clip-text text-transparent">
            RP
          </span>
        </div>

        {/* Frase abaixo: ─── PDV • GESTÃO • RESULTADOS ─── */}
        <div className="w-full flex items-center gap-1.5 mt-1">
          <span className="h-[1.5px] flex-1 bg-gradient-to-r from-transparent via-[#0c2d63]/60 to-[#0c2d63]" />
          <div className={`${subSizes} font-bold text-[#0c2d63] uppercase flex items-center gap-1 whitespace-nowrap`}>
            <span>PDV</span>
            <span className="text-[#00b4ff] text-[9px] leading-none">•</span>
            <span>GESTÃO</span>
            <span className="text-[#00b4ff] text-[9px] leading-none">•</span>
            <span>RESULTADOS</span>
          </div>
          <span className="h-[1.5px] flex-1 bg-gradient-to-l from-transparent via-[#0c2d63]/60 to-[#0c2d63]" />
        </div>
      </div>
    </div>
  );
}
