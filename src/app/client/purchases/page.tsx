"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { ClientProductGrid } from "@/components/client/ClientProductGrid";
import { ClientCart } from "@/components/client/ClientCart";
import { ShoppingCart, ShoppingBag, X } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { cn } from "@/lib/utils";

export default function ClientPurchasesPage() {
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const { getItemCount } = useCartStore();

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] overflow-hidden">
      <Header />
      
      <main className="flex-grow flex overflow-y-auto overflow-x-hidden relative pb-28">
        {/* Left Side: Product Catalog */}
        <div className="flex-grow min-w-0 p-4 sm:p-8 flex flex-col overflow-x-hidden">
          <div className="w-full max-w-7xl mx-auto flex flex-col">
            <header className="mb-8 shrink-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-sky-600 p-2 rounded-xl shadow-lg shadow-sky-600/20">
                  <ShoppingBag className="text-white" size={24} />
                </div>
                <h1 className="text-4xl font-black tracking-tighter text-slate-900">
                  Hacer Pedido
                </h1>
              </div>
              <p className="text-slate-500 font-bold text-sm ml-12">
                Explora nuestro catálogo y añade productos a tu lista
              </p>
            </header>
            
            <div className="w-full min-w-0">
              <ClientProductGrid />
            </div>
          </div>
        </div>

        {/* Right Side: Cart Panel (Desktop) */}
        <aside className="hidden lg:block w-[400px] xl:w-[450px] flex-shrink-0">
          <ClientCart />
        </aside>

        {/* Mobile Cart Overlay */}
        {isMobileCartOpen && (
          <div className="fixed inset-0 z-[100] lg:hidden flex flex-col bg-white animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b flex justify-between items-center bg-white">
              <h2 className="text-xl font-black tracking-tight text-slate-900">Mi Lista de Compra</h2>
              <button 
                onClick={() => setIsMobileCartOpen(false)}
                className="p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all"
              >
                <X size={28} />
              </button>
            </div>
            <div className="flex-grow overflow-hidden">
              <ClientCart onSuccess={() => setIsMobileCartOpen(false)} />
            </div>
          </div>
        )}
      </main>

      {/* Mobile Cart Trigger */}
      <button 
        onClick={() => setIsMobileCartOpen(true)}
        className="lg:hidden fixed bottom-24 right-6 z-[60] bg-slate-900 text-white p-5 rounded-[2rem] shadow-2xl flex items-center gap-3 animate-bounce hover:animate-none transition-all active:scale-95 group"
      >
        <div className="relative">
          <ShoppingCart size={24} className="group-hover:scale-110 transition-transform" />
          {getItemCount() > 0 && (
            <span className="absolute -top-3 -right-3 bg-sky-500 text-white text-[10px] font-black h-6 w-6 flex items-center justify-center rounded-full border-4 border-slate-900 animate-in zoom-in">
              {getItemCount()}
            </span>
          )}
        </div>
        <span className="text-xs font-black uppercase tracking-widest pr-1"></span>
      </button>
    </div>
  );
}
