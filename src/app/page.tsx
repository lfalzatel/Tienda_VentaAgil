"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir al POS por defecto
    const timeout = setTimeout(() => {
      router.push("/pos");
    }, 2000);
    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 font-sans p-6 text-center">
      <main className="flex flex-col items-center gap-8 max-w-sm">
        <div className="bg-gradient-to-br from-sky-500 to-blue-600 p-6 rounded-[2.5rem] text-white shadow-2xl shadow-sky-200 animate-bounce">
          <ShoppingBag size={48} />
        </div>
        
        <div className="space-y-3">
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 italic">
            VentaÁgil
          </h1>
          <p className="text-slate-500 font-medium">
            Cargando tu punto de venta...
          </p>
        </div>

        <div className="w-16 h-1 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-sky-500 animate-progress"></div>
        </div>

        <style jsx global>{`
          @keyframes progress {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .animate-progress {
            animation: progress 1.5s infinite linear;
          }
        `}</style>
      </main>
    </div>
  );
}

