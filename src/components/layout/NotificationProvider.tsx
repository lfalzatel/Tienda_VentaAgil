"use client";

import { useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuthStore } from "@/store/useAuthStore";
import { useNotificaciones } from "@/lib/hooks/useNotificaciones";
import { SolicitudNotificacion } from "@/components/ui/SolicitudNotificacion";

export function NotificationProvider() {
  const { user } = useAuthStore();
  const { actualizarBadge, limpiarBadge } = useNotificaciones();

  useEffect(() => {
    if (!user) {
      limpiarBadge();
      return;
    }

    // Escuchar notificaciones no leídas para el usuario actual
    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", user.uid),
      where("read", "==", false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const count = snapshot.size;
      if (count > 0) {
        actualizarBadge(count);
      } else {
        limpiarBadge();
      }
    }, (error) => {
      // Manejar errores de permisos (silenciosamente si es posible o log)
      if (error.code !== "permission-denied") {
        console.error("Error al escuchar notificaciones para el badge:", error);
      }
    });

    return () => unsubscribe();
  }, [user, actualizarBadge, limpiarBadge]);

  return <SolicitudNotificacion />;
}
