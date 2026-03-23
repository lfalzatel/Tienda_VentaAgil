"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, query, where, Timestamp, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Header } from "@/components/layout/Header";
import { Wallet, Plus, ShoppingBag, History, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PurchaseModal } from "@/components/admin/PurchaseModal";
import { PurchaseStatsGrid } from "@/components/admin/PurchaseStatsGrid";
import { PurchaseChart } from "@/components/admin/PurchaseChart";
import { PurchaseDetailModal } from "@/components/admin/PurchaseDetailModal";
import { DashboardControls, TimeFilter } from "@/components/admin/DashboardControls";
import { SalesCalendarModal } from "@/components/admin/SalesCalendarModal";
import { downloadPurchasesCSV } from "@/lib/utils/exportUtils";

interface Purchase {
  id: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    costPrice: number;
    total: number;
  }[];
  total: number;
  createdAt: any;
}

export default function PurchasesPage() {
  const [activeFilter, setActiveFilter] = useState<TimeFilter>("today");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [stats, setStats] = useState({
    totalSpent: 0,
    totalItems: 0,
    activeDays: 0,
    avgPurchase: 0,
  });
  
  const [allPurchases, setAllPurchases] = useState<Purchase[]>([]);
  const [recentPurchases, setRecentPurchases] = useState<Purchase[]>([]);

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
      collection(db, "purchases"),
      where("createdAt", ">=", Timestamp.fromDate(start)),
      orderBy("createdAt", "desc")
    );

    if (end) {
      q = query(q, where("createdAt", "<=", Timestamp.fromDate(end)));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const purchaseData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Purchase[];
      
      let total = 0;
      let items = 0;
      const days = new Set();
      
      purchaseData.forEach(p => {
        total += p.total || 0;
        const purchaseItemsCount = p.items?.reduce((acc, item) => acc + (item.quantity || 0), 0) || 0;
        items += purchaseItemsCount;
        if (p.createdAt) {
          days.add(p.createdAt.toDate().toLocaleDateString());
        }
      });

      setAllPurchases(purchaseData);
      setRecentPurchases(purchaseData.slice(0, 10));
      setStats({
        totalSpent: total,
        totalItems: items,
        activeDays: days.size,
        avgPurchase: purchaseData.length > 0 ? total / purchaseData.length : 0,
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [activeFilter, selectedDate]);

  const chartData = useMemo(() => {
    const groups: Record<string, number> = {};
    const sorted = [...allPurchases].sort((a, b) => a.createdAt.toDate().getTime() - b.createdAt.toDate().getTime());

    sorted.forEach(p => {
      const date = p.createdAt.toDate();
      const label = activeFilter === "today" || activeFilter === "custom"
        ? date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
      
      groups[label] = (groups[label] || 0) + p.total;
    });

    return Object.entries(groups).map(([date, total]) => ({ date, total }));
  }, [allPurchases, activeFilter]);

  const filterLabel = activeFilter === "today" ? "Hoy" : 
                     activeFilter === "week" ? "Semana" : 
                     activeFilter === "month" ? "Mes" : "Seleccionado";

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] overflow-hidden text-slate-900">
      <Header />
      
      <main className="flex-grow p-6 sm:p-10 overflow-y-auto custom-scrollbar max-w-7xl mx-auto w-full space-y-10 pb-20">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/10">
              <Wallet size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-slate-900 leading-none">Compras</h1>
              <p className="text-slate-500 font-medium text-xs mt-0.5">Dashboard de abastecimiento y gastos</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <DashboardControls 
              activeFilter={activeFilter}
              onFilterChange={(f) => {
                setActiveFilter(f);
                setSelectedDate(undefined);
              }}
              onOpenCalendar={() => setIsCalendarOpen(true)}
              onDownloadReport={() => downloadPurchasesCSV(allPurchases, activeFilter)}
              selectedDate={selectedDate}
            />
            <button
              onClick={() => setIsPurchaseModalOpen(true)}
              className="group relative flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-900/20"
            >
              <Plus size={16} />
              Registrar Compra
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <PurchaseStatsGrid stats={stats} filterLabel={filterLabel} />

        {/* Charts & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            <PurchaseChart data={chartData} />
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
                {allPurchases.length} Compras
              </span>
            </div>

            <div className="flex-grow space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              {recentPurchases.map((p) => (
                <button 
                  key={p.id} 
                  onClick={() => setSelectedPurchase(p)}
                  className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-all group border border-transparent hover:border-slate-100 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-11 w-11 rounded-2xl flex items-center justify-center bg-emerald-50 text-emerald-600 shadow-sm">
                      <ShoppingBag size={20} />
                    </div>
                    <div>
                      <p className="text-base font-black text-slate-900">$${(p.total ?? 0).toLocaleString("es-CO")}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <span className="truncate max-w-[120px]">
                          {p.items?.length > 1 
                            ? `${p.items[0].productName} +${p.items.length - 1}` 
                            : p.items?.[0]?.productName || "Sin productos"}
                        </span>
                        <span className="h-1 w-1 rounded-full bg-slate-200"></span>
                        <span>{p.items?.reduce((acc, item) => acc + item.quantity, 0) || 0} uds</span>
                      </p>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-slate-200 group-hover:text-slate-900 transition-colors" />
                </button>
              ))}
              
              {!isLoading && recentPurchases.length === 0 && (
                <div className="py-20 text-center opacity-30 select-none flex flex-col items-center">
                   <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                     <ShoppingBag size={40} className="text-slate-300" />
                   </div>
                   <p className="font-black text-sm text-slate-500 uppercase tracking-widest">Sin compras en este rango</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <PurchaseModal 
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
      />

      <SalesCalendarModal 
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        onSelectDate={(date) => {
          setSelectedDate(date);
          setActiveFilter("custom");
        }}
        collectionName="purchases"
        title="Compras por Día"
      />

      <PurchaseDetailModal 
        isOpen={!!selectedPurchase}
        purchase={selectedPurchase}
        onClose={() => setSelectedPurchase(null)}
      />
    </div>
  );
}
