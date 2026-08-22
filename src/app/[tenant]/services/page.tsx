"use client";

import { useState, useMemo } from "react";
import { useStore, Service, Technician } from "@/store/useStore";
import { 
  Plus, Search, MoreVertical, Layers, Clock, 
  Trash2, Edit, Filter, ChevronRight, X, 
  UserCog, UserCheck, UserX, Phone, CalendarDays, AlertCircle,
  Wrench, CheckCircle2, DollarSign, Percent, ShieldCheck,
  Briefcase, Send, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useParams, useRouter } from "@/lib/next-compat";
import { useNominaStore } from "@/store/useNominaStore";

const CATEGORIES = [
  "Todos", "Motor", "Frenos", "Neumáticos", "Suspensión", 
  "Transmisión", "Enfriamiento", "Aire Acondicionado", 
  "Sistema Eléctrico", "Otros"
];

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  "Motor": { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
  "Frenos": { bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200" },
  "Neumáticos": { bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-300" },
  "Suspensión": { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
  "Transmisión": { bg: "bg-indigo-50", text: "text-indigo-800", border: "border-indigo-200" },
  "Enfriamiento": { bg: "bg-cyan-50", text: "text-cyan-800", border: "border-cyan-200" },
  "Aire Acondicionado": { bg: "bg-sky-50", text: "text-sky-800", border: "border-sky-200" },
  "Sistema Eléctrico": { bg: "bg-yellow-50", text: "text-yellow-900", border: "border-yellow-300" },
  "Otros": { bg: "bg-neutral-100", text: "text-neutral-800", border: "border-neutral-200" }
};

const emptyService: Partial<Service> = {
  name: "",
  category: "Otros",
  price: 0,
  duration: "1h",
  description: "",
  tax: 0,
};

const emptyTechnician: Partial<Technician> = {
  name: "",
  phone: "",
  status: "active",
  pagoNomina: 0,
  tipoPago: "porcentaje",
};

export default function ServicesPage() {
  const { tenant } = useParams();
  const router = useRouter();
  const { services, addService, updateService, deleteService, tenants, technicians, addTechnician, updateTechnician, deleteTechnician } = useStore();
  const { empleados, addEmpleado } = useNominaStore();
  const currentTenant = tenants.find((t) => t.slug === tenant) ?? null;
  const tenantId = currentTenant?.id ?? "";
  
  // Main Tab
  const [activeTab, setActiveTab] = useState<"services" | "technicians">("services");

  // Services State
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todos");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState(emptyService);

  // Technicians State
  const [techSearch, setTechSearch] = useState("");
  const [techStatusFilter, setTechStatusFilter] = useState("all");
  const [isTechFormOpen, setIsTechFormOpen] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
  const [techForm, setTechForm] = useState(emptyTechnician);

  const tenantServices = useMemo(() => services.filter((s) => !tenantId || s.tenantId === tenantId), [services, tenantId]);
  const tenantTechnicians = useMemo(() => (technicians || []).filter((t) => !tenantId || t.tenantId === tenantId), [technicians, tenantId]);

  const filteredServices = useMemo(() => {
    return tenantServices.filter((s) => {
      const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                          (s.category && s.category.toLowerCase().includes(search.toLowerCase()));
      const matchCategory = categoryFilter === "Todos" || s.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [tenantServices, search, categoryFilter]);

  const filteredTechnicians = useMemo(() => {
    return tenantTechnicians.filter((t) => {
      const matchSearch = t.name.toLowerCase().includes(techSearch.toLowerCase()) ||
                          (t.phone && t.phone.toLowerCase().includes(techSearch.toLowerCase()));
      const matchStatus = techStatusFilter === "all" || t.status === techStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [tenantTechnicians, techSearch, techStatusFilter]);

  // KPIs
  const totalServicesCount = tenantServices.length;
  const activeCategoriesCount = new Set(tenantServices.map((s) => s.category)).size;
  const activeTechsCount = tenantTechnicians.filter((t) => t.status === "active").length;
  const avgPrice = tenantServices.length > 0 
    ? Math.round(tenantServices.reduce((sum, s) => sum + (s.price || 0), 0) / tenantServices.length) 
    : 0;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) {
      toast.error("El nombre del servicio es obligatorio");
      return;
    }

    if (editingService) {
      updateService(editingService.id, form);
      toast.success("Servicio actualizado");
    } else {
      const newService: Service = {
        ...(form as Service),
        id: `s${Date.now()}`,
        tenantId: tenantId,
      };
      addService(newService);
      toast.success("Servicio agregado al catálogo");
    }
    setIsModalOpen(false);
    setEditingService(null);
    setForm(emptyService);
  };

  const openEdit = (service: Service) => {
    setEditingService(service);
    setForm(service);
    setIsModalOpen(true);
  };

  const openCreate = () => {
    setEditingService(null);
    setForm(emptyService);
    setIsModalOpen(true);
  };

  const handleTechSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!techForm.name?.trim()) {
      toast.error("El nombre del técnico es obligatorio");
      return;
    }

    if (editingTechnician) {
      updateTechnician(editingTechnician.id, techForm);
      toast.success("Técnico actualizado con éxito");
    } else {
      const newTechnician: Technician = {
        id: `tech-${Date.now()}`,
        tenantId: tenantId,
        name: techForm.name.trim(),
        phone: techForm.phone?.trim() || undefined,
        status: (techForm.status as "active" | "inactive") || "active",
        pagoNomina: techForm.pagoNomina || 0,
        tipoPago: techForm.tipoPago || "porcentaje",
        createdAt: new Date().toISOString(),
      };
      addTechnician(newTechnician);
      
      // Sincronizar automáticamente con Nómina
      const parts = newTechnician.name.split(" ");
      const nombres = parts[0] || "";
      const apellidos = parts.slice(1).join(" ") || "";
      
      addEmpleado({
        id: `emp-nom-${Date.now()}`,
        tenantId: tenantId,
        cedula: "000-0000000-0",
        nombres,
        apellidos,
        cargo: "Técnico",
        departamento: "Taller",
        salarioBase: newTechnician.tipoPago === "fijo" ? (newTechnician.pagoNomina || 0) : 0,
        tipoCobro: newTechnician.tipoPago === "fijo" ? "mensual" : "quincenal",
        fechaIngreso: new Date().toISOString(),
        estado: newTechnician.status === "active" ? "activo" : "inactivo",
        dependientes: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      toast.success(`Técnico ${techForm.name} registrado con éxito y sincronizado con Nómina`);
    }
    setIsTechFormOpen(false);
    setEditingTechnician(null);
    setTechForm(emptyTechnician);
  };

  const openTechEdit = (tech: Technician) => {
    setEditingTechnician(tech);
    setTechForm(tech);
    setIsTechFormOpen(true);
  };

  const openTechCreate = () => {
    setEditingTechnician(null);
    setTechForm(emptyTechnician);
    setIsTechFormOpen(true);
  };

  const toggleTechStatus = (tech: Technician) => {
    const nextStatus = tech.status === "active" ? "inactive" : "active";
    updateTechnician(tech.id, { status: nextStatus });
    toast.success(`Técnico ${tech.name} ahora está ${nextStatus === "active" ? "Activo" : "Inactivo"}`);
  };

  return (
    <div className="space-y-7 pb-20">
      {/* ── HEADER EXECUTIVE BAR ── */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5 bg-white p-5 sm:p-6 rounded-3xl border border-neutral-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-heading text-xl sm:text-2xl font-black tracking-tight text-neutral-900">
              Servicios & Mano de Obra
            </h1>
            <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 font-bold text-[10px] uppercase px-2.5 py-0.5 rounded-full">
              {totalServicesCount} SERVICIOS
            </Badge>
          </div>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">
            Tarifario de mano de obra, duraciones estimadas y asignación de equipo técnico.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <Button 
            variant="outline" 
            size="sm"
            className="rounded-xl border-neutral-200 text-neutral-700 font-bold hover:bg-neutral-50 gap-1.5 h-10 px-4 text-xs cursor-pointer shadow-2xs" 
            onClick={openTechCreate}
          >
            <UserCog className="h-3.5 w-3.5 text-neutral-700" /> Nuevo Técnico
          </Button>
          <Button 
            size="sm"
            className="rounded-xl bg-neutral-950 text-white hover:bg-black gap-1.5 h-10 px-4 font-bold text-xs cursor-pointer shadow-xs" 
            onClick={openCreate}
          >
            <Plus className="h-3.5 w-3.5 text-emerald-400" /> Nuevo Servicio
          </Button>
        </div>
      </div>

      {/* ── TOP KPI STRIP (CLEAN & COMPACT) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Total Servicios</span>
            <span className="text-xl font-black text-neutral-900 mt-0.5 block">{totalServicesCount} disponibles</span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700">
            <Wrench className="h-4 w-4" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Categorías</span>
            <span className="text-xl font-black text-neutral-900 mt-0.5 block">{activeCategoriesCount} áreas</span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center">
            <Layers className="h-4 w-4" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Precio Promedio</span>
            <span className="text-xl font-black text-emerald-700 mt-0.5 block">RD$ {avgPrice.toLocaleString("es-DO")}</span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center">
            <DollarSign className="h-4 w-4" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Mecánicos Activos</span>
            <span className="text-xl font-black text-blue-700 mt-0.5 block">{activeTechsCount} en taller</span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center">
            <UserCheck className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* ── TABS: SERVICIOS VS TÉCNICOS ── */}
      <Tabs defaultValue="services" value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
        <TabsList className="bg-neutral-200/60 p-1 rounded-2xl">
          <TabsTrigger value="services" className="rounded-xl px-5 font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-xs flex items-center gap-2">
            <Wrench className="h-3.5 w-3.5 text-neutral-700" />
            Catálogo de Servicios ({filteredServices.length})
          </TabsTrigger>
          <TabsTrigger value="technicians" className="rounded-xl px-5 font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-xs flex items-center gap-2">
            <UserCog className="h-3.5 w-3.5 text-blue-600" />
            Equipo de Mecánicos ({filteredTechnicians.length})
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: CATÁLOGO DE SERVICIOS ── */}
        <TabsContent value="services" className="space-y-6">
          {/* Search & Category Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-neutral-200/80 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input 
                placeholder="Buscar servicio por nombre..." 
                className="rounded-xl border-neutral-200 bg-neutral-50/50 pl-10 h-10 text-xs"
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v || "Todos")}>
                <SelectTrigger className="w-48 h-10 rounded-xl border-neutral-200 bg-white text-xs font-bold">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-neutral-400" />
                  <span>{categoryFilter}</span>
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Services Grid */}
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredServices.length === 0 ? (
              <div className="col-span-full py-16 text-center text-neutral-400 bg-white rounded-3xl border border-neutral-200/80 shadow-xs">
                <Layers className="h-10 w-10 mx-auto mb-2 opacity-30 text-neutral-400" />
                <p className="text-sm font-bold text-neutral-700">No se encontraron servicios</p>
                <p className="text-xs text-neutral-400 mt-0.5">Prueba con otro término de búsqueda o agrega un nuevo servicio.</p>
              </div>
            ) : (
              filteredServices.map((service) => {
                const style = CATEGORY_STYLES[service.category || "Otros"] || CATEGORY_STYLES["Otros"];

                return (
                  <Card 
                    key={service.id} 
                    className="group border border-neutral-200/80 shadow-xs hover:shadow-md hover:border-neutral-300 transition-all rounded-3xl bg-white flex flex-col justify-between overflow-hidden p-5"
                  >
                    <div>
                      {/* Top Category Badge & Actions */}
                      <div className="flex items-start justify-between gap-2 pb-3">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg border",
                            style.bg, style.text, style.border
                          )}
                        >
                          {service.category || "General"}
                        </Badge>

                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-neutral-100 transition-all shrink-0 text-neutral-400 hover:text-neutral-900 cursor-pointer">
                            <MoreVertical className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-2xl border-neutral-200 text-xs font-medium min-w-[205px] p-1.5 shadow-xl bg-white space-y-0.5">
                            <DropdownMenuItem className="gap-2.5 cursor-pointer py-2 px-3 rounded-xl hover:bg-neutral-100 font-semibold whitespace-nowrap" onClick={() => openEdit(service)}>
                              <Edit className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                              <span>Editar Servicio</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="gap-2.5 cursor-pointer py-2 px-3 rounded-xl hover:bg-blue-50 text-blue-700 font-semibold whitespace-nowrap" 
                              onClick={() => router.push(`/${tenant}/orders?serviceId=${service.id}`)}
                            >
                              <Briefcase className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                              <span>Crear Orden de Trabajo</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="gap-2.5 cursor-pointer py-2 px-3 rounded-xl hover:bg-rose-50 text-rose-600 focus:text-rose-600 font-semibold whitespace-nowrap" 
                              onClick={() => { deleteService(service.id); toast.success("Servicio eliminado"); }}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                              <span>Eliminar Servicio</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Title & Description */}
                      <h3 className="font-extrabold text-neutral-900 text-sm leading-snug group-hover:text-black transition-colors">
                        {service.name}
                      </h3>
                      {service.description && (
                        <p className="text-[11px] text-neutral-400 line-clamp-2 mt-1 font-medium">
                          {service.description}
                        </p>
                      )}
                    </div>

                    {/* Bottom Details & Price */}
                    <div className="pt-4 mt-3 border-t border-neutral-100 flex items-end justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
                        <Clock className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                        <span>{service.duration || "1h"}</span>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-black text-neutral-900 leading-tight">
                          {service.price > 0 
                            ? `RD$ ${service.price.toLocaleString("es-DO")}` 
                            : <span className="text-xs text-neutral-500 font-bold">Variable</span>}
                        </div>
                        {service.tax === 18 && (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/70 inline-block mt-0.5">
                            + ITBIS 18%
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* ── TAB 2: EQUIPO DE TÉCNICOS & MECÁNICOS ── */}
        <TabsContent value="technicians" className="space-y-6">
          {/* Technicians Filters & Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-neutral-200/80 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input 
                placeholder="Buscar mecánico por nombre o teléfono..." 
                className="rounded-xl border-neutral-200 bg-neutral-50/50 pl-10 h-10 text-xs"
                value={techSearch} 
                onChange={(e) => setTechSearch(e.target.value)} 
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={techStatusFilter} onValueChange={(val) => setTechStatusFilter(val || "all")}>
                <SelectTrigger className="w-44 h-10 rounded-xl border-neutral-200 bg-white text-xs font-bold">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-neutral-400" />
                  <span>{techStatusFilter === "all" ? "Todos los estados" : techStatusFilter === "active" ? "Solo Activos" : "Solo Inactivos"}</span>
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="active">Solo Activos</SelectItem>
                  <SelectItem value="inactive">Solo Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Technicians Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTechnicians.length === 0 ? (
              <div className="col-span-full py-16 text-center text-neutral-400 bg-white rounded-3xl border border-neutral-200/80 shadow-xs">
                <UserCog className="h-10 w-10 mx-auto mb-2 opacity-30 text-neutral-400" />
                <p className="text-sm font-bold text-neutral-700">No se encontraron técnicos registrados</p>
                <p className="text-xs text-neutral-400 mt-0.5">Agrega mecánicos para asignar comisiones y órdenes de trabajo.</p>
              </div>
            ) : (
              filteredTechnicians.map((tech) => {
                const isSyncedWithNomina = empleados.some(e => e.tenantId === tech.tenantId && tech.name.toLowerCase().includes(e.nombres.toLowerCase()));

                return (
                  <Card key={tech.id} className="p-5 rounded-3xl border border-neutral-200/80 shadow-xs hover:shadow-md transition-all bg-white flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-2xl bg-neutral-950 text-white font-bold text-sm flex items-center justify-center shadow-xs shrink-0">
                            {tech.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-extrabold text-neutral-900 text-sm leading-tight">
                              {tech.name}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1">
                              {tech.phone ? (
                                <span className="flex items-center gap-1 font-mono text-[11px]">
                                  <Phone className="h-3 w-3 text-neutral-400" /> {tech.phone}
                                </span>
                              ) : (
                                <span className="text-[11px] text-neutral-400">Sin teléfono</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <Badge 
                          onClick={() => toggleTechStatus(tech)}
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase border cursor-pointer transition-all hover:scale-105 active:scale-95 shrink-0",
                            tech.status === "active" 
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                              : "bg-neutral-100 text-neutral-600 border-neutral-200"
                          )}
                        >
                          {tech.status === "active" ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>

                      {/* Payment & Commission Pill */}
                      <div className="mt-3.5 p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-between text-xs">
                        <span className="text-neutral-500 text-[11px]">Esquema de Pago:</span>
                        <span className="font-bold text-neutral-900 text-[11px] capitalize">
                          {tech.tipoPago === "porcentaje" 
                            ? `Comisión (${tech.pagoNomina || 0}% sin ITBIS)` 
                            : `Sueldo Fijo (RD$ ${(tech.pagoNomina || 0).toLocaleString("es-DO")})`}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                      {tech.phone ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-8 rounded-xl text-xs gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50 font-bold"
                          onClick={() => window.open(`https://wa.me/${tech.phone?.replace(/[^0-9]/g, "")}`, "_blank")}
                        >
                          <MessageSquare className="h-3 w-3" /> WhatsApp
                        </Button>
                      ) : <div />}

                      <div className="flex items-center gap-1.5">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => openTechEdit(tech)}
                          className="h-8 px-2.5 rounded-xl text-xs text-neutral-600 hover:bg-neutral-100 font-bold"
                        >
                          <Edit className="h-3.5 w-3.5 mr-1" /> Editar
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => { deleteTechnician(tech.id); toast.success("Técnico eliminado"); }}
                          className="h-8 w-8 p-0 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── SERVICE MODAL (CREATE / EDIT) ── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
              <Wrench className="h-5 w-5 text-emerald-600" />
              {editingService ? "Editar Servicio" : "Nuevo Servicio de Mano de Obra"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-700">Nombre del Servicio *</Label>
              <Input 
                placeholder="Ej: Cambio de Aceite y Filtro de Motor" 
                className="h-11 rounded-xl text-xs border-neutral-200 font-medium"
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-neutral-700">Precio al Cliente (RD$)</Label>
                <Input 
                  type="number"
                  placeholder="Ej: 1500" 
                  className="h-11 rounded-xl font-bold text-xs border-neutral-200"
                  value={form.price || ""} 
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} 
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-neutral-700">Duración Estimada</Label>
                <Input 
                  placeholder="Ej: 45min, 1h 30m" 
                  className="h-11 rounded-xl text-xs border-neutral-200"
                  value={form.duration} 
                  onChange={(e) => setForm({ ...form, duration: e.target.value })} 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-700">Categoría Especializada</Label>
              <Select 
                value={form.category} 
                onValueChange={(v) => setForm({ ...form, category: v || "Otros" })}
              >
                <SelectTrigger className="h-11 rounded-xl text-xs border-neutral-200">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  {CATEGORIES.filter(c => c !== "Todos").map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ITBIS Switch */}
            <div className="flex items-center justify-between p-3.5 border border-neutral-100 rounded-2xl bg-neutral-50">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-neutral-900">Aplica ITBIS (18%)</Label>
                <p className="text-[11px] text-neutral-500">Agrega el impuesto de ley al cobrar en factura</p>
              </div>
              <Switch 
                checked={form.tax === 18} 
                onCheckedChange={(checked) => setForm({ ...form, tax: checked ? 18 : 0 })} 
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-700">Descripción / Detalles Técnicos</Label>
              <textarea 
                placeholder="Detalles de procedimientos, insumos incluidos, etc." 
                className="w-full min-h-[80px] rounded-2xl border border-neutral-200 p-3 text-xs resize-none focus:outline-none focus:border-neutral-900 transition-colors"
                value={form.description} 
                onChange={(e) => setForm({ ...form, description: e.target.value })} 
              />
            </div>

            <DialogFooter className="gap-2 pt-2 border-t border-neutral-100">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl text-xs">
                Cancelar
              </Button>
              <Button type="submit" className="rounded-xl bg-neutral-950 text-white hover:bg-black font-bold text-xs h-10 px-5 shadow-xs">
                Guardar Servicio
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── TECHNICIAN MODAL (CREATE / EDIT) ── */}
      <Dialog open={isTechFormOpen} onOpenChange={setIsTechFormOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
              <UserCog className="h-5 w-5 text-blue-600" />
              {editingTechnician ? "Editar Mecánico / Técnico" : "Registrar Nuevo Técnico"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTechSave} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-700">Nombre Completo *</Label>
              <Input 
                placeholder="Ej: Carlos Santana" 
                className="h-11 rounded-xl text-xs border-neutral-200 font-medium"
                value={techForm.name} 
                onChange={(e) => setTechForm({ ...techForm, name: e.target.value })} 
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-700">Teléfono / WhatsApp</Label>
              <Input 
                type="tel"
                placeholder="809-555-0199" 
                className="h-11 rounded-xl text-xs border-neutral-200 font-mono"
                value={techForm.phone || ""} 
                onChange={(e) => setTechForm({ ...techForm, phone: e.target.value })} 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-neutral-700">Esquema de Pago</Label>
                <Select 
                  value={techForm.tipoPago || "porcentaje"} 
                  onValueChange={(v: any) => setTechForm({ ...techForm, tipoPago: v })}
                >
                  <SelectTrigger className="h-11 rounded-xl text-xs border-neutral-200">
                    <SelectValue placeholder="Esquema" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl text-xs">
                    <SelectItem value="porcentaje">Comisión por Mano de Obra (%)</SelectItem>
                    <SelectItem value="fijo">Sueldo Fijo (RD$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-neutral-700">
                  {techForm.tipoPago === "fijo" ? "Sueldo Mensual (RD$)" : "Porcentaje de Comisión (%)"}
                </Label>
                <Input 
                  type="number"
                  placeholder={techForm.tipoPago === "fijo" ? "Ej: 25000" : "Ej: 20"} 
                  className="h-11 rounded-xl font-bold text-xs border-neutral-200"
                  value={techForm.pagoNomina || ""} 
                  onChange={(e) => setTechForm({ ...techForm, pagoNomina: Number(e.target.value) })} 
                />
                {techForm.tipoPago === "porcentaje" && (
                  <p className="text-[10px] text-emerald-700 font-medium">
                    ✓ Se aplicará sobre el precio bruto del servicio (descontando el 18% de ITBIS).
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-700">Estado Operativo</Label>
              <Select 
                value={techForm.status || "active"} 
                onValueChange={(v: any) => setTechForm({ ...techForm, status: v })}
              >
                <SelectTrigger className="h-11 rounded-xl text-xs border-neutral-200">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  <SelectItem value="active">🟢 Activo (Recibiendo órdenes)</SelectItem>
                  <SelectItem value="inactive">🔴 Inactivo / Licencia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2 pt-2 border-t border-neutral-100">
              <Button type="button" variant="outline" onClick={() => setIsTechFormOpen(false)} className="rounded-xl text-xs">
                Cancelar
              </Button>
              <Button type="submit" className="rounded-xl bg-neutral-950 text-white hover:bg-black font-bold text-xs h-10 px-5 shadow-xs">
                Guardar Técnico
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
