"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  ReceiptText,
  Clock,
  Search,
  Wrench,
  AlertCircle,
  CheckCircle2,
  PackageCheck,
  ChevronRight,
  TrendingUp,
  Calendar,
  Layers,
} from "lucide-react";
import { useRouter } from "@/lib/next-compat";

interface DashboardChartsProps {
  orders: any[];
  invoices: any[];
  statusColors?: Record<string, string>;
  statusLabels?: Record<string, string>;
  tenantSlug?: string;
}

const defaultStatusConfig: Record<
  string,
  { label: string; color: string; barColor: string; icon: typeof Clock }
> = {
  pending: {
    label: "Pendientes",
    color: "bg-neutral-100 text-neutral-800 border-neutral-200",
    barColor: "#a3a3a3",
    icon: Clock,
  },
  diagnosing: {
    label: "En Diagnóstico",
    color: "bg-amber-50 text-amber-800 border-amber-200/90",
    barColor: "#f59e0b",
    icon: Search,
  },
  repairing: {
    label: "En Reparación",
    color: "bg-blue-50 text-blue-800 border-blue-200/90",
    barColor: "#3b82f6",
    icon: Wrench,
  },
  waiting_parts: {
    label: "Esperando Piezas",
    color: "bg-rose-50 text-rose-800 border-rose-200/90",
    barColor: "#f43f5e",
    icon: AlertCircle,
  },
  finished: {
    label: "Finalizadas",
    color: "bg-emerald-50 text-emerald-800 border-emerald-200/90",
    barColor: "#10b981",
    icon: CheckCircle2,
  },
  delivered: {
    label: "Entregadas",
    color: "bg-neutral-900 text-white border-neutral-900",
    barColor: "#171717",
    icon: PackageCheck,
  },
};

