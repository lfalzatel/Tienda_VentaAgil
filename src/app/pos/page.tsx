"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { Cart } from "@/components/pos/Cart";
import { ShoppingCart, ShoppingBag, X, Plus, User } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { SelectTabClientModal } from "@/components/pos/SelectTabClientModal";
import { cn } from "@/lib/utils";

export default function POSPage() {
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const { tabs, activeTabId, addTab, removeTab, setActiveTab, setTabClient, getItemCount } = useCartStore();

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] overflow-hidden">
      <Header />
      
      <main className="flex-grow flex overflow-hidden relative">
        {/* Left Side: Product Catalog */}
        <div className="flex-grow p-4 sm:p-6 flex flex-col">
          <div className="max-w-7xl mx-auto w-full flex flex-col">
            <header className="mb-1 shrink-0">
              <h1 className="text-xl sm:text-2xl font-black tracking-tighter text-slate-900 italic">
                VentaÁgil
              </h1>
              <p className="text-slate-400 font-medium text-[10px] sm:text-xs">
                Selecciona los productos para iniciar una venta
              </p>
            </header>

            {/* Tab Bar Container */}
            <div className="flex items-end gap-1 mb-2 overflow-x-auto pt-1 px-2 border-b-2 border-slate-200 custom-scrollbar shrink-0 min-h-[40px]">
              {tabs.map(tab => (
                <div 
                  key={tab.id}
                  onClick={() => {
                    if (activeTabId === tab.id) {
                      setIsClientModalOpen(true);
                    } else {
                      setActiveTab(tab.id);
                    }
                  }}
                  className={cn(
                    "group flex items-center justify-between gap-2 px-3 py-2 rounded-t-[14px] transition-all cursor-pointer whitespace-nowrap select-none border-t border-x",
                    tab.name ? "min-w-[80px] max-w-[160px]" : "min-w-[44px]",
                    activeTabId === tab.id 
                      ? "bg-slate-900 border-slate-900 text-white z-10 relative" 
                      : "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                  )}
                >
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    {tab.clientName ? (
                      <User size={13} className={activeTabId === tab.id ? "text-sky-400" : "text-slate-400"} />
                    ) : (
                      <ShoppingBag size={13} className={activeTabId === tab.id ? "text-sky-400" : "text-slate-400"} />
                    )}
                    {(tab.clientName || tab.name) && (
                      <span className="text-xs font-bold truncate">
                        {tab.clientName ? tab.clientName.split(" ")[0] : tab.name}
                      </span>
                    )}
                  </div>
                  
                  {tabs.length > 1 && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTab(tab.id);
                      }}
                      className={cn(
                        "p-1 rounded-full transition-colors shrink-0",
                        activeTabId === tab.id ? "hover:bg-white/20 text-white/70" : "hover:bg-slate-300 text-slate-400"
                      )}
                    >
                      <X size={14} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              ))}
              
              <button 
                onClick={addTab}
                className="h-[36px] w-[36px] mb-1.5 shrink-0 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-all ml-1"
                title="Nueva pestaña"
              >
                <Plus size={20} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="relative">
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

      <SelectTabClientModal 
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSelect={(clientId, clientName) => {
          setTabClient(activeTabId, clientId, clientName);
        }}
      />

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
