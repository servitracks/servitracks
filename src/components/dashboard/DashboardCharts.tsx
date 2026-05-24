"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";
import { ReceiptText } from "lucide-react";

interface DashboardChartsProps {
  orders: any[];
  invoices: any[];
  statusColors: Record<string, string>;
  statusLabels: Record<string, string>;
}

export default function DashboardCharts({ orders, invoices, statusColors, statusLabels }: DashboardChartsProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const statusCounts = Object.keys(statusLabels).map((s) => ({
    status: s,
    label: statusLabels[s],
    count: orders.filter((o) => o.status === s).length,
  }));
  const totalOrders = orders.length;

  // Build real weekly revenue from invoices (last 7 days)
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const total = invoices
      .filter((inv) => {
        const t = new Date(inv.createdAt);
        return t >= d && t < next && inv.status === "paid";
      })
      .reduce((acc, inv) => acc + (inv.total || 0), 0);
    return { name: days[d.getDay()], total };
  });

  const hasRevenue = weeklyData.some((d) => d.total > 0);

  return (
    <div className="grid gap-6 lg:grid-cols-7">
      {/* Bar chart */}
      <Card className="lg:col-span-4 border-neutral-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Ingresos Semanales</CardTitle>
          <p className="text-xs text-neutral-400">Últimos 7 días</p>
        </CardHeader>
        <CardContent className="pb-4" style={{ height: 280, minHeight: 0, width: "100%" }}>
          {hasRevenue && isMounted ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={weeklyData} barGap={4}>
                <XAxis dataKey="name" stroke="#aaa" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#aaa" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  cursor={{ fill: "#f5f5f5", radius: 6 }}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #f0f0f0", boxShadow: "0 10px 30px -5px rgba(0,0,0,0.1)", fontSize: "12px" }}
                  formatter={(v: any) => [`RD$ ${Number(v).toLocaleString("es-DO")}`, "Total"]}
                />
                <Bar dataKey="total" fill="#000" radius={[6, 6, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-neutral-50 flex items-center justify-center">
                <ReceiptText className="h-6 w-6 text-neutral-200" />
              </div>
              <p className="text-sm font-medium text-neutral-400">Sin ventas esta semana</p>
              <p className="text-xs text-neutral-300">Los ingresos aparecerán aquí cuando generes facturas.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order status */}
      <Card className="lg:col-span-3 border-neutral-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Estado de Órdenes</CardTitle>
          <p className="text-xs text-neutral-400">{totalOrders} órdenes en total</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {totalOrders === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-neutral-400 font-medium">Sin órdenes registradas</p>
            </div>
          ) : statusCounts.map(({ status, label, count }) => {
            const pct = totalOrders > 0 ? (count / totalOrders) * 100 : 0;
            return (
              <div key={status} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={cn("h-2 w-2 rounded-full", statusColors[status])} />
                    <span className="font-medium text-neutral-700">{label}</span>
                  </div>
                  <span className="font-bold text-neutral-900">{count}</span>
                </div>
                <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-700", statusColors[status])}
                    style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
