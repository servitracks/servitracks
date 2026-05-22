"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Building2, Shield, TrendingUp, Users, Trash2, ExternalLink, Plus, Pencil, 
  Package, LogOut, MoreHorizontal, Key, CreditCard
} from "lucide-react";
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
  getGlobalConfig,
  saveGlobalConfig,
  ADMIN_EMAILS,
  formatCedulaRD,
  getLicenciasLocales,
  createLicenciaLocal,
  updateLicenciaLocal,
  deleteLicenciaLocal,

  type Plan, type PlanId, type Tenant, type GlobalConfig, type LicenciaLocal, type BankDetails
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
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>({ requirePlanOnRegistration: true, trialDays: 14, defaultPlanId: 'basico' });
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [openPlan, setOpenPlan] = useState(false);
  const [openBank, setOpenBank] = useState(false);
  
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>("basico");
  const [newStatus, setNewStatus] = useState<any>("ACTIVO");

  const [licencias, setLicencias] = useState<LicenciaLocal[]>([]);
  const [openLicenciaModal, setOpenLicenciaModal] = useState(false);
  const [editingLicencia, setEditingLicencia] = useState<LicenciaLocal | null>(null);

  useEffect(() => {
    async function load() {
      const [t, p, cfg, lics] = await Promise.all([getTenants(), getPlans(), getGlobalConfig(), getLicenciasLocales()]);
      setTenants(t);
      setPlans(p);
      setGlobalConfig(cfg);
      setLicencias(lics);
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
    try {
      await updateTenantAdmin(editingTenant.id, newEmail, newPassword || undefined);
      await updateTenantPlan(editingTenant.id, selectedPlanId);
      await updateTenantStatus(editingTenant.id, newStatus);
      toast.success("Información de taller actualizada");
      setOpenEditModal(false);
      setTick(t => t + 1);
    } catch (error) {
      console.error("Error updating tenant:", error);
      toast.error("Error al actualizar el taller");
    }
  }

  function handleLogout() {
    logout();
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
            <TabsTrigger value="licencias" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Licencias Local</TabsTrigger>
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
                            <Badge variant="outline" className={`font-semibold bg-white ${t.estado === "ACTIVO" ? "text-green-700 border-green-200 bg-green-50/50" : t.estado === "SUSPENDIDO" ? "text-amber-700 border-amber-200 bg-amber-50/50" : "text-neutral-500 border-neutral-200"}`}>
                              {t.estado === "TRIAL" ? "Prueba" : t.estado || "ACTIVO"}
                            </Badge>
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
                      await saveGlobalConfig(globalConfig); 
                      toast.success("Configuración guardada"); 
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

          <TabsContent value="licencias">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-neutral-900">Licencias de Software Offline</h2>
                <p className="text-sm text-neutral-500 font-medium">Genera y controla el acceso a las instalaciones de ServiTracks Local.</p>
              </div>
              <Button onClick={() => { setEditingLicencia(null); setOpenLicenciaModal(true); }} className="bg-black text-white hover:bg-neutral-800 rounded-lg shadow-md h-9 px-5 font-bold cursor-pointer">
                <Plus className="mr-1.5 h-4 w-4" /> Nueva Licencia
              </Button>
            </div>

            <Card className="overflow-hidden border border-neutral-200/80 bg-white shadow-sm rounded-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 text-xs uppercase text-neutral-500 border-b border-neutral-100">
                    <tr>
                      <th className="px-6 py-4 text-left font-bold">Código / Taller</th>
                      <th className="px-6 py-4 text-center font-bold">Estado</th>
                      <th className="px-6 py-4 text-center font-bold">WhatsApp</th>
                      <th className="px-6 py-4 text-center font-bold">Facturación</th>
                      <th className="px-6 py-4 text-center font-bold">Vencimiento</th>
                      <th className="px-6 py-4 text-center font-bold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {licencias.map((l) => (
                      <tr key={l.id} className="border-b border-neutral-100/60 hover:bg-neutral-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-mono text-sm font-bold text-neutral-900 tracking-wider">{l.codigo}</div>
                          <div className="text-xs font-semibold text-neutral-500 mt-0.5">{l.nombre_lavanderia}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge className={l.estado === "ACTIVO" ? "bg-green-100 border border-green-200 text-green-700 font-bold" : "bg-neutral-100 text-neutral-500"}>
                            {l.estado}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Switch 
                            checked={l.whatsapp_activo} 
                            onCheckedChange={async (v) => {
                              await updateLicenciaLocal(l.id, { whatsapp_activo: v });
                              setTick(t => t + 1);
                              toast.success("WhatsApp actualizado");
                            }}
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Switch 
                            checked={l.facturacion_activa} 
                            onCheckedChange={async (v) => {
                              await updateLicenciaLocal(l.id, { facturacion_activa: v });
                              setTick(t => t + 1);
                              toast.success("Facturación actualizada");
                            }}
                          />
                        </td>
                        <td className="px-6 py-4 text-center text-xs text-neutral-600 font-semibold">
                          {l.es_anual && l.expira_en ? new Date(l.expira_en).toLocaleDateString("es-DO") : "Permanente"}
                        </td>
                        <td className="px-6 py-4 text-center flex justify-center gap-2">
                          <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-neutral-100 rounded-lg cursor-pointer" onClick={() => { setEditingLicencia(l); setOpenLicenciaModal(true); }}>
                            <Pencil className="h-4 w-4 text-neutral-600" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-red-50 rounded-lg cursor-pointer" onClick={async () => {
                            if(confirm("¿Eliminar licencia? Este taller dejará de funcionar la próxima vez que se conecte a internet.")) {
                              await deleteLicenciaLocal(l.id);
                              setTick(t => t + 1);
                              toast.success("Licencia eliminada");
                            }
                          }}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {licencias.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-neutral-400 font-medium">No se encontraron licencias creadas</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

        {/* Modal para editar Credenciales de Taller */}
        <Dialog open={openEditModal} onOpenChange={setOpenEditModal}>
          <DialogContent className="rounded-2xl border-none shadow-lg max-w-md bg-white p-6">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl font-bold flex items-center gap-2 text-neutral-900">
                <Shield className="h-5 w-5 text-neutral-700" /> Editar Taller
              </DialogTitle>
              <DialogDescription className="text-sm text-neutral-500 mt-1">
                Actualiza el acceso y estado para <strong>{editingTenant?.name}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email" className="font-semibold text-neutral-700">Correo Administrativo</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-3.5 h-4 w-4 text-neutral-400" />
                  <Input 
                    id="edit-email" 
                    type="email" 
                    className="pl-10 rounded-xl border-neutral-200 h-11" 
                    value={newEmail} 
                    onChange={(e) => setNewEmail(e.target.value)} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-pass" className="font-semibold text-neutral-700">Nueva Contraseña (opcional)</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-3.5 h-4 w-4 text-neutral-400" />
                  <Input 
                    id="edit-pass" 
                    type="password" 
                    className="pl-10 rounded-xl border-neutral-200 h-11" 
                    placeholder="Dejar en blanco para no cambiar"
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-plan" className="font-semibold text-neutral-700">Plan de Suscripción</Label>
                <Select value={selectedPlanId} onValueChange={(v: string | null) => v && setSelectedPlanId(v as PlanId)}>
                  <SelectTrigger className="h-11 rounded-xl border-neutral-200">
                    <SelectValue placeholder="Seleccionar plan" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-md bg-white border border-neutral-200 p-1">
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="rounded-lg hover:bg-neutral-50 cursor-pointer">
                        <div className="flex items-center justify-between w-full gap-4">
                          <span className="font-semibold text-neutral-900">{p.nombre}</span>
                          <span className="text-xs text-neutral-400 font-bold">{formatRD(p.precio_mensual)}/mes</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status" className="font-semibold text-neutral-700">Estado de la Suscripción</Label>
                <Select value={newStatus} onValueChange={(v: string | null) => v && setNewStatus(v)}>
                  <SelectTrigger className="h-11 rounded-xl border-neutral-200">
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-md bg-white border border-neutral-200 p-1">
                    <SelectItem value="ACTIVO" className="rounded-lg hover:bg-neutral-50 cursor-pointer">Activo</SelectItem>
                    <SelectItem value="TRIAL" className="rounded-lg hover:bg-neutral-50 cursor-pointer">En Prueba</SelectItem>
                    <SelectItem value="SUSPENDIDO" className="rounded-lg hover:bg-neutral-50 cursor-pointer text-amber-600 font-bold">Suspendido</SelectItem>
                    <SelectItem value="CANCELADO" className="rounded-lg hover:bg-neutral-50 cursor-pointer text-red-600 font-bold">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-2">
              <Button variant="ghost" onClick={() => setOpenEditModal(false)} className="rounded-xl border border-neutral-200 cursor-pointer">Cancelar</Button>
              <Button onClick={handleUpdateAdmin} className="bg-black text-white hover:bg-neutral-950 rounded-xl shadow-sm font-bold px-5 cursor-pointer h-10">
                Guardar Cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <PlanDialog open={openPlan} onOpenChange={setOpenPlan} initial={editingPlan} onSaved={() => { setTick((r) => r + 1); setOpenPlan(false); }} />
        <BankDetailsDialog open={openBank} onOpenChange={setOpenBank} config={globalConfig} onSaved={() => { setTick((r) => r + 1); setOpenBank(false); }} />
        <LicenciaDialog open={openLicenciaModal} onOpenChange={setOpenLicenciaModal} initial={editingLicencia} onSaved={() => { setTick(r => r + 1); setOpenLicenciaModal(false); }} />
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

function LicenciaDialog({ open, onOpenChange, initial, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; initial: LicenciaLocal | null; onSaved: () => void;
}) {
  const [f, setF] = useState<Partial<LicenciaLocal>>({});
  
  useEffect(() => {
    if (open) {
      if (initial) {
        setF({ ...initial });
      } else {
        // Generar código aleatorio KLYNN-XXXX-XXXX (Usando KLYNN para coincidir con la compatibilidad de licencias offline)
        const rand = () => Math.random().toString(36).substring(2, 6).toUpperCase();
        setF({
          codigo: `KLYNN-${rand()}-${rand()}`,
          nombre_lavanderia: "",
          estado: "ACTIVO",
          es_anual: true,
          expira_en: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0],
          whatsapp_activo: false,
          facturacion_activa: false
        });
      }
    }
  }, [open, initial]);

  async function submit() {
    if (!f.nombre_lavanderia?.trim()) { toast.error("Nombre de taller requerido"); return; }
    try {
      if (initial) {
        await updateLicenciaLocal(initial.id, {
          nombre_lavanderia: f.nombre_lavanderia,
          estado: f.estado,
          es_anual: f.es_anual,
          expira_en: f.es_anual ? f.expira_en : undefined,
          whatsapp_activo: f.whatsapp_activo,
          facturacion_activa: f.facturacion_activa
        });
      } else {
        await createLicenciaLocal({
          codigo: f.codigo!,
          nombre_lavanderia: f.nombre_lavanderia,
          estado: f.estado!,
          es_anual: f.es_anual!,
          expira_en: f.es_anual ? f.expira_en : undefined,
          whatsapp_activo: f.whatsapp_activo!,
          facturacion_activa: f.facturacion_activa!
        });
      }
      toast.success(initial ? "Licencia actualizada" : "Licencia creada");
      onSaved();
    } catch(e: any) {
      toast.error(e.message || "Error al guardar la licencia");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl rounded-3xl border-none shadow-lg bg-white p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-900">
            {initial ? "Editar Licencia" : "Nueva Licencia Klynn Desktop"}
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-400 font-semibold mt-1">
            Configura los accesos y módulos permitidos para esta instalación local en taller.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Columna Izquierda: Datos Generales */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400 ml-1">Código de Activación</Label>
              <Input value={f.codigo} readOnly disabled className="font-mono tracking-widest bg-neutral-50 font-bold h-11 rounded-xl text-neutral-600 border-neutral-200" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400 ml-1">Nombre del Taller / Cliente</Label>
              <Input value={f.nombre_lavanderia} onChange={(e) => setF({...f, nombre_lavanderia: e.target.value})} placeholder="Ej: Taller La Principal" className="h-11 rounded-xl border-neutral-200" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400 ml-1">Estado</Label>
                <Select value={f.estado} onValueChange={(v: any) => setF({...f, estado: v})}>
                  <SelectTrigger className="h-11 rounded-xl border-neutral-200"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl shadow-md bg-white border border-neutral-200 p-1">
                    <SelectItem value="ACTIVO" className="rounded-lg hover:bg-neutral-50 cursor-pointer">Activo</SelectItem>
                    <SelectItem value="INACTIVO" className="rounded-lg hover:bg-neutral-50 cursor-pointer">Inactivo</SelectItem>
                    <SelectItem value="SUSPENDIDO" className="rounded-lg hover:bg-neutral-50 cursor-pointer text-amber-600 font-bold">Suspendido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {f.es_anual && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400 ml-1">Fecha de Expiración</Label>
                  <Input type="date" value={f.expira_en?.substring(0,10) || ""} onChange={(e) => setF({...f, expira_en: new Date(e.target.value).toISOString()})} className="h-11 rounded-xl border-neutral-200" />
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha: Módulos y Parámetros */}
          <div className="space-y-4 p-5 bg-neutral-50/50 border border-neutral-100 rounded-2xl flex flex-col justify-center">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2 px-1">Módulos y Parámetros</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white/40 transition-colors">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold text-neutral-900">Licencia Anual</Label>
                  <p className="text-xs text-neutral-400 font-medium">Si está desactivado, la licencia es de por vida.</p>
                </div>
                <Switch checked={f.es_anual} onCheckedChange={(v) => setF({...f, es_anual: v})} />
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white/40 transition-colors">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold text-neutral-900">Módulo WhatsApp</Label>
                  <p className="text-xs text-neutral-400 font-medium">Habilitar notificaciones integradas.</p>
                </div>
                <Switch checked={f.whatsapp_activo} onCheckedChange={(v) => setF({...f, whatsapp_activo: v})} />
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white/40 transition-colors">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold text-neutral-900">Módulo Facturación Fiscal</Label>
                  <p className="text-xs text-neutral-400 font-medium">Habilitar e-CFs fiscales dominicanos.</p>
                </div>
                <Switch checked={f.facturacion_activa} onCheckedChange={(v) => setF({...f, facturacion_activa: v})} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2 flex justify-end border-t border-neutral-100 pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl border border-neutral-200 cursor-pointer">Cancelar</Button>
          <Button onClick={submit} className="bg-black text-white font-bold rounded-xl h-11 px-6 shadow-sm hover:bg-neutral-950 transition-all cursor-pointer">
            Guardar Licencia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
