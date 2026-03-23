"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  X, 
  Camera, 
  Pencil, 
  KeyRound, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  Wallet
} from "lucide-react";
import { 
  updateProfile, 
  updatePassword, 
  reauthenticateWithCredential, 
  EmailAuthProvider 
} from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase/config";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal = ({ isOpen, onClose }: ProfileModalProps) => {
  const { user, setUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    cedula: user?.cedula || "",
  });

  const [passwordForm, setPasswordForm] = useState({
    current: "",
    new: "",
    confirm: ""
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!isOpen || !mounted) return null;

  const handleSave = async () => {
    if (!user?.uid) return;
    setIsSaving(true);
    setError("");
    try {
      await updateDoc(doc(db, "users", user.uid), {
        name: form.name,
        phone: form.phone,
        cedula: form.cedula,
      });
      
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: form.name });
      }

      setUser({ 
        ...user, 
        name: form.name, 
        phone: form.phone, 
        cedula: form.cedula 
      });
      
      setIsEditing(false);
      setSuccess("Perfil actualizado correctamente");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      setError("Error al guardar los cambios");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;
    
    setUploadingPhoto(true);
    setError("");
    
    try {
      const storageRef = ref(storage, `profile_photos/${user.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: url });
      }
      
      await updateDoc(doc(db, "users", user.uid), { photoURL: url });
      
      setUser({ ...user, photoURL: url });
      setSuccess("Foto de perfil actualizada");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      setError("Error al subir la foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
        setError("Todos los campos de contraseña son obligatorios");
        return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (passwordForm.new.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user?.email!, passwordForm.current);
      if (auth.currentUser) {
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, passwordForm.new);
        setSuccess("Contraseña actualizada correctamente");
        setIsChangingPassword(false);
        setPasswordForm({ current: "", new: "", confirm: "" });
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      console.error(err);
      setError("Contraseña actual incorrecta o error en el proceso");
    }
  };

  const isGoogleUser = auth.currentUser?.providerData[0]?.providerId === "google.com";


  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Header con foto */}
        <div className="bg-gradient-to-br from-[#0B151F] via-[#0D1D25] to-[#0A3226] p-8 text-center relative shrink-0">
          <button 
            onClick={onClose} 
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          
          <div className="relative inline-block mb-4">
            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white/10 mx-auto shadow-2xl">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-slate-700 flex items-center justify-center text-3xl font-black text-emerald-400">
                  {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                </div>
              )}
            </div>
            <label className="absolute bottom-1 right-1 w-9 h-9 bg-emerald-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-emerald-600 transition-all hover:scale-110 shadow-lg border-2 border-[#0A3226]">
              <Camera size={16} className="text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </label>
            {uploadingPhoto && (
              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                <Loader2 size={24} className="text-white animate-spin" />
              </div>
            )}
          </div>
          
          <h2 className="text-xl font-black text-white mb-1">{user?.name || "Usuario"}</h2>
          <div className="inline-flex items-center px-3 py-1 bg-emerald-500/20 rounded-full">
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none">
              {user?.role}
            </span>
          </div>
        </div>

        {/* Cuerpo scrolleable */}
        <div className="p-8 overflow-y-auto max-h-[50vh] space-y-6 text-left">
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold animate-in slide-in-from-top-2">
              <AlertCircle size={18} className="shrink-0" />
              {error}
            </div>
          )}
          
          {success && (
            <div className="flex items-center gap-2 p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-sm font-bold animate-in slide-in-from-top-2">
              <CheckCircle2 size={18} className="shrink-0" />
              {success}
            </div>
          )}

          <div className="space-y-5">
            <Field 
              label="Nombre completo" 
              value={user?.name} 
              name="name" 
              isEditing={isEditing}
              formValue={form.name}
              setForm={setForm}
            />
            
            <Field 
              label="Correo electrónico" 
              value={user?.email} 
              name="email" 
              editable={false}
              isEditing={isEditing}
              formValue={user?.email || ""}
              setForm={setForm}
            />

            {user?.role === "client" && (
                <Field 
                label="Cédula / Documento" 
                value={user?.cedula} 
                name="cedula" 
                isEditing={isEditing}
                formValue={form.cedula}
                setForm={setForm}
                />
            )}

            <Field 
              label="Teléfono / WhatsApp" 
              value={user?.phone} 
              name="phone" 
              type="tel"
              isEditing={isEditing}
              formValue={form.phone}
              setForm={setForm}
            />
          </div>

          {!isGoogleUser && (
            <div className="pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsChangingPassword(!isChangingPassword)}
                className="flex items-center gap-2 text-sm font-black text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-tight"
              >
                <KeyRound size={16} />
                {isChangingPassword ? "Cancelar cambio" : "Cambiar contraseña"}
              </button>
              
              {isChangingPassword && (
                <div className="mt-4 p-5 bg-slate-50 rounded-[2rem] space-y-3 border border-slate-100 animate-in slide-in-from-top-4">
                  <input 
                    type="password" 
                    placeholder="Contraseña actual" 
                    value={passwordForm.current}
                    onChange={e => setPasswordForm(p => ({...p, current: e.target.value}))}
                    className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm outline-none" 
                  />
                  <input 
                    type="password" 
                    placeholder="Nueva contraseña" 
                    value={passwordForm.new}
                    onChange={e => setPasswordForm(p => ({...p, new: e.target.value}))}
                    className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm outline-none" 
                  />
                  <input 
                    type="password" 
                    placeholder="Confirmar contraseña" 
                    value={passwordForm.confirm}
                    onChange={e => setPasswordForm(p => ({...p, confirm: e.target.value}))}
                    className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm outline-none" 
                  />
                  <button 
                    onClick={handleChangePassword} 
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm transition-transform active:scale-95 shadow-lg shadow-slate-900/10 mt-2"
                  >
                    Actualizar contraseña
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer con botones */}
        <div className="p-8 border-t border-slate-100 flex gap-4 shrink-0 bg-slate-50/50">
          {isEditing ? (
            <>
              <button 
                onClick={() => {
                  setIsEditing(false);
                  setForm({
                    name: user?.name || "",
                    phone: user?.phone || "",
                    cedula: user?.cedula || "",
                  });
                }} 
                className="flex-1 py-4 border-2 border-slate-200 rounded-2xl font-black text-slate-500 hover:bg-white transition-all text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave} 
                disabled={isSaving} 
                className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95 text-sm disabled:opacity-50 disabled:active:scale-100"
              >
                {isSaving ? <Loader2 size={20} className="animate-spin mx-auto" /> : "Guardar cambios"}
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsEditing(true)} 
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all active:scale-95 text-sm"
            >
              <Pencil size={18} /> Editar perfil
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

interface FieldProps {
  label: string;
  value?: string | null;
  name: string;
  type?: string;
  editable?: boolean;
  isEditing: boolean;
  formValue: string;
  setForm: React.Dispatch<React.SetStateAction<any>>;
}

const Field = ({ label, value, name, type = "text", editable = true, isEditing, formValue, setForm }: FieldProps) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    {isEditing && editable ? (
      <input
        type={type}
        value={formValue}
        onChange={e => setForm((prev: any) => ({ ...prev, [name]: e.target.value }))}
        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none"
      />
    ) : (
      <div className={cn(
        "px-5 py-3.5 rounded-2xl font-bold transition-all border",
        editable ? "bg-slate-50 border-slate-100 text-slate-700" : "bg-slate-100/50 border-transparent text-slate-400 cursor-not-allowed"
      )}>
        {value || "—"}
      </div>
    )}
  </div>
);
