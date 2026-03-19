"use client";

import { useEffect, useState } from "react";
import { 
  Search, 
  Plus, 
  Minus, 
  Package, 
  AlertTriangle, 
  Check, 
  ChevronRight,
  ShoppingCart,
  ArrowRight,
  ArrowLeft,
  X,
  Loader2,
  Save,
  DollarSign,
  Hash,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, runTransaction, Timestamp, doc } from "firebase/firestore";

interface Product {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  markup: number;
  stock: number;
}

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PurchaseModal = ({ isOpen, onClose }: PurchaseModalProps) => {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [step, setStep] = useState<1 | 2>(1); // 1: Selection, 2: Batch Editing
  
  const [batchData, setBatchData] = useState<Record<string, { quantity: number, costPrice: number, markup: number, price: number }>>({});

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snap = await getDocs(collection(db, "products"));
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      } catch (err) {
        console.error("Error fetching products:", err);
      }
    };
    if (isOpen) {
      fetchProducts();
      setStep(1);
      setSelectedProductIds([]);
      setBatchData({});
    }
  }, [isOpen]);

  const toggleProductSelection = (product: Product) => {
    setSelectedProductIds(prev => {
      if (prev.includes(product.id)) {
        const next = prev.filter(id => id !== product.id);
        const { [product.id]: _, ...rest } = batchData;
        setBatchData(rest);
        return next;
      } else {
        setBatchData(prevBatch => ({
          ...prevBatch,
          [product.id]: {
            quantity: 1,
            costPrice: product.costPrice || 0,
            markup: product.markup || 0,
            price: product.price || 0,
          }
        }));
        return [...prev, product.id];
      }
    });
  };

  if (!isOpen) return null;

  const filteredProducts = products
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const aCritical = (a.stock || 0) <= 5;
      const bCritical = (b.stock || 0) <= 5;
      if (aCritical && !bCritical) return -1;
      if (!aCritical && bCritical) return 1;
      return 0;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProductIds.length === 0) return;
    setLoading(true);

    try {
      await runTransaction(db, async (transaction) => {
        // 1. Realizar todas las LECTURAS primero
        const snapshots = await Promise.all(
          selectedProductIds.map(id => transaction.get(doc(db, "products", id)))
        );

        // 2. Realizar todas las ESCRITURAS después
        snapshots.forEach((productSnap, index) => {
          const productId = selectedProductIds[index];
          if (!productSnap.exists()) return;

          const data = batchData[productId];
          const currentData = productSnap.data();
          const newStock = (currentData.stock || 0) + data.quantity;

          // Actualizar producto
          transaction.update(doc(db, "products", productId), {
            stock: newStock,
            costPrice: data.costPrice,
            markup: data.markup,
            price: data.price
          });

          // Crear registro de compra
          const purchaseRef = doc(collection(db, "purchases"));
          transaction.set(purchaseRef, {
            productId,
            productName: currentData.name,
            quantity: data.quantity,
            costPrice: data.costPrice,
            total: data.quantity * data.costPrice,
            createdAt: Timestamp.now()
          });
        });
      });

      onClose();
    } catch (error) {
      console.error("Error registering batch purchase:", error);
      alert("Error al registrar la compra por lotes");
    } finally {
      setLoading(false);
    }
  };

  const totalInvestment = selectedProductIds.reduce((sum, id) => {
    const data = batchData[id];
    return sum + (data?.quantity * data?.costPrice || 0);
  }, 0);

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      
      <div className={cn(
        "relative w-full h-full md:h-auto bg-white rounded-2xl md:rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300 flex flex-col max-h-[95vh] md:max-h-[85vh] transition-all duration-500",
        step === 1 ? "max-w-xl" : "max-w-3xl"
      )}>
        <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
          {/* Header */}
          <div className="p-4 md:p-6 md:pb-4 bg-gradient-to-r from-emerald-500 to-cyan-600 flex justify-between items-center border-b-2 border-emerald-600">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                {step === 1 ? "Seleccionar Productos" : "Editar Detalles"}
              </h2>
              <p className="text-[8px] md:text-[10px] font-bold text-emerald-100/80 uppercase tracking-widest mt-0.5">
                {selectedProductIds.length} seleccionados · Registrar Compra
              </p>
            </div>
            <button type="button" onClick={onClose} className="p-2 text-white/70 hover:text-white rounded-2xl transition-all">
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-3 md:p-6 space-y-3 overflow-y-auto custom-scrollbar flex-grow min-h-0">
            {step === 1 ? (
              /* Selection View */
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input
                    autoFocus
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900/5 transition-all text-xs font-bold"
                    placeholder="Buscar..."
                  />
                </div>

                <div className="grid grid-cols-1 gap-1.5 pr-2">
                  {filteredProducts.map(p => {
                    const isSelected = selectedProductIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleProductSelection(p)}
                        className={cn(
                          "w-full flex items-center justify-between p-2.5 rounded-lg transition-all group border text-xs",
                          isSelected 
                            ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/10 scale-[0.99]" 
                            : "bg-white border-transparent hover:border-slate-100 hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0",
                            isSelected ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-600"
                          )}>
                            <Package size={16} />
                          </div>
                          <div className="text-left min-w-0">
                            <div className="flex items-center gap-1 flex-wrap">
                              <p className={cn("font-black", isSelected ? "text-white" : "text-slate-900")}>
                                {p.name}
                              </p>
                              {(p.stock || 0) <= 5 && !isSelected && (
                                <span className="text-[7px] font-black bg-orange-500 text-white px-1 rounded-sm uppercase">
                                  CRÍTICO
                                </span>
                              )}
                            </div>
                            <p className={cn("text-[8px] font-bold uppercase tracking-tighter", isSelected ? "text-white/60" : "text-slate-400")}>
                              Stock: {p.stock} | ${p.costPrice?.toLocaleString("es-CO")}
                            </p>
                          </div>
                        </div>
                        {isSelected ? <Save size={14} /> : <Plus size={14} className="text-slate-300 group-hover:text-slate-900" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Batch Edit View */
              <div className="space-y-3">
                <div className="space-y-3">
                  {selectedProductIds.map(id => {
                    const product = products.find(p => p.id === id);
                    const data = batchData[id];
                    if (!product || !data) return null;

                    return (
                      <div key={id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Package size={16} />
                            </div>
                            <div>
                              <p className="font-black text-slate-900 text-sm">{product.name}</p>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Stock: {product.stock}</p>
                            </div>
                          </div>
                          <div className="text-right">
                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Subtotal</p>
                             <p className="text-xs font-black text-slate-900">${(data.quantity * data.costPrice).toLocaleString("es-CO")}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest px-1">Cant.</label>
                            <input
                              type="number"
                              min="1"
                              value={data.quantity}
                              onChange={(e) => setBatchData({ 
                                ...batchData, 
                                [id]: { ...data, quantity: Number(e.target.value) } 
                              })}
                              className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-xs font-bold text-slate-900"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest px-1">Costo</label>
                            <input
                              type="number"
                              value={data.costPrice}
                              onChange={(e) => {
                                const cost = Number(e.target.value);
                                const price = cost * (1 + data.markup / 100);
                                setBatchData({ 
                                  ...batchData, 
                                  [id]: { ...data, costPrice: cost, price: Math.round(price) } 
                                });
                              }}
                              className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-xs font-bold text-slate-900"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest px-1">Margen %</label>
                            <input
                              type="number"
                              value={data.markup}
                              onChange={(e) => {
                                const markup = Number(e.target.value);
                                const price = data.costPrice * (1 + markup / 100);
                                setBatchData({ 
                                  ...batchData, 
                                  [id]: { ...data, markup, price: Math.round(price) } 
                                });
                              }}
                              className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-xs font-bold text-slate-900"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest px-1">Venta</label>
                            <input
                              type="number"
                              value={data.price}
                              onChange={(e) => {
                                const price = Number(e.target.value);
                                const markup = data.costPrice > 0 ? ((price - data.costPrice) / data.costPrice) * 100 : 0;
                                setBatchData({ 
                                  ...batchData, 
                                  [id]: { ...data, price, markup: Number(markup.toFixed(2)) } 
                                });
                              }}
                              className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-xs font-bold text-slate-900"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 md:p-6 md:pt-3 border-t border-slate-200 bg-slate-50 flex flex-col gap-2">
            {step === 2 && (
              <div className="flex justify-between items-center px-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Inversión Total</span>
                <span className="text-lg font-black text-slate-900">${totalInvestment.toLocaleString("es-CO")}</span>
              </div>
            )}
            
            <div className="flex gap-3">
              {step === 1 ? (
                <button
                  disabled={selectedProductIds.length === 0}
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-slate-900/10"
                >
                  Continuar ({selectedProductIds.length})
                  <ArrowRight size={16} />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-shrink-0 px-6 bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                  >
                    Volver
                  </button>
                  <button
                    disabled={loading}
                    type="submit"
                    className="flex-grow flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-emerald-600/10"
                  >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : (
                      <>
                        <Save size={16} />
                        Confirmar
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
