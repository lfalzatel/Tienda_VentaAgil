"use client";

import { useCartStore } from "@/store/useCartStore";
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ClientCheckoutModal } from "./ClientCheckoutModal";

export const ClientCart = ({ onSuccess }: { onSuccess?: () => void }) => {
  const { tabs, activeTabId, removeItem, updateQuantity, getTotal, clearCart } = useCartStore();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  
  const activeTab = tabs.find(t => t.id === activeTabId);
  const items = activeTab?.items || [];
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="flex flex-col h-full bg-white/50 backdrop-blur-xl border-l border-slate-100 p-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="relative">
          <div className="bg-sky-600/10 p-3 rounded-2xl">
            <ShoppingCart className="text-sky-600" size={24} />
          </div>
          {itemCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-slate-900 text-white text-[10px] font-black h-6 w-6 flex items-center justify-center rounded-full shadow-lg border-4 border-white animate-bounce">
              {itemCount}
            </span>
          )}
        </div>
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-900 leading-none">Mi Carrito</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Tu selección</p>
        </div>
      </div>

      {/* Items Scroll Area */}
      <div className="flex-grow overflow-y-auto space-y-4 pr-1 custom-scrollbar">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-40">
            <div className="bg-slate-100 p-8 rounded-[2.5rem]">
              <ShoppingCart size={48} className="text-slate-300" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Carrito Vacío</p>
              <p className="text-xs font-medium text-slate-400">Añade productos para empezar</p>
            </div>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 group p-3 hover:bg-white rounded-3xl transition-all duration-300 border border-transparent hover:border-slate-100">
              <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 border border-slate-100 group-hover:shadow-md transition-all">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-black text-slate-300 uppercase">TIENDA</span>
                )}
              </div>
              <div className="flex-grow min-w-0">
                <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{item.name}</h4>
                <p className="text-xs font-black text-sky-600 mt-0.5">${((item.price ?? 0) * item.quantity).toLocaleString("es-CO")}</p>
                
                {/* Quantity Controls */}
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100">
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-slate-900 font-bold"
                    >
                      <Minus size={14} strokeWidth={3} />
                    </button>
                    <span className="w-8 text-center text-xs font-black text-slate-900">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-slate-900 font-bold"
                    >
                      <Plus size={14} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => removeItem(item.id)}
                className="p-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-50 rounded-2xl"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer / Summary */}
      <div className="mt-6 pt-6 border-t border-slate-100 space-y-6">
        <div className="flex justify-between items-end px-2">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Estimado</span>
          </div>
          <span className="text-3xl font-black text-slate-900 tracking-tighter leading-none">
            ${(getTotal() ?? 0).toLocaleString("es-CO")}
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => setIsCheckoutOpen(true)}
            disabled={items.length === 0}
            className={cn(
              "w-full flex items-center justify-center gap-3 py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-[2rem] font-black text-sm shadow-2xl shadow-slate-900/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
              items.length === 0 && "opacity-50 cursor-not-allowed scale-100 shadow-none pointer-events-none"
            )}
          >
            Hacer Pedido
            <ArrowRight size={20} strokeWidth={3} />
          </button>
          
          <button
            onClick={clearCart}
            disabled={items.length === 0}
            className="w-full py-4 text-slate-400 hover:text-red-500 text-[10px] font-black uppercase tracking-[0.2em] transition-colors disabled:opacity-30"
          >
            Vaciar Lista
          </button>
        </div>
      </div>

      <ClientCheckoutModal 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)} 
        onSuccess={onSuccess}
      />
    </div>
  );
};
