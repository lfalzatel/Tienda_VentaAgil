"use client";

import { useState } from "react";
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  runTransaction,
  doc 
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuthStore } from "@/store/useAuthStore";

interface SaleData {
  items: any[];
  total: number;
  paymentMethod: string;
  customerName?: string;
}

export const useSales = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuthStore();

  const processSale = async (data: SaleData & { debtorId?: string }) => {
    setIsProcessing(true);
    try {
      await runTransaction(db, async (transaction) => {
        // ... (pre-reads remain the same)
        
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

        // ... (validations remain the same)
        productSnapshots.forEach((productDoc, index) => {
          const item = data.items[index];
          if (!productDoc.exists()) {
            throw new Error(`Producto ${item.name} no encontrado.`);
          }
          const currentStock = productDoc.data().stock || 0;
          if (currentStock < item.quantity) {
            throw new Error(`Stock insuficiente para ${item.name}.`);
          }
        });

        // 2. ESCRITURAS
        
        // 2.1. Actualizar stock y popularidad
        productSnapshots.forEach((productDoc, index) => {
          const item = data.items[index];
          const currentData = productDoc.data();
          transaction.update(productDoc.ref, {
            stock: (currentData?.stock || 0) - item.quantity,
            salesCount: (currentData?.salesCount || 0) + item.quantity
          });
        });

        // 2.2. Crear el registro de la venta
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

        // 2.3. Si es a crédito, actualizar deudor
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
