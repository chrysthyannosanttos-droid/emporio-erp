"use client";

import { useState, useEffect, useTransition } from "react";
import { createCompany, listCompanies, updateCompanyLicense } from "@/actions/company";
import { updateTenantTheme, getTenantTheme } from "@/actions/theme";
import {
  Building2, Plus, Copy, Check, Users, Package, ShoppingCart,
  X, Globe, ExternalLink, Search, Loader2, Shield, ShieldCheck,
  ShieldAlert, ShieldX, CalendarClock, Image as ImageIcon,
  Palette, Save, Settings, Crown, LayoutDashboard
} from "lucide-react";

type Company = {
  id: string;
  name: string;
  document: string;
  licenseStatus: string;
  licenseExpiresAt: string;
  createdAt: string;
  users: { name: string; email: string }[];
  _count: { users: number; products: number; sales: number };
};

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "https://emporio-iota.vercel.app";

const LICENSE_BADGES: Record<string, { bg: string; border: string; color: string; icon: any; label: string }> = {
  ACTIVE: { bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.3)", color: "#4ade80", icon: ShieldCheck, label: "Ativa" },
  TRIAL: { bg: "rgba(234,179,8,0.1)", border: "rgba(234,179,8,0.3)", color: "#facc15", icon: Shield, label: "Trial" },
  SUSPENDED: { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)", color: "#f87171", icon: ShieldAlert, label: "Suspensa" },
  EXPIRED: { bg: "rgba(107,114,128,0.1)", border: "rgba(107,114,128,0.3)", color: "#9ca3af", icon: ShieldX, label: "Expirada" },
};

