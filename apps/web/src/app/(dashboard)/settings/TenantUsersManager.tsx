"use client";

import { useEffect, useState } from "react";
import {
  listTenantUsers,
  createTenantUser,
  toggleTenantUserActive,
  setUserMobilePdvAccess,
} from "@/actions/users";
import { User, Plus, Shield, Loader2, CheckCircle, XCircle, Smartphone, AlertTriangle } from "lucide-react";

export function TenantUsersManager() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState("OPERATOR");
  const [allowMobilePdv, setAllowMobilePdv] = useState(false);

  async function loadUsers() {
    setLoading(true);
    const res = await listTenantUsers();
    setUsers(res.users || []);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    const role = (formData.get("role") as string) || "OPERATOR";
    const res = await createTenantUser({
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      password: String(formData.get("password") || ""),
      role,
      allowMobilePdv: role === "ADMIN" ? true : allowMobilePdv,
    });
    setCreating(false);

    if (res?.error) {
      setError(res.error);
    } else {
      setShowModal(false);
      setAllowMobilePdv(false);
      setSelectedRole("OPERATOR");
      loadUsers();
    }
  }

  async function handleToggle(userId: string, currentActive: boolean) {
    await toggleTenantUserActive(userId, !currentActive);
    loadUsers();
  }

  async function handleToggleMobilePdv(userId: string, currentHasMobile: boolean) {
    const res = await setUserMobilePdvAccess(userId, !currentHasMobile);
    if (res?.error) {
      alert(res.error);
      return;
    }
    loadUsers();
  }

  const roleLabels: Record<string, string> = {
    ADMIN: "Administrador",
    MANAGER: "Gerente",
    SUPERVISOR: "Fiscal de Caixa",
    STOCKIST: "Estoque",
    FINANCIAL: "Financeiro",
    SELLER: "Vendedor",
    OPERATOR: "Operador de Caixa",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Usuários da Empresa</h2>
          <p className="text-slate-500 text-sm">Gerencie o acesso e permissões (RBAC) dos seus colaboradores.</p>
        </div>
        <button
          onClick={() => {
            setSelectedRole("OPERATOR");
            setAllowMobilePdv(false);
            setError("");
            setShowModal(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shadow-lg shadow-indigo-600/20"
        >
          <Plus size={16} /> Novo Usuário
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center text-slate-500">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : (
        <div className="bg-[#eaf1fc] rounded-2xl border border-[#c4d5ee] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#fbfdff] text-xs font-bold text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-3.5">Nome / Email</th>
                <th className="px-5 py-3.5">Perfil (Role)</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c4d5ee] text-sm">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-indigo-500/5 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-bold text-gray-900">{u.name}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-200">
                        <Shield size={12} />
                        {roleLabels[u.role] || u.role}
                      </span>
                      {u.hasMobilePdv && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">
                          <Smartphone size={11} />
                          PDV Mobile
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold ${u.active ? "text-emerald-600" : "text-red-600"}`}>
                      {u.active ? <CheckCircle size={14} /> : <XCircle size={14} />}
                      {u.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      {u.role !== "ADMIN" && (
                        <button
                          onClick={() => handleToggleMobilePdv(u.id, Boolean(u.hasMobilePdv))}
                          className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-colors inline-flex items-center gap-1 ${
                            u.hasMobilePdv
                              ? "border-amber-500/30 text-amber-700 hover:bg-amber-500/10"
                              : "border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10"
                          }`}
                          title={u.hasMobilePdv ? "Revogar acesso ao Caixa Mobile" : "Liberar acesso ao Caixa Mobile"}
                        >
                          <Smartphone size={12} />
                          {u.hasMobilePdv ? "Remover Mobile" : "Liberar Mobile"}
                        </button>
                      )}
                      <button
                        onClick={() => handleToggle(u.id, u.active)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                          u.active
                            ? "border-red-500/30 text-red-600 hover:bg-red-500/10"
                            : "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                        }`}
                      >
                        {u.active ? "Desativar" : "Ativar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                    Nenhum usuário cadastrado além de você.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Criar Usuário */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#fbfdff] border border-indigo-200 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Novo Usuário</h3>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nome Completo *</label>
                <input
                  name="name"
                  required
                  placeholder="Ex: Carlos Oliveira"
                  className="w-full px-3 py-2 bg-[#eaf1fc] border border-indigo-200 text-gray-900 rounded-xl text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">E-mail *</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="carlos@empresa.com"
                  className="w-full px-3 py-2 bg-[#eaf1fc] border border-indigo-200 text-gray-900 rounded-xl text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Senha *</label>
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-[#eaf1fc] border border-indigo-200 text-gray-900 rounded-xl text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Perfil de Acesso (RBAC)</label>
                <select
                  name="role"
                  value={selectedRole}
                  onChange={(e) => {
                    const nextRole = e.target.value;
                    setSelectedRole(nextRole);
                    if (nextRole === "ADMIN") setAllowMobilePdv(true);
                  }}
                  className="w-full px-3 py-2 bg-[#eaf1fc] border border-indigo-200 text-gray-900 rounded-xl text-sm outline-none focus:border-indigo-500"
                >
                  <option value="OPERATOR">Operador de Caixa (Abre direto no PDV)</option>
                  <option value="SUPERVISOR">Fiscal de Caixa & Supervisão</option>
                  <option value="STOCKIST">Estoque & Depósito</option>
                  <option value="SELLER">Vendedor / Atendente</option>
                  <option value="FINANCIAL">Financeiro / Faturamento</option>
                  <option value="MANAGER">Gerente de Loja</option>
                  <option value="ADMIN">Administrador</option>
                </select>
                {selectedRole === "OPERATOR" && (
                  <p className="mt-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5">
                    <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Caixa dedicado: este perfil abre diretamente o PDV ao fazer login. Para acessar o sistema completo no celular, escolha outro perfil (ex.: Estoque ou Gerente).
                    </span>
                  </p>
                )}
              </div>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-indigo-200 bg-[#eaf1fc]/60 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={selectedRole === "ADMIN"}
                  checked={selectedRole === "ADMIN" ? true : allowMobilePdv}
                  onChange={(e) => setAllowMobilePdv(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-indigo-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <Smartphone size={13} className="text-emerald-600" />
                    Acesso ao Caixa Mobile (PDV Mobile no Celular)
                  </span>
                  <span className="text-[11px] text-slate-600 block mt-0.5">
                    {selectedRole === "ADMIN"
                      ? "Administrador já possui acesso automático ao PDV Mobile."
                      : "Libera o uso do PDV Mobile pelo celular/tablet para este colaborador."}
                  </span>
                </div>
              </label>

              {error && <div className="text-xs text-red-600 font-bold">{error}</div>}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-[#c4d5ee] text-slate-500 rounded-xl font-bold text-sm hover:bg-[#eaf1fc]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                >
                  {creating && <Loader2 size={16} className="animate-spin" />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
