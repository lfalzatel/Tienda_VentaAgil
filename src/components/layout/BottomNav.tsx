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

  const adminNavItems = [
    { label: "Vender", path: "/pos", icon: ShoppingCart },
    { label: "Inventario", path: "/admin/inventory", icon: Package },
    { label: "Clientes", path: "/admin/clients", icon: Users },
    { label: "Compras", path: "/admin/purchases", icon: Wallet },
    { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  ];

  const clientNavItems = [
    { label: "Mi Cuenta", path: "/client/dashboard", icon: Users },
  ];

  const navItems = user.role === "client" ? clientNavItems : adminNavItems;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] max-w-fit px-4">
      <nav className="flex items-center gap-1 p-2 bg-white/95 border border-slate-200/60 rounded-[2rem] shadow-lg justify-center">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "relative flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300 min-w-[70px] group pointer-events-auto cursor-pointer",
                isActive 
                  ? "text-emerald-500 font-black" 
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-xl transition-all duration-500",
                isActive ? "bg-emerald-500/15 scale-110" : "group-hover:bg-slate-100/80"
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
