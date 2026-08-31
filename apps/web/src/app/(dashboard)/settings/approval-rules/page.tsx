"use client";

import { useState, useEffect } from "react";
import {
  ShieldAlert, Plus, Check, X, Edit2, Trash2, Key,
  Sliders, Loader2, Sparkles, Shield, UserPlus, ChevronDown
} from "lucide-react";
import {
  listApprovalRules, saveApprovalRule,
  toggleApprovalRule, deleteApprovalRule
} from "@/actions/approvals";
import { listRolesWithPermissions, createCustomRole } from "@/actions/roles";
import { listStores } from "@/actions/stores";

const OPERATIONS_LIST = [
  { code: "pdv.cancel_sale",      name: "Cancelamento de Venda",        unit: "R$" },
  { code: "pdv.apply_discount",   name: "Aplicação de Desconto no PDV", unit: "%" },
  { code: "pdv.cancel_item",      name: "Cancelamento de Item",         unit: "R$" },
  { code: "pdv.change_price",     name: "Alteração de Preço no PDV",    unit: "R$" },
  { code: "pdv.bleed",            name: "Sangria de Caixa",             unit: "R$" },
  { code: "pdv.refund_sale",      name: "Estorno de Venda",             unit: "R$" },
  { code: "pdv.supply",           name: "Suprimento de Caixa",          unit: "R$" },
  { code: "stock.loss",           name: "Registro de Perda",            unit: "R$" },
  { code: "stock.adjust",         name: "Ajuste Manual de Estoque",     unit: "R$" },
  { code: "finance.cancel_entry", name: "Cancelamento Financeiro",      unit: "R$" },
];

const ROLE_STYLE: Record<string, string> = {
  ADMIN:      "text-violet-400 bg-violet-500/15 border-violet-500/25",
  MANAGER:    "text-indigo-400 bg-indigo-500/15 border-indigo-500/25",
  SUPERVISOR: "text-amber-400  bg-amber-500/15  border-amber-500/25",
  OPERATOR:   "text-emerald-400 bg-emerald-500/15 border-emerald-500/25",
  VIEWER:     "text-sky-400    bg-sky-500/15    border-sky-500/25",
};

