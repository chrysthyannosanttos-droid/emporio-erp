"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users, UserPlus, Search, Shield, Key, Store, Check, X,
  ShieldCheck, AlertTriangle, ChevronRight, Lock, Unlock,
  Sliders, History, Eye, EyeOff, Building2, UserCog, Loader2,
  Trash2, Edit
} from "lucide-react";
import {
  listTenantUsers, getUserDetails, createTenantUser,
  updateTenantUser, toggleTenantUserActive, deleteTenantUser,
  getCurrentUserSession
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
  ADMIN:        { label: "Administrador",     color: "text-violet-600", bg: "bg-violet-500/10", border: "border-violet-500/25" },
  MANAGER:      { label: "Gerente Geral",     color: "text-indigo-600", bg: "bg-indigo-500/10", border: "border-indigo-200" },
  SUPERVISOR:   { label: "Fiscal de Caixa",   color: "text-amber-600",  bg: "bg-amber-500/10",  border: "border-amber-500/25" },
  OPERATOR:     { label: "Operador de Caixa", color: "text-emerald-600",bg: "bg-emerald-500/10",border: "border-emerald-500/25" },
  STOCKIST:     { label: "Estoque & Depósito",color: "text-blue-600",   bg: "bg-blue-500/10",   border: "border-blue-500/25" },
  SCALE_SECTOR: { label: "Balança & Açougue", color: "text-orange-600", bg: "bg-orange-500/10", border: "border-orange-500/25" },
  FINANCIAL:    { label: "Financeiro & Fiscal",color: "text-purple-600",bg: "bg-purple-500/10",border: "border-purple-500/25" },
  VIEWER:       { label: "Consulta / Auditor",color: "text-sky-600",    bg: "bg-sky-500/10",    border: "border-sky-500/25" },
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
  const [currentUser, setCurrentUser] = useState<{ userId: string; role: string; isAdmin: boolean } | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

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
      const [usersRes, storesRes, currentSession] = await Promise.all([
        listTenantUsers(),
        listStores(),
        getCurrentUserSession(),
      ]);

      if (usersRes.users) setUsers(usersRes.users);
      if (storesRes.stores) setStores(storesRes.stores);
      if (currentSession) setCurrentUser(currentSession);
    } catch (err) {
      console.error("Erro ao carregar dados de usuários:", err);
    } finally {
      setLoading(false);
    }

    // Carrega a matriz de permissões em segundo plano (não trava a visualização da tela)
    listRolesWithPermissions()
      .then((rolesRes) => {
        if (rolesRes.roles) setRoles(rolesRes.roles);
        if (rolesRes.permissions) setPermissions(rolesRes.permissions);
      })
      .catch((err) => console.warn("Notice ao carregar permissões secundárias:", err));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!currentUser?.isAdmin) {
      alert("Apenas administradores possuem permissão para excluir colaboradores.");
      return;
    }
    if (currentUser.userId === userId) {
      alert("Você não pode excluir o seu próprio usuário.");
      return;
    }
    const confirmMessage = `Atenção: Deseja realmente excluir o colaborador "${userName}"?\n\nEsta operação é restrita exclusivamente a administradores do sistema.`;
    if (!window.confirm(confirmMessage)) return;

    setDeletingUserId(userId);
    try {
      const res = await deleteTenantUser(userId);
      if (res.success) {
        alert(res.message);
        if (isModalOpen && editingUserId === userId) {
          setIsModalOpen(false);
        }
        await loadData();
      } else {
        alert(res.error || "Não foi possível excluir o usuário.");
      }
    } catch (err: any) {
      alert(err.message || "Erro ao excluir o colaborador.");
    } finally {
      setDeletingUserId(null);
    }
  };

  const openNewUserModal = () => {
    if (currentUser && !currentUser.isAdmin) {
      alert("Apenas administradores podem cadastrar novos colaboradores.");
      return;
    }
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
    if (currentUser && !currentUser.isAdmin) {
      alert("Apenas administradores podem editar colaboradores.");
      return;
    }
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
            <div className="w-9 h-9 rounded-xl bg-indigo-600/10 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <UserCog size={18} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Usuários e Permissões</h1>
              <p className="text-slate-500 text-xs mt-0.5">Gerenciamento multiempresa e multiloja com controle granular de acessos e PINs.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/settings/roles"
            className="border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs cursor-pointer shadow-xs"
          >
            <Shield size={15} />
            <span>Grupos de Setores & Permissões</span>
          </Link>

          <button
            onClick={openNewUserModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/25 text-xs cursor-pointer"
          >
            <UserPlus size={15} />
            <span>+ Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 shrink-0">
        <div className="bg-[#fbfdff] border border-[#c4d5ee] rounded-2xl p-3.5">
          <span className="text-[11px] text-slate-500 font-medium">Total de Colaboradores</span>
          <p className="text-xl font-bold text-gray-900 mt-1">{users.length}</p>
        </div>
        <div className="bg-[#fbfdff] border border-[#c4d5ee] rounded-2xl p-3.5">
          <span className="text-[11px] text-violet-600 font-medium">Administradores</span>
          <p className="text-xl font-bold text-violet-700 mt-1">{users.filter(u => u.role === "ADMIN").length}</p>
        </div>
        <div className="bg-[#fbfdff] border border-[#c4d5ee] rounded-2xl p-3.5">
          <span className="text-[11px] text-indigo-600 font-medium">Gerentes & Supervisores</span>
          <p className="text-xl font-bold text-indigo-700 mt-1">{users.filter(u => u.role === "MANAGER" || u.role === "SUPERVISOR").length}</p>
        </div>
        <div className="bg-[#fbfdff] border border-[#c4d5ee] rounded-2xl p-3.5">
          <span className="text-[11px] text-emerald-600 font-medium">Operadores de Loja</span>
          <p className="text-xl font-bold text-emerald-700 mt-1">{users.filter(u => u.role === "OPERATOR").length}</p>
        </div>
        <div className="bg-[#fbfdff] border border-[#c4d5ee] rounded-2xl p-3.5">
          <span className="text-[11px] text-red-600 font-medium">Bloqueados</span>
          <p className="text-xl font-bold text-red-600 mt-1">{users.filter(u => !u.active).length}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#fbfdff] border border-[#c4d5ee] rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#e8f0fc] border border-[#c4d5ee] focus:border-indigo-500 text-gray-900 rounded-xl outline-none text-xs placeholder:text-slate-600 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro Perfil */}
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="bg-[#e8f0fc] border border-[#c4d5ee] text-slate-600 text-xs px-3 py-1.5 rounded-xl outline-none"
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
            className="bg-[#e8f0fc] border border-[#c4d5ee] text-slate-600 text-xs px-3 py-1.5 rounded-xl outline-none"
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
            className="bg-[#e8f0fc] border border-[#c4d5ee] text-slate-600 text-xs px-3 py-1.5 rounded-xl outline-none"
          >
            <option value="ALL">Todos os Status</option>
            <option value="ACTIVE">Apenas Ativos</option>
            <option value="BLOCKED">Bloqueados</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#fbfdff] rounded-2xl border border-[#c4d5ee] flex-1 flex flex-col min-h-0 overflow-hidden shadow-xl">
        <div className="flex-1 overflow-auto min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-slate-500 gap-3">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
              <p className="text-xs">Carregando usuários e permissões...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-slate-500 gap-3">
              <Users size={40} className="text-slate-700" />
              <p className="text-xs">Nenhum usuário encontrado com os filtros selecionados.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#f3f7fe]/80 border-b border-[#c4d5ee] text-slate-500 sticky top-0 backdrop-blur-sm z-10">
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
                            <div className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors flex items-center gap-2">
                              {user.name}
                              {user.pin && (
                                <span title="PIN de liberação configurado" className="inline-flex items-center text-[10px] text-amber-600 bg-amber-500/10 px-1 rounded">
                                  <Key size={10} className="mr-0.5" /> PIN
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono">{user.email}</span>
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
                              <span key={us.id} className="text-[10px] bg-[#f3f7fe] text-slate-600 border border-[#c4d5ee] px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                <Store size={10} className="text-indigo-600" />
                                {us.store?.code || us.storeId}
                                {us.isDefault && <span className="text-[9px] text-amber-600 font-bold">★</span>}
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
                          <span className="text-slate-600 font-medium">
                            {user.role === "ADMIN" ? "Acesso Total (35)" : "Perfil Padrão"}
                          </span>
                          {user.userPermissions && user.userPermissions.length > 0 && (
                            <span className="text-[10px] bg-indigo-500/15 text-indigo-700 font-semibold px-1.5 py-0.5 rounded border border-indigo-200">
                              +{user.userPermissions.length} custom
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => currentUser?.isAdmin && handleToggleActive(user.id, user.active)}
                          disabled={!currentUser?.isAdmin}
                          title={!currentUser?.isAdmin ? "Apenas administradores podem alterar o status de acesso" : undefined}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                            !currentUser?.isAdmin ? "opacity-75 cursor-not-allowed" : "cursor-pointer"
                          } ${
                            user.active
                              ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20"
                              : "bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/20"
                          }`}
                        >
                          {user.active ? <Unlock size={11} /> : <Lock size={11} />}
                          <span>{user.active ? "Ativo" : "Bloqueado"}</span>
                        </button>
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3 text-right">
                        {currentUser?.isAdmin ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditUserModal(user.id)}
                              className="bg-[#fbfdff] hover:bg-indigo-50 text-indigo-700 hover:text-indigo-800 px-2.5 py-1.5 rounded-xl font-medium border border-indigo-200 transition-all text-xs cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                              title="Editar colaborador e permissões"
                            >
                              <Edit size={12} />
                              <span>Editar</span>
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id, user.name)}
                              disabled={deletingUserId === user.id || currentUser.userId === user.id}
                              className={`px-2.5 py-1.5 rounded-xl font-medium border transition-all text-xs inline-flex items-center gap-1 shadow-2xs ${
                                currentUser.userId === user.id
                                  ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60"
                                  : "bg-red-50 hover:bg-red-100 text-red-600 border-red-200 hover:border-red-300 cursor-pointer"
                              }`}
                              title={
                                currentUser.userId === user.id
                                  ? "Você não pode excluir o seu próprio usuário"
                                  : "Excluir colaborador"
                              }
                            >
                              {deletingUserId === user.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Trash2 size={12} />
                              )}
                              <span>Excluir</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Apenas Administradores
                          </span>
                        )}
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
          <div className="bg-[#fbfdff] border border-indigo-200 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header do Modal */}
            <div className="p-5 border-b border-[#c4d5ee] flex items-center justify-between bg-gradient-to-r from-indigo-900/30 via-transparent to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-200 flex items-center justify-center text-indigo-400">
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
            <div className="flex border-b border-[#c4d5ee] px-5 bg-[#f3f7fe] gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("INFO")}
                className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "INFO"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
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
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
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
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
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
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <History size={14} />
                  <span>4. Histórico & Auditoria</span>
                </button>
              )}
            </div>

            {/* Mensagens de Feedback */}
            {actionError && (
              <div className="mx-5 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-700">
                {actionError}
              </div>
            )}
            {actionSuccess && (
              <div className="mx-5 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-700 flex items-center gap-2">
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
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        Nome Completo <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={e => setFormName(e.target.value)}
                        placeholder="Ex: João da Silva"
                        className="w-full bg-[#f3f7fe] border border-[#c4d5ee] focus:border-indigo-500 text-gray-900 px-3.5 py-2.5 rounded-xl outline-none text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        E-mail de Login <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={formEmail}
                        onChange={e => setFormEmail(e.target.value)}
                        placeholder="joao@emporio.com"
                        className="w-full bg-[#f3f7fe] border border-[#c4d5ee] focus:border-indigo-500 text-gray-900 px-3.5 py-2.5 rounded-xl outline-none text-xs"
                      />
                    </div>
                  </div>

                  {/* Perfil na Hierarquia */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Perfil / Nível de Acesso na Hierarquia <span className="text-red-600">*</span>
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
                                : "bg-[#f3f7fe] border-[#c4d5ee] hover:border-indigo-200"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-xs font-bold ${style.color}`}>{r.name}</span>
                              {isSelected && <Check size={14} className="text-indigo-600" />}
                            </div>
                            <p className="text-[10px] text-slate-500 leading-tight">{r.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Senha e PIN */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#c4d5ee]">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        {editingUserId ? "Alterar Senha (Opcional)" : "Senha de Acesso *"}
                      </label>
                      <input
                        type="password"
                        value={formPassword}
                        onChange={e => setFormPassword(e.target.value)}
                        placeholder={editingUserId ? "Deixe em branco para manter a atual" : "Mínimo 4 caracteres"}
                        className="w-full bg-[#f3f7fe] border border-[#c4d5ee] focus:border-indigo-500 text-gray-900 px-3.5 py-2.5 rounded-xl outline-none text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center justify-between">
                        <span>PIN de Liberação Rápida (PDV)</span>
                        <span className="text-[10px] text-amber-600">4 a 6 dígitos</span>
                      </label>
                      <input
                        type="password"
                        maxLength={6}
                        value={formPin}
                        onChange={e => setFormPin(e.target.value.replace(/\D/g, ""))}
                        placeholder={editingUserId ? "•••• (deixe em branco p/ manter)" : "Ex: 1234"}
                        className="w-full bg-[#f3f7fe] border border-[#c4d5ee] focus:border-indigo-500 text-gray-900 px-3.5 py-2.5 rounded-xl outline-none text-xs tracking-widest font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 2: LOJAS */}
              {activeTab === "STORES" && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500">
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
                              : "bg-[#f3f7fe] border-[#c4d5ee] opacity-70"
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
                              className="rounded border-[#c4d5ee] text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                            />
                            <div>
                              <span className="text-xs font-bold text-gray-900 block">{s.code} - {s.name}</span>
                              <span className="text-[10px] text-slate-500">{s.city}/{s.state || "SP"}</span>
                            </div>
                          </label>

                          {isChecked && (
                            <button
                              type="button"
                              onClick={() => setFormDefaultStore(s.id)}
                              className={`text-[10px] px-2 py-1 rounded-lg font-semibold border transition-all ${
                                isDefault
                                  ? "bg-amber-500/15 text-amber-700 border-amber-500/30"
                                  : "text-slate-500 hover:text-gray-900 border-transparent"
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
                  <div className="p-3 bg-indigo-500/10 border border-indigo-200 rounded-2xl text-xs text-indigo-700 flex items-center justify-between">
                    <span>
                      Perfil base: <strong className="text-gray-900">{ROLES_INFO[formRole]?.label || formRole}</strong>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Clique para Conceder (+) ou Revogar (-) permissões específicas deste colaborador.
                    </span>
                  </div>

                  {permissionModules.map(mod => {
                    const modPerms = permissions.filter(p => p.module === mod);

                    return (
                      <div key={mod} className="bg-[#f3f7fe] rounded-2xl border border-[#c4d5ee] p-3.5">
                        <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                          <ShieldCheck size={14} />
                          {mod} ({modPerms.length})
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {modPerms.map(p => {
                            const isInherited = selectedRolePerms.includes(p.id);
                            const customOverride = formCustomPerms[p.id]; // true = explicit grant, false = explicit revoke, undefined = inherited

                            let statusBadge = "HERDADA";
                            let badgeClass = "bg-[#eaf1fc] text-slate-500 border-[#c4d5ee]";

                            if (formRole === "ADMIN") {
                              statusBadge = "ADMIN TOTAL";
                              badgeClass = "bg-violet-500/20 text-violet-700 border-violet-500/30";
                            } else if (customOverride === true) {
                              statusBadge = "CONCEDIDA (+)";
                              badgeClass = "bg-emerald-500/20 text-emerald-700 border-emerald-500/30";
                            } else if (customOverride === false) {
                              statusBadge = "REVOGADA (-)";
                              badgeClass = "bg-red-500/20 text-red-700 border-red-500/30";
                            } else if (isInherited) {
                              statusBadge = "HERDADA (PERFIL)";
                              badgeClass = "bg-indigo-500/15 text-indigo-700 border-indigo-200";
                            } else {
                              statusBadge = "BLOQUEADA";
                              badgeClass = "bg-[#fbfdff] text-slate-600 border-[#c4d5ee]";
                            }

                            return (
                              <div
                                key={p.id}
                                className="p-2.5 rounded-xl bg-[#fbfdff] border border-[#c4d5ee] flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0 flex-1">
                                  <span className="text-xs font-semibold text-gray-900 block truncate">{p.name}</span>
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
                                            : "bg-[#eaf1fc] text-slate-500 hover:text-emerald-600 hover:bg-emerald-500/10"
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
                                            : "bg-[#eaf1fc] text-slate-500 hover:text-red-600 hover:bg-red-500/10"
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
                  <h4 className="text-xs font-bold text-slate-600">Últimas Atividades e Liberações</h4>

                  {userHistory.auditLogs.length === 0 && userHistory.requestedApprovals.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      Nenhum registro de auditoria para este colaborador ainda.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[350px] overflow-y-auto">
                      {userHistory.requestedApprovals.map((req: any) => (
                        <div key={req.id} className="p-3 bg-[#f3f7fe] border border-[#c4d5ee] rounded-xl text-xs flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-gray-900 block">Liberação: {req.operation}</span>
                            <span className="text-[10px] text-slate-500">Motivo: {req.reason} • Terminal: {req.terminal}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            req.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-600" :
                            req.status === "REJECTED" ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-600"
                          }`}>
                            {req.status}
                          </span>
                        </div>
                      ))}

                      {userHistory.auditLogs.map((log: any) => (
                        <div key={log.id} className="p-3 bg-[#f3f7fe] border border-[#c4d5ee] rounded-xl text-xs flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-slate-600 block">{log.action}: {log.operation}</span>
                            <span className="text-[10px] text-slate-500">{new Date(log.createdAt).toLocaleString("pt-BR")}</span>
                          </div>
                          <span className="text-[10px] text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded font-mono">
                            {log.result}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Botões do Rodapé */}
              <div className="pt-4 border-t border-[#c4d5ee] flex gap-2.5 items-center">
                {editingUserId && currentUser?.isAdmin && editingUserId !== currentUser.userId && (
                  <button
                    type="button"
                    onClick={() => {
                      const userToDelete = users.find(u => u.id === editingUserId);
                      handleDeleteUser(editingUserId, userToDelete?.name || formName);
                    }}
                    disabled={saving || deletingUserId === editingUserId}
                    className="py-2.5 px-3.5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-xl text-xs border border-red-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Excluir este colaborador permanentemente"
                  >
                    {deletingUserId === editingUserId ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Trash2 size={13} />
                    )}
                    <span>Excluir Colaborador</span>
                  </button>
                )}
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2.5 bg-[#fbfdff] hover:bg-[#eaf1fc] text-slate-600 font-semibold rounded-xl text-xs border border-[#c4d5ee] transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !currentUser?.isAdmin}
                  className={`px-5 py-2.5 text-white font-bold rounded-xl text-xs shadow-lg flex items-center justify-center gap-2 transition-all ${
                    !currentUser?.isAdmin
                      ? "bg-gray-400 cursor-not-allowed opacity-60"
                      : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/25 cursor-pointer"
                  }`}
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
