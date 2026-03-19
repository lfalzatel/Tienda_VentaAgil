"use client";

import { useEffect, useState, useRef } from "react";
import { 
  ShoppingBag, 
  Wifi, 
  WifiOff, 
  LayoutDashboard, 
  Package, 
  Users2, 
  MonitorSmartphone,
  Skull,
  Bell
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";
import { UserMenu } from "./UserMenu";

interface HeaderProps {
  title?: string;
}

export const Header = ({ title }: HeaderProps) => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { user } = useAuthStore();
  const pathname = usePathname();
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);



  const navItems = [
    { label: "Vender", href: "/pos", icon: <MonitorSmartphone size={18} /> },
    { label: "Inventario", href: "/admin/inventory", icon: <Package size={18} />, adminOnly: true },
    { label: "Clientes", href: "/admin/clients", icon: <Users2 size={20} />, adminOnly: true },
    { label: "Dashboard", href: "/admin/dashboard", icon: <LayoutDashboard size={18} />, adminOnly: true },
  ];

  const filteredNavItems = navItems.filter(item => !item.adminOnly || user?.role === "admin");

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0a1914] backdrop-blur-xl border-b border-emerald-900/50 px-6 py-3 shadow-lg shadow-emerald-900/20">
      <div className="flex items-center justify-between max-w-7xl mx-auto gap-8">
        
        {/* Left: Logo */}
          <div className="flex items-center gap-4">
            <Link href="/pos" className="flex items-center gap-3 group">
              <div className="bg-[#0f2922] border border-emerald-500/30 p-2 rounded-xl text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] group-hover:scale-105 transition-transform">
                <Skull size={24} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
              </div>
              <div className="hidden flex-col justify-center xs:flex">
                <span className="font-extrabold text-xl tracking-tighter text-emerald-400 uppercase leading-none drop-shadow-md">
                  Green Force
                </span>
                <span className="text-[11px] font-medium text-slate-300 tracking-wider mt-1 leading-none">
                  Sembrando Futuro
                </span>
              </div>
            </Link>
            {title && (
              <>
                <div className="h-6 w-px bg-slate-700/50 hidden sm:block mx-2" />
                <h1 className="text-lg font-black text-slate-200 tracking-tight hidden sm:block">
                  {title}
                </h1>
              </>
            )}
          </div>

        {/* Right: Actions & User */}
        <div className="flex items-center gap-3 sm:gap-4">


          {/* Icono de Campana */}
          <div className="relative" ref={notificationsRef}>
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className={cn(
                "relative flex items-center justify-center p-2 rounded-full border transition-all duration-300 group",
                isNotificationsOpen 
                  ? "bg-white/10 border-white/20 text-white" 
                  : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white hover:scale-105 active:scale-95"
              )}
            >
              <Bell size={18} className="transition-transform group-hover:rotate-12 origin-top" />
              <div className="absolute top-1 outline outline-2 outline-[#0a1914] right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]"></div>
            </button>

            {/* Dropdown de Notificaciones */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-3 w-80 origin-top-right animate-in fade-in zoom-in duration-200 z-50 max-sm:fixed max-sm:inset-x-4 max-sm:top-[72px] max-sm:w-auto max-sm:mt-0 max-sm:origin-top shadow-2xl">
                <div className="relative overflow-hidden rounded-[2rem] bg-white/95 backdrop-blur-3xl border border-slate-200/50 shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col">
                  <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-100 flex justify-between items-center backdrop-blur-md">
                    <h3 className="text-sm font-black text-slate-800 tracking-tight">Notificaciones</h3>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full uppercase tracking-wider">2 Nuevas</span>
                  </div>
                  
                  <div className="p-2 overflow-y-auto max-h-[60vh] custom-scrollbar">
                    {/* Placeholder Notification 1 */}
                    <div className="p-3 hover:bg-slate-50 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-slate-100 hover:shadow-sm mb-1 group">
                      <div className="flex gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 shadow-inner flex items-center justify-center text-emerald-600 shrink-0">
                          <ShoppingBag size={16} className="group-hover:scale-110 transition-transform" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">Nueva Venta a Crédito</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Se ha registrado una nueva venta a crédito a nombre de Juan.</p>
                          <span className="text-[9px] font-black text-slate-400 mt-1.5 block uppercase tracking-widest">Hace 10 min</span>
                        </div>
                      </div>
                    </div>
                    {/* Placeholder Notification 2 */}
                    <div className="p-3 hover:bg-slate-50 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-slate-100 hover:shadow-sm group">
                      <div className="flex gap-3">
                        <div className="w-9 h-9 rounded-full bg-amber-100 shadow-inner flex items-center justify-center text-amber-600 shrink-0">
                          <Users2 size={16} className="group-hover:scale-110 transition-transform" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 group-hover:text-amber-600 transition-colors">Nuevo Cliente Registrado</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Se ha creado el perfil de cliente en la base de datos local exitosamente.</p>
                          <span className="text-[9px] font-black text-slate-400 mt-1.5 block uppercase tracking-widest">Hace 1 h</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-2 bg-slate-50/50 border-t border-slate-100">
                    <button className="w-full py-2.5 text-[10px] font-black text-slate-400 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all uppercase tracking-widest active:scale-95">
                      Ver todas (próximamente)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-white/10 hidden xs:block mx-1"></div>

          <UserMenu />
        </div>
      </div>
    </header>
  );
};
