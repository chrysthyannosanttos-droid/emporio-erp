#!/bin/bash
# ==============================================================================
# CYBERTECH BOX - GERADOR DE ISO LINUX (ESTILO CISSBOX)
# Gera uma imagem ISO híbrida bootável (UEFI / Legacy) para pendrive e SSD
# ==============================================================================
set -e

ISO_NAME="cybertech-box-linux-x86_64.iso"
WORK_DIR="/tmp/cybertech-iso-build"
DEBIAN_ISO_URL="https://cdimage.debian.org/debian-cd/current/amd64/iso-cd/debian-12.7.0-amd64-netinst.iso"

echo "======================================================================"
echo " CYBERTECH BOX - CONSTRUTOR DE ISO LINUX FRENTE DE CAIXA (CISSBOX)"
echo " Alvo: ${ISO_NAME}"
echo "======================================================================"

# Verificar dependências
for cmd in xorriso isolinux cpio gzip wget; do
    if ! command -v $cmd >/dev/null 2>&1; then
        echo "Instalando dependência: $cmd..."
        sudo apt-get update && sudo apt-get install -y xorriso isolinux syslinux-utils cpio gzip wget
        break
    fi
done

mkdir -p "${WORK_DIR}/iso"
mkdir -p "${WORK_DIR}/initrd"

echo "[1/4] Baixando base Debian Minimal (Netinst)..."
if [ ! -f "/tmp/debian-base.iso" ]; then
    wget -q --show-progress -O /tmp/debian-base.iso "${DEBIAN_ISO_URL}" || \
    wget -q --show-progress -O /tmp/debian-base.iso "https://cdimage.debian.org/debian-cd/current/amd64/iso-cd/debian-12.5.0-amd64-netinst.iso"
fi

echo "[2/4] Extraindo ISO base..."
xorriso -osirrox on -indev /tmp/debian-base.iso -extract / "${WORK_DIR}/iso"

echo "[3/4] Injetando Preseed Autônomo e Regras de Hardware (Pinpad/TEF)..."
cp preseed.cfg "${WORK_DIR}/iso/preseed.cfg"

# Injetar preseed dentro do initrd.gz
chmod +w -R "${WORK_DIR}/iso/install.amd/"
gunzip "${WORK_DIR}/iso/install.amd/initrd.gz"
echo "preseed.cfg" | cpio -H newc -o -A -F "${WORK_DIR}/iso/install.amd/initrd"
gzip "${WORK_DIR}/iso/install.amd/initrd"

# Configurar ISOLINUX para boot imediato sem pressionar teclas (timeout 1s)
cat << 'BOOT_EOF' > "${WORK_DIR}/iso/isolinux/isolinux.cfg"
default cybertech
prompt 0
timeout 10

label cybertech
  menu label ^Instalar Cybertech Box PDV Automaticamente
  kernel /install.amd/vmlinuz
  append auto=true priority=critical vga=788 initrd=/install.amd/initrd.gz preseed/file=/preseed.cfg quiet ---
BOOT_EOF

echo "[4/4] Empacotando e Gerando ISO Híbrida Bootável (${ISO_NAME})..."
xorriso -as mkisofs \
    -r -V "CYBERTECH_BOX" \
    -o "${ISO_NAME}" \
    -J -joliet-long -cache-inodes \
    -isohybrid-mbr /usr/lib/ISOLINUX/isohdpfx.bin \
    -b isolinux/isolinux.bin \
    -c isolinux/boot.cat \
    -boot-load-size 4 -boot-info-table -no-emul-boot \
    -eltorito-alt-boot \
    -e boot/grub/efi.img \
    -no-emul-boot -isohybrid-gpt-basdat \
    "${WORK_DIR}/iso"

echo "======================================================================"
echo ">> [SUCESSO] ISO Gerada com sucesso: ${ISO_NAME}"
echo ">> Esta ISO pode ser gravada em qualquer pendrive com Rufus, Ventoy ou Etcher."
echo ">> Ao ligar o PC do caixa pelo pendrive, ele se auto-instala no estilo CISSBox!"
echo "======================================================================"

