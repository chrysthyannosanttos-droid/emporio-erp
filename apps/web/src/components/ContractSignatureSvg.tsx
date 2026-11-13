"use client";

import React, { useRef, useState } from "react";

export type SignatureInk = "blue" | "black";

interface SignatureMarkProps {
  ink?: SignatureInk;
  customImage?: string | null;
  signerName?: string;
  compact?: boolean;
  className?: string;
}

const INK_COLOR: Record<SignatureInk, string> = {
  blue: "#0f2d7a",
  black: "#111827",
};

/**
 * Assinatura e rubrica manuscrita automática da Contratada (estilo caneta executiva).
 * Caso exista uma imagem desenhada manualmente pelo usuário, prioriza a imagem salva.
 */
export function ContractSignatureSvg({
  ink = "blue",
  customImage = null,
  signerName = "Cristiano",
  compact = false,
  className = "",
}: SignatureMarkProps) {
  const strokeColor = INK_COLOR[ink] || INK_COLOR.blue;

  if (customImage) {
    return (
      <img
        src={customImage}
        alt={`Assinatura ${signerName}`}
        className={
          compact
            ? `h-6 w-auto inline-block object-contain align-middle mix-blend-multiply ${className}`
            : `h-14 w-auto mx-auto object-contain mix-blend-multiply ${className}`
        }
      />
    );
  }

  if (compact) {
    return (
      <svg
        viewBox="0 0 140 52"
        aria-label={`Rubrica ${signerName}`}
        className={`h-6 w-auto inline-block align-middle ${className}`}
        fill="none"
      >
        <path
          d="M 24 34 C 14 20, 32 7, 48 11 C 34 15, 20 29, 27 39 C 34 46, 52 34, 62 23 C 67 17, 72 28, 79 21 C 84 15, 89 9, 92 14 C 89 24, 93 31, 104 24 C 112 19, 121 15, 130 12"
          stroke={strokeColor}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 74 15 C 84 13, 94 12, 102 13"
          stroke={strokeColor}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M 22 43 C 56 39, 94 37, 128 38"
          stroke={strokeColor}
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 280 92"
      aria-label={`Assinatura ${signerName}`}
      className={`h-14 w-auto mx-auto select-none ${className}`}
      fill="none"
    >
      <path
        d="M 40 54 C 20 34, 42 11, 70 16 C 48 21, 26 44, 36 63 C 45 75, 72 58, 86 43 C 93 36, 97 49, 104 42 C 110 36, 114 50, 122 40 C 128 32, 134 19, 139 14 C 136 30, 131 50, 142 51 C 151 52, 158 39, 166 42 C 173 45, 179 52, 189 41 C 197 32, 206 46, 218 39 C 228 33, 244 26, 258 21"
        stroke={strokeColor}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 122 25 C 137 22, 151 21, 162 23"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="110" cy="27" r="1.8" fill={strokeColor} />
      <path
        d="M 44 70 C 102 63, 178 60, 250 63"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Quadro interativo com mouse/toque para desenhar rubrica manuscrita personalizada.
 */
export function SignatureCanvasPad({
  ink = "blue",
  onSave,
  onCancel,
}: {
  ink?: SignatureInk;
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const [hasStroke, setHasStroke] = useState(false);

  const getCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPosRef.current = getCoords(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !canvasRef.current || !lastPosRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const pos = getCoords(e);
    ctx.strokeStyle = INK_COLOR[ink] || INK_COLOR.blue;
    ctx.lineWidth = 3.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPosRef.current = pos;
    if (!hasStroke) setHasStroke(true);
  };

  const handlePointerUp = () => {
    drawingRef.current = false;
    lastPosRef.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasStroke(false);
  };

  const handleConfirm = () => {
    if (!canvasRef.current || !hasStroke) return;
    onSave(canvasRef.current.toDataURL("image/png"));
  };

  return (
    <div className="bg-white border border-blue-200 rounded-xl p-3 space-y-2.5 shadow-sm">
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span className="font-semibold">Desenhe sua rubrica com o mouse ou dedo abaixo:</span>
        <button
          type="button"
          onClick={clearCanvas}
          className="text-red-600 hover:underline font-semibold"
        >
          Limpar
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={520}
        height={170}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full h-32 border border-dashed border-gray-300 rounded-lg bg-slate-50/70 touch-none cursor-crosshair"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={!hasStroke}
          onClick={handleConfirm}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white"
        >
          Salvar Rubrica
        </button>
      </div>
    </div>
  );
}
