"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { 
  ShoppingCart,
  ShoppingBag,
  LayoutDashboard,
  Users,
  Package,
  Wallet,
  Home,
  History,
  QrCode,
  MessageCircle
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";

const BottomNavContent = () => {
  const { user } = useAuthStore();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  if (!user || pathname === "/login") return null;

  type NavItem = {
    label: string;
    path: string;
    icon: React.ElementType;
    match?: (p: string, t: string | null) => boolean;
  };

  const adminNavItems: NavItem[] = [
    { label: "Vender", path: "/pos", icon: ShoppingCart },
    { label: "Inventario", path: "/admin/inventory", icon: Package },
    { label: "Clientes", path: "/admin/clients", icon: Users },
    { label: "Compras", path: "/admin/purchases", icon: Wallet },
    { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  ];

  const clientNavItems: NavItem[] = [
    { label: "Mis Compras", path: "/client/purchases", icon: ShoppingBag },
    { label: "Historial", path: "/client/history", icon: History, match: (p: string, t: string | null) => p === "/client/history" },
    { label: "Pedidos", path: "/client/orders", icon: MessageCircle, match: (p: string, t: string | null) => p === "/client/orders" },
    { label: "Mi Código", path: "/client/qr", icon: QrCode, match: (p: string, t: string | null) => p === "/client/qr" },
  ];

  const navItems = user.role === "client" ? clientNavItems : adminNavItems;

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[60] w-[calc(100vw-24px)] max-w-sm">
      <nav className="flex items-end justify-around px-1 py-2 bg-white/50 backdrop-blur-sm border border-emerald-100 rounded-[2rem] shadow-2xl shadow-emerald-900/10">
        {navItems.map((item) => {
          const isActive = item.match ? item.match(pathname, tab) : pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              href={item.path}
              className="relative flex flex-col items-center justify-end flex-1 py-1 group cursor-pointer"
              style={{ transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)" }}
            >
              {/* Icon bubble - jumps up when active */}
              <div
                className={cn(
                  "flex items-center justify-center rounded-2xl transition-all flex-shrink-0",
                  isActive
                    ? "bg-emerald-500 h-9 w-9 -translate-y-3 shadow-lg shadow-emerald-500/50"
                    : "bg-transparent h-7 w-7 translate-y-0 group-hover:-translate-y-1"
                )}
                style={{ transition: "all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)" }}
              >
                <Icon
                  size={isActive ? 17 : 16}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={cn(
                    "transition-all duration-300 group-hover:rotate-12 origin-top",
                    isActive ? "text-white" : "text-emerald-700/40 group-hover:text-emerald-500"
                  )}
                />
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-[8px] font-black uppercase tracking-wider transition-all duration-300 leading-none mt-0.5 truncate max-w-full px-0.5",
                  isActive ? "text-emerald-500 opacity-100" : "text-emerald-700/40 group-hover:opacity-100 group-hover:text-emerald-500"
                )}
              >
                {item.label}
              </span>

              {/* Active dot */}
              {isActive && (
                <div className="absolute -bottom-0.5 h-1 w-1 bg-emerald-400 rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export const BottomNav = () => {
  return (
    <Suspense fallback={null}>
      <BottomNavContent />
    </Suspense>
  );
};
