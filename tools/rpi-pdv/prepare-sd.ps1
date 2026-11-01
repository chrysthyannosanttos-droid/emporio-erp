# ==============================================================================
# CYBERTECH RP - PREPARADOR AUTOMATICO DE CARTAO SD (RASPBERRY PI 3)
# ==============================================================================
param(
    [string]$DriveLetter = "",
    [string]$CaixaNumber = ""
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "      CYBERTECH RP - GERADOR DE CARTAO SD PARA RASPBERRY PI 3     " -ForegroundColor Yellow
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Identificar o IP local do Servidor
$ServerIP = "192.168.70.60"
try {
    $ipObj = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
        $_.InterfaceAlias -match "Wi-Fi|Ethernet" -and 
        $_.InterfaceAlias -notmatch "vEthernet|VirtualBox|Radmin|TAP|Wintun|Loopback" -and
        $_.IPAddress -notlike "169.254*" -and
        $_.IPAddress -notlike "192.168.56*"
    } | Select-Object -First 1
    if ($ipObj) {
        $ServerIP = $ipObj.IPAddress
    }
} catch {}

Write-Host "Servidor Central Detectado: " -NoNewline
Write-Host "http://${ServerIP}:3000/pdv" -ForegroundColor Green
Write-Host ""

# 2. Identificar número do Caixa
if (-not $CaixaNumber) {
    $cInput = Read-Host "Informe o número deste terminal de Caixa (Ex: 1 para Caixa 01, 2 para Caixa 02) [Padrão: 1]"
    if ($cInput) { $CaixaNumber = $cInput.Trim() } else { $CaixaNumber = "1" }
}

Write-Host "Configurando Terminal: Caixa ${CaixaNumber}" -ForegroundColor Cyan
Write-Host "URL do Terminal PDV: " -NoNewline
Write-Host "http://${ServerIP}:3000/pdv?caixa=${CaixaNumber}" -ForegroundColor Green
Write-Host ""

# 3. Identificar ou solicitar o drive
if (-not $DriveLetter) {
    Write-Host "Buscando cartões SD conectados..." -ForegroundColor Gray
    $drives = Get-Volume | Where-Object { $_.DriveType -eq "Removable" -and $_.DriveLetter }

    if (-not $drives) {
        # Verificar se existe D: com base FAT32 típica do Pi
        $dCandidate = Get-Volume | Where-Object { $_.DriveLetter -eq "D" }
        if ($dCandidate) {
            $DriveLetter = "D"
            Write-Host "Cartão SD encontrado automaticamente na unidade [D:]!" -ForegroundColor Green
        } else {
            $DriveLetter = Read-Host "Digite a letra do cartão SD (ex: D)"
        }
    } else {
        Write-Host "Dispositivos removíveis encontrados:" -ForegroundColor Cyan
        foreach ($d in $drives) {
            $sizeGb = [math]::Round($d.Size / 1GB, 1)
            Write-Host "  [$($d.DriveLetter):] $($d.FileSystemLabel) ($($sizeGb) GB) - Sistema: $($d.FileSystem)" -ForegroundColor White
        }
        Write-Host ""
        $DriveLetter = $drives[0].DriveLetter
        Write-Host "Selecionando automaticamente unidade [${DriveLetter}:]" -ForegroundColor Green
    }
}

$driveLetter = $DriveLetter.Trim().ToUpper().Replace(":", "")
$sdPath = "${driveLetter}:\"

if (-not (Test-Path $sdPath)) {
    Write-Host "[ERRO] A unidade ${sdPath} não existe ou não está acessível." -ForegroundColor Red
    if ([Environment]::UserInteractive -and -not $DriveLetter) {
    pause
}
    exit 1
}

Write-Host ""
Write-Host "Verificando partição de boot em ${sdPath}..." -ForegroundColor Cyan

# Verifica se é uma partição de boot do Raspberry Pi
$hasCmdline = (Test-Path "${sdPath}cmdline.txt") -or (Test-Path "${sdPath}config.txt")

if (-not $hasCmdline) {
    Write-Host ""
    Write-Host "------------------------------------------------------------------" -ForegroundColor Yellow
    Write-Host "[PASSO NECESSÁRIO] O cartão precisa da base do Raspberry Pi OS Lite!" -ForegroundColor Yellow
    Write-Host "------------------------------------------------------------------" -ForegroundColor Yellow
    Write-Host "1. Abra o 'Raspberry Pi Imager' (ou baixe em raspberrypi.com/software)"
    Write-Host "2. Em 'Device': Escolha 'Raspberry Pi 3'"
    Write-Host "3. Em 'Operating System': Escolha 'Raspberry Pi OS (other)' -> 'Raspberry Pi OS Lite (32-bit ou 64-bit)'"
    Write-Host "4. Em 'Storage': Escolha seu cartão SD e clique em 'Gravar'."
    Write-Host "5. Assim que terminar a gravação, execute este script novamente para aplicar o PDV Kiosk!"
    Write-Host ""
    if ([Environment]::UserInteractive -and -not $DriveLetter) {
    pause
}
    exit 0
}