export default function DashboardCharts({
  orders,
  invoices,
  tenantSlug,
}: DashboardChartsProps) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [timeframe, setTimeframe] = useState<"7d" | "30d">("7d");

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 200);
    return () => clearTimeout(timer);
  }, []);

  // Compute Active Orders & Status Breakdown
  const totalOrders = orders.length;
  const activeOrders = useMemo(
    () => orders.filter((o) => !["delivered", "invoiced"].includes(o.status)),
    [orders]
  );

  const statusList = [
    "pending",
    "diagnosing",
    "repairing",
    "waiting_parts",
    "finished",
  ];

  const statusStats = useMemo(() => {
    return statusList.map((st) => {
      const cfg = defaultStatusConfig[st] || defaultStatusConfig.pending;
      const count = orders.filter((o) => o.status === st).length;
      const pct = activeOrders.length > 0 ? Math.round((count / activeOrders.length) * 100) : 0;
      return {
        key: st,
        label: cfg.label,
        count,
        pct,
        icon: cfg.icon,
        barColor: cfg.barColor,
        color: cfg.color,
      };
    });
  }, [orders, activeOrders.length]);

  // Compute Revenue Chart Data
  const chartData = useMemo(() => {
    const daysCount = timeframe === "7d" ? 7 : 30;
    const daysNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const now = new Date();

    const data = Array.from({ length: daysCount }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (daysCount - 1 - i));
      d.setHours(0, 0, 0, 0);

      const next = new Date(d);
      next.setDate(next.getDate() + 1);

      const matchingInvoices = invoices.filter((inv) => {
        const t = new Date(inv.createdAt);
        return t >= d && t < next && inv.status === "paid";
      });

      const total = matchingInvoices.reduce((acc, inv) => acc + (inv.total || 0), 0);
      const dayLabel = daysCount === 7 ? daysNames[d.getDay()] : `${d.getDate()}/${d.getMonth() + 1}`;
      const fullDate = d.toLocaleDateString("es-DO", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });

      return {
        name: dayLabel,
        fullDate,
        total,
        count: matchingInvoices.length,
      };
    });

    const totalRevenue = data.reduce((acc, d) => acc + d.total, 0);
    const maxDay = data.reduce((prev, curr) => (curr.total > prev.total ? curr : prev), data[0] || { total: 0, fullDate: "" });
    const dailyAverage = Math.round(totalRevenue / daysCount);

    return {
      points: data,
      totalRevenue,
      dailyAverage,
      maxDay,
      hasRevenue: totalRevenue > 0,
    };
  }, [invoices, timeframe]);

  const handleStatusClick = (statusKey: string) => {
    if (tenantSlug) {
      router.push(`/${tenantSlug}/orders?tab=${statusKey}`);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-7">
      {/* 1. Bar Chart: Ingresos Facturados */}
      <Card className="lg:col-span-4 rounded-3xl border border-neutral-200/80 bg-white shadow-2xs overflow-hidden">
        <CardHeader className="p-5 sm:p-6 pb-2 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-neutral-900" />
              <CardTitle className="text-base font-bold text-neutral-900 tracking-tight">
                Ingresos Facturados
              </CardTitle>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Facturación confirmada en caja ({timeframe === "7d" ? "Últimos 7 días" : "Últimos 30 días"})
            </p>
          </div>

          {/* Timeframe Switcher */}
          <div className="flex rounded-xl border border-neutral-200/90 overflow-hidden bg-neutral-100/60 p-0.5">
            <button
              type="button"
              onClick={() => setTimeframe("7d")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                timeframe === "7d"
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900"
              )}
            >
              7 Días
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("30d")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                timeframe === "30d"
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900"
              )}
            >
              30 Días
            </button>
          </div>
        </CardHeader>

        {/* Resumen numérico sobre el gráfico */}
        <div className="px-5 sm:px-6 pt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-2xl bg-neutral-50/80 border border-neutral-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono">
              Total Periodo
            </p>
            <p className="text-lg font-bold text-neutral-900 font-mono tabular-nums mt-0.5">
              RD$ {chartData.totalRevenue.toLocaleString("es-DO")}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-neutral-50/80 border border-neutral-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono">
              Promedio Diario
            </p>
            <p className="text-lg font-bold text-neutral-900 font-mono tabular-nums mt-0.5">
              RD$ {chartData.dailyAverage.toLocaleString("es-DO")}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-neutral-50/80 border border-neutral-100 col-span-2 sm:col-span-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono">
              Pico Más Alto
            </p>
            <p className="text-lg font-bold text-neutral-900 font-mono tabular-nums mt-0.5 truncate">
              {chartData.maxDay.total > 0
                ? `RD$ ${chartData.maxDay.total.toLocaleString("es-DO")}`
                : "—"}
            </p>
          </div>
        </div>

        <CardContent className="p-5 sm:p-6 pt-4" style={{ height: 260, minHeight: 1, width: "100%" }}>
          {chartData.hasRevenue && isMounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.points} barGap={4} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dy={6}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
                />
                <Tooltip
                  cursor={{ fill: "rgba(0,0,0,0.03)", radius: 8 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-2xl border border-neutral-200 bg-neutral-900 p-3 text-white shadow-xl">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono">
                            {data.fullDate}
                          </p>
                          <p className="text-base font-bold font-mono mt-0.5">
                            RD$ {Number(data.total).toLocaleString("es-DO")}
                          </p>
                          <p className="text-[11px] text-neutral-300 mt-0.5">
                            {data.count} factura{data.count !== 1 ? "s" : ""} cobrada{data.count !== 1 ? "s" : ""}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="total"
                  fill="#171717"
                  radius={[6, 6, 2, 2]}
                  barSize={timeframe === "7d" ? 30 : 12}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2">
              <div className="h-12 w-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400">
                <ReceiptText className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-neutral-800">Sin ventas en este periodo</p>
              <p className="text-xs text-neutral-400 max-w-xs">
                Los cobros registrados desde el módulo de POS aparecerán graficados aquí en tiempo real.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Command Center: Estado Operativo y Bahías de Taller */}
      <Card className="lg:col-span-3 rounded-3xl border border-neutral-200/80 bg-white shadow-2xs overflow-hidden flex flex-col justify-between">
        <CardHeader className="p-5 sm:p-6 pb-3 border-b border-neutral-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-neutral-700" />
                <CardTitle className="text-base font-bold text-neutral-900 tracking-tight">
                  Flujo del Taller
                </CardTitle>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Estado de bahías y vehículos en servicio
              </p>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800 font-mono border border-neutral-200">
              {activeOrders.length} activas
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 flex-1 space-y-3.5">
          {activeOrders.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center justify-center gap-2">
              <div className="h-12 w-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="text-sm font-semibold text-neutral-800">Bahías despejadas</p>
              <p className="text-xs text-neutral-400 max-w-xs">
                No hay órdenes activas pendientes en taller en este momento.
              </p>
            </div>
          ) : (
            statusStats.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleStatusClick(item.key)}
                  className="w-full text-left group p-2.5 rounded-2xl border border-neutral-100 hover:border-neutral-300 hover:bg-neutral-50/60 transition-all cursor-pointer active:scale-[0.99] space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-100 text-neutral-800 group-hover:scale-105 transition-transform">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-bold text-neutral-800 group-hover:text-neutral-950">
                        {item.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-neutral-900">
                        {item.count} {item.count === 1 ? "vehículo" : "vehículos"}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-neutral-400 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>

                  {/* Barra de progreso de la etapa */}
                  <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${item.pct}%`,
                        backgroundColor: item.barColor,
                      }}
                    />
                  </div>
                </button>
              );
            })
          )}
        </CardContent>

        {/* Footer con Link Directo */}
        <div className="p-4 px-6 bg-neutral-50/70 border-t border-neutral-100 flex items-center justify-between">
          <span className="text-xs text-neutral-500 font-medium">
            {totalOrders} órdenes registradas históricamente
          </span>
          <button
            type="button"
            onClick={() => router.push(`/${tenantSlug || ""}/orders`)}
            className="text-xs font-bold text-neutral-900 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Ver Tablero Kanban</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </Card>
    </div>
  );
}
