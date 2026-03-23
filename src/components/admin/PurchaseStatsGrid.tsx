"use client";

import { 
  TrendingDown, 
  Package, 
  Calendar, 
  ShoppingBag,
  ArrowUpRight, 
  ArrowDownRight,
  Wallet
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StatProps {
  title: string;
  value: string;
  subValue: string;
  icon: any;
  trend?: "up" | "down";
  color: "slate" | "red" | "emerald" | "orange" | "sky";
}

const StatCard = ({ title, value, subValue, icon: Icon, trend, color }: StatProps) => {
  const colors = {
    slate: "bg-slate-50 text-slate-900 border-slate-100",
    red: "bg-red-50 text-red-600 border-red-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    sky: "bg-sky-50 text-sky-600 border-sky-100",
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
            {trend === "up" ? "↑" : "↓"}
          </div>
        )}
      </div>
      
      <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] sm:tracking-[0.2em] mb-0.5 sm:mb-1 truncate">{title}</p>
      <h3 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tighter mb-0.5 sm:mb-1 truncate">{value}</h3>
      <p className="text-[10px] sm:text-xs font-bold text-slate-500 truncate">{subValue}</p>
    </div>
  );
};

interface PurchaseStatsGridProps {
  stats: {
    totalSpent: number;
    totalItems: number;
    activeDays: number;
    avgPurchase: number;
  };
  filterLabel?: string;
}

export const PurchaseStatsGrid = ({ stats, filterLabel = "Hoy" }: PurchaseStatsGridProps) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      <StatCard 
        title={`Inversión ${filterLabel}`} 
        value={`$${(stats.totalSpent ?? 0).toLocaleString("es-CO")}`} 
        subValue="Gasto total en mercancía"
        icon={Wallet}
        color="emerald"
      />
      
      <StatCard 
        title="Productos Ingresados" 
        value={(stats.totalItems ?? 0).toLocaleString("es-CO")} 
        subValue="Total de unidades compradas"
        icon={Package}
        color="sky"
      />

      <StatCard 
        title="Días de Actividad" 
        value={stats.activeDays.toString()} 
        subValue="Días con registros de compra"
        icon={Calendar}
        color="slate"
      />

      <StatCard 
        title="Promedio por Compra" 
        value={`$${(Math.round(stats.avgPurchase) ?? 0).toLocaleString("es-CO")}`} 
        subValue="Costo promedio de adquisición"
        icon={ShoppingBag}
        color="orange"
      />
    </div>
  );
};
