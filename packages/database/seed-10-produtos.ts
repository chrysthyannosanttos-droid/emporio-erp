import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const products = [
  { name: "Coca-Cola 2L", barcode: "7894900011517", price: 9.99, cost: 7.00, stock: 50 },
  { name: "Guarana Antarctica 2L", barcode: "7891910000197", price: 8.50, cost: 6.00, stock: 40 },
  { name: "Cerveja Heineken 330ml", barcode: "7896045506065", price: 6.50, cost: 4.50, stock: 120 },
  { name: "Salgadinho Doritos 84g", barcode: "7892840222956", price: 7.99, cost: 5.00, stock: 30 },
  { name: "Chocolate Bis Ao Leite 126g", barcode: "7622300990732", price: 6.50, cost: 4.00, stock: 80 },
  { name: "Arroz Tipo 1 Camil 5kg", barcode: "7896006711116", price: 29.90, cost: 24.00, stock: 100 },
  { name: "Feijao Carioca Kicaldo 1kg", barcode: "7896051113103", price: 8.90, cost: 6.50, stock: 90 },
  { name: "Oleo de Soja Liza 900ml", barcode: "7896036090016", price: 6.49, cost: 5.00, stock: 60 },
  { name: "Cafe Pilao Tradicional 500g", barcode: "7896048200021", price: 18.90, cost: 14.50, stock: 45 },
  { name: "Leite Integral Italac 1L", barcode: "7898080640056", price: 5.50, cost: 4.20, stock: 200 }
];

async function seed() {
  const companyId = "87628617-898b-4777-82b1-a312bd3d6a8d";

  console.log("Inserindo 10 produtos reais de teste...");
  for (const p of products) {
    // Evitar duplicidade de código de barras
    const exists = await prisma.product.findFirst({ where: { barcode: p.barcode, companyId } });
    if (!exists) {
      await prisma.product.create({
        data: {
          name: p.name,
          barcode: p.barcode,
          price: p.price,
          cost: p.cost,
          stock: p.stock,
          unit: "UN",
          companyId: companyId
        }
      });
    }
  }
  console.log("Produtos inseridos com sucesso.");

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Etiquetas de Produtos para Teste</title>
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f5f9; padding: 20px; color: #1e293b; }
        .page {
            background: white; width: 210mm; min-height: 297mm; margin: 0 auto; padding: 20mm;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1); display: grid; grid-template-columns: repeat(2, 1fr);
            gap: 20px; align-content: start; border-radius: 8px;
        }
        .label { border: 2px dashed #cbd5e1; padding: 20px; text-align: center; border-radius: 12px; }
        .name { font-size: 16px; font-weight: 700; margin-bottom: 15px; color: #0f172a; height: 40px; display: flex; align-items: center; justify-content: center; }
        .price { font-size: 22px; color: #4338ca; font-weight: 900; margin-top: 10px; }
        svg { max-width: 100%; height: 80px; }
        .header { text-align: center; margin-bottom: 20px; }
        .print-btn {
            display: inline-block; padding: 15px 30px; background: #4f46e5; color: white;
            border-radius: 8px; font-weight: bold; font-size: 18px; cursor: pointer; border: none;
            box-shadow: 0 4px 6px rgba(79, 70, 229, 0.3); transition: transform 0.1s;
        }
        .print-btn:active { transform: scale(0.98); }
        @media print {
            body { background: white; padding: 0; }
            .page { box-shadow: none; margin: 0; padding: 0; border-radius: 0; }
            .header { display: none; }
            .label { border: 1px solid #000; break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 style="margin-bottom: 5px;">Códigos de Barras - Produtos de Teste</h1>
        <p style="margin-top: 0; color: #64748b; margin-bottom: 20px;">Use seu leitor físico ou digite os números no PDV para testar.</p>
        <button class="print-btn" onclick="window.print()">🖨️ Salvar como PDF / Imprimir</button>
    </div>
    <div class="page">
        ${products.map(p => `
        <div class="label">
            <div class="name">${p.name}</div>
            <svg class="barcode" jsbarcode-format="EAN13" jsbarcode-value="${p.barcode}" jsbarcode-textmargin="0" jsbarcode-fontoptions="bold"></svg>
            <div class="price">R$ ${p.price.toFixed(2).replace('.', ',')}</div>
        </div>
        `).join('')}
    </div>
    <script>
        JsBarcode(".barcode").init();
    </script>
</body>
</html>
  `;

  // Salvar na Área de Trabalho do Windows (Desktop)
  const homeDir = process.env.USERPROFILE || process.env.HOMEPATH || process.env.HOME || '';
  const desktopPath = path.join(homeDir, 'Desktop', 'Codigos_de_Barra_Teste.html');
  fs.writeFileSync(desktopPath, html);
  console.log("Arquivo HTML gerado na Área de Trabalho:", desktopPath);
}

seed().catch(console.error).finally(() => prisma.$disconnect());
