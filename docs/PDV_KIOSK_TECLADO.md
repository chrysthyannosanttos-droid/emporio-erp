# CYBERTECH RP — MODO KIOSK, CONTROLE DE TECLADO E PERIFÉRICOS

Este documento detalha o funcionamento técnico do **Modo Kiosk**, as proteções de atalhos de teclado e os limites nativos de segurança entre o navegador e o sistema operacional.

---

## 1. Comandos de Teclado no Navegador vs. Sistema Operacional

Ao rodar uma aplicação comercial de PDV no navegador (ex: Chrome, Chromium, Edge), existe uma separação estrita de camadas de segurança:

| Tecla / Comando | Comportamento no Navegador | Pode ser Bloqueado via `preventDefault()`? | Onde tem Efeito Total |
|---|---|---|---|
| **F1** | Abre a Ajuda do Navegador / Suporte Windows | ✅ **SIM** (`e.preventDefault()`) | Aplicação |
| **F2** | Sem função nativa (Busca de Produto) | ✅ **SIM** (Foca input de busca) | Aplicação |
| **F3** | Abrir barra "Localizar nesta página" | ✅ **SIM** (`e.preventDefault()`) | Aplicação (Multiplicador de Qtd) |
| **F4** | Focar barra de endereços (Edge/IE) | ✅ **SIM** (`e.preventDefault()`) | Aplicação (Consulta de Preço) |
| **F5** | Recarregar Página (Perda de Venda) | ✅ **SIM** (Interrompido se houver carrinho) | Aplicação |
| **F6** | Focar barra de abas / navegação | ✅ **SIM** (`e.preventDefault()`) | Aplicação (Desconto) |
| **F7** | Navegação por cursor de texto | ✅ **SIM** (`e.preventDefault()`) | Aplicação (Imprimir Cupom) |
| **F8** | Pausar execução do Depurador | ✅ **SIM** (`e.preventDefault()`) | Aplicação (Cliente CPF/CNPJ) |
| **F9** | Sem função padrão no navegador | ✅ **SIM** | Aplicação (Catálogo/Produtos) |
| **F10** | Focar menu de contexto do navegador | ✅ **SIM** (`e.preventDefault()`) | Aplicação (Pagamento) |
| **F11** | Alternar Tela Cheia | ⚠️ **PARCIAL** (Navegador pode exigir clique) | Modo Kiosk Nativo / Desktop |
| **F12** | Abrir DevTools / Inspecionar | ⚠️ **PARCIAL** (Bloqueável via script, mas bypassível) | Kiosk Flags / Electron |
| **Ctrl + W** | Fechar aba atual | ❌ **NÃO** (Restrito pelo SO/Browser) | Somente em Modo Kiosk ou Desktop |
| **Ctrl + N** | Abrir nova janela | ❌ **NÃO** (Restrito pelo Browser) | Somente em Modo Kiosk ou Desktop |
| **Ctrl + Shift + I** | Abrir DevTools | ⚠️ **PARCIAL** (`e.preventDefault()` bloqueia) | Modo Kiosk ou Desktop |
| **Alt + F4** | Fechar janela do sistema | ❌ **NÃO** (Evento interceptado pelo Windows) | Política de Grupo / Kiosk OS |
| **Alt + Tab** | Trocar de janela | ❌ **NÃO** (Evento de Kernel do Windows) | Windows Kiosk Assigned Access |
| **Tecla Windows** | Abrir Menu Iniciar | ❌ **NÃO** (Restrito pelo SO) | Windows Shell Launcher |
| **Ctrl + Alt + Del** | Interrupção segura de segurança (GINA/SAS) | ❌ **NUNCA** (Protegido por hardware/kernel) | N/A (Norma de segurança do SO) |

---

## 2. Como Rodar em Modo Kiosk Profissional

Para que o PDV funcione exatamente como um terminal comercial dedicado, sem barra de navegação, abas ou botões de fechar:

### No Windows (Google Chrome ou Microsoft Edge)

Crie um atalho na área de trabalho ou arquivo `.bat` / `.ps1` com os parâmetros:

```cmd
"C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --kiosk "http://localhost:3000/pdv" ^
  --disable-pinch ^
  --overscroll-history-navigation=0 ^
  --disable-features=Translate ^
  --noerrdialogs ^
  --disable-infobars ^
  --incognito
```

> **Para Microsoft Edge:**
> Substitua pelo caminho do `msedge.exe` com a flag `--kiosk "http://localhost:3000/pdv" --edge-kiosk-type=fullscreen`.

### No Raspberry Pi 3 (Linux / Raspberry Pi OS Lite)

O builder oficial do repositório em `tools/rpi-pdv/build-image.ps1` já pré-configura o boot direto no Chromium Kiosk:

```bash
chromium-browser \
  --kiosk "http://192.168.70.60:3000/pdv" \
  --noerrdialogs \
  --disable-infobars \
  --check-for-update-interval=31536000 \
  --disable-session-crashed-bubble
```

---

## 3. Central de Configurações do PDV (5 Módulos)

O sistema conta com 5 módulos isolados acessíveis pelo botão de engrenagem no cabeçalho do PDV:

1. **Teclas de atalho**:
   - Visualização de todas as ações.
   - Remapeamento interativo (grava a tecla pressionada).
   - Detecção e aviso em tempo real de conflitos (impede duplicação).
   - Botão para restaurar padrão de fábrica (F2..F10, ESC, ENTER).
2. **Impressora e gaveta**:
   - Modelos: Térmica 80mm ESC/POS, 58mm ou A4.
   - Comunicação: Navegador, USB Kiosk ou TCP/IP.
   - Acionamento automático de corte de papel e pulso de gaveta.
   - Botão para testar impressão e abertura de gaveta.
3. **TEF e pagamentos**:
   - Modos: Maquineta POS Manual com passo a passo por etapas (Stone, Cielo, Rede, etc.) ou TEF integrado (PayGo, SiTef).
   - Exigência de NSU / comprovante e configuração de parcelamento.
   - Botão para testar conexão com gateway.
4. **Leitor de código de barras**:
   - Padrão USB HID (Emulador de teclado) com sufixo Enter.
   - Bip sonoro via Web Audio API a cada leitura confirmada.
   - Decodificador de etiquetas de balança Toledo/Filizola (prefixo 2).
   - Área interativa para testar leitura de códigos de barras físicos.
5. **Fiscal e NFC-e**:
   - Ambientes: Homologação e Produção.
   - Séries, numeração, CSC Id e Token de segurança.
   - Certificado Digital A1.
   - Botão para testar status do serviço na SEFAZ (retorno 107).

