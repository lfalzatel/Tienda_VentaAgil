"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Header } from "@/components/layout/Header";
import { 
  Users, 
  Search, 
  UserPlus,
  ChevronRight,
  TrendingUp,
  CreditCard
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { NewClientModal } from "@/components/admin/NewClientModal";
import { useAuthStore } from "@/store/useAuthStore";

interface Client {
  id: string;
  name: string;
  phone?: string;
  totalDebt: number;
}

export default function ClientsPage() {
  const { user: currentUser } = useAuthStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "debtors">("debtors"); // Default to debtors as per user initial focus
  const [loading, setLoading] = useState(true);
  const [showNewClientModal, setShowNewClientModal] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "debtors"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Client, "id">),
      }));
      setClients(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const totalGlobalDebt = clients.reduce((acc, c) => acc + c.totalDebt, 0);

  const filteredClients = clients.filter((c) => {
    // Security: Propietario cannot see admins in the list
    if (currentUser?.role === "propietario" && (c as any).role === "admin") return false;
    
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeTab === "debtors") return matchesSearch && c.totalDebt > 0;
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Header />
      
      <main className="p-6 sm:p-10 max-w-7xl mx-auto w-full pb-32">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-slate-900">Clientes</h1>
            <p className="text-slate-500 font-medium text-xs mt-0.5">Directorio y gestión de crédito</p>
          </div>
          
          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
            <div className="px-4 py-1.5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-tight">Total Deuda</p>
              <p className="text-lg font-black text-red-600 tracking-tighter">
                ${(totalGlobalDebt ?? 0).toLocaleString("es-CO")}
              </p>
            </div>
            <div className="h-8 w-px bg-slate-100"></div>
            <button
              onClick={() => setShowNewClientModal(true)}
              className="p-2 bg-slate-900 text-white rounded-xl shadow-lg hover:bg-slate-800 transition-all active:scale-95"
            >
              <UserPlus size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-slate-100/50 p-1.5 rounded-[2rem] w-fit border border-slate-200/40">
          <button
            onClick={() => setActiveTab("debtors")}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-full text-xs font-black transition-all duration-300 uppercase tracking-widest",
              activeTab === "debtors" 
                ? "bg-white text-red-600 shadow-md shadow-red-100" 
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            <TrendingUp size={14} />
            Deudores
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-full text-xs font-black transition-all duration-300 uppercase tracking-widest",
              activeTab === "all" 
                ? "bg-white text-slate-900 shadow-md shadow-slate-100" 
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            <Users size={14} />
            Todos
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-8 group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-6 py-5 bg-white border border-slate-100 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all text-sm font-bold shadow-sm"
          />
        </div>

        {/* List Grid */}
        <div className="">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-[3rem] border border-slate-100 border-dashed">
              <Users size={64} className="text-slate-200 mb-4" />
              <p className="text-slate-500 font-bold italic">No se encontraron clientes</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClients.map((client) => (
                <Link
                  key={client.id}
                  href={`/admin/clients/${client.id}`}
                  className="group bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-500",
                      client.totalDebt > 0 
                        ? "bg-red-50 text-red-500 group-hover:bg-red-500 group-hover:text-white" 
                        : "bg-slate-50 text-slate-400 group-hover:bg-slate-900 group-hover:text-white"
                    )}>
                      <Users size={24} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 transition-colors">
                        {client.name}
                      </h3>
                      <p className={cn(
                        "text-xs font-bold mt-0.5",
                        client.totalDebt > 0 ? "text-red-500" : "text-slate-400"
                      )}>
                        {client.totalDebt > 0 
                          ? `$${(client.totalDebt ?? 0).toLocaleString("es-CO")} pendiente` 
                          : "Al día"}
                      </p>
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 group-hover:bg-slate-900/5 transition-colors">
                    <ChevronRight size={20} className="text-slate-300 group-hover:text-slate-900 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <NewClientModal 
        isOpen={showNewClientModal} 
        onClose={() => setShowNewClientModal(false)} 
      />
    </div>
  );
}
