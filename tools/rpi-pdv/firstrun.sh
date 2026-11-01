#!/bin/bash
# ==============================================================================
# CYBERTECH RP - RASPBERRY PI 4 / 3 PDV KIOSK FIRSTBOOT INSTALLER
# Este script roda automaticamente no primeiro boot do Raspberry Pi
# ==============================================================================

# Desativar saida imediata por erro para garantir que a placa nunca desligue sozinha
set +e

# Define URL do Servidor Central (sera substituido pelo instalador se necessario)
SERVER_URL="http://192.168.70.60:3000/pdv"

# Log da instalacao
LOGFILE="/var/log/cybertech-pdv-install.log"
exec > >(tee -a ${LOGFILE}) 2>&1

echo "=========================================================="
echo "  INICIANDO CONFIGURACAO AUTOMATICA DO PDV CYBERTECH RP   "
echo "=========================================================="
echo "Data: $(date)"
echo "Servidor alvo: ${SERVER_URL}"

# 1. Garantir que o usuario 'pi' existe
if ! id "pi" &>/dev/null; then
    echo "[!] Criando usuario padrao 'pi'..."
    useradd -m -s /bin/bash -G sudo,dialout,tty,lp,input,video,audio pi || true
    echo "pi:pi" | chpasswd || true
fi

USER_PI="pi"
HOME_PI="/home/pi"

# 2. Espera conexao de rede cabeada (Ethernet)
echo "[1/7] Aguardando conexao de rede cabeada (Ethernet)..."
max_wait=40
counter=0
while ! ping -c 1 -W 2 192.168.70.60 >/dev/null 2>&1 && ! ping -c 1 -W 2 8.8.8.8 >/dev/null 2>&1; do
    sleep 2
    counter=$((counter + 2))
    if [ $counter -ge $max_wait ]; then
        echo "Aviso: Continuando configuracao offline/rede local..."
        break
    fi
done

# 3. Atualizar repositorios e instalar pacotes minimos
echo "[2/7] Instalando ambiente grafico leve e navegador Kiosk..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y || true

# Instala Xorg minimo + Openbox + Chromium + Utilitarios
apt-get install -y --no-install-recommends \
    xserver-xorg \
    xinit \
    x11-xserver-utils \
    openbox \
    chromium-browser \
    unclutter \
    curl \
    ca-certificates \
    alsa-utils \
    libpam-systemd \
    fbi || apt-get install -y --no-install-recommends chromium || true

# Caso o pacote se chame 'chromium' nas versoes mais recentes
if ! command -v chromium-browser &> /dev/null && command -v chromium &> /dev/null; then
    ln -s $(which chromium) /usr/local/bin/chromium-browser || true
fi

# 4. Configurar permissoes e regras udev para perifericos (balanca e impressora)
echo "[3/7] Configurando permissoes para o usuario: ${USER_PI}"
usermod -a -G dialout,tty,lp,input,video,audio ${USER_PI} || true

cat << 'EOF' > /etc/udev/rules.d/99-pdv-peripherals.rules
# Balancas Toledo, Filizola, Elgin (USB / Serial)
KERNEL=="ttyUSB*", MODE="0666", GROUP="dialout"
KERNEL=="ttyACM*", MODE="0666", GROUP="dialout"

# Impressoras Termicas USB
SUBSYSTEM=="usb", ATTRS{bInterfaceClass}=="07", MODE="0666", GROUP="lp"
EOF
udevadm control --reload-rules || true

# 5. Configurar Auto-login no console
echo "[4/7] Configurando Auto-login no console..."
mkdir -p /etc/systemd/system/getty@tty1.service.d
cat << EOF > /etc/systemd/system/getty@tty1.service.d/autologin.conf
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin ${USER_PI} --noclear %I \$TERM
EOF

# 6. Configurar inicializacao automatica do X11 no .profile do usuario
echo "[5/7] Configurando inicializacao do ambiente grafico..."
BASH_PROFILE="${HOME_PI}/.profile"
mkdir -p "${HOME_PI}"
if ! grep -q "startx" "${BASH_PROFILE}" 2>/dev/null; then
    cat << 'EOF' >> "${BASH_PROFILE}"

# Iniciar Kiosk PDV automaticamente no TTY1
if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then
    exec startx -- -nocursor
fi
EOF
fi

# 7. Configurar o Openbox e Desktop Autostart para abrir o PDV em tela cheia (Kiosk)
echo "[6/7] Criando script Kiosk do Cybertech RP..."
mkdir -p "${HOME_PI}/.config/openbox"
mkdir -p "${HOME_PI}/.config/autostart"

cat << EOF > "${HOME_PI}/.config/openbox/autostart"
#!/bin/bash

# Desativar protetor de tela e desligamento do monitor (Display Power Management)
xset -dpms
xset s off
xset s noblank

# Esconder o cursor do mouse se ficar parado por mais de 3 segundos
unclutter -idle 3 -root &

# Aguardar o servidor do PDV estar acessivel
URL="${SERVER_URL}"
echo "Aguardando servidor PDV (\$URL)..."

# Loop de inicializacao continua do Chromium
while true; do
    chromium-browser \
        --noerrdialogs \
        --disable-infobars \
        --kiosk \
        --kiosk-printing \
        --check-for-update-interval=31536000 \
        --disable-pinch \
        --overscroll-history-navigation=0 \
        --disable-session-crashed-bubble \
        --disable-features=TranslateUI \
        --enable-features=OverlayScrollbar \
        --autoplay-policy=no-user-gesture-required \
        --window-size=1920,1080 \
        --start-maximized \
        "\$URL"
    
    sleep 2
done
EOF

chmod +x "${HOME_PI}/.config/openbox/autostart" || true

# Copiar como script central do sistema
cp "${HOME_PI}/.config/openbox/autostart" /usr/local/bin/cybertech-pdv-kiosk.sh
chmod +x /usr/local/bin/cybertech-pdv-kiosk.sh

# Configurar autostart universal XDG (para versoes Desktop do Linux)
cat << EOF > "${HOME_PI}/.config/autostart/cybertech-pdv.desktop"
[Desktop Entry]
Type=Application
Name=Cybertech RP PDV
Exec=/usr/local/bin/cybertech-pdv-kiosk.sh
Terminal=false
StartupNotify=false
X-GNOME-Autostart-enabled=true
EOF

chmod +x "${HOME_PI}/.config/autostart/cybertech-pdv.desktop" || true

# Configurar LXDE-pi autostart (Desktop padrao Raspberry Pi)
if [ -d "/etc/xdg/lxsession/LXDE-pi" ]; then
    if ! grep -q "cybertech-pdv-kiosk.sh" /etc/xdg/lxsession/LXDE-pi/autostart 2>/dev/null; then
        echo "@/usr/local/bin/cybertech-pdv-kiosk.sh" >> /etc/xdg/lxsession/LXDE-pi/autostart || true
    fi
fi

chown -R ${USER_PI}:${USER_PI} "${HOME_PI}" || true

# 8. Finalizacao
echo "[7/7] Configuracao concluida com sucesso!"
echo "O Raspberry Pi sera reiniciado em 5 segundos no modo Caixa PDV..."
sleep 5
reboot
