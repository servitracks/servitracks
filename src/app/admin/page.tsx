"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { 
  Building2, Shield, TrendingUp, Users, Trash2, ExternalLink, Plus, Pencil, 
  Package, LogOut, MoreHorizontal, Key, CreditCard,
  Calendar, Clock, SlidersHorizontal, RotateCcw, Check, Sparkles, Mail, Lock,
  MessageSquare, FileText, Truck, Workflow, Loader2, AlertCircle, Eye, EyeOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  updateTenantTrialHasta,
  updateTenantModulosOverride,
  getGlobalConfig,
  saveGlobalConfig,
  ADMIN_EMAILS,
  formatCedulaRD,

  type Plan, type PlanId, type Tenant, type GlobalConfig, type BankDetails
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

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <img src="/logo.servitracks.png" alt="ServiTracks" className="h-20 w-auto object-contain" />
    </div>
  );
}

function PlanBadge({ id }: { id: PlanId }) {
  const configs: Record<PlanId, { label: string; className: string }> = {
    basico: { label: "Básico", className: "bg-blue-50 text-blue-700 border-blue-200" },
    pro: { label: "Pro", className: "bg-neutral-100 text-neutral-800 border-neutral-300" },
    enterprise: { label: "Enterprise", className: "bg-amber-50 text-amber-700 border-amber-200" },
  };
  const config = configs[id] || { label: id, className: "bg-neutral-50 text-neutral-600 border-neutral-200" };
  return (
    <Badge variant="outline" className={`px-3 py-0.5 rounded-full uppercase text-[10px] font-bold tracking-widest ${config.className}`}>
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
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>(() => useStore.getState().globalConfig || { requirePlanOnRegistration: true, trialDays: 25, defaultPlanId: 'basico' });
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [openPlan, setOpenPlan] = useState(false);
  const [openBank, setOpenBank] = useState(false);
  
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>("basico");
  const [newStatus, setNewStatus] = useState<any>("ACTIVO");
  const [newTrialDays, setNewTrialDays] = useState<number>(25);
  const [overrides, setOverrides] = useState<any>({});
  const [isSavingTenant, setIsSavingTenant] = useState(false);

  useEffect(() => {
    async function load() {
      const [t, p, cfg] = await Promise.all([getTenants(), getPlans(), getGlobalConfig()]);
      setTenants(t);
      setPlans(p);
      setGlobalConfig(cfg);
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
    }
    load();
  }, [tick]);

  const ingresos = tenants.reduce((s, t) => s + (plans.find((p) => p.id === t.plan_id)?.precio_mensual || 0), 0);

  async function handleUpdateAdmin() {
    if (!editingTenant) return;
    setIsSavingTenant(true);
    try {
      await updateTenantAdmin(editingTenant.id, newEmail, newPassword || undefined);
      await updateTenantPlan(editingTenant.id, selectedPlanId);
      await updateTenantStatus(editingTenant.id, newStatus);
      if (newStatus === "TRIAL") {
        const calculatedTrialHasta = new Date(Date.now() + newTrialDays * 24 * 60 * 60 * 1000).toISOString();
        await updateTenantTrialHasta(editingTenant.id, calculatedTrialHasta);
      }
      await updateTenantModulosOverride(editingTenant.id, overrides);
      toast.success("Información del taller actualizada correctamente");
      setOpenEditModal(false);
      setTick(t => t + 1);
    } catch (error) {
      console.error("Error updating tenant:", error);
      toast.error("Error al actualizar el taller");
    } finally {
      setIsSavingTenant(false);
    }
  }

  async function handleLogout() {
    await logout();
    window.location.assign("/login");
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-1">
          <div className="flex items-center gap-3">
            <Logo />
            <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-800 flex items-center font-bold px-2 py-0.5"><Shield className="mr-1 h-3 w-3" /> Super Admin</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="destructive" 
              onClick={handleLogout} 
              className="h-9 px-4 rounded-lg font-bold shadow-sm hover:opacity-90 transition-all cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="font-display text-4xl font-extrabold text-neutral-900 tracking-tight">Panel Central ServiTracks</h1>
        <p className="mt-1 text-neutral-500 font-medium">Administra todos los talleres, membresías y los planes SaaS.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <KPI t="Talleres Registrados" v={String(tenants.length)} icon={Building2} />
          <KPI t="Activos" v={String(tenants.filter((t) => t.estado !== "CANCELADO").length)} icon={Users} />
          <KPI t="MRR Estimado" v={formatRD(ingresos)} icon={TrendingUp} accent />
          <KPI t="Órdenes Totales" v={String(totalOrdenes)} icon={Package} />
        </div>

        <Tabs defaultValue="tenants" className="mt-8">
          <TabsList className="bg-neutral-200/60 p-1 rounded-xl">
            <TabsTrigger value="tenants" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Talleres</TabsTrigger>
            <TabsTrigger value="plans" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Planes SaaS</TabsTrigger>
          </TabsList>

          <TabsContent value="tenants">
            <Card className="overflow-hidden border border-neutral-200/80 bg-white shadow-sm rounded-xl">
              <div className="border-b border-neutral-100 p-5"><h2 className="font-display text-xl font-bold text-neutral-900">Talleres Registrados</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 text-xs uppercase text-neutral-500 border-b border-neutral-100">
                    <tr>
                      <th className="px-6 py-4 text-left font-bold">Marca / Taller</th>
                      <th className="px-6 py-4 text-center font-bold">Plan</th>
                      <th className="px-6 py-4 text-center font-bold">Estado</th>
                      <th className="px-6 py-4 text-center font-bold">Órdenes</th>
                      <th className="px-6 py-4 text-right font-bold">Ingresos</th>
                      <th className="px-6 py-4 text-center font-bold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((t) => {
                      const tenantOrds = ordenesByTenant[t.id] || { count: 0, total: 0 };
                      return (
                        <tr key={t.id} className="border-b border-neutral-100/60 hover:bg-neutral-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span className="h-9 w-9 rounded-xl shadow-sm border border-neutral-200" style={{ background: `linear-gradient(135deg, ${t.color_primario || '#000000'}, ${t.color_secundario || '#4b5563'})` }} />
                              <div>
                                <div className="font-bold text-neutral-900">{t.name}</div>
                                <div className="text-xs text-neutral-500">{t.email || "Sin email"}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <PlanBadge id={t.plan_id || "basico"} />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <Badge variant="outline" className={`font-semibold bg-white ${t.estado === "ACTIVO" ? "text-green-700 border-green-200 bg-green-50/50" : t.estado === "SUSPENDIDO" ? "text-amber-700 border-amber-200 bg-amber-50/50" : t.estado === "TRIAL" ? "text-amber-700 border-amber-200 bg-amber-50/50" : "text-neutral-500 border-neutral-200"}`}>
                                {t.estado === "TRIAL" ? "Prueba" : t.estado || "ACTIVO"}
                              </Badge>
                              {t.estado === "TRIAL" && (
                                <span className="text-[10px] font-bold text-amber-700">
                                  {t.trial_hasta 
                                    ? (() => {
                                        const d = Math.ceil((new Date(t.trial_hasta).getTime() - Date.now()) / 86400000);
                                        return d > 0 ? `${d} días rest.` : "Expirado";
                                      })()
                                    : "Sin fecha"}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center font-medium text-neutral-700">{tenantOrds.count}</td>
                          <td className="px-6 py-4 text-right font-bold text-slate-900">{formatRD(tenantOrds.total)}</td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger render={<Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-neutral-100 cursor-pointer" />}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-md bg-white border border-neutral-200/80 p-1">
                                  <DropdownMenuGroup>
                                    <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-neutral-400 px-2 py-1.5 font-bold">Gestión de Sucursal</DropdownMenuLabel>
                                    <DropdownMenuItem 
                                      className="rounded-lg gap-2 cursor-pointer py-2 hover:bg-neutral-100/70"
                                      onClick={() => {
                                        setSession({ empleado_id: 'admin', tenant_id: t.id, iniciado_en: new Date().toISOString() });
                                        setActiveTenant(t.slug);
                                        toast.success(`Entrando a ${t.name}...`);
                                        setTimeout(() => window.location.assign(`/${t.slug}`), 500);
                                      }}
                                    >
                                      <ExternalLink className="h-4 w-4 text-neutral-700" /> Visitar taller
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="rounded-lg gap-2 cursor-pointer py-2 hover:bg-neutral-100/70"
                                      onClick={() => {
                                        setEditingTenant(t);
                                        setNewEmail(t.email || "");
                                        setNewPassword("");
                                        setSelectedPlanId(t.plan_id || "basico");
                                        setNewStatus(t.estado || "ACTIVO");
                                        const remainingDays = t.trial_hasta 
                                          ? Math.max(0, Math.ceil((new Date(t.trial_hasta).getTime() - Date.now()) / 86400000)) 
                                          : (globalConfig.trialDays || 25);
                                        setNewTrialDays(remainingDays > 0 ? remainingDays : (globalConfig.trialDays || 25));
                                        setOverrides(t.config?.modulos_override || {});
                                        setOpenEditModal(true);
                                      }}
                                    >
                                      <Pencil className="h-4 w-4 text-neutral-700" /> Editar taller
                                    </DropdownMenuItem>
                                  </DropdownMenuGroup>
                                  <DropdownMenuSeparator className="bg-neutral-100 my-1" />
                                  
                                  <AlertDialog>
                                    <AlertDialogTrigger render={<button className="relative flex w-full cursor-pointer select-none items-center rounded-lg gap-2 px-2 py-2 text-sm outline-none transition-colors hover:bg-red-50 hover:text-red-600 text-red-600 font-medium" />}>
                                      <Trash2 className="h-4 w-4" /> Eliminar taller
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="rounded-2xl border-none shadow-lg max-w-md bg-white p-6">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle className="text-xl font-bold text-neutral-900">¿Estás completamente seguro?</AlertDialogTitle>
                                        <AlertDialogDescription className="text-sm text-neutral-500 mt-2">
                                          Esta acción eliminará permanentemente el taller <strong>{t.name}</strong> y todos sus datos asociados (vehículos, órdenes y clientes). Esta acción no se puede deshacer.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter className="mt-4 gap-2 flex justify-end">
                                        <AlertDialogCancel className="rounded-xl border border-neutral-200 cursor-pointer">Cancelar</AlertDialogCancel>
                                        <AlertDialogAction 
                                          onClick={async () => { await deleteTenant(t.id); setTick((r) => r + 1); toast.success("Taller eliminado"); }}
                                          className="bg-red-600 text-white hover:bg-red-700 rounded-xl px-4 py-2 cursor-pointer font-bold shadow-sm"
                                        >
                                          Eliminar
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
                    })}
                    {tenants.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-neutral-400 font-medium">No se encontraron talleres registrados</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="plans">
            <div className="mb-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-lg text-neutral-900">Configuración de Registro</h3>
                  <p className="text-sm text-neutral-500">Controla cómo se registran las nuevas sucursales y sus periodos de prueba.</p>
                </div>
                <div className="flex flex-wrap items-center gap-4 md:gap-6">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs uppercase tracking-wider font-bold text-neutral-400">Días de prueba</Label>
                    <Input 
                      type="number" 
                      className="w-16 h-9 rounded-lg border-neutral-200 bg-neutral-50" 
                      value={globalConfig.trialDays} 
                      onChange={(e) => setGlobalConfig({...globalConfig, trialDays: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="text-xs uppercase tracking-wider font-bold text-neutral-400 whitespace-nowrap">Solicitar plan al registro</Label>
                    <Switch 
                      checked={globalConfig.requirePlanOnRegistration} 
                      onCheckedChange={(v) => setGlobalConfig({...globalConfig, requirePlanOnRegistration: v})} 
                    />
                  </div>
                  <Button 
                    size="sm" 
                    onClick={async () => { 
                      try {
                        await saveGlobalConfig(globalConfig); 
                        toast.success("Configuración guardada exitosamente"); 
                      } catch {
                        toast.error("Error al guardar la configuración");
                      }
                    }}
                    className="h-9 px-4 rounded-lg shadow-sm bg-black text-white hover:bg-neutral-900 font-bold cursor-pointer"
                  >
                    Guardar cambios
                  </Button>
                </div>
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-neutral-500 font-medium">{plans.length} planes configurados</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setOpenBank(true)} className="rounded-lg h-9 px-5 border-neutral-200 text-neutral-700 hover:bg-neutral-100 cursor-pointer">
                  <CreditCard className="mr-1.5 h-4 w-4" /> Métodos de Pago
                </Button>
                <Button onClick={() => { setEditingPlan(null); setOpenPlan(true); }} className="bg-black text-white hover:bg-neutral-800 rounded-lg shadow-md h-9 px-5 font-bold cursor-pointer">
                  <Plus className="mr-1.5 h-4 w-4" /> Nuevo plan
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {plans.map((p) => (
                <Card key={p.id} className={`border border-neutral-200/80 p-6 shadow-sm bg-white rounded-xl ${p.destacado ? "ring-2 ring-black" : ""}`}>
                  <div className="flex items-start justify-between">
                    <span className="font-display text-2xl font-black text-neutral-900">{p.nombre}</span>
                    {p.destacado && <Badge className="bg-neutral-900 text-white">Popular</Badge>}
                  </div>
                    <div className="mt-2 font-display text-3xl font-extrabold text-neutral-900">{formatRD(p.precio_mensual)}<span className="text-sm font-normal text-neutral-400">/mes</span></div>
                    {p.precio_anual && (
                      <div className="text-xs text-neutral-400 font-semibold mt-0.5">o {formatRD(p.precio_anual)}/año</div>
                    )}
                  <div className="mt-4 space-y-2 text-sm text-neutral-700 border-t border-neutral-100 pt-3">
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
                        <div key={k} className={`flex items-center gap-2 ${v ? "text-neutral-950 font-bold" : "text-neutral-400 line-through opacity-50 font-medium"}`}>
                          <span>{v ? "✓" : "✗"}</span>
                          <span className="capitalize">{k === "facturacion_fiscal" ? "Facturación Electrónica" : k.replace(/_/g, " ")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 rounded-lg border-neutral-200 text-neutral-700 hover:bg-neutral-50 cursor-pointer" onClick={() => { setEditingPlan(p); setOpenPlan(true); }}>
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-lg border-neutral-200 hover:bg-red-50 hover:border-red-200 cursor-pointer" onClick={async () => { 
                      if (confirm(`¿Eliminar plan ${p.nombre}?`)) { 
                        await deletePlan(p.id); 
                        setTick((r) => r + 1); 
                      } 
                    }}>
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

        {/* Modal para editar Credenciales de Taller */}
        <Dialog open={openEditModal} onOpenChange={setOpenEditModal}>
          <DialogContent className="sm:max-w-2xl max-w-[95vw] rounded-2xl border border-neutral-200/80 shadow-2xl bg-white p-0 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header Fijo */}
            <div className="px-6 py-5 border-b border-neutral-100 bg-white shrink-0 pr-12">
              <div className="flex items-center gap-3.5">
                <div 
                  className="h-11 w-11 rounded-2xl flex items-center justify-center text-white shadow-md font-extrabold text-base shrink-0"
                  style={{ background: `linear-gradient(135deg, ${editingTenant?.color_primario || '#0f172a'}, ${editingTenant?.color_secundario || '#334155'})` }}
                >
                  {editingTenant?.name?.charAt(0)?.toUpperCase() || "T"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <DialogTitle className="font-display text-xl font-bold text-neutral-900 truncate">
                      {editingTenant?.name || "Editar Taller"}
                    </DialogTitle>
                    <Badge variant="outline" className={cn(
                      "font-bold text-[10px] tracking-wide uppercase px-2.5 py-0.5 rounded-full border",
                      newStatus === "ACTIVO" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      newStatus === "TRIAL" ? "bg-amber-50 text-amber-700 border-amber-200" :
                      newStatus === "SUSPENDIDO" ? "bg-orange-50 text-orange-700 border-orange-200" :
                      "bg-red-50 text-red-700 border-red-200"
                    )}>
                      {newStatus === "TRIAL" ? "En Prueba" : newStatus}
                    </Badge>
                  </div>
                  <DialogDescription className="text-xs text-neutral-500 mt-0.5 truncate">
                    ID: <span className="font-mono text-neutral-700 font-semibold">{editingTenant?.id}</span> • Gestión de plan, acceso y permisos
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* Pestañas de Navegación */}
            <Tabs defaultValue="subscription" className="w-full flex-1 flex flex-col overflow-hidden">
              <div className="px-6 pt-3 pb-2 border-b border-neutral-100 bg-neutral-50/60 shrink-0">
                <TabsList className="bg-neutral-200/70 p-1 rounded-xl w-full grid grid-cols-3">
                  <TabsTrigger value="subscription" className="rounded-lg text-xs font-semibold py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <CreditCard className="h-3.5 w-3.5 mr-1.5 text-neutral-600" /> Suscripción & Días
                  </TabsTrigger>
                  <TabsTrigger value="modules" className="rounded-lg text-xs font-semibold py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-neutral-600" /> Módulos & Overrides
                  </TabsTrigger>
                  <TabsTrigger value="access" className="rounded-lg text-xs font-semibold py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <Lock className="h-3.5 w-3.5 mr-1.5 text-neutral-600" /> Acceso & Cuenta
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Contenido con Scroll Interior */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* ── TAB 1: Suscripción & Días ── */}
                <TabsContent value="subscription" className="space-y-6 m-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Plan */}
                    <div className="space-y-2">
                      <Label htmlFor="edit-plan" className="font-bold text-xs uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5" /> Plan de Suscripción
                      </Label>
                      <Select value={selectedPlanId} onValueChange={(v: string | null) => v && setSelectedPlanId(v as PlanId)}>
                        <SelectTrigger className="h-11 rounded-xl border-neutral-200 bg-white">
                          <SelectValue placeholder="Seleccionar plan" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl shadow-lg bg-white border border-neutral-200 p-1">
                          {plans.map((p) => (
                            <SelectItem key={p.id} value={p.id} className="rounded-lg hover:bg-neutral-50 cursor-pointer py-2">
                              <div className="flex items-center justify-between w-full gap-4">
                                <span className="font-bold text-neutral-900">{p.nombre}</span>
                                <span className="text-xs text-neutral-500 font-semibold">{formatRD(p.precio_mensual)}/mes</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-neutral-400">Define los límites y precio base aplicados al taller.</p>
                    </div>

                    {/* Estado */}
                    <div className="space-y-2">
                      <Label htmlFor="edit-status" className="font-bold text-xs uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5" /> Estado de Cuenta
                      </Label>
                      <Select value={newStatus} onValueChange={(v: string | null) => v && setNewStatus(v)}>
                        <SelectTrigger className="h-11 rounded-xl border-neutral-200 bg-white">
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl shadow-lg bg-white border border-neutral-200 p-1">
                          <SelectItem value="ACTIVO" className="rounded-lg hover:bg-neutral-50 cursor-pointer font-bold text-emerald-700">
                            ● Activo (Vigente)
                          </SelectItem>
                          <SelectItem value="TRIAL" className="rounded-lg hover:bg-neutral-50 cursor-pointer font-bold text-amber-700">
                            ● En Prueba (Trial)
                          </SelectItem>
                          <SelectItem value="SUSPENDIDO" className="rounded-lg hover:bg-neutral-50 cursor-pointer font-bold text-orange-600">
                            ● Suspendido (Temporal)
                          </SelectItem>
                          <SelectItem value="CANCELADO" className="rounded-lg hover:bg-neutral-50 cursor-pointer font-bold text-red-600">
                            ● Cancelado (Bloqueado)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-neutral-400">Controla si el taller puede iniciar sesión o emitir órdenes.</p>
                    </div>
                  </div>

                  {/* Panel de Días de Prueba */}
                  <div className={cn(
                    "rounded-2xl border p-5 transition-all space-y-4",
                    newStatus === "TRIAL" 
                      ? "border-amber-200/90 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 shadow-xs" 
                      : "border-neutral-200/70 bg-neutral-50/50"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "h-8 w-8 rounded-xl flex items-center justify-center",
                          newStatus === "TRIAL" ? "bg-amber-100 text-amber-800" : "bg-neutral-200/80 text-neutral-600"
                        )}>
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-neutral-900">Días de Prueba Restantes</h4>
                          <p className="text-xs text-neutral-500">
                            {newStatus === "TRIAL" 
                              ? "Asigna o extiende el periodo de cortesía para este taller." 
                              : "Solo aplicable cuando el estado está en 'En Prueba (TRIAL)'."}
                          </p>
                        </div>
                      </div>
                      {newStatus === "TRIAL" && (
                        <Badge className="bg-amber-500 text-white font-bold text-[10px] px-2.5 py-0.5">
                          Prueba Activa
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-1">
                      {/* Control Numérico con Stepper */}
                      <div className="flex items-center border border-neutral-300 rounded-xl bg-white shadow-xs overflow-hidden shrink-0">
                        <button
                          type="button"
                          onClick={() => setNewTrialDays(Math.max(1, newTrialDays - 1))}
                          className="px-3.5 py-2.5 hover:bg-neutral-100 text-neutral-600 font-bold text-lg select-none cursor-pointer transition-colors"
                        >
                          -
                        </button>
                        <Input
                          id="edit-trial-days"
                          type="number"
                          min={1}
                          className="w-16 h-10 border-0 text-center font-extrabold text-base shadow-none focus-visible:ring-0 p-0"
                          value={newTrialDays}
                          onChange={(e) => setNewTrialDays(Math.max(1, Number(e.target.value) || 1))}
                        />
                        <button
                          type="button"
                          onClick={() => setNewTrialDays(newTrialDays + 1)}
                          className="px-3.5 py-2.5 hover:bg-neutral-100 text-neutral-600 font-bold text-lg select-none cursor-pointer transition-colors"
                        >
                          +
                        </button>
                      </div>

                      {/* Botones Presets Rápidos */}
                      <div className="flex items-center gap-1.5 flex-wrap flex-1">
                        {[
                          { label: "+7 días", days: newTrialDays + 7 },
                          { label: "+15 días", days: newTrialDays + 15 },
                          { label: "+30 días", days: newTrialDays + 30 },
                          { label: "25 días (defecto)", days: 25 },
                        ].map((btn) => (
                          <Button
                            key={btn.label}
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs font-semibold rounded-lg border-neutral-200 hover:bg-amber-100/60 hover:border-amber-300 text-neutral-700 cursor-pointer"
                            onClick={() => setNewTrialDays(btn.days)}
                          >
                            {btn.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Fecha Límite Estimada */}
                    {newStatus === "TRIAL" && (
                      <div className="bg-amber-100/60 border border-amber-200 rounded-xl p-3 flex items-center gap-2.5 text-xs text-amber-900">
                        <Clock className="h-4 w-4 text-amber-700 shrink-0" />
                        <div>
                          <span>A partir de hoy, la nueva fecha límite de prueba será: </span>
                          <strong className="font-extrabold underline decoration-amber-400">
                            {new Date(Date.now() + newTrialDays * 86400000).toLocaleDateString("es-DO", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                              year: "numeric"
                            })}
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ── TAB 2: Módulos & Overrides ── */}
                <TabsContent value="modules" className="space-y-4 m-0">
                  <div className="flex items-center justify-between pb-1">
                    <div>
                      <h4 className="font-bold text-sm text-neutral-900 flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-neutral-700" /> Forzar Módulos Específicos
                      </h4>
                      <p className="text-xs text-neutral-500">
                        Activa o desactiva módulos de forma individual para este taller, sin importar su plan base.
                      </p>
                    </div>
                    {Object.keys(overrides).length > 0 && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 font-bold text-[10px]">
                        {Object.keys(overrides).length} overrides activos
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { 
                        id: "whatsapp" as const, 
                        title: "WhatsApp Bot & Notificaciones", 
                        desc: "Envío automático de estatus a clientes",
                        icon: MessageSquare, 
                        color: "bg-emerald-100 text-emerald-700" 
                      },
                      { 
                        id: "facturacion_fiscal" as const, 
                        title: "Facturación Fiscal (NCF)", 
                        desc: "Comprobantes fiscales B01, B02, etc.",
                        icon: FileText, 
                        color: "bg-blue-100 text-blue-700" 
                      },
                      { 
                        id: "multisucursal" as const, 
                        title: "Multisucursal", 
                        desc: "Gestión y cambio de múltiples sedes",
                        icon: Building2, 
                        color: "bg-purple-100 text-purple-700" 
                      },
                      { 
                        id: "logistica" as const, 
                        title: "Logística y Despachos", 
                        desc: "Control de entregas y repartos",
                        icon: Truck, 
                        color: "bg-amber-100 text-amber-700" 
                      },
                      { 
                        id: "procesos" as const, 
                        title: "Control de Procesos", 
                        desc: "Flujos de checklist y estaciones",
                        icon: Workflow, 
                        color: "bg-cyan-100 text-cyan-700" 
                      },
                    ].map((mod) => {
                      const isOverridden = overrides[mod.id] !== undefined;
                      const isEnabled = overrides[mod.id] === true;
                      const Icon = mod.icon;

                      return (
                        <div 
                          key={mod.id} 
                          className={cn(
                            "flex items-start justify-between p-3.5 rounded-xl border transition-all",
                            isEnabled 
                              ? "bg-neutral-50/80 border-neutral-300 shadow-xs" 
                              : "bg-white border-neutral-200 hover:border-neutral-300"
                          )}
                        >
                          <div className="flex items-start gap-3 min-w-0 pr-2">
                            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", mod.color)}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs text-neutral-900">{mod.title}</span>
                              </div>
                              <p className="text-[11px] text-neutral-500 mt-0.5 leading-tight">{mod.desc}</p>
                              <div className="mt-1.5">
                                {isOverridden ? (
                                  <span className={cn(
                                    "text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded",
                                    isEnabled ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                                  )}>
                                    {isEnabled ? "Forzado: Activo" : "Forzado: Apagado"}
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-neutral-400 font-medium">Según plan</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <Switch 
                            checked={overrides[mod.id] === true}
                            onCheckedChange={(checked) => setOverrides((prev: any) => ({ ...prev, [mod.id]: checked }))}
                            className="mt-1 shrink-0"
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2">
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      className="w-full text-xs font-semibold text-neutral-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/50 rounded-xl gap-2 h-9 border-neutral-200 cursor-pointer"
                      onClick={() => setOverrides({})}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restablecer todos los módulos al plan base original
                    </Button>
                  </div>
                </TabsContent>

                {/* ── TAB 3: Acceso & Cuenta ── */}
                <TabsContent value="access" className="space-y-4 m-0">
                  <div className="space-y-2">
                    <Label htmlFor="edit-email" className="font-bold text-xs uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" /> Correo Administrativo
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-400" />
                      <Input 
                        id="edit-email" 
                        type="email" 
                        className="pl-10 rounded-xl border-neutral-200 h-11 bg-white" 
                        value={newEmail} 
                        onChange={(e) => setNewEmail(e.target.value)} 
                        placeholder="admin@taller.com"
                      />
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Este correo es el usuario principal de autenticación del taller en la plataforma.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-neutral-100">
                    <Label htmlFor="edit-pass" className="font-bold text-xs uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5" /> Nueva Contraseña de Acceso
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-400" />
                      <Input 
                        id="edit-pass" 
                        type={showPassword ? "text" : "password"} 
                        className="pl-10 pr-10 rounded-xl border-neutral-200 h-11 bg-white" 
                        placeholder="Dejar en blanco para no modificar"
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-neutral-600">
                      <Shield className="h-4 w-4 text-neutral-500 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-neutral-800">Seguridad:</strong> Dejar este campo en blanco preservará la contraseña actual del usuario. Si introduces una nueva, se actualizará directamente en Supabase Auth.
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            {/* Footer Fijo */}
            <div className="px-6 py-4 bg-neutral-50/90 border-t border-neutral-100 flex items-center justify-between shrink-0">
              <Button 
                type="button"
                variant="ghost" 
                onClick={() => setOpenEditModal(false)} 
                className="rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-100 cursor-pointer font-semibold h-10 px-4"
              >
                Cancelar
              </Button>
              <Button 
                type="button"
                onClick={handleUpdateAdmin} 
                disabled={isSavingTenant}
                className="bg-neutral-900 hover:bg-black text-white rounded-xl shadow-md font-bold px-6 cursor-pointer h-10 gap-2 transition-all"
              >
                {isSavingTenant ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Guardar Cambios
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <PlanDialog open={openPlan} onOpenChange={setOpenPlan} initial={editingPlan} onSaved={() => { setTick((r) => r + 1); setOpenPlan(false); }} />
        <BankDetailsDialog open={openBank} onOpenChange={setOpenBank} config={globalConfig} onSaved={() => { setTick((r) => r + 1); setOpenBank(false); }} />
    </div>
  );
}

function KPI({ t, v, icon: Icon, accent }: { t: string; v: string; icon: typeof Building2; accent?: boolean }) {
  return (
    <Card className={`border border-neutral-200/80 p-5 shadow-sm rounded-xl bg-white ${accent ? "bg-black text-white border-none shadow-md" : ""}`}>
      <div className="flex items-start justify-between">
        <div className={`text-xs uppercase tracking-wider font-bold ${accent ? "text-neutral-300" : "text-neutral-400"}`}>{t}</div>
        <Icon className={`h-4 w-4 ${accent ? "text-neutral-300" : "text-neutral-400"}`} />
      </div>
      <div className="mt-2 font-display text-3xl font-black">{v}</div>
    </Card>
  );
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
      precio_sucursal_adicional: 1500,
      modulos: { whatsapp: false, facturacion_fiscal: false, multisucursal: false, logistica: false },
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
      limite_empleados: Number(f.limite_empleados) || 1,
      limite_ordenes_mes: f.limite_ordenes_mes === null ? null : Number(f.limite_ordenes_mes) || null,
      limite_whatsapp_mes: Number(f.limite_whatsapp_mes) || 0,
      limite_sucursales: f.limite_sucursales === null || f.limite_sucursales === undefined ? null : (Number(f.limite_sucursales) || null),
      precio_sucursal_adicional: Number(f.precio_sucursal_adicional) || 0,
      modulos: f.modulos as Plan["modulos"],
      destacado: f.destacado,
      polar_product_monthly_url: f.polar_product_monthly_url?.trim() || undefined,
      polar_product_yearly_url: f.polar_product_yearly_url?.trim() || undefined,
    };
    await savePlan(plan);
    toast.success("Plan guardado");
    onSaved();
  }

  const mods = (f.modulos || {}) as Plan["modulos"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl rounded-2xl border-none shadow-lg bg-white p-0 max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-neutral-100 flex-shrink-0">
          <DialogTitle className="text-2xl font-bold text-neutral-900">{initial ? "Editar plan" : "Nuevo plan"}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 custom-scrollbar">
          
          {/* ── SECCIÓN 1: Información Básica ── */}
          <div>
            <Label className="mb-3 block text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Información del Plan</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-sm font-bold text-neutral-700">ID Interno</Label>
                <Input value={f.id || ""} onChange={(e) => setF({ ...f, id: e.target.value as PlanId })} disabled={!!initial} className="h-11 rounded-xl border-neutral-200" />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-bold text-neutral-700">Nombre del Plan</Label>
                <Input value={f.nombre || ""} onChange={(e) => setF({ ...f, nombre: e.target.value })} className="h-11 rounded-xl border-neutral-200" placeholder="Ej. Pro" />
              </div>
            </div>
          </div>

          {/* ── SECCIÓN 2: Precios ── */}
          <div>
            <Label className="mb-3 block text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Precios</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-sm font-bold text-neutral-700">Precio Mensual (RD$)</Label>
                <Input type="number" value={f.precio_mensual ?? 0} onChange={(e) => setF({ ...f, precio_mensual: Number(e.target.value) })} className="h-11 rounded-xl border-neutral-200" />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-bold text-neutral-700">Precio Anual (RD$)</Label>
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
                  <Input type="number" value={f.limite_empleados ?? 0} onChange={(e) => setF({ ...f, limite_empleados: Number(e.target.value) })} className="h-10 rounded-xl border-neutral-200 bg-white" />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs font-bold text-neutral-600">Órdenes por Mes</Label>
                  <Input type="number" value={f.limite_ordenes_mes ?? ""} onChange={(e) => setF({ ...f, limite_ordenes_mes: e.target.value === "" ? null : Number(e.target.value) })} className="h-10 rounded-xl border-neutral-200 bg-white" placeholder="Vacío = ilimitado" />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs font-bold text-neutral-600">Mensajes WhatsApp / Mes</Label>
                  <Input type="number" value={f.limite_whatsapp_mes ?? 0} onChange={(e) => setF({ ...f, limite_whatsapp_mes: Number(e.target.value) })} className="h-10 rounded-xl border-neutral-200 bg-white" />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs font-bold text-neutral-600">Límite Máx. Sucursales</Label>
                  <Input type="number" value={f.limite_sucursales ?? ""} onChange={(e) => setF({ ...f, limite_sucursales: e.target.value === "" ? null : Number(e.target.value) })} className="h-10 rounded-xl border-neutral-200 bg-white" placeholder="Vacío = ilimitado" />
                </div>
              </div>
            </div>
          </div>

          {/* ── SECCIÓN 4: Módulos ── */}
          <div>
            <Label className="mb-3 block text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Módulos Incluidos</Label>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-2xl border border-neutral-200/80 p-4 bg-neutral-50/50">
              {(["whatsapp", "facturacion_fiscal", "multisucursal", "logistica"] as const).map((m) => (
                <label key={m} className="flex items-center gap-3 text-sm p-1 rounded-lg transition-colors cursor-pointer">
                  <Switch 
                    checked={!!mods?.[m]} 
                    onCheckedChange={(v) => setMod(m, v)} 
                  />
                  <span className="font-semibold text-neutral-900">
                    {m === "logistica" ? "Logística y Repartidores" : m === "facturacion_fiscal" ? "Facturación Electrónica" : m === "multisucursal" ? "Multi-sucursal" : "WhatsApp"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* ── SECCIÓN 5: Control de Sucursales ── */}
          <div>
            <Label className="mb-3 block text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Control de Sucursales</Label>
            <div className="rounded-2xl border border-neutral-200/80 p-4 bg-neutral-50/50 space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label className="mb-1.5 block text-xs font-bold text-neutral-600">Precio por Sucursal Adicional (RD$/mes)</Label>
                  <Input 
                    type="number" 
                    value={f.precio_sucursal_adicional ?? 0} 
                    onChange={(e) => setF({ ...f, precio_sucursal_adicional: Number(e.target.value) })} 
                    className="h-10 rounded-xl border-neutral-200 bg-white max-w-sm" 
                    min={0}
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">Se cobrará esta cantidad por cada nueva sede que el usuario registre, aparte de la principal.</p>
                </div>
              </div>
              {/* Preview */}
              <div className="bg-white border border-neutral-100 rounded-xl p-3 flex items-center gap-2">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Vista Previa:</span>
                <span className="text-xs text-neutral-700 font-medium">
                  {f.precio_sucursal_adicional ? (
                    <>Cada sucursal adicional costará <strong className="text-emerald-700">RD$ {f.precio_sucursal_adicional.toLocaleString("es-DO")}</strong>/mes</>
                  ) : (
                    "Sucursales adicionales sin costo extra"
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* ── SECCIÓN 6: Opciones Adicionales ── */}
          <div className="flex items-center justify-between rounded-2xl border border-neutral-200/80 p-4 bg-neutral-50/50">
            <div>
              <span className="text-sm font-bold text-neutral-700">Plan Destacado</span>
              <p className="text-[10px] text-neutral-400">Se marcará como "Más popular" en la página de precios</p>
            </div>
            <Switch checked={!!f.destacado} onCheckedChange={(v) => setF({ ...f, destacado: v })} />
          </div>

          {/* ── SECCIÓN 7: Pasarela de Pago ── */}
          <div>
            <Label className="mb-3 block text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Pasarela de Pago (Polar)</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-xs font-bold text-neutral-600">Link Mensual</Label>
                <Input 
                  value={f.polar_product_monthly_url || ""} 
                  onChange={(e) => setF({ ...f, polar_product_monthly_url: e.target.value })} 
                  placeholder="https://polar.sh/..." 
                  className="h-10 rounded-xl border-neutral-200"
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-bold text-neutral-600">Link Anual</Label>
                <Input 
                  value={f.polar_product_yearly_url || ""} 
                  onChange={(e) => setF({ ...f, polar_product_yearly_url: e.target.value })} 
                  placeholder="https://polar.sh/..." 
                  className="h-10 rounded-xl border-neutral-200"
                />
              </div>
            </div>
          </div>

        </div>

        <DialogFooter className="px-8 py-5 gap-3 flex justify-end border-t border-neutral-100 flex-shrink-0">
          <Button variant="ghost" className="rounded-xl border border-neutral-200 cursor-pointer" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} className="bg-black text-white hover:bg-neutral-900 rounded-xl font-bold px-5 cursor-pointer shadow-sm">Guardar plan</Button>
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
  }, [open, config.bankDetails]);

  async function submit() {
    const next = { ...config, bankDetails: f };
    await saveGlobalConfig(next);
    toast.success("Métodos de pago actualizados");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border-none shadow-lg bg-white p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <CreditCard className="h-5 w-5 text-neutral-700" /> Datos Bancarios
          </DialogTitle>
          <p className="text-sm text-neutral-500 mt-1">Configura la cuenta para transferencias directas de membresía.</p>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label className="font-semibold text-neutral-700">Banco</Label>
            <Input value={f.banco} onChange={(e) => setF({...f, banco: e.target.value})} placeholder="Banreservas, BHD, etc." className="rounded-xl h-11 border-neutral-200" />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold text-neutral-700">Titular de la cuenta</Label>
            <Input value={f.titular} onChange={(e) => setF({...f, titular: e.target.value})} placeholder="Nombre completo" className="rounded-xl h-11 border-neutral-200" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-semibold text-neutral-700">Cédula / RNC</Label>
              <Input value={f.rnc} onChange={(e) => setF({...f, rnc: formatCedulaRD(e.target.value)})} placeholder="402-..." className="rounded-xl h-11 border-neutral-200" />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-neutral-700">Tipo de Cuenta</Label>
              <Input value={f.tipo_cuenta} onChange={(e) => setF({...f, tipo_cuenta: e.target.value})} placeholder="Ahorro / Corriente" className="rounded-xl h-11 border-neutral-200" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-semibold text-neutral-700">Número de Cuenta</Label>
            <Input value={f.numero_cuenta} onChange={(e) => setF({...f, numero_cuenta: e.target.value})} placeholder="0000000000" className="rounded-xl h-11 border-neutral-200" />
          </div>
        </div>
        <DialogFooter className="mt-2 gap-2 flex justify-end">
          <Button variant="ghost" className="rounded-xl border border-neutral-200 cursor-pointer" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} className="bg-black text-white hover:bg-neutral-900 rounded-xl font-bold shadow-sm px-5 cursor-pointer">Guardar Datos</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


