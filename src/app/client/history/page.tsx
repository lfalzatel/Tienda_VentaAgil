"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { db } from "@/lib/firebase/config";
import { collection, query, where, onSnapshot, getDoc, getDocs, setDoc, updateDoc, doc, Timestamp, serverTimestamp, addDoc, deleteDoc } from "firebase/firestore";
import { Header } from "@/components/layout/Header";
import { Loader2, Calendar, ShoppingBag, ArrowUpRight, TrendingDown, Search, Download, UtensilsCrossed, HandCoins, Car, HeartPulse, Home, Receipt, Plus, X, Pencil, Trash2, CreditCard, Phone, Wallet, Ban, Info } from "lucide-react";
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
  items?: any[];
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
  items?: any[];
  orderId?: string;
  paymentMethod?: string;
}

export default function ClientHistoryPage() {
  const { user, setUser } = useAuthStore();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [personalExpenses, setPersonalExpenses] = useState<PersonalExpense[]>([]);
  const [debtor, setDebtor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal Detail State
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // "YYYY-MM"
  );
  const [activeTab, setActiveTab] = useState<"movimientos" | "gastos" | "reporte">("movimientos");

  // Mis Gastos State
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    category: 'Comida',
    description: '',
    personName: '',
    date: new Date().toLocaleDateString('en-CA')
  });

  // Onboarding state
  const [cedulaInput, setCedulaInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
              paymentMethod: data.paymentMethod,
              items: data.items
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
                status: "confirmed",
                items: data.items
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

  // Actions
  const handleOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cedulaInput || !user) return;
    setIsSubmitting(true);

    try {
      const q = query(collection(db, "debtors"), where("cedula", "==", cedulaInput));
      const snap = await getDocs(q);
      
      let debtorId = "";
      if (snap.empty) {
        const newRef = doc(collection(db, "debtors"));
        await setDoc(newRef, {
          name: user.name || "Cliente Desconocido",
          email: user.email,
          cedula: cedulaInput,
          phone: phoneInput,
          totalDebt: 0,
          createdAt: serverTimestamp()
        });
        debtorId = newRef.id;
      } else {
        debtorId = snap.docs[0].id;
        await updateDoc(doc(db, "debtors", debtorId), { 
          email: user.email 
        });
      }

      await setDoc(doc(db, "users", user.uid), {
        cedula: cedulaInput,
        phone: phoneInput || null,
        email: user.email,
      }, { merge: true });

      setUser({ ...user, cedula: cedulaInput });
    } catch (error) {
      console.error("Error linking identity:", error);
      alert("Hubo un error al guardar tu perfil.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !expenseForm.title || !expenseForm.amount || !expenseForm.category || !expenseForm.date) return;

    setIsSavingExpense(true);
    try {
      const [year, month, day] = expenseForm.date.split('-').map(Number);
      const localDate = new Date(year, month - 1, day, 12, 0, 0);

      const expenseData: any = {
        userId: user.uid,
        title: expenseForm.title,
        amount: Number(expenseForm.amount),
        category: expenseForm.category,
        description: expenseForm.description,
        date: Timestamp.fromDate(localDate)
      };

      if (expenseForm.category === 'Deudas' && expenseForm.personName) {
        expenseData.personName = expenseForm.personName;
      } else {
        expenseData.personName = "";
      }

      if (editingExpenseId) {
        await updateDoc(doc(db, "personal_expenses", editingExpenseId), expenseData);
      } else {
        expenseData.createdAt = serverTimestamp();
        await addDoc(collection(db, "personal_expenses"), expenseData);
      }
      
      setIsAddExpenseOpen(false);
      setEditingExpenseId(null);
      setExpenseForm({
        title: '',
        amount: '',
        category: 'Comida',
        description: '',
        personName: '',
        date: new Date().toLocaleDateString('en-CA')
      });
    } catch (error) {
      console.error("Error al guardar el gasto:", error);
      alert("Hubo un error al registrar el gasto.");
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleEditExpense = (expense: PersonalExpense) => {
    let dateStr = new Date().toLocaleDateString('en-CA');
    if (expense.date?.seconds) {
      const d = new Date(expense.date.seconds * 1000);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dateStr = `${yyyy}-${mm}-${dd}`;
    }
    
    setExpenseForm({
      title: expense.title || '',
      amount: expense.amount.toString(),
      category: expense.category,
      description: expense.description || '',
      personName: expense.personName || '',
      date: dateStr
    });
    setEditingExpenseId(expense.id);
    setIsAddExpenseOpen(true);
  };

  const handleDeleteExpense = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("¿Seguro que deseas eliminar este gasto? Esta acción no se puede deshacer.")) return;
    try {
      await deleteDoc(doc(db, "personal_expenses", id));
    } catch (error) {
      console.error("Error eliminando gasto:", error);
      alert("Hubo un error al eliminar el gasto.");
    }
  };

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
          return [date, type, method, `$${(tr.amount ?? 0).toLocaleString("es-CO")}`];
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
          return [date, exp.title || "Gasto general", exp.category, `$${(exp.amount ?? 0).toLocaleString("es-CO")}`];
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
      pdf.text(`Deuda sumada en el mes: $${(reportDataObj.sumDeudas ?? 0).toLocaleString("es-CO")}`, 20, currentY);
      currentY += 8;
      pdf.text(`Total gastos en el mes: $${(reportDataObj.sumGastos ?? 0).toLocaleString("es-CO")}`, 20, currentY);
      currentY += 8;
      pdf.setFont("helvetica", "bold");
      pdf.text(`Deuda Pendiente Actual: $${(debtor?.totalDebt ?? 0).toLocaleString("es-CO")}`, 20, currentY);

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
      <div className="min-h-screen bg-[#f8fafc] flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center p-6 pb-28">
          <div className="max-w-md w-full bg-white rounded-[3rem] p-8 shadow-xl shadow-emerald-900/5 animate-in slide-in-from-bottom-5 duration-500">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
                <CreditCard size={32} />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Completa tu Perfil</h1>
              <p className="text-sm text-slate-500 mt-2 font-medium">
                Para mostrarte tu historial de compras y saldo pendiente, necesitamos identificarte.
              </p>
            </div>

            <form onSubmit={handleOnboarding} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cédula / Documento <span className="text-red-500">*</span></label>
                <div className="relative group">
                  <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                  <input
                    required
                    type="number"
                    value={cedulaInput}
                    onChange={(e) => setCedulaInput(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-900 placeholder:text-slate-400"
                    placeholder="1234567890"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Celular / WhatsApp <span className="text-slate-300">(Opcional)</span></label>
                <div className="relative group">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-900 placeholder:text-slate-400"
                    placeholder="300 000 0000"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !cedulaInput}
                className="w-full mt-6 py-4 bg-emerald-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all flex justify-center items-center gap-2"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : "Vincular mi perfil"}
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col pb-28">
      <Header title="Historial" />
      <main className="flex-grow p-4 sm:p-8 flex flex-col max-w-4xl mx-auto w-full space-y-6">
        
        {/* Resumen Card (Dinámica y Compacta) */}
        <div className="bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 shadow-xl shadow-slate-900/10 text-white relative overflow-hidden animate-in fade-in duration-500">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center sm:items-end gap-4 text-center sm:text-left">
            <div className="w-full sm:w-auto">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">
                {activeTab === 'movimientos' ? `Hola, ${user.name?.split(' ')[0]}` : activeTab === 'gastos' ? 'Tus Gastos' : 'Tu Resumen'}
              </p>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tighter leading-tight">
                $
                {activeTab === 'movimientos' 
                  ? (debtor?.totalDebt || 0).toLocaleString("es-CO")
                  : activeTab === 'gastos'
                    ? (expensesTotal || 0).toLocaleString("es-CO")
                    : (reportDataObj.sumDeudas + reportDataObj.sumGastos).toLocaleString("es-CO")
                }
              </h2>
              <p className="text-[10px] font-medium text-slate-400 mt-1">
                {activeTab === 'movimientos' ? 'Saldo total pendiente a la fecha' : activeTab === 'gastos' ? 'Inversión personal en este período' : 'Suma de deudas y gastos del mes'}
              </p>
            </div>
            
            <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 flex items-center gap-2.5">
              <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                <Wallet size={16} className="text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">Tu Identificación</p>
                <p className="text-xs font-black text-white mt-0.5">{user.cedula}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* 1. CONTROLES SUPERIORES (Filtros en línea) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-white p-2 rounded-3xl shadow-sm border border-slate-100 animate-in fade-in duration-300">
          {/* Buscador */}
          <div className="col-span-1 sm:col-span-3 relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-xs text-slate-900 placeholder:text-slate-400"
              placeholder="Buscar..."
            />
          </div>
          {/* Selector de mes */}
          <div className="col-span-1 sm:col-span-2 relative flex items-center group">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none group-focus-within:text-emerald-500" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              max={new Date().toISOString().slice(0, 7)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-black text-xs text-slate-900 cursor-pointer h-full uppercase"
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
                      onClick={() => {
                        setSelectedTransaction(tr);
                        setIsDetailsOpen(true);
                      }}
                      className="flex items-center justify-between p-4 sm:p-5 rounded-[2rem] hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group cursor-pointer"
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
                          {tr.type === "order" ? "" : tr.type === "sale" ? (tr.paymentMethod?.toLowerCase() === 'credit' ? "+" : "") : "-"}${(tr.amount ?? 0).toLocaleString("es-CO")}
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
                <div className="flex items-center gap-3">
                  <span className="px-4 py-2 bg-violet-50 text-violet-600 rounded-xl font-bold text-sm">
                    💸 Total: ${(expensesTotal ?? 0).toLocaleString("es-CO")}
                  </span>
                  <button
                    onClick={() => {
                      setEditingExpenseId(null);
                      setExpenseForm({
                        title: '',
                        amount: '',
                        category: 'Comida',
                        description: '',
                        personName: '',
                        date: new Date().toLocaleDateString('en-CA')
                      });
                      setIsAddExpenseOpen(true);
                    }}
                    className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
                    title="Registrar Gasto"
                  >
                    <Plus size={20} />
                  </button>
                </div>
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
                      onClick={() => {
                        if (expense.category === 'Pedido' || expense.items) {
                          setSelectedTransaction({
                            id: expense.orderId || expense.id,
                            type: 'order',
                            amount: expense.amount,
                            date: expense.date,
                            description: expense.description,
                            items: expense.items || [],
                            paymentMethod: expense.paymentMethod || (expense.category === 'Pedido' ? 'Credit' : 'Cash')
                          });
                          setIsDetailsOpen(true);
                        }
                      }}
                      className={cn(
                        "flex items-center justify-between p-4 sm:p-5 rounded-[2rem] bg-slate-50/50 border border-slate-100 relative group overflow-hidden transition-all",
                        (expense.category === 'Pedido' || expense.items) && "cursor-pointer hover:bg-slate-100/50 hover:border-slate-200 active:scale-[0.99]"
                      )}
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
                        <div className="text-right shrink-0 flex flex-col items-end gap-2">
                          <p className="text-lg sm:text-xl font-black text-slate-900 tracking-tighter">
                            ${(expense.amount ?? 0).toLocaleString("es-CO")}
                          </p>
                          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            {expense.category === 'Pedido' ? (
                              <div className="px-2 py-1 bg-slate-50 text-slate-400 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-slate-100">
                                <Ban size={10} /> Bloqueado
                              </div>
                            ) : (
                              <>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleEditExpense(expense); }}
                                  className="p-1.5 bg-white hover:bg-slate-100 text-slate-400 hover:text-emerald-600 rounded-lg border border-slate-100 transition-colors"
                                >
                                  <Pencil size={12} />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleDeleteExpense(expense.id, e); }}
                                  className="p-1.5 bg-white hover:bg-slate-100 text-slate-400 hover:text-rose-500 rounded-lg border border-slate-100 transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </>
                            )}
                          </div>
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
                  <p className="text-2xl font-black text-rose-600">${(reportDataObj.sumDeudas ?? 0).toLocaleString("es-CO")}</p>
                </div>
                <div className="bg-violet-50 p-5 rounded-2xl border border-violet-100">
                  <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest mb-1">Gastos mes</p>
                  <p className="text-2xl font-black text-violet-600">${(reportDataObj.sumGastos ?? 0).toLocaleString("es-CO")}</p>
                </div>
                <div className="bg-slate-100 p-5 rounded-2xl border border-slate-200">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Combinado</p>
                  <p className="text-2xl font-black text-slate-700">${((reportDataObj.sumDeudas ?? 0) + (reportDataObj.sumGastos ?? 0)).toLocaleString("es-CO")}</p>
                </div>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* Expense Form Modal (Moved from Dashboard) */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">{editingExpenseId ? 'Editar Gasto' : 'Registrar Gasto'}</h2>
                <p className="text-xs font-medium text-slate-500 mt-1">Anota un nuevo gasto personal.</p>
              </div>
              <button 
                onClick={() => setIsAddExpenseOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                disabled={isSavingExpense}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <form id="expense-form" onSubmit={handleSaveExpense} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Título del gasto <span className="text-red-500">*</span></label>
                  <input
                    required
                    type="text"
                    value={expenseForm.title}
                    onChange={(e) => setExpenseForm({...expenseForm, title: e.target.value})}
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-900 placeholder:text-slate-400"
                    placeholder="Ej: Mercado, Arriendo, Le debo a Juan"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Monto <span className="text-red-500">*</span></label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input
                      required
                      type="number"
                      min="0"
                      step="100"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                      className="w-full pl-8 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-900"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Categoría <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})}
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-900 appearance-none"
                  >
                    <option value="Comida">Comida</option>
                    <option value="Deudas">Deudas</option>
                    <option value="Transporte">Transporte</option>
                    <option value="Salud">Salud</option>
                    <option value="Hogar">Hogar</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                {expenseForm.category === 'Deudas' && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">¿A quién le debes? <span className="text-red-500">*</span></label>
                    <input
                      required
                      type="text"
                      value={expenseForm.personName}
                      onChange={(e) => setExpenseForm({...expenseForm, personName: e.target.value})}
                      className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-900 placeholder:text-slate-400"
                      placeholder="Ej: Juan Pérez"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Fecha <span className="text-red-500">*</span></label>
                  <input
                    required
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})}
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-900"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Descripción <span className="text-slate-400 tracking-normal capitalize">(Opcional)</span></label>
                  <textarea
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-900 placeholder:text-slate-400 resize-none"
                    placeholder="Detalles adicionales..."
                    rows={2}
                  />
                </div>
              </form>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <button
                form="expense-form"
                type="submit"
                disabled={isSavingExpense}
                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {isSavingExpense ? <Loader2 size={18} className="animate-spin" /> : (editingExpenseId ? 'Guardar Cambios' : 'Registrar Gasto')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {isDetailsOpen && selectedTransaction && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md sm:p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-500">
            {/* Header */}
            <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                  selectedTransaction.type === 'order' ? "bg-violet-100 text-violet-600" :
                  selectedTransaction.type === 'sale' ? (selectedTransaction.paymentMethod?.toLowerCase() === 'credit' ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-600") :
                  "bg-emerald-100 text-emerald-600"
                )}>
                  {selectedTransaction.type === 'payment' ? <TrendingDown size={24} /> : <ShoppingBag size={24} />}
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Detalle del Movimiento</h2>
                  <p className="text-xs font-bold text-slate-400 mt-0.5 uppercase tracking-widest">
                    {selectedTransaction.type === 'order' ? 'Pedido Confirmado' : 
                     selectedTransaction.type === 'sale' ? 'Compra Realizada' : 
                     'Abono a Deuda'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsDetailsOpen(false)}
                className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-8">
              {/* Info General */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha</p>
                  <p className="text-sm font-black text-slate-700">
                    {selectedTransaction.date?.seconds 
                      ? new Date(selectedTransaction.date.seconds * 1000).toLocaleDateString("es-CO", { day: '2-digit', month: 'long', year: 'numeric' }) 
                      : 'Reciente'}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Método</p>
                  <p className="text-sm font-black text-slate-700 capitalize">
                    {selectedTransaction.paymentMethod === 'credit' ? 'Crédito' : 
                     selectedTransaction.paymentMethod === 'Cash' ? 'Efectivo' : 
                     selectedTransaction.paymentMethod === 'Card' ? 'Tarjeta' : 
                     selectedTransaction.paymentMethod === 'Digital' ? 'Digital' : 
                     selectedTransaction.paymentMethod || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Items / Description */}
              <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-50 pb-2">
                  {selectedTransaction.items && selectedTransaction.items.length > 0 ? `Productos (${selectedTransaction.items.length})` : 'Información Adicional'}
                </h3>
                
                {selectedTransaction.items && selectedTransaction.items.length > 0 ? (
                  <div className="space-y-3">
                    {selectedTransaction.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm bg-white p-3 rounded-xl border border-slate-50 shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xs shrink-0">{item.quantity}</span>
                          <span className="font-bold text-slate-700 truncate">{item.name}</span>
                        </div>
                        <span className="font-black text-slate-900 ml-4 shrink-0">${((item.price * item.quantity) || 0).toLocaleString("es-CO")}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 italic text-slate-500 text-sm font-medium">
                    {selectedTransaction.description || "Sin descripción adicional."}
                  </div>
                )}
              </div>

              {/* Total Card */}
              <div className="bg-slate-900 rounded-3xl p-6 text-white flex justify-between items-center shadow-xl shadow-slate-900/10">
                <div>
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Monto Total</p>
                  <p className="text-3xl font-black tracking-tighter mt-1">${(selectedTransaction.amount || 0).toLocaleString("es-CO")}</p>
                </div>
                <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                  <Wallet size={24} className="text-emerald-400" />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <button 
                onClick={() => setIsDetailsOpen(false)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-[0.98]"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
