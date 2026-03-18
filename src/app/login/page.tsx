"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider, facebookProvider } from "@/lib/firebase/config";
import { useRouter } from "next/navigation";
import { ShoppingBag, Eye, EyeOff, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

// Custom Google and Facebook Icons
const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24">
    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const FacebookIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24">
    <path fill="currentColor" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/pos");
    } catch (err: any) {
      console.error(err);
      setError("Credenciales inválidas. Por favor intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: any) => {
    setLoading(true);
    setError("");
    try {
      await signInWithPopup(auth, provider);
      router.push("/pos");
    } catch (err: any) {
      console.error(err);
      if (err.code !== "auth/popup-closed-by-user") {
        setError("Error al iniciar sesión con redes sociales.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] p-4 font-sans overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-sky-100 blur-[120px] opacity-50"></div>
        <div className="absolute bottom-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-blue-100 blur-[120px] opacity-50"></div>
      </div>
      
      <div className="w-full max-w-[440px] space-y-8 relative z-10 transition-all duration-500 animate-in fade-in slide-in-from-bottom-5">
        {/* Logo Section */}
        <div className="text-center group">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-[2rem] bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-2xl shadow-sky-200 transition-all duration-500 group-hover:scale-105 group-hover:rotate-3">
            <ShoppingBag className="h-10 w-10" />
          </div>
          <h1 className="mt-8 text-4xl font-black tracking-tighter text-slate-900">
            Tienda POS
          </h1>
          <p className="mt-3 text-base text-slate-500 font-medium">
            Acceso inteligente para tu tienda
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white/80 backdrop-blur-2xl border border-white/50 p-10 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)]">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="p-4 text-sm font-medium text-red-600 bg-red-50/50 border border-red-100 rounded-2xl animate-shake">
                {error}
              </div>
            )}
            
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  Correo Electrónico
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all duration-300"
                    placeholder="tu@correo.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  Contraseña
                </label>
                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all duration-300"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sky-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "group relative w-full flex justify-center py-4 px-4 border border-transparent text-base font-bold rounded-2xl text-white bg-slate-900 hover:bg-slate-800 focus:outline-none ring-offset-2 transition-all duration-300 shadow-xl active:scale-[0.98]",
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

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-100"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white/0 px-4 text-slate-400 font-bold tracking-widest backdrop-blur-sm">O continuar con</span>
            </div>
          </div>

          {/* Social Logins */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleSocialLogin(googleProvider)}
              disabled={loading}
              className="flex items-center justify-center gap-3 px-4 py-3.5 border border-slate-200 rounded-2xl bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-300 font-semibold text-slate-700 active:scale-[0.97]"
            >
              <GoogleIcon />
              <span className="text-sm">Google</span>
            </button>
            <button
              onClick={() => handleSocialLogin(facebookProvider)}
              disabled={loading}
              className="flex items-center justify-center gap-3 px-4 py-3.5 border border-slate-200 rounded-2xl bg-[#1877F2] hover:bg-[#166fe5] transition-all duration-300 font-semibold text-white active:scale-[0.97] shadow-lg shadow-blue-500/20"
            >
              <FacebookIcon />
              <span className="text-sm">Facebook</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-slate-400 font-semibold tracking-tight">
            ACCESO PROTEGIDO CON TECNOLOGÍA FIREBASE
          </p>
          <div className="h-1 w-12 bg-sky-500 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
