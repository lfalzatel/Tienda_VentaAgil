import { create } from "zustand";

interface User {
  uid: string;
  email: string | null;
  role: "admin" | "cashier";
  name?: string | null;
  photoURL?: string | null;
}

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
