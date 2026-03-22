import { messaging } from "@/lib/firebase/config";
import { getToken, onMessage } from "firebase/messaging";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

const VAPID_KEY = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;

export const requestPushPermission = async (userId: string): Promise<boolean> => {
  try {
    if (!messaging) return false;
    
    // Check if running in a supported environment
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) return false;

    // Guardar el token FCM del dispositivo en Firestore
    await setDoc(doc(db, "fcm_tokens", userId), {
      token,
      userId,
      updatedAt: new Date()
    }, { merge: true });

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
