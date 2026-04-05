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
  Download,
  Edit2,
  ShieldAlert,
  Wallet,
  ShoppingBag,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PaymentModal } from "@/components/admin/PaymentModal";
import { EditClientModal } from "@/components/admin/EditClientModal";
import { useAuthStore } from "@/store/useAuthStore";

interface Transaction {
  id: string;
  type: "sale" | "payment" | "order";
  amount: number;
  date: any;
  description?: string;
  paymentMethod?: string;
  saleId?: string;
  orderId?: string;
  items?: any[];
}

interface Client {
  id: string;
  name: string;
  phone?: string;
  cedula?: string;
  email?: string;
  totalDebt: number;
  role?: "admin" | "propietario" | "client";
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { user: currentUser } = useAuthStore();
  const [client, setClient] = useState<Client | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escuchar datos del cliente (usando la colección 'debtors')
    const clientRef = doc(db, "debtors", resolvedParams.id);
    const unsubClient = onSnapshot(clientRef, (docSnap) => {
      if (docSnap.exists()) {
        setClient({ id: docSnap.id, ...(docSnap.data() as Omit<Client, "id">) });
      }
      setLoading(false);
    }, (error) => {
      if (error.code === "permission-denied") return;
      console.error("Error in client listener:", error);
    });

    // Escuchar transacciones y ventas
    let currentSales: Transaction[] = [];
    let currentPayments: Transaction[] = [];

