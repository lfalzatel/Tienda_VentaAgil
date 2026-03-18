"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, query, where, Timestamp, limit, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Header } from "@/components/layout/Header";
import { StatsGrid } from "@/components/admin/StatsGrid";
import { SalesChart } from "@/components/admin/SalesChart";
import { DashboardControls, TimeFilter } from "@/components/admin/DashboardControls";
import { SalesCalendarModal } from "@/components/admin/SalesCalendarModal";
import { SaleDetailModal } from "@/components/admin/SaleDetailModal";
import { downloadSalesCSV } from "@/lib/utils/exportUtils";
import { 
  TrendingUp, 
  History, 
  ArrowRight,
  ShoppingBag,
  CreditCard,
  Banknote
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Sale {
  id: string;
  total: number;
  paymentMethod: string;
  createdAt: any;
  items: any[];
}

export default function DashboardPage() {
  const [activeFilter, setActiveFilter] = useState<TimeFilter>("today");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  
  const [stats, setStats] = useState({
    totalSales: 0,
    cashReceived: 0,
    creditSales: 0,
    netProfit: 0,
    totalDebt: 0,
    lowStockCount: 0,
    activeCustomers: 0,
  });
  
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);

  // 1. Escuchar saldos de deudores y productos (Estático)
  useEffect(() => {
    const unsubDebtors = onSnapshot(collection(db, "debtors"), (snap) => {
      const total = snap.docs.reduce((acc, d) => acc + (d.data().totalDebt || 0), 0);
      setStats(prev => ({ ...prev, totalDebt: total, activeCustomers: snap.size }));
    });

    const qStock = query(collection(db, "products"), where("stock", "<", 5));
    const unsubStock = onSnapshot(qStock, (snap) => {
      setStats(prev => ({ ...prev, lowStockCount: snap.size }));
      setLowStockProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubDebtors();
      unsubStock();
    };
  }, []);

  // 2. Escuchar ventas según filtro dinámico
  useEffect(() => {
    let start = new Date();
    let end: Date | null = null;

    if (activeFilter === "today") {
      start.setHours(0, 0, 0, 0);
    } else if (activeFilter === "week") {
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else if (activeFilter === "month") {
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    } else if (activeFilter === "custom" && selectedDate) {
      start = new Date(selectedDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(selectedDate);
      end.setHours(23, 59, 59, 999);
    }

    let q = query(
      collection(db, "sales"),
      where("createdAt", ">=", Timestamp.fromDate(start))
    );

    if (end) {
      q = query(q, where("createdAt", "<=", Timestamp.fromDate(end)));
    }

    const unsubSales = onSnapshot(q, (snap) => {
      const sales = snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale));
      
      let total = 0;
      let cash = 0;
      let credit = 0;
      let profit = 0;

      sales.forEach(sale => {
        total += sale.total || 0;
        if (sale.paymentMethod === "Cash") cash += sale.total || 0;
        if (sale.paymentMethod === "Credit") credit += sale.total || 0;
        
        // Calcular ganancia neta basada en el histórico de costPrice guardado en la venta
        sale.items?.forEach((item: any) => {
          const cost = item.costPrice || 0;
          const price = item.price || 0;
          const qty = item.quantity || 0;
          profit += (price - cost) * qty;
        });
      });
      
      setAllSales(sales);
      setRecentSales(sales.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate()).slice(0, 10));
      setStats(prev => ({ 
        ...prev, 
        totalSales: total,
        cashReceived: cash,
        creditSales: credit,
        netProfit: profit
      }));
    });

    return () => unsubSales();
  }, [activeFilter, selectedDate]);

  // Generar datos para el gráfico basados en las ventas filtradas
  const chartData = useMemo(() => {
    const groups: Record<string, number> = {};
    
    // Sort allSales by date first to ensure sequential grouping
    const sortedSales = [...allSales].sort((a, b) => a.createdAt.toDate() - b.createdAt.toDate());

    sortedSales.forEach(sale => {
      const date = sale.createdAt.toDate();
      const label = activeFilter === "today" || (activeFilter === "custom")
        ? date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
      
      groups[label] = (groups[label] || 0) + sale.total;
    });

    return Object.entries(groups).map(([date, total]) => ({ date, total }));
  }, [allSales, activeFilter]);

  const filterLabel = activeFilter === "today" ? "Hoy" : 
                     activeFilter === "week" ? "Semana" : 
                     activeFilter === "month" ? "Mes" : "Seleccionado";

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] overflow-hidden">
      <Header />
      
      <main className="flex-grow p-6 sm:p-10 overflow-y-auto custom-scrollbar max-w-7xl mx-auto w-full space-y-10 pb-20">
        {/* Page Header */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 bg-slate-900 rounded-[2.2rem] flex items-center justify-center text-white shadow-xl shadow-slate-900/10">
              <TrendingUp size={28} />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-slate-900">Dashboard</h1>
              <p className="text-slate-500 font-medium text-sm mt-1">Resumen operativo de VentaÁgil</p>
            </div>
          </div>

          <DashboardControls 
            activeFilter={activeFilter}
            onFilterChange={(f) => {
              setActiveFilter(f);
              setSelectedDate(undefined);
            }}
            onOpenCalendar={() => setIsCalendarOpen(true)}
            onDownloadReport={() => downloadSalesCSV(allSales, activeFilter)}
            selectedDate={selectedDate}
          />
        </div>

        {/* Info Grid */}
        <StatsGrid 
          stats={stats} 
          filterLabel={filterLabel}
          lowStockProducts={lowStockProducts} 
        />

        {/* Charts & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            <SalesChart data={chartData} />
          </div>

          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col h-full min-h-[500px]">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-slate-50 rounded-xl text-slate-400">
                  <History size={18} />
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Actividad</h3>
              </div>
              <span className="px-3 py-1 bg-slate-50 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {allSales.length} Ventas
              </span>
            </div>

            <div className="flex-grow space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              {recentSales.map((sale) => (
                <button 
                  key={sale.id} 
                  onClick={() => setSelectedSale(sale)}
                  className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-all group border border-transparent hover:border-slate-100 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-11 w-11 rounded-2xl flex items-center justify-center transition-colors shadow-sm",
                      sale.paymentMethod === "Cash" ? "bg-emerald-50 text-emerald-600" :
                      sale.paymentMethod === "Credit" ? "bg-rose-50 text-rose-600" : "bg-sky-50 text-sky-600"
                    )}>
                      {sale.paymentMethod === "Cash" ? <Banknote size={20} /> : 
                       sale.paymentMethod === "Credit" ? <History size={20} /> : <CreditCard size={20} />}
                    </div>
                    <div>
                      <p className="text-base font-black text-slate-900">${sale.total.toLocaleString("es-CO")}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <span>{sale.paymentMethod}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-200"></span>
                        <span>{sale.items.length} items</span>
                      </p>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-slate-200 group-hover:text-slate-900 transition-colors" />
                </button>
              ))}
              
              {recentSales.length === 0 && (
                <div className="py-20 text-center opacity-30 select-none flex flex-col items-center">
                   <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                     <ShoppingBag size={40} className="text-slate-300" />
                   </div>
                   <p className="font-black text-sm text-slate-500 uppercase tracking-widest">Sin ventas en este rango</p>
                </div>
              )}
            </div>
            
            <Link 
              href="/admin/reports" 
              className="mt-8 py-4 w-full bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest text-center transition-all active:scale-[0.98]"
            >
              Reporte Detallado
            </Link>
          </div>
        </div>
      </main>

      <SalesCalendarModal 
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        onSelectDate={(date) => {
          setSelectedDate(date);
          setActiveFilter("custom");
        }}
        collectionName="sales"
        title="Ventas por Día"
      />

      <SaleDetailModal 
        isOpen={!!selectedSale}
        sale={selectedSale}
        onClose={() => setSelectedSale(null)}
      />
    </div>
  );
}
