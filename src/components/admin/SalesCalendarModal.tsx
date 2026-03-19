"use client";

import { useState, useEffect } from "react";
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  ShoppingBag
} from "lucide-react";
import { collection, query, where, Timestamp, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { cn } from "@/lib/utils";

interface SalesCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  collectionName?: "sales" | "purchases";
  title?: string;
}

export const SalesCalendarModal = ({ 
  isOpen, 
  onClose, 
  onSelectDate,
  collectionName = "sales",
  title = "Ventas por Día"
}: SalesCalendarModalProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchMonthData();
    }
  }, [isOpen, currentMonth, collectionName]);

  const fetchMonthData = async () => {
    setIsLoading(true);
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);

    const q = query(
      collection(db, collectionName),
      where("createdAt", ">=", Timestamp.fromDate(startOfMonth)),
      where("createdAt", "<=", Timestamp.fromDate(endOfMonth))
    );

    try {
      const snap = await getDocs(q);
      const newCounts: Record<string, number> = {};
      snap.docs.forEach(doc => {
        const date = doc.data().createdAt.toDate();
        // Use local date format YYYY-MM-DD to avoid timezone shift from toISOString()
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;
        
        newCounts[dateKey] = (newCounts[dateKey] || 0) + 1;
      });
      setCounts(newCounts);
    } catch (error) {
      console.error(`Error fetching ${collectionName} counts:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  if (!isOpen) return null;

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const numDays = daysInMonth(year, month);
  const offset = firstDayOfMonth(year, month);
  
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const days = Array.from({ length: 42 }, (_, i) => {
    const day = i - offset + 1;
    if (day <= 0 || day > numDays) return null;
    return day;
  });

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
        {/* Header */}
        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-900 rounded-2xl text-white shadow-lg shadow-slate-900/20">
              <CalendarIcon size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">{title}</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Calendario de Actividad</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          {/* Month Selector */}
          <div className="flex items-center justify-between">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
              <ChevronLeft size={20} className="text-slate-400" />
            </button>
            <span className="text-sm font-black text-slate-900 uppercase tracking-widest">
              {monthNames[month]} {year}
            </span>
            <button onClick={handleNextMonth} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
              <ChevronRight size={20} className="text-slate-400" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {["D", "L", "Ma", "Mi", "J", "V", "S"].map((d, idx) => (
              <div key={idx} className="text-center text-[10px] font-black text-slate-300 py-2 uppercase tracking-widest">
                {d}
              </div>
            ))}
            {days.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />;
              
              const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const count = counts[dateKey] || 0;
              const isToday = new Date().toLocaleDateString('en-CA') === dateKey;

              return (
                <button
                  key={i}
                  onClick={() => {
                    const selected = new Date(year, month, day);
                    onSelectDate(selected);
                    onClose();
                  }}
                  className={cn(
                    "relative aspect-square rounded-2xl flex flex-col items-center justify-center transition-all group hover:scale-105 active:scale-95",
                    isToday ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20" : "hover:bg-slate-50 text-slate-600"
                  )}
                >
                  <span className={cn("text-xs font-black", !isToday && "group-hover:text-slate-900")}>{day}</span>
                  {count > 0 && (
                    <div className={cn(
                      "mt-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black",
                      isToday ? "bg-white/20 text-white" : "bg-sky-50 text-sky-600"
                    )}>
                      <ShoppingBag size={8} />
                      {count}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 pt-4">
          <div className="p-4 bg-slate-50 rounded-[2rem] flex items-center gap-4 text-slate-500">
            <div className="h-8 w-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-600">
              <CalendarIcon size={14} />
            </div>
            <p className="text-[10px] font-bold leading-relaxed tracking-tight">
              Selecciona un día para visualizar el detalle de ventas y rendimiento de esa fecha específica.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
