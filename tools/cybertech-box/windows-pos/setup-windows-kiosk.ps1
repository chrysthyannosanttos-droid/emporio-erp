# ==============================================================================
# CYBERTECH BOX - CONFIGURADOR KIOSK WINDOWS (10 / 11 / IOT ENTERPRISE)
# Transforma qualquer Windows em um Checkout PDV Autônomo
# ==============================================================================
param(
    [string]$CaixaNum = "1",
    [string]$ServerHost = "192.168.70.60:3000"
)

$ErrorActionPreference = "SilentlyContinue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " CONFIGURANDO CYBERTECH BOX WINDOWS - CAIXA $CaixaNum" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

$TargetUrl = "http://${ServerHost}/pdv?caixa=${CaixaNum}"

# 1. Desativar Suspensão, Telas de Bloqueio e Hibernação
Write-Host "[1/5] Otimizando energia e bloqueando descanso de tela..." -ForegroundColor Green
powercfg /change monitor-timeout-ac 0
powercfg /change monitor-timeout-dc 0
powercfg /change disk-timeout-ac 0
powercfg /change disk-timeout-dc 0
powercfg /change standby-timeout-ac 0
powercfg /change standby-timeout-dc 0
powercfg /change hibernate-timeout-ac 0
powercfg /change hibernate-timeout-dc 0

# Desativar tela de bloqueio do Windows
New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Personalization" -Force | Out-Null
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Personalization" -Name "NoLockScreen" -Value 1 -Type DWord

# Desativar atualizações automáticas que reiniciam o PC no meio da operação
New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Force | Out-Null
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Name "NoAutoRebootWithLoggedOnUsers" -Value 1 -Type DWord

# 2. Localizar Navegador Kiosk (Edge ou Chrome)
$BrowserPath = ""
$EdgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$ChromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$ChromePath32 = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

if (Test-Path $EdgePath) {
    $BrowserPath = $EdgePath
} elseif (Test-Path $ChromePath) {
    $BrowserPath = $ChromePath
} elseif (Test-Path $ChromePath32) {
    $BrowserPath = $ChromePath32
} else {
    $BrowserPath = "msedge.exe"
}

Write-Host "[2/5] Navegador detectado: $BrowserPath" -ForegroundColor Green

# 3. Criar Script de Inicialização Kiosk
$KioskScriptPath = "C:\Cybertech\start-pdv.bat"
New-Item -Path "C:\Cybertech" -ItemType Directory -Force | Out-Null

$KioskContent = @"
@echo off
title Cybertech RP PDV Kiosk
timeout /t 3 /nobreak >nul
:loop
"$BrowserPath" --kiosk "$TargetUrl" --kiosk-printing --disable-print-preview --no-first-run --disable-translate --start-maximized --disable-pinch
goto loop
"@

Set-Content -Path $KioskScriptPath -Value $KioskContent -Encoding ASCII

# 4. Configurar Autostart no Windows
Write-Host "[3/5] Registrando inicialização automática do Caixa $CaixaNum..." -ForegroundColor Green
$StartupFolder = [Environment]::GetFolderPath("Startup")
$ShortcutPath = "$StartupFolder\CybertechPDV.lnk"

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $KioskScriptPath
$Shortcut.WindowStyle = 7 # Minimized
$Shortcut.Save()

# Atalho na Área de Trabalho
$DesktopFolder = [Environment]::GetFolderPath("Desktop")
$DesktopShortcut = $WshShell.CreateShortcut("$DesktopFolder\Cybertech RP Caixa $CaixaNum.lnk")
$DesktopShortcut.TargetPath = $KioskScriptPath
$DesktopShortcut.Save()

# 5. Configurar Impressora Térmica Padrão no Windows Spooler
Write-Host "[4/5] Verificando impressoras térmicas conectadas..." -ForegroundColor Green
$Printers = Get-CimInstance -ClassName Win32_Printer
$ThermalPrinter = $Printers | Where-Object { $_.Name -match "Epson|TM-T20|Elgin|i9|i7|Bematech|MP-4200|Daruma" } | Select-Object -First 1

if ($ThermalPrinter) {
    Write-Host "Definindo impressora padrão: $($ThermalPrinter.Name)" -ForegroundColor Yellow
    (New-Object -ComObject WScript.Network).SetDefaultPrinter($ThermalPrinter.Name)
} else {
    Write-Host "Nenhuma impressora térmica detectada no momento. Instale o driver USB da Epson/Elgin normalmente." -ForegroundColor DarkGray
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ">> [SUCESSO] Windows configurado como Cybertech Box Caixa $CaixaNum!" -ForegroundColor Green
Write-Host ">> Ao reiniciar, o sistema abrirá direto na tela de vendas em Kiosk." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