export default function MasterPanelPage() {
  const [tab, setTab] = useState<"companies" | "theme">("companies");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showLicense, setShowLicense] = useState<Company | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // Theme state
  const [themeLoading, setThemeLoading] = useState(false);
  const [selectedCompanyForTheme, setSelectedCompanyForTheme] = useState<string>("");
  const [themeData, setThemeData] = useState({
    logoPrincipal: "", logoPdv: "", logoImpressao: "", favicon: "",
    backgroundLogin: "", backgroundSistema: "",
    corPrimaria: "", corSecundaria: "", corMenu: "", corBotao: "",
    tema: "auto", customDomain: ""
  });

  useEffect(() => {
    listCompanies().then((res) => {
      setCompanies((res.companies as unknown as Company[]) || []);
      setLoading(false);
    });
  }, []);

  // Load theme when company changes
  useEffect(() => {
    if (selectedCompanyForTheme) {
      getTenantTheme(selectedCompanyForTheme).then((res) => {
        if (res.theme) {
          const cleaned: any = {};
          for (const key in res.theme) {
            if ((res.theme as any)[key] !== null) cleaned[key] = (res.theme as any)[key];
          }
          setThemeData((prev) => ({ ...prev, ...cleaned }));
        } else {
          setThemeData({
            logoPrincipal: "", logoPdv: "", logoImpressao: "", favicon: "",
            backgroundLogin: "", backgroundSistema: "",
            corPrimaria: "", corSecundaria: "", corMenu: "", corBotao: "",
            tema: "auto", customDomain: ""
          });
        }
      });
    }
  }, [selectedCompanyForTheme]);

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

  const handleLicenseUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!showLicense) return;
    setError(null);
    const fd = new FormData(e.currentTarget);
    const status = fd.get("licenseStatus") as string;
    const expiresAt = fd.get("licenseExpiresAt") as string;
    startTransition(async () => {
      const res = await updateCompanyLicense(showLicense.id, status, expiresAt);
      if (res.error) {
        setError(res.error);
      } else if (res.success) {
        setCompanies((prev) =>
          prev.map((c) =>
            c.id === showLicense.id
              ? { ...c, licenseStatus: status, licenseExpiresAt: expiresAt }
              : c
          )
        );
        setShowLicense(null);
      }
    });
  };

  const handleThemeSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setThemeLoading(true);
    const { ...data } = themeData;
    await updateTenantTheme(data, selectedCompanyForTheme || undefined);
    setThemeLoading(false);
    alert("✅ Tema atualizado com sucesso!");
  };

  const copyLink = (id: string) => {
    navigator.clipboard.writeText(`${BASE_URL}/loja/${id}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = companies.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.document.includes(search)
  );

  const daysLeft = (d: string) => {
    const diff = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Crown size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>
              Painel Master Cybertech
            </h1>
            <p style={{ color: "#475569", fontSize: 12, margin: 0 }}>
              Administração central — Cristiano · Super Admin
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#0a0d1a", borderRadius: 12, padding: 4, border: "1px solid rgba(99,102,241,0.1)" }}>
        {[
          { key: "companies" as const, label: "Empresas & Licenças", icon: <Building2 size={15} /> },
          { key: "theme" as const, label: "Imagens & Tema", icon: <Palette size={15} /> },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "10px 16px", borderRadius: 8, border: "none",
              background: tab === t.key ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "transparent",
              color: tab === t.key ? "#fff" : "#64748b",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════ TAB: EMPRESAS ══════════════════════════ */}
      {tab === "companies" && (
        <>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
            {[
              { label: "Empresas", value: companies.length, icon: <Building2 size={16} />, color: "#6366f1" },
              { label: "Ativas", value: companies.filter((c) => c.licenseStatus === "ACTIVE").length, icon: <ShieldCheck size={16} />, color: "#22c55e" },
              { label: "Suspensas", value: companies.filter((c) => c.licenseStatus === "SUSPENDED").length, icon: <ShieldAlert size={16} />, color: "#ef4444" },
              { label: "Usuários", value: companies.reduce((a, c) => a + c._count.users, 0), icon: <Users size={16} />, color: "#06b6d4" },
            ].map((s) => (
              <div key={s.label} style={{
                background: "#0f1123", border: "1px solid rgba(99,102,241,0.1)",
                borderRadius: 12, padding: "14px 16px",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9,
                  background: `${s.color}18`, display: "flex",
                  alignItems: "center", justifyContent: "center", color: s.color,
                }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>{s.value}</div>
                  <div style={{ color: "#475569", fontSize: 11 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Search + Create */}
          <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#475569" }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou CNPJ..."
                style={{ width: "100%", boxSizing: "border-box", background: "#0f1123", border: "1px solid rgba(99,102,241,0.12)", borderRadius: 10, paddingLeft: 36, paddingRight: 16, paddingTop: 9, paddingBottom: 9, fontSize: 13, color: "#e2e8f0" }}
              />
            </div>
            <button onClick={() => setShowForm(true)} style={{
              display: "flex", alignItems: "center", gap: 7,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              border: "none", borderRadius: 10, padding: "9px 18px",
              color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
              boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
            }}>
              <Plus size={15} /> Nova Empresa
            </button>
          </div>

          {/* Companies table */}
          <div style={{ background: "#0f1123", border: "1px solid rgba(99,102,241,0.1)", borderRadius: 14, overflow: "hidden" }}>
            <div style={{
              display: "grid", gridTemplateColumns: "2fr 1.3fr 1.2fr 0.9fr 1fr auto",
              padding: "10px 18px", borderBottom: "1px solid rgba(99,102,241,0.08)",
              background: "rgba(99,102,241,0.04)",
            }}>
              {["Empresa", "CNPJ", "Admin", "Licença", "Expira em", "Ações"].map((h) => (
                <div key={h} style={{ color: "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px" }}>{h}</div>
              ))}
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: 50, color: "#475569" }}>
                <Loader2 size={24} style={{ animation: "spin 1s linear infinite", margin: "0 auto 8px" }} />
                <p style={{ margin: 0, fontSize: 13 }}>Carregando...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: 50, color: "#475569" }}>
                <Building2 size={36} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
                <p style={{ margin: 0, fontSize: 14 }}>{search ? "Nenhuma empresa encontrada." : "Nenhuma empresa cadastrada."}</p>
              </div>
            ) : (
              filtered.map((c, i) => {
                const badge = LICENSE_BADGES[c.licenseStatus] || LICENSE_BADGES.ACTIVE;
                const days = daysLeft(c.licenseExpiresAt);
                const BadgeIcon = badge.icon;
                return (
                  <div key={c.id} style={{
                    display: "grid", gridTemplateColumns: "2fr 1.3fr 1.2fr 0.9fr 1fr auto",
                    padding: "14px 18px", alignItems: "center",
                    borderBottom: i < filtered.length - 1 ? "1px solid rgba(99,102,241,0.06)" : "none",
                    transition: "background 0.15s",
                  }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.03)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div>
                      <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                      <div style={{ color: "#475569", fontSize: 11 }}>{c._count.products} prod · {c._count.users} usr · {c._count.sales} vendas</div>
                    </div>
                    <div style={{ color: "#94a3b8", fontSize: 12, fontFamily: "monospace" }}>{c.document}</div>
                    <div>
                      {c.users[0] ? (
                        <div style={{ color: "#e2e8f0", fontSize: 12 }}>{c.users[0].name}<br /><span style={{ color: "#475569", fontSize: 11 }}>{c.users[0].email}</span></div>
                      ) : <span style={{ color: "#475569", fontSize: 12 }}>—</span>}
                    </div>
                    <div>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        background: badge.bg, border: `1px solid ${badge.border}`,
                        borderRadius: 6, padding: "3px 8px", color: badge.color,
                        fontSize: 11, fontWeight: 600,
                      }}>
                        <BadgeIcon size={11} /> {badge.label}
                      </span>
                    </div>
                    <div>
                      <div style={{ color: days <= 7 ? "#f87171" : days <= 30 ? "#facc15" : "#4ade80", fontSize: 13, fontWeight: 600 }}>
                        {days > 0 ? `${days} dias` : "Expirada"}
                      </div>
                      <div style={{ color: "#475569", fontSize: 10 }}>
                        {new Date(c.licenseExpiresAt).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button onClick={() => setShowLicense(c)} title="Gerenciar licença" style={{
                        display: "flex", alignItems: "center", gap: 4,
                        background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.2)",
                        borderRadius: 7, padding: "5px 9px", color: "#facc15",
                        fontSize: 10, fontWeight: 600, cursor: "pointer",
                      }}>
                        <CalendarClock size={11} /> Licença
                      </button>
                      <button onClick={() => copyLink(c.id)} title="Copiar link da loja" style={{
                        display: "flex", alignItems: "center", gap: 4,
                        background: copiedId === c.id ? "rgba(34,197,94,0.12)" : "rgba(99,102,241,0.1)",
                        border: `1px solid ${copiedId === c.id ? "rgba(34,197,94,0.25)" : "rgba(99,102,241,0.2)"}`,
                        borderRadius: 7, padding: "5px 9px",
                        color: copiedId === c.id ? "#4ade80" : "#818cf8",
                        fontSize: 10, fontWeight: 600, cursor: "pointer",
                      }}>
                        {copiedId === c.id ? <Check size={11} /> : <Copy size={11} />}
                        {copiedId === c.id ? "OK!" : "Link"}
                      </button>
                      <a href={`/loja/${c.id}`} target="_blank" rel="noopener noreferrer" style={{
                        display: "flex", alignItems: "center",
                        background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.18)",
                        borderRadius: 7, padding: "5px 7px", color: "#22d3ee", textDecoration: "none",
                      }}>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════ TAB: TEMA ══════════════════════════ */}
      {tab === "theme" && (
        <div>
          {/* Company selector */}
          <div style={{ marginBottom: 24, background: "#0f1123", borderRadius: 12, border: "1px solid rgba(99,102,241,0.1)", padding: "16px 20px" }}>
            <label style={{ display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.6px" }}>
              Selecione a empresa para configurar tema/imagens
            </label>
            <select
              value={selectedCompanyForTheme}
              onChange={(e) => setSelectedCompanyForTheme(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", background: "#0a0d1a", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#e2e8f0" }}
            >
              <option value="">— Selecione —</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.document})</option>
              ))}
            </select>
          </div>

          {selectedCompanyForTheme && (
            <form onSubmit={handleThemeSave} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Logos & Images */}
              <div style={{ background: "#0f1123", borderRadius: 14, border: "1px solid rgba(99,102,241,0.1)", padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                  <ImageIcon className="text-indigo-400" size={18} />
                  <h2 style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: 0 }}>Logos e Imagens</h2>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {[
                    { name: "logoPrincipal", label: "Logo Principal (URL)" },
                    { name: "logoPdv", label: "Logo PDV (URL)" },
                    { name: "logoImpressao", label: "Logo Impressão (URL)" },
                    { name: "favicon", label: "Favicon (URL)" },
                    { name: "backgroundLogin", label: "Imagem de Fundo — Login (URL)" },
                    { name: "backgroundSistema", label: "Imagem de Fundo — Sistema (URL)" },
                  ].map((field) => (
                    <div key={field.name}>
                      <label style={{ display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 600, marginBottom: 5 }}>{field.label}</label>
                      <input
                        type="text"
                        name={field.name}
                        value={(themeData as any)[field.name] || ""}
                        onChange={(e) => setThemeData({ ...themeData, [field.name]: e.target.value })}
                        placeholder="https://..."
                        style={inputStyle}
                      />
                      {(themeData as any)[field.name] && (
                        <div style={{ marginTop: 6, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(99,102,241,0.15)", maxHeight: 80 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={(themeData as any)[field.name]} alt={field.label} style={{ width: "100%", height: 80, objectFit: "cover" }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Colors */}
              <div style={{ background: "#0f1123", borderRadius: 14, border: "1px solid rgba(99,102,241,0.1)", padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                  <Palette size={18} style={{ color: "#818cf8" }} />
                  <h2 style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: 0 }}>Cores e Tema</h2>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 14 }}>
                  {[
                    { name: "corPrimaria", label: "Cor Primária", default: "#6366f1" },
                    { name: "corSecundaria", label: "Cor Secundária", default: "#818cf8" },
                    { name: "corMenu", label: "Cor do Menu", default: "#0a0e1a" },
                    { name: "corBotao", label: "Cor dos Botões", default: "#6366f1" },
                  ].map((field) => (
                    <div key={field.name}>
                      <label style={{ display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 600, marginBottom: 5 }}>{field.label}</label>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input type="color" value={(themeData as any)[field.name] || field.default}
                          onChange={(e) => setThemeData({ ...themeData, [field.name]: e.target.value })}
                          style={{ width: 36, height: 36, borderRadius: 8, cursor: "pointer", background: "transparent", border: 0, padding: 0 }} />
                        <input type="text" value={(themeData as any)[field.name] || ""}
                          onChange={(e) => setThemeData({ ...themeData, [field.name]: e.target.value })}
                          placeholder={field.default} style={{ ...inputStyle, flex: 1 }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <label style={{ display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 600, marginBottom: 5 }}>Tema Base</label>
                  <select name="tema" value={themeData.tema} onChange={(e) => setThemeData({ ...themeData, tema: e.target.value })} style={inputStyle}>
                    <option value="auto">Automático (SO)</option>
                    <option value="light">Claro</option>
                    <option value="dark">Escuro</option>
                  </select>
                </div>
              </div>

              {/* Domain */}
              <div style={{ background: "#0f1123", borderRadius: 14, border: "1px solid rgba(99,102,241,0.1)", padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <Globe size={18} style={{ color: "#818cf8" }} />
                  <h2 style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: 0 }}>Domínio Customizado</h2>
                </div>
                <input type="text" value={themeData.customDomain || ""}
                  onChange={(e) => setThemeData({ ...themeData, customDomain: e.target.value })}
                  placeholder="ex: erp.minhaempresa.com.br" style={inputStyle} />
                <p style={{ color: "#475569", fontSize: 10, marginTop: 6, marginBottom: 0 }}>
                  Irá mascarar completamente o Cybertech ERP para os usuários deste cliente.
                </p>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" disabled={themeLoading} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  border: "none", borderRadius: 10, padding: "11px 24px",
                  color: "#fff", fontSize: 13, fontWeight: 700, cursor: themeLoading ? "not-allowed" : "pointer",
                  opacity: themeLoading ? 0.7 : 1,
                  boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
                }}>
                  <Save size={15} />
                  {themeLoading ? "Salvando..." : "Salvar Configurações"}
                </button>
              </div>
            </form>
          )}

          {!selectedCompanyForTheme && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#475569" }}>
              <Settings size={40} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
              <p style={{ fontSize: 14, margin: 0 }}>Selecione uma empresa acima para configurar o tema.</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════ MODAL: NOVA EMPRESA ══════════ */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#0f1123", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 20, padding: 32, width: "100%", maxWidth: 520, boxShadow: "0 25px 80px rgba(0,0,0,0.8)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: 0 }}>Nova Empresa</h2>
                <p style={{ color: "#64748b", fontSize: 12, marginTop: 4, marginBottom: 0 }}>Cria empresa + admin + licença</p>
              </div>
              <button onClick={() => { setShowForm(false); setError(null); }} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 8, cursor: "pointer", color: "#64748b" }}>
                <X size={16} />
              </button>
            </div>
            {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#f87171", fontSize: 13 }}>{error}</div>}
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <SectionLabel>Dados da Empresa</SectionLabel>
              <FormField label="Nome da Empresa *" name="name" placeholder="Ex: Mercado São João" />
              <FormField label="CNPJ / CPF *" name="document" placeholder="00.000.000/0001-00" />
              <SectionLabel>Licença</SectionLabel>
              <div>
                <label style={labelStyle}>Dias de licença *</label>
                <select name="licenseDays" defaultValue="30" style={inputStyle}>
                  <option value="7">7 dias (Trial)</option>
                  <option value="30">30 dias</option>
                  <option value="90">90 dias</option>
                  <option value="180">180 dias</option>
                  <option value="365">1 ano</option>
                </select>
              </div>
              <SectionLabel>Usuário Administrador</SectionLabel>
              <FormField label="Nome do Admin *" name="adminName" placeholder="João Silva" />
              <FormField label="Email de Acesso *" name="adminEmail" placeholder="joao@empresa.com" type="email" />
              <FormField label="Senha *" name="adminPassword" placeholder="Mínimo 6 caracteres" type="password" />
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => { setShowForm(false); setError(null); }} style={{ flex: 1, padding: "11px 0", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#94a3b8", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
                <button type="submit" disabled={isPending} style={{ flex: 2, padding: "11px 0", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 20px rgba(99,102,241,0.3)" }}>
                  {isPending ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Criando...</> : <><Plus size={14} /> Criar Empresa</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: LICENÇA ══════════ */}
      {showLicense && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#0f1123", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 20, padding: 32, width: "100%", maxWidth: 460, boxShadow: "0 25px 80px rgba(0,0,0,0.8)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: 0 }}>Gerenciar Licença</h2>
                <p style={{ color: "#64748b", fontSize: 12, marginTop: 4, marginBottom: 0 }}>{showLicense.name}</p>
              </div>
              <button onClick={() => { setShowLicense(null); setError(null); }} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 8, cursor: "pointer", color: "#64748b" }}>
                <X size={16} />
              </button>
            </div>
            {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#f87171", fontSize: 13 }}>{error}</div>}
            <form onSubmit={handleLicenseUpdate} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Status da Licença</label>
                <select name="licenseStatus" defaultValue={showLicense.licenseStatus} style={inputStyle}>
                  <option value="ACTIVE">✅ Ativa</option>
                  <option value="TRIAL">🧪 Trial</option>
                  <option value="SUSPENDED">🚫 Suspensa</option>
                  <option value="EXPIRED">⛔ Expirada</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Data de Expiração</label>
                <input type="date" name="licenseExpiresAt" defaultValue={showLicense.licenseExpiresAt?.split("T")[0] || new Date().toISOString().split("T")[0]} style={inputStyle} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => { setShowLicense(null); setError(null); }} style={{ flex: 1, padding: "11px 0", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#94a3b8", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
                <button type="submit" disabled={isPending} style={{ flex: 2, padding: "11px 0", background: "linear-gradient(135deg, #eab308, #f59e0b)", border: "none", borderRadius: 10, color: "#000", fontSize: 13, fontWeight: 700, cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {isPending ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Salvando...</> : <><CalendarClock size={14} /> Atualizar Licença</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input::placeholder, select { color: #374151; }
        input:focus, select:focus { outline: none; border-color: rgba(99,102,241,0.5) !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
      `}</style>
    </div>
  );
}

// ── Helper Components ──────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ color: "#6366f1", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", margin: "4px 0 0", borderTop: "1px solid rgba(99,102,241,0.08)", paddingTop: 12 }}>{children}</p>;
}

function FormField({ label, name, placeholder, type = "text" }: { label: string; name: string; placeholder: string; type?: string }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input name={name} required type={type} placeholder={placeholder} style={inputStyle} />
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", color: "#94a3b8", fontSize: 11, marginBottom: 5, fontWeight: 600 };

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "rgba(10,13,28,0.8)", border: "1px solid rgba(99,102,241,0.15)",
  borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#e2e8f0",
  transition: "all 0.2s",
};
