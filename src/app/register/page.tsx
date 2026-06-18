"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Check, Building2, Palette, Package, UserCircle2, PartyPopper,
  AlertCircle, Search, MapPin, Upload, Sparkles, Eye, EyeOff, Droplet, Clock, CheckCircle2,
  Wrench
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useStore } from "@/store/useStore";
import type { Tenant, TenantUser } from "@/store/types";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { getPlans } from "@/lib/storage";
import type { Plan } from "@/store/types";

// Dominican Republic provinces list
const PROVINCIAS_RD = [
  "Distrito Nacional",
  "Santo Domingo",
  "Santiago",
  "La Altagracia",
  "La Romana",
  "San Pedro de Macorís",
  "San Cristóbal",
  "Duarte",
  "La Vega",
  "Puerto Plata",
  "Espaillat",
  "Monseñor Nouel",
  "Samaná",
  "Barahona",
  "San Juan",
  "Azua",
  "Peravia",
  "Monte Plata",
  "Hato Mayor",
  "El Seibo",
  "María Trinidad Sánchez",
  "Sánchez Ramírez",
  "Hermanas Mirabal",
  "Montecristi",
  "Valverde",
  "Santiago Rodríguez",
  "Dajabón",
  "Elias Piña",
  "Independencia",
  "Pedernales",
  "Bahoruco",
  "San José de Ocoa"
];

// Plans are loaded dynamically from Supabase (managed via Superadmin)

const STEPS = [
  { id: 1, label: "Taller", icon: Building2 },
  { id: 2, label: "Marca", icon: Palette },
  { id: 3, label: "Plan", icon: Package },
  { id: 4, label: "Admin", icon: UserCircle2 },
  { id: 5, label: "Listo", icon: PartyPopper },
];

interface FormState {
  // taller
  nombre: string;
  telefono: string;
  provincia: string;
  // marca
  slug: string;
  slugTouched: boolean;
  color_primario: string;
  logo_url: string;
  // plan
  plan_id: string;
  // admin
  admin_nombre: string;
  admin_email: string;
  admin_password: string;
  admin_password_confirm: string;
}

const initial: FormState = {
  nombre: "",
  telefono: "",
  provincia: "",
  slug: "",
  slugTouched: false,
  color_primario: "#059669", // Emerald 600 default for ServiTracks
  logo_url: "",
  plan_id: "",
  admin_nombre: "",
  admin_email: "",
  admin_password: "",
  admin_password_confirm: "",
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
}

