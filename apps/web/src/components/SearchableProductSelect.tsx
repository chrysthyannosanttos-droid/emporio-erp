"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, Check } from "lucide-react";

export interface SearchableProductOption {
  id: string;
  name: string;
  unit?: string | null;
  barcode?: string | null;
  sku?: string | null;
  internalCode?: string | null;
  price?: number | null;
  cost?: number | null;
  stock?: number | null;
}

interface SearchableProductSelectProps {
  products: SearchableProductOption[];
  value: string;
  onChange: (productId: string) => void;
  placeholder?: string;
  mode?: "sale" | "cost";
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
}

export function SearchableProductSelect({
  products,
  value,
  onChange,
  placeholder = "Digite código de barras, SKU ou nome...",
  mode = "sale",
  className = "",
  inputClassName = "",
  disabled = false,
}: SearchableProductSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === value) || null,
    [products, value]
  );

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 50);
    return products
      .filter((p) => {
        const name = (p.name || "").toLowerCase();
        const barcode = (p.barcode || "").toLowerCase();
        const sku = (p.sku || "").toLowerCase();
        const internal = (p.internalCode || "").toLowerCase();
        return name.includes(q) || barcode.includes(q) || sku.includes(q) || internal.includes(q);
      })
      .slice(0, 60);
  }, [products, query]);

  const fmt = (val?: number | null) =>
    Number(val || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleSelect = (p: SearchableProductOption) => {
    onChange(p.id);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {selectedProduct && !open ? (
        <div
          onClick={() => {
            if (!disabled) setOpen(true);
          }}
          className={`w-full flex items-center justify-between gap-2 cursor-pointer ${
            inputClassName ||
            "bg-[#e8f0fc] border border-indigo-200 text-gray-900 px-3 py-2.5 rounded-xl text-xs font-bold"
          }`}
        >
          <span className="truncate">
            {selectedProduct.name}
            {selectedProduct.barcode ? ` [${selectedProduct.barcode}]` : selectedProduct.sku ? ` [${selectedProduct.sku}]` : ""}
            {" "}({selectedProduct.unit || "UN"})
          </span>
          {!disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setQuery("");
                setOpen(true);
              }}
              className="text-slate-400 hover:text-rose-600 p-0.5 shrink-0"
              title="Limpar / trocar produto"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            disabled={disabled}
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const q = query.trim().toLowerCase();
                const exact = products.find(
                  (p) =>
                    (p.barcode && p.barcode.toLowerCase() === q) ||
                    (p.sku && p.sku.toLowerCase() === q) ||
                    (p.internalCode && p.internalCode.toLowerCase() === q)
                );
                if (exact) {
                  handleSelect(exact);
                } else if (filtered.length > 0) {
                  handleSelect(filtered[0]);
                }
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder={placeholder}
            className={`w-full pl-8 pr-8 outline-none ${
              inputClassName ||
              "bg-[#e8f0fc] border border-indigo-200 focus:border-indigo-500 text-gray-900 py-2.5 rounded-xl text-xs font-semibold"
            }`}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-indigo-200 rounded-xl shadow-xl z-[70] max-h-60 overflow-y-auto divide-y divide-gray-100">
          {filtered.length === 0 ? (
            <div className="p-3 text-xs text-slate-500 text-center">
              Nenhum produto encontrado para &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((p) => {
              const isSelected = p.id === value;
              const priceLabel = mode === "cost" ? `Custo R$ ${fmt(p.cost)}` : `Venda R$ ${fmt(p.price)}`;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p)}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 flex items-center justify-between gap-2 transition-colors ${
                    isSelected ? "bg-indigo-50/80 font-bold text-indigo-800" : "text-gray-800"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold truncate flex items-center gap-1.5">
                      {isSelected && <Check size={12} className="text-indigo-600 shrink-0" />}
                      <span className="truncate">{p.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">
                      {p.barcode ? `EAN: ${p.barcode}` : p.sku ? `SKU: ${p.sku}` : "Sem código"} •{" "}
                      {p.unit || "UN"} • Est: {Number(p.stock || 0)}
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-indigo-700 shrink-0">
                    {priceLabel}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
