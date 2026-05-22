"use client";

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, Lock, Mail, Loader2 } from "lucide-react";

import { toast } from "sonner";
import { useStore } from "@/store/useStore";

export default function LoginPage() {
  const navigate = useNavigate();
  const { users, tenants, setCurrentUserId } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate login
    setTimeout(() => {
      setIsLoading(false);
      
      const emailLower = email.toLowerCase().trim();
      if (emailLower === "admin@servitracks.com" || emailLower === "admin@klynn.com") {
        if (password !== "Rptorres2017@") {
          toast.error("Contraseña de administrador incorrecta");
          return;
        }
        setCurrentUserId('admin');
        localStorage.setItem("servitracks-session", JSON.stringify({ empleado_id: 'admin', iniciado_en: new Date().toISOString() }));
        toast.success("¡Bienvenido, Super Administrador!");
        navigate("/admin");
        return;
      }

      // Lookup user in global store
      const foundUser = users.find((u) => u.email.toLowerCase().trim() === emailLower);
      if (foundUser) {
        const tenant = tenants.find((t) => t.id === foundUser.tenantId) || tenants[0];
        setCurrentUserId(foundUser.id);
        localStorage.setItem("servitracks-session", JSON.stringify({ empleado_id: foundUser.id, iniciado_en: new Date().toISOString() }));
        toast.success(`¡Bienvenido de nuevo, ${foundUser.name}!`);
        navigate(`/${tenant.slug}`);
      } else {
        // Fallback for new registration simulation if not found, or let's log in to autocheck
        const defaultUser = users[0];
        const tenant = tenants[0];
        setCurrentUserId(defaultUser.id);
        localStorage.setItem("servitracks-session", JSON.stringify({ empleado_id: defaultUser.id, iniciado_en: new Date().toISOString() }));
        toast.info(`Usuario demo temporal. Redirigiendo a ${tenant.slug}...`);
        navigate(`/${tenant.slug}`);
      }
    }, 1500);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-6 md:bg-neutral-50/50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="mb-10 text-center">
          <Link to="/" className="h-20 w-auto inline-flex items-center justify-center overflow-hidden mb-2 hover:opacity-85 transition-opacity active:scale-[0.98]">
            <img src="/logo.servitracks.png" alt="ServiTracks" className="h-full w-auto object-contain" />
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Iniciar Sesión</h1>
          <p className="mt-2 text-neutral-500">Ingresa tus credenciales para acceder a tu taller.</p>
        </div>

        <Card className="border-neutral-200 bg-white shadow-xl rounded-2xl overflow-hidden">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">Correo Electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <Input 
                    id="email" 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nombre@taller.com" 
                    className="h-12 pl-10 rounded-xl border-neutral-100 focus:ring-2 focus:ring-black transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-semibold">Contraseña</Label>
                  <Link to="/recuperar" className="text-xs font-medium text-neutral-500 hover:text-black underline underline-offset-4">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <Input 
                    id="password" 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" 
                    className="h-12 pl-10 rounded-xl border-neutral-100 focus:ring-2 focus:ring-black transition-all"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="remember" className="rounded-md border-neutral-300" />
                <Label htmlFor="remember" className="text-sm font-medium text-neutral-600">Mantener sesión iniciada</Label>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl bg-black text-white font-bold hover:bg-neutral-800 transition-all"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <>Acceder al Sistema <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-sm text-neutral-500">
          ¿No tienes una cuenta?{" "}
          <Link to="/register" className="font-bold text-black hover:underline underline-offset-4">
            Regístrate gratis
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

// Minimal Card component since I haven't added it to this file yet
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}
function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}
