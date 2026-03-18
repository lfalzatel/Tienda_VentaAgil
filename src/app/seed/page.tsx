"use client";

import { useState } from "react";
import { db, auth } from "@/lib/firebase/config";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, collection, addDoc, Timestamp, getDocs } from "firebase/firestore";
import { Loader2, UserPlus, CheckCircle2, ShoppingBag } from "lucide-react";

export default function SeedPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const seedTestUser = async () => {
    setLoading(true);
    setStatus("Creando usuario...");
    try {
      let uid = "";
      try {
        const userCred = await createUserWithEmailAndPassword(
          auth,
          "admin@tienda.com",
          "admin123"
        );
        uid = userCred.user.uid;
      } catch (authError: any) {
        if (authError.code === "auth/email-already-in-use") {
          setStatus("El usuario ya existe. Actualizando perfil en Firestore...");
          throw new Error("El usuario 'admin@tienda.com' ya existe. Si no funciona, borra el usuario en la consola e intenta de nuevo.");
        }
        throw authError;
      }

      await setDoc(doc(db, "users", uid), {
        email: "admin@tienda.com",
        role: "admin",
        name: "Admin de Prueba",
        createdAt: new Date().toISOString()
      });

      const products = [
        { name: "Camiseta San Andrés", price: 45000, category: "Ropa", stock: 20 },
        { name: "Gafas de Sol", price: 85000, category: "Accesorios", stock: 15 },
        { name: "Protector Solar 50FPS", price: 62000, category: "Cuidado Personal", stock: 10 },
        { name: "Souvenir Tortuga", price: 15000, category: "Regalos", stock: 50 },
      ];

      setStatus("Poblando productos...");
      for (const p of products) {
        const id = p.name.toLowerCase().replace(/ /g, "-");
        await setDoc(doc(db, "products", id), p);
      }

      setStatus("¡Todo listo! Ya puedes iniciar sesión con admin@tienda.com / admin123");
    } catch (error: any) {
      console.error(error);
      setStatus("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const seedSalesData = async () => {
    setLoading(true);
    setStatus("Generando ventas de los últimos 30 días...");
    try {
      const salesCollection = collection(db, "sales");
      const paymentMethods = ["Cash", "Credit", "Card"];
      
      const productSnap = await getDocs(collection(db, "products"));
      const products = productSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (products.length === 0) {
        throw new Error("No hay productos para generar ventas. Primero crea productos.");
      }

      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        const salesPerDay = Math.floor(Math.random() * 5) + 1;
        
        for (let j = 0; j < salesPerDay; j++) {
          const randomItemsCount = Math.floor(Math.random() * 3) + 1;
          const items = [];
          let total = 0;

          for (let k = 0; k < randomItemsCount; k++) {
            const product = products[Math.floor(Math.random() * products.length)] as any;
            const quantity = Math.floor(Math.random() * 3) + 1;
            items.push({
              productId: product.id,
              name: product.name,
              price: product.price,
              quantity
            });
            total += product.price * quantity;
          }

          const saleDate = new Date(date);
          saleDate.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60));

          await addDoc(salesCollection, {
            items,
            total,
            paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
            createdAt: Timestamp.fromDate(saleDate),
            status: "completed"
          });
        }
      }

      setStatus("¡Ventas generadas exitosamente para los últimos 30 días!");
    } catch (error: any) {
      console.error(error);
      setStatus("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const promoteToAdmin = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setStatus("Error: Debes estar logueado para usar esta función.");
      return;
    }

    setLoading(true);
    setStatus(`Promoviendo a ${currentUser.email} a Administrador...`);
    try {
      await setDoc(doc(db, "users", currentUser.uid), {
        email: currentUser.email,
        role: "admin",
        name: currentUser.displayName || "Usuario Google",
        photoURL: currentUser.photoURL,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setStatus(`¡Éxito! Tu cuenta ahora es Administrador.`);
    } catch (error: any) {
      console.error(error);
      setStatus("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 sm:p-10">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-10 text-center space-y-8 border border-slate-100">
        <div className="bg-slate-900 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto text-white shadow-xl shadow-slate-900/20">
          <ShoppingBag size={32} />
        </div>
        
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Preparar Entorno</h1>
          <p className="text-slate-500 font-medium text-sm mt-2">
            Puebla la base de datos con información de prueba para validar el dashboard y reportes.
          </p>
        </div>

        {status && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3 text-left">
            <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
            <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">{status}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={seedTestUser}
            disabled={loading}
            className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "1. Crear Datos Base"}
          </button>

          <button
            onClick={seedSalesData}
            disabled={loading}
            className="w-full py-5 bg-emerald-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95 shadow-lg shadow-emerald-500/20"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "2. Generar Historial Ventas"}
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="h-px bg-slate-100 flex-grow"></div>
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Ó</span>
          <div className="h-px bg-slate-100 flex-grow"></div>
        </div>

        <button
          onClick={promoteToAdmin}
          disabled={loading}
          className="w-full py-5 bg-white border-2 border-slate-900 text-slate-900 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : "Hacer Admin mi cuenta"}
        </button>
      </div>
    </div>
  );
}
