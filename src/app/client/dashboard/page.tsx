"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, doc, setDoc, updateDoc, onSnapshot, orderBy, serverTimestamp, getDoc, Timestamp, addDoc, deleteDoc } from "firebase/firestore";
import { Loader2, CreditCard, Phone, ArrowUpRight, TrendingDown, Calendar, Wallet, ShoppingBag, UtensilsCrossed, HandCoins, Car, HeartPulse, Home, Receipt, Plus, X, Pencil, Trash2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { SaleDetailModal } from "@/components/admin/SaleDetailModal";
import { cn } from "@/lib/utils";

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

interface DebtorData {
  id: string;
  name: string;
  totalDebt: number;
}

export type PersonalExpense = {
  id: string;
  userId: string;
  title: string;
  amount: number;
  category: string;
  description: string;
  personName?: string;
  date: Timestamp;
  createdAt: any;
};

function ClientDashboardContent() {
  const { user, setUser } = useAuthStore();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  
  const [loading, setLoading] = useState(true);
  
  // Onboarding state
  const [cedulaInput, setCedulaInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dashboard Data
  const [debtor, setDebtor] = useState<DebtorData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Sale Detail Modal State
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [loadingSaleId, setLoadingSaleId] = useState<string | null>(null);

  // Mis Gastos State
  const [activeTab, setActiveTab] = useState<'cuenta' | 'gastos'>(tabParam === 'gastos' ? 'gastos' : 'cuenta');
  
  useEffect(() => {
    if (tabParam === 'gastos') {
      setActiveTab('gastos');
    } else if (tabParam === 'cuenta') {
      setActiveTab('cuenta');
    }
  }, [tabParam]);
  const [personalExpenses, setPersonalExpenses] = useState<PersonalExpense[]>([]);
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

  useEffect(() => {
    if (!user) return;
    if (!user.cedula) {
      setLoading(false);
      return;
    }

    // Fetch debtor details live
    const qDebtor = query(collection(db, "debtors"), where("cedula", "==", user.cedula));
    
    // Este listener asume que solo hay un deudor por cédula
    const unsubscribeDebtor = onSnapshot(qDebtor, (snap) => {
      if (!snap.empty) {
        const dDoc = snap.docs[0];
        setDebtor({ id: dDoc.id, ...dDoc.data() } as DebtorData);

        // We need to fetch both all sales and payments separately
        let currentSales: Transaction[] = [];
        let currentPayments: Transaction[] = [];
        let currentOrders: Transaction[] = [];

        const updateTransactionsState = () => {
          const merged: Transaction[] = [...currentSales, ...currentOrders];
          
          currentPayments.forEach(pt => {
            if (pt.type === "payment") {
              merged.push(pt);
            } else if (pt.type === "sale") {
               // To avoid duplicates of old credit sales that might not have a debtorId in the 'sales' collection
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
          setLoading(false);
        };

        const qSales = query(
          collection(db, "sales"),
          where("debtorId", "==", dDoc.id)
        );

        const unsubSales = onSnapshot(qSales, (tSnap) => {
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
        }, (error) => {
          if (error.code === "permission-denied") return;
          console.error("Error in sales listener:", error);
        });

        const qTrans = query(
          collection(db, "debtor_transactions"),
          where("debtorId", "==", dDoc.id)
        );

        const unsubTrans = onSnapshot(qTrans, (tSnap) => {
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
        }, (error) => {
          if (error.code === "permission-denied") return;
          console.error("Error in trans listener:", error);
        });

        const qOrders = query(
          collection(db, "orders"),
          where("clientId", "==", user.uid),
          where("status", "==", "confirmed")
        );

        const unsubOrders = onSnapshot(qOrders, (snap) => {
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
        }, (err) => {
          if (err.code === "permission-denied") return;
          console.error("Error en orders listener:", err);
        });

        return () => {
          unsubSales();
          unsubTrans();
          unsubOrders();
        };
      } else {
        // En teoría no debería pasar si fue onboarded
        setDebtor(null);
        setLoading(false);
      }
    }, (error) => {
      if (error.code === "permission-denied") return;
      console.error("Error in debtor listener:", error);
    });

    return () => {
      unsubscribeDebtor();
    };

  }, [user]);

  useEffect(() => {
    if (!user?.uid) return;

    const qExpenses = query(
      collection(db, "personal_expenses"),
      where("userId", "==", user.uid),
      orderBy("date", "desc")
    );

    const unsubscribeExpenses = onSnapshot(qExpenses, (snap) => {
      const expensesData = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PersonalExpense[];
      setPersonalExpenses(expensesData);
    });

    return () => unsubscribeExpenses();
  }, [user]);

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !expenseForm.title || !expenseForm.amount || !expenseForm.category || !expenseForm.date) return;

    setIsSavingExpense(true);
    try {
      const [year, month, day] = expenseForm.date.split('-').map(Number);
      const localDate = new Date(year, month - 1, day, 12, 0, 0);

      const expenseData: Partial<PersonalExpense> = {
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
        await addDoc(collection(db, "personal_expenses"), expenseData as any);
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

  const currentMonthTotals = personalExpenses.reduce((acc, exp) => {
    const expDate = exp.date?.toDate ? exp.date.toDate() : new Date();
    const now = new Date();
    if (expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear()) {
      return acc + exp.amount;
    }
    return acc;
  }, 0);

  const handleOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cedulaInput || !user) return;
    setIsSubmitting(true);

    try {
      // 1. Buscar si ya existe el deudor con esa cédula
      const q = query(collection(db, "debtors"), where("cedula", "==", cedulaInput));
      const snap = await getDocs(q);
      
      let debtorId = "";
      if (snap.empty) {
        // Crear cliente desde cero
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
        // Si ya existe, actualizamos su email para tenerlo al día
        debtorId = snap.docs[0].id;
        await updateDoc(doc(db, "debtors", debtorId), { 
          email: user.email 
        });
      }

      // 2. Asociar la cédula al perfil de Auth
      // Usamos setDoc con { merge: true } porque si es su primer login con Google,
      // el documento en la colección 'users' podría no existir aún.
      const debtorDoc = snap.empty ? null : snap.docs[0].data();
      const debtorRole = debtorDoc?.role;

      await setDoc(doc(db, "users", user.uid), {
        cedula: cedulaInput,
        phone: phoneInput || null,
        email: user.email,
        ...(debtorRole ? { role: debtorRole } : {}),
        // No sobreescribir el rol existente si no hay un rol específico en debtor — merge:true preserva los demás campos.
      }, { merge: true });

      // Actualizar estado local
      setUser({ ...user, cedula: cedulaInput, role: debtorRole || user.role });
    } catch (error) {
      console.error("Error linking identity:", error);
      alert("Hubo un error al guardar tu perfil.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransactionClick = async (tr: Transaction) => {
    if (tr.type === "sale" && tr.saleId) {
      setLoadingSaleId(tr.id);
      try {
        const saleDoc = await getDoc(doc(db, "sales", tr.saleId));
        if (saleDoc.exists()) {
          setSelectedSale({ id: saleDoc.id, ...saleDoc.data() });
          setIsSaleModalOpen(true);
        } else {
          alert("Detalles de esta compra no disponibles.");
        }
      } catch (error) {
        console.error("Error fetching sale detail:", error);
      } finally {
        setLoadingSaleId(null);
      }
    } else if (tr.type === "payment") {
       // Podríamos mostrar algo para abonos después
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

  // --- VISTA ONBOARDING ---
  if (!user.cedula) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center p-6 pb-24">
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

  // --- VISTA DASHBOARD ---
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col pb-24">
      <Header title={activeTab === 'cuenta' ? "Tu Estado de Cuenta" : "Mis Gastos"} />
      
      {/* Tabs */}
      <div className="px-6 pt-4 sm:px-10 max-w-4xl mx-auto w-full animate-in fade-in duration-500">
        <div className="flex bg-slate-200/50 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('cuenta')}
            className={cn(
              "flex-1 py-2.5 sm:py-3 rounded-xl text-sm font-bold transition-all relative",
              activeTab === 'cuenta' 
                ? "bg-white text-emerald-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            Tu Cuenta
          </button>
          <button
            onClick={() => setActiveTab('gastos')}
            className={cn(
              "flex-1 py-2.5 sm:py-3 rounded-xl text-sm font-bold transition-all relative",
              activeTab === 'gastos' 
                ? "bg-white text-emerald-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            Mis Gastos
          </button>
        </div>
      </div>

      <main className="flex-grow p-6 sm:p-10 flex flex-col max-w-4xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
        
        {activeTab === 'cuenta' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Resumen Card */}
        <div className="bg-slate-900 rounded-[3rem] p-8 sm:p-10 shadow-xl shadow-slate-900/10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">Hola, {user.name?.split(' ')[0]}</p>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tighter">
                ${(debtor?.totalDebt || 0).toLocaleString("es-CO")}
              </h2>
              <p className="text-xs font-medium text-slate-400 mt-2">Saldo total pendiente a la fecha</p>
            </div>
            
            <div className="px-5 py-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 flex items-center gap-3 w-full sm:w-auto">
              <Wallet size={20} className="text-emerald-400" />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tu Identificación</p>
                <p className="text-sm font-black text-white">{user.cedula}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Historial */}
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-6 sm:p-8">
          <h3 className="text-lg font-black text-slate-900 tracking-tight mb-6 px-2">Movimientos Recientes</h3>
          
          <div className="space-y-4">
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400 font-bold text-sm">No tienes compras ni pagos registrados aún.</p>
              </div>
            ) : (
              transactions.map(tr => (
                <div 
                  key={tr.id} 
                  onClick={() => handleTransactionClick(tr)}
                  className={cn(
                    "flex items-center justify-between p-4 sm:p-5 rounded-[2rem] hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group",
                    (tr.type === "sale" && tr.saleId) ? "cursor-pointer active:scale-[0.98]" : ""
                  )}
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
                      {loadingSaleId === tr.id ? (
                        <Loader2 size={20} className="animate-spin" />
                      ) : tr.type === "order" ? (
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
                         {tr.date?.seconds ? new Date(tr.date.seconds * 1000).toLocaleDateString("es-CO", { day: '2-digit', month: 'short', year: 'numeric' }) : 'Reciente'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
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
      </div>
    )}

    {activeTab === 'gastos' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Resumen Gastos */}
            <div className="bg-slate-900 rounded-[3rem] p-8 sm:p-10 shadow-xl shadow-slate-900/10 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              
              <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">Resumen</p>
                  <h2 className="text-4xl sm:text-5xl font-black tracking-tighter">
                    ${currentMonthTotals.toLocaleString("es-CO")}
                  </h2>
                  <p className="text-xs font-medium text-slate-400 mt-2">Total del mes registrado</p>
                </div>
                
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
                  className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-500/20 text-white font-black flex items-center gap-2 transition-all active:scale-[0.98] w-full sm:w-auto justify-center"
                >
                  <Plus size={20} />
                  <span>Registrar Gasto</span>
                </button>
              </div>
            </div>

            {/* Lista de Gastos */}
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-6 sm:p-8">
              <h3 className="text-lg font-black text-slate-900 tracking-tight mb-6 px-2">Historial de Gastos</h3>
              
              <div className="space-y-4">
                {personalExpenses.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-slate-400 font-bold text-sm">No tienes gastos registrados aún.</p>
                  </div>
                ) : (
                  personalExpenses.map(exp => (
                    <div 
                      key={exp.id} 
                      className="relative flex items-center justify-between p-4 sm:p-5 rounded-[2rem] hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group"
                    >
                      {/* Action buttons (Edit & Delete) appearing on hover */}
                      <div className="absolute top-2 right-4 sm:right-6 flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEditExpense(exp); }}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-emerald-600 rounded-full transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteExpense(exp.id, e)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-red-500 rounded-full transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-slate-50 text-slate-500 flex items-center justify-center transition-transform group-hover:scale-110 shrink-0">
                          {getCategoryIcon(exp.category)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 max-w-[120px] sm:max-w-xs truncate">
                            {exp.title || exp.category}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">{exp.category}</span>
                            <Calendar size={10} className="ml-1" />
                            {exp.date?.seconds ? new Date(exp.date.seconds * 1000).toLocaleDateString("es-CO", { day: '2-digit', month: 'short', year: 'numeric' }) : 'Reciente'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end mt-4 sm:mt-0">
                        <p className="text-lg sm:text-xl font-black tracking-tighter leading-none text-slate-700">
                          ${exp.amount.toLocaleString("es-CO")}
                        </p>
                        <div className="mt-1.5 flex flex-col items-end">
                          {exp.personName && (
                            <p className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mb-1">Para: {exp.personName}</p>
                          )}
                          {exp.description && (
                            <p className="text-[10px] font-medium text-slate-400 max-w-[150px] truncate mt-0.5">{exp.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Expense Form Modal */}
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
                  <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Destinatario <span className="text-slate-300">(Opcional)</span></label>
                    <input
                      type="text"
                      value={expenseForm.personName}
                      onChange={(e) => setExpenseForm({...expenseForm, personName: e.target.value})}
                      className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-900"
                      placeholder="¿A quién le pagaste?"
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Descripción <span className="text-slate-300">(Opcional)</span></label>
                  <textarea
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-900 min-h-[100px] resize-none"
                    placeholder="Nota sobre este gasto"
                  />
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50">
              <button
                type="submit"
                form="expense-form"
                disabled={isSavingExpense || !expenseForm.amount}
                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all flex justify-center items-center gap-2"
              >
                {isSavingExpense ? <Loader2 size={18} className="animate-spin" /> : "Guardar Gasto"}
              </button>
            </div>
          </div>
        </div>
      )}

      <SaleDetailModal 
        isOpen={isSaleModalOpen}
        onClose={() => {
          setIsSaleModalOpen(false);
          setSelectedSale(null);
        }}
        sale={selectedSale}
      />
    </div>
  );
}

export default function ClientDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    }>
      <ClientDashboardContent />
    </Suspense>
  );
}
