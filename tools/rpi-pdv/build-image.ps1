# ==============================================================================
# CYBERTECH RP - GERADOR DE IMAGEM DE DISCO (.IMG) PARA RASPBERRY PI 3
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Clear-Host

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "    CYBERTECH RP - BUILDER DA IMAGEM (.IMG) PARA RASPBERRY PI 3   " -ForegroundColor Yellow
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "NOTA: O Raspberry Pi 3 utiliza imagens de disco (.img / .img.xz)" -ForegroundColor Gray
Write-Host "para gravação direta em cartões Micro SD via Raspberry Pi Imager." -ForegroundColor Gray
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$outputDir = Join-Path $scriptDir "output"
if (-not (Test-Path $outputDir)) { New-Item -ItemType Directory -Path $outputDir | Out-Null }

# 1. Identificar o IP do Servidor Local
$ServerIP = "192.168.70.60"
try {
    $ipObj = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
        $_.InterfaceAlias -notlike "*Loopback*" -and 
        $_.IPAddress -notlike "169.254*" -and
        $_.InterfaceAlias -notlike "*vEthernet*"
    } | Select-Object -First 1
    if ($ipObj) { $ServerIP = $ipObj.IPAddress }
} catch {}

Write-Host "Configuração do Terminal PDV:" -ForegroundColor White
Write-Host " -> Servidor Alvo: http://${ServerIP}:3000/pdv" -ForegroundColor Green
Write-Host " -> Tela de Inicialização: splash.jpg (Oficial Cybertech RP)" -ForegroundColor Green
Write-Host ""

Write-Host "COMO PREPARAR SEU CARTÃO SD AGORA:" -ForegroundColor Yellow
Write-Host "------------------------------------------------------------------" -ForegroundColor Gray
Write-Host "OPÇÃO 1: Direto no Cartão SD (Mais Rápido - 10 Segundos)" -ForegroundColor Cyan
Write-Host " 1. Grave o 'Raspberry Pi OS Lite' no cartão com o Raspberry Pi Imager."
Write-Host " 2. Deixe o cartão no PC e execute o script:"
Write-Host "    .\prepare-sd.ps1" -ForegroundColor Yellow
Write-Host " O script injeta o Splash oficial, o Kiosk e os drivers automaticamente!"
Write-Host ""
Write-Host "OPÇÃO 2: Gerar arquivo de imagem customizado (.img)" -ForegroundColor Cyan
Write-Host " Deseja baixar a base do Raspberry Pi OS Lite para compilar a imagem local? (S/N)" -ForegroundColor White
$choice = Read-Host

if ($choice -match "^[Ss]") {
    $downloadUrl = "https://downloads.raspberrypi.com/raspios_lite_armhf/images/raspios_lite_armhf-2024-07-04/2024-07-04-raspios-bookworm-armhf-lite.img.xz"
    $targetXz = Join-Path $outputDir "raspios-lite.img.xz"

    Write-Host "Iniciando download da base oficial do Raspberry Pi OS (~350 MB)..." -ForegroundColor Cyan
    Write-Host "URL: ${downloadUrl}" -ForegroundColor Gray
    
    try {
        Start-BitsTransfer -Source $downloadUrl -Destination $targetXz -DisplayName "Baixando Raspberry Pi OS"
        Write-Host "[OK] Download concluído com sucesso em: ${targetXz}" -ForegroundColor Green
    } catch {
        Write-Host "Download direto indisponível no momento. Use o Raspberry Pi Imager para gravar a base e o .\prepare-sd.ps1 para customizar!" -ForegroundColor Yellow
    }
} else {
    Write-Host "Você pode rodar .\prepare-sd.ps1 a qualquer momento com o cartão inserido." -ForegroundColor Green
}

Write-Host ""
pause

