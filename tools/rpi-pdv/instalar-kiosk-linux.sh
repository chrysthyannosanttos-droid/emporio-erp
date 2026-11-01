#!/bin/bash
# ==============================================================================
# CYBERTECH RP - CONFIGURADOR DE INICIALIZAÇÃO AUTOMÁTICA NO LINUX / RASPBERRY PI
# ==============================================================================

set -e

CAIXA_NUM="${1:-1}"
SERVER_IP="${2:-192.168.70.60}"
URL="http://${SERVER_IP}:3000/pdv?caixa=${CAIXA_NUM}"

echo "=================================================================="
echo "   CYBERTECH RP - CONFIGURANDO AUTOSTART NO LINUX (CAIXA ${CAIXA_NUM})  "
echo "=================================================================="
echo "URL de Inicialização: ${URL}"
echo ""

CURRENT_USER=$(logname 2>/dev/null || echo $USER)
USER_HOME=$(eval echo ~${CURRENT_USER})

# 1. Criar o script launcher do Kiosk
echo "[1/4] Criando script de execução do Kiosk..."
sudo mkdir -p /usr/local/bin

cat << 'EOF' | sudo tee /usr/local/bin/cybertech-pdv-kiosk.sh > /dev/null
#!/bin/bash

# Desativar protetor de tela e descanso de monitor
xset -dpms 2>/dev/null || true
xset s off 2>/dev/null || true
xset s noblank 2>/dev/null || true

# Esconder cursor se inativo por 3s
which unclutter >/dev/null 2>&1 && unclutter -idle 3 -root &

TARGET_URL="__URL__"

# Aguardar rede ou servidor responder
for i in {1..30}; do
    curl -s --head "$TARGET_URL" >/dev/null 2>&1 && break
    sleep 1
done

# Localizar navegador
BROWSER=""
for b in chromium-browser chromium google-chrome google-chrome-stable; do
    if command -v $b >/dev/null 2>&1; then
        BROWSER=$b
        break
    fi
done

if [ -z "$BROWSER" ]; then
    echo "Instalando Chromium..."
    sudo apt-get update && sudo apt-get install -y chromium-browser || sudo apt-get install -y chromium
    BROWSER="chromium-browser"
fi

# Loop continuo em modo Kiosk de tela cheia com impressao silenciosa
while true; do
    $BROWSER \
        --password-store=basic \
        --noerrdialogs \
        --disable-infobars \
        --kiosk \
        --kiosk-printing \
        --disable-print-preview \
        --disable-pinch \
        --overscroll-history-navigation=0 \
        --disable-session-crashed-bubble \
        --disable-features=TranslateUI \
        --enable-features=OverlayScrollbar \
        --autoplay-policy=no-user-gesture-required \
        --window-size=1920,1080 \
        --start-maximized \
        "$TARGET_URL"
    sleep 2
done
EOF

