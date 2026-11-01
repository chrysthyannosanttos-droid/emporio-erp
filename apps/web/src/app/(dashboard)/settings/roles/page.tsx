"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield, Check, X, Sliders, Plus, Search,
  Save, AlertCircle, Loader2, ShieldCheck, Lock, RotateCcw,
  Trash2, Users, CheckSquare, Square, Store, Sparkles
} from "lucide-react";
import {
  listRolesWithPermissions,
  updateRolePermissions,
  createCustomRole,
  resetRoleToSupermarketDefaults,
  deleteCustomRole
} from "@/actions/roles";

const ROLE_COLORS: Record<string, { label: string; sector: string; color: string; bg: string; border: string }> = {
  ADMIN:        { label: "Administrador / Matriz",     sector: "Diretoria & Geral",     color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-300" },
  MANAGER:      { label: "Gerente Geral de Loja",      sector: "Gerência & Operações",  color: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-300" },
  SUPERVISOR:   { label: "Fiscal de Caixa & Salão",    sector: "Frente de Caixa",       color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-300" },
  OPERATOR:     { label: "Operador de Caixa (PDV)",    sector: "Checkout & Vendas",     color: "text-emerald-700",bg: "bg-emerald-50",border: "border-emerald-300" },
  STOCKIST:     { label: "Estoque & Recebimento",      sector: "Depósito & Mercearia",  color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-300" },
  SCALE_SECTOR: { label: "Balança & Perecíveis",       sector: "Açougue, FLV & Padaria",color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-300" },
  FINANCIAL:    { label: "Financeiro & Faturamento",   sector: "Tesouraria & Fiscal",   color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-300" },
  VIEWER:       { label: "Consulta / Auditoria",       sector: "Auditoria Externa",     color: "text-sky-700",    bg: "bg-sky-50",    border: "border-sky-300" },
};

export default function RolesMatrixPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Role permissions map: roleId -> Set of permissionIds
  const [matrix, setMatrix] = useState<Record<string, Set<string>>>({});

  // New role modal
  const [isNewRoleOpen, setIsNewRoleOpen] = useState(false);
  const [newRoleKey, setNewRoleKey] = useState("");
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleSector, setNewRoleSector] = useState("Geral");
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

  const handleSelectAllModule = (roleId: string, selectAll: boolean) => {
    const role = roles.find(r => r.id === roleId);
    if (role?.key === "ADMIN") return;

    const modulePerms = permissions.filter(p => activeModule === "ALL" || p.module === activeModule);

    setMatrix(prev => {
      const currentSet = new Set(prev[roleId] || []);
      modulePerms.forEach(p => {
        if (selectAll) {
          currentSet.add(p.id);
        } else {
          currentSet.delete(p.id);
        }
      });
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
        setFeedback({ type: "success", message: "Matriz de permissões salva com sucesso para este setor!" });
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

  const handleResetToDefaults = async (roleId: string) => {
    if (!confirm("Deseja restaurar as permissões recomendadas padrão de supermercado para este cargo? As alterações manuais serão resetadas.")) {
      return;
    }
    setResetting(true);
    setFeedback(null);
    try {
      const res = await resetRoleToSupermarketDefaults(roleId);
      if (res.success) {
        setFeedback({ type: "success", message: `Padrão de supermercado restaurado com sucesso! (${res.count} permissões redefinidas)` });
        await loadData();
        setTimeout(() => setFeedback(null), 3000);
      } else {
        setFeedback({ type: "error", message: res.error || "Erro ao restaurar." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Deseja realmente excluir o grupo de setor "${roleName}"?`)) {
      return;
    }
    try {
      const res = await deleteCustomRole(roleId);
      if (res.success) {
        setFeedback({ type: "success", message: "Grupo de setor excluído com sucesso." });
        setSelectedRoleId(roles[0]?.id || null);
        await loadData();
      } else {
        alert(res.error || "Erro ao excluir perfil.");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateCustomRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await createCustomRole({
        key: newRoleKey,
        name: newRoleName,
        description: `Setor: ${newRoleSector} — ${newRoleDesc || "Grupo customizado de supermercado"}`,
        permissionIds: [],
      });
      if (res.success) {
        setIsNewRoleOpen(false);
        setNewRoleKey("");
        setNewRoleName("");
        setNewRoleSector("Geral");
        setNewRoleDesc("");
        await loadData();
        if (res.role?.id) {
          setSelectedRoleId(res.role.id);
        }
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
      p.module.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    return matchMod && matchSearch;
  });

  const selectedRole = roles.find(r => r.id === selectedRoleId);
  const selectedRoleStyle = selectedRole ? (ROLE_COLORS[selectedRole.key] || {
    label: selectedRole.name,
    sector: "Setor Personalizado",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200"
  }) : null;

  const currentRolePermCount = selectedRole?.key === "ADMIN"
    ? permissions.length
    : (selectedRoleId ? (matrix[selectedRoleId]?.size || 0) : 0);

  return (
    <div className="h-full flex flex-col gap-4 select-none">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-gray-200 rounded-2xl p-5 shadow-xs shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1.5">
              <Sparkles size={11} className="text-blue-600" />
              Hierarquia & Perfis de Supermercado
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
            <Shield className="text-blue-600" size={24} />
            Grupos de Setores & Matriz de Permissões
          </h1>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            Configure permissões pré-definidas para cada setor do supermercado (Frente de Caixa, Fiscal de Caixa, Estoque, Balanças/Perecíveis, Tesouraria e Gerência).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/settings/users"
            className="border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <Users size={15} />
            <span>Gerenciar Usuários</span>
          </Link>

          <button
            onClick={() => setIsNewRoleOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <Plus size={15} />
            <span>+ Novo Grupo / Setor</span>
          </button>
        </div>
      </div>

      {/* Grid de Grupos de Setores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 shrink-0">
        {roles.map(r => {
          const style = ROLE_COLORS[r.key] || {
            label: r.name,
            sector: "Personalizado",
            color: "text-blue-700",
            bg: "bg-blue-50",
            border: "border-blue-200"
          };
          const isSelected = selectedRoleId === r.id;
          const permCount = r.key === "ADMIN" ? permissions.length : (matrix[r.id]?.size || 0);

          return (
            <div
              key={r.id}
              onClick={() => setSelectedRoleId(r.id)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? "bg-blue-50 border-blue-600 shadow-md ring-2 ring-blue-500/20 scale-[1.02]"
                  : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/60 shadow-xs"
              }`}
            >
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block truncate">
                  {style.sector}
                </span>
                <span className={`text-xs font-black truncate block mt-0.5 ${style.color}`}>
                  {r.name}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-100">
                <span className="text-[10px] text-gray-400 flex items-center gap-1 font-medium">
                  <Users size={11} />
                  {r._count?.users || 0} user{r._count?.users === 1 ? "" : "s"}
                </span>
                <span className="text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono font-bold">
                  {permCount} perms
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Barra de Ações do Perfil Selecionado */}
      {selectedRole && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${selectedRoleStyle?.bg} ${selectedRoleStyle?.border} border`}>
              <ShieldCheck className={selectedRoleStyle?.color} size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-gray-900 leading-tight">{selectedRole.name}</h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${selectedRoleStyle?.bg} ${selectedRoleStyle?.color} ${selectedRoleStyle?.border}`}>
                  {selectedRoleStyle?.sector}
                </span>
                {selectedRole.isSystem && (
                  <span className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">
                    Padrão Supermercado
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{selectedRole.description || "Permissões de acesso aos módulos"}</p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Restaurar padrão de supermercado */}
            {selectedRole.isSystem && selectedRole.key !== "ADMIN" && (
              <button
                type="button"
                onClick={() => handleResetToDefaults(selectedRole.id)}
                disabled={resetting}
                className="px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Restaurar lista de permissões oficial de supermercado"
              >
                <RotateCcw size={13} className={resetting ? "animate-spin" : ""} />
                <span>Restaurar Padrão</span>
              </button>
            )}

            {/* Excluir perfil customizado */}
            {!selectedRole.isSystem && (
              <button
                type="button"
                onClick={() => handleDeleteRole(selectedRole.id, selectedRole.name)}
                className="px-3 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Excluir este perfil customizado"
              >
                <Trash2 size={13} />
                <span>Excluir</span>
              </button>
            )}

            {/* Salvar Matriz */}
            {selectedRole.key !== "ADMIN" ? (
              <button
                type="button"
                onClick={() => handleSaveRole(selectedRole.id)}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                <span>Salvar Permissões do Setor</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 bg-violet-50 text-violet-700 border border-violet-200 px-3 py-1.5 rounded-xl text-xs font-bold">
                <Lock size={13} />
                <span>Acesso Total Irrestrito (38 de 38 ativas)</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feedback Alert */}
      {feedback && (
        <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 shrink-0 ${
          feedback.type === "success"
            ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
            : "bg-red-50 border border-red-200 text-red-800"
        }`}>
          {feedback.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Filtros de Módulos & Busca */}
      <div className="bg-white border border-gray-200 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {modules.map(m => (
            <button
              key={m}
              onClick={() => setActiveModule(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeModule === m
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
              }`}
            >
              {m === "ALL" ? "Todos os Módulos" : m}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {selectedRole && selectedRole.key !== "ADMIN" && (
            <div className="flex items-center gap-1 border-r border-gray-200 pr-2 mr-1">
              <button
                type="button"
                onClick={() => handleSelectAllModule(selectedRole.id, true)}
                className="text-[11px] font-bold text-blue-600 hover:underline px-2 py-1 flex items-center gap-1 cursor-pointer"
                title="Marcar todas as permissões deste módulo"
              >
                <CheckSquare size={13} /> Marcar Todos
              </button>
              <button
                type="button"
                onClick={() => handleSelectAllModule(selectedRole.id, false)}
                className="text-[11px] font-bold text-gray-500 hover:underline px-2 py-1 flex items-center gap-1 cursor-pointer"
                title="Desmarcar todas deste módulo"
              >
                <Square size={13} /> Desmarcar Todos
              </button>
            </div>
          )}

          <div className="relative min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar permissão ou comando..."
              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white text-gray-900 rounded-xl outline-none text-xs font-medium"
            />
          </div>
        </div>
      </div>

      {/* Grid de Permissões com Checkbox */}
      <div className="bg-white rounded-2xl border border-gray-200 flex-1 flex flex-col min-h-0 overflow-hidden shadow-xs p-4">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 shrink-0 text-xs text-gray-500">
          <span>
            Mostrando <strong>{filteredPermissions.length}</strong> permissões {activeModule !== "ALL" ? `no módulo ${activeModule}` : ""}
          </span>
          <span className="font-bold text-gray-700">
            {selectedRole?.key === "ADMIN" ? (
              <span className="text-violet-600">Todas as permissões ativas (SuperAdmin)</span>
            ) : (
              <span>Ativas neste perfil: <strong className="text-blue-600">{currentRolePermCount}</strong> de {permissions.length}</span>
            )}
          </span>
        </div>

        <div className="flex-1 overflow-auto min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-gray-400 gap-3">
              <Loader2 className="animate-spin text-blue-600" size={32} />
              <p className="text-xs font-semibold">Carregando catálogo de permissões...</p>
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
                        ? "bg-violet-50/40 border-violet-200 opacity-90 cursor-not-allowed"
                        : isChecked
                        ? "bg-blue-50/70 border-blue-300 hover:border-blue-400 cursor-pointer shadow-2xs"
                        : "bg-gray-50/40 border-gray-200 hover:border-gray-300 cursor-pointer opacity-70 hover:opacity-100"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[9px] font-black uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {p.module}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-gray-900 truncate">{p.name}</h4>
                      <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5 leading-relaxed">{p.description || p.code}</p>
                      <span className="text-[9px] font-mono text-gray-400 mt-1 block font-semibold">{p.code}</span>
                    </div>

                    <div className="shrink-0 pt-1">
                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${
                        isChecked
                          ? "bg-blue-600 text-white shadow-xs"
                          : "border-2 border-gray-300 bg-white"
                      }`}>
                        {isChecked && <Check size={12} className="stroke-[3]" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Novo Grupo de Setor */}
      {isNewRoleOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Shield size={18} className="text-blue-600" />
                Criar Novo Grupo de Setor
              </h3>
              <button onClick={() => setIsNewRoleOpen(false)} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomRole} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Código Identificador <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newRoleKey}
                  onChange={e => setNewRoleKey(e.target.value.toUpperCase().replace(/\s+/g, "_"))}
                  placeholder="EX: LIDER_PADARIA, AUDITOR"
                  className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white text-gray-900 px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Nome do Grupo / Cargo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  placeholder="Ex: Encarregado de Padaria & Salgados"
                  className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white text-gray-900 px-3.5 py-2.5 rounded-xl text-xs font-medium outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Setor / Departamento do Supermercado
                </label>
                <input
                  type="text"
                  value={newRoleSector}
                  onChange={e => setNewRoleSector(e.target.value)}
                  placeholder="Ex: Padaria, Açougue, Depósito, FLV"
                  className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white text-gray-900 px-3.5 py-2.5 rounded-xl text-xs font-medium outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Descrição das Atividades
                </label>
                <textarea
                  value={newRoleDesc}
                  onChange={e => setNewRoleDesc(e.target.value)}
                  placeholder="Ex: Acesso a pesagem, precificação do balcão e perdas do setor..."
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white text-gray-900 px-3.5 py-2.5 rounded-xl text-xs resize-none outline-none font-medium"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsNewRoleOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-xl font-black transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Criar Setor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
