"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { Header } from "@/components/layout/Header";

export default function ClientHistoryPage() {
  const { user } = useAuthStore();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col pb-24">
      <Header title="Historial Completo" />
      <main className="flex-grow p-6 sm:p-10 max-w-4xl mx-auto w-full flex flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-black text-slate-900 mb-2">Próximamente</h2>
        <p className="text-slate-500 font-medium max-w-sm">
          Estamos trabajando para que puedas ver todos tus movimientos y buscar transacciones antiguas aquí.
        </p>
      </main>
    </div>
  );
}
