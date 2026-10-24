"use client";

import { useState, useEffect } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  Legend,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  DollarSign,
  PieChart as PieIcon,
  BarChart3,
  Wrench,
  Package,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { formatRD } from "@/lib/utils";

export interface MonthlyPoint {
  month: string;
  ingresos: number;
  egresos: number;
  neto: number;
}

export interface PaymentMethodPoint {
  name: string;
  value: number;
  count: number;
  color: string;
}

export interface ProductPoint {
  name: string;
  qty: number;
  revenue: number;
  type?: "servicio" | "repuesto";
}

export interface OrderStatusPoint {
  name: string;
  value: number;
  color: string;
}

interface ReportChartsProps {
  monthlyComparison: MonthlyPoint[];
  paymentMethodData: PaymentMethodPoint[];
  topProducts: ProductPoint[];
  statusData: OrderStatusPoint[];
}

export default function ReportCharts({
  monthlyComparison,
  paymentMethodData,
  topProducts,
  statusData,
}: ReportChartsProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [chartMetric, setChartMetric] = useState<"ingresos" | "neto">("ingresos");

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const totalYearIngresos = monthlyComparison.reduce((sum, m) => sum + m.ingresos, 0);
  const totalYearEgresos = monthlyComparison.reduce((sum, m) => sum + m.egresos, 0);
  const totalYearNeto = totalYearIngresos - totalYearEgresos;

  return (
    <div className="space-y-6">
      {/* 1. GRÁFICO PRINCIPAL: FLUJO FINANCIERO MENSUAL (INGRESOS VS EGRESOS) */}
      <Card className="border border-neutral-200/80 bg-white shadow-2xs rounded-2xl overflow-hidden">
        <CardHeader className="p-5 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="font-heading text-base font-bold text-neutral-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-neutral-900" />
                Evolución de Ingresos y Egresos Operativos
              </CardTitle>
              <Badge
                variant="outline"
                className="text-[10px] font-semibold bg-neutral-100 text-neutral-800 border-neutral-200"
              >
                Año en Curso
              </Badge>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Comparativa mensual del dinero facturado frente a los desembolsos de caja y nóminas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-neutral-200/80 bg-neutral-100/70 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setChartMetric("ingresos")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  chartMetric === "ingresos"
                    ? "bg-neutral-900 text-white shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                Ingresos vs Egresos
              </button>
              <button
                type="button"
                onClick={() => setChartMetric("neto")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  chartMetric === "neto"
                    ? "bg-neutral-900 text-white shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                Margen Neto
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          <div className="h-[300px] w-full">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                {chartMetric === "ingresos" ? (
                  <AreaChart data={monthlyComparison} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0f172a" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#0f172a" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorEgresos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#dc2626" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#dc2626" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="month"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const ing = Number(payload[0]?.value || 0);
                          const egr = Number(payload[1]?.value || 0);
                          const balance = ing - egr;
                          return (
                            <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-xl text-xs space-y-1.5 min-w-[170px]">
                              <p className="font-bold text-neutral-900 border-b border-neutral-100 pb-1">
                                {label}
                              </p>
                              <div className="flex justify-between items-center text-neutral-700">
                                <span className="flex items-center gap-1.5">
                                  <span className="h-2 w-2 rounded-full bg-neutral-900 inline-block" />
                                  Ingresos:
                                </span>
                                <span className="font-mono font-bold text-neutral-900">
                                  {formatRD(ing)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-neutral-700">
                                <span className="flex items-center gap-1.5">
                                  <span className="h-2 w-2 rounded-full bg-rose-600 inline-block" />
                                  Egresos:
                                </span>
                                <span className="font-mono font-bold text-rose-600">
                                  {formatRD(egr)}
                                </span>
                              </div>
                              <div className="border-t border-neutral-100 pt-1 flex justify-between items-center font-bold">
                                <span>Margen:</span>
                                <span
                                  className={`font-mono ${
                                    balance >= 0 ? "text-emerald-700" : "text-rose-700"
                                  }`}
                                >
                                  {formatRD(balance)}
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="ingresos"
                      name="Ingresos"
                      stroke="#0f172a"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorIngresos)"
                    />
                    <Area
                      type="monotone"
                      dataKey="egresos"
                      name="Egresos"
                      stroke="#dc2626"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorEgresos)"
                    />
                  </AreaChart>
                ) : (
                  <AreaChart data={monthlyComparison} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorNeto" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#166534" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#166534" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="month"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                        fontSize: "12px",
                      }}
                      formatter={(v: any) => [formatRD(Number(v || 0)), "Margen Neto"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="neto"
                      name="Margen Neto"
                      stroke="#166534"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorNeto)"
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-neutral-100 text-center">
            <div className="p-2 rounded-xl bg-neutral-50 border border-neutral-200/60">
              <span className="text-[10px] font-bold uppercase text-neutral-500 block">
                Total Facturado Anual
              </span>
              <span className="font-heading font-black text-sm text-neutral-900 font-mono tabular-nums">
                {formatRD(totalYearIngresos)}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-neutral-50 border border-neutral-200/60">
              <span className="text-[10px] font-bold uppercase text-neutral-500 block">
                Total Egresos de Caja
              </span>
              <span className="font-heading font-black text-sm text-neutral-900 font-mono tabular-nums">
                {formatRD(totalYearEgresos)}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-neutral-50 border border-neutral-200/60">
              <span className="text-[10px] font-bold uppercase text-neutral-500 block">
                Rentabilidad Neta Anual
              </span>
              <span
                className={`font-heading font-black text-sm font-mono tabular-nums ${
                  totalYearNeto >= 0 ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {formatRD(totalYearNeto)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. FILA INFERIOR: TOP VENTAS + MÉTODOS DE PAGO + ESTADO DE ÓRDENES */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* TOP PRODUCTOS Y SERVICIOS */}
        <Card className="lg:col-span-6 border border-neutral-200/80 bg-white shadow-2xs rounded-2xl overflow-hidden">
          <CardHeader className="p-5 border-b border-neutral-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-heading text-sm font-bold text-neutral-900 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-neutral-900" />
                Top Ítems Más Vendidos (Facturación)
              </CardTitle>
              <p className="text-xs text-neutral-400">Servicios de taller y repuestos con mayor recaudación</p>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            {topProducts.length === 0 ? (
              <div className="flex items-center justify-center h-52 text-neutral-400 text-xs">
                Sin datos de facturación en el período seleccionado.
              </div>
            ) : isMounted ? (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={120}
                      tickFormatter={(val) => (val.length > 18 ? `${val.substring(0, 16)}...` : val)}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px",
                      }}
                      formatter={(v: any) => [formatRD(Number(v || 0)), "Facturado"]}
                    />
                    <Bar dataKey="revenue" fill="#0f172a" radius={[0, 6, 6, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* DISTRIBUCIÓN DE MÉTODOS DE PAGO */}
        <Card className="lg:col-span-3 border border-neutral-200/80 bg-white shadow-2xs rounded-2xl overflow-hidden">
          <CardHeader className="p-5 border-b border-neutral-100">
            <CardTitle className="font-heading text-sm font-bold text-neutral-900 flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-neutral-900" />
              Métodos de Pago
            </CardTitle>
            <p className="text-xs text-neutral-400">Distribución de cobros</p>
          </CardHeader>
          <CardContent className="p-5 flex flex-col items-center justify-center">
            {paymentMethodData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-neutral-400 text-xs">
                Sin cobros registrados.
              </div>
            ) : isMounted ? (
              <div className="h-[250px] w-full flex flex-col items-center">
                <ResponsiveContainer width="100%" height={170} minWidth={1} minHeight={1}>
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {paymentMethodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        fontSize: "11px",
                      }}
                      formatter={(v: any) => [formatRD(Number(v || 0)), "Total"]}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="w-full space-y-1.5 pt-2 border-t border-neutral-100">
                  {paymentMethodData.map((m) => (
                    <div key={m.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-neutral-600 font-medium">
                        <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: m.color }} />
                        {m.name}
                      </span>
                      <span className="font-mono font-bold text-neutral-900">{formatRD(m.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* ESTADO OPERATIVO DE ÓRDENES */}
        <Card className="lg:col-span-3 border border-neutral-200/80 bg-white shadow-2xs rounded-2xl overflow-hidden">
          <CardHeader className="p-5 border-b border-neutral-100">
            <CardTitle className="font-heading text-sm font-bold text-neutral-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-neutral-900" />
              Órdenes de Trabajo
            </CardTitle>
            <p className="text-xs text-neutral-400">Embudo del taller</p>
          </CardHeader>
          <CardContent className="p-5 flex flex-col items-center justify-center">
            {statusData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-neutral-400 text-xs">
                Sin órdenes en taller.
              </div>
            ) : isMounted ? (
              <div className="h-[250px] w-full flex flex-col items-center">
                <ResponsiveContainer width="100%" height={170} minWidth={1} minHeight={1}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        fontSize: "11px",
                      }}
                      formatter={(v: any) => [`${v} órdenes`, "Cantidad"]}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="w-full space-y-1.5 pt-2 border-t border-neutral-100">
                  {statusData.map((s) => (
                    <div key={s.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-neutral-600 font-medium">
                        <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                        {s.name}
                      </span>
                      <span className="font-mono font-bold text-neutral-900">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
