"use client";

import { useState } from "react";
import { collection, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Header } from "@/components/layout/Header";
import { Database, Play, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

const PRODUCTS_SEED = [
  { name: "Coca-Cola 350ml", price: 2500, category: "Bebidas", stock: 24 },
  { name: "Pepsi 350ml", price: 2200, category: "Bebidas", stock: 24 },
  { name: "Agua Cristal 600ml", price: 2000, category: "Bebidas", stock: 30 },
  { name: "Jugo Hit Lulo 250ml", price: 1800, category: "Bebidas", stock: 15 },
  { name: "Jugo Hit Mora 250ml", price: 1800, category: "Bebidas", stock: 15 },
  { name: "Cerveza Aguila Lata", price: 3500, category: "Bebidas", stock: 48 },
  { name: "Cerveza Poker Lata", price: 3500, category: "Bebidas", stock: 48 },
  { name: "Gatorade Blue 500ml", price: 3800, category: "Bebidas", stock: 12 },
  { name: "Red Bull 250ml", price: 7500, category: "Bebidas", stock: 10 },
  { name: "Pony Malta 330ml", price: 2200, category: "Bebidas", stock: 20 },
  { name: "Papas Margarita Lima 40g", price: 2800, category: "Snacks", stock: 20 },
  { name: "Papas Margarita Pollo 40g", price: 2800, category: "Snacks", stock: 20 },
  { name: "Choclitos 45g", price: 1500, category: "Snacks", stock: 25 },
  { name: "Doritos Mega Crunch 45g", price: 3200, category: "Snacks", stock: 15 },
  { name: "Cheetos Horneados 40g", price: 1800, category: "Snacks", stock: 15 },
  { name: "Galletas Festival Fresa", price: 1200, category: "Snacks", stock: 30 },
  { name: "Galletas Festival Chocolate", price: 1200, category: "Snacks", stock: 30 },
  { name: "Galletas Oreo Original", price: 1500, category: "Snacks", stock: 24 },
  { name: "Galletas Tosh Miel", price: 1400, category: "Snacks", stock: 12 },
  { name: "Maní Moto 40g", price: 1800, category: "Snacks", stock: 15 },
  { name: "Jet Tradicional", price: 700, category: "Snacks", stock: 50 },
  { name: "Jumbo Maní", price: 2500, category: "Snacks", stock: 20 },
  { name: "Bon Bon Bum Fresa", price: 500, category: "Snacks", stock: 100 },
  { name: "Trident Original", price: 1500, category: "Snacks", stock: 40 },
  { name: "Sparkies Paquete", price: 1200, category: "Snacks", stock: 20 },
  { name: "Leche Colanta Desl 1L", price: 4800, category: "Lácteos", stock: 12 },
  { name: "Leche Alquería Entera 1L", price: 4500, category: "Lácteos", stock: 12 },
  { name: "Yogurt Alpina Fresa 150g", price: 1800, category: "Lácteos", stock: 10 },
  { name: "Yogurt Alpina Melocót 150g", price: 1800, category: "Lácteos", stock: 10 },
  { name: "Queso Campesino 250g", price: 6500, category: "Lácteos", stock: 5 },
  { name: "Mantequilla Colanta 125g", price: 3200, category: "Lácteos", stock: 8 },
  { name: "Crema de Leche 200ml", price: 2800, category: "Lácteos", stock: 6 },
  { name: "Arequipe Alpina 200g", price: 4200, category: "Lácteos", stock: 5 },
  { name: "Kumis Colanta 150g", price: 1600, category: "Lácteos", stock: 10 },
  { name: "Pan Tajado Bimbo Grande", price: 7500, category: "Panadería", stock: 6 },
  { name: "Pan de Perro Bimbo x6", price: 5500, category: "Panadería", stock: 4 },
  { name: "Pan Hamburguesa Bimbo x4", price: 4800, category: "Panadería", stock: 4 },
  { name: "Tostadas Susanita", price: 5200, category: "Panadería", stock: 8 },
  { name: "Ponqué Ramo Gala", price: 1500, category: "Panadería", stock: 12 },
  { name: "Chocoramo", price: 2000, category: "Panadería", stock: 24 },
  { name: "Mogolla Integral x4", price: 2200, category: "Panadería", stock: 6 },
  { name: "Arroz Roa 1kg", price: 4500, category: "Granos", stock: 15 },
  { name: "Frijol Cargamanto 500g", price: 5200, category: "Granos", stock: 10 },
  { name: "Lenteja Nutridía 500g", price: 3800, category: "Granos", stock: 10 },
  { name: "Pasta Doria Spagh 500g", price: 3500, category: "Granos", stock: 12 },
  { name: "Aceite Girasol 1L", price: 12000, category: "Granos", stock: 8 },
  { name: "Azúcar Manuelita 1kg", price: 4200, category: "Granos", stock: 15 },
  { name: "Sal Refisal 1kg", price: 1800, category: "Granos", stock: 20 },
  { name: "Café Sello Rojo 250g", price: 9500, category: "Varios", stock: 10 },
  { name: "Chocolate Sol 250g", price: 6200, category: "Varios", stock: 8 },
  { name: "Atún Van Camps Agua", price: 7800, category: "Varios", stock: 12 },
  { name: "Salsa Tomate Fruco 200g", price: 3200, category: "Varios", stock: 8 },
  { name: "Mayonesa Fruco 200g", price: 3500, category: "Varios", stock: 8 },
  { name: "Cubos Maggi x12", price: 4800, category: "Varios", stock: 15 },
  { name: "Harina Haz de Oros 1kg", price: 3500, category: "Granos", stock: 10 },
  { name: "Harina Pan 1kg", price: 4200, category: "Granos", stock: 20 },
  { name: "Huevos Tipo A Panal x30", price: 16500, category: "Varios", stock: 5 },
  { name: "Vinagre Blanco 500ml", price: 2500, category: "Varios", stock: 6 },
  { name: "Mostaza Fruco 200g", price: 2800, category: "Varios", stock: 8 },
  { name: "Jabón Protex Aloe 110g", price: 3500, category: "Aseo", stock: 12 },
  { name: "Jabón Palmolive 110g", price: 3200, category: "Aseo", stock: 12 },
  { name: "Shampoo Savital 550ml", price: 15500, category: "Aseo", stock: 6 },
  { name: "Shampoo Head & Should 180ml", price: 12500, category: "Aseo", stock: 6 },
  { name: "Crema Dental Colgate", price: 5800, category: "Aseo", stock: 10 },
  { name: "Cepillo Dental Colgate", price: 4200, category: "Aseo", stock: 12 },
  { name: "Desodorante Rexona Cl", price: 18500, category: "Aseo", stock: 5 },
  { name: "Desodorante Speed St", price: 15200, category: "Aseo", stock: 6 },
  { name: "Papel Hig Familia x4", price: 6800, category: "Aseo", stock: 15 },
  { name: "Toallas Nosotras x10", price: 5500, category: "Aseo", stock: 10 },
  { name: "Crema Nivea Azul 60ml", price: 8500, category: "Aseo", stock: 4 },
  { name: "Detergente Fab Azul 1kg", price: 11000, category: "Aseo Hogar", stock: 10 },
  { name: "Detergente Ariel Liq 1L", price: 15500, category: "Aseo Hogar", stock: 6 },
  { name: "Suavizante Downy 400ml", price: 6200, category: "Aseo Hogar", stock: 8 },
  { name: "Jabón Rey Barra", price: 2800, category: "Aseo Hogar", stock: 20 },
  { name: "Lavaloza Axión 250g", price: 4500, category: "Aseo Hogar", stock: 10 },
  { name: "Esponja Scotch-Brite x2", price: 3500, category: "Aseo Hogar", stock: 12 },
  { name: "Límpido Cloro 1L", price: 2800, category: "Aseo Hogar", stock: 10 },
  { name: "Fabuloso Lavanda 1L", price: 4500, category: "Aseo Hogar", stock: 8 },
  { name: "Pañoletas Familia x10", price: 2200, category: "Aseo Hogar", stock: 15 },
  { name: "Bolsas de Basura x10", price: 3500, category: "Aseo Hogar", stock: 12 },
  { name: "Cerveza Corona Bot", price: 5500, category: "Licores", stock: 24 },
  { name: "Cerveza Heineken Bot", price: 5500, category: "Licores", stock: 24 },
  { name: "Ron Viejo de Caldas 375ml", price: 38000, category: "Licores", stock: 10 },
  { name: "Aguardiente Ant 375ml", price: 32000, category: "Licores", stock: 12 },
  { name: "Vino Gato Negro Cab", price: 28500, category: "Licores", stock: 6 },
  { name: "Smirnoff Ice Orig", price: 7500, category: "Licores", stock: 18 },
  { name: "Whisky JW Red 700ml", price: 85000, category: "Licores", stock: 4 },
  { name: "Tequila José Cuervo 750ml", price: 95000, category: "Licores", stock: 2 },
  { name: "Pilas AA Duracell x2", price: 8500, category: "Varios", stock: 10 },
  { name: "Pilas AAA Duracell x2", price: 8500, category: "Varios", stock: 10 },
  { name: "Fósforos El Rey Caja", price: 300, category: "Varios", stock: 50 },
  { name: "Vela Blanca Unidad", price: 500, category: "Varios", stock: 100 },
  { name: "Encendedor Bic Pequeño", price: 3500, category: "Varios", stock: 20 },
  { name: "Cuaderno Norma Cuad", price: 6500, category: "Varios", stock: 20 },
  { name: "Esfero Bic Negro", price: 1200, category: "Varios", stock: 50 },
  { name: "Esfero Bic Rojo", price: 1200, category: "Varios", stock: 24 },
  { name: "Lápiz Mongol #2", price: 1000, category: "Varios", stock: 50 },
  { name: "Borrador de Nata", price: 800, category: "Varios", stock: 30 },
  { name: "Sacapuntas Metálico", price: 1500, category: "Varios", stock: 20 },
  { name: "Cinta Pegante Transp", price: 1200, category: "Varios", stock: 15 },
];

export default function SeederPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startSeeding = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const batch = writeBatch(db);
      
      PRODUCTS_SEED.forEach((product) => {
        const productRef = doc(collection(db, "products"));
        batch.set(productRef, {
          ...product,
          createdAt: new Date().toISOString()
        });
      });

      await batch.commit();
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al sembrar datos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-xl mx-auto p-10 pt-24 text-center">
        <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl shadow-slate-200 border border-slate-100 space-y-8">
          <div className="flex justify-center">
            <div className="p-6 bg-slate-900 rounded-[2rem] text-white shadow-xl rotate-3">
              <Database size={48} />
            </div>
          </div>
          
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Sembrador de Inventario</h1>
            <p className="text-slate-400 font-bold mt-2 uppercase tracking-widest text-[10px]">Carga masiva de 100 productos reales</p>
          </div>

          <div className="space-y-4">
            {success ? (
              <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex items-center gap-4 text-left animate-in zoom-in-95">
                <CheckCircle2 className="text-emerald-500 shrink-0" size={32} />
                <div>
                  <p className="text-emerald-900 font-black tracking-tight">¡Semilla plantada con éxito!</p>
                  <p className="text-emerald-600/80 text-xs font-bold mt-0.5">100 productos han sido añadidos a tu tienda.</p>
                </div>
              </div>
            ) : error ? (
              <div className="p-6 bg-red-50 rounded-3xl border border-red-100 flex items-center gap-4 text-left">
                <AlertCircle className="text-red-500 shrink-0" size={32} />
                <div>
                  <p className="text-red-900 font-black tracking-tight">Error en el proceso</p>
                  <p className="text-red-600/80 text-xs font-bold mt-0.5">{error}</p>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm font-medium leading-relaxed px-4">
                Este proceso agregará 100 productos variados a tu inventario. No elimina los existentes, solo añade nuevos.
              </p>
            )}

            {!success && (
              <button
                onClick={startSeeding}
                disabled={loading}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
                {loading ? "Sembrando..." : "Comenzar Carga Masiva"}
              </button>
            )}

            {success && (
              <Link
                href="/admin/inventory"
                className="w-full py-5 bg-slate-100 text-slate-900 rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-slate-200 transition-all active:scale-[0.98]"
              >
                Ir al Inventario
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
