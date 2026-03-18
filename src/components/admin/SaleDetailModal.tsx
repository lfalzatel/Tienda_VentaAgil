"use client";

import { X, ShoppingBag, Calendar, CreditCard, Banknote, History, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SaleItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface Sale {
  id: string;
  total: number;
  paymentMethod: string;
  items: SaleItem[];
  createdAt: any;
}

interface SaleDetailModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SaleDetailModal({ sale, isOpen, onClose }: SaleDetailModalProps) {
  if (!isOpen || !sale) return null;

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg bg-white rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className={cn(
              "h-14 w-14 rounded-2xl flex items-center justify-center shadow-sm",
              sale.paymentMethod === "Cash" ? "bg-emerald-50 text-emerald-600" :
              sale.paymentMethod === "Credit" ? "bg-rose-50 text-rose-600" : "bg-sky-50 text-sky-600"
            )}>
              {sale.paymentMethod === "Cash" ? <Banknote size={24} /> : 
               sale.paymentMethod === "Credit" ? <History size={24} /> : <CreditCard size={24} />}
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Detalle de Venta</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                ID: {sale.id.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                <Calendar size={10} /> Fecha
              </p>
              <p className="text-xs font-bold text-slate-700">{formatDate(sale.createdAt)}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                <CreditCard size={10} /> Pago
              </p>
              <p className="text-xs font-bold text-slate-700">{sale.paymentMethod}</p>
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Productos</h4>
            {sale.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                    <ShoppingBag size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{item.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {item.quantity} x ${item.price.toLocaleString("es-CO")}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-black text-slate-900">
                  ${(item.price * item.quantity).toLocaleString("es-CO")}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer / Total */}
        <div className="p-8 bg-slate-50 border-t border-slate-100">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Pagado</p>
              <p className="text-3xl font-black text-slate-900 tracking-tighter">
                ${sale.total.toLocaleString("es-CO")}
              </p>
            </div>
            <div className="px-5 py-3 bg-white border border-slate-100 rounded-2xl flex items-center gap-2 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-slate-900">Completado</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
