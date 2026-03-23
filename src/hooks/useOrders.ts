"use client";

import { useState } from "react";
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  doc,
  setDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuthStore } from "@/store/useAuthStore";
import { useNotificaciones } from "@/lib/hooks/useNotificaciones";

interface OrderData {
  items: any[];
  total: number;
  paymentMethod: string;
  note?: string;
  address?: string;
  location?: { lat: number; lng: number } | null;
}

export const useOrders = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuthStore();
  const { mostrarNotificacion, vibrar } = useNotificaciones();

  const createOrder = async (data: OrderData) => {
    if (!user) {
      alert("Debes iniciar sesión para realizar un pedido.");
      return false;
    }

    setIsProcessing(true);
    try {
      const ordersRef = collection(db, "orders");
      const orderDoc = {
        clientId: user.uid,
        clientName: user.name || "Cliente",
        status: "pending",
        items: data.items.map(i => ({
          productId: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity
        })),
        total: data.total,
        paymentMethod: data.paymentMethod,
        note: data.note || "",
        address: data.address || "",
        location: data.location || null,
        imageUrl: "", // Initially empty, can be updated if needed
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(ordersRef, orderDoc);

      // Create initial system message in the order chat
      await addDoc(collection(db, `orders/${docRef.id}/messages`), {
        senderId: "system",
        senderName: "Sistema",
        senderRole: "system",
        text: "Pedido realizado con éxito. El administrador revisará tu solicitud pronto.",
        createdAt: serverTimestamp()
      });

      // Notify admin (can be expanded later with Cloud Functions or similar)
      mostrarNotificacion("Pedido Enviado", { 
        body: `Tu pedido por $${(data.total ?? 0).toLocaleString("es-CO")} ha sido enviado.`,
        icon: "/icon-192.png"
      });
      vibrar([100, 50, 100]);

      return true;
    } catch (error: any) {
      console.error("Error creating order:", error);
      alert(error.message || "Error al enviar el pedido.");
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  return { createOrder, isProcessing };
};
