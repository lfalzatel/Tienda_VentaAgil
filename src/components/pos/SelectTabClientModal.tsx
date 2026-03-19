"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase/config";
import { collection, onSnapshot, query, orderBy, addDoc } from "firebase/firestore";
import { X, Search, UserPlus, Plus, Save, Loader2 } from "lucide-react";

interface Debtor {
  id: string;
  name: string;
}

interface SelectTabClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (clientId: string, clientName: string) => void;
}

export const SelectTabClientModal = ({ isOpen, onClose, onSelect }: SelectTabClientModalProps) => {
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [search, setSearch] = useState("");
  const [isAddingNewClient, setIsAddingNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const q = query(collection(db, "debtors"), orderBy("name"));
    const unsub = onSnapshot(q, (snap) => {
      setDebtors(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
    });
    return unsub;
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredDebtors = debtors.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddNewClient = async () => {
    if (!newClientName.trim()) return;
    setIsCreatingClient(true);
    try {
      const docRef = await addDoc(collection(db, "debtors"), {
        name: newClientName.trim(),
        totalDebt: 0,
        createdAt: new Date(),
      });
      onSelect(docRef.id, newClientName.trim());
      onClose();
    } catch (error) {
      console.error("Error creating client:", error);
      alert("Error al crear el cliente");
    } finally {
      setIsCreatingClient(false);
      setNewClientName("");
      setIsAddingNewClient(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300 flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Vincular Cliente</h3>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
              A la pestaña actual
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 sm:p-2.5 bg-white text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all shadow-sm border border-slate-100"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar">
          {isAddingNewClient ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-3 mb-6">
                <button 
                  onClick={() => setIsAddingNewClient(false)}
                  className="p-2 bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100"
                >
                  <X size={16} />
                </button>
                <h4 className="text-sm font-black text-slate-900">Nuevo Cliente</h4>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">
                    Nombre Completo
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                      <UserPlus size={16} className="text-sky-400" />
                    </div>
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-3 sm:py-3.5 bg-slate-50 border-2 border-transparent focus:border-sky-500 focus:bg-white rounded-xl sm:rounded-2xl text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-medium transition-all outline-none"
                      placeholder="Ej. Juan Pérez"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddNewClient();
                      }}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleAddNewClient}
                    disabled={!newClientName.trim() || isCreatingClient}
                    className="w-full relative py-3.5 sm:py-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl sm:rounded-2xl font-black text-sm tracking-wide transition-all active:scale-[0.98] disabled:active:scale-100 flex items-center justify-center gap-2 group overflow-hidden"
                  >
                    {isCreatingClient ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>
                        <Save size={18} className="transition-transform group-hover:scale-110" />
                        GUARDAR CLIENTE
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
              {/* Search */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search size={18} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  className="w-full pl-11 pr-12 py-3 sm:py-4 bg-slate-50 border-2 border-transparent focus:border-slate-200 focus:bg-white rounded-xl sm:rounded-2xl text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-medium transition-all outline-none"
                  placeholder="Buscar cliente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
                <button
                  onClick={() => setIsAddingNewClient(true)}
                  className="absolute inset-y-2 right-2 px-3 bg-slate-900 text-white rounded-lg sm:rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-sm"
                  title="Nuevo cliente"
                >
                  <UserPlus size={16} />
                </button>
              </div>

              {/* Debtors List */}
              <div className="max-h-[250px] overflow-y-auto custom-scrollbar pr-2 space-y-2">
                {filteredDebtors.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm font-bold text-slate-400">No se encontraron clientes.</p>
                  </div>
                ) : (
                  filteredDebtors.map(debtor => (
                    <div
                      key={debtor.id}
                      onClick={() => {
                        onSelect(debtor.id, debtor.name);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between p-3 sm:p-4 bg-white border-2 border-slate-100 rounded-xl sm:rounded-2xl hover:border-slate-300 cursor-pointer transition-all active:scale-[0.98]"
                    >
                      <h4 className="text-sm font-black text-slate-700">{debtor.name}</h4>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
