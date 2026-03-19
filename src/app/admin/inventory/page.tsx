"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Header } from "@/components/layout/Header";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Package, 
  AlertTriangle,
  Image as ImageIcon,
  MoreVertical,
  ArrowUpDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductModal } from "@/components/admin/ProductModal";

interface Product {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  markup: number;
  category: string;
  stock: number;
  image?: string;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "critical">("all");

  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Product, "id">),
      }));
      setProducts(docs);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`¿Estás seguro de eliminar el producto "${name}"?`)) {
      try {
        await deleteDoc(doc(db, "products", id));
      } catch (error) {
        console.error("Error al eliminar:", error);
        alert("No se pudo eliminar el producto.");
      }
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === "all" || p.stock <= 5;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] overflow-hidden">
      <Header />
      
      <main className="flex-grow p-6 sm:p-10 overflow-hidden flex flex-col max-w-7xl mx-auto w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-slate-900">Inventario</h1>
            <p className="text-slate-500 font-medium text-xs mt-0.5">Gestiona tus productos y niveles de stock</p>
          </div>
          
          <button
            onClick={() => {
              setEditingProduct(null);
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={18} />
            Nuevo Producto
          </button>
        </div>

        {/* Tabs and Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
          <div className="flex bg-white p-1.5 rounded-[1.5rem] border border-slate-100 shadow-sm w-full md:w-auto">
            <button
              onClick={() => setActiveTab("all")}
              className={cn(
                "flex-grow md:flex-none px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                activeTab === "all" ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Todos
            </button>
            <button
              onClick={() => setActiveTab("critical")}
              className={cn(
                "flex-grow md:flex-none px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                activeTab === "critical" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Stock Crítico
              <span className={cn(
                "px-1.5 py-0.5 rounded-md text-[10px]",
                activeTab === "critical" ? "bg-white/20" : "bg-slate-100"
              )}>
                {products.filter(p => p.stock <= 5).length}
              </span>
            </button>
          </div>

          <div className="bg-white p-2 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 w-full md:flex-grow max-w-2xl">
            <div className="relative flex-grow group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Buscar por nombre o categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-slate-900/5 transition-all text-sm font-medium"
              />
            </div>
          </div>
        </div>

        {/* Table/List Area */}
        <div className="flex-grow overflow-y-auto custom-scrollbar bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-50">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Producto</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Categoría</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">P. Costo</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">P. Venta</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Margen</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Stock</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-200/50">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon size={20} className="text-slate-300" />
                        )}
                      </div>
                      <span className="text-sm font-bold text-slate-900">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-xs font-bold text-sky-600 bg-sky-50 px-3 py-1 rounded-lg uppercase tracking-wider">
                      {p.category}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-sm font-bold text-slate-400">
                    ${(p.costPrice || 0).toLocaleString("es-CO")}
                  </td>
                  <td className="px-8 py-5 text-sm font-black text-slate-900">
                    ${p.price.toLocaleString("es-CO")}
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                      +{p.markup || 0}%
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                       <span className={cn(
                        "text-sm font-bold",
                        p.stock <= 5 ? "text-orange-500" : "text-slate-900"
                      )}>
                        {p.stock}
                      </span>
                      {p.stock <= 5 && (
                        <AlertTriangle size={14} className="text-orange-500 animate-pulse" />
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingProduct(p);
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="bg-slate-50 p-6 rounded-full mb-4">
                <Package size={48} className="text-slate-200" />
              </div>
              <p className="text-slate-500 font-bold">No se encontraron productos</p>
            </div>
          )}
        </div>
      </main>

      <ProductModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        product={editingProduct} 
      />
    </div>
  );
}
