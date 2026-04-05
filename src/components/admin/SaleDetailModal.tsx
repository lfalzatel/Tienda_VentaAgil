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
  customerName?: string;
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300 max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="p-3 sm:p-6 border-b border-slate-100 flex justify-between items-center gap-2">
          <div className="flex items-center gap-3 flex-grow min-w-0">
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0",
              sale.paymentMethod === "Cash" ? "bg-emerald-50 text-emerald-600" :
              sale.paymentMethod === "Credit" ? "bg-rose-50 text-rose-600" : "bg-sky-50 text-sky-600"
            )}>
              {sale.paymentMethod === "Cash" ? <Banknote size={18} /> : 
               sale.paymentMethod === "Credit" ? <History size={18} /> : <CreditCard size={18} />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-900 tracking-tight">Detalle de Venta</h3>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest truncate">
                ID: {sale.id.slice(-6).toUpperCase()}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-lg transition-all flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-4 flex-grow">
          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 sm:p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Fecha</p>
              <p className="text-[10px] font-bold text-slate-700">{formatDate(sale.createdAt)}</p>
            </div>
            <div className="p-2 sm:p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Pago</p>
              <p className="text-[10px] font-bold text-slate-700">{sale.paymentMethod}</p>
            </div>
            <div className="p-2 sm:p-3 bg-slate-50 rounded-lg border border-slate-100 col-span-2">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Cliente</p>
              <p className="text-[10px] font-bold text-slate-700">{sale.customerName || "Cliente Desconocido"}</p>
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-1.5">
            <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Productos ({sale.items.length})</h4>
            {sale.items.map((item, idx) => (
              <div key={idx} className="flex justify-between gap-2 p-2 bg-white border border-slate-100 rounded-lg text-[10px]">
                <div className="min-w-0">
                  <p className="font-black text-slate-900 truncate">{item.name}</p>
                  <p className="text-[9px] text-slate-500">{item.quantity} x ${item.price.toLocaleString("es-CO")}</p>
                </div>
                <p className="font-black text-slate-900 whitespace-nowrap">
                  ${(item.price * item.quantity).toLocaleString("es-CO")}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer / Total */}
        <div className="p-3 sm:p-6 bg-slate-50 border-t border-slate-100">
          <div className="flex justify-between items-center gap-2">
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total</p>
              <p className="text-xl font-black text-slate-900">
                ${sale.total.toLocaleString("es-CO")}
              </p>
            </div>
            <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[8px] font-bold text-emerald-700 uppercase">OK</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
