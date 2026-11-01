import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const host = req.headers.get("host") || "192.168.70.60:3000";
  const searchParams = req.nextUrl.searchParams;
  const caixaNum = searchParams.get("caixa") || "1";

  const script = `# ==============================================================================
# CYBERTECH BOX - CONFIGURADOR WINDOWS AUTOMATIZADO
# ==============================================================================
\$CaixaNum = "${caixaNum}"
\$ServerHost = "${host}"
\$TargetUrl = "http://\$ServerHost/pdv?caixa=\$CaixaNum"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " CONFIGURANDO CYBERTECH BOX WINDOWS - CAIXA \$CaixaNum" -ForegroundColor Yellow
Write-Host " Alvo: \$TargetUrl" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

# Otimizar energia
powercfg /change monitor-timeout-ac 0 2>\$null
powercfg /change standby-timeout-ac 0 2>\$null
powercfg /change hibernate-timeout-ac 0 2>\$null

# Localizar Navegador
\$BrowserPath = "msedge.exe"
if (Test-Path "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe") {
    \$BrowserPath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
} elseif (Test-Path "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe") {
    \$BrowserPath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
}

New-Item -Path "C:\\Cybertech" -ItemType Directory -Force | Out-Null
\$KioskScriptPath = "C:\\Cybertech\\start-pdv.bat"

\$KioskContent = @"
@echo off
title Cybertech RP PDV Kiosk
timeout /t 2 /nobreak >nul
:loop
"\$BrowserPath" --kiosk "\$TargetUrl" --kiosk-printing --disable-print-preview --no-first-run --disable-translate --start-maximized --disable-pinch
goto loop
"@

Set-Content -Path \$KioskScriptPath -Value \$KioskContent -Encoding ASCII

# Startup
\$StartupFolder = [Environment]::GetFolderPath("Startup")
\$WshShell = New-Object -ComObject WScript.Shell
\$Shortcut = \$WshShell.CreateShortcut("\$StartupFolder\\CybertechPDV.lnk")
\$Shortcut.TargetPath = \$KioskScriptPath
\$Shortcut.WindowStyle = 7
\$Shortcut.Save()

# Impressora Padrão
\$Thermal = Get-CimInstance -ClassName Win32_Printer | Where-Object { \$_.Name -match "Epson|TM-T20|Elgin|i9|Bematech|MP-4200" } | Select-Object -First 1
if (\$Thermal) {
    (New-Object -ComObject WScript.Network).SetDefaultPrinter(\$Thermal.Name)
    Write-Host ">> Impressora padrao definida: \$(\$Thermal.Name)" -ForegroundColor Green
}

Write-Host ""
Write-Host ">> [SUCESSO] Windows configurado para iniciar como Caixa \$CaixaNum em Kiosk!" -ForegroundColor Green
Write-Host ">> Reinicie o computador para testar."
`;

  return new NextResponse(script, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

