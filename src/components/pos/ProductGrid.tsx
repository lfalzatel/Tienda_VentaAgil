"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useCartStore } from "@/store/useCartStore";
import { Search, Plus, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  image?: string;
  salesCount?: number;
}

export const ProductGrid = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const { tabs, activeTabId, addItem, updateQuantity, removeItem } = useCartStore();
  const items = tabs.find(t => t.id === activeTabId)?.items || [];

  useEffect(() => {
    // Escuchar cambios en la colección de productos
    const q = query(collection(db, "products"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Product, "id">),
      }));
      setProducts(docs);
    });

    return () => unsubscribe();
  }, []);

  const categories = ["Todos", ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = [...products]
    .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
    .filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "Todos" || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

  return (
    <div className="flex flex-col w-full space-y-3">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all duration-300 shadow-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-5 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all duration-300",
                selectedCategory === cat
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                  : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-100"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div>
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Package className="text-slate-200 mb-4" size={48} />
            <p className="text-slate-400 font-bold">No se encontraron productos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 w-full pb-28">
            {filteredProducts.map((product) => {
              const isSelected = items.some((item) => item.id === product.id);
              return (
                <div
                  key={product.id}
                  onClick={() => !isSelected && product.stock > 0 && addItem({ ...product, quantity: 1 })}
                  className={cn(
                    "group relative flex items-center gap-3 p-3 sm:p-4 bg-white rounded-3xl border border-slate-200 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-0.5 text-left active:scale-[0.98]",
                    product.stock > 0 ? "cursor-pointer" : "opacity-60 grayscale cursor-not-allowed",
                    isSelected && "bg-sky-50 border-sky-200 ring-2 ring-sky-500/20"
                  )}
                >
                  {/* Circular Image Area */}
                  <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden relative border-2 border-white shadow-sm transition-transform duration-500 group-hover:scale-110">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="text-slate-300" size={24} />
                    )}
                    
                    {product.stock <= 5 && product.stock > 0 && (
                      <div className="absolute inset-0 bg-orange-500/10 flex items-center justify-center">
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                      </div>
                    )}
                  </div>

                  {/* Info Area */}
                  <div className="flex-grow min-w-0 overflow-hidden">
                    <div className="flex items-start justify-between gap-1 mb-0.5">
                      <span className="text-[8px] font-black text-sky-600 uppercase tracking-widest bg-white px-1.5 py-0.5 rounded-md border border-sky-100 truncate">
                        {product.category}
                      </span>
                      <span className="text-xs font-black text-slate-900 shrink-0">
                        ${product.price.toLocaleString("es-CO")}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-sky-600 transition-colors">
                      {product.name}
                    </h3>
                    <div className="mt-1 flex items-center justify-between gap-1 flex-wrap">
                      <span className={cn(
                        "text-[10px] font-bold",
                        product.stock <= 5 ? "text-orange-500" : "text-slate-400"
                      )}>
                        Stock: {product.stock}
                      </span>
                      
                      {isSelected ? (
                        <div className="flex items-center gap-2 bg-sky-500 text-white p-1 rounded-2xl shadow-lg animate-in zoom-in duration-300">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const item = items.find(i => i.id === product.id);
                              if (item) {
                                if (item.quantity > 1) {
                                  updateQuantity(product.id, item.quantity - 1);
                                } else {
                                  removeItem(product.id);
                                }
                              }
                            }}
                            className="w-6 h-6 flex items-center justify-center hover:bg-white/20 rounded-xl transition-colors"
                          >
                            <span className="text-lg font-bold">−</span>
                          </button>
                          <span className="text-xs font-black min-w-[12px] text-center">
                            {items.find(i => i.id === product.id)?.quantity || 0}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addItem({ ...product, quantity: 1 });
                            }}
                            className="w-6 h-6 flex items-center justify-center hover:bg-white/20 rounded-xl transition-colors"
                          >
                            <Plus size={14} strokeWidth={4} />
                          </button>
                        </div>
                      ) : (
                        <div className="bg-slate-100 text-slate-400 p-2 rounded-xl group-hover:bg-sky-500 group-hover:text-white transition-all shadow-sm">
                          <Plus size={14} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