function formatPhoneRD(value: string) {
  const clean = value.replace(/\D/g, "");
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6, 10)}`;
}

function formatRD(value: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 0,
  }).format(value);
}

// Real image compressor: resizes to max 512x512 and converts to WebP (or JPEG fallback)
function compressToWebP(file: File, maxSize = 512, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas no disponible")); return; }

        // White background (for transparent PNGs)
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP first, fallback to JPEG
        const webpData = canvas.toDataURL("image/webp", quality);
        if (webpData.startsWith("data:image/webp")) {
          resolve(webpData);
        } else {
          // Safari/old browsers that don't support WebP output
          resolve(canvas.toDataURL("image/jpeg", quality));
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const addTenant = useStore((s) => s.addTenant);
  const addUser = useStore((s) => s.addUser);
  const setCurrentUserId = useStore((s) => s.setCurrentUserId);
  const setAuthenticated = useStore((s) => s.setAuthenticated);
  const setTenants = useStore((s) => s.setTenants);
  const setCurrentTenant = useStore((s) => s.setCurrentTenant);
  const tenants = useStore((s) => s.tenants);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [provOpen, setProvOpen] = useState(false);
  const [createdTenant, setCreatedTenant] = useState<Tenant | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisioningStep, setProvisioningStep] = useState(0);
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [dbPlans, setDbPlans] = useState<Plan[]>([]);

  const logoInputRef = useRef<HTMLInputElement>(null);

  const storePlans = useStore((s) => s.plans);

  // Load plans from Supabase on mount, fallback to Zustand store (persisted in localStorage)
  useEffect(() => {
    let cancelled = false;
    async function loadPlans() {
      try {
        const plans = await getPlans();
        if (cancelled) return;
        if (plans && plans.length > 0) {
          setDbPlans(plans);
          const featured = plans.find(p => p.destacado);
          const defaultPlan = featured || plans[0];
          setForm(f => f.plan_id ? f : { ...f, plan_id: defaultPlan.id });
          return;
        }
      } catch (err) {
        console.error("[Register] Error loading plans:", err);
      }
      // Fallback: use store plans if Supabase returned nothing
      const cached = useStore.getState().plans;
      if (!cancelled && cached && cached.length > 0) {
        setDbPlans(cached);
        const featured = cached.find(p => p.destacado);
        const defaultPlan = featured || cached[0];
        setForm(f => f.plan_id ? f : { ...f, plan_id: defaultPlan.id });
      }
    }
    loadPlans();
    return () => { cancelled = true; };
  }, []);

  // Reactive: if store plans arrive later (e.g. from Pricing component sync), use them
  useEffect(() => {
    if (dbPlans.length === 0 && storePlans && storePlans.length > 0) {
      setDbPlans(storePlans);
      const featured = storePlans.find(p => p.destacado);
      const defaultPlan = featured || storePlans[0];
      setForm(f => f.plan_id ? f : { ...f, plan_id: defaultPlan.id });
    }
  }, [storePlans, dbPlans.length]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error("El archivo supera el tamaño máximo permitido de 5MB");
      return;
    }
    try {
      const originalKB = Math.round(f.size / 1024);
      const webpDataUrl = await compressToWebP(f, 512, 0.85);
      // Calculate output size from base64 string
      const outputBytes = Math.round((webpDataUrl.length * 3) / 4);
      const outputKB = Math.round(outputBytes / 1024);
      const isWebP = webpDataUrl.startsWith("data:image/webp");
      update("logo_url", webpDataUrl);
      toast.success(
        `Logotipo optimizado: ${originalKB}KB → ${outputKB}KB ${isWebP ? "(WebP)" : "(JPEG)"}`,
        { duration: 4000 }
      );
    } catch {
      toast.error("Ocurrió un error al procesar la imagen");
    }
  }

  const provisioningSteps = useMemo(() => {
    return [
      "Inicializando base de datos local para ServiTracks...",
      "Generando secuencias de comprobantes fiscales (NCF)...",
      "Configurando catálogo inicial de servicios y autopartes...",
      "Asegurando almacenamiento local para diagnósticos de vehículos...",
      "¡Todo listo! Creando tu taller mecánico..."
    ];
  }, []);

  const slugFormatOk = useMemo(() => {
    if (form.slug.length < 3) return false;
    return /^[a-z0-9-]+$/.test(form.slug);
  }, [form.slug]);

  // Async slug check against Supabase
  useEffect(() => {
    if (!slugFormatOk) {
      setSlugAvailable(null);
      return;
    }
    setSlugChecking(true);
    setSlugAvailable(null);
    const timer = setTimeout(async () => {
      try {
        const { data: rows, error } = await supabaseAdmin
          .from("tenants")
          .select("id")
          .eq("slug", form.slug)
          .limit(1);
        setSlugAvailable(!error && (!rows || rows.length === 0));
      } catch {
        setSlugAvailable(true); // optimistic on network error
      } finally {
        setSlugChecking(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [form.slug, slugFormatOk]);

  const slugOk = slugFormatOk && slugAvailable === true;

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === "nombre" && !f.slugTouched) {
        next.slug = slugify(String(v));
      }
      return next;
    });
    setErrors((e) => ({ ...e, [k]: undefined }));
  }

  function validateStep(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (step === 1) {
      if (!form.nombre.trim()) e.nombre = "El nombre del taller es obligatorio";
      if (!form.telefono || form.telefono.replace(/\D/g, "").length < 10) e.telefono = "Número de teléfono no válido";
      if (!form.provincia) e.provincia = "Debes seleccionar una provincia";
    }
    if (step === 2) {
      if (!slugFormatOk) e.slug = "El subdominio debe tener al menos 3 caracteres y solo letras, números o guiones";
      else if (slugChecking) e.slug = "Verificando disponibilidad, espera un momento...";
      else if (slugAvailable === false) e.slug = "Este subdominio ya está en uso, elige otro";
      else if (slugAvailable === null) e.slug = "Verificando disponibilidad del subdominio...";
    }
    if (step === 4) {
      if (!form.admin_nombre.trim()) e.admin_nombre = "El nombre del administrador es obligatorio";
      if (!form.admin_email.includes("@")) e.admin_email = "Dirección de correo electrónico inválida";
      if (form.admin_password.length < 8) e.admin_password = "La contraseña debe tener al menos 8 caracteres";
      if (form.admin_password !== form.admin_password_confirm) e.admin_password_confirm = "Las contraseñas no coinciden";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleFinalize() {
    setIsProvisioning(true);
    setProvisioningStep(0);

    try {
      // 1. Crear usuario en Supabase Auth (client normal)
      setProvisioningStep(0);
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.admin_email,
        password: form.admin_password,
        options: { data: { name: form.admin_nombre } }
      });

      if (authError) {
        if (authError.message.toLowerCase().includes("already registered") ||
            authError.message.toLowerCase().includes("already exists")) {
          throw new Error("Este correo ya está registrado. Usa otro o inicia sesión.");
        }
        throw new Error(`Error de autenticación: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error("No se pudo crear el usuario.");
      }

      const userId = authData.user.id;

      // 2. Insertar Tenant usando supabaseAdmin (bypasea RLS con service_role)
      setProvisioningStep(1);
      const { data: tenantData, error: tenantError } = await supabaseAdmin
        .from("tenants")
        .insert({
          name: form.nombre,
          slug: form.slug,
          logo: form.logo_url || null,
          phone: form.telefono,
          address: `Provincia ${form.provincia}, República Dominicana`,
          email: form.admin_email,
          status: "active",
          config: {
            umbral_diferencia_caja: 500,
            formato_ticket: "80mm",
            formato_ticket_default: "80mm"
          },
          plan_id: form.plan_id,
          estado: "ACTIVO"
        })
        .select()
        .single();

      if (tenantError) {
        throw new Error(`Error al crear el taller: ${tenantError.message}`);
      }

      const tenantId = tenantData.id;

      // 3. Vincular usuario al tenant (supabaseAdmin)
      setProvisioningStep(2);
      const { error: tenantUserError } = await supabaseAdmin
        .from("tenant_users")
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          name: form.admin_nombre,
          email: form.admin_email,
          role: "owner",
          status: "active"
        });

      if (tenantUserError) {
        throw new Error(`Error de vinculación de usuario: ${tenantUserError.message}`);
      }

      // 4. Crear empleado principal (supabaseAdmin)
      setProvisioningStep(3);
      const { error: empleadoError } = await supabaseAdmin
        .from("empleados")
        .insert({
          tenant_id: tenantId,
          nombre: form.admin_nombre.split(" ")[0],
          apellido: form.admin_nombre.split(" ").slice(1).join(" ") || "",
          rol: "ADMIN",
          pin: "1234"
        });

      if (empleadoError) {
        throw new Error(`Error al crear empleado: ${empleadoError.message}`);
      }

      // 5. Iniciar sesión para establecer JWT en el cliente (best-effort)
      setProvisioningStep(4);
      await supabase.auth.signInWithPassword({
        email: form.admin_email,
        password: form.admin_password,
      });

      await new Promise((r) => setTimeout(r, 800));

      // Actualizar store local de Zustand
      const localTenant: Tenant = {
        id: tenantId,
        name: tenantData.name,
        slug: tenantData.slug,
        logo: tenantData.logo || undefined,
        phone: tenantData.phone || undefined,
        address: tenantData.address || undefined,
        email: tenantData.email || undefined,
        status: "active",
        config: tenantData.config,
        plan_id: tenantData.plan_id || undefined,
        estado: tenantData.estado || undefined
      };

      const localUser: TenantUser = {
        id: userId,
        tenantId: tenantId,
        name: form.admin_nombre,
        email: form.admin_email,
        role: "owner",
        status: "active",
        createdAt: new Date().toISOString()
      };

      addTenant(localTenant);
      addUser(localUser);
      setCurrentUserId(localUser.id);
      setAuthenticated(true);
      setTenants([localTenant]);
      setCurrentTenant(localTenant);

      localStorage.setItem(
        "servitracks-session",
        JSON.stringify({
          empleado_id: localUser.id,
          iniciado_en: new Date().toISOString()
        })
      );

      setCreatedTenant(localTenant);
      setIsProvisioning(false);
      setStep(5);
      toast.success("¡Taller registrado exitosamente!");
    } catch (err: any) {
      setIsProvisioning(false);
      toast.error(err.message || "Ocurrió un error inesperado al registrar el taller.");
      console.error(err);
    }
  }

  function next() {
    if (!validateStep()) return;
    if (step < 4) {
      setStep((s) => s + 1);
    } else if (step === 4) {
      handleFinalize();
    }
  }

  function prev() { 
    setStep((s) => Math.max(1, s - 1)); 
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-neutral-100 flex flex-col justify-between">
      
      {/* ═══════════════ HEADER ═══════════════ */}
      <header className="flex pt-6 pb-4 flex-col items-center justify-center px-6 relative border-b border-neutral-200/40 bg-white/40 backdrop-blur-md">
        <div className="flex flex-col items-center justify-center gap-1">
          <Link to="/" className="h-28 w-auto flex items-center justify-center overflow-hidden mb-1 hover:opacity-85 transition-opacity active:scale-[0.98]">
            <img src="/logo.servitracks.png" alt="ServiTracks" className="h-full w-auto object-contain" />
          </Link>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">El control de tu taller, simplificado</span>
        </div>
        <div className="absolute right-6 top-8 hidden text-xs md:block">
          <span className="text-neutral-400 font-semibold">¿Ya tienes taller? </span>
          <Link to="/login" className="font-bold text-emerald-600 hover:underline">Inicia sesión</Link>
        </div>
      </header>

      {/* ═══════════════ MAIN CONTENT ═══════════════ */}
      <main className="container mx-auto pb-10 pt-4 flex-1 flex flex-col items-center justify-center">
        
        {/* Progress Tracker Steps */}
        <div className="w-full max-w-2xl px-4 mb-6">
          <div className="flex items-center gap-1 rounded-full border border-neutral-200/80 bg-white/80 p-1 shadow-sm">
            {STEPS.map((s) => {
              const done = step > s.id;
              const current = step === s.id;
              return (
                <div key={s.id} className={`relative flex transition-all duration-500 ${current ? "flex-[2]" : "flex-1"}`}>
                  <motion.div
                    animate={{
                      backgroundColor: done ? "#059669" : current ? "#0f172a" : "transparent",
                    }}
                    className={`flex h-8 w-full items-center gap-1.5 overflow-hidden rounded-full px-3 transition-all duration-300 ${
                      done || current ? "text-white" : "text-slate-400"
                    }`}
                  >
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold transition-colors ${
                      done || current ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"
                    }`}>
                      {done ? <Check className="h-2.5 w-2.5" /> : s.id}
                    </div>
                    {(current || done) && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        className="overflow-hidden whitespace-nowrap text-[9px] font-black uppercase tracking-wider"
                      >
                        {s.label}
                      </motion.span>
                    )}
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Box */}
        <div className="w-full max-w-2xl rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xl md:p-8 relative">
          
          {isProvisioning ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="mb-8 rounded-full border-4 border-emerald-500/20 border-t-emerald-600 p-4"
              >
                <Wrench className="h-12 w-12 text-emerald-600 animate-pulse" />
              </motion.div>
              <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Creando tu espacio de trabajo</h2>
              <p className="mt-2 text-sm text-neutral-500 font-semibold italic max-w-md">
                {provisioningSteps[provisioningStep]}
              </p>
              <div className="mt-8 h-2 w-64 overflow-hidden rounded-full bg-slate-100 border border-neutral-200/30">
                <motion.div
                  className="h-full bg-emerald-600 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: `${(provisioningStep + 1) * 20}%` }}
                />
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                
                {/* STEP 1: EMPRESA / TALLER */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Háblanos de tu Taller</h1>
                      <p className="text-xs text-neutral-400 mt-1 font-semibold">Configura la información comercial básica de tu centro de servicios.</p>
                    </div>
                    <div className="grid gap-5 md:grid-cols-2">
                      <Field label="Nombre comercial del Taller *" error={errors.nombre} className="md:col-span-2">
                        <Input 
                          value={form.nombre} 
                          onChange={(e) => update("nombre", e.target.value)} 
                          placeholder="Ej. Taller Mecánico Auto Center RD" 
                          className="h-11 rounded-xl focus-visible:ring-emerald-500 text-sm font-medium border-neutral-200"
                        />
                      </Field>
                      <Field label="Teléfono Comercial *" error={errors.telefono}>
                        <Input 
                          value={form.telefono} 
                          onChange={(e) => update("telefono", formatPhoneRD(e.target.value))} 
                          placeholder="Ej. 809-555-0142" 
                          className="h-11 rounded-xl focus-visible:ring-emerald-500 text-sm font-medium border-neutral-200"
                        />
                      </Field>
                      <Field label="Provincia *" error={errors.provincia}>
                        <button 
                          type="button" 
                          onClick={() => setProvOpen(true)} 
                          className="flex h-11 w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-3.5 text-sm font-semibold shadow-xs hover:bg-neutral-50 active:scale-[0.99] transition-all"
                        >
                          <span className={form.provincia ? "text-neutral-900" : "text-neutral-400 font-normal"}>
                            {form.provincia || "Selecciona tu provincia..."}
                          </span>
                          <MapPin className="h-4 w-4 text-neutral-400" />
                        </button>
                      </Field>
                    </div>
                  </div>
                )}

                {/* STEP 2: BRANDS / LOGO AND SLUG */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Personaliza tu Marca</h1>
                      <p className="text-xs text-neutral-400 mt-1 font-semibold">Define la identidad y el subdominio único de tu centro de mecánica.</p>
                    </div>

                    <div className="grid gap-5">
                      {/* Brand preview box */}
                      <div className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-5 text-center relative overflow-hidden shadow-inner">
                        <div className="absolute -left-8 -top-8 h-28 w-28 rounded-full bg-emerald-600/5 blur-[24px] pointer-events-none" />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">Vista previa del taller</span>
                        
                        <div className="flex flex-col items-center gap-3 mt-3">
                          <div 
                            className="relative h-20 w-20 rounded-full border-[3px] shadow-lg bg-white overflow-hidden flex items-center justify-center transition-all duration-300"
                            style={{ borderColor: form.color_primario }}
                          >
                            {form.logo_url ? (
                              <img src={form.logo_url} alt="Logo" className="h-full w-full object-cover" />
                            ) : (
                              <Building2 className="h-10 w-10 text-neutral-300" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-black text-lg" style={{ color: form.color_primario }}>
                              {form.nombre || "Tu Taller Mecánico"}
                            </h3>
                            <div className="flex items-center justify-center gap-2 mt-2">
                              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                              <button
                                type="button"
                                onClick={() => logoInputRef.current?.click()}
                                className="h-7 px-3 rounded-full bg-white hover:bg-neutral-50 text-[10px] font-bold text-neutral-700 border border-neutral-200 shadow-sm flex items-center gap-1 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                              >
                                <Upload size={10} /> {form.logo_url ? "Cambiar logo" : "Subir logotipo"}
                              </button>
                              {form.logo_url && (
                                <button
                                  type="button"
                                  onClick={() => update("logo_url", "")}
                                  className="h-7 w-7 rounded-full bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 flex items-center justify-center transition-all hover:scale-105 active:scale-95 text-xs font-bold border border-rose-100 cursor-pointer"
                                  title="Quitar"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Subdominio slug field */}
                      <Field label="Subdominio de tu Taller *" error={errors.slug}>
                        <div className="relative">
                          <div className="flex h-11 w-full items-center rounded-xl border border-neutral-200 bg-white shadow-xs overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-all">
                            <span className="pl-3.5 pr-1 text-xs font-bold text-neutral-400 whitespace-nowrap shrink-0">servitracks.com/</span>
                            <input
                              value={form.slug}
                              onChange={(e) => {
                                update("slug", slugify(e.target.value));
                                update("slugTouched", true);
                              }}
                              placeholder="mi-taller"
                              className="flex-1 bg-transparent py-2 pr-10 text-sm font-medium text-neutral-900 placeholder:text-neutral-300 outline-none"
                              spellCheck={false}
                              autoComplete="off"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {slugChecking && (
                                <div className="h-4 w-4 rounded-full border-2 border-emerald-500/30 border-t-emerald-600 animate-spin" />
                              )}
                              {!slugChecking && slugAvailable === true && slugFormatOk && (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              )}
                              {!slugChecking && slugAvailable === false && (
                                <AlertCircle className="h-4 w-4 text-rose-500" />
                              )}
                            </div>
                          </div>
                        </div>
                        {slugAvailable === true && slugFormatOk && !errors.slug && (
                          <p className="mt-1 text-[10px] font-bold text-emerald-600">✓ Subdominio disponible</p>
                        )}
                      </Field>

                      {/* Color chooser */}
                      <div className="flex flex-col items-center justify-center mt-2">
                        <ColorField label="Color distintivo de marca" value={form.color_primario} onChange={(v) => update("color_primario", v)} />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: PLAN SELECTION */}
                {step === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Selecciona tu Plan</h1>
                      <p className="text-xs text-neutral-400 mt-1 font-semibold">Elige el plan ideal para el tamaño de tus operaciones. Prueba gratis por 7 días.</p>
                    </div>

                    {dbPlans.length === 0 ? (
                      <div className="text-center py-8 text-neutral-400 text-sm font-semibold">Cargando planes disponibles...</div>
                    ) : (
                      <div className="grid gap-3.5">
                        {dbPlans.map((p) => {
                          const isSelected = form.plan_id === p.id;
                          const empleadosLabel = p.limite_empleados >= 999999 ? "Empleados ilimitados" : `Hasta ${p.limite_empleados} empleados`;
                          const ordenesLabel = p.limite_ordenes_mes === null ? "Órdenes ilimitadas" : `${p.limite_ordenes_mes} órdenes/mes`;
                          const features = [
                            p.modulos.facturacion_fiscal ? "Facturación Electrónica (NCF)" : null,
                            p.modulos.whatsapp ? "WhatsApp Automation" : null,
                            p.modulos.multisucursal ? "Gestión Multi-sucursal" : null,
                            p.modulos.logistica ? "Logística y Repartidores" : null,
                            "Gestión de clientes y vehículos",
                          ].filter(Boolean) as string[];
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => update("plan_id", p.id)}
                              className={`text-left rounded-2xl border-2 p-4 transition-all duration-200 cursor-pointer ${
                                isSelected 
                                  ? "border-emerald-600 bg-emerald-50/20 shadow-xs" 
                                  : "border-neutral-100 bg-white hover:border-neutral-200"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-base font-black text-neutral-950">{p.nombre}</span>
                                    {p.destacado && (
                                      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[8.5px] font-black text-amber-700 uppercase tracking-wider">
                                        Recomendado
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider">
                                    {empleadosLabel} • {ordenesLabel}
                                  </div>
                                  <div className="pt-2 flex flex-wrap gap-x-3 gap-y-1">
                                    {features.map((char, idx) => (
                                      <span key={idx} className="text-[10px] text-neutral-500 font-semibold flex items-center gap-1">
                                        <CheckCircle2 size={10} className="text-emerald-500" /> {char}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex items-center gap-5">
                                  <div className="text-right">
                                    <div className="text-lg font-black text-neutral-950">{formatRD(p.precio_mensual)}</div>
                                    <div className="text-[9px] uppercase font-bold tracking-wider text-neutral-400">/ mes</div>
                                  </div>
                                  <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                                    isSelected ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200"
                                  }`}>
                                    {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 4: OWNER / ADMIN ACCOUNT */}
                {step === 4 && (
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Usuario Administrador</h1>
                      <p className="text-xs text-neutral-400 mt-1 font-semibold">Define las credenciales maestras de acceso para administrar el taller.</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Nombre completo *" error={errors.admin_nombre} className="md:col-span-2">
                        <Input 
                          value={form.admin_nombre} 
                          onChange={(e) => update("admin_nombre", e.target.value)} 
                          placeholder="Ej. José Manuel García" 
                          className="h-11 rounded-xl text-sm border-neutral-200 focus-visible:ring-emerald-500 font-medium"
                        />
                      </Field>
                      <Field label="Correo electrónico del Administrador *" error={errors.admin_email} className="md:col-span-2">
                        <Input 
                          type="email" 
                          value={form.admin_email} 
                          onChange={(e) => update("admin_email", e.target.value)} 
                          placeholder="ejemplo@taller.com" 
                          className="h-11 rounded-xl text-sm border-neutral-200 focus-visible:ring-emerald-500 font-medium"
                        />
                      </Field>
                      <Field label="Contraseña de Acceso *" error={errors.admin_password}>
                        <div className="relative">
                          <Input 
                            type={showPass ? "text" : "password"} 
                            value={form.admin_password} 
                            onChange={(e) => update("admin_password", e.target.value)} 
                            placeholder="Mínimo 8 caracteres" 
                            className="h-11 rounded-xl text-sm border-neutral-200 focus-visible:ring-emerald-500 pr-10 font-medium" 
                          />
                          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer">
                            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        <PasswordStrengthIndicator password={form.admin_password} />
                      </Field>
                      <Field label="Confirmar Contraseña *" error={errors.admin_password_confirm}>
                        <div className="relative">
                          <Input 
                            type={showConfirm ? "text" : "password"} 
                            value={form.admin_password_confirm} 
                            onChange={(e) => update("admin_password_confirm", e.target.value)} 
                            placeholder="Repite la contraseña" 
                            className="h-11 rounded-xl text-sm border-neutral-200 focus-visible:ring-emerald-500 pr-10 font-medium" 
                          />
                          <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer">
                            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </Field>
                    </div>
                  </div>
                )}

                {/* STEP 5: SUCCESS / CREATED TENANT */}
                {step === 5 && createdTenant && (
                  <SuccessCard 
                    tenant={createdTenant} 
                    adminNombre={form.admin_nombre} 
                    adminEmail={form.admin_email} 
                    planNombre={dbPlans.find(p => p.id === form.plan_id)?.nombre || "Plan seleccionado"}
                    onEnter={() => navigate(`/${createdTenant.slug}`)} 
                  />
                )}

              </motion.div>
            </AnimatePresence>
          )}

          {/* Form Actions Footer Buttons */}
          {step < 5 && !isProvisioning && (
            <div className="mt-6 flex items-center justify-between border-t border-neutral-100 pt-4">
              <Button 
                variant="outline" 
                onClick={prev} 
                disabled={step === 1}
                className="h-10 rounded-xl bg-slate-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100 font-bold px-4 active:scale-95 cursor-pointer text-xs uppercase tracking-wider"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Atrás
              </Button>
              <Button 
                onClick={next} 
                className="bg-neutral-900 text-white hover:bg-neutral-950 font-bold h-10 px-5 rounded-xl active:scale-95 cursor-pointer text-xs uppercase tracking-wider shadow-md"
              >
                {step === 4 ? "Registrar mi Taller" : "Continuar"} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          )}

        </div>
      </main>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="text-center py-5 border-t border-neutral-200/30 bg-white/20 text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
        ServiTracks Pro • Todos los derechos reservados © {new Date().getFullYear()}
      </footer>

      {/* Provincia search modal */}
      <ProvinciaModal 
        open={provOpen} 
        onClose={() => setProvOpen(false)} 
        value={form.provincia} 
        onSelect={(p) => { update("provincia", p); setProvOpen(false); }} 
      />
    </div>
  );
}

function SuccessCard({ tenant, adminNombre, adminEmail, planNombre, onEnter }: { 
  tenant: Tenant; 
  adminNombre: string; 
  adminEmail: string; 
  planNombre: string;
  onEnter: () => void 
}) {

  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative mx-auto mb-4 h-20 w-20"
      >
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-white shadow-md">
           {tenant.logo ? (
             <img src={tenant.logo} alt="Logo" className="h-full w-full object-cover" />
           ) : (
             <PartyPopper className="h-10 w-10 text-emerald-600" />
           )}
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="space-y-4"
      >
        <div>
          <h1 className="text-2xl font-black tracking-tight">¡Bienvenido, {adminNombre.split(" ")[0]}!</h1>
          <p className="text-xs text-neutral-400 font-semibold mt-1">El taller <strong className="text-neutral-800">{tenant.name}</strong> ha sido configurado correctamente.</p>
        </div>

        <div className="mx-auto max-w-sm overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left shadow-sm">
          <div className="flex items-center justify-center border-b border-neutral-200 px-4 py-2.5 bg-neutral-50">
            <div className="flex items-center gap-1.5">
              <Building2 size={13} className="text-emerald-600" />
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Credenciales del Taller</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 divide-x divide-neutral-200 border-b border-neutral-200">
            <div className="p-3.5">
              <div className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">Plan Asignado</div>
              <div className="mt-0.5 font-bold text-xs text-neutral-800">{planNombre}</div>
            </div>
            <div className="p-3.5">
              <div className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">Membresía</div>
              <div className="mt-0.5 font-bold text-xs text-emerald-600">7 Días Gratis</div>
            </div>
          </div>

          <div className="p-3.5 bg-neutral-50/20">
            <div className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">Enlace de Acceso</div>
            <div className="mt-0.5 font-mono text-[11px] font-semibold text-neutral-800">www.servitracks.com/{tenant.slug}</div>
          </div>
        </div>

        <Button 
          className="h-11 w-full max-w-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98] cursor-pointer shadow-md" 
          onClick={onEnter}
        >
          <Sparkles className="mr-2 h-4 w-4" /> Entrar a mi Taller <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </motion.div>
    </div>
  );
}

function ProvinciaModal({ open, onClose, onSelect, value }: { open: boolean; onClose: () => void; onSelect: (p: string) => void; value: string }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => PROVINCIAS_RD.filter((p) => p.toLowerCase().includes(q.toLowerCase())),
    [q]
  );
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-neutral-100 p-5 space-y-3 bg-neutral-50/50">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/10">
                  <MapPin size={16} />
                </div>
                <div>
                  <h2 className="font-black text-lg text-neutral-900 tracking-tight">Selecciona tu Provincia</h2>
                  <p className="text-xs text-neutral-400 font-semibold">Ubicación del taller dentro de R.D.</p>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar provincia..."
                  className="pl-9 h-10 rounded-xl text-sm border-neutral-200 focus-visible:ring-emerald-500"
                />
              </div>
            </div>
            <div className="max-h-[300px] overflow-y-auto p-2 custom-scrollbar">
              {filtered.length === 0 ? (
                <div className="p-6 text-center text-xs font-bold text-neutral-400 uppercase">Sin resultados</div>
              ) : (
                filtered.map((p) => {
                  const isSelected = p === value;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => onSelect(p)}
                      className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-xs font-bold transition-all cursor-pointer ${
                        isSelected ? "bg-emerald-50 text-emerald-700" : "hover:bg-neutral-50 text-neutral-700"
                      }`}
                    >
                      <span>{p}</span>
                      {isSelected && <Check className="h-4 w-4 text-emerald-600" />}
                    </button>
                  );
                })
              )}
            </div>
            <div className="flex justify-end border-t border-neutral-100 p-4 bg-neutral-50/50">
              <Button 
                variant="ghost" 
                onClick={onClose}
                className="rounded-xl font-bold text-xs uppercase tracking-wider"
              >
                Cancelar
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, error, className = "", children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs font-bold text-neutral-700 uppercase tracking-wider">{label}</Label>
      {children}
      {error && (
        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-rose-600 font-bold uppercase tracking-wide">
          <AlertCircle size={11} />
          {error}
        </div>
      )}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const presets = [
    { name: "Emerald", hex: "#059669" },
    { name: "Teal", hex: "#0D9488" },
    { name: "Teal Blue", hex: "#0F4C81" },
    { name: "Royal Blue", hex: "#2563EB" },
    { name: "Violet", hex: "#7D3CFF" },
    { name: "Amber", hex: "#D97706" },
    { name: "Slate", hex: "#475569" },
  ];

  return (
    <div className="flex flex-col items-center justify-center text-center w-full">
      <Label className="mb-2 block text-[9px] font-black text-neutral-400 uppercase tracking-widest">{label}</Label>
      
      <div className="flex flex-wrap items-center justify-center gap-2.5 p-1.5 bg-neutral-50 border border-neutral-200/80 rounded-full shadow-inner max-w-md">
        {presets.map((p) => {
          const isSelected = value.toLowerCase() === p.hex.toLowerCase();
          return (
            <button
              key={p.hex}
              type="button"
              onClick={() => onChange(p.hex)}
              className="relative h-8 w-8 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center shadow-sm cursor-pointer"
              style={{ backgroundColor: p.hex }}
              title={p.name}
            >
              {isSelected && (
                <div className="h-3.5 w-3.5 rounded-full bg-white flex items-center justify-center shadow-sm animate-scale-in">
                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.hex }} />
                </div>
              )}
            </button>
          );
        })}

        {/* Custom palette selector */}
        <div className="relative h-8 w-8 rounded-full border border-neutral-300 bg-white hover:bg-neutral-50 transition-all flex items-center justify-center shadow-sm cursor-pointer hover:scale-110 active:scale-95 group">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          />
          <Palette size={12} className="text-neutral-500 group-hover:text-emerald-600 transition-colors" />
        </div>
      </div>
    </div>
  );
}

function PasswordStrengthIndicator({ password }: { password: string }) {
  const getStrength = (p: string) => {
    let score = 0;
    if (!p) return 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  };

  const strength = getStrength(password);
  const colors = ["bg-slate-200", "bg-rose-500", "bg-amber-500", "bg-yellow-500", "bg-emerald-600"];
  const labels = ["", "Muy débil", "Débil", "Media", "Fuerte"];

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= strength ? colors[strength] : "bg-slate-100"
            }`}
          />
        ))}
      </div>
      {password && (
        <div className="flex items-center justify-between">
          <p className={`text-[9px] font-black uppercase tracking-wider ${strength <= 2 ? "text-rose-500" : "text-emerald-600"}`}>
            Seguridad: {labels[strength]}
          </p>
        </div>
      )}
    </div>
  );
}
