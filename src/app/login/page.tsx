"use client";

import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "@/lib/firebase/config";
import { useRouter } from "next/navigation";
import { Skull, Eye, EyeOff, Mail, Fingerprint } from "lucide-react";
import { cn } from "@/lib/utils";
import { isBiometricAvailable, hasBiometricRegistered, verifyBiometric, registerBiometric, removeBiometric } from "@/lib/utils/webauthn";
import { useSplashStore } from "@/store/useSplashStore";

// Custom Google and Facebook Icons
const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24">
    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);



export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { showSplash, hideSplash, updateSplash } = useSplashStore();

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricRegistered, setBiometricRegistered] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);

  useEffect(() => {
    const checkBiometric = async () => {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
      setBiometricRegistered(hasBiometricRegistered());
    };
    checkBiometric();
  }, []);

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    setError("");
    try {
      const verifiedEmail = await verifyBiometric();
      if (!verifiedEmail) {
        setError("Biometría no verificada.");
        return;
      }

      const refreshToken = sessionStorage.getItem("fb_rt");
      if (!refreshToken) {
        setError("Sesión expirada. Ingresa con tu contraseña una vez más.");
        removeBiometric();
        setBiometricRegistered(false);
        return;
      }

      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      const res = await fetch(
        `https://securetoken.googleapis.com/v1/token?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `grant_type=refresh_token&refresh_token=${refreshToken}`
        }
      );
      const data = await res.json();
      if (!data.id_token) throw new Error("Token inválido");

      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: data.id_token })
      });

      sessionStorage.setItem("fb_rt", data.refresh_token);

      // Get role for correct redirection
      const userDoc = await getDoc(doc(db, "users", data.user_id || ""));
      const userData = userDoc.data();
      const role = userData?.role || "client";
      
      // Start splash transition
      showSplash("login");
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        currentProgress += Math.random() * 15;
        updateSplash({ progress: Math.min(99, currentProgress) });
      }, 300);

      // Wait 3 seconds minimum for the premium feel
      await new Promise(resolve => setTimeout(resolve, 3000));
      clearInterval(progressInterval);
      updateSplash({ progress: 100 });

      router.push(role === "client" ? "/client/history" : "/pos");
    } catch (err) {
      console.error(err);
      setError("Error al autenticar con biometría. Intenta con contraseña.");
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Sincronizar sesión con el servidor ANTES de navegar para evitar el redirect del middleware
      const idToken = await userCredential.user.getIdToken();
      // Start splash transition
      showSplash("login");
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        currentProgress += Math.random() * 15;
        updateSplash({ progress: Math.min(99, currentProgress) });
      }, 300);

      // Obtener rol para redirección correcta
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      const role = userDoc.data()?.role || "client";
      const redirectPath = role === "client" ? "/client/history" : "/pos";

      const available = await isBiometricAvailable();
      if (available) {
        sessionStorage.setItem("fb_rt", userCredential.user.refreshToken);
      }

      // Wait 3 seconds minimum
      await new Promise(resolve => setTimeout(resolve, 3000));
      clearInterval(progressInterval);
      updateSplash({ progress: 100 });

      router.push(redirectPath);
    } catch (err: any) {
      console.error(err);
      setError("Credenciales inválidas o error en el proceso. Por favor intenta de nuevo.");
      setLoading(false);
      hideSplash();
      // Ensure we clear interval in case it threw early
      if (typeof window !== 'undefined') {
        let id = window.setTimeout(() => {}, 0);
        while (id--) window.clearTimeout(id);
      }
    }
  };

  const handleSocialLogin = async (provider: any) => {
    setLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, provider);
      
      // Sincronizar sesión con el servidor ANTES de navegar
      const idToken = await result.user.getIdToken();
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      // Start splash transition
      showSplash("login");
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        currentProgress += Math.random() * 15;
        updateSplash({ progress: Math.min(99, currentProgress) });
      }, 300);

      // Obtener rol para redirección correcta
      const userDoc = await getDoc(doc(db, "users", result.user.uid));
      const role = userDoc.data()?.role || "client";
      const redirectPath = role === "client" ? "/client/history" : "/pos";

      const available = await isBiometricAvailable();
      if (available) {
        sessionStorage.setItem("fb_rt", result.user.refreshToken);
      }

      // Wait 3 seconds minimum
      await new Promise(resolve => setTimeout(resolve, 3000));
      clearInterval(progressInterval);
      updateSplash({ progress: 100 });

      router.push(redirectPath);
    } catch (err: any) {
      console.error(err);
      if (err.code !== "auth/popup-closed-by-user") {
        setError("Error al iniciar sesión con redes sociales.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[100dvh] items-center justify-center bg-[#f8fafc] p-2 sm:p-4 font-sans overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-sky-100 blur-[120px] opacity-50"></div>
        <div className="absolute bottom-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-blue-100 blur-[120px] opacity-50"></div>
      </div>


      
      <div className="w-full max-w-[400px] space-y-4 relative z-10 transition-all duration-500 animate-in fade-in slide-in-from-bottom-5">
        {/* Logo Section */}
        <div className="text-center group">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-[#0f2922] border border-emerald-500/30 text-emerald-400 shadow-xl shadow-emerald-900/20 transition-all duration-500 group-hover:scale-105 group-hover:rotate-3">
            <Skull className="h-8 w-8 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tighter text-slate-900 italic">
            VentaÁgil
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            Acceso inteligente para tu tienda
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white/80 backdrop-blur-2xl border border-white/50 p-6 rounded-[2rem] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.06)]">
          {/* Social Login (Primary) */}
          <button
            onClick={() => handleSocialLogin(googleProvider)}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 mb-2 border border-slate-200 rounded-2xl bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-300 font-bold text-slate-700 active:scale-[0.97] shadow-sm text-sm"
          >
            <GoogleIcon />
            <span>Entrar con Google</span>
          </button>

          {/* Biometric Access */}
          {biometricAvailable && (
            <button
              type="button"
              onClick={() => {
                if (biometricRegistered) {
                  handleBiometricLogin();
                } else {
                  setShowBiometricPrompt(true);
                }
              }}
              disabled={biometricLoading || loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5 mb-4 border-2 border-emerald-200 rounded-2xl bg-emerald-50 hover:bg-emerald-100 transition-all duration-300 font-bold text-emerald-700 active:scale-[0.97] shadow-sm text-sm"
            >
              {biometricLoading
                ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                : <Fingerprint size={20} className="text-emerald-600" />
              }
              <span>{biometricRegistered ? "Ingresar con huella" : "Activar acceso con huella"}</span>
            </button>
          )}

          {/* Divider */}
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-100"></span>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-white/0 px-4 text-slate-400 font-bold tracking-widest backdrop-blur-sm">Acceso Administrador</span>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            {error && (
              <div className="p-3 text-xs font-medium text-red-600 bg-red-50/50 border border-red-100 rounded-xl animate-shake">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  Email
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all duration-300"
                    placeholder="tu@correo.com"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  Contraseña
                </label>
                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all duration-300"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sky-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-slate-900 hover:bg-slate-800 focus:outline-none ring-offset-2 transition-all duration-300 shadow-lg active:scale-[0.98]",
                loading && "opacity-70 cursor-not-allowed"
              )}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  <span>Cargando...</span>
                </div>
              ) : (
                "Entrar con Email"
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-slate-400 font-semibold tracking-tight">
            ACCESO PROTEGIDO CON TECNOLOGÍA FIREBASE
          </p>
          <div className="h-1 w-12 bg-sky-500 rounded-full"></div>
        </div>
      </div>
      
      {/* Biometric Prompt (V3 - Absolute Centered Fix) */}
      {showBiometricPrompt && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md select-none">
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[320px] bg-white rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4 ring-8 ring-emerald-50/50">
                <Fingerprint size={32} className="text-emerald-500" />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Acceso rápido</h3>
              <p className="text-sm text-slate-500 mt-2 font-medium leading-relaxed">
                Activa tu huella o Face ID para entrar sin contraseña la próxima vez.
              </p>
            </div>
            <div className="space-y-3 pt-2">
              <button
                onClick={async () => {
                  const registered = await registerBiometric(email || auth.currentUser?.email || "Usuario");
                  if (registered) setBiometricRegistered(true);
                  const userDoc = await getDoc(doc(db, "users", auth.currentUser?.uid || ""));
                  const role = userDoc.data()?.role || "client";
                  router.push(role === "client" ? "/client/history" : "/pos");
                }}
                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.97]"
              >
                Activar biometría
              </button>
              <button
                onClick={async () => {
                  const userDoc = await getDoc(doc(db, "users", auth.currentUser?.uid || ""));
                  const role = userDoc.data()?.role || "client";
                  router.push(role === "client" ? "/client/history" : "/pos");
                }}
                className="w-full py-3 text-slate-400 text-xs font-black uppercase tracking-widest hover:text-slate-900 transition-colors"
              >
                Ahora no
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
