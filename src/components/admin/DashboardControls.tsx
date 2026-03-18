"use client";

import { 
  Calendar as CalendarIcon, 
  Download, 
  ChevronDown 
} from "lucide-react";
import { cn } from "@/lib/utils";

export type TimeFilter = "today" | "week" | "month" | "custom";

interface DashboardControlsProps {
  activeFilter: TimeFilter;
  onFilterChange: (filter: TimeFilter) => void;
  onOpenCalendar: () => void;
  onDownloadReport: () => void;
  selectedDate?: Date;
}

export const DashboardControls = ({ 
  activeFilter, 
  onFilterChange, 
  onOpenCalendar, 
  onDownloadReport,
  selectedDate 
}: DashboardControlsProps) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
      {/* Segmented Control */}
      <div className="flex p-1.5 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden min-w-[300px]">
        {(["today", "week", "month"] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => onFilterChange(filter)}
            className={cn(
              "flex-1 py-2 px-4 rounded-xl text-xs font-black transition-all",
              activeFilter === filter 
                ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10" 
                : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            {filter === "today" ? "Hoy" : filter === "week" ? "Semana" : "Mes"}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Calendar Button */}
        <button 
          onClick={onOpenCalendar}
          className={cn(
            "flex flex-1 sm:flex-none items-center justify-center gap-3 px-6 py-3.5 rounded-2xl font-black text-xs transition-all active:scale-95 group",
            activeFilter === "custom" 
              ? "bg-sky-50 border border-sky-100 text-sky-600 shadow-sm" 
              : "bg-white border border-slate-100 text-slate-900 shadow-sm hover:shadow-md"
          )}
        >
          <CalendarIcon size={18} className={cn(activeFilter === "custom" ? "text-sky-600" : "text-slate-400 group-hover:text-slate-900")} />
          <span>
            {activeFilter === "custom" && selectedDate 
              ? selectedDate.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) 
              : "Calendario"}
          </span>
          <ChevronDown size={14} className="opacity-30 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* Download Button */}
        <button 
          onClick={onDownloadReport}
          className="flex items-center justify-center h-[46px] w-[46px] bg-slate-900 text-white rounded-2xl shadow-lg shadow-slate-900/10 hover:shadow-xl hover:shadow-slate-900/20 transition-all active:scale-90"
          title="Descargar Reporte CSV"
        >
          <Download size={20} />
        </button>
      </div>
    </div>
  );
};
