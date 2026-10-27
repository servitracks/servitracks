"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "@/lib/next-compat";
import { useStore } from "@/store/useStore";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  FileText,
  AlertTriangle,
  TrendingUp,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  CheckCircle2,
  FileCheck,
  Archive,
  Clock,
  Send,
  Ban,
  Car,
  MessageSquare,
  ShoppingCart,
  X,
  Layers,
  List,
  LayoutGrid,
  ChevronRight,
  Printer,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Quote, QuoteStatus } from "@/store/types";
import QuotationCreateDialog from "./QuotationCreateDialog";
import QuotationDetailDialog from "./QuotationDetailDialog";

interface StatusConfigItem {
  label: string;
  badge: string;
  dot: string;
  icon: typeof Clock;
}

const statusConfig: Record<QuoteStatus, StatusConfigItem> = {
  draft: {
    label: "Borrador",
    badge: "bg-neutral-100 text-neutral-800 border-neutral-200/90",
    dot: "bg-neutral-400",
    icon: Clock,
  },
  sent: {
    label: "Enviada",
    badge: "bg-blue-50 text-blue-800 border-blue-200/90",
    dot: "bg-blue-500",
    icon: Send,
  },
  accepted: {
    label: "Aceptada",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200/90",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rechazada",
    badge: "bg-rose-50 text-rose-800 border-rose-200/90",
    dot: "bg-rose-500",
    icon: Ban,
  },
  expired: {
    label: "Expirada",
    badge: "bg-amber-50 text-amber-800 border-amber-200/90",
    dot: "bg-amber-500",
    icon: AlertTriangle,
  },
  archived: {
    label: "Archivada",
    badge: "bg-purple-50 text-purple-800 border-purple-200/90",
    dot: "bg-purple-500",
    icon: Archive,
  },
};

