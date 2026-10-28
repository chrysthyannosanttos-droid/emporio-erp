import React, { useState, useEffect, useRef } from 'react';
import type { PdvTerminalConfig } from '../types/terminal';

interface TerminalActivationProps {
  onActivated: (config: PdvTerminalConfig) => void;
}

export function TerminalActivation({ onActivated }: TerminalActivationProps) {
  const [code, setCode] = useState<string>('');
  const [apiUrl, setApiUrl] = useState<string>(() => {
    return localStorage.getItem('emporio_api_url') || 'http://localhost:3000';
  });
  const [showSettings, setShowSettings] = useState(false);
  const [status, setStatus] = useState<'INITIALIZING' | 'WAITING' | 'SUCCESS' | 'ERROR'>('INITIALIZING');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pairSuccessData, setPairSuccessData] = useState<PdvTerminalConfig | null>(null);

  const pollingRef = useRef<any>(null);

  // 1. Gera ou obtém código de ativação do terminal
  const fetchOrGenerateCode = async (targetApi = apiUrl) => {
    setStatus('INITIALIZING');
    setErrorMessage(null);

    // Verifica se já temos um código salvo localmente neste terminal
    let existingCode = localStorage.getItem('emporio_pending_code');

    try {
      const res = await fetch(`${targetApi}/api/pdv/pair/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: existingCode || undefined,
          version: '2.0.0'
        })
      });

      if (!res.ok) {
        throw new Error(`Falha ao conectar com servidor (${res.status})`);
      }

      const data = await res.json();
      if (data.code) {
        setCode(data.code);
        localStorage.setItem('emporio_pending_code', data.code);
        setStatus('WAITING');
      } else {
        throw new Error('Servidor não retornou código de ativação');
      }
    } catch (err) {
      console.warn('Erro ao registrar via API, gerando código local:', err);
      // Fallback local se o servidor estiver temporariamente inacessível
      if (!existingCode) {
        const rand = Math.floor(1000 + Math.random() * 9000);
        existingCode = `PDV-${rand}-BR`;
        localStorage.setItem('emporio_pending_code', existingCode);
      }
      setCode(existingCode);
      setStatus('WAITING');
      setErrorMessage('Aguardando conexão com servidor Next.js em ' + targetApi);
    }
  };

  useEffect(() => {
    fetchOrGenerateCode(apiUrl);
  }, []);

  // 2. Polling para verificar se o administrador vinculou o código no painel
  useEffect(() => {
    if (!code || status === 'SUCCESS') return;

    const checkPairing = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/pdv/pair/check?code=${code}`);
        if (!res.ok) return;

        const data = await res.json();
        if (data.paired && data.company && data.store) {
          const config: PdvTerminalConfig = {
            paired: true,
            terminalId: data.terminalId,
            terminalName: data.terminalName || 'Caixa PDV',
            cashierNumber: data.cashierNumber || 1,
            code: code,
            token: data.token,
            company: data.company,
            store: data.store,
            apiUrl: apiUrl
          };

          // Salva configuração do terminal
          localStorage.setItem('emporio_pdv_terminal', JSON.stringify(config));
          localStorage.removeItem('emporio_pending_code');

          setPairSuccessData(config);
          setStatus('SUCCESS');

          // Transição com animação
          setTimeout(() => {
            onActivated(config);
          }, 2500);
        }
      } catch (err) {
        // Polling silencioso
      }
    };

    // Checa a cada 2 segundos
    pollingRef.current = setInterval(checkPairing, 2000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [code, apiUrl, status, onActivated]);

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveApiUrl = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('emporio_api_url', apiUrl);
    setShowSettings(false);
    fetchOrGenerateCode(apiUrl);
  };

  const handleRegenerateCode = () => {
    localStorage.removeItem('emporio_pending_code');
    fetchOrGenerateCode(apiUrl);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at top, #111827 0%, #030712 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#f9fafb',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* Background Glows */}
      <div style={{
        position: 'absolute',
        width: 600,
        height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)',
        top: '-15%',
        left: '-10%',
        pointerEvents: 'none'
      }} />

      <div style={{
        position: 'absolute',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)',
        bottom: '-10%',
        right: '-5%',
        pointerEvents: 'none'
      }} />

      {/* Main Glass Card */}
      <div style={{
        width: '100%',
        maxWidth: 580,
        background: 'rgba(17, 24, 39, 0.85)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 24,
        padding: '40px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
        position: 'relative',
        zIndex: 10
      }}>

        {/* Top Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 28,
            boxShadow: '0 10px 30px rgba(99, 102, 241, 0.4)'
          }}>
            🖥️
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>
            Ativação do Terminal PDV
          </h1>
          <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 6 }}>
            Vincule este caixa ao painel da sua empresa para iniciar as operações
          </p>
        </div>

        {status === 'SUCCESS' && pairSuccessData ? (
          /* SUCCESS STATE */
          <div style={{
            textAlign: 'center',
            padding: '24px 0',
            animation: 'fadeIn 0.5s ease'
          }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid #10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 34,
              margin: '0 auto 16px',
              color: '#10b981'
            }}>
              ✓
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#34d399', margin: 0 }}>
              Terminal Ativado com Sucesso!
            </h2>

            <div style={{
              marginTop: 18,
              padding: 16,
              borderRadius: 16,
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              textAlign: 'left',
              fontSize: 13
            }}>
              <p style={{ margin: '4px 0', color: '#94a3b8' }}>
                🏢 <strong style={{ color: '#f8fafc' }}>Empresa:</strong> {pairSuccessData.company.name}
              </p>
              <p style={{ margin: '4px 0', color: '#94a3b8' }}>
                🏬 <strong style={{ color: '#f8fafc' }}>Loja / Filial:</strong> {pairSuccessData.store.name} ({pairSuccessData.store.code})
              </p>
              <p style={{ margin: '4px 0', color: '#94a3b8' }}>
                🛒 <strong style={{ color: '#f8fafc' }}>Terminal:</strong> {pairSuccessData.terminalName} (Caixa #{pairSuccessData.cashierNumber})
              </p>
            </div>

            <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 20 }}>
              Iniciando a frente de caixa...
            </p>
          </div>
        ) : (
          /* WAITING / ACTIVE PAIRING CODE CARD */
          <>
            {/* Box do Código */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
              border: '2px dashed rgba(99, 102, 241, 0.4)',
              borderRadius: 20,
              padding: '24px 20px',
              textAlign: 'center',
              position: 'relative',
              marginBottom: 24
            }}>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '1.2px',
                color: '#818cf8',
                display: 'block',
                marginBottom: 10
              }}>
                Código de Ativação Deste Caixa
              </span>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12
              }}>
                <span style={{
                  fontFamily: 'monospace',
                  fontSize: 32,
                  fontWeight: 900,
                  letterSpacing: '3px',
                  color: '#ffffff',
                  textShadow: '0 0 20px rgba(99, 102, 241, 0.5)'
                }}>
                  {code || 'GERANDO...'}
                </span>

                <button
                  type="button"
                  onClick={handleCopy}
                  title="Copiar Código"
                  style={{
                    background: copied ? '#059669' : '#374151',
                    border: 'none',
                    borderRadius: 10,
                    color: '#fff',
                    padding: '8px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {copied ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>

              {/* Status do Polling */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 16,
                fontSize: 12,
                color: '#34d399'
              }}>
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 10px #10b981'
                }} />
                <span>Aguardando você digitar este código no Painel Web...</span>
              </div>

              {errorMessage && (
                <div style={{
                  marginTop: 12,
                  padding: '6px 12px',
                  borderRadius: 8,
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  fontSize: 11
                }}>
                  {errorMessage}
                </div>
              )}
            </div>

            {/* Passo a Passo para o Operador/Admin */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.5)',
              borderRadius: 16,
              padding: '18px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              fontSize: 12,
              lineHeight: 1.6,
              color: '#cbd5e1',
              marginBottom: 20
            }}>
              <strong style={{ color: '#fff', display: 'block', marginBottom: 8, fontSize: 13 }}>
                Como vincular este caixa:
              </strong>
              <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                <span style={{
                  background: '#4f46e5',
                  color: '#fff',
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0
                }}>1</span>
                <span>Acesse o Painel Web da sua empresa no computador do administrador.</span>
              </div>

              <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                <span style={{
                  background: '#4f46e5',
                  color: '#fff',
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0
                }}>2</span>
                <span>Vá no menu <strong>Configurações &gt; Terminais PDV</strong> e clique em <strong>"Vincular Novo Caixa"</strong>.</span>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{
                  background: '#10b981',
                  color: '#fff',
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0
                }}>3</span>
                <span>Digite o código <strong>{code}</strong> e escolha a <strong>Loja do Grupo (Filial)</strong> deste caixa.</span>
              </div>
            </div>

            {/* Rodapé e Configurações de Conexão */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 11,
              color: '#6b7280'
            }}>
              <button
                type="button"
                onClick={handleRegenerateCode}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#818cf8',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: 11
                }}
              >
                Gerar Outro Código
              </button>

              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                ⚙️ {showSettings ? 'Ocultar Servidor' : 'Configurar Servidor'}
              </button>
            </div>

            {/* Drawer de Configuração da URL da API */}
            {showSettings && (
              <form onSubmit={handleSaveApiUrl} style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 12,
                background: '#111827',
                border: '1px solid #374151'
              }}>
                <label style={{ display: 'block', fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>
                  Endereço do Servidor ERP (Next.js):
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="http://localhost:3000 ou http://192.168.1.100:3000"
                    style={{
                      flex: 1,
                      background: '#1f2937',
                      border: '1px solid #4b5563',
                      borderRadius: 8,
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: 12,
                      outline: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      background: '#4f46e5',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '0 14px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Salvar
                  </button>
                </div>
              </form>
            )}
          </>
        )}

      </div>
    </div>
  );
}
