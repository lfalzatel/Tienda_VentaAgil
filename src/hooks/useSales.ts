"use client";

import { useState } from "react";
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  runTransaction,
  doc,
  query,
  where,
  Timestamp,
  getCountFromServer
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuthStore } from "@/store/useAuthStore";
import { useNotificaciones } from "@/lib/hooks/useNotificaciones";

interface SaleData {
  items: any[];
  total: number;
  paymentMethod: string;
  customerName?: string;
}

export const useSales = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuthStore();
  const { mostrarNotificacion, vibrar, actualizarBadge } = useNotificaciones();

  const processSale = async (data: SaleData & { debtorId?: string }) => {
    setIsProcessing(true);
    try {
      let lowStockItems: { name: string; quantity: number }[] = [];

      await runTransaction(db, async (transaction) => {
        // 1.1. Leer productos
        const productSnapshots = await Promise.all(
          data.items.map(item => transaction.get(doc(db, "products", item.id)))
        );

        // 1.2. Leer deudor si es crédito
        let debtorDoc = null;
        if (data.paymentMethod === "Credit" && data.debtorId) {
          const debtorRef = doc(db, "debtors", data.debtorId);
          debtorDoc = await transaction.get(debtorRef);
          if (!debtorDoc.exists()) throw new Error("Cliente no encontrado.");
        }

        // Validaciones de stock
        productSnapshots.forEach((productDoc, index) => {
          const item = data.items[index];
          if (!productDoc.exists()) {
            throw new Error(`Producto ${item.name} no encontrado.`);
          }
          const currentStock = productDoc.data()?.stock || 0;
          if (currentStock < item.quantity) {
            throw new Error(`Stock insuficiente para ${item.name}.`);
          }
        });

        // 2. ESCRITURAS
        
        // 2.1. Actualizar stock y popularidad
        productSnapshots.forEach((productDoc, index) => {
          const item = data.items[index];
          const currentData = productDoc.data();
          const newStock = (currentData?.stock || 0) - item.quantity;
          const stockMinimo = currentData?.stockMinimo ?? 5; // Default common in the app

          transaction.update(productDoc.ref, {
            stock: newStock,
            salesCount: (currentData?.salesCount || 0) + item.quantity
          });

          if (newStock <= stockMinimo) {
            lowStockItems.push({ name: item.name, quantity: newStock });
          }
        });

        // ... rest of transaction writes (creating sale, updating debtor)
        const salesRef = collection(db, "sales");
        const newSaleRef = doc(salesRef);
        
        transaction.set(newSaleRef, {
          items: data.items.map(i => ({
            id: i.id,
            name: i.name,
            price: i.price,
            costPrice: i.costPrice || 0,
            quantity: i.quantity
          })),
          total: data.total,
          paymentMethod: data.paymentMethod,
          debtorId: data.debtorId || null,
          customerName: data.customerName || (debtorDoc ? debtorDoc.data().name : null),
          createdBy: user?.uid || "anonymous",
          createdAt: serverTimestamp(),
          status: "completed"
        });

        if (data.paymentMethod === "Credit" && data.debtorId && debtorDoc) {
          const currentDebt = debtorDoc.data().totalDebt || 0;
          transaction.update(debtorDoc.ref, {
            totalDebt: currentDebt + data.total,
            lastUpdate: new Date().toISOString()
          });

          const debtorTransRef = collection(db, "debtor_transactions");
          const newDebtorTransRef = doc(debtorTransRef);
          transaction.set(newDebtorTransRef, {
            debtorId: data.debtorId,
            saleId: newSaleRef.id,
            type: "sale",
            amount: data.total,
            date: serverTimestamp(),
            description: "Compra a crédito"
          });
        }
      });

      // Operaciones post-transacción exitosa
      const totalFormatted = (data.total ?? 0).toLocaleString("es-CO");
      mostrarNotificacion("Venta registrada", { 
        body: `Total: $${totalFormatted}`,
        icon: "/icon-192.png"
      });
      vibrar([100, 50, 100]);

      // Actualizar App Badge con ventas del día
      try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const qSalesToday = query(
          collection(db, "sales"),
          where("createdAt", ">=", Timestamp.fromDate(startOfDay))
        );
        const snapshot = await getCountFromServer(qSalesToday);
        actualizarBadge(snapshot.data().count);
      } catch (badgeError) {
        console.warn("No se pudo actualizar el badge:", badgeError);
      }

      // Notificaciones de stock bajo (solo para admin)
      if (user?.role === "admin" || user?.role === "propietario") {
        lowStockItems.forEach(item => {
          mostrarNotificacion("Stock bajo", {
            body: `Quedan ${item.quantity} unidades de ${item.name}`,
            icon: "/icon-192.png"
          });
        });
      }

      return true;
    } catch (error: any) {
      console.error("Error processing sale:", error);
      alert(error.message || "Error al procesar la venta.");
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  return { processSale, isProcessing };
};
