import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { getTenantTheme } from "@/actions/theme";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Emporio ERP — Sistema de Gestão",
  description: "ERP completo para supermercados e atacados com PDV, estoque, financeiro, fiscal e CRM.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { theme } = await getTenantTheme();

  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${geistMono.variable} h-full ${theme?.tema === 'light' ? '' : 'dark'}`}
      style={{
        ...(theme?.corPrimaria && { '--accent': theme.corPrimaria }),
        ...(theme?.corSecundaria && { '--accent-hover': theme.corSecundaria }),
        ...(theme?.corMenu && { '--bg-elevated': theme.corMenu }),
        ...(theme?.corBotao && { '--accent': theme.corBotao }),
        ...(theme?.backgroundLogin && { '--bg-image-login': `url(${theme.backgroundLogin})` }),
        ...(theme?.backgroundSistema && { '--bg-image-system': `url(${theme.backgroundSistema})` }),
      } as React.CSSProperties}
    >
      <body 
        className="h-full overflow-hidden" 
        style={theme?.backgroundSistema ? { backgroundImage: `url(${theme.backgroundSistema})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
      >
        {children}
      </body>
    </html>
  );
}
