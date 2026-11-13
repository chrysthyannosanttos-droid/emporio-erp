"use client";

import React from "react";

export interface StoreBannerSlide {
  id: string;
  imageUrl: string;
  title: string;
  subtitle: string;
  buttonText: string;
  categoryFilter?: string;
}

export const DEFAULT_EMPORIO_BANNER_SLIDES: StoreBannerSlide[] = [
  {
    id: "slide-rural-1",
    imageUrl: "/emporio-store/hero-banner.jpg",
    title: "Produtos caseiros com muito sabor e qualidade!",
    subtitle: "Direto do campo para sua mesa.",
    buttonText: "Comprar agora →",
    categoryFilter: "ALL",
  },
  {
    id: "slide-queijos-2",
    imageUrl: "/emporio-store/hero-banner-queijos.jpg",
    title: "Queijos Artesanais & Tradição da Roça",
    subtitle: "Queijo de coalho, queijo manteiga e sabores da fazenda.",
    buttonText: "Ver Queijos & Frios →",
    categoryFilter: "QUEIJOS",
  },
  {
    id: "slide-doces-3",
    imageUrl: "/emporio-store/hero-banner-doces.jpg",
    title: "Doces Caseiros & Compotas Tradicionais",
    subtitle: "Goiabada cascão, doces cremosos e mel puro de abelha.",
    buttonText: "Conhecer Doces →",
    categoryFilter: "DOCES",
  },
  {
    id: "slide-caipira-4",
    imageUrl: "/emporio-store/hero-banner-caipira.jpg",
    title: "Galinha Caipira & Ovos Frescos da Fazenda",
    subtitle: "100% caipira e natural, direto para sua família.",
    buttonText: "Aproveitar Ofertas →",
    categoryFilter: "ALL",
  },
];

export function parseStoreBannerSlides(raw?: string | null): StoreBannerSlide[] {
  if (!raw || !raw.trim()) {
    return DEFAULT_EMPORIO_BANNER_SLIDES;
  }
  const clean = raw.trim();
  if (clean.startsWith("[") && clean.endsWith("]")) {
    try {
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: any, idx: number) => ({
          id: item.id || `slide-${idx}`,
          imageUrl: typeof item === "string" ? item : item.imageUrl || "/emporio-store/hero-banner.jpg",
          title: (typeof item === "object" && item.title) || "Produtos caseiros com muito sabor e qualidade!",
          subtitle: (typeof item === "object" && item.subtitle) || "Direto do campo para sua mesa.",
          buttonText: (typeof item === "object" && item.buttonText) || "Comprar agora →",
          categoryFilter: typeof item === "object" ? item.categoryFilter : "ALL",
        }));
      }
    } catch {}
  }
  return [
    {
      id: "slide-custom-0",
      imageUrl: clean,
      title: "Produtos caseiros com muito sabor e qualidade!",
      subtitle: "Direto do campo para sua mesa.",
      buttonText: "Comprar agora →",
      categoryFilter: "ALL",
    },
    ...DEFAULT_EMPORIO_BANNER_SLIDES.slice(1),
  ];
}

export const STORE_RURAL_PRESETS = [
  { label: "Banner Fazenda Rural", url: "/emporio-store/hero-banner.jpg" },
  { label: "Banner Queijos Artesanais", url: "/emporio-store/hero-banner-queijos.jpg" },
  { label: "Banner Doces & Mel", url: "/emporio-store/hero-banner-doces.jpg" },
  { label: "Banner Galinha & Ovos Caipiras", url: "/emporio-store/hero-banner-caipira.jpg" },
  { label: "Doces Caseiros", url: "/emporio-store/cat-doces.jpg" },
  { label: "Galinha Caipira", url: "/emporio-store/cat-galinha.jpg" },
  { label: "Queijos Artesanais", url: "/emporio-store/cat-queijos.jpg" },
  { label: "Rapaduras", url: "/emporio-store/cat-rapadura.jpg" },
  { label: "Mel Puro", url: "/emporio-store/cat-mel.jpg" },
  { label: "Ovos Caipiras", url: "/emporio-store/cat-ovos.jpg" },
  { label: "Bolos & Biscoitos", url: "/emporio-store/cat-bolos.jpg" },
];

