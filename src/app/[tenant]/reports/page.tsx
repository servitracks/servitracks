"use client";

import { useState, useMemo, lazy, Suspense } from "react";
import { useStore, Invoice } from "@/store/useStore";
import { useParams } from "@/lib/next-compat";
import {
  BarChart3, TrendingUp, DollarSign, ShoppingCart, Download,
  ArrowUpRight, ArrowDownRight, Wallet, Percent, FileText,
  Search, Eye, ShieldCheck, Wrench, Users, Tag, Layers,
  Calendar, CheckCircle2, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { InvoiceDetailDialog } from "@/components/dashboard/InvoiceDetailDialog";
import { toast } from "sonner";

// Lazy-load recharts
const ReportCharts = lazy(() => import("./ReportCharts"));

export default function ReportsPage() {
  const params = useParams();
  const tenantSlug = params?.tenant as string;
  const tenants = useStore((s) => s.tenants);
  const currentTenant = tenants.find((t) => t.slug === tenantSlug) ?? null;
  const tenantId = currentTenant?.id ?? "";

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [activeTab, setActiveTab] = useState<"financial" | "operations" | "catalog" | "fiscal" | "invoices">("financial");
  const [period, setPeriod] = useState<"today" | "week" | "month" | "year" | "all">("month");
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");

  const allInvoices = useStore((s) => s.invoices);
  const invoices = useMemo(() => tenantId ? allInvoices.filter((i) => i.tenantId === tenantId) : [], [allInvoices, tenantId]);

  const allOrders = useStore((s) => s.orders);
  const orders = useMemo(() => tenantId ? allOrders.filter((o) => o.tenantId === tenantId) : [], [allOrders, tenantId]);

  const allQuotes = useStore((s) => s.quotes);
  const quotes = useMemo(() => tenantId ? allQuotes.filter((q) => q.tenantId === tenantId) : [], [allQuotes, tenantId]);

  const allMovements = useStore((s) => s.cajaMovements);
  const cajaMovements = useMemo(() => tenantId ? allMovements.filter((m) => m.tenant_id === tenantId) : [], [allMovements, tenantId]);

  const allCustomers = useStore((s) => s.customers);
  const customers = useMemo(() => tenantId ? allCustomers.filter((c) => c.tenantId === tenantId) : [], [allCustomers, tenantId]);

  const allTechnicians = useStore((s) => s.technicians);
  const technicians = useMemo(() => tenantId ? allTechnicians.filter((t) => t.tenantId === tenantId) : [], [allTechnicians, tenantId]);

  // Period Filter Timestamp
  const now = new Date();
  const filterDate = useMemo(() => {
    if (period === "today") {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    if (period === "week") return now.getTime() - 7 * 24 * 60 * 60 * 1000;
    if (period === "month") return now.getTime() - 30 * 24 * 60 * 60 * 1000;
    if (period === "year") return now.getTime() - 365 * 24 * 60 * 60 * 1000;
    return 0; // all
  }, [period]);

  const filteredInvoices = useMemo(() => invoices.filter((i) => new Date(i.createdAt).getTime() >= filterDate), [invoices, filterDate]);
  const filteredOrders = useMemo(() => orders.filter((o) => new Date(o.createdAt).getTime() >= filterDate), [orders, filterDate]);
  const filteredQuotes = useMemo(() => quotes.filter((q) => new Date(q.createdAt).getTime() >= filterDate), [quotes, filterDate]);
  const filteredCajaMovements = useMemo(() => cajaMovements.filter((m) => new Date(m.creado_en).getTime() >= filterDate), [cajaMovements, filterDate]);

  // Financial Metrics
  const paidInvoices = useMemo(() => filteredInvoices.filter((i) => i.status === "paid"), [filteredInvoices]);
  const grossRevenue = useMemo(() => paidInvoices.reduce((acc, inv) => acc + (inv.total || 0), 0), [paidInvoices]);
  const itbisCollected = useMemo(() => paidInvoices.reduce((acc, inv) => acc + (inv.tax || 0), 0), [paidInvoices]);
  const netRevenue = grossRevenue - itbisCollected;

  const totalExpenses = useMemo(() => {
    return filteredCajaMovements
      .filter((m) => ["EGRESO", "RETIRO", "GASTO_CAJA_CHICA", "PAGO_NOMINA"].includes(m.tipo))
      .reduce((acc, m) => acc + (m.monto || 0), 0);
  }, [filteredCajaMovements]);

  const netProfit = netRevenue - totalExpenses;
  const profitMargin = netRevenue > 0 ? Math.round((netProfit / netRevenue) * 100) : 0;
  const avgTicket = paidInvoices.length > 0 ? Math.round(grossRevenue / paidInvoices.length) : 0;
  const conversionRate = filteredQuotes.length > 0 ? Math.round((filteredOrders.length / filteredQuotes.length) * 100) : (filteredOrders.length > 0 ? 100 : 0);

  // Dynamic Time Series for Chart (Real Data grouped by Day or Month)
  const timeSeriesData = useMemo(() => {
    const pointsMap: Record<string, { name: string; ingresos: number; egresos: number; neto: number }> = {};

    if (period === "today" || period === "week") {
      // Group by Day (Lun, Mar, Mié, etc.)
      const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      const last7Days = Array.from({ length: 7 }, (_, idx) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - idx));
        const key = d.toISOString().split("T")[0];
        const dayName = days[d.getDay()];
        return { key, label: `${dayName} ${d.getDate()}` };
      });

      last7Days.forEach(({ key, label }) => {
        pointsMap[key] = { name: label, ingresos: 0, egresos: 0, neto: 0 };
      });

      paidInvoices.forEach((inv) => {
        const key = inv.createdAt.split("T")[0];
        if (pointsMap[key]) pointsMap[key].ingresos += inv.total;
      });

      filteredCajaMovements
        .filter((m) => ["EGRESO", "RETIRO", "GASTO_CAJA_CHICA", "PAGO_NOMINA"].includes(m.tipo))
        .forEach((m) => {
          const key = m.creado_en.split("T")[0];
          if (pointsMap[key]) pointsMap[key].egresos += m.monto;
        });

      return Object.values(pointsMap).map((p) => ({ ...p, neto: p.ingresos - p.egresos }));
    }

    // Default: Group by Months
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const currentYear = new Date().getFullYear();

    for (let m = 0; m < 12; m++) {
      const label = monthNames[m];
      pointsMap[String(m)] = { name: label, ingresos: 0, egresos: 0, neto: 0 };
    }

    paidInvoices.forEach((inv) => {
      const date = new Date(inv.createdAt);
      if (date.getFullYear() === currentYear || period === "all") {
        const monthIdx = String(date.getMonth());
        if (pointsMap[monthIdx]) pointsMap[monthIdx].ingresos += inv.total;
      }
    });

    filteredCajaMovements
      .filter((mov) => ["EGRESO", "RETIRO", "GASTO_CAJA_CHICA", "PAGO_NOMINA"].includes(mov.tipo))
      .forEach((mov) => {
        const date = new Date(mov.creado_en);
        if (date.getFullYear() === currentYear || period === "all") {
          const monthIdx = String(date.getMonth());
          if (pointsMap[monthIdx]) pointsMap[monthIdx].egresos += mov.monto;
        }
      });

    return Object.values(pointsMap).map((p) => ({ ...p, neto: p.ingresos - p.egresos }));
  }, [paidInvoices, filteredCajaMovements, period]);

  // Payment Methods Breakdown
  const paymentMethodsData = useMemo(() => {
    let cash = 0;
    let card = 0;
    let transfer = 0;
    paidInvoices.forEach((inv) => {
      const pm = (inv.paymentMethod || "").toLowerCase();
      if (pm.includes("efectivo") || pm === "cash") cash += inv.total;
      else if (pm.includes("tarjeta") || pm.includes("card")) card += inv.total;
      else if (pm.includes("transfer")) transfer += inv.total;
      else cash += inv.total;
    });
    return [
      { name: "Efectivo", value: cash },
      { name: "Tarjeta", value: card },
      { name: "Transferencia", value: transfer },
    ].filter((d) => d.value > 0);
  }, [paidInvoices]);

  // Top Products & Services
  const topProducts = useMemo(() => {
    const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
    filteredInvoices.forEach((inv) => {
      inv.items.forEach((item) => {
        const key = item.name;
        if (!productSales[key]) productSales[key] = { name: item.name, qty: 0, revenue: 0 };
        productSales[key].qty += item.quantity;
        productSales[key].revenue += item.unitPrice * item.quantity;
      });
    });
    return Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  }, [filteredInvoices]);

  // NCF Types breakdown
  const ncfBreakdown = useMemo(() => {
    const map: Record<string, { count: number; total: number; itbis: number; label: string }> = {
      B01: { count: 0, total: 0, itbis: 0, label: "Factura de Crédito Fiscal (B01)" },
      B02: { count: 0, total: 0, itbis: 0, label: "Consumidor Final (B02)" },
      B14: { count: 0, total: 0, itbis: 0, label: "Regímenes Especiales (B14)" },
      B15: { count: 0, total: 0, itbis: 0, label: "Gubernamental (B15)" },
      OTRO: { count: 0, total: 0, itbis: 0, label: "Facturas Estándar / Sin NCF" },
    };

    paidInvoices.forEach((inv) => {
      const ncf = inv.ncf || "";
      let matched = false;
      for (const prefix of ["B01", "B02", "B14", "B15"]) {
        if (ncf.startsWith(prefix) || ncf.startsWith(`E${prefix.slice(1)}`)) {
          map[prefix].count += 1;
          map[prefix].total += inv.total;
          map[prefix].itbis += inv.tax || 0;
          matched = true;
          break;
        }
      }
      if (!matched) {
        map.OTRO.count += 1;
        map.OTRO.total += inv.total;
        map.OTRO.itbis += inv.tax || 0;
      }
    });

    return Object.entries(map).filter(([_, val]) => val.count > 0 || val.total > 0);
  }, [paidInvoices]);

  // Order status
  const statusData = useMemo(() => {
    return [
      { name: "Pendiente", value: filteredOrders.filter((o) => o.status === "pending").length },
      { name: "En Reparación", value: filteredOrders.filter((o) => o.status === "repairing").length },
      { name: "Finalizado", value: filteredOrders.filter((o) => o.status === "finished").length },
      { name: "Entregado", value: filteredOrders.filter((o) => o.status === "delivered").length },
    ].filter((d) => d.value > 0);
  }, [filteredOrders]);

  // Technician Productivity
  const techProductivity = useMemo(() => {
    return technicians.map((tech) => {
      const techOrders = filteredOrders.filter((o) => o.mechanicId === tech.id);
      const totalGenerated = techOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      return {
        tech,
        ordersCount: techOrders.length,
        totalGenerated,
      };
    }).sort((a, b) => b.totalGenerated - a.totalGenerated);
  }, [technicians, filteredOrders]);

  // Export Comprehensive CSV
  const handleExport = () => {
    try {
      const csvRows = [];
      csvRows.push([`REPORTE EJECUTIVO Y FINANCIERO - ${currentTenant?.name || tenantSlug}`]);
      csvRows.push([`Generado el: ${new Date().toLocaleString("es-DO")}`]);
      csvRows.push([`Período: ${period.toUpperCase()}`]);
      csvRows.push([]);

      csvRows.push(["RESUMEN DE INGRESOS Y GASTOS"]);
      csvRows.push(["Métrica", "Monto (RD$)"]);
      csvRows.push(["Ingresos Brutos", grossRevenue]);
      csvRows.push(["ITBIS Facturado", itbisCollected]);
      csvRows.push(["Ingresos Netos", netRevenue]);
      csvRows.push(["Egresos / Gastos", totalExpenses]);
      csvRows.push(["Utilidad Neta", netProfit]);
      csvRows.push(["Margen Operativo", `${profitMargin}%`]);
      csvRows.push([]);

      csvRows.push(["HISTORIAL DE FACTURAS"]);
      csvRows.push(["Factura / NCF", "Cliente", "Total (RD$)", "ITBIS (RD$)", "Metodo", "Estado", "Fecha"]);
      filteredInvoices.forEach((inv) => {
        const customer = customers.find((c) => c.id === inv.customerId);
        csvRows.push([
          inv.ncf || inv.id.slice(-8).toUpperCase(),
          `"${customer?.name || "Sin Nombre"}"`,
          inv.total,
          inv.tax,
          inv.paymentMethod || "Efectivo",
          inv.status === "paid" ? "Pagada" : "Pendiente",
          new Date(inv.createdAt).toLocaleDateString("es-DO"),
        ]);
      });

      const csvString = csvRows.map((r) => r.join(",")).join("\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `reporte_general_${tenantSlug}_${period}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Reporte descargado exitosamente");
    } catch (e) {
      toast.error("Error al exportar reporte");
    }
  };

  const periodLabelMap = {
    today: "Hoy",
    week: "Esta Semana",
    month: "Este Mes",
    year: "Este Año",
    all: "Histórico Total",
  };

  return (
    <div className="space-y-7 pb-20">
      {/* ── HEADER EXECUTIVE BAR ── */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5 bg-white p-5 sm:p-6 rounded-3xl border border-neutral-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-heading text-xl sm:text-2xl font-black tracking-tight text-neutral-900">
              Reportes & Business Intelligence
            </h1>
            <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 font-bold text-[10px] uppercase px-2.5 py-0.5 rounded-full">
              EN VIVO
            </Badge>
          </div>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">
            Análisis financiero, rentabilidad real (P&L), productividad de taller y fiscalidad DGII.
          </p>
        </div>

        {/* Period Selector & Export */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <div className="flex items-center bg-neutral-100/90 p-1 rounded-xl border border-neutral-200/80">
            {(["today", "week", "month", "year", "all"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
                  period === p ? "bg-neutral-950 text-white shadow-2xs" : "text-neutral-600 hover:text-neutral-900"
                )}
              >
                {periodLabelMap[p]}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="rounded-xl gap-1.5 h-9 px-3.5 font-bold text-xs text-neutral-700 border-neutral-200 hover:bg-neutral-50 shadow-2xs cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-neutral-500" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* ── 4 GRAND EXECUTIVE KPIS (CLEAN & NON-WRAPPING) ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Ingresos Brutos */}
        <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs hover:border-neutral-300 transition-all flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Ingresos Brutos (Cobrado)
            </span>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/70 flex items-center justify-center font-bold text-sm shadow-2xs">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-neutral-900">
              RD$ {grossRevenue.toLocaleString("es-DO")}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200/60 shrink-0">
              <ArrowUpRight className="h-3 w-3" />
              {paidInvoices.length} facturas
            </span>
            <span className="text-neutral-400 text-[11px] font-medium truncate">cobradas con éxito</span>
          </div>
        </div>

        {/* KPI 2: Egresos y Gastos */}
        <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs hover:border-neutral-300 transition-all flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Gastos & Egresos de Caja
            </span>
            <div className="h-9 w-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/70 flex items-center justify-center shadow-2xs">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-rose-600">
              RD$ {totalExpenses.toLocaleString("es-DO")}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold text-[11px] border border-rose-200/60 shrink-0">
              <ArrowDownRight className="h-3 w-3" />
              {filteredCajaMovements.filter((m) => ["EGRESO", "RETIRO", "GASTO_CAJA_CHICA"].includes(m.tipo)).length} salidas
            </span>
            <span className="text-neutral-400 text-[11px] font-medium truncate">gastos operativos</span>
          </div>
        </div>

        {/* KPI 3: Utilidad Neta Real */}
        <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs hover:border-neutral-300 transition-all flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Utilidad Neta Real (P&L)
            </span>
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/70 flex items-center justify-center shadow-2xs">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className={cn("text-xl font-bold tracking-tight", netProfit >= 0 ? "text-blue-600" : "text-rose-600")}>
              RD$ {netProfit.toLocaleString("es-DO")}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200/60 shrink-0">
              <Percent className="h-3 w-3" />
              {profitMargin}% margen
            </span>
            <span className="text-neutral-400 text-[11px] font-medium truncate">después de ITBIS y gastos</span>
          </div>
        </div>

        {/* KPI 4: Ticket Promedio */}
        <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs hover:border-neutral-300 transition-all flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Ticket Promedio
            </span>
            <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-200/70 flex items-center justify-center shadow-2xs">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-neutral-900">
              RD$ {avgTicket.toLocaleString("es-DO")}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[11px] border border-purple-200/60 shrink-0">
              {conversionRate}% conversión
            </span>
            <span className="text-neutral-400 text-[11px] font-medium truncate">promedio por orden</span>
          </div>
        </div>
      </div>

      {/* ── BI TABBED SUITE ── */}
      <Tabs defaultValue="financial" className="space-y-6" onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="bg-neutral-200/60 p-1 rounded-2xl">
          <TabsTrigger value="financial" className="rounded-xl px-5 font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-xs flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
            Financiero & P&L
          </TabsTrigger>
          <TabsTrigger value="operations" className="rounded-xl px-5 font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-xs flex items-center gap-2">
            <Wrench className="h-3.5 w-3.5 text-blue-600" />
            Taller & Mecánicos
          </TabsTrigger>
          <TabsTrigger value="catalog" className="rounded-xl px-5 font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-xs flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-amber-600" />
            Repuestos & Ventas
          </TabsTrigger>
          <TabsTrigger value="fiscal" className="rounded-xl px-5 font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-xs flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
            Fiscal DGII (NCF)
          </TabsTrigger>
          <TabsTrigger value="invoices" className="rounded-xl px-5 font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-xs flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-neutral-600" />
            Historial de Facturas ({filteredInvoices.length})
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: FINANCIERO & P&L ── */}
        <TabsContent value="financial" className="space-y-6">
          <Suspense fallback={<div className="h-64 rounded-3xl bg-neutral-100 animate-pulse" />}>
            <ReportCharts
              timeSeriesData={timeSeriesData}
              topProducts={topProducts}
              statusData={statusData}
              paymentData={paymentMethodsData}
              periodLabel={periodLabelMap[period]}
            />
          </Suspense>
        </TabsContent>

        {/* ── TAB 2: TALLER & MECÁNICOS ── */}
        <TabsContent value="operations" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Technician Productivity */}
            <Card className="border border-neutral-200/80 shadow-xs rounded-3xl bg-white p-6">
              <CardHeader className="p-0 pb-4 border-b border-neutral-100">
                <CardTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Productividad del Equipo de Técnicos
                </CardTitle>
                <CardDescription className="text-xs">Mano de obra y volumen de órdenes atendidas</CardDescription>
              </CardHeader>
              <CardContent className="p-0 pt-4 space-y-3.5">
                {techProductivity.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-400 font-medium">
                    No hay mecánicos asignados en este período.
                  </div>
                ) : (
                  techProductivity.map((item, idx) => (
                    <div key={item.tech.id} className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-neutral-900 text-white font-bold text-xs flex items-center justify-center">
                          #{idx + 1}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-neutral-900">{item.tech.name}</p>
                          <p className="text-[11px] text-neutral-500">{item.ordersCount} órdenes completadas</p>
                        </div>
                      </div>
                      <span className="font-black text-sm text-neutral-900">
                        RD$ {item.totalGenerated.toLocaleString("es-DO")}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Order Flow Status */}
            <Card className="border border-neutral-200/80 shadow-xs rounded-3xl bg-white p-6">
              <CardHeader className="p-0 pb-4 border-b border-neutral-100">
                <CardTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-amber-600" />
                  Flujo de Órdenes de Trabajo
                </CardTitle>
                <CardDescription className="text-xs">Estado de vehículos en el taller</CardDescription>
              </CardHeader>
              <CardContent className="p-0 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  {statusData.map((s) => (
                    <div key={s.name} className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 text-center">
                      <span className="text-xs font-bold text-neutral-500 block">{s.name}</span>
                      <span className="text-2xl font-black text-neutral-900 mt-1 block">{s.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── TAB 3: CATÁLOGO & REPUESTOS ── */}
        <TabsContent value="catalog" className="space-y-6">
          <Card className="border border-neutral-200/80 shadow-xs rounded-3xl bg-white p-6">
            <CardHeader className="p-0 pb-4 border-b border-neutral-100">
              <CardTitle className="text-base font-bold text-neutral-900">Desglose de Repuestos y Servicios Vendidos</CardTitle>
              <CardDescription className="text-xs">Artículos de mayor rotación y recaudación</CardDescription>
            </CardHeader>
            <CardContent className="p-0 pt-4">
              <div className="divide-y divide-neutral-100">
                {topProducts.length === 0 ? (
                  <p className="text-center text-xs text-neutral-400 py-8">Sin artículos vendidos en el período.</p>
                ) : (
                  topProducts.map((p, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-neutral-100 flex items-center justify-center font-bold text-xs text-neutral-700">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-neutral-900">{p.name}</p>
                          <p className="text-[11px] text-neutral-500">{p.qty} unidades despachadas</p>
                        </div>
                      </div>
                      <span className="font-bold text-sm text-neutral-900">
                        RD$ {p.revenue.toLocaleString("es-DO")}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 4: FISCAL DGII & NCF ── */}
        <TabsContent value="fiscal" className="space-y-6">
          <Card className="border border-neutral-200/80 shadow-xs rounded-3xl bg-white p-6">
            <CardHeader className="p-0 pb-4 border-b border-neutral-100">
              <CardTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-purple-600" />
                Resumen Fiscal para Reporte 607 (DGII)
              </CardTitle>
              <CardDescription className="text-xs">Desglose por tipo de comprobante fiscal y recaudación de ITBIS</CardDescription>
            </CardHeader>
            <CardContent className="p-0 pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {ncfBreakdown.map(([key, item]) => (
                  <div key={key} className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-neutral-900 block">{item.label}</span>
                      <span className="text-[11px] text-neutral-500 font-medium mt-0.5 block">
                        {item.count} facturas · ITBIS: RD$ {item.itbis.toLocaleString("es-DO")}
                      </span>
                    </div>
                    <span className="font-bold text-base text-neutral-900">
                      RD$ {item.total.toLocaleString("es-DO")}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 5: HISTORIAL DE FACTURAS ── */}
        <TabsContent value="invoices" className="space-y-4">
          <Card className="border border-neutral-200/80 shadow-xs rounded-3xl bg-white overflow-hidden">
            <CardHeader className="p-5 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold text-neutral-900">Transacciones de Facturación</CardTitle>
                <CardDescription className="text-xs">Listado detallado de cobros realizados en el período</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                <Input
                  placeholder="Buscar por NCF o cliente..."
                  value={invoiceSearchQuery}
                  onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl border-neutral-200"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-neutral-50 text-neutral-500 font-bold uppercase tracking-wider border-b border-neutral-100 text-[10px]">
                    <tr>
                      <th className="px-5 py-3.5 text-left">Factura / NCF</th>
                      <th className="px-5 py-3.5 text-left">Cliente</th>
                      <th className="px-5 py-3.5 text-center">Método</th>
                      <th className="px-5 py-3.5 text-right">Total</th>
                      <th className="px-5 py-3.5 text-right">ITBIS</th>
                      <th className="px-5 py-3.5 text-center">Estado</th>
                      <th className="px-5 py-3.5 text-right">Fecha</th>
                      <th className="px-5 py-3.5 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredInvoices
                      .filter((inv) => {
                        if (!invoiceSearchQuery) return true;
                        const q = invoiceSearchQuery.toLowerCase();
                        const customer = customers.find((c) => c.id === inv.customerId);
                        return (
                          (inv.ncf && inv.ncf.toLowerCase().includes(q)) ||
                          (inv.id && inv.id.toLowerCase().includes(q)) ||
                          (customer && customer.name.toLowerCase().includes(q))
                        );
                      })
                      .map((inv) => {
                        const customer = customers.find((c) => c.id === inv.customerId);
                        return (
                          <tr key={inv.id} className="hover:bg-neutral-50/60 transition-colors">
                            <td className="px-5 py-3.5 font-mono font-bold text-neutral-900">
                              {inv.ncf || inv.id.slice(-8).toUpperCase()}
                            </td>
                            <td className="px-5 py-3.5 font-semibold text-neutral-800">
                              {customer?.name || "Cliente General"}
                            </td>
                            <td className="px-5 py-3.5 text-center capitalize text-neutral-600">
                              {inv.paymentMethod || "Efectivo"}
                            </td>
                            <td className="px-5 py-3.5 text-right font-black text-neutral-900">
                              RD$ {inv.total.toLocaleString("es-DO")}
                            </td>
                            <td className="px-5 py-3.5 text-right text-neutral-500">
                              RD$ {(inv.tax || 0).toLocaleString("es-DO")}
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <Badge className={cn(
                                "text-[9px] font-bold border-none px-2 py-0.5 rounded-full",
                                inv.status === "paid" ? "bg-emerald-100 text-emerald-700" :
                                inv.status === "cancelled" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                              )}>
                                {inv.status === "paid" ? "Pagada" : inv.status === "cancelled" ? "Anulada" : "Pendiente"}
                              </Badge>
                            </td>
                            <td className="px-5 py-3.5 text-right text-neutral-400 font-medium">
                              {new Date(inv.createdAt).toLocaleDateString("es-DO")}
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedInvoice(inv)}
                                className="h-7 px-2.5 text-[11px] text-neutral-700 hover:bg-neutral-100 rounded-lg cursor-pointer"
                              >
                                <Eye className="h-3 w-3 mr-1 text-neutral-500" /> Ver
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invoice Detail Dialog */}
      <InvoiceDetailDialog
        open={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
      />
    </div>
  );
}
