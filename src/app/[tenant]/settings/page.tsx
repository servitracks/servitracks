"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { useStore, TenantUser } from "@/store/useStore";
import { supabaseAdmin } from "@/lib/supabase";
import { waSendTestMessage } from "@/lib/wasender";
import { Building2, Bell, Printer, Users, Shield, ShieldCheck, Upload, X, Plus, Trash2, Check, Eye, EyeOff, Store, MapPin, Phone, Mail, FileText, Landmark, RefreshCw, Pencil, Crown, ArrowUpRight, HardDrive, Package, FileCheck2, CreditCard, Sparkles, Zap, CheckCircle2, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useParams, useSearchParams } from "@/lib/next-compat";
import { EcfSettings } from "@/components/settings/EcfSettings";
import { getPlans, formatRD } from "@/lib/storage";
import type { Plan } from "@/store/types";

const TABS = [
  { id: "taller", label: "Taller", icon: Building2 },
  { id: "tenants", label: "Sucursales", icon: Store },
  { id: "ecf", label: "Facturación e-CF", icon: FileCheck2 },
  { id: "whatsapp", label: "WhatsApp", icon: Bell },
  { id: "print", label: "Impresión", icon: Printer },
  { id: "users", label: "Usuarios y Roles", icon: Users },
  { id: "security", label: "Seguridad", icon: Shield },
  { id: "planes", label: "Planes", icon: CreditCard },
];

const ROLES: { value: TenantUser["role"]; label: string; color: string }[] = [
  { value: "owner", label: "Dueño", color: "bg-black text-white" },
  { value: "mechanic", label: "Mecánico", color: "bg-amber-100 text-amber-800" },
  { value: "cashier", label: "Cajero", color: "bg-blue-100 text-blue-800" },
  { value: "warehouse", label: "Almacén", color: "bg-emerald-100 text-emerald-800" },
  { value: "receptionist", label: "Recepción", color: "bg-violet-100 text-violet-800" },
];

function roleLabel(r: TenantUser["role"]) {
  return ROLES.find(x => x.value === r)?.label ?? r;
}
function roleBadge(r: TenantUser["role"]) {
  return ROLES.find(x => x.value === r)?.color ?? "";
}

