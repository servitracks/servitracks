"use client";

import { useState, lazy, Suspense, useMemo } from "react";
import { useStore, Invoice } from "@/store/useStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Wrench,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  AlertTriangle,
  ReceiptText,
  DollarSign,
  Plus,
  ShoppingCart,
  FileText,
  FileCheck,
  Clock,
  Car,
  ChevronRight,
  Sun,
  SunMedium,
  Moon,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useParams, useRouter } from "@/lib/next-compat";
import { InvoiceDetailDialog } from "@/components/dashboard/InvoiceDetailDialog";

// Lazy-load recharts
const DashboardCharts = lazy(() => import("@/components/dashboard/DashboardCharts"));

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) {
    return { text: "Buenos días", Icon: Sun, iconColor: "text-amber-500" };
  }
  if (h < 19) {
    return { text: "Buenas tardes", Icon: SunMedium, iconColor: "text-orange-500" };
  }
  return { text: "Buenas noches", Icon: Moon, iconColor: "text-indigo-400" };
}

const statusConfig: Record<
  string,
  { label: string; badge: string; dot: string }
> = {
  pending: {
    label: "Pendiente",
    badge: "bg-neutral-100 text-neutral-800 border-neutral-200",
    dot: "bg-neutral-400",
  },
  diagnosing: {
    label: "En Diagnóstico",
    badge: "bg-amber-50 text-amber-800 border-amber-200/90",
    dot: "bg-amber-500",
  },
  repairing: {
    label: "En Reparación",
    badge: "bg-blue-50 text-blue-800 border-blue-200/90",
    dot: "bg-blue-500",
  },
  waiting_parts: {
    label: "Esperando Piezas",
    badge: "bg-rose-50 text-rose-800 border-rose-200/90",
    dot: "bg-rose-500",
  },
  finished: {
    label: "Finalizado",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200/90",
    dot: "bg-emerald-500",
  },
  delivered: {
    label: "Entregado",
    badge: "bg-neutral-900 text-white border-neutral-900",
    dot: "bg-neutral-900",
  },
};

const formatPaymentMethod = (method?: string) => {
  if (!method) return "Efectivo";
  switch (method.toLowerCase()) {
    case "cash":
      return "Efectivo";
    case "card":
      return "Tarjeta";
    case "transfer":
      return "Transferencia";
    case "mixed":
      return "Mixto";
    case "credit":
      return "Crédito";
    default:
      return method;
  }
};

