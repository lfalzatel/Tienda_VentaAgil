"use client";

import { useState, useRef, useEffect } from "react";
import { 
  LogOut, 
  User as UserIcon, 
  Settings, 
  Share2, 
  Fingerprint, 
  Moon, 
  Sun, 
  Monitor, 
  ChevronDown,
  Smartphone
} from "lucide-react";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { usePWAStore } from "@/store/usePWAStore";
import { useSplashStore } from "@/store/useSplashStore";
import { cn } from "@/lib/utils";
import { hasBiometricRegistered, removeBiometric } from "@/lib/utils/webauthn";

import { ProfileModal } from "../profile/ProfileModal";

export const UserMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isBiometricRegistered, setIsBiometricRegistered] = useState(false);
  const { user } = useAuthStore();
  const { deferredPrompt, setDeferredPrompt } = usePWAStore();
  const { showSplash, updateSplash } = useSplashStore();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsBiometricRegistered(hasBiometricRegistered());
    }
  }, [isOpen]);

  const handleToggleBiometric = () => {
    if (isBiometricRegistered) {
      removeBiometric();
      setIsBiometricRegistered(false);
      alert("Biometría desactivada correctamente. Se pedirá contraseña en el próximo ingreso.");
    } else {
      alert("Para activar la biometría, cierra sesión e ingresa nuevamente con tu contraseña.");
    }
  };

  const handleInstallApp = async () => {
    try {
      if (!deferredPrompt) {
        alert('La opción de instalar la aplicación no está disponible en este momento. Asegúrate de estar usando Chrome o Edge en Android/PC, o usa "Añadir a inicio" en Safari (iOS). También asegúrate de que la app no esté ya instalada.');
        return;
      }
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      } else if (outcome === 'dismissed') {
        console.log('Instalación cancelada por el usuario');
      }
    } catch (error) {
      console.error('Error durante la instalación:', error);
    } finally {
      setIsOpen(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = "https://tienda-venta-agil-ashen.vercel.app/";
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Venta Ágil',
          text: 'Ingresa a Venta Ágil desde este enlace:',
          url: shareUrl,
        });
      } else {
        // Fallback: copiar al portapapeles
        await navigator.clipboard.writeText(shareUrl);
        alert("✓ Enlace copiado al portapapeles: " + shareUrl);
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error("Error al compartir:", error);
        // Fallback en caso de error
        try {
          await navigator.clipboard.writeText(shareUrl);
          alert("✓ Enlace copiado al portapapeles: " + shareUrl);
        } catch (clipboardError) {
          alert("Enlace de compartir: " + shareUrl);
        }
      }
    } finally {
      setIsOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      showSplash("logout");
      
      // Simular progreso suave
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        currentProgress += Math.random() * 20;
        updateSplash({ progress: Math.min(99, currentProgress) });
      }, 300);

      // Esperar 3 segundos mínimos
      await new Promise(resolve => setTimeout(resolve, 3200));
      
      clearInterval(progressInterval);
      updateSplash({ progress: 100 });

      await signOut(auth);
      // Redireccionamiento forzado después de limpiar todo
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-3 p-1 pl-4 rounded-full transition-all duration-300",
          "bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10",
          isOpen && "bg-white/10 border-white/20"
        )}
      >
        <div className="relative">
          {user?.photoURL ? (
            <img 
              src={user.photoURL} 
              alt="Avatar" 
              className="h-9 w-9 rounded-full object-cover border border-white/20"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400 text-xs font-bold border border-white/20 shadow-inner">
              {user?.email?.[0].toUpperCase() || "L"}
            </div>
          )}
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 border border-[#0a1914] rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
        </div>

        <div className="flex flex-col items-start mx-1 mr-2">
          <span className="text-sm font-black text-white leading-tight">
            {(user?.name?.split(' ')[0] || user?.email?.split('@')[0] || "Usuario").toUpperCase()}
          </span>
          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mt-0.5">
            {user?.role?.toUpperCase() || "ADMIN"}
          </span>
        </div>
        
        <ChevronDown 
          size={16} 
          className={cn("text-white/70 transition-transform duration-300 mr-2", isOpen && "rotate-180")} 
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-64 origin-top-right animate-in fade-in zoom-in duration-200">
          <div className="relative overflow-hidden rounded-[2rem] bg-white/95 backdrop-blur-3xl border border-slate-200/50 shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-2">
            
            {/* User Info Header */}
            <div className="px-4 py-4 mb-2 bg-gradient-to-br from-sky-500/10 to-blue-600/10 rounded-[1.5rem] border border-white/60">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Cuenta Activa</p>
              <p className="text-sm font-black text-slate-900 truncate">{user?.email}</p>
            </div>

            <div className="space-y-1">
              <MenuButton 
                icon={<UserIcon size={18} />} 
                label="Mi Perfil" 
                onClick={() => {
                  setIsOpen(false);
                  setIsProfileOpen(true);
                }} 
              />
              
              {isBiometricRegistered ? (
                <MenuButton 
                  icon={<Fingerprint size={18} className="text-red-400 group-hover:text-red-500" />} 
                  label="Desactivar Huella" 
                  onClick={() => {
                    handleToggleBiometric();
                    setIsOpen(false);
                  }} 
                />
              ) : (
                <MenuButton 
                  icon={<Fingerprint size={18} />} 
                  label="Activar Huella" 
                  onClick={() => {
                    handleToggleBiometric();
                    setIsOpen(false);
                  }} 
                />
              )}

              <MenuButton icon={<Share2 size={18} />} label="Compartir Acceso" onClick={handleShare} />
              
              <MenuButton 
                icon={<Smartphone size={18} />} 
                label="Instalar app" 
                onClick={handleInstallApp}
              />
              
              <div className="h-px bg-slate-200/40 my-2 mx-2"></div>
              
              {/* Appearance Toggles */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100/50 rounded-2xl mx-1">
                <IconButton icon={<Sun size={16} />} active onClick={() => setIsOpen(false)} />
                <IconButton icon={<Moon size={16} />} onClick={() => setIsOpen(false)} />
                <IconButton icon={<Monitor size={16} />} onClick={() => setIsOpen(false)} />
              </div>

              <div className="h-px bg-slate-200/40 my-2 mx-2"></div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50/50 rounded-2xl transition-all duration-200 font-bold text-sm"
              >
                <LogOut size={18} />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {isProfileOpen && (
        <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      )}
    </div>
  );
};

const MenuButton = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick?: () => void }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-sky-600 hover:bg-sky-50/50 rounded-2xl transition-all duration-200 font-bold text-sm group"
  >
    <div className="text-slate-400 group-hover:text-sky-500 transition-colors">
      {icon}
    </div>
    <span>{label}</span>
  </button>
);

const IconButton = ({ icon, active, onClick }: { icon: React.ReactNode, active?: boolean, onClick?: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center justify-center p-2 rounded-xl transition-all duration-200",
      active ? "bg-white text-sky-600 shadow-sm" : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
    )}
  >
    {icon}
  </button>
);
