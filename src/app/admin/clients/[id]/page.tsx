"use client";

import { useEffect, useState, use } from "react";
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  doc 
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Header } from "@/components/layout/Header";
import { 
  ArrowLeft, 
  Plus, 
  Calendar, 
  History,
  TrendingDown,
  ArrowUpRight,
  MessageSquare,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PaymentModal } from "@/components/admin/PaymentModal";

interface Transaction {
  id: string;
  type: "sale" | "payment";
  amount: number;
  date: any;
  description?: string;
  paymentMethod?: string;
}

interface Client {
  id: string;
  name: string;
  phone?: string;
  totalDebt: number;
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [client, setClient] = useState<Client | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escuchar datos del cliente (usando la colección 'debtors')
    const clientRef = doc(db, "debtors", resolvedParams.id);
    const unsubClient = onSnapshot(clientRef, (docSnap) => {
      if (docSnap.exists()) {
        setClient({ id: docSnap.id, ...(docSnap.data() as Omit<Client, "id">) });
      }
      setLoading(false);
    });

    // Escuchar transacciones
    const transRef = collection(db, "debtor_transactions");
    const qTrans = query(
      transRef, 
      where("debtorId", "==", resolvedParams.id),
      orderBy("date", "desc")
    );
    
    const unsubTrans = onSnapshot(qTrans, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Transaction, "id">),
      }));
      setTransactions(docs);
    });

    return () => {
      unsubClient();
      unsubTrans();
    };
  }, [resolvedParams.id]);

  if (loading) return null;
  if (!client) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <p className="font-black text-slate-900">Cliente no encontrado</p>
        <Link href="/admin/clients" className="text-sky-600 font-bold text-sm hover:underline">Volver a Clientes</Link>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] overflow-hidden">
      <Header />
      
      <main className="flex-grow p-6 sm:p-10 overflow-hidden flex flex-col max-w-6xl mx-auto w-full pb-32">
        {/* Detail Header */}
        <div className="flex flex-col md:flex-row gap-8 mb-10 items-start md:items-center">
            <Link 
                href="/admin/clients"
                className="p-3 bg-white text-slate-400 hover:text-slate-900 rounded-2xl shadow-sm border border-slate-50 transition-all active:scale-90"
            >
              <ArrowLeft size={20} />
            </Link>

            <div className="flex-grow">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-slate-900 tracking-tighter">{client.name}</h1>
                {client.totalDebt > 0 ? (
                  <span className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-red-100">
                    Debe ${client.totalDebt.toLocaleString("es-CO")}
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-emerald-100">
                    Cuenta al día
                  </span>
                )}
              </div>
              <div className="flex gap-4 mt-2">
                {client.phone && (
                   <a 
                    href={`https://wa.me/${client.phone.replace(/ /g, "")}`} 
                    target="_blank"
                    className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-emerald-600 transition-colors"
                   >
                     <MessageSquare size={14} />
                     {client.phone}
                   </a>
                )}
                <span className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  <Plus size={14} />
                  ID: {resolvedParams.id.slice(0, 8)}
                </span>
              </div>
            </div>

            <button
               onClick={() => setIsPaymentModalOpen(true)}
               disabled={client.totalDebt <= 0}
               className="flex items-center justify-center gap-3 px-8 py-4 bg-emerald-600 text-white rounded-[2rem] font-black text-sm shadow-xl shadow-emerald-500/20 transition-all hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
            >
              <TrendingDown size={18} />
              Registrar Abono
            </button>
        </div>

        {/* Content grid */}
        <div className="flex-grow flex flex-col overflow-hidden bg-white rounded-[3rem] border border-slate-100 shadow-sm">
           <div className="p-8 border-b border-slate-50 flex justify-between items-center">
             <div className="flex items-center gap-3">
               <div className="p-3 bg-slate-100 rounded-xl text-slate-900">
                 <History size={20} />
               </div>
               <h2 className="text-lg font-black text-slate-900 tracking-tight">Historial de Transacciones</h2>
             </div>
             <button className="flex items-center gap-2 text-[10px] font-black text-slate-400 bg-slate-50 px-4 py-2 rounded-xl uppercase tracking-widest hover:bg-slate-100 transition-colors">
               <Download size={14} />
               Exportar Resumen
             </button>
           </div>

           <div className="flex-grow overflow-y-auto custom-scrollbar p-6">
              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <div className="py-20 text-center">
                    <p className="text-slate-300 font-bold italic">No hay movimientos registrados</p>
                  </div>
                ) : (
                  transactions.map((tr) => (
                    <div key={tr.id} className="flex items-center justify-between p-5 rounded-[2rem] hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-12 w-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                          tr.type === "sale" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                        )}>
                          {tr.type === "sale" ? <ArrowUpRight size={20} /> : <TrendingDown size={20} />}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">
                            {tr.type === "sale" ? "Compra / Deuda" : "Abono / Pago"}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 flex items-center gap-2">
                             <Calendar size={10} />
                             {new Date(tr.date?.seconds * 1000).toLocaleDateString("es-CO", { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-lg font-black tracking-tighter",
                          tr.type === "sale" ? "text-slate-900" : "text-emerald-600"
                        )}>
                          {tr.type === "sale" ? "+" : "-"}${tr.amount.toLocaleString("es-CO")}
                        </p>
                        {tr.paymentMethod && (
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                            {tr.paymentMethod}
                          </span>
                        )}
                        {tr.description && (
                           <p className="text-[9px] font-medium text-slate-400 max-w-[150px] truncate">{tr.description}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
           </div>
        </div>
      </main>

      <PaymentModal 
        isOpen={isPaymentModalOpen} 
        onClose={() => setIsPaymentModalOpen(false)} 
        debtorId={resolvedParams.id}
        debtorName={client.name}
      />
    </div>
  );
}
