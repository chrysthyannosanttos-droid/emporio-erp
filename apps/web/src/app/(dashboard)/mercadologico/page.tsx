"use client";

import { useEffect, useState, useMemo } from "react";
import { getMercadologico, createCategory, deleteCategory, seedDefaultMercadologico } from "@/actions/mercadologico";
import {
  FolderTree,
  Plus,
  Sparkles,
  Trash2,
  Loader2,
  Package,
  Search,
  Tag,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  LayoutGrid,
  ListTree,
  X
} from "lucide-react";

interface CategoryItem {
  id: string;
  name: string;
  _count?: { products: number };
}

interface TreeNodeGroup {
  id: string;
  name: string;
  productCount: number;
  fullName: string;
}

interface TreeNodeSection {
  name: string;
  productCount: number;
  groups: TreeNodeGroup[];
}

interface TreeNodeDepartment {
  name: string;
  productCount: number;
  sections: TreeNodeSection[];
}

export default function MercadologicoPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [creating, setCreating] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState("");
  const [viewMode, setViewMode] = useState<"tree" | "grid">("tree");

  // Estado de nós expandidos na Árvore
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const { categories } = await getMercadologico();
    if (categories) {
      setCategories(categories);
    }
    setLoading(false);
  }

  function toggleNode(key: string) {
    setExpandedNodes((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  }

  function expandAll(tree: TreeNodeDepartment[]) {
    const next: Record<string, boolean> = {};
    tree.forEach((dept) => {
      next[`dept-${dept.name}`] = true;
      dept.sections.forEach((sec) => {
        next[`sec-${dept.name}-${sec.name}`] = true;
      });
    });
    setExpandedNodes(next);
  }

  function collapseAll() {
    setExpandedNodes({});
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setCreating(true);
    await createCategory(newCatName.trim());
    setCreating(false);
    setNewCatName("");
    setShowModal(false);
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja remover esta categoria?")) return;
    await deleteCategory(id);
    loadData();
  }

  async function handleSeedDefault() {
    setSeeding(true);
    setMessage("");
    const res = await seedDefaultMercadologico();
    setSeeding(false);

    if (res?.success) {
      setMessage(`✅ Mercadológico Varejo criado com sucesso! (${res.count} novos grupos inseridos).`);
      loadData();
    } else if (res?.error) {
      setMessage(res.error);
    }
  }

  // Filtragem de busca
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  // Estrutura a lista plana em Árvore Hierárquica (Departamento ➔ Seção ➔ Grupo)
  const treeData = useMemo(() => {
    const deptMap: Record<string, TreeNodeDepartment> = {};

    filteredCategories.forEach((cat) => {
      const parts = cat.name.split(" > ");
      const pCount = cat._count?.products || 0;

      const deptName = parts[0] ? parts[0].trim() : "Outros";
      const secName = parts[1] ? parts[1].trim() : "Geral";
      const grpName = parts[2] ? parts[2].trim() : parts[0];

      if (!deptMap[deptName]) {
        deptMap[deptName] = {
          name: deptName,
          productCount: 0,
          sections: []
        };
      }

      deptMap[deptName].productCount += pCount;

      let secObj = deptMap[deptName].sections.find((s) => s.name === secName);
      if (!secObj) {
        secObj = {
          name: secName,
          productCount: 0,
          groups: []
        };
        deptMap[deptName].sections.push(secObj);
      }

      secObj.productCount += pCount;
      secObj.groups.push({
        id: cat.id,
        name: grpName,
        productCount: pCount,
        fullName: cat.name
      });
    });

    return Object.values(deptMap);
  }, [filteredCategories]);

  const totalProducts = categories.reduce((sum, c) => sum + (c._count?.products || 0), 0);

  return (
    <div className="space-y-6 max-w-full select-none">
      {/* Top Bar Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Estrutura Mercadológica</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-widest">
              Varejo & Supermercados
            </span>
          </div>
          <p className="text-gray-500 text-xs mt-1">
            Organize seus produtos por Departamentos, Seções, Grupos e Subgrupos para relatórios de vendas e compras.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSeedDefault}
            disabled={seeding}
            className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm active:scale-98 disabled:opacity-50"
          >
            {seeding ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-amber-500" />}
            Gerar Mercadológico Varejo (Padrão)
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-blue-500/20 active:scale-98"
          >
            <Plus size={16} /> Novo Grupo / Categoria
          </button>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-700 font-bold flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          {message}
        </div>
      )}

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600 border border-blue-100">
            <FolderTree size={24} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Departamentos Mapeados</span>
            <span className="text-2xl font-black text-gray-900 font-mono">{treeData.length} departamento(s)</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100">
            <Package size={24} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Produtos Vinculados</span>
            <span className="text-2xl font-black text-emerald-600 font-mono">{totalProducts}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600 border border-amber-100">
            <Tag size={24} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Grupos/Categorias</span>
            <span className="text-2xl font-black text-amber-600 font-mono">{categories.length}</span>
          </div>
        </div>
      </div>

      {/* Search Input & View Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 bg-gray-50 border border-gray-200 px-4 py-2 rounded-xl">
          <Search className="text-gray-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar Departamento, Seção ou Grupo..."
            className="w-full bg-transparent border-none outline-none text-gray-900 text-xs placeholder:text-gray-400 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-gray-100">
          {viewMode === "tree" && (
            <div className="flex items-center gap-1 mr-2">
              <button
                onClick={() => expandAll(treeData)}
                className="px-2.5 py-1.5 text-[11px] font-bold bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-200 transition-all"
              >
                Expandir Tudo
              </button>
              <button
                onClick={collapseAll}
                className="px-2.5 py-1.5 text-[11px] font-bold bg-gray-50 text-gray-500 hover:bg-gray-100 rounded-lg border border-gray-200 transition-all"
              >
                Recolher Tudo
              </button>
            </div>
          )}

          {/* Toggle View Mode */}
          <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200">
            <button
              onClick={() => setViewMode("tree")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "tree" ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <ListTree size={14} /> Árvore
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "grid" ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <LayoutGrid size={14} /> Cards
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 flex justify-center text-gray-400">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      ) : viewMode === "tree" ? (
        /* ─── VISUALIZAÇÃO EM ÁRVORE INTERATIVA HIERÁRQUICA ─── */
        <div className="space-y-4">
          {treeData.map((dept) => {
            const deptKey = `dept-${dept.name}`;
            const isDeptExpanded = expandedNodes[deptKey];

            return (
              <div key={dept.name} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                {/* Nível 1: DEPARTAMENTO */}
                <div
                  onClick={() => toggleNode(deptKey)}
                  className="p-4 bg-gray-50/70 hover:bg-gray-100/70 cursor-pointer flex items-center justify-between transition-colors select-none"
                >
                  <div className="flex items-center gap-3">
                    <button className="text-blue-600 p-1">
                      {isDeptExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                    <div className="flex items-center gap-2.5">
                      <Folder className="text-blue-600 fill-blue-100" size={20} />
                      <h2 className="text-base font-black text-gray-900 tracking-wide">{dept.name}</h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-gray-600 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-xs">
                      {dept.sections.length} seções
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-mono">
                      {dept.productCount} produto(s)
                    </span>
                  </div>
                </div>

                {/* Conteúdo do Departamento (Seções & Grupos) */}
                {isDeptExpanded && (
                  <div className="p-4 space-y-3 bg-white border-t border-gray-100 divide-y divide-gray-100">
                    {dept.sections.map((sec) => {
                      const secKey = `sec-${dept.name}-${sec.name}`;
                      const isSecExpanded = expandedNodes[secKey] ?? true;

                      return (
                        <div key={sec.name} className="pt-3 first:pt-0 space-y-2">
                          {/* Nível 2: SEÇÃO */}
                          <div
                            onClick={() => toggleNode(secKey)}
                            className="flex items-center justify-between p-2.5 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors select-none ml-2"
                          >
                            <div className="flex items-center gap-2.5">
                              <button className="text-gray-400">
                                {isSecExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </button>
                              {isSecExpanded ? (
                                <FolderOpen size={16} className="text-amber-500" />
                              ) : (
                                <Folder size={16} className="text-amber-500/70" />
                              )}
                              <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">{sec.name}</h3>
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 font-mono">
                              {sec.groups.length} grupo(s)
                            </span>
                          </div>

                          {/* Nível 3: GRUPOS / SUBGRUPOS */}
                          {isSecExpanded && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pl-10 pr-2 pt-1 pb-2">
                              {sec.groups.map((grp) => (
                                <div
                                  key={grp.id}
                                  className="bg-gray-50 p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-white flex items-center justify-between group transition-all shadow-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <Tag size={13} className="text-blue-600 shrink-0" />
                                    <span className="text-xs font-bold text-gray-900 leading-snug">{grp.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] font-mono font-bold text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded">
                                      {grp.productCount} prod.
                                    </span>
                                    <button
                                      onClick={() => handleDelete(grp.id)}
                                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 p-1 transition-all"
                                      title="Excluir Categoria"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {treeData.length === 0 && (
            <div className="py-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <FolderTree size={36} className="mx-auto mb-3 text-gray-300" />
              <p className="font-bold text-gray-700 text-sm">Nenhum departamento ou categoria encontrado.</p>
              <p className="text-xs text-gray-500 mt-1">
                Clique em <strong>"Gerar Mercadológico Varejo"</strong> para alimentar a estrutura recomendada de supermercados.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* ─── VISUALIZAÇÃO EM GRID DE CARDS ─── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((cat) => {
            const parts = cat.name.split(" > ");
            const isHierarchy = parts.length > 1;

            return (
              <div
                key={cat.id}
                className="bg-white p-5 rounded-2xl border border-gray-200 hover:border-blue-300 transition-all flex flex-col justify-between space-y-4 group shadow-sm hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wider">
                      {isHierarchy ? parts[0] : "Geral"}
                    </span>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 p-1 transition-all"
                      title="Excluir Categoria"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-gray-900 leading-snug flex items-center gap-1.5">
                    {isHierarchy ? (
                      <div className="flex flex-wrap items-center gap-1 text-gray-700">
                        {parts.map((p: string, idx: number) => (
                          <span key={idx} className="flex items-center gap-1">
                            <span className={idx === parts.length - 1 ? "text-gray-900 font-black" : "text-gray-500"}>
                              {p}
                            </span>
                            {idx < parts.length - 1 && <ChevronRight size={12} className="text-gray-400 shrink-0" />}
                          </span>
                        ))}
                      </div>
                    ) : (
                      cat.name
                    )}
                  </h3>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>Produtos associados</span>
                  <span className="font-bold text-blue-600 font-mono px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-md">
                    {cat._count?.products || 0} produto(s)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Criar Categoria */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <FolderTree size={20} className="text-blue-600" /> Novo Grupo Mercadológico
            </h3>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                  Nome do Grupo / Hierarquia *
                </label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Ex: 03 - Bebidas > Cervejas > Pilsen"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl text-xs outline-none focus:border-blue-500 focus:bg-white font-medium"
                />
                <p className="text-[11px] text-gray-500 mt-1.5">
                  Dica: Use <strong>" &gt; "</strong> para separar Departamento, Seção e Grupo (ex: <i>01 - Mercearia &gt; Grãos &gt; Arroz</i>).
                </p>
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-md shadow-blue-500/20"
                >
                  {creating && <Loader2 size={16} className="animate-spin" />}
                  Salvar Categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
