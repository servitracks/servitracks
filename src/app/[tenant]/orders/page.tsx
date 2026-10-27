"use client";

import { useState, lazy, Suspense, useEffect, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "@/lib/next-compat";
import { useStore, WorkOrder } from "@/store/useStore";
import {
  Plus, Search, MoreVertical, Clock, User as UserIcon, Car as CarIcon,
  CheckCircle2, AlertCircle, Wrench, Filter, Trash2,
  ChevronRight, LayoutGrid, List, Banknote, UserCog, Settings,
  AlertTriangle, ArrowUpRight, Building2, Landmark, ShieldCheck,
  Receipt, ArrowRight, X, Calendar, Sparkles, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getPlans } from "@/lib/storage";
import type { Plan } from "@/store/types";
import { Link } from "react-router-dom";
import { toast } from "sonner";

// Lazy-load dialogs — only compiled when opened
const LazyCreateDialog = lazy(() => import("./OrderCreateDialog"));
const LazyDetailDialog = lazy(() => import("./OrderDetailDialog"));

const statusConfig: Record<string, { label: string; color: string; dot: string; icon: any }> = {
  pending: {
    label: "Pendiente",
    color: "bg-neutral-100 text-neutral-800 border-neutral-200",
    dot: "bg-neutral-400",
    icon: Clock,
  },
  diagnosing: {
    label: "En Diagnóstico",
    color: "bg-amber-50 text-amber-800 border-amber-200/90",
    dot: "bg-amber-500",
    icon: Search,
  },
  repairing: {
    label: "En Reparación",
    color: "bg-blue-50 text-blue-800 border-blue-200/90",
    dot: "bg-blue-500",
    icon: Wrench,
  },
  waiting_parts: {
    label: "Esperando Piezas",
    color: "bg-rose-50 text-rose-800 border-rose-200/90",
    dot: "bg-rose-500",
    icon: AlertCircle,
  },
  finished: {
    label: "Finalizado",
    color: "bg-emerald-50 text-emerald-800 border-emerald-200/90",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  delivered: {
    label: "Entregado",
    color: "bg-neutral-900 text-white border-neutral-900",
    dot: "bg-white",
    icon: ShieldCheck,
  },
  invoiced: {
    label: "Facturado",
    color: "bg-purple-50 text-purple-800 border-purple-200/90",
    dot: "bg-purple-500",
    icon: Banknote,
  },
  cancelled: {
    label: "Cancelado",
    color: "bg-rose-50 text-rose-700 border-rose-200/80",
    dot: "bg-rose-400",
    icon: X,
  },
  cancelada: {
    label: "Cancelada",
    color: "bg-rose-50 text-rose-700 border-rose-200/80",
    dot: "bg-rose-400",
    icon: X,
  },
};

const DEFAULT_STATUS_CONFIG = {
  label: "Pendiente",
  color: "bg-neutral-100 text-neutral-800 border-neutral-200",
  dot: "bg-neutral-400",
  icon: Clock,
};

function getStatusConfig(status?: string) {
  if (!status) return DEFAULT_STATUS_CONFIG;
  return (statusConfig as Record<string, any>)[status] || DEFAULT_STATUS_CONFIG;
}

type Status = WorkOrder['status'];

const STATUS_FLOW: Status[] = ["pending", "diagnosing", "repairing", "waiting_parts", "finished", "delivered", "invoiced"];

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  diagnosing: "En Diagnóstico",
  repairing: "En Reparación",
  waiting_parts: "Esperando Piezas",
  finished: "Finalizado",
  delivered: "Entregado",
  invoiced: "Facturado",
  cancelled: "Cancelado",
  cancelada: "Cancelada",
};

export default function OrdersPage() {
  const router = useRouter();
  const { tenant } = useParams();
  const searchParams = useSearchParams();
  const tenants = useStore((s) => s.tenants);
  const currentTenant = tenants.find((t) => t.slug === tenant) ?? null;
  const tenantId = currentTenant?.id ?? "";

  const allOrders = useStore((s) => s.orders);
  const orders = useMemo(() => {
    return tenantId ? allOrders.filter((o) => o.tenantId === tenantId) : [];
  }, [allOrders, tenantId]);

  const allCustomers = useStore((s) => s.customers);
  const customers = useMemo(() => {
    return tenantId ? allCustomers.filter((c) => c.tenantId === tenantId) : [];
  }, [allCustomers, tenantId]);

  const allVehicles = useStore((s) => s.vehicles);
  const vehicles = useMemo(() => {
    return tenantId ? allVehicles.filter((v) => v.tenantId === tenantId) : [];
  }, [allVehicles, tenantId]);

  const allTechnicians = useStore((s) => s.technicians);
  const technicians = useMemo(() => {
    return tenantId ? allTechnicians.filter((t) => t.tenantId === tenantId) : [];
  }, [allTechnicians, tenantId]);

  const allServices = useStore((s) => s.services);
  const services = useMemo(() => {
    return tenantId ? allServices.filter((s) => s.tenantId === tenantId) : [];
  }, [allServices, tenantId]);

  const allProducts = useStore((s) => s.products);
  const products = useMemo(() => {
    return tenantId ? allProducts.filter((p) => p.tenantId === tenantId) : [];
  }, [allProducts, tenantId]);

  const updateOrder = useStore((s) => s.updateOrder);
  const deleteOrder = useStore((s) => s.deleteOrder);
  const deliverWorkOrder = useStore((s) => s.deliverWorkOrder);
  const addWhatsAppLog = useStore((s) => s.addWhatsAppLog);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<Status | "all">("all");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);

  useEffect(() => {
    getPlans().then((plans) => {
      const p = plans.find((x) => x.id === currentTenant?.plan_id) || plans[0] || null;
      setCurrentPlan(p);
    });
  }, [currentTenant?.plan_id]);

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const ordersThisMonth = orders.filter((o) => new Date(o.createdAt) >= currentMonthStart).length;
  const orderLimit = currentPlan?.limite_ordenes_mes ?? null;
  const isOrderLimitReached = orderLimit !== null && ordersThisMonth >= orderLimit;
  const usagePercentage = orderLimit ? Math.min(Math.round((ordersThisMonth / orderLimit) * 100), 100) : 0;

  useEffect(() => {
    const cId = searchParams.get("customerId") || searchParams.get("customer");
    const vId = searchParams.get("vehicleId");
    const plate = searchParams.get("plate");
    const create = searchParams.get("create");
    if (create === "true" || (cId && vId) || (cId && plate)) {
      setIsCreateOpen(true);
    }
  }, [searchParams]);

  const getCustomerName = (id: string) => customers.find((c) => c.id === id)?.name || "Cliente Desconocido";
  const getVehicleObj = (id: string) => vehicles.find((v) => v.id === id);
  const getTechnicianName = (id?: string) => {
    if (!id) return "Sin asignar";
    return technicians.find((t) => t.id === id)?.name || "Sin asignar";
  };

  const getOrderTotalWithItbis = (order: WorkOrder) => {
    let subtotal = 0;

    (order.serviceIds || []).forEach((sid) => {
      const itemOverride = order.items?.find((it) => it.serviceId === sid);
      const svc = services.find((s) => s.id === sid);
      const price = itemOverride ? Number(itemOverride.unitPrice || 0) : Number(svc?.price || 0);
      subtotal += price;
    });

    (order.customServices || []).forEach((cs) => {
      subtotal += Number(cs.price || 0);
    });

    (order.parts || []).forEach((part) => {
      const prod = products.find((p) => p.id === part.productId);
      const unitPrice = Number((part as any).price ?? prod?.salePrice ?? 0);
      const qty = Number(part.quantity || 1);
      subtotal += unitPrice * qty;
    });

    (order.customParts || []).forEach((cp) => {
      const unitPrice = Number(cp.price || 0);
      const qty = Number(cp.quantity || 1);
      subtotal += unitPrice * qty;
    });

    const roundedSubtotal = Math.round(subtotal * 100) / 100;

    let tax = 0;
    if (order.applyItbis === false) {
      tax = 0;
    } else if (order.applyItbis === true) {
      tax = Math.round(roundedSubtotal * 0.18 * 100) / 100;
    } else if (typeof order.tax === "number" && order.tax > 0) {
      tax = order.tax;
    } else if (typeof order.total === "number" && order.total > roundedSubtotal) {
      tax = Math.round((order.total - roundedSubtotal) * 100) / 100;
    } else if (typeof order.total === "number" && order.total > 0 && Math.abs(order.total - roundedSubtotal) < 0.01) {
      tax = 0;
    } else {
      tax = Math.round(roundedSubtotal * 0.18 * 100) / 100;
    }

    const computedTotal = Math.round((roundedSubtotal + tax) * 100) / 100;
    return computedTotal > 0 ? computedTotal : (Number(order.total) || 0);
  };

  // Contadores por estado
  const pendingCount = useMemo(() => orders.filter((o) => o.status === "pending").length, [orders]);
  const diagnosingCount = useMemo(() => orders.filter((o) => o.status === "diagnosing").length, [orders]);
  const repairingCount = useMemo(() => orders.filter((o) => o.status === "repairing").length, [orders]);
  const waitingPartsCount = useMemo(() => orders.filter((o) => o.status === "waiting_parts").length, [orders]);
  const finishedCount = useMemo(() => orders.filter((o) => o.status === "finished").length, [orders]);
  const deliveredCount = useMemo(() => orders.filter((o) => o.status === "delivered" || o.status === "invoiced").length, [orders]);

  // Filtrado compuesto (Pestaña de estado + Buscador multicriterio)
  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();

    return orders.filter((o) => {
      // 1. Filtro por Pestaña
      if (activeTab !== "all" && o.status !== activeTab) return false;

      // 2. Filtro por Búsqueda
      if (!q) return true;

      const customerName = getCustomerName(o.customerId).toLowerCase();
      const desc = o.description.toLowerCase();
      const code = o.id.toLowerCase();
      const v = getVehicleObj(o.vehicleId);
      const plate = v ? v.plate.toLowerCase() : "";
      const brandModel = v ? `${v.brand} ${v.model}`.toLowerCase() : "";
      const tech = getTechnicianName(o.mechanicId).toLowerCase();

      return (
        customerName.includes(q) ||
        desc.includes(q) ||
        code.includes(q) ||
        plate.includes(q) ||
        brandModel.includes(q) ||
        tech.includes(q)
      );
    });
  }, [orders, activeTab, search, customers, vehicles, technicians]);

  const sendWhatsAppNotification = (order: WorkOrder, newStatus: Status) => {
    const customer = customers.find((c) => c.id === order.customerId);
    const vehicle = vehicles.find((v) => v.id === order.vehicleId);

    if (!customer || !vehicle) return;

    let message = "";
    const vehicleName = `${vehicle.brand} ${vehicle.model}`;
    const customerFirstName = customer.name.split(" ")[0];

    switch (newStatus) {
      case "diagnosing":
        message = `Hola ${customerFirstName}, te informamos que tu ${vehicleName} ya está en nuestra área de diagnóstico. Te mantendremos informado.`;
        break;
      case "repairing":
        message = `¡Buenas noticias ${customerFirstName}! Nuestro equipo técnico ha comenzado la reparación de tu ${vehicleName}. Te avisaremos cuando finalice.`;
        break;
      case "waiting_parts":
        message = `Hola ${customerFirstName}, actualmente estamos esperando unas piezas necesarias para continuar el trabajo de tu ${vehicleName}. Te contactaremos a la brevedad.`;
        break;
      case "finished":
        message = `¡Tu ${vehicleName} está listo, ${customerFirstName}! El servicio ha concluido exitosamente y ya puedes pasar a retirarlo por el taller.`;
        break;
      default:
        return;
    }

    addWhatsAppLog({
      id: `wl_order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId: order.tenantId,
      customerId: customer.id,
      customerName: customer.name,
      phone: customer.phone,
      type: "notification",
      message,
      status: "pending",
      sentAt: new Date().toISOString(),
    });
  };

  const advanceStatus = (order: WorkOrder) => {
    const idx = STATUS_FLOW.indexOf(order.status);
    if (idx < STATUS_FLOW.length - 1) {
      const next = STATUS_FLOW[idx + 1];
      if (next === "delivered") {
        deliverWorkOrder(order.id);
        const vehicle = vehicles.find((v) => v.id === order.vehicleId);
        toast.success(`Vehículo entregado con éxito`, {
          action: {
            label: "Ver Mantenimiento",
            onClick: () => router.push(`/${tenant}/maintenance?search=${vehicle?.plate || ""}`),
          },
        });
      } else if (next === "invoiced") {
        updateOrder(order.id, { status: next });
        toast.success(`Orden lista para facturar`, {
          action: {
            label: "Ir al POS",
            onClick: () => router.push(`/${tenant}/pos?orderId=${order.id}`),
          },
        });
      } else {
        updateOrder(order.id, { status: next });
        sendWhatsAppNotification(order, next);
        toast.success(`Orden pasada a "${statusLabels[next]}" y alerta de WhatsApp encolada`);
      }
    }
  };

  const setStatus = (orderId: string, status: Status) => {
    if (status === "delivered") {
      deliverWorkOrder(orderId);
      const order = orders.find((o) => o.id === orderId);
      const vehicle = vehicles.find((v) => v.id === order?.vehicleId);
      toast.success(`Vehículo entregado con éxito`, {
        action: {
          label: "Ver Mantenimiento",
          onClick: () => router.push(`/${tenant}/maintenance?search=${vehicle?.plate || ""}`),
        },
      });
    } else if (status === "invoiced") {
      updateOrder(orderId, { status });
      toast.success(`Orden lista para facturar`, {
        action: {
          label: "Ir al POS",
          onClick: () => router.push(`/${tenant}/pos?orderId=${orderId}`),
        },
      });
    } else {
      updateOrder(orderId, { status });
      const order = orders.find((o) => o.id === orderId);
      if (order) sendWhatsAppNotification(order, status);
      toast.success(`Estado cambiado a "${statusLabels[status]}" y alerta de WhatsApp encolada`);
    }
  };

  const openDetail = (order: WorkOrder) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const tabsConfig = [
    {
      id: "all" as const,
      label: "Todas",
      icon: Layers,
      count: orders.length,
    },
    {
      id: "pending" as const,
      label: "Pendientes",
      icon: Clock,
      count: pendingCount,
    },
    {
      id: "diagnosing" as const,
      label: "En Diagnóstico",
      icon: Search,
      count: diagnosingCount,
    },
    {
      id: "repairing" as const,
      label: "En Reparación",
      icon: Wrench,
      count: repairingCount,
    },
    {
      id: "waiting_parts" as const,
      label: "Esperando Piezas",
      icon: AlertCircle,
      count: waitingPartsCount,
    },
    {
      id: "finished" as const,
      label: "Finalizadas",
      icon: CheckCircle2,
      count: finishedCount,
    },
    {
      id: "delivered" as const,
      label: "Entregadas",
      icon: Banknote,
      count: deliveredCount,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header Principal */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              Órdenes de Servicio
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
              {orders.length} activas
            </span>
          </div>
          <p className="text-sm text-neutral-500 mt-1">
            Monitorea el ciclo operativo, asignaciones de taller y avances de reparación en tiempo real.
          </p>
        </div>

        {/* Acciones de Cabecera */}
        <div className="flex items-center gap-2">
          {/* Switch de Vista: Lista / Kanban */}
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
              onClick={() => setViewMode("kanban")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                viewMode === "kanban"
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
              )}
              title="Vista de Tablero Kanban"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tablero</span>
            </button>
          </div>

          <Button
            disabled={isOrderLimitReached}
            title={isOrderLimitReached ? "Límite mensual de órdenes alcanzado" : undefined}
            className="rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 gap-2 h-10 px-4 text-xs font-semibold shadow-sm active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span>Nueva Orden</span>
          </Button>
        </div>
      </div>

      {/* 2. Banner de Cuota Mensual del Plan (Estilo SaaS Moderno) */}
      {orderLimit !== null && (
        <div
          className={cn(
            "rounded-3xl border p-4 sm:p-5 bg-white shadow-2xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4",
            isOrderLimitReached
              ? "border-rose-300 bg-rose-50/40"
              : usagePercentage >= 80
              ? "border-amber-300 bg-amber-50/40"
              : "border-neutral-200/80"
          )}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className={cn(
                "h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 border",
                isOrderLimitReached
                  ? "bg-rose-100 text-rose-700 border-rose-200"
                  : usagePercentage >= 80
                  ? "bg-amber-100 text-amber-700 border-amber-200"
                  : "bg-neutral-100 text-neutral-800 border-neutral-200"
              )}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-neutral-900">
                  Uso del Plan {currentPlan?.nombre || "Actual"}:
                  <span className="font-mono ml-1.5">
                    {ordersThisMonth} / {orderLimit} órdenes
                  </span>
                </p>
                {isOrderLimitReached ? (
                  <Badge variant="destructive" className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                    Límite alcanzado
                  </Badge>
                ) : (
                  <span className="text-xs font-mono text-neutral-500 font-semibold">
                    ({usagePercentage}% del mes)
                  </span>
                )}
              </div>

              {/* Barra de progreso ultra-fina */}
              <div className="w-full max-w-md bg-neutral-100 rounded-full h-2 mt-2 overflow-hidden border border-neutral-200/60">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isOrderLimitReached
                      ? "bg-rose-600"
                      : usagePercentage >= 80
                      ? "bg-amber-500"
                      : "bg-neutral-900"
                  )}
                  style={{ width: `${usagePercentage}%` }}
                />
              </div>
            </div>
          </div>

          <Link
            to={`/${tenant}/settings?tab=planes`}
            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-neutral-900 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2 shrink-0 transition-all shadow-2xs active:scale-[0.98]"
          >
            <span>Ver Planes y Mejoras</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-neutral-500" />
          </Link>
        </div>
      )}

      {/* 3. KPI Cards Métricas Operativas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Pendientes",
            value: pendingCount,
            icon: Clock,
            iconBg: "bg-neutral-100 text-neutral-800 border-neutral-200",
            tabAction: "pending" as Status | "all",
          },
          {
            label: "En Diagnóstico",
            value: diagnosingCount,
            icon: Search,
            iconBg: "bg-amber-50 text-amber-700 border-amber-200/80",
            tabAction: "diagnosing" as Status | "all",
          },
          {
            label: "En Reparación",
            value: repairingCount,
            icon: Wrench,
            iconBg: "bg-blue-50 text-blue-700 border-blue-200/80",
            tabAction: "repairing" as Status | "all",
          },
          {
            label: "Finalizadas",
            value: finishedCount,
            icon: CheckCircle2,
            iconBg: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
            tabAction: "finished" as Status | "all",
          },
        ].map((kpi) => (
          <button
            key={kpi.label}
            type="button"
            onClick={() => setActiveTab(kpi.tabAction)}
            className={cn(
              "flex items-center gap-3 rounded-2xl border p-3.5 bg-white shadow-2xs text-left transition-all cursor-pointer group active:scale-[0.98]",
              activeTab === kpi.tabAction
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
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 leading-tight">
                {kpi.label}
              </p>
              <p className="text-xl font-bold tracking-tight text-neutral-900 leading-tight mt-0.5 font-mono tabular-nums">
                {kpi.value}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* 4. Barra de Filtros: Pestañas con Iconos y Active State Negro Primario */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50/80 p-2 rounded-2xl border border-neutral-200/80">
        {/* Pestañas con iconos */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {tabsConfig.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
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
            placeholder="Buscar por cliente, placa, orden o técnico..."
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

      {/* 5. VISTA DE LISTA (Rediseño Espectacular) */}
      {viewMode === "list" && (
        <div id="tour-orders-list" className="space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-neutral-200/80 p-8 shadow-2xs">
              <div className="h-16 w-16 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400 mb-3">
                <Wrench className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 font-heading">
                No se encontraron órdenes de servicio
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm mt-1">
                {search
                  ? `No hay órdenes que coincidan con "${search}". Intenta con otro término o limpia el filtro.`
                  : "No hay órdenes registradas bajo este estado operativo."}
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
            filteredOrders.map((order) => {
              const config = getStatusConfig(order.status);
              const StatusIcon = config?.icon || Clock;
              const idx = STATUS_FLOW.indexOf(order.status);
              const nextStatus = idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
              const vehicle = getVehicleObj(order.vehicleId);
              const totalAmount = getOrderTotalWithItbis(order);

              return (
                <div
                  key={order.id}
                  onClick={() => openDetail(order)}
                  className="group rounded-3xl border border-neutral-200/80 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-xs hover:border-neutral-300 transition-all cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Parte Izquierda: Estado, Código, Descripción, Cliente y Vehículo */}
                  <div className="space-y-2.5 min-w-0 flex-1">
                    {/* Header de la orden: Estado + Código + Badges Fiscales */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold border",
                          config.color
                        )}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        {config.label}
                      </span>

                      <span className="font-mono text-xs font-bold text-neutral-400">
                        #{order.id.slice(-6).toUpperCase()}
                      </span>

                      {/* Badges Fiscales Limpios sin Emojis */}
                      {order.customerType === "credito_fiscal" || order.ncfType === "E31" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80">
                          <Building2 className="h-3 w-3" />
                          E31 Crédito Fiscal
                        </span>
                      ) : order.customerType === "gubernamental" || order.ncfType === "E45" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/80">
                          <Landmark className="h-3 w-3" />
                          E45 Gubernamental
                        </span>
                      ) : order.customerType === "regimen_especial" || order.ncfType === "E44" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/80">
                          <ShieldCheck className="h-3 w-3" />
                          E44 Rég. Especial
                        </span>
                      ) : null}

                      <span className="text-[11px] text-neutral-400 flex items-center gap-1 ml-auto lg:ml-0">
                        <Clock className="h-3 w-3" />
                        {new Date(order.createdAt).toLocaleDateString("es-DO", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    {/* Descripción principal de la orden */}
                    <h3 className="font-heading font-extrabold text-base text-neutral-900 group-hover:text-black leading-snug">
                      {order.description}
                    </h3>

                    {/* Fila de Metadatos: Cliente, Vehículo y Técnico */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-neutral-600">
                      {/* Cliente */}
                      <span className="flex items-center gap-1.5 font-medium text-neutral-800">
                        <UserIcon className="h-3.5 w-3.5 text-neutral-400" />
                        {getCustomerName(order.customerId)}
                      </span>

                      {/* Vehículo con badge de placa dominicana */}
                      {vehicle ? (
                        <span className="flex items-center gap-1.5">
                          <CarIcon className="h-3.5 w-3.5 text-neutral-400" />
                          <span className="font-mono font-bold text-[11px] bg-neutral-100 border border-neutral-300 px-1.5 py-0.2 rounded text-neutral-900">
                            {vehicle.plate}
                          </span>
                          <span className="font-medium text-neutral-700">
                            {vehicle.brand} {vehicle.model} ({vehicle.year})
                          </span>
                        </span>
                      ) : (
                        <span className="text-neutral-400 flex items-center gap-1">
                          <CarIcon className="h-3.5 w-3.5" />
                          Vehículo no asignado
                        </span>
                      )}

                      {/* Técnico Asignado */}
                      {order.mechanicId && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-[11px] font-medium border border-neutral-200">
                          <UserCog className="h-3 w-3 text-neutral-500" />
                          {getTechnicianName(order.mechanicId)}
                        </span>
                      )}

                      {/* Cantidad de Tareas */}
                      <span className="text-[11px] text-neutral-400 font-medium">
                        {order.serviceIds?.length ?? 0} {(order.serviceIds?.length ?? 0) === 1 ? "tarea" : "tareas"}
                      </span>
                    </div>
                  </div>

                  {/* Parte Derecha: Total Financiero + Acciones */}
                  <div
                    className="flex items-center justify-between lg:justify-end gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-neutral-100 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Monto de la orden */}
                    <div className="text-left lg:text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                        Total {order.applyItbis !== false ? "(c/ ITBIS 18%)" : ""}
                      </p>
                      <p className="text-lg font-bold font-mono text-neutral-900 tabular-nums">
                        RD$ {totalAmount.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    {/* Botón de Avanzar Estado Rápido */}
                    {nextStatus && (
                      <Button
                        size="sm"
                        onClick={() => advanceStatus(order)}
                        className="rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold h-9 px-3.5 gap-1.5 shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
                      >
                        <span>{statusLabels[nextStatus]}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    )}

                    {/* Menú Desplegable de Opciones */}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <button
                            type="button"
                            className="h-9 w-9 rounded-xl hover:bg-neutral-100 flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-all border border-neutral-200 shadow-2xs cursor-pointer outline-none"
                          />
                        }
                      >
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-2xl border-neutral-200 p-1.5 shadow-xl w-52 z-50">
                        <DropdownMenuItem
                          className="rounded-xl py-2 cursor-pointer gap-2 text-xs font-semibold"
                          onClick={() => openDetail(order)}
                        >
                          <ChevronRight className="h-4 w-4 text-neutral-500" /> Ver Detalle de Orden
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="my-1 bg-neutral-100" />
                        <div className="px-2 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                          Cambiar Estado a:
                        </div>
                        {STATUS_FLOW.map((s) => (
                          <DropdownMenuItem
                            key={s}
                            className={cn(
                              "rounded-xl py-1.5 cursor-pointer gap-2 text-xs",
                              order.status === s ? "font-bold bg-neutral-100 text-neutral-900" : "text-neutral-600"
                            )}
                            onClick={() => setStatus(order.id, s)}
                          >
                            <div className={cn("h-2 w-2 rounded-full", getStatusConfig(s).dot)} />
                            <span>{statusLabels[s]}</span>
                          </DropdownMenuItem>
                        ))}

                        <DropdownMenuSeparator className="my-1 bg-neutral-100" />

                        <DropdownMenuItem
                          className="rounded-xl py-2 text-rose-600 focus:text-rose-600 cursor-pointer gap-2 text-xs font-medium"
                          onClick={() => {
                            if (confirm("¿Estás seguro de eliminar esta orden de servicio?")) {
                              deleteOrder(order.id);
                              toast.success("Orden eliminada");
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" /> Eliminar Orden
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 6. VISTA TABLERO KANBAN (Rediseño Limpio y sin Emojis) */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 overflow-x-auto pb-4">
          {STATUS_FLOW.map((status) => {
            const config = getStatusConfig(status);
            const StatusIcon = config?.icon || Clock;
            const colOrders = orders.filter((o) => o.status === status);

            return (
              <div key={status} className="min-w-[220px] bg-neutral-50/70 p-2.5 rounded-3xl border border-neutral-200/80 flex flex-col">
                {/* Cabecera de la columna */}
                <div className="flex items-center justify-between p-2 mb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <StatusIcon className="h-4 w-4 text-neutral-600 shrink-0" />
                    <span className="text-xs font-bold text-neutral-900 truncate">
                      {statusLabels[status]}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold bg-neutral-200/80 text-neutral-700 px-2 py-0.5 rounded-full">
                    {colOrders.length}
                  </span>
                </div>

                {/* Lista de tarjetas en la columna */}
                <div className="space-y-2.5 flex-1">
                  {colOrders.length === 0 ? (
                    <div className="py-8 text-center text-xs text-neutral-400 font-medium">
                      Sin órdenes
                    </div>
                  ) : (
                    colOrders.map((order) => {
                      const v = getVehicleObj(order.vehicleId);
                      const totalAmount = getOrderTotalWithItbis(order);

                      return (
                        <div
                          key={order.id}
                          onClick={() => openDetail(order)}
                          className="bg-white border border-neutral-200/80 rounded-2xl p-3.5 shadow-2xs hover:shadow-xs hover:border-neutral-300 transition-all cursor-pointer group space-y-2"
                        >
                          <div className="flex items-center justify-between gap-1 text-[10px]">
                            <span className="font-mono font-bold text-neutral-400">
                              #{order.id.slice(-6).toUpperCase()}
                            </span>
                            {v && (
                              <span className="font-mono font-bold bg-neutral-100 border border-neutral-200 px-1.5 py-0.2 rounded text-neutral-800">
                                {v.plate}
                              </span>
                            )}
                          </div>

                          <h4 className="text-xs font-bold text-neutral-900 group-hover:text-black line-clamp-2 leading-snug">
                            {order.description}
                          </h4>

                          <p className="text-[11px] text-neutral-500 truncate flex items-center gap-1">
                            <UserIcon className="h-3 w-3 text-neutral-400 shrink-0" />
                            {getCustomerName(order.customerId)}
                          </p>

                          <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs">
                            <span className="text-[10px] text-neutral-400 font-medium">
                              {order.serviceIds?.length ?? 0} tareas
                            </span>
                            {totalAmount > 0 && (
                              <span className="font-mono font-bold text-neutral-900">
                                RD$ {Math.round(totalAmount).toLocaleString("es-DO")}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lazy-loaded Dialogs */}
      <Suspense fallback={null}>
        {isCreateOpen && <LazyCreateDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />}
        {selectedOrder && isDetailOpen && (
          <LazyDetailDialog
            open={isDetailOpen}
            onOpenChange={setIsDetailOpen}
            order={allOrders.find((o) => o.id === selectedOrder.id) || selectedOrder}
          />
        )}
      </Suspense>
    </div>
  );
}
