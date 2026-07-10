"use client";

import { useState } from "react";
import {
  UserCog, Plus, X, Check, Shield, Eye, EyeOff,
  Users, Edit2, ToggleLeft, ToggleRight, Key, Trash2, Search
} from "lucide-react";

// ─── Types ────────────────────────────────────────
type Role = "ADMIN" | "MANAGER" | "CASHIER" | "STOCKER" | "FINANCIAL";

interface Permission {
  module: string;
  label: string;
  roles: Role[];
}

interface AppUser {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: Role;
  cashier?: number;
  pin: string;
  active: boolean;
  color: string;
  lastLogin?: string;
  stores: string[]; // Added multi-store support
}

// ─── Permissions Matrix ───────────────────────────
const PERMISSIONS: Permission[] = [
  { module: "pdv",        label: "Frente de Caixa (PDV)",    roles: ["ADMIN","MANAGER","CASHIER"] },
  { module: "stock",      label: "Estoque & Produtos",       roles: ["ADMIN","MANAGER","STOCKER"] },
  { module: "customers",  label: "Clientes",                 roles: ["ADMIN","MANAGER","CASHIER"] },
  { module: "suppliers",  label: "Fornecedores",             roles: ["ADMIN","MANAGER"] },
  { module: "purchases",  label: "Pedidos de Compra",        roles: ["ADMIN","MANAGER"] },
  { module: "production", label: "Produção",                 roles: ["ADMIN","MANAGER","STOCKER"] },
  { module: "pricing",    label: "Precificação",             roles: ["ADMIN","MANAGER"] },
  { module: "labels",     label: "Etiquetas",                roles: ["ADMIN","MANAGER","STOCKER"] },
  { module: "expirations",label: "Validades",                roles: ["ADMIN","MANAGER","STOCKER"] },
  { module: "crm",        label: "CRM & Fidelidade",         roles: ["ADMIN","MANAGER"] },
  { module: "finance",    label: "Financeiro",               roles: ["ADMIN","MANAGER","FINANCIAL"] },
  { module: "reports",    label: "Relatórios",               roles: ["ADMIN","MANAGER","FINANCIAL"] },
  { module: "fiscal",     label: "Fiscal / NF-e",            roles: ["ADMIN","MANAGER","FINANCIAL"] },
  { module: "users",      label: "Usuários & Permissões",    roles: ["ADMIN"] },
  { module: "settings",   label: "Configurações do Sistema", roles: ["ADMIN"] },
  { module: "closing",    label: "Fechar Caixa",             roles: ["ADMIN","MANAGER","CASHIER"] },
  { module: "withdrawal", label: "Sangria & Suprimento",     roles: ["ADMIN","MANAGER"] },
  { module: "discount",   label: "Aplicar Desconto no PDV",  roles: ["ADMIN","MANAGER","CASHIER"] },
  { module: "cancel_sale",label: "Cancelar Venda",           roles: ["ADMIN","MANAGER"] },
  { module: "telesales",  label: "Televendas",               roles: ["ADMIN","MANAGER","CASHIER"] },
];

const ROLES: { key: Role; label: string; color: string; desc: string }[] = [
  { key: "ADMIN",     label: "Administrador",     color: "violet",  desc: "Acesso total ao sistema" },
  { key: "MANAGER",   label: "Gerente",           color: "indigo",  desc: "PDV + Gestão + Financeiro" },
  { key: "CASHIER",   label: "Operador de Caixa", color: "emerald", desc: "PDV + Fechar Caixa" },
  { key: "STOCKER",   label: "Repositor",         color: "amber",   desc: "Estoque + Etiquetas + Validades" },
  { key: "FINANCIAL", label: "Financeiro",        color: "sky",     desc: "Financeiro + Relatórios + Fiscal" },
];

