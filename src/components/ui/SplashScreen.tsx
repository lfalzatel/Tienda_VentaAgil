"use client";

import { useEffect, useState } from "react";
import { Skull, Fingerprint } from "lucide-react";
import { useSplashStore } from "@/store/useSplashStore";
import { cn } from "@/lib/utils";

const MESSAGES = {
  login: [
    "Validando credenciales...",
    "Sincronizando perfil...",
    "Preparando tu tablero...",
    "Cargando inventario...",
    "¡Casi listo!",
  ],
  logout: [
    "Cerrando sesión de forma segura...",
    "Guardando cambios pendientes...",
    "Limpiando caché local...",
    "Saliendo del sistema...",
    "¡Vuelve pronto!",
  ],
  reload: [
    "Recuperando sesión local...",
    "Actualizando base de datos...",
    "Verificando conexión...",
    "Sincronizando...",
    "Iniciando...",
  ],
};

export const SplashScreen = () => {
  const { isVisible, mode, progress, message } = useSplashStore();
  const [isLeaving, setIsLeaving] = useState(false);
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [messageIndex, setMessageIndex] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(message);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      setIsLeaving(false);
    } else {
      setIsLeaving(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 500); 
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % MESSAGES[mode].length);
    }, 1200);
    return () => clearInterval(interval);
  }, [isVisible, mode]);

  useEffect(() => {
    setCurrentMessage(MESSAGES[mode][messageIndex]);
  }, [mode, messageIndex]);

  if (!shouldRender) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#f8fafc] select-none transition-all duration-500 ease-in-out",
      isLeaving ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"
    )}>
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-emerald-50 blur-[120px] opacity-60"></div>
        <div className="absolute bottom-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-sky-50 blur-[120px] opacity-60"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-12">
        {/* Animated Rings and Icon */}
        <div className="relative flex items-center justify-center h-32 w-32">
          {/* Inner Ring (Clockwise) */}
          <div className="absolute inset-0 rounded-full border-[3px] border-emerald-500/20 border-t-emerald-500 animate-spin"></div>
          
          {/* Outer Ring (Counter-Clockwise) */}
          <div className="absolute -inset-4 rounded-full border-[3px] border-sky-500/10 border-b-sky-500 animate-spin-reverse duration-1000"></div>
          
          {/* Central Icon */}
          <div className="bg-white rounded-[1.8rem] h-20 w-20 flex items-center justify-center shadow-2xl border border-slate-100">
             <Skull className="h-10 w-10 text-[#0f2922]" />
          </div>
        </div>

        {/* Text and Progress */}
        <div className="flex flex-col items-center gap-8 w-64">
           <div className="text-center space-y-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight italic">VentaÁgil</h2>
              <p className="text-sm font-bold text-emerald-600 transition-all duration-500 min-h-[20px]">
                {message || currentMessage}
              </p>
           </div>

           {/* Progress Bar Container */}
           <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner p-[1px]">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
           </div>
           
           <span className="text-[10px] font-black tracking-[0.2em] text-slate-300 uppercase">
             {Math.round(progress)}% Completo
           </span>
        </div>
      </div>

      {/* Security Badge */}
      <div className="absolute bottom-12 flex flex-col items-center gap-2">
         <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-100">
           <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
           <span className="text-[10px] font-bold text-slate-400 tracking-wider">CONEXIÓN SEGURA ACTIVA</span>
         </div>
      </div>
    </div>
  );
};
