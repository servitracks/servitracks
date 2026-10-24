"use client";

import { useState, useMemo, useEffect, memo, Suspense } from "react";
import { useRouter, useSearchParams, useParams } from "@/lib/next-compat";
import { useStore } from "@/store/useStore";
import { MaintenanceDetailModal } from "@/components/maintenance/MaintenanceDetailModal";
import { VehicleMaintenanceHistoryModal } from "@/components/maintenance/VehicleMaintenanceHistoryModal";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Filter,
  Car,
  User,
  AlertTriangle,
  CheckCircle2,
  Clock,
  History,
  ChevronRight,
  Trash2,
  LayoutGrid,
  List,
  MessageSquare,
  Wrench,
  Gauge,
  Phone,
  Calendar,
  X,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function MaintenancePage() {
  return (
    <Suspense fallback={<div className="p-8 text-neutral-400 text-xs">Cargando control de mantenimiento...</div>}>
      <MaintenanceContent />
    </Suspense>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  engine: "Motor",
  brakes: "Frenos",
  tires: "Neumáticos",
  battery: "Sistema Eléctrico",
  suspension: "Suspensión",
  transmission: "Transmisión",
  cooling: "Enfriamiento",
  ac: "Aire Acondicionado",
  steering: "Dirección",
  others: "Mantenimiento General",
};

function MaintenanceContent() {
  const { tenant } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const storeCustomers = useStore((s) => s.customers);
  const storeVehicles = useStore((s) => s.vehicles);
  const storeMaintenanceItems = useStore((s) => s.maintenanceItems);
  const calculateMaintenanceHealth = useStore((s) => s.calculateMaintenanceHealth);
  const deleteMaintenanceItem = useStore((s) => s.deleteMaintenanceItem);
  const tenants = useStore((s) => s.tenants);

  const currentTenant = tenants.find((t) => t.slug === tenant) ?? null;
  const tenantId = currentTenant?.id ?? "";

  const customers = useMemo(() => storeCustomers.filter(c => !tenantId || c.tenantId === tenantId), [storeCustomers, tenantId]);
  const vehicles = useMemo(() => storeVehicles.filter(v => !tenantId || v.tenantId === tenantId), [storeVehicles, tenantId]);
  const maintenanceItems = useMemo(() => storeMaintenanceItems.filter(m => !tenantId || m.tenantId === tenantId), [storeMaintenanceItems, tenantId]);

  const [search, setSearch] = useState(initialSearch);
  const [filter, setFilter] = useState<"all" | "critical" | "preventive" | "healthy">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedData, setSelectedData] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyVehicle, setHistoryVehicle] = useState<any>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<string | null>(null);
  const [hiddenVehicleIds, setHiddenVehicleIds] = useState<Set<string>>(new Set());

  const openHistory = (vehicle: any) => {
    setHistoryVehicle(vehicle);
    setHistoryOpen(true);
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    setVehicleToDelete(vehicleId);
  };

  const confirmDeleteVehicle = () => {
    if (vehicleToDelete) {
      setHiddenVehicleIds(prev => new Set([...prev, vehicleToDelete]));
      const itemsToDelete = storeMaintenanceItems.filter(item => item.vehicleId === vehicleToDelete);
      itemsToDelete.forEach(item => deleteMaintenanceItem(item.id));
      toast.success("Mantenimiento de vehículo eliminado correctamente.");
      setVehicleToDelete(null);
    }
  };

  useEffect(() => {
    const kmMap: Record<string, number> = {};
    let hasValidKms = false;
    vehicles.forEach(v => {
      if (v.km != null) {
        kmMap[v.id] = v.km;
        hasValidKms = true;
      }
    });
    if (hasValidKms) {
      calculateMaintenanceHealth(kmMap);
    }
  }, [vehicles, calculateMaintenanceHealth]);

  // Limpieza automática de items residuales
  useEffect(() => {
    const buggedItems = storeMaintenanceItems.filter(
      item => item.category === "others" && (item.name.includes(",") || item.name.length > 35)
    );
    if (buggedItems.length > 0) {
      buggedItems.forEach(item => deleteMaintenanceItem(item.id));
    }
  }, [storeMaintenanceItems, deleteMaintenanceItem]);

  const openDetail = (data: any) => {
    setSelectedData(data);
    setIsModalOpen(true);
  };

  // Enviar mensaje de recordatorio vía WhatsApp
  const handleSendWhatsAppReminder = (data: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const { vehicle, customer, items, minPercentage } = data;
    const phone = customer?.phone ? customer.phone.replace(/\D/g, "") : "";
    if (!phone) {
      toast.error("El cliente no tiene teléfono registrado.");
      return;
    }

    const criticalItem = items.find((i: any) => i.currentPercentage === minPercentage) || items[0];
    const itemName = criticalItem?.name || "Mantenimiento General";
    const workshopName = currentTenant?.name || "nuestro taller";

    const message = `Hola ${customer?.name || "estimado cliente"}, le saludamos de ${workshopName}. Verificamos en nuestro sistema que su vehículo ${vehicle.brand} ${vehicle.model} (Placa ${vehicle.plate}) requiere atención preventiva en: *${itemName}* (vida útil estimada al ${minPercentage}%). ¿Desea que le reservemos una cita de servicio?`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
    toast.success(`Abriendo WhatsApp para notificar a ${customer?.name || "cliente"}`);
  };

  // Base completa de vehículos con mantenimiento
  const allMaintenanceData = useMemo(() => {
    return vehicles.map(vehicle => {
      const customer = customers.find(c => c.id === vehicle.customerId);
      const items = maintenanceItems.filter(m => m.vehicleId === vehicle.id);

      const minPercentage = items.length > 0
        ? Math.min(...items.map(i => i.currentPercentage))
        : 100;

      // Umbrales calibrados:
      // <= 20%: Crítico (Rojo)
      // 21% - 50%: Preventivo (Ámbar)
      // > 50%: En Orden (Verde)
      let status: "critical" | "preventive" | "healthy" = "healthy";
      if (minPercentage <= 20) status = "critical";
      else if (minPercentage <= 50) status = "preventive";

      return { vehicle, customer, items, minPercentage, status };
    }).filter(data => {
      if (hiddenVehicleIds.has(data.vehicle.id)) return false;
      return data.items.length > 0;
    });
  }, [vehicles, customers, maintenanceItems, hiddenVehicleIds]);

  // Conteo de KPIs globales
  const totalCount = allMaintenanceData.length;
  const criticalCount = useMemo(() => allMaintenanceData.filter(d => d.status === "critical").length, [allMaintenanceData]);
  const preventiveCount = useMemo(() => allMaintenanceData.filter(d => d.status === "preventive").length, [allMaintenanceData]);
  const healthyCount = useMemo(() => allMaintenanceData.filter(d => d.status === "healthy").length, [allMaintenanceData]);

  // Datos filtrados por búsqueda y tab
  const filteredData = useMemo(() => {
    return allMaintenanceData.filter(data => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q ||
        (data.customer?.name && data.customer.name.toLowerCase().includes(q)) ||
        (data.vehicle.plate && data.vehicle.plate.toLowerCase().includes(q)) ||
        `${data.vehicle.brand} ${data.vehicle.model}`.toLowerCase().includes(q) ||
        data.items.some((i: any) => i.name && i.name.toLowerCase().includes(q));

      const matchesFilter = filter === "all" || data.status === filter;
      return matchesSearch && matchesFilter;
    }).sort((a, b) => a.minPercentage - b.minPercentage);
  }, [allMaintenanceData, search, filter]);

  return (
    <div className="space-y-5 pb-16">
      {/* 1. Header Ejecutivo */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 font-heading">
              Control de Mantenimiento
            </h1>
            <Badge variant="outline" className="border-neutral-200 text-neutral-600 bg-white font-mono text-xs font-bold">
              {totalCount} vehículos en seguimiento
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Monitoreo inteligente de vida útil de componentes, alertas por kilometraje y recordatorios a clientes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            className="rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-800 font-semibold text-xs gap-1.5 h-9 px-3.5 cursor-pointer shadow-2xs transition-all"
            onClick={() => router.push(`/${tenant}/reminders`)}
          >
            <Clock className="h-4 w-4 text-neutral-600" />
            <span>Recordatorios WhatsApp</span>
          </Button>

          <Button
            variant="outline"
            className="rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-800 font-semibold text-xs gap-1.5 h-9 px-3.5 cursor-pointer shadow-2xs transition-all"
            onClick={() => router.push(`/${tenant}/customers`)}
          >
            <Car className="h-4 w-4 text-neutral-600" />
            <span>Ver Flota & Clientes</span>
          </Button>
        </div>
      </div>

      {/* 2. Ribbon de 4 KPI Cards Métricas de Mantenimiento */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Monitoreados */}
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={cn(
            "flex flex-col justify-between rounded-2xl border p-4 bg-white shadow-2xs text-left transition-all cursor-pointer group active:scale-[0.98]",
            filter === "all"
              ? "border-neutral-900 ring-1 ring-neutral-900 shadow-xs"
              : "border-neutral-200/80 hover:border-neutral-300 hover:shadow-xs"
          )}
        >
          <div className="flex items-start justify-between gap-2 w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 leading-tight">
              Vehículos Monitoreados
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-neutral-200/80 bg-neutral-100 text-neutral-800 flex-shrink-0 shadow-2xs transition-transform group-hover:scale-105">
              <Car className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 font-mono tabular-nums">
              {totalCount}
            </div>
            <p className="text-[11px] text-neutral-400 font-medium mt-1 truncate">
              {filter === "all" ? "Mostrando todos" : "Flota con plan activo"}
            </p>
          </div>
        </button>

        {/* KPI 2: Críticos */}
        <button
          type="button"
          onClick={() => setFilter("critical")}
          className={cn(
            "flex flex-col justify-between rounded-2xl border p-4 bg-white shadow-2xs text-left transition-all cursor-pointer group active:scale-[0.98]",
            filter === "critical"
              ? "border-rose-900 ring-1 ring-rose-900 shadow-xs"
              : "border-neutral-200/80 hover:border-rose-300 hover:shadow-xs"
          )}
        >
          <div className="flex items-start justify-between gap-2 w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 leading-tight">
              Mantenimiento Crítico
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-200/80 bg-rose-50 text-rose-700 flex-shrink-0 shadow-2xs transition-transform group-hover:scale-105">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black tracking-tight text-rose-700 font-mono tabular-nums">
              {criticalCount}
            </div>
            <p className="text-[11px] text-rose-600/80 font-medium mt-1 truncate">
              Vida útil al 20% o vencida
            </p>
          </div>
        </button>

        {/* KPI 3: Preventivos */}
        <button
          type="button"
          onClick={() => setFilter("preventive")}
          className={cn(
            "flex flex-col justify-between rounded-2xl border p-4 bg-white shadow-2xs text-left transition-all cursor-pointer group active:scale-[0.98]",
            filter === "preventive"
              ? "border-amber-900 ring-1 ring-amber-900 shadow-xs"
              : "border-neutral-200/80 hover:border-amber-300 hover:shadow-xs"
          )}
        >
          <div className="flex items-start justify-between gap-2 w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 leading-tight">
              Avisos Preventivos
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-200/80 bg-amber-50 text-amber-700 flex-shrink-0 shadow-2xs transition-transform group-hover:scale-105">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black tracking-tight text-amber-700 font-mono tabular-nums">
              {preventiveCount}
            </div>
            <p className="text-[11px] text-amber-600/80 font-medium mt-1 truncate">
              Próximos a vencer (21% - 50%)
            </p>
          </div>
        </button>

        {/* KPI 4: En Orden */}
        <button
          type="button"
          onClick={() => setFilter("healthy")}
          className={cn(
            "flex flex-col justify-between rounded-2xl border p-4 bg-white shadow-2xs text-left transition-all cursor-pointer group active:scale-[0.98]",
            filter === "healthy"
              ? "border-emerald-900 ring-1 ring-emerald-900 shadow-xs"
              : "border-neutral-200/80 hover:border-emerald-300 hover:shadow-xs"
          )}
        >
          <div className="flex items-start justify-between gap-2 w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 leading-tight">
              En Estado Óptimo
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-200/80 bg-emerald-50 text-emerald-700 flex-shrink-0 shadow-2xs transition-transform group-hover:scale-105">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black tracking-tight text-emerald-700 font-mono tabular-nums">
              {healthyCount}
            </div>
            <p className="text-[11px] text-emerald-600/80 font-medium mt-1 truncate">
              Componentes sobre el 50%
            </p>
          </div>
        </button>
      </div>

      {/* 3. Barra de Control: Búsqueda, Filtros y Switch de Vista */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-neutral-200/80 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* Switch de Vista: Cuadrícula vs Tabla */}
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
              placeholder="Buscar por cliente, placa, vehículo o servicio..."
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
        </div>

        {/* Pastillas de Filtro de Estado */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: "all" as const, label: "Todos", count: totalCount },
            { id: "critical" as const, label: "Críticos", count: criticalCount, dot: "bg-rose-500", text: "text-rose-700" },
            { id: "preventive" as const, label: "Preventivos", count: preventiveCount, dot: "bg-amber-500", text: "text-amber-700" },
            { id: "healthy" as const, label: "En Orden", count: healthyCount, dot: "bg-emerald-500", text: "text-emerald-700" },
          ].map((tab) => {
            const isSelected = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer",
                  isSelected
                    ? "bg-neutral-900 text-white shadow-xs"
                    : "bg-white text-neutral-600 border border-neutral-200/80 hover:bg-neutral-100 hover:text-neutral-900"
                )}
              >
                {tab.dot && <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", isSelected ? "bg-white" : tab.dot)} />}
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold",
                    isSelected ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-600"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Contenido Principal: Tarjetas vs Tabla */}
      {filteredData.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center shadow-2xs">
          <Car className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-neutral-800">No se encontraron vehículos</p>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            {search || filter !== "all"
              ? "No hay vehículos que coincidan con la búsqueda o filtro seleccionado."
              : "Los vehículos con servicios y mantenimientos registrados aparecerán aquí automáticamente."}
          </p>
          {(search || filter !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSearch(""); setFilter("all"); }}
              className="mt-4 rounded-xl text-xs font-semibold"
            >
              Restablecer Filtros
            </Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* VISTA 1: MODO CUADRÍCULA / TARJETAS REDISEÑADO */
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch">
          {filteredData.map((data) => {
            const { vehicle, customer, items, minPercentage, status } = data;

            const badgeConfig = {
              critical: { badge: "bg-rose-50 text-rose-700 border-rose-200/80", dot: "bg-rose-500", label: "Crítico" },
              preventive: { badge: "bg-amber-50 text-amber-700 border-amber-200/80", dot: "bg-amber-500", label: "Preventivo" },
              healthy: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80", dot: "bg-emerald-500", label: "En Orden" },
            };
            const currentBadge = badgeConfig[status];

            return (
              <div
                key={vehicle.id}
                onClick={() => openDetail(data)}
                className="group relative flex flex-col justify-between rounded-2xl border border-neutral-200/80 bg-white p-4.5 shadow-2xs hover:shadow-xs hover:border-neutral-300 transition-all cursor-pointer"
              >
                <div>
                  {/* Cabecera del Vehículo */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-2xs transition-transform group-hover:scale-105",
                          currentBadge.badge
                        )}
                      >
                        <Car className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm sm:text-base text-neutral-900 group-hover:text-black transition-colors leading-tight truncate">
                          {vehicle.brand} {vehicle.model}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-1">
                          <span className="font-mono bg-neutral-100 text-neutral-700 font-bold px-1.5 py-0.2 rounded text-[11px] uppercase tracking-wide">
                            {vehicle.plate}
                          </span>
                          <span>•</span>
                          <span>{vehicle.year}</span>
                        </div>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-mono font-black border shrink-0",
                        currentBadge.badge
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", currentBadge.dot)} />
                      <span>{minPercentage}%</span>
                    </div>
                  </div>

                  {/* Ficha del Propietario & Kilometraje */}
                  <div className="mt-3.5 flex items-center justify-between rounded-xl bg-neutral-50/80 border border-neutral-100 p-2.5 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <User className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                      <span className="font-semibold text-neutral-800 truncate">
                        {customer?.name || "Sin propietario"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {vehicle.km != null && (
                        <span className="font-mono font-bold text-neutral-600 bg-white px-1.5 py-0.5 rounded border border-neutral-200/70 text-[10px]">
                          {vehicle.km.toLocaleString("es-DO")} km
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Lista de Componentes / Servicios Principales */}
                  <div className="mt-4 space-y-3">
                    {items.slice(0, 3).map((item: any) => {
                      const itemPct = item.currentPercentage;
                      const isItemCrit = itemPct <= 20;
                      const isItemPrev = itemPct > 20 && itemPct <= 50;

                      return (
                        <div key={item.id} className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold gap-2">
                            <div className="flex items-center gap-1.5 min-w-0 truncate">
                              <span className="text-neutral-900 uppercase tracking-wider text-[10px]">
                                {CATEGORY_LABELS[item.category] || "Mantenimiento"}
                              </span>
                              <span className="text-neutral-400 font-normal truncate text-[10px]">
                                · {item.name}
                              </span>
                            </div>
                            <span
                              className={cn(
                                "font-mono font-bold shrink-0 text-[11px]",
                                isItemCrit
                                  ? "text-rose-600"
                                  : isItemPrev
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                              )}
                            >
                              {itemPct}%
                            </span>
                          </div>

                          {/* Barra de Progreso */}
                          <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                isItemCrit
                                  ? "bg-rose-500"
                                  : isItemPrev
                                  ? "bg-amber-400"
                                  : "bg-emerald-500"
                              )}
                              style={{ width: `${Math.min(100, Math.max(3, itemPct))}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {items.length > 3 && (
                      <p className="text-[10px] text-center text-neutral-400 font-medium pt-0.5">
                        +{items.length - 3} componentes adicionales en monitoreo
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer de Acciones Rápidas */}
                <div
                  className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold h-8.5 gap-1 cursor-pointer shadow-2xs"
                    onClick={() => openDetail(data)}
                  >
                    <span>Ver Detalle</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>

                  {/* Notificar por WhatsApp */}
                  {customer?.phone && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={(e) => handleSendWhatsAppReminder(data, e)}
                      title="Enviar recordatorio por WhatsApp"
                      className="rounded-xl h-8.5 w-8.5 border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-700 cursor-pointer shadow-2xs"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => openHistory(vehicle)}
                    title="Ver Historial de Mantenimientos"
                    className="rounded-xl h-8.5 w-8.5 border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-600 cursor-pointer shadow-2xs"
                  >
                    <History className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleDeleteVehicle(vehicle.id)}
                    title="Eliminar registro de mantenimiento"
                    className="rounded-xl h-8.5 w-8.5 border-neutral-200 bg-white hover:bg-rose-50 text-neutral-400 hover:text-rose-600 cursor-pointer shadow-2xs"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISTA 2: MODO LISTA / TABLA EJECUTIVA */
        <div className="rounded-2xl border border-neutral-200/80 bg-white overflow-hidden shadow-2xs">
          <Table>
            <TableHeader className="bg-neutral-50/80">
              <TableRow className="border-neutral-200/80">
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 pl-6">Vehículo & Placa</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Propietario / Cliente</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Kilometraje</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Salud Mínima</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Componente Crítico</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Estado</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 text-right pr-6">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((data) => {
                const { vehicle, customer, items, minPercentage, status } = data;
                const criticalItem = items.find((i: any) => i.currentPercentage === minPercentage) || items[0];

                const badgeConfig = {
                  critical: { badge: "bg-rose-50 text-rose-700 border-rose-200/80", dot: "bg-rose-500", label: "Crítico" },
                  preventive: { badge: "bg-amber-50 text-amber-700 border-amber-200/80", dot: "bg-amber-500", label: "Preventivo" },
                  healthy: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80", dot: "bg-emerald-500", label: "En Orden" },
                };
                const currentBadge = badgeConfig[status];

                return (
                  <TableRow
                    key={vehicle.id}
                    onClick={() => openDetail(data)}
                    className="hover:bg-neutral-50/60 border-neutral-100 transition-colors cursor-pointer"
                  >
                    <TableCell className="pl-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border", currentBadge.badge)}>
                          <Car className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-neutral-900 leading-tight">
                            {vehicle.brand} {vehicle.model}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-mono mt-0.5">
                            <span className="font-bold text-neutral-700 bg-neutral-100 px-1.5 py-0.2 rounded">
                              {vehicle.plate}
                            </span>
                            <span>·</span>
                            <span>{vehicle.year}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-3.5">
                      <p className="font-semibold text-xs text-neutral-900">{customer?.name || "Sin cliente"}</p>
                      {customer?.phone && (
                        <p className="text-[11px] text-neutral-400 font-mono mt-0.5">{customer.phone}</p>
                      )}
                    </TableCell>

                    <TableCell className="py-3.5 font-mono text-xs text-neutral-700 font-bold">
                      {vehicle.km != null ? `${vehicle.km.toLocaleString("es-DO")} km` : "—"}
                    </TableCell>

                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-2 max-w-[120px]">
                        <div className="h-1.5 flex-1 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              minPercentage <= 20
                                ? "bg-rose-500"
                                : minPercentage <= 50
                                ? "bg-amber-400"
                                : "bg-emerald-500"
                            )}
                            style={{ width: `${Math.min(100, Math.max(3, minPercentage))}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-xs tabular-nums text-neutral-900 shrink-0">
                          {minPercentage}%
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="py-3.5 text-xs text-neutral-700">
                      <div className="font-medium text-xs truncate max-w-[160px]">
                        {criticalItem?.name || "General"}
                      </div>
                      <span className="text-[10px] text-neutral-400 uppercase tracking-wide">
                        {CATEGORY_LABELS[criticalItem?.category] || "Mantenimiento"}
                      </span>
                    </TableCell>

                    <TableCell className="py-3.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border",
                          currentBadge.badge
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", currentBadge.dot)} />
                        <span>{currentBadge.label}</span>
                      </span>
                    </TableCell>

                    <TableCell className="pr-6 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {customer?.phone && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleSendWhatsAppReminder(data, e)}
                            title="Enviar WhatsApp"
                            className="h-8 w-8 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => openHistory(vehicle)}
                          title="Historial"
                          className="h-8 w-8 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
                        >
                          <History className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteVehicle(vehicle.id)}
                          title="Eliminar"
                          className="h-8 w-8 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50"
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

      {/* Modales de Detalle e Historial */}
      <MaintenanceDetailModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        data={selectedData}
      />

      <VehicleMaintenanceHistoryModal
        isOpen={historyOpen}
        onOpenChange={setHistoryOpen}
        vehicle={historyVehicle}
      />

      {/* AlertDialog para confirmar eliminación de mantenimiento */}
      <AlertDialog open={!!vehicleToDelete} onOpenChange={(open) => !open && setVehicleToDelete(null)}>
        <AlertDialogContent className="rounded-3xl border-neutral-200 bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-neutral-900">
              ¿Eliminar registro de mantenimiento?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-neutral-500 leading-relaxed">
              Esta acción eliminará los componentes de seguimiento de mantenimiento para este vehículo. No afectará los datos del vehículo ni del cliente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl text-xs font-semibold">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteVehicle}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs"
            >
              Sí, Eliminar Mantenimiento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
