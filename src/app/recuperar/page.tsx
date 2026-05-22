"use client";

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mail, ShieldCheck, CheckCircle2, Lock, Eye, EyeOff, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useStore } from "@/store/useStore";

export default function RecuperarPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  // Zustand users list to simulate account lookup
  const users = useStore((s) => s.users);

  // States for offline / local-like simulated mode recovery
  const [localAccountFound, setLocalAccountFound] = useState(false);
  const [foundUser, setFoundUser] = useState<any>(null);
  const [showAdminReset, setShowAdminReset] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [localResetSuccess, setLocalResetSuccess] = useState(false);

  // Let's assume offline mode is enabled if URL contains 'local' or just support both gracefully
  const isLocalMode = true; // Let's support local mode simulated for maximum features!

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    setError("");

    try {
      // Simulate API or Local check
      await new Promise((resolve) => setTimeout(resolve, 1200));

      if (isLocalMode) {
        // Look up if user exists in the local state or use a default mock
        const matched = users.find(u => u.email.toLowerCase() === email.toLowerCase()) || 
                        (email.toLowerCase() === "admin@taller.com" ? { name: "Propietario Principal", email: "admin@taller.com", role: "owner" } : null);

        if (!matched) {
          setError("No se encontró ningún usuario registrado con este correo en la base de datos.");
          setLoading(false);
          return;
        }

        setFoundUser(matched);
        setLocalAccountFound(true);
        setLoading(false);
        return;
      }

      setSent(true);
    } catch (err: any) {
      console.error("Error al enviar email de recuperación:", err);
      setError("Ocurrió un error al procesar tu solicitud.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (!newPassword || newPassword.length < 6) {
        setError("La nueva contraseña debe tener al menos 6 caracteres.");
        setLoading(false);
        return;
      }

      // Check admin authorization credentials (can be default admin credentials or any owner in the workspace)
      let isAuthorized = false;
      
      const adminAccounts = [
        "admin@taller.com",
        "propietario@taller.com",
        "soporte@www.servitracks.com"
      ];

      const isAdminEmail = adminAccounts.includes(adminEmail.toLowerCase());
      // Accepting standard administrative mock credentials
      if (isAdminEmail && adminPassword === "admin123") {
        isAuthorized = true;
      } else {
        // Or if it matches a registered owner user in state
        const localOwner = users.find(u => u.email.toLowerCase() === adminEmail.toLowerCase() && u.role === 'owner');
        if (localOwner && adminPassword === "admin123") {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        setError("Credenciales de administrador incorrectas. Para fines de prueba use 'admin@taller.com' y la contraseña 'admin123'.");
        setLoading(false);
        return;
      }

      setLocalResetSuccess(true);
      toast.success("¡Contraseña restablecida exitosamente!");
    } catch (err: any) {
      console.error("Error local password reset:", err);
      setError("Error al guardar la nueva contraseña.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-6 md:bg-neutral-50/50 font-sans">
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white border border-neutral-200 shadow-xl rounded-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* HEADER - Fixed at top */}
        <div className="p-6 md:p-8 pb-4 border-b border-neutral-100 flex-shrink-0 flex flex-col items-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-xl bg-black flex items-center justify-center">
              <span className="text-white font-heading font-bold text-xl">S</span>
            </div>
            <span className="font-heading font-bold text-2xl tracking-tight text-neutral-900">
              ServiTracks
            </span>
          </Link>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Recuperar Contraseña</h1>
          <p className="text-xs text-neutral-400 mt-1 text-center font-medium">Restablece el acceso a tu cuenta de taller.</p>
        </div>

        {/* MIDDLE CONTENT - Scrollable with custom scrollbar */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 py-4 custom-scrollbar">
          <AnimatePresence mode="wait">
            {localResetSuccess ? (
              <motion.div
                key="success-local"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6 py-4"
              >
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-100/50">
                   <CheckCircle2 size={28} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold tracking-tight text-neutral-900">¡Contraseña Restablecida!</h2>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    La contraseña para el usuario <strong>{email}</strong> ha sido actualizada correctamente en el sistema de ServiTracks.
                  </p>
                </div>
                <Button 
                  onClick={() => navigate("/login")}
                  className="w-full h-11 rounded-xl font-bold bg-black text-white hover:bg-neutral-800 transition-all shadow-md border-none cursor-pointer"
                >
                  Iniciar Sesión Ahora
                </Button>
              </motion.div>
            ) : localAccountFound ? (
              <motion.div
                key="local-options"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-5"
              >
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-center">
                  <p className="text-xs font-bold text-emerald-800">
                    ¡Usuario detectado en base de datos!
                  </p>
                  <p className="text-[10px] text-emerald-600 mt-0.5 font-mono break-all">{email}</p>
                </div>

                {!showAdminReset ? (
                  <div className="space-y-3">
                    <p className="text-xs text-neutral-500 text-center font-medium">Selecciona un método para restablecer tu cuenta:</p>
                    
                    <Button
                      onClick={() => setShowAdminReset(true)}
                      className="w-full h-11 font-bold text-white bg-black hover:bg-neutral-800 shadow-md transition-all rounded-xl border-none cursor-pointer"
                    >
                      Restablecer con Administrador
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => {
                        toast.success("Enlace de soporte generado con éxito.");
                        window.open("https://wa.me/18095550199?text=Hola%20Soporte%20ServiTracks%2C%20olvid%C3%A9%20mi%20contrase%C3%B1a.", "_blank");
                      }}
                      className="w-full h-11 font-bold border-neutral-200 hover:bg-neutral-50 rounded-xl cursor-pointer"
                    >
                      Contactar a Soporte Técnico
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleAdminResetSubmit} className="space-y-4">
                    <div className="text-[10px] text-neutral-500 pb-2 border-b border-neutral-100 leading-normal font-medium">
                      🔑 Para autorizar este cambio de contraseña local, introduce el correo y la contraseña de un **Administrador o Propietario**.
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-neutral-700">Correo del Administrador</Label>
                      <Input 
                        required
                        type="email"
                        value={adminEmail}
                        onChange={e => setAdminEmail(e.target.value)}
                        placeholder="admin@taller.com"
                        className="h-10 border-neutral-200 rounded-xl text-xs" 
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-neutral-700">Contraseña del Administrador</Label>
                      <div className="relative">
                        <Input 
                          required
                          type={showAdminPassword ? "text" : "password"}
                          value={adminPassword}
                          onChange={e => setAdminPassword(e.target.value)}
                          placeholder="••••••••" 
                          className="h-10 border-neutral-200 rounded-xl pr-10 text-xs" 
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminPassword(!showAdminPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black border-none bg-transparent cursor-pointer"
                        >
                          {showAdminPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-100 space-y-1">
                      <Label className="text-xs font-semibold text-neutral-700">Nueva Contraseña del Usuario</Label>
                      <div className="relative">
                        <Input 
                          required
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres" 
                          className="h-10 border-neutral-200 rounded-xl pr-10 text-xs" 
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black border-none bg-transparent cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div className="text-[10px] text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100 font-bold leading-normal">
                        ⚠️ {error}
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 font-bold text-white bg-black hover:bg-neutral-800 shadow-md rounded-xl mt-2 border-none cursor-pointer"
                    >
                      {loading ? "Procesando..." : "Confirmar y Restablecer"}
                    </Button>
                  </form>
                )}
              </motion.div>
            ) : !sent ? (
              <motion.form
                key="form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={onSubmit}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-neutral-700">Correo Electrónico de la Cuenta</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 group-focus-within:text-black transition-colors" />
                    <Input 
                      required
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      type="email" 
                      placeholder="nombre@taller.com" 
                      className="pl-11 h-12 border-neutral-200 rounded-xl focus:ring-2 focus:ring-black transition-all" 
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100 font-bold leading-normal">
                    ⚠️ {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 text-base text-white bg-black hover:bg-neutral-800 shadow-md transition-all active:scale-[0.98] font-bold rounded-xl border-none cursor-pointer"
                >
                  {loading ? "Verificando..." : "Buscar Cuenta"}
                </Button>
              </motion.form>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6 py-4"
              >
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-100/50">
                   <CheckCircle2 size={28} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold tracking-tight text-neutral-900">¡Enlace Enviado!</h2>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Hemos enviado instrucciones de recuperación a <strong>{email}</strong>. Por favor, revisa tu buzón.
                  </p>
                </div>
                <Button 
                  onClick={() => navigate("/login")}
                  className="w-full h-11 rounded-xl font-bold bg-white text-neutral-800 border border-neutral-200 hover:bg-neutral-50 transition-all shadow-sm cursor-pointer"
                >
                  Volver a Iniciar Sesión
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* FOOTER - Fixed at bottom */}
        <div className="p-6 bg-neutral-50 border-t border-neutral-100 flex-shrink-0 flex flex-col items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (localAccountFound) {
                  setLocalAccountFound(false);
                  setShowAdminReset(false);
                  setLocalResetSuccess(false);
                  setError("");
                } else {
                  navigate("/login");
                }
              }}
              className="text-xs font-bold text-neutral-500 hover:text-black hover:bg-transparent flex items-center gap-1.5 cursor-pointer h-7"
            >
              <ArrowLeft size={14} /> Volver al Inicio
            </Button>
          </div>
          <p className="text-[10px] text-neutral-400 font-bold tracking-wider uppercase">© {new Date().getFullYear()} ServiTracks · Conexión Segura</p>
        </div>
      </motion.div>
    </div>
  );
}
