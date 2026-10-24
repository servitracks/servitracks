"use client";

import { useState, useMemo } from "react";
import {
  Wrench,
  Car,
  TrendingUp,
  X,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Eye,
  EyeOff,
  MousePointerClick,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PeriodoCreacion =
  | "todas"
  | "hoy"
  | "ayer"
  | "esta_semana"
  | "semana_pasada"
  | "este_mes"
  | "mes_pasado"
  | "personalizado";

export interface UnifiedWorkshopOrder {
  id: string;
  numero: string;
  source: "invoice" | "work_order";
  invoiceId?: string;
  workOrderId?: string;
  createdAt: string;
  deliveredAt?: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerRnc?: string;
  vehicleId?: string;
  vehicleLabel?: string;
  vehiclePlate?: string;
  mechanicId?: string;
  mechanicName?: string;
  workshopStatus:
    | "pending"
    | "diagnosing"
    | "repairing"
    | "waiting_parts"
    | "finished"
    | "delivered"
    | "invoiced"
    | "cancelled";
  paymentStatus: "paid" | "pending" | "cancelled";
  paymentMethod: string;
  condicionCobro?: string;
  referencia?: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paidAmount: number;
  pendingAmount: number;
  itemsCount: number;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    tax: number;
    isService?: boolean;
  }>;
  ncf?: string;
  qrUrl?: string;
  securityCode?: string;
  signatureDate?: string;
  isEcf: boolean;
  ecfStatus: "accepted" | "traditional" | "none" | "cancelled";
  ecfTypeLabel?: string;
  pdfCloudUrl?: string;
  xmlCloudUrl?: string;
  trackId?: string;
  creditNoteNcf?: string;
  creditNoteAmount?: number;
  debitNoteNcf?: string;
  debitNoteAmount?: number;
  notesText?: string;
  rawNotes?: string;
}

export interface OrdenesDailyMetricsCardsProps {
  ordenes: UnifiedWorkshopOrder[];
  periodoCreacion: PeriodoCreacion;
  filtroEstado: string;
  customFechaDesde?: string;
  customFechaHasta?: string;
  onFilterPeriodo: (periodo: PeriodoCreacion, customDate?: string) => void;
  onFilterEstado: (estado: string) => void;
  onResetFilter: () => void;
}

type TimeframeOption = "7d" | "10d" | "15d";

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseOrderDateKey(dateStr?: string): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return toLocalDateKey(d);
}

function isTodayKey(dateKey: string): boolean {
  return dateKey === toLocalDateKey(new Date());
}

function isYesterdayKey(dateKey: string): boolean {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return dateKey === toLocalDateKey(y);
}

function isThisWeekKey(d: Date): boolean {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const startOfWeek = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + diffToMonday,
    0,
    0,
    0,
    0
  );
  const endOfWeek = new Date(
    startOfWeek.getFullYear(),
    startOfWeek.getMonth(),
    startOfWeek.getDate() + 6,
    23,
    59,
    59,
    999
  );
  return d >= startOfWeek && d <= endOfWeek;
}

