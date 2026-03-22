import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export const createNotification = async (data: {
  recipientId: string;
  recipientRole?: string;
  type: string;
  title: string;
  body: string;
  link: string;
}) => {
  try {
    await addDoc(collection(db, "notifications"), {
      ...data,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error("Error creando notificación:", err);
  }
};
