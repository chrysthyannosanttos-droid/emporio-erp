"use client";

import { useState, useEffect } from "react";
import {
  Shield, Check, X, Sliders, Plus, Search,
  Save, AlertCircle, Loader2, ShieldCheck, Lock
} from "lucide-react";
import { listRolesWithPermissions, updateRolePermissions, createCustomRole } from "@/actions/roles";

const ROLE_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  ADMIN:      { color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/25" },
  MANAGER:    { color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/25" },
  SUPERVISOR: { color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/25" },
  OPERATOR:   { color: "text-emerald-400",bg: "bg-emerald-500/10",border: "border-emerald-500/25" },
  VIEWER:     { color: "text-sky-400",    bg: "bg-sky-500/10",    border: "border-sky-500/25" },
};

export default function RolesMatrixPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Role permissions map: roleId -> Set of permissionIds
  const [matrix, setMatrix] = useState<Record<string, Set<string>>>({});

  // New role modal
  const [isNewRoleOpen, setIsNewRoleOpen] = useState(false);
  const [newRoleKey, setNewRoleKey] = useState("");
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await listRolesWithPermissions();
      if (res.roles && res.permissions) {
        setRoles(res.roles);
        setPermissions(res.permissions);
        if (res.roles.length > 0 && !selectedRoleId) {
          setSelectedRoleId(res.roles[0].id);
        }

        const map: Record<string, Set<string>> = {};
        res.roles.forEach(r => {
          map[r.id] = new Set(r.permissions.map((p: any) => p.permissionId || p.permission?.id));
        });
        setMatrix(map);
      }
    } catch (err) {
      console.error("Erro ao carregar matriz de perfis:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTogglePermission = (roleId: string, permissionId: string) => {
    // Admin tem todas as permissões fixas
    const role = roles.find(r => r.id === roleId);
    if (role?.key === "ADMIN") return;

    setMatrix(prev => {
      const currentSet = new Set(prev[roleId] || []);
      if (currentSet.has(permissionId)) {
        currentSet.delete(permissionId);
      } else {
        currentSet.add(permissionId);
      }
      return {
        ...prev,
        [roleId]: currentSet,
      };
    });
  };

  const handleSaveRole = async (roleId: string) => {
    setSaving(true);
    setFeedback(null);
    try {
      const permIds = Array.from(matrix[roleId] || []);
      const res = await updateRolePermissions(roleId, permIds);
      if (res.success) {
        setFeedback({ type: "success", message: "Matriz de permissões salva com sucesso!" });
        setTimeout(() => setFeedback(null), 3000);
      } else {
        setFeedback({ type: "error", message: res.error || "Erro ao salvar." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCustomRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await createCustomRole({
        key: newRoleKey,
        name: newRoleName,
        description: newRoleDesc,
        permissionIds: [],
      });
      if (res.success) {
        setIsNewRoleOpen(false);
        setNewRoleKey("");
        setNewRoleName("");
        setNewRoleDesc("");
        await loadData();
      } else {
        alert(res.error || "Erro ao criar perfil.");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const modules = ["ALL", ...Array.from(new Set(permissions.map(p => p.module)))];

  const filteredPermissions = permissions.filter(p => {
    const matchMod = activeModule === "ALL" || p.module === activeModule;
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.module.toLowerCase().includes(search.toLowerCase());
    return matchMod && matchSearch;
  });

  const selectedRole = roles.find(r => r.id === selectedRoleId);

  return (
    <div className="h-full flex flex-col gap-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Sliders size={18} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Perfis e Matriz de Permissões</h1>
              <p className="text-slate-400 text-xs mt-0.5">Defina as permissões base para cada cargo na hierarquia da empresa.</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsNewRoleOpen(true)}
          className="bg-[#14192d] hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/20 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
        >
          <Plus size={14} />
          <span>Novo Perfil Customizado</span>
        </button>
      </div>

      {/* Seletor de Perfis */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 shrink-0">
        {roles.map(r => {
          const style = ROLE_COLORS[r.key] || { color: "text-slate-300", bg: "bg-slate-800", border: "border-slate-700" };
          const isSelected = selectedRoleId === r.id;
          const permCount = matrix[r.id]?.size || 0;

          return (
            <div
              key={r.id}
              onClick={() => setSelectedRoleId(r.id)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? "bg-indigo-600/15 border-indigo-500 shadow-lg shadow-indigo-600/10 scale-[1.02]"
                  : "bg-[#101426] border-indigo-500/10 hover:border-indigo-500/25"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${style.color}`}>{r.name}</span>
                <span className="text-[10px] bg-[#0a0d18] text-slate-400 px-1.5 py-0.5 rounded font-mono">
                  {r.key === "ADMIN" ? "Total (35)" : `${permCount} perms`}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 line-clamp-2">{r.description || "Perfil de usuário"}</p>
            </div>
          );
        })}
      </div>

      {/* Barra de Filtros por Módulo & Busca */}
      <div className="bg-[#101426] border border-indigo-500/10 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {modules.map(m => (
            <button
              key={m}
              onClick={() => setActiveModule(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeModule === m
                  ? "bg-indigo-600 text-white shadow"
                  : "bg-[#0a0d18] text-slate-400 hover:text-slate-200 border border-indigo-500/10"
              }`}
            >
              {m === "ALL" ? "Todos os Módulos" : m}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar permissão..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#0a0d18] border border-indigo-500/15 text-white rounded-xl outline-none text-xs"
            />
          </div>

          {selectedRoleId && selectedRole?.key !== "ADMIN" && (
            <button
              onClick={() => handleSaveRole(selectedRoleId)}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              <span>Salvar Matriz</span>
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 shrink-0 ${
          feedback.type === "success" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300" : "bg-red-500/10 border border-red-500/20 text-red-300"
        }`}>
          {feedback.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Grid de Permissões */}
      <div className="bg-[#101426] rounded-2xl border border-indigo-500/10 flex-1 flex flex-col min-h-0 overflow-hidden shadow-xl p-4">
        <div className="flex-1 overflow-auto min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-slate-500 gap-3">
              <Loader2 className="animate-spin text-indigo-400" size={32} />
              <p className="text-xs">Carregando permissões...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredPermissions.map(p => {
                const isChecked = selectedRole?.key === "ADMIN" || (selectedRoleId ? matrix[selectedRoleId]?.has(p.id) : false);

                return (
                  <div
                    key={p.id}
                    onClick={() => selectedRoleId && handleTogglePermission(selectedRoleId, p.id)}
                    className={`p-3 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                      selectedRole?.key === "ADMIN"
                        ? "bg-violet-500/5 border-violet-500/20 opacity-80 cursor-not-allowed"
                        : isChecked
                        ? "bg-indigo-600/10 border-indigo-500/30 cursor-pointer shadow-sm"
                        : "bg-[#0c0f1a] border-indigo-500/10 hover:border-indigo-500/20 cursor-pointer opacity-60"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/15">
                          {p.module}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white truncate">{p.name}</h4>
                      <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">{p.description || p.code}</p>
                    </div>

                    <div className="shrink-0 pt-1">
                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${
                        isChecked
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                          : "border border-slate-700 bg-slate-800/50"
                      }`}>
                        {isChecked && <Check size={12} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Novo Perfil */}
      {isNewRoleOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#101426] border border-indigo-500/20 rounded-3xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-indigo-500/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield size={16} className="text-indigo-400" />
                Criar Perfil Customizado
              </h3>
              <button onClick={() => setIsNewRoleOpen(false)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomRole} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Identificador (Código)</label>
                <input
                  type="text"
                  required
                  value={newRoleKey}
                  onChange={e => setNewRoleKey(e.target.value.toUpperCase())}
                  placeholder="EX: LIDER_ESTOQUE"
                  className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2 rounded-xl text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome de Exibição</label>
                <input
                  type="text"
                  required
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  placeholder="Ex: Líder de Almoxarifado"
                  className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Descrição</label>
                <textarea
                  value={newRoleDesc}
                  onChange={e => setNewRoleDesc(e.target.value)}
                  placeholder="Responsável por contagem e transferências..."
                  rows={2}
                  className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2 rounded-xl text-xs resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewRoleOpen(false)}
                  className="flex-1 py-2 bg-[#14192d] text-slate-300 text-xs rounded-xl font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-xl font-bold"
                >
                  Criar Perfil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