const ROLE_COLOR: Record<Role, string> = {
  ADMIN:     "text-violet-400 bg-violet-500/10 border-violet-500/20",
  MANAGER:   "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  CASHIER:   "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  STOCKER:   "text-amber-400 bg-amber-500/10 border-amber-500/20",
  FINANCIAL: "text-sky-400 bg-sky-500/10 border-sky-500/20",
};

const AVATAR_COLORS = [
  "from-violet-500 to-purple-600",
  "from-indigo-500 to-blue-600",
  "from-emerald-500 to-green-600",
  "from-amber-500 to-orange-600",
  "from-sky-500 to-cyan-600",
  "from-rose-500 to-pink-600",
];

// ─── Mock Users ────────────────────────────────────
const MOCK_USERS: AppUser[] = [
  { id: "1", name: "Maria Silva",  initials: "MS", email: "maria@emporio.com",   role: "ADMIN",     pin: "1234", active: true,  color: AVATAR_COLORS[0], lastLogin: "Hoje 09:14", stores: ["ALL"] },
  { id: "2", name: "João Santos",  initials: "JS", email: "joao@emporio.com",    role: "MANAGER",   cashier: 2, pin: "2345", active: true,  color: AVATAR_COLORS[1], lastLogin: "Hoje 08:52", stores: ["Matriz"] },
  { id: "3", name: "Ana Costa",    initials: "AC", email: "ana@emporio.com",     role: "CASHIER",   cashier: 3, pin: "3456", active: true,  color: AVATAR_COLORS[2], lastLogin: "Hoje 09:00", stores: ["Matriz"] },
  { id: "4", name: "Carlos Lima",  initials: "CL", email: "carlos@emporio.com",  role: "CASHIER",   cashier: 4, pin: "4567", active: true,  color: AVATAR_COLORS[3], lastLogin: "Ontem 18:30", stores: ["Filial Zona Sul"] },
  { id: "5", name: "Patrícia Alves",initials:"PA", email: "patricia@emporio.com",role: "STOCKER",  pin: "5678", active: true,  color: AVATAR_COLORS[4], lastLogin: "Hoje 07:45", stores: ["ALL"] },
  { id: "6", name: "Roberto Nunes",initials: "RN", email: "roberto@emporio.com", role: "FINANCIAL", pin: "6789", active: false, color: AVATAR_COLORS[5], lastLogin: "12/06/2026", stores: ["Matriz", "Filial Zona Sul"] },
];

// ─── Helpers ──────────────────────────────────────
function hasPermission(role: Role, module: string): boolean {
  return PERMISSIONS.find(p => p.module === module)?.roles.includes(role) ?? false;
}