Write-Host "[OK] Base do Raspberry Pi OS detectada com sucesso!" -ForegroundColor Green

# 3. Ler o template do firstrun.sh e ajustar o IP do servidor
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$templatePath = Join-Path $scriptDir "firstrun.sh"

if (-not (Test-Path $templatePath)) {
    Write-Host "[ERRO] Arquivo firstrun.sh não encontrado em ${templatePath}" -ForegroundColor Red
    if ([Environment]::UserInteractive -and -not $DriveLetter) {
    pause
}
    exit 1
}

$firstrunContent = Get-Content -Path $templatePath -Raw -Encoding UTF8
$firstrunContent = $firstrunContent -replace 'SERVER_URL="http://.*:3000/pdv.*"', "SERVER_URL=`"http://${ServerIP}:3000/pdv?caixa=${CaixaNumber}`""

# Normalizar para quebras de linha Linux (LF)
$firstrunContent = $firstrunContent.Replace("`r`n", "`n")

# Copiar firstrun.sh para a raiz do boot do SD
$targetFirstrun = Join-Path $sdPath "firstrun.sh"
[System.IO.File]::WriteAllText($targetFirstrun, $firstrunContent, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "[OK] Script do PDV copiado para ${targetFirstrun}" -ForegroundColor Green

# Copiar tela de Splash Screen oficial Cybertech RP para o boot
$splashSource = Join-Path $scriptDir "splash.jpg"
if (Test-Path $splashSource) {
    Copy-Item $splashSource (Join-Path $sdPath "splash.jpg") -Force
    Write-Host "[OK] Imagem de Splash Screen oficial copiada para o SD" -ForegroundColor Green
}

# 4. Configurar cmdline.txt para executar no primeiro boot
$cmdlineFile = Join-Path $sdPath "cmdline.txt"
if (Test-Path $cmdlineFile) {
    try {
        $cmdline = Get-Content -Path $cmdlineFile -Raw
        $cmdline = $cmdline.Trim()
    } catch {
        $cmdline = ""
    }
} else {
    $cmdline = ""
}

if (-not $cmdline) {
    $cmdline = "console=serial0,115200 console=tty1 root=PARTUUID=b33a707d-02 rootfstype=ext4 fsck.repair=yes rootwait"
}

if ($cmdline -notmatch "systemd.run") {
    $newCmdline = "$cmdline quiet splash logo.nologo vt.global_cursor_default=0 systemd.run=/boot/firmware/firstrun.sh"
    [System.IO.File]::WriteAllText($cmdlineFile, $newCmdline, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "[OK] Inicialização automática ativada no cmdline.txt" -ForegroundColor Green
} else {
    # Limpa caso tivesse a ação de desligamento
    $newCmdline = $cmdline -replace "systemd.run_success_action=\w+", "" -replace "systemd.unit=\S+", ""
    $newCmdline = $newCmdline.Trim()
    [System.IO.File]::WriteAllText($cmdlineFile, $newCmdline, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "[OK] cmdline.txt atualizado sem flags de desligamento." -ForegroundColor Green
}

# 5. Criar arquivo de sinalização para SSH e tela HDMI
$sshFile = Join-Path $sdPath "ssh"
if (-not (Test-Path $sshFile)) {
    New-Item -ItemType File -Path $sshFile -Force | Out-Null
    Write-Host "[OK] Acesso remoto SSH habilitado (arquivo 'ssh' criado)" -ForegroundColor Green
}

# 6. Criar cloud-init user-data caso a versão do Pi OS use cloud-init
$userDataPath = Join-Path $sdPath "user-data"
$userDataContent = @"
#cloud-config
runcmd:
  - [ bash, -c, "if [ -f /boot/firmware/firstrun.sh ]; then bash /boot/firmware/firstrun.sh; elif [ -f /boot/firstrun.sh ]; then bash /boot/firstrun.sh; fi" ]
"@.Replace("`r`n", "`n")
[System.IO.File]::WriteAllText($userDataPath, $userDataContent, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "[OK] Configuração Cloud-Init gravada (user-data)" -ForegroundColor Green

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Green
Write-Host "      PARABÉNS! SEU CARTÃO SD ESTÁ 100% PRONTO PARA O PDV!        " -ForegroundColor Yellow
Write-Host "==================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor White
Write-Host " 1. Remova o cartão SD do computador com segurança."
Write-Host " 2. Coloque o cartão no Raspberry Pi 3."
Write-Host " 3. Conecte o cabo de rede (ou configure o Wi-Fi) e o cabo HDMI na TV/Monitor."
Write-Host " 4. Ligue a fonte de energia na tomada."
Write-Host ""
Write-Host "O Raspberry Pi irá:" -ForegroundColor Cyan
Write-Host "  -> Dar o primeiro boot"
Write-Host "  -> Instalar o Chromium Kiosk e drivers de balança/impressora"
Write-Host "  -> Reiniciar automaticamente e abrir DIRETO no PDV do Cybertech RP!" -ForegroundColor Green
Write-Host ""
if ([Environment]::UserInteractive -and -not $DriveLetter) {
    pause
}

