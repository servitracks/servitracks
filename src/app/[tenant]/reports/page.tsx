"use client";

import { useState, useMemo } from "react";
import { useStore, Invoice, MovimientoCaja } from "@/store/useStore";
import { useParams } from "@/lib/next-compat";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Percent,
  FileText,
  Search,
  CheckCircle2,
  Clock,
  CreditCard,
  Banknote,
  Receipt,
  Eye,
  Filter,
  Layers,
  Sparkles,
  ShieldCheck,
  FileSpreadsheet,
  Calendar,
  AlertTriangle,
  Coins,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn, formatRD } from "@/lib/utils";
import { InvoiceDetailDialog } from "@/components/dashboard/InvoiceDetailDialog";
import ReportCharts, {
  MonthlyPoint,
  PaymentMethodPoint,
  ProductPoint,
  OrderStatusPoint,
} from "./ReportCharts";

export default function ReportsPage() {
  const params = useParams();
  const tenantSlug = params?.tenant as string;
  const tenants = useStore((s) => s.tenants);
  const currentTenant = tenants.find((t) => t.slug === tenantSlug) ?? null;
  const tenantId = currentTenant?.id ?? "";

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [activeTab, setActiveTab] = useState<"charts" | "invoices" | "caja" | "resumen">("charts");
  const [period, setPeriod] = useState<"week" | "month" | "year" | "all">("month");

  // Filtros de tabla de facturas
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>("all");
  const [invoiceMethodFilter, setInvoiceMethodFilter] = useState<string>("all");

  const allInvoices = useStore((s) => s.invoices);
  const invoices = useMemo(
    () => (tenantId ? allInvoices.filter((i) => i.tenantId === tenantId) : []),
    [allInvoices, tenantId]
  );

  const allOrders = useStore((s) => s.orders);
  const orders = useMemo(
    () => (tenantId ? allOrders.filter((o) => o.tenantId === tenantId) : []),
    [allOrders, tenantId]
  );

  const allMovements = useStore((s) => s.cajaMovements);
  const cajaMovements = useMemo(
    () => (tenantId ? allMovements.filter((m) => m.tenant_id === tenantId) : []),
    [allMovements, tenantId]
  );

  const allCustomers = useStore((s) => s.customers);
  const customers = useMemo(
    () => (tenantId ? allCustomers.filter((c) => c.tenantId === tenantId) : []),
    [allCustomers, tenantId]
  );

  // Fecha límite según período seleccionado
  const now = new Date().getTime();
  const filterDate = useMemo(() => {
    if (period === "week") return new Date(now - 7 * 24 * 60 * 60 * 1000).getTime();
    if (period === "month") return new Date(now - 30 * 24 * 60 * 60 * 1000).getTime();
    if (period === "year") return new Date(now - 365 * 24 * 60 * 60 * 1000).getTime();
    return 0; // "all"
  }, [period, now]);

  // Registros filtrados por fecha
  const filteredInvoices = useMemo(
    () => invoices.filter((i) => new Date(i.createdAt).getTime() >= filterDate),
    [invoices, filterDate]
  );

  const filteredOrders = useMemo(
    () => orders.filter((o) => new Date(o.createdAt).getTime() >= filterDate),
    [orders, filterDate]
  );

  const filteredCajaMovements = useMemo(
    () => cajaMovements.filter((m) => new Date(m.creado_en).getTime() >= filterDate),
    [cajaMovements, filterDate]
  );

  // Métricas financieras principales
  const paidInvoices = useMemo(
    () => filteredInvoices.filter((i) => i.status === "paid"),
    [filteredInvoices]
  );

  const pendingInvoices = useMemo(
    () => filteredInvoices.filter((i) => i.status !== "paid" && i.status !== "cancelled"),
    [filteredInvoices]
  );

  const totalRevenue = useMemo(
    () => paidInvoices.reduce((acc, inv) => acc + (inv.total || 0), 0),
    [paidInvoices]
  );

  const totalPendingReceivable = useMemo(
    () => pendingInvoices.reduce((acc, inv) => acc + (inv.total || 0), 0),
    [pendingInvoices]
  );

  const totalEgresos = useMemo(
    () =>
      filteredCajaMovements
        .filter((m) => ["EGRESO", "RETIRO", "GASTO_CAJA_CHICA", "PAGO_NOMINA"].includes(m.tipo))
        .reduce((acc, m) => acc + (m.monto || 0), 0),
    [filteredCajaMovements]
  );

  const totalIngresosCajaExtra = useMemo(
    () =>
      filteredCajaMovements
        .filter((m) => ["INGRESO", "APORTE_CAPITAL"].includes(m.tipo))
        .reduce((acc, m) => acc + (m.monto || 0), 0),
    [filteredCajaMovements]
  );

  const netProfit = totalRevenue + totalIngresosCajaExtra - totalEgresos;
  const netMarginPercent =
    totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

  const avgTicket =
    paidInvoices.length > 0 ? Math.round(totalRevenue / paidInvoices.length) : 0;

  const totalITBIS = useMemo(
    () => paidInvoices.reduce((acc, inv) => acc + (inv.tax || 0), 0),
    [paidInvoices]
  );

  const conversionRate =
    filteredOrders.length > 0
      ? Math.min(100, Math.round((filteredInvoices.length / filteredOrders.length) * 100))
      : 0;

  // -- DATOS PARA GRÁFICOS REALES --
  // 1. Mensual (Ingresos vs Egresos del año actual)
  const monthlyComparison: MonthlyPoint[] = useMemo(() => {
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const currentYear = new Date().getFullYear();

    const data: MonthlyPoint[] = months.map((m) => ({
      month: m,
      ingresos: 0,
      egresos: 0,
      neto: 0,
    }));

    invoices.forEach((inv) => {
      if (inv.status === "paid" && inv.createdAt) {
        const d = new Date(inv.createdAt);
        if (d.getFullYear() === currentYear) {
          const monthIndex = d.getMonth();
          if (data[monthIndex]) {
            data[monthIndex].ingresos += inv.total || 0;
          }
        }
      }
    });

    cajaMovements.forEach((mov) => {
      if (["EGRESO", "RETIRO", "GASTO_CAJA_CHICA", "PAGO_NOMINA"].includes(mov.tipo) && mov.creado_en) {
        const d = new Date(mov.creado_en);
        if (d.getFullYear() === currentYear) {
          const monthIndex = d.getMonth();
          if (data[monthIndex]) {
            data[monthIndex].egresos += mov.monto || 0;
          }
        }
      }
    });

    data.forEach((item) => {
      item.neto = item.ingresos - item.egresos;
    });

    return data;
  }, [invoices, cajaMovements]);

  // 2. Métodos de Pago
  const paymentMethodData: PaymentMethodPoint[] = useMemo(() => {
    const map: Record<string, { value: number; count: number }> = {
      efectivo: { value: 0, count: 0 },
      tarjeta: { value: 0, count: 0 },
      transferencia: { value: 0, count: 0 },
      otro: { value: 0, count: 0 },
    };

    paidInvoices.forEach((inv) => {
      const pm = (inv.paymentMethod || "efectivo").toLowerCase();
      if (pm.includes("efectivo") || pm === "cash") {
        map.efectivo.value += inv.total;
        map.efectivo.count += 1;
      } else if (pm.includes("tarjeta") || pm.includes("card")) {
        map.tarjeta.value += inv.total;
        map.tarjeta.count += 1;
      } else if (pm.includes("transf") || pm.includes("deposito")) {
        map.transferencia.value += inv.total;
        map.transferencia.count += 1;
      } else {
        map.otro.value += inv.total;
        map.otro.count += 1;
      }
    });

    const colors: Record<string, string> = {
      Efectivo: "#0f172a", // Dark charcoal
      Tarjeta: "#2563eb", // Blue
      Transferencia: "#7c3aed", // Violet
      Otros: "#94a3b8", // Gray
    };

    const result: PaymentMethodPoint[] = [
      { name: "Efectivo", value: map.efectivo.value, count: map.efectivo.count, color: colors.Efectivo },
      { name: "Tarjeta", value: map.tarjeta.value, count: map.tarjeta.count, color: colors.Tarjeta },
      { name: "Transferencia", value: map.transferencia.value, count: map.transferencia.count, color: colors.Transferencia },
    ];

    if (map.otro.value > 0) {
      result.push({ name: "Otros", value: map.otro.value, count: map.otro.count, color: colors.Otros });
    }

    return result.filter((item) => item.value > 0);
  }, [paidInvoices]);

  // 3. Top Productos y Servicios
  const topProducts: ProductPoint[] = useMemo(() => {
    const map: Record<string, ProductPoint> = {};

    paidInvoices.forEach((inv) => {
      (inv.items || []).forEach((item) => {
        const key = item.name || "Servicio General";
        if (!map[key]) {
          map[key] = {
            name: key,
            qty: 0,
            revenue: 0,
            type: key.toLowerCase().includes("cambio") || key.toLowerCase().includes("revis") || key.toLowerCase().includes("alinea")
              ? "servicio"
              : "repuesto",
          };
        }
        map[key].qty += item.quantity || 1;
        map[key].revenue += (item.unitPrice || 0) * (item.quantity || 1);
      });
    });

    return Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [paidInvoices]);

  // 4. Estado de Órdenes
  const statusData: OrderStatusPoint[] = useMemo(() => {
    const list: OrderStatusPoint[] = [
      {
        name: "Pendiente",
        value: filteredOrders.filter((o) => o.status === "pending").length,
        color: "#f59e0b",
      },
      {
        name: "En Taller",
        value: filteredOrders.filter((o) => o.status === "repairing").length,
        color: "#3b82f6",
      },
      {
        name: "Completada",
        value: filteredOrders.filter((o) => o.status === "finished").length,
        color: "#10b981",
      },
      {
        name: "Entregada",
        value: filteredOrders.filter((o) => o.status === "delivered").length,
        color: "#0f172a",
      },
    ];
    return list.filter((d) => d.value > 0);
  }, [filteredOrders]);

  // -- EXPORTADOR PROFESIONAL A EXCEL / CSV CON UTF-8 BOM --
  const handleExportInvoicesExcel = () => {
    const headers = [
      "No. Factura / NCF",
      "Cliente",
      "Subtotal (RD$)",
      "ITBIS 18% (RD$)",
      "Total Factura (RD$)",
      "Metodo de Pago",
      "Estado",
      "Fecha de Emision",
      "Hora",
    ];

    const rows = filteredInvoices.map((inv) => {
      const customer = customers.find((c) => c.id === inv.customerId);
      const invDate = new Date(inv.createdAt);
      const subtotal = (inv.total || 0) - (inv.tax || 0);

      return [
        `"${inv.ncf || inv.id.slice(-8).toUpperCase()}"`,
        `"${(customer?.name || inv.customerName || "Consumidor Final").replace(/"/g, '""')}"`,
        subtotal.toFixed(2),
        (inv.tax || 0).toFixed(2),
        (inv.total || 0).toFixed(2),
        `"${(inv.paymentMethod || "Efectivo").toUpperCase()}"`,
        `"${inv.status === "paid" ? "PAGADA" : inv.status === "pending" ? "PENDIENTE" : "CANCELADA"}"`,
        `"${invDate.toLocaleDateString("es-DO")}"`,
        `"${invDate.toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })}"`,
      ].join(";");
    });

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Reporte_Facturacion_${currentTenant?.name || "Taller"}_${period}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCajaExcel = () => {
    const headers = [
      "Fecha",
      "Hora",
      "Tipo de Movimiento",
      "Concepto",
      "Metodo",
      "Monto (RD$)",
    ];

    const rows = filteredCajaMovements.map((mov) => {
      const d = new Date(mov.creado_en);
      return [
        `"${d.toLocaleDateString("es-DO")}"`,
        `"${d.toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })}"`,
        `"${mov.tipo}"`,
        `"${(mov.concepto || "").replace(/"/g, '""')}"`,
        `"${mov.metodo || "EFECTIVO"}"`,
        (mov.monto || 0).toFixed(2),
      ].join(";");
    });

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Reporte_Caja_Gastos_${currentTenant?.name || "Taller"}_${period}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportResumenExcel = () => {
    const metrics = [
      ["METRICA FINANCIERA", "VALOR (RD$)", "NOTAS"],
      ["Facturacion Total Cobrada", totalRevenue.toFixed(2), `${paidInvoices.length} facturas pagadas`],
      ["Egresos de Caja y Gastos", totalEgresos.toFixed(2), `${filteredCajaMovements.length} movimientos de egreso`],
      ["Rentabilidad Neta Operativa", netProfit.toFixed(2), `Margen estimado: ${netMarginPercent}%`],
      ["Cuentas por Cobrar (Pendiente)", totalPendingReceivable.toFixed(2), `${pendingInvoices.length} facturas por cobrar`],
      ["ITBIS 18% Recaudado", totalITBIS.toFixed(2), "Impuesto sobre transferencia de bienes"],
      ["Ticket Promedio por Factura", avgTicket.toFixed(2), "Facturado promedio por cliente"],
      ["Tasa de Conversion OT a Factura", `${conversionRate}%`, `${filteredOrders.length} ordenes en taller`],
    ];

    const csvContent =
      "\uFEFF" +
      metrics.map((row) => row.map((c) => `"${c}"`).join(";")).join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Resumen_Ejecutivo_${currentTenant?.name || "Taller"}_${period}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtrar facturas para la tabla de auditoría
  const auditedInvoices = useMemo(() => {
    let result = filteredInvoices;

    if (invoiceStatusFilter !== "all") {
      result = result.filter((i) => i.status === invoiceStatusFilter);
    }

    if (invoiceMethodFilter !== "all") {
      result = result.filter((i) =>
        (i.paymentMethod || "").toLowerCase().includes(invoiceMethodFilter.toLowerCase())
      );
    }

    if (invoiceSearch.trim()) {
      const q = invoiceSearch.toLowerCase().trim();
      result = result.filter(
        (i) =>
          (i.ncf || "").toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q) ||
          (i.customerName || "").toLowerCase().includes(q)
      );
    }

    return [...result].reverse();
  }, [filteredInvoices, invoiceStatusFilter, invoiceMethodFilter, invoiceSearch]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-1 animate-in fade-in duration-300">
      {/* CABECERA EJECUTIVA */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
              Reportes & Analítica
            </h1>
            <Badge
              variant="outline"
              className="text-[11px] font-bold rounded-full bg-neutral-100 text-neutral-700 border-neutral-200"
            >
              Auditoría en Tiempo Real
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Inteligencia de negocio, recaudación NCF, flujo de caja y rentabilidad neta del taller.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Selector de Período */}
          <div className="flex rounded-xl border border-neutral-200/80 bg-neutral-100/70 p-0.5 text-xs font-semibold">
            {(
              [
                { id: "week", label: "7 Días" },
                { id: "month", label: "30 Días" },
                { id: "year", label: "Año" },
                { id: "all", label: "Todo" },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                  period === p.id
                    ? "bg-neutral-900 text-white shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Menú de Exportación Profesional a Excel */}
          <DropdownMenu>
            <DropdownMenuTrigger className="h-9 px-3 rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs">
              <FileSpreadsheet className="h-4 w-4" />
              Exportar a Excel
              <ChevronDown className="h-3 w-3 opacity-70" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuLabel className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                Formatos Microsoft Excel (CSV)
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleExportInvoicesExcel}
                className="text-xs cursor-pointer gap-2 py-2"
              >
                <Receipt className="h-3.5 w-3.5 text-neutral-700" />
                <span>Facturación Completa (.csv)</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportCajaExcel}
                className="text-xs cursor-pointer gap-2 py-2"
              >
                <Wallet className="h-3.5 w-3.5 text-neutral-700" />
                <span>Libro de Caja y Gastos (.csv)</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportResumenExcel}
                className="text-xs cursor-pointer gap-2 py-2"
              >
                <BarChart3 className="h-3.5 w-3.5 text-neutral-700" />
                <span>Resumen Ejecutivo (.csv)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 6 KPI CARDS EJECUTIVAS */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* KPI 1: Ingresos Totales */}
        <Card className="border border-neutral-200/80 bg-white shadow-2xs hover:shadow-xs transition-all duration-200 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Facturado Cobrado
            </span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
              <DollarSign className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="font-heading text-xl font-black tracking-tight text-neutral-900 font-mono tabular-nums">
              {formatRD(totalRevenue)}
            </div>
            <p className="text-[10px] text-neutral-400 mt-1 font-medium">
              {paidInvoices.length} {paidInvoices.length === 1 ? "factura pagada" : "facturas pagadas"}
            </p>
          </div>
        </Card>

        {/* KPI 2: Egresos Totales */}
        <Card className="border border-neutral-200/80 bg-white shadow-2xs hover:shadow-xs transition-all duration-200 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Egresos de Caja
            </span>
            <div className="h-7 w-7 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-700">
              <Wallet className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="font-heading text-xl font-black tracking-tight text-neutral-900 font-mono tabular-nums">
              {formatRD(totalEgresos)}
            </div>
            <p className="text-[10px] text-neutral-400 mt-1 font-medium">
              {filteredCajaMovements.filter((m) => ["EGRESO", "RETIRO", "GASTO_CAJA_CHICA", "PAGO_NOMINA"].includes(m.tipo)).length} desembolsos
            </p>
          </div>
        </Card>

        {/* KPI 3: Margen Neto */}
        <Card className="border border-neutral-200/80 bg-white shadow-2xs hover:shadow-xs transition-all duration-200 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Margen Neto
            </span>
            <div className="h-7 w-7 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-700">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div
              className={`font-heading text-xl font-black tracking-tight font-mono tabular-nums ${
                netProfit >= 0 ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {formatRD(netProfit)}
            </div>
            <p className="text-[10px] text-neutral-400 mt-1 font-medium">
              Margen: <span className="font-bold text-neutral-700">{netMarginPercent}%</span>
            </p>
          </div>
        </Card>

        {/* KPI 4: Ticket Promedio */}
        <Card className="border border-neutral-200/80 bg-white shadow-2xs hover:shadow-xs transition-all duration-200 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Ticket Promedio
            </span>
            <div className="h-7 w-7 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-700">
              <Receipt className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="font-heading text-xl font-black tracking-tight text-neutral-900 font-mono tabular-nums">
              {formatRD(avgTicket)}
            </div>
            <p className="text-[10px] text-neutral-400 mt-1 font-medium">
              Por comprobante fiscal
            </p>
          </div>
        </Card>

        {/* KPI 5: Cuentas por Cobrar */}
        <Card className="border border-neutral-200/80 bg-white shadow-2xs hover:shadow-xs transition-all duration-200 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Por Cobrar
            </span>
            <div className="h-7 w-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="font-heading text-xl font-black tracking-tight text-amber-800 font-mono tabular-nums">
              {formatRD(totalPendingReceivable)}
            </div>
            <p className="text-[10px] text-neutral-400 mt-1 font-medium">
              {pendingInvoices.length} facturas pendientes
            </p>
          </div>
        </Card>

        {/* KPI 6: Conversión Taller */}
        <Card className="border border-neutral-200/80 bg-white shadow-2xs hover:shadow-xs transition-all duration-200 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Conversión OT
            </span>
            <div className="h-7 w-7 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-700">
              <Percent className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="font-heading text-xl font-black tracking-tight text-neutral-900 font-mono tabular-nums">
              {conversionRate}%
            </div>
            <p className="text-[10px] text-neutral-400 mt-1 font-medium">
              De órdenes a facturas
            </p>
          </div>
        </Card>
      </div>

      {/* BARRA DE PESTAÑAS (Estándar Negro Primario) */}
      <div className="flex flex-wrap items-center gap-1.5 bg-neutral-100/80 p-1 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("charts")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "charts"
              ? "bg-neutral-900 text-white shadow-xs"
              : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50"
          )}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Gráficos & Inteligencia Financiera
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("invoices")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "invoices"
              ? "bg-neutral-900 text-white shadow-xs"
              : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50"
          )}
        >
          <Receipt className="h-3.5 w-3.5" />
          Auditoría de Facturación
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
              activeTab === "invoices" ? "bg-neutral-800 text-white" : "bg-neutral-200 text-neutral-700"
            )}
          >
            {filteredInvoices.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("caja")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "caja"
              ? "bg-neutral-900 text-white shadow-xs"
              : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50"
          )}
        >
          <Wallet className="h-3.5 w-3.5" />
          Libro de Caja & Egresos
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
              activeTab === "caja" ? "bg-neutral-800 text-white" : "bg-neutral-200 text-neutral-700"
            )}
          >
            {filteredCajaMovements.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("resumen")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "resumen"
              ? "bg-neutral-900 text-white shadow-xs"
              : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50"
          )}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Auditoría DGII & ITBIS
        </button>
      </div>

      {/* CONTENIDO 1: GRÁFICOS */}
      {activeTab === "charts" && (
        <ReportCharts
          monthlyComparison={monthlyComparison}
          paymentMethodData={paymentMethodData}
          topProducts={topProducts}
          statusData={statusData}
        />
      )}

      {/* CONTENIDO 2: AUDITORÍA DE FACTURACIÓN NCF */}
      {activeTab === "invoices" && (
        <Card className="border border-neutral-200/80 bg-white shadow-2xs rounded-2xl overflow-hidden">
          {/* Barra de filtros de facturas */}
          <div className="p-4 border-b border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <Input
                placeholder="Buscar por NCF, ID o cliente..."
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                className="pl-8 h-9 text-xs rounded-xl border-neutral-200 bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={invoiceStatusFilter} onValueChange={(v) => v && setInvoiceStatusFilter(v)}>
                <SelectTrigger className="h-9 w-36 rounded-xl border-neutral-200 text-xs bg-white">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="paid">Pagadas</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="cancelled">Canceladas</SelectItem>
                </SelectContent>
              </Select>

              <Select value={invoiceMethodFilter} onValueChange={(v) => v && setInvoiceMethodFilter(v)}>
                <SelectTrigger className="h-9 w-40 rounded-xl border-neutral-200 text-xs bg-white">
                  <SelectValue placeholder="Método pago" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Todos los métodos</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-200/70 text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Comprobante NCF</th>
                  <th className="py-3 px-4">Cliente / Razón Social</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                  <th className="py-3 px-4 text-right">ITBIS (18%)</th>
                  <th className="py-3 px-4 text-right">Total Factura</th>
                  <th className="py-3 px-4 text-center">Método</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Fecha Emisión</th>
                  <th className="py-3 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {auditedInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-14 text-center text-neutral-400 font-medium">
                      No se encontraron comprobantes fiscales para este filtro.
                    </td>
                  </tr>
                ) : (
                  auditedInvoices.map((inv) => {
                    const customer = customers.find((c) => c.id === inv.customerId);
                    const subtotal = (inv.total || 0) - (inv.tax || 0);

                    return (
                      <tr
                        key={inv.id}
                        onClick={() => setSelectedInvoice(inv)}
                        className="hover:bg-neutral-50/70 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-neutral-900 text-xs">
                            {inv.ncf || inv.id.slice(-8).toUpperCase()}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-neutral-900 text-xs">
                            {customer?.name || inv.customerName || "Consumidor Final"}
                          </div>
                          <div className="text-[10px] text-neutral-400">
                            {customer?.phone || "Sin contacto"}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right font-mono tabular-nums text-neutral-600 whitespace-nowrap">
                          {formatRD(subtotal)}
                        </td>

                        <td className="py-3 px-4 text-right font-mono tabular-nums text-neutral-600 whitespace-nowrap">
                          {formatRD(inv.tax || 0)}
                        </td>

                        <td className="py-3 px-4 text-right font-black font-mono tabular-nums text-neutral-950 text-xs whitespace-nowrap">
                          {formatRD(inv.total)}
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-semibold capitalize bg-neutral-100 text-neutral-800 border-neutral-200"
                          >
                            {inv.paymentMethod || "Efectivo"}
                          </Badge>
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase",
                              inv.status === "paid"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200/60"
                                : inv.status === "pending"
                                ? "bg-amber-50 text-amber-800 border-amber-200/60"
                                : "bg-neutral-100 text-neutral-600 border-neutral-200"
                            )}
                          >
                            {inv.status === "paid" ? "Pagada" : inv.status === "pending" ? "Pendiente" : "Cancelada"}
                          </Badge>
                        </td>

                        <td className="py-3 px-4 text-right text-neutral-500 whitespace-nowrap text-[11px]">
                          {new Date(inv.createdAt).toLocaleDateString("es-DO", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedInvoice(inv)}
                            className="h-7 w-7 p-0 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 cursor-pointer"
                            title="Ver ticket de factura"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-neutral-50/80 border-t border-neutral-200/80 font-semibold text-xs">
                <tr>
                  <td colSpan={2} className="py-3 px-4 uppercase text-[10px] tracking-wider text-neutral-500 font-bold">
                    Totales ({auditedInvoices.length} facturas):
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-neutral-700">
                    {formatRD(
                      auditedInvoices.reduce((acc, i) => acc + ((i.total || 0) - (i.tax || 0)), 0)
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-neutral-700">
                    {formatRD(auditedInvoices.reduce((acc, i) => acc + (i.tax || 0), 0))}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-black text-neutral-900 text-xs">
                    {formatRD(auditedInvoices.reduce((acc, i) => acc + (i.total || 0), 0))}
                  </td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* CONTENIDO 3: LIBRO DE CAJA & EGRESOS */}
      {activeTab === "caja" && (
        <Card className="border border-neutral-200/80 bg-white shadow-2xs rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-sm text-neutral-900">
                Movimientos de Caja del Período
              </h3>
              <p className="text-xs text-neutral-400">
                Ingresos extraordinarios, egresos operativos, retiros y pagos de nómina
              </p>
            </div>
            <Button
              onClick={handleExportCajaExcel}
              variant="outline"
              size="sm"
              className="h-8 rounded-xl border-neutral-200 text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" /> Descargar CSV
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-200/70 text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Fecha & Hora</th>
                  <th className="py-3 px-4">Tipo Movimiento</th>
                  <th className="py-3 px-4">Concepto / Motivo</th>
                  <th className="py-3 px-4 text-center">Método</th>
                  <th className="py-3 px-4 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredCajaMovements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-14 text-center text-neutral-400 font-medium">
                      No hay movimientos de caja registrados en este período.
                    </td>
                  </tr>
                ) : (
                  [...filteredCajaMovements].reverse().map((mov) => {
                    const isOutflow = ["EGRESO", "RETIRO", "GASTO_CAJA_CHICA", "PAGO_NOMINA"].includes(mov.tipo);
                    return (
                      <tr key={mov.id} className="hover:bg-neutral-50/70 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap text-neutral-600">
                          {new Date(mov.creado_en).toLocaleString("es-DO", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                              isOutflow
                                ? "bg-rose-50 text-rose-700 border-rose-200/60"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                            )}
                          >
                            {mov.tipo}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-medium text-neutral-800">
                          {mov.concepto || "Sin concepto registrado"}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap text-neutral-600 font-mono text-[11px]">
                          {mov.metodo || "EFECTIVO"}
                        </td>
                        <td
                          className={cn(
                            "py-3 px-4 text-right font-black font-mono tabular-nums text-xs whitespace-nowrap",
                            isOutflow ? "text-rose-700" : "text-emerald-700"
                          )}
                        >
                          {isOutflow ? `-${formatRD(mov.monto)}` : `+${formatRD(mov.monto)}`}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-neutral-50/80 border-t border-neutral-200/80 font-semibold text-xs">
                <tr>
                  <td colSpan={4} className="py-3 px-4 uppercase text-[10px] tracking-wider text-neutral-500 font-bold">
                    Total Egresos de Caja:
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-black text-rose-700 text-xs">
                    -{formatRD(totalEgresos)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* CONTENIDO 4: AUDITORÍA DGII & ITBIS */}
      {activeTab === "resumen" && (
        <Card className="border border-neutral-200/80 bg-white shadow-2xs rounded-2xl p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-heading text-lg font-bold text-neutral-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-neutral-900" />
                Resumen de Obligaciones Fiscales & ITBIS (DGII)
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5 max-w-xl">
                Cálculo de impuestos sobre comprobantes fiscales emitidos con crédito fiscal, consumidor final o gubernamentales.
              </p>
            </div>
            <Button
              onClick={handleExportResumenExcel}
              className="h-9 rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
            >
              <Download className="h-3.5 w-3.5" /> Descargar Auditoría Fiscal
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/70">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                Base Imponible Gravada (Subtotal)
              </span>
              <span className="font-heading text-xl font-black text-neutral-900 font-mono tabular-nums">
                {formatRD(totalRevenue - totalITBIS)}
              </span>
              <p className="text-[11px] text-neutral-400 mt-1">Monto facturado antes de ITBIS</p>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/70">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                ITBIS 18% Trasladado (Cobrado)
              </span>
              <span className="font-heading text-xl font-black text-neutral-900 font-mono tabular-nums">
                {formatRD(totalITBIS)}
              </span>
              <p className="text-[11px] text-neutral-400 mt-1">Impuesto cobrado a clientes</p>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/70">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                Total Recaudado con ITBIS
              </span>
              <span className="font-heading text-xl font-black text-emerald-700 font-mono tabular-nums">
                {formatRD(totalRevenue)}
              </span>
              <p className="text-[11px] text-neutral-400 mt-1">Total percibido en cobros</p>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200/80 p-4 text-xs text-neutral-600 space-y-2 bg-neutral-50/50">
            <p className="font-bold text-neutral-900">Formatos de Envío DGII (606 / 607):</p>
            <p>
              • Las facturas emitidas con NCF se consolidan para la declaración del formulario <b>607 (Ventas de Bienes y Servicios)</b>.
            </p>
            <p>
              • Los egresos de repuestos a proveedores con NCF se computan para el crédito de ITBIS deducible en el formulario <b>606 (Compras y Gastos)</b>.
            </p>
          </div>
        </Card>
      )}

      {/* DIÁLOGO ORIGINAL TÉRMICO DE LA FACTURA */}
      <InvoiceDetailDialog
        open={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
      />
    </div>
  );
}