export function OrdenesDailyMetricsCards({
  ordenes,
  periodoCreacion,
  filtroEstado,
  customFechaDesde,
  onFilterPeriodo,
  onFilterEstado,
  onResetFilter,
}: OrdenesDailyMetricsCardsProps) {
  const [timeframeRecibidos, setTimeframeRecibidos] = useState<TimeframeOption>("7d");
  const [timeframeEntregados, setTimeframeEntregados] = useState<TimeframeOption>("7d");

  const STORAGE_KEY = "servitracks_ordenes_daily_metrics_collapsed";

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage error
      }
      return next;
    });
  };

  const generateDays = (tf: TimeframeOption) => {
    const count = tf === "7d" ? 7 : tf === "10d" ? 10 : 15;
    const days = [];
    const now = new Date();
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = toLocalDateKey(d);
      const rawDay = d.toLocaleDateString("es-DO", { weekday: "short" });
      const dayName = rawDay ? rawDay.charAt(0).toUpperCase() + rawDay.slice(1).replace(".", "") : "";
      const rawFull = d.toLocaleDateString("es-DO", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
      const fullDateFormatted = rawFull ? rawFull.charAt(0).toUpperCase() + rawFull.slice(1) : "";
      days.push({
        date: d,
        key,
        dayNum: d.getDate(),
        dayName,
        fullDateFormatted,
        isToday: isTodayKey(key),
        isYesterday: isYesterdayKey(key),
        isThisWeek: isThisWeekKey(d),
      });
    }
    return days;
  };

  const daysRecibidos = useMemo(() => generateDays(timeframeRecibidos), [timeframeRecibidos]);
  const daysEntregados = useMemo(() => generateDays(timeframeEntregados), [timeframeEntregados]);

  const statsRecibidos = useMemo(() => {
    const map: Record<string, number> = {};
    const itemsMap: Record<string, number> = {};
    let hoy = 0;
    let itemsHoy = 0;
    let ayer = 0;
    let itemsAyer = 0;
    let estaSemana = 0;
    let itemsEstaSemana = 0;
    let ecfHoy = 0;

    const todayKey = toLocalDateKey(new Date());
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayKey = toLocalDateKey(yesterdayDate);

    for (const o of ordenes) {
      if (o.workshopStatus === "cancelled" || o.paymentStatus === "cancelled") continue;
      const k = parseOrderDateKey(o.createdAt);
      if (!k) continue;

      const countItems = Math.max(1, o.itemsCount || 1);
      map[k] = (map[k] || 0) + 1;
      itemsMap[k] = (itemsMap[k] || 0) + countItems;

      if (k === todayKey) {
        hoy++;
        itemsHoy += countItems;
        if (o.isEcf) ecfHoy++;
      }
      if (k === yesterdayKey) {
        ayer++;
        itemsAyer += countItems;
      }

      const d = new Date(o.createdAt);
      if (!isNaN(d.getTime()) && isThisWeekKey(d)) {
        estaSemana++;
        itemsEstaSemana += countItems;
      }
    }

    return { map, itemsMap, hoy, itemsHoy, ayer, itemsAyer, estaSemana, itemsEstaSemana, ecfHoy };
  }, [ordenes]);

  const statsEntregados = useMemo(() => {
    const map: Record<string, number> = {};
    const ecfMap: Record<string, number> = {};
    let hoy = 0;
    let ecfHoy = 0;
    let ayer = 0;
    let ecfAyer = 0;
    let estaSemana = 0;
    let ecfEstaSemana = 0;

    const todayKey = toLocalDateKey(new Date());
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayKey = toLocalDateKey(yesterdayDate);

    for (const o of ordenes) {
      const isCompleted =
        o.workshopStatus === "delivered" ||
        o.workshopStatus === "invoiced" ||
        o.workshopStatus === "finished";
      if (!isCompleted) continue;

      const targetDateStr = o.deliveredAt || o.signatureDate || o.createdAt;
      const k = parseOrderDateKey(targetDateStr);
      if (!k) continue;

      map[k] = (map[k] || 0) + 1;
      if (o.isEcf) ecfMap[k] = (ecfMap[k] || 0) + 1;

      if (k === todayKey) {
        hoy++;
        if (o.isEcf) ecfHoy++;
      }
      if (k === yesterdayKey) {
        ayer++;
        if (o.isEcf) ecfAyer++;
      }

      const d = new Date(targetDateStr);
      if (!isNaN(d.getTime()) && isThisWeekKey(d)) {
        estaSemana++;
        if (o.isEcf) ecfEstaSemana++;
      }
    }

    return { map, ecfMap, hoy, ecfHoy, ayer, ecfAyer, estaSemana, ecfEstaSemana };
  }, [ordenes]);

  const maxRecibidos = useMemo(() => {
    const counts = daysRecibidos.map((d) => statsRecibidos.map[d.key] || 0);
    return Math.max(...counts, 1);
  }, [daysRecibidos, statsRecibidos]);

  const maxEntregados = useMemo(() => {
    const counts = daysEntregados.map((d) => statsEntregados.map[d.key] || 0);
    return Math.max(...counts, 1);
  }, [daysEntregados, statsEntregados]);

  const hasActiveFilter =
    periodoCreacion !== "todas" || filtroEstado !== "todos" || Boolean(customFechaDesde);

  return (
    <div className="mb-4">
      {/* Barra superior colapsable */}
      <div className="mb-3 rounded-2xl border border-neutral-200/90 bg-white p-2.5 sm:px-4 sm:py-3 shadow-2xs transition-all hover:border-neutral-400">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div
            onClick={toggleCollapsed}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
            title={isCollapsed ? "Clic para ver las gráficas" : "Clic para ocultar las gráficas"}
          >
            <div className="h-10 w-10 rounded-xl bg-neutral-900 text-amber-400 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <BarChart3 className="h-4.5 w-4.5 stroke-[2.5]" />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-xs sm:text-sm text-neutral-900 tracking-tight uppercase">
                Flujo diario de órdenes y taller
              </span>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-neutral-900" />
                  Hoy: <strong>{statsRecibidos.hoy}</strong> Rec. ({statsRecibidos.itemsHoy} ítems)
                </span>

                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Hoy: <strong>{statsEntregados.hoy}</strong> Entregadas
                </span>

                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                  Hoy: <strong>{statsRecibidos.ecfHoy}</strong> e-CF DGII
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilter && (
              <button
                type="button"
                onClick={onResetFilter}
                className="inline-flex items-center gap-1.5 h-9 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 rounded-xl transition-all cursor-pointer shadow-2xs"
              >
                <span>Filtro activo</span>
                <X className="h-3 w-3 stroke-[2.5]" />
              </button>
            )}

            <button
              type="button"
              onClick={toggleCollapsed}
              className={cn(
                "flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95",
                isCollapsed
                  ? "bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-900"
                  : "bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200"
              )}
            >
              {isCollapsed ? (
                <>
                  <Eye className="h-3.5 w-3.5 text-amber-400" />
                  <span>Mostrar gráficas</span>
                  <ChevronDown className="h-3.5 w-3.5 text-amber-400" />
                </>
              ) : (
                <>
                  <EyeOff className="h-3.5 w-3.5 text-neutral-500" />
                  <span>Ocultar</span>
                  <ChevronUp className="h-3.5 w-3.5 text-neutral-500" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Gráficas expandidas */}
      {!isCollapsed && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* TARJETA 1: ÓRDENES RECIBIDAS / FACTURADAS POR DÍA */}
          <div className="relative overflow-hidden rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Wrench className="h-4.5 w-4.5 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs sm:text-sm font-black text-neutral-900 uppercase tracking-tight">
                        Órdenes e Ingresos por Día
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                        Recepción y POS
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 flex items-center gap-1 mt-0.5">
                      <MousePointerClick className="h-3 w-3 text-neutral-400 shrink-0" />
                      <span>Haz clic en una barra o período para filtrar la tabla</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center rounded-xl bg-neutral-100 p-0.5 border border-neutral-200 shrink-0">
                  {(["7d", "10d", "15d"] as TimeframeOption[]).map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setTimeframeRecibidos(tf)}
                      className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer",
                        timeframeRecibidos === tf
                          ? "bg-neutral-900 text-white shadow-2xs"
                          : "text-neutral-500 hover:text-neutral-900"
                      )}
                    >
                      {tf.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resumen rápido: Hoy / Ayer / Esta Semana */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => onFilterPeriodo(periodoCreacion === "hoy" ? "todas" : "hoy")}
                  className={cn(
                    "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                    periodoCreacion === "hoy"
                      ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                      : "bg-neutral-50/80 hover:bg-neutral-100 border-neutral-200/80 text-neutral-900"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn("text-[10px] font-bold uppercase", periodoCreacion === "hoy" ? "text-neutral-300" : "text-neutral-500")}>
                      Hoy
                    </span>
                    <TrendingUp className={cn("h-3 w-3", periodoCreacion === "hoy" ? "text-amber-400" : "text-neutral-400")} />
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-lg font-black tabular-nums">{statsRecibidos.hoy}</span>
                    <span className={cn("text-[10px] font-semibold", periodoCreacion === "hoy" ? "text-neutral-300" : "text-neutral-500")}>
                      ({statsRecibidos.itemsHoy} ítems)
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onFilterPeriodo(periodoCreacion === "ayer" ? "todas" : "ayer")}
                  className={cn(
                    "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                    periodoCreacion === "ayer"
                      ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                      : "bg-neutral-50/80 hover:bg-neutral-100 border-neutral-200/80 text-neutral-900"
                  )}
                >
                  <span className={cn("text-[10px] font-bold uppercase block", periodoCreacion === "ayer" ? "text-neutral-300" : "text-neutral-500")}>
                    Ayer
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-lg font-black tabular-nums">{statsRecibidos.ayer}</span>
                    <span className={cn("text-[10px] font-semibold", periodoCreacion === "ayer" ? "text-neutral-300" : "text-neutral-500")}>
                      ({statsRecibidos.itemsAyer} ítems)
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onFilterPeriodo(periodoCreacion === "esta_semana" ? "todas" : "esta_semana")}
                  className={cn(
                    "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                    periodoCreacion === "esta_semana"
                      ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                      : "bg-neutral-50/80 hover:bg-neutral-100 border-neutral-200/80 text-neutral-900"
                  )}
                >
                  <span className={cn("text-[10px] font-bold uppercase block", periodoCreacion === "esta_semana" ? "text-neutral-300" : "text-neutral-500")}>
                    Esta Semana
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-lg font-black tabular-nums">{statsRecibidos.estaSemana}</span>
                    <span className={cn("text-[10px] font-semibold", periodoCreacion === "esta_semana" ? "text-neutral-300" : "text-neutral-500")}>
                      ({statsRecibidos.itemsEstaSemana} ítems)
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Gráfico de barras por día */}
            <div className="pt-2 border-t border-neutral-100">
              <div className="grid gap-1.5 items-end h-28 pt-4" style={{ gridTemplateColumns: `repeat(${daysRecibidos.length}, minmax(0, 1fr))` }}>
                {daysRecibidos.map((day) => {
                  const count = statsRecibidos.map[day.key] || 0;
                  const items = statsRecibidos.itemsMap[day.key] || 0;
                  const heightPct = count > 0 ? Math.max(18, Math.round((count / maxRecibidos) * 100)) : 8;
                  const isSelectedDay = periodoCreacion === "personalizado" && customFechaDesde === day.key;

                  return (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => {
                        if (isSelectedDay) onFilterPeriodo("todas");
                        else onFilterPeriodo("personalizado", day.key);
                      }}
                      title={`${day.fullDateFormatted}: ${count} órdenes (${items} servicios/repuestos)`}
                      className="group flex flex-col items-center justify-end h-full cursor-pointer focus:outline-none"
                    >
                      <span
                        className={cn(
                          "text-[10px] font-black tabular-nums mb-1 transition-transform group-hover:-translate-y-0.5",
                          isSelectedDay
                            ? "text-amber-600 scale-110"
                            : count > 0
                            ? "text-neutral-900"
                            : "text-neutral-300"
                        )}
                      >
                        {count}
                      </span>
                      <div className="w-full flex justify-center items-end h-16">
                        <div
                          style={{ height: `${heightPct}%` }}
                          className={cn(
                            "w-full max-w-[26px] rounded-t-lg transition-all duration-300",
                            isSelectedDay
                              ? "bg-amber-500 ring-2 ring-amber-300 shadow-xs"
                              : day.isToday
                              ? "bg-neutral-900 group-hover:bg-neutral-700"
                              : count > 0
                              ? "bg-neutral-300 group-hover:bg-neutral-500"
                              : "bg-neutral-100 group-hover:bg-neutral-200"
                          )}
                        />
                      </div>
                      <span
                        className={cn(
                          "mt-1 text-[9.5px] font-bold truncate max-w-full",
                          day.isToday || isSelectedDay ? "text-neutral-900 font-black" : "text-neutral-400"
                        )}
                      >
                        {day.dayName} {day.dayNum}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* TARJETA 2: VEHÍCULOS ENTREGADOS Y COMPROBANTES E-CF POR DÍA */}
          <div className="relative overflow-hidden rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Car className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs sm:text-sm font-black text-neutral-900 uppercase tracking-tight">
                        Entregas y Timbrados e-CF
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        DGII / EF2
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                      <span>Órdenes finalizadas, entregadas y facturadas electrónicamente</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center rounded-xl bg-neutral-100 p-0.5 border border-neutral-200 shrink-0">
                  {(["7d", "10d", "15d"] as TimeframeOption[]).map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setTimeframeEntregados(tf)}
                      className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer",
                        timeframeEntregados === tf
                          ? "bg-emerald-600 text-white shadow-2xs"
                          : "text-neutral-500 hover:text-neutral-900"
                      )}
                    >
                      {tf.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resumen rápido: Hoy / Ayer / Esta Semana */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => {
                    onFilterEstado("entregadas");
                    onFilterPeriodo(periodoCreacion === "hoy" ? "todas" : "hoy");
                  }}
                  className={cn(
                    "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                    filtroEstado === "entregadas" && periodoCreacion === "hoy"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-emerald-50/50 hover:bg-emerald-50 border-emerald-200/70 text-neutral-900"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn("text-[10px] font-bold uppercase", filtroEstado === "entregadas" && periodoCreacion === "hoy" ? "text-emerald-100" : "text-emerald-800")}>
                      Hoy
                    </span>
                    <ShieldCheck className={cn("h-3 w-3", filtroEstado === "entregadas" && periodoCreacion === "hoy" ? "text-white" : "text-emerald-600")} />
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-lg font-black tabular-nums">{statsEntregados.hoy}</span>
                    <span className={cn("text-[10px] font-semibold", filtroEstado === "entregadas" && periodoCreacion === "hoy" ? "text-emerald-100" : "text-emerald-700")}>
                      ({statsEntregados.ecfHoy} e-CF)
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onFilterEstado("entregadas");
                    onFilterPeriodo(periodoCreacion === "ayer" ? "todas" : "ayer");
                  }}
                  className={cn(
                    "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                    filtroEstado === "entregadas" && periodoCreacion === "ayer"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-emerald-50/50 hover:bg-emerald-50 border-emerald-200/70 text-neutral-900"
                  )}
                >
                  <span className={cn("text-[10px] font-bold uppercase block", filtroEstado === "entregadas" && periodoCreacion === "ayer" ? "text-emerald-100" : "text-emerald-800")}>
                    Ayer
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-lg font-black tabular-nums">{statsEntregados.ayer}</span>
                    <span className={cn("text-[10px] font-semibold", filtroEstado === "entregadas" && periodoCreacion === "ayer" ? "text-emerald-100" : "text-emerald-700")}>
                      ({statsEntregados.ecfAyer} e-CF)
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onFilterEstado("entregadas");
                    onFilterPeriodo(periodoCreacion === "esta_semana" ? "todas" : "esta_semana");
                  }}
                  className={cn(
                    "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                    filtroEstado === "entregadas" && periodoCreacion === "esta_semana"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-emerald-50/50 hover:bg-emerald-50 border-emerald-200/70 text-neutral-900"
                  )}
                >
                  <span className={cn("text-[10px] font-bold uppercase block", filtroEstado === "entregadas" && periodoCreacion === "esta_semana" ? "text-emerald-100" : "text-emerald-800")}>
                    Esta Semana
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-lg font-black tabular-nums">{statsEntregados.estaSemana}</span>
                    <span className={cn("text-[10px] font-semibold", filtroEstado === "entregadas" && periodoCreacion === "esta_semana" ? "text-emerald-100" : "text-emerald-700")}>
                      ({statsEntregados.ecfEstaSemana} e-CF)
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Gráfico de barras por día */}
            <div className="pt-2 border-t border-neutral-100">
              <div className="grid gap-1.5 items-end h-28 pt-4" style={{ gridTemplateColumns: `repeat(${daysEntregados.length}, minmax(0, 1fr))` }}>
                {daysEntregados.map((day) => {
                  const count = statsEntregados.map[day.key] || 0;
                  const ecfCount = statsEntregados.ecfMap[day.key] || 0;
                  const heightPct = count > 0 ? Math.max(18, Math.round((count / maxEntregados) * 100)) : 8;
                  const isSelectedDay = periodoCreacion === "personalizado" && customFechaDesde === day.key;

                  return (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => {
                        if (isSelectedDay) onFilterPeriodo("todas");
                        else onFilterPeriodo("personalizado", day.key);
                      }}
                      title={`${day.fullDateFormatted}: ${count} completadas (${ecfCount} timbradas con e-CF)`}
                      className="group flex flex-col items-center justify-end h-full cursor-pointer focus:outline-none"
                    >
                      <span
                        className={cn(
                          "text-[10px] font-black tabular-nums mb-1 transition-transform group-hover:-translate-y-0.5",
                          isSelectedDay
                            ? "text-amber-600 scale-110"
                            : count > 0
                            ? "text-emerald-700"
                            : "text-neutral-300"
                        )}
                      >
                        {count}
                      </span>
                      <div className="w-full flex justify-center items-end h-16">
                        <div
                          style={{ height: `${heightPct}%` }}
                          className={cn(
                            "w-full max-w-[26px] rounded-t-lg transition-all duration-300",
                            isSelectedDay
                              ? "bg-amber-500 ring-2 ring-amber-300 shadow-xs"
                              : day.isToday
                              ? "bg-emerald-600 group-hover:bg-emerald-500"
                              : count > 0
                              ? "bg-emerald-300 group-hover:bg-emerald-500"
                              : "bg-neutral-100 group-hover:bg-neutral-200"
                          )}
                        />
                      </div>
                      <span
                        className={cn(
                          "mt-1 text-[9.5px] font-bold truncate max-w-full",
                          day.isToday || isSelectedDay ? "text-emerald-800 font-black" : "text-neutral-400"
                        )}
                      >
                        {day.dayName} {day.dayNum}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
