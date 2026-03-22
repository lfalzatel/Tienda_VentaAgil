"use client";

import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { db, storage } from "@/lib/firebase/config";
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot, orderBy, serverTimestamp, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Loader2, Search, Plus, X, MessageCircle, ShoppingBag, CheckCircle2, XCircle, Clock, Camera, Send, ImageIcon, ChevronLeft, Calendar, Banknote, CreditCard, Smartphone, MapPin, Pencil } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";

export type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  category?: string;
};

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
  address: string;
  imageUrl: string;
  total: number;
  paymentMethod: string;
  location: { lat: number; lng: number } | null;
  createdAt: any;
};

type OrderForm = {
  items: OrderItem[];
  note: string;
  address: string;
  paymentMethod: string;
  location: { lat: number; lng: number; address?: string } | null;
};

const EMPTY_FORM: OrderForm = { items: [], note: "", address: "", paymentMethod: "Cash", location: null };

export type Message = {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  createdAt: any;
};

export default function ClientOrdersPage() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // New / Edit Order Modal State
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [orderForm, setOrderForm] = useState<OrderForm>(EMPTY_FORM);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Order Details & Chat State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.uid) return;

    // Listen to orders
    const qOrders = query(
      collection(db, "orders"),
      where("clientId", "==", user.uid)
    );

    const unsubOrders = onSnapshot(qOrders, (snap) => {
      const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Order);
      // Sort manually to avoid requiring a composite index in Firestore
      fetched.sort((a, b) => {
        const tA = a.createdAt?.seconds || Number.MAX_SAFE_INTEGER;
        const tB = b.createdAt?.seconds || Number.MAX_SAFE_INTEGER;
        return tB - tA; // Descending
      });
      setOrders(fetched);
      setLoading(false);

      // Si el pedido seleccionado se actualiza (ej status), actualizamos la referencia local
      if (selectedOrder) {
        const updated = fetched.find(o => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
      }
    });

    return () => unsubOrders();
  }, [user]);

  // Listen to messages when selectedOrder changes
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

  const loadProducts = async () => {
    try {
      if (products.length > 0) return; // Ya cargados
      const snap = await getDocs(collection(db, "products"));
      const prds = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Product).filter(p => typeof p.price === 'number');
      setProducts(prds);
    } catch (e) {
      console.error("Error loading products", e);
    }
  };

  const handleOpenNewOrder = () => {
    loadProducts();
    setOrderForm(EMPTY_FORM);
    setEditingOrder(null);
    setImage(null);
    setImagePreview(null);
    setSearchQuery("");
    setSubmitAttempted(false);
    setIsLocating(false);
    setIsNewOrderOpen(true);
  };

  const handleCloseModal = () => {
    setIsNewOrderOpen(false);
    setEditingOrder(null);
    setSubmitAttempted(false);
    setOrderForm(EMPTY_FORM);
    setImage(null);
    setImagePreview(null);
  };

  // Populate form when entering edit mode
  useEffect(() => {
    if (editingOrder) {
      loadProducts();
      setOrderForm({
        items: editingOrder.items,
        note: editingOrder.note || "",
        address: editingOrder.address || "",
        paymentMethod: editingOrder.paymentMethod || "Cash",
        location: editingOrder.location || null,
      });
      setSubmitAttempted(false);
      setSearchQuery("");
      setIsNewOrderOpen(true);
    }
  }, [editingOrder]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let addr = "Ubicación compartida";
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            if (data.display_name) addr = data.display_name;
          }
        } catch (e) {
          console.log("No se pudo obtener la dirección", e);
        }
        setOrderForm(prev => ({ ...prev, location: { lat: latitude, lng: longitude, address: addr } }));
        setIsLocating(false);
      },
      (err) => {
        console.error(err);
        let msg = "No se pudo obtener la ubicación.";
        if (err.code === err.PERMISSION_DENIED) msg = "Debes permitir el acceso a tu ubicación en el navegador.";
        alert(msg);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAddToCart = (prd: Product) => {
    setOrderForm(prev => {
      const existing = prev.items.find(i => i.productId === prd.id);
      if (existing) {
        return { ...prev, items: prev.items.map(i => i.productId === prd.id ? { ...i, quantity: i.quantity + 1 } : i) };
      } else {
        return { ...prev, items: [...prev.items, { productId: prd.id, name: prd.name, price: prd.price, quantity: 1 }] };
      }
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setOrderForm(prev => ({
      ...prev,
      items: prev.items.map(i => {
        if (i.productId === productId) {
          const newQ = i.quantity + delta;
          return newQ > 0 ? { ...i, quantity: newQ } : i;
        }
        return i;
      }).filter(i => i.quantity > 0)
    }));
  };

  const handleRemoveFromCart = (productId: string) => {
    setOrderForm(prev => ({ ...prev, items: prev.items.filter(i => i.productId !== productId) }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveOrder = async () => {
    setSubmitAttempted(true);
    if (!user?.uid || orderForm.items.length === 0 || !orderForm.address.trim()) return;
    setIsSubmitting(true);

    try {
      const total = orderForm.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

      if (editingOrder) {
        // EDIT existing pending order
        await updateDoc(doc(db, "orders", editingOrder.id), {
          items: orderForm.items,
          note: orderForm.note,
          address: orderForm.address,
          paymentMethod: orderForm.paymentMethod,
          location: orderForm.location ? { lat: orderForm.location.lat, lng: orderForm.location.lng } : null,
          total,
          updatedAt: serverTimestamp()
        });
      } else {
        // CREATE new order
        let imageUrl = "";
        if (image) {
          const imageRef = ref(storage, `orders/${user.uid}/${uuidv4()}_${image.name}`);
          await uploadBytes(imageRef, image);
          imageUrl = await getDownloadURL(imageRef);
        }

        await addDoc(collection(db, "orders"), {
          clientId: user.uid,
          clientName: user.name || "Cliente",
          debtorId: user.cedula || undefined,
          status: "pending",
          items: orderForm.items,
          total,
          note: orderForm.note,
          address: orderForm.address,
          imageUrl,
          paymentMethod: orderForm.paymentMethod,
          location: orderForm.location ? { lat: orderForm.location.lat, lng: orderForm.location.lng } : null,
          createdAt: serverTimestamp()
        });

        // Notificar admins via FCM (solo al crear)
        fetch("/api/notify-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientName: user.name || "Cliente", total })
        }).catch(err => console.error("Error trigger push notify:", err));
      }

      handleCloseModal();
    } catch (e) {
      console.error("Error al guardar pedido:", e);
      alert("Hubo un error al guardar el pedido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedOrder || !user?.uid) return;
    setIsSendingMsg(true);
    
    try {
      await addDoc(collection(db, `orders/${selectedOrder.id}/messages`), {
        senderId: user.uid,
        senderName: user.name || "Cliente",
        senderRole: user.role || "client",
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

  const getStatusDisplay = (status: string) => {
    if (status === 'pending') return { text: "Pendiente", icon: Clock, className: "bg-slate-100 text-slate-600" };
    if (status === 'confirmed') return { text: "Confirmado", icon: CheckCircle2, className: "bg-emerald-50 text-emerald-600" };
    if (status === 'rejected') return { text: "Rechazado", icon: XCircle, className: "bg-red-50 text-red-600" };
    return { text: "Desconocido", icon: ShoppingBag, className: "bg-slate-100 text-slate-500" };
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const cartTotal = orderForm.items.reduce((acc, i) => acc + (i.price * i.quantity), 0);

  if (!user) return null;

  if (loading) {
    return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
            <Loader2 className="animate-spin text-emerald-500 w-10 h-10" />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col pb-28">
      <Header title="Mis Pedidos" />
      
      <main className="flex-grow p-6 sm:p-10 flex flex-col max-w-4xl mx-auto w-full animate-in fade-in duration-500">
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Tus Pedidos</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">Revisa el estado de tus compras y contáctanos.</p>
          </div>
          
          <button
            onClick={handleOpenNewOrder}
            className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-500/20 text-white font-black flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Nuevo Pedido</span>
          </button>
        </div>

        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
                <ShoppingBag size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-400 font-bold">No tienes pedidos registrados aún.</p>
                <button
                    onClick={handleOpenNewOrder}
                    className="mt-4 px-6 py-2.5 bg-emerald-50 text-emerald-600 font-bold rounded-xl hover:bg-emerald-100 transition-colors"
                >
                    Hacer mi primer pedido
                </button>
            </div>
          ) : (
            orders.map(order => {
              const statusDisplay = getStatusDisplay(order.status);
              const SIcon = statusDisplay.icon;
              return (
                <div 
                  key={order.id} 
                  onClick={() => setSelectedOrder(order)}
                  className="bg-white rounded-[2rem] border border-slate-100 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className={cn("p-2.5 rounded-xl shrink-0 transition-transform group-hover:scale-110", statusDisplay.className)}>
                                <SIcon size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">Pedido #{order.id.slice(-6).toUpperCase()}</h3>
                                <p className="text-xs font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                                    <Calendar size={12} />
                                    {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString("es-CO", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Reciente'}
                                </p>
                            </div>
                        </div>
                        <p className="text-xl font-black text-slate-900">
                            ${order.total.toLocaleString("es-CO")}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-500 border-t border-slate-50 pt-4">
                        <span>{order.items.reduce((acc, i) => acc + i.quantity, 0)} items</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <MessageCircle size={14} className="text-emerald-500" /> Consultas
                        </span>
                        {order.imageUrl && (
                            <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <ImageIcon size={14} className="text-blue-500"/> Imagen adjunta
                                </span>
                            </>
                        )}
                        {/* Botón Editar — solo para pedidos pendientes */}
                        {order.status === "pending" && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingOrder(order);
                                }}
                                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black text-amber-600 bg-amber-50 border border-amber-100 rounded-xl hover:bg-amber-100 transition-all"
                            >
                                <Pencil size={12} />
                                Editar
                            </button>
                        )}
                    </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* NEW ORDER MODAL */}
      {isNewOrderOpen && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm sm:p-6 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10 shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">{editingOrder ? "Editar Pedido" : "Nuevo Pedido"}</h2>
                        <p className="text-xs font-medium text-slate-500 mt-1">{editingOrder ? `Modificando pedido #${editingOrder.id.slice(-6).toUpperCase()}` : "Elige productos y envía tu solicitud."}</p>
                    </div>
                    <button 
                        onClick={handleCloseModal}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                        disabled={isSubmitting}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto flex flex-col p-5 space-y-8">
                    {/* Buscador y Productos */}
                    <div className="space-y-4">
                        <div className="relative group">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Busca productos por nombre..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-900 placeholder:text-slate-400"
                            />
                        </div>

                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 max-h-[200px] overflow-y-auto space-y-2">
                            {filteredProducts.length === 0 ? (
                                <p className="text-center text-sm font-medium text-slate-400 py-6">No se encontraron productos.</p>
                            ) : (
                                filteredProducts.map(prd => (
                                    <div key={prd.id} className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border border-slate-100">
                                        <div className="pr-4">
                                            <p className="text-sm font-black text-slate-900">{prd.name}</p>
                                            <p className="text-[10px] font-bold text-emerald-600">${prd.price.toLocaleString("es-CO")}</p>
                                        </div>
                                        <button
                                            onClick={() => handleAddToCart(prd)}
                                            className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-lg transition-colors border border-emerald-100"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Lista de productos seleccionados */}
                    {orderForm.items.length > 0 && (
                        <div className="space-y-4 border-t border-slate-100 pt-6">
                            <h3 className="text-sm font-black tracking-widest text-slate-400 uppercase">Productos seleccionados</h3>
                            <div className="space-y-3">
                                {orderForm.items.map(item => (
                                    <div key={item.productId} className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-slate-900">{item.name}</span>
                                            <span className="text-[10px] font-bold text-slate-400">${item.price.toLocaleString("es-CO")} c/u</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center bg-slate-100 rounded-lg p-1">
                                                <button onClick={() => handleUpdateQuantity(item.productId, -1)} className="w-6 h-6 flex items-center justify-center text-slate-600 font-black hover:bg-white rounded-md shadow-sm">-</button>
                                                <span className="w-8 text-center text-sm font-black text-slate-900">{item.quantity}</span>
                                                <button onClick={() => handleUpdateQuantity(item.productId, 1)} className="w-6 h-6 flex items-center justify-center text-slate-600 font-black hover:bg-white rounded-md shadow-sm">+</button>
                                            </div>
                                            <button onClick={() => handleRemoveFromCart(item.productId)} className="text-slate-400 hover:text-red-500 p-1">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Extras: Foto y Nota */}
                    <div className="space-y-4 border-t border-slate-100 pt-6">
                        <h3 className="text-sm font-black tracking-widest text-slate-400 uppercase">Detalles adicionales</h3>
                        
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500">Nota para el pedido <span className="text-slate-300">(Opcional)</span></label>
                            <textarea
                                value={orderForm.note}
                                onChange={(e) => setOrderForm(prev => ({ ...prev, note: e.target.value }))}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-slate-900 text-sm min-h-[80px] resize-none"
                                placeholder="Instrucciones especiales..."
                            />
                        </div>

                        {/* Dirección de entrega (obligatoria) */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Dirección de entrega <span className="text-red-500">*</span>
                            </label>
                            <div className="relative group">
                                <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                <input
                                    type="text"
                                    value={orderForm.address}
                                    onChange={(e) => setOrderForm(prev => ({ ...prev, address: e.target.value }))}
                                    placeholder="Ej: Calle 45 #12-30, Barrio Centro"
                                    className={cn(
                                        "w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-slate-900 placeholder:text-slate-400 text-sm",
                                        submitAttempted && !orderForm.address.trim() ? "border-red-400 bg-red-50" : "border-slate-200"
                                    )}
                                />
                            </div>
                            {submitAttempted && !orderForm.address.trim() && (
                                <p className="text-xs text-red-500 font-bold mt-1 px-1">La dirección es obligatoria para continuar.</p>
                            )}
                        </div>

                        {/* Botón de ubicación GPS (complemento opcional) */}
                        <div>
                            {orderForm.location ? (
                                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg shrink-0">
                                            <MapPin size={18} />
                                        </div>
                                        <p className="text-sm font-bold text-emerald-800 line-clamp-2">
                                            {orderForm.location.address || `Lat: ${orderForm.location.lat.toFixed(4)}, Lng: ${orderForm.location.lng.toFixed(4)}`}
                                        </p>
                                    </div>
                                    <button onClick={() => setOrderForm(prev => ({ ...prev, location: null }))} className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors shrink-0">
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleGetLocation}
                                    disabled={isLocating}
                                    className="w-full flex items-center justify-center gap-2 p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors disabled:opacity-50"
                                >
                                    {isLocating ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
                                    {isLocating ? "Obteniendo ubicación GPS..." : "Compartir mi ubicación GPS (opcional)"}
                                </button>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500">Adjuntar Imagen <span className="text-slate-300">(Opcional)</span></label>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center gap-2 transition-colors border border-slate-200"
                                >
                                    <Camera size={18} />
                                    Subir Foto
                                </button>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleImageChange}
                                />
                                {imagePreview && (
                                    <div className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-slate-200">
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                        <button onClick={() => { setImage(null); setImagePreview(null); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 scale-75">
                                            <X size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tipo de pago */}
                    <div className="space-y-4 border-t border-slate-100 pt-6">
                        <h3 className="text-sm font-black tracking-widest text-slate-400 uppercase">Tipo de pago</h3>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                            {[
                                { id: "Cash", label: "Efectivo", icon: Banknote },
                                { id: "Card", label: "Tarjeta", icon: CreditCard },
                                { id: "Digital", label: "Digital", icon: Smartphone },
                                { id: "Credit", label: "A crédito", icon: Clock },
                            ].map(method => {
                                const Icon = method.icon;
                                const isActive = orderForm.paymentMethod === method.id;
                                return (
                                    <button
                                        key={method.id}
                                        onClick={() => setOrderForm(prev => ({ ...prev, paymentMethod: method.id }))}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-3 gap-2 border rounded-xl font-bold text-xs transition-all",
                                            isActive 
                                              ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20" 
                                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                        )}
                                    >
                                        <Icon size={20} />
                                        <span>{method.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Resumen del pedido */}
                    {orderForm.items.length > 0 && (
                        <div className="space-y-4 border-t border-slate-100 pt-6 mb-4">
                            <h3 className="text-sm font-black tracking-widest text-slate-400 uppercase">Resumen del pedido</h3>
                            <div className="flex justify-between items-center bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                <span className="font-black text-emerald-800">Total a pagar:</span>
                                <span className="font-black text-emerald-600 text-xl">${cartTotal.toLocaleString("es-CO")}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Botón Enviar/Guardar — Fijo */}
                <div className="p-5 pt-4 border-t border-slate-100 bg-white shrink-0">
                    <button
                        onClick={handleSaveOrder}
                        disabled={isSubmitting || orderForm.items.length === 0 || !orderForm.address.trim()}
                        className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all flex justify-center items-center gap-2"
                    >
                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : editingOrder ? "Guardar cambios" : "Enviar Pedido"}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* CHAT / ORDER DETAIL MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-end sm:justify-center bg-slate-900/50 backdrop-blur-sm sm:p-6 animate-in fade-in duration-200">
            <div className="bg-white w-full h-[90vh] sm:h-[85vh] sm:max-w-2xl rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSelectedOrder(null)} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full sm:hidden">
                            <ChevronLeft size={24} />
                        </button>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                Pedido #{selectedOrder.id.slice(-6).toUpperCase()}
                                <span className={cn("px-2 py-0.5 text-[10px] uppercase tracking-widest rounded-md", getStatusDisplay(selectedOrder.status).className)}>
                                    {getStatusDisplay(selectedOrder.status).text}
                                </span>
                            </h2>
                            <p className="text-sm font-black text-emerald-600 mt-0.5">${selectedOrder.total.toLocaleString("es-CO")}</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setSelectedOrder(null)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors hidden sm:block"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body (Messages & Details) */}
                <div className="flex-grow overflow-y-auto bg-slate-50 flex flex-col p-4 sm:p-6 space-y-6">
                    {/* Order Details Preview */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-6">
                        <div className="flex-1 space-y-3">
                            <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase border-b border-slate-100 pb-2">Artículos del Pedido</h3>
                            <div className="space-y-1">
                                {selectedOrder.items.map(item => (
                                    <div key={item.productId} className="flex justify-between text-sm">
                                        <span className="font-bold text-slate-700">{item.quantity}x {item.name}</span>
                                        <span className="font-medium text-slate-500">${(item.price * item.quantity).toLocaleString("es-CO")}</span>
                                    </div>
                                ))}
                            </div>
                            {selectedOrder.note && (
                                <div className="mt-4 pt-3 border-t border-slate-100">
                                    <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">Nota</p>
                                    <p className="text-sm font-medium text-slate-600 italic bg-amber-50 p-3 rounded-xl border border-amber-100">{selectedOrder.note}</p>
                                </div>
                            )}
                        </div>
                        {selectedOrder.imageUrl && (
                            <div className="shrink-0">
                                <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">Imagen Adjunta</p>
                                <a href={selectedOrder.imageUrl} target="_blank" rel="noopener noreferrer" className="block w-24 h-24 sm:w-32 sm:h-32 rounded-xl border-2 border-slate-200 overflow-hidden hover:opacity-80 transition-opacity">
                                    <img src={selectedOrder.imageUrl} alt="Adjunto" className="w-full h-full object-cover" />
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-grow flex flex-col justify-end space-y-4 pt-4">
                        {messages.length === 0 ? (
                            <div className="text-center text-slate-400 text-sm font-medium py-10">
                                Envía un mensaje si tienes preguntas o modificaciones para tu pedido.
                            </div>
                        ) : (
                            messages.map(msg => {
                                const isMe = msg.senderId === user.uid;
                                return (
                                    <div key={msg.id} className={cn("flex flex-col max-w-[85%] sm:max-w-[75%]", isMe ? "self-end items-end" : "self-start items-start")}>
                                        <span className="text-[10px] font-bold text-slate-400 mb-1 px-1">
                                            {msg.senderName} {msg.senderRole === "admin" || msg.senderRole === "propietario" ? "(Tienda)" : ""}
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
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Chat Input */}
                <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(e);
                                }
                            }}
                            placeholder="Escribe un mensaje..."
                            className="flex-grow max-h-32 min-h-[48px] bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-slate-900 text-sm resize-none"
                            rows={1}
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim() || isSendingMsg}
                            className="p-3.5 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 disabled:opacity-50 transition-all shrink-0"
                        >
                            {isSendingMsg ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                        </button>
                    </form>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}
