"use client";

import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip,
  Line, LineChart, Cell, Pie, PieChart, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight } from "lucide-react";

const monthlyRevenue = [
  { name: "Ene", total: 145000 }, { name: "Feb", total: 162000 },
  { name: "Mar", total: 138000 }, { name: "Abr", total: 189000 },
  { name: "May", total: 210000 }, { name: "Jun", total: 175000 },
  { name: "Jul", total: 230000 }, { name: "Ago", total: 215000 },
  { name: "Sep", total: 198000 }, { name: "Oct", total: 240000 },
  { name: "Nov", total: 265000 }, { name: "Dic", total: 290000 },
];

const PIE_COLORS = ["#000", "#52525b", "#a1a1aa", "#d4d4d8"];

interface ReportChartsProps {
  topProducts: { name: string; qty: number; revenue: number }[];
  statusData: { name: string; value: number }[];
}

export default function ReportCharts({ topProducts, statusData }: ReportChartsProps) {
  return (
    <>
      {/* Revenue line chart */}
      <Card className="border-neutral-100 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Ingresos Mensuales 2026</CardTitle>
              <p className="text-xs text-neutral-400 mt-0.5">Proyección anual completa</p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700 border-none rounded-full gap-1">
              <ArrowUpRight className="h-3 w-3" /> +22% vs 2025
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <LineChart data={monthlyRevenue}>
              <XAxis dataKey="name" stroke="#aaa" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#aaa" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid #f0f0f0", boxShadow: "0 10px 20px -5px rgba(0,0,0,0.1)", fontSize: "12px" }}
                formatter={(v: any) => [`RD$ ${Number(v || 0).toLocaleString("es-DO")}`, "Ingresos"]}
              />
              <Line type="monotone" dataKey="total" stroke="#000" strokeWidth={2.5}
                dot={{ fill: "#000", r: 3 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Bottom charts */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3 border-neutral-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Top Productos / Servicios</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px] w-full">
            {topProducts.length === 0 ? (
              <div className="flex items-center justify-center h-full text-neutral-400 text-sm">Sin datos de ventas.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={topProducts} layout="vertical">
                  <XAxis type="number" stroke="#aaa" fontSize={11} tickLine={false} axisLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" stroke="#aaa" fontSize={10} tickLine={false} axisLine={false} width={150} />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid #f0f0f0", fontSize: "12px" }}
                    formatter={(v: any) => [`RD$ ${Number(v || 0).toLocaleString("es-DO")}`, "Ingresos"]}
                  />
                  <Bar dataKey="revenue" fill="#000" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-neutral-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Estado de Órdenes</CardTitle>
          </CardHeader>
          <CardContent className="w-full">
            {statusData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-neutral-400 text-sm">Sin órdenes.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value">
                    {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #f0f0f0", fontSize: "12px" }} />
                  <Legend iconType="circle" iconSize={8}
                    formatter={(v) => <span className="text-xs text-neutral-600">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
