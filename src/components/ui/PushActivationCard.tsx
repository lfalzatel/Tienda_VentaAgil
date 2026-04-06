"use client";

import { useState, useEffect } from "react";
import { BellRing, X } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { requestPushPermission } from "@/lib/utils/pushNotifications";
import { cn } from "@/lib/utils";

export const PushActivationCard = () => {
  const { user } = useAuthStore();
  const [isVisible, setIsVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission !== "granted") {
        const dismissedAt = localStorage.getItem("pushCardDismissedAt");
        let shouldShow = true;
        if (dismissedAt) {
          const daysPassed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
          if (daysPassed < 3) {
            shouldShow = false; // Hide for 3 days if dismissed
          }
        }
        if (shouldShow) setIsVisible(true);
      }
    }
  }, []);

  const handleActivate = async () => {
    if (!user?.uid) return;
    setIsProcessing(true);
    try {
      const success = await requestPushPermission(user.uid);
      if (success) {
        setIsVisible(false);
      } else {
        alert("No se pudieron otorgar los permisos de notificación. Verifica los ajustes de tu navegador.");
      }
    } catch(err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    localStorage.setItem("pushCardDismissedAt", Date.now().toString());
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-[2.5rem] p-6 text-white shadow-xl relative overflow-hidden mb-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="absolute top-[-20%] right-[-10%] h-40 w-40 rounded-full bg-white/10 blur-[40px] pointer-events-none"></div>
      
      <button 
        onClick={handleClose} 
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
      >
        <X size={16} />
      </button>

      <div className="flex items-start gap-4 relative z-10">
        <div className="p-3 bg-white/20 rounded-2xl shrink-0 backdrop-blur-sm shadow-sm ring-1 ring-white/20">
          <BellRing size={28} className="text-white drop-shadow-md" />
        </div>
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="text-lg font-black tracking-tight mb-1 text-white text-shadow-sm">¡Avisos en tiempo real!</h3>
          <p className="text-xs sm:text-sm font-medium text-white/90 leading-relaxed mb-4 max-w-[90%]">
            Activa las notificaciones Push para que tu dispositivo emita <strong className="text-white">un sonido y vibre</strong> incluso con la pantalla apagada.
          </p>
          <button 
            onClick={handleActivate}
            disabled={isProcessing}
            className={cn(
              "px-5 py-2.5 bg-white text-indigo-600 font-black text-sm rounded-xl hover:bg-slate-50 transition-all active:scale-95 shadow-md",
              isProcessing && "opacity-70 pointer-events-none"
            )}
          >
            {isProcessing ? "Configurando..." : "Activar Alertas"}
          </button>
        </div>
      </div>
    </div>
  );
};
