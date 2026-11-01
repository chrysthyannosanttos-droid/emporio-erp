export const metadata = {
  title: "DANFE - Documento Auxiliar da Nota Fiscal Eletrônica",
};

export default function DanfeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <style>{`
          @page {
            size: A4 portrait;
            margin: 5mm 5mm 5mm 5mm;
          }
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @media screen {
            body {
              background: #64748b;
              padding: 20px 0;
            }
            .danfe-sheet {
              box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            }
          }
          @media print {
            body {
              background: white !important;
              padding: 0 !important;
            }
            .no-print {
              display: none !important;
            }
            .danfe-sheet {
              box-shadow: none !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
            }
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}

