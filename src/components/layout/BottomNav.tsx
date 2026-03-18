"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home,
  ShoppingCart,
  LayoutDashboard,
  Users,
  Package,
  Wallet
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";

export const BottomNav = () => {
  const { user } = useAuthStore();
  const pathname = usePathname();

  if (!user) return null;

  const navItems = [
    { label: "Vender", path: "/pos", icon: ShoppingCart },
    { label: "Inventario", path: "/admin/inventory", icon: Package },
    { label: "Clientes", path: "/admin/clients", icon: Users },
    { label: "Compras", path: "/admin/purchases", icon: Wallet },
    { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-full max-w-fit px-4">
      <nav className="flex items-center gap-1 p-2 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl justify-center px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "relative flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300 min-w-[70px] group",
                isActive 
                  ? "text-emerald-400 font-black" 
                  : "text-white/60 hover:text-white"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-xl transition-all duration-500",
                isActive ? "bg-emerald-500/20 scale-110" : "group-hover:bg-white/5"
              )}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={cn(
                "text-[9px] mt-1 transition-all duration-300 uppercase tracking-widest font-black",
                isActive ? "opacity-100" : "opacity-60 group-hover:opacity-100"
              )}>
                {item.label}
              </span>
              
              {isActive && (
                <div className="absolute -bottom-1 h-1 w-1 bg-emerald-400 rounded-full animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
