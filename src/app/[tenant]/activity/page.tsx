"use client";

import { useState, useMemo } from "react";
import { useStore, ActivityLog } from "@/store/useStore";
import { useParams } from "@/lib/next-compat";
import { format, isToday, isThisWeek, isThisMonth, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  History,
  User,
  Activity,
  Search,
  ShieldAlert,
  ShoppingCart,
  Wrench,
  Package,
  Settings,
  Wallet,
  Calendar,
  Clock,
  Download,
  Filter,
  LayoutList,
  List,
  UserCheck,
  Users,
  Layers,
  X,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const roleColors: Record<string, { badge: string; dot: string; label: string }> = {
  owner: { badge: "bg-purple-50 text-purple-700 border-purple-200/80", dot: "bg-purple-500", label: "Dueño" },
  admin: { badge: "bg-purple-50 text-purple-700 border-purple-200/80", dot: "bg-purple-500", label: "Administrador" },
  superadmin: { badge: "bg-purple-50 text-purple-700 border-purple-200/80", dot: "bg-purple-500", label: "Super Admin" },
  cashier: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80", dot: "bg-emerald-500", label: "Cajero" },
  mechanic: { badge: "bg-blue-50 text-blue-700 border-blue-200/80", dot: "bg-blue-500", label: "Mecánico" },
  receptionist: { badge: "bg-amber-50 text-amber-700 border-amber-200/80", dot: "bg-amber-500", label: "Recepción" },
  warehouse: { badge: "bg-indigo-50 text-indigo-700 border-indigo-200/80", dot: "bg-indigo-500", label: "Almacén" },
};

const moduleConfig: Record<string, { badge: string; icon: any; label: string }> = {
  POS: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80", icon: ShoppingCart, label: "Facturación POS" },
  ORDENES: { badge: "bg-blue-50 text-blue-700 border-blue-200/80", icon: Wrench, label: "Órdenes de Trabajo" },
  INVENTARIO: { badge: "bg-amber-50 text-amber-700 border-amber-200/80", icon: Package, label: "Inventario" },
  CAJA: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80", icon: Wallet, label: "Control de Caja" },
  AJUSTES: { badge: "bg-purple-50 text-purple-700 border-purple-200/80", icon: Settings, label: "Ajustes / Usuarios" },
  CRM: { badge: "bg-cyan-50 text-cyan-700 border-cyan-200/80", icon: User, label: "Clientes & Vehículos" },
  MANTENIMIENTO: { badge: "bg-slate-100 text-slate-700 border-slate-200/80", icon: Activity, label: "Mantenimiento" },
};

export default function ActivityLogPage() {
  const params = useParams();
  const tenantSlug = params?.tenant as string;
  const tenants = useStore((s) => s.tenants);
  const currentTenant = tenants.find((t) => t.slug === tenantSlug);
  const tenantId = currentTenant?.id;
  
  const allLogs = useStore((s) => s.activityLogs);
  
  // Incluimos todos los logs correspondientes a este tenant
  const logs = useMemo(() => {
    return allLogs.filter((l) => !tenantId || l.tenantId === tenantId);
  }, [allLogs, tenantId]);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [datePeriod, setDatePeriod] = useState<"all" | "today" | "week" | "month">("all");
  const [viewMode, setViewMode] = useState<"feed" | "table">("feed");

  // Filtro compuesto
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch = !q ||
        (log.details && log.details.toLowerCase().includes(q)) ||
        (log.userName && log.userName.toLowerCase().includes(q)) ||
        (log.action && log.action.toLowerCase().includes(q));

      const matchesRole = selectedRole === "all" || log.userRole === selectedRole;
      const matchesModule = selectedModule === "all" || log.module === selectedModule;

      let matchesDate = true;
      if (datePeriod !== "all" && log.createdAt) {
        const logDate = parseISO(log.createdAt);
        if (datePeriod === "today") matchesDate = isToday(logDate);
        else if (datePeriod === "week") matchesDate = isThisWeek(logDate, { weekStartsOn: 1 });
        else if (datePeriod === "month") matchesDate = isThisMonth(logDate);
      }

      return matchesSearch && matchesRole && matchesModule && matchesDate;
    });
  }, [logs, searchTerm, selectedRole, selectedModule, datePeriod]);

  // Métricas KPI
  const logsToday = useMemo(() => {
    return logs.filter((l) => l.createdAt && isToday(parseISO(l.createdAt))).length;
  }, [logs]);

  const activeUsersCount = useMemo(() => {
    const users = new Set(logs.map((l) => l.userName || l.userId));
    return users.size;
  }, [logs]);

  const topModule = useMemo(() => {
    if (logs.length === 0) return { name: "Ninguno", count: 0 };
    const counts: Record<string, number> = {};
    logs.forEach((l) => {
      counts[l.module] = (counts[l.module] || 0) + 1;
    });
    let maxMod = "POS";
    let maxCount = 0;
    Object.entries(counts).forEach(([mod, cnt]) => {
      if (cnt > maxCount) {
        maxCount = cnt;
        maxMod = mod;
      }
    });
    return { name: moduleConfig[maxMod]?.label || maxMod, count: maxCount };
  }, [logs]);

  // Agrupación para la vista de Feed por Fecha
  const groupedLogs = useMemo(() => {
    const groups: { label: string; logs: ActivityLog[] }[] = [];
    const map = new Map<string, ActivityLog[]>();

    filteredLogs.forEach((log) => {
      let key = "Anteriores";
      if (log.createdAt) {
        const d = parseISO(log.createdAt);
        if (isToday(d)) {
          key = "Hoy";
        } else {
          key = format(d, "EEEE, d 'de' MMMM yyyy", { locale: es });
          key = key.charAt(0).toUpperCase() + key.slice(1);
        }
      }

      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(log);
    });

    map.forEach((items, label) => {
      groups.push({ label, logs: items });
    });

    return groups;
  }, [filteredLogs]);

  // Exportar a CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error("No hay registros para exportar con los filtros actuales");
      return;
    }

    const headers = ["ID", "Fecha y Hora", "Usuario", "Rol", "Módulo", "Acción", "Detalles"];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.createdAt ? format(parseISO(l.createdAt), "yyyy-MM-dd HH:mm:ss") : "",
      `"${(l.userName || "").replace(/"/g, '""')}"`,
      roleColors[l.userRole]?.label || l.userRole,
      l.module,
      l.action,
      `"${(l.details || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `auditoria_actividad_${format(new Date(), "yyyyMMdd_HHmm")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Registro de actividad exportado a CSV exitosamente");
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedRole("all");
    setSelectedModule("all");
    setDatePeriod("all");
  };

  const isFiltered = searchTerm !== "" || selectedRole !== "all" || selectedModule !== "all" || datePeriod !== "all";

  return (
    <div className="space-y-5">
      {/* 1. Header Ejecutivo */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 font-heading">
              Registro de Actividad & Auditoría
            </h1>
            <Badge variant="outline" className="border-neutral-200 text-neutral-600 bg-white font-mono text-xs font-bold">
              {logs.length} eventos
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Trazabilidad inmutable de operaciones, facturación, órdenes, movimientos de caja e inventario.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-800 font-semibold text-xs gap-1.5 h-9 px-3.5 cursor-pointer shadow-2xs transition-all"
          >
            <Download className="h-4 w-4 text-neutral-600" />
            <span>Exportar CSV</span>
          </Button>

          {isFiltered && (
            <Button
              variant="outline"
              onClick={handleResetFilters}
              className="rounded-xl border border-neutral-200 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-xs gap-1.5 h-9 px-3 cursor-pointer shadow-2xs transition-all"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Limpiar Filtros</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Ribbon de 4 KPI Cards Métricas de Auditoría */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Total Eventos */}
        <div className="flex flex-col justify-between rounded-2xl border border-neutral-200/80 p-4 bg-white shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-start justify-between gap-2 w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 leading-tight">
              Total Operaciones
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-neutral-200/80 bg-neutral-100 text-neutral-800 flex-shrink-0 shadow-2xs">
              <History className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 font-mono tabular-nums">
              {logs.length}
            </div>
            <p className="text-[11px] text-neutral-400 font-medium mt-1 truncate">
              Eventos históricos guardados
            </p>
          </div>
        </div>

        {/* KPI 2: Actividad Hoy */}
        <div className="flex flex-col justify-between rounded-2xl border border-neutral-200/80 p-4 bg-white shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-start justify-between gap-2 w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 leading-tight">
              Actividad Hoy
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-200/80 bg-emerald-50 text-emerald-700 flex-shrink-0 shadow-2xs">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 font-mono tabular-nums">
              {logsToday}
            </div>
            <p className="text-[11px] text-neutral-400 font-medium mt-1 truncate">
              Operaciones registradas hoy
            </p>
          </div>
        </div>

        {/* KPI 3: Usuarios Activos */}
        <div className="flex flex-col justify-between rounded-2xl border border-neutral-200/80 p-4 bg-white shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-start justify-between gap-2 w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 leading-tight">
              Usuarios Activos
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-blue-200/80 bg-blue-50 text-blue-700 flex-shrink-0 shadow-2xs">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 font-mono tabular-nums">
              {activeUsersCount}
            </div>
            <p className="text-[11px] text-neutral-400 font-medium mt-1 truncate">
              Colaboradores con actividad
            </p>
          </div>
        </div>

        {/* KPI 4: Módulo Principal */}
        <div className="flex flex-col justify-between rounded-2xl border border-neutral-200/80 p-4 bg-white shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-start justify-between gap-2 w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 leading-tight">
              Área con Más Flujo
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-purple-200/80 bg-purple-50 text-purple-700 flex-shrink-0 shadow-2xs">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-lg sm:text-xl font-black tracking-tight text-neutral-900 truncate">
              {topModule.name}
            </div>
            <p className="text-[11px] text-neutral-400 font-medium mt-1 truncate font-mono">
              {topModule.count} operaciones auditadas
            </p>
          </div>
        </div>
      </div>

      {/* 3. Barra de Control: Búsqueda, Filtros y Switch de Vista */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-neutral-200/80 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* Switch de Vista: Feed vs Tabla */}
          <div className="flex rounded-xl border border-neutral-200/90 overflow-hidden bg-white p-0.5 shadow-2xs shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("feed")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                viewMode === "feed"
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              )}
              title="Línea de tiempo"
            >
              <LayoutList className="h-3.5 w-3.5" />
              <span>Línea de Tiempo</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                viewMode === "table"
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              )}
              title="Tabla detallada"
            >
              <List className="h-3.5 w-3.5" />
              <span>Tabla de Auditoría</span>
            </button>
          </div>

          {/* Campo de Búsqueda */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <Input
              type="text"
              placeholder="Buscar por usuario, acción o detalle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8.5 pr-8 h-9 text-xs rounded-xl bg-neutral-50/70 border-neutral-200/80 focus:bg-white focus:border-neutral-400 transition-all placeholder:text-neutral-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filtro por Rol */}
          <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v || "all")}>
            <SelectTrigger className="w-38 h-9 rounded-xl border-neutral-200/80 bg-neutral-50/70 text-xs font-semibold text-neutral-700 shrink-0">
              <User className="h-3.5 w-3.5 mr-1.5 text-neutral-400 shrink-0" />
              <span className="truncate">
                {selectedRole === "all" ? "Todos los Roles" : roleColors[selectedRole]?.label || selectedRole}
              </span>
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-neutral-200 shadow-lg text-xs">
              <SelectItem value="all" className="cursor-pointer">Todos los Roles</SelectItem>
              <SelectItem value="owner" className="cursor-pointer">Dueño / Admin</SelectItem>
              <SelectItem value="cashier" className="cursor-pointer">Cajero</SelectItem>
              <SelectItem value="receptionist" className="cursor-pointer">Recepción</SelectItem>
              <SelectItem value="mechanic" className="cursor-pointer">Mecánico</SelectItem>
              <SelectItem value="warehouse" className="cursor-pointer">Almacén</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro por Módulo */}
          <Select value={selectedModule} onValueChange={(v) => setSelectedModule(v || "all")}>
            <SelectTrigger className="w-42 h-9 rounded-xl border-neutral-200/80 bg-neutral-50/70 text-xs font-semibold text-neutral-700 shrink-0">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-neutral-400 shrink-0" />
              <span className="truncate">
                {selectedModule === "all" ? "Todas las Áreas" : moduleConfig[selectedModule]?.label || selectedModule}
              </span>
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-neutral-200 shadow-lg text-xs">
              <SelectItem value="all" className="cursor-pointer">Todas las Áreas</SelectItem>
              <SelectItem value="POS" className="cursor-pointer">Facturación POS</SelectItem>
              <SelectItem value="ORDENES" className="cursor-pointer">Órdenes de Trabajo</SelectItem>
              <SelectItem value="INVENTARIO" className="cursor-pointer">Inventario</SelectItem>
              <SelectItem value="CAJA" className="cursor-pointer">Control de Caja</SelectItem>
              <SelectItem value="AJUSTES" className="cursor-pointer">Ajustes / Usuarios</SelectItem>
              <SelectItem value="CRM" className="cursor-pointer">Clientes & Vehículos</SelectItem>
              <SelectItem value="MANTENIMIENTO" className="cursor-pointer">Mantenimiento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-xs font-medium text-neutral-500 shrink-0 text-right pr-1">
          Mostrando <span className="font-mono font-bold text-neutral-900">{filteredLogs.length}</span> de {logs.length}
        </div>
      </div>

      {/* 4. Pastillas de Período de Tiempo */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: "all" as const, label: "Todo el Historial" },
          { id: "today" as const, label: "Solo Hoy" },
          { id: "week" as const, label: "Esta Semana" },
          { id: "month" as const, label: "Este Mes" },
        ].map((tab) => {
          const isSelected = datePeriod === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDatePeriod(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer",
                isSelected
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "bg-white text-neutral-600 border border-neutral-200/80 hover:bg-neutral-100 hover:text-neutral-900"
              )}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 5. Contenido Principal: Feed Cronológico vs Tabla */}
      {filteredLogs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center shadow-2xs">
          <ShieldAlert className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-neutral-800">No hay registros de actividad</p>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            {isFiltered
              ? "No se encontraron operaciones que coincidan con los filtros seleccionados."
              : "Las acciones de tus colaboradores aparecerán aquí en tiempo real a medida que utilicen el sistema."}
          </p>
          {isFiltered && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="mt-4 rounded-xl text-xs font-semibold"
            >
              Restablecer Filtros
            </Button>
          )}
        </div>
      ) : viewMode === "feed" ? (
        /* VISTA 1: FEED CRONOLÓGICO ELEGANTE */
        <div className="space-y-6">
          {groupedLogs.map((group) => (
            <div key={group.label} className="space-y-3">
              {/* Encabezado del Grupo de Fecha */}
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-neutral-700 bg-neutral-100/90 border border-neutral-200/80 px-2.5 py-0.5 rounded-lg shadow-2xs">
                  {group.label}
                </span>
                <span className="text-[11px] text-neutral-400 font-mono">
                  {group.logs.length} {group.logs.length === 1 ? "evento" : "eventos"}
                </span>
                <div className="h-px bg-neutral-200/70 flex-1" />
              </div>

              {/* Lista de Eventos */}
              <div className="space-y-2.5">
                {group.logs.map((log) => {
                  const mod = moduleConfig[log.module] || {
                    badge: "bg-neutral-100 text-neutral-700 border-neutral-200",
                    icon: Activity,
                    label: log.module,
                  };
                  const ModIcon = mod.icon;
                  const roleConf = roleColors[log.userRole] || {
                    badge: "bg-neutral-100 text-neutral-700 border-neutral-200",
                    dot: "bg-neutral-400",
                    label: log.userRole,
                  };

                  return (
                    <div
                      key={log.id}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border border-neutral-200/80 bg-white shadow-2xs hover:shadow-xs hover:border-neutral-300 transition-all"
                    >
                      <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                        {/* Avatar con icono del módulo */}
                        <div
                          className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs transition-transform group-hover:scale-105",
                            mod.badge
                          )}
                        >
                          <ModIcon className="h-5 w-5" />
                        </div>

                        {/* Contenido del Evento */}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm text-neutral-900 leading-tight">
                              {log.userName}
                            </span>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[10px] font-semibold border",
                                roleConf.badge
                              )}
                            >
                              <span className={cn("h-1.5 w-1.5 rounded-full", roleConf.dot)} />
                              <span>{roleConf.label}</span>
                            </span>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[10px] font-bold border",
                                mod.badge
                              )}
                            >
                              <span>{mod.label}</span>
                            </span>
                          </div>

                          <p className="text-xs text-neutral-700 font-medium mt-1 leading-relaxed">
                            {log.details}
                          </p>
                        </div>
                      </div>

                      {/* Metadatos a la derecha: Hora y Tag de Acción */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100 text-right">
                        <time className="text-[11px] font-mono text-neutral-400 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-neutral-400" />
                          <span>
                            {log.createdAt
                              ? format(parseISO(log.createdAt), "dd MMM, HH:mm:ss", { locale: es })
                              : "—"}
                          </span>
                        </time>
                        <span className="font-mono text-[10px] text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200/70">
                          {log.action}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* VISTA 2: TABLA DE AUDITORÍA FORMAL */
        <div className="rounded-2xl border border-neutral-200/80 bg-white overflow-hidden shadow-2xs">
          <Table>
            <TableHeader className="bg-neutral-50/80">
              <TableRow className="border-neutral-200/80">
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 pl-6">Fecha & Hora</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Usuario & Rol</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Área / Módulo</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Acción</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 pr-6">Detalles de la Operación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => {
                const mod = moduleConfig[log.module] || {
                  badge: "bg-neutral-100 text-neutral-700 border-neutral-200",
                  icon: Activity,
                  label: log.module,
                };
                const ModIcon = mod.icon;
                const roleConf = roleColors[log.userRole] || {
                  badge: "bg-neutral-100 text-neutral-700 border-neutral-200",
                  dot: "bg-neutral-400",
                  label: log.userRole,
                };

                return (
                  <TableRow key={log.id} className="hover:bg-neutral-50/60 border-neutral-100 transition-colors">
                    <TableCell className="pl-6 py-3.5 font-mono text-xs text-neutral-600 whitespace-nowrap">
                      {log.createdAt ? (
                        <div>
                          <div className="font-semibold text-neutral-900">
                            {format(parseISO(log.createdAt), "dd/MM/yyyy")}
                          </div>
                          <div className="text-[11px] text-neutral-400">
                            {format(parseISO(log.createdAt), "HH:mm:ss")}
                          </div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>

                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center text-[10px] font-bold font-mono shrink-0 shadow-2xs">
                          {(log.userName || "U").substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-neutral-900">{log.userName}</p>
                          <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium", roleConf.badge)}>
                            <span className={cn("h-1 w-1 rounded-full", roleConf.dot)} />
                            <span>{roleConf.label}</span>
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-3.5">
                      <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold border", mod.badge)}>
                        <ModIcon className="h-3 w-3" />
                        <span>{mod.label}</span>
                      </span>
                    </TableCell>

                    <TableCell className="py-3.5 font-mono text-xs">
                      <span className="bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-md border border-neutral-200 text-[11px] font-semibold">
                        {log.action}
                      </span>
                    </TableCell>

                    <TableCell className="pr-6 py-3.5 text-xs text-neutral-700 leading-relaxed font-medium">
                      {log.details}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
