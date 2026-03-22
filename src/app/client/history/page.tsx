"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { db } from "@/lib/firebase/config";
import { collection, query, where, onSnapshot, getDoc, doc, Timestamp } from "firebase/firestore";
import { Header } from "@/components/layout/Header";
import { Loader2, Calendar, ShoppingBag, ArrowUpRight, TrendingDown, Search, Download, UtensilsCrossed, HandCoins, Car, HeartPulse, Home, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import jsPDF from "jspdf";
import "jspdf-autotable";

// We extend jsPDF with autoTable type for TypeScript
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface Transaction {
  id: string;
  type: "sale" | "payment" | "order";
  amount: number;
  date: any;
  description?: string;
  saleId?: string;
  paymentMethod?: string;
  status?: string;
}

interface PersonalExpense {
  id: string;
  userId: string;
  title: string;
  amount: number;
  category: string;
  description: string;
  personName?: string;
  date: Timestamp;
}

export default function ClientHistoryPage() {
  const { user } = useAuthStore();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [personalExpenses, setPersonalExpenses] = useState<PersonalExpense[]>([]);
  const [debtor, setDebtor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // "YYYY-MM"
  );
  const [activeTab, setActiveTab] = useState<"movimientos" | "gastos" | "reporte">("movimientos");

  // Load Data
  useEffect(() => {
    if (!user?.cedula || !user?.uid) {
      setLoading(false);
      return;
    }

    // Debtor Listener
    const qDebtor = query(collection(db, "debtors"), where("cedula", "==", user.cedula));
    const unsubscribeDebtor = onSnapshot(qDebtor, (snap) => {
      if (!snap.empty) {
        const dDoc = snap.docs[0];
        setDebtor({ id: dDoc.id, ...dDoc.data() });

        let currentSales: Transaction[] = [];
        let currentPayments: Transaction[] = [];
        let currentOrders: Transaction[] = [];

        const updateTransactionsState = () => {
          const merged: Transaction[] = [...currentSales, ...currentOrders];
          currentPayments.forEach(pt => {
            if (pt.type === "payment") {
              merged.push(pt);
            } else if (pt.type === "sale") {
              const exists = merged.find(s => s.id === pt.saleId);
              if (!exists) merged.push(pt);
            }
          });

          merged.sort((a, b) => {
            const dateA = a.date?.seconds || 0;
            const dateB = b.date?.seconds || 0;
            return dateB - dateA;
          });
          setTransactions(merged);
        };

        const unsubSales = onSnapshot(query(collection(db, "sales"), where("debtorId", "==", dDoc.id)), (tSnap) => {
          currentSales = tSnap.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              type: "sale" as const,
              amount: data.total,
              date: data.createdAt,
              saleId: doc.id,
              paymentMethod: data.paymentMethod
            };
          });
          updateTransactionsState();
        });

        const unsubTrans = onSnapshot(query(collection(db, "debtor_transactions"), where("debtorId", "==", dDoc.id)), (tSnap) => {
          currentPayments = tSnap.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              type: data.type as "sale" | "payment",
              amount: data.amount,
              date: data.date,
              saleId: data.saleId,
              description: data.description,
              paymentMethod: data.type === "sale" ? "credit" : undefined
            };
          });
          updateTransactionsState();
          setLoading(false);
        });

        const unsubOrders = onSnapshot(
          query(collection(db, "orders"), where("clientId", "==", user.uid), where("status", "==", "confirmed")),
          (snap) => {
            currentOrders = snap.docs.map(d => {
              const data = d.data();
              return {
                id: d.id,
                type: "order" as const,
                amount: data.total || 0,
                date: data.confirmedAt || data.createdAt,
                description: `Pedido #${d.id.slice(0, 6).toUpperCase()} — ${data.items?.length || 0} productos`,
                paymentMethod: data.paymentMethod || "Cash",
                status: "confirmed"
              };
            });
            updateTransactionsState();
            setLoading(false);
          },
          (err) => {
            if (err.code === "permission-denied") return;
            console.error("Error en orders listener:", err);
          }
        );

        return () => {
          unsubSales();
          unsubTrans();
          unsubOrders();
        };
      } else {
        setDebtor(null);
        setLoading(false);
      }
    });

    // Personal Expenses Listener
    const unsubExpenses = onSnapshot(query(collection(db, "personal_expenses"), where("userId", "==", user.uid)), (snap) => {
      const expensesData = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PersonalExpense[];
      
      expensesData.sort((a, b) => {
        const dateA = a.date?.seconds || 0;
        const dateB = b.date?.seconds || 0;
        return dateB - dateA;
      });
      setPersonalExpenses(expensesData);
    });

    return () => {
      unsubscribeDebtor();
      unsubExpenses();
    };
  }, [user]);

  // Derived filtered data
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tr => {
      const date = tr.date?.seconds ? new Date(tr.date.seconds * 1000) : null;
      let dateString = '';
      if (date) {
        // Debemos usar el mes local o UTC? Usamos UTC string para que coincida con YYYY-MM
        dateString = date.toISOString().slice(0, 7);
      }
      const matchMonth = dateString ? dateString === selectedMonth : true;
      const matchSearch = searchQuery
        ? tr.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tr.amount.toString().includes(searchQuery) ||
          tr.type.includes(searchQuery.toLowerCase())
        : true;
      return matchMonth && matchSearch;
    });
  }, [transactions, selectedMonth, searchQuery]);

  const filteredExpenses = useMemo(() => {
    return personalExpenses.filter(exp => {
      const date = exp.date?.seconds ? new Date(exp.date.seconds * 1000) : null;
      let dateString = '';
      if (date) {
        dateString = date.toISOString().slice(0, 7);
      }
      const matchMonth = dateString ? dateString === selectedMonth : true;
      const matchSearch = searchQuery
        ? exp.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          exp.description?.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      return matchMonth && matchSearch;
    });
  }, [personalExpenses, selectedMonth, searchQuery]);

  // Derived summaries for Movimientos
  const purchaseCount = useMemo(() => filteredTransactions.filter(t => t.type === 'sale').length, [filteredTransactions]);
  const paymentCount = useMemo(() => filteredTransactions.filter(t => t.type === 'payment').length, [filteredTransactions]);
  const orderCount = useMemo(() => filteredTransactions.filter(t => t.type === 'order').length, [filteredTransactions]);

  // Derived summaries for Gastos
  const expensesTotal = useMemo(() => filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0), [filteredExpenses]);

  // Report logic
  const reportDataObj = useMemo(() => {
    const weeks: Record<string, { deudas: number; gastos: number }> = {
      "Sem 1": { deudas: 0, gastos: 0 },
      "Sem 2": { deudas: 0, gastos: 0 },
      "Sem 3": { deudas: 0, gastos: 0 },
      "Sem 4": { deudas: 0, gastos: 0 },
    };

    let sumDeudas = 0;
    let sumGastos = 0;

    // Sólo consideramos transacciones de crédito como deudas para el mes (ventas a crédito)
    filteredTransactions.forEach(t => {
      if (t.type === 'sale' && (t.paymentMethod?.toLowerCase() === 'credit' || !t.paymentMethod)) {
        sumDeudas += t.amount;
        if (t.date?.seconds) {
          const day = new Date(t.date.seconds * 1000).getDate();
          if (day <= 7) weeks["Sem 1"].deudas += t.amount;
          else if (day <= 14) weeks["Sem 2"].deudas += t.amount;
          else if (day <= 21) weeks["Sem 3"].deudas += t.amount;
          else weeks["Sem 4"].deudas += t.amount;
        }
      }
    });

    filteredExpenses.forEach(exp => {
      sumGastos += exp.amount;
      if (exp.date?.seconds) {
        const day = new Date(exp.date.seconds * 1000).getDate();
        if (day <= 7) weeks["Sem 1"].gastos += exp.amount;
        else if (day <= 14) weeks["Sem 2"].gastos += exp.amount;
        else if (day <= 21) weeks["Sem 3"].gastos += exp.amount;
        else weeks["Sem 4"].gastos += exp.amount;
      }
    });

    return { 
      data: Object.entries(weeks).map(([week, vals]) => ({ week, ...vals })),
      sumDeudas,
      sumGastos
    };
  }, [filteredTransactions, filteredExpenses]);

  const handleDownloadPDF = () => {
    try {
      const pdf = new jsPDF();
      
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.text("Estado de Cuenta", 20, 20);
      
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      if (user?.name) pdf.text(`Cliente: ${user.name}`, 20, 30);
      pdf.text(`Documento: ${user?.cedula || ""}`, 20, 36);
      pdf.text(`Mes: ${selectedMonth}`, 20, 42);

      let currentY = 50;

      // Sección 1 - Movimientos
      if (filteredTransactions.length > 0) {
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("Movimientos Registrados", 20, currentY);
        currentY += 5;

        const tableData = filteredTransactions.map(tr => {
          const date = tr.date?.seconds ? new Date(tr.date.seconds * 1000).toLocaleDateString("es-CO") : "";
          const type = tr.type === "sale" ? "Compra" : "Abono";
          const method = tr.type === "sale" 
            ? (tr.paymentMethod?.toLowerCase() === 'credit' ? 'Crédito' : 
               tr.paymentMethod === 'Cash' ? 'Efectivo' : 
               tr.paymentMethod === 'Card' ? 'Tarjeta' : 
               tr.paymentMethod === 'Digital' ? 'Digital' : 'Contado') 
            : 'Efectivo';
          return [date, type, method, `$${tr.amount.toLocaleString("es-CO")}`];
        });

        pdf.autoTable({
          startY: currentY,
          head: [['Fecha', 'Tipo', 'Método', 'Monto']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [4, 120, 87] }, // emerald-700
        });

        currentY = (pdf as any).lastAutoTable.finalY + 15;
      }

      // Sección 2 - Gastos
      if (filteredExpenses.length > 0) {
        if (currentY > 250) {
          pdf.addPage();
          currentY = 20;
        }

        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("Gastos Personales", 20, currentY);
        currentY += 5;

        const tableData = filteredExpenses.map(exp => {
          const date = exp.date?.seconds ? new Date(exp.date.seconds * 1000).toLocaleDateString("es-CO") : "";
          return [date, exp.title || "Gasto general", exp.category, `$${exp.amount.toLocaleString("es-CO")}`];
        });

        pdf.autoTable({
          startY: currentY,
          head: [['Fecha', 'Título', 'Categoría', 'Monto']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [139, 92, 246] }, // violet-500
        });

        currentY = (pdf as any).lastAutoTable.finalY + 20;
      }

      // Totales
      if (currentY > 250) {
        pdf.addPage();
        currentY = 20;
      }

      currentY += 10;
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Resumen del Mes", 20, currentY);
      
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      currentY += 10;
      pdf.text(`Deuda sumada en el mes: $${reportDataObj.sumDeudas.toLocaleString("es-CO")}`, 20, currentY);
      currentY += 8;
      pdf.text(`Total gastos en el mes: $${reportDataObj.sumGastos.toLocaleString("es-CO")}`, 20, currentY);
      currentY += 8;
      pdf.setFont("helvetica", "bold");
      pdf.text(`Deuda Pendiente Actual: $${(debtor?.totalDebt || 0).toLocaleString("es-CO")}`, 20, currentY);

      pdf.save(`estado-cuenta-${selectedMonth}.pdf`);
    } catch (e) {
      console.error("Error generating PDF:", e);
      alert("Hubo un problema generando el PDF. Revisa la consola.");
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Comida': return <UtensilsCrossed size={20} />;
      case 'Deudas': return <HandCoins size={20} />;
      case 'Transporte': return <Car size={20} />;
      case 'Salud': return <HeartPulse size={20} />;
      case 'Hogar': return <Home size={20} />;
      default: return <Receipt size={20} />;
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500 w-10 h-10" />
      </div>
    );
  }

  // Si no está registrado
  if (!user.cedula) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col pb-28">
        <Header title="Historial" />
        <main className="flex-grow flex items-center justify-center p-6 text-center">
            <p className="text-slate-500 font-medium">Por favor, completa tu perfil en Tu Cuenta para acceder al historial.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col pb-28">
      <Header title="Historial" />
      <main className="flex-grow p-4 sm:p-8 flex flex-col max-w-4xl mx-auto w-full space-y-6">
        
        {/* 1. CONTROLES SUPERIORES */}
        <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-3xl shadow-sm border border-slate-100 animate-in fade-in duration-300">
          {/* Buscador */}
          <div className="flex-grow relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-slate-900 placeholder:text-slate-400"
              placeholder="Buscar por descripción..."
            />
          </div>
          {/* Selector de mes */}
          <div className="relative shrink-0 flex items-center">
            <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              max={new Date().toISOString().slice(0, 7)}
              className="w-full sm:w-auto pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-900 cursor-pointer h-full"
            />
          </div>
        </div>

        {/* 2. TABS */}
        <div className="flex bg-slate-200/50 p-1.5 rounded-2xl overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab('movimientos')}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all relative shrink-0",
              activeTab === 'movimientos' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Movimientos
          </button>
          <button
            onClick={() => setActiveTab('gastos')}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all relative shrink-0",
              activeTab === 'gastos' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Mis Gastos
          </button>
          <button
            onClick={() => setActiveTab('reporte')}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all relative shrink-0",
              activeTab === 'reporte' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Reporte
          </button>
        </div>

        {/* 3. CONTENIDO SEGÚN TAB ACTIVO */}
        <div className="animate-in fade-in duration-300">
          
          {/* TAB MOVIMIENTOS */}
          {activeTab === 'movimientos' && (
            <div className="bg-white rounded-[2rem] sm:rounded-[3rem] border border-slate-100 shadow-sm p-5 sm:p-8">
              
              <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Registro de Movimientos</h3>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-red-50 text-red-600 rounded-xl font-bold text-xs">{purchaseCount} compras</span>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-xs">{paymentCount} abonos</span>
                  {orderCount > 0 && <span className="px-3 py-1 bg-violet-50 text-violet-600 rounded-xl font-bold text-xs">{orderCount} pedidos</span>}
                </div>
              </div>

              <div className="space-y-4">
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingDown size={40} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-slate-400 font-bold text-sm">Sin movimientos en este período.</p>
                  </div>
                ) : (
                  filteredTransactions.map(tr => (
                    <div 
                      key={tr.id} 
                      className="flex items-center justify-between p-4 sm:p-5 rounded-[2rem] hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-12 w-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shrink-0",
                          tr.type === "order"
                            ? "bg-violet-50 text-violet-600"
                            : tr.type === "sale" 
                              ? (tr.paymentMethod?.toLowerCase() === 'credit' ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-500") 
                              : "bg-emerald-50 text-emerald-600"
                        )}>
                          {tr.type === "order" ? (
                            <ShoppingBag size={20} />
                          ) : tr.type === "sale" ? (
                            tr.paymentMethod?.toLowerCase() === 'credit' ? <ArrowUpRight size={20} /> : <ShoppingBag size={20} />
                          ) : (
                            <TrendingDown size={20} />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">
                            {tr.type === "order" ? "Pedido Confirmado" : tr.type === "sale" ? "Nueva Compra" : "Pago Realizado"}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Calendar size={10} />
                            {tr.date?.seconds 
                              ? new Date(tr.date.seconds * 1000).toLocaleDateString("es-CO", { day: '2-digit', month: 'short', year: 'numeric' }) 
                              : 'Reciente'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end shrink-0 pl-2">
                        <p className={cn(
                          "text-lg sm:text-xl font-black tracking-tighter leading-none",
                          tr.type === "order"
                            ? "text-violet-600"
                            : tr.type === "sale" 
                              ? (tr.paymentMethod?.toLowerCase() === 'credit' ? "text-red-500" : "text-slate-700") 
                              : "text-emerald-500"
                        )}>
                          {tr.type === "order" ? "" : tr.type === "sale" ? (tr.paymentMethod?.toLowerCase() === 'credit' ? "+" : "") : "-"}${tr.amount.toLocaleString("es-CO")}
                        </p>
                        <div className="mt-1.5 flex flex-col items-end">
                          <p className="text-[10px] font-medium text-slate-400">
                            {tr.type === "order"
                              ? tr.description
                              : tr.type === "sale" 
                                ? (tr.paymentMethod?.toLowerCase() === 'credit' ? 'Compra a crédito' : 
                                   tr.paymentMethod === 'Cash' ? 'Compra en efectivo' : 
                                   tr.paymentMethod === 'Card' ? 'Pago con tarjeta' : 
                                   tr.paymentMethod === 'Digital' ? 'Pago digital' : 'Compra al contado') 
                                : 'Abono a deuda'}
                          </p>
                          {tr.type !== "order" && tr.description && tr.description.toLowerCase() !== 'abono a deuda' && (
                            <p className="text-[10px] font-medium text-slate-400 max-w-[150px] truncate mt-0.5">{tr.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB GASTOS */}
          {activeTab === 'gastos' && (
            <div className="bg-white rounded-[2rem] sm:rounded-[3rem] border border-slate-100 shadow-sm p-5 sm:p-8">
              
              <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Registro de Gastos</h3>
                <span className="px-4 py-2 bg-violet-50 text-violet-600 rounded-xl font-bold text-sm">
                  💸 Total gastado: ${expensesTotal.toLocaleString("es-CO")}
                </span>
              </div>

              <div className="space-y-4">
                {filteredExpenses.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt size={40} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-slate-400 font-bold text-sm">Sin gastos registrados en este período.</p>
                  </div>
                ) : (
                  filteredExpenses.map(expense => (
                    <div 
                      key={expense.id}
                      className="flex items-center justify-between p-4 sm:p-5 rounded-[2rem] bg-slate-50/50 border border-slate-100 relative group overflow-hidden"
                    >
                      <div className="flex items-center gap-4 relative z-10 w-full">
                        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                          {getCategoryIcon(expense.category)}
                        </div>
                        <div className="flex-grow min-w-0 pr-4">
                          <h4 className="font-black text-slate-900 text-sm sm:text-base truncate">
                            {expense.title || expense.category}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            {expense.category === 'Deudas' && expense.personName && (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-md text-[10px] font-bold">
                                A: {expense.personName}
                              </span>
                            )}
                            <p className="text-xs font-medium text-slate-500 line-clamp-1">{expense.description}</p>
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 mt-1.5 flex items-center gap-1.5">
                            <Calendar size={10} />
                            {expense.date?.seconds ? new Date(expense.date.seconds * 1000).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Reciente'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg sm:text-xl font-black text-slate-900 tracking-tighter">
                            ${expense.amount.toLocaleString("es-CO")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB REPORTE */}
          {activeTab === 'reporte' && (
            <div className="bg-white rounded-[2rem] sm:rounded-[3rem] border border-slate-100 shadow-sm p-5 sm:p-8">
              
              <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Reporte Financiero</h3>
                  <p className="text-sm text-slate-500 font-medium">Comparativa de compras a crédito y gastos</p>
                </div>
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-4 py-2 rounded-xl font-bold transition-colors"
                >
                  <Download size={18} />
                  <span className="hidden sm:inline">Descargar estado de cuenta</span>
                  <span className="sm:hidden">PDF</span>
                </button>
              </div>

              {/* Chart */}
              <div style={{ width: "100%", minHeight: 260 }} className="mb-10">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={reportDataObj.data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b", fontWeight: 600 }} dy={10} />
                    <YAxis 
                      hide
                    />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any, name: any) => [`$${Number(value).toLocaleString()}`, name]}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px", fontSize: "12px", fontWeight: "bold" }} />
                    <Bar name="Deudas" dataKey="deudas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    <Bar name="Gastos Personales" dataKey="gastos" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100">
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Deuda sumada mes</p>
                  <p className="text-2xl font-black text-rose-600">${reportDataObj.sumDeudas.toLocaleString("es-CO")}</p>
                </div>
                <div className="bg-violet-50 p-5 rounded-2xl border border-violet-100">
                  <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest mb-1">Gastos mes</p>
                  <p className="text-2xl font-black text-violet-600">${reportDataObj.sumGastos.toLocaleString("es-CO")}</p>
                </div>
                <div className="bg-slate-100 p-5 rounded-2xl border border-slate-200">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Combinado</p>
                  <p className="text-2xl font-black text-slate-700">${(reportDataObj.sumDeudas + reportDataObj.sumGastos).toLocaleString("es-CO")}</p>
                </div>
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}
