"use client";

import { useState, useEffect, useCallback } from "react";

export type PermisoNotificacion = NotificationPermission;

export const useNotificaciones = () => {
  const [permiso, setPermiso] = useState<PermisoNotificacion>("default");

  // Al montar, verificamos el permiso actual si estamos en el navegador
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermiso(Notification.permission);
    }
  }, []);

  /**
   * Solicita permiso al usuario para mostrar notificaciones.
   * Solo debe ejecutarse desde un gesto del usuario.
   */
  const solicitarPermiso = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied";
    }

    try {
      const result = await Notification.requestPermission();
      setPermiso(result);
      return result;
    } catch (error) {
      console.error("Error al solicitar permiso de notificación:", error);
      return "denied";
    }
  }, []);

  /**
   * Muestra una notificación nativa del navegador.
   */
  const mostrarNotificacion = useCallback(
    (titulo: string, opciones?: NotificationOptions) => {
      if (
        typeof window === "undefined" ||
        !("Notification" in window) ||
        permiso !== "granted"
      ) {
        return;
      }

      const defaultOptions: NotificationOptions = {
        icon: "/icon-192.png",
        ...opciones,
      };

      try {
        new Notification(titulo, defaultOptions);
      } catch (error) {
        console.error("Error al mostrar la notificación:", error);
      }
    },
    [permiso]
  );

  /**
   * Activa la vibración del dispositivo si está disponible.
   */
  const vibrar = useCallback((patron: number[] = [200, 100, 200]) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(patron);
    }
  }, []);

  /**
   * Actualiza el badge (indicador) del ícono de la app.
   */
  const actualizarBadge = useCallback(async (cantidad: number) => {
    if (typeof navigator !== "undefined" && "setAppBadge" in navigator) {
      try {
        await (navigator as any).setAppBadge(cantidad);
      } catch (error) {
        console.error("Error al actualizar el badge:", error);
      }
    }
  }, []);

  /**
   * Limpia el badge del ícono de la app.
   */
  const limpiarBadge = useCallback(async () => {
    if (typeof navigator !== "undefined" && "clearAppBadge" in navigator) {
      try {
        await (navigator as any).clearAppBadge();
      } catch (error) {
        console.error("Error al limpiar el badge:", error);
      }
    }
  }, []);

  return {
    permiso,
    solicitarPermiso,
    mostrarNotificacion,
    vibrar,
    actualizarBadge,
    limpiarBadge,
  };
};
