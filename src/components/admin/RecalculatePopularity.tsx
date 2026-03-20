"use client";

import { useState } from "react";
import { collection, getDocs, writeBatch, doc, query } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

export function RecalculatePopularity() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [progress, setProgress] = useState(0);

  const recalculate = async () => {
    setIsProcessing(true);
    setStatus("idle");
    setProgress(0);
    
    try {
      // 1. Obtener todas las ventas
      const salesSnap = await getDocs(collection(db, "sales"));
      const sales = salesSnap.docs.map(d => d.data());
      
      // 2. Calcular salesCount por producto
      const popularityMap: Record<string, number> = {};
      
      sales.forEach(sale => {
        sale.items?.forEach((item: any) => {
          if (item.id) {
            popularityMap[item.id] = (popularityMap[item.id] || 0) + (item.quantity || 0);
          }
        });
      });
      
      // 3. Actualizar productos en lotes (batches de 500)
      const productIds = Object.keys(popularityMap);
      const batchSize = 500;
      
      for (let i = 0; i < productIds.length; i += batchSize) {
        const batch = writeBatch(db);
        const currentBatchIds = productIds.slice(i, i + batchSize);
        
        currentBatchIds.forEach(id => {
          const productRef = doc(db, "products", id);
          batch.update(productRef, {
            salesCount: popularityMap[id]
          });
        });
        
        await batch.commit();
        setProgress(Math.round(((i + currentBatchIds.length) / productIds.length) * 100));
      }
      
      setStatus("success");
    } catch (error) {
      console.error("Error recalculating popularity:", error);
      setStatus("error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-black text-slate-900 tracking-tight">Sincronizar Popularidad</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Calcula el orden basado en ventas históricas</p>
        </div>
        <button
          onClick={recalculate}
          disabled={isProcessing}
          className="p-2 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-600 hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw size={20} className={isProcessing ? "animate-spin" : ""} />
        </button>
      </div>

      {status === "success" && (
        <div className="mt-2 flex items-center gap-2 text-emerald-600 text-[10px] font-bold uppercase tracking-widest bg-emerald-50 p-2 rounded-lg border border-emerald-100">
          <CheckCircle2 size={14} />
          ¡Popularidad actualizada correctamente!
        </div>
      )}

      {status === "error" && (
        <div className="mt-2 flex items-center gap-2 text-red-600 text-[10px] font-bold uppercase tracking-widest bg-red-50 p-2 rounded-lg border border-red-100">
          <AlertCircle size={14} />
          Error al actualizar. Revisa la consola.
        </div>
      )}

      {isProcessing && (
        <div className="mt-4">
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-sky-500 transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-[9px] font-black text-slate-400 uppercase text-center tracking-widest">
            Procesando productos... {progress}%
          </p>
        </div>
      )}
    </div>
  );
}