# Desativa permanentemente a janela de 'Unlock Keyring' do GNOME/Chromium
rm -rf "${USER_HOME}/.local/share/keyrings"/* 2>/dev/null || true

# Injetar a URL alvo
sudo sed -i "s|__URL__|${URL}|g" /usr/local/bin/cybertech-pdv-kiosk.sh
sudo chmod +x /usr/local/bin/cybertech-pdv-kiosk.sh

# ==============================================================================
# CONFIGURACAO AUTOMATICA DA IMPRESSORA TERMICA (EPSON TM-T20 / ELGIN / CUPS)
# ==============================================================================
echo "[+] Configurando permissões e impressora térmica padrão..."
sudo usermod -a -G lp,lpadmin ${CURRENT_USER} 2>/dev/null || true

cat << 'UDEV_EOF' | sudo tee /etc/udev/rules.d/99-thermal-printer.rules > /dev/null
SUBSYSTEM=="usb", ATTRS{idVendor}=="04b8", MODE="0666", GROUP="lp"
SUBSYSTEM=="usb", ATTRS{idVendor}=="0dd4", MODE="0666", GROUP="lp"
KERNEL=="lp[0-9]*", MODE="0666", GROUP="lp"
UDEV_EOF
sudo udevadm control --reload-rules 2>/dev/null || true

if command -v lpstat >/dev/null 2>&1; then
    PRINTERS=$(lpstat -p 2>/dev/null | awk '{print $2}')
    TARGET_PRINTER=""
    for p in $PRINTERS; do
        if echo "$p" | grep -Ei "epson|tm|t20|elgin|daruma|bematech|termic|receipt" >/dev/null; then
            TARGET_PRINTER="$p"
            break
        fi
    done
    if [ -z "$TARGET_PRINTER" ] && [ -n "$PRINTERS" ]; then
        TARGET_PRINTER=$(echo "$PRINTERS" | head -n1)
    fi

    if [ -n "$TARGET_PRINTER" ]; then
        echo "[+] Definindo '$TARGET_PRINTER' como impressora padrão do sistema..."
        sudo lpadmin -d "$TARGET_PRINTER" 2>/dev/null || true
        lpoptions -d "$TARGET_PRINTER" 2>/dev/null || true
        cupsenable "$TARGET_PRINTER" 2>/dev/null || true
        cupsaccept "$TARGET_PRINTER" 2>/dev/null || true
    fi
fi

# ==============================================================================
# ATIVACAO AUTOMATICA DO VNC SERVER (ACESSO REMOTO AO CAIXA)
# ==============================================================================
echo "[+] Ativando VNC Server para acesso remoto via VNC Viewer..."
if command -v raspi-config >/dev/null 2>&1; then
    sudo raspi-config nonint do_vnc 0 2>/dev/null || true
    sudo systemctl enable vncserver-x11-serviced.service 2>/dev/null || true
    sudo systemctl restart vncserver-x11-serviced.service 2>/dev/null || true
fi

# 2. Configurar autostart universal XDG (~/.config/autostart)
echo "[2/4] Configurando inicialização automática no Desktop..."
mkdir -p "${USER_HOME}/.config/autostart"

cat << EOF > "${USER_HOME}/.config/autostart/cybertech-pdv.desktop"
[Desktop Entry]
Type=Application
Name=Cybertech RP PDV
Comment=Terminal PDV Cybertech RP Caixa ${CAIXA_NUM}
Exec=/usr/local/bin/cybertech-pdv-kiosk.sh
Terminal=false
StartupNotify=false
X-GNOME-Autostart-enabled=true
EOF

chmod +x "${USER_HOME}/.config/autostart/cybertech-pdv.desktop"
chown -R ${CURRENT_USER}:${CURRENT_USER} "${USER_HOME}/.config/autostart"

# 3. Configurar LXDE-pi autostart (se presente no Raspberry Pi OS)
if [ -d "/etc/xdg/lxsession/LXDE-pi" ]; then
    echo "[3/4] Configurando LXDE-pi autostart..."
    if ! grep -q "cybertech-pdv-kiosk.sh" /etc/xdg/lxsession/LXDE-pi/autostart 2>/dev/null; then
        echo "@/usr/local/bin/cybertech-pdv-kiosk.sh" | sudo tee -a /etc/xdg/lxsession/LXDE-pi/autostart > /dev/null
    fi
fi

# 4. Criar atalho na Área de Trabalho
if [ -d "${USER_HOME}/Desktop" ]; then
    echo "[4/4] Criando atalho na Área de Trabalho..."
    cp "${USER_HOME}/.config/autostart/cybertech-pdv.desktop" "${USER_HOME}/Desktop/PDV_Caixa_${CAIXA_NUM}.desktop"
    chmod +x "${USER_HOME}/Desktop/PDV_Caixa_${CAIXA_NUM}.desktop"
    chown ${CURRENT_USER}:${CURRENT_USER} "${USER_HOME}/Desktop/PDV_Caixa_${CAIXA_NUM}.desktop"
fi

echo ""
echo "=================================================================="
echo " [SUCESSO] PDV configurado para iniciar automaticamente no Linux!"
echo " Ao ligar o computador ou reiniciar, o Caixa ${CAIXA_NUM} abrirá direto!"
echo "=================================================================="
echo ""
echo "Deseja testar e iniciar o PDV agora? (s/n)"
read -t 5 -n 1 opt || true
echo ""
if [[ "$opt" =~ ^[Ss]$ ]]; then
    /usr/local/bin/cybertech-pdv-kiosk.sh &
fi

