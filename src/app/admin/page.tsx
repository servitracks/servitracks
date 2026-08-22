"use client";

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Building2, Shield, TrendingUp, Users, Trash2, ExternalLink, Plus, Pencil, 
  Package, LogOut, MoreHorizontal, Key, CreditCard, Search, Filter, Download,
  Sparkles, CheckCircle2, AlertTriangle, Clock, RefreshCw, MessageCircle,
  Megaphone, BarChart3, Activity, Send, Check, Eye, HelpCircle, Radio,
  ShieldCheck, Layers, Store, DollarSign
} from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  getTenants, 
  deleteTenant, 
  getPlans, 
  getOrdenes, 
  formatRD, 
  setActiveTenant,
  setSession,
  logout,
  savePlan, 
  deletePlan,
  updateTenantAdmin,
  updateTenantPlan,
  updateTenantStatus,
  updateTenantModulosOverride,
  updateTenantTrialHasta,
  getGlobalConfig,
  saveGlobalConfig,
  ADMIN_EMAILS,
  type Plan, 
  type PlanId, 
  type Tenant, 
  type GlobalConfig, 
  type BankDetails
} from "@/lib/storage";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatPolarUrl } from "@/lib/plans";
import { supabaseAdmin } from "@/lib/supabase";

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <img src="/logo.servitracks.png" alt="ServiTracks" className="h-16 w-auto object-contain" />
    </div>
  );
}