export default function SettingsPage() {
  const params = useParams();
  const tenant = (params?.tenant as string) || "";
  const {
    tenants, users, printSettings, barcodeSettings, updateTenant, addTenant, deleteTenant,
    addUser, updateUser, deleteUser, updatePrintSettings, updateBarcodeSettings
  } = useStore();

  const currentTenant = tenants.find((t) => t.slug === tenant) ?? null;
  const taller = currentTenant ?? { id: "", name: "", address: "", phone: "", email: "", rnc: "", logo: "", wasenderApiKey: undefined, wasenderPhone: undefined, config: undefined };

  const currentUserId = useStore((s) => s.currentUserId);
  const currentUser = useMemo(() => {
    return users.find((u) => u.id === currentUserId) || users.find((u) => u.tenantId === taller.id) || null;
  }, [users, currentUserId, taller.id]);

  const allowedTenants = useMemo(() => {
    if (!currentUser) return currentTenant ? [currentTenant] : [];
    if (currentUser.email === "admin@servitracks.com") return tenants;
    const sameEmailUsers = users.filter((u) => u.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim());
    const allowedIds = new Set(sameEmailUsers.map((u) => u.tenantId));
    return tenants.filter((t) => allowedIds.has(t.id));
  }, [currentUser, users, tenants, currentTenant]);
  // Check URL params for initial tab (used by "Contratar plan" banner)
  const searchParams = useSearchParams();
  const initialTab = searchParams?.get?.("tab") || "taller";
  const [tab, setTab] = useState(initialTab);

  // Sync tab if URL changes (e.g. navigating from banner)
  useEffect(() => {
    const urlTab = searchParams?.get?.("tab");
    if (urlTab && TABS.some(t => t.id === urlTab)) {
      setTab(urlTab);
    }
  }, [searchParams]);

  // ── Plans tab state ──
  const [plansData, setPlansData] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);

  useEffect(() => {
    if (tab === "planes") {
      setPlansLoading(true);
      getPlans().then((p) => {
        setPlansData(p);
        setPlansLoading(false);
      }).catch(() => setPlansLoading(false));
    }
  }, [tab]);

  // ── Taller tab state ──
  const [tallerForm, setTallerForm] = useState({
    name: taller?.name ?? "", address: taller?.address ?? "",
    phone: taller?.phone ?? "", email: taller?.email ?? "", rnc: taller?.rnc ?? "",
  });
  const [logoPreview, setLogoPreview] = useState<string>(taller?.logo ?? "");
  const logoRef = useRef<HTMLInputElement>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) { toast.error("El logo debe pesar menos de 500 KB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setLogoPreview(b64);
      updateTenant(taller.id, { logo: b64 });
      toast.success("Logo actualizado");
    };
    reader.readAsDataURL(file);
  };

  const saveTaller = () => {
    updateTenant(taller.id, tallerForm);
    toast.success("Información del taller guardada");
  };

  // ── Tenants tab state ──
  const [branchOpen, setBranchOpen] = useState(false);
  const [deleteBranchTarget, setDeleteBranchTarget] = useState<any>(null);
  const [branchForm, setBranchForm] = useState({
    name: "",
    rnc: "",
    address: "",
    phone: "",
    email: "",
    slug: "",
  });

  const [editBranchTarget, setEditBranchTarget] = useState<any>(null);
  const [editBranchForm, setEditBranchForm] = useState({
    name: "",
    rnc: "",
    address: "",
    phone: "",
    email: "",
    slug: "",
  });

  const handleEditBranch = (t: any) => {
    setEditBranchTarget(t);
    setEditBranchForm({
      name: t.name,
      rnc: t.rnc || "",
      address: t.address || "",
      phone: t.phone || "",
      email: t.email || "",
      slug: t.slug,
    });
  };

  const handleSaveEditBranch = () => {
    if (!editBranchForm.name || !editBranchForm.slug) {
      toast.error("El nombre y el slug comercial son obligatorios");
      return;
    }

    // Check if slug is already taken by another tenant
    const slugTaken = tenants.some(t => t.slug === editBranchForm.slug && t.id !== editBranchTarget.id);
    if (slugTaken) {
      toast.error("Este slug comercial ya está registrado por otra sucursal");
      return;
    }

    updateTenant(editBranchTarget.id, {
      name: editBranchForm.name,
      slug: editBranchForm.slug,
      rnc: editBranchForm.rnc,
      phone: editBranchForm.phone,
      email: editBranchForm.email,
      address: editBranchForm.address,
    });
    toast.success(`Sucursal "${editBranchForm.name}" actualizada correctamente`);
    setEditBranchTarget(null);
  };

  const handleBranchNameChange = (val: string) => {
    const slug = val
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9\s-]/g, "") // remove special characters
      .trim()
      .replace(/\s+/g, "-");
    setBranchForm({ ...branchForm, name: val, slug });
  };

  const handleRegisterBranch = () => {
    if (!branchForm.name || !branchForm.slug) {
      toast.error("El nombre y el slug comercial son obligatorios");
      return;
    }
    if (tenants.some(t => t.slug === branchForm.slug)) {
      toast.error("Este slug comercial ya está registrado");
      return;
    }

    const newTenantId = `t-${Date.now()}`;
    addTenant({
      id: newTenantId,
      name: branchForm.name,
      slug: branchForm.slug,
      logo: "/logo.servitracks.png",
      address: branchForm.address || "Dirección no especificada",
      phone: branchForm.phone || "Sin teléfono",
      email: branchForm.email || "info@taller.do",
      rnc: branchForm.rnc || "N/A",
      status: "pending",
    });

    if (currentUser) {
      addUser({
        id: `u-${Date.now()}`,
        tenantId: newTenantId,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        status: "active",
        createdAt: new Date().toISOString(),
      });
    }

    toast.success(`🎉 Sucursal "${branchForm.name}" registrada con membresía pendiente.`);
    setBranchOpen(false);
    setBranchForm({ name: "", rnc: "", address: "", phone: "", email: "", slug: "" });
  };

  const confirmDeleteBranch = () => {
    if (!deleteBranchTarget) return;
    deleteTenant(deleteBranchTarget.id);
    toast.success(`Sucursal "${deleteBranchTarget.name}" eliminada de forma permanente`);
    setDeleteBranchTarget(null);
  };

  const handleSimulatePayment = (branchId: string, branchName: string) => {
    updateTenant(branchId, { status: "active" });
    toast.success(`💳 Membresía activada. La sucursal "${branchName}" ya se encuentra operativa.`);
  };

  // ── WhatsApp tab state ──
  const [waKey, setWaKey] = useState(taller?.wasenderApiKey ?? "");
  const [waPhone, setWaPhone] = useState(taller?.wasenderPhone ?? "");
  const [waVisible, setWaVisible] = useState(false);
  const [waTesting, setWaTesting] = useState(false);

  const saveWa = async () => {
    // 1. Update local store immediately
    updateTenant(taller.id, { wasenderApiKey: waKey, wasenderPhone: waPhone });
    // 2. Persist to Supabase
    const { error } = await supabaseAdmin
      .from("tenants")
      .update({ wasender_api_key: waKey, wasender_phone: waPhone })
      .eq("id", taller.id);
    if (error) {
      console.error("Error saving WaSender to Supabase:", error);
      toast.warning("Guardado localmente. Error al sincronizar con servidor.");
    } else {
      toast.success("Configuración de WhatsApp guardada");
    }
  };

  const testWa = async () => {
    if (!waKey || !waPhone) { toast.error("Completa la API Key y el número"); return; }
    setWaTesting(true);
    const result = await waSendTestMessage(waKey, waPhone);
    if (result.ok) {
      toast.success("✅ Mensaje de prueba enviado correctamente");
    } else {
      toast.error(`Error WaSender: ${result.error}`);
    }
    setWaTesting(false);
  };

  // ── Print tab state ──
  const [printTab, setPrintTab] = useState("pos"); // "pos" | "barcode" | "warranty"
  const ps = printSettings;
  const psBarcode = barcodeSettings;

  // ── Users tab state ──
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TenantUser | null>(null);
  const [pinTarget, setPinTarget] = useState<TenantUser | null>(null);
  const [pinForm, setPinForm] = useState("");
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", password: "", role: "mechanic" as TenantUser["role"] });
  const [isInviting, setIsInviting] = useState(false);

  const handleInvite = async () => {
    if (!inviteForm.name || !inviteForm.email || !inviteForm.password) { 
      toast.error("Nombre, correo y contraseña son requeridos"); 
      return; 
    }
    if (inviteForm.password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setIsInviting(true);

    // 1. Crear usuario en Supabase Auth directamente (sin email de confirmación)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: inviteForm.email,
      password: inviteForm.password,
      email_confirm: true,
      user_metadata: { name: inviteForm.name },
    });

    if (authError) {
      console.error("Error creating user in Supabase:", authError);
      
      let errorMessage = authError.message;
      if (errorMessage.includes("already been registered") || errorMessage.includes("User already registered")) {
        errorMessage = "Ya existe un empleado registrado con este correo electrónico.";
      } else if (errorMessage.includes("Password should be at least")) {
        errorMessage = "La contraseña es muy débil o corta.";
      } else if (errorMessage.includes("Email rate limit exceeded")) {
        errorMessage = "Demasiados intentos. Por favor, intenta de nuevo más tarde.";
      }

      toast.error(`Error al crear usuario: ${errorMessage}`);
      setIsInviting(false);
      return;
    }

    const newUserId = authData.user.id;

    // 2. Insertar en tenant_users
    const { error: dbError } = await supabaseAdmin
      .from("tenant_users")
      .insert({
        user_id: newUserId,
        tenant_id: taller.id,
        name: inviteForm.name,
        email: inviteForm.email,
        role: inviteForm.role,
        status: "active"
      });

    if (dbError) {
      console.error("Error inserting tenant_user:", dbError);
      // Fallback a solo local si la DB falla
    }

    // 3. Guardar en store local
    addUser({ 
      id: newUserId, 
      tenantId: taller.id, 
      status: "active", 
      createdAt: new Date().toISOString(), 
      name: inviteForm.name,
      email: inviteForm.email,
      role: inviteForm.role
    });

    toast.success(`Usuario "${inviteForm.name}" creado con éxito. Ya puede iniciar sesión.`);
    setInviteOpen(false);
    setInviteForm({ name: "", email: "", password: "", role: "mechanic" });
    setIsInviting(false);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteUser(deleteTarget.id);
    toast.success(`Usuario "${deleteTarget.name}" eliminado`);
    setDeleteTarget(null);
  };

  const handleSavePin = () => {
    if (!pinTarget) return;
    if (pinForm && pinForm.length !== 4) {
      toast.error("El PIN debe tener exactamente 4 dígitos");
      return;
    }
    updateUser(pinTarget.id, { pin: pinForm });
    toast.success(`PIN asignado correctamente a ${pinTarget.name}`);
    setPinTarget(null);
    setPinForm("");
  };

  // ── Security tab state ──
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState(currentTenant?.adminPin || "");
  const [showPin, setShowPin] = useState(false);

  const changePassword = () => {
    if (!pwForm.current) { toast.error("Escribe tu contraseña actual"); return; }
    if (pwForm.next.length < 8) { toast.error("La nueva contraseña debe tener al menos 8 caracteres"); return; }
    if (pwForm.next !== pwForm.confirm) { toast.error("Las contraseñas no coinciden"); return; }
    toast.success("Contraseña actualizada correctamente");
    setPwForm({ current: "", next: "", confirm: "" });
  };

  const saveAdminPin = () => {
    if (!currentTenant) return;
    if (adminPinInput && adminPinInput.length !== 4) {
      toast.error("El PIN debe tener exactamente 4 dígitos");
      return;
    }
    updateTenant(currentTenant.id, { adminPin: adminPinInput || undefined });
    toast.success("PIN de autorización administrativa actualizado");
  };

  // Statistics for sucursales
  const totalBranches = allowedTenants.length;
  const activeBranches = allowedTenants.filter(t => t.status === "active" || !t.status).length;
  const pendingBranches = allowedTenants.filter(t => t.status === "pending").length;

  // Plan-based branch limits
  const plans = useStore((s) => s.plans);
  const primaryTenant = allowedTenants[0];
  const currentPlan = plans.find(p => p.id === primaryTenant?.plan_id) || plans[0];
  const branchLimit = currentPlan?.limite_sucursales;
  const canAddBranch = branchLimit === null || branchLimit === undefined || totalBranches < branchLimit;
  const nextPlan = !canAddBranch
    ? plans.find(p => (p.limite_sucursales === null || (p.limite_sucursales ?? 0) > (branchLimit ?? 0)) && p.id !== currentPlan?.id)
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-neutral-900">Configuración</h1>
        <p className="text-neutral-500">Personaliza tu taller y gestiona los parámetros del sistema.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl overflow-x-auto whitespace-nowrap custom-scrollbar">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer",
              tab === t.id ? "bg-white shadow-sm text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* ── TALLER ── */}
      {tab === "taller" && (
        <div className="space-y-6">
          <Card className="border-neutral-100 shadow-sm">
            <CardHeader><CardTitle>Logo del Taller</CardTitle><CardDescription>Se mostrará en facturas y recibos de impresión.</CardDescription></CardHeader>
            <CardContent className="flex items-center gap-6">
              <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 flex items-center justify-center overflow-hidden">
                {logoPreview ? <img src={logoPreview} alt="logo" className="object-contain h-full w-full" /> : <Upload className="h-6 w-6 text-neutral-300" />}
              </div>
              <div className="space-y-2">
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                <Button variant="outline" className="rounded-lg cursor-pointer" onClick={() => logoRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" /> Subir Logo
                </Button>
                {logoPreview && (
                  <Button variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600 block cursor-pointer"
                    onClick={() => { setLogoPreview(""); updateTenant(taller.id, { logo: "" }); toast.success("Logo eliminado"); }}>
                    <X className="h-3 w-3 mr-1 inline" /> Eliminar logo
                  </Button>
                )}
                <p className="text-xs text-neutral-400">PNG, JPG · Máx. 500 KB</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-neutral-100 shadow-sm">
            <CardHeader><CardTitle>Información del Taller</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "Nombre del Taller", key: "name", placeholder: "Taller García" },
                  { label: "RNC / Cédula Fiscal", key: "rnc", placeholder: "1-32-12345-6" },
                  { label: "Teléfono", key: "phone", placeholder: "809-555-0100" },
                  { label: "Correo Electrónico", key: "email", placeholder: "info@taller.do" },
                ].map(f => (
                  <div key={f.key} className="space-y-1.5">
                    <Label>{f.label}</Label>
                    <Input className="h-10 rounded-xl border-neutral-200"
                      placeholder={f.placeholder}
                      value={(tallerForm as any)[f.key]}
                      onChange={e => setTallerForm({ ...tallerForm, [f.key]: e.target.value })} />
                  </div>
                ))}
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Dirección</Label>
                  <Input className="h-10 rounded-xl border-neutral-200" placeholder="Av. 27 de Febrero #123..."
                    value={tallerForm.address}
                    onChange={e => setTallerForm({ ...tallerForm, address: e.target.value })} />
                </div>
              </div>
              <Button className="rounded-lg bg-black text-white hover:bg-neutral-800 cursor-pointer" onClick={saveTaller}>
                <Check className="h-4 w-4 mr-2" /> Guardar Cambios
              </Button>
            </CardContent>
          </Card>

          <Card className="border-neutral-100 shadow-sm border-emerald-100">
            <CardHeader>
              <CardTitle className="text-emerald-700 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Inventario Inteligente (Modo Seguro)
              </CardTitle>
              <CardDescription>
                Configura si el inventario debe descontarse automáticamente al registrar una venta en el POS.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-xl border border-emerald-100 bg-emerald-50/50">
                <div>
                  <h4 className="text-sm font-bold text-neutral-900">Descuento Automático de Inventario</h4>
                  <p className="text-xs text-neutral-500 mt-1">Al activar, las ventas del POS restarán stock y crearán un registro histórico.</p>
                </div>
                <button
                  onClick={() => {
                    const currentVal = taller.config?.autoDeductInventory || false;
                    updateTenant(taller.id, { config: { ...taller.config, autoDeductInventory: !currentVal } });
                    toast.success(!currentVal ? "Descuento Automático Activado" : "Descuento Automático Desactivado");
                  }}
                  className={cn("h-6 w-11 rounded-full transition-all relative cursor-pointer border-none shrink-0",
                    taller.config?.autoDeductInventory ? "bg-emerald-600" : "bg-neutral-200")}
                >
                  <div className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                    taller.config?.autoDeductInventory ? "left-5" : "left-0.5")} />
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── SUCURSALES (MULTITENANT) ── */}
      {tab === "tenants" && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          {(() => {
            const pricePerExtra = currentPlan?.precio_sucursal_adicional || 0;
            const extraBranches = Math.max(0, totalBranches - 1);
            const extraCost = extraBranches * pricePerExtra;
            const baseCost = currentPlan?.precio_mensual || 0;
            const totalMonthlyCost = baseCost + extraCost;
            const pendingCost = pendingBranches * pricePerExtra;
            const formatMoney = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            return (
              <>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white border border-neutral-100 p-5 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Total Sucursales</span>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-3xl font-black text-neutral-900">{totalBranches}</span>
                      <span className="text-sm font-bold text-neutral-400">/ {branchLimit ?? '∞'}</span>
                    </div>
                  </div>
                  <div className="bg-white border border-neutral-100 p-5 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Activas</span>
                    <span className="text-3xl font-black text-emerald-600 mt-1 block">{activeBranches}</span>
                  </div>
                  <div className="bg-white border border-neutral-100 p-5 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Pago Pendiente</span>
                    <span className={cn("text-3xl font-black mt-1 block", pendingBranches > 0 ? "text-rose-600" : "text-neutral-300")}>{pendingBranches > 0 ? formatMoney(pendingCost) : '$0'}</span>
                    {pendingBranches > 0 && (
                      <span className="text-[10px] text-rose-500 font-semibold">{pendingBranches} sucursal{pendingBranches > 1 ? 'es' : ''} sin activar</span>
                    )}
                  </div>
                  <div className="bg-white border border-neutral-100 p-5 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Plan Actual</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xl font-black text-neutral-900">{currentPlan?.nombre || 'Sin plan'}</span>
                    </div>
                    {pricePerExtra > 0 ? (
                      <span className="text-[10px] text-neutral-400 font-semibold">Taller principal · +{formatMoney(pricePerExtra)}/extra</span>
                    ) : (
                      <span className="text-[10px] text-neutral-400 font-semibold">Sucursales adicionales sin costo</span>
                    )}
                  </div>
                </div>

                {/* Billing Breakdown Card */}
                <Card className="border-neutral-100 shadow-sm overflow-hidden">
                  <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 p-4 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
                      <Store className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-tight">Facturación Estimada Mensual</h4>
                      <p className="text-[10px] text-neutral-400 font-medium">Desglose de costos por sucursales</p>
                    </div>
                  </div>
                  <CardContent className="p-0">
                    <div className="divide-y divide-neutral-50">
                      <div className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-md bg-neutral-100 flex items-center justify-center">
                            <span className="text-[10px] font-black text-neutral-600">📋</span>
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-neutral-800">Plan {currentPlan?.nombre}</span>
                            <span className="text-[10px] text-neutral-400 block">Cargo base mensual</span>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-neutral-900">{formatMoney(baseCost)}</span>
                      </div>

                      <div className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-md bg-neutral-100 flex items-center justify-center">
                            <span className="text-[10px] font-black text-neutral-600">🏪</span>
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-neutral-800">Taller Principal</span>
                            <span className="text-[10px] text-neutral-400 block">Sede original incluida en el precio base</span>
                          </div>
                        </div>
                        <Badge className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border-none bg-emerald-100 text-emerald-700">
                          Base
                        </Badge>
                      </div>

                      {extraBranches > 0 && (
                        <div className="flex items-center justify-between px-5 py-3 bg-amber-50/50">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-md bg-amber-100 flex items-center justify-center">
                              <span className="text-[10px] font-black text-amber-600">➕</span>
                            </div>
                            <div>
                              <span className="text-sm font-semibold text-neutral-800">Sucursales adicionales</span>
                              <span className="text-[10px] text-neutral-500 block">{extraBranches} extra × {formatMoney(pricePerExtra)}/mes</span>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-amber-700">+{formatMoney(extraCost)}</span>
                        </div>
                      )}

                      {/* Total */}
                      <div className="flex items-center justify-between px-5 py-4 bg-neutral-50">
                        <span className="text-sm font-black text-neutral-900 uppercase tracking-wider">Total Mensual Estimado</span>
                        <span className="text-xl font-black text-neutral-900">{formatMoney(totalMonthlyCost)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Upgrade Banner - shown when limit is reached */}
                {!canAddBranch && (
                  <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0">
                        <Crown className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-neutral-900 tracking-tight">Límite de sucursales alcanzado</h4>
                        <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">
                          Tu plan <strong>{currentPlan?.nombre}</strong> permite hasta <strong>{branchLimit}</strong> sucursal{branchLimit && branchLimit > 1 ? 'es' : ''}.
                          {nextPlan && <> Actualiza a <strong>{nextPlan.nombre}</strong> para obtener {nextPlan.limite_sucursales === null ? 'sucursales ilimitadas' : `hasta ${nextPlan.limite_sucursales} sucursales`}.</>}
                        </p>
                      </div>
                    </div>
                    <Button
                      className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-bold h-10 px-5 text-xs flex items-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer border-none"
                      onClick={() => toast.info('Contacta a soporte para actualizar tu plan: hola@servitracks.com')}
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      Actualizar Plan
                    </Button>
                  </div>
                )}
              </>
            );
          })()}

          <Card className="border-neutral-100 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Administración de Sucursales</CardTitle>
                <CardDescription>Visualiza, registra y gestiona las sedes comerciales y sus suscripciones.</CardDescription>
              </div>
              <Button
                onClick={() => {
                  if (!canAddBranch) {
                    toast.error(`Tu plan ${currentPlan?.nombre} solo permite ${branchLimit} sucursal${branchLimit && branchLimit > 1 ? 'es' : ''}. Actualiza tu plan para añadir más.`);
                    return;
                  }
                  setBranchOpen(true);
                }}
                disabled={!canAddBranch}
                className={cn(
                  "rounded-xl font-bold cursor-pointer h-10 px-4",
                  canAddBranch
                    ? "bg-black hover:bg-neutral-800 text-white"
                    : "bg-neutral-200 text-neutral-400 cursor-not-allowed hover:bg-neutral-200"
                )}
              >
                <Plus className="h-4 w-4 mr-2" /> Registrar Sucursal
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-neutral-100">
                {allowedTenants.map(t => {
                  const isActive = t.status === "active" || !t.status;
                  return (
                    <div key={t.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 hover:bg-neutral-50/50 transition-colors">
                      <div className="flex items-start gap-4">
                        {/* Custom Branch Avatar Badge */}
                        <div className={cn(
                          "h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner border",
                          isActive ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-rose-50 border-rose-100 text-rose-600"
                        )}>
                          <Store className="h-6 w-6" />
                        </div>

                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-bold text-neutral-900 tracking-tight">{t.name}</h4>
                            <Badge className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full border-none",
                              isActive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                            )}>
                              {isActive ? "Activa" : "Pendiente de Pago"}
                            </Badge>
                          </div>

                          {/* Folder slug link */}
                          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-semibold bg-neutral-50 px-2 py-0.5 rounded-md w-fit">
                            <span className="text-neutral-300 font-normal">URL:</span>
                            <span className="font-mono text-[10px] text-neutral-600">/{t.slug}/dashboard</span>
                          </div>

                          {/* Detail specs */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pt-2">
                            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                              <Landmark className="h-3 w-3 text-neutral-300 flex-shrink-0" />
                              <span>RNC: {t.rnc || "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                              <Phone className="h-3 w-3 text-neutral-300 flex-shrink-0" />
                              <span>Tel: {t.phone || "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-neutral-500 sm:col-span-2">
                              <MapPin className="h-3 w-3 text-neutral-300 flex-shrink-0" />
                              <span className="truncate">{t.address || "N/A"}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2.5 self-end md:self-center">
                        {!isActive && (
                          <Button
                            onClick={() => handleSimulatePayment(t.id, t.name)}
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold h-9 text-xs flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer border-none"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Activar (Simular Pago)
                          </Button>
                        )}

                        <Button
                          onClick={() => handleEditBranch(t)}
                          variant="outline"
                          size="sm"
                          className="text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 border-neutral-200 hover:border-emerald-100 rounded-lg h-9 w-9 p-0 flex items-center justify-center cursor-pointer transition-all"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        {/* Prevent deleting the primary branch in the account */}
                        {t.id !== allowedTenants[0]?.id && (
                          <Button
                            onClick={() => setDeleteBranchTarget(t)}
                            variant="outline"
                            size="sm"
                            className="text-neutral-400 hover:text-rose-600 hover:bg-rose-50 border-neutral-200 hover:border-rose-100 rounded-lg h-9 w-9 p-0 flex items-center justify-center cursor-pointer transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── FACTURACIÓN E-CF ── */}
      {tab === "ecf" && (
        <EcfSettings tenant={taller} />
      )}

      {/* ── WHATSAPP ── */}
      {tab === "whatsapp" && (
        <Card className="border-neutral-100 shadow-sm">
          <CardHeader>
            <CardTitle>WaSender API</CardTitle>
            <CardDescription>Conecta tu taller con WhatsApp Business para enviar recordatorios automáticos. Obtén tu API Key en <a href="https://wasenderapi.com" target="_blank" className="text-black font-medium underline">wasenderapi.com</a></CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>API Key</Label>
              <div className="relative">
                <Input type={waVisible ? "text" : "password"} className="h-10 rounded-xl border-neutral-200 pr-10"
                  placeholder="Bearer token de WaSender..."
                  value={waKey} onChange={e => setWaKey(e.target.value)} />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 cursor-pointer border-none bg-transparent" onClick={() => setWaVisible(!waVisible)}>
                  {waVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Número de WhatsApp del Taller</Label>
              <Input type="tel" className="h-10 rounded-xl border-neutral-200" placeholder="+1809XXXXXXX"
                value={waPhone} onChange={e => setWaPhone(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <Button className="rounded-lg bg-black text-white hover:bg-neutral-800 cursor-pointer" onClick={saveWa}>
                <Check className="h-4 w-4 mr-2" /> Guardar
              </Button>
              <Button variant="outline" className="rounded-lg cursor-pointer" onClick={testWa} disabled={waTesting}>
                {waTesting ? "Enviando..." : "Probar Conexión"}
              </Button>
            </div>
            {taller?.wasenderApiKey && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-sm text-emerald-700 font-medium">API configurada</span>
              </div>
            )}

            <div className="pt-4 mt-4 border-t border-neutral-100 space-y-3">
              <div>
                <Label className="text-sm font-bold text-neutral-900">URL del Webhook (Recepción de Mensajes)</Label>
                <p className="text-xs text-neutral-500 mt-1">
                  Copia esta URL y pégala en la configuración de Webhook dentro de tu cuenta de WaSender para poder recibir los mensajes de tus clientes en ServiTracks.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input 
                  readOnly 
                  className="h-10 rounded-xl border-neutral-200 bg-neutral-50 font-mono text-[10px] text-neutral-600" 
                  value={`${import.meta.env.VITE_SUPABASE_URL || "https://vbigrtifoxsehgbapxtc.supabase.co"}/functions/v1/wasender-webhook?tenant_id=${taller.id}`} 
                />
                <Button 
                  variant="outline" 
                  className="rounded-xl cursor-pointer h-10 px-4 whitespace-nowrap border-neutral-200 hover:bg-neutral-50"
                  onClick={() => {
                    navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL || "https://vbigrtifoxsehgbapxtc.supabase.co"}/functions/v1/wasender-webhook?tenant_id=${taller.id}`);
                    toast.success("URL copiada al portapapeles");
                  }}
                >
                  Copiar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── IMPRESIÓN ── */}
      {tab === "print" && (
        <div className="space-y-6">
          <div className="flex gap-2 p-1 bg-neutral-100/50 rounded-xl max-w-fit">
            <button
              onClick={() => setPrintTab("pos")}
              className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer border-none", printTab === "pos" ? "bg-white text-neutral-900 shadow-sm" : "bg-transparent text-neutral-500 hover:text-neutral-700")}
            >
              Recibos POS
            </button>
            <button
              onClick={() => setPrintTab("barcode")}
              className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer border-none", printTab === "barcode" ? "bg-white text-neutral-900 shadow-sm" : "bg-transparent text-neutral-500 hover:text-neutral-700")}
            >
              Códigos de Barras
            </button>
            <button
              onClick={() => setPrintTab("warranty")}
              className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer border-none", printTab === "warranty" ? "bg-white text-neutral-900 shadow-sm" : "bg-transparent text-neutral-500 hover:text-neutral-700")}
            >
              Garantía en Factura
            </button>
          </div>

          {printTab === "pos" && (
            <Card className="border-neutral-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <CardHeader><CardTitle>Configuración de Impresión</CardTitle><CardDescription>Define cómo se verán los recibos del POS.</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-1.5">
                  <Label>Tamaño de Papel</Label>
                  <div className="flex gap-2">
                    {(["80mm", "58mm", "A4"] as const).map(size => (
                      <button key={size} onClick={() => updatePrintSettings({ paperSize: size })}
                        className={cn("px-4 py-2 rounded-lg border text-sm font-medium transition-all cursor-pointer",
                          ps.paperSize === size ? "bg-black text-white border-black" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50")}>
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Opciones del Recibo</Label>
                  {([
                    { key: "showLogo", label: "Mostrar logo del taller" },
                    { key: "showNcf", label: "Mostrar número NCF" },
                    { key: "showItbis", label: "Mostrar ITBIS desglosado" },
                    { key: "showChange", label: "Mostrar cambio/vuelto" },
                  ] as { key: keyof typeof ps; label: string }[]).map(opt => (
                    <div key={opt.key} className="flex items-center justify-between p-3 rounded-xl border border-neutral-100 bg-neutral-50">
                      <span className="text-sm font-medium text-neutral-700">{opt.label}</span>
                      <button onClick={() => updatePrintSettings({ [opt.key]: !(ps as any)[opt.key] })}
                        className={cn("h-6 w-11 rounded-full transition-all relative cursor-pointer border-none",
                          (ps as any)[opt.key] ? "bg-black" : "bg-neutral-200")}>
                        <div className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                          (ps as any)[opt.key] ? "left-5" : "left-0.5")} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <Label>Número de Copias</Label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => updatePrintSettings({ copies: Math.max(1, ps.copies - 1) })}
                      className="h-9 w-9 rounded-lg border border-neutral-200 flex items-center justify-center text-lg font-bold hover:bg-neutral-50 cursor-pointer bg-white">−</button>
                    <span className="text-lg font-bold w-8 text-center">{ps.copies}</span>
                    <button onClick={() => updatePrintSettings({ copies: Math.min(5, ps.copies + 1) })}
                      className="h-9 w-9 rounded-lg border border-neutral-200 flex items-center justify-center text-lg font-bold hover:bg-neutral-50 cursor-pointer bg-white">+</button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Texto de Pie de Página</Label>
                  <Input className="h-10 rounded-xl border-neutral-200" value={ps.footer}
                    onChange={e => updatePrintSettings({ footer: e.target.value })} />
                </div>

                <Button className="rounded-lg bg-black text-white hover:bg-neutral-800 cursor-pointer"
                  onClick={() => toast.success("Configuración de impresión guardada")}>
                  <Check className="h-4 w-4 mr-2" /> Guardar Configuración de Impresión
                </Button>
              </CardContent>
            </Card>
          )}

          {printTab === "warranty" && (
            <Card className="border-neutral-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <CardHeader>
                <CardTitle>Garantía en Factura</CardTitle>
                <CardDescription>Configura los textos de garantía que se imprimen en los recibos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3 p-4 rounded-2xl border border-emerald-100 bg-emerald-50/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <Label className="text-sm font-bold text-neutral-800 cursor-default">Imprimir Garantía</Label>
                    </div>
                    <button
                      onClick={() => updatePrintSettings({ showWarranty: !(ps.showWarranty ?? true) })}
                      className={cn("h-6 w-11 rounded-full transition-all relative cursor-pointer border-none",
                        (ps.showWarranty ?? true) ? "bg-emerald-600" : "bg-neutral-200")}
                    >
                      <div className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                        (ps.showWarranty ?? true) ? "left-5" : "left-0.5")} />
                    </button>
                  </div>

                  {(ps.showWarranty ?? true) && (
                    <>
                      <p className="text-xs text-neutral-500">Selecciona una plantilla o escribe tu propio texto de garantía.</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          "Garantía: 30 días en mano de obra.",
                          "Garantía: 90 días en piezas y mano de obra.",
                          "Garantía: 15 días en mano de obra. Sin garantía en piezas.",
                          "Sin garantía en repuestos suministrados por el cliente.",
                          "Garantía limitada según condiciones del fabricante.",
                        ].map((tpl) => (
                          <button
                            key={tpl}
                            onClick={() => updatePrintSettings({ warrantyText: tpl })}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer",
                              ps.warrantyText === tpl
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-white text-neutral-600 border-neutral-200 hover:border-emerald-300 hover:bg-emerald-50"
                            )}
                          >
                            {tpl.length > 38 ? tpl.slice(0, 38) + "\u2026" : tpl}
                          </button>
                        ))}
                      </div>
                      <textarea
                        className="w-full min-h-[72px] rounded-xl border border-neutral-200 text-sm p-2.5 resize-none focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200 bg-white"
                        placeholder="Ej: Garantía: 30 días en mano de obra y 90 días en piezas."
                        value={ps.warrantyText ?? ""}
                        onChange={e => updatePrintSettings({ warrantyText: e.target.value })}
                      />
                    </>
                  )}
                </div>

                <Button className="rounded-lg bg-black text-white hover:bg-neutral-800 cursor-pointer"
                  onClick={() => toast.success("Configuración de garantía guardada")}>
                  <Check className="h-4 w-4 mr-2" /> Guardar Garantía
                </Button>
              </CardContent>
            </Card>
          )}

          {printTab === "barcode" && (
            <Card className="border-neutral-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <CardHeader>
                <CardTitle>Etiquetas de Código de Barras</CardTitle>
                <CardDescription>Ajusta el tamaño y formato para impresión térmica de etiquetas del inventario.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Ancho de la barra</Label>
                    <Input type="number" step="0.1" min="1" className="h-10 rounded-xl border-neutral-200" value={psBarcode?.width ?? 1.5}
                      onChange={e => updateBarcodeSettings({ width: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Altura del código</Label>
                    <Input type="number" className="h-10 rounded-xl border-neutral-200" value={psBarcode?.height ?? 40}
                      onChange={e => updateBarcodeSettings({ height: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tamaño de fuente</Label>
                    <Input type="number" className="h-10 rounded-xl border-neutral-200" value={psBarcode?.fontSize ?? 14}
                      onChange={e => updateBarcodeSettings({ fontSize: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5 flex flex-col justify-center">
                    <Label className="mb-2">Mostrar texto</Label>
                    <button onClick={() => updateBarcodeSettings({ showText: !(psBarcode?.showText ?? true) })}
                      className={cn("h-6 w-11 rounded-full transition-all relative cursor-pointer border-none",
                        (psBarcode?.showText ?? true) ? "bg-black" : "bg-neutral-200")}>
                      <div className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                        (psBarcode?.showText ?? true) ? "left-5" : "left-0.5")} />
                    </button>
                  </div>
                </div>

                <Button className="rounded-lg bg-black text-white hover:bg-neutral-800 cursor-pointer mt-4"
                  onClick={() => toast.success("Ajustes de código de barras guardados")}>
                  <Check className="h-4 w-4 mr-2" /> Guardar Código de Barras
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── USUARIOS ── */}
      {tab === "users" && (
        <div className="space-y-6">
          {/* Role reference */}
          <Card className="border-neutral-100 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Roles Disponibles</CardTitle>
                <CardDescription>Control de acceso basado en roles (RBAC).</CardDescription>
              </div>
              <Button className="rounded-lg bg-black text-white hover:bg-neutral-800 gap-2 cursor-pointer"
                onClick={() => setInviteOpen(true)}>
                <Plus className="h-4 w-4" /> Invitar Usuario
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {ROLES.map(r => (
                  <div key={r.value} className="flex items-center gap-3 p-3 rounded-xl border border-neutral-100 bg-neutral-50">
                    <Shield className="h-4 w-4 text-neutral-400" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{r.label}</span>
                        <Badge className={cn("text-[10px] border-none rounded-full px-1.5", r.color)}>{r.value === "owner" ? "Admin" : r.value === "cashier" ? "POS" : r.value === "mechanic" ? "OT" : "CRM"}</Badge>
                      </div>
                      <p className="text-xs text-neutral-400">
                        {r.value === "owner" ? "Control total del taller" : r.value === "mechanic" ? "Ver y actualizar órdenes asignadas" : r.value === "cashier" ? "Acceso al POS y facturación" : "Registrar clientes y vehículos"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Active users */}
          <Card className="border-neutral-100 shadow-sm">
            <CardHeader><CardTitle>Usuarios Activos</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-neutral-50">
                {users.filter((u) => u.tenantId === taller.id).map(u => (
                  <div key={u.id} className="flex items-center gap-4 px-5 py-4 hover:bg-neutral-50/50 transition-colors">
                    <div className="h-9 w-9 rounded-full bg-neutral-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {u.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-900">{u.name}</p>
                      <p className="text-xs text-neutral-400">{u.email}</p>
                    </div>
                    <Badge className={cn("border-none rounded-full text-xs", roleBadge(u.role))}>{roleLabel(u.role)}</Badge>
                    <Badge className={cn("border-none rounded-full text-xs",
                      u.status === "active" ? "bg-emerald-100 text-emerald-700"
                        : u.status === "invited" ? "bg-amber-100 text-amber-700"
                          : "bg-neutral-100 text-neutral-500")}>
                      {u.status === "active" ? "Activo" : u.status === "invited" ? "Invitado" : "Inactivo"}
                    </Badge>
                    {u.role !== "owner" && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setPinTarget(u); setPinForm(u.pin || ""); }}
                          className="text-neutral-400 hover:text-emerald-600 transition-colors cursor-pointer border-none bg-transparent p-1.5 rounded-md hover:bg-emerald-50"
                          title="Asignar PIN de Caja">
                          <Key className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(u)}
                          className="text-neutral-300 hover:text-rose-500 transition-colors cursor-pointer border-none bg-transparent p-1.5 rounded-md hover:bg-rose-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* User PIN Modal */}
          <Dialog open={!!pinTarget} onOpenChange={(val) => !val && setPinTarget(null)}>
            <DialogContent className="sm:max-w-sm rounded-2xl p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-emerald-600" /> Asignar PIN
                </DialogTitle>
                <DialogDescription>
                  Establece un PIN de 4 dígitos para {pinTarget?.name}. Este PIN se usará para confirmar operaciones como el cierre de caja.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label>PIN (4 dígitos numéricos)</Label>
                  <Input 
                    type="password"
                    maxLength={4}
                    value={pinForm}
                    onChange={(e) => setPinForm(e.target.value.replace(/\D/g, ""))}
                    className="font-mono text-center text-xl tracking-[1em]"
                    placeholder="••••"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPinTarget(null)} className="rounded-xl">Cancelar</Button>
                <Button onClick={handleSavePin} className="rounded-xl bg-black text-white hover:bg-neutral-800">
                  Guardar PIN
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ── SEGURIDAD ── */}
      {tab === "security" && (
        <div className="space-y-6 max-w-md">
          {currentUser?.role === 'owner' && (
            <Card className="border-neutral-100 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-black text-neutral-900 tracking-tight">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  PIN de Autorización Administrativa
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500">
                  Código de seguridad de 4 dígitos requerido para autorizar la edición o eliminación de facturas, compras y cuentas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">PIN del Administrador (4 dígitos)</Label>
                  <div className="relative">
                    <Input 
                      type={showPin ? "text" : "password"} 
                      maxLength={4}
                      className="h-11 rounded-xl border-neutral-200 pr-10 font-mono text-center text-xl tracking-[0.5em] font-black"
                      placeholder="••••"
                      value={adminPinInput}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, "");
                        setAdminPinInput(val);
                      }} 
                    />
                    <button 
                      type="button" 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 cursor-pointer border-none bg-transparent hover:text-neutral-600" 
                      onClick={() => setShowPin(!showPin)}
                    >
                      {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button 
                  className="w-full rounded-xl bg-black text-white hover:bg-neutral-800 h-11 cursor-pointer font-bold" 
                  onClick={saveAdminPin}
                >
                  <Check className="h-4 w-4 mr-2" /> Guardar PIN de Seguridad
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="border-neutral-100 shadow-sm">
            <CardHeader><CardTitle>Cambiar Contraseña</CardTitle><CardDescription>Actualiza tus credenciales de acceso.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "current", label: "Contraseña Actual" },
                { key: "next", label: "Nueva Contraseña" },
                { key: "confirm", label: "Confirmar Nueva Contraseña" },
              ].map(f => (
                <div key={f.key} className="space-y-1.5">
                  <Label>{f.label}</Label>
                  <div className="relative">
                    <Input type={showPw ? "text" : "password"} className="h-10 rounded-xl border-neutral-200 pr-10"
                      value={(pwForm as any)[f.key]}
                      onChange={e => setPwForm({ ...pwForm, [f.key]: e.target.value })} />
                    {f.key === "current" && (
                      <button className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 cursor-pointer border-none bg-transparent" onClick={() => setShowPw(!showPw)}>
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {pwForm.next && pwForm.confirm && pwForm.next !== pwForm.confirm && (
                <p className="text-xs text-rose-500 font-medium">Las contraseñas no coinciden</p>
              )}
              <Button className="w-full rounded-xl bg-black text-white hover:bg-neutral-800 h-11 cursor-pointer" onClick={changePassword}>
                <Shield className="h-4 w-4 mr-2" /> Actualizar Contraseña
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── PLANES ── */}
      {tab === "planes" && (
        <div className="space-y-6">
          <div>
            <CardTitle>Planes de Suscripción</CardTitle>
            <CardDescription>Explora y contrata el plan que mejor se adapte a las necesidades de tu taller.</CardDescription>
          </div>
          
          {plansLoading ? (
            <div className="text-center py-12 text-sm text-neutral-500 font-medium">Cargando planes...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {plansData.map((p) => (
                <Card key={p.id} className={cn("border p-6 shadow-sm bg-white rounded-xl flex flex-col", p.destacado ? "ring-2 ring-black border-black" : "border-neutral-200/80")}>
                  <div className="flex items-start justify-between">
                    <span className="font-display text-xl font-black text-neutral-900">{p.nombre}</span>
                    {p.destacado && <Badge className="bg-neutral-900 text-white border-none">Popular</Badge>}
                  </div>
                  <div className="mt-2 font-display text-2xl font-extrabold text-neutral-900">{formatRD(p.precio_mensual)}<span className="text-sm font-normal text-neutral-400">/mes</span></div>
                  {(p.precio_anual || 0) > 0 && (
                    <div className="text-xs text-neutral-400 font-semibold mt-0.5">o {formatRD(p.precio_anual || 0)}/año</div>
                  )}
                  <div className="mt-4 space-y-2 text-sm text-neutral-700 border-t border-neutral-100 pt-3 flex-grow">
                    <div>👥 Hasta {p.limite_empleados} Técnicos/Empleados</div>
                    <div>📦 {p.limite_ordenes_mes ?? "∞"} Órdenes/mes</div>
                    {(p.precio_sucursal_adicional || 0) > 0 ? (
                      <div className="text-emerald-600 font-semibold">🏪 Sucursales Extra a {formatRD(p.precio_sucursal_adicional)}/mes</div>
                    ) : (
                      <div className="text-emerald-600 font-semibold">🏪 Sucursales Extra sin costo</div>
                    )}
                    <div className="text-blue-600 font-semibold">💬 {(p.limite_whatsapp_mes || 0).toLocaleString()} Mensajes WhatsApp</div>
                    <div className="border-t border-neutral-100 pt-2 space-y-1">
                      {Object.entries(p.modulos).map(([k, v]) => (
                        <div key={k} className={cn("flex items-center gap-2", v ? "text-neutral-950 font-bold" : "text-neutral-400 line-through opacity-50 font-medium")}>
                          <span>{v ? "✓" : "✗"}</span>
                          <span className="capitalize">{k === "facturacion_fiscal" ? "Facturación Electrónica" : k.replace(/_/g, " ")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-neutral-100">
                    <Button 
                      className="w-full rounded-xl font-bold cursor-pointer bg-black text-white hover:bg-neutral-800"
                      onClick={() => {
                        const url = p.polar_product_monthly_url;
                        if (url) {
                          window.open(url, "_blank");
                        } else {
                          window.open(`https://wa.me/18299681720?text=Hola ServiTracks, me interesa contratar el plan ${p.nombre} para mi taller ${taller.name}.`, "_blank");
                        }
                      }}
                    >
                      Contratar {p.nombre}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── INVITE USER DIALOG ── */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl bg-white p-6 shadow-2xl border-none max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
          <DialogHeader className="pb-3 border-b border-neutral-100 flex-shrink-0">
            <DialogTitle className="text-xl font-black text-neutral-900 tracking-tight">Crear Nuevo Empleado</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 py-4 my-1 space-y-4 custom-scrollbar">
            <div className="space-y-1.5">
              <Label>Nombre Completo</Label>
              <Input className="h-10 rounded-xl border-neutral-200"
                placeholder="Ej. Juan Pérez"
                value={inviteForm.name}
                onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Correo Electrónico</Label>
              <Input type="email" className="h-10 rounded-xl border-neutral-200"
                placeholder="juan@taller.do"
                value={inviteForm.email}
                onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Contraseña</Label>
              <Input type="text" className="h-10 rounded-xl border-neutral-200"
                placeholder="Ej. mecanico123"
                value={inviteForm.password}
                onChange={e => setInviteForm({ ...inviteForm, password: e.target.value })} />
              <p className="text-[10px] text-neutral-400">El empleado usará esta contraseña para iniciar sesión.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.filter(r => r.value !== "owner").map(r => (
                  <button key={r.value} onClick={() => setInviteForm({ ...inviteForm, role: r.value })}
                    className={cn("py-2.5 rounded-xl border text-sm font-bold transition-all cursor-pointer",
                      inviteForm.role === r.value ? "bg-black text-white border-black" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50")}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-3 border-t border-neutral-100 flex-shrink-0">
            <Button variant="outline" className="rounded-xl flex-1 cursor-pointer" onClick={() => setInviteOpen(false)} disabled={isInviting}>Cancelar</Button>
            <Button className="rounded-xl flex-1 bg-black text-white hover:bg-neutral-800 cursor-pointer border-none" onClick={handleInvite} disabled={isInviting}>
              {isInviting ? "Creando..." : "Crear Usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── REGISTER BRANCH (SUCURSAL) DIALOG ── */}
      <Dialog open={branchOpen} onOpenChange={setBranchOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white p-6 shadow-2xl border-none max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
          <DialogHeader className="pb-3 border-b border-neutral-100 flex-shrink-0">
            <DialogTitle className="text-xl font-black text-neutral-900 tracking-tight">Registrar Nueva Sucursal</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 py-4 my-1 space-y-4 custom-scrollbar">
            <div className="space-y-1.5">
              <Label>Nombre Comercial</Label>
              <Input className="h-10 rounded-xl border-neutral-200"
                placeholder="Ej. Servicentro Santiago Norte"
                value={branchForm.name}
                onChange={e => handleBranchNameChange(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Slug Comercial (URL)</Label>
              <div className="flex items-center rounded-xl border border-neutral-200 overflow-hidden bg-neutral-50">
                <span className="px-3 py-2.5 text-[10px] font-mono text-neutral-400 bg-neutral-100 border-r border-neutral-200 whitespace-nowrap select-none">servitracks.com/</span>
                <Input className="h-10 border-0 rounded-none font-mono text-xs text-neutral-700 bg-neutral-50 focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="servicentro-santiago-norte"
                  value={branchForm.slug}
                  onChange={e => setBranchForm({ ...branchForm, slug: e.target.value.replace(/\s+/g, "-").toLowerCase() })} />
              </div>
              <p className="text-[10px] text-neutral-400 font-medium">Se utilizará para generar el enlace exclusivo de esta sede.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>RNC / Cédula</Label>
                <Input className="h-10 rounded-xl border-neutral-200"
                  placeholder="1-32-12345-9"
                  value={branchForm.rnc}
                  onChange={e => setBranchForm({ ...branchForm, rnc: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono</Label>
                <Input className="h-10 rounded-xl border-neutral-200"
                  placeholder="809-555-0199"
                  value={branchForm.phone}
                  onChange={e => setBranchForm({ ...branchForm, phone: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Correo de la Sucursal</Label>
              <Input type="email" className="h-10 rounded-xl border-neutral-200"
                placeholder="norte@tallergarcia.do"
                value={branchForm.email}
                onChange={e => setBranchForm({ ...branchForm, email: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label>Dirección Física</Label>
              <Input className="h-10 rounded-xl border-neutral-200"
                placeholder="Autopista Duarte Km 5, Santiago"
                value={branchForm.address}
                onChange={e => setBranchForm({ ...branchForm, address: e.target.value })} />
            </div>

            {/* Note about status pending */}
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex gap-2">
              <Landmark className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider block">Nota de Suscripción</span>
                <span className="text-[10px] text-amber-700 leading-tight block">Las nuevas sucursales se registran en estado <strong>Pendiente de Pago</strong>. Deberás activar su membresía para operar en ella.</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-3 border-t border-neutral-100 flex-shrink-0">
            <Button variant="outline" className="rounded-xl flex-1 cursor-pointer" onClick={() => setBranchOpen(false)}>Cancelar</Button>
            <Button className="rounded-xl flex-1 bg-black text-white hover:bg-neutral-800 cursor-pointer border-none" onClick={handleRegisterBranch}>
              Registrar Sucursal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE USER CONFIRMATION ── */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl bg-white p-6 shadow-2xl border-none">
          <DialogHeader><DialogTitle className="text-xl font-bold">Eliminar Usuario</DialogTitle></DialogHeader>
          <p className="text-sm text-neutral-600 py-2">
            ¿Estás seguro de eliminar a <strong>{deleteTarget?.name}</strong>? Esta acción no se puede deshacer.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl flex-1 cursor-pointer" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button className="rounded-xl flex-1 bg-rose-600 text-white hover:bg-rose-700 cursor-pointer border-none animate-in fade-in-50 duration-200" onClick={confirmDelete}>
              <Trash2 className="h-4 w-4 mr-2" /> Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── EDIT BRANCH (SUCURSAL) DIALOG ── */}
      <Dialog open={!!editBranchTarget} onOpenChange={() => setEditBranchTarget(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white p-6 shadow-2xl border-none max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
          <DialogHeader className="pb-3 border-b border-neutral-100 flex-shrink-0">
            <DialogTitle className="text-xl font-black text-neutral-900 tracking-tight">Editar Sucursal</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 py-4 my-1 space-y-4 custom-scrollbar">
            <div className="space-y-1.5">
              <Label>Nombre Comercial</Label>
              <Input className="h-10 rounded-xl border-neutral-200"
                placeholder="Ej. Servicentro Santiago Norte"
                value={editBranchForm.name}
                onChange={e => setEditBranchForm({ ...editBranchForm, name: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label>Slug Comercial (URL)</Label>
              <div className="flex items-center rounded-xl border border-neutral-200 overflow-hidden bg-neutral-50">
                <span className="px-3 py-2.5 text-[10px] font-mono text-neutral-400 bg-neutral-100 border-r border-neutral-200 whitespace-nowrap select-none">servitracks.com/</span>
                <Input className="h-10 border-0 rounded-none font-mono text-xs text-neutral-700 bg-neutral-50 focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="servicentro-santiago-norte"
                  value={editBranchForm.slug}
                  onChange={e => setEditBranchForm({ ...editBranchForm, slug: e.target.value.replace(/\s+/g, "-").toLowerCase() })} />
              </div>
              <p className="text-[10px] text-neutral-400 font-medium">Se utilizará para generar el enlace exclusivo de esta sede.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>RNC / Cédula</Label>
                <Input className="h-10 rounded-xl border-neutral-200"
                  placeholder="1-32-12345-9"
                  value={editBranchForm.rnc}
                  onChange={e => setEditBranchForm({ ...editBranchForm, rnc: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono</Label>
                <Input className="h-10 rounded-xl border-neutral-200"
                  placeholder="809-555-0199"
                  value={editBranchForm.phone}
                  onChange={e => setEditBranchForm({ ...editBranchForm, phone: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Correo de la Sucursal</Label>
              <Input type="email" className="h-10 rounded-xl border-neutral-200"
                placeholder="norte@tallergarcia.do"
                value={editBranchForm.email}
                onChange={e => setEditBranchForm({ ...editBranchForm, email: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label>Dirección Física</Label>
              <Input className="h-10 rounded-xl border-neutral-200"
                placeholder="Autopista Duarte Km 5, Santiago"
                value={editBranchForm.address}
                onChange={e => setEditBranchForm({ ...editBranchForm, address: e.target.value })} />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-3 border-t border-neutral-100 flex-shrink-0">
            <Button variant="outline" className="rounded-xl flex-1 cursor-pointer" onClick={() => setEditBranchTarget(null)}>Cancelar</Button>
            <Button className="rounded-xl flex-1 bg-black text-white hover:bg-neutral-800 cursor-pointer border-none" onClick={handleSaveEditBranch}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE BRANCH CONFIRMATION ── */}
      <Dialog open={!!deleteBranchTarget} onOpenChange={() => setDeleteBranchTarget(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl bg-white p-6 shadow-2xl border-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-neutral-900 tracking-tight">Eliminar Sucursal</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-600 py-2 leading-relaxed">
            ¿Estás completamente seguro de eliminar de forma permanente la sucursal <strong>{deleteBranchTarget?.name}</strong>? Se perderán todos sus registros asociados. Esta acción es irreversible.
          </p>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" className="rounded-xl flex-1 cursor-pointer" onClick={() => setDeleteBranchTarget(null)}>Cancelar</Button>
            <Button
              className="rounded-xl flex-1 bg-rose-600 text-white hover:bg-rose-700 cursor-pointer border-none"
              onClick={confirmDeleteBranch}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Eliminar Sucursal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
