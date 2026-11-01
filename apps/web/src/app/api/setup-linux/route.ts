import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const host = req.headers.get("host") || "localhost:3000";
  const serverIp = host.split(":")[0];
  const searchParams = req.nextUrl.searchParams;
  const caixaNum = searchParams.get("caixa") || "1";

  const script = `#!/bin/bash
# ==============================================================================
# CYBERTECH RP - AUTO CONFIGURADOR LINUX / RASPBERRY PI v3.0
# ==============================================================================
set -e

CAIXA_NUM="${caixaNum}"
SERVER_HOST="${host}"
URL="http://\${SERVER_HOST}/pdv?caixa=\${CAIXA_NUM}"

echo "=========================================================="
echo " CONFIGURANDO AUTO-INICIALIZACAO CYBERTECH RP (CAIXA \${CAIXA_NUM})"
echo " Alvo: \${URL}"
echo "=========================================================="

CURRENT_USER=$(logname 2>/dev/null || echo $USER)
USER_HOME=$(eval echo ~\${CURRENT_USER})

sudo mkdir -p /usr/local/bin

# ==============================================================================
# 1. SCRIPT KIOSK PRINCIPAL
# ==============================================================================
cat << 'EOF' | sudo tee /usr/local/bin/cybertech-pdv-kiosk.sh > /dev/null
#!/bin/bash
export DISPLAY=:0
xset -dpms 2>/dev/null || true
xset s off 2>/dev/null || true
xset s noblank 2>/dev/null || true
which unclutter >/dev/null 2>&1 && unclutter -idle 3 -root &

TARGET_URL="__TARGET_URL__"

for i in {1..60}; do
    curl -s --head "$TARGET_URL" >/dev/null 2>&1 && break
    sleep 1
done

BROWSER=""
for b in chromium-browser chromium google-chrome google-chrome-stable; do
    if command -v $b >/dev/null 2>&1; then
        BROWSER=$b
        break
    fi
done

if [ -z "$BROWSER" ]; then
    sudo apt-get update && sudo apt-get install -y chromium-browser || sudo apt-get install -y chromium
    BROWSER="chromium-browser"
fi

# Limpa sessao anterior do Chromium para evitar popups de crash
rm -rf ~/.config/chromium/Singleton* 2>/dev/null || true
sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' ~/.config/chromium/Default/Preferences 2>/dev/null || true
sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' ~/.config/chromium/Default/Preferences 2>/dev/null || true

while true; do
    $BROWSER \\
        --password-store=basic \\
        --noerrdialogs \\
        --disable-infobars \\
        --kiosk \\
        --kiosk-printing \\
        --disable-print-preview \\
        --disable-pinch \\
        --overscroll-history-navigation=0 \\
        --disable-session-crashed-bubble \\
        --disable-features=TranslateUI \\
        --enable-features=OverlayScrollbar \\
        --autoplay-policy=no-user-gesture-required \\
        --check-for-update-interval=31536000 \\
        --disable-component-update \\
        --window-size=1920,1080 \\
        --start-maximized \\
        "$TARGET_URL"
    sleep 2
done
EOF

sudo sed -i "s|__TARGET_URL__|\${URL}|g" /usr/local/bin/cybertech-pdv-kiosk.sh
sudo chmod +x /usr/local/bin/cybertech-pdv-kiosk.sh

# ==============================================================================
# 2. DESATIVAR KEYRING (JANELA "UNLOCK KEYRING")
# ==============================================================================
echo ">> Desativando Keyring popup..."
rm -rf "\${USER_HOME}/.local/share/keyrings"/* 2>/dev/null || true
mkdir -p "\${USER_HOME}/.local/share/keyrings"
cat << 'KR_EOF' > "\${USER_HOME}/.local/share/keyrings/default"
Default_keyring
KR_EOF
# Cria keyring vazio sem senha
python3 -c "
import os, hashlib
kr_dir = os.path.expanduser('~/.local/share/keyrings')
os.makedirs(kr_dir, exist_ok=True)
with open(os.path.join(kr_dir, 'Default_keyring.keyring'), 'wb') as f:
    f.write(b'\\x00')
" 2>/dev/null || true

# ==============================================================================
# 3. AUTOSTART - METODO TRIPLO (garante que funciona em QUALQUER desktop)
# ==============================================================================
echo ">> Configurando autostart triplo..."

# Metodo A: XDG Autostart (funciona em LXDE, GNOME, MATE, XFCE, KDE)
mkdir -p "\${USER_HOME}/.config/autostart"
cat << DESK_EOF > "\${USER_HOME}/.config/autostart/cybertech-pdv.desktop"
[Desktop Entry]
Type=Application
Name=Cybertech RP PDV
Comment=Terminal PDV Cybertech RP Caixa \${CAIXA_NUM}
Exec=/usr/local/bin/cybertech-pdv-kiosk.sh
Terminal=false
StartupNotify=false
X-GNOME-Autostart-enabled=true
DESK_EOF
chmod +x "\${USER_HOME}/.config/autostart/cybertech-pdv.desktop"

# Metodo B: LXDE-pi autostart do sistema (Raspberry Pi OS padrao)
if [ -d "/etc/xdg/lxsession/LXDE-pi" ]; then
    sudo cp /etc/xdg/lxsession/LXDE-pi/autostart /etc/xdg/lxsession/LXDE-pi/autostart.bak 2>/dev/null || true
    # Remove entrada duplicada se existir
    sudo sed -i '/cybertech-pdv-kiosk/d' /etc/xdg/lxsession/LXDE-pi/autostart 2>/dev/null || true
    echo "@/usr/local/bin/cybertech-pdv-kiosk.sh" | sudo tee -a /etc/xdg/lxsession/LXDE-pi/autostart > /dev/null
fi

# Metodo B2: LXDE-pi autostart do USUARIO (sobrescreve o do sistema)
mkdir -p "\${USER_HOME}/.config/lxsession/LXDE-pi"
cat << LXDE_EOF > "\${USER_HOME}/.config/lxsession/LXDE-pi/autostart"
@lxpanel --profile LXDE-pi
@pcmanfm --desktop --profile LXDE-pi
@/usr/local/bin/cybertech-pdv-kiosk.sh
LXDE_EOF

# Metodo C: Openbox autostart (caso o desktop use Openbox)
mkdir -p "\${USER_HOME}/.config/openbox"
cat << OB_EOF > "\${USER_HOME}/.config/openbox/autostart"
/usr/local/bin/cybertech-pdv-kiosk.sh &
OB_EOF
chmod +x "\${USER_HOME}/.config/openbox/autostart"

# Metodo D: Bashrc fallback (abre kiosk se estiver em sessao grafica)
if ! grep -q "cybertech-pdv-kiosk" "\${USER_HOME}/.bashrc" 2>/dev/null; then
    cat << 'BASH_EOF' >> "\${USER_HOME}/.bashrc"

# Cybertech PDV Auto-Kiosk
if [ -n "$DISPLAY" ] && [ -z "$SSH_TTY" ]; then
    pgrep -f cybertech-pdv-kiosk.sh > /dev/null || /usr/local/bin/cybertech-pdv-kiosk.sh &
fi
BASH_EOF
fi

chown -R \${CURRENT_USER}:\${CURRENT_USER} "\${USER_HOME}/.config"

# ==============================================================================
# 4. IMPRESSORA TERMICA (EPSON TM-T20 / ELGIN / CUPS)
# ==============================================================================
echo ">> Configurando impressora termica padrao..."
sudo usermod -a -G lp,lpadmin,dialout \${CURRENT_USER} 2>/dev/null || true

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
        echo ">> Impressora padrao: $TARGET_PRINTER"
        sudo lpadmin -d "$TARGET_PRINTER" 2>/dev/null || true
        lpoptions -d "$TARGET_PRINTER" 2>/dev/null || true
    fi
fi

# ==============================================================================
# 5. VNC SERVER (ACESSO REMOTO AO CAIXA)
# ==============================================================================
echo ">> Ativando VNC Server..."
if command -v raspi-config >/dev/null 2>&1; then
    sudo raspi-config nonint do_vnc 0 2>/dev/null || true
    sudo systemctl enable vncserver-x11-serviced.service 2>/dev/null || true
    sudo systemctl restart vncserver-x11-serviced.service 2>/dev/null || true
fi

# ==============================================================================
# 6. DESATIVAR SCREENSAVER / DESCANSO DE TELA DO SISTEMA
# ==============================================================================
echo ">> Desativando screensaver do sistema..."
sudo apt-get remove -y xscreensaver light-locker 2>/dev/null || true
mkdir -p "\${USER_HOME}/.config/lxsession/LXDE-pi"
echo "@xset s off" >> "\${USER_HOME}/.config/lxsession/LXDE-pi/autostart"
echo "@xset -dpms" >> "\${USER_HOME}/.config/lxsession/LXDE-pi/autostart"
echo "@xset s noblank" >> "\${USER_HOME}/.config/lxsession/LXDE-pi/autostart"

# Desktop shortcut
if [ -d "\${USER_HOME}/Desktop" ]; then
    cp "\${USER_HOME}/.config/autostart/cybertech-pdv.desktop" "\${USER_HOME}/Desktop/PDV_Caixa_\${CAIXA_NUM}.desktop"
    chmod +x "\${USER_HOME}/Desktop/PDV_Caixa_\${CAIXA_NUM}.desktop"
    chown \${CURRENT_USER}:\${CURRENT_USER} "\${USER_HOME}/Desktop/PDV_Caixa_\${CAIXA_NUM}.desktop"
fi

echo ""
echo ">> [SUCESSO] PDV configurado para iniciar automaticamente como Caixa \${CAIXA_NUM}!"
echo ">> Reinicie o computador para ativar o modo Kiosk."
`;

  return new NextResponse(script, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
