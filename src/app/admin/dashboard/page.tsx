"use client";

import { useEffect, useState, useMemo, useRef } from "react";
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
  Banknote,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RecalculatePopularity } from "@/components/admin/RecalculatePopularity";
import { PushActivationCard } from "@/components/ui/PushActivationCard";

interface Sale {
  id: string;
  total: number;
  paymentMethod: string;
  createdAt: any;
  items: any[];
  debtorId?: string;
  customerName?: string;
  debtorName?: string;
}

export default function DashboardPage() {
  const [activeFilter, setActiveFilter] = useState<TimeFilter>("today");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  
  const [stats, setStats] = useState<any>({
    totalSales: 0,
    cashReceived: 0,
    creditSales: 0,
    netProfit: 0,
    totalDebt: 0,
    lowStockCount: 0,
    activeCustomersCount: 0,
    totalPurchases: 0,
    recentCreditSales: []
  });
  
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [totalPurchaseExpense, setTotalPurchaseExpense] = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [costOfSoldItems, setCostOfSoldItems] = useState(0);
  const allDebtorsMap = useRef<Record<string, string>>({});

  // 1. Escuchar saldos de deudores y productos (Estático/Global)
  useEffect(() => {
    const unsubDebtors = onSnapshot(collection(db, "debtors"), (snap) => {
      const debtorsList: any[] = [];
      const debtorsMap: Record<string, string> = {};
      let total = 0;
      
      snap.docs.forEach(doc => {
        const data = doc.data();
        debtorsMap[doc.id] = data.name || "Sin nombre";
        const debt = data.totalDebt || 0;
        if (debt > 0) {
          total += debt;
          debtorsList.push({
            id: doc.id,
            name: data.name || "Sin nombre",
            balance: debt
          });
        }
      });

      // Ordenar por mayor deuda para el modal
      const topDebtors = debtorsList.sort((a, b) => b.balance - a.balance).slice(0, 10);
      
      allDebtorsMap.current = debtorsMap;

      setStats((prev: any) => ({ 
        ...prev, 
        totalDebt: total, 
        activeCustomersCount: debtorsList.slice(0, 10).length,
        debtors: topDebtors
      }));
    }, (err) => {
      if (err.code === "permission-denied") return;
      console.error("Error en unsubDebtors:", err);
    });

    const qStock = query(collection(db, "products"), where("stock", "<=", 5));
    const unsubStock = onSnapshot(qStock, (snap) => {
      setStats((prev: any) => ({ ...prev, lowStockCount: snap.size }));
      setLowStockProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      if (err.code === "permission-denied") return;
      console.error("Error en unsubStock:", err);
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

    // Listener para ventas
    const unsubSales = onSnapshot(q, (snap) => {
      const sales = snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale));
      
      let total = 0;
      let cashOnly = 0;
      let card = 0;
      let digital = 0;
      let credit = 0;
      let costOfSoldItemsCount = 0;

      sales.forEach(sale => {
        total += sale.total || 0;
        if (sale.paymentMethod === "Cash") cashOnly += sale.total || 0;
        if (sale.paymentMethod === "Card") card += sale.total || 0;
        if (sale.paymentMethod === "Digital") digital += sale.total || 0;
        if (sale.paymentMethod === "Credit") {
          credit += sale.total || 0;
        }
        
        sale.items?.forEach((item: any) => {
          const cost = item.costPrice || 0;
          const qty = item.quantity || 0;
          costOfSoldItemsCount += cost * qty;
        });
      });
      
      setCostOfSoldItems(costOfSoldItemsCount);

      const enrichedSales = sales.map(sale => {
         if (sale.paymentMethod === "Credit") {
             const name = sale.customerName || (sale.debtorId ? allDebtorsMap.current[sale.debtorId] : null) || "Cliente Desconocido";
             return { ...sale, customerName: name, debtorName: name };
         }
         return sale;
      });

      setAllSales(enrichedSales);
      setRecentSales([...enrichedSales].sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate()).slice(0, 10));

      const enrichedCreditSales = enrichedSales
        .filter(s => s.paymentMethod === "Credit")
        .sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());
      
      setStats((prev: any) => ({ 
        ...prev, 
        cashReceived: cashOnly + card + digital,
        cashOnlyReceived: cashOnly,
        cardReceived: card,
        digitalReceived: digital,
        creditSales: credit,
        totalSales: total,
        recentCreditSales: enrichedCreditSales
      }));
    }, (err) => {
      if (err.code === "permission-denied") return;
      console.error("Error en unsubSales:", err);
    });

    let qPurchases = query(
      collection(db, "purchases"),
      where("createdAt", ">=", Timestamp.fromDate(start))
    );

    if (end) {
      qPurchases = query(qPurchases, where("createdAt", "<=", Timestamp.fromDate(end)));
    }

    const unsubPurchases = onSnapshot(qPurchases, (snap) => {
      let totalSpent = 0;
      snap.docs.forEach(doc => {
        totalSpent += doc.data().total || 0;
      });
      
      setTotalPurchaseExpense(totalSpent);
    }, (err) => {
      if (err.code === "permission-denied") return;
      console.error("Error en unsubPurchases:", err);
    });

    return () => {
      unsubSales();
      unsubPurchases();
    };
  }, [activeFilter, selectedDate]);

  useEffect(() => {
    setStats((prev: any) => ({
      ...prev,
      netProfit: prev.cashReceived - totalPurchaseExpense
    }));
  }, [totalPurchaseExpense, stats.cashReceived]);

  const chartData = useMemo(() => {
    const groups: Record<string, number> = {};
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

  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; quantity: number; revenue: number }> = {};
  
    allSales.forEach(sale => {
      sale.items?.forEach((item: any) => {
        const key = item.productId || item.id || item.name;
        const name = item.name || item.productName || "Sin nombre";
        const qty = item.quantity || 1;
        const subtotal = item.subtotal || (item.price * qty) || 0;
  
        if (!map[key]) map[key] = { name, quantity: 0, revenue: 0 };
        map[key].quantity += qty;
        map[key].revenue += subtotal;
      });
    });
  
    return Object.values(map)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 20);
  }, [allSales]);

  const filterLabel = activeFilter === "today" ? "Hoy" : 
                     activeFilter === "week" ? "Semana" : 
                     activeFilter === "month" ? "Mes" : "Seleccionado";

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] overflow-hidden">
      <Header />
      
      <main className="flex-grow p-6 sm:p-10 overflow-y-auto custom-scrollbar max-w-7xl mx-auto w-full space-y-10 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-900/10">
              <TrendingUp size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-slate-900">Dashboard</h1>
              <p className="text-slate-500 font-medium text-xs mt-0.5">Resumen operativo de VentaÁgil</p>
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

        <PushActivationCard />

        <StatsGrid 
          stats={stats} 
          filterLabel={filterLabel}
          lowStockProducts={lowStockProducts} 
          onViewSale={(sale: Sale) => setSelectedSale(sale)}
          details={{
            costOfSoldItems,
            totalPurchases: totalPurchaseExpense,
            totalSales: stats.totalSales || 0,
            totalReceived: stats.cashReceived || 0
          }}
          topProducts={topProducts}
        />

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
                      {(sale.customerName || sale.debtorName) && (
                        <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                          <span>{sale.customerName || sale.debtorName}</span>
                          {sale.createdAt?.toDate && (
                            <>
                              <span className="h-1 w-1 rounded-full bg-slate-300 inline-block"></span>
                              <span className="text-slate-400">{sale.createdAt.toDate().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                            </>
                          )}
                        </p>
                      )}
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
            </div>
          </div>
        </div>

        {/* Maintenance / Utilities */}
        <div className="pt-10 border-t border-slate-100">
          <div className="max-w-md">
            <h2 className="text-xl font-black tracking-tighter text-slate-900 mb-4 flex items-center gap-2">
              <Plus size={20} className="text-slate-400" />
              Utilidades de Sistema
            </h2>
            <RecalculatePopularity />
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
