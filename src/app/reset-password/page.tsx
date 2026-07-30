"use client";

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Escuchar cambios de estado en la autenticación (cuando se hace clic en el enlace del correo)
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event == "PASSWORD_RECOVERY") {
        // El usuario ha sido autenticado por el enlace y puede cambiar su contraseña
        toast.info("Por favor, introduce tu nueva contraseña.");
      }
    });

    // Check if there's an access token or error in URL fragment
    const hash = window.location.hash;
    if (hash && hash.includes("error_description")) {
      const params = new URLSearchParams(hash.replace('#', '?'));
      setError(params.get("error_description") || "El enlace de recuperación es inválido o ha expirado.");
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || !confirmPassword) return;

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message || "Error al actualizar la contraseña.");
        return;
      }

      setSuccess(true);
      // Cerrar sesión después de cambiar la contraseña para forzar el inicio de sesión con las nuevas credenciales
      await supabase.auth.signOut();
    } catch (err) {
      setError("Error de conexión. Verifica tu internet e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-6 md:bg-neutral-50/50 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white border border-neutral-200 shadow-xl rounded-2xl overflow-hidden"
      >
        <div className="p-8 pb-6 border-b border-neutral-100 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 mb-5">
            <div className="h-10 w-10 rounded-xl bg-black flex items-center justify-center">
              <span className="text-white font-heading font-bold text-xl">S</span>
            </div>
            <span className="font-heading font-bold text-2xl tracking-tight text-neutral-900">
              ServiTracks
            </span>
          </div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Nueva Contraseña</h1>
          <p className="text-sm text-neutral-400 mt-1 font-medium">
            Ingresa tu nueva contraseña para acceder a tu cuenta.
          </p>
        </div>

        <div className="p-8">
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-5 py-2"
            >
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                <CheckCircle2 size={30} />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight text-neutral-900">
                  ¡Contraseña actualizada!
                </h2>
                <p className="text-sm text-neutral-500 leading-relaxed">
                  Tu contraseña ha sido cambiada exitosamente. Ya puedes acceder a tu cuenta.
                </p>
              </div>
              <div className="pt-2">
                <Button
                  onClick={() => navigate("/login")}
                  className="w-full h-11 rounded-xl font-bold bg-black text-white hover:bg-neutral-800 transition-all border-none cursor-pointer"
                >
                  Iniciar Sesión
                </Button>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-neutral-700">Nueva Contraseña</Label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 group-focus-within:text-black transition-colors" />
                  <Input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    placeholder="••••••••"
                    className="pl-11 h-12 border-neutral-200 rounded-xl focus:ring-2 focus:ring-black transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-neutral-700">Confirmar Nueva Contraseña</Label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 group-focus-within:text-black transition-colors" />
                  <Input
                    required
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                    placeholder="••••••••"
                    className="pl-11 h-12 border-neutral-200 rounded-xl focus:ring-2 focus:ring-black transition-all"
                  />
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2.5 text-sm text-rose-600 bg-rose-50 p-3.5 rounded-xl border border-rose-100"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span className="font-medium leading-snug">{error}</span>
                </motion.div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-base text-white bg-black hover:bg-neutral-800 shadow-md transition-all active:scale-[0.98] font-bold rounded-xl border-none cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Actualizando...
                  </span>
                ) : (
                  "Guardar Nueva Contraseña"
                )}
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
