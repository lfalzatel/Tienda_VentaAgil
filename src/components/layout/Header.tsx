"use client";

import { useEffect, useState } from "react";
import { 
  ShoppingBag, 
  Wifi, 
  WifiOff, 
  LayoutDashboard, 
  Package, 
  Users2, 
  MonitorSmartphone 
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
  const [isOnline, setIsOnline] = useState(true);
  const { user } = useAuthStore();
  const pathname = usePathname();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const navItems = [
    { label: "Vender", href: "/pos", icon: <MonitorSmartphone size={18} /> },
    { label: "Inventario", href: "/admin/inventory", icon: <Package size={18} />, adminOnly: true },
    { label: "Clientes", href: "/admin/clients", icon: <Users2 size={20} />, adminOnly: true },
    { label: "Dashboard", href: "/admin/dashboard", icon: <LayoutDashboard size={18} />, adminOnly: true },
  ];

  const filteredNavItems = navItems.filter(item => !item.adminOnly || user?.role === "admin");

  return (
    <header className="sticky top-0 z-40 w-full bg-white/60 backdrop-blur-xl border-b border-white/40 px-6 py-3 shadow-sm shadow-slate-200/20">
      <div className="flex items-center justify-between max-w-7xl mx-auto gap-8">
        
        {/* Left: Logo */}
          <div className="flex items-center gap-4">
            <Link href="/pos" className="flex items-center gap-3 group">
              <div className="bg-gradient-to-br from-sky-500 to-blue-600 p-2.5 rounded-2xl text-white shadow-lg shadow-sky-200 group-hover:scale-105 transition-transform">
                <ShoppingBag size={20} />
              </div>
              <span className="font-black text-xl tracking-tighter text-slate-900 hidden xs:block">
                VentaÁgil
              </span>
            </Link>
            {title && (
              <>
                <div className="h-6 w-px bg-slate-200 hidden sm:block mx-2" />
                <h1 className="text-lg font-black text-slate-900 tracking-tight hidden sm:block">
                  {title}
                </h1>
              </>
            )}
          </div>

        {/* Right: Actions & User */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Connection Indicator */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-500 border",
            isOnline 
              ? "bg-emerald-50/50 text-emerald-600 border-emerald-100/50" 
              : "bg-amber-50/50 text-amber-600 border-amber-100/50 animate-pulse"
          )}>
            {isOnline ? (
              <>
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                <span className="hidden xs:block">Online</span>
              </>
            ) : (
              <>
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500"></div>
                <span className="hidden xs:block">Offline</span>
              </>
            )}
          </div>

          <div className="h-8 w-px bg-slate-200/50 hidden xs:block"></div>

          <UserMenu />
        </div>
      </div>
    </header>
  );
};
