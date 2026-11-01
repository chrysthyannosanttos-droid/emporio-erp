export const metadata = {
  title: "Contrato de Licenciamento de Software - Cybertech RP",
};

export default function PrintLayout({
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
            margin: 10mm 12mm 10mm 12mm;
          }
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .sheet-a4 {
            width: 100%;
            max-width: 210mm;
            min-height: 275mm;
            margin: 0 auto 20px auto;
            padding: 10mm 12mm;
            background: white;
            box-sizing: border-box;
            page-break-after: always;
            break-after: page;
          }
          @media screen {
            body {
              background: #f1f5f9;
              padding: 20px 0;
            }
            .sheet-a4 {
              box-shadow: 0 10px 25px rgba(0,0,0,0.1);
              border-radius: 8px;
            }
          }
          @media print {
            body {
              background: white !important;
              padding: 0 !important;
            }
            .sheet-a4 {
              box-shadow: none !important;
              border-radius: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              min-height: 270mm !important;
            }
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}

