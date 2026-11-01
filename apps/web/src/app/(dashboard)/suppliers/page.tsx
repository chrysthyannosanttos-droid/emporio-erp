"use client";

import { useState, useEffect } from "react";
import { 
  Truck, Plus, Search, Phone, Mail, MapPin, X, Save, 
  Building2, Hash, FileText, Star, ChevronRight, Check, AlertCircle, Calendar 
} from "lucide-react";
import { 
  getSuppliers, createSupplier, updateSupplier, deleteSupplier, getSupplierById 
} from "@/actions/supplier";

const CATEGORIES = ["Todos", "Alimentos", "Bebidas", "Frios", "Limpeza", "Higiene", "Outros"];

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Todos");
  
  // Modais e gaveta
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [editSupplierData, setEditSupplierData] = useState<any | null>(null);

  // Abas do formulário de criação/edição
  const [formTab, setFormTab] = useState<"geral" | "fiscal" | "endereco" | "contato" | "logistica">("geral");

  // Estados dos inputs do formulário
  const [formData, setFormData] = useState({
    name: "",
    tradeName: "",
    document: "",
    stateReg: "",
    municipalReg: "",
    taxRegime: "Simples Nacional",
    isIcmsContributor: false,
    suframa: "",
    defaultPaymentTerm: "30 dias",
    discountPercent: 0,
    email: "",
    phone: "",
    phone2: "",
    quoteEmail: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    zipCode: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "AL",
    country: "Brasil",
    deliveryDays: [] as string[],
    deliveryLeadDays: 0,
    minOrderValue: 0,
    deliveryNotes: "",
    category: "Outros",
    segment: "Geral",
    systemType: "Outros",
    notes: ""
  });

  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  useEffect(() => {
    loadSuppliers();
  }, [search, catFilter]);

  async function loadSuppliers() {
    setLoading(true);
    const res = await getSuppliers(search, catFilter);
    if (res.suppliers) {
      setSuppliers(res.suppliers);
    }
    setLoading(false);
  }

  // Consulta CNPJ Pública via Receita WS / BrasilAPI / CNPJ.ws
  async function handleCnpjLookup() {
    const cleanCnpj = formData.document.replace(/\D/g, "");
    if (cleanCnpj.length !== 14) return alert("Digite um CNPJ válido de 14 dígitos.");
    
    setCnpjLoading(true);
    try {
      // Tentar via BrasilAPI primeiro (retorna opção pelo Simples / MEI e dados gerais)
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      if (res.ok) {
        const data = await res.json();
        
        let detectedRegime = "Simples Nacional";
        if (data.opcao_pelo_mei) detectedRegime = "MEI";
        else if (data.opcao_pelo_simples) detectedRegime = "Simples Nacional";
        else detectedRegime = "Lucro Presumido";

        setFormData(prev => ({
          ...prev,
          name: data.razao_social || "",
          tradeName: data.nome_fantasia || "",
          taxRegime: detectedRegime,
          stateReg: data.inscricao_estadual || prev.stateReg || "",
          municipalReg: data.inscricao_municipal || prev.municipalReg || "",
          isIcmsContributor: !data.opcao_pelo_mei,
          zipCode: data.cep || "",
          street: data.logradouro || "",
          number: data.numero || "",
          complement: data.complemento || "",
          neighborhood: data.bairro || "",
          city: data.municipio || "",
          state: data.uf || "AL",
          phone: data.ddd_telefone_1 ? `(${data.ddd_telefone_1.slice(0,2)}) ${data.ddd_telefone_1.slice(2)}` : "",
          email: data.email || ""
        }));
        return;
      }
      throw new Error("BrasilAPI fallback");
    } catch (_) {
      try {
        const res = await fetch(`https://publica.cnpj.ws/cnpj/${cleanCnpj}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        
        const isSimples = data.simples?.optante === "Sim";
        const isMei = data.simples?.mei === "Sim";
        const regime = isMei ? "MEI" : isSimples ? "Simples Nacional" : "Lucro Presumido";
        const ie = data.estabelecimento?.inscricoes_estaduais?.[0]?.inscricao_estadual || "";

        setFormData(prev => ({
          ...prev,
          name: data.razao_social || "",
          tradeName: data.estabelecimento?.nome_fantasia || "",
          taxRegime: regime,
          stateReg: ie || prev.stateReg,
          zipCode: data.estabelecimento?.cep || "",
          street: data.estabelecimento?.logradouro || "",
          number: data.estabelecimento?.numero || "",
          complement: data.estabelecimento?.complemento || "",
          neighborhood: data.estabelecimento?.bairro || "",
          city: data.estabelecimento?.cidade?.nome || "",
          state: data.estabelecimento?.estado?.sigla || "AL",
          phone: data.estabelecimento?.ddd1 && data.estabelecimento?.telefone1 
            ? `(${data.estabelecimento.ddd1}) ${data.estabelecimento.telefone1}` 
            : "",
          email: data.estabelecimento?.email || ""
        }));
      } catch (err) {
        alert("Fornecedor não encontrado nas bases públicas ou limite de requisições excedido. Preencha manualmente.");
      }
    } finally {
      setCnpjLoading(false);
    }
  }

  // Consulta CEP Pública via ViaCEP
  async function handleCepLookup() {
    const cleanCep = formData.zipCode.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          street: data.logradouro || "",
          neighborhood: data.bairro || "",
          city: data.localidade || "",
          state: data.uf || "AL"
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCepLoading(false);
    }
  }

  // Handler de alteração dos dias de entrega
  const handleDeliveryDayToggle = (day: string) => {
    setFormData(prev => {
      const current = prev.deliveryDays;
      if (current.includes(day)) {
        return { ...prev, deliveryDays: current.filter(d => d !== day) };
      } else {
        return { ...prev, deliveryDays: [...current, day] };
      }
    });
  };

  // Submit de Criação / Edição
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const formattedData = {
      ...formData,
      discountPercent: Number(formData.discountPercent),
      minOrderValue: Number(formData.minOrderValue),
      deliveryDays: formData.deliveryDays.join(","),
      deliveryLeadDays: Number(formData.deliveryLeadDays),
    };

    let result;
    if (editSupplierData) {
      result = await updateSupplier(editSupplierData.id, formattedData);
    } else {
      result = await createSupplier(formattedData);
    }

    if (result.success) {
      setIsModalOpen(false);
      setEditSupplierData(null);
      resetForm();
      loadSuppliers();
    } else {
      alert(result.error || "Erro ao salvar fornecedor.");
    }
  }

  function handleEdit(s: any) {
    setEditSupplierData(s);
    setFormData({
      name: s.name || "",
      tradeName: s.tradeName || "",
      document: s.document || "",
      stateReg: s.stateReg || "",
      municipalReg: s.municipalReg || "",
      taxRegime: s.taxRegime || "Simples Nacional",
      isIcmsContributor: s.isIcmsContributor || false,
      suframa: s.suframa || "",
      defaultPaymentTerm: s.defaultPaymentTerm || "30 dias",
      discountPercent: Number(s.discountPercent || 0),
      email: s.email || "",
      phone: s.phone || "",
      phone2: s.phone2 || "",
      quoteEmail: s.quoteEmail || "",
      contactName: s.contactName || "",
      contactPhone: s.contactPhone || "",
      contactEmail: s.contactEmail || "",
      zipCode: s.zipCode || "",
      street: s.street || "",
      number: s.number || "",
      complement: s.complement || "",
      neighborhood: s.neighborhood || "",
      city: s.city || "",
      state: s.state || "AL",
      country: s.country || "Brasil",
      deliveryDays: s.deliveryDays ? s.deliveryDays.split(",") : [],
      deliveryLeadDays: s.deliveryLeadDays || 0,
      minOrderValue: Number(s.minOrderValue || 0),
      deliveryNotes: s.deliveryNotes || "",
      category: s.category || "Outros",
      segment: s.segment || "Geral",
      systemType: s.systemType || "Outros",
      notes: s.notes || ""
    });
    setFormTab("geral");
    setIsModalOpen(true);
  }

  async function handleInactivate(id: string) {
    if (confirm("Deseja realmente desativar este fornecedor?")) {
      const res = await deleteSupplier(id);
      if (res.success) {
        setSelected(null);
        loadSuppliers();
      } else {
        alert(res.error);
      }
    }
  }

  function resetForm() {
    setFormData({
      name: "",
      tradeName: "",
      document: "",
      stateReg: "",
      municipalReg: "",
      taxRegime: "Simples Nacional",
      isIcmsContributor: false,
      suframa: "",
      defaultPaymentTerm: "30 dias",
      discountPercent: 0,
      email: "",
      phone: "",
      phone2: "",
      quoteEmail: "",
      contactName: "",
      contactPhone: "",
      contactEmail: "",
      zipCode: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "AL",
      country: "Brasil",
      deliveryDays: [],
      deliveryLeadDays: 0,
      minOrderValue: 0,
      deliveryNotes: "",
      category: "Outros",
      segment: "Geral",
      systemType: "Outros",
      notes: ""
    });
  }

  const filtered = suppliers.filter(s =>
    (catFilter === "Todos" || s.category === catFilter) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.tradeName && s.tradeName.toLowerCase().includes(search.toLowerCase())) ||
      (s.document && s.document.includes(search)) ||
      (s.contactName && s.contactName.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <div className="w-full flex flex-col gap-5 select-none pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Fornecedores</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gerencie seu catálogo completo de fornecedores, dados fiscais e logística de entrega.</p>
        </div>
        <button
          onClick={() => { resetForm(); setEditSupplierData(null); setFormTab("geral"); setIsModalOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-500/20 active:scale-95 text-xs"
        >
          <Plus size={16} /> Novo Fornecedor
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Fornecedores", value: suppliers.length, color: "blue" },
          { label: "Ativos", value: suppliers.filter(s => s.status === "ACTIVE").length, color: "emerald" },
          { label: "Inativos", value: suppliers.filter(s => s.status === "INACTIVE").length, color: "amber" },
          { label: "Categorias", value: [...new Set(suppliers.map(s => s.category))].filter(Boolean).length, color: "purple" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5 hover:border-gray-300 transition-all">
            <p className="text-gray-500 text-xs font-extrabold uppercase tracking-wider">{stat.label}</p>
            <p className="text-2xl font-black mt-1 text-gray-900 font-mono">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, fantasia, CNPJ ou contato..."
            className="w-full bg-white border border-gray-200 focus:border-blue-500 text-gray-900 pl-11 pr-4 py-2.5 rounded-xl outline-none transition-all text-xs font-medium placeholder:text-gray-400 shadow-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCatFilter(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${catFilter === cat
                ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900 shadow-xs"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1 min-h-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 sticky top-0 font-bold">
              <tr>
                <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">Fornecedor</th>
                <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">CNPJ</th>
                <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">Contato Principal</th>
                <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">Dias de Entrega</th>
                <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">Categoria</th>
                <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-400 font-medium">Carregando fornecedores...</td>
                </tr>
              ) : filtered.map((s) => (
                <tr key={s.id} className="hover:bg-blue-50/40 transition-colors cursor-pointer group" onClick={() => setSelected(s)}>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-black text-base shrink-0">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 leading-snug">{s.name}</p>
                        {s.tradeName && <p className="text-xs text-gray-500 font-medium">{s.tradeName}</p>}
                        <p className="text-gray-500 text-[11px] font-medium flex items-center gap-1 mt-0.5"><MapPin size={10} />{s.city || "S/C"} - {s.state || "S/E"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 font-mono text-gray-800 text-xs font-semibold">{s.document || "S/D"}</td>
                  <td className="px-6 py-3.5">
                    <p className="text-gray-800 font-bold">{s.contactName || "Geral"}</p>
                    <p className="text-gray-500 text-xs flex items-center gap-1"><Phone size={10}/> {s.phone || s.phone2 || "Sem fone"}</p>
                  </td>
                  <td className="px-6 py-3.5 text-xs font-mono text-gray-600">
                    {s.deliveryDays ? (
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 text-[10px] font-bold">
                        {s.deliveryDays}
                      </span>
                    ) : "Não agendado"}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg text-xs font-semibold">{s.category || "Outros"}</span>
                  </td>
                  <td className="px-6 py-3.5">
                    {s.status === "ACTIVE"
                      ? <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-bold">Ativo</span>
                      : <span className="text-gray-500 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-full text-xs font-bold">Inativo</span>
                    }
                  </td>
                  <td className="px-6 py-3.5">
                    <ChevronRight size={18} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-gray-400">
                    <Truck size={36} className="mx-auto mb-3 text-gray-300" />
                    <p className="font-bold">Nenhum fornecedor cadastrado</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-end" onClick={() => setSelected(null)}>
          <div className="bg-white border-l border-gray-200 w-full max-w-lg h-full p-8 overflow-y-auto space-y-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-black text-3xl">
                  {selected.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900">{selected.name}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{selected.tradeName || "Sem Nome Fantasia"}</p>
                  <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full mt-1.5 ${selected.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-600 border border-gray-200"}`}>
                    {selected.status === "ACTIVE" ? "Ativo" : "Inativo"}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-700 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Informações detalhadas */}
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50/60 space-y-3">
                <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest">Informações Fiscais</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500 block">CNPJ / CPF</span>
                    <span className="text-gray-900 font-mono font-bold">{selected.document || "S/D"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Inscrição Estadual (IE)</span>
                    <span className="text-gray-900 font-bold">{selected.stateReg || "Isento"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Regime Tributário</span>
                    <span className="text-gray-900 font-bold">{selected.taxRegime || "Não informado"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Contribuinte ICMS</span>
                    <span className="text-gray-900 font-bold">{selected.isIcmsContributor ? "Sim" : "Não"}</span>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50/60 space-y-3">
                <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest">Logística & Entrega</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500 block">Dias de Entrega agendados</span>
                    <span className="text-emerald-700 font-bold">{selected.deliveryDays || "Qualquer dia"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Prazo de Entrega (Lead Time)</span>
                    <span className="text-gray-900 font-bold">{selected.deliveryLeadDays} dia(s)</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Pedido Mínimo</span>
                    <span className="text-gray-900 font-bold font-mono">R$ {Number(selected.minOrderValue || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Prazo de Pagamento Padrão</span>
                    <span className="text-gray-900 font-bold">{selected.defaultPaymentTerm || "Não negociado"}</span>
                  </div>
                </div>
                {selected.deliveryNotes && (
                  <div className="text-xs border-t border-gray-200 pt-2 mt-2">
                    <span className="text-gray-500 block mb-0.5">Observações de Logística</span>
                    <p className="text-gray-700 italic">{selected.deliveryNotes}</p>
                  </div>
                )}
              </div>

              <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50/60 space-y-3">
                <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest">Endereço</h4>
                <p className="text-xs text-gray-800 leading-relaxed">
                  {selected.street || "Sem endereço cadastrado"}{selected.number ? `, ${selected.number}` : ""}<br/>
                  {selected.neighborhood ? `${selected.neighborhood} · ` : ""}{selected.city ? `${selected.city} - ${selected.state}` : ""}<br/>
                  {selected.zipCode ? `CEP: ${selected.zipCode}` : ""}
                </p>
              </div>

              <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50/60 space-y-3">
                <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest">Contatos do Fornecedor</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="text-blue-600"/>
                    <span className="text-gray-700">E-mail Principal: {selected.email || "---"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="text-amber-600"/>
                    <span className="text-gray-700">E-mail Cotações: <strong>{selected.quoteEmail || selected.email || "Não informado"}</strong></span>
                  </div>
                  {(selected.contactName || selected.contactPhone) && (
                    <div className="bg-white p-3 rounded-xl border border-gray-200 mt-2 space-y-1.5">
                      <span className="text-blue-600 font-bold block text-[10px] uppercase">Contato Comercial para Cotações</span>
                      <p className="text-gray-900 font-bold">{selected.contactName || "Vendedor / Representante"}</p>
                      <p className="text-gray-600 text-xs font-mono">{selected.contactPhone || selected.phone || "Sem WhatsApp"}</p>
                      
                      {selected.contactPhone && (
                        <a
                          href={`https://wa.me/55${selected.contactPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${selected.contactName || ""}, gostaria de solicitar uma cotação de preços para o ${selected.name}. Pode nos atender?`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs"
                        >
                          💬 Iniciar Cotação no WhatsApp
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-100">
              <a
                href={`/purchases`}
                className="w-full flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2.5 rounded-xl text-xs transition-all border border-indigo-200"
              >
                <FileText size={14} /> Abrir Mapa de Cotações &amp; Pedidos
              </a>

              <div className="flex gap-2">
                <button onClick={() => handleEdit(selected)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md shadow-blue-500/20">
                  Editar Cadastro
                </button>
                <button onClick={() => handleInactivate(selected.id)} className="flex-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold py-2.5 rounded-xl text-xs transition-all">
                  Inativar Fornecedor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New/Edit Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Truck className="text-blue-600" /> 
                {editSupplierData ? "Editar Fornecedor" : "Novo Fornecedor Completo"}
              </h3>
              <button onClick={() => { setIsModalOpen(false); setEditSupplierData(null); }} className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50/50 shrink-0 overflow-x-auto">
              {[
                { key: "geral", label: "Dados Gerais" },
                { key: "fiscal", label: "Dados Fiscais" },
                { key: "endereco", label: "Endereço" },
                { key: "contato", label: "Contatos e Representante" },
                { key: "logistica", label: "Logística e Entrega" }
              ].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFormTab(tab.key as any)}
                  className={`px-4 py-3 text-xs uppercase tracking-wider font-bold border-b-2 transition-all whitespace-nowrap ${
                    formTab === tab.key
                      ? "border-blue-600 text-blue-600 bg-white"
                      : "border-transparent text-gray-700 hover:text-gray-900 hover:bg-gray-100/50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Form Scrollable Area */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                {formTab === "geral" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">CNPJ / CPF</label>
                      <div className="flex gap-2">
                        <input 
                          value={formData.document}
                          onChange={e => setFormData(prev => ({ ...prev, document: e.target.value }))}
                          placeholder="00.000.000/0001-00" 
                          className="flex-1 bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-gray-900 placeholder:text-gray-400 px-4 py-2.5 rounded-xl outline-none text-sm font-mono shadow-2xs" 
                        />
                        <button 
                          type="button" 
                          onClick={handleCnpjLookup}
                          disabled={cnpjLoading}
                          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20 whitespace-nowrap"
                        >
                          {cnpjLoading ? "Consultando..." : "Consultar Receita"}
                        </button>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Razão Social *</label>
                      <input 
                        required 
                        value={formData.name}
                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Distribuidora de Alimentos Nordeste LTDA" 
                        className="w-full bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-gray-900 placeholder:text-gray-400 px-4 py-2.5 rounded-xl outline-none text-sm shadow-2xs font-medium" 
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Nome Fantasia</label>
                      <input 
                        value={formData.tradeName}
                        onChange={e => setFormData(prev => ({ ...prev, tradeName: e.target.value }))}
                        placeholder="Frios Nordeste" 
                        className="w-full bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-gray-900 placeholder:text-gray-400 px-4 py-2.5 rounded-xl outline-none text-sm shadow-2xs font-medium" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Categoria / Ramo</label>
                      <select 
                        value={formData.category}
                        onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-gray-900 px-4 py-2.5 rounded-xl outline-none text-sm shadow-2xs font-semibold"
                      >
                        {["Alimentos","Bebidas","Frios","Limpeza","Higiene","Outros"].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Segmento Atendido</label>
                      <select 
                        value={formData.segment}
                        onChange={e => setFormData(prev => ({ ...prev, segment: e.target.value }))}
                        className="w-full bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-gray-900 px-4 py-2.5 rounded-xl outline-none text-sm font-semibold shadow-2xs"
                      >
                        <option value="Geral">Geral / Multissetorial</option>
                        <option value="Supermercado">Supermercado / Varejo</option>
                        <option value="Padaria">Padaria & Confeitaria</option>
                        <option value="Restaurante">Restaurante / Gastronomia</option>
                        <option value="Distribuidora">Distribuidora & Atacado</option>
                        <option value="Fabrica">Indústria & Fábrica</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Versão do Sistema RP Utilizada</label>
                      <select 
                        value={formData.systemType}
                        onChange={e => setFormData(prev => ({ ...prev, systemType: e.target.value }))}
                        className="w-full bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-gray-900 px-4 py-2.5 rounded-xl outline-none text-sm font-semibold shadow-2xs"
                      >
                        <option value="Outros">Outros Sistemas / N/A</option>
                        <option value="RP Supermercado">RP Supermercado</option>
                        <option value="RP Padaria">RP Padaria</option>
                        <option value="RP Restaurante">RP Restaurante</option>
                        <option value="RP Distribuidora">RP Distribuidora</option>
                        <option value="RP Fabrica">RP Fábrica / Indústria</option>
                        <option value="RP Enterprise">RP Enterprise Multissetorial</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Observações Internas</label>
                      <input 
                        value={formData.notes}
                        onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Fornecedor homologado com desconto extra..." 
                        className="w-full bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-gray-900 placeholder:text-gray-400 px-4 py-2.5 rounded-xl outline-none text-sm shadow-2xs font-medium" 
                      />
                    </div>
                  </div>
                )}

                {formTab === "fiscal" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Inscrição Estadual (IE)</label>
                      <input 
                        value={formData.stateReg}
                        onChange={e => setFormData(prev => ({ ...prev, stateReg: e.target.value }))}
                        placeholder="Ex: 240.123.456" 
                        className="w-full bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-gray-900 placeholder:text-gray-400 px-4 py-2.5 rounded-xl outline-none text-sm shadow-2xs font-medium" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Inscrição Municipal (IM)</label>
                      <input 
                        value={formData.municipalReg}
                        onChange={e => setFormData(prev => ({ ...prev, municipalReg: e.target.value }))}
                        placeholder="Ex: 902.123" 
                        className="w-full bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-gray-900 placeholder:text-gray-400 px-4 py-2.5 rounded-xl outline-none text-sm shadow-2xs font-medium" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Regime Tributário</label>
                      <select 
                        value={formData.taxRegime}
                        onChange={e => setFormData(prev => ({ ...prev, taxRegime: e.target.value }))}
                        className="w-full bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-gray-900 px-4 py-2.5 rounded-xl outline-none text-sm font-semibold shadow-2xs"
                      >
                        {["Simples Nacional","Lucro Presumido","Lucro Real","MEI"].map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Código SUFRAMA (Suframa)</label>
                      <input 
                        value={formData.suframa}
                        onChange={e => setFormData(prev => ({ ...prev, suframa: e.target.value }))}
                        placeholder="Zona Franca de Manaus..." 
                        className="w-full bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-gray-900 placeholder:text-gray-400 px-4 py-2.5 rounded-xl outline-none text-sm font-mono shadow-2xs" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Desconto Negociado Padrão (%)</label>
                      <input 
                        type="number"
                        step="0.01"
                        value={formData.discountPercent}
                        onChange={e => setFormData(prev => ({ ...prev, discountPercent: Number(e.target.value) }))}
                        placeholder="0.00" 
                        className="w-full bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-gray-900 placeholder:text-gray-400 px-4 py-2.5 rounded-xl outline-none text-sm font-mono shadow-2xs" 
                      />
                    </div>
                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={formData.isIcmsContributor}
                          onChange={e => setFormData(prev => ({ ...prev, isIcmsContributor: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                        />
                        <span className="text-xs text-gray-700 font-bold uppercase tracking-wider">Contribuinte de ICMS</span>
                      </label>
                    </div>
                  </div>
                )}

                {formTab === "endereco" && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-3">
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">CEP</label>
                      <div className="flex gap-2">
                        <input 
                          value={formData.zipCode}
                          onChange={e => setFormData(prev => ({ ...prev, zipCode: e.target.value }))}
                          onBlur={handleCepLookup}
                          placeholder="57000-000" 
                          className="flex-1 bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-gray-900 placeholder:text-gray-400 px-4 py-2.5 rounded-xl outline-none text-sm font-mono shadow-2xs" 
                        />
                        <button 
                          type="button" 
                          onClick={handleCepLookup}
                          disabled={cepLoading}
                          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 whitespace-nowrap"
                        >
                          {cepLoading ? "Buscando..." : "Buscar CEP"}
                        </button>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Logradouro / Rua</label>
                      <input 
                        value={formData.street}
                        onChange={e => setFormData(prev => ({ ...prev, street: e.target.value }))}
                        placeholder="Rua/Avenida..." 
                        className="w-full bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-gray-900 placeholder:text-gray-400 px-4 py-2.5 rounded-xl outline-none text-sm shadow-2xs font-medium" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Número</label>
                      <input 
                        value={formData.number}
                        onChange={e => setFormData(prev => ({ ...prev, number: e.target.value }))}
                        placeholder="123" 
                        className="w-full bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-gray-900 placeholder:text-gray-400 px-4 py-2.5 rounded-xl outline-none text-sm shadow-2xs font-medium" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Bairro</label>
                      <input 
                        value={formData.neighborhood}
                        onChange={e => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                        placeholder="Centro" 
                        className="w-full bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-gray-900 placeholder:text-gray-400 px-4 py-2.5 rounded-xl outline-none text-sm shadow-2xs font-medium" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Cidade</label>
                      <input 
                        value={formData.city}
                        onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="Maceió" 
                        className="w-full bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-gray-900 placeholder:text-gray-400 px-4 py-2.5 rounded-xl outline-none text-sm shadow-2xs font-medium" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Estado (UF)</label>
                      <select 
                        value={formData.state}
                        onChange={e => setFormData(prev => ({ ...prev, state: e.target.value }))}
                        className="w-full bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-gray-900 px-4 py-2.5 rounded-xl outline-none text-sm shadow-2xs font-semibold"
                      >
                        {["AL","SE","PE","BA","CE","RN","PB","PI","MA","PA","AM","AC","RO","RR","AP","TO","GO","MT","MS","MG","ES","RJ","SP","PR","SC","RS","DF"].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Complemento</label>
                      <input 
                        value={formData.complement}
                        onChange={e => setFormData(prev => ({ ...prev, complement: e.target.value }))}
                        placeholder="Sala 101, Bloco A" 
                        className="w-full bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-gray-900 placeholder:text-gray-400 px-4 py-2.5 rounded-xl outline-none text-sm shadow-2xs font-medium" 
                      />
                    </div>
                  </div>
                )}

                {formTab === "contato" && (
                  <div className="space-y-5">
                    {/* Contato Comercial Geral */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Contato Geral da Empresa</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Telefone Comercial *</label>
                          <input 
                            value={formData.phone}
                            onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="(82) 3333-0000" 
                            className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white text-gray-900 px-4 py-2.5 rounded-xl outline-none text-sm" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Telefone 2 / Fixo</label>
                          <input 
                            value={formData.phone2}
                            onChange={e => setFormData(prev => ({ ...prev, phone2: e.target.value }))}
                            placeholder="(82) 3333-0001" 
                            className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white text-gray-900 px-4 py-2.5 rounded-xl outline-none text-sm" 
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">E-mail Comercial Principal</label>
                          <input 
                            value={formData.email}
                            onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="comercial@fornecedor.com" 
                            className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white text-gray-900 px-4 py-2.5 rounded-xl outline-none text-sm" 
                          />
                        </div>
                      </div>
                    </div>

                    {/* 🎯 CONTATO ESPECÍFICO PARA ENVIO DE COTAÇÕES */}
                    <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-4">
                      <div className="flex items-center gap-2">
                        <FileText className="text-blue-600" size={18} />
                        <div>
                          <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider">
                            Contato para Envio de Cotações de Preço
                          </h4>
                          <p className="text-[11px] text-blue-700">
                            Dados do vendedor/representante utilizados para disparar cotações por WhatsApp e E-mail
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-blue-900 mb-1 uppercase tracking-wider">
                            Nome do Vendedor / Representante de Cotação
                          </label>
                          <input 
                            value={formData.contactName}
                            onChange={e => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                            placeholder="Ex: Carlos Oliveira (Representante)" 
                            className="w-full bg-white border border-blue-200 focus:border-blue-500 text-gray-900 px-4 py-2.5 rounded-xl outline-none text-sm font-medium" 
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-blue-900 mb-1 uppercase tracking-wider">
                            WhatsApp / Celular para Cotação *
                          </label>
                          <input 
                            value={formData.contactPhone}
                            onChange={e => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                            placeholder="(82) 99999-0000" 
                            className="w-full bg-white border border-blue-200 focus:border-blue-500 text-gray-900 px-4 py-2.5 rounded-xl outline-none text-sm font-medium font-mono" 
                          />
                          <span className="text-[10px] text-blue-600 mt-1 block">Recebe a lista de produtos da cotação direto no WhatsApp.</span>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-blue-900 mb-1 uppercase tracking-wider">
                            E-mail Exclusivo de Cotações
                          </label>
                          <input 
                            value={formData.quoteEmail}
                            onChange={e => setFormData(prev => ({ ...prev, quoteEmail: e.target.value }))}
                            placeholder="cotacao@fornecedor.com" 
                            className="w-full bg-white border border-blue-200 focus:border-blue-500 text-gray-900 px-4 py-2.5 rounded-xl outline-none text-sm font-medium" 
                          />
                          <span className="text-[10px] text-blue-600 mt-1 block">Caso preenchido, o mapa de cotação é enviado para cá.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {formTab === "logistica" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Dias da Semana de Entrega Agendados</label>
                      <div className="flex gap-2 flex-wrap">
                        {["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"].map(day => {
                          const isSelected = formData.deliveryDays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => handleDeliveryDayToggle(day)}
                              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                                isSelected 
                                  ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Lead Time / Prazo de Entrega (dias)</label>
                      <input 
                        type="number"
                        value={formData.deliveryLeadDays}
                        onChange={e => setFormData(prev => ({ ...prev, deliveryLeadDays: Number(e.target.value) }))}
                        placeholder="Ex: 2 dias" 
                        className="w-full bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-gray-900 placeholder:text-gray-400 px-4 py-2.5 rounded-xl outline-none text-sm font-mono shadow-2xs" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Valor de Pedido Mínimo (R$)</label>
                      <input 
                        type="number"
                        step="0.01"
                        value={formData.minOrderValue}
                        onChange={e => setFormData(prev => ({ ...prev, minOrderValue: Number(e.target.value) }))}
                        placeholder="R$ 500,00" 
                        className="w-full bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-gray-900 placeholder:text-gray-400 px-4 py-2.5 rounded-xl outline-none text-sm font-mono shadow-2xs" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Prazo de Pagamento Padrão</label>
                      <select 
                        value={formData.defaultPaymentTerm}
                        onChange={e => setFormData(prev => ({ ...prev, defaultPaymentTerm: e.target.value }))}
                        className="w-full bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-gray-900 px-4 py-2.5 rounded-xl outline-none text-sm font-semibold shadow-2xs"
                      >
                        {["À Vista", "7 dias", "14 dias", "28 dias", "30 dias", "30/60 dias", "30/60/90 dias", "Outro"].map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Observações / Janela de Recebimento</label>
                      <textarea 
                        value={formData.deliveryNotes}
                        onChange={e => setFormData(prev => ({ ...prev, deliveryNotes: e.target.value }))}
                        placeholder="Ex: Recebe apenas no período da manhã até as 11h. Necessita agendar descarga de frios." 
                        rows={2}
                        className="w-full bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-gray-900 placeholder:text-gray-400 px-4 py-2.5 rounded-xl outline-none text-sm resize-none shadow-2xs font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100 flex gap-3 shrink-0">
                <button 
                  type="button" 
                  onClick={() => { setIsModalOpen(false); setEditSupplierData(null); }} 
                  className="flex-1 bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 font-bold py-2.5 rounded-xl text-xs transition-colors shadow-2xs"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all text-xs flex items-center justify-center gap-2"
                >
                  <Save size={16} /> 
                  {editSupplierData ? "Salvar Alterações" : "Salvar Fornecedor Completo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
