"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { collection, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Header } from "@/components/layout/Header";
import { SaleDetailModal } from "@/components/admin/SaleDetailModal";
import { 
  Search, 
  History, 
  Banknote, 
  CreditCard, 
  ArrowRight, 
  Filter,
  ShoppingBag,
  Calendar,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadSalesCSV } from "@/lib/utils/exportUtils";

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

export default function ReportsPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const allDebtorsMap = useRef<Record<string, string>>({});

  useEffect(() => {
    const unsubDebtors = onSnapshot(collection(db, "debtors"), (snap) => {
      const debtorsMap: Record<string, string> = {};
      snap.docs.forEach(doc => {
        debtorsMap[doc.id] = doc.data().name || "Sin nombre";
      });
      allDebtorsMap.current = debtorsMap;
    });

    const q = query(collection(db, "sales"), orderBy("createdAt", "desc"));
    const unsubSales = onSnapshot(q, (snap) => {
      const salesData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale));
      
      const enrichedSales = salesData.map(sale => {
         if (sale.paymentMethod === "Credit") {
             const fallbackName = sale.debtorId ? allDebtorsMap.current[sale.debtorId] : null;
             const name = sale.customerName || fallbackName || "Cliente Desconocido";
             return { ...sale, customerName: name, debtorName: name };
         }
         return sale;
      });

      setSales(enrichedSales);
      setLoading(false);
    });
    
    return () => {
      unsubDebtors();
      unsubSales();
    };
  }, []);

  const filteredSales = useMemo(() => {
    return sales.filter(s => 
      s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.total.toString().includes(searchTerm)
    );
  }, [sales, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 lg:pb-0">
      <Header title="Reportes" />

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Search & Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-10">
          <div className="relative flex-grow group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors" size={20} />
            <input 
              type="text"
              placeholder="Buscar por ID, monto o método..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-5 bg-white border border-slate-100 rounded-[2rem] shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all font-medium text-slate-900 placeholder:text-slate-300"
            />
          </div>
          <button 
            onClick={() => downloadSalesCSV(filteredSales, "reporte_general")}
            className="px-8 py-5 bg-slate-900 text-white rounded-[2rem] shadow-xl shadow-slate-900/10 flex items-center justify-center gap-3 hover:bg-slate-800 transition-all font-black uppercase tracking-widest text-[10px]"
          >
            <Download size={18} />
            Descargar
          </button>
          <button className="px-8 py-5 bg-white border border-slate-100 rounded-[2rem] shadow-sm flex items-center justify-center gap-3 text-slate-400 hover:text-slate-900 transition-all font-black uppercase tracking-widest text-[10px]">
            <Filter size={18} />
            Filtros
          </button>
        </div>

        {/* Sales List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-4 mb-6">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <History size={16} /> Historial de Ventas
            </h3>
            <span className="px-4 py-2 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">
              {filteredSales.length} Registros
            </span>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center gap-4 opacity-50">
              <div className="h-10 w-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cargando historial...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredSales.map((sale) => (
                <button 
                  key={sale.id}
                  onClick={() => setSelectedSale(sale)}
                  className="w-full bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group active:scale-[0.98] text-left"
                >
                  <div className="flex items-center gap-5">
                    <div className={cn(
                      "h-14 w-14 rounded-2xl flex items-center justify-center transition-colors shadow-sm",
                      sale.paymentMethod === "Cash" ? "bg-emerald-50 text-emerald-600" :
                      sale.paymentMethod === "Credit" ? "bg-rose-50 text-rose-600" : "bg-sky-50 text-sky-600"
                    )}>
                      {sale.paymentMethod === "Cash" ? <Banknote size={24} /> : 
                       sale.paymentMethod === "Credit" ? <History size={24} /> : <CreditCard size={24} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                         <p className="text-lg font-black text-slate-900">${sale.total.toLocaleString("es-CO")}</p>
                         <span className="px-2 py-0.5 bg-slate-50 rounded-md text-[9px] font-black text-slate-300 uppercase tracking-tighter">
                           ID: {sale.id.slice(-6).toUpperCase()}
                         </span>
                      </div>
                      <div className="flex flex-col gap-1 mb-2">
                        <p className="text-[10px] font-bold text-slate-500 truncate max-w-md">
                          {sale.items.map(item => item.name).join(", ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                           <Calendar size={10} /> 
                           {sale.createdAt?.toDate ? sale.createdAt.toDate().toLocaleDateString("es-CO") : "Fecha desconocida"}
                         </p>
                         <span className="h-1 w-1 rounded-full bg-slate-200"></span>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                           <ShoppingBag size={10} /> 
                           {sale.items.length} items
                         </p>
                      </div>
                    </div>
                  </div>
                  <div className="h-12 w-12 bg-slate-50 group-hover:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-200 group-hover:text-white transition-all shadow-sm">
                    <ArrowRight size={20} />
                  </div>
                </button>
              ))}

              {filteredSales.length === 0 && !loading && (
                <div className="py-20 bg-white rounded-[3rem] border border-dashed border-slate-200 flex flex-col items-center text-center">
                  <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <Search size={40} className="text-slate-200" />
                  </div>
                  <h4 className="text-lg font-black text-slate-900 tracking-tight mb-2">No se encontraron ventas</h4>
                  <p className="text-slate-400 text-sm max-w-[200px]">Intenta buscar por otro criterio o asegúrate de tener ventas registradas.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <SaleDetailModal 
        isOpen={!!selectedSale}
        sale={selectedSale}
        onClose={() => setSelectedSale(null)}
      />
    </div>
  );
}
