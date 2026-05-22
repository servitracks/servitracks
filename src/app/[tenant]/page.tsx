"use client";

import { useState, lazy, Suspense } from "react";
import { useStore, Invoice } from "@/store/useStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, Wrench, Users, ArrowUpRight, ArrowDownRight,
  Package, AlertTriangle, ReceiptText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useParams } from "@/lib/next-compat";
import { InvoiceDetailDialog } from "@/components/dashboard/InvoiceDetailDialog";

// Lazy-load recharts
const DashboardCharts = lazy(() => import("@/components/dashboard/DashboardCharts"));

const statusColors: Record<string, string> = {
  pending: "bg-neutral-200",
  diagnosing: "bg-amber-400",
  repairing: "bg-blue-500",
  waiting_parts: "bg-rose-500",
  finished: "bg-emerald-500",
  delivered: "bg-neutral-900",
};

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  diagnosing: "Diagnóstico",
  repairing: "Reparando",
  waiting_parts: "Esperando",
  finished: "Finalizado",
  delivered: "Entregado",
};

function getHourGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 18) return "Buenas tardes";
  return "Buenas noches";
}

export default function DashboardPage() {
  const params = useParams();
  const tenantSlug = params?.tenant as string;
  const orders = useStore((s) => s.orders);
  const customers = useStore((s) => s.customers);
  const products = useStore((s) => s.products);
  const invoices = useStore((s) => s.invoices);

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 7);

  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const todayInvoices = invoices.filter((inv) => new Date(inv.createdAt) >= today);
  const yesterdayInvoices = invoices.filter((inv) => {
    const d = new Date(inv.createdAt);
    return d >= yesterday && d < today;
  });
  const todaySales = todayInvoices.reduce((acc, inv) => acc + inv.total, 0);
  const yesterdaySales = yesterdayInvoices.reduce((acc, inv) => acc + inv.total, 0);

  const activeOrders = orders.filter((o) => !["delivered"].includes(o.status));
  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;

  const newCustomersThisWeek = customers.filter((c) => new Date(c.createdAt) >= weekStart).length;
  const newCustomersLastWeek = customers.filter((c) => {
    const d = new Date(c.createdAt);
    return d >= lastWeekStart && d < weekStart;
  }).length;

  // Sales delta vs yesterday
  const salesDelta = yesterdaySales === 0
    ? todaySales > 0 ? "+100%" : "Sin ventas"
    : `${yesterdaySales > 0 ? (((todaySales - yesterdaySales) / yesterdaySales) * 100 > 0 ? "+" : "") + (((todaySales - yesterdaySales) / yesterdaySales) * 100).toFixed(1) + "%" : "—"}`;

  // Customers delta vs last week
  const customersDelta = newCustomersLastWeek === 0
    ? newCustomersThisWeek > 0 ? `+${newCustomersThisWeek} esta semana` : "Sin nuevos"
    : `${newCustomersThisWeek > newCustomersLastWeek ? "+" : ""}${newCustomersThisWeek - newCustomersLastWeek} vs semana anterior`;

  const stats = [
    {
      title: "Ventas del Día",
      value: todaySales > 0 ? `RD$ ${todaySales.toLocaleString("es-DO")}` : "RD$ 0",
      change: salesDelta,
      trend: todaySales >= yesterdaySales ? "up" as const : "down" as const,
      icon: TrendingUp,
      sub: `${todayInvoices.length} factura${todayInvoices.length !== 1 ? "s" : ""} hoy`,
    },
    {
      title: "Órdenes Activas",
      value: activeOrders.length,
      change: `${orders.filter((o) => o.status === "pending").length} pendientes`,
      trend: "up" as const,
      icon: Wrench,
      sub: "En taller ahora",
    },
    {
      title: "Clientes Nuevos",
      value: newCustomersThisWeek || customers.length,
      change: customersDelta,
      trend: newCustomersThisWeek >= newCustomersLastWeek ? "up" as const : "down" as const,
      icon: Users,
      sub: "Total registrados",
    },
    {
      title: "Stock Bajo",
      value: lowStockCount,
      change: lowStockCount > 0 ? "Requiere atención" : "Todo en orden",
      trend: lowStockCount > 0 ? "down" as const : "up" as const,
      icon: Package,
      sub: "Productos por reponer",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-neutral-900">
            {getHourGreeting()} 👋
          </h1>
          <p className="text-neutral-500 mt-1">
            Aquí está el resumen de <strong className="capitalize">{tenantSlug?.replace(/-/g, " ") || "tu taller"}</strong> hoy,{" "}
            {today.toLocaleDateString("es-DO", { weekday: "long", day: "numeric", month: "long" })}.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 rounded-xl border border-neutral-100 bg-white px-4 py-2.5 text-sm font-medium text-neutral-600 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Sistema Operativo
        </div>
      </div>

      {/* KPI Cards */}
      <div id="tour-metrics" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <div 
            key={stat.title} 
            className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
            style={{ animationDelay: `${i * 80}ms`, animationDuration: '300ms' }}
          >
            <Card className="border-neutral-100 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-neutral-400">{stat.title}</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-neutral-50 flex items-center justify-center">
                  <stat.icon className="h-4 w-4 text-neutral-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-neutral-900">{stat.value}</div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-rose-500" />
                  )}
                  <span className={cn("text-xs font-semibold", stat.trend === "up" ? "text-emerald-600" : "text-rose-600")}>
                    {stat.change}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">{stat.sub}</p>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Charts */}
      <Suspense fallback={
        <div className="grid gap-6 lg:grid-cols-7">
          <Card className="lg:col-span-4 border-neutral-100 shadow-sm">
            <CardContent className="h-[340px] flex items-center justify-center text-neutral-300 text-sm">
              Cargando gráficos...
            </CardContent>
          </Card>
          <Card className="lg:col-span-3 border-neutral-100 shadow-sm"><CardContent className="h-[340px]" /></Card>
        </div>
      }>
        <DashboardCharts orders={orders} invoices={invoices} statusColors={statusColors} statusLabels={statusLabels} />
      </Suspense>

      {/* Bottom row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent invoices */}
        <Card className="border-neutral-100 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold">Facturas Recientes</CardTitle>
              <ReceiptText className="h-4 w-4 text-neutral-300" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {invoices.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center px-5">
                <ReceiptText className="h-10 w-10 text-neutral-200 mb-3" />
                <p className="text-sm font-medium text-neutral-500">Aún no hay facturas registradas.</p>
                <p className="text-xs text-neutral-400 mt-1">Las facturas aparecerán aquí cuando uses el POS.</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-50">
                {invoices.slice().reverse().slice(0, 5).map((inv) => {
                  const customer = customers.find((c) => c.id === inv.customerId);
                  return (
                    <div 
                      key={inv.id} 
                      onClick={() => setSelectedInvoice(inv)}
                      className="flex items-center justify-between p-5 hover:bg-neutral-50/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-bold text-neutral-600">
                          {customer ? customer.name.split(" ").map((n) => n[0]).join("").slice(0, 2) : "??"}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-neutral-900">{customer?.name || "Cliente"}</p>
                          <p className="text-xs text-neutral-400">{inv.ncf || "Sin NCF"} · {new Date(inv.createdAt).toLocaleDateString("es-DO")}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black">RD$ {inv.total.toLocaleString("es-DO")}</p>
                        <Badge className={cn("text-[10px] border-none", 
                          inv.status === "paid" ? "bg-emerald-100 text-emerald-700" : 
                          inv.status === "cancelled" ? "bg-rose-100 text-rose-700" :
                          "bg-amber-100 text-amber-700"
                        )}>
                          {inv.status === "paid" ? "Pagada" : 
                           inv.status === "cancelled" ? "Cancelada" :
                           "Pendiente"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low stock alerts */}
        <Card className="border-neutral-100 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold">Alertas de Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-neutral-300" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {products.filter((p) => p.stock <= p.minStock).length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center px-5">
                <Package className="h-10 w-10 text-neutral-200 mb-3" />
                <p className="text-sm font-medium text-neutral-500">Todo el inventario está bien abastecido.</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-50">
                {products.filter((p) => p.stock <= p.minStock).map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-5 hover:bg-neutral-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn("h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold",
                        p.stock === 0 ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600")}>
                        <Package className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">{p.name}</p>
                        <p className="text-xs text-neutral-400">{p.sku} · Mín: {p.minStock}</p>
                      </div>
                    </div>
                    <Badge className={cn("font-bold border-none",
                      p.stock === 0 ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700")}>
                      {p.stock === 0 ? "Agotado" : `${p.stock} und.`}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <InvoiceDetailDialog
        open={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
      />
    </div>
  );
}
