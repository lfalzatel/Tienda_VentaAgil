"use client";

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { useNotificaciones } from "@/lib/hooks/useNotificaciones";

export const SolicitudNotificacion = () => {
  const { permiso, solicitarPermiso } = useNotificaciones();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Solo mostrar si el permiso es "default"
    if (permiso !== "default") {
      setIsVisible(false);
      return;
    }

    // Verificar si el usuario ya pospuso la notificación en los últimos 3 días
    const notifPospuesta = localStorage.getItem("notif_pospuesta");
    if (notifPospuesta) {
      const fechaPospuesta = new Date(parseInt(notifPospuesta, 10));
      const ahora = new Date();
      const tresDiasEnMs = 3 * 24 * 60 * 60 * 1000;

      if (ahora.getTime() - fechaPospuesta.getTime() < tresDiasEnMs) {
        setIsVisible(false);
        return;
      }
    }

    setIsVisible(true);
  }, [permiso]);

  const handleActivar = async () => {
    const result = await solicitarPermiso();
    if (result !== "default") {
      setIsVisible(false);
    }
  };

  const handlePosponer = () => {
    localStorage.setItem("notif_pospuesta", Date.now().toString());
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 p-4 max-w-2xl mx-auto flex items-center gap-4">
        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full text-blue-600 dark:text-blue-400">
          <Bell className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">
            Activa las notificaciones para recibir alertas de ventas y stock bajo
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePosponer}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Ahora no
          </button>
          <button
            onClick={handleActivar}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors whitespace-nowrap"
          >
            Activar notificaciones
          </button>
        </div>

        <button 
          onClick={handlePosponer}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
