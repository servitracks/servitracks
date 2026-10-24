"use client";

import { useState, useMemo } from "react";
import { useStore, Service, Technician } from "@/store/useStore";
import { 
  Plus, Search, MoreVertical, Layers, Clock, 
  Trash2, Edit, Filter, ChevronRight, X, 
  UserCog, UserCheck, UserX, Phone, CalendarDays, AlertCircle, Percent, Wallet,
  Wrench, Zap, Disc, CircleDot, Activity, Cpu, Snowflake, Wind, LayoutGrid, List,
  TrendingUp, CheckCircle2, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatRD } from "@/lib/utils";
import { toast } from "sonner";
import { useParams, useRouter } from "@/lib/next-compat";
import { useNominaStore } from "@/store/useNominaStore";

const CATEGORIES = [
  "Todos", "Motor", "Frenos", "Neumáticos", "Suspensión", 
  "Transmisión", "Enfriamiento", "Aire Acondicionado", 
  "Sistema Eléctrico", "Otros"
];

const categoryConfig: Record<string, { badge: string; dot: string; icon: any }> = {
  Motor: { badge: "bg-blue-50 text-blue-700 border-blue-200/80", dot: "bg-blue-500", icon: Zap },
  Frenos: { badge: "bg-rose-50 text-rose-700 border-rose-200/80", dot: "bg-rose-500", icon: Disc },
  Neumáticos: { badge: "bg-amber-50 text-amber-700 border-amber-200/80", dot: "bg-amber-500", icon: CircleDot },
  Suspensión: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80", dot: "bg-emerald-500", icon: Activity },
  Transmisión: { badge: "bg-purple-50 text-purple-700 border-purple-200/80", dot: "bg-purple-500", icon: Cpu },
  Enfriamiento: { badge: "bg-cyan-50 text-cyan-700 border-cyan-200/80", dot: "bg-cyan-500", icon: Snowflake },
  "Aire Acondicionado": { badge: "bg-sky-50 text-sky-700 border-sky-200/80", dot: "bg-sky-500", icon: Wind },
  "Sistema Eléctrico": { badge: "bg-amber-50 text-amber-800 border-amber-300/80", dot: "bg-amber-500", icon: Zap },
  Otros: { badge: "bg-neutral-100 text-neutral-700 border-neutral-200/80", dot: "bg-neutral-400", icon: Wrench },
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
  const { empleados, addEmpleado, updateEmpleado } = useNominaStore();
  const currentTenant = tenants.find((t) => t.slug === tenant) ?? null;
  const tenantId = currentTenant?.id ?? "";
  
  // Services State
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todos");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState(emptyService);

  // Technicians State
  const [isTechsModalOpen, setIsTechsModalOpen] = useState(false);
  const [techSearch, setTechSearch] = useState("");
  const [techStatusFilter, setTechStatusFilter] = useState("all");
  const [isTechFormOpen, setIsTechFormOpen] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
  const [techForm, setTechForm] = useState(emptyTechnician);

  const tenantServices = useMemo(() => {
    return services.filter((s) => !tenantId || s.tenantId === tenantId);
  }, [services, tenantId]);

  const filteredServices = useMemo(() => {
    return tenantServices.filter((s) => {
      const q = search.trim().toLowerCase();
      const matchSearch = !q ||
        s.name.toLowerCase().includes(q) ||
        (s.category && s.category.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q));
      const matchCategory = categoryFilter === "Todos" || s.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [tenantServices, search, categoryFilter]);

  // KPIs
  const fixedPriceServices = tenantServices.filter((s) => s.price > 0);
  const avgPrice = fixedPriceServices.length > 0 
    ? fixedPriceServices.reduce((acc, s) => acc + s.price, 0) / fixedPriceServices.length 
    : 0;
  const taxedCount = tenantServices.filter((s) => s.tax === 18).length;
  const exemptCount = tenantServices.length - taxedCount;

  const techActiveCount = (technicians || []).filter((t) => (!tenantId || t.tenantId === tenantId) && t.status === "active").length;
  const techInactiveCount = (technicians || []).filter((t) => (!tenantId || t.tenantId === tenantId) && t.status === "inactive").length;
  const techTotalCount = (technicians || []).filter((t) => !tenantId || t.tenantId === tenantId).length;

  // Counts by category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { Todos: tenantServices.length };
    CATEGORIES.filter(c => c !== "Todos").forEach((cat) => {
      counts[cat] = tenantServices.filter((s) => s.category === cat).length;
    });
    return counts;
  }, [tenantServices]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) {
      toast.error("El nombre del servicio es obligatorio");
      return;
    }

    if (editingService) {
      updateService(editingService.id, form);
      toast.success("Servicio actualizado correctamente");
    } else {
      const newService: Service = {
        ...(form as Service),
        id: crypto.randomUUID(),
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

  // --- Technicians Logic ---
  const filteredTechnicians = (technicians || [])
    .filter((t) => !tenantId || t.tenantId === tenantId)
    .filter((t) => {
      const q = techSearch.trim().toLowerCase();
      const matchSearch = !q ||
        t.name.toLowerCase().includes(q) ||
        (t.phone && t.phone.toLowerCase().includes(q));
      const matchStatus = techStatusFilter === "all" || t.status === techStatusFilter;
      return matchSearch && matchStatus;
    });

  const handleTechSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!techForm.name?.trim()) {
      toast.error("El nombre del técnico es obligatorio");
      return;
    }

    const normalizedTipoPago: "porcentaje" | "fijo" =
      techForm.tipoPago === "fijo" ? "fijo" : "porcentaje";
    const normalizedPagoNomina = Math.max(0, Number(techForm.pagoNomina || 0));

    if (normalizedTipoPago === "porcentaje" && normalizedPagoNomina > 100) {
      toast.error("El porcentaje de comisión no puede superar el 100%");
      return;
    }

    if (editingTechnician) {
      const updatedPayload: Partial<Technician> = {
        ...techForm,
        name: techForm.name.trim(),
        phone: techForm.phone?.trim() || undefined,
        status: (techForm.status as "active" | "inactive") || "active",
        tipoPago: normalizedTipoPago,
        pagoNomina: normalizedPagoNomina,
      };
      updateTechnician(editingTechnician.id, updatedPayload);

      // Sincronizar cambios con Nómina si ya existe el empleado
      const matchingEmp = empleados.find(
        (emp) =>
          emp.tenantId === tenantId &&
          `${emp.nombres} ${emp.apellidos}`.toLowerCase().trim() === editingTechnician.name.toLowerCase().trim()
      );
      if (matchingEmp) {
        const parts = updatedPayload.name!.split(" ");
        updateEmpleado(matchingEmp.id, {
          nombres: parts[0] || "",
          apellidos: parts.slice(1).join(" ") || "",
          salarioBase: normalizedTipoPago === "fijo" ? normalizedPagoNomina : matchingEmp.salarioBase,
          estado: updatedPayload.status === "active" ? "activo" : "inactivo",
        });
      }

      toast.success(`Técnico ${updatedPayload.name} actualizado`);
    } else {
      const newTechnician: Technician = {
        id: crypto.randomUUID(),
        tenantId: tenantId,
        name: techForm.name.trim(),
        phone: techForm.phone?.trim() || undefined,
        status: (techForm.status as "active" | "inactive") || "active",
        pagoNomina: normalizedPagoNomina,
        tipoPago: normalizedTipoPago,
        createdAt: new Date().toISOString(),
      };
      addTechnician(newTechnician);
      
      // Sincronizar automáticamente con el módulo de nómina
      const parts = newTechnician.name.split(" ");
      const nombres = parts[0] || "";
      const apellidos = parts.slice(1).join(" ") || "";
      
      addEmpleado({
        id: crypto.randomUUID(),
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
      
      toast.success(`Técnico ${newTechnician.name} registrado y sincronizado con Nómina`);
    }
    setIsTechFormOpen(false);
    setEditingTechnician(null);
    setTechForm(emptyTechnician);
  };

  const openTechEdit = (tech: Technician) => {
    setEditingTechnician(tech);
    setTechForm({
      ...tech,
      tipoPago: tech.tipoPago === "fijo" ? "fijo" : "porcentaje",
      pagoNomina: Number(tech.pagoNomina || 0),
    });
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
    <div className="space-y-5">
      {/* 1. Header Ejecutivo */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 font-heading">
              Catálogo de Servicios
            </h1>
            <Badge variant="outline" className="border-neutral-200 text-neutral-600 bg-white font-mono text-xs font-bold">
              {tenantServices.length} servicios
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Mano de obra, tarifas al cliente, tiempos estimados y asignación de técnicos de taller.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button 
            variant="outline" 
            className="rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-800 font-semibold text-xs gap-1.5 h-9 px-3.5 cursor-pointer shadow-2xs transition-all" 
            onClick={() => router.push(`/${tenant}/mis-comisiones`)}
          >
            <Wallet className="h-4 w-4 text-neutral-600" />
            <span>Comisiones</span>
          </Button>

          <Button 
            variant="outline" 
            className="rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-800 font-semibold text-xs gap-1.5 h-9 px-3.5 cursor-pointer shadow-2xs transition-all" 
            onClick={() => setIsTechsModalOpen(true)}
          >
            <UserCog className="h-4 w-4 text-neutral-600" />
            <span>Técnicos ({techActiveCount})</span>
          </Button>

          <Button 
            className="rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 font-semibold text-xs gap-1.5 h-9 px-4 cursor-pointer shadow-xs active:scale-[0.98] transition-all" 
            onClick={openCreate}
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo Servicio</span>
          </Button>
        </div>
      </div>

      {/* 2. Ribbon de 4 KPI Cards Métricas Operativas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Total Servicios */}
        <div className="flex flex-col justify-between rounded-2xl border border-neutral-200/80 p-4 bg-white shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-start justify-between gap-2 w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 leading-tight">
              Total Servicios
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-neutral-200/80 bg-neutral-100 text-neutral-800 flex-shrink-0 shadow-2xs">
              <Wrench className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 font-mono tabular-nums">
              {tenantServices.length}
            </div>
            <p className="text-[11px] text-neutral-400 font-medium mt-1 truncate">
              {CATEGORIES.length - 1} categorías configuradas
            </p>
          </div>
        </div>

        {/* KPI 2: Tarifa Promedio */}
        <div className="flex flex-col justify-between rounded-2xl border border-neutral-200/80 p-4 bg-white shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-start justify-between gap-2 w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 leading-tight">
              Tarifa Promedio
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-200/80 bg-emerald-50 text-emerald-700 flex-shrink-0 shadow-2xs">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-xs font-bold text-neutral-400 select-none">RD$</span>
              <span className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 tabular-nums">
                {Math.round(avgPrice).toLocaleString("es-DO")}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 font-medium mt-1 truncate">
              {fixedPriceServices.length} con precio fijo definido
            </p>
          </div>
        </div>

        {/* KPI 3: Régimen ITBIS */}
        <div className="flex flex-col justify-between rounded-2xl border border-neutral-200/80 p-4 bg-white shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-start justify-between gap-2 w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 leading-tight">
              Impuesto ITBIS
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-blue-200/80 bg-blue-50 text-blue-700 flex-shrink-0 shadow-2xs">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 font-mono tabular-nums">
              {taxedCount} gravados
            </div>
            <p className="text-[11px] text-neutral-400 font-medium mt-1 truncate">
              {exemptCount} exentos de ITBIS
            </p>
          </div>
        </div>

        {/* KPI 4: Técnicos */}
        <button
          type="button"
          onClick={() => setIsTechsModalOpen(true)}
          className="flex flex-col justify-between rounded-2xl border border-neutral-200/80 p-4 bg-white shadow-2xs hover:shadow-xs hover:border-neutral-300 text-left transition-all cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-start justify-between gap-2 w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 leading-tight">
              Técnicos de Taller
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-200/80 bg-amber-50 text-amber-700 flex-shrink-0 shadow-2xs transition-transform group-hover:scale-105">
              <UserCog className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 font-mono tabular-nums">
              {techActiveCount} activos
            </div>
            <p className="text-[11px] text-neutral-400 font-medium mt-1 truncate">
              {techTotalCount} registrados en taller
            </p>
          </div>
        </button>
      </div>

      {/* 3. Barra de Control: Búsqueda, Filtro de Categoría y Switch de Vista */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-neutral-200/80 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* Switch Vista: Cuadrícula vs Lista */}
          <div className="flex rounded-xl border border-neutral-200/90 overflow-hidden bg-white p-0.5 shadow-2xs shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                viewMode === "grid"
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              )}
              title="Vista en tarjetas"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Tarjetas</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                viewMode === "list"
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              )}
              title="Vista en tabla"
            >
              <List className="h-3.5 w-3.5" />
              <span>Lista</span>
            </button>
          </div>

          {/* Campo de Búsqueda */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <Input
              type="text"
              placeholder="Buscar servicio por nombre, descripción o categoría..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8.5 pr-8 h-9 text-xs rounded-xl bg-neutral-50/70 border-neutral-200/80 focus:bg-white focus:border-neutral-400 transition-all placeholder:text-neutral-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Selector de Categoría (Compacto) */}
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v || "Todos")}>
            <SelectTrigger className="w-44 h-9 rounded-xl border-neutral-200/80 bg-neutral-50/70 text-xs font-semibold text-neutral-700">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-neutral-400 shrink-0" />
              <span className="truncate">{categoryFilter === "Todos" ? "Todas las Categorías" : categoryFilter}</span>
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-neutral-200 shadow-lg text-xs">
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat} className="text-xs cursor-pointer">
                  {cat} ({categoryCounts[cat] || 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-xs font-medium text-neutral-500 shrink-0 text-right pr-1">
          Mostrando <span className="font-mono font-bold text-neutral-900">{filteredServices.length}</span> de {tenantServices.length}
        </div>
      </div>

      {/* 4. Pastillas de Categorías Rápidas */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const isSelected = categoryFilter === cat;
          const count = categoryCounts[cat] || 0;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer",
                isSelected
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "bg-white text-neutral-600 border border-neutral-200/80 hover:bg-neutral-100 hover:text-neutral-900"
              )}
            >
              <span>{cat}</span>
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold",
                  isSelected
                    ? "bg-white/20 text-white"
                    : "bg-neutral-100 text-neutral-600"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 5. Vista de Contenido: Cuadrícula (Tarjetas) o Lista (Tabla) */}
      {filteredServices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center shadow-2xs">
          <Wrench className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-neutral-800">No se encontraron servicios</p>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            {search || categoryFilter !== "Todos"
              ? "Prueba a cambiar los términos de búsqueda o selecciona otra categoría."
              : "Comienza agregando el primer servicio de tu catálogo con el botón de arriba."}
          </p>
          {(search || categoryFilter !== "Todos") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSearch(""); setCategoryFilter("Todos"); }}
              className="mt-4 rounded-xl text-xs font-semibold"
            >
              Restablecer Filtros
            </Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* MODO CUADRÍCULA / TARJETAS REDISEÑADO */
        <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-stretch">
          {filteredServices.map((service) => {
            const conf = (service.category && categoryConfig[service.category]) || categoryConfig["Otros"];
            const CatIcon = conf.icon;
            return (
              <div
                key={service.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-2xs hover:shadow-xs hover:border-neutral-300 transition-all"
              >
                {/* Cabecera de la Tarjeta */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold border",
                        conf.badge
                      )}
                    >
                      <CatIcon className="h-3 w-3" />
                      <span>{service.category}</span>
                    </span>

                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-7 w-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-all cursor-pointer">
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-neutral-200 text-xs shadow-lg">
                        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => openEdit(service)}>
                          <Edit className="h-3.5 w-3.5 text-neutral-600" />
                          <span>Editar Servicio</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 cursor-pointer text-rose-600 focus:text-rose-600"
                          onClick={() => {
                            deleteService(service.id);
                            toast.success(`Servicio "${service.name}" eliminado`);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Eliminar</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Título del Servicio */}
                  <h3 className="font-bold text-neutral-900 text-base leading-snug mt-2.5 group-hover:text-black transition-colors line-clamp-2">
                    {service.name}
                  </h3>

                  {/* Descripción o Detalle */}
                  <p className="text-xs text-neutral-500 mt-1 leading-relaxed line-clamp-2">
                    {service.description || "Servicio estándar de mano de obra y mantenimiento."}
                  </p>
                </div>

                {/* Sección de Precio & Duración */}
                <div className="mt-4 pt-3 border-t border-neutral-100">
                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      {service.price > 0 ? (
                        <div className="flex items-baseline gap-1 font-mono">
                          <span className="text-xs font-bold text-neutral-400">RD$</span>
                          <span className="text-xl font-black text-neutral-900 tracking-tight tabular-nums">
                            {service.price.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center text-xs font-bold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md">
                          Precio Variable
                        </span>
                      )}
                    </div>

                    {service.tax === 18 && (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-1.5 py-0.5 rounded-md">
                        +ITBIS
                      </span>
                    )}
                  </div>

                  {/* Footer con duración y botón rápido */}
                  <div className="mt-2.5 flex items-center justify-between text-xs text-neutral-400">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Clock className="h-3.5 w-3.5 text-neutral-400" />
                      <span>{service.duration || "1h"}</span>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(service)}
                      className="h-7 px-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg cursor-pointer"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      <span>Editar</span>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* MODO TABLA / LISTA */
        <div className="rounded-2xl border border-neutral-200/80 bg-white overflow-hidden shadow-2xs">
          <Table>
            <TableHeader className="bg-neutral-50/80">
              <TableRow className="border-neutral-200/80">
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 pl-6">Servicio</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Categoría</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Duración</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Impuesto</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Tarifa al Cliente</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 text-right pr-6">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServices.map((service) => {
                const conf = (service.category && categoryConfig[service.category]) || categoryConfig["Otros"];
                const CatIcon = conf.icon;
                return (
                  <TableRow key={service.id} className="hover:bg-neutral-50/60 border-neutral-100 transition-colors">
                    <TableCell className="pl-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border", conf.badge)}>
                          <CatIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-neutral-900 leading-tight">{service.name}</p>
                          <p className="text-[11px] text-neutral-400 truncate max-w-sm mt-0.5">
                            {service.description || "Servicio estándar de taller"}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-3.5">
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border", conf.badge)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", conf.dot)} />
                        <span>{service.category}</span>
                      </span>
                    </TableCell>

                    <TableCell className="py-3.5 text-xs text-neutral-600 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-neutral-400" />
                        <span>{service.duration || "1h"}</span>
                      </div>
                    </TableCell>

                    <TableCell className="py-3.5">
                      {service.tax === 18 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-md">
                          18% ITBIS
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[11px] font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md">
                          Exento
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="py-3.5 font-mono font-bold text-xs text-neutral-900">
                      {service.price > 0 ? (
                        <span className="tabular-nums">
                          RD$ {service.price.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-neutral-500 italic font-sans font-normal text-xs">Precio Variable</span>
                      )}
                    </TableCell>

                    <TableCell className="pr-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(service)}
                          className="h-8 w-8 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 cursor-pointer"
                          title="Editar"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            deleteService(service.id);
                            toast.success(`Servicio "${service.name}" eliminado`);
                          }}
                          className="h-8 w-8 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 6. Modal Crear / Editar Servicio */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden border border-neutral-200/90 shadow-2xl bg-white">
          <div className="border-b border-neutral-100 bg-neutral-50/70 p-5 pr-12">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center font-bold shadow-xs">
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-neutral-900">
                  {editingService ? "Editar Servicio" : "Nuevo Servicio de Catálogo"}
                </DialogTitle>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Define el nombre, categoría, tarifa al cliente y si aplica impuestos.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-700">Nombre del Servicio *</Label>
              <Input 
                placeholder="Ej: Cambio de Aceite y Filtro de Motor" 
                className="h-10 rounded-xl text-xs bg-neutral-50/50 border-neutral-200 focus:bg-white"
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-neutral-700">Categoría</Label>
                <Select 
                  value={form.category} 
                  onValueChange={(v) => setForm({ ...form, category: v || "Otros" })}
                >
                  <SelectTrigger className="h-10 rounded-xl text-xs bg-neutral-50/50 border-neutral-200">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-neutral-200 shadow-lg text-xs">
                    {CATEGORIES.filter(c => c !== "Todos").map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-xs cursor-pointer">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-neutral-700">Duración Estimada</Label>
                <Input 
                  placeholder="Ej: 45min, 1h, 2h 30min" 
                  className="h-10 rounded-xl text-xs bg-neutral-50/50 border-neutral-200 focus:bg-white"
                  value={form.duration} 
                  onChange={(e) => setForm({ ...form, duration: e.target.value })} 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-700">Precio al Cliente (RD$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-neutral-400">
                  RD$
                </span>
                <Input 
                  type="number"
                  step="any"
                  placeholder="0.00 (dejar en 0 si es variable)" 
                  className="pl-11 h-10 rounded-xl text-sm font-mono font-bold bg-neutral-50/50 border-neutral-200 focus:bg-white"
                  value={form.price || ""} 
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} 
                />
              </div>
              <p className="text-[10px] text-neutral-400">Si se deja en 0, se considerará como "Precio Variable".</p>
            </div>
            
            <div className="flex items-center justify-between p-3.5 border border-neutral-200/80 rounded-2xl bg-neutral-50/50">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-neutral-800">Aplica ITBIS (18%)</Label>
                <p className="text-[11px] text-neutral-500">Agrega el 18% de impuesto sobre la mano de obra al facturar</p>
              </div>
              <Switch 
                checked={form.tax === 18} 
                onCheckedChange={(checked) => setForm({ ...form, tax: checked ? 18 : 0 })} 
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-700">Descripción / Detalles Técnicos</Label>
              <Input 
                placeholder="Detalles sobre lo que incluye este servicio..." 
                className="h-10 rounded-xl text-xs bg-neutral-50/50 border-neutral-200 focus:bg-white"
                value={form.description} 
                onChange={(e) => setForm({ ...form, description: e.target.value })} 
              />
            </div>

            <DialogFooter className="gap-2 pt-2 border-t border-neutral-100">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl text-xs font-semibold h-9">
                Cancelar
              </Button>
              <Button type="submit" className="rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-semibold h-9 px-4">
                {editingService ? "Guardar Cambios" : "Crear Servicio"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 7. Modal Directorio de Técnicos */}
      <Dialog open={isTechsModalOpen} onOpenChange={setIsTechsModalOpen}>
        <DialogContent className="sm:max-w-4xl rounded-3xl p-0 shadow-2xl border border-neutral-200/90 max-h-[90vh] flex flex-col overflow-hidden bg-white">
          <DialogHeader className="p-5 sm:p-6 bg-white border-b border-neutral-200/80 flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-12">
            <div>
              <DialogTitle className="text-xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
                <UserCog className="h-5 w-5 text-neutral-900" />
                <span>Equipo de Técnicos de Taller</span>
              </DialogTitle>
              <p className="text-xs text-neutral-500 mt-0.5">
                Personal operativo, comisiones por trabajo realizado y sincronización con Nómina.
              </p>
            </div>
            <Button 
              className="rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 gap-1.5 shrink-0 text-xs font-semibold h-8.5 px-3.5 cursor-pointer shadow-xs" 
              onClick={openTechCreate}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nuevo Técnico</span>
            </Button>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {/* KPI Cards de Técnicos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/50 p-3.5 shadow-2xs">
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Total Técnicos</p>
                <p className="text-2xl font-mono font-black text-neutral-900 mt-1">{techTotalCount}</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">Registrados en taller</p>
              </div>

              <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-3.5 shadow-2xs">
                <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Activos en Servicio</p>
                <p className="text-2xl font-mono font-black text-emerald-800 mt-1">{techActiveCount}</p>
                <p className="text-[10px] text-emerald-600/80 mt-0.5">Disponibles para órdenes</p>
              </div>

              <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/50 p-3.5 shadow-2xs">
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Inactivos</p>
                <p className="text-2xl font-mono font-black text-neutral-700 mt-1">{techInactiveCount}</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">Licencia o fuera de turno</p>
              </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                <Input 
                  placeholder="Buscar técnico por nombre o teléfono..." 
                  className="rounded-xl border-neutral-200 bg-neutral-50/60 pl-8.5 h-9 text-xs focus:bg-white"
                  value={techSearch} 
                  onChange={(e) => setTechSearch(e.target.value)} 
                />
              </div>
              <Select value={techStatusFilter} onValueChange={(val) => setTechStatusFilter(val || "all")}>
                <SelectTrigger className="w-44 h-9 rounded-xl border-neutral-200 bg-neutral-50/60 text-xs font-semibold text-neutral-700 shrink-0">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-neutral-400" />
                  <span>
                    {techStatusFilter === "all" ? "Todos los estados" : techStatusFilter === "active" ? "Solo Activos" : "Solo Inactivos"}
                  </span>
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-neutral-200 shadow-lg text-xs">
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="active">Solo Activos</SelectItem>
                  <SelectItem value="inactive">Solo Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Grid de Técnicos */}
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTechnicians.length === 0 ? (
                <div className="col-span-full py-12 text-center text-neutral-400 bg-neutral-50/50 rounded-2xl border border-dashed border-neutral-200">
                  <UserCog className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-semibold text-neutral-700">No se encontraron técnicos</p>
                </div>
              ) : filteredTechnicians.map((tech) => (
                <div 
                  key={tech.id} 
                  className={cn(
                    "flex flex-col justify-between rounded-2xl border p-4 bg-white shadow-2xs hover:shadow-xs transition-all",
                    tech.status === "active" ? "border-neutral-200/80" : "border-neutral-200/50 opacity-70 bg-neutral-50/30"
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-xs font-mono shrink-0 shadow-2xs">
                          {tech.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-neutral-900 leading-tight truncate">
                            {tech.name}
                          </h4>
                          <span
                            onClick={() => toggleTechStatus(tech)}
                            className={cn(
                              "inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer select-none transition-all",
                              tech.status === "active" 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80" 
                                : "bg-neutral-100 text-neutral-600 border border-neutral-200/80"
                            )}
                          >
                            <span className={cn("h-1.5 w-1.5 rounded-full", tech.status === "active" ? "bg-emerald-500" : "bg-neutral-400")} />
                            <span>{tech.status === "active" ? "Activo" : "Inactivo"}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Editar"
                          className="h-7 w-7 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100" 
                          onClick={() => openTechEdit(tech)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Eliminar"
                          className="h-7 w-7 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50" 
                          onClick={() => {
                            deleteTechnician(tech.id);
                            toast.success(`Técnico ${tech.name} eliminado`);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Esquema de Comisión */}
                    <div className="mt-3 rounded-xl bg-blue-50/70 border border-blue-100 px-3 py-2 flex items-center justify-between text-xs">
                      <span className="font-semibold text-blue-800 flex items-center gap-1">
                        <Percent className="h-3 w-3 text-blue-600" />
                        {tech.tipoPago === "fijo" ? "Pago Fijo:" : "Comisión:"}
                      </span>
                      <span className="font-mono font-black text-blue-900">
                        {tech.pagoNomina && tech.pagoNomina > 0
                          ? tech.tipoPago === "fijo"
                            ? formatRD(tech.pagoNomina)
                            : `${tech.pagoNomina}%`
                          : "Sin configurar"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
                    <span className="truncate">{tech.phone || "Sin teléfono"}</span>
                    <span className="font-mono text-[10px]">#{tech.id.slice(-4).toUpperCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 8. Modal Crear / Editar Técnico */}
      <Dialog open={isTechFormOpen} onOpenChange={setIsTechFormOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-0 overflow-hidden border border-neutral-200/90 shadow-2xl bg-white">
          <div className="border-b border-neutral-100 bg-neutral-50/70 p-5 pr-12">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center font-bold shadow-xs">
                <UserCog className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-neutral-900">
                  {editingTechnician ? "Editar Técnico" : "Nuevo Técnico de Taller"}
                </DialogTitle>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Registra datos del técnico y su esquema de compensación.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleTechSave} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-700">Nombre Completo *</Label>
              <Input 
                placeholder="Ej: Pedro Martínez" 
                className="h-10 rounded-xl text-xs bg-neutral-50/50 border-neutral-200 focus:bg-white"
                value={techForm.name} 
                onChange={(e) => setTechForm({ ...techForm, name: e.target.value })} 
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-700">Teléfono de Contacto</Label>
              <Input 
                placeholder="Ej: 809-555-0199" 
                className="h-10 rounded-xl text-xs bg-neutral-50/50 border-neutral-200 focus:bg-white"
                value={techForm.phone} 
                onChange={(e) => setTechForm({ ...techForm, phone: e.target.value })} 
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-700">Estado</Label>
              <Select 
                value={techForm.status} 
                onValueChange={(v) => setTechForm({ ...techForm, status: v as "active" | "inactive" })}
              >
                <SelectTrigger className="h-10 rounded-xl text-xs bg-neutral-50/50 border-neutral-200">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-neutral-200 shadow-lg text-xs">
                  <SelectItem value="active" className="cursor-pointer">Activo (Disponible para órdenes)</SelectItem>
                  <SelectItem value="inactive" className="cursor-pointer">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-neutral-700">Tipo de Pago *</Label>
                <Select 
                  value={techForm.tipoPago || "porcentaje"} 
                  onValueChange={(v) => setTechForm({ ...techForm, tipoPago: v as "porcentaje" | "fijo" })}
                >
                  <SelectTrigger className="h-10 rounded-xl text-xs bg-neutral-50/50 border-neutral-200">
                    <SelectValue placeholder="Tipo de Pago" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-neutral-200 shadow-lg text-xs">
                    <SelectItem value="porcentaje" className="cursor-pointer">Porcentaje (%)</SelectItem>
                    <SelectItem value="fijo" className="cursor-pointer">Monto Fijo ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-neutral-700">Monto / Porcentaje *</Label>
                <Input 
                  type="number"
                  step="any"
                  placeholder={techForm.tipoPago === "fijo" ? "Ej: 500" : "Ej: 30"}
                  className="h-10 rounded-xl text-xs font-mono font-bold bg-neutral-50/50 border-neutral-200 focus:bg-white"
                  value={techForm.pagoNomina || ""} 
                  onChange={(e) => setTechForm({ ...techForm, pagoNomina: parseFloat(e.target.value) || 0 })} 
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2 border-t border-neutral-100">
              <Button type="button" variant="outline" onClick={() => setIsTechFormOpen(false)} className="rounded-xl text-xs font-semibold h-9">
                Cancelar
              </Button>
              <Button type="submit" className="rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-semibold h-9 px-4">
                {editingTechnician ? "Guardar Cambios" : "Registrar Técnico"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
