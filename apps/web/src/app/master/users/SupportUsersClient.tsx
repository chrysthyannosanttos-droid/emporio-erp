"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Plus,
  KeyRound,
  Power,
  Search,
  Headphones,
  Loader2,
  UserPlus,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import {
  createSystemSupportUser,
  toggleSystemSupportUser,
  resetSystemSupportPassword,
} from "@/actions/masterSupport";

export interface SystemSupportUserDTO {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const SYSTEM_ROLE_LABELS: Record<string, { label: string; badge: string }> = {
  SUPER_ADMIN: {
    label: "Super Admin",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
  },
  ADMIN: {
    label: "Admin Master",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  SUPPORT: {
    label: "Técnico de Suporte",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
  },
};

export function SupportUsersClient({
  initialUsers,
  currentUserId,
}: {
  initialUsers: SystemSupportUserDTO[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Formulário novo técnico/admin
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("SUPPORT");
  const [creating, setCreating] = useState(false);

  // Redefinição de senha & ações
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [newPassValue, setNewPassValue] = useState("123456");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialUsers.filter((u) => {
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      );
    });
  }, [initialUsers, search, roleFilter]);

  const stats = useMemo(() => {
    const total = initialUsers.length;
    const active = initialUsers.filter((u) => u.active).length;
    const supportCount = initialUsers.filter((u) => u.role === "SUPPORT").length;
    const blocked = total - active;
    return { total, active, supportCount, blocked };
  }, [initialUsers]);

  function generateRandomPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let res = "";
    for (let i = 0; i < 8; i++) {
      res += chars[Math.floor(Math.random() * chars.length)];
    }
    setPassword(res);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setFeedback(null);

    const res = await createSystemSupportUser({ name, email, password, role });
    setCreating(false);

    if (res.error) {
      setFeedback({ type: "err", msg: res.error });
    } else {
      setFeedback({
        type: "ok",
        msg: `Integrante "${name}" cadastrado na equipe Master/Suporte com sucesso!`,
      });
      setName("");
      setEmail("");
      setPassword("");
      setRole("SUPPORT");
      setShowCreateForm(false);
      router.refresh();
    }
  }

  async function handleToggleActive(user: SystemSupportUserDTO) {
    setBusyId(user.id);
    setFeedback(null);
    const res = await toggleSystemSupportUser(user.id, !user.active);
    setBusyId(null);

    if (res.error) {
      setFeedback({ type: "err", msg: res.error });
    } else {
      setFeedback({
        type: "ok",
        msg: !user.active
          ? `Acesso de ${user.name} reativado.`
          : `Acesso de ${user.name} bloqueado.`,
      });
      router.refresh();
    }
  }

  async function handleConfirmReset(userId: string) {
    setBusyId(userId);
    setFeedback(null);
    const res = await resetSystemSupportPassword(userId, newPassValue);
    setBusyId(null);

    if (res.error) {
      setFeedback({ type: "err", msg: res.error });
    } else {
      setFeedback({ type: "ok", msg: "Senha do integrante redefinida com sucesso!" });
      setResettingId(null);
      router.refresh();
    }
  }

