"use client";

import { useState, useEffect } from "react";
import {
  Users, UserPlus, Search, Shield, Key, Store, Check, X,
  ShieldCheck, AlertTriangle, ChevronRight, Lock, Unlock,
  Sliders, History, Eye, EyeOff, Building2, UserCog, Loader2
} from "lucide-react";
import {
  listTenantUsers, getUserDetails, createTenantUser,
  updateTenantUser, toggleTenantUserActive
} from "@/actions/users";
import { listStores } from "@/actions/stores";
import { listRolesWithPermissions } from "@/actions/roles";

interface RoleDef {
  key: string;
  name: string;
  color: string;
  desc: string;
}

const ROLES_INFO: Record<string, { label: string; color: string; bg: string; border: string }> = {
  ADMIN:      { label: "Administrador", color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/25" },
  MANAGER:    { label: "Gerente",       color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/25" },
  SUPERVISOR: { label: "Supervisor",    color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/25" },
  OPERATOR:   { label: "Operador",      color: "text-emerald-400",bg: "bg-emerald-500/10",border: "border-emerald-500/25" },
  VIEWER:     { label: "Consulta",      color: "text-sky-400",    bg: "bg-sky-500/10",    border: "border-sky-500/25" },
};

export default function UsersSettingsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [storeFilter, setStoreFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal / Drawer state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"INFO" | "STORES" | "PERMISSIONS" | "HISTORY">("INFO");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formPin, setFormPin] = useState("");
  const [formRole, setFormRole] = useState("OPERATOR");
  const [formStores, setFormStores] = useState<string[]>([]);
  const [formDefaultStore, setFormDefaultStore] = useState<string>("");
  const [formCustomPerms, setFormCustomPerms] = useState<Record<string, boolean>>({}); // permissionId -> granted (true/false)
  const [userHistory, setUserHistory] = useState<{ auditLogs: any[]; requestedApprovals: any[]; authorizedApprovals: any[] }>({
    auditLogs: [],
    requestedApprovals: [],
    authorizedApprovals: [],
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, storesRes, rolesRes] = await Promise.all([
        listTenantUsers(),
        listStores(),
        listRolesWithPermissions(),
      ]);

      if (usersRes.users) setUsers(usersRes.users);
      if (storesRes.stores) setStores(storesRes.stores);
      if (rolesRes.roles) setRoles(rolesRes.roles);
      if (rolesRes.permissions) setPermissions(rolesRes.permissions);
    } catch (err) {
      console.error("Erro ao carregar dados de usuários:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewUserModal = () => {
    setEditingUserId(null);
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormPin("");
    setFormRole("OPERATOR");
    setFormStores(stores.length > 0 ? [stores[0].id] : []);
    setFormDefaultStore(stores.length > 0 ? stores[0].id : "");
    setFormCustomPerms({});
    setUserHistory({ auditLogs: [], requestedApprovals: [], authorizedApprovals: [] });
    setActiveTab("INFO");
    setActionError(null);
    setActionSuccess(null);
    setIsModalOpen(true);
  };

  const openEditUserModal = async (userId: string) => {
    setEditingUserId(userId);
    setActiveTab("INFO");
    setActionError(null);
    setActionSuccess(null);
    setIsModalOpen(true);
    setSaving(true);

    try {
      const res = await getUserDetails(userId);
      if (res.user) {
        const u = res.user;
        setFormName(u.name);
        setFormEmail(u.email);
        setFormPassword("");
        setFormPin("");
        setFormRole(u.role);
        
        const storeIds = u.userStores.map(us => us.storeId);
        setFormStores(storeIds);
        const def = u.userStores.find(us => us.isDefault)?.storeId || storeIds[0] || "";
        setFormDefaultStore(def);

        const customMap: Record<string, boolean> = {};
        u.userPermissions.forEach(up => {
          customMap[up.permissionId] = up.granted;
        });
        setFormCustomPerms(customMap);

        setUserHistory({
          auditLogs: u.auditLogs || [],
          requestedApprovals: u.requestedApprovals || [],
          authorizedApprovals: u.authorizedApprovals || [],
        });
      }
    } catch (err: any) {
      setActionError(err.message || "Erro ao carregar detalhes do usuário.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      const res = await toggleTenantUserActive(userId, !currentActive);
      if (res.success) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, active: !currentActive } : u));
      } else {
        alert(res.error || "Não foi possível alterar status.");
      }
    } catch (err: any) {
      alert(err.message || "Erro ao alternar status.");
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    setSaving(true);

    try {
      if (editingUserId) {
        // Atualização
        const customPermsArray = Object.entries(formCustomPerms).map(([permissionId, granted]) => ({
          permissionId,
          granted,
        }));

        const res = await updateTenantUser(editingUserId, {
          name: formName,
          email: formEmail,
          role: formRole,
          password: formPassword || undefined,
          pin: formPin || undefined,
          storeIds: formStores,
          defaultStoreId: formDefaultStore,
          customPermissions: customPermsArray,
        });

        if (res.success) {
          setActionSuccess("Usuário atualizado com sucesso!");
          await loadData();
          setTimeout(() => setIsModalOpen(false), 900);
        } else {
          setActionError(res.error || "Erro ao atualizar usuário.");
        }
      } else {
        // Criação
        if (!formPassword) {
          setActionError("A senha de acesso é obrigatória para novos usuários.");
          setSaving(false);
          return;
        }

        const res = await createTenantUser({
          name: formName,
          email: formEmail,
          password: formPassword,
          pin: formPin || undefined,
          role: formRole,
          storeIds: formStores,
          defaultStoreId: formDefaultStore,
        });

        if (res.success) {
          setActionSuccess("Usuário criado com sucesso!");
          await loadData();
          setTimeout(() => setIsModalOpen(false), 900);
        } else {
          setActionError(res.error || "Erro ao criar usuário.");
        }
      }
    } catch (err: any) {
      setActionError(err.message || "Erro ao processar formulário.");
    } finally {
      setSaving(false);
    }
  };

  // Filtragem
  const filteredUsers = users.filter(u => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "ALL" || u.role === roleFilter;
    const matchStatus = statusFilter === "ALL" || (statusFilter === "ACTIVE" ? u.active : !u.active);
    const matchStore =
      storeFilter === "ALL" ||
      u.userStores?.some((us: any) => us.storeId === storeFilter);

    return matchSearch && matchRole && matchStatus && matchStore;
  });

  // Módulos agrupados de permissões
  const permissionModules = Array.from(new Set(permissions.map(p => p.module)));

  // Obter permissões herdadas do perfil selecionado
  const selectedRolePerms = roles.find(r => r.key === formRole)?.permissions?.map((p: any) => p.permissionId || p.permission?.id) || [];

  return (
    <div className="h-full flex flex-col gap-5">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <UserCog size={18} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Usuários e Permissões</h1>
              <p className="text-slate-400 text-xs mt-0.5">Gerenciamento multiempresa e multiloja com controle granular de acessos e PINs.</p>
            </div>
          </div>
        </div>

        <button
          onClick={openNewUserModal}
          className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/25 text-xs cursor-pointer"
        >
          <UserPlus size={15} />
          <span>Novo Usuário</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 shrink-0">
        <div className="bg-[#101426] border border-indigo-500/10 rounded-2xl p-3.5">
          <span className="text-[11px] text-slate-400 font-medium">Total de Colaboradores</span>
          <p className="text-xl font-bold text-white mt-1">{users.length}</p>
        </div>
        <div className="bg-[#101426] border border-indigo-500/10 rounded-2xl p-3.5">
          <span className="text-[11px] text-violet-400 font-medium">Administradores</span>
          <p className="text-xl font-bold text-violet-300 mt-1">{users.filter(u => u.role === "ADMIN").length}</p>
        </div>
        <div className="bg-[#101426] border border-indigo-500/10 rounded-2xl p-3.5">
          <span className="text-[11px] text-indigo-400 font-medium">Gerentes & Supervisores</span>
          <p className="text-xl font-bold text-indigo-300 mt-1">{users.filter(u => u.role === "MANAGER" || u.role === "SUPERVISOR").length}</p>
        </div>
        <div className="bg-[#101426] border border-indigo-500/10 rounded-2xl p-3.5">
          <span className="text-[11px] text-emerald-400 font-medium">Operadores de Loja</span>
          <p className="text-xl font-bold text-emerald-300 mt-1">{users.filter(u => u.role === "OPERATOR").length}</p>
        </div>
        <div className="bg-[#101426] border border-indigo-500/10 rounded-2xl p-3.5">
          <span className="text-[11px] text-red-400 font-medium">Bloqueados</span>
          <p className="text-xl font-bold text-red-400 mt-1">{users.filter(u => !u.active).length}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#101426] border border-indigo-500/10 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#0a0d18] border border-indigo-500/15 focus:border-indigo-500 text-white rounded-xl outline-none text-xs placeholder:text-slate-600 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro Perfil */}
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="bg-[#0a0d18] border border-indigo-500/15 text-slate-300 text-xs px-3 py-1.5 rounded-xl outline-none"
          >
            <option value="ALL">Todos os Perfis</option>
            <option value="ADMIN">Administrador</option>
            <option value="MANAGER">Gerente</option>
            <option value="SUPERVISOR">Supervisor</option>
            <option value="OPERATOR">Operador</option>
            <option value="VIEWER">Consulta</option>
          </select>

          {/* Filtro Loja */}
          <select
            value={storeFilter}
            onChange={e => setStoreFilter(e.target.value)}
            className="bg-[#0a0d18] border border-indigo-500/15 text-slate-300 text-xs px-3 py-1.5 rounded-xl outline-none"
          >
            <option value="ALL">Todas as Lojas</option>
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
            ))}
          </select>

          {/* Filtro Status */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-[#0a0d18] border border-indigo-500/15 text-slate-300 text-xs px-3 py-1.5 rounded-xl outline-none"
          >
            <option value="ALL">Todos os Status</option>
            <option value="ACTIVE">Apenas Ativos</option>
            <option value="BLOCKED">Bloqueados</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#101426] rounded-2xl border border-indigo-500/10 flex-1 flex flex-col min-h-0 overflow-hidden shadow-xl">
        <div className="flex-1 overflow-auto min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-slate-500 gap-3">
              <Loader2 className="animate-spin text-indigo-400" size={32} />
              <p className="text-xs">Carregando usuários e permissões...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-slate-500 gap-3">
              <Users size={40} className="text-slate-700" />
              <p className="text-xs">Nenhum usuário encontrado com os filtros selecionados.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#0c0f1e]/80 border-b border-indigo-500/10 text-slate-400 sticky top-0 backdrop-blur-sm z-10">
                <tr>
                  <th className="px-4 py-3 font-semibold">Colaborador</th>
                  <th className="px-4 py-3 font-semibold">Perfil / Hierarquia</th>
                  <th className="px-4 py-3 font-semibold">Lojas Vinculadas</th>
                  <th className="px-4 py-3 font-semibold">Permissões</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-500/[0.06]">
                {filteredUsers.map(user => {
                  const roleStyle = ROLES_INFO[user.role] || ROLES_INFO.OPERATOR;
                  const initials = user.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

                  return (
                    <tr key={user.id} className="hover:bg-indigo-500/[0.03] transition-colors group">
                      {/* Colaborador */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white text-[11px] shrink-0 shadow">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-2">
                              {user.name}
                              {user.pin && (
                                <span title="PIN de liberação configurado" className="inline-flex items-center text-[10px] text-amber-400 bg-amber-500/10 px-1 rounded">
                                  <Key size={10} className="mr-0.5" /> PIN
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">{user.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Perfil */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${roleStyle.bg} ${roleStyle.color} ${roleStyle.border}`}>
                          <Shield size={11} />
                          {roleStyle.label}
                        </span>
                      </td>

                      {/* Lojas */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {user.userStores && user.userStores.length > 0 ? (
                            user.userStores.map((us: any) => (
                              <span key={us.id} className="text-[10px] bg-[#0c0f1a] text-slate-300 border border-indigo-500/15 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                <Store size={10} className="text-indigo-400" />
                                {us.store?.code || us.storeId}
                                {us.isDefault && <span className="text-[9px] text-amber-400 font-bold">★</span>}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-600 italic text-[11px]">Todas as Lojas</span>
                          )}
                        </div>
                      </td>

                      {/* Permissões */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300 font-medium">
                            {user.role === "ADMIN" ? "Acesso Total (35)" : "Perfil Padrão"}
                          </span>
                          {user.userPermissions && user.userPermissions.length > 0 && (
                            <span className="text-[10px] bg-indigo-500/15 text-indigo-300 font-semibold px-1.5 py-0.5 rounded border border-indigo-500/20">
                              +{user.userPermissions.length} custom
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(user.id, user.active)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                            user.active
                              ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                              : "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                          }`}
                        >
                          {user.active ? <Unlock size={11} /> : <Lock size={11} />}
                          <span>{user.active ? "Ativo" : "Bloqueado"}</span>
                        </button>
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEditUserModal(user.id)}
                          className="bg-[#14192d] hover:bg-indigo-600 hover:text-white text-slate-300 px-3 py-1.5 rounded-xl font-medium border border-indigo-500/15 transition-all text-xs cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <span>Gerenciar</span>
                          <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal / Drawer de Detalhes do Usuário com 4 Abas */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#101426] border border-indigo-500/20 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header do Modal */}
            <div className="p-5 border-b border-indigo-500/15 flex items-center justify-between bg-gradient-to-r from-indigo-900/30 via-transparent to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <UserCog size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingUserId ? `Gerenciar Colaborador: ${formName}` : "Novo Colaborador"}
                  </h3>
                  <p className="text-xs text-slate-400">Configure credenciais, alçadas, lojas e permissões granulares.</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Abas */}
            <div className="flex border-b border-indigo-500/10 px-5 bg-[#0c0f1e] gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("INFO")}
                className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "INFO"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Shield size={14} />
                <span>1. Informações</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("STORES")}
                className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "STORES"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Store size={14} />
                <span>2. Lojas ({formStores.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("PERMISSIONS")}
                className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "PERMISSIONS"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Sliders size={14} />
                <span>3. Permissões Granulares</span>
              </button>
              {editingUserId && (
                <button
                  type="button"
                  onClick={() => setActiveTab("HISTORY")}
                  className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === "HISTORY"
                      ? "border-indigo-500 text-indigo-400"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <History size={14} />
                  <span>4. Histórico & Auditoria</span>
                </button>
              )}
            </div>

            {/* Mensagens de Feedback */}
            {actionError && (
              <div className="mx-5 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-300">
                {actionError}
              </div>
            )}
            {actionSuccess && (
              <div className="mx-5 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-300 flex items-center gap-2">
                <Check size={14} />
                <span>{actionSuccess}</span>
              </div>
            )}

            {/* Conteúdo das Abas */}
            <form onSubmit={handleSaveUser} className="flex-1 overflow-y-auto p-5 space-y-4">
              
              {/* ABA 1: INFORMAÇÕES */}
              {activeTab === "INFO" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Nome Completo <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={e => setFormName(e.target.value)}
                        placeholder="Ex: João da Silva"
                        className="w-full bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white px-3.5 py-2.5 rounded-xl outline-none text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        E-mail de Login <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={formEmail}
                        onChange={e => setFormEmail(e.target.value)}
                        placeholder="joao@emporio.com"
                        className="w-full bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white px-3.5 py-2.5 rounded-xl outline-none text-xs"
                      />
                    </div>
                  </div>

                  {/* Perfil na Hierarquia */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Perfil / Nível de Acesso na Hierarquia <span className="text-red-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {roles.map(r => {
                        const style = ROLES_INFO[r.key] || ROLES_INFO.OPERATOR;
                        const isSelected = formRole === r.key;
                        return (
                          <div
                            key={r.id}
                            onClick={() => setFormRole(r.key)}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? "bg-indigo-600/15 border-indigo-500 shadow-md shadow-indigo-600/10"
                                : "bg-[#0c0f1a] border-indigo-500/10 hover:border-indigo-500/25"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-xs font-bold ${style.color}`}>{r.name}</span>
                              {isSelected && <Check size={14} className="text-indigo-400" />}
                            </div>
                            <p className="text-[10px] text-slate-400 leading-tight">{r.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Senha e PIN */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-indigo-500/10">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {editingUserId ? "Alterar Senha (Opcional)" : "Senha de Acesso *"}
                      </label>
                      <input
                        type="password"
                        value={formPassword}
                        onChange={e => setFormPassword(e.target.value)}
                        placeholder={editingUserId ? "Deixe em branco para manter a atual" : "Mínimo 4 caracteres"}
                        className="w-full bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white px-3.5 py-2.5 rounded-xl outline-none text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                        <span>PIN de Liberação Rápida (PDV)</span>
                        <span className="text-[10px] text-amber-400">4 a 6 dígitos</span>
                      </label>
                      <input
                        type="password"
                        maxLength={6}
                        value={formPin}
                        onChange={e => setFormPin(e.target.value.replace(/\D/g, ""))}
                        placeholder={editingUserId ? "•••• (deixe em branco p/ manter)" : "Ex: 1234"}
                        className="w-full bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white px-3.5 py-2.5 rounded-xl outline-none text-xs tracking-widest font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 2: LOJAS */}
              {activeTab === "STORES" && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400">
                    Selecione quais lojas da rede este usuário pode operar e qual será a loja inicial padrão.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {stores.map(s => {
                      const isChecked = formStores.includes(s.id);
                      const isDefault = formDefaultStore === s.id;

                      return (
                        <div
                          key={s.id}
                          className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                            isChecked
                              ? "bg-indigo-600/10 border-indigo-500/40"
                              : "bg-[#0c0f1a] border-indigo-500/10 opacity-70"
                          }`}
                        >
                          <label className="flex items-center gap-3 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                if (e.target.checked) {
                                  setFormStores(prev => [...prev, s.id]);
                                  if (!formDefaultStore) setFormDefaultStore(s.id);
                                } else {
                                  setFormStores(prev => prev.filter(id => id !== s.id));
                                  if (formDefaultStore === s.id) {
                                    setFormDefaultStore(formStores.find(id => id !== s.id) || "");
                                  }
                                }
                              }}
                              className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                            />
                            <div>
                              <span className="text-xs font-bold text-white block">{s.code} - {s.name}</span>
                              <span className="text-[10px] text-slate-400">{s.city}/{s.state || "SP"}</span>
                            </div>
                          </label>

                          {isChecked && (
                            <button
                              type="button"
                              onClick={() => setFormDefaultStore(s.id)}
                              className={`text-[10px] px-2 py-1 rounded-lg font-semibold border transition-all ${
                                isDefault
                                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                  : "text-slate-400 hover:text-white border-transparent"
                              }`}
                            >
                              {isDefault ? "★ Principal" : "Definir Principal"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ABA 3: PERMISSÕES GRANULARES */}
              {activeTab === "PERMISSIONS" && (
                <div className="space-y-5">
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-xs text-indigo-300 flex items-center justify-between">
                    <span>
                      Perfil base: <strong className="text-white">{ROLES_INFO[formRole]?.label || formRole}</strong>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Clique para Conceder (+) ou Revogar (-) permissões específicas deste colaborador.
                    </span>
                  </div>

                  {permissionModules.map(mod => {
                    const modPerms = permissions.filter(p => p.module === mod);

                    return (
                      <div key={mod} className="bg-[#0c0f1a] rounded-2xl border border-indigo-500/10 p-3.5">
                        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                          <ShieldCheck size={14} />
                          {mod} ({modPerms.length})
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {modPerms.map(p => {
                            const isInherited = selectedRolePerms.includes(p.id);
                            const customOverride = formCustomPerms[p.id]; // true = explicit grant, false = explicit revoke, undefined = inherited

                            let statusBadge = "HERDADA";
                            let badgeClass = "bg-slate-800 text-slate-400 border-slate-700";

                            if (formRole === "ADMIN") {
                              statusBadge = "ADMIN TOTAL";
                              badgeClass = "bg-violet-500/20 text-violet-300 border-violet-500/30";
                            } else if (customOverride === true) {
                              statusBadge = "CONCEDIDA (+)";
                              badgeClass = "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
                            } else if (customOverride === false) {
                              statusBadge = "REVOGADA (-)";
                              badgeClass = "bg-red-500/20 text-red-300 border-red-500/30";
                            } else if (isInherited) {
                              statusBadge = "HERDADA (PERFIL)";
                              badgeClass = "bg-indigo-500/15 text-indigo-300 border-indigo-500/25";
                            } else {
                              statusBadge = "BLOQUEADA";
                              badgeClass = "bg-slate-900 text-slate-600 border-slate-800";
                            }

                            return (
                              <div
                                key={p.id}
                                className="p-2.5 rounded-xl bg-[#101426] border border-indigo-500/10 flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0 flex-1">
                                  <span className="text-xs font-semibold text-white block truncate">{p.name}</span>
                                  <span className="text-[10px] text-slate-500 font-mono truncate block">{p.code}</span>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${badgeClass}`}>
                                    {statusBadge}
                                  </span>

                                  {formRole !== "ADMIN" && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        title="Conceder permissão manual"
                                        onClick={() => {
                                          setFormCustomPerms(prev => ({
                                            ...prev,
                                            [p.id]: customOverride === true ? undefined : true,
                                          }));
                                        }}
                                        className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                                          customOverride === true
                                            ? "bg-emerald-600 text-white"
                                            : "bg-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                                        }`}
                                      >
                                        +
                                      </button>
                                      <button
                                        type="button"
                                        title="Revogar permissão manual"
                                        onClick={() => {
                                          setFormCustomPerms(prev => ({
                                            ...prev,
                                            [p.id]: customOverride === false ? undefined : false,
                                          }));
                                        }}
                                        className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                                          customOverride === false
                                            ? "bg-red-600 text-white"
                                            : "bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                                        }`}
                                      >
                                        -
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ABA 4: HISTÓRICO & AUDITORIA */}
              {activeTab === "HISTORY" && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-300">Últimas Atividades e Liberações</h4>

                  {userHistory.auditLogs.length === 0 && userHistory.requestedApprovals.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      Nenhum registro de auditoria para este colaborador ainda.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[350px] overflow-y-auto">
                      {userHistory.requestedApprovals.map((req: any) => (
                        <div key={req.id} className="p-3 bg-[#0c0f1a] border border-indigo-500/10 rounded-xl text-xs flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-white block">Liberação: {req.operation}</span>
                            <span className="text-[10px] text-slate-400">Motivo: {req.reason} • Terminal: {req.terminal}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            req.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-400" :
                            req.status === "REJECTED" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"
                          }`}>
                            {req.status}
                          </span>
                        </div>
                      ))}

                      {userHistory.auditLogs.map((log: any) => (
                        <div key={log.id} className="p-3 bg-[#0c0f1a] border border-indigo-500/10 rounded-xl text-xs flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-slate-300 block">{log.action}: {log.operation}</span>
                            <span className="text-[10px] text-slate-500">{new Date(log.createdAt).toLocaleString("pt-BR")}</span>
                          </div>
                          <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded font-mono">
                            {log.result}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Botões do Rodapé */}
              <div className="pt-4 border-t border-indigo-500/10 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-[#14192d] hover:bg-[#1a203a] text-slate-300 font-semibold rounded-xl text-xs border border-indigo-500/10 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>{editingUserId ? "Salvar Alterações" : "Cadastrar Colaborador"}</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
