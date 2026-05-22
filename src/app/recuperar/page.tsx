"use client";

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export default function RecuperarPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError("");

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        // Supabase returns success even for non-existent emails (security best practice)
        // Only real errors like rate-limiting will surface here
        setError("Ocurrió un error al enviar el correo. Intenta de nuevo más tarde.");
        return;
      }

      setSent(true);
    } catch {
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
        {/* Header */}
        <div className="p-8 pb-6 border-b border-neutral-100 flex flex-col items-center text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-5">
            <div className="h-10 w-10 rounded-xl bg-black flex items-center justify-center">
              <span className="text-white font-heading font-bold text-xl">S</span>
            </div>
            <span className="font-heading font-bold text-2xl tracking-tight text-neutral-900">
              ServiTracks
            </span>
          </Link>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Recuperar Contraseña</h1>
          <p className="text-sm text-neutral-400 mt-1 font-medium">
            Restablece el acceso a tu cuenta de taller.
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            {sent ? (
              /* Success state */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-5 py-2"
              >
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                  <CheckCircle2 size={30} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold tracking-tight text-neutral-900">
                    ¡Revisa tu correo!
                  </h2>
                  <p className="text-sm text-neutral-500 leading-relaxed">
                    Si existe una cuenta asociada a{" "}
                    <strong className="text-neutral-800">{email}</strong>, recibirás un
                    enlace para restablecer tu contraseña en los próximos minutos.
                  </p>
                  <p className="text-xs text-neutral-400 mt-2">
                    Revisa también tu carpeta de spam o correo no deseado.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <Button
                    onClick={() => navigate("/login")}
                    className="w-full h-11 rounded-xl font-bold bg-black text-white hover:bg-neutral-800 transition-all border-none cursor-pointer"
                  >
                    Volver a Iniciar Sesión
                  </Button>
                  <button
                    onClick={() => { setSent(false); setEmail(""); setError(""); }}
                    className="w-full text-xs text-neutral-400 hover:text-neutral-700 py-2 transition-colors"
                  >
                    Usar otro correo
                  </button>
                </div>
              </motion.div>
            ) : (
              /* Email form */
              <motion.form
                key="form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={onSubmit}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-neutral-700">
                    Correo Electrónico de la Cuenta
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 group-focus-within:text-black transition-colors" />
                    <Input
                      required
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(""); }}
                      type="email"
                      placeholder="nombre@taller.com"
                      className="pl-11 h-12 border-neutral-200 rounded-xl focus:ring-2 focus:ring-black transition-all"
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Error message */}
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
                      Enviando...
                    </span>
                  ) : (
                    "Enviar Enlace de Recuperación"
                  )}
                </Button>

                <p className="text-xs text-neutral-400 text-center leading-relaxed">
                  Te enviaremos un enlace seguro para restablecer tu contraseña.
                  El enlace expirará en 1 hora.
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 pt-0 flex flex-col items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/login")}
            className="text-xs font-bold text-neutral-500 hover:text-black hover:bg-transparent flex items-center gap-1.5 cursor-pointer h-7"
          >
            <ArrowLeft size={14} /> Volver al Inicio
          </Button>
          <p className="text-[10px] text-neutral-400 font-bold tracking-wider uppercase">
            © {new Date().getFullYear()} ServiTracks · Conexión Segura
          </p>
        </div>
      </motion.div>
    </div>
  );
}
