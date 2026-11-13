import type { MetadataRoute } from "next";

// Permite "Adicionar à tela inicial" no celular/tablet: abre o sistema ERP completo na tela inicial.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cybertech RP",
    short_name: "Cybertech",
    description: "Sistema ERP, Estoque, Produção e PDV Multi-setor",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}

