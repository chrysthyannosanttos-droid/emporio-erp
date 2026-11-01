import type { MetadataRoute } from "next";

// Permite "Adicionar à tela inicial" no celular/tablet: abre o PDV Mobile em tela cheia, como um app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cybertech PDV Mobile",
    short_name: "PDV Mobile",
    description: "PDV para celular e tablet com envio de cupom por WhatsApp, SMS e e-mail.",
    start_url: "/pdv/mobile",
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