export default function ApprovalRulesPage() {
  const [rules, setRules]   = useState<any[]>([]);
  const [roles, setRoles]   = useState<any[]>([]); // dinâmico do banco
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de regra
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule]         = useState<any | null>(null);
  const [savingRule, setSavingRule]           = useState(false);

  // Modal de novo cargo
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [savingRole, setSavingRole]           = useState(false);
  const [roleError, setRoleError]             = useState<string | null>(null);

  // Form – Regra
  const [formOp,          setFormOp]          = useState("pdv.cancel_sale");
  const [formName,        setFormName]        = useState("");
  const [formMinVal,      setFormMinVal]      = useState("0");
  const [formMaxVal,      setFormMaxVal]      = useState("");
  const [formMinRole,     setFormMinRole]     = useState("SUPERVISOR");
  const [formRequiresPin, setFormRequiresPin] = useState(true);
  const [formStoreId,     setFormStoreId]     = useState(""); // "" = global

  // Form – Novo Cargo
  const [newRoleKey,   setNewRoleKey]   = useState("");
  const [newRoleName,  setNewRoleName]  = useState("");
  const [newRoleDesc,  setNewRoleDesc]  = useState("");
  const [newRoleLevel, setNewRoleLevel] = useState("OPERATOR"); // base para herdar nível

  const loadData = async () => {
    setLoading(true);
    try {
      const [rulesRes, rolesRes, storesRes] = await Promise.all([
        listApprovalRules(),
        listRolesWithPermissions(),
        listStores(),
      ]);
      if (rulesRes.rules)   setRules(rulesRes.rules);
      if (rolesRes.roles)   setRoles(rolesRes.roles);
      if (storesRes.stores) setStores(storesRes.stores);
    } catch (err) {
      console.error("Erro ao carregar regras:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const openNewRule = () => {
    setEditingRule(null);
    setFormOp("pdv.cancel_sale");
    setFormName("");
    setFormMinVal("0");
    setFormMaxVal("");
    setFormMinRole(roles[0]?.key || "SUPERVISOR");
    setFormRequiresPin(true);
    setFormStoreId("");
    setIsRuleModalOpen(true);
  };

  const openEditRule = (rule: any) => {
    setEditingRule(rule);
    setFormOp(rule.operation);
    setFormName(rule.name);
    setFormMinVal(rule.minValue.toString());
    setFormMaxVal(rule.maxValue !== null ? rule.maxValue.toString() : "");
    setFormMinRole(rule.minRole);
    setFormRequiresPin(rule.requiresPin);
    setFormStoreId(rule.storeId || "");
    setIsRuleModalOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRule(true);
    try {
      const res = await saveApprovalRule({
        id: editingRule?.id,
        operation: formOp,
        name: formName.trim(),
        minValue: parseFloat(formMinVal) || 0,
        maxValue: formMaxVal ? parseFloat(formMaxVal) : null,
        minRole: formMinRole,
        requiresPin: formRequiresPin,
      });
      if (res.success) { setIsRuleModalOpen(false); await loadData(); }
      else alert(res.error || "Erro ao salvar regra.");
    } catch (err: any) { alert(err.message); }
    finally { setSavingRule(false); }
  };

  const handleToggle = async (id: string, active: boolean) => {
    await toggleApprovalRule(id, !active);
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !active } : r));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta regra de alçada?")) return;
    await deleteApprovalRule(id);
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoleError(null);
    setSavingRole(true);
    try {
      const res = await createCustomRole({
        key: newRoleKey.trim().toUpperCase().replace(/\s+/g, "_"),
        name: newRoleName.trim(),
        description: newRoleDesc.trim() || undefined,
        permissionIds: [],
      });
      if (res.success) {
        setIsRoleModalOpen(false);
        setNewRoleKey("");
        setNewRoleName("");
        setNewRoleDesc("");
        await loadData();
      } else {
        setRoleError(res.error || "Erro ao criar cargo.");
      }
    } catch (err: any) {
      setRoleError(err.message);
    } finally {
      setSavingRole(false);
    }
  };

  // Agrupar regras por operação
  const groupedRules: Record<string, any[]> = {};
  rules.forEach(r => {
    if (!groupedRules[r.operation]) groupedRules[r.operation] = [];
    groupedRules[r.operation].push(r);
  });

  return (
    <div className="h-full flex flex-col gap-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <ShieldAlert size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Regras de Liberação & Alçadas</h1>
            <p className="text-slate-400 text-xs mt-0.5">Defina limites e alçadas por cargo para cada operação crítica do sistema.</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Botão Novo Cargo */}
          <button
            onClick={() => { setIsRoleModalOpen(true); setRoleError(null); }}
            className="bg-[#14192d] hover:bg-violet-600/20 text-violet-300 border border-violet-500/25 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <UserPlus size={14} />
            <span>Novo Cargo</span>
          </button>

          {/* Botão Nova Regra */}
          <button
            onClick={openNewRule}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 text-xs cursor-pointer"
          >
            <Plus size={15} />
            <span>Nova Regra de Alçada</span>
          </button>
        </div>
      </div>

      {/* ── Cargos cadastrados ── */}
      <div className="shrink-0">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
          <Shield size={13} className="text-indigo-400" />
          Cargos / Perfis da Hierarquia ({roles.length})
        </p>
        <div className="flex flex-wrap gap-2">
          {roles.map(r => {
            const cls = ROLE_STYLE[r.key] || "text-slate-300 bg-slate-800/60 border-slate-700";
            return (
              <span key={r.id} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-semibold ${cls}`}>
                <Shield size={11} />
                {r.name}
                <span className="opacity-50 font-mono text-[10px]">({r.key})</span>
              </span>
            );
          })}
          <button
            onClick={() => { setIsRoleModalOpen(true); setRoleError(null); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-violet-500/30 text-[11px] font-semibold text-violet-400 hover:bg-violet-500/10 transition-all cursor-pointer"
          >
            <Plus size={11} />
            Adicionar Cargo
          </button>
        </div>
      </div>

      {/* ── Box explicativo ── */}
      <div className="bg-gradient-to-r from-[#14192d] to-[#101426] border border-indigo-500/15 rounded-2xl p-4 text-xs text-slate-300 flex items-center gap-3 shrink-0">
        <Sparkles size={20} className="text-amber-400 shrink-0" />
        <div>
          <strong className="text-white block">Hierarquia de Autorização Automática</strong>
          <span className="text-slate-400">
            Operações abaixo do limite são executadas pelo operador. Acima do limite, o sistema exige autorização por PIN do cargo mínimo exigido.
          </span>
        </div>
      </div>

      {/* ── Lista de Regras por Operação ── */}
      <div className="bg-[#101426] rounded-2xl border border-indigo-500/10 flex-1 flex flex-col min-h-0 overflow-hidden shadow-xl p-4">
        <div className="flex-1 overflow-auto min-h-0 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-slate-500 gap-3">
              <Loader2 className="animate-spin text-amber-400" size={32} />
              <p className="text-xs">Carregando regras de alçada...</p>
            </div>
          ) : rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-slate-500 gap-3">
              <ShieldAlert size={40} className="text-slate-700" />
              <p className="text-xs">Nenhuma regra de alçada configurada. Clique em "Nova Regra de Alçada" para começar.</p>
            </div>
          ) : (
            Object.entries(groupedRules).map(([operationCode, opRules]) => {
              const opDef = OPERATIONS_LIST.find(o => o.code === operationCode);
              const opName = opDef?.name || operationCode;
              const unit   = opDef?.unit || "R$";

              return (
                <div key={operationCode} className="bg-[#0c0f1a] border border-indigo-500/10 rounded-2xl p-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    {opName}
                    <span className="text-[10px] text-slate-500 font-mono">({operationCode})</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {opRules.map(rule => {
                      const roleObj = roles.find(r => r.key === rule.minRole);
                      const roleLabel = roleObj?.name || rule.minRole;
                      const roleCls = ROLE_STYLE[rule.minRole] || "text-slate-300 bg-slate-800 border-slate-700";

                      return (
                        <div
                          key={rule.id}
                          className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                            rule.active
                              ? "bg-[#101426] border-indigo-500/20 shadow-sm"
                              : "bg-[#0a0d18] border-indigo-500/5 opacity-50"
                          }`}
                        >
                          <div>
                            {/* Nome + Status */}
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-white leading-tight">{rule.name}</span>
                              <button
                                onClick={() => handleToggle(rule.id, rule.active)}
                                className={`text-[9px] px-2 py-0.5 rounded-full font-bold border transition-all cursor-pointer ${
                                  rule.active
                                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                                    : "bg-slate-800 text-slate-500 border-slate-700"
                                }`}
                              >
                                {rule.active ? "Ativa" : "Inativa"}
                              </button>
                            </div>

                            {/* Faixa de Valor */}
                            <div className="bg-[#0c0f1a] p-2.5 rounded-xl border border-indigo-500/10 mb-3 text-xs flex items-center justify-between">
                              <span className="text-slate-400 text-[11px]">Faixa:</span>
                              <span className="font-bold text-amber-300 font-mono text-[11px]">
                                {unit} {Number(rule.minValue).toFixed(2)} → {rule.maxValue !== null ? `${unit} ${Number(rule.maxValue).toFixed(2)}` : "∞"}
                              </span>
                            </div>

                            {/* Cargo mínimo */}
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-slate-400 text-[11px]">Cargo Mínimo:</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${roleCls}`}>
                                {roleLabel}
                              </span>
                            </div>

                            {/* Loja específica */}
                            {rule.storeId && (
                              <div className="text-[10px] text-slate-500 mt-1">
                                📍 Loja: {stores.find(s => s.id === rule.storeId)?.code || rule.storeId}
                              </div>
                            )}

                            {rule.requiresPin && (
                              <div className="flex items-center gap-1.5 text-[10px] text-amber-400 mt-2">
                                <Key size={11} />
                                <span>Exige PIN do autorizador</span>
                              </div>
                            )}
                          </div>

                          {/* Ações */}
                          <div className="flex items-center justify-end gap-2 pt-3 mt-2 border-t border-indigo-500/10">
                            <button
                              onClick={() => openEditRule(rule)}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all cursor-pointer"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete(rule.id)}
                              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ══════════════ MODAL – Nova / Editar Regra ══════════════ */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#101426] border border-indigo-500/20 rounded-3xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-indigo-500/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert size={16} className="text-amber-400" />
                {editingRule ? "Editar Regra de Alçada" : "Nova Regra de Alçada"}
              </h3>
              <button onClick={() => setIsRuleModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-3">
              {/* Operação */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo de Operação</label>
                <select
                  value={formOp}
                  onChange={e => {
                    setFormOp(e.target.value);
                    if (!editingRule) {
                      const op = OPERATIONS_LIST.find(o => o.code === e.target.value);
                      if (op) setFormName(`${op.name} — Alçada`);
                    }
                  }}
                  className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2 rounded-xl text-xs outline-none"
                >
                  {OPERATIONS_LIST.map(o => (
                    <option key={o.code} value={o.code}>{o.name}</option>
                  ))}
                </select>
              </div>

              {/* Nome da regra */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome / Descrição da Regra</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Ex: Cancelamento de Venda até R$ 200"
                  className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2 rounded-xl text-xs outline-none"
                />
              </div>

              {/* Faixas de Valor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Valor Mín. ({OPERATIONS_LIST.find(o => o.code === formOp)?.unit || "R$"})
                  </label>
                  <input
                    type="number" step="0.01" required
                    value={formMinVal} onChange={e => setFormMinVal(e.target.value)}
                    className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2 rounded-xl text-xs font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>Valor Máx.</span>
                    <span className="text-[10px] text-slate-500">vazio = ∞</span>
                  </label>
                  <input
                    type="number" step="0.01"
                    value={formMaxVal} onChange={e => setFormMaxVal(e.target.value)}
                    placeholder="Sem limite"
                    className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2 rounded-xl text-xs font-mono outline-none"
                  />
                </div>
              </div>

              {/* Cargo Mínimo — dinâmico */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Cargo Mínimo para Autorizar</label>
                <select
                  value={formMinRole}
                  onChange={e => setFormMinRole(e.target.value)}
                  className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2 rounded-xl text-xs outline-none"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.key}>{r.name}</option>
                  ))}
                </select>
              </div>

              {/* Loja Específica (Opcional) */}
              {stores.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Loja Específica <span className="text-slate-500 font-normal">(opcional – deixe vazio para global)</span>
                  </label>
                  <select
                    value={formStoreId}
                    onChange={e => setFormStoreId(e.target.value)}
                    className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2 rounded-xl text-xs outline-none"
                  >
                    <option value="">Todas as Lojas (Global)</option>
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Exigir PIN */}
              <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formRequiresPin}
                  onChange={e => setFormRequiresPin(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 w-4 h-4"
                />
                <span className="text-xs text-slate-300 font-medium">Exigir PIN numérico ou senha do autorizador</span>
              </label>

              <div className="flex gap-2 pt-3">
                <button type="button" onClick={() => setIsRuleModalOpen(false)}
                  className="flex-1 py-2.5 bg-[#14192d] text-slate-300 text-xs rounded-xl font-semibold cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={savingRule}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-xs rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                  {savingRule ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Salvar Regra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL – Novo Cargo ══════════════ */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#101426] border border-violet-500/20 rounded-3xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-violet-500/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus size={16} className="text-violet-400" />
                Cadastrar Novo Cargo / Perfil
              </h3>
              <button onClick={() => setIsRoleModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>

            {roleError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300">
                {roleError}
              </div>
            )}

            <form onSubmit={handleCreateRole} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Código Único (identificador) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text" required
                  value={newRoleKey}
                  onChange={e => setNewRoleKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
                  placeholder="Ex: LIDER_ESTOQUE, CAIXA_SENIOR, FISCAL"
                  className="w-full bg-[#0c0f1a] border border-violet-500/15 text-white px-3 py-2 rounded-xl text-xs font-mono uppercase outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">Apenas letras maiúsculas, números e underscore. Não pode ser alterado depois.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome de Exibição <span className="text-red-400">*</span>
                </label>
                <input
                  type="text" required
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  placeholder="Ex: Líder de Almoxarifado, Caixa Sênior"
                  className="w-full bg-[#0c0f1a] border border-violet-500/15 text-white px-3 py-2 rounded-xl text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Descrição (Opcional)</label>
                <textarea
                  rows={2}
                  value={newRoleDesc}
                  onChange={e => setNewRoleDesc(e.target.value)}
                  placeholder="Responsabilidades e atribuições deste cargo..."
                  className="w-full bg-[#0c0f1a] border border-violet-500/15 text-white px-3 py-2 rounded-xl text-xs resize-none outline-none"
                />
              </div>

              <div className="p-3 bg-violet-500/5 border border-violet-500/15 rounded-xl text-[11px] text-slate-400">
                💡 Após criar o cargo, acesse a tela de <strong className="text-violet-300">Perfis &amp; Permissões</strong> para configurar as permissões detalhadas deste novo cargo.
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsRoleModalOpen(false)}
                  className="flex-1 py-2.5 bg-[#14192d] text-slate-300 text-xs rounded-xl font-semibold cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={savingRole}
                  className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-xs rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-violet-600/20">
                  {savingRole ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Criar Cargo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
