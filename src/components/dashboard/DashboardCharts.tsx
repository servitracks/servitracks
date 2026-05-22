"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";

const weeklyData = [
  { name: "Lun", total: 12400 },
  { name: "Mar", total: 21000 },
  { name: "Mie", total: 18500 },
  { name: "Jue", total: 24000 },
  { name: "Vie", total: 32000 },
  { name: "Sab", total: 28000 },
  { name: "Dom", total: 14000 },
];

interface DashboardChartsProps {
  orders: any[];
  statusColors: Record<string, string>;
  statusLabels: Record<string, string>;
}

export default function DashboardCharts({ orders, statusColors, statusLabels }: DashboardChartsProps) {
  const statusCounts = Object.keys(statusLabels).map((s) => ({
    status: s,
    label: statusLabels[s],
    count: orders.filter((o) => o.status === s).length,
  }));
  const totalOrders = orders.length;

  return (
    <div className="grid gap-6 lg:grid-cols-7">
      {/* Bar chart */}
      <Card className="lg:col-span-4 border-neutral-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Ingresos Semanales</CardTitle>
          <p className="text-xs text-neutral-400">Últimos 7 días</p>
        </CardHeader>
        <CardContent className="h-[280px] w-full pb-4">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
        </CardContent>
      </Card>

      {/* Order status */}
      <Card className="lg:col-span-3 border-neutral-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Estado de Órdenes</CardTitle>
          <p className="text-xs text-neutral-400">{totalOrders} órdenes en total</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {statusCounts.map(({ status, label, count }) => {
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
