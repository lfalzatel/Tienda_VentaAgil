"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: ("admin" | "cashier" | "client")[];
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        if (pathname !== "/login" && pathname !== "/seed") {
          router.replace("/login");
        }
      } else if (!allowedRoles.includes(user.role)) {
        // Redirigir según el rol si no tiene acceso a esta ruta
        if (user.role === "client") {
          router.replace("/client/dashboard");
        } else {
          router.replace("/pos"); // Fallback a POS para admin/cashier si intentan ir a dashboard de client
        }
      }
    }
  }, [isLoading, user, allowedRoles, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-sky-500 w-10 h-10" />
      </div>
    );
  }

  // Si no está cargando, hay usuario y tiene un rol permitido
  if (user && allowedRoles.includes(user.role)) {
    return <>{children}</>;
  }

  // Mientras redirige, mostrar nada o loader mínimo
  return null;
}
