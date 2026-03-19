"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, doc, setDoc, updateDoc, onSnapshot, orderBy, serverTimestamp, getDoc } from "firebase/firestore";
import { Loader2, CreditCard, Phone, ArrowUpRight, TrendingDown, Calendar, Wallet } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { SaleDetailModal } from "@/components/admin/SaleDetailModal";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  type: "sale" | "payment";
  amount: number;
  date: any;
  description?: string;
  saleId?: string;
}

interface DebtorData {
  id: string;
  name: string;
  totalDebt: number;
}

export default function ClientDashboardPage() {
  const { user, setUser } = useAuthStore();
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

        const updateTransactionsState = () => {
          const merged: Transaction[] = [...currentSales];
          
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
              saleId: doc.id
            };
          });
          updateTransactionsState();
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
              description: data.description
            };
          });
          updateTransactionsState();
        });

        return () => {
          unsubSales();
          unsubTrans();
        };
      } else {
        // En teoría no debería pasar si fue onboarded
        setDebtor(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeDebtor();
    };

  }, [user]);

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
      await setDoc(doc(db, "users", user.uid), {
        cedula: cedulaInput,
        phone: phoneInput || null,
        email: user.email,
        role: "client"
      }, { merge: true });

      // Actualizar estado local
      setUser({ ...user, cedula: cedulaInput });
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
      <Header title="Tu Estado de Cuenta" />
      
      <main className="flex-grow p-6 sm:p-10 flex flex-col max-w-4xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
        
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
                      tr.type === "sale" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                    )}>
                      {loadingSaleId === tr.id ? (
                        <Loader2 size={20} className="animate-spin" />
                      ) : tr.type === "sale" ? (
                        <ArrowUpRight size={20} />
                      ) : (
                        <TrendingDown size={20} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">
                        {tr.type === "sale" ? "Nueva Compra" : "Pago Realizado"}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 mt-0.5">
                         <Calendar size={10} />
                         {tr.date?.seconds ? new Date(tr.date.seconds * 1000).toLocaleDateString("es-CO", { day: '2-digit', month: 'short', year: 'numeric' }) : 'Reciente'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-lg sm:text-xl font-black tracking-tighter",
                      tr.type === "sale" ? "text-slate-900" : "text-emerald-600"
                    )}>
                      {tr.type === "sale" ? "+" : "-"}${tr.amount.toLocaleString("es-CO")}
                    </p>
                    {tr.description && (
                       <p className="text-[10px] font-medium text-slate-400 max-w-[150px] truncate">{tr.description}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

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
