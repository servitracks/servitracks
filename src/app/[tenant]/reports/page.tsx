"use client";

import { useState, lazy, Suspense } from "react";
import { useStore } from "@/store/useStore";
import { useParams } from "@/lib/next-compat";
import {
  BarChart3, TrendingUp, DollarSign, ShoppingCart, Download,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Lazy-load recharts (heavy dependency)
const ReportCharts = lazy(() => import("./ReportCharts"));

export default function ReportsPage() {
  const params = useParams();
  const tenantSlug = params?.tenant as string;
  const tenants = useStore((s) => s.tenants);
  const currentTenant = tenants.find((t) => t.slug === tenantSlug) ?? null;
  const tenantId = currentTenant?.id ?? "";

  const allInvoices = useStore((s) => s.invoices);
  const invoices = tenantId ? allInvoices.filter((i) => i.tenantId === tenantId) : [];

  const allOrders = useStore((s) => s.orders);
  const orders = tenantId ? allOrders.filter((o) => o.tenantId === tenantId) : [];

  const allCustomers = useStore((s) => s.customers);
  const customers = tenantId ? allCustomers.filter((c) => c.tenantId === tenantId) : [];

  const [period, setPeriod] = useState<"week" | "month" | "year">("month");

  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const totalRevenue = paidInvoices.reduce((acc, inv) => acc + inv.total, 0);
  const avgTicket = invoices.length > 0 ? Math.round(totalRevenue / invoices.length) : 0;
  const conversionRate = orders.length > 0 ? Math.round((invoices.length / orders.length) * 100) : 0;

  // Top products/services from invoice items
  const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
  invoices.forEach((inv) => {
    inv.items.forEach((item) => {
      const key = item.name;
      if (!productSales[key]) productSales[key] = { name: item.name, qty: 0, revenue: 0 };
      productSales[key].qty += item.quantity;
      productSales[key].revenue += item.unitPrice * item.quantity;
    });
  });
  const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Order status for pie
  const statusData = [
    { name: "Pendiente", value: orders.filter((o) => o.status === "pending").length },
    { name: "Reparando", value: orders.filter((o) => o.status === "repairing").length },
    { name: "Finalizado", value: orders.filter((o) => o.status === "finished").length },
    { name: "Entregado", value: orders.filter((o) => o.status === "delivered").length },
  ].filter((d) => d.value > 0);

  const kpis = [
    { label: "Ingresos Totales", value: `RD$ ${totalRevenue.toLocaleString("es-DO")}`, change: "+18.2%", trend: "up" as const, icon: DollarSign },
    { label: "Total Facturas", value: invoices.length, change: "+5 este mes", trend: "up" as const, icon: ShoppingCart },
    { label: "Ticket Promedio", value: `RD$ ${avgTicket.toLocaleString("es-DO")}`, change: `+RD$ ${(320).toLocaleString("es-DO")}`, trend: "up" as const, icon: TrendingUp },
    { label: "Conversión OT→Factura", value: `${conversionRate}%`, change: "+3.1%", trend: "up" as const, icon: BarChart3 },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-neutral-900">Reportes</h1>
          <p className="text-neutral-500">Análisis financiero y operativo de tu taller.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl border border-neutral-200 overflow-hidden bg-white text-sm">
            {(["week", "month", "year"] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={cn("px-4 py-2 font-medium transition-colors",
                  period === p ? "bg-black text-white" : "text-neutral-500 hover:bg-neutral-50")}>
                {p === "week" ? "Semana" : p === "month" ? "Mes" : "Año"}
              </button>
            ))}
          </div>
          <Button variant="outline" className="rounded-lg gap-2">
            <Download className="h-4 w-4" /> Exportar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-neutral-100 shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-neutral-400">{kpi.label}</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-neutral-50 flex items-center justify-center">
                <kpi.icon className="h-4 w-4 text-neutral-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-neutral-900">{kpi.value}</div>
              <div className="mt-1.5 flex items-center gap-1">
                {kpi.trend === "up"
                  ? <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                  : <ArrowDownRight className="h-3 w-3 text-rose-500" />}
                <span className={cn("text-xs font-semibold", kpi.trend === "up" ? "text-emerald-600" : "text-rose-600")}>
                  {kpi.change}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lazy-loaded Charts */}
      <Suspense fallback={
        <div className="space-y-6">
          <Card className="border-neutral-100 shadow-sm">
            <CardContent className="h-[280px] flex items-center justify-center text-neutral-300 text-sm animate-pulse">
              Cargando gráficos...
            </CardContent>
          </Card>
          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3 border-neutral-100 shadow-sm"><CardContent className="h-[260px] animate-pulse" /></Card>
            <Card className="lg:col-span-2 border-neutral-100 shadow-sm"><CardContent className="h-[220px] animate-pulse" /></Card>
          </div>
        </div>
      }>
        <ReportCharts topProducts={topProducts} statusData={statusData} />
      </Suspense>

      {/* Invoices table */}
      <Card className="border-neutral-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Historial de Facturación</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50/50">
                <tr>
                  {["Factura", "Cliente", "Total", "ITBIS", "Método", "Estado", "Fecha"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-bold text-neutral-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {[...invoices].reverse().map((inv) => {
                  const customer = customers.find((c) => c.id === inv.customerId);
                  return (
                    <tr key={inv.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs text-neutral-500">{inv.ncf || inv.id.slice(-8).toUpperCase()}</td>
                      <td className="px-5 py-3.5 font-semibold text-neutral-900">{customer?.name || "—"}</td>
                      <td className="px-5 py-3.5 font-black">RD$ {inv.total.toLocaleString("es-DO")}</td>
                      <td className="px-5 py-3.5 text-neutral-600">RD$ {inv.tax.toLocaleString("es-DO")}</td>
                      <td className="px-5 py-3.5 capitalize text-neutral-600">{inv.paymentMethod}</td>
                      <td className="px-5 py-3.5">
                        <Badge className={cn("border-none text-xs",
                          inv.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                          {inv.status === "paid" ? "Pagada" : "Pendiente"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-neutral-400">
                        {new Date(inv.createdAt).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