export default function CotizacionesPage() {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params?.tenant as string;
  const tenants = useStore((s) => s.tenants);
  const currentTenant = tenants.find((t) => t.slug === tenantSlug) ?? null;
  const tenantId = currentTenant?.id ?? "";

  const allQuotes = useStore((s) => s.quotes);
  const allCustomers = useStore((s) => s.customers);
  const allVehicles = useStore((s) => s.vehicles);
  const deleteQuote = useStore((s) => s.deleteQuote);
  const updateQuote = useStore((s) => s.updateQuote);

  // Modal states
  const [quoteToDelete, setQuoteToDelete] = useState<{ id: string; num: string } | null>(null);
  const [quoteToArchive, setQuoteToArchive] = useState<Quote | null>(null);
  const [archiveObsInput, setArchiveObsInput] = useState<string>("");

  const handleOpenArchive = (quote: Quote) => {
    setQuoteToArchive(quote);
    setArchiveObsInput(quote.observation || "");
  };

  const quotes = useMemo(
    () => (tenantId ? allQuotes.filter((q) => q.tenantId === tenantId) : []),
    [allQuotes, tenantId]
  );

  const customers = useMemo(
    () => (tenantId ? allCustomers.filter((c) => c.tenantId === tenantId) : []),
    [allCustomers, tenantId]
  );

  const vehicles = useMemo(
    () => (tenantId ? allVehicles.filter((v) => v.tenantId === tenantId) : []),
    [allVehicles, tenantId]
  );

  // Filters & Views
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Dialog controls
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedQuoteIdToEdit, setSelectedQuoteIdToEdit] = useState<string | null>(null);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedQuoteDetailId, setSelectedQuoteDetailId] = useState<string | null>(null);

  const selectedQuoteDetail = useMemo(
    () => (selectedQuoteDetailId ? quotes.find((q) => q.id === selectedQuoteDetailId) || null : null),
    [quotes, selectedQuoteDetailId]
  );

  // Status counts
  const counts = useMemo(() => {
    const res: Record<string, number> = {
      draft: 0,
      sent: 0,
      accepted: 0,
      rejected: 0,
      expired: 0,
      archived: 0,
    };
    quotes.forEach((q) => {
      if (res[q.status] !== undefined) {
        res[q.status]++;
      }
    });
    return res;
  }, [quotes]);

  // Tab definitions with count badges
  const tabsConfig = [
    { id: "Todos", label: "Todas", icon: Layers, count: quotes.length },
    { id: "draft", label: "Borrador", icon: Clock, count: counts.draft },
    { id: "sent", label: "Enviadas", icon: Send, count: counts.sent },
    { id: "accepted", label: "Aprobadas", icon: CheckCircle2, count: counts.accepted },
    { id: "rejected", label: "Rechazadas", icon: Ban, count: counts.rejected },
    { id: "expired", label: "Expiradas", icon: AlertTriangle, count: counts.expired },
    { id: "archived", label: "Archivadas", icon: Archive, count: counts.archived },
  ];

  // Filters logic
  const filteredQuotes = useMemo(() => {
    const q = search.trim().toLowerCase();

    return quotes.filter((quote) => {
      // 1. Status Filter
      if (statusFilter !== "Todos" && quote.status !== statusFilter) {
        return false;
      }

      // 2. Search query filter
      if (!q) return true;

      const customer = customers.find((c) => c.id === quote.customerId);
      const vehicle = vehicles.find((v) => v.id === quote.vehicleId);

      const customerName = (customer?.name || "").toLowerCase();
      const customerPhone = (customer?.phone || "").toLowerCase();
      const customerRnc = (customer?.rnc || "").toLowerCase();
      const quoteNo = (quote.quoteNumber || "").toLowerCase();
      const plate = (vehicle?.plate || "").toLowerCase();
      const brand = (vehicle?.brand || "").toLowerCase();
      const model = (vehicle?.model || "").toLowerCase();
      const obs = (quote.observation || "").toLowerCase();
      const notes = (quote.notes || "").toLowerCase();
      const hasItemMatch = (quote.items || []).some((item) => item.name.toLowerCase().includes(q));

      return (
        customerName.includes(q) ||
        customerPhone.includes(q) ||
        customerRnc.includes(q) ||
        quoteNo.includes(q) ||
        plate.includes(q) ||
        brand.includes(q) ||
        model.includes(q) ||
        obs.includes(q) ||
        notes.includes(q) ||
        hasItemMatch
      );
    });
  }, [quotes, customers, vehicles, search, statusFilter]);

  // KPIs calculations
  const kpis = useMemo(() => {
    const totalAmount = quotes.reduce((acc, q) => acc + (q.total || 0), 0);
    const pendingCount = quotes.filter((q) => q.status === "draft" || q.status === "sent").length;
    const acceptedQuotes = quotes.filter((q) => q.status === "accepted");
    const acceptedCount = acceptedQuotes.length;
    const conversionRate = quotes.length > 0 ? Math.round((acceptedCount / quotes.length) * 100) : 0;

    return {
      totalAmount,
      pendingCount,
      acceptedCount,
      conversionRate,
    };
  }, [quotes]);

  const handleEdit = (quote: Quote) => {
    setSelectedQuoteIdToEdit(quote.id);
    setIsCreateOpen(true);
  };

  const handleViewDetail = (quote: Quote) => {
    setSelectedQuoteDetailId(quote.id);
    setIsDetailOpen(true);
  };

  // WhatsApp 1-Click Share
  const handleShareWhatsApp = (quote: Quote) => {
    const customer = customers.find((c) => c.id === quote.customerId);
    const vehicle = vehicles.find((v) => v.id === quote.vehicleId);

    if (!customer || !customer.phone) {
      toast.error("El cliente no tiene un teléfono registrado para WhatsApp");
      return;
    }

    const brandModel = vehicle ? `${vehicle.brand} ${vehicle.model}` : "Vehículo";
    const plate = vehicle?.plate ? `(Placa: ${vehicle.plate.toUpperCase()})` : "";

    let itemsText = "";
    (quote.items || []).forEach((item) => {
      itemsText += `• ${item.quantity}x ${item.name} - RD$ ${item.unitPrice.toLocaleString("es-DO")}\n`;
    });

    const validText = quote.validUntil
      ? `*Válida hasta:* ${new Date(quote.validUntil).toLocaleDateString("es-DO")}\n`
      : "";

    const message =
      `*${currentTenant?.name || "ServiTracks"} - Presupuesto de Taller*\n\n` +
      `Estimado(a) *${customer.name}*,\n` +
      `Le compartimos la cotización *${quote.quoteNumber}* para su vehículo *${brandModel}* ${plate}.\n\n` +
      `*Detalles del presupuesto:*\n` +
      `${itemsText}\n` +
      `*Subtotal:* RD$ ${quote.subtotal.toLocaleString("es-DO")}\n` +
      (quote.discount ? `*Descuento:* - RD$ ${quote.discount.toLocaleString("es-DO")}\n` : "") +
      `*ITBIS (Impuestos):* RD$ ${quote.tax.toLocaleString("es-DO")}\n` +
      `*Total Estimado:* RD$ ${quote.total.toLocaleString("es-DO")}\n\n` +
      validText +
      (quote.notes ? `*Notas:* ${quote.notes}\n\n` : "") +
      `¿Desea que procedamos a agendar su cita para realizar el trabajo? Quedamos a su orden.`;

    const encodedText = encodeURIComponent(message);
    const cleanPhone = customer.phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `1${cleanPhone}` : cleanPhone;

    window.open(`https://wa.me/${formattedPhone}?text=${encodedText}`, "_blank");
    if (quote.status === "draft") {
      updateQuote(quote.id, { status: "sent" });
    }
    toast.success("Enlace de WhatsApp preparado");
  };

  // Helper for expiry countdown
  const getExpiryInfo = (validUntil?: string) => {
    if (!validUntil) return null;
    const expiry = new Date(validUntil);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `Venció hace ${Math.abs(diffDays)}d`, isExpired: true, isSoon: false, days: diffDays };
    } else if (diffDays === 0) {
      return { text: "Vence hoy", isExpired: false, isSoon: true, days: 0 };
    } else if (diffDays <= 3) {
      return { text: `Vence en ${diffDays}d`, isExpired: false, isSoon: true, days: diffDays };
    } else {
      return { text: `Vence en ${diffDays}d`, isExpired: false, isSoon: false, days: diffDays };
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Principal */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              Cotizaciones
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
              {quotes.length} registradas
            </span>
          </div>
          <p className="text-sm text-neutral-500 mt-1">
            Administra presupuestos, cotizaciones de clientes y flujos de aprobación.
          </p>
        </div>

        {/* Acciones de Cabecera */}
        <div className="flex items-center gap-2">
          {/* Switch de Vista: Lista / Tarjetas */}
          <div className="flex rounded-xl border border-neutral-200/90 overflow-hidden bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                viewMode === "list"
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
              )}
              title="Vista de Lista"
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Lista</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                viewMode === "grid"
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
              )}
              title="Vista de Tarjetas"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tarjetas</span>
            </button>
          </div>

          <Button
            className="rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 gap-2 h-10 px-4 text-xs font-semibold shadow-sm active:scale-[0.98] transition-all cursor-pointer"
            onClick={() => {
              setSelectedQuoteIdToEdit(null);
              setIsCreateOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            <span>Nueva Cotización</span>
          </Button>
        </div>
      </div>

      {/* 2. KPI Cards Métricas Operativas (Interactividad al Clic) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Cotizado",
            value: `RD$ ${kpis.totalAmount.toLocaleString("es-DO")}`,
            subtext: `${quotes.length} presupuestos`,
            icon: DollarSign,
            iconBg: "bg-slate-100 text-slate-800 border-slate-200/80",
            tabAction: "Todos",
          },
          {
            label: "Cotizaciones Pendientes",
            value: kpis.pendingCount,
            subtext: "Por responder o enviar",
            icon: Clock,
            iconBg: "bg-amber-50 text-amber-700 border-amber-200/80",
            tabAction: "draft",
          },
          {
            label: "Aprobadas",
            value: kpis.acceptedCount,
            subtext: "Listas para orden o POS",
            icon: CheckCircle2,
            iconBg: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
            tabAction: "accepted",
          },
          {
            label: "Conversión Presupuestos",
            value: `${kpis.conversionRate}%`,
            subtext: `${kpis.acceptedCount} de ${quotes.length} cerradas`,
            icon: TrendingUp,
            iconBg: "bg-violet-50 text-violet-700 border-violet-200/80",
            tabAction: "accepted",
          },
        ].map((kpi) => {
          const isFilterActive =
            (kpi.tabAction === "Todos" && statusFilter === "Todos") ||
            (kpi.tabAction !== "Todos" && statusFilter === kpi.tabAction);

          return (
            <button
              key={kpi.label}
              type="button"
              onClick={() => setStatusFilter(kpi.tabAction)}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-3.5 bg-white shadow-2xs text-left transition-all cursor-pointer group active:scale-[0.98]",
                isFilterActive
                  ? "border-neutral-900 ring-1 ring-neutral-900"
                  : "border-neutral-200/80 hover:border-neutral-300 hover:shadow-xs"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl border flex-shrink-0 transition-transform group-hover:scale-105",
                  kpi.iconBg
                )}
              >
                <kpi.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 leading-tight truncate">
                  {kpi.label}
                </p>
                <p className="text-xl font-bold tracking-tight text-neutral-900 leading-tight mt-0.5 font-mono tabular-nums truncate">
                  {kpi.value}
                </p>
                <p className="text-[10px] text-neutral-400 truncate mt-0.5">{kpi.subtext}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. Barra de Filtros: Pestañas con Iconos y Active State Negro Primario */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50/80 p-2 rounded-2xl border border-neutral-200/80">
        {/* Pestañas con iconos */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {tabsConfig.map((tab) => {
            const Icon = tab.icon;
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all whitespace-nowrap cursor-pointer active:scale-[0.98]",
                  isActive
                    ? "bg-neutral-900 text-white font-semibold shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 font-medium"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", isActive ? "text-white" : "text-neutral-500")} />
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "text-[10px] font-mono px-1.5 py-0.2 rounded-full",
                    isActive ? "bg-white/20 text-white" : "bg-neutral-200/70 text-neutral-600"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Buscador inteligente */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder="Buscar cotización, cliente, placa o ítem..."
            className="h-9 w-full rounded-xl border-neutral-200 bg-white pl-9 pr-8 text-xs focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all placeholder:text-neutral-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5 rounded-md hover:bg-neutral-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. VISTA DE LISTA (Tabla Alta Gama) */}
      {viewMode === "list" && (
        <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-neutral-50/80 border-b border-neutral-200/80">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[140px] text-[11px] font-semibold uppercase tracking-wider text-neutral-500 py-3.5 pl-6">
                    Cotización
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 py-3.5">
                    Cliente
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 py-3.5">
                    Vehículo
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 py-3.5">
                    Emisión & Validez
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 py-3.5 max-w-[180px]">
                    Observación / Notas
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 py-3.5 text-right">
                    Total
                  </TableHead>
                  <TableHead className="w-[110px] text-[11px] font-semibold uppercase tracking-wider text-neutral-500 py-3.5 text-center">
                    Estado
                  </TableHead>
                  <TableHead className="w-[100px] text-[11px] font-semibold uppercase tracking-wider text-neutral-500 py-3.5 text-right pr-6">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-44 text-center bg-white">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                        <div className="h-12 w-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400">
                          <FileText className="h-6 w-6" />
                        </div>
                        <p className="font-semibold text-neutral-800 text-sm">
                          No se encontraron cotizaciones
                        </p>
                        <p className="text-xs text-neutral-500">
                          {search
                            ? `No hay presupuestos que coincidan con "${search}".`
                            : "No hay cotizaciones registradas en este estado."}
                        </p>
                        {search && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSearch("")}
                            className="mt-2 rounded-xl text-xs"
                          >
                            Limpiar búsqueda
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuotes.map((quote) => {
                    const customer = customers.find((c) => c.id === quote.customerId);
                    const vehicle = vehicles.find((v) => v.id === quote.vehicleId);
                    const statusInfo = statusConfig[quote.status] || statusConfig.draft;
                    const StatusIcon = statusInfo?.icon || Clock;
                    const expiryInfo = getExpiryInfo(quote.validUntil);
                    const customerInitials = customer?.name
                      ? customer.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()
                      : "CG";

                    return (
                      <TableRow
                        key={quote.id}
                        className="group hover:bg-neutral-50/70 bg-white border-b border-neutral-100 transition-colors"
                      >
                        {/* 1. Cotización */}
                        <TableCell className="py-3.5 pl-6">
                          <button
                            type="button"
                            onClick={() => handleViewDetail(quote)}
                            className="text-left font-mono font-bold text-xs sm:text-sm text-neutral-900 hover:text-neutral-600 transition-colors cursor-pointer group-hover:underline block"
                          >
                            {quote.quoteNumber}
                          </button>
                          <span className="text-[10px] text-neutral-400 font-mono block mt-0.5">
                            {quote.items?.length || 0} {(quote.items?.length || 0) === 1 ? "ítem" : "ítems"}
                          </span>
                        </TableCell>

                        {/* 2. Cliente */}
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-white font-bold text-[11px] shrink-0 font-mono">
                              {customerInitials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-neutral-900 text-xs truncate max-w-[160px]">
                                {customer?.name || "Cliente General"}
                              </p>
                              {customer?.phone ? (
                                <p className="text-[11px] text-neutral-500 font-mono">
                                  {customer.phone}
                                </p>
                              ) : (
                                <span className="text-[10px] text-neutral-400">Sin teléfono</span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* 3. Vehículo con Matrícula Dominicana Estilo RD */}
                        <TableCell className="py-3.5">
                          {vehicle ? (
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 shrink-0">
                                <Car className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-neutral-900 text-xs truncate max-w-[140px]">
                                  {vehicle.brand} {vehicle.model}
                                </p>
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-neutral-100 border border-neutral-300 shadow-2xs font-mono mt-0.5">
                                  <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-wider">
                                    RD
                                  </span>
                                  <span className="text-[11px] font-black text-neutral-900 tracking-wide">
                                    {vehicle.plate.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-neutral-400 text-xs">—</span>
                          )}
                        </TableCell>

                        {/* 4. Emisión y Validez con Indicadores */}
                        <TableCell className="py-3.5">
                          <div className="space-y-0.5">
                            <p className="text-xs text-neutral-700 font-medium">
                              {new Date(quote.createdAt).toLocaleDateString("es-DO")}
                            </p>
                            {quote.validUntil ? (
                              <div>
                                {expiryInfo?.isExpired && quote.status !== "accepted" && quote.status !== "archived" ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200/80 font-mono">
                                    <AlertTriangle className="h-2.5 w-2.5" />
                                    {expiryInfo.text}
                                  </span>
                                ) : expiryInfo?.isSoon && quote.status !== "accepted" ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/80 font-mono">
                                    <Clock className="h-2.5 w-2.5" />
                                    {expiryInfo.text}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-neutral-400 font-mono">
                                    Hasta {new Date(quote.validUntil).toLocaleDateString("es-DO")}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-neutral-400">Sin caducidad</span>
                            )}
                          </div>
                        </TableCell>

                        {/* 5. Observación / Notas */}
                        <TableCell className="py-3.5 max-w-[180px]">
                          {quote.observation ? (
                            <span
                              className="inline-block text-[11px] font-medium text-purple-900 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200/70 truncate max-w-[170px]"
                              title={quote.observation}
                            >
                              {quote.observation}
                            </span>
                          ) : quote.notes ? (
                            <span
                              className="text-[11px] text-neutral-500 italic truncate block max-w-[170px]"
                              title={quote.notes}
                            >
                              {quote.notes}
                            </span>
                          ) : (
                            <span className="text-neutral-300 text-xs">—</span>
                          )}
                        </TableCell>

                        {/* 6. Total con Desglose */}
                        <TableCell className="py-3.5 text-right">
                          <p className="font-mono font-bold text-sm text-neutral-900 tabular-nums">
                            RD$ {(quote.total || 0).toLocaleString("es-DO")}
                          </p>
                          <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                            {quote.tax && quote.tax > 0
                              ? `Sub: RD$ ${(quote.subtotal || 0).toLocaleString("es-DO")}`
                              : "Exento de ITBIS"}
                          </p>
                        </TableCell>

                        {/* 7. Estado Semántico */}
                        <TableCell className="py-3.5 text-center">
                          <span
                            className={cn(
                              "inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold border w-24",
                              statusInfo.badge
                            )}
                          >
                            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", statusInfo.dot)} />
                            <span>{statusInfo.label}</span>
                          </span>
                        </TableCell>

                        {/* 8. Acciones Rápidas */}
                        <TableCell className="py-3.5 pr-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* WhatsApp Button */}
                            {customer?.phone && (
                              <button
                                type="button"
                                onClick={() => handleShareWhatsApp(quote)}
                                className="h-8 w-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                                title="Enviar por WhatsApp"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </button>
                            )}

                            {/* Ver Detalle / Imprimir */}
                            <button
                              type="button"
                              onClick={() => handleViewDetail(quote)}
                              className="h-8 w-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                              title="Ver Detalle / Imprimir"
                            >
                              <FileText className="h-4 w-4" />
                            </button>

                            {/* Dropdown Menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-neutral-100 outline-none transition-colors cursor-pointer">
                                <MoreVertical className="h-4 w-4 text-neutral-400" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-2xl border-neutral-100 p-2 shadow-xl w-48">
                                <div className="px-2 pb-1 pt-0.5 text-[9px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
                                  Opciones
                                </div>
                                <DropdownMenuItem
                                  className="rounded-xl py-2 cursor-pointer gap-2 text-xs font-medium"
                                  onClick={() => handleViewDetail(quote)}
                                >
                                  <FileText className="h-4 w-4 text-neutral-500" /> Ver Detalle / Imprimir
                                </DropdownMenuItem>

                                {customer?.phone && (
                                  <DropdownMenuItem
                                    className="rounded-xl py-2 cursor-pointer gap-2 text-xs font-medium text-emerald-700"
                                    onClick={() => handleShareWhatsApp(quote)}
                                  >
                                    <MessageSquare className="h-4 w-4 text-emerald-600" /> Enviar por WhatsApp
                                  </DropdownMenuItem>
                                )}

                                {quote.status !== "accepted" && (
                                  <DropdownMenuItem
                                    className="rounded-xl py-2 cursor-pointer gap-2 text-xs font-medium"
                                    onClick={() => handleEdit(quote)}
                                  >
                                    <Edit className="h-4 w-4 text-neutral-500" /> Editar Presupuesto
                                  </DropdownMenuItem>
                                )}

                                {quote.status === "accepted" && (
                                  <DropdownMenuItem
                                    className="rounded-xl py-2 cursor-pointer gap-2 text-xs font-medium text-blue-700"
                                    onClick={() => router.push(`/${tenantSlug}/pos?quoteId=${quote.id}`)}
                                  >
                                    <ShoppingCart className="h-4 w-4 text-blue-600" /> Facturar en POS
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator className="my-1 bg-neutral-100" />

                                <DropdownMenuItem
                                  className="rounded-xl py-2 text-purple-700 focus:text-purple-700 cursor-pointer gap-2 text-xs font-medium"
                                  onClick={() => handleOpenArchive(quote)}
                                >
                                  <Archive className="h-4 w-4" />{" "}
                                  {quote.status === "archived" ? "Editar Archivo" : "Archivar Cotización"}
                                </DropdownMenuItem>

                                <DropdownMenuSeparator className="my-1 bg-neutral-100" />
                                <DropdownMenuItem
                                  className="rounded-xl py-2 text-rose-600 focus:text-rose-600 cursor-pointer gap-2 text-xs font-medium"
                                  onClick={() => setQuoteToDelete({ id: quote.id, num: quote.quoteNumber })}
                                >
                                  <Trash2 className="h-4 w-4" /> Eliminar Cotización
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* 5. VISTA DE TARJETAS (Grid Mode) */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuotes.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center bg-white rounded-3xl border border-neutral-200/80 p-8 shadow-2xs">
              <div className="h-14 w-14 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400 mb-3">
                <FileText className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 font-heading">
                No se encontraron cotizaciones
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm mt-1">
                {search
                  ? `No hay cotizaciones que coincidan con "${search}".`
                  : "No hay cotizaciones registradas bajo este estado."}
              </p>
              {search && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearch("")}
                  className="mt-4 rounded-xl text-xs"
                >
                  Limpiar búsqueda
                </Button>
              )}
            </div>
          ) : (
            filteredQuotes.map((quote) => {
              const customer = customers.find((c) => c.id === quote.customerId);
              const vehicle = vehicles.find((v) => v.id === quote.vehicleId);
              const statusInfo = statusConfig[quote.status] || statusConfig.draft;
              const expiryInfo = getExpiryInfo(quote.validUntil);

              return (
                <div
                  key={quote.id}
                  className="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-2xs hover:shadow-xs hover:border-neutral-300 transition-all flex flex-col justify-between gap-4 group"
                >
                  <div className="space-y-3">
                    {/* Header de la tarjeta */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleViewDetail(quote)}
                          className="font-mono font-bold text-sm text-neutral-900 hover:underline cursor-pointer"
                        >
                          {quote.quoteNumber}
                        </button>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-semibold border",
                            statusInfo.badge
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", statusInfo.dot)} />
                          <span>{statusInfo.label}</span>
                        </span>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-neutral-100 outline-none transition-colors cursor-pointer">
                          <MoreVertical className="h-4 w-4 text-neutral-400" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl border-neutral-100 p-2 shadow-xl w-48">
                          <DropdownMenuItem
                            className="rounded-xl py-2 cursor-pointer gap-2 text-xs font-medium"
                            onClick={() => handleViewDetail(quote)}
                          >
                            <FileText className="h-4 w-4 text-neutral-500" /> Ver Detalle / Imprimir
                          </DropdownMenuItem>
                          {customer?.phone && (
                            <DropdownMenuItem
                              className="rounded-xl py-2 cursor-pointer gap-2 text-xs font-medium text-emerald-700"
                              onClick={() => handleShareWhatsApp(quote)}
                            >
                              <MessageSquare className="h-4 w-4 text-emerald-600" /> Enviar por WhatsApp
                            </DropdownMenuItem>
                          )}
                          {quote.status !== "accepted" && (
                            <DropdownMenuItem
                              className="rounded-xl py-2 cursor-pointer gap-2 text-xs font-medium"
                              onClick={() => handleEdit(quote)}
                            >
                              <Edit className="h-4 w-4 text-neutral-500" /> Editar Presupuesto
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="my-1 bg-neutral-100" />
                          <DropdownMenuItem
                            className="rounded-xl py-2 text-rose-600 focus:text-rose-600 cursor-pointer gap-2 text-xs font-medium"
                            onClick={() => setQuoteToDelete({ id: quote.id, num: quote.quoteNumber })}
                          >
                            <Trash2 className="h-4 w-4" /> Eliminar Cotización
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Cliente y Vehículo */}
                    <div className="space-y-2 pt-1 border-t border-neutral-100">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider font-mono">
                          Cliente
                        </p>
                        <p className="font-semibold text-neutral-900 text-xs truncate">
                          {customer?.name || "Cliente General"}
                        </p>
                        {customer?.phone && (
                          <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                            {customer.phone}
                          </p>
                        )}
                      </div>

                      {vehicle && (
                        <div>
                          <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider font-mono">
                            Vehículo
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-semibold text-neutral-900 text-xs truncate">
                              {vehicle.brand} {vehicle.model}
                            </span>
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-neutral-100 border border-neutral-300 shadow-2xs font-mono">
                              <span className="text-[8px] font-bold text-neutral-400 uppercase">RD</span>
                              <span className="text-[10px] font-black text-neutral-900">
                                {vehicle.plate.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Ítems resumen */}
                    <div className="pt-2 border-t border-neutral-100">
                      <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider font-mono mb-1">
                        Presupuesto ({quote.items?.length || 0} ítems)
                      </p>
                      <div className="space-y-1">
                        {(quote.items || []).slice(0, 2).map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-xs text-neutral-600 gap-2"
                          >
                            <span className="truncate">
                              {item.quantity}x {item.name}
                            </span>
                            <span className="font-mono text-neutral-900 shrink-0 font-medium">
                              RD$ {(item.total || item.unitPrice * item.quantity).toLocaleString("es-DO")}
                            </span>
                          </div>
                        ))}
                        {(quote.items?.length || 0) > 2 && (
                          <p className="text-[10px] text-neutral-400 italic">
                            +{(quote.items?.length || 0) - 2} ítems adicionales...
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer de Tarjeta con Total y Botones */}
                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider font-mono">
                        Total
                      </p>
                      <p className="font-mono font-bold text-base text-neutral-900 tabular-nums">
                        RD$ {(quote.total || 0).toLocaleString("es-DO")}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {customer?.phone && (
                        <button
                          type="button"
                          onClick={() => handleShareWhatsApp(quote)}
                          className="h-8 px-2.5 rounded-xl border border-neutral-200 text-neutral-600 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Enviar por WhatsApp"
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleViewDetail(quote)}
                        className="h-8 px-3 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-semibold flex items-center gap-1.5 shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Ver</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 6. Diálogos de Creación/Edición y Detalle/Impresión */}
      <QuotationCreateDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        quoteIdToEdit={selectedQuoteIdToEdit}
        tenantId={tenantId}
      />

      <QuotationDetailDialog
        open={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedQuoteDetailId(null);
        }}
        quote={selectedQuoteDetail}
        tenantId={tenantId}
      />

      {/* 7. Modal de Confirmación para Eliminar */}
      <Dialog open={!!quoteToDelete} onOpenChange={(o) => !o && setQuoteToDelete(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white z-[300] shadow-2xl border border-neutral-100">
          <DialogHeader className="flex flex-col items-center text-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
              <Trash2 className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-neutral-900">
              ¿Eliminar Cotización?
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              ¿Está seguro de que desea eliminar la cotización{" "}
              <strong className="text-neutral-900 font-mono">{quoteToDelete?.num}</strong>? Esta
              acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-2 sm:justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setQuoteToDelete(null)}
              className="rounded-xl h-10 px-4 font-semibold text-xs cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (quoteToDelete) {
                  deleteQuote(quoteToDelete.id);
                  toast.success(`Cotización ${quoteToDelete.num} eliminada`);
                  setQuoteToDelete(null);
                }
              }}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold h-10 px-4 text-xs cursor-pointer"
            >
              Eliminar Cotización
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 8. Modal de Archivo de Cotización */}
      <Dialog open={!!quoteToArchive} onOpenChange={(o) => !o && setQuoteToArchive(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white z-[300] shadow-2xl border border-neutral-100">
          <DialogHeader className="gap-1">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700 border border-purple-100">
                <Archive className="h-4 w-4" />
              </div>
              <DialogTitle className="text-base font-bold text-neutral-900">
                Archivar Cotización {quoteToArchive?.quoteNumber}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-neutral-500 pt-1">
              Ingrese el motivo u observación por el cual se archiva esta cotización.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <textarea
              placeholder="Ej: Cliente canceló por costo de repuestos, vehículo vendido..."
              value={archiveObsInput}
              onChange={(e) => setArchiveObsInput(e.target.value)}
              className="w-full min-h-[90px] text-xs p-3 rounded-2xl border border-neutral-200 bg-white focus:outline-none focus:border-neutral-400 resize-y"
            />
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setQuoteToArchive(null)}
              className="rounded-xl h-10 px-4 font-semibold text-xs cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (quoteToArchive) {
                  updateQuote(quoteToArchive.id, {
                    status: "archived",
                    observation: archiveObsInput.trim() || undefined,
                  });
                  toast.success(`Cotización ${quoteToArchive.quoteNumber} archivada correctamente`);
                  setQuoteToArchive(null);
                }
              }}
              className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold h-10 px-4 text-xs cursor-pointer"
            >
              Archivar Cotización
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
