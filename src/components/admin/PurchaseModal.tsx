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
  TrendingUp,
  PackagePlus,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, runTransaction, Timestamp, doc } from "firebase/firestore";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  costPrice: number;
  markup: number;
  stock: number;
}

interface PurchaseItem {
  tempId: string;
  productId?: string; // undefined if it's a new product
  name: string;
  category: string;
  quantity: number;
  costPrice: number;
  markup: number;
  price: number;
  isNew: boolean;
}

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = ["Bebidas", "Snacks", "Abarrotes", "Limpieza", "Cuidado Personal", "Otros"];

export const PurchaseModal = ({ isOpen, onClose }: PurchaseModalProps) => {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [step, setStep] = useState<1 | 2>(1); // 1: Selection/Creation, 2: Batch Editing
  const [isCreatingInline, setIsCreatingInline] = useState(false);

  // New product inline form state
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "Otros",
    costPrice: 0,
    markup: 30,
    price: 0
  });

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
      setItems([]);
      setIsCreatingInline(false);
      resetNewProductForm();
    }
  }, [isOpen]);

  const resetNewProductForm = () => {
    setNewProduct({
      name: "",
      category: "Otros",
      costPrice: 0,
      markup: 30,
      price: 0
    });
  };

  const toggleProductSelection = (product: Product) => {
    const existingIndex = items.findIndex(item => item.productId === product.id);
    if (existingIndex > -1) {
      setItems(prev => prev.filter((_, i) => i !== existingIndex));
    } else {
      setItems(prev => [...prev, {
        tempId: crypto.randomUUID(),
        productId: product.id,
        name: product.name,
        category: product.category || "Otros",
        quantity: 1,
        costPrice: product.costPrice || 0,
        markup: product.markup || 0,
        price: product.price || 0,
        isNew: false
      }]);
    }
  };

  const handleAddInlineProduct = () => {
    if (!newProduct.name) return;
    
    setItems(prev => [...prev, {
      tempId: crypto.randomUUID(),
      name: newProduct.name,
      category: newProduct.category,
      quantity: 1,
      costPrice: newProduct.costPrice,
      markup: newProduct.markup,
      price: newProduct.price,
      isNew: true
    }]);
    
    setIsCreatingInline(false);
    resetNewProductForm();
  };

  const updateItem = (tempId: string, updates: Partial<PurchaseItem>) => {
    setItems(prev => prev.map(item => 
      item.tempId === tempId ? { ...item, ...updates } : item
    ));
  };

  const removeItem = (tempId: string) => {
    setItems(prev => prev.filter(item => item.tempId !== tempId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setLoading(true);

    try {
      await runTransaction(db, async (transaction) => {
        const purchaseItems = [];
        let totalPurchaseAmount = 0;

        // 1. Separate reads and writes
        // Get all existing products first
        const existingItems = items.filter(i => !i.isNew);
        const existingSnaps = new Map();

        for (const item of existingItems) {
          const productRef = doc(db, "products", item.productId!);
          const productSnap = await transaction.get(productRef);
          existingSnaps.set(item.productId, productSnap);
        }

        // 2. Perform all writes
        for (const item of items) {
          let productId = item.productId;
          let productName = item.name;

          if (item.isNew) {
            const productRef = doc(collection(db, "products"));
            productId = productRef.id;
            
            transaction.set(productRef, {
              name: item.name,
              category: item.category,
              costPrice: item.costPrice,
              markup: item.markup,
              price: item.price,
              stock: item.quantity,
              createdAt: Timestamp.now()
            });
          } else {
            const productRef = doc(db, "products", productId!);
            const productSnap = existingSnaps.get(productId);
            
            if (productSnap?.exists()) {
              const currentStock = productSnap.data().stock || 0;
              transaction.update(productRef, {
                stock: currentStock + item.quantity,
                costPrice: item.costPrice,
                markup: item.markup,
                price: item.price
              });
              productName = productSnap.data().name;
            }
          }

          const subtotal = item.quantity * item.costPrice;
          totalPurchaseAmount += subtotal;

          purchaseItems.push({
            productId,
            productName,
            quantity: item.quantity,
            costPrice: item.costPrice,
            total: subtotal // Changed from subtotal to total for consistency with sales/purchases
          });
        }

        // Create the purchase record
        const purchaseRef = doc(collection(db, "purchases"));
        transaction.set(purchaseRef, {
          items: purchaseItems,
          total: totalPurchaseAmount,
          createdAt: Timestamp.now()
        });
      });

      onClose();
    } catch (error) {
      console.error("Error registering purchase:", error);
      alert("Error al registrar la compra");
    } finally {
      setLoading(false);
    }
  };

  const totalInvestment = items.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);

  const filteredProducts = products
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const aCritical = (a.stock || 0) <= 5;
      const bCritical = (b.stock || 0) <= 5;
      if (aCritical && !bCritical) return -1;
      if (!aCritical && bCritical) return 1;
      return 0;
    });

  if (!isOpen) return null;

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
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center text-white backdrop-blur-md">
                <ShoppingCart size={20} />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight leading-none">
                  {step === 1 ? "Abastecer Tienda" : "Revisar Compra"}
                </h2>
                <p className="text-[10px] font-bold text-emerald-100/80 uppercase tracking-widest mt-1">
                  {items.length} productos · {step === 1 ? "Selección" : "Detalles finales"}
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 text-white/70 hover:text-white rounded-2xl transition-all">
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 md:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-grow min-h-0">
            {step === 1 ? (
              /* Selection View */
              <div className="space-y-4">
                {/* Search and Toggle Creation */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input
                      autoFocus
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm font-bold placeholder:text-slate-400"
                      placeholder="Buscar producto existente..."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreatingInline(!isCreatingInline)}
                    className={cn(
                      "flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all",
                      isCreatingInline 
                        ? "bg-slate-100 text-slate-600" 
                        : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                    )}
                  >
                    {isCreatingInline ? <ArrowLeft size={14} /> : <PackagePlus size={14} />}
                    {isCreatingInline ? "Volver" : "Nuevo"}
                  </button>
                </div>

                {isCreatingInline ? (
                  /* Inline Creation Form */
                  <div className="p-6 bg-emerald-50/50 rounded-[2rem] border-2 border-dashed border-emerald-100 space-y-4 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-2 mb-2">
                       <PackagePlus size={18} className="text-emerald-600" />
                       <h3 className="font-black text-slate-900 text-sm uppercase tracking-tight">Nuevo Producto Inline</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Nombre</label>
                        <input
                          type="text"
                          value={newProduct.name}
                          onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                          className="w-full px-4 py-3 bg-white border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm font-bold"
                          placeholder="Ej: Coca Cola 1.5L"
                        />
                      </div>
                      
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Categoría</label>
                        <select
                          value={newProduct.category}
                          onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                          className="w-full px-4 py-3 bg-white border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm font-bold"
                        >
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Costo Inicial</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                          <input
                            type="number"
                            value={newProduct.costPrice || ""}
                            onChange={(e) => {
                              const cost = Number(e.target.value);
                              const price = cost * (1 + newProduct.markup / 100);
                              setNewProduct({...newProduct, costPrice: cost, price: Math.round(price)});
                            }}
                            className="w-full pl-8 pr-4 py-3 bg-white border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm font-bold"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!newProduct.name}
                      onClick={handleAddInlineProduct}
                      className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                    >
                      Agregar al Carrito de Compra
                    </button>
                  </div>
                ) : (
                  /* Products Selection List */
                  <div className="grid grid-cols-1 gap-2">
                    {filteredProducts.map(p => {
                      const isSelected = items.some(item => item.productId === p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleProductSelection(p)}
                          className={cn(
                            "w-full flex items-center justify-between p-4 rounded-2xl transition-all group border-2 text-sm",
                            isSelected 
                              ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/10" 
                              : "bg-white border-slate-50 hover:border-emerald-100 hover:bg-emerald-50/30"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "h-10 w-10 rounded-xl flex items-center justify-center transition-all",
                              isSelected ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100"
                            )}>
                              <Package size={20} />
                            </div>
                            <div className="text-left">
                              <p className={cn("font-black tracking-tight", isSelected ? "text-white" : "text-slate-900")}>
                                {p.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={cn("text-[9px] font-black uppercase tracking-widest", isSelected ? "text-white/50" : "text-slate-400")}>
                                  Stock: {p.stock}
                                </span>
                                {(p.stock || 0) <= 5 && !isSelected && (
                                  <span className="text-[7px] font-black bg-orange-500 text-white px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                    Crítico
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className={cn(
                            "h-6 w-6 rounded-full flex items-center justify-center transition-all",
                            isSelected ? "bg-emerald-500 text-white scale-110" : "border-2 border-slate-100 text-transparent"
                          )}>
                            <Check size={14} strokeWidth={4} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Batch Edit View */
              <div className="space-y-4">
                {items.map(item => (
                  <div key={item.tempId} className="p-5 bg-white rounded-[2rem] border-2 border-slate-50 shadow-sm space-y-4 relative overflow-hidden group">
                    {item.isNew && (
                      <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[8px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">
                        Nuevo Producto
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center",
                          item.isNew ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-600"
                        )}>
                          {item.isNew ? <PackagePlus size={20} /> : <Package size={20} />}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-base tracking-tight">{item.name}</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                             {item.category}
                             {!item.isNew && (
                               <>
                                 <span className="h-1 w-1 rounded-full bg-slate-200"></span>
                                 <span>Stock Actual: {products.find(p => p.id === item.productId)?.stock}</span>
                               </>
                             )}
                          </p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeItem(item.tempId)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cantidad</label>
                        <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100">
                          <button
                            type="button"
                            onClick={() => updateItem(item.tempId, { quantity: Math.max(1, item.quantity - 1) })}
                            className="p-2 text-slate-400 hover:text-slate-900"
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.tempId, { quantity: Number(e.target.value) })}
                            className="w-full bg-transparent border-none text-center font-black text-slate-900 text-sm focus:ring-0 p-0"
                          />
                          <button
                            type="button"
                            onClick={() => updateItem(item.tempId, { quantity: item.quantity + 1 })}
                            className="p-2 text-slate-400 hover:text-slate-900"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Costo Unit.</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                          <input
                            type="number"
                            value={item.costPrice}
                            onChange={(e) => {
                              const cost = Number(e.target.value);
                              const price = cost * (1 + item.markup / 100);
                              updateItem(item.tempId, { costPrice: cost, price: Math.round(price) });
                            }}
                            className="w-full pl-8 pr-3 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-black text-slate-900 text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Margen %</label>
                        <input
                          type="number"
                          value={item.markup}
                          onChange={(e) => {
                            const markup = Number(e.target.value);
                            const price = item.costPrice * (1 + markup / 100);
                            updateItem(item.tempId, { markup, price: Math.round(price) });
                          }}
                          className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-black text-slate-900 text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">PvP Final</label>
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => {
                            const price = Number(e.target.value);
                            const markup = item.costPrice > 0 ? ((price - item.costPrice) / item.costPrice) * 100 : 0;
                            updateItem(item.tempId, { price, markup: Number(markup.toFixed(2)) });
                          }}
                          className="w-full px-3 py-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-black text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-slate-50">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                         Subtotal: <span className="text-slate-900 text-sm ml-1">${(item.quantity * item.costPrice).toLocaleString("es-CO")}</span>
                       </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 md:p-8 bg-slate-50 border-t border-slate-200 flex flex-col gap-4">
            <div className="flex justify-between items-end px-2">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monto Inversión</p>
                <div className="flex items-center gap-3">
                   <div className="h-10 w-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                     <DollarSign size={20} />
                   </div>
                   <p className="text-3xl font-black text-slate-900 tracking-tighter">
                     ${totalInvestment.toLocaleString("es-CO")}
                   </p>
                </div>
              </div>
              <div className="text-right">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Items Totales</p>
                 <p className="text-xl font-black text-slate-600">{items.reduce((s, i) => s + i.quantity, 0)} uds</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              {step === 1 ? (
                <button
                  disabled={items.length === 0}
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-slate-900/20"
                >
                  Continuar al Resumen ({items.length})
                  <ChevronRight size={18} />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="sm:w-1/3 bg-white border-2 border-slate-200 text-slate-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-[0.98]"
                  >
                    Editar Selección
                  </button>
                  <button
                    disabled={loading || items.length === 0}
                    type="submit"
                    className="flex-grow flex items-center justify-center gap-3 bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-emerald-600/20"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : (
                      <>
                        <Save size={18} />
                        Confirmar y Abastecer
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
