# ==============================================================================
# CYBERTECH BOX - GERADOR DE ISO WINDOWS AUTOMATIZADA
# Injeta o Autounattend.xml e gera a ISO cybertech-box-windows.iso
# ==============================================================================
param(
    [string]$WindowsIsoPath = "C:\ISO\Win10_22H2_PortugueseBrazilian_x64.iso",
    [string]$OutputIsoPath = "C:\ISO\cybertech-box-windows-x64.iso"
)

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host " CYBERTECH BOX - CONSTRUTOR DE ISO WINDOWS AUTOMATIZADA (CHECKOUT)" -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Cyan

$WorkDir = "$env:TEMP\CybertechWinIsoBuild"
if (Test-Path $WorkDir) { Remove-Item $WorkDir -Recurse -Force }
New-Item -Path $WorkDir -ItemType Directory -Force | Out-Null

if (-not (Test-Path $WindowsIsoPath)) {
    Write-Host "[!] ISO base do Windows não encontrada em: $WindowsIsoPath" -ForegroundColor Red
    Write-Host "Baixe uma ISO do Windows 10/11 ou Windows 10 IoT Enterprise e aponte para o caminho correto." -ForegroundColor Gray
    Write-Host "Exemplo de uso:" -ForegroundColor Gray
    Write-Host ".\build-windows-iso.ps1 -WindowsIsoPath 'D:\ISOs\Windows.iso' -OutputIsoPath 'D:\ISOs\cybertech-box-windows.iso'" -ForegroundColor White
    exit 1
}

Write-Host "[1/4] Montando ISO base do Windows..." -ForegroundColor Green
$MountResult = Mount-DiskImage -ImagePath $WindowsIsoPath -PassThru
$DriveLetter = ($MountResult | Get-Volume).DriveLetter + ":"

Write-Host "[2/4] Copiando arquivos de instalação para área de trabalho..." -ForegroundColor Green
robocopy "$DriveLetter\" "$WorkDir\" /MIR /XD "System Volume Information" "$RECYCLE.BIN" | Out-Null
Dismount-DiskImage -ImagePath $WindowsIsoPath | Out-Null

Write-Host "[3/4] Injetando Autounattend.xml (Instalação 100% Autônoma)..." -ForegroundColor Green
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Copy-Item "$ScriptDir\Autounattend.xml" -Destination "$WorkDir\Autounattend.xml" -Force

Write-Host "[4/4] Gerando ISO Bootável UEFI/BIOS ($OutputIsoPath)..." -ForegroundColor Green
$OscdimgPath = "C:\Program Files (x86)\Windows Kits\10\Assessment and Deployment Kit\Deployment Tools\amd64\Oscdimg\oscdimg.exe"

if (Test-Path $OscdimgPath) {
    & $OscdimgPath -m -o -u2 -udfver102 -bootdata:2#p0,e,b"$WorkDir\boot\etfsboot.com"#pEF,e,b"$WorkDir\efi\microsoft\boot\efisys.bin" "$WorkDir" "$OutputIsoPath"
    Write-Host ">> [SUCESSO] ISO Windows Gerada com Sucesso: $OutputIsoPath" -ForegroundColor Green
} else {
    Write-Host "[i] Ferramenta 'oscdimg.exe' do Windows ADK não encontrada em $OscdimgPath." -ForegroundColor Yellow
    Write-Host "Você pode gerar o pendrive diretamente copiando a pasta $WorkDir para um pendrive formatado em FAT32!" -ForegroundColor White
}

