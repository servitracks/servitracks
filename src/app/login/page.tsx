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
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { saveSession } from "@/lib/session";
import { ADMIN_EMAILS } from "@/lib/storage";

export default function LoginPage() {
  const navigate = useNavigate();
  const { setCurrentUserId, setAuthenticated, setTenants, setCurrentTenant, users, addUser } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      const isAdminEmail = ADMIN_EMAILS.map(e => e.toLowerCase()).includes(trimmedEmail);

      // ── Ruta Superadmin: primero intentar Supabase Auth, con fallback local ──
      if (isAdminEmail) {
        // Intentar con Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        // Si Supabase Auth falla (cuenta no existe), usar contraseña local de env
        const adminOk = !authError && authData.user
          ? true
          : (import.meta.env.VITE_ADMIN_PASSWORD && password === import.meta.env.VITE_ADMIN_PASSWORD);

        if (!adminOk) {
          toast.error("Contraseña de administrador incorrecta");
          setIsLoading(false);
          return;
        }

        const userId = authData?.user?.id || 'superadmin';
        setCurrentUserId('admin');
        setAuthenticated(true);

        const adminSession = {
          empleado_id: 'admin',
          user_id: userId,
          email: trimmedEmail,
          role: 'superadmin',
          iniciado_en: new Date().toISOString(),
          remember_me: rememberMe
        };
        localStorage.setItem("servitracks-session", JSON.stringify(adminSession));
        sessionStorage.setItem("servitracks-session", JSON.stringify(adminSession));

        toast.success("¡Bienvenido, Super Administrador!");
        navigate("/admin");
        setIsLoading(false);
        return;
      }

      // ── Ruta Usuario/Tenant: Supabase Auth normal ──
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (authError) {
        if (authError.message.includes("Invalid login credentials")) {
          toast.error("Correo o contraseña incorrectos");
        } else if (authError.message.includes("Email not confirmed")) {
          toast.error("Confirma tu correo electrónico antes de iniciar sesión");
        } else {
          toast.error("Error al iniciar sesión: " + authError.message);
        }
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        toast.error("Error al iniciar sesión");
        setIsLoading(false);
        return;
      }

      const userId = authData.user.id;
      const userEmail = (authData.user.email || trimmedEmail).trim().toLowerCase();

      let tenantUser: any = null;
      let tenant: any = null;

      // 1. Buscar en tenant_users por user_id
      try {
        const { data: tuByUserId, error: errUserId } = await supabaseAdmin
          .from("tenant_users")
          .select("id, tenant_id, user_id, name, email, role, status")
          .eq("user_id", userId)
          .limit(1);

        if (!errUserId && tuByUserId && tuByUserId.length > 0) {
          tenantUser = tuByUserId[0];
        }
      } catch (e) {
        console.warn("[Login] Error buscando tenant_user por user_id:", e);
      }

      // 2. Si no se encontró por user_id, buscar por email (case-insensitive)
      if (!tenantUser && userEmail) {
        try {
          const { data: tuByEmail, error: errEmail } = await supabaseAdmin
            .from("tenant_users")
            .select("id, tenant_id, user_id, name, email, role, status")
            .ilike("email", userEmail)
            .limit(1);

          if (!errEmail && tuByEmail && tuByEmail.length > 0) {
            tenantUser = tuByEmail[0];
            // Si el user_id estaba desactualizado, actualizarlo
            if (tenantUser.user_id !== userId) {
              await supabaseAdmin
                .from("tenant_users")
                .update({ user_id: userId })
                .eq("id", tenantUser.id);
            }
          }
        } catch (e) {
          console.warn("[Login] Error buscando tenant_user por email:", e);
        }
      }

      // 3. Si se encontró tenantUser con tenant_id, cargar su tenant
      if (tenantUser?.tenant_id) {
        try {
          const { data: tData, error: tErr } = await supabaseAdmin
            .from("tenants")
            .select("*")
            .eq("id", tenantUser.tenant_id)
            .maybeSingle();

          if (!tErr && tData) {
            tenant = tData;
          }
        } catch (e) {
          console.warn("[Login] Error cargando tenant:", e);
        }
      }

      // 4. Fallback directo: Si no se encontró tenantUser o tenant, buscar en tabla tenants por email
      if (!tenant && userEmail) {
        try {
          const { data: directTenants, error: dtErr } = await supabaseAdmin
            .from("tenants")
            .select("*")
            .ilike("email", userEmail)
            .order("created_at", { ascending: false })
            .limit(1);

          if (!dtErr && directTenants && directTenants.length > 0) {
            tenant = directTenants[0];
            // Auto-vincular en tenant_users para reparar la cuenta
            const userName = authData.user.user_metadata?.name || tenant.name || userEmail.split("@")[0];
            const { data: existingLink } = await supabaseAdmin
              .from("tenant_users")
              .select("*")
              .eq("tenant_id", tenant.id)
              .eq("user_id", userId)
              .maybeSingle();

            if (existingLink) {
              tenantUser = existingLink;
            } else {
              const { data: insertedTU } = await supabaseAdmin
                .from("tenant_users")
                .insert({
                  tenant_id: tenant.id,
                  user_id: userId,
                  name: userName,
                  email: userEmail,
                  role: "owner",
                  status: "active"
                })
                .select()
                .maybeSingle();

              tenantUser = insertedTU || {
                id: userId,
                tenant_id: tenant.id,
                user_id: userId,
                name: userName,
                email: userEmail,
                role: "owner",
                status: "active"
              };
            }
          }
        } catch (e) {
          console.warn("[Login] Error buscando tenant directo por email:", e);
        }
      }

      // 5. Si de verdad no tiene ningún taller configurado
      if (!tenant) {
        toast.info("Aún no tienes un taller configurado. Vamos a crearlo en pocos pasos.", { duration: 5000 });
        navigate(`/register?step=taller&from=login&email=${encodeURIComponent(userEmail)}`);
        setIsLoading(false);
        return;
      }

      // 6. Configurar store y sesión
      setCurrentUserId(userId);
      setAuthenticated(true);
      setTenants([tenant]);
      setCurrentTenant(tenant);

      // Asegurar que el usuario esté en el listado local de usuarios del store
      if (!users.some((u) => u.id === userId)) {
        addUser({
          id: userId,
          tenantId: tenant.id,
          name: tenantUser?.name || tenant.name || userEmail.split("@")[0],
          email: userEmail,
          role: tenantUser?.role || "owner",
          status: tenantUser?.status || "active",
          createdAt: new Date().toISOString()
        });
      }

      // Guardar sesión
      const sessionData = {
        user_id: userId,
        tenant_id: tenant.id,
        tenant_slug: tenant.slug,
        empleado_id: userId,
        email: userEmail,
        role: tenantUser?.role || "owner",
        iniciado_en: new Date().toISOString(),
        remember_me: rememberMe
      };
      localStorage.setItem("servitracks-session", JSON.stringify(sessionData));
      if (!rememberMe) {
        sessionStorage.setItem("servitracks-session", JSON.stringify(sessionData));
      }

      toast.success(`¡Bienvenido de nuevo, ${tenantUser?.name || tenant.name}!`);
      navigate(`/${tenant.slug}`);
    } catch (error: any) {
      console.error("Error en login:", error);
      toast.error("Error al iniciar sesión. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
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
                <Checkbox 
                  id="remember" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  className="rounded-md border-neutral-300" 
                />
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