function RoleBadge({ role }: { role: Role }) {
  const r = ROLES.find(x => x.key === role);
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${ROLE_COLOR[role]}`}>
      {r?.label}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────
export default function UsersPage() {
  const [users, setUsers] = useState(MOCK_USERS);
  const [view, setView] = useState<"users" | "matrix">("users");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"" | "add" | "edit" | "pin">(""); 
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [showPin, setShowPin] = useState(false);

  // Form state
  const [form, setForm] = useState({ name: "", email: "", role: "CASHIER" as Role, cashier: "", pin: "", color: AVATAR_COLORS[0], stores: ["ALL"] });

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setForm({ name: "", email: "", role: "CASHIER", cashier: "", pin: "", color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)], stores: ["ALL"] });
    setEditingUser(null);
    setModal("add");
  };

  const openEdit = (user: AppUser) => {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, role: user.role, cashier: user.cashier?.toString() || "", pin: user.pin, color: user.color, stores: user.stores || ["ALL"] });
    setModal("edit");
  };

  const toggleActive = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, active: !u.active } : u));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.pin || form.pin.length !== 4) return;
    const initials = form.name.split(" ").slice(0,2).map(n => n[0]).join("").toUpperCase();
    if (editingUser) {
      setUsers(prev => prev.map(u => u.id === editingUser.id ? {
        ...u, name: form.name, email: form.email, role: form.role,
        cashier: form.cashier ? parseInt(form.cashier) : undefined,
        pin: form.pin, color: form.color, initials, stores: form.stores
      } : u));
    } else {
      setUsers(prev => [...prev, {
        id: Date.now().toString(), initials, active: true, lastLogin: "Nunca",
        name: form.name, email: form.email, role: form.role,
        cashier: form.cashier ? parseInt(form.cashier) : undefined,
        pin: form.pin, color: form.color, stores: form.stores
      }]);
    }
    setModal("");
  };

  const deleteUser = (id: string) => {
    if (confirm("Remover este usuário?")) setUsers(prev => prev.filter(u => u.id !== id));
  };

  return (
    <div className="h-full flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Usuários & Permissões</h1>
          <p className="text-slate-400 text-sm mt-1">Gerencie operadores, perfis de acesso e PINs do PDV</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-[#161b33] border border-indigo-500/15 rounded-xl overflow-hidden">
            <button
              onClick={() => setView("users")}
              className={`px-4 py-2 text-sm font-bold transition-all flex items-center gap-2 ${view === "users" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-100"}`}
            >
              <Users size={16} /> Usuários
            </button>
            <button
              onClick={() => setView("matrix")}
              className={`px-4 py-2 text-sm font-bold transition-all flex items-center gap-2 ${view === "matrix" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-100"}`}
            >
              <Shield size={16} /> Matriz de Permissões
            </button>
          </div>
          {view === "users" && (
            <button onClick={openAdd} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 text-sm">
              <Plus size={16} /> Novo Usuário
            </button>
          )}
        </div>
      </div>

      {/* ── View: Users ── */}
      {view === "users" && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-5 gap-3">
            {ROLES.map(r => {
              const count = users.filter(u => u.role === r.key && u.active).length;
              return (
                <div key={r.key} className="bg-[#111528] border border-indigo-500/[0.08] rounded-2xl p-4 text-center">
                  <div className={`text-2xl font-black ${ROLE_COLOR[r.key].split(" ")[0]}`}>{count}</div>
                  <div className="text-slate-400 text-xs mt-1 font-medium">{r.label}</div>
                  <div className="text-slate-600 text-[10px] mt-0.5">{r.desc}</div>
                </div>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="w-full bg-[#111528] border border-indigo-500/[0.08] focus:border-indigo-500 text-white pl-10 pr-4 py-3 rounded-xl outline-none transition-all text-sm"
            />
          </div>

          {/* Users table */}
          <div className="bg-[#111528] rounded-2xl border border-indigo-500/[0.08] shadow-xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#0c0f1a]/60 border-b border-indigo-500/[0.08] text-slate-400">
                <tr>
                  {["Usuário", "Perfil", "Caixa", "PIN PDV", "Último Acesso", "Status", "Ações"].map(h => (
                    <th key={h} className="px-6 py-4 font-bold uppercase tracking-wider text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-500/[0.06]">
                {filtered.map(user => (
                  <tr key={user.id} className={`hover:bg-indigo-500/[0.04] transition-colors ${!user.active ? "opacity-50" : ""}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${user.color} flex items-center justify-center font-black text-white text-xs shrink-0`}>
                          {user.initials}
                        </div>
                        <div>
                          <div className="font-bold text-white">{user.name}</div>
                          <div className="text-slate-500 text-[10px]">{user.stores.includes("ALL") ? "Todas as Lojas" : user.stores.join(", ")}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><RoleBadge role={user.role} /></td>
                    <td className="px-6 py-4 font-mono text-slate-400 text-sm">
                      {user.cashier ? `CX ${String(user.cashier).padStart(2,"0")}` : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Key size={12} className="text-slate-500" />
                        <span className="font-mono text-slate-400 text-sm tracking-widest">{showPin ? user.pin : "••••"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{user.lastLogin}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleActive(user.id)}
                        className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border transition-colors ${
                          user.active
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                            : "border-indigo-500/15 bg-[#161b33] text-slate-500 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20"
                        }`}
                      >
                        {user.active ? <><ToggleRight size={12} /> Ativo</> : <><ToggleLeft size={12} /> Inativo</>}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(user)} className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors">
                          <Edit2 size={14} />
                        </button>
                        {user.role !== "ADMIN" && (
                          <button onClick={() => deleteUser(user.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 border-t border-indigo-500/[0.08] flex justify-between items-center">
              <span className="text-slate-500 text-xs">{users.filter(u => u.active).length} ativos · {users.filter(u => !u.active).length} inativos</span>
              <button
                onClick={() => setShowPin(p => !p)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPin ? <EyeOff size={12} /> : <Eye size={12} />}
                {showPin ? "Ocultar PINs" : "Mostrar PINs"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── View: Permissions Matrix ── */}
      {view === "matrix" && (
        <div className="bg-[#111528] rounded-2xl border border-indigo-500/[0.08] shadow-xl overflow-hidden">
          <div className="p-5 border-b border-indigo-500/[0.08] bg-[#0c0f1a]/60">
            <h2 className="text-white font-bold">Matriz de Permissões por Perfil</h2>
            <p className="text-slate-500 text-xs mt-1">Visualização das permissões de cada perfil de acesso</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0c0f1a]/60 border-b border-indigo-500/[0.08]">
                <tr>
                  <th className="px-6 py-4 text-left text-slate-400 font-bold text-xs uppercase tracking-wider min-w-48">Módulo</th>
                  {ROLES.map(r => (
                    <th key={r.key} className="px-4 py-4 text-center min-w-32">
                      <div className={`text-xs font-black ${ROLE_COLOR[r.key].split(" ")[0]}`}>{r.label}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-500/[0.06]/30">
                {PERMISSIONS.map((p, i) => (
                  <tr key={p.module} className={`hover:bg-indigo-500/[0.03] transition-colors ${i % 2 === 0 ? "" : "bg-[#0c0f1a]/20"}`}>
                    <td className="px-6 py-3 text-slate-300 font-medium text-sm">{p.label}</td>
                    {ROLES.map(r => (
                      <td key={r.key} className="px-4 py-3 text-center">
                        {p.roles.includes(r.key) ? (
                          <div className="flex justify-center">
                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                              <Check size={12} className="text-emerald-400" />
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-center">
                            <div className="w-6 h-6 rounded-full bg-[#161b33] border border-indigo-500/15/40 flex items-center justify-center">
                              <X size={10} className="text-slate-700" />
                            </div>
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-indigo-500/[0.08] text-xs text-slate-600">
            {PERMISSIONS.length} módulos · {ROLES.length} perfis de acesso configurados
          </div>
        </div>
      )}

      {/* ── Modal: Add/Edit User ── */}
      {(modal === "add" || modal === "edit") && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111528] border border-indigo-500/[0.08] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-indigo-500/[0.08] flex justify-between items-center bg-[#0c0f1a]/60">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <UserCog className="text-indigo-400" />
                {modal === "add" ? "Novo Usuário" : "Editar Usuário"}
              </h3>
              <button onClick={() => setModal("")} className="p-1 rounded-lg hover:bg-[#161b33] text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Avatar preview */}
              <div className="flex items-center gap-4 mb-2">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${form.color} flex items-center justify-center font-black text-white text-xl`}>
                  {form.name ? form.name.split(" ").slice(0,2).map(n=>n[0]).join("").toUpperCase() : "?"}
                </div>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(f => ({...f, color: c}))}
                      className={`w-6 h-6 rounded-full bg-gradient-to-br ${c} border-2 transition-all ${form.color === c ? "border-white scale-125" : "border-transparent"}`} />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-1">Nome Completo</label>
                <input type="text" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} required
                  className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-4 py-2.5 rounded-xl outline-none text-sm" placeholder="Ex: Maria Silva" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-1">E-mail</label>
                <input type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} required
                  className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-4 py-2.5 rounded-xl outline-none text-sm" placeholder="usuario@emporio.com" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-1">Perfil de Acesso</label>
                <div className="grid grid-cols-1 gap-2">
                  {ROLES.map(r => (
                    <button key={r.key} type="button" onClick={() => setForm(f=>({...f,role:r.key}))}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all ${
                        form.role === r.key
                          ? `border-current ${ROLE_COLOR[r.key]}`
                          : "border-indigo-500/[0.08] text-slate-500 hover:border-indigo-500/15"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${form.role === r.key ? "border-current" : "border-indigo-500/15"}`}>
                        {form.role === r.key && <div className="w-2 h-2 rounded-full bg-current" />}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{r.label}</div>
                        <div className="text-xs opacity-60">{r.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Lojas/Filiais */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-1">Acesso a Lojas / Filiais</label>
                <div className="flex gap-2">
                  <label className={`flex-1 border p-3 rounded-xl cursor-pointer text-center text-xs font-bold transition-all ${form.stores.includes("ALL") ? "bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]" : "bg-[#0c0f1a] border-indigo-500/15 text-slate-400 hover:border-indigo-500/30"}`}>
                    <input type="checkbox" className="hidden" 
                      checked={form.stores.includes("ALL")} 
                      onChange={(e) => setForm(f => ({...f, stores: e.target.checked ? ["ALL"] : []}))} />
                    Todas (Rede)
                  </label>
                  <label className={`flex-1 border p-3 rounded-xl cursor-pointer text-center text-xs font-bold transition-all ${form.stores.includes("Matriz") && !form.stores.includes("ALL") ? "bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]" : "bg-[#0c0f1a] border-indigo-500/15 text-slate-400 hover:border-indigo-500/30"}`}>
                    <input type="checkbox" className="hidden" 
                      checked={form.stores.includes("Matriz") && !form.stores.includes("ALL")} 
                      onChange={(e) => {
                        if (form.stores.includes("ALL")) return;
                        setForm(f => ({...f, stores: e.target.checked ? [...f.stores, "Matriz"] : f.stores.filter(s => s !== "Matriz")}))
                      }} />
                    Matriz Centro
                  </label>
                  <label className={`flex-1 border p-3 rounded-xl cursor-pointer text-center text-xs font-bold transition-all ${form.stores.includes("Filial Zona Sul") && !form.stores.includes("ALL") ? "bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]" : "bg-[#0c0f1a] border-indigo-500/15 text-slate-400 hover:border-indigo-500/30"}`}>
                    <input type="checkbox" className="hidden" 
                      checked={form.stores.includes("Filial Zona Sul") && !form.stores.includes("ALL")} 
                      onChange={(e) => {
                        if (form.stores.includes("ALL")) return;
                        setForm(f => ({...f, stores: e.target.checked ? [...f.stores, "Filial Zona Sul"] : f.stores.filter(s => s !== "Filial Zona Sul")}))
                      }} />
                    Filial Z. Sul
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">Caixa (opcional)</label>
                  <input type="number" value={form.cashier} onChange={e => setForm(f=>({...f,cashier:e.target.value}))} min="1" max="9"
                    className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-4 py-2.5 rounded-xl outline-none text-sm text-center font-mono"
                    placeholder="Ex: 1" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">PIN do PDV (4 dígitos)</label>
                  <input type="password" value={form.pin} onChange={e => setForm(f=>({...f,pin:e.target.value.slice(0,4)}))} maxLength={4} required
                    className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-4 py-2.5 rounded-xl outline-none text-sm text-center font-mono tracking-widest text-xl"
                    placeholder="••••" />
                </div>
              </div>
              <div className="pt-4 border-t border-indigo-500/[0.08] flex gap-3">
                <button type="button" onClick={() => setModal("")}
                  className="flex-1 bg-[#161b33] hover:bg-[#161b33] text-slate-300 font-bold py-3 rounded-xl border border-indigo-500/15 text-sm transition-colors">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all text-sm">
                  {modal === "add" ? "Criar Usuário" : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