function PlanBadge({ id }: { id: PlanId }) {
  const configs: Record<string, { label: string; className: string }> = {
    basico: { label: "Básico", className: "bg-blue-50 text-blue-700 border-blue-200" },
    pro: { label: "Pro", className: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold" },
    enterprise: { label: "Enterprise", className: "bg-amber-50 text-amber-800 border-amber-300 font-bold" },
    premium: { label: "Premium", className: "bg-purple-50 text-purple-800 border-purple-300 font-bold" },
  };
  const config = configs[id?.toLowerCase()] || { label: id, className: "bg-neutral-50 text-neutral-600 border-neutral-200" };
  return (
    <Badge variant="outline" className={`px-2.5 py-0.5 rounded-full uppercase text-[9.5px] font-extrabold tracking-wider ${config.className}`}>
      {config.label}
    </Badge>
  );
}

export default function AdminPage() {
  const user = useRequireAuth();
  const navigate = useNavigate();
  
  // Validar que sea super admin e inicializar título
  useEffect(() => {
    document.title = "Super Admin — ServiTracks";
    
    if (user && user.empleado.id !== '__loading__') {
      if (!ADMIN_EMAILS.includes(user.empleado.email.toLowerCase())) {
        toast.error("No tienes permisos para acceder al panel central");
        navigate('/login');
      }
    }
  }, [user, navigate]);

  const [tick, setTick] = useState(0);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [totalOrdenes, setTotalOrdenes] = useState(0);
  const [ordenesByTenant, setOrdenesByTenant] = useState<Record<string, { count: number; total: number }>>({});
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>({ 
    requirePlanOnRegistration: true, 
    trialDays: 14, 
    defaultPlanId: 'basico',
    systemAnnouncement: { message: "", active: false, type: "info" }
  });
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [openPlan, setOpenPlan] = useState(false);
  const [openBank, setOpenBank] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");

  // Edit Tenant Modal
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>("basico");
  const [newStatus, setNewStatus] = useState<any>("ACTIVO");
  const [overrides, setOverrides] = useState<any>({});

  // Quick New Tenant Modal
  const [openNewTenantModal, setOpenNewTenantModal] = useState(false);
  const [newTenantForm, setNewTenantForm] = useState({
    name: "", slug: "", email: "", phone: "", adminName: "", adminPassword: "", planId: "pro"
  });
  const [isCreatingTenant, setIsCreatingTenant] = useState(false);

  // Announcement state
  const [announcementForm, setAnnouncementForm] = useState({
    message: "",
    active: false,
    type: "info" as "info" | "warning" | "success"
  });

  useEffect(() => {
    async function load() {
      setIsRefreshing(true);
      const [t, p, cfg] = await Promise.all([getTenants(), getPlans(), getGlobalConfig()]);
      setTenants(t);
      setPlans(p);
      setGlobalConfig(cfg);
      if (cfg?.systemAnnouncement) {
        setAnnouncementForm({
          message: cfg.systemAnnouncement.message || "",
          active: Boolean(cfg.systemAnnouncement.active),
          type: (cfg.systemAnnouncement.type as any) || "info"
        });
      }
      const ordsMap: Record<string, { count: number; total: number }> = {};
      let grandTotal = 0;
      for (const tenant of t) {
        const ords = await getOrdenes(tenant.id);
        const ordsArr = Array.isArray(ords) ? ords : [];
        const ingr = ordsArr.reduce((s: number, o: any) => s + (o.total || 0), 0);
        ordsMap[tenant.id] = { count: ordsArr.length, total: ingr };
        grandTotal += ordsArr.length;
      }
      setOrdenesByTenant(ordsMap);
      setTotalOrdenes(grandTotal);
      setIsRefreshing(false);
    }
    load();
  }, [tick]);

  const ingresos = useMemo(() => {
    return tenants.reduce((s, t) => s + (plans.find((p) => p.id === t.plan_id)?.precio_mensual || 0), 0);
  }, [tenants, plans]);

  const totalFacturadoRed = useMemo(() => {
    return Object.values(ordenesByTenant).reduce((acc, curr) => acc + (curr.total || 0), 0);
  }, [ordenesByTenant]);

  // Filtered tenants list
  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      // Search term filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = t.name.toLowerCase().includes(q);
        const matchSlug = t.slug.toLowerCase().includes(q);
        const matchEmail = (t.email || "").toLowerCase().includes(q);
        const matchPhone = (t.phone || "").toLowerCase().includes(q);
        const matchRnc = (t.rnc || "").toLowerCase().includes(q);
        if (!matchName && !matchSlug && !matchEmail && !matchPhone && !matchRnc) return false;
      }

      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "ACTIVO" && t.estado !== "ACTIVO" && t.status !== "active") return false;
        if (statusFilter === "TRIAL" && t.estado !== "TRIAL") return false;
        if (statusFilter === "SUSPENDIDO" && t.estado !== "SUSPENDIDO" && t.estado !== "CANCELADO") return false;
      }

      // Plan filter
      if (planFilter !== "all") {
        if ((t.plan_id || "basico").toLowerCase() !== planFilter.toLowerCase()) return false;
      }

      return true;
    });
  }, [tenants, searchQuery, statusFilter, planFilter]);

  async function handleUpdateAdmin() {
    if (!editingTenant) return;
    try {
      await updateTenantAdmin(editingTenant.id, newEmail, newPassword || undefined);
      await updateTenantPlan(editingTenant.id, selectedPlanId);
      await updateTenantStatus(editingTenant.id, newStatus);
      await updateTenantModulosOverride(editingTenant.id, overrides);
      toast.success(`Información del taller "${editingTenant.name}" actualizada con éxito`);
      setOpenEditModal(false);
      setTick(t => t + 1);
    } catch (error) {
      console.error("Error updating tenant:", error);
      toast.error("Error al actualizar el taller");
    }
  }

  // Extend Trial shortcut (+7 days)
  async function handleExtendTrial(t: Tenant, days = 7) {
    try {
      const currentExpiry = t.trial_hasta ? new Date(t.trial_hasta).getTime() : Date.now();
      const baseTime = Math.max(Date.now(), currentExpiry);
      const newDate = new Date(baseTime + days * 24 * 60 * 60 * 1000).toISOString();
      
      await updateTenantTrialHasta(t.id, newDate);
      await updateTenantStatus(t.id, "TRIAL");
      toast.success(`Prueba de "${t.name}" extendida por +${days} días (Hasta: ${new Date(newDate).toLocaleDateString("es-DO")})`);
      setTick(t => t + 1);
    } catch (err: any) {
      toast.error("Error al extender periodo de prueba");
    }
  }

  // Quick Create Tenant from Admin
  async function handleCreateQuickTenant() {
    if (!newTenantForm.name || !newTenantForm.slug || !newTenantForm.email || !newTenantForm.adminPassword) {
      toast.error("Completa los campos obligatorios");
      return;
    }

    setIsCreatingTenant(true);
    try {
      // 1. Crear usuario en Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: newTenantForm.email.trim(),
        password: newTenantForm.adminPassword,
        email_confirm: true,
        user_metadata: { name: newTenantForm.adminName || newTenantForm.name }
      });

      if (authError) throw authError;

      // 2. Insertar Tenant
      const newTenantId = crypto.randomUUID();
      const trialEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      const { data: tenantData, error: tenantError } = await supabaseAdmin
        .from("tenants")
        .insert({
          id: newTenantId,
          name: newTenantForm.name.trim(),
          slug: newTenantForm.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-"),
          email: newTenantForm.email.trim(),
          phone: newTenantForm.phone.trim() || undefined,
          plan_id: newTenantForm.planId,
          estado: "ACTIVO",
          status: "active",
          trial_hasta: trialEndDate,
          config: {}
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      // 3. Vincular Usuario
      await supabaseAdmin.from("tenant_users").insert({
        id: crypto.randomUUID(),
        tenant_id: newTenantId,
        user_id: authData.user.id,
        name: newTenantForm.adminName || "Administrador",
        email: newTenantForm.email.trim(),
        role: "owner",
        status: "active"
      });

      toast.success(`Taller "${newTenantForm.name}" creado con éxito`);
      setOpenNewTenantModal(false);
      setNewTenantForm({ name: "", slug: "", email: "", phone: "", adminName: "", adminPassword: "", planId: "pro" });
      setTick(t => t + 1);
    } catch (err: any) {
      console.error("Error creating tenant:", err);
      toast.error("Error al crear taller: " + (err.message || ""));
    } finally {
      setIsCreatingTenant(false);
    }
  }

  // Save Announcement
  async function handleSaveAnnouncement() {
    try {
      const updatedConfig: GlobalConfig = {
        ...globalConfig,
        systemAnnouncement: announcementForm
      };
      await saveGlobalConfig(updatedConfig);
      setGlobalConfig(updatedConfig);
      toast.success(announcementForm.active ? "Anuncio global publicado en todos los talleres" : "Anuncio global desactivado");
    } catch (e) {
      toast.error("Error al guardar anuncio");
    }
  }

  // Export to CSV
  function handleExportCSV() {
    const headers = ["ID", "Nombre Taller", "Slug", "Email", "Telefono", "Plan", "Estado", "Dias Restantes Trial", "Total Ordenes", "Facturado (RD$)"];
    const rows = filteredTenants.map(t => {
      const ords = ordenesByTenant[t.id] || { count: 0, total: 0 };
      const trialDays = t.trial_hasta ? Math.max(0, Math.ceil((new Date(t.trial_hasta).getTime() - Date.now()) / 86400000)) : 0;
      return [
        `"${t.id}"`,
        `"${t.name.replace(/"/g, '""')}"`,
        `"${t.slug}"`,
        `"${t.email || ''}"`,
        `"${t.phone || ''}"`,
        `"${t.plan_id || 'basico'}"`,
        `"${t.estado || 'ACTIVO'}"`,
        t.estado === "TRIAL" ? trialDays : "N/A",
        ords.count,
        ords.total
      ].join(",");
    });
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `servitracks_talleres_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Listado de talleres exportado a CSV");
  }

  async function handleLogout() {
    await logout();
    window.location.assign("/login");
  }

  return (
    <div className="min-h-screen bg-neutral-50/60 pb-20">
      {/* ── TOPBAR HEALTH STATUS & BRANDING ── */}
      <header className="border-b border-neutral-200/90 bg-white sticky top-0 z-40 shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-8 py-2.5">
          <div className="flex items-center gap-4">
            <Logo />
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-neutral-200">
              <Badge variant="outline" className="border-neutral-300 bg-neutral-100 text-neutral-800 font-black px-2.5 py-0.5 text-xs">
                <Shield className="mr-1 h-3.5 w-3.5 text-neutral-900" /> Super Admin
              </Badge>
            </div>
          </div>

          {/* Realtime Live Services Health Indicator */}
          <div className="hidden md:flex items-center gap-4 text-xs font-semibold text-neutral-600 bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200/80">
            <div className="flex items-center gap-1.5" title="Supabase Database & Realtime activo">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Supabase DB</span>
            </div>
            <span className="text-neutral-300">|</span>
            <div className="flex items-center gap-1.5" title="Integración con DGII e-CF activa">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>e-CF DGII</span>
            </div>
            <span className="text-neutral-300">|</span>
            <div className="flex items-center gap-1.5" title="Evolution API WhatsApp lista">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>WhatsApp API</span>
            </div>
            <span className="text-neutral-300">|</span>
            <div className="flex items-center gap-1.5" title="Pasarela de pagos Polar.sh">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Polar Payments</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setTick(t => t + 1)} 
              disabled={isRefreshing}
              className="h-9 px-3 rounded-xl border-neutral-200 text-neutral-700 hover:bg-neutral-100 font-bold shadow-2xs cursor-pointer gap-1.5 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-emerald-600 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refrescar</span>
            </Button>
            <Button 
              size="sm" 
              variant="destructive" 
              onClick={handleLogout} 
              className="h-9 px-4 rounded-xl font-bold shadow-xs hover:opacity-90 transition-all cursor-pointer text-xs"
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" /> Cerrar sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-8 py-8 space-y-8">
        {/* ── HEADER EXECUTIVE TITLE ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight">
              Panel Central ServiTracks
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-neutral-500 font-medium">
              Supervisión global de talleres mecánicos, membresías SaaS, métricas financieras y salud del ecosistema.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              onClick={() => setOpenNewTenantModal(true)} 
              className="bg-neutral-950 hover:bg-black text-white rounded-2xl shadow-sm h-11 px-5 font-bold cursor-pointer gap-2 text-xs"
            >
              <Plus className="h-4 w-4" /> Alta Rápida de Taller
            </Button>
          </div>
        </div>

        {/* ── KPIS OVERVIEW ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="border border-neutral-200/80 p-5 shadow-xs rounded-2xl bg-white space-y-2">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[10.5px] uppercase tracking-wider font-extrabold">Talleres Registrados</span>
              <Building2 className="h-4 w-4 text-neutral-500" />
            </div>
            <div className="font-heading text-3xl font-black text-neutral-900">{tenants.length}</div>
            <div className="text-[11px] text-neutral-400 font-semibold">
              Red total de clientes SaaS
            </div>
          </Card>

          <Card className="border border-neutral-200/80 p-5 shadow-xs rounded-2xl bg-white space-y-2">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[10.5px] uppercase tracking-wider font-extrabold">Talleres Activos</span>
              <Users className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="font-heading text-3xl font-black text-emerald-600">
              {tenants.filter(t => t.estado === "ACTIVO" || t.status === "active").length}
            </div>
            <div className="text-[11px] text-neutral-400 font-semibold">
              {tenants.filter(t => t.estado === "TRIAL").length} en periodo de prueba
            </div>
          </Card>

          <Card className="border border-neutral-950 p-5 shadow-md rounded-2xl bg-neutral-950 text-white space-y-2">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[10.5px] uppercase tracking-wider font-extrabold text-neutral-300">MRR Recurrente Estimado</span>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="font-heading text-3xl font-black text-white">{formatRD(ingresos)}</div>
            <div className="text-[11px] text-neutral-400 font-medium">
              Facturación mensual recurrente
            </div>
          </Card>

          <Card className="border border-neutral-200/80 p-5 shadow-xs rounded-2xl bg-white space-y-2">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[10.5px] uppercase tracking-wider font-extrabold">Órdenes en la Red</span>
              <Package className="h-4 w-4 text-neutral-500" />
            </div>
            <div className="font-heading text-3xl font-black text-neutral-900">{totalOrdenes.toLocaleString()}</div>
            <div className="text-[11px] text-neutral-400 font-semibold">
              Órdenes de trabajo acumuladas
            </div>
          </Card>

          <Card className="border border-neutral-200/80 p-5 shadow-xs rounded-2xl bg-white space-y-2">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[10.5px] uppercase tracking-wider font-extrabold">Facturado por Talleres</span>
              <DollarSign className="h-4 w-4 text-neutral-500" />
            </div>
            <div className="font-heading text-2xl font-black text-neutral-900">{formatRD(totalFacturadoRed)}</div>
            <div className="text-[11px] text-neutral-400 font-semibold">
              Volumen transaccionado
            </div>
          </Card>
        </div>

        {/* ── MAIN CONTENT TABS ── */}
        <Tabs defaultValue="tenants" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200/80 pb-3">
            <TabsList className="bg-neutral-200/60 p-1 rounded-2xl gap-1">
              <TabsTrigger value="tenants" className="rounded-xl font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-xs px-4 py-2">
                <Store className="h-3.5 w-3.5 mr-1.5" /> Talleres ({tenants.length})
              </TabsTrigger>
              <TabsTrigger value="metrics" className="rounded-xl font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-xs px-4 py-2">
                <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Analíticas & BI
              </TabsTrigger>
              <TabsTrigger value="plans" className="rounded-xl font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-xs px-4 py-2">
                <Layers className="h-3.5 w-3.5 mr-1.5" /> Planes SaaS ({plans.length})
              </TabsTrigger>
              <TabsTrigger value="announcements" className="rounded-xl font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-xs px-4 py-2">
                <Megaphone className="h-3.5 w-3.5 mr-1.5" /> Anuncios Globales
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ════════════════════════════════════════════════════════════════════════════════ */}
          {/* TAB 1: TALLERES                                                                  */}
          {/* ════════════════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="tenants" className="space-y-4 outline-none">
            {/* Search and Filters Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs">
              <div className="flex flex-1 items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input 
                    placeholder="Buscar por nombre, slug, email, teléfono o RNC..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 rounded-xl border-neutral-200 text-xs"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Status selector */}
                <Select value={statusFilter} onValueChange={(v: string | null) => v && setStatusFilter(v)}>
                  <SelectTrigger className="w-[140px] h-10 rounded-xl border-neutral-200 text-xs font-semibold">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-md bg-white border border-neutral-200 text-xs">
                    <SelectItem value="all">Todos los Estados</SelectItem>
                    <SelectItem value="ACTIVO">🟢 Activos</SelectItem>
                    <SelectItem value="TRIAL">⏳ En Prueba</SelectItem>
                    <SelectItem value="SUSPENDIDO">⚠️ Suspendidos</SelectItem>
                  </SelectContent>
                </Select>

                {/* Plan selector */}
                <Select value={planFilter} onValueChange={(v: string | null) => v && setPlanFilter(v)}>
                  <SelectTrigger className="w-[130px] h-10 rounded-xl border-neutral-200 text-xs font-semibold">
                    <SelectValue placeholder="Plan" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-md bg-white border border-neutral-200 text-xs">
                    <SelectItem value="all">Todos los Planes</SelectItem>
                    <SelectItem value="basico">Básico</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExportCSV}
                  className="rounded-xl border-neutral-200 text-neutral-700 hover:bg-neutral-50 h-10 px-4 font-bold text-xs cursor-pointer gap-1.5"
                >
                  <Download className="h-3.5 w-3.5 text-neutral-500" /> Exportar CSV
                </Button>
              </div>
            </div>

            {/* Tenants Table */}
            <Card className="overflow-hidden border border-neutral-200/80 bg-white shadow-xs rounded-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-neutral-50/80 text-[11px] uppercase tracking-wider text-neutral-500 border-b border-neutral-100 font-extrabold">
                    <tr>
                      <th className="px-6 py-4">Taller / Identificador</th>
                      <th className="px-6 py-4 text-center">Plan Asignado</th>
                      <th className="px-6 py-4 text-center">Estado & Trial</th>
                      <th className="px-6 py-4 text-center">Órdenes</th>
                      <th className="px-6 py-4 text-right">Facturación</th>
                      <th className="px-6 py-4 text-center">Acciones Rápidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredTenants.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-neutral-400 font-medium text-xs">
                          No se encontraron talleres que coincidan con los filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      filteredTenants.map((t) => {
                        const tenantOrds = ordenesByTenant[t.id] || { count: 0, total: 0 };
                        const isTrial = t.estado === "TRIAL";
                        const trialDaysRemaining = t.trial_hasta 
                          ? Math.ceil((new Date(t.trial_hasta).getTime() - Date.now()) / 86400000) 
                          : 0;

                        return (
                          <tr key={t.id} className="hover:bg-neutral-50/60 transition-colors group">
                            {/* Taller / Brand */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3.5">
                                <div 
                                  className="h-10 w-10 rounded-xl shadow-xs border border-neutral-200 flex items-center justify-center flex-shrink-0 text-white font-bold text-xs" 
                                  style={{ background: `linear-gradient(135deg, ${t.color_primario || '#000000'}, ${t.color_secundario || '#4b5563'})` }}
                                >
                                  {t.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-neutral-900 flex items-center gap-2">
                                    <span className="truncate">{t.name}</span>
                                    <span className="text-[10px] font-mono text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">/{t.slug}</span>
                                  </div>
                                  <div className="text-xs text-neutral-400 flex items-center gap-2 mt-0.5">
                                    <span>{t.email || "Sin email"}</span>
                                    {t.phone && <span>• {t.phone}</span>}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Plan Badge */}
                            <td className="px-6 py-4 text-center">
                              <PlanBadge id={t.plan_id || "basico"} />
                            </td>

                            {/* Status & Trial Countdown */}
                            <td className="px-6 py-4 text-center">
                              <div className="inline-flex flex-col items-center gap-1">
                                <Badge variant="outline" className={`font-black text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                  t.estado === "ACTIVO" 
                                    ? "text-emerald-800 border-emerald-300 bg-emerald-50" 
                                    : isTrial 
                                      ? "text-blue-800 border-blue-300 bg-blue-50" 
                                      : "text-rose-800 border-rose-300 bg-rose-50"
                                }`}>
                                  {isTrial ? "En Prueba (Trial)" : t.estado || "ACTIVO"}
                                </Badge>
                                
                                {isTrial && (
                                  <span className={`text-[10px] font-bold ${trialDaysRemaining <= 3 ? "text-rose-600" : "text-neutral-400"}`}>
                                    {trialDaysRemaining > 0 ? `⏳ Quedan ${trialDaysRemaining} días` : "⚠️ Prueba Vencida"}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Órdenes */}
                            <td className="px-6 py-4 text-center font-bold text-neutral-800">
                              {tenantOrds.count}
                            </td>

                            {/* Ingresos */}
                            <td className="px-6 py-4 text-right font-black text-neutral-900">
                              {formatRD(tenantOrds.total)}
                            </td>

                            {/* Quick Actions */}
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Direct Impersonate / Visit */}
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  title="Entrar como administrador al taller (Ghost Login)"
                                  className="h-8 w-8 p-0 rounded-lg hover:bg-neutral-100 cursor-pointer text-neutral-600"
                                  onClick={() => {
                                    setSession({ empleado_id: 'admin', tenant_id: t.id, iniciado_en: new Date().toISOString() });
                                    setActiveTenant(t.slug);
                                    toast.success(`Entrando a ${t.name}...`);
                                    setTimeout(() => window.location.assign(`/${t.slug}`), 300);
                                  }}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>

                                {/* Direct WhatsApp */}
                                {t.phone && (
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    title="Contactar al dueño por WhatsApp"
                                    className="h-8 w-8 p-0 rounded-lg hover:bg-emerald-50 text-emerald-600 cursor-pointer"
                                    onClick={() => {
                                      const cleanPhone = t.phone?.replace(/\D/g, "");
                                      window.open(`https://wa.me/${cleanPhone}?text=Hola ${t.name}, le contactamos desde el equipo de ServiTracks.`, "_blank");
                                    }}
                                  >
                                    <MessageCircle className="h-4 w-4" />
                                  </Button>
                                )}

                                {/* Extend Trial Shortcut */}
                                {isTrial && (
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    title="Extender prueba +7 días"
                                    className="h-8 px-2 rounded-lg hover:bg-blue-50 text-blue-600 text-[10px] font-extrabold cursor-pointer"
                                    onClick={() => handleExtendTrial(t, 7)}
                                  >
                                    +7d
                                  </Button>
                                )}

                                {/* More Options Dropdown */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger render={<Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-neutral-100 cursor-pointer" />}>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-xl bg-white border border-neutral-200 p-1.5">
                                    <DropdownMenuGroup>
                                      <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-neutral-400 px-2 py-1 font-bold">Gestión de Taller</DropdownMenuLabel>
                                      <DropdownMenuItem 
                                        className="rounded-xl gap-2 cursor-pointer py-2 hover:bg-neutral-100 text-xs font-semibold"
                                        onClick={() => {
                                          setEditingTenant(t);
                                          setNewEmail(t.email || "");
                                          setNewPassword("");
                                          setSelectedPlanId(t.plan_id || "basico");
                                          setNewStatus(t.estado || "ACTIVO");
                                          setOverrides(t.config?.modulos_override || {});
                                          setOpenEditModal(true);
                                        }}
                                      >
                                        <Pencil className="h-3.5 w-3.5 text-neutral-600" /> Editar datos y módulos
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        className="rounded-xl gap-2 cursor-pointer py-2 hover:bg-blue-50 text-blue-700 text-xs font-semibold"
                                        onClick={() => handleExtendTrial(t, 14)}
                                      >
                                        <Clock className="h-3.5 w-3.5 text-blue-600" /> Extender prueba +14 días
                                      </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator className="bg-neutral-100 my-1" />
                                    
                                    <AlertDialog>
                                      <AlertDialogTrigger render={<button className="relative flex w-full cursor-pointer select-none items-center rounded-xl gap-2 px-2 py-2 text-xs outline-none transition-colors hover:bg-rose-50 hover:text-rose-600 text-rose-600 font-bold" />}>
                                        <Trash2 className="h-3.5 w-3.5" /> Eliminar taller permanentemente
                                      </AlertDialogTrigger>
                                      <AlertDialogContent className="rounded-3xl border-none shadow-2xl max-w-md bg-white p-6">
                                        <AlertDialogHeader>
                                          <AlertDialogTitle className="text-xl font-black text-neutral-900 tracking-tight">¿Eliminar taller {t.name}?</AlertDialogTitle>
                                          <AlertDialogDescription className="text-xs text-neutral-500 mt-2 leading-relaxed">
                                            Esta acción eliminará de forma irreversible el taller <strong>{t.name}</strong> junto con todas sus órdenes, inventario, clientes y usuarios asociados.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter className="mt-4 gap-2 flex justify-end">
                                          <AlertDialogCancel className="rounded-xl border border-neutral-200 cursor-pointer">Cancelar</AlertDialogCancel>
                                          <AlertDialogAction 
                                            onClick={async () => { 
                                              await deleteTenant(t.id); 
                                              setTick((r) => r + 1); 
                                              toast.success(`Taller "${t.name}" eliminado correctamente`); 
                                            }}
                                            className="bg-rose-600 text-white hover:bg-rose-700 rounded-xl px-4 py-2 cursor-pointer font-bold shadow-sm"
                                          >
                                            Eliminar Taller
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* ════════════════════════════════════════════════════════════════════════════════ */}
          {/* TAB 2: ANALÍTICAS & BI                                                          */}
          {/* ════════════════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="metrics" className="space-y-6 outline-none">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Plan Distribution Breakdown */}
              <Card className="p-6 rounded-3xl border border-neutral-200/80 bg-white shadow-xs space-y-4">
                <CardHeader className="p-0">
                  <CardTitle className="text-lg font-black text-neutral-900 tracking-tight flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5 text-emerald-600" /> Distribución de Clientes por Plan
                  </CardTitle>
                  <CardDescription className="text-xs text-neutral-500">
                    Proporción de talleres suscritos en cada categoría de plan.
                  </CardDescription>
                </CardHeader>

                <div className="space-y-3.5 pt-2">
                  {plans.map((p) => {
                    const count = tenants.filter(t => (t.plan_id || "basico").toLowerCase() === p.id.toLowerCase()).length;
                    const pct = tenants.length > 0 ? Math.round((count / tenants.length) * 100) : 0;
                    return (
                      <div key={p.id} className="space-y-1.5 p-3 rounded-2xl bg-neutral-50 border border-neutral-100">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-neutral-800">{p.nombre}</span>
                          <span className="text-neutral-500">{count} talleres ({pct}%)</span>
                        </div>
                        <Progress value={pct} className="h-2 rounded-full bg-neutral-200" />
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Top 5 Most Active Workshops */}
              <Card className="p-6 rounded-3xl border border-neutral-200/80 bg-white shadow-xs space-y-4">
                <CardHeader className="p-0">
                  <CardTitle className="text-lg font-black text-neutral-900 tracking-tight flex items-center gap-2">
                    <Activity className="h-5 w-5 text-amber-500" /> Top 5 Talleres con Mayor Actividad
                  </CardTitle>
                  <CardDescription className="text-xs text-neutral-500">
                    Talleres que generan el mayor volumen de órdenes y facturación en la plataforma.
                  </CardDescription>
                </CardHeader>

                <div className="divide-y divide-neutral-100 pt-1">
                  {[...tenants]
                    .sort((a, b) => (ordenesByTenant[b.id]?.total || 0) - (ordenesByTenant[a.id]?.total || 0))
                    .slice(0, 5)
                    .map((t, idx) => {
                      const ords = ordenesByTenant[t.id] || { count: 0, total: 0 };
                      return (
                        <div key={t.id} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3">
                            <span className="h-6 w-6 rounded-full bg-neutral-900 text-white text-[11px] font-black flex items-center justify-center">
                              #{idx + 1}
                            </span>
                            <div>
                              <p className="text-xs font-bold text-neutral-900">{t.name}</p>
                              <p className="text-[10px] text-neutral-400">{ords.count} órdenes registradas</p>
                            </div>
                          </div>
                          <span className="text-xs font-black text-emerald-700">{formatRD(ords.total)}</span>
                        </div>
                      );
                    })}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* ════════════════════════════════════════════════════════════════════════════════ */}
          {/* TAB 3: PLANES SAAS                                                              */}
          {/* ════════════════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="plans" className="space-y-6 outline-none">
            {/* Global Trial Settings Card */}
            <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-heading text-lg font-black text-neutral-900 tracking-tight">
                    Configuración General de Registro y Pruebas
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Ajusta los días de prueba inicial otorgados a los nuevos talleres registrados.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-bold text-neutral-500 uppercase">Días de prueba inicial</Label>
                    <Input 
                      type="number" 
                      className="w-20 h-10 rounded-xl border-neutral-200 bg-neutral-50 text-center font-bold text-sm" 
                      value={globalConfig.trialDays} 
                      onChange={(e) => setGlobalConfig({...globalConfig, trialDays: Number(e.target.value)})} 
                    />
                  </div>
                  <Button 
                    onClick={async () => { 
                      await saveGlobalConfig(globalConfig); 
                      toast.success("Configuración de registro actualizada"); 
                    }}
                    className="h-10 px-5 rounded-xl shadow-xs bg-neutral-950 text-white hover:bg-black font-bold text-xs cursor-pointer"
                  >
                    Guardar Ajustes
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading text-xl font-black text-neutral-900 tracking-tight">Catálogo de Planes Activos</h3>
                <p className="text-xs text-neutral-500 mt-0.5">Define precios, capacidades y enlaces de Polar de cada plan.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setOpenBank(true)} className="rounded-xl h-10 px-4 border-neutral-200 text-neutral-700 hover:bg-neutral-100 font-bold text-xs cursor-pointer">
                  <CreditCard className="mr-1.5 h-4 w-4" /> Datos Bancarios
                </Button>
                <Button onClick={() => { setEditingPlan(null); setOpenPlan(true); }} className="bg-neutral-950 text-white hover:bg-black rounded-xl shadow-xs h-10 px-5 font-bold text-xs cursor-pointer">
                  <Plus className="mr-1.5 h-4 w-4" /> Nuevo Plan
                </Button>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {plans.map((p) => (
                <Card key={p.id} className={`border border-neutral-200/80 p-6 shadow-xs bg-white rounded-3xl flex flex-col justify-between ${p.destacado ? "ring-2 ring-neutral-950 border-neutral-950 shadow-md" : ""}`}>
                  <div>
                    <div className="flex items-start justify-between">
                      <span className="font-heading text-2xl font-black text-neutral-900">{p.nombre}</span>
                      {p.destacado && <Badge className="bg-neutral-950 text-white text-[10px] font-bold uppercase tracking-wider">Popular</Badge>}
                    </div>
                    <div className="mt-3 font-heading text-3xl font-black text-neutral-900">{formatRD(p.precio_mensual)}<span className="text-xs font-semibold text-neutral-400">/mes</span></div>
                    {p.precio_anual && (
                      <div className="text-xs text-neutral-400 font-semibold mt-0.5">o {formatRD(p.precio_anual)}/año</div>
                    )}
                    <div className="mt-5 space-y-2 text-xs text-neutral-700 border-t border-neutral-100 pt-4">
                      <div className="font-semibold">👥 {p.limite_empleados ? `Hasta ${p.limite_empleados} Técnicos/Empleados` : "Empleados Ilimitados"}</div>
                      <div className="font-semibold">📦 {p.limite_ordenes_mes ?? "∞"} Órdenes/mes</div>
                      <div className="font-semibold text-emerald-700">🏪 {p.limite_sucursales ? `Hasta ${p.limite_sucursales} Sucursales` : "Multi-Sucursal Ilimitada"}</div>
                      <div className="font-semibold text-blue-600">💬 {(p.limite_whatsapp_mes || 0).toLocaleString()} Mensajes WhatsApp</div>
                      
                      <div className="border-t border-neutral-100 pt-3 space-y-1.5">
                        {([
                          { key: "whatsapp", label: "WhatsApp Automation" },
                          { key: "facturacion_fiscal", label: "Facturación Fiscal (e-CF)" },
                          { key: "multisucursal", label: "Multi-sucursal & Panel" },
                          { key: "nomina_comisiones", label: "Comisiones & Nómina" },
                          { key: "inspecciones_mpi", label: "Inspecciones MPI" },
                          { key: "proveedores_cuentas", label: "Proveedores & Cuentas" },
                          { key: "inventario_avanzado", label: "Inventario Avanzado" },
                        ] as const).map((m) => {
                          const isEnabled = Boolean((p.modulos as any)?.[m.key]);
                          return (
                            <div key={m.key} className={`flex items-center gap-2 text-xs ${isEnabled ? "text-neutral-950 font-bold" : "text-neutral-400 line-through opacity-50 font-medium"}`}>
                              <span>{isEnabled ? "✓" : "✗"}</span>
                              <span>{m.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-neutral-100 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 rounded-xl border-neutral-200 text-neutral-700 hover:bg-neutral-50 font-bold text-xs cursor-pointer h-10" onClick={() => { setEditingPlan(p); setOpenPlan(true); }}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar Plan
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-xl border-neutral-200 hover:bg-rose-50 hover:border-rose-200 cursor-pointer h-10 px-3" onClick={async () => { 
                      if (confirm(`¿Eliminar plan ${p.nombre}?`)) { 
                        await deletePlan(p.id); 
                        setTick((r) => r + 1); 
                        toast.success(`Plan "${p.nombre}" eliminado`);
                      } 
                    }}>
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ════════════════════════════════════════════════════════════════════════════════ */}
          {/* TAB 4: ANUNCIOS GLOBALES (BROADCAST)                                             */}
          {/* ════════════════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="announcements" className="space-y-6 outline-none">
            <Card className="p-6 sm:p-8 rounded-3xl border border-neutral-200/80 bg-white shadow-xs max-w-2xl space-y-6">
              <div>
                <CardTitle className="text-xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-neutral-900" /> Emisión de Anuncios Globales (System Broadcast)
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">
                  Publica un banner informativo que se mostrará en la parte superior de todos los talleres registrados.
                </CardDescription>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
                  <div>
                    <Label className="text-sm font-bold text-neutral-900">Estado del Anuncio</Label>
                    <p className="text-xs text-neutral-400">Activa o desactiva la visibilidad en todos los talleres</p>
                  </div>
                  <Switch 
                    checked={announcementForm.active}
                    onCheckedChange={(val) => setAnnouncementForm({ ...announcementForm, active: val })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-neutral-700">Tipo de Mensaje</Label>
                  <Select 
                    value={announcementForm.type} 
                    onValueChange={(val: any) => setAnnouncementForm({ ...announcementForm, type: val })}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-neutral-200 text-xs">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl bg-white shadow-md text-xs">
                      <SelectItem value="info">ℹ️ Informativo (Azul)</SelectItem>
                      <SelectItem value="warning">⚠️ Advertencia / Mantenimiento (Ámbar)</SelectItem>
                      <SelectItem value="success">🎉 Novedad / Éxito (Verde)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-neutral-700">Contenido del Mensaje</Label>
                  <Input 
                    placeholder="Ej. Estaremos realizando mejoras en el servidor este domingo a las 11:00 PM."
                    value={announcementForm.message}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                    className="h-11 rounded-xl border-neutral-200 text-xs"
                  />
                </div>

                {/* Live Preview */}
                {announcementForm.message && (
                  <div className="pt-2 space-y-1.5">
                    <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Vista Previa del Banner</Label>
                    <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 ${
                      announcementForm.type === "warning" 
                        ? "bg-amber-50 text-amber-900 border border-amber-200" 
                        : announcementForm.type === "success" 
                          ? "bg-emerald-50 text-emerald-900 border border-emerald-200" 
                          : "bg-blue-50 text-blue-900 border border-blue-200"
                    }`}>
                      <Megaphone className="h-4 w-4 flex-shrink-0" />
                      <span>{announcementForm.message}</span>
                    </div>
                  </div>
                )}

                <Button 
                  onClick={handleSaveAnnouncement}
                  className="w-full bg-neutral-950 hover:bg-black text-white rounded-2xl font-bold h-11 text-xs cursor-pointer shadow-xs"
                >
                  Guardar y Publicar Anuncio
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* ── MODAL: EDITAR TALLER (ACCESO, PLAN Y OVERRIDES) ── */}
      <Dialog open={openEditModal} onOpenChange={setOpenEditModal}>
        <DialogContent className="rounded-3xl border-none shadow-2xl max-w-lg bg-white p-6 max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="pb-3 border-b border-neutral-100 flex-shrink-0">
            <DialogTitle className="font-heading text-2xl font-black flex items-center gap-2 text-neutral-900 tracking-tight">
              <Shield className="h-6 w-6 text-neutral-900" /> Editar Taller: {editingTenant?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500 mt-1">
              Actualiza credenciales, plan asignado y módulos forzados para este taller.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-4 custom-scrollbar">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-700">Correo Electrónico Administrativo</Label>
              <Input 
                type="email" 
                className="rounded-xl border-neutral-200 h-11 text-xs" 
                value={newEmail} 
                onChange={(e) => setNewEmail(e.target.value)} 
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-700">Nueva Contraseña (Opcional)</Label>
              <Input 
                type="password" 
                className="rounded-xl border-neutral-200 h-11 text-xs" 
                placeholder="Dejar en blanco para no cambiar"
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-100">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-neutral-700">Plan Asignado</Label>
                <Select value={selectedPlanId} onValueChange={(v: any) => v && setSelectedPlanId(v)}>
                  <SelectTrigger className="h-11 rounded-xl border-neutral-200 text-xs">
                    <SelectValue placeholder="Plan" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-md bg-white border border-neutral-200 text-xs">
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-neutral-700">Estado de Suscripción</Label>
                <Select value={newStatus} onValueChange={(v: string | null) => v && setNewStatus(v)}>
                  <SelectTrigger className="h-11 rounded-xl border-neutral-200 text-xs font-bold">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-md bg-white border border-neutral-200 text-xs">
                    <SelectItem value="ACTIVO" className="text-emerald-700 font-bold">🟢 Activo</SelectItem>
                    <SelectItem value="TRIAL" className="text-blue-700 font-bold">⏳ En Prueba</SelectItem>
                    <SelectItem value="SUSPENDIDO" className="text-amber-700 font-bold">⚠️ Suspendido</SelectItem>
                    <SelectItem value="CANCELADO" className="text-rose-700 font-bold">🛑 Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-neutral-100">
              <Label className="text-xs font-bold text-neutral-900 uppercase tracking-wider block">
                Forzar Módulos Específicos (Overrides)
              </Label>
              <p className="text-[11px] text-neutral-400 mb-2">
                Habilita o deshabilita funciones puntuales para este taller, independientemente de su plan base.
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {([
                  { key: "whatsapp", label: "WhatsApp Automation" },
                  { key: "facturacion_fiscal", label: "Facturación Fiscal (e-CF)" },
                  { key: "multisucursal", label: "Multi-sucursal & Panel" },
                  { key: "nomina_comisiones", label: "Comisiones & Nómina" },
                  { key: "inspecciones_mpi", label: "Inspecciones MPI" },
                  { key: "proveedores_cuentas", label: "Proveedores & Cuentas" },
                  { key: "inventario_avanzado", label: "Inventario Avanzado" },
                ] as const).map((m) => (
                  <label key={m.key} className="flex items-center gap-2 text-xs font-semibold text-neutral-700 cursor-pointer p-2.5 rounded-xl border border-neutral-100 hover:bg-neutral-50">
                    <Switch 
                      checked={overrides[m.key] === true}
                      onCheckedChange={(v) => setOverrides((prev: any) => ({ ...prev, [m.key]: v }))}
                    />
                    <span>{m.label}</span>
                  </label>
                ))}
                <Button 
                  variant="ghost" 
                  className="col-span-2 text-xs h-8 text-neutral-400 hover:text-rose-600"
                  onClick={() => setOverrides({})}
                >
                  Restablecer a valores por defecto del plan
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-3 border-t border-neutral-100 flex-shrink-0">
            <Button variant="outline" onClick={() => setOpenEditModal(false)} className="rounded-xl border border-neutral-200 cursor-pointer">Cancelar</Button>
            <Button onClick={handleUpdateAdmin} className="bg-neutral-950 text-white hover:bg-black rounded-xl font-bold px-5 cursor-pointer h-10 shadow-xs">
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: ALTA RÁPIDA DE TALLER ── */}
      <Dialog open={openNewTenantModal} onOpenChange={setOpenNewTenantModal}>
        <DialogContent className="rounded-3xl border-none shadow-2xl max-w-md bg-white p-6 max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="pb-3 border-b border-neutral-100 flex-shrink-0">
            <DialogTitle className="font-heading text-xl font-black text-neutral-900 tracking-tight">
              Alta Rápida de Taller
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Registra un nuevo taller y su cuenta administrativa de forma directa.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-3.5 custom-scrollbar">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-neutral-700">Nombre Comercial del Taller *</Label>
              <Input 
                placeholder="Ej. Taller Los Maestros"
                value={newTenantForm.name}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewTenantForm({
                    ...newTenantForm,
                    name: val,
                    slug: val.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
                  });
                }}
                className="h-10 rounded-xl border-neutral-200 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-neutral-700">Identificador URL (Slug) *</Label>
              <Input 
                placeholder="taller-los-maestros"
                value={newTenantForm.slug}
                onChange={(e) => setNewTenantForm({ ...newTenantForm, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                className="h-10 rounded-xl border-neutral-200 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-neutral-700">Correo Electrónico del Administrador *</Label>
              <Input 
                type="email"
                placeholder="admin@taller.do"
                value={newTenantForm.email}
                onChange={(e) => setNewTenantForm({ ...newTenantForm, email: e.target.value })}
                className="h-10 rounded-xl border-neutral-200 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-neutral-700">Contraseña de Acceso *</Label>
              <Input 
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={newTenantForm.adminPassword}
                onChange={(e) => setNewTenantForm({ ...newTenantForm, adminPassword: e.target.value })}
                className="h-10 rounded-xl border-neutral-200 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-neutral-700">Teléfono (WhatsApp)</Label>
                <Input 
                  placeholder="809-555-0100"
                  value={newTenantForm.phone}
                  onChange={(e) => setNewTenantForm({ ...newTenantForm, phone: e.target.value })}
                  className="h-10 rounded-xl border-neutral-200 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-neutral-700">Plan Inicial</Label>
                <Select value={newTenantForm.planId} onValueChange={(val: any) => setNewTenantForm({ ...newTenantForm, planId: val })}>
                  <SelectTrigger className="h-10 rounded-xl border-neutral-200 text-xs">
                    <SelectValue placeholder="Plan" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl bg-white shadow-md text-xs">
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-3 border-t border-neutral-100 flex-shrink-0">
            <Button variant="outline" onClick={() => setOpenNewTenantModal(false)} className="rounded-xl text-xs">Cancelar</Button>
            <Button 
              onClick={handleCreateQuickTenant} 
              disabled={isCreatingTenant}
              className="bg-neutral-950 text-white hover:bg-black rounded-xl font-bold px-5 text-xs h-10"
            >
              {isCreatingTenant ? "Registrando..." : "Crear Taller"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: EDITAR / NUEVO PLAN ── */}
      <PlanDialog open={openPlan} onOpenChange={setOpenPlan} initial={editingPlan} onSaved={() => { setTick((r) => r + 1); setOpenPlan(false); }} />

      {/* ── MODAL: DATOS BANCARIOS ── */}
      <BankDetailsDialog open={openBank} onOpenChange={setOpenBank} config={globalConfig} onSaved={() => { setTick((r) => r + 1); setOpenBank(false); }} />
    </div>
  );
}

function PieChartIcon(props: any) {
  return <BarChart3 {...props} />;
}

function PlanDialog({ open, onOpenChange, initial, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; initial: Plan | null; onSaved: () => void;
}) {
  const [f, setF] = useState<Partial<Plan>>({});
  useEffect(() => {
    if (open) setF(initial ? { ...initial } : {
      id: ("plan_" + Date.now()) as PlanId,
      nombre: "", precio_mensual: 0, precio_anual: 0, limite_empleados: 5, limite_ordenes_mes: 500,
      limite_whatsapp_mes: 300,
      limite_sucursales: 1,
      precio_sucursal_adicional: 1200,
      modulos: { 
        whatsapp: true, 
        facturacion_fiscal: false, 
        multisucursal: false, 
        nomina_comisiones: false,
        inspecciones_mpi: false,
        proveedores_cuentas: false,
        inventario_avanzado: false
      },
    });
  }, [open, initial]);

  function setMod(k: keyof Plan["modulos"], v: boolean) {
    setF((s) => ({ ...s, modulos: { ...(s.modulos as Plan["modulos"]), [k]: v } }));
  }

  async function submit() {
    if (!f.nombre?.trim()) { toast.error("Nombre requerido"); return; }
    const plan: Plan = {
      id: (initial?.id ?? f.id ?? ("plan_" + Date.now())) as PlanId,
      nombre: f.nombre!.trim(),
      precio_mensual: Number(f.precio_mensual) || 0,
      precio_anual: Number(f.precio_anual) || 0,
      limite_empleados: f.limite_empleados === null || f.limite_empleados === undefined ? null : Number(f.limite_empleados),
      limite_ordenes_mes: f.limite_ordenes_mes === null || f.limite_ordenes_mes === undefined ? null : (Number(f.limite_ordenes_mes) || null),
      limite_whatsapp_mes: f.limite_whatsapp_mes === null || f.limite_whatsapp_mes === undefined ? null : Number(f.limite_whatsapp_mes),
      limite_sucursales: f.limite_sucursales === null || f.limite_sucursales === undefined ? null : (Number(f.limite_sucursales) || null),
      precio_sucursal_adicional: Number(f.precio_sucursal_adicional) || 0,
      modulos: f.modulos as Plan["modulos"],
      destacado: f.destacado,
      polar_product_monthly_url: f.polar_product_monthly_url?.trim() || undefined,
      polar_product_yearly_url: f.polar_product_yearly_url?.trim() || undefined,
    };
    await savePlan(plan);
    toast.success("Plan guardado en base de datos");
    onSaved();
  }

  const mods = (f.modulos || {}) as Plan["modulos"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl rounded-3xl border-none shadow-2xl bg-white p-0 max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-neutral-100 flex-shrink-0">
          <DialogTitle className="text-2xl font-black text-neutral-900 tracking-tight">{initial ? "Editar Plan" : "Nuevo Plan"}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 custom-scrollbar">
          
          {/* ── SECCIÓN 1: Información Básica ── */}
          <div>
            <Label className="mb-3 block text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Información del Plan</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-xs font-bold text-neutral-700">ID Interno</Label>
                <Input value={f.id || ""} onChange={(e) => setF({ ...f, id: e.target.value as PlanId })} disabled={!!initial} className="h-11 rounded-xl border-neutral-200 font-mono text-xs" />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-bold text-neutral-700">Nombre del Plan</Label>
                <Input value={f.nombre || ""} onChange={(e) => setF({ ...f, nombre: e.target.value })} className="h-11 rounded-xl border-neutral-200 text-xs font-bold" placeholder="Ej. Taller Profesional" />
              </div>
            </div>
          </div>

          {/* ── SECCIÓN 2: Precios ── */}
          <div>
            <Label className="mb-3 block text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Precios</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-xs font-bold text-neutral-700">Precio Mensual (RD$)</Label>
                <Input type="number" value={f.precio_mensual ?? 0} onChange={(e) => setF({ ...f, precio_mensual: Number(e.target.value) })} className="h-11 rounded-xl border-neutral-200 font-bold" />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-bold text-neutral-700">Precio Anual (RD$)</Label>
                <Input type="number" value={f.precio_anual ?? 0} onChange={(e) => setF({ ...f, precio_anual: Number(e.target.value) })} className="h-11 rounded-xl border-neutral-200" placeholder="Opcional" />
              </div>
            </div>
          </div>

          {/* ── SECCIÓN 3: Límites Operativos ── */}
          <div>
            <Label className="mb-3 block text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Límites Operativos</Label>
            <div className="rounded-2xl border border-neutral-200/80 p-4 bg-neutral-50/50">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 block text-xs font-bold text-neutral-600">Técnicos / Empleados</Label>
                  <Input type="number" value={f.limite_empleados ?? ""} onChange={(e) => setF({ ...f, limite_empleados: e.target.value === "" ? null : Number(e.target.value) })} className="h-10 rounded-xl border-neutral-200 bg-white text-xs" placeholder="Vacío = ilimitado" />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs font-bold text-neutral-600">Órdenes por Mes</Label>
                  <Input type="number" value={f.limite_ordenes_mes ?? ""} onChange={(e) => setF({ ...f, limite_ordenes_mes: e.target.value === "" ? null : Number(e.target.value) })} className="h-10 rounded-xl border-neutral-200 bg-white text-xs" placeholder="Vacío = ilimitado" />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs font-bold text-neutral-600">Mensajes WhatsApp / Mes</Label>
                  <Input type="number" value={f.limite_whatsapp_mes ?? ""} onChange={(e) => setF({ ...f, limite_whatsapp_mes: e.target.value === "" ? null : Number(e.target.value) })} className="h-10 rounded-xl border-neutral-200 bg-white text-xs" placeholder="Vacío = ilimitado" />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs font-bold text-neutral-600">Límite Máx. Sucursales</Label>
                  <Input type="number" value={f.limite_sucursales ?? ""} onChange={(e) => setF({ ...f, limite_sucursales: e.target.value === "" ? null : Number(e.target.value) })} className="h-10 rounded-xl border-neutral-200 bg-white text-xs" placeholder="Vacío = ilimitado" />
                </div>
              </div>
            </div>
          </div>

          {/* ── SECCIÓN 4: Módulos ── */}
          <div>
            <Label className="mb-3 block text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Módulos Incluidos</Label>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-2xl border border-neutral-200/80 p-4 bg-neutral-50/50">
              {([
                { key: "whatsapp", label: "WhatsApp Automation" },
                { key: "facturacion_fiscal", label: "Facturación Fiscal (e-CF / NCF)" },
                { key: "multisucursal", label: "Multi-sucursal & Panel Admin" },
                { key: "nomina_comisiones", label: "Comisiones de Mecánicos & Nómina" },
                { key: "inspecciones_mpi", label: "Inspección Digital Multipunto (MPI)" },
                { key: "proveedores_cuentas", label: "Proveedores & Cuentas por Pagar" },
                { key: "inventario_avanzado", label: "Inventario Avanzado & Combos" },
              ] as const).map((m) => (
                <label key={m.key} className="flex items-center gap-3 text-sm p-1 rounded-lg transition-colors cursor-pointer">
                  <Switch 
                    checked={!!(mods as any)?.[m.key]} 
                    onCheckedChange={(v) => setMod(m.key as any, v)} 
                  />
                  <span className="font-semibold text-neutral-900 text-xs">
                    {m.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* ── SECCIÓN 5: Control de Sucursales ── */}
          <div>
            <Label className="mb-3 block text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Control de Sucursales</Label>
            <div className="rounded-2xl border border-neutral-200/80 p-4 bg-neutral-50/50 space-y-3">
              <div>
                <Label className="mb-1.5 block text-xs font-bold text-neutral-600">Precio por Sucursal Adicional (RD$/mes)</Label>
                <Input 
                  type="number" 
                  value={f.precio_sucursal_adicional ?? 0} 
                  onChange={(e) => setF({ ...f, precio_sucursal_adicional: Number(e.target.value) })} 
                  className="h-10 rounded-xl border-neutral-200 bg-white max-w-sm" 
                  min={0}
                />
              </div>
            </div>
          </div>

          {/* ── SECCIÓN 6: Opciones Adicionales ── */}
          <div className="flex items-center justify-between rounded-2xl border border-neutral-200/80 p-4 bg-neutral-50/50">
            <div>
              <span className="text-xs font-bold text-neutral-900">Plan Destacado</span>
              <p className="text-[10px] text-neutral-400">Se marcará como "Popular" en la plataforma</p>
            </div>
            <Switch checked={!!f.destacado} onCheckedChange={(v) => setF({ ...f, destacado: v })} />
          </div>

          {/* ── SECCIÓN 7: Pasarela de Pago ── */}
          <div>
            <Label className="mb-3 block text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Pasarela de Pago (Polar.sh)</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-xs font-bold text-neutral-600">Link o ID Producto Mensual</Label>
                <Input 
                  value={f.polar_product_monthly_url || ""} 
                  onChange={(e) => setF({ ...f, polar_product_monthly_url: e.target.value })} 
                  placeholder="https://buy.polar.sh/... o UUID" 
                  className="h-10 rounded-xl border-neutral-200 text-xs font-mono"
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-bold text-neutral-600">Link o ID Producto Anual</Label>
                <Input 
                  value={f.polar_product_yearly_url || ""} 
                  onChange={(e) => setF({ ...f, polar_product_yearly_url: e.target.value })} 
                  placeholder="https://buy.polar.sh/... o UUID" 
                  className="h-10 rounded-xl border-neutral-200 text-xs font-mono"
                />
              </div>
            </div>
          </div>

        </div>

        <DialogFooter className="px-8 py-5 gap-3 flex justify-end border-t border-neutral-100 flex-shrink-0">
          <Button variant="ghost" className="rounded-xl border border-neutral-200 cursor-pointer text-xs" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} className="bg-neutral-950 text-white hover:bg-black rounded-xl font-bold px-5 cursor-pointer shadow-xs text-xs">Guardar Plan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BankDetailsDialog({ open, onOpenChange, config, onSaved }: { 
  open: boolean; onOpenChange: (o: boolean) => void; config: GlobalConfig; onSaved: () => void; 
}) {
  const [f, setF] = useState<BankDetails>({
    banco: "", titular: "", rnc: "", tipo_cuenta: "", numero_cuenta: ""
  });

  useEffect(() => {
    if (open && config.bankDetails) {
      setF(config.bankDetails);
    }
  }, [open, config]);

  async function submit() {
    await saveGlobalConfig({ ...config, bankDetails: f });
    toast.success("Datos bancarios actualizados");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-none shadow-2xl bg-white p-6">
        <DialogHeader className="pb-3 border-b border-neutral-100">
          <DialogTitle className="text-xl font-black text-neutral-900 tracking-tight">Datos de Transferencia Bancaria</DialogTitle>
          <DialogDescription className="text-xs text-neutral-500">
            Esta cuenta bancaria se mostrará a los clientes que elijan pagar por transferencia.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-3">
          <div>
            <Label className="text-xs font-bold text-neutral-700">Banco</Label>
            <Input value={f.banco} onChange={(e) => setF({ ...f, banco: e.target.value })} placeholder="Ej. Banco Popular Dominicano" className="h-10 rounded-xl text-xs" />
          </div>
          <div>
            <Label className="text-xs font-bold text-neutral-700">Titular de la Cuenta</Label>
            <Input value={f.titular} onChange={(e) => setF({ ...f, titular: e.target.value })} placeholder="Ej. ServiTracks SRL" className="h-10 rounded-xl text-xs" />
          </div>
          <div>
            <Label className="text-xs font-bold text-neutral-700">RNC o Cédula</Label>
            <Input value={f.rnc} onChange={(e) => setF({ ...f, rnc: e.target.value })} placeholder="Ej. 1-32-12345-6" className="h-10 rounded-xl text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold text-neutral-700">Tipo de Cuenta</Label>
              <Input value={f.tipo_cuenta} onChange={(e) => setF({ ...f, tipo_cuenta: e.target.value })} placeholder="Corriente / Ahorros" className="h-10 rounded-xl text-xs" />
            </div>
            <div>
              <Label className="text-xs font-bold text-neutral-700">Número de Cuenta</Label>
              <Input value={f.numero_cuenta} onChange={(e) => setF({ ...f, numero_cuenta: e.target.value })} placeholder="792019283" className="h-10 rounded-xl text-xs font-mono" />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 pt-2 border-t border-neutral-100">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl text-xs">Cancelar</Button>
          <Button onClick={submit} className="bg-neutral-950 text-white hover:bg-black rounded-xl font-bold text-xs">Guardar Datos</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
