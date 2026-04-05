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
  const { showSplash, hideSplash, updateSplash, isVisible } = useSplashStore();

  useEffect(() => {
    if (isLoading && !isVisible) {
      showSplash("reload");
    } else if (!isLoading && isVisible) {
      // Sincronizar barra al 100% antes de ocultar
      updateSplash({ progress: 100 });
      setTimeout(() => hideSplash(), 500);
    }
  }, [isLoading, isVisible, showSplash, hideSplash, updateSplash]);

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
  if (isVisible && pathname !== "/seed") {
    return <SplashScreen />;
  }

  return <>{children}</>;
};
