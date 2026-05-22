"use client";

import { useState, lazy, Suspense, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "@/lib/next-compat";
import { useStore, WorkOrder } from "@/store/useStore";
import {
  Plus, Search, MoreVertical, Clock, User as UserIcon, Car as CarIcon,
  CheckCircle2, AlertCircle, Wrench, Filter, Trash2,
  ChevronRight, LayoutGrid, List, Banknote, UserCog, Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Lazy-load dialogs — only compiled when opened
const LazyCreateDialog = lazy(() => import("./OrderCreateDialog"));
const LazyDetailDialog = lazy(() => import("./OrderDetailDialog"));

const statusConfig = {
  pending: { label: "Pendiente", color: "bg-neutral-100 text-neutral-600 border-neutral-200", dot: "bg-neutral-400", icon: Clock },
  diagnosing: { label: "En Diagnóstico", color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500", icon: Search },
  repairing: { label: "En Reparación", color: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500", icon: Wrench },
  waiting_parts: { label: "Esperando Piezas", color: "bg-rose-100 text-rose-700 border-rose-200", dot: "bg-rose-500", icon: AlertCircle },
  finished: { label: "Finalizado", color: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", icon: CheckCircle2 },
  delivered: { label: "Entregado", color: "bg-neutral-900 text-white border-neutral-900", dot: "bg-white", icon: CheckCircle2 },
  invoiced: { label: "Facturado", color: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500", icon: Banknote },
} as const;

type Status = keyof typeof statusConfig;

const STATUS_FLOW: Status[] = ["pending", "diagnosing", "repairing", "waiting_parts", "finished", "delivered", "invoiced"];

const statusLabels: Record<Status, string> = {
  pending: "Pendiente",
  diagnosing: "En Diagnóstico",
  repairing: "En Reparación",
  waiting_parts: "Esperando Piezas",
  finished: "Finalizado",
  delivered: "Entregado",
  invoiced: "Facturado",
};

export default function OrdersPage() {
  const router = useRouter();
  const { tenant } = useParams();
  const searchParams = useSearchParams();
  const orders = useStore((s) => s.orders);
  const customers = useStore((s) => s.customers);
  const vehicles = useStore((s) => s.vehicles);
  const technicians = useStore((s) => s.technicians);
  const updateOrder = useStore((s) => s.updateOrder);
  const deleteOrder = useStore((s) => s.deleteOrder);
  const deliverWorkOrder = useStore((s) => s.deliverWorkOrder);
  const addWhatsAppLog = useStore((s) => s.addWhatsAppLog);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);

  useEffect(() => {
    const cId = searchParams.get("customerId");
    const vId = searchParams.get("vehicleId");
    if (cId && vId) {
      setIsCreateOpen(true);
    }
  }, [searchParams]);

  const getCustomerName = (id: string) => customers.find((c) => c.id === id)?.name || "Desconocido";
  const getVehicleInfo = (id: string) => {
    const v = vehicles.find((v) => v.id === id);
    return v ? `${v.brand} ${v.model} (${v.plate})` : "Desconocido";
  };
  const getTechnicianName = (id?: string) => {
    if (!id) return "Desconocido";
    return technicians.find((t) => t.id === id)?.name || "Desconocido";
  };

  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      getCustomerName(o.customerId).toLowerCase().includes(search.toLowerCase()) ||
      o.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const sendWhatsAppNotification = (order: WorkOrder, newStatus: Status) => {
    const customer = customers.find(c => c.id === order.customerId);
    const vehicle = vehicles.find(v => v.id === order.vehicleId);
    
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
        return; // No message for pending, delivered, invoiced.
    }

    addWhatsAppLog({
      id: `wl_order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId: order.tenantId,
      customerId: customer.id,
      customerName: customer.name,
      phone: customer.phone,
      type: 'notification',
      message,
      status: 'pending',
      sentAt: new Date().toISOString()
    });
  };

  const advanceStatus = (order: WorkOrder) => {
    const idx = STATUS_FLOW.indexOf(order.status);
    if (idx < STATUS_FLOW.length - 1) {
      const next = STATUS_FLOW[idx + 1];
      if (next === "delivered") {
        deliverWorkOrder(order.id);
        const vehicle = vehicles.find(v => v.id === order.vehicleId);
        toast.success(`Vehículo entregado con éxito`, {
          action: {
            label: "Ver Mantenimiento",
            onClick: () => router.push(`/${tenant}/maintenance?search=${vehicle?.plate || ""}`)
          }
        });
      } else if (next === "invoiced") {
        updateOrder(order.id, { status: next });
        toast.success(`Orden lista para facturar`, {
          action: {
            label: "Ir al POS",
            onClick: () => router.push(`/${tenant}/pos?orderId=${order.id}`)
          }
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
      const order = orders.find(o => o.id === orderId);
      const vehicle = vehicles.find(v => v.id === order?.vehicleId);
      toast.success(`Vehículo entregado con éxito`, {
        action: {
          label: "Ver Mantenimiento",
          onClick: () => router.push(`/${tenant}/maintenance?search=${vehicle?.plate || ""}`)
        }
      });
    } else if (status === "invoiced") {
      updateOrder(orderId, { status });
      toast.success(`Orden lista para facturar`, {
        action: {
          label: "Ir al POS",
          onClick: () => router.push(`/${tenant}/pos?orderId=${orderId}`)
        }
      });
    } else {
      updateOrder(orderId, { status });
      const order = orders.find(o => o.id === orderId);
      if (order) sendWhatsAppNotification(order, status);
      toast.success(`Estado cambiado a "${statusLabels[status]}" y alerta de WhatsApp encolada`);
    }
  };

  const openDetail = (order: WorkOrder) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const repairingCount = orders.filter((o) => o.status === "repairing").length;
  const finishedCount = orders.filter((o) => o.status === "finished").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div id="tour-orders-header" className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-neutral-900">Órdenes de Trabajo</h1>
          <p className="text-neutral-500">Monitorea el progreso de las reparaciones en tiempo real.</p>
        </div>
        <Button className="rounded-lg bg-black text-white hover:bg-neutral-800 gap-2"
          onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Nueva Orden
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pendientes", value: pendingCount, color: "text-neutral-700", bg: "bg-neutral-100" },
          { label: "En Reparación", value: repairingCount, color: "text-blue-700", bg: "bg-blue-100" },
          { label: "Finalizadas", value: finishedCount, color: "text-emerald-700", bg: "bg-emerald-100" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-neutral-100 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("h-2.5 w-2.5 rounded-full flex-shrink-0", kpi.bg.replace("bg-", "bg-").replace("-100", "-400"))} />
              <div>
                <p className="text-xs text-neutral-500 font-medium">{kpi.label}</p>
                <p className={cn("text-2xl font-black", kpi.color)}>{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input placeholder="Buscar por cliente o descripción..."
            className="rounded-full border-neutral-200 bg-white pl-10"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status | "all")}>
          <SelectTrigger className="w-52 h-10 rounded-full border-neutral-200 bg-white">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-neutral-400" />
            <span className="text-sm">{(({
              all: "Todos los estados",
              ...Object.fromEntries(STATUS_FLOW.map(s => [s, statusLabels[s]]))
            } as Record<string, string>)[statusFilter] ?? "Estado")}</span>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">Todos los estados</SelectItem>
            {STATUS_FLOW.map((s) => <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex rounded-xl border border-neutral-200 overflow-hidden bg-white">
          <button onClick={() => setViewMode("list")} className={cn("p-2.5 transition-colors", viewMode === "list" ? "bg-black text-white" : "text-neutral-400 hover:bg-neutral-50")}>
            <List className="h-4 w-4" />
          </button>
          <button onClick={() => setViewMode("kanban")} className={cn("p-2.5 transition-colors", viewMode === "kanban" ? "bg-black text-white" : "text-neutral-400 hover:bg-neutral-50")}>
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* List View */}
      {viewMode === "list" && (
        <div id="tour-orders-list" className="grid gap-3">
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-16 w-16 rounded-full bg-neutral-50 flex items-center justify-center mb-4">
                <Wrench className="h-8 w-8 text-neutral-200" />
              </div>
              <p className="text-neutral-500 font-medium">No se encontraron órdenes</p>
            </div>
          ) : filteredOrders.map((order) => {
            const config = statusConfig[order.status];
            const StatusIcon = config.icon;
            const idx = STATUS_FLOW.indexOf(order.status);
            const nextStatus = idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;

            return (
              <Card key={order.id} className="group border-neutral-100 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer"
                onClick={() => openDetail(order)}>
                <CardContent className="p-0">
                  <div className="flex">
                    <div className={cn("w-1.5 flex-shrink-0", config.dot.replace("bg-", "bg-"))} />
                    <div className="flex-1 p-5 flex flex-col md:flex-row md:items-center gap-4 min-w-0">
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={cn("rounded-full border px-3 py-0.5 text-xs font-semibold", config.color)}>
                            <StatusIcon className="mr-1.5 h-3 w-3" />
                            {config.label}
                          </Badge>
                          <span className="text-xs text-neutral-400 font-mono">#{order.id.slice(-6).toUpperCase()}</span>
                        </div>
                        <h3 className="font-bold text-neutral-900 truncate">{order.description}</h3>
                        <div className="flex items-center gap-4 text-xs text-neutral-500 flex-wrap">
                          <span className="flex items-center gap-1"><UserIcon className="h-3 w-3" />{getCustomerName(order.customerId)}</span>
                          <span className="flex items-center gap-1"><CarIcon className="h-3 w-3" />{getVehicleInfo(order.vehicleId)}</span>
                          {order.mechanicId && (
                            <span className="flex items-center gap-1 bg-neutral-100 px-2 py-0.5 rounded-full text-[10px] font-semibold text-neutral-700">
                              <UserCog className="h-3 w-3 text-neutral-500" />
                              Téc: {getTechnicianName(order.mechanicId)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        {order.estimatedTime && (
                          <div className="text-right hidden md:block">
                            <p className="text-xs text-neutral-400">Tiempo est.</p>
                            <p className="text-sm font-bold">{order.estimatedTime}</p>
                          </div>
                        )}
                        <div className="text-right">
                          <p className="text-xs text-neutral-400">Servicios</p>
                          <p className="text-sm font-bold text-neutral-800">
                            {order.serviceIds?.length ?? 0} {Number(order.serviceIds?.length ?? 0) === 1 ? "tarea" : "tareas"}
                          </p>
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 outline-none transition-colors border border-neutral-200 shadow-sm group">
                              <Settings className="h-4 w-4 text-neutral-600 group-hover:text-black transition-transform group-hover:rotate-45" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl border-neutral-100 p-2 shadow-lg w-52">
                              <div className="px-2 pb-1 pt-0.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">CAMBIAR ESTADO</div>
                              {STATUS_FLOW.map((s) => (
                                <DropdownMenuItem key={s} className={cn("rounded-lg py-2 cursor-pointer gap-2", order.status === s && "font-bold")}
                                  onClick={() => setStatus(order.id, s)}>
                                  <div className={cn("h-2 w-2 rounded-full", statusConfig[s].dot)} />
                                  {statusLabels[s]}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              {nextStatus && (
                                <DropdownMenuItem className="rounded-lg py-2 cursor-pointer text-blue-600 font-semibold gap-2"
                                  onClick={() => advanceStatus(order)}>
                                  <ChevronRight className="h-4 w-4" /> Avanzar estado
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="rounded-lg py-2 text-rose-600 focus:text-rose-600 cursor-pointer gap-2"
                                onClick={() => { deleteOrder(order.id); toast.success("Orden eliminada"); }}>
                                <Trash2 className="h-4 w-4" /> Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Kanban View */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto">
          {STATUS_FLOW.map((status) => {
            const config = statusConfig[status];
            const colOrders = orders.filter((o) => o.status === status);
            return (
              <div key={status} className="min-w-[180px]">
                <div className={cn("flex items-center gap-2 rounded-xl px-3 py-2 mb-3", config.color.split(" ").slice(0, 2).join(" "))}>
                  <div className={cn("h-2 w-2 rounded-full", config.dot)} />
                  <span className="text-xs font-bold truncate">{config.label}</span>
                  <span className="ml-auto text-xs font-black">{colOrders.length}</span>
                </div>
                <div className="space-y-2">
                  {colOrders.map((order) => (
                    <div key={order.id} className="bg-white border border-neutral-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-all cursor-pointer"
                      onClick={() => openDetail(order)}>
                      <p className="text-xs font-bold text-neutral-900 line-clamp-2 mb-2">{order.description}</p>
                      <p className="text-xs text-neutral-500">{getCustomerName(order.customerId)}</p>
                      <p className="text-xs font-semibold mt-2 text-neutral-500 flex items-center gap-1">
                        🛠 {order.serviceIds?.length ?? 0} {Number(order.serviceIds?.length ?? 0) === 1 ? "servicio" : "servicios"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lazy-loaded Dialogs */}
      <Suspense fallback={null}>
        {isCreateOpen && <LazyCreateDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />}
        {selectedOrder && isDetailOpen && <LazyDetailDialog open={isDetailOpen} onOpenChange={setIsDetailOpen} order={selectedOrder} />}
      </Suspense>
    </div>
  );
}
