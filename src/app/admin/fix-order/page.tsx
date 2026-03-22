"use client";

import { useState } from "react";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { Loader2, CheckCircle2, AlertCircle, ShoppingBag } from "lucide-react";
import { Header } from "@/components/layout/Header";

export default function FixOrderPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', msg: string } | null>(null);
  const orderId = "GSCH17";

  const runFix = async () => {
    setLoading(true);
    setStatus({ type: 'info', msg: "Buscando pedido #GSCH17..." });
    try {
      // 1. Verificar si ya existe la venta para este pedido
      const salesQuery = query(collection(db, "sales"), where("orderId", "==", orderId));
      const salesSnap = await getDocs(salesQuery);
      
      if (!salesSnap.empty) {
        setStatus({ type: 'success', msg: "La venta ya existe en la colección 'sales' para este pedido." });
        setLoading(false);
        return;
      }

      // 2. Obtener los datos del pedido
      const orderDoc = await getDoc(doc(db, "orders", orderId));
      if (!orderDoc.exists()) {
          // Intentar con minúsculas por si acaso
          const orderDocLower = await getDoc(doc(db, "orders", orderId.toLowerCase()));
          if (!orderDocLower.exists()) {
            throw new Error(`No se encontró el pedido con ID ${orderId}`);
          }
          // Si lo encuentra en minúsculas, usar ese
          await processOrder(orderDocLower.id, orderDocLower.data());
      } else {
          await processOrder(orderDoc.id, orderDoc.data());
      }
    } catch (error: any) {
      console.error(error);
      setStatus({ type: 'error', msg: error.message });
    } finally {
      setLoading(false);
    }
  };

  const processOrder = async (id: string, orderData: any) => {
    setStatus({ type: 'info', msg: "Creando registro de venta..." });
    
    const saleData = {
      orderId: id,
      total: orderData.total,
      paymentMethod: orderData.paymentMethod || "Cash",
      items: orderData.items || [],
      type: "product",
      date: orderData.createdAt || serverTimestamp(),
      createdAt: serverTimestamp(),
      sellerId: "manual-fix",
      sellerName: "Admin (Fix)",
      clientId: orderData.clientId || orderData.ClientId || "unknown",
      clientName: orderData.clientName || "Cliente"
    };

    await addDoc(collection(db, "sales"), saleData);
    setStatus({ type: 'success', msg: `¡Éxito! Se ha creado el registro de venta para el pedido #${id} por $${orderData.total.toLocaleString("es-CO")}. Ahora debería aparecer en el dashboard.` });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <div className="flex-grow flex items-center justify-center p-6 sm:p-10">
        <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-10 text-center space-y-8 border border-slate-100">
          <div className="bg-slate-900 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto text-white shadow-xl shadow-slate-900/20">
            <ShoppingBag size={32} />
          </div>
          
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Corregir Pedido #GSCH17</h1>
            <p className="text-slate-500 font-medium text-sm mt-2">
              Esta herramienta creará el registro de venta faltante para que se refleje en el Dashboard.
            </p>
          </div>

          {status && (
            <div className={`p-4 rounded-2xl border flex items-center gap-3 text-left ${
              status.type === 'success' ? 'bg-emerald-50 border-emerald-100' : 
              status.type === 'error' ? 'bg-rose-50 border-rose-100' : 'bg-blue-50 border-blue-100'
            }`}>
              {status.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-500 shrink-0" /> : 
               status.type === 'error' ? <AlertCircle size={20} className="text-rose-500 shrink-0" /> :
               <Loader2 size={20} className="text-blue-500 shrink-0 animate-spin" />}
              <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">{status.msg}</p>
            </div>
          )}

          <button
            onClick={runFix}
            disabled={loading}
            className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "Ejecutar Corrección"}
          </button>
        </div>
      </div>
    </div>
  );
}
