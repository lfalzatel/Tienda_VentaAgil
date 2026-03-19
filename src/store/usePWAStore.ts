import { create } from 'zustand';

interface PWAState {
  deferredPrompt: any;
  setDeferredPrompt: (prompt: any) => void;
}

export const usePWAStore = create<PWAState>((set) => ({
  deferredPrompt: null,
  setDeferredPrompt: (prompt) => set({ deferredPrompt: prompt }),
}));
