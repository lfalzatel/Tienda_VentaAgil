"use client";

import { useEffect } from 'react';
import { usePWAStore } from '@/store/usePWAStore';

export function PWAProvider() {
  const setDeferredPrompt = usePWAStore((state) => state.setDeferredPrompt);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      console.log("PWA: beforeinstallprompt event fired");
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [setDeferredPrompt]);

  return null;
}
