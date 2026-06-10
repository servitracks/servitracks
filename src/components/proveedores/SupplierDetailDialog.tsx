"use client";

import { useState } from "react";
import type { Supplier, SupplierProduct, PurchaseOrder, AccountPayable } from "@/store/types";
import { useStore } from "@/store/useStore";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Star, MapPin, Phone, Mail, Globe, TrendingUp, TrendingDown,
  ShoppingCart, Package, CreditCard, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Star Rating Component ───────────────────────────────────────────────────
function StarRating({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={cn("transition-colors", readonly ? "cursor-default" : "cursor-pointer hover:scale-110")}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
        >
          <Star
            className={cn(
              "h-5 w-5 transition-colors",
              (hover || value) >= star
                ? "fill-amber-400 text-amber-400"
                : "fill-none text-neutral-300"
            )}
          />
        </button>
      ))}
    </div>
  );
}

interface Props {
  supplier: Supplier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
}

export default function SupplierDetailDialog({ supplier, open, onOpenChange, tenantId }: Props) {
  const products = useStore((s) => s.products).filter((p) => p.tenantId === tenantId);
  const supplierProducts = useStore((s) => s.supplierProducts).filter((sp) => sp.tenantId === tenantId && sp.supplierId === supplier?.id);
  const purchaseOrders = useStore((s) => s.purchaseOrders).filter((po) => po.tenantId === tenantId && po.supplierId === supplier?.id);
  const accountsPayable = useStore((s) => s.accountsPayable).filter((ap) => ap.tenantId === tenantId && ap.supplierId === supplier?.id);
  const { updateSupplier } = useStore();
  const currentUserId = useStore((s) => s.currentUserId);
  const users = useStore((s) => s.users);
  const currentUser = currentUserId === 'admin' ? { role: 'owner' } : users.find((u) => u.id === currentUserId);
  const isWarehouse = currentUser?.role === 'warehouse';

  if (!supplier) return null;

  const totalPurchased = purchaseOrders
    .filter((po) => po.status !== "cancelada" && po.status !== "borrador")
    .reduce((sum, po) => sum + po.total, 0);
  const totalOrders = purchaseOrders.filter((po) => po.status !== "cancelada").length;
  const lastOrder = purchaseOrders.length > 0
    ? new Date(purchaseOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt)
    : null;
  const pendingBalance = accountsPayable
    .filter((ap) => ap.status !== "pagada")
    .reduce((sum, ap) => sum + (ap.amount - ap.paidAmount), 0);
  const overdueBalance = accountsPayable
    .filter((ap) => ap.status === "vencida" || (ap.status === "pendiente" && new Date(ap.dueDate) < new Date()))
    .reduce((sum, ap) => sum + (ap.amount - ap.paidAmount), 0);

  const avgRating = ((supplier.ratingDelivery + supplier.ratingQuality + supplier.ratingPrice + supplier.ratingService) / 4).toFixed(1);

  const handleRatingChange = (field: keyof Pick<Supplier, 'ratingDelivery' | 'ratingQuality' | 'ratingPrice' | 'ratingService'>, value: number) => {
    updateSupplier(supplier.id, { [field]: value });
    toast.success("Calificación actualizada");
  };

  const statusColors: Record<string, string> = {
    activo: "bg-emerald-100 text-emerald-700",
    suspendido: "bg-amber-100 text-amber-700",
    bloqueado: "bg-rose-100 text-rose-700",
  };

  const typeLabels: Record<string, string> = {
    repuestos: "Repuestos",
    lubricantes: "Lubricantes",
    neumaticos: "Neumáticos",
    herramientas: "Herramientas",
    servicios_externos: "Servicios Externos",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl rounded-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 text-white p-6 rounded-t-2xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-mono text-neutral-400 mb-1">{supplier.code}</p>
              <h2 className="text-2xl font-bold">{supplier.commercialName}</h2>
              {supplier.legalName && <p className="text-sm text-neutral-400 mt-0.5">{supplier.legalName}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Badge className={cn("border-none text-xs font-bold", statusColors[supplier.status])}>
                {supplier.status.charAt(0).toUpperCase() + supplier.status.slice(1)}
              </Badge>
              <Badge variant="outline" className="border-neutral-600 text-neutral-300 text-xs">
                {typeLabels[supplier.type]}
              </Badge>
            </div>
          </div>
          {/* Quick Stats */}
          <div className={cn("grid gap-3 mt-5", isWarehouse ? "grid-cols-2" : "grid-cols-4")}>
            {[
              ...(!isWarehouse ? [{ label: "Total Comprado", value: `RD$ ${totalPurchased.toLocaleString("es-DO")}`, icon: ShoppingCart }] : []),
              { label: "Órdenes", value: totalOrders, icon: Package },
              ...(!isWarehouse ? [{ label: "Balance Pendiente", value: `RD$ ${pendingBalance.toLocaleString("es-DO")}`, icon: CreditCard }] : []),
              { label: "Score", value: `${avgRating}/5`, icon: Star },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className="h-3.5 w-3.5 text-neutral-400" />
                  <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">{s.label}</span>
                </div>
                <p className="text-lg font-black">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs Content */}
        <Tabs defaultValue="general" className="p-6 pt-4">
          <TabsList className={cn("bg-neutral-100 rounded-xl p-1 w-full grid", isWarehouse ? "grid-cols-3" : "grid-cols-5")}>
            <TabsTrigger value="general" className="rounded-lg text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">General</TabsTrigger>
            {!isWarehouse && <TabsTrigger value="commercial" className="rounded-lg text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">Comercial</TabsTrigger>}
            <TabsTrigger value="catalog" className="rounded-lg text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">Catálogo</TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">Compras</TabsTrigger>
            {!isWarehouse && <TabsTrigger value="rating" className="rounded-lg text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">Evaluación</TabsTrigger>}
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="mt-4 space-y-4">
            {supplier.rnc && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-neutral-500">RNC:</span>
                <span className="font-mono font-bold">{supplier.rnc}</span>
              </div>
            )}
            {/* Contacts */}
            <div>
              <p className="text-xs font-black uppercase text-neutral-400 tracking-wider mb-2">Contactos</p>
              <div className="space-y-2">
                {supplier.contacts.map((c, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                    <div className="h-10 w-10 rounded-full bg-neutral-200 flex items-center justify-center text-sm font-bold text-neutral-600">
                      {c.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-neutral-900">{c.name}</p>
                      <p className="text-xs text-neutral-500">{c.role}</p>
                    </div>
                    <div className="flex items-center gap-3 text-neutral-500">
                      {c.phone && <a href={`tel:${c.phone}`} className="hover:text-neutral-900 transition-colors"><Phone className="h-4 w-4" /></a>}
                      {c.email && <a href={`mailto:${c.email}`} className="hover:text-neutral-900 transition-colors"><Mail className="h-4 w-4" /></a>}
                      {c.whatsapp && <a href={`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="hover:text-emerald-600 transition-colors"><Phone className="h-4 w-4" /></a>}
                    </div>
                  </div>
                ))}
                {supplier.contacts.length === 0 && <p className="text-sm text-neutral-400 text-center py-4">Sin contactos registrados</p>}
              </div>
            </div>
            {/* Location */}
            {(supplier.address || supplier.city) && (
              <div>
                <p className="text-xs font-black uppercase text-neutral-400 tracking-wider mb-2">Ubicación</p>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                  <MapPin className="h-4 w-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                  <div>
                    {supplier.address && <p className="text-sm font-medium">{supplier.address}</p>}
                    <p className="text-xs text-neutral-500">{[supplier.city, supplier.province, supplier.country].filter(Boolean).join(", ")}</p>
                    {supplier.googleMapsUrl && (
                      <a href={supplier.googleMapsUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-flex items-center gap-1">
                        <Globe className="h-3 w-3" /> Ver en Google Maps
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
            {supplier.notes && (
              <div>
                <p className="text-xs font-black uppercase text-neutral-400 tracking-wider mb-2">Notas</p>
                <p className="text-sm text-neutral-600 bg-neutral-50 rounded-xl p-3 border border-neutral-100">{supplier.notes}</p>
              </div>
            )}
          </TabsContent>

          {/* Commercial Tab */}
          {!isWarehouse && (
            <TabsContent value="commercial" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Límite de Crédito", value: supplier.creditLimit ? `RD$ ${supplier.creditLimit.toLocaleString("es-DO")}` : "No definido" },
                  { label: "Días de Crédito", value: supplier.creditDays ? `${supplier.creditDays} días` : "No definido" },
                  { label: "Descuento General", value: supplier.generalDiscount ? `${supplier.generalDiscount}%` : "Sin descuento" },
                  { label: "Descuento por Volumen", value: supplier.volumeDiscount ? `${supplier.volumeDiscount}%` : "Sin descuento" },
                  { label: "Moneda", value: supplier.currency },
                  { label: "Balance Pendiente", value: `RD$ ${pendingBalance.toLocaleString("es-DO")}` },
                  { label: "Balance Vencido", value: overdueBalance > 0 ? `RD$ ${overdueBalance.toLocaleString("es-DO")}` : "RD$ 0" },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                    <p className="text-xs font-medium text-neutral-500">{item.label}</p>
                    <p className="text-lg font-bold text-neutral-900 mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
              {supplier.creditLimit && pendingBalance > 0 && (
                <div>
                  <p className="text-xs font-medium text-neutral-500 mb-1">Uso de Crédito</p>
                  <div className="h-3 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        (pendingBalance / supplier.creditLimit) > 0.9 ? "bg-rose-500" : (pendingBalance / supplier.creditLimit) > 0.7 ? "bg-amber-500" : "bg-emerald-500"
                      )}
                      style={{ width: `${Math.min(100, (pendingBalance / supplier.creditLimit) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">{Math.round((pendingBalance / supplier.creditLimit) * 100)}% utilizado</p>
                </div>
              )}
            </TabsContent>
          )}

          {/* Catalog Tab */}
          <TabsContent value="catalog" className="mt-4">
            {supplierProducts.length === 0 ? (
              <div className="text-center py-10 text-neutral-400">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Sin productos vinculados a este proveedor</p>
              </div>
            ) : (
              <div className="rounded-xl border border-neutral-100 overflow-hidden">
                <Table>
                  <TableHeader className="bg-neutral-50/50">
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Precio Actual</TableHead>
                      <TableHead>Último Precio</TableHead>
                      <TableHead>Variación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierProducts.map((sp) => {
                      const product = products.find((p) => p.id === sp.productId);
                      const variation = sp.lastPrice ? ((sp.currentPrice - sp.lastPrice) / sp.lastPrice * 100) : 0;
                      return (
                        <TableRow key={sp.id} className="hover:bg-neutral-50/50">
                          <TableCell className="font-medium text-sm">{product?.name || "Producto eliminado"}</TableCell>
                          <TableCell className="font-bold text-sm">RD$ {sp.currentPrice.toLocaleString("es-DO")}</TableCell>
                          <TableCell className="text-sm text-neutral-500">{sp.lastPrice ? `RD$ ${sp.lastPrice.toLocaleString("es-DO")}` : "—"}</TableCell>
                          <TableCell>
                            {variation !== 0 && (
                              <span className={cn("flex items-center gap-1 text-xs font-bold", variation > 0 ? "text-rose-600" : "text-emerald-600")}>
                                {variation > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                {Math.abs(variation).toFixed(1)}%
                              </span>
                            )}
                            {variation === 0 && <span className="text-xs text-neutral-400">—</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4 space-y-4">
            <div className={cn("grid gap-3", isWarehouse ? "grid-cols-2" : "grid-cols-3")}>
              {!isWarehouse && (
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-center">
                  <p className="text-xs text-neutral-500">Total Comprado</p>
                  <p className="text-xl font-black text-neutral-900">RD$ {totalPurchased.toLocaleString("es-DO")}</p>
                </div>
              )}
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-center">
                <p className="text-xs text-neutral-500">Nº Órdenes</p>
                <p className="text-xl font-black text-neutral-900">{totalOrders}</p>
              </div>
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-center">
                <p className="text-xs text-neutral-500">Última Compra</p>
                <p className="text-xl font-black text-neutral-900">
                  {lastOrder ? lastOrder.toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                </p>
              </div>
            </div>
            {purchaseOrders.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-6">Sin compras registradas</p>
            ) : (
              <div className="rounded-xl border border-neutral-100 overflow-hidden">
                <Table>
                  <TableHeader className="bg-neutral-50/50">
                    <TableRow>
                      <TableHead>Nº OC</TableHead>
                      <TableHead>Fecha</TableHead>
                      {!isWarehouse && <TableHead>Total</TableHead>}
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...purchaseOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10).map((po) => (
                      <TableRow key={po.id} className="hover:bg-neutral-50/50">
                        <TableCell className="font-mono font-bold text-sm">{po.number}</TableCell>
                        <TableCell className="text-sm text-neutral-600">{new Date(po.createdAt).toLocaleDateString("es-DO")}</TableCell>
                        {!isWarehouse && <TableCell className="font-bold text-sm">RD$ {po.total.toLocaleString("es-DO")}</TableCell>}
                        <TableCell>
                          <Badge className={cn("text-xs border-none", {
                            "bg-neutral-100 text-neutral-600": po.status === "borrador",
                            "bg-amber-100 text-amber-700": po.status === "pendiente",
                            "bg-blue-100 text-blue-700": po.status === "enviada",
                            "bg-orange-100 text-orange-700": po.status === "recibida_parcial",
                            "bg-emerald-100 text-emerald-700": po.status === "recibida_completa",
                            "bg-rose-100 text-rose-700": po.status === "cancelada",
                          })}>{po.status.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase())}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Rating Tab */}
          {!isWarehouse && (
            <TabsContent value="rating" className="mt-4 space-y-5">
              <div className="space-y-4">
                {([
                  { key: "ratingDelivery" as const, label: "Entrega", desc: "Puntualidad en entregas" },
                  { key: "ratingQuality" as const, label: "Calidad", desc: "Calidad de productos" },
                  { key: "ratingPrice" as const, label: "Precio", desc: "Competitividad de precios" },
                  { key: "ratingService" as const, label: "Servicio", desc: "Atención al cliente" },
                ]).map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-neutral-50 border border-neutral-100">
                    <div>
                      <p className="font-semibold text-sm text-neutral-900">{item.label}</p>
                      <p className="text-xs text-neutral-500">{item.desc}</p>
                    </div>
                    <StarRating value={supplier[item.key]} onChange={(v) => handleRatingChange(item.key, v)} />
                  </div>
                ))}
              </div>
              <div className="p-5 rounded-xl bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 text-center">
                <p className="text-xs font-medium text-amber-600 uppercase tracking-wider mb-1">Score General</p>
                <p className="text-4xl font-black text-amber-700">{avgRating}<span className="text-lg text-amber-500">/5</span></p>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
