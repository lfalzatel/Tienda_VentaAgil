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
  Bell,
  CheckCircle,
  XCircle,
  MessageCircle,
  Wallet
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";
import { UserMenu } from "./UserMenu";
import { collection, query, where, onSnapshot, updateDoc, doc, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { requestPushPermission, onForegroundMessage } from "@/lib/utils/pushNotifications";

interface HeaderProps {
  title?: string;
}

export const Header = ({ title }: HeaderProps) => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { user } = useAuthStore();
  const pathname = usePathname();
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

  interface Notification {
    id: string;
    type: string;
    title: string;
    body: string;
    read: boolean;
    link: string;
    createdAt: any;
  }

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!user || (user.role !== "admin" && user.role !== "propietario")) return;
    
    const qOrders = query(collection(db, "orders"), where("status", "==", "pending"));
    const unsub = onSnapshot(qOrders, (snap) => {
      setPendingOrdersCount(snap.docs.length);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user?.uid) return;

    // Pedir permisos de notificaciones
    const timer = setTimeout(() => {
      requestPushPermission(user.uid);
    }, 3000);

    const unsubMessage = onForegroundMessage((payload) => {
      // Podríamos mostrar un toast, pero con la campana se actualiza igual
      console.log("Nueva notificación en primer plano", payload);
    });

    return () => {
      clearTimeout(timer);
      unsubMessage();
    };
  }, [user]);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
    });

    return () => unsub();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const notifIconConfig: Record<string, { icon: React.ReactNode; bg: string }> = {
    order_confirmed: { icon: <CheckCircle size={16} className="text-emerald-600" />, bg: "bg-emerald-100" },
    order_rejected:  { icon: <XCircle size={16} className="text-red-500" />,     bg: "bg-red-100" },
    order_message:   { icon: <MessageCircle size={16} className="text-sky-600" />, bg: "bg-sky-100" },
    new_order:       { icon: <ShoppingBag size={16} className="text-violet-600" />, bg: "bg-violet-100" },
    new_client:      { icon: <Users2 size={16} className="text-amber-600" />,    bg: "bg-amber-100" },
    debt_payment:    { icon: <Wallet size={16} className="text-emerald-600" />,  bg: "bg-emerald-100" },
    debt_paid:       { icon: <Wallet size={16} className="text-emerald-600" />,  bg: "bg-emerald-100" },
  };

  const markAsRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, "notifications", notifId), { read: true });
    } catch {}
  };

  const formatTimeAgo = (timestamp: any): string => {
    if (!timestamp?.seconds) return "Reciente";
    const diff = Math.floor((Date.now() - timestamp.seconds * 1000) / 1000);
    if (diff < 60) return "Hace un momento";
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    return `Hace ${Math.floor(diff / 86400)} d`;
  };

  const navItems = [
    { label: "Vender", href: "/pos", icon: <MonitorSmartphone size={18} /> },
    { label: "Inventario", href: "/admin/inventory", icon: <Package size={18} />, adminOnly: true },
    { label: "Clientes", href: "/admin/clients", icon: <Users2 size={20} />, adminOnly: true },
    { label: "Dashboard", href: "/admin/dashboard", icon: <LayoutDashboard size={18} />, adminOnly: true },
  ];

  const filteredNavItems = navItems.filter(item => !item.adminOnly || user?.role === "admin" || user?.role === "propietario");

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

          {/* Icono de Pedidos (Admin) */}
          {(user?.role === "admin" || user?.role === "propietario") && (
            <Link 
              href="/admin/orders"
              className="relative flex items-center justify-center p-2 rounded-full border bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white hover:scale-105 active:scale-95 transition-all duration-300 group outline-none"
            >
              <ShoppingBag size={18} className="transition-transform group-hover:rotate-12 origin-top" />
              {pendingOrdersCount > 0 && (
                <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-black px-1 shadow-[0_0_8px_rgba(244,63,94,0.8)] border-2 border-[#0a1914] animate-pulse">
                  {pendingOrdersCount > 99 ? '99+' : pendingOrdersCount}
                </div>
              )}
            </Link>
          )}

          {/* Icono de Campana — solo para clientes */}
          {user?.role === "client" && (
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
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-black px-1 shadow-[0_0_8px_rgba(244,63,94,0.8)] border-2 border-[#0a1914]">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </div>
                )}
              </button>

              {/* Dropdown de Notificaciones */}
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-3 w-80 origin-top-right animate-in fade-in zoom-in duration-200 z-50 max-sm:fixed max-sm:inset-x-4 max-sm:top-[72px] max-sm:w-auto max-sm:mt-0 max-sm:origin-top shadow-2xl">
                  <div className="relative overflow-hidden rounded-[2rem] bg-white/95 backdrop-blur-3xl border border-slate-200/50 shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col">
                    <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-100 flex justify-between items-center backdrop-blur-md">
                      <h3 className="text-sm font-black text-slate-800 tracking-tight">Notificaciones</h3>
                      {unreadCount > 0 
                        ? <span className="text-[10px] font-bold bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full uppercase tracking-wider">{unreadCount} Nueva{unreadCount > 1 ? "s" : ""}</span>
                        : <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wider">Al día</span>
                      }
                    </div>
                    
                    <div className="p-2 overflow-y-auto max-h-[60vh] custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="py-10 text-center">
                          <p className="text-xs font-bold text-slate-400">Sin notificaciones</p>
                        </div>
                      ) : (
                        notifications.map(notif => (
                          <Link
                            key={notif.id}
                            href={notif.link}
                            onClick={() => {
                              if (!notif.read) markAsRead(notif.id);
                              setIsNotificationsOpen(false);
                            }}
                            className={cn(
                              "flex gap-3 p-3 rounded-2xl transition-all border mb-1 group",
                              notif.read
                                ? "border-transparent hover:bg-slate-50 hover:border-slate-100"
                                : "bg-emerald-50/60 border-emerald-100 hover:bg-emerald-50"
                            )}
                          >
                            <div className={cn(
                              "w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-inner",
                              notifIconConfig[notif.type]?.bg || "bg-slate-100"
                            )}>
                              {notifIconConfig[notif.type]?.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-xs font-bold", notif.read ? "text-slate-700" : "text-slate-900")}>
                                {notif.title}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">{notif.body}</p>
                              <span className="text-[9px] font-black text-slate-400 mt-1 block uppercase tracking-widest">
                                {formatTimeAgo(notif.createdAt)}
                              </span>
                            </div>
                            {!notif.read && (
                              <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1 shrink-0" />
                            )}
                          </Link>
                        ))
                      )}
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
          )}

          <div className="h-6 w-px bg-white/10 hidden xs:block mx-1"></div>

          <UserMenu />
        </div>
      </div>
    </header>
  );
};
