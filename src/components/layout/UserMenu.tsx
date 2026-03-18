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
import { cn } from "@/lib/utils";

export const UserMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuthStore();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    setIsOpen(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
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
          "flex items-center gap-2 p-1.5 pl-3 rounded-full transition-all duration-300",
          "bg-white/40 hover:bg-white/60 backdrop-blur-xl border border-white/40 shadow-sm hover:shadow-md",
          isOpen && "bg-white/80 border-sky-200/50 shadow-lg shadow-sky-500/10"
        )}
      >
        <div className="flex flex-col items-end hidden xs:flex mr-1">
          <span className="text-xs font-bold text-slate-900 leading-tight">
            {user?.name || user?.email?.split('@')[0] || "Usuario"}
          </span>
          <span className="text-[10px] font-black text-sky-600/80 uppercase tracking-tighter">
            {user?.role === "admin" ? "Administrador" : "Cajero"}
          </span>
        </div>
        
        <div className="relative">
          {user?.photoURL ? (
            <img 
              src={user.photoURL} 
              alt="Avatar" 
              className="h-8 w-8 rounded-full object-cover border-2 border-white shadow-sm"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold border-2 border-white shadow-sm">
              {user?.email?.[0].toUpperCase() || "U"}
            </div>
          )}
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 border-2 border-white rounded-full"></div>
        </div>
        
        <ChevronDown 
          size={14} 
          className={cn("text-slate-400 transition-transform duration-300 mr-1", isOpen && "rotate-180")} 
        />
      </button>

      {/* Glassmorphism Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-64 origin-top-right animate-in fade-in zoom-in duration-200">
          <div className="relative overflow-hidden rounded-[2rem] bg-white/70 backdrop-blur-2xl border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-2">
            
            {/* User Info Header */}
            <div className="px-4 py-4 mb-2 bg-gradient-to-br from-sky-500/5 to-blue-600/5 rounded-[1.5rem] border border-white/40">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Cuenta Activa</p>
              <p className="text-sm font-black text-slate-900 truncate">{user?.email}</p>
            </div>

            <div className="space-y-1">
              <MenuButton icon={<UserIcon size={18} />} label="Mi Perfil" />
              <MenuButton icon={<Fingerprint size={18} />} label="Seguridad / Huella" />
              <MenuButton icon={<Share2 size={18} />} label="Compartir Acceso" />
              
              {deferredPrompt && (
                <MenuButton 
                  icon={<Smartphone size={18} />} 
                  label="Instalar app" 
                  onClick={handleInstallApp}
                />
              )}
              
              <div className="h-px bg-slate-200/40 my-2 mx-2"></div>
              
              {/* Appearance Toggles */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100/50 rounded-2xl mx-1">
                <IconButton icon={<Sun size={16} />} active />
                <IconButton icon={<Moon size={16} />} />
                <IconButton icon={<Monitor size={16} />} />
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

const IconButton = ({ icon, active }: { icon: React.ReactNode, active?: boolean }) => (
  <button
    className={cn(
      "flex items-center justify-center p-2 rounded-xl transition-all duration-200",
      active ? "bg-white text-sky-600 shadow-sm" : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
    )}
  >
    {icon}
  </button>
);
