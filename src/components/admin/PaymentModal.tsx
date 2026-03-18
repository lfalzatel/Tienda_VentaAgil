"use client";

import { useState } from "react";
import { X, Loader2, Save, TrendingDown, DollarSign, Wallet, CreditCard, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase/config";
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  runTransaction, 
  doc 
} from "firebase/firestore";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtorId: string;
  debtorName: string;
}

export const PaymentModal = ({ isOpen, onClose, debtorId, debtorName }: PaymentModalProps) => {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState("Cash");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return alert("El monto debe ser mayor a 0");
    setLoading(true);

    try {
      await runTransaction(db, async (transaction) => {
        const debtorRef = doc(db, "debtors", debtorId);
        const debtorDoc = await transaction.get(debtorRef);

        if (!debtorDoc.exists()) throw new Error("Cliente no encontrado.");

        const currentDebt = debtorDoc.data().totalDebt || 0;
        
        // 1. Crear transacción de pago
        const transRef = collection(db, "debtor_transactions");
        const newTransRef = doc(transRef);
        transaction.set(newTransRef, {
          debtorId,
          type: "payment",
          amount,
          paymentMethod: method,
          date: serverTimestamp(),
          description: "Abono a deuda"
        });

        // 2. Actualizar saldo del deudor
        transaction.update(debtorRef, {
          totalDebt: currentDebt - amount,
          lastUpdate: new Date().toISOString()
        });
      });

      onClose();
      setAmount(0);
    } catch (error: any) {
      console.error(error);
      alert("Error al registrar abono: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300">
        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Registrar Abono</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{debtorName}</p>
            </div>
            <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 rounded-2xl transition-all">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Monto del Abono</label>
              <div className="relative group">
                <DollarSign size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-600 transition-colors" />
                <input
                  required
                  type="number"
                  value={amount || ""}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full pl-14 pr-6 py-6 bg-slate-50 border-none rounded-[2rem] focus:ring-4 focus:ring-emerald-500/10 transition-all text-2xl font-black tracking-tighter"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Método de Recibo</label>
               <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setMethod("Cash")}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                      method === "Cash" ? "bg-slate-900 border-slate-900 text-white shadow-lg" : "border-slate-100 text-slate-400"
                    )}
                  >
                    <Banknote size={20} />
                    <span className="text-[10px] font-bold">Efectivo</span>
                  </button>
                   <button
                    type="button"
                    onClick={() => setMethod("Digital")}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                      method === "Digital" ? "bg-slate-900 border-slate-900 text-white shadow-lg" : "border-slate-100 text-slate-400"
                    )}
                  >
                    <Wallet size={20} />
                    <span className="text-[10px] font-bold">Digital</span>
                  </button>
                   <button
                    type="button"
                    onClick={() => setMethod("Card")}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                      method === "Card" ? "bg-slate-900 border-slate-900 text-white shadow-lg" : "border-slate-100 text-slate-400"
                    )}
                  >
                    <CreditCard size={20} />
                    <span className="text-[10px] font-bold">Tarjeta</span>
                  </button>
               </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-emerald-600 text-white rounded-[2rem] font-black text-sm shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-3 transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            Confirmar Abono
          </button>
        </form>
      </div>
    </div>
  );
};
