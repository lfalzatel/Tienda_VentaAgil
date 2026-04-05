"use client";

import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/useAuthStore";
import { useSplashStore } from "@/store/useSplashStore";
import { usePathname } from "next/navigation";
import { SplashScreen } from "@/components/ui/SplashScreen";
import { useEffect } from "react";

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  useAuth();
  const { isLoading } = useAuthStore();
  const pathname = usePathname();
  const { showSplash, hideSplash, updateSplash, isVisible, mode } = useSplashStore();

  useEffect(() => {
    // 1. Caso: Carga inicial por recarga (F5 / Primer ingreso)
    if (isLoading && !isVisible) {
      showSplash("reload");
    } 
    // 2. Caso: Finalizar Carga inicial (Reload)
    else if (!isLoading && isVisible && mode === "reload") {
      updateSplash({ progress: 100 });
      const timer = setTimeout(() => hideSplash(), 500);
      return () => clearTimeout(timer);
    }
    // 3. Caso: Login (Transición manual)
    else if (!isLoading && isVisible && mode === "login" && pathname !== "/login") {
      updateSplash({ progress: 100 });
      // Retardo extra para asegurar el renderizado del dashboard (1000ms)
      const timer = setTimeout(() => hideSplash(), 1000);
      return () => clearTimeout(timer);
    }
    // 4. Caso: Logout (Transición manual)
    else if (!isLoading && isVisible && mode === "logout" && pathname === "/login") {
      updateSplash({ progress: 100 });
      // Retardo para asegurar el renderizado del formulario de login
      const timer = setTimeout(() => hideSplash(), 800);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isVisible, mode, pathname, showSplash, hideSplash, updateSplash]);

  // Simular progreso para recargas
  useEffect(() => {
    if (isVisible && isLoading) {
      const timer = setInterval(() => {
        updateSplash({ progress: Math.min(95, Math.random() * 5 + (useSplashStore.getState().progress)) });
      }, 500);
      return () => clearInterval(timer);
    }
  }, [isVisible, isLoading, updateSplash]);

  // Si estamos en medio de una transición (como login/logout), el Splash debe permanecer visible
  // incluso si isLoading es false (gracias a isVisible del store).
  return (
    <>
      {isVisible && pathname !== "/seed" && <SplashScreen />}
      {children}
    </>
  );
};
