import { create } from "zustand";

type SplashMode = "login" | "logout" | "reload";

interface SplashStore {
  isVisible: boolean;
  mode: SplashMode;
  message: string;
  progress: number;
  showSplash: (mode: SplashMode, message?: string) => void;
  hideSplash: () => void;
  updateSplash: (update: Partial<{ message: string; progress: number }>) => void;
}

const defaultMessages: Record<SplashMode, string> = {
  login: "Validando acceso...",
  logout: "Cerrando sesión de forma segura...",
  reload: "Sincronizando con la nube...",
};

export const useSplashStore = create<SplashStore>((set) => ({
  isVisible: false,
  mode: "reload",
  message: "",
  progress: 0,
  showSplash: (mode, message) => 
    set({ 
      isVisible: true, 
      mode, 
      message: message || defaultMessages[mode], 
      progress: 0 
    }),
  hideSplash: () => set({ isVisible: false, progress: 0 }),
  updateSplash: (update) => set((state) => ({ ...state, ...update })),
}));