    const updateTransactionsState = () => {
      const merged: Transaction[] = [...currentSales];
      currentPayments.forEach(pt => {
        if (pt.type === "payment") {
          merged.push(pt);
        } else if (pt.type === "sale") {
          const exists = merged.find(s => s.id === pt.saleId || s.id === pt.id);
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

    const unsubSales = onSnapshot(query(collection(db, "sales"), where("debtorId", "==", resolvedParams.id)), (tSnap) => {
      currentSales = tSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: "sale" as const,
          amount: data.total,
          date: data.createdAt,
          saleId: doc.id,
          orderId: data.orderId,
          paymentMethod: data.paymentMethod,
          items: data.items,
          description: data.items ? `${data.items.length} productos` : "Compra a crédito"
        };
      });
      updateTransactionsState();
    }, (error) => {
      if (error.code === "permission-denied") return;
      console.error("Error in sales listener:", error);
    });

    const unsubTrans = onSnapshot(query(collection(db, "debtor_transactions"), where("debtorId", "==", resolvedParams.id)), (tSnap) => {
      currentPayments = tSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type as "sale" | "payment",
          amount: data.amount,
          date: data.date,
          saleId: data.saleId,
          orderId: data.orderId,
          description: data.description,
          paymentMethod: data.type === "sale" ? "credit" : undefined
        };
      });
      updateTransactionsState();
    }, (error) => {
      if (error.code === "permission-denied") return;
      console.error("Error in trans listener:", error);
    });

    return () => {
      unsubClient();
      unsubSales();
      unsubTrans();
    };
  }, [resolvedParams.id]);

  if (loading) return null;

  const isRestricted = currentUser?.role === "propietario" && client?.role === "admin";

  if (!client || isRestricted) return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Header />
      <main className="flex items-center justify-center py-20">
        <div className="text-center p-10 bg-white rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 max-w-md mx-auto">
          <div className="w-20 h-20 bg-amber-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
            <ShieldAlert size={40} className="text-amber-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Acceso Restringido</h2>
          <p className="text-slate-500 font-medium mt-3 leading-relaxed">
            {isRestricted 
              ? "No tienes permisos para ver o editar el perfil de un Administrador."
              : "El cliente solicitado no existe en nuestra base de datos."}
          </p>
          <Link 
            href="/admin/clients" 
            className="inline-flex items-center gap-2 mt-8 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
          >
            <ArrowLeft size={16} />
            Volver a Clientes
          </Link>
        </div>
      </main>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] pb-24">
      <Header />
      
      <main className="flex-grow p-6 sm:p-10 flex flex-col max-w-6xl mx-auto w-full">
        {/* Detail Header */}
        <div className="flex flex-col md:flex-row gap-8 mb-10 items-start md:items-center">
            <Link 
                href="/admin/clients"
                className="p-3 bg-white text-slate-400 hover:text-slate-900 rounded-2xl shadow-sm border border-slate-50 transition-all active:scale-90"
            >
              <ArrowLeft size={20} />
            </Link>

            <div className="flex-grow">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-black text-slate-900 tracking-tighter">{client.name}</h1>
                <button 
                  onClick={() => setIsEditModalOpen(true)}
                  className="p-2 text-slate-400 hover:text-emerald-600 bg-white hover:bg-emerald-50 rounded-xl transition-colors shadow-sm border border-slate-100"
                  title="Editar Cliente"
                >
                  <Edit2 size={16} />
                </button>
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
              <div className="flex flex-wrap gap-4 mt-2">
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
                {client.cedula && (
                   <span className="flex items-center gap-2 text-xs font-bold text-slate-400">
                     <span className="font-black">CC:</span> {client.cedula}
                   </span>
                )}
                {client.email && (
                   <span className="flex items-center gap-2 text-xs font-bold text-slate-400" title="Correo Electrónico">
                     {client.email}
                   </span>
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
        <div className="flex flex-col bg-white rounded-[3rem] border border-slate-100 shadow-sm">
           <div className="p-6 sm:p-8 bg-gradient-to-r from-emerald-500 to-cyan-600 flex justify-between items-center border-b-2 border-emerald-600 rounded-t-[3rem]">
             <div className="flex items-center gap-3">
               <div className="p-3 bg-white/20 rounded-xl text-white backdrop-blur-sm">
                 <History size={20} />
               </div>
               <h2 className="text-lg font-black text-white tracking-tight">Historial de Transacciones</h2>
             </div>
             <button className="flex items-center gap-2 text-[10px] font-black text-emerald-900 bg-white px-4 py-2 rounded-xl uppercase tracking-widest hover:bg-emerald-50 transition-colors shadow-sm">
               <Download size={14} />
               Exportar
             </button>
           </div>

           <div className="p-6">
              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <div className="py-20 text-center">
                    <p className="text-slate-300 font-bold italic">No hay movimientos registrados</p>
                  </div>
                ) : (
                  transactions.map((tr) => (
                    <div 
                      key={tr.id} 
                      onClick={() => {
                        setSelectedTransaction(tr);
                        setIsDetailsOpen(true);
                      }}
                      className={cn(
                        "flex items-center justify-between p-5 rounded-[2rem] hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group",
                        (tr.items || tr.type === 'sale') && "cursor-pointer active:scale-[0.99]"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-12 w-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shrink-0",
                          tr.type === "sale" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                        )}>
                          {tr.type === "sale" ? <ArrowUpRight size={20} /> : <TrendingDown size={20} />}
                        </div>
                        <div className="min-w-0 pr-4">
                          <p className="text-sm font-black text-slate-900 truncate">
                            {tr.type === "sale" ? "Compra / Deuda" : "Abono / Pago"}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 flex items-center gap-2">
                             <Calendar size={10} />
                             {tr.date?.seconds ? new Date(tr.date.seconds * 1000).toLocaleDateString("es-CO", { day: '2-digit', month: 'short', year: 'numeric' }) : 'Reciente'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
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
                           <p className="text-[9px] font-medium text-slate-400 max-w-[150px] truncate ml-auto">{tr.description}</p>
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
      
      <EditClientModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        client={client}
      />

      {/* Transaction Detail Modal */}
      {isDetailsOpen && selectedTransaction && (() => {
        const extractedOrderId = selectedTransaction.orderId || (selectedTransaction.description?.match(/Pedido #([A-Z0-9]+)/)?.[1]);
        const displayId = extractedOrderId || selectedTransaction.id;

        return (
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
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {selectedTransaction.type === 'order' ? 'Pedido Confirmado' : 
                       selectedTransaction.type === 'sale' ? 'Compra Realizada' : 
                       'Abono a Deuda'}
                    </p>
                    <span className="text-[10px] font-black text-slate-300 bg-slate-50 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                      #{displayId.slice(-6).toUpperCase()}
                    </span>
                  </div>
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
        );
      })()}
    </div>
  );
}
