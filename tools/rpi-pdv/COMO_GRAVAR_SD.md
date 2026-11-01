# Guia de Preparação do Cartão SD para Raspberry Pi 3 (PDV Cybertech RP)

Este guia prepara um cartão micro SD que, ao ser colocado no Raspberry Pi 3, inicia o sistema **automaticamente como um Terminal PDV Kiosk**, comunicando-se com o Servidor Central.

---

## Passo a Passo Rápido (3 Minutos)

### 1. Gravar a Base do Sistema (Raspberry Pi Imager)
1. Baixe e abra o **[Raspberry Pi Imager](https://www.raspberrypi.com/software/)** no seu computador.
2. Em **Dispositivo**, selecione: `Raspberry Pi 3`.
3. Em **Sistema Operacional**, escolha:
   - `Raspberry Pi OS (other)` ➔ **`Raspberry Pi OS Lite (64-bit)`** *(ou 32-bit)*.
4. Em **Armazenamento**, escolha o seu **Cartão Micro SD**.
5. Clique em **Próximo** e confirme a gravação.

---

### 2. Deixar o Cartão Pronto para o PDV (Automático)
Com o cartão ainda plugado no leitor do computador:

1. Clique com o botão direito no arquivo:
   `tools/rpi-pdv/prepare-sd.ps1` ➔ **"Executar com o PowerShell"**.
2. O script irá:
   - Detectar o IP local do seu servidor (`192.168.70.60:3000/pdv`).
   - Copiar o inicializador autônomo para o cartão SD.
   - Configurar o boot automático do terminal.

---

### 3. Ligar no Raspberry Pi 3
1. Retire o cartão SD do computador e coloque no Raspberry Pi 3.
2. Conecte o cabo de rede (ou Wi-Fi) e o cabo HDMI no monitor do caixa.
3. Ligue a fonte do Raspberry Pi na tomada.

**O que vai acontecer:**
- O Pi fará o primeiro boot, instalando o ambiente kiosk ultra-leve (~300MB RAM) e drivers para balança USB e impressora térmica.
- Ele reiniciará automaticamente em poucos minutos e **abrirá diretamente na tela do PDV**, sincronizado com o seu painel!

