"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Save, Package, Tag, DollarSign, Database, Image as ImageIcon, Plus, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { db, storage } from "@/lib/firebase/config";
import { collection, addDoc, updateDoc, doc, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

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

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const ProductModal = ({ isOpen, onClose, product }: ProductModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Product>({
    name: "",
    price: 0,
    costPrice: 0,
    markup: 0,
    category: "",
    stock: 0,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    // Fetch unique categories from products
    const fetchCategories = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "products"));
        const cats = Array.from(new Set(querySnapshot.docs.map(doc => doc.data().category as string).filter(Boolean)));
        setCategories(cats.sort());
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, [isOpen]);

  useEffect(() => {
    if (product) {
      setFormData(product);
      setImagePreview(product.image || null);
      setIsNewCategory(false);
    } else {
      setFormData({ name: "", price: 0, costPrice: 0, markup: 0, category: "", stock: 0 });
      setImagePreview(null);
      setIsNewCategory(false);
    }
    setImageFile(null);
    setNewCategoryName("");
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = formData.image || null;

      // Subir imagen si hay una nueva seleccionada
      if (imageFile) {
        const imageRef = ref(storage, `products/${Date.now()}-${imageFile.name}`);
        const snapshot = await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      const finalCategory = isNewCategory ? newCategoryName : formData.category;
      const finalData = { 
        ...formData, 
        category: finalCategory, 
        image: imageUrl ?? null // Asegurar que sea null y no undefined
      };

      if (product?.id) {
        // Editar
        await updateDoc(doc(db, "products", product.id), finalData as any);
      } else {
        // Crear
        await addDoc(collection(db, "products"), finalData);
      }

      onClose();
    } catch (error) {
      console.error("Error al guardar producto:", error);
      alert("Error al guardar el producto. Revisa la consola.");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300">
        <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[90vh]">
          {/* Header */}
          <div className="p-8 pb-4 flex justify-between items-center border-b border-slate-50">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {product ? "Editar Producto" : "Nuevo Producto"}
            </h2>
            <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 rounded-2xl transition-all">
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
            {/* Image Upload Area */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative h-32 w-32 rounded-[2rem] bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden group">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon size={32} className="text-slate-300" />
                )}
                <label className="absolute inset-0 bg-slate-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Cambiar</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                </label>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Imagen del Producto</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-1 sm:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre</label>
                <div className="relative">
                  <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-slate-900/5 transition-all text-sm font-bold"
                    placeholder="Ej. Protector Solar"
                  />
                </div>
              </div>

              <div className="space-y-2 col-span-1 sm:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Categoría</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-grow">
                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <select
                      required
                      value={isNewCategory ? "NEW" : formData.category}
                      onChange={(e) => {
                        if (e.target.value === "NEW") {
                          setIsNewCategory(true);
                        } else {
                          setIsNewCategory(false);
                          setFormData({ ...formData, category: e.target.value });
                        }
                      }}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-slate-900/5 transition-all text-sm font-bold appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Selecciona una categoría</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="NEW" className="text-sky-600 font-bold">+ Nueva Categoría</option>
                    </select>
                  </div>
                  
                  {isNewCategory && (
                    <div className="relative flex-grow animate-in slide-in-from-left-2 duration-300">
                      <Plus className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-500" size={18} />
                      <input
                        required
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-sky-50 border-none rounded-2xl focus:ring-2 focus:ring-sky-500/10 transition-all text-sm font-bold placeholder:text-sky-300"
                        placeholder="Nombre de la categoría..."
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Precio Costo (COP)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    required
                    type="number"
                    value={formData.costPrice}
                    onChange={(e) => {
                      const cost = Number(e.target.value);
                      const markup = formData.markup;
                      const price = markup > 0 ? cost * (1 + markup / 100) : formData.price;
                      setFormData({ ...formData, costPrice: cost, price: Math.round(price) });
                    }}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-slate-900/5 transition-all text-sm font-bold"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Margen / Ganancia (%)</label>
                <div className="relative">
                  <TrendingUp className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    type="number"
                    value={formData.markup}
                    onChange={(e) => {
                      const m = Number(e.target.value);
                      const cost = formData.costPrice;
                      const price = cost > 0 ? cost * (1 + m / 100) : formData.price;
                      setFormData({ ...formData, markup: m, price: Math.round(price) });
                    }}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-slate-900/5 transition-all text-sm font-bold"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Precio Venta (COP)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    required
                    type="number"
                    value={formData.price}
                    onChange={(e) => {
                      const p = Number(e.target.value);
                      const cost = formData.costPrice;
                      const markup = cost > 0 ? ((p - cost) / cost) * 100 : 0;
                      setFormData({ ...formData, price: p, markup: Number(markup.toFixed(2)) });
                    }}
                    className="w-full pl-12 pr-4 py-4 bg-slate-900/[0.02] border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-900/5 transition-all text-sm font-bold text-emerald-600"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2 col-span-1 sm:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Stock Inicial</label>
                <div className="relative">
                  <Database className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    required
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-slate-900/5 transition-all text-sm font-bold"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-grow py-4 bg-white text-slate-500 font-bold rounded-2xl border border-slate-200 hover:bg-slate-100 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-grow py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              {product ? "Actualizar" : "Crear Producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
