import { messaging } from "@/lib/firebase/config";
import { getToken, onMessage } from "firebase/messaging";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

const VAPID_KEY = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;

export const requestPushPermission = async (userId: string): Promise<boolean> => {
  try {
    if (!messaging) {
      console.warn("FCM messaging no está inicializado");
      return false;
    }
    
    // Check if running in a supported environment
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      console.warn("Notificaciones o Service Worker no soportados en este navegador");
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Permiso de notificaciones denegado");
      return false;
    }

    // Registro explícito del Service Worker para mayor fiabilidad en Next.js
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/"
    });

    // Esperar a que el Service Worker esté activo
    await navigator.serviceWorker.ready;

    console.log("Service Worker registrado y listo para FCM:", registration);

    const token = await getToken(messaging, { 
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (!token) {
      console.warn("No se pudo obtener el token FCM");
      return false;
    }

    // Guardar el token FCM del dispositivo en Firestore
    await setDoc(doc(db, "fcm_tokens", userId), {
      token,
      userId,
      updatedAt: new Date()
    }, { merge: true });

    console.log("Token FCM obtenido y guardado con éxito");
    return true;
  } catch (err) {
    console.error("Error obteniendo token FCM:", err);
    return false;
  }
};

// Escuchar notificaciones cuando la app está en PRIMER PLANO
export const onForegroundMessage = (callback: (payload: any) => void) => {
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
};
