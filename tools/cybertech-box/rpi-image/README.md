# ==============================================================================
# CYBERTECH BOX - RASPBERRY PI OS APPLIANCE IMAGE (ESTILO CISSBOX)
# ==============================================================================
# Instruções para gerar a imagem pronta (.img) do Raspberry Pi:
#
# 1. Baixe a imagem base Raspberry Pi OS Lite (64-bit ou 32-bit):
#    https://downloads.raspberrypi.com/raspios_lite_arm64/images/
#
# 2. Monte a imagem em loopback no Linux:
#    sudo losetup -Pf raspios.img
#
# 3. Injete os arquivos de firstboot:
#    - Copie firstrun.sh para a partição /boot
#    - Habilite SSH (toque um arquivo vazio 'ssh' na partição /boot)
#    - Configure userconf.txt com o usuário 'cyber' e senha padrão
#
# 4. Ao gravar no cartão SD via Raspberry Pi Imager ou Etcher:
#    O Raspberry Pi ligará, ativará o Kiosk em tela cheia direto no Caixa configurado,
#    com VNC ativo na porta 5900 e regras de udev prontas para Pinpad e Epson TM-T20.

