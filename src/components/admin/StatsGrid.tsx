"use client";

import { 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  Banknote,
  History
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { LowStockModal } from "./LowStockModal";

interface StatProps {
  title: string;
  value: string;
  subValue: string;
  icon: any;
  trend?: "up" | "down";
  color: "slate" | "red" | "emerald" | "orange";
}

const StatCard = ({ title, value, subValue, icon: Icon, trend, color }: StatProps) => {
  const colors = {
    slate: "bg-slate-50 text-slate-900 border-slate-100",
    red: "bg-red-50 text-red-600 border-red-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
  };

  return (
    <div className={cn(
      "p-4 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border bg-white shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500 group",
    )}>
      <div className="flex justify-between items-start mb-3 sm:mb-6">
        <div className={cn("p-2 sm:p-4 rounded-xl sm:rounded-2xl transition-transform group-hover:scale-110 duration-500", colors[color])}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        {trend && (
           <div className={cn(
            "flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg text-[8px] sm:text-[10px] font-black uppercase tracking-widest",
            trend === "up" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
          )}>
            {trend === "up" ? <ArrowUpRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> : <ArrowDownRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
            {trend === "up" ? "+12%" : "-5%"}
          </div>
        )}
      </div>
      
      <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] sm:tracking-[0.2em] mb-0.5 sm:mb-1 truncate">{title}</p>
      <h3 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tighter mb-0.5 sm:mb-1 truncate">{value}</h3>
      <p className="text-[10px] sm:text-xs font-bold text-slate-500 truncate">{subValue}</p>
    </div>
  );
};

interface StatsGridProps {
  stats: {
    totalSales: number;
    cashReceived: number;
    creditSales: number;
    netProfit: number;
    totalDebt: number;
    lowStockCount: number;
    activeCustomers: number;
  };
  filterLabel?: string;
  lowStockProducts?: any[];
}

export const StatsGrid = ({ stats, filterLabel = "Hoy", lowStockProducts = [] }: StatsGridProps) => {
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      <StatCard 
        title={`Ventas ${filterLabel}`} 
        value={`$${stats.totalSales.toLocaleString("es-CO")}`} 
        subValue="Total bruto (Sin descontar costos)"
        icon={DollarSign}
        color="slate"
      />
      
      <StatCard 
        title="Efectivo Recibido" 
        value={`$${stats.cashReceived.toLocaleString("es-CO")}`} 
        subValue="Ingresos reales en caja"
        icon={Banknote}
        color="emerald"
      />

      <StatCard 
        title="Ganancia Neta" 
        value={`$${stats.netProfit.toLocaleString("es-CO")}`} 
        subValue="Basado en precios de costo"
        icon={TrendingUp}
        color="emerald"
        trend="up"
      />

      <StatCard 
        title="Ventas a Crédito" 
        value={`$${stats.creditSales.toLocaleString("es-CO")}`} 
        subValue="Ventas pendientes de cobro"
        icon={History}
        color="orange"
      />
      
      <StatCard 
        title="Cobros Pendientes" 
        value={`$${stats.totalDebt.toLocaleString("es-CO")}`} 
        subValue="Deuda acumulada histórica"
        icon={Users}
        color="red"
      />
    </div>

    <LowStockModal 
      isOpen={isLowStockModalOpen}
      onClose={() => setIsLowStockModalOpen(false)}
      products={lowStockProducts}
    />
    </>
  );
};