export function resolveCategoryImage(name?: string | null, imageUrl?: string | null): string {
  if (imageUrl && imageUrl.trim()) return imageUrl.trim();
  const n = (name || "").toLowerCase();
  if (n.includes("doce") || n.includes("goiab") || n.includes("geleia") || n.includes("cocada")) {
    return "/emporio-store/cat-doces.jpg";
  }
  if (n.includes("galinha") || n.includes("frango") || n.includes("carne") || n.includes("caipira")) {
    return "/emporio-store/cat-galinha.jpg";
  }
  if (n.includes("queijo") || n.includes("frio") || n.includes("latic") || n.includes("nata") || n.includes("coalho")) {
    return "/emporio-store/cat-queijos.jpg";
  }
  if (n.includes("rapadura") || n.includes("cana")) {
    return "/emporio-store/cat-rapadura.jpg";
  }
  if (n.includes("mel") || n.includes("abelha") || n.includes("outro") || n.includes("café") || n.includes("cafe")) {
    return "/emporio-store/cat-mel.jpg";
  }
  if (n.includes("ovo")) {
    return "/emporio-store/cat-ovos.jpg";
  }
  if (n.includes("bolo") || n.includes("biscoito") || n.includes("pão") || n.includes("pao") || n.includes("lanche")) {
    return "/emporio-store/cat-bolos.jpg";
  }
  return "/emporio-store/cat-doces.jpg";
}

export function resolveProductImage(product: {
  name?: string | null;
  imageUrl?: string | null;
  category?: { name?: string | null; imageUrl?: string | null } | null;
}): string {
  if (product.imageUrl && product.imageUrl.trim()) return product.imageUrl.trim();
  const n = (product.name || "").toLowerCase();
  if (n.includes("queijo") || n.includes("requeij") || n.includes("nata") || n.includes("coalho") || n.includes("manteiga")) {
    return "/emporio-store/cat-queijos.jpg";
  }
  if (n.includes("galinha") || n.includes("frango") || n.includes("carne") || n.includes("charque") || n.includes("sol")) {
    return "/emporio-store/cat-galinha.jpg";
  }
  if (n.includes("ovo")) {
    return "/emporio-store/cat-ovos.jpg";
  }
  if (n.includes("rapadura")) {
    return "/emporio-store/cat-rapadura.jpg";
  }
  if (n.includes("mel ") || n.includes("mel de") || n.startsWith("mel")) {
    return "/emporio-store/cat-mel.jpg";
  }
  if (n.includes("bolo") || n.includes("biscoito") || n.includes("broa") || n.includes("rosquinha")) {
    return "/emporio-store/cat-bolos.jpg";
  }
  if (n.includes("doce") || n.includes("goiab") || n.includes("bananada") || n.includes("cocada") || n.includes("geleia")) {
    return "/emporio-store/cat-doces.jpg";
  }
  return resolveCategoryImage(product.category?.name, product.category?.imageUrl);
}

export function resizeImageFileToDataUrl(file: File, maxDim = 720): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler arquivo de imagem."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Imagem inválida."));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas indisponível."));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.84));
      };
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}

export function EmporioLogo({
  logoUrl,
  storeName = "EMPÓRIO AGROBELÉM",
  variant = "light",
  compact = false,
}: {
  logoUrl?: string | null;
  storeName?: string;
  variant?: "light" | "dark";
  compact?: boolean;
}) {
  const words = storeName.trim().split(/\s+/);
  const topWord = words[0] || "EMPÓRIO";
  const subWord = words.slice(1).join(" ") || "AGROBELÉM";
  const isLight = variant === "light";

  const isOfficialEmporioAsset =
    !logoUrl || logoUrl.startsWith("/emporio-store/logo-");

  if (isOfficialEmporioAsset) {
    return (
      <div className="inline-flex items-center select-none">
        <img
          src={
            isLight
              ? "/emporio-store/logo-transparente.png"
              : "/emporio-store/logo-verde-transparente.png"
          }
          alt={storeName}
          className={`${compact ? "h-11 sm:h-12" : "h-14 sm:h-16"} w-auto object-contain shrink-0`}
        />
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      <img
        src={logoUrl}
        alt={storeName}
        className={`${compact ? "w-10 h-10" : "w-12 h-12"} rounded-xl object-contain border ${
          isLight ? "border-white/30 bg-white/95 p-0.5" : "border-[#076F3A]/20 bg-white p-0.5"
        } shrink-0`}
      />
      <div className="leading-none">
        <div
          className={`${compact ? "text-base sm:text-lg" : "text-lg sm:text-xl"} font-black tracking-wide uppercase ${
            isLight ? "text-white" : "text-[#076F3A]"
          }`}
        >
          {topWord}
        </div>
        <div
          className={`${compact ? "text-[10px] sm:text-xs" : "text-xs sm:text-sm"} font-bold tracking-[0.14em] uppercase ${
            isLight ? "text-emerald-100" : "text-[#076F3A]"
          }`}
        >
          {subWord}
        </div>
      </div>
    </div>
  );
}
