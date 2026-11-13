import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const host = req.headers.get("host") || "emporio.cybertechapp.com.br";
  const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
  const searchParams = req.nextUrl.searchParams;
  const action = searchParams.get("action");
  const caixaNum = searchParams.get("caixa") || "1";

  // 1. Redirecionar para o Instalador Oficial Epson APD (Advanced Printer Driver)
  if (action === "driver" || action === "installer") {
    // Epson Advanced Printer Driver (APD) 5.11 / 6.04 para Windows 10/11
    const officialEpsonUrl =
      "https://epson.com.br/Suporte/Ponto-de-venda/Impressoras-t%C3%A9rmicas/Epson-TM-T20X/s/SPT_C31CH26031";
    return NextResponse.redirect(officialEpsonUrl, 307);
  }

  // 2. Download do Script Windows Automatizado (.bat) de 1 Clique
  if (action === "script" || action === "kiosk" || action === "bat") {
    const targetUrl = `${protocol}://${host}/pdv?caixa=${caixaNum}`;

    const bridgeUrl = `${protocol}://${host}/downloads/CybertechEpsonBridge.ps1`;

    const batScript = `@echo off
chcp 65001 >nul
title CYBERTECH RP - CONFIGURADOR DE IMPRESSAO DIRETA EPSON TM-T20
cls
color 0B
echo ==============================================================================
echo        CYBERTECH RP - CONFIGURADOR DE IMPRESSAO DIRETA EPSON TM-T20
echo ==============================================================================
echo.
echo  Configurando o servico de impressao direta e a Epson TM-T20...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { if (-not (Get-Printer -Name '*Epson*' -ErrorAction SilentlyContinue)) { Add-Printer -Name 'EPSON TM-T20X Receipt' -DriverName 'EPSON TM-T(203dpi) Receipt6' -PortName 'TMUSB001' -ErrorAction SilentlyContinue } } catch {}; $p = Get-CimInstance Win32_Printer | Where-Object { $_.Name -match 'Epson|TM-T20|TM-T20X|T20' } | Select-Object -First 1; if ($p) { (New-Object -ComObject WScript.Network).SetDefaultPrinter($p.Name); Write-Host '>> SUCESSO: Impressora padrao definida para:' $p.Name -ForegroundColor Green } else { Write-Host '>> AVISO: Driver Epson ainda nao detectado. Se for a primeira vez, baixe pelo botao de driver no sistema.' -ForegroundColor Yellow }; $appDir = Join-Path $env:LOCALAPPDATA 'CybertechPDV'; New-Item -ItemType Directory -Force -Path $appDir | Out-Null; $bridgePath = Join-Path $appDir 'CybertechEpsonBridge.ps1'; try { Invoke-WebRequest -Uri '${bridgeUrl}' -UseBasicParsing -OutFile $bridgePath; Start-Process powershell.exe -WindowStyle Hidden -ArgumentList ('-NoProfile -ExecutionPolicy Bypass -File \"' + $bridgePath + '\"'); Write-Host '>> SUCESSO: Agente de Impressao Direta RAW (127.0.0.1:18181) iniciado!' -ForegroundColor Green } catch {}; $b = 'msedge.exe'; if (Test-Path 'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe') { $b = 'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe' } elseif (Test-Path 'C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe') { $b = 'C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe' } elseif (Test-Path 'C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe') { $b = 'C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe' } elseif (Test-Path 'C:\\\\Program Files\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe') { $b = 'C:\\\\Program Files\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe' }; Write-Host '>> Navegador selecionado:' $b -ForegroundColor Green; $w = New-Object -ComObject WScript.Shell; $d = [Environment]::GetFolderPath('Desktop'); $s = $w.CreateShortcut((Join-Path $d 'Cybertech PDV - Epson TM-T20.lnk')); $s.TargetPath = $b; $s.Arguments = '--kiosk-printing --disable-print-preview --start-maximized --app=${targetUrl}'; $s.Description = 'Cybertech PDV - Epson TM-T20'; $s.Save(); Write-Host '>> SUCESSO: Atalho criado com sucesso na Area de Trabalho!' -ForegroundColor Green; try { $st = [Environment]::GetFolderPath('Startup'); $s2 = $w.CreateShortcut((Join-Path $st 'CybertechEpsonBridge.lnk')); $s2.TargetPath = 'powershell.exe'; $s2.Arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"' + $bridgePath + '\"'; $s2.WindowStyle = 7; $s2.Save() } catch {}"

echo.
echo ==============================================================================
echo                 CONFIGURACAO CONCLUIDA COM SUCESSO!
echo ==============================================================================
echo.
echo  1. Um novo atalho foi criado na sua Area de Trabalho:
echo     [ Cybertech PDV - Epson TM-T20 ]
echo.
echo  2. Quando voce abrir o PDV por esse novo atalho:
echo     - O caixa imprimira DIRETO na Epson TM-T20.
echo     - NAO aparecera tela de confirmacao ou pre-visualizacao.
echo     - Guilhotina e gaveta acionarao automaticamente.
echo.
echo  Pressione qualquer tecla para fechar esta janela...
pause >nul
`;

    return new NextResponse(batScript, {
      status: 200,
      headers: {
        "Content-Type": "application/x-bat; charset=utf-8",
        "Content-Disposition": 'attachment; filename="Configurar-Epson-TM-T20.bat"',
        "Cache-Control": "no-store",
      },
    });
  }

  // 3. Resposta JSON padrão com dados de diagnóstico e links
  return NextResponse.json({
    status: "ok",
    printer: {
      brand: "EPSON",
      model: "TM-T20 / TM-T20X / TM-T20II / TM-T20III",
      paperWidth: "80mm",
      columns: 48,
      cutCommand: "GS V A 3 (ESC/POS 0x1D 0x56 0x41 0x03)",
      drawerCommand: "ESC p 0 25 250 (ESC/POS 0x1B 0x70 0x00 0x19 0xFA)",
      driverName: "EPSON Advanced Printer Driver (APD)",
      directPrintingMode: "Kiosk Silent Spooler & WebSerial ESC/POS",
    },
    links: {
      downloadDriver: `${protocol}://${host}/api/pdv/driver/epson?action=driver`,
      downloadScript: `${protocol}://${host}/api/pdv/driver/epson?action=script`,
      officialSupport:
        "https://epson.com.br/Suporte/Ponto-de-venda/Impressoras-t%C3%A9rmicas/Epson-TM-T20X/s/SPT_C31CH26031",
      epsonBizPortal: "https://download.epson-biz.com/modules/pos/index.php?page=single_soft&cid=7032&pcat=3&pid=37",
    },
    quickSetup: {
      step1: "Instale o driver oficial Epson APD caso a impressora seja nova no computador.",
      step2: "Baixe e execute o script 'Configurar-Epson-TM-T20.bat' para ativar o modo de impressão silenciosa sem janelas.",
      step3: "Abra o PDV pelo atalho criado na Área de Trabalho e as impressões sairão direto.",
    },
  });
}

