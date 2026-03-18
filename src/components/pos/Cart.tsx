"use client";

import { useCartStore } from "@/store/useCartStore";
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { CheckoutModal } from "./CheckoutModal";

export const Cart = ({ onSuccess }: { onSuccess?: () => void }) => {
  const { items, removeItem, updateQuantity, getTotal, clearCart, getItemCount } = useCartStore();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const itemCount = getItemCount();

  return (
    <div className="flex flex-col h-full bg-white/50 backdrop-blur-xl border-l border-slate-100 p-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="relative">
          <ShoppingCart className="text-slate-900" size={24} />
          {itemCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-sky-600 text-white text-[10px] font-black h-5 w-5 flex items-center justify-center rounded-full shadow-lg border-2 border-white animate-bounce">
              {itemCount}
            </span>
          )}
        </div>
        <h2 className="text-xl font-black tracking-tight text-slate-900">Carrito</h2>
      </div>

      {/* Items Scroll Area */}
      <div className="flex-grow overflow-y-auto space-y-4 pr-1 custom-scrollbar">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-40">
            <div className="bg-slate-100 p-6 rounded-full">
              <ShoppingCart size={40} className="text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-500">Tu carrito está vacío</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 group p-2 hover:bg-white rounded-2xl transition-all duration-300">
              <div className="h-14 w-14 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-slate-100">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-black text-slate-300 uppercase">POS</span>
                )}
              </div>
              <div className="flex-grow">
                <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{item.name}</h4>
                <p className="text-xs font-black text-sky-600">${(item.price * item.quantity).toLocaleString("es-CO")}</p>
                
                {/* Quantity Controls */}
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex items-center bg-slate-50 rounded-lg p-1 border border-slate-100">
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="p-1 hover:bg-white rounded-md transition-colors text-slate-400 hover:text-slate-900"
                    >
                      <Minus size={12} strokeWidth={3} />
                    </button>
                    <span className="w-6 text-center text-[11px] font-black text-slate-900">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-1 hover:bg-white rounded-md transition-colors text-slate-400 hover:text-slate-900"
                    >
                      <Plus size={12} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => removeItem(item.id)}
                className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-300"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer / Summary */}
      <div className="mt-6 pt-6 border-t border-slate-100 space-y-6">
        <div className="flex justify-between items-center px-1">
          <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total</span>
          <span className="text-2xl font-black text-slate-900 tracking-tighter">
            ${getTotal().toLocaleString("es-CO")}
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => setIsCheckoutOpen(true)}
            disabled={items.length === 0}
            className={cn(
              "w-full flex items-center justify-center gap-3 py-4 bg-sky-600 hover:bg-sky-700 text-white rounded-[2rem] font-bold text-sm shadow-xl shadow-sky-600/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
              items.length === 0 && "opacity-50 cursor-not-allowed scale-100 shadow-none pointer-events-none"
            )}
          >
            Pagar Ahora
            <ArrowRight size={18} strokeWidth={3} />
          </button>
          
          <button
            onClick={clearCart}
            disabled={items.length === 0}
            className="w-full py-3 text-slate-400 hover:text-red-500 text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-0"
          >
            Vaciar Carrito
          </button>
        </div>
      </div>

      <CheckoutModal 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)} 
        onSuccess={onSuccess}
      />
    </div>
  );
};
