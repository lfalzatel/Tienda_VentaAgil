"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { Cart } from "@/components/pos/Cart";
import { ShoppingCart, X } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";

export default function POSPage() {
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const { items, getItemCount } = useCartStore();

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] overflow-hidden">
      <Header />
      
      <main className="flex-grow flex overflow-hidden relative">
        {/* Left Side: Product Catalog */}
        <div className="flex-grow p-4 sm:p-6 overflow-hidden">
          <div className="max-w-7xl mx-auto h-full flex flex-col">
            <header className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 italic">
                VentaÁgil
              </h1>
              <p className="text-slate-500 font-medium text-xs sm:text-sm">
                Selecciona los productos para iniciar una venta
              </p>
            </header>
            
            <div className="flex-grow overflow-hidden">
              <ProductGrid />
            </div>
          </div>
        </div>

        {/* Right Side: Cart Panel (Desktop) */}
        <aside className="hidden lg:block w-[380px] xl:w-[420px] flex-shrink-0">
          <Cart />
        </aside>

        {/* Mobile Cart Overlay */}
        {isMobileCartOpen && (
          <div className="fixed inset-0 z-[100] lg:hidden flex flex-col bg-white animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b flex justify-between items-center bg-white">
              <h2 className="text-lg font-black tracking-tight text-slate-900">Carrito de Ventas</h2>
              <button 
                onClick={() => setIsMobileCartOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-900 rounded-xl"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-grow overflow-hidden">
              <Cart onSuccess={() => setIsMobileCartOpen(false)} />
            </div>
          </div>
        )}
      </main>

      {/* Mobile Cart Trigger */}
      <button 
        onClick={() => setIsMobileCartOpen(true)}
        className="lg:hidden fixed bottom-24 right-6 z-[60] bg-sky-600 text-white p-4 rounded-3xl shadow-2xl flex items-center gap-2 animate-bounce hover:animate-none group active:scale-95 transition-all"
      >
        <div className="relative">
          <ShoppingCart size={24} />
          {getItemCount() > 0 && (
            <span className="absolute -top-3 -right-3 bg-red-500 text-white text-[10px] font-black h-5 w-5 flex items-center justify-center rounded-full border-2 border-white">
              {getItemCount()}
            </span>
          )}
        </div>
      </button>
    </div>
  );
}
