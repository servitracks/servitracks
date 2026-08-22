"use client";

import { useState, useEffect } from "react";
import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip,
  Line, LineChart, Cell, Pie, PieChart, Legend, Area, AreaChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, PieChart as PieIcon, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

const PIE_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#64748b"];

interface ChartTimePoint {
  name: string;
  ingresos: number;
  egresos: number;
  neto: number;
}

interface ReportChartsProps {
  timeSeriesData: ChartTimePoint[];
  topProducts: { name: string; qty: number; revenue: number }[];
  statusData: { name: string; value: number }[];
  paymentData: { name: string; value: number }[];
  periodLabel: string;
}

export default function ReportCharts({
  timeSeriesData,
  topProducts,
  statusData,
  paymentData,
  periodLabel,
}: ReportChartsProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const totalPeriodRevenue = timeSeriesData.reduce((sum, d) => sum + d.ingresos, 0);
  const totalPeriodExpenses = timeSeriesData.reduce((sum, d) => sum + d.egresos, 0);

  return (
    <div className="space-y-6">
      {/* Dynamic Revenue & Expenses Area / Line Chart */}
      <Card className="border border-neutral-200/80 shadow-xs rounded-3xl bg-white p-5 sm:p-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-neutral-100">
          <div>
            <CardTitle className="text-base sm:text-lg font-black text-neutral-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Flujo Financiero en Vivo ({periodLabel})
            </CardTitle>
            <p className="text-xs text-neutral-500 font-medium mt-0.5">
              Comparativa de ingresos cobrados vs. egresos de caja registrados
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-200/70">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Ingresos: RD$ {totalPeriodRevenue.toLocaleString("es-DO")}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 text-rose-800 font-bold text-xs border border-rose-200/70">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              Gastos: RD$ {totalPeriodExpenses.toLocaleString("es-DO")}
            </span>
          </div>
        </div>

        <div className="h-[280px] w-full pt-4">
          {isMounted ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={timeSeriesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorEgresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "16px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                  formatter={(v: any, name: any) => [
                    `RD$ ${Number(v || 0).toLocaleString("es-DO")}`,
                    name === "ingresos" ? "Ingresos Cobrados" : name === "egresos" ? "Gastos Operativos" : "Ganancia Neta",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="ingresos"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorIngresos)"
                />
                <Area
                  type="monotone"
                  dataKey="egresos"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorEgresos)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-neutral-400 animate-pulse">
              Cargando gráfico...
            </div>
          )}
        </div>
      </Card>

      {/* 2-Column Auxiliary Charts */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Top Repuestos & Servicios */}
        <Card className="lg:col-span-3 border border-neutral-200/80 shadow-xs rounded-3xl bg-white p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div>
                <CardTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-neutral-700" />
                  Top Repuestos & Servicios Más Rentables
                </CardTitle>
                <p className="text-xs text-neutral-500 font-medium mt-0.5">Ranking por volumen de facturación</p>
              </div>
            </div>

            <div className="h-[250px] w-full pt-3">
              {topProducts.length === 0 ? (
                <div className="flex items-center justify-center h-full text-neutral-400 text-xs font-medium">
                  Sin ventas registradas en el período.
                </div>
              ) : isMounted ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={topProducts} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <XAxis
                      type="number"
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#475569"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={130}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: "14px", border: "1px solid #e2e8f0", fontSize: "12px", fontWeight: 600 }}
                      formatter={(v: any) => [`RD$ ${Number(v || 0).toLocaleString("es-DO")}`, "Facturación"]}
                    />
                    <Bar dataKey="revenue" fill="#0f172a" radius={[0, 6, 6, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </div>
        </Card>

        {/* Distribución de Cobros y Métodos */}
        <Card className="lg:col-span-2 border border-neutral-200/80 shadow-xs rounded-3xl bg-white p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div>
                <CardTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <PieIcon className="h-4 w-4 text-neutral-700" />
                  Métodos de Cobro
                </CardTitle>
                <p className="text-xs text-neutral-500 font-medium mt-0.5">Distribución en el período</p>
              </div>
            </div>

            <div className="w-full pt-2">
              {paymentData.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-neutral-400 text-xs font-medium">
                  Sin cobros registrados.
                </div>
              ) : isMounted ? (
                <ResponsiveContainer width="100%" height={230} minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie
                      data={paymentData}
                      cx="50%"
                      cy="48%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {paymentData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: "14px", border: "1px solid #e2e8f0", fontSize: "12px", fontWeight: 600 }}
                      formatter={(v: any) => [`RD$ ${Number(v || 0).toLocaleString("es-DO")}`, "Monto"]}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(v) => <span className="text-xs text-neutral-700 font-semibold">{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
