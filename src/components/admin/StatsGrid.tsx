"use client";

import { 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  Banknote,
  History,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { LowStockModal } from "./LowStockModal";

import { StatsDetailModal } from "./StatsDetailModal";

interface StatProps {
  title: string;
  value: string;
  subValue: string;
  icon: any;
  trend?: "up" | "down";
  color: "slate" | "red" | "emerald" | "orange" | "amber";
  onClick?: () => void;
}

const StatCard = ({ title, value, subValue, icon: Icon, trend, color, onClick }: StatProps) => {
  const colors = {
    slate: "bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900 border-slate-200",
    red: "bg-gradient-to-br from-red-50 to-red-100 text-red-600 border-red-200",
    emerald: "bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600 border-emerald-200",
    orange: "bg-gradient-to-br from-orange-50 to-orange-100 text-orange-600 border-orange-200",
    amber: "bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600 border-amber-200",
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "relative p-3 sm:p-5 rounded-xl sm:rounded-[2rem] border bg-white shadow-sm hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-500 group overflow-hidden",
        onClick && "cursor-pointer active:scale-95",
        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/80 before:to-transparent before:pointer-events-none"
      )}
    >
      {/* Fondo decorativo */}
      <div className={cn("absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10 blur-3xl", colors[color])} />
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-3 sm:mb-4">
          <div className={cn("p-2 sm:p-3 rounded-xl transition-all duration-500 shadow-lg group-hover:scale-110", colors[color])}>
            <Icon className="h-4 w-4 sm:h-6 sm:w-6" />
          </div>
          {trend && (
             <div className={cn(
              "flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-sm",
              trend === "up" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
            )}>
              {trend === "up" ? <ArrowUpRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <ArrowDownRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
              {trend === "up" ? "Positivo" : "Negativo"}
            </div>
          )}
          {onClick && !trend && (
            <div className="p-2 rounded-lg bg-slate-50 text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all">
              <Plus size={14} />
            </div>
          )}
        </div>
        
        <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:mb-1">{title}</p>
        <h3 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tighter mb-1 sm:mb-1">{value}</h3>
        <p className="text-[10px] sm:text-xs font-semibold text-slate-500 line-clamp-1">{subValue}</p>
      </div>
    </div>
  );
};

interface StatsGridProps {
  stats: {
    totalSales: number;
    cashReceived: number;
    cashOnlyReceived?: number;
    cardReceived?: number;
    digitalReceived?: number;
    creditSales: number;
    netProfit: number;
    totalDebt: number;
    lowStockCount: number;
    activeCustomers: number;
    debtors?: { id: string; name: string; balance: number }[];
  };
  details?: {
    costOfSoldItems: number;
    totalPurchases: number;
    totalSales: number;
  };
  filterLabel?: string;
  lowStockProducts?: any[];
  onViewSale?: (sale: any) => void;
}

export const StatsGrid = ({ stats, filterLabel = "Hoy", lowStockProducts = [], details, onViewSale }: StatsGridProps) => {
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; type: "income" | "credit" | "profit" | "debt" | null }>({
    isOpen: false,
    type: null
  });

  const openDetail = (type: "income" | "credit" | "profit" | "debt") => {
    setDetailModal({ isOpen: true, type });
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6 w-full">
      <StatCard 
        title={`Ingresos Recibidos`} 
        value={`$${stats.cashReceived.toLocaleString("es-CO")}`} 
        subValue={filterLabel}
        icon={Banknote}
        color="emerald"
        onClick={() => openDetail("income")}
      />

      <StatCard 
        title={`Ventas a Crédito`} 
        value={`$${stats.creditSales.toLocaleString("es-CO")}`} 
        subValue={filterLabel}
        icon={DollarSign}
        color="orange"
        onClick={() => openDetail("credit")}
      />

      <StatCard 
        title="Ganancia Neta" 
        value={`$${stats.netProfit.toLocaleString("es-CO")}`} 
        subValue={filterLabel}
        icon={TrendingUp}
        color="emerald"
        trend={stats.netProfit >= 0 ? "up" : "down"}
        onClick={() => openDetail("profit")}
      />

      <StatCard 
        title="Deuda Clientes" 
        value={`$${stats.totalDebt.toLocaleString("es-CO")}`} 
        subValue="Cartera histórica"
        icon={History}
        color="red"
        onClick={() => openDetail("debt")}
      />

      <StatCard 
        title="Stock Crítico" 
        value={stats.lowStockCount.toString()} 
        subValue="Menos de 5 uds"
        icon={AlertTriangle}
        color="amber"
        onClick={() => setIsLowStockModalOpen(true)}
      />
    </div>

    <StatsDetailModal 
      isOpen={detailModal.isOpen}
      onClose={() => setDetailModal({ isOpen: false, type: null })}
      type={detailModal.type}
      filterLabel={filterLabel}
      onViewSale={(sale) => {
        setDetailModal({ isOpen: false, type: null });
        onViewSale?.(sale);
      }}
      data={{
        ...stats,
        ...details,
        // Aseguramos que pasamos los deudores si el tipo es credit o debt
        debtors: stats.debtors
      }}
    />

    <LowStockModal 
      isOpen={isLowStockModalOpen}
      onClose={() => setIsLowStockModalOpen(false)}
      products={lowStockProducts}
    />
    </>
  );
};
