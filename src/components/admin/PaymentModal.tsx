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
        <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[90vh]">
          {/* Header */}
          <div className="p-6 pb-4 sm:p-8 sm:pb-6 bg-gradient-to-r from-emerald-500 to-cyan-600 flex justify-between items-center border-b-2 border-emerald-600">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Registrar Abono</h2>
              <p className="text-emerald-100/80 font-bold text-[10px] sm:text-xs uppercase tracking-widest mt-1">{debtorName}</p>
            </div>
            <button type="button" onClick={onClose} className="p-2 text-white/70 hover:text-white rounded-2xl transition-all">
              <X size={24} />
            </button>
          </div>

          <div className="p-4 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Monto del Abono</label>
              <div className="relative group">
                <DollarSign size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-600 transition-colors" />
                <input
                  required
                  type="number"
                  value={amount || ""}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-[2rem] focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 transition-all text-2xl font-black tracking-tighter"
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

          <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-grow py-4 bg-white text-slate-500 font-bold rounded-2xl border border-slate-200 hover:bg-slate-100 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-grow py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
              Confirmar Abono
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
