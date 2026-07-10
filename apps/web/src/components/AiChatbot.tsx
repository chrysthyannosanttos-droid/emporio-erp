"use client";

import { useState } from "react";
import { MessageSquare, X, Send, Bot } from "lucide-react";

export function AiChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user'|'bot', text: string}[]>([
    { role: 'bot', text: 'Olá! Sou seu Assistente do ERP. Pode me perguntar sobre vendas, produtos ou faturamento!' }
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: input }]);
    setInput("");
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'bot',
        text: 'Analisando seus dados... Tivemos R$ 1.250,00 em vendas hoje e 3 itens próximos do vencimento. Recomendo uma promoção no CRM.'
      }]);
    }, 1000);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-5 right-5 w-12 h-12 bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center text-white transition-all hover:scale-105 z-50 ${isOpen ? 'scale-0' : 'scale-100'}`}
      >
        <MessageSquare size={20} />
        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 border-2 border-[#0c0f1a] rounded-full" />
      </button>

      <div className={`fixed bottom-5 right-5 w-80 bg-[#111528] border border-indigo-500/15 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden transition-all duration-200 origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`} style={{ maxHeight: "420px" }}>
        <div className="bg-indigo-600 p-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-white">
            <Bot size={17} />
            <span className="font-semibold text-sm">Assistente IA</span>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-indigo-200 hover:text-white transition-colors">
            <X size={17} />
          </button>
        </div>

        <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-[#0c0f1a]/50">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-2.5 rounded-xl text-xs ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-[#111528] text-slate-300 border border-indigo-500/10 rounded-bl-sm'}`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        <div className="p-2.5 bg-[#111528] border-t border-indigo-500/[0.08] flex items-center gap-2 shrink-0">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Pergunte ao ERP..."
            className="flex-1 bg-[#0c0f1a] border border-indigo-500/15 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500"
          />
          <button onClick={handleSend} className="w-8 h-8 bg-indigo-600 hover:bg-indigo-500 rounded-lg flex items-center justify-center text-white transition-colors shrink-0">
            <Send size={13} />
          </button>
        </div>
      </div>
    </>
  );
}