  return (
    <div className="h-full flex flex-col gap-5 overflow-auto pr-1">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Equipe Master &amp; Suporte Técnico
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie técnicos de suporte e administradores com acesso ao Portal Master e implantação de clientes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowCreateForm((prev) => !prev);
            setFeedback(null);
          }}
          className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
        >
          <UserPlus size={16} />
          <span>{showCreateForm ? "Fechar Formulário" : "Novo Técnico / Admin"}</span>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
        {[
          { label: "Total da Equipe", value: stats.total, color: "text-gray-900" },
          { label: "Acessos Ativos", value: stats.active, color: "text-emerald-700" },
          { label: "Técnicos de Suporte", value: stats.supportCount, color: "text-blue-700" },
          { label: "Bloqueados", value: stats.blocked, color: stats.blocked > 0 ? "text-red-600" : "text-slate-500" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-[#fbfdff] border border-emerald-500/[0.08] rounded-xl p-4"
          >
            <p className="text-xs font-medium text-slate-500">{kpi.label}</p>
            <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold border flex items-center gap-2 shrink-0 ${
            feedback.type === "ok"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {feedback.type === "ok" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Formulário Cadastro Novo Técnico / Admin */}
      {showCreateForm && (
        <form
          onSubmit={handleCreate}
          className="bg-[#fbfdff] border border-emerald-500/[0.15] rounded-xl p-5 space-y-4 shrink-0 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Headphones size={16} className="text-emerald-600" />
            <h2 className="text-sm font-bold text-gray-900">
              Cadastrar Novo Integrante (SystemUser)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Carlos Suporte"
                className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">E-mail de Acesso *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="carlos@cybertechapp.com.br"
                className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Senha Inicial *</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  required
                  minLength={4}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mín. 4 caracteres"
                  className="flex-1 min-w-0 px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm font-mono text-gray-900 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  title="Gerar senha aleatória"
                  className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 cursor-pointer"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Perfil de Acesso *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 bg-[#f3f7fe] border border-slate-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-emerald-500"
              >
                <option value="SUPPORT">Técnico de Suporte (SUPPORT)</option>
                <option value="ADMIN">Administrador Master (ADMIN)</option>
                <option value="SUPER_ADMIN">Super Admin (SUPER_ADMIN)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-300 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              <span>{creating ? "Salvando..." : "Criar Acesso"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tabela da Equipe */}
      <div className="bg-[#fbfdff] border border-emerald-500/[0.08] rounded-xl flex flex-col overflow-hidden">
        {/* Filtros */}
        <div className="p-4 border-b border-emerald-500/[0.08] flex flex-wrap items-center gap-3 bg-[#f3f7fe]/60">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
          >
            <option value="ALL">Todos os Níveis</option>
            <option value="SUPPORT">Técnicos de Suporte</option>
            <option value="ADMIN">Admin Master</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#f3f7fe]/80 border-b border-emerald-500/[0.08]">
              <tr>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Integrante
                </th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  E-mail
                </th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Nível de Acesso
                </th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Criado em
                </th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-500/[0.05] text-sm">
              {filteredUsers.map((u) => {
                const roleMeta = SYSTEM_ROLE_LABELS[u.role] || {
                  label: u.role,
                  badge: "bg-slate-100 text-slate-700 border-slate-200",
                };
                const isSelf = u.id === currentUserId;
                const isBusy = busyId === u.id;
                const isResetting = resettingId === u.id;

                return (
                  <tr key={u.id} className="hover:bg-emerald-500/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {u.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">{u.name}</p>
                            {isSelf && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                Você
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono">
                            ID: {u.id.split("-")[0]}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium text-xs">{u.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${roleMeta.badge}`}
                      >
                        <Shield size={12} /> {roleMeta.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                          u.active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        {u.active ? "Ativo" : "Bloqueado"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              if (isResetting) {
                                setResettingId(null);
                              } else {
                                setResettingId(u.id);
                                setNewPassValue("123456");
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 cursor-pointer"
                          >
                            <KeyRound size={12} />
                            <span>Redefinir Senha</span>
                          </button>

                          <button
                            type="button"
                            disabled={isBusy || (isSelf && u.active)}
                            title={
                              isSelf && u.active
                                ? "Você não pode bloquear sua própria conta"
                                : u.active
                                  ? "Bloquear acesso ao Master"
                                  : "Reativar acesso ao Master"
                            }
                            onClick={() => handleToggleActive(u)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                              u.active
                                ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            }`}
                          >
                            <Power size={12} />
                            <span>{u.active ? "Bloquear" : "Ativar"}</span>
                          </button>
                        </div>

                        {isResetting && (
                          <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                            <input
                              type="text"
                              value={newPassValue}
                              onChange={(e) => setNewPassValue(e.target.value)}
                              placeholder="Nova senha"
                              className="w-28 px-2 py-1 bg-white border border-amber-300 rounded text-xs font-mono text-gray-900"
                            />
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleConfirmReset(u.id)}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold cursor-pointer"
                            >
                              {isBusy ? "..." : "Salvar"}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500 text-sm">
                    Nenhum membro da equipe encontrado com os filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
