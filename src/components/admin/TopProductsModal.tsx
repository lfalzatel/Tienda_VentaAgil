"use client";

import { X, Trophy, ShoppingBag, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductRank {
  name: string;
  quantity: number;
  revenue: number;
}

interface TopProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductRank[];
  filterLabel: string;
}

export function TopProductsModal({ isOpen, onClose, products, filterLabel }: TopProductsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300 max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shadow-sm">
              <Trophy size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Ranking de Productos</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Top 20 • {filterLabel}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-lg transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white/80 backdrop-blur-md z-10">
              <tr className="border-b border-slate-50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">#</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Producto</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Uds</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ingresos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {products.map((product, idx) => (
                <tr 
                  key={idx} 
                  className={cn(
                    "hover:bg-slate-50/50 transition-colors group",
                    idx === 0 && "bg-amber-50/30"
                  )}
                >
                  <td className="px-6 py-4">
                    <div className={cn(
                      "h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-black shadow-sm",
                      idx === 0 ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-400"
                    )}>
                      {idx + 1}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                      {product.name}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-black text-slate-900">{product.quantity}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">unidades</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm font-black text-slate-900">
                      ${product.revenue.toLocaleString("es-CO")}
                    </p>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center opacity-30">
                      <ShoppingBag size={48} className="text-slate-300 mb-4" />
                      <p className="font-black text-sm text-slate-500 uppercase tracking-widest">Sin datos de ventas</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-slate-400">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Análisis de Rendimiento</span>
          </div>
          <span className="text-[10px] font-black">VentaÁgil © 2024</span>
        </div>
      </div>
    </div>
  );
}
