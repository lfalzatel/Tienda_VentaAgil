"use client";

import { X, Package, Database, AlertTriangle, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface Product {
  id?: string;
  name: string;
  price: number;
  costPrice: number;
  markup: number;
  category: string;
  stock: number;
  image?: string;
}

interface LowStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

export const LowStockModal = ({ isOpen, onClose, products }: LowStockModalProps) => {
  const router = useRouter();

  if (!isOpen) return null;

  const handleGoToPurchases = () => {
    onClose();
    router.push("/admin/purchases");
  };

  return (
    <>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
        
        <div className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300">
          <div className="flex flex-col h-full max-h-[85vh]">
            {/* Header */}
            <div className="p-8 pb-4 flex justify-between items-center border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Stock Crítico
                  </h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {products.length} productos con 5 unidades o menos
                  </p>
                </div>
              </div>
              <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 rounded-2xl transition-all">
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto custom-scrollbar">
              <div className="space-y-3">
                {products.length === 0 ? (
                  <div className="py-12 text-center">
                    <Package className="mx-auto text-slate-200 mb-4" size={48} />
                    <p className="text-slate-400 font-bold">No hay productos con stock bajo actualmente.</p>
                  </div>
                ) : (
                  products.map((product) => (
                    <div 
                      key={product.id}
                      className="group flex items-center gap-4 p-4 bg-slate-50 hover:bg-white hover:shadow-xl hover:shadow-slate-100 rounded-3xl transition-all border border-transparent hover:border-slate-100"
                    >
                      <div className="h-16 w-16 rounded-2xl bg-white border border-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                        ) : (
                          <Package className="text-slate-300" size={24} />
                        )}
                      </div>
                      
                      <div className="flex-grow min-w-0">
                        <h3 className="font-black text-slate-900 truncate">{product.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-full">
                            {product.category}
                          </span>
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1",
                            product.stock === 0 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                          )}>
                            <Database size={10} />
                            Stock: {product.stock}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-4 bg-white text-slate-500 font-black rounded-2xl border border-slate-200 hover:bg-slate-100 transition-all"
              >
                Cerrar
              </button>
              <button
                onClick={handleGoToPurchases}
                className="flex-1 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <ShoppingCart size={18} />
                Ir a Comprar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};


