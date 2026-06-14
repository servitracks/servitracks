"use client";
import { useMemo } from "react";
import { useParams } from "@/lib/next-compat";
import { useStore } from "@/store/useStore";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, ShoppingCart, CreditCard, Star, TrendingUp, AlertTriangle, Package, Search, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SuppliersTab from "@/components/proveedores/SuppliersTab";
import PurchaseOrdersTab from "@/components/proveedores/PurchaseOrdersTab";
import AccountsPayableTab from "@/components/proveedores/AccountsPayableTab";
import { useState } from "react";

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

  const users = useStore((s) => s.users);
  const currentUserId = useStore((s) => s.currentUserId);
  const currentUser = useMemo(() => {
    return users.find((u) => u.id === currentUserId) || users.find((u) => u.tenantId === tenantId) || null;
  }, [users, currentUserId, tenantId]);
  const simulatedRole = typeof window !== 'undefined' ? localStorage.getItem("simulated-role") : null;
  const isWarehouse = (simulatedRole || currentUser?.role) === "warehouse";

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

  // Alerts
  const alerts = useMemo(() => {
    const result: { type: "danger" | "warning" | "info"; msg: string }[] = [];
    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - 180 * 86400000);

    // Overdue invoices
    accountsPayable.filter((ap) => ap.status !== "pagada" && new Date(ap.dueDate) < now).forEach((ap) => {
      const sup = suppliers.find((s) => s.id === ap.supplierId);
      result.push({ type: "danger", msg: `🔴 Factura ${ap.invoiceNumber} de ${sup?.commercialName || "?"} vencida` });
    });

    // Near due (7 days)
    const weekEnd = new Date(now.getTime() + 7 * 86400000);
    accountsPayable.filter((ap) => ap.status !== "pagada" && new Date(ap.dueDate) >= now && new Date(ap.dueDate) <= weekEnd).forEach((ap) => {
      const sup = suppliers.find((s) => s.id === ap.supplierId);
      result.push({ type: "warning", msg: `🟡 Factura ${ap.invoiceNumber} de ${sup?.commercialName || "?"} vence pronto` });
    });

    // Suppliers without purchases in 6 months
    suppliers.filter((s) => s.status === "activo").forEach((s) => {
      const hasPO = purchaseOrders.some((po) => po.supplierId === s.id && new Date(po.createdAt) >= sixMonthsAgo);
      if (!hasPO && purchaseOrders.some((po) => po.supplierId === s.id)) {
        result.push({ type: "info", msg: `ℹ️ ${s.commercialName} sin compras en 6+ meses` });
      }
    });

    // Price increases > 20%
    supplierProducts.forEach((sp) => {
      if (sp.lastPrice && sp.currentPrice > sp.lastPrice * 1.2) {
        const prod = products.find((p) => p.id === sp.productId);
        const sup = suppliers.find((s) => s.id === sp.supplierId);
        result.push({ type: "warning", msg: `⚠️ ${prod?.name || "Producto"} subió ${Math.round(((sp.currentPrice - sp.lastPrice) / sp.lastPrice) * 100)}% en ${sup?.commercialName || "?"}` });
      }
    });

    // Credit exhausted
    suppliers.forEach((s) => {
      if (s.creditLimit) {
        const balance = accountsPayable.filter((ap) => ap.supplierId === s.id && ap.status !== "pagada").reduce((sum, ap) => sum + (ap.amount - ap.paidAmount), 0);
        if (balance >= s.creditLimit * 0.9) result.push({ type: "danger", msg: `🔴 Crédito agotado con ${s.commercialName} (${Math.round((balance / s.creditLimit) * 100)}%)` });
      }
    });

    return result.slice(0, 8);
  }, [suppliers, purchaseOrders, accountsPayable, supplierProducts, products]);

  const kpis = useMemo(() => {
    if (isWarehouse) {
      return [
        { label: "Total Proveedores", value: `${activeCount} activos`, sub: suspendedCount > 0 ? `${suspendedCount} suspendidos` : undefined, icon: Truck, color: "text-neutral-700", bg: "bg-neutral-50", tab: "suppliers" },
        { label: "Órdenes Activas", value: `${pendingReceiptOrdersCount} pendientes`, sub: "Por recibir en almacén", icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50", tab: "orders" },
      ];
    }
    return [
      { label: "Total Proveedores", value: `${activeCount} activos`, sub: suspendedCount > 0 ? `${suspendedCount} suspendidos` : undefined, icon: Truck, color: "text-neutral-700", bg: "bg-neutral-50", tab: "suppliers" },
      { label: "Compras del Mes", value: `RD$ ${monthPurchases.toLocaleString("es-DO")}`, icon: ShoppingCart, color: "text-emerald-600", bg: "bg-emerald-50", tab: "orders" },
      { label: "Facturas Pendientes", value: `RD$ ${pendingPayables.toLocaleString("es-DO")}`, sub: overduePayables > 0 ? `${overduePayables} vencidas` : undefined, icon: CreditCard, color: overduePayables > 0 ? "text-rose-600" : "text-blue-600", bg: overduePayables > 0 ? "bg-rose-50" : "bg-blue-50", tab: "payables" },
      { label: "Proveedor Top", value: topSupplier, icon: Star, color: "text-amber-600", bg: "bg-amber-50", tab: "ranking" },
      { label: "Alertas", value: alerts.length > 0 ? `${alerts.length} activas` : "Sin alertas", icon: AlertTriangle, color: alerts.length > 0 ? "text-rose-600" : "text-emerald-600", bg: alerts.length > 0 ? "bg-rose-50" : "bg-emerald-50", tab: "payables" },
    ];
  }, [isWarehouse, activeCount, suspendedCount, pendingReceiptOrdersCount, monthPurchases, pendingPayables, overduePayables, topSupplier, alerts]);



  // Price Comparator
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
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-neutral-900">Proveedores</h1>
        <p className="text-neutral-500">Centro de Gestión de Compras y Abastecimiento</p>
      </div>

      {/* Executive Dashboard */}
      <div className={cn("grid gap-4", isWarehouse ? "grid-cols-2 md:grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-5")}>
        {kpis.map((kpi) => (
          <Card 
            key={kpi.label} 
            className="border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)] cursor-pointer hover:border-neutral-300 hover:shadow-md active:scale-[0.98] transition-all duration-200 bg-white"
            onClick={() => setActiveTab(kpi.tab)}
          >
            <CardContent className="p-4 flex flex-col justify-between h-full min-h-[100px]">
              <div className="flex items-start justify-between mb-2 gap-2">
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-tight leading-snug">{kpi.label}</p>
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0", kpi.bg)}>
                  <kpi.icon className={cn("h-4 w-4", kpi.color)} />
                </div>
              </div>
              <div>
                <p className="text-[17px] font-black text-neutral-900 leading-none tracking-tight break-words">{kpi.value}</p>
                {kpi.sub && <p className="text-[10px] font-medium text-neutral-400 mt-1.5 leading-tight">{kpi.sub}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts Bar */}
      {!isWarehouse && alerts.length > 0 && (
        <div className="rounded-xl border border-neutral-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase text-neutral-400 tracking-wider mb-3 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Alertas Inteligentes
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {alerts.map((a, i) => (
              <div key={i} className={cn("text-xs px-3 py-2 rounded-lg font-medium", a.type === "danger" ? "bg-rose-50 text-rose-700" : a.type === "warning" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700")}>
                {a.msg}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-neutral-100 rounded-xl p-1">
          <TabsTrigger value="suppliers" className="rounded-lg px-5 data-[state=active]:bg-white data-[state=active]:shadow-sm gap-1.5"><Truck className="h-3.5 w-3.5" /> Proveedores</TabsTrigger>
          <TabsTrigger value="orders" className="rounded-lg px-5 data-[state=active]:bg-white data-[state=active]:shadow-sm gap-1.5"><Package className="h-3.5 w-3.5" /> Órdenes de Compra</TabsTrigger>
          {!isWarehouse && <TabsTrigger value="payables" className="rounded-lg px-5 data-[state=active]:bg-white data-[state=active]:shadow-sm gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Cuentas por Pagar</TabsTrigger>}
          <TabsTrigger value="compare" className="rounded-lg px-5 data-[state=active]:bg-white data-[state=active]:shadow-sm gap-1.5"><Scale className="h-3.5 w-3.5" /> Comparador</TabsTrigger>
          {!isWarehouse && <TabsTrigger value="ranking" className="rounded-lg px-5 data-[state=active]:bg-white data-[state=active]:shadow-sm gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Ranking</TabsTrigger>}
        </TabsList>

        <TabsContent value="suppliers" className="mt-4"><SuppliersTab tenantId={tenantId} /></TabsContent>
        <TabsContent value="orders" className="mt-4"><PurchaseOrdersTab tenantId={tenantId} /></TabsContent>
        {!isWarehouse && <TabsContent value="payables" className="mt-4"><AccountsPayableTab tenantId={tenantId} /></TabsContent>}

        {/* Price Comparator */}
        <TabsContent value="compare" className="mt-4 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input placeholder="Buscar producto para comparar precios..." className="rounded-full border-neutral-200 bg-white pl-10 h-10" value={compareSearch} onChange={(e) => setCompareSearch(e.target.value)} />
          </div>
          {compareSearch && compareResults.length === 0 && (
            <div className="text-center py-10 text-neutral-400">
              <Scale className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No se encontraron productos con múltiples proveedores</p>
              <p className="text-xs mt-1">Vincula productos a proveedores desde el detalle de cada proveedor</p>
            </div>
          )}
          {compareResults.map((result) => (
            <div key={result.product.id} className="rounded-xl border border-neutral-100 bg-white shadow-sm p-4">
              <p className="font-bold text-sm mb-3">{result.product.name} <span className="text-xs text-neutral-400 font-mono ml-2">{result.product.sku}</span></p>
              <div className="space-y-2">
                {result.offers.map((offer, i) => (
                  <div key={offer.supplier!.id} className={cn("flex items-center justify-between p-3 rounded-lg border", i === 0 ? "border-emerald-200 bg-emerald-50/50" : "border-neutral-100 bg-neutral-50/50")}>
                    <div className="flex items-center gap-3">
                      {i === 0 && <Badge className="bg-emerald-600 text-white text-[10px] border-none">✅ Mejor Precio</Badge>}
                      <span className="text-sm font-medium">{offer.supplier!.commercialName}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" /><span className="text-xs font-bold">{offer.rating.toFixed(1)}</span></div>
                      <span className="text-lg font-black">RD$ {offer.price.toLocaleString("es-DO")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* Ranking */}
        <TabsContent value="ranking" className="mt-4">
          {ranking.length === 0 ? (
            <div className="text-center py-10 text-neutral-400">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Sin datos de compras aún</p>
            </div>
          ) : (
            <div className="rounded-xl border border-neutral-100 bg-white shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-neutral-50/50">
                  <TableRow>
                    <TableHead className="w-[60px]">Ranking</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Total Compras</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranking.map((r, i) => {
                    const s = r.supplier!;
                    const avg = ((s.ratingDelivery + s.ratingQuality + s.ratingPrice + s.ratingService) / 4).toFixed(1);
                    return (
                      <TableRow key={s.id} className="hover:bg-neutral-50/50">
                        <TableCell>
                          <span className={cn("flex h-8 w-8 items-center justify-center rounded-full text-sm font-black",
                            i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-neutral-200 text-neutral-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-neutral-100 text-neutral-500"
                          )}>{i + 1}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-neutral-100 flex items-center justify-center"><Truck className="h-4 w-4 text-neutral-500" /></div>
                            <div>
                              <p className="font-semibold text-sm">{s.commercialName}</p>
                              <p className="text-xs text-neutral-400">{s.code}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><div className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /><span className="text-sm font-bold">{avg}</span></div></TableCell>
                        <TableCell className="text-lg font-black text-neutral-900">RD$ {r.total.toLocaleString("es-DO")}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
