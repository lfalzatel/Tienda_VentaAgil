"use client";

import { useState, useEffect } from "react";
import { 
  X,
  Save, 
  Loader2, 
  User, 
  Phone,
  CreditCard,
  Mail,
  Edit2
} from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

interface Client {
  id: string;
  name: string;
  phone?: string;
  cedula?: string;
  email?: string;
}

interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  onClientUpdated?: () => void;
}

export function EditClientModal({ isOpen, onClose, client, onClientUpdated }: EditClientModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: client.name || "",
    phone: client.phone || "",
    cedula: client.cedula || "",
    email: client.email || "",
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: client.name || "",
        phone: client.phone || "",
        cedula: client.cedula || "",
        email: client.email || "",
      });
    }
  }, [isOpen, client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setLoading(true);

    try {
      const debtorRef = doc(db, "debtors", client.id);
      await updateDoc(debtorRef, {
        name: formData.name,
        phone: formData.phone,
        cedula: formData.cedula,
        email: formData.email,
      });

      if (onClientUpdated) {
        onClientUpdated();
      }
      onClose();
    } catch (error) {
      console.error("Error updating client:", error);
      alert("Error al actualizar el cliente.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg bg-[#f8fafc] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 pb-4 sm:p-8 sm:pb-6 bg-gradient-to-r from-emerald-500 to-cyan-600 flex justify-between items-center border-b-2 border-emerald-600">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl text-white backdrop-blur-sm">
                <Edit2 size={24} />
            </div>
            <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Editar Cliente</h2>
                <p className="text-emerald-100/80 font-bold text-[10px] sm:text-xs uppercase tracking-widest mt-1">Actualización de datos</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white rounded-2xl transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
            <section className="bg-white rounded-[2rem] p-4 sm:p-6 shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-50 pb-3">Perfil del Cliente</h3>
            <div className="space-y-4">
                <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre</label>
                <div className="relative group">
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm font-bold text-slate-900 placeholder:text-slate-600"
                    placeholder="Juan Pérez"
                    />
                </div>
                </div>
                <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cédula / NIT</label>
                <div className="relative group">
                    <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <input
                    value={formData.cedula}
                    onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm font-bold text-slate-900 placeholder:text-slate-600"
                    placeholder="1111222333"
                    />
                </div>
                </div>
                <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">WhatsApp</label>
                <div className="relative group">
                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm font-bold text-slate-900 placeholder:text-slate-600"
                    placeholder="300 000 0000"
                    />
                </div>
                </div>
                <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Correo Electrónico</label>
                <div className="relative group">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm font-bold text-slate-900 placeholder:text-slate-600"
                    placeholder="usuario@correo.com"
                    />
                </div>
                </div>
            </div>
            </section>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all active:scale-[0.98]"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.name}
            className="flex-1 py-4 bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 rounded-2xl font-black text-sm hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
