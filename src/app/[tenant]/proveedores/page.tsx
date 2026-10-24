"use client";

import { useMemo, useState } from "react";
import { useParams } from "@/lib/next-compat";
import { useStore } from "@/store/useStore";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { 
  Truck, 
  ShoppingCart, 
  CreditCard, 
  Star, 
  TrendingUp, 
  AlertTriangle, 
  Package, 
  Search, 
  Scale,
  Plus,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  List,
  LayoutGrid
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SuppliersTab from "@/components/proveedores/SuppliersTab";
import PurchaseOrdersTab from "@/components/proveedores/PurchaseOrdersTab";
import AccountsPayableTab from "@/components/proveedores/AccountsPayableTab";
import SupplierFormDialog from "@/components/proveedores/SupplierFormDialog";
import DirectPurchaseDialog from "@/components/proveedores/DirectPurchaseDialog";

export default function ProveedoresPage() {
  const params = useParams();
  const tenantSlug = params?.tenant as string;
  const tenants = useStore((s) => s.tenants);
  const currentTenant = tenants.find((t) => t.slug === tenantSlug) ?? null;
  const tenantId = currentTenant?.id ?? "";

  const suppliers = useStore((s) => s.suppliers).filter((s) => s.tenantId === tenantId);
  const purchaseOrders = useStore((s) => s.purchaseOrders).filter((po) => po.tenantId === tenantId);
  const accountsPayable = useStore((s) => s.accountsPayable).filter((ap) => ap.tenantId === tenantId);
  const supplierProducts = useStore((s) => s.supplierProducts).filter((sp) => sp.tenantId === tenantId);
  const products = useStore((s) => s.products).filter((p) => p.tenantId === tenantId);

  const [compareSearch, setCompareSearch] = useState("");
  const [activeTab, setActiveTab] = useState("suppliers");
  const [showAlertsExpanded, setShowAlertsExpanded] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDirectPurchaseOpen, setIsDirectPurchaseOpen] = useState(false);

  const users = useStore((s) => s.users);
  const currentUserId = useStore((s) => s.currentUserId);
  const currentUser = useMemo(() => {
    return users.find((u) => u.id === currentUserId) || users.find((u) => u.tenantId === tenantId) || null;
  }, [users, currentUserId, tenantId]);
  const simulatedRole = typeof window !== 'undefined' ? localStorage.getItem("simulated-role") : null;
  const isWarehouse = (simulatedRole || currentUser?.role) === "warehouse";
  const isOwner = ['owner', 'superadmin', 'super_admin', 'admin'].includes((simulatedRole || currentUser?.role || '').toLowerCase());

  // KPIs
  const activeCount = suppliers.filter((s) => s.status === "activo").length;
  const suspendedCount = suppliers.filter((s) => s.status === "suspendido").length;
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const monthPurchases = purchaseOrders
    .filter((po) => po.status !== "cancelada" && po.status !== "borrador" && new Date(po.createdAt) >= monthStart)
    .reduce((s, po) => s + po.total, 0);
  const pendingPayables = accountsPayable
    .filter((ap) => ap.status !== "pagada")
    .reduce((s, ap) => s + (ap.amount - ap.paidAmount), 0);
  const overduePayables = accountsPayable
    .filter((ap) => ap.status !== "pagada" && new Date(ap.dueDate) < new Date())
    .length;

  // Ranking
  const ranking = useMemo(() => {
    const map = new Map<string, number>();
    purchaseOrders.filter((po) => po.status !== "cancelada" && po.status !== "borrador").forEach((po) => {
      map.set(po.supplierId, (map.get(po.supplierId) || 0) + po.total);
    });
    return [...map.entries()]
      .map(([id, total]) => ({ supplier: suppliers.find((s) => s.id === id), total }))
      .filter((r) => r.supplier)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [purchaseOrders, suppliers]);

  const topSupplier = ranking[0]?.supplier?.commercialName || "—";

  const pendingReceiptOrdersCount = useMemo(() => {
    return purchaseOrders.filter((po) => po.status === "pendiente" || po.status === "enviada" || po.status === "recibida_parcial").length;
  }, [purchaseOrders]);

  // Alertas Estructuradas Sin Emojis
  const alerts = useMemo(() => {
    const result: { id: string; type: "danger" | "warning" | "info"; title: string; description: string; actionTab?: string }[] = [];
    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - 180 * 86400000);

    // Facturas Vencidas
    accountsPayable.filter((ap) => ap.status !== "pagada" && new Date(ap.dueDate) < now).forEach((ap) => {
      const sup = suppliers.find((s) => s.id === ap.supplierId);
      result.push({
        id: `ap-${ap.id}`,
        type: "danger",
        title: `Factura #${ap.invoiceNumber} Vencida`,
        description: `${sup?.commercialName || "Proveedor"} — Balance por liquidar: RD$ ${(ap.amount - ap.paidAmount).toLocaleString("es-DO")}`,
        actionTab: "payables",
      });
    });

    // Facturas por vencer (próximos 7 días)
    const weekEnd = new Date(now.getTime() + 7 * 86400000);
    accountsPayable.filter((ap) => ap.status !== "pagada" && new Date(ap.dueDate) >= now && new Date(ap.dueDate) <= weekEnd).forEach((ap) => {
      const sup = suppliers.find((s) => s.id === ap.supplierId);
      result.push({
        id: `ap-near-${ap.id}`,
        type: "warning",
        title: `Factura #${ap.invoiceNumber} por Vencer`,
        description: `${sup?.commercialName || "Proveedor"} — Vence el ${new Date(ap.dueDate).toLocaleDateString("es-DO")}`,
        actionTab: "payables",
      });
    });

    // Proveedores sin compras en 6 meses
    suppliers.filter((s) => s.status === "activo").forEach((s) => {
      const hasPO = purchaseOrders.some((po) => po.supplierId === s.id && new Date(po.createdAt) >= sixMonthsAgo);
      if (!hasPO && purchaseOrders.some((po) => po.supplierId === s.id)) {
        result.push({
          id: `sup-inact-${s.id}`,
          type: "info",
          title: `${s.commercialName} sin compras recientes`,
          description: "Sin órdenes de compra registradas en más de 6 meses.",
          actionTab: "orders",
        });
      }
    });

    // Aumentos de precio > 20%
    supplierProducts.forEach((sp) => {
      if (sp.lastPrice && sp.currentPrice > sp.lastPrice * 1.2) {
        const prod = products.find((p) => p.id === sp.productId);
        const sup = suppliers.find((s) => s.id === sp.supplierId);
        result.push({
          id: `sp-price-${sp.id}`,
          type: "warning",
          title: `Alza en ${prod?.name || "Artículo"} (+${Math.round(((sp.currentPrice - sp.lastPrice) / sp.lastPrice) * 100)}%)`,
          description: `Precio actual en ${sup?.commercialName || "Proveedor"}: RD$ ${sp.currentPrice.toLocaleString("es-DO")}`,
          actionTab: "compare",
        });
      }
    });

    // Crédito agotado
    suppliers.forEach((s) => {
      if (s.creditLimit) {
        const balance = accountsPayable.filter((ap) => ap.supplierId === s.id && ap.status !== "pagada").reduce((sum, ap) => sum + (ap.amount - ap.paidAmount), 0);
        if (balance >= s.creditLimit * 0.9) {
          result.push({
            id: `credit-${s.id}`,
            type: "danger",
            title: `Límite de crédito agotado (${Math.round((balance / s.creditLimit) * 100)}%)`,
            description: `${s.commercialName} — Cupo comprometido al máximo.`,
            actionTab: "payables",
          });
        }
      }
    });

    return result.slice(0, 8);
  }, [suppliers, purchaseOrders, accountsPayable, supplierProducts, products]);

  // KPIs
  const kpis = useMemo(() => {
    if (isWarehouse) {
      return [
        { 
          label: "Proveedores", 
          value: `${activeCount} activos`, 
          sub: suspendedCount > 0 ? `${suspendedCount} suspendidos` : "Catálogo activo", 
          icon: Truck, 
          iconBg: "bg-slate-100 text-slate-800 border-slate-200/80", 
          tab: "suppliers",
          statusDot: "bg-slate-500",
        },
        { 
          label: "Órdenes Activas", 
          value: `${pendingReceiptOrdersCount} pendientes`, 
          sub: "Por recibir en almacén", 
          icon: ShoppingCart, 
          iconBg: "bg-blue-50 text-blue-700 border-blue-200/80", 
          tab: "orders",
          statusDot: "bg-blue-500",
        },
      ];
    }
    return [
      { 
        label: "Proveedores", 
        value: `${activeCount} activos`, 
        sub: suspendedCount > 0 ? `${suspendedCount} suspendidos` : `${suppliers.length} registrados`, 
        icon: Truck, 
        iconBg: "bg-slate-100 text-slate-800 border-slate-200/80", 
        tab: "suppliers",
        statusDot: "bg-slate-500",
      },
      { 
        label: "Compras del Mes", 
        currency: "RD$",
        formattedNumber: monthPurchases.toLocaleString("es-DO", { maximumFractionDigits: 0 }),
        value: `RD$ ${monthPurchases.toLocaleString("es-DO", { maximumFractionDigits: 0 })}`, 
        sub: "Órdenes ejecutadas", 
        icon: ShoppingCart, 
        iconBg: "bg-emerald-50 text-emerald-700 border-emerald-200/80", 
        tab: "orders",
        statusDot: "bg-emerald-500",
      },
      { 
        label: "Por Pagar", 
        currency: "RD$",
        formattedNumber: pendingPayables.toLocaleString("es-DO", { maximumFractionDigits: 0 }),
        value: `RD$ ${pendingPayables.toLocaleString("es-DO", { maximumFractionDigits: 0 })}`, 
        sub: overduePayables > 0 ? `${overduePayables} vencidas` : "Al día sin mora", 
        icon: CreditCard, 
        iconBg: overduePayables > 0 ? "bg-rose-50 text-rose-700 border-rose-200/80" : "bg-blue-50 text-blue-700 border-blue-200/80", 
        tab: "payables",
        statusDot: overduePayables > 0 ? "bg-rose-500" : "bg-emerald-500",
        subColor: overduePayables > 0 ? "text-rose-600 font-semibold" : undefined,
      },
      { 
        label: "Proveedor Top", 
        value: topSupplier, 
        sub: "Mayor volumen de compra", 
        icon: Star, 
        iconBg: "bg-amber-50 text-amber-700 border-amber-200/80", 
        tab: "ranking",
        statusDot: "bg-amber-500",
      },
      { 
        label: "Alertas de Pago", 
        value: alerts.length > 0 ? `${alerts.length} activas` : "Sin alertas", 
        sub: overduePayables > 0 ? `${overduePayables} con mora` : "Límites y pagos al día", 
        icon: AlertTriangle, 
        iconBg: alerts.length > 0 ? "bg-rose-50 text-rose-700 border-rose-200/80" : "bg-emerald-50 text-emerald-700 border-emerald-200/80", 
        tab: "payables",
        statusDot: alerts.length > 0 ? "bg-rose-500" : "bg-emerald-500",
        subColor: alerts.length > 0 ? "text-rose-600 font-semibold" : undefined,
      },
    ];
  }, [isWarehouse, activeCount, suspendedCount, suppliers.length, pendingReceiptOrdersCount, monthPurchases, pendingPayables, overduePayables, topSupplier, alerts.length]);

  // Comparador de Precios
  const compareResults = useMemo(() => {
    if (!compareSearch.trim()) return [];
    const q = compareSearch.toLowerCase();
    const matchProducts = products.filter((p) => p.name.toLowerCase().includes(q));
    return matchProducts.map((product) => {
      const sps = supplierProducts.filter((sp) => sp.productId === product.id);
      const offers = sps.map((sp) => ({
        supplier: suppliers.find((s) => s.id === sp.supplierId),
        price: sp.currentPrice,
        rating: (() => { const s = suppliers.find((s2) => s2.id === sp.supplierId); return s ? ((s.ratingDelivery + s.ratingQuality + s.ratingPrice + s.ratingService) / 4) : 0; })(),
      })).filter((o) => o.supplier).sort((a, b) => a.price - b.price);
      return { product, offers };
    }).filter((r) => r.offers.length > 0);
  }, [compareSearch, products, supplierProducts, suppliers]);

  return (
    <div className="space-y-6">
      {/* 1. Header Ejecutivo */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
              Proveedores & Abastecimiento
            </h1>
            <Badge
              variant="outline"
              className="text-[11px] font-bold rounded-full bg-neutral-100 text-neutral-700 border-neutral-200"
            >
              {suppliers.length} {suppliers.length === 1 ? "Proveedor" : "Proveedores"}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Directorio de suplidores, órdenes de compra, cuentas por pagar y comparador de precios.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isOwner && (
            <Button
              className="rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 gap-2 h-9 px-4 text-xs font-semibold shadow-xs active:scale-[0.98] transition-all cursor-pointer"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo Proveedor</span>
            </Button>
          )}

          <Button
            variant="outline"
            className="rounded-xl border border-neutral-200 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold text-xs gap-1.5 h-9 px-3.5 cursor-pointer shadow-2xs transition-all"
            onClick={() => setIsDirectPurchaseOpen(true)}
          >
            <ShoppingCart className="h-4 w-4 text-neutral-700" />
            <span>Registrar Compra</span>
          </Button>
        </div>
      </div>

      {/* 2. KPI Cards Métricas Ejecutivas */}
      <div className={cn("grid gap-3", isWarehouse ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5")}>
        {kpis.map((kpi) => {
          const isActive = activeTab === kpi.tab;
          const isLong = ((kpi as any).formattedNumber?.length || kpi.value.length) > 9;
          return (
            <button 
              key={kpi.label} 
              type="button"
              onClick={() => setActiveTab(kpi.tab)}
              className={cn(
                "flex flex-col justify-between rounded-2xl border p-4 bg-white shadow-2xs text-left transition-all group cursor-pointer active:scale-[0.98]",
                isActive
                  ? "border-neutral-900 ring-1 ring-neutral-900 shadow-xs"
                  : "border-neutral-200/80 hover:border-neutral-300 hover:shadow-xs"
              )}
            >
              {/* Fila superior: Título e Icono */}
              <div className="flex items-start justify-between gap-2 w-full">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 leading-tight">
                  {kpi.label}
                </span>
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl border flex-shrink-0 transition-transform group-hover:scale-105 shadow-2xs", kpi.iconBg)}>
                  <kpi.icon className="h-4 w-4" />
                </div>
              </div>

              {/* Fila central: Valor con ancho completo sin iconos que resten espacio */}
              <div className="mt-3">
                {"currency" in kpi && (kpi as any).currency ? (
                  <div className="flex items-baseline gap-1 font-mono">
                    <span className="text-xs font-bold text-neutral-400 tracking-tight shrink-0 select-none">
                      {(kpi as any).currency}
                    </span>
                    <span className={cn(
                      "font-black tracking-tight text-neutral-900 tabular-nums whitespace-nowrap",
                      isLong ? "text-lg xl:text-xl" : "text-xl sm:text-2xl"
                    )}>
                      {(kpi as any).formattedNumber}
                    </span>
                  </div>
                ) : (
                  <div 
                    className={cn(
                      "font-black tracking-tight text-neutral-900 font-mono tabular-nums truncate",
                      isLong ? "text-lg xl:text-xl" : "text-xl sm:text-2xl"
                    )}
                    title={kpi.value}
                  >
                    {kpi.value}
                  </div>
                )}
                
                {/* Fila inferior: Subtexto / estado */}
                <div className="mt-1 flex items-center gap-1.5 min-w-0">
                  {"statusDot" in kpi && (kpi as any).statusDot && (
                    <span className={cn("inline-block h-1.5 w-1.5 rounded-full shrink-0", (kpi as any).statusDot)} />
                  )}
                  <p className={cn("text-[11px] truncate font-medium", (kpi as any).subColor || "text-neutral-400")}>
                    {isActive ? "Filtrando activos" : kpi.sub}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. Centro de Alertas Inteligentes (Colapsable y Ejecutivo) */}
      {!isWarehouse && alerts.length > 0 && (
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/50 p-3.5 shadow-2xs transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-rose-950">
                    Centro de Alertas de Pago & Suministro
                  </span>
                  <Badge variant="outline" className="text-[10px] font-bold bg-white text-rose-700 border-rose-300">
                    {alerts.length} pendientes
                  </Badge>
                </div>
                <p className="text-[11px] text-rose-800/80 truncate">
                  Facturas vencidas o por vencer y límites de crédito que requieren supervisión inmediata.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAlertsExpanded((prev) => !prev)}
              className="h-8 rounded-xl border-rose-200 bg-white text-rose-800 hover:bg-rose-100 text-xs font-semibold gap-1.5 cursor-pointer shrink-0"
            >
              <span>{showAlertsExpanded ? "Ocultar Alertas" : `Ver ${alerts.length} Alertas`}</span>
              {showAlertsExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </div>

          {showAlertsExpanded && (
            <div className="mt-3 pt-3 border-t border-rose-200/70 grid gap-2 sm:grid-cols-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start justify-between gap-3 p-2.5 rounded-xl border border-neutral-200/80 bg-white shadow-2xs"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={cn(
                        "h-6 w-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                        alert.type === "danger"
                          ? "bg-rose-100 text-rose-700"
                          : alert.type === "warning"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
                      )}
                    >
                      {alert.type === "danger" ? (
                        <AlertTriangle className="h-3 w-3" />
                      ) : alert.type === "warning" ? (
                        <Clock className="h-3 w-3" />
                      ) : (
                        <Truck className="h-3 w-3" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-neutral-900 truncate">
                        {alert.title}
                      </p>
                      <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                        {alert.description}
                      </p>
                    </div>
                  </div>
                  {alert.actionTab && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab(alert.actionTab!)}
                      className="h-7 px-2 text-[10px] font-bold text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg shrink-0 cursor-pointer"
                    >
                      Ver
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Barra de Navegación: Pestañas con Iconos y Active State Negro Primario */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-neutral-50/80 p-2 rounded-2xl border border-neutral-200/80">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            {([
              { id: "suppliers", label: "Proveedores", icon: Truck, count: suppliers.length },
              { id: "orders", label: "Órdenes de Compra", icon: Package, count: purchaseOrders.length },
              ...(!isWarehouse ? [{ id: "payables", label: "Cuentas por Pagar", icon: CreditCard, count: accountsPayable.filter(a => a.status !== 'pagada').length, isAlert: overduePayables > 0 }] : []),
              { id: "compare", label: "Comparador de Precios", icon: Scale, count: null },
              ...(!isWarehouse ? [{ id: "ranking", label: "Ranking & Scores", icon: TrendingUp, count: ranking.length }] : []),
            ] as const).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs transition-all whitespace-nowrap cursor-pointer active:scale-[0.98]",
                    isActive
                      ? "bg-neutral-900 text-white font-semibold shadow-xs"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 font-medium"
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5", isActive ? "text-white" : "text-neutral-500")} />
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span
                      className={cn(
                        "text-[10px] font-mono px-1.5 py-0.2 rounded-full",
                        isActive
                          ? "bg-white/20 text-white"
                          : (tab as any).isAlert
                          ? "bg-rose-100 text-rose-700 font-bold"
                          : "bg-neutral-200/70 text-neutral-600"
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <TabsContent value="suppliers" className="mt-4">
          <SuppliersTab tenantId={tenantId} />
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          <PurchaseOrdersTab tenantId={tenantId} />
        </TabsContent>

        {!isWarehouse && (
          <TabsContent value="payables" className="mt-4">
            <AccountsPayableTab tenantId={tenantId} />
          </TabsContent>
        )}

        {/* 5. Comparador de Precios */}
        <TabsContent value="compare" className="mt-4 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-2xs">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
              <Input 
                placeholder="Buscar repuesto o lubricante para comparar ofertas..." 
                className="rounded-xl border-neutral-200 bg-white pl-9 h-9 text-xs shadow-2xs" 
                value={compareSearch} 
                onChange={(e) => setCompareSearch(e.target.value)} 
              />
              {compareSearch && (
                <button
                  type="button"
                  onClick={() => setCompareSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {compareSearch && compareResults.length === 0 && (
            <div className="text-center py-16 bg-white rounded-3xl border border-neutral-200/80 p-8 shadow-2xs">
              <div className="h-14 w-14 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400 mb-3 mx-auto">
                <Scale className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 font-heading">
                No se encontraron coincidencias para comparar
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm mt-1 mx-auto">
                Vincula repuestos y suministros a tus proveedores para habilitar la comparativa automática de precios y tiempos de entrega.
              </p>
            </div>
          )}

          {!compareSearch && (
            <div className="text-center py-12 bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-2xs">
              <Scale className="h-8 w-8 text-neutral-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-neutral-800">Comparador Inteligente de Compras</p>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                Escribe arriba el nombre de cualquier filtro, aceite o pieza para ver qué proveedor te ofrece la mejor tarifa en República Dominicana.
              </p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {compareResults.map((result) => (
              <div key={result.product.id} className="rounded-2xl border border-neutral-200/80 bg-white shadow-2xs p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-sm text-neutral-900">{result.product.name}</h4>
                    <span className="text-[10px] text-neutral-400 font-mono bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">
                      {result.product.sku}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {result.offers.map((offer, i) => (
                      <div 
                        key={offer.supplier!.id} 
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border transition-all", 
                          i === 0 
                            ? "border-emerald-300 bg-emerald-50/60 shadow-2xs" 
                            : "border-neutral-200/80 bg-neutral-50/50"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          {i === 0 && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                              <CheckCircle2 className="h-2.5 w-2.5" /> Mejor Precio
                            </span>
                          )}
                          <span className="text-xs font-semibold text-neutral-900">{offer.supplier!.commercialName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span className="text-xs font-bold text-neutral-700">{offer.rating.toFixed(1)}</span>
                          </div>
                          <span className="text-sm font-mono font-black text-neutral-900 tabular-nums">
                            RD$ {offer.price.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* 6. Ranking & Scores */}
        {!isWarehouse && (
          <TabsContent value="ranking" className="mt-4">
            {ranking.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-neutral-200/80 p-8 shadow-2xs">
                <div className="h-14 w-14 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400 mb-3 mx-auto">
                  <TrendingUp className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-neutral-900 font-heading">
                  Sin histórico de compras suficiente
                </h3>
                <p className="text-xs text-neutral-500 max-w-sm mt-1 mx-auto">
                  Al completar y recibir órdenes de compra, el algoritmo tabulará el volumen de gasto y el score de cumplimiento.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-2xs overflow-hidden">
                <Table className="w-full text-xs min-w-[650px]">
                  <TableHeader className="bg-neutral-50/80">
                    <TableRow className="border-b border-neutral-200/80">
                      <TableHead className="w-[80px] py-3.5 pl-6 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 text-center">
                        Puesto
                      </TableHead>
                      <TableHead className="py-3.5 pl-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                        Proveedor
                      </TableHead>
                      <TableHead className="w-[120px] py-3.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 text-center">
                        Calificación
                      </TableHead>
                      <TableHead className="w-[180px] py-3.5 pr-6 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 text-right">
                        Volumen Acumulado
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ranking.map((r, i) => {
                      const s = r.supplier!;
                      const avg = ((s.ratingDelivery + s.ratingQuality + s.ratingPrice + s.ratingService) / 4).toFixed(1);
                      return (
                        <TableRow key={s.id} className="group hover:bg-neutral-50/70 bg-white border-b border-neutral-100 transition-colors">
                          <TableCell className="py-3.5 pl-6 text-center">
                            <span className={cn(
                              "inline-flex h-7 w-7 items-center justify-center rounded-xl text-xs font-mono font-black shadow-2xs",
                              i === 0 ? "bg-neutral-900 text-white" : i === 1 ? "bg-neutral-200 text-neutral-800" : i === 2 ? "bg-amber-100 text-amber-900 border border-amber-300" : "bg-neutral-100 text-neutral-600"
                            )}>
                              {i + 1}
                            </span>
                          </TableCell>
                          <TableCell className="py-3.5 pl-3">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                                <Truck className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-neutral-900 text-xs sm:text-sm truncate">{s.commercialName}</p>
                                <p className="text-[10px] text-neutral-400 font-mono mt-0.5">{s.code} {s.rnc ? `• RNC: ${s.rnc}` : ""}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5 text-center">
                            <div className="inline-flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/70">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              <span className="text-xs font-mono font-bold text-amber-900">{avg} / 5.0</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5 pr-6 text-right font-mono font-black text-xs sm:text-sm text-neutral-900 tabular-nums">
                            RD$ {r.total.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Modales de Cabecera */}
      {isCreateOpen && (
        <SupplierFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} tenantId={tenantId} />
      )}
      {isDirectPurchaseOpen && (
        <DirectPurchaseDialog open={isDirectPurchaseOpen} onOpenChange={setIsDirectPurchaseOpen} tenantId={tenantId} isOwner={isOwner} />
      )}
    </div>
  );
}
