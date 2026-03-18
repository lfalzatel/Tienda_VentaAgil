"use client";

import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/useAuthStore";
import { usePathname } from "next/navigation";

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  useAuth();
  const { isLoading } = useAuthStore();
  const pathname = usePathname();

  // No bloquear la pantalla de carga para la página de seed
  if (isLoading && pathname !== "/seed") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sky-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-sky-500 border-t-transparent shadow-md"></div>
          <p className="text-sm font-medium text-sky-700 animate-pulse">Cargando sistema...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
