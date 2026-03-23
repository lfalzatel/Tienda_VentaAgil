"use client";

import { useCartStore } from "@/store/useCartStore";
import { 
  X, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  CheckCircle2, 
  Loader2,
  Hash,
  Users,
  Search,
  UserPlus,
  Plus,
  Save
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useSales } from "@/hooks/useSales";
import { db } from "@/lib/firebase/config";
import { collection, onSnapshot, query, orderBy, addDoc } from "firebase/firestore";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type PaymentMethod = "Cash" | "Card" | "Digital" | "Credit";

interface Debtor {
  id: string;
  name: string;
}

export const CheckoutModal = ({ isOpen, onClose, onSuccess }: CheckoutModalProps) => {
  const { getTotal, removeTab, tabs, activeTabId } = useCartStore();
  const { processSale, isProcessing } = useSales();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Debtors selection
  const activeTab = tabs.find(t => t.id === activeTabId);
  const items = activeTab?.items || [];
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [selectedDebtorId, setSelectedDebtorId] = useState("");

  useEffect(() => {
    if (isOpen && activeTab?.clientId) {
      setSelectedDebtorId(activeTab.clientId);
    }
  }, [isOpen, activeTab?.clientId]);
  const [debtorSearch, setDebtorSearch] = useState("");
  const [isAddingNewClient, setIsAddingNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "debtors"), orderBy("name"));
    const unsub = onSnapshot(q, (snap) => {
      setDebtors(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
    });
    return unsub;
  }, []);

  if (!isOpen && !isSuccess) return null;

  const handleCheckout = async () => {
    if (paymentMethod === "Credit" && !selectedDebtorId) {
      alert("Por favor selecciona un cliente para el crédito.");
      return;
    }

    const debtor = debtors.find(d => d.id === selectedDebtorId);

    const success = await processSale({
      items,
      total: getTotal(),
      paymentMethod,
      debtorId: selectedDebtorId || undefined,
      customerName: debtor?.name
    });

    if (success) {
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
        if (onSuccess) onSuccess();
        setPaymentMethod("Cash");
        setSelectedDebtorId("");
        removeTab(activeTabId);
      }, 2000);
    }
  };

  const filteredDebtors = debtors.filter(d => 
    d.name.toLowerCase().includes(debtorSearch.toLowerCase())
  );

  const handleAddNewClient = async () => {
    if (!newClientName.trim()) return;
    setIsCreatingClient(true);
    try {
      const docRef = await addDoc(collection(db, "debtors"), {
        name: newClientName,
        totalDebt: 0,
        createdAt: new Date().toISOString()
      });
      setSelectedDebtorId(docRef.id);
      setIsAddingNewClient(false);
      setNewClientName("");
      setDebtorSearch("");
    } catch (error) {
      console.error("Error creating client:", error);
      alert("Error al crear el cliente");
    } finally {
      setIsCreatingClient(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[10px] animate-in fade-in duration-300"
        onClick={!isProcessing && !isSuccess ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-2xl shadow-slate-900/20 overflow-hidden animate-in zoom-in-95 fade-in duration-300">
        {isSuccess ? (
          <div className="p-12 text-center space-y-6">
            <div className="flex justify-center">
              <div className="bg-emerald-50 p-6 rounded-full animate-bounce">
                <CheckCircle2 size={64} className="text-emerald-500" />
              </div>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">¡Venta Exitosa!</h2>
            <p className="text-slate-500 font-medium">La transacción se registró correctamente.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 py-3 flex justify-between items-center border-b border-slate-100">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Cerrar Venta</h2>
              <button 
                disabled={isProcessing}
                onClick={onClose} 
                className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 pt-3 space-y-3 overflow-y-auto max-h-[72vh] custom-scrollbar">
              {/* Summary */}
              <div className="bg-slate-900 rounded-2xl px-4 py-3 text-white flex justify-between items-center shadow-lg shadow-slate-900/10">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total a Pagar</p>
                  <p className="text-xl font-black tracking-tighter">${(getTotal() ?? 0).toLocaleString("es-CO")}</p>
                </div>
                <div className="h-8 w-8 bg-white/10 rounded-lg flex items-center justify-center">
                  <Hash size={16} className="text-white" />
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Selecciona Método</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'Cash', label: 'Efectivo', icon: Banknote },
                    { id: 'Card', label: 'Tarjeta', icon: CreditCard },
                    { id: 'Digital', label: 'Digital', icon: Smartphone },
                    { id: 'Credit', label: 'Crédito', icon: Users },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                      className={cn(
                        "flex flex-row items-center justify-center gap-1.5 px-3 py-2 rounded-xl border-2 transition-all duration-300",
                        paymentMethod === m.id 
                          ? "bg-slate-900 border-slate-900 text-white shadow-md scale-105" 
                          : "bg-white border-slate-100 text-slate-500 hover:border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <m.icon size={14} />
                      <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Debtor Selection */}
              <div className="space-y-3 animate-in slide-in-from-top-4 duration-300">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={16} />
                  <input
                    placeholder="Buscar cliente..."
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-sky-500/20"
                    value={debtorSearch}
                    onChange={(e) => setDebtorSearch(e.target.value)}
                  />
                  {!isAddingNewClient && (
                    <button 
                      onClick={() => setIsAddingNewClient(true)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                      title="Nuevo Cliente"
                    >
                      <UserPlus size={16} />
                    </button>
                  )}
                </div>

                {isAddingNewClient ? (
                  <div className="p-5 bg-sky-50 rounded-3xl border border-sky-100 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest">Crear Nuevo Cliente</span>
                      <button onClick={() => setIsAddingNewClient(false)} className="text-sky-400 hover:text-sky-600">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        placeholder="Nombre del cliente..."
                        className="flex-grow px-4 py-3 bg-white border-2 border-transparent focus:border-sky-500 rounded-2xl text-sm font-bold focus:outline-none transition-all"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddNewClient()}
                      />
                      <button
                        onClick={handleAddNewClient}
                        disabled={isCreatingClient || !newClientName.trim()}
                        className="bg-sky-600 text-white px-4 rounded-2xl hover:bg-sky-700 transition-all disabled:opacity-50 flex items-center justify-center p-3"
                      >
                        {isCreatingClient ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                    {filteredDebtors.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setSelectedDebtorId(d.id)}
                        className={cn(
                          "w-full text-left px-5 py-3 rounded-xl text-xs font-bold transition-all",
                          selectedDebtorId === d.id 
                            ? "bg-slate-900 text-white shadow-md" 
                            : "bg-white border border-slate-100 text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        {d.name}
                      </button>
                    ))}
                    {filteredDebtors.length === 0 && (
                      <p className="text-center py-4 text-xs font-black text-slate-300 uppercase tracking-widest border-2 border-dashed border-slate-50 rounded-2xl">
                        No hay clientes registrados
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Confirm Button */}
              <button
                onClick={handleCheckout}
                disabled={isProcessing}
                className={cn(
                  "w-full flex items-center justify-center gap-3 py-4 mt-2 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-sky-600/20 transition-all duration-300 active:scale-[0.98]",
                  isProcessing && "opacity-70 cursor-not-allowed"
                )}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Confirmando...</span>
                  </>
                ) : (
                  <>
                    <span>Confirmar Transacción</span>
                    <CheckCircle2 size={18} />
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
