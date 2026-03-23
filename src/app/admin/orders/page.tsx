"use client";

import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { db } from "@/lib/firebase/config";
import { collection, query, onSnapshot, orderBy, serverTimestamp, addDoc, updateDoc, doc, Timestamp } from "firebase/firestore";
import { Loader2, Search, X, MessageCircle, ShoppingBag, CheckCircle2, XCircle, Clock, Send, ImageIcon, Filter, Check, ShieldAlert, Banknote, CreditCard, Smartphone, MapPin } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { cn } from "@/lib/utils";

// Reusing types from client with minimal additions if needed
export type OrderItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

export type Order = {
  id: string;
  clientId: string;
  clientName: string;
  debtorId?: string;
  status: "pending" | "confirmed" | "rejected";
  items: OrderItem[];
  note: string;
  address?: string;
  imageUrl: string;
  total: number;
  paymentMethod?: string;
  location?: { lat: number; lng: number } | null;
  createdAt: any;
};

export type Message = {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  createdAt: any;
};

export default function AdminOrdersPage() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "rejected">("pending");
  const [searchQuery, setSearchQuery] = useState("");

  // Order Details & Chat State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || (user.role !== "admin" && user.role !== "propietario")) return;

    const qOrders = query(collection(db, "orders"), orderBy("createdAt", "desc"));

    const unsubOrders = onSnapshot(qOrders, (snap) => {
      const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Order);
      setOrders(fetched);
      setLoading(false);

      if (selectedOrder) {
        const updated = fetched.find(o => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
      }
    });

    return () => unsubOrders();
  }, [user, selectedOrder]);

  useEffect(() => {
    if (!selectedOrder) return;
    
    setMessages([]); // reset while loading
    const qMsg = query(
      collection(db, `orders/${selectedOrder.id}/messages`),
      orderBy("createdAt", "asc")
    );

    const unsubMsg = onSnapshot(qMsg, (snap) => {
      const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Message);
      setMessages(fetched);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    return () => unsubMsg();
  }, [selectedOrder?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedOrder || !user?.uid) return;
    setIsSendingMsg(true);
    
    try {
      await addDoc(collection(db, `orders/${selectedOrder.id}/messages`), {
        senderId: user.uid,
        senderName: user.name || "Admin",
        senderRole: user.role || "admin",
        text: newMessage.trim(),
        createdAt: serverTimestamp()
      });
      setNewMessage("");
    } catch (e) {
      console.error("Error enviando mensaje: ", e);
    } finally {
      setIsSendingMsg(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!selectedOrder || isUpdatingStatus) return;
    if (!window.confirm("¿Seguro que deseas confirmar este pedido? Se creará automáticamente un gasto personal para el cliente.")) return;
    
    setIsUpdatingStatus(true);
    try {
      // 1. Actualizar estado del pedido
      await updateDoc(doc(db, "orders", selectedOrder.id), {
        status: "confirmed",
        confirmedAt: serverTimestamp()
      });

      // 2. Crear venta real en 'sales'
      await addDoc(collection(db, "sales"), {
        total: selectedOrder.total,
        paymentMethod: selectedOrder.paymentMethod || "Cash",
        items: selectedOrder.items,
        type: "product",
        date: selectedOrder.createdAt || serverTimestamp(),
        createdAt: serverTimestamp(),
        sellerId: user?.uid || "system",
        sellerName: user?.name || "Admin",
        clientId: selectedOrder.clientId || (selectedOrder as any).ClientId,
        clientName: selectedOrder.clientName
      });

      // 3. Crear el gasto en personal_expenses
      const expenseData = {
        userId: selectedOrder.clientId || (selectedOrder as any).ClientId,
        title: `Pedido #${selectedOrder.id.slice(-6).toUpperCase()}`,
        amount: selectedOrder.total,
        category: "Pedido",
        description: selectedOrder.note || "Gasto generado automáticamente al confirmar pedido.",
        date: selectedOrder.createdAt || serverTimestamp(),
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, "personal_expenses"), expenseData);

      // 4. Notificar en el chat del pedido
      await addDoc(collection(db, `orders/${selectedOrder.id}/messages`), {
        senderId: user?.uid || "system",
        senderName: "Sistema",
        senderRole: "system",
        text: "¡Pedido Confirmado! Se ha cargado el valor a tu módulo de Mis Gastos.",
        createdAt: serverTimestamp()
      });

      // 5. Crear notificación (campana) para el cliente
      await addDoc(collection(db, "notifications"), {
        recipientId: selectedOrder.clientId || (selectedOrder as any).ClientId,
        recipientRole: "client",
        type: "order_confirmed",
        title: "Pedido Confirmado",
        body: `Tu pedido #${selectedOrder.id.slice(-6).toUpperCase()} por $${selectedOrder.total.toLocaleString("es-CO")} ha sido confirmado y está en preparación.`,
        link: "/client/orders",
        read: false,
        createdAt: serverTimestamp()
      });

    } catch (e) {
      console.error("Error confirmando pedido", e);
      alert("Hubo un error al confirmar el pedido.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleRejectOrder = async () => {
    if (!selectedOrder || isUpdatingStatus) return;
    const reason = window.prompt("¿Motivo del rechazo? (Opcional, se enviará como mensaje al cliente):");
    if (reason === null) return; // User cancelled prompt
    
    setIsUpdatingStatus(true);
    try {
      await updateDoc(doc(db, "orders", selectedOrder.id), {
        status: "rejected"
      });

      if (reason.trim()) {
        await addDoc(collection(db, `orders/${selectedOrder.id}/messages`), {
          senderId: user?.uid || "system",
          senderName: "Sistema",
          senderRole: "system",
          text: `Pedido Rechazado. Motivo: ${reason}`,
          createdAt: serverTimestamp()
        });
      }

    } catch (e) {
      console.error("Error rechazando pedido", e);
      alert("Hubo un error al rechazar el pedido.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    if (status === 'pending') return { text: "Pendiente", icon: Clock, bg: "bg-amber-100", textCls: "text-amber-700", border: "border-amber-200" };
    if (status === 'confirmed') return { text: "Confirmado", icon: CheckCircle2, bg: "bg-emerald-100", textCls: "text-emerald-700", border: "border-emerald-200" };
    if (status === 'rejected') return { text: "Rechazado", icon: XCircle, bg: "bg-red-100", textCls: "text-red-700", border: "border-red-200" };
    return { text: "Desconocido", icon: ShoppingBag, bg: "bg-slate-100", textCls: "text-slate-700", border: "border-slate-200" };
  };

  const filteredOrders = orders.filter(o => {
    const matchesFilter = filter === "all" ? true : o.status === filter;
    const searchLow = searchQuery.toLowerCase();
    const matchesSearch = o.clientName.toLowerCase().includes(searchLow) || o.id.toLowerCase().includes(searchLow);
    return matchesFilter && matchesSearch;
  });

  if (!user || (user.role !== "admin" && user.role !== "propietario")) {
    return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 text-center">
            <div className="max-w-md bg-white p-8 rounded-3xl shadow-xl border border-red-100">
                <ShieldAlert size={48} className="mx-auto text-red-500 mb-4" />
                <h1 className="text-2xl font-black text-slate-900 mb-2">Acceso Denegado</h1>
                <p className="text-slate-500">No tienes permisos para ver esta página.</p>
            </div>
        </div>
    );
  }

  if (loading) {
    return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
            <Loader2 className="animate-spin text-emerald-500 w-10 h-10" />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col pb-24 lg:flex-row lg:pb-0">
      
      {/* LEFT COLUMN: LIST OF ORDERS */}
      <div className={cn("w-full lg:w-[400px] xl:w-[450px] shrink-0 flex flex-col border-r border-slate-200 bg-white", selectedOrder ? "hidden lg:flex" : "flex")}>
        <div className="p-6 border-b border-slate-100 bg-white sticky top-0 z-10 space-y-4">
            <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Gestión de Pedidos</h2>
                <p className="text-sm font-medium text-slate-500 mt-1">Administra las compras de tus clientes.</p>
            </div>

            <div className="relative group">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <input
                    type="text"
                    placeholder="Buscar cliente o #pedido..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-900 placeholder:text-slate-400"
                />
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
                {(['pending', 'confirmed', 'rejected', 'all'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={cn(
                            "flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                            filter === f ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendientes' : f === 'confirmed' ? 'Confirmados' : 'Rechazados'}
                    </button>
                ))}
            </div>
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-3">
            {filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                    <Filter size={32} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-400 font-bold text-sm">No hay pedidos que coincidan.</p>
                </div>
            ) : (
                filteredOrders.map(order => {
                    const status = getStatusDisplay(order.status);
                    const SIcon = status.icon;
                    return (
                        <div 
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className={cn(
                                "p-4 rounded-2xl border transition-all cursor-pointer active:scale-[0.98] group",
                                selectedOrder?.id === order.id 
                                    ? "bg-emerald-50 border-emerald-200 shadow-sm" 
                                    : "bg-white border-slate-100 hover:border-slate-300 hover:shadow-sm"
                            )}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className={cn("text-sm font-black", selectedOrder?.id === order.id ? "text-emerald-900" : "text-slate-900")}>
                                        {order.clientName}
                                    </h3>
                                    <p className="text-xs font-bold text-slate-400 mt-0.5">#{order.id.slice(-6).toUpperCase()}</p>
                                </div>
                                <div className={cn("px-2 py-1 rounded-lg border flex items-center gap-1.5", status.bg, status.border, status.textCls)}>
                                    <SIcon size={12} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{status.text}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-end mt-4">
                                <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                    <Clock size={12} />
                                    {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString("es-CO", { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Reciente'}
                                </p>
                                <p className={cn("text-base font-black", selectedOrder?.id === order.id ? "text-emerald-700" : "text-slate-700")}>
                                    ${order.total.toLocaleString("es-CO")}
                                </p>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
      </div>

      {/* RIGHT COLUMN: ORDER DETAILS & CHAT */}
      <div className={cn("flex-grow flex-col bg-[#f8fafc] relative", selectedOrder ? "flex" : "hidden lg:flex")}>
        {selectedOrder ? (
            <div className="flex flex-col h-[100dvh] lg:h-screen">
                {/* Header (Mobile specific closing) */}
                <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 lg:p-6 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSelectedOrder(null)} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full lg:hidden">
                            <X size={24} />
                        </button>
                        <div>
                            <h2 className="text-lg lg:text-xl font-black text-slate-900 tracking-tight">Pedido de {selectedOrder.clientName}</h2>
                            <p className="text-sm font-medium text-slate-500">#{selectedOrder.id.slice(-6).toUpperCase()}</p>
                        </div>
                    </div>

                    {/* Acciones de estado */}
                    {selectedOrder.status === "pending" && (
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handleRejectOrder}
                                disabled={isUpdatingStatus}
                                className="px-3 lg:px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-xs lg:text-sm transition-colors flex items-center gap-2"
                            >
                                <XCircle size={16} /> <span className="hidden sm:inline">Rechazar</span>
                            </button>
                            <button 
                                onClick={handleConfirmOrder}
                                disabled={isUpdatingStatus}
                                className="px-3 lg:px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 rounded-xl font-bold text-xs lg:text-sm transition-all active:scale-[0.98] flex items-center gap-2"
                            >
                                <Check size={16} /> <span className="hidden sm:inline">Confirmar</span>
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex-grow overflow-y-auto flex flex-col p-4 lg:p-8 space-y-6">
                    {/* Detalles del pedido */}
                    <div className="bg-white rounded-[2rem] p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-8">
                        <div className="flex-1 space-y-6">
                            <div>
                                <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase mb-4 border-b border-slate-50 pb-2">Artículos {selectedOrder.items.length}</h3>
                                <div className="space-y-3">
                                    {selectedOrder.items.map(item => (
                                        <div key={item.productId} className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center font-black text-slate-600 text-xs">{item.quantity}</span>
                                                <span className="font-bold text-slate-700">{item.name}</span>
                                            </div>
                                            <span className="font-black text-slate-900">${(item.price * item.quantity).toLocaleString("es-CO")}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
                                    <span className="font-black text-slate-400 uppercase tracking-widest text-xs">Total</span>
                                    <span className="text-2xl font-black text-emerald-600">${selectedOrder.total.toLocaleString("es-CO")}</span>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 border-t border-slate-50 pt-2 shrink-0">
                                {/* Dirección de entrega */}
                                {selectedOrder.address && (
                                    <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">Dirección de entrega</p>
                                        <div className="flex items-start gap-2">
                                            <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-sm font-bold text-slate-700">{selectedOrder.address}</p>
                                                {selectedOrder.location && (
                                                    <a 
                                                        href={`https://www.google.com/maps?q=${selectedOrder.location.lat},${selectedOrder.location.lng}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-emerald-600 font-bold hover:underline mt-1 flex items-center gap-1"
                                                    >
                                                        <MapPin size={10} /> Ver en Google Maps
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {selectedOrder.paymentMethod && (
                                    <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">Método de Pago</p>
                                        <div className="flex items-center gap-2">
                                            {selectedOrder.paymentMethod === "Cash" && <Banknote size={16} className="text-emerald-500" />}
                                            {selectedOrder.paymentMethod === "Card" && <CreditCard size={16} className="text-emerald-500" />}
                                            {selectedOrder.paymentMethod === "Digital" && <Smartphone size={16} className="text-emerald-500" />}
                                            {selectedOrder.paymentMethod === "Credit" && <Clock size={16} className="text-emerald-500" />}
                                            <span className="text-sm font-bold text-slate-700">
                                                {selectedOrder.paymentMethod === "Cash" ? "Efectivo" : 
                                                 selectedOrder.paymentMethod === "Card" ? "Tarjeta" :
                                                 selectedOrder.paymentMethod === "Digital" ? "Digital" : "A crédito"}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                
                                {selectedOrder.location && !selectedOrder.address && (
                                    <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">Ubicación GPS</p>
                                        <a 
                                            href={`https://maps.google.com/?q=${selectedOrder.location.lat},${selectedOrder.location.lng}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-2 rounded-xl"
                                        >
                                            <MapPin size={16} />
                                            <span className="text-xs font-bold w-full truncate">Ver en Google Maps</span>
                                        </a>
                                    </div>
                                )}
                            </div>

                            {selectedOrder.note && (
                                <div>
                                    <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase mb-2">Nota del Cliente</h3>
                                    <p className="text-sm font-medium text-slate-700 bg-amber-50 p-4 rounded-2xl border border-amber-100">{selectedOrder.note}</p>
                                </div>
                            )}
                        </div>
                        
                        {selectedOrder.imageUrl && (
                            <div className="shrink-0 sm:w-1/3">
                                <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase mb-2">Imagen Adjunta</h3>
                                <a href={selectedOrder.imageUrl} target="_blank" rel="noopener noreferrer" className="block rounded-2xl border-2 border-slate-100 overflow-hidden hover:opacity-90 transition-opacity shadow-sm">
                                    <img src={selectedOrder.imageUrl} alt="Adjunto" className="w-full h-auto object-cover max-h-48 sm:max-h-64" />
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Chat Area */}
                    <div className="flex-grow flex flex-col justify-end space-y-4 max-w-3xl mx-auto w-full">
                        <div className="flex items-center gap-4 py-4">
                            <div className="flex-grow h-px bg-slate-200"></div>
                            <span className="text-xs font-black tracking-widest text-slate-400 uppercase flex items-center gap-2"><MessageCircle size={14}/> Chat de Pedido</span>
                            <div className="flex-grow h-px bg-slate-200"></div>
                        </div>

                        {messages.length === 0 ? (
                            <div className="text-center text-slate-400 text-sm font-medium py-10">
                                Inicia la conversación con el cliente.
                            </div>
                        ) : (
                            messages.map(msg => {
                                const isMe = msg.senderId === user.uid;
                                const isSystem = msg.senderRole === "system";
                                
                                if (isSystem) {
                                    return (
                                        <div key={msg.id} className="text-center py-2">
                                            <span className="inline-block bg-slate-100 text-slate-500 font-bold text-[10px] px-3 py-1 rounded-full uppercase tracking-wider">
                                                {msg.text}
                                            </span>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={msg.id} className={cn("flex flex-col max-w-[85%] sm:max-w-[75%]", isMe ? "self-end items-end" : "self-start items-start")}>
                                        <span className="text-[10px] font-bold text-slate-400 mb-1 px-1">
                                            {msg.senderName} {msg.senderRole === "client" ? "(Cliente)" : ""}
                                        </span>
                                        <div className={cn("px-4 py-3 rounded-2xl shadow-sm", isMe ? "bg-emerald-500 text-white rounded-br-sm" : "bg-white text-slate-800 border border-slate-100 rounded-bl-sm")}>
                                            <p className="text-sm font-medium whitespace-pre-wrap">{msg.text}</p>
                                        </div>
                                        {msg.createdAt?.seconds && (
                                            <span className="text-[9px] font-medium text-slate-400 mt-1 px-1">
                                                {new Date(msg.createdAt.seconds * 1000).toLocaleTimeString("es-CO", { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} className="h-4" />
                    </div>
                </div>

                {/* Input de Chat */}
                <div className="p-4 lg:p-6 bg-white border-t border-slate-200 shrink-0">
                    <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex items-center gap-3">
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(e);
                                }
                            }}
                            placeholder="Mensaje para el cliente..."
                            className="flex-grow max-h-32 min-h-[56px] lg:min-h-[64px] bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 lg:py-5 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-slate-900 text-sm resize-none"
                            rows={1}
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim() || isSendingMsg}
                            className="p-4 lg:p-5 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 disabled:opacity-50 transition-all shrink-0 active:scale-95"
                        >
                            {isSendingMsg ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
                        </button>
                    </form>
                </div>
            </div>
        ) : (
            <div className="flex-grow flex items-center justify-center flex-col text-slate-400 p-8 text-center bg-[#f8fafc]">
                <ShoppingBag size={64} className="mb-6 opacity-20" />
                <h3 className="text-xl font-black text-slate-500 mb-2">Selecciona un pedido</h3>
                <p className="text-sm font-medium max-w-sm">Haz clic en un pedido de la lista para ver sus detalles, administrar el estado o chatear con el cliente.</p>
            </div>
        )}
      </div>

    </div>
  );
}
