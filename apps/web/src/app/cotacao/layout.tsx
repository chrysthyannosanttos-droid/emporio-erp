import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portal de Cotação | Cybertech RP",
  description: "Portal exclusivo para fornecedores responderem cotações de compras.",
};

export default function CotacaoLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-[#f3f7fe] min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
