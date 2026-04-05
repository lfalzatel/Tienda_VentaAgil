"use client";

import { useCartStore } from "@/store/useCartStore";
import { 
  X, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  CheckCircle2, 
  Loader2,
  Navigation,
  Globe,
  MapPin,
  Hash,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useOrders } from "@/hooks/useOrders";

interface ClientCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type PaymentMethod = "Cash" | "Card" | "Digital" | "Credit";

export const ClientCheckoutModal = ({ isOpen, onClose, onSuccess }: ClientCheckoutModalProps) => {
  const { getTotal, removeTab, tabs, activeTabId } = useCartStore();
  const { createOrder, isProcessing } = useOrders();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [isSuccess, setIsSuccess] = useState(false);
  const [note, setNote] = useState("");
  const [address, setAddress] = useState("");
  const [gpsAddress, setGpsAddress] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const activeTab = tabs.find(t => t.id === activeTabId);
  const items = activeTab?.items || [];

  if (!isOpen && !isSuccess) return null;

  const handleCheckout = async () => {
    const finalAddress = address.trim() || gpsAddress;
    
    if (!finalAddress) {
      alert("Por favor, ingresa una dirección de entrega.");
      return;
    }

    const success = await createOrder({
      items,
      total: getTotal(),
      paymentMethod,
      note,
      address: finalAddress,
      location
    });

    if (success) {
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
        if (onSuccess) onSuccess();
        setPaymentMethod("Cash");
        setNote("");
        setAddress("");
        setGpsAddress("");
        setLocation(null);
        removeTab(activeTabId);
      }, 3000);
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        {
          headers: {
            'Accept-Language': 'es',
            'User-Agent': 'VentasTiendaClient/1.0'
          }
        }
      );
      const data = await response.json();
      if (data.display_name) {
        setGpsAddress(data.display_name);
      }
    } catch (error) {
      console.error("Error in reverse geocoding:", error);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización.");
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        await reverseGeocode(latitude, longitude);
        setIsGettingLocation(false);
        alert("Ubicación GPS capturada con éxito.");
      },
      (error) => {
        console.error("Error getting location:", error);
        setIsGettingLocation(false);
        alert("No se pudo obtener tu ubicación. Por favor, asegúrate de permitir el acceso al GPS.");
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[10px] animate-in fade-in duration-300"
        onClick={!isProcessing && !isSuccess ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-2xl shadow-slate-900/20 overflow-hidden animate-in zoom-in-95 fade-in duration-300">
        {isSuccess ? (
          <div className="p-12 text-center space-y-6">
            <div className="flex justify-center">
              <div className="bg-emerald-50 p-6 rounded-full animate-bounce">
                <CheckCircle2 size={64} className="text-emerald-500" />
              </div>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">¡Pedido Enviado!</h2>
            <p className="text-slate-500 font-medium">Hemos recibido tu pedido. Puedes seguir el estado en la sección de "Pedidos".</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Finalizar Pedido</h2>
                <p className="text-xs font-medium text-slate-500">Confirma los detalles de tu compra</p>
              </div>
              <button 
                disabled={isProcessing}
                onClick={onClose} 
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh] custom-scrollbar">
              {/* Summary Card */}
              <div className="bg-slate-900 rounded-[2rem] p-5 text-white flex justify-between items-center shadow-xl shadow-slate-900/20">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total a Pagar</p>
                  <p className="text-2xl font-black tracking-tighter">${getTotal().toLocaleString("es-CO")}</p>
                </div>
                <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <Hash size={20} className="text-white" />
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">¿Cómo deseas pagar?</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'Cash', label: 'Efectivo', icon: Banknote },
                    { id: 'Digital', label: 'Transferencia', icon: Smartphone },
                    { id: 'Card', label: 'Datafono', icon: CreditCard },
                    { id: 'Credit', label: 'A Crédito', icon: Hash },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-[1.25rem] border-2 transition-all duration-300",
                        paymentMethod === m.id 
                          ? "bg-slate-900 border-slate-900 text-white shadow-md scale-[1.02]" 
                          : "bg-white border-slate-100 text-slate-500 hover:border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <div className={cn(
                        "p-1.5 rounded-lg",
                        paymentMethod === m.id ? "bg-white/10" : "bg-slate-100"
                      )}>
                        <m.icon size={18} />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-wider">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Delivery Info */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Dirección de Entrega <span className="text-rose-500">*</span>
                  </label>
                  
                  {gpsAddress && (
                    <div className="mb-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="bg-emerald-50 border border-emerald-100 rounded-[1.25rem] p-3 flex items-center gap-3 group">
                         <div className="bg-emerald-100 p-2 rounded-lg">
                           <MapPin size={16} className="text-emerald-600" />
                         </div>
                         <p className="flex-grow text-xs font-bold text-emerald-900 leading-tight">
                           {gpsAddress}
                         </p>
                         <button 
                           onClick={() => {
                             setGpsAddress("");
                             setLocation(null);
                           }}
                           className="p-1.5 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all"
                         >
                           <X size={16} />
                         </button>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <div className="relative group flex-grow">
                      <MapPin className={cn(
                        "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors",
                        (location || gpsAddress) && "text-emerald-500"
                      )} size={16} />
                      <input
                        placeholder="Ej: Calle 45 #12-30"
                        className="w-full pl-10 pr-3 py-3 bg-slate-50 border-none rounded-[1.25rem] text-sm font-bold placeholder:text-slate-300 focus:ring-4 focus:ring-sky-500/10 transition-all"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </div>
                    <button 
                      onClick={handleGetLocation}
                      disabled={isGettingLocation || isProcessing}
                      title="Compartir mi ubicación actual"
                      className={cn(
                        "px-3 rounded-[1.25rem] transition-all flex items-center justify-center border-2",
                        (location || gpsAddress)
                          ? "bg-emerald-50 border-emerald-100 text-emerald-600 shadow-sm" 
                          : "bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      {isGettingLocation ? (
                        <Loader2 className="animate-spin text-sky-600" size={18} />
                      ) : (
                        (location || gpsAddress) ? <Globe size={18} /> : <Navigation size={18} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nota para el pedido</label>
                  <div className="relative group">
                    <MessageSquare className="absolute left-3 top-4 text-slate-400 group-focus-within:text-sky-500 transition-colors" size={16} />
                    <textarea
                      placeholder="Ej: Tocar el timbre fuerte..."
                      rows={2}
                      className="w-full pl-10 pr-3 py-3 bg-slate-50 border-none rounded-[1.25rem] text-sm font-bold placeholder:text-slate-300 focus:ring-4 focus:ring-sky-500/10 transition-all resize-none"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Confirm Button */}
              <button
                onClick={handleCheckout}
                disabled={isProcessing || items.length === 0}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-4 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-sky-600/20 transition-all duration-300 active:scale-[0.98] mt-2",
                  (isProcessing || items.length === 0) && "opacity-70 cursor-not-allowed shadow-none"
                )}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Enviando pedido...</span>
                  </>
                ) : (
                  <>
                    <span>Confirmar Pedido</span>
                    <CheckCircle2 size={18} />
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
