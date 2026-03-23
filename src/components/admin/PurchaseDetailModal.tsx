"use client";

import { 
  X,
  Calendar, 
  Package, 
  DollarSign, 
  Hash,
  ShoppingBag
} from "lucide-react";

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
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6 text-slate-900">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-xl bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="bg-slate-900 p-6 text-white relative">
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
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Summary Stats */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3 text-slate-400 font-bold">
              <Calendar size={16} />
              <p className="text-[10px] uppercase tracking-widest">
                {formatDate(purchase.createdAt)}
              </p>
            </div>
            <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
              {purchase.items?.length || 0} productos
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Lista de productos</p>
            {purchase.items?.map((item: any, idx: number) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group hover:bg-slate-100/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-400">
                    <Package size={20} />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 leading-tight">{item.productName}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">
                      {item.quantity} uds × ${(item.costPrice ?? 0).toLocaleString("es-CO")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-900">
                    ${((item.total || (item.costPrice * item.quantity)) ?? 0).toLocaleString("es-CO")}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 bg-slate-900 rounded-3xl text-white shadow-xl shadow-slate-900/20 relative overflow-hidden group mt-4">
            <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-center mb-2 relative z-10">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inversión Total</span>
              <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-wider">Pagado</div>
            </div>
            <p className="text-3xl font-black tracking-tighter text-white relative z-10">
              ${(purchase.total ?? 0).toLocaleString("es-CO")}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6">
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