export default function DashboardPage() {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params?.tenant as string;
  const tenants = useStore((s) => s.tenants);
  const currentTenant = tenants.find((t) => t.slug === tenantSlug) ?? null;
  const tenantId = currentTenant?.id ?? "";

  const allOrders = useStore((s) => s.orders);
  const allCustomers = useStore((s) => s.customers);
  const allProducts = useStore((s) => s.products);
  const allInvoices = useStore((s) => s.invoices);
  const allQuotes = useStore((s) => s.quotes);
  const allVehicles = useStore((s) => s.vehicles);

  // Filtrar estrictamente por tenant
  const orders = useMemo(
    () => (tenantId ? allOrders.filter((o) => o.tenantId === tenantId) : []),
    [allOrders, tenantId]
  );
  const customers = useMemo(
    () => (tenantId ? allCustomers.filter((c) => c.tenantId === tenantId) : []),
    [allCustomers, tenantId]
  );
  const products = useMemo(
    () => (tenantId ? allProducts.filter((p) => p.tenantId === tenantId) : []),
    [allProducts, tenantId]
  );
  const invoices = useMemo(
    () => (tenantId ? allInvoices.filter((inv) => inv.tenantId === tenantId) : []),
    [allInvoices, tenantId]
  );
  const quotes = useMemo(
    () => (tenantId ? allQuotes.filter((q) => q.tenantId === tenantId) : []),
    [allQuotes, tenantId]
  );
  const vehicles = useMemo(
    () => (tenantId ? allVehicles.filter((v) => v.tenantId === tenantId) : []),
    [allVehicles, tenantId]
  );

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Fechas de cálculo
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const yesterday = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d;
  }, [today]);

  const monthStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, []);

  // Métricas financieras
  const todayInvoices = useMemo(
    () => invoices.filter((inv) => new Date(inv.createdAt) >= today && inv.status === "paid"),
    [invoices, today]
  );

  const yesterdayInvoices = useMemo(
    () =>
      invoices.filter((inv) => {
        const d = new Date(inv.createdAt);
        return d >= yesterday && d < today && inv.status === "paid";
      }),
    [invoices, yesterday, today]
  );

  const todaySales = useMemo(
    () => todayInvoices.reduce((acc, inv) => acc + (inv.total || 0), 0),
    [todayInvoices]
  );

  const yesterdaySales = useMemo(
    () => yesterdayInvoices.reduce((acc, inv) => acc + (inv.total || 0), 0),
    [yesterdayInvoices]
  );

  // Ventas vs ayer
  const salesDelta = useMemo(() => {
    if (yesterdaySales === 0) {
      return todaySales > 0 ? "+100% vs ayer" : "Sin ventas ayer";
    }
    const diff = ((todaySales - yesterdaySales) / yesterdaySales) * 100;
    const sign = diff > 0 ? "+" : "";
    return `${sign}${diff.toFixed(1)}% vs ayer`;
  }, [todaySales, yesterdaySales]);

  // Órdenes activas
  const activeOrders = useMemo(
    () => orders.filter((o) => !["delivered", "invoiced"].includes(o.status)),
    [orders]
  );
  const repairingCount = useMemo(
    () => orders.filter((o) => o.status === "repairing").length,
    [orders]
  );
  const pendingCount = useMemo(
    () => orders.filter((o) => o.status === "pending").length,
    [orders]
  );

  // Cotizaciones este mes
  const monthQuotes = useMemo(
    () => quotes.filter((q) => new Date(q.createdAt) >= monthStart),
    [quotes, monthStart]
  );
  const monthQuotesTotal = useMemo(
    () => monthQuotes.reduce((acc, q) => acc + (q.total || 0), 0),
    [monthQuotes]
  );
  const acceptedQuotesCount = useMemo(
    () => monthQuotes.filter((q) => q.status === "accepted").length,
    [monthQuotes]
  );
  const quotesConversionRate = useMemo(() => {
    return monthQuotes.length > 0
      ? Math.round((acceptedQuotesCount / monthQuotes.length) * 100)
      : 0;
  }, [monthQuotes.length, acceptedQuotesCount]);

  // Inventario crítico
  const lowStockProducts = useMemo(
    () => products.filter((p) => p.stock <= p.minStock),
    [products]
  );

  const greeting = getGreeting();
  const GreetingIcon = greeting.Icon;

  return (
    <div className="space-y-8">
      {/* 1. Hero / Header Operativo con Accesos Directos */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 border border-neutral-200/80">
              <GreetingIcon className={cn("h-5 w-5", greeting.iconColor)} />
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              {greeting.text}, {currentTenant?.name || "Taller"}
            </h1>
          </div>
          <p className="text-sm text-neutral-500 mt-1">
            Resumen operativo y financiero ·{" "}
            <span className="capitalize">
              {new Date().toLocaleDateString("es-DO", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </p>
        </div>

        {/* Acciones Rápidas de la Cabecera */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Indicador en vivo */}
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs font-semibold text-emerald-800 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Taller Operativo</span>
          </div>

          <Button
            variant="outline"
            className="rounded-xl border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 gap-1.5 h-10 px-3.5 text-xs font-semibold shadow-2xs active:scale-[0.98] transition-all cursor-pointer hidden md:inline-flex"
            onClick={() => router.push(`/${tenantSlug}/cotizaciones`)}
          >
            <FileText className="h-4 w-4 text-neutral-500" />
            <span>+ Cotización</span>
          </Button>

          <Button
            variant="outline"
            className="rounded-xl border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 gap-1.5 h-10 px-3.5 text-xs font-semibold shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
            onClick={() => router.push(`/${tenantSlug}/pos`)}
          >
            <ShoppingCart className="h-4 w-4 text-neutral-500" />
            <span>Facturación POS</span>
          </Button>

          <Button
            className="rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 gap-2 h-10 px-4 text-xs font-semibold shadow-sm active:scale-[0.98] transition-all cursor-pointer"
            onClick={() => router.push(`/${tenantSlug}/orders`)}
          >
            <Plus className="h-4 w-4" />
            <span>Nueva Orden</span>
          </Button>
        </div>
      </div>

      {/* 2. Top KPI Cards Métricas de Alta Gama (Interactividad al Clic) */}
      <div id="tour-metrics" className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Ventas del Día */}
        <button
          type="button"
          onClick={() => router.push(`/${tenantSlug}/caja`)}
          className="flex flex-col justify-between rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-2xs hover:shadow-xs hover:border-neutral-300 transition-all text-left cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 font-mono">
              Ventas del Día
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 group-hover:scale-105 transition-transform">
              <DollarSign className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 font-mono tabular-nums">
              RD$ {todaySales.toLocaleString("es-DO")}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border",
                  todaySales >= yesterdaySales
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                    : "bg-rose-50 text-rose-700 border-rose-200/80"
                )}
              >
                {todaySales >= yesterdaySales ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {salesDelta}
              </span>
              <span className="text-[11px] text-neutral-400">
                {todayInvoices.length} {todayInvoices.length === 1 ? "factura" : "facturas"} hoy
              </span>
            </div>
          </div>
        </button>

        {/* Card 2: Órdenes Activas en Taller */}
        <button
          type="button"
          onClick={() => router.push(`/${tenantSlug}/orders`)}
          className="flex flex-col justify-between rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-2xs hover:shadow-xs hover:border-neutral-300 transition-all text-left cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 font-mono">
              Órdenes en Taller
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 group-hover:scale-105 transition-transform">
              <Wrench className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 font-mono tabular-nums">
              {activeOrders.length}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80">
                {repairingCount} en reparación
              </span>
              <span className="text-[11px] text-neutral-400">
                {pendingCount} por diagnosticar
              </span>
            </div>
          </div>
        </button>

        {/* Card 3: Presupuestos y Cotizaciones */}
        <button
          type="button"
          onClick={() => router.push(`/${tenantSlug}/cotizaciones`)}
          className="flex flex-col justify-between rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-2xs hover:shadow-xs hover:border-neutral-300 transition-all text-left cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 font-mono">
              Cotizaciones del Mes
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-700 border border-violet-200/80 group-hover:scale-105 transition-transform">
              <FileCheck className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 font-mono tabular-nums truncate">
              RD$ {monthQuotesTotal.toLocaleString("es-DO")}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200/80 font-mono">
                {quotesConversionRate}% conversión
              </span>
              <span className="text-[11px] text-neutral-400">
                {monthQuotes.length} presupuestos
              </span>
            </div>
          </div>
        </button>

        {/* Card 4: Alertas de Stock */}
        <button
          type="button"
          onClick={() => router.push(`/${tenantSlug}/inventory`)}
          className="flex flex-col justify-between rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-2xs hover:shadow-xs hover:border-neutral-300 transition-all text-left cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 font-mono">
              Alertas de Stock
            </span>
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl border group-hover:scale-105 transition-transform",
                lowStockProducts.length > 0
                  ? "bg-amber-50 text-amber-700 border-amber-200/80"
                  : "bg-neutral-100 text-neutral-700 border-neutral-200"
              )}
            >
              <Package className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 font-mono tabular-nums">
              {lowStockProducts.length}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border",
                  lowStockProducts.length > 0
                    ? "bg-amber-50 text-amber-800 border-amber-200/80"
                    : "bg-emerald-50 text-emerald-800 border-emerald-200/80"
                )}
              >
                {lowStockProducts.length > 0 ? "Reponer piezas" : "Inventario óptimo"}
              </span>
              <span className="text-[11px] text-neutral-400">
                {products.length} productos registrados
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* 3. Centro de Gráficos y Flujo Operativo */}
      <Suspense
        fallback={
          <div className="grid gap-6 lg:grid-cols-7">
            <Card className="lg:col-span-4 rounded-3xl border-neutral-100 shadow-2xs">
              <CardContent className="h-[380px] flex items-center justify-center text-neutral-400 text-sm">
                Cargando métricas de facturación...
              </CardContent>
            </Card>
            <Card className="lg:col-span-3 rounded-3xl border-neutral-100 shadow-2xs">
              <CardContent className="h-[380px] flex items-center justify-center text-neutral-400 text-sm">
                Cargando estado de taller...
              </CardContent>
            </Card>
          </div>
        }
      >
        <DashboardCharts
          orders={orders}
          invoices={invoices}
          tenantSlug={tenantSlug}
        />
      </Suspense>

      {/* 4. Tableros Operativos: Facturación Reciente, Alertas de Reposición y Bahías Activas */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Columna Izquierda: Facturas y Comprobantes Recientes */}
        <Card className="rounded-3xl border border-neutral-200/80 bg-white shadow-2xs overflow-hidden flex flex-col justify-between">
          <CardHeader className="p-5 sm:p-6 pb-3 border-b border-neutral-100 flex flex-row items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ReceiptText className="h-4 w-4 text-neutral-700" />
                <CardTitle className="text-base font-bold text-neutral-900 tracking-tight">
                  Facturación Reciente
                </CardTitle>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Comprobantes emitidos en caja y POS
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/${tenantSlug}/pos`)}
              className="text-xs font-bold text-neutral-900 hover:bg-neutral-100 rounded-xl gap-1"
            >
              <span>Ver POS</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>

          <CardContent className="p-0 flex-1">
            {invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="h-12 w-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400 mb-2">
                  <ReceiptText className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-neutral-800">
                  Aún no hay facturas registradas
                </p>
                <p className="text-xs text-neutral-400 mt-0.5 max-w-xs">
                  Las ventas cobradas desde el módulo de POS aparecerán aquí con su comprobante fiscal.
                </p>
                <Button
                  size="sm"
                  onClick={() => router.push(`/${tenantSlug}/pos`)}
                  className="mt-3 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 text-xs"
                >
                  Cobrar primera factura
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {invoices
                  .slice()
                  .reverse()
                  .slice(0, 5)
                  .map((inv) => {
                    const customer = customers.find((c) => c.id === inv.customerId);
                    const customerInitials = customer?.name
                      ? customer.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()
                      : "CL";

                    return (
                      <div
                        key={inv.id}
                        onClick={() => setSelectedInvoice(inv)}
                        className="flex items-center justify-between p-4 sm:px-6 hover:bg-neutral-50/70 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 text-white font-mono text-xs font-bold shrink-0">
                            {customerInitials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-neutral-900 truncate group-hover:underline">
                              {customer?.name || "Cliente General"}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {inv.ncf ? (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-neutral-100 border border-neutral-200 text-[10px] font-mono font-semibold text-neutral-700">
                                  {inv.ncf}
                                </span>
                              ) : (
                                <span className="text-[10px] text-neutral-400 font-mono">
                                  Ticket #{inv.id.slice(-6).toUpperCase()}
                                </span>
                              )}
                              <span className="text-[10px] text-neutral-400">·</span>
                              <span className="text-[10px] text-neutral-500 font-medium">
                                {formatPaymentMethod(inv.paymentMethod)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-3">
                          <p className="font-mono font-bold text-xs sm:text-sm text-neutral-900 tabular-nums">
                            RD$ {(inv.total || 0).toLocaleString("es-DO")}
                          </p>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md mt-0.5",
                              inv.status === "paid"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                                : inv.status === "cancelled"
                                ? "bg-rose-50 text-rose-700 border border-rose-200/80"
                                : "bg-amber-50 text-amber-700 border border-amber-200/80"
                            )}
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                inv.status === "paid"
                                  ? "bg-emerald-500"
                                  : inv.status === "cancelled"
                                  ? "bg-rose-500"
                                  : "bg-amber-500"
                              )}
                            />
                            <span>
                              {inv.status === "paid"
                                ? "Pagada"
                                : inv.status === "cancelled"
                                ? "Anulada"
                                : "Pendiente"}
                            </span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>

          <div className="p-3.5 px-6 bg-neutral-50/70 border-t border-neutral-100 flex items-center justify-between">
            <span className="text-xs text-neutral-500 font-medium">
              {invoices.length} facturas totales registradas
            </span>
            <button
              type="button"
              onClick={() => router.push(`/${tenantSlug}/caja`)}
              className="text-xs font-bold text-neutral-900 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Ver Libro de Caja</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </Card>

        {/* Columna Derecha: Alertas de Stock y Reposición */}
        <Card className="rounded-3xl border border-neutral-200/80 bg-white shadow-2xs overflow-hidden flex flex-col justify-between">
          <CardHeader className="p-5 sm:p-6 pb-3 border-b border-neutral-100 flex flex-row items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <CardTitle className="text-base font-bold text-neutral-900 tracking-tight">
                  Alertas de Stock
                </CardTitle>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Piezas y repuestos que requieren reposición
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/${tenantSlug}/inventory`)}
              className="text-xs font-bold text-neutral-900 hover:bg-neutral-100 rounded-xl gap-1"
            >
              <span>Ver Inventario</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>

          <CardContent className="p-0 flex-1">
            {lowStockProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 border border-emerald-100">
                  <Package className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-neutral-800">
                  Inventario al día
                </p>
                <p className="text-xs text-neutral-400 mt-0.5 max-w-xs">
                  Todos los repuestos y artículos se encuentran por encima de su umbral mínimo de seguridad.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {lowStockProducts.slice(0, 5).map((p) => {
                  const isOutOfStock = p.stock === 0;
                  return (
                    <div
                      key={p.id}
                      onClick={() => router.push(`/${tenantSlug}/inventory?search=${p.sku || p.name}`)}
                      className="flex items-center justify-between p-4 sm:px-6 hover:bg-neutral-50/70 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-xl border shrink-0 group-hover:scale-105 transition-transform",
                            isOutOfStock
                              ? "bg-rose-50 text-rose-600 border-rose-200/80"
                              : "bg-amber-50 text-amber-700 border-amber-200/80"
                          )}
                        >
                          <Package className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-neutral-900 truncate group-hover:underline">
                            {p.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[10px] text-neutral-400">
                              SKU: {p.sku || "—"}
                            </span>
                            <span className="text-[10px] text-neutral-300">·</span>
                            <span className="text-[10px] text-neutral-500 font-mono">
                              Mínimo: {p.minStock} unds.
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 ml-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border font-mono",
                            isOutOfStock
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          )}
                        >
                          {isOutOfStock ? "Agotado (0)" : `${p.stock} disponibles`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>

          <div className="p-3.5 px-6 bg-neutral-50/70 border-t border-neutral-100 flex items-center justify-between">
            <span className="text-xs text-neutral-500 font-medium">
              {lowStockProducts.length} productos en nivel de alerta
            </span>
            <button
              type="button"
              onClick={() => router.push(`/${tenantSlug}/inventory`)}
              className="text-xs font-bold text-neutral-900 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Gestionar Inventario</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </Card>
      </div>

      {/* 5. Tercer Bloque: Vehículos en Bahías de Trabajo Activas */}
      {activeOrders.length > 0 && (
        <Card className="rounded-3xl border border-neutral-200/80 bg-white shadow-2xs overflow-hidden">
          <CardHeader className="p-5 sm:p-6 pb-3 border-b border-neutral-100 flex flex-row items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Car className="h-4.5 w-4.5 text-neutral-800" />
                <CardTitle className="text-base font-bold text-neutral-900 tracking-tight">
                  Vehículos en Taller Ahora Mismo
                </CardTitle>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Seguimiento en vivo de las órdenes activas en bahías de reparación
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/${tenantSlug}/orders`)}
              className="rounded-xl text-xs font-bold border-neutral-200 text-neutral-800 gap-1"
            >
              <span>Ver todas ({activeOrders.length})</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            <div className="divide-y divide-neutral-100">
              {activeOrders.slice(0, 4).map((order) => {
                const customer = customers.find((c) => c.id === order.customerId);
                const vehicle = vehicles.find((v) => v.id === order.vehicleId);
                const st = statusConfig[order.status] || statusConfig.pending;

                return (
                  <div
                    key={order.id}
                    onClick={() => router.push(`/${tenantSlug}/orders`)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 hover:bg-neutral-50/70 transition-colors cursor-pointer gap-3 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-800 group-hover:scale-105 transition-transform shrink-0">
                        <Car className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-neutral-900 group-hover:underline">
                            {vehicle ? `${vehicle.brand} ${vehicle.model}` : "Vehículo"}
                          </p>
                          {vehicle?.plate && (
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-neutral-100 border border-neutral-300 font-mono shadow-2xs">
                              <span className="text-[8px] font-bold text-neutral-400 uppercase">
                                RD
                              </span>
                              <span className="text-[10px] font-black text-neutral-900">
                                {vehicle.plate.toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                          Cliente: {customer?.name || "General"} · Orden #{order.id.slice(-6).toUpperCase()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-auto w-full sm:w-auto">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-lg border",
                          st.badge
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", st.dot)} />
                        <span>{st.label}</span>
                      </span>

                      <div className="text-right">
                        <p className="font-mono font-bold text-xs sm:text-sm text-neutral-900 tabular-nums">
                          RD$ {(order.total || 0).toLocaleString("es-DO")}
                        </p>
                      </div>

                      <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition-all hidden sm:block" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 6. Modal de Detalle de Factura */}
      <InvoiceDetailDialog
        open={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
      />
    </div>
  );
}
