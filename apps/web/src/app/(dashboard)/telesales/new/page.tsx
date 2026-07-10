"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Search, User, Package, Phone, ChevronDown } from "lucide-react";
import Link from "next/link";
import { createOrder } from "@/actions/order";
import { getCustomers } from "@/actions/customer";
import { getProducts } from "@/actions/product";
import { getSellers } from "@/actions/seller";

type Product = { id: string; name: string; price: number; cost: number; barcode: string | null; stock: number };
type Customer = { id: string; name: string; document: string | null; phone: string | null };
type Seller = { id: string; name: string; email: string | null };
type OrderItem = { productId: string; name: string; quantity: number; unitPrice: number; discount: number; cost: number };

export default function NewOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);

  useEffect(() => {
    Promise.all([getProducts(), getCustomers(), getSellers()]).then(([p, c, s]) => {
      setProducts((p.products ?? []).map((x: any) => ({ ...x, price: Number(x.price), cost: Number(x.cost ?? 0) })));
      setCustomers(c.customers ?? []);
      setSellers(s.sellers ?? []);
    });
  }, []);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.barcode && p.barcode.includes(productSearch))
  );

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  function addItem(product: Product) {
    const existing = items.find(i => i.productId === product.id);
    if (existing) {
      setItems(prev => prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems(prev => [...prev, {
        productId: product.id,
        name: product.name,
        quantity: 1,
        unitPrice: product.price,
        discount: 0,
        cost: product.cost,
      }]);
    }
    setShowProductSearch(false);
    setProductSearch("");
  }

  function removeItem(productId: string) {
    setItems(prev => prev.filter(i => i.productId !== productId));
  }

  function updateItem(productId: string, field: keyof OrderItem, value: number) {
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, [field]: value } : i));
  }

  const subtotal = items.reduce((a, i) => a + i.quantity * i.unitPrice, 0);
  const discountTotal = items.reduce((a, i) => a + i.discount, 0);
  const total = subtotal - discountTotal;
  const cost = items.reduce((a, i) => a + i.cost * i.quantity, 0);
  const margin = total > 0 ? ((total - cost) / total) * 100 : 0;

  async function handleSubmit(status: "DRAFT" | "CONFIRMED") {
    if (items.length === 0) return setError("Adicione pelo menos um produto");
    setLoading(true);
    setError("");

    const result = await createOrder({
      customerId: selectedCustomer?.id,
      sellerId: selectedSeller?.id,
      notes,
      items,
    });

    if ("error" in result && result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/telesales");
    }
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/telesales" className="p-2 bg-[#161b33] border border-indigo-500/15 rounded-xl hover:bg-[#161b33] transition-colors">
          <ArrowLeft size={20} className="text-slate-300" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Novo Pedido</h1>
          <p className="text-slate-400 text-sm">Televendas — tire um pedido completo</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Items */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Product Search */}
          <div className="bg-[#111528] rounded-2xl border border-indigo-500/[0.08] p-6">
            <h2 className="text-white font-bold mb-4 flex items-center gap-2"><Package size={20} className="text-indigo-400" /> Produtos</h2>
            
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                value={productSearch}
                onChange={e => { setProductSearch(e.target.value); setShowProductSearch(true); }}
                onFocus={() => setShowProductSearch(true)}
                className="w-full pl-11 pr-4 py-3 bg-[#161b33] border border-indigo-500/15 text-slate-100 rounded-xl outline-none focus:border-indigo-500 placeholder:text-slate-500"
                placeholder="Buscar produto por nome ou código..."
              />
              {showProductSearch && productSearch && (
                <div className="absolute top-full left-0 right-0 bg-[#161b33] border border-indigo-500/15 rounded-xl mt-1 z-30 max-h-60 overflow-y-auto shadow-2xl">
                  {filteredProducts.length === 0 ? (
                    <div className="p-4 text-slate-500 text-sm text-center">Nenhum produto encontrado</div>
                  ) : filteredProducts.slice(0, 8).map(p => (
                    <button
                      key={p.id}
                      onClick={() => addItem(p)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#161b33] transition-colors text-left"
                    >
                      <div>
                        <div className="text-white font-medium text-sm">{p.name}</div>
                        <div className="text-slate-400 text-xs">{p.barcode || "Sem código"} · Estoque: {p.stock}</div>
                      </div>
                      <div className="text-indigo-400 font-bold text-sm">R$ {p.price.toFixed(2).replace('.', ',')}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Items List */}
            {items.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <Package size={36} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Nenhum produto adicionado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.productId} className="flex items-center gap-3 bg-[#161b33] rounded-xl p-3 border border-indigo-500/15">
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium text-sm truncate">{item.name}</div>
                      <div className="text-slate-400 text-xs">R$ {item.unitPrice.toFixed(2).replace('.', ',')}/un</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={e => updateItem(item.productId, "quantity", parseFloat(e.target.value) || 1)}
                        className="w-16 text-center bg-[#111528] border border-slate-600 text-white rounded-lg py-1.5 px-2 text-sm outline-none focus:border-indigo-500"
                      />
                      <span className="text-slate-400 text-xs">×</span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.unitPrice}
                        onChange={e => updateItem(item.productId, "unitPrice", parseFloat(e.target.value) || 0)}
                        className="w-24 text-center bg-[#111528] border border-slate-600 text-white rounded-lg py-1.5 px-2 text-sm outline-none focus:border-indigo-500"
                      />
                      <span className="text-slate-500 text-xs">Desc:</span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.discount}
                        onChange={e => updateItem(item.productId, "discount", parseFloat(e.target.value) || 0)}
                        className="w-20 text-center bg-[#111528] border border-slate-600 text-amber-400 rounded-lg py-1.5 px-2 text-sm outline-none focus:border-amber-500"
                      />
                      <div className="text-white font-bold text-sm w-24 text-right">
                        R$ {((item.quantity * item.unitPrice) - item.discount).toFixed(2).replace('.', ',')}
                      </div>
                      <button onClick={() => removeItem(item.productId)} className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right — Customer, Seller, Totals */}
        <div className="space-y-5">
          
          {/* Seller Selector */}
          <div className="bg-[#111528] rounded-2xl border border-indigo-500/[0.08] p-6">
            <h2 className="text-white font-bold mb-4 flex items-center gap-2"><User size={18} className="text-indigo-400" /> Vendedor</h2>
            <div className="space-y-2">
              {sellers.length === 0 ? (
                <div className="text-slate-500 text-sm text-center py-4">
                  <p>Nenhum vendedor cadastrado.</p>
                  <Link href="/telesales/sellers/new" className="text-indigo-400 text-xs mt-1 block hover:underline">+ Cadastrar vendedor</Link>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {sellers.map(s => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedSeller(selectedSeller?.id === s.id ? null : s)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                          selectedSeller?.id === s.id
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                            : "bg-[#161b33] text-slate-300 hover:bg-[#161b33] border border-indigo-500/15"
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-black">
                          {s.name.charAt(0)}
                        </div>
                        {s.name}
                      </button>
                    ))}
                  </div>
                  <Link href="/telesales/sellers/new" className="text-indigo-400 text-xs block mt-2 hover:underline">+ Novo vendedor</Link>
                </>
              )}
            </div>
          </div>

          {/* Customer Selector */}
          <div className="bg-[#111528] rounded-2xl border border-indigo-500/[0.08] p-6">
            <h2 className="text-white font-bold mb-4 flex items-center gap-2"><Phone size={18} className="text-indigo-400" /> Cliente</h2>
            {selectedCustomer ? (
              <div className="flex items-center justify-between bg-[#161b33] rounded-xl p-3 border border-indigo-500/30">
                <div>
                  <div className="text-white font-bold text-sm">{selectedCustomer.name}</div>
                  <div className="text-slate-400 text-xs">{selectedCustomer.phone || selectedCustomer.document || "—"}</div>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="text-red-400 text-xs hover:underline">Remover</button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  value={customerSearch}
                  onChange={e => { setCustomerSearch(e.target.value); setShowCustomerSearch(true); }}
                  onFocus={() => setShowCustomerSearch(true)}
                  placeholder="Buscar cliente..."
                  className="w-full pl-9 pr-4 py-2.5 bg-[#161b33] border border-indigo-500/15 text-slate-100 rounded-xl outline-none focus:border-indigo-500 text-sm placeholder:text-slate-500"
                />
                {showCustomerSearch && customerSearch && (
                  <div className="absolute top-full left-0 right-0 bg-[#161b33] border border-indigo-500/15 rounded-xl mt-1 z-30 max-h-48 overflow-y-auto shadow-2xl">
                    {filteredCustomers.slice(0, 5).map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedCustomer(c); setShowCustomerSearch(false); setCustomerSearch(""); }}
                        className="w-full px-4 py-2.5 hover:bg-[#161b33] text-left text-sm"
                      >
                        <div className="text-white font-medium">{c.name}</div>
                        <div className="text-slate-400 text-xs">{c.phone || c.document || "—"}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <Link href="/customers/new" className="text-indigo-400 text-xs mt-2 block hover:underline">+ Novo cliente</Link>
          </div>

          {/* Notes */}
          <div className="bg-[#111528] rounded-2xl border border-indigo-500/[0.08] p-6">
            <h2 className="text-white font-bold mb-3 text-sm">Observações</h2>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Ex: Entregar pela manhã..."
              className="w-full bg-[#161b33] border border-indigo-500/15 text-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 resize-none placeholder:text-slate-500"
            />
          </div>

          {/* Totals */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-indigo-500/15 p-6">
            <div className="space-y-3 mb-5">
              <div className="flex justify-between text-slate-400 text-sm">
                <span>Subtotal</span>
                <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between text-amber-400 text-sm">
                <span>Descontos</span>
                <span>- R$ {discountTotal.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="border-t border-indigo-500/15 pt-3 flex justify-between text-white font-black text-xl">
                <span>Total</span>
                <span>R$ {total.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Margem estimada</span>
                <span className={`font-bold ${margin >= 20 ? "text-emerald-400" : margin >= 10 ? "text-amber-400" : "text-red-400"}`}>
                  {margin.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleSubmit("CONFIRMED")}
                disabled={loading || items.length === 0}
                className="w-full py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-40"
              >
                {loading ? "Salvando..." : "✅ Confirmar Pedido"}
              </button>
              <button
                onClick={() => handleSubmit("DRAFT")}
                disabled={loading || items.length === 0}
                className="w-full py-2.5 rounded-xl font-bold text-slate-300 bg-[#161b33] hover:bg-[#161b33] border border-indigo-500/15 transition-colors disabled:opacity-40"
              >
                💾 Salvar Rascunho
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
