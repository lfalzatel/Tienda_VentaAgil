"use client";

import { 
  X, 
  TrendingUp, 
  Banknote, 
  CreditCard, 
  History, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  Package,
  ShoppingCart,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Item {
  label: string;
  value: any;
  icon: any;
  color: string;
  isCount?: boolean;
}

interface StatsDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "income" | "credit" | "profit" | "debt" | null;
  data: any;
  filterLabel: string;
  onViewSale?: (sale: any) => void;
}

export const StatsDetailModal = ({ isOpen, onClose, type, data, filterLabel, onViewSale }: StatsDetailModalProps) => {
  if (!isOpen || !type) return null;

  const content: {
    title: string;
    description: string;
    icon: any;
    color: string;
    items?: Item[];
    details?: { label: string; value: number; sign: string; color: string }[];
  } = {
    income: {
      title: "Desglose de Ingresos",
      description: `Ingresos recibidos (${filterLabel})`,
      icon: Banknote,
      color: "emerald",
      items: [
        { label: "Efectivo", value: data.cashOnlyReceived || 0, icon: Banknote, color: "emerald" },
        { label: "Tarjeta", value: data.cardReceived || 0, icon: CreditCard, color: "sky" },
        { label: "Transferencia / Digital", value: data.digitalReceived || 0, icon: TrendingUp, color: "indigo" },
      ]
    },
    credit: {
      title: "Ventas a Crédito",
      description: `Monto pendiente por cobrar (${filterLabel})`,
      icon: DollarSign,
      color: "orange",
      items: [
        { label: "Total Créditos", value: data.creditSales || 0, icon: History, color: "orange" },
        { label: "Número de Ventas", value: data.recentCreditSales?.length || 0, icon: ShoppingCart, color: "amber", isCount: true },
      ]
    },
    profit: {
      title: "Cálculo de Ganancia",
      description: `Flujo de Caja y Utilidad (${filterLabel})`,
      icon: TrendingUp,
      color: "emerald",
      details: [
        { label: "Ventas Totales", value: data.totalSales || 0, sign: "+", color: "slate" },
        { label: "Ventas a Crédito (No Ingresado)", value: data.creditSales || 0, sign: "-", color: "rose" },
        { label: "Gasto en Compras (Mercancía)", value: data.totalPurchases || 0, sign: "-", color: "rose" },
      ]
    },
    debt: {
      title: "Cartera de Clientes",
      description: "Deuda acumulada históricamente",
      icon: History,
      color: "red",
      items: [
        { label: "Deuda Total Pendiente", value: data.totalDebt || 0, icon: History, color: "red" },
        { label: "Clientes Activos con Deuda", value: data.activeCustomersCount || 0, icon: ShoppingCart, color: "slate", isCount: true },
      ]
    }
  }[type];

  if (!content) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="relative w-full max-w-md max-h-[90dvh] flex flex-col bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300">
        {/* Header */}
        <div className={cn(
          "p-8 pb-6 flex justify-between items-start",
          content.color === "emerald" ? "bg-emerald-50/50" : 
          content.color === "orange" ? "bg-orange-50/50" :
          content.color === "red" ? "bg-red-50/50" : "bg-slate-50/50"
        )}>
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-3 rounded-2xl shadow-lg shadow-black/5",
              content.color === "emerald" ? "bg-emerald-600 text-white" : 
              content.color === "orange" ? "bg-orange-600 text-white" :
              content.color === "red" ? "bg-red-600 text-white" : "bg-slate-900 text-white"
            )}>
              <content.icon size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">{content.title}</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{content.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-4 overflow-y-auto custom-scrollbar flex-grow">
          {content.items && content.items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all group">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  item.color === "emerald" ? "bg-emerald-100 text-emerald-600" :
                  item.color === "sky" ? "bg-sky-100 text-sky-600" :
                  item.color === "indigo" ? "bg-indigo-100 text-indigo-600" :
                  item.color === "orange" ? "bg-orange-100 text-orange-600" :
                  item.color === "amber" ? "bg-amber-100 text-amber-600" :
                  item.color === "red" ? "bg-red-100 text-red-600" : "bg-slate-200 text-slate-600"
                )}>
                  <item.icon size={16} />
                </div>
                <span className="text-xs font-bold text-slate-500">{item.label}</span>
              </div>
              <span className="font-black text-slate-900">
                {item.isCount ? item.value : `$${item.value.toLocaleString("es-CO")}`}
              </span>
            </div>
          ))}

          {type === "profit" && content.details && (
            <div className="space-y-3">
              <div className="space-y-2">
                {content.details.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center px-2">
                    <span className="text-xs font-bold text-slate-400">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs font-black", 
                        item.sign === "+" ? "text-emerald-500" : 
                        item.sign === "-" ? "text-rose-500" : "text-amber-500"
                      )}>
                        {item.sign}
                      </span>
                      <span className="text-sm font-black text-slate-900">${item.value.toLocaleString("es-CO")}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-tighter">Referencia de Costo de Venta</span>
                  <span className="text-xs font-black text-amber-700">${(data.costOfSoldItems || 0).toLocaleString("es-CO")}</span>
                </div>
                <p className="text-[9px] text-amber-600/70 mt-1 leading-tight">Valor de lo vendido en este periodo sin considerar inversión en stock.</p>
              </div>

              <div className="pt-2 border-t-2 border-dashed border-slate-100">
                <div className="p-5 bg-slate-900 rounded-2xl text-white shadow-xl shadow-slate-900/10">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Final (Caja)</span>
                    <TrendingUp size={14} className="text-emerald-400" />
                  </div>
                  <p className="text-3xl font-black tracking-tighter">
                    ${(data.netProfit || 0).toLocaleString("es-CO")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Listado de Ventas a Crédito del Periodo */}
          {type === 'credit' && data.recentCreditSales && (
            <div className="space-y-3 mt-4">
              <div className="flex justify-between items-center px-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ventas del Período</span>
                <span className="text-[10px] font-bold text-slate-400 italic">{data.recentCreditSales.length} totales</span>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto px-1 custom-scrollbar">
                {data.recentCreditSales.map((sale: any, idx: number) => (
                  <div key={sale.id || idx} className="flex flex-col p-4 bg-slate-50 rounded-2xl border border-slate-100/50 group hover:bg-white hover:border-orange-200 transition-all duration-300">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-orange-500 shadow-sm shadow-orange-200" />
                        <span className="text-xs font-black text-slate-900">{sale.debtorName}</span>
                      </div>
                      <span className="text-sm font-black text-orange-600">${sale.total.toLocaleString("es-CO")}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                        {sale.createdAt?.toDate?.() ? sale.createdAt.toDate().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '---'}
                      </span>
                      <button 
                        onClick={() => onViewSale?.(sale)}
                        className="flex items-center gap-1.5 py-1 px-3 bg-white border border-slate-200 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all active:scale-95"
                      >
                        Ver Detalle
                        <ArrowRight size={10} />
                      </button>
                    </div>
                  </div>
                ))}
                {data.recentCreditSales.length === 0 && (
                  <p className="text-center py-8 text-xs font-bold text-slate-400 italic">No hay ventas a crédito hoy</p>
                )}
              </div>
            </div>
          )}

          {/* Listado de Deudores (si aplica a deuda histórica) */}
          {type === 'debt' && data.debtors && data.debtors.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="h-1 w-1 rounded-full bg-red-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Principales Deudores</span>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {data.debtors.map((debtor: any) => (
                  <div key={debtor.id} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl hover:border-red-100 transition-all">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase">
                        {debtor.name.substring(0, 2)}
                      </div>
                      <span className="text-xs font-bold text-slate-700">{debtor.name}</span>
                    </div>
                    <span className="text-xs font-black text-red-600">${debtor.balance.toLocaleString("es-CO")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 pt-0">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            Cerrar Detalle
          </button>
        </div>
      </div>
    </div>
  );
};
