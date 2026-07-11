"use client";

import { useState, useEffect, useTransition } from "react";
import { createCompany, listCompanies } from "@/actions/company";
import {
  Building2, Plus, Copy, Check, Users, Package, ShoppingCart,
  X, Globe, ExternalLink, Search, Loader2
} from "lucide-react";

type Company = {
  id: string;
  name: string;
  document: string;
  createdAt: Date;
  users: { name: string; email: string }[];
  _count: { users: number; products: number; sales: number };
};

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "https://emporio-iota.vercel.app";

export default function MasterCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    listCompanies().then((res) => {
      setCompanies((res.companies as unknown as Company[]) || []);
      setLoading(false);
    });
  }, []);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createCompany(fd);
      if (res.error) {
        setError(res.error);
      } else if (res.success && res.company) {
        setCompanies((prev) => [res.company as unknown as Company, ...prev]);
        setShowForm(false);
        (e.target as HTMLFormElement).reset();
      }
    });
  };

  const copyLink = (id: string) => {
    const link = `${BASE_URL}/loja/${id}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.document.includes(search)
  );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Building2 size={18} color="#fff" />
            </div>
            <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>
              Gestão de Empresas
            </h1>
          </div>
          <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
            Painel Master — Cristiano · {companies.length} empresa{companies.length !== 1 ? "s" : ""} cadastrada{companies.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            border: "none", borderRadius: 10,
            padding: "10px 18px", color: "#fff",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            boxShadow: "0 4px 20px rgba(99,102,241,0.35)",
            transition: "all 0.2s",
          }}
        >
          <Plus size={16} />
          Nova Empresa
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total de Empresas", value: companies.length, icon: <Building2 size={18} />, color: "#6366f1" },
          { label: "Total de Usuários", value: companies.reduce((a, c) => a + c._count.users, 0), icon: <Users size={18} />, color: "#8b5cf6" },
          { label: "Total de Produtos", value: companies.reduce((a, c) => a + c._count.products, 0), icon: <Package size={18} />, color: "#06b6d4" },
        ].map((s) => (
          <div key={s.label} style={{
            background: "#0f1123",
            border: "1px solid rgba(99,102,241,0.1)",
            borderRadius: 14,
            padding: "18px 20px",
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: `${s.color}20`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: s.color,
            }}>
              {s.icon}
            </div>
            <div>
              <div style={{ color: "#fff", fontSize: 22, fontWeight: 700 }}>{s.value}</div>
              <div style={{ color: "#64748b", fontSize: 12 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <Search size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#475569" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou CNPJ..."
          style={{
            width: "100%", boxSizing: "border-box",
            background: "#0f1123", border: "1px solid rgba(99,102,241,0.12)",
            borderRadius: 10, paddingLeft: 40, paddingRight: 16,
            paddingTop: 10, paddingBottom: 10,
            fontSize: 13, color: "#e2e8f0",
          }}
        />
      </div>

      {/* Companies table */}
      <div style={{
        background: "#0f1123",
        border: "1px solid rgba(99,102,241,0.1)",
        borderRadius: 16,
        overflow: "hidden",
      }}>
        {/* Table header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "2fr 1.5fr 1.5fr 1fr 1fr 1fr auto",
          padding: "12px 20px",
          borderBottom: "1px solid rgba(99,102,241,0.08)",
          background: "rgba(99,102,241,0.04)",
        }}>
          {["Empresa", "CNPJ/CPF", "Admin", "Usuários", "Produtos", "Vendas", "Ações"].map((h) => (
            <div key={h} style={{ color: "#475569", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.6px" }}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#475569" }}>
            <Loader2 size={28} style={{ animation: "spin 1s linear infinite", margin: "0 auto 10px" }} />
            <p style={{ margin: 0, fontSize: 13 }}>Carregando empresas...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#475569" }}>
            <Building2 size={40} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
            <p style={{ margin: 0, fontSize: 14 }}>
              {search ? "Nenhuma empresa encontrada." : "Nenhuma empresa cadastrada ainda."}
            </p>
            {!search && (
              <button onClick={() => setShowForm(true)} style={{
                marginTop: 16, background: "#6366f1", border: "none",
                borderRadius: 8, padding: "8px 16px", color: "#fff",
                fontSize: 12, cursor: "pointer",
              }}>
                Criar primeira empresa
              </button>
            )}
          </div>
        ) : (
          filtered.map((company, i) => (
            <div key={company.id} style={{
              display: "grid",
              gridTemplateColumns: "2fr 1.5fr 1.5fr 1fr 1fr 1fr auto",
              padding: "16px 20px",
              borderBottom: i < filtered.length - 1 ? "1px solid rgba(99,102,241,0.06)" : "none",
              alignItems: "center",
              transition: "background 0.15s",
            }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.04)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div>
                <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600 }}>{company.name}</div>
                <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>
                  ID: {company.id.slice(0, 8)}...
                </div>
              </div>
              <div style={{ color: "#94a3b8", fontSize: 13, fontFamily: "monospace" }}>
                {company.document}
              </div>
              <div>
                {company.users[0] ? (
                  <>
                    <div style={{ color: "#e2e8f0", fontSize: 13 }}>{company.users[0].name}</div>
                    <div style={{ color: "#475569", fontSize: 11 }}>{company.users[0].email}</div>
                  </>
                ) : (
                  <span style={{ color: "#475569", fontSize: 12 }}>—</span>
                )}
              </div>
              <div style={{ color: "#94a3b8", fontSize: 14, fontWeight: 600 }}>{company._count.users}</div>
              <div style={{ color: "#94a3b8", fontSize: 14, fontWeight: 600 }}>{company._count.products}</div>
              <div style={{ color: "#94a3b8", fontSize: 14, fontWeight: 600 }}>{company._count.sales}</div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => copyLink(company.id)}
                  title="Copiar link da loja"
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    background: copiedId === company.id ? "rgba(34,197,94,0.15)" : "rgba(99,102,241,0.12)",
                    border: `1px solid ${copiedId === company.id ? "rgba(34,197,94,0.3)" : "rgba(99,102,241,0.2)"}`,
                    borderRadius: 8, padding: "6px 10px",
                    color: copiedId === company.id ? "#4ade80" : "#818cf8",
                    fontSize: 11, fontWeight: 600, cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {copiedId === company.id ? <Check size={12} /> : <Copy size={12} />}
                  {copiedId === company.id ? "Copiado!" : "Link"}
                </button>
                <a
                  href={`/loja/${company.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir loja"
                  style={{
                    display: "flex", alignItems: "center",
                    background: "rgba(6,182,212,0.1)",
                    border: "1px solid rgba(6,182,212,0.2)",
                    borderRadius: 8, padding: "6px 8px",
                    color: "#22d3ee", cursor: "pointer",
                    transition: "all 0.2s",
                    textDecoration: "none",
                  }}
                >
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create company modal */}
      {showForm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20,
        }}>
          <div style={{
            background: "#0f1123",
            border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: 20,
            padding: "32px",
            width: "100%", maxWidth: 520,
            boxShadow: "0 25px 80px rgba(0,0,0,0.8)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
              <div>
                <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: 0 }}>Nova Empresa</h2>
                <p style={{ color: "#64748b", fontSize: 12, marginTop: 4, marginBottom: 0 }}>
                  Será criada com um usuário admin vinculado
                </p>
              </div>
              <button onClick={() => { setShowForm(false); setError(null); }} style={{
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8, padding: 8, cursor: "pointer", color: "#64748b",
              }}>
                <X size={16} />
              </button>
            </div>

            {error && (
              <div style={{
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 8, padding: "10px 14px", marginBottom: 20,
                color: "#f87171", fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              
              <div style={{ borderBottom: "1px solid rgba(99,102,241,0.08)", paddingBottom: 16 }}>
                <p style={{ color: "#6366f1", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 12px" }}>
                  Dados da Empresa
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", color: "#94a3b8", fontSize: 11, marginBottom: 5, fontWeight: 600 }}>Nome da Empresa *</label>
                    <input name="name" required placeholder="Ex: Mercado São João" style={inputStyle} />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", color: "#94a3b8", fontSize: 11, marginBottom: 5, fontWeight: 600 }}>CNPJ / CPF *</label>
                    <input name="document" required placeholder="00.000.000/0001-00" style={inputStyle} />
                  </div>
                </div>
              </div>

              <div>
                <p style={{ color: "#6366f1", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 12px" }}>
                  Usuário Administrador
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", color: "#94a3b8", fontSize: 11, marginBottom: 5, fontWeight: 600 }}>Nome do Admin *</label>
                    <input name="adminName" required placeholder="João Silva" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: "block", color: "#94a3b8", fontSize: 11, marginBottom: 5, fontWeight: 600 }}>Email de Acesso *</label>
                    <input name="adminEmail" required type="email" placeholder="joao@empresa.com" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: "block", color: "#94a3b8", fontSize: 11, marginBottom: 5, fontWeight: 600 }}>Senha *</label>
                    <input name="adminPassword" required type="password" placeholder="Mínimo 6 caracteres" style={inputStyle} />
                  </div>
                </div>
              </div>

              {/* Link preview */}
              <div style={{
                background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.15)",
                borderRadius: 10, padding: "10px 14px",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <Globe size={14} color="#22d3ee" />
                <span style={{ color: "#64748b", fontSize: 12 }}>
                  Link da loja:{" "}
                  <span style={{ color: "#22d3ee" }}>{BASE_URL}/loja/<span style={{ opacity: 0.6 }}>[id-gerado]</span></span>
                </span>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => { setShowForm(false); setError(null); }} style={{
                  flex: 1, padding: "11px 0",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10, color: "#94a3b8",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>
                  Cancelar
                </button>
                <button type="submit" disabled={isPending} style={{
                  flex: 2, padding: "11px 0",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  border: "none", borderRadius: 10, color: "#fff",
                  fontSize: 13, fontWeight: 700, cursor: isPending ? "not-allowed" : "pointer",
                  opacity: isPending ? 0.7 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
                }}>
                  {isPending ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Criando...</> : <><Plus size={14} /> Criar Empresa</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input::placeholder { color: #374151; }
        input:focus { outline: none; border-color: rgba(99,102,241,0.5) !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
      `}</style>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "rgba(10,13,28,0.8)",
  border: "1px solid rgba(99,102,241,0.15)",
  borderRadius: 10, padding: "10px 14px",
  fontSize: 13, color: "#e2e8f0",
  transition: "all 0.2s",
};
