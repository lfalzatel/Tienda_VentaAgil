"use client";

import { useState, useEffect } from "react";
import { 
  X,
  Save, 
  Loader2, 
  User, 
  Phone, 
  Search, 
  Plus, 
  Minus, 
  ShoppingBag,
  DollarSign,
  Package,
  CreditCard
} from "lucide-react";
import { collection, getDocs, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewClientModal({ isOpen, onClose }: NewClientModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    cedula: "",
    email: "",
  });
  const [manualDebt, setManualDebt] = useState<number>(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState("");

  useEffect(() => {
    if (isOpen) {
      const fetchProducts = async () => {
        const querySnapshot = await getDocs(collection(db, "products"));
        const docs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          price: doc.data().price,
          category: doc.data().category || "Gral."
        }));
        setProducts(docs);
      };
      fetchProducts();
    }
  }, [isOpen]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const productsTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalDebt = productsTotal + manualDebt;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setLoading(true);

    try {
      const batch = writeBatch(db);
      
      const debtorRef = doc(collection(db, "debtors"));
      batch.set(debtorRef, {
        name: formData.name,
        phone: formData.phone,
        cedula: formData.cedula,
        email: formData.email,
        totalDebt: totalDebt,
        createdAt: new Date().toISOString(),
      });

      if (totalDebt > 0) {
        const transactionRef = doc(collection(db, "debtor_transactions"));
        batch.set(transactionRef, {
          debtorId: debtorRef.id,
          type: "sale",
          amount: totalDebt,
          date: serverTimestamp(),
          description: "Deuda inicial registrada al crear cliente",
          items: cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price
          })),
          manualDebt: manualDebt
        });
      }

      await batch.commit();
      onClose();
      // Reset form
      setFormData({ name: "", phone: "", cedula: "", email: "" });
      setCart([]);
      setManualDebt(0);
    } catch (error) {
      console.error("Error creating client:", error);
      alert("Error al crear el cliente.");
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearch.toLowerCase())
  ).slice(0, 5);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-4xl bg-[#f8fafc] rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 pb-4 sm:p-8 sm:pb-6 bg-gradient-to-r from-emerald-500 to-cyan-600 flex justify-between items-center border-b-2 border-emerald-600">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Nuevo Cliente</h2>
            <p className="text-emerald-100/80 font-bold text-[10px] sm:text-xs uppercase tracking-widest mt-1">Registro y Deuda Inicial</p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white rounded-2xl transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar p-4 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 items-start">
            {/* Left Column: Client Data */}
            <div className="space-y-4 sm:space-y-6">
              <section className="bg-white rounded-[2rem] p-4 sm:p-6 shadow-sm border border-slate-100 space-y-4">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-50 pb-3">Perfil</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre</label>
                    <div className="relative group">
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                      <input
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm font-bold text-slate-900 placeholder:text-slate-600"
                        placeholder="Juan Pérez"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">WhatsApp</label>
                    <div className="relative group">
                      <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                      <input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm font-bold text-slate-900 placeholder:text-slate-600"
                        placeholder="300 000 0000"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cédula / NIT</label>
                    <div className="relative group">
                      <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                      <input
                        value={formData.cedula}
                        onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm font-bold text-slate-900 placeholder:text-slate-600"
                        placeholder="1111222333"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Correo Electrónico</label>
                    <div className="relative group">
                      <Package size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm font-bold text-slate-900 placeholder:text-slate-600"
                        placeholder="usuario@correo.com"
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-[2rem] p-4 sm:p-6 shadow-sm border border-slate-100 space-y-4">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-50 pb-3">Ajuste Manual</h3>
                <div className="space-y-2">
                  <div className="relative group">
                    <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <input
                      type="number"
                      value={manualDebt || ""}
                      onChange={(e) => setManualDebt(Number(e.target.value))}
                      className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm font-bold text-slate-900 placeholder:text-slate-600"
                      placeholder="Valor adicional..."
                    />
                  </div>
                </div>
              </section>

              {/* Total Card */}
              <div className="bg-slate-900 rounded-[2.5rem] p-4 sm:p-8 shadow-xl text-white">
                <div className="flex justify-between items-center opacity-60 mb-3 sm:mb-4">
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Resumen Total</span>
                  <CreditCard size={18} />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-end">
                  <div>
                    <p className="text-2xl sm:text-3xl font-black tracking-tighter text-emerald-400">${totalDebt.toLocaleString("es-CO")}</p>
                    <p className="text-[9px] sm:text-[10px] font-bold opacity-40 uppercase tracking-widest mt-1">Saldo inicial a deber</p>
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !formData.name}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white text-slate-900 rounded-2xl font-black text-xs sm:text-sm hover:scale-105 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    Guardar
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Product Selector */}
            <div className="space-y-4 sm:space-y-6">
              <section className="bg-white rounded-[2rem] p-4 sm:p-6 shadow-sm border border-slate-100 flex flex-col h-full max-h-[350px] sm:max-h-[500px]">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-50 pb-3 mb-4">Cargar Productos</h3>
                
                <div className="relative group mb-4">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                  <input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 placeholder:text-slate-600"
                    placeholder="Escribe para buscar..."
                  />
                </div>

                {productSearch && (
                  <div className="mb-4 space-y-1 p-2 bg-slate-50 rounded-2xl border border-slate-100 animate-in slide-in-from-top-2">
                    {filteredProducts.map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          addToCart(p);
                          setProductSearch("");
                        }}
                        className="w-full flex items-center justify-between p-3 hover:bg-white hover:shadow-sm rounded-xl transition-all group"
                      >
                        <div className="text-left">
                          <p className="text-xs font-black text-slate-700">{p.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{p.category}</p>
                        </div>
                        <span className="text-xs font-black text-slate-900">${p.price.toLocaleString("es-CO")}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex-grow overflow-y-auto custom-scrollbar space-y-3">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-20 py-12">
                      <ShoppingBag size={48} className="mb-2" />
                      <p className="text-xs font-bold uppercase tracking-widest">Sin productos</p>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.id} className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-transparent hover:border-slate-200 transition-all">
                        <div>
                          <p className="text-xs font-black text-slate-900">{item.name}</p>
                          <p className="text-[10px] font-bold text-slate-400">${item.price.toLocaleString("es-CO")}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl shadow-sm">
                            <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900">
                              <Minus size={14} />
                            </button>
                            <span className="text-xs font-black min-w-[20px] text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900">
                              <Plus size={14} />
                            </button>
                          </div>
                          <button onClick={() => removeFromCart(item.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-all">
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
