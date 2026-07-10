"use client";

import { useState, useEffect } from "react";
import { updateTenantTheme, getTenantTheme } from "@/actions/theme";
import { Save, Image as ImageIcon, Palette, Layout, Globe } from "lucide-react";

export default function MasterThemePage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    logoPrincipal: "",
    logoPdv: "",
    logoImpressao: "",
    favicon: "",
    backgroundLogin: "",
    backgroundSistema: "",
    corPrimaria: "",
    corSecundaria: "",
    corMenu: "",
    corBotao: "",
    tema: "auto",
    customDomain: ""
  });

  useEffect(() => {
    getTenantTheme().then((res) => {
      if (res.theme) {
        const themeData = res.theme;
        const cleanedData: any = {};
        for (const key in themeData) {
          if (themeData[key as keyof typeof themeData] !== null) {
            cleanedData[key] = themeData[key as keyof typeof themeData];
          }
        }
        setFormData((prev) => ({ ...prev, ...cleanedData }));
      }
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await updateTenantTheme(formData);
    setLoading(false);
    alert("Tema atualizado com sucesso!");
    window.location.reload();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Painel Master Cybertech</h1>
        <p className="text-sm text-slate-400 mt-1">
          Configuração do Módulo White Label para o Cliente (Tenant)
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Identidade Visual */}
        <div className="bg-[#111528] rounded-xl border border-indigo-500/[0.08] p-6 shadow-xl shadow-black/20">
          <div className="flex items-center gap-2 mb-6">
            <ImageIcon className="text-indigo-400" size={20} />
            <h2 className="text-lg font-semibold text-white">Logos e Imagens</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Logo Principal (URL)</label>
              <input type="text" name="logoPrincipal" value={formData.logoPrincipal || ""} onChange={handleChange} className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50" placeholder="https://..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Logo PDV (URL)</label>
              <input type="text" name="logoPdv" value={formData.logoPdv || ""} onChange={handleChange} className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="https://..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Logo Impressão (URL)</label>
              <input type="text" name="logoImpressao" value={formData.logoImpressao || ""} onChange={handleChange} className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="https://..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Favicon (URL)</label>
              <input type="text" name="favicon" value={formData.favicon || ""} onChange={handleChange} className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="https://..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Imagem de Fundo - Login (URL)</label>
              <input type="text" name="backgroundLogin" value={formData.backgroundLogin || ""} onChange={handleChange} className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="https://..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Imagem de Fundo - Sistema (URL)</label>
              <input type="text" name="backgroundSistema" value={formData.backgroundSistema || ""} onChange={handleChange} className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="https://..." />
            </div>
          </div>
        </div>

        {/* Cores */}
        <div className="bg-[#111528] rounded-xl border border-indigo-500/[0.08] p-6 shadow-xl shadow-black/20">
          <div className="flex items-center gap-2 mb-6">
            <Palette className="text-indigo-400" size={20} />
            <h2 className="text-lg font-semibold text-white">Cores e Tema</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Cor Primária (HEX)</label>
              <div className="flex gap-2">
                <input type="color" name="corPrimaria" value={formData.corPrimaria || "#6366f1"} onChange={handleChange} className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0" />
                <input type="text" name="corPrimaria" value={formData.corPrimaria || ""} onChange={handleChange} className="flex-1 bg-[#0c0f1a] border border-indigo-500/20 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="#6366f1" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Cor Secundária (HEX)</label>
              <div className="flex gap-2">
                <input type="color" name="corSecundaria" value={formData.corSecundaria || "#818cf8"} onChange={handleChange} className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0" />
                <input type="text" name="corSecundaria" value={formData.corSecundaria || ""} onChange={handleChange} className="flex-1 bg-[#0c0f1a] border border-indigo-500/20 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="#818cf8" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Cor do Menu (HEX)</label>
              <div className="flex gap-2">
                <input type="color" name="corMenu" value={formData.corMenu || "#0a0e1a"} onChange={handleChange} className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0" />
                <input type="text" name="corMenu" value={formData.corMenu || ""} onChange={handleChange} className="flex-1 bg-[#0c0f1a] border border-indigo-500/20 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="#0a0e1a" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Cor dos Botões (HEX)</label>
              <div className="flex gap-2">
                <input type="color" name="corBotao" value={formData.corBotao || "#6366f1"} onChange={handleChange} className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0" />
                <input type="text" name="corBotao" value={formData.corBotao || ""} onChange={handleChange} className="flex-1 bg-[#0c0f1a] border border-indigo-500/20 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="#6366f1" />
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Tema Base</label>
            <select name="tema" value={formData.tema} onChange={handleChange} className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
              <option value="auto">Automático (SO)</option>
              <option value="light">Claro</option>
              <option value="dark">Escuro</option>
            </select>
          </div>
        </div>

        {/* Domínio */}
        <div className="bg-[#111528] rounded-xl border border-indigo-500/[0.08] p-6 shadow-xl shadow-black/20">
          <div className="flex items-center gap-2 mb-6">
            <Globe className="text-indigo-400" size={20} />
            <h2 className="text-lg font-semibold text-white">Domínio Customizado (Premium)</h2>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Domínio White Label</label>
            <input type="text" name="customDomain" value={formData.customDomain || ""} onChange={handleChange} className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="ex: erp.minhaempresa.com.br" />
            <p className="text-[10px] text-slate-500 mt-2">Irá mascarar completamente o Cybertech ERP para os usuários deste cliente.</p>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-50">
            <Save size={16} />
            {loading ? "Salvando..." : "Salvar Configurações"}
          </button>
        </div>

      </form>
    </div>
  );
}
