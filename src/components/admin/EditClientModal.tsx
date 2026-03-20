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
  Edit2,
  ShieldCheck,
  ShieldAlert,
  UserCheck
} from "lucide-react";
import { doc, updateDoc, getDocs, collection, query, where, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
  phone?: string;
  cedula?: string;
  email?: string;
  role?: "admin" | "propietario" | "client";
}

interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  onClientUpdated?: () => void;
}

export function EditClientModal({ isOpen, onClose, client, onClientUpdated }: EditClientModalProps) {
  const { user: currentUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);
  const [targetUserRole, setTargetUserRole] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: client.name || "",
    phone: client.phone || "",
    cedula: client.cedula || "",
    email: client.email || "",
    role: client.role || "client"
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: client.name || "",
        phone: client.phone || "",
        cedula: client.cedula || "",
        email: client.email || "",
        role: client.role || "client"
      });
      
      // Check if this client is linked to a user with a specific role
      if (client.cedula) {
        setRoleLoading(true);
        const checkRole = async () => {
          try {
            const q = query(collection(db, "users"), where("cedula", "==", client.cedula));
            const snap = await getDocs(q);
            if (!snap.empty) {
              const uData = snap.docs[0].data();
              setTargetUserRole(uData.role || "client");
            } else {
              setTargetUserRole("not_linked");
            }
          } catch (error) {
            console.error("Error checking role:", error);
          } finally {
            setRoleLoading(false);
          }
        };
        checkRole();
      }
    }
  }, [isOpen, client]);

  const isRestricted = currentUser?.role === "propietario" && targetUserRole === "admin";

  const toggleRole = async () => {
    if (isRestricted || !currentUser) return;
    setLoading(true);

    try {
      const newRole = formData.role === "propietario" ? "client" : "propietario";
      
      // 1. Update debtor document
      const debtorRef = doc(db, "debtors", client.id);
      await updateDoc(debtorRef, { role: newRole });

      // 2. Update linked user document if exists
      if (client.cedula) {
        const q = query(collection(db, "users"), where("cedula", "==", client.cedula));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const userDoc = snap.docs[0];
          await updateDoc(doc(db, "users", userDoc.id), { role: newRole });
        }
      }

      setFormData(prev => ({ ...prev, role: newRole }));
      if (onClientUpdated) onClientUpdated();
    } catch (error) {
      console.error("Error toggling role:", error);
      alert("Error al cambiar el rol.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || isRestricted) return;
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

        <div className="p-6 sm:p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {isRestricted && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-[2rem] flex items-start gap-3">
                <ShieldAlert size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black text-amber-900 uppercase tracking-tight leading-none">Acceso Restringido</p>
                  <p className="text-[11px] font-medium text-amber-700 mt-1 leading-snug">
                    No tienes permisos para modificar el perfil de un Administrador.
                  </p>
                </div>
              </div>
            )}

            <section className="bg-white rounded-[2rem] p-4 sm:p-6 shadow-sm border border-slate-100 space-y-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-50 pb-3">Perfil del Cliente</h3>
              <div className="space-y-4">
                  <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre</label>
                  <div className="relative group">
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                      <input
                      required
                      disabled={isRestricted}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm font-bold text-slate-900 placeholder:text-slate-600 disabled:opacity-50"
                      placeholder="Juan Pérez"
                      />
                  </div>
                  </div>
                  <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cédula / NIT</label>
                  <div className="relative group">
                      <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                      <input
                      disabled={isRestricted}
                      value={formData.cedula}
                      onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm font-bold text-slate-900 placeholder:text-slate-600 disabled:opacity-50"
                      placeholder="1111222333"
                      />
                  </div>
                  </div>
                  <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">WhatsApp</label>
                  <div className="relative group">
                      <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                      <input
                      disabled={isRestricted}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm font-bold text-slate-900 placeholder:text-slate-600 disabled:opacity-50"
                      placeholder="300 000 0000"
                      />
                  </div>
                  </div>
                  <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Correo Electrónico</label>
                  <div className="relative group">
                      <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                      <input
                      disabled={isRestricted}
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm font-bold text-slate-900 placeholder:text-slate-600 disabled:opacity-50"
                      placeholder="usuario@correo.com"
                      />
                  </div>
                  </div>
              </div>
            </section>

            {/* Role Management Section */}
            {!isRestricted && (currentUser?.role === "admin" || currentUser?.role === "propietario") && (
              <section className="bg-white rounded-[2rem] p-4 sm:p-6 shadow-sm border border-slate-100 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Nivel de Acceso</h3>
                  {roleLoading ? (
                    <Loader2 size={12} className="animate-spin text-slate-400" />
                  ) : targetUserRole === "admin" ? (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-md">
                      <ShieldCheck size={10} />
                      Admin
                    </span>
                  ) : formData.role === "propietario" ? (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-md">
                      <UserCheck size={10} />
                      Propietario
                    </span>
                  ) : (
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md">
                      Cliente
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  <p className="text-[11px] font-medium text-slate-500 leading-snug px-1">
                    {formData.role === "propietario" 
                      ? "Este cliente tiene permisos para gestionar inventario, ventas y ver reportes."
                      : "Este cliente solo tiene acceso a su historial personal y deudas."}
                  </p>
                  
                  {targetUserRole !== "admin" && (
                    <button
                      type="button"
                      onClick={toggleRole}
                      disabled={loading || roleLoading}
                      className={cn(
                        "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-[0.98]",
                        formData.role === "propietario"
                          ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
                          : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 shadow-sm shadow-emerald-500/5"
                      )}
                    >
                      {loading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : formData.role === "propietario" ? (
                        <>Revertir a Cliente Normal</>
                      ) : (
                        <>Promover a Propietario</>
                      )}
                    </button>
                  )}
                </div>
              </section>
            )}
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
            disabled={loading || !formData.name || isRestricted}
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
