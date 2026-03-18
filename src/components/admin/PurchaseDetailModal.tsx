"use client";

import { 
  X,
  Calendar, 
  Package, 
  DollarSign, 
  Hash,
  ShoppingBag
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PurchaseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: any | null;
}

export const PurchaseDetailModal = ({ isOpen, onClose, purchase }: PurchaseDetailModalProps) => {
  if (!isOpen || !purchase) return null;

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
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="bg-slate-900 p-8 text-white relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
          
          <div className="flex justify-between items-center relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-2xl flex items-center justify-center">
                <ShoppingBag size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight">Detalle de Compra</h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                  ID: {purchase.id.slice(-8).toUpperCase()}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-3 bg-white/10 text-white hover:bg-white/20 rounded-2xl transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Main Product Info */}
          <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-[2rem] border border-slate-100">
            <div className="h-14 w-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
              <Package size={28} />
            </div>
            <div>
              <p className="text-lg font-black text-slate-900 leading-tight">{purchase.productName}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Producto Adquirido</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 text-slate-400 mb-3">
                <Hash size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest">Cantidad</span>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{purchase.quantity} <span className="text-xs font-bold text-slate-400">uds</span></p>
            </div>

            <div className="p-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 text-slate-400 mb-3">
                <DollarSign size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest">P. Costo</span>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight">${purchase.costPrice?.toLocaleString("es-CO")}</p>
            </div>
          </div>

          <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-xl shadow-slate-900/20 relative overflow-hidden group">
            <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-center mb-2 relative z-10">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inversión Total</span>
              <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-wider">Pagado</div>
            </div>
            <p className="text-4xl font-black tracking-tighter text-white relative z-10">
              ${purchase.total?.toLocaleString("es-CO")}
            </p>
          </div>

          <div className="flex items-center gap-3 px-2 text-slate-400">
            <Calendar size={14} />
            <p className="text-[10px] font-black uppercase tracking-widest">
              Registrado el {formatDate(purchase.createdAt)}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 pt-0">
          <button 
            onClick={onClose}
            className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-[0.98] shadow-lg shadow-slate-900/10"
          >
            Cerrar Detalle
          </button>
        </div>
      </div>
    </div>
  );
};
