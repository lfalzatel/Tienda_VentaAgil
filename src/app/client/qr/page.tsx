"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { Header } from "@/components/layout/Header";
import { QrCode } from "lucide-react";

export default function ClientQrPage() {
  const { user } = useAuthStore();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col pb-28">
      <Header title="Mi Código" />
      <main className="flex-grow p-6 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500">
        <div className="bg-white p-8 sm:p-12 rounded-[3.5rem] shadow-2xl shadow-emerald-500/10 border border-slate-100 flex flex-col items-center w-full max-w-sm">
          <div className="mb-6 h-12 w-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
            <QrCode size={24} />
          </div>
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">
            Tu Cédula
          </p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-slate-900 mb-8 select-all">
            {user.cedula}
          </h1>
          
          <div className="bg-slate-50 w-full aspect-square rounded-[2rem] border border-slate-100 flex flex-col items-center justify-center p-8 relative overflow-hidden group">
            {/* Fake QR Background */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-400 to-transparent"></div>
            
            <QrCode className="w-full h-full text-slate-800" strokeWidth={1} />
            
            <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] font-bold bg-white text-slate-800 px-3 py-1.5 rounded-full shadow-lg">Presiona para agrandar</span>
            </div>
          </div>
          
          <p className="mt-8 text-xs font-medium text-slate-500 leading-relaxed">
            Muestra este código al cajero para que registre tu compra o abono de forma inmediata.
          </p>
        </div>
      </main>
    </div>
  );
}
