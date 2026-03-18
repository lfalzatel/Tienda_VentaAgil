"use client";

import { useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { useAuthStore } from "@/store/useAuthStore";

export const useAuth = () => {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        // Limpiar sesión del servidor en segundo plano
        fetch("/api/auth/session", { method: "DELETE" }).catch(console.error);
        return;
      }

      try {
        // Obtener rol (puedes optar por no bloquear aquí también si prefieres velocidad extrema)
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        const userData = userDoc.data();
        const role = userData?.role || "cashier";

        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          role: role,
          name: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          role: "cashier",
          name: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });
      }

      // Marcar como cargado el cliente
      setLoading(false);

      // Sincronizar token con el servidor en segundo plano
      firebaseUser.getIdToken().then(idToken => {
        return fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
      }).catch(console.error);
    });

    return () => unsubscribe();
  }, [setUser, setLoading]);
};
