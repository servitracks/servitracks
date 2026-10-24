"use client";

import { useState, useMemo } from "react";
import type { Supplier, SupplierProduct, PurchaseOrder, AccountPayable } from "@/store/types";
import { useStore } from "@/store/useStore";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Star,
  MapPin,
  Phone,
  Mail,
  Globe,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Package,
  CreditCard,
  Calendar,
  Building2,
  BadgePercent,
  FileText,
  Award,
  Pencil,
  Copy,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Search,
  MessageSquare,
  Truck,
  CheckCircle2,
  Clock,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Star Rating Component ───────────────────────────────────────────────────
function StarRating({
  value,
  onChange,
  readonly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1 items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={cn(
            "transition-transform",
            readonly ? "cursor-default" : "cursor-pointer hover:scale-115 active:scale-95"
          )}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
        >
          <Star
            className={cn(
              "h-5 w-5 transition-colors",
              (hover || value) >= star
                ? "fill-amber-400 text-amber-400 drop-shadow-xs"
                : "fill-none text-neutral-300"
            )}
          />
        </button>
      ))}
      <span className="text-xs font-mono font-bold text-neutral-700 ml-1.5 tabular-nums">
        {value.toFixed(1)}
      </span>
    </div>
  );
}

interface Props {
  supplier: Supplier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  onEdit?: (supplier: Supplier) => void;
}

export default function SupplierDetailDialog({
  supplier,
  open,
  onOpenChange,
  tenantId,
  onEdit,
}: Props) {
  const products = useStore((s) => s.products).filter((p) => p.tenantId === tenantId);
  const supplierProducts = useStore((s) => s.supplierProducts).filter(
    (sp) => sp.tenantId === tenantId && sp.supplierId === supplier?.id
  );
  const purchaseOrders = useStore((s) => s.purchaseOrders).filter(
    (po) => po.tenantId === tenantId && po.supplierId === supplier?.id
  );
  const accountsPayable = useStore((s) => s.accountsPayable).filter(
    (ap) => ap.tenantId === tenantId && ap.supplierId === supplier?.id
  );
  const { updateSupplier } = useStore();
  const currentUserId = useStore((s) => s.currentUserId);
  const users = useStore((s) => s.users);
  const currentUser =
    currentUserId === "admin" ? { role: "owner" } : users.find((u) => u.id === currentUserId);
  const isWarehouse = currentUser?.role === "warehouse";

  const [activeTab, setActiveTab] = useState<"general" | "commercial" | "catalog" | "history" | "rating">(
    "general"
  );
  const [catalogSearch, setCatalogSearch] = useState("");

  if (!supplier) return null;

  const totalPurchased = purchaseOrders
    .filter((po) => po.status !== "cancelada" && po.status !== "borrador")
    .reduce((sum, po) => sum + po.total, 0);
  const totalOrders = purchaseOrders.filter((po) => po.status !== "cancelada").length;
  const lastOrder =
    purchaseOrders.length > 0
      ? new Date(
          purchaseOrders.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0].createdAt
        )
      : null;
  const pendingBalance = accountsPayable
    .filter((ap) => ap.status !== "pagada")
    .reduce((sum, ap) => sum + (ap.amount - ap.paidAmount), 0);
  const overdueBalance = accountsPayable
    .filter(
      (ap) =>
        ap.status === "vencida" ||
        (ap.status === "pendiente" && new Date(ap.dueDate) < new Date())
    )
    .reduce((sum, ap) => sum + (ap.amount - ap.paidAmount), 0);

  const avgRatingNum = (
    (supplier.ratingDelivery +
      supplier.ratingQuality +
      supplier.ratingPrice +
      supplier.ratingService) /
    4
  );
  const avgRating = avgRatingNum.toFixed(1);

  const handleRatingChange = (
    field: keyof Pick<
      Supplier,
      "ratingDelivery" | "ratingQuality" | "ratingPrice" | "ratingService"
    >,
    value: number
  ) => {
    updateSupplier(supplier.id, { [field]: value });
    toast.success("Calificación actualizada");
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado al portapapeles`);
  };

  const statusConfig: Record<
    string,
    { label: string; badge: string; dot: string }
  > = {
    activo: {
      label: "Activo",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200/90",
      dot: "bg-emerald-500",
    },
    suspendido: {
      label: "Suspendido",
      badge: "bg-amber-50 text-amber-700 border-amber-200/90",
      dot: "bg-amber-500",
    },
    bloqueado: {
      label: "Bloqueado",
      badge: "bg-rose-50 text-rose-700 border-rose-200/90",
      dot: "bg-rose-500",
    },
  };

  const typeLabels: Record<string, string> = {
    repuestos: "Repuestos",
    lubricantes: "Lubricantes",
    neumaticos: "Neumáticos",
    herramientas: "Herramientas",
    servicios_externos: "Servicios Externos",
  };

  const filteredCatalog = supplierProducts.filter((sp) => {
    if (!catalogSearch.trim()) return true;
    const q = catalogSearch.toLowerCase();
    const product = products.find((p) => p.id === sp.productId);
    return (
      (product?.name || "").toLowerCase().includes(q) ||
      (product?.sku || "").toLowerCase().includes(q) ||
      (product?.barcode || "").toLowerCase().includes(q)
    );
  });

  const creditUsagePct = supplier.creditLimit
    ? Math.min(100, Math.round((pendingBalance / supplier.creditLimit) * 100))
    : 0;

  const creditAvailable = supplier.creditLimit
    ? Math.max(0, supplier.creditLimit - pendingBalance)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-3xl border border-neutral-200/90 shadow-2xl bg-white">
        {/* 1. Header Ejecutivo Luminoso */}
        <div className="flex-shrink-0 border-b border-neutral-200/80 bg-white p-5 sm:p-6 pr-12 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              {/* Avatar negro carbón con iniciales mono */}
              <div className="h-13 w-13 rounded-2xl bg-neutral-900 text-white flex items-center justify-center font-mono font-bold text-lg shrink-0 shadow-xs ring-4 ring-neutral-100">
                {supplier.commercialName.substring(0, 2).toUpperCase()}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md">
                    {supplier.code}
                  </span>
                  <div
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold border",
                      statusConfig[supplier.status]?.badge || "bg-neutral-100 text-neutral-700 border-neutral-200"
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        statusConfig[supplier.status]?.dot || "bg-neutral-400"
                      )}
                    />
                    <span>{statusConfig[supplier.status]?.label || supplier.status}</span>
                  </div>
                  <Badge variant="outline" className="border-neutral-200 text-neutral-600 text-xs font-semibold">
                    {typeLabels[supplier.type] || supplier.type}
                  </Badge>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight mt-1 truncate">
                  {supplier.commercialName}
                </h2>
                {supplier.legalName && (
                  <p className="text-xs text-neutral-500 font-medium truncate mt-0.5">
                    {supplier.legalName}
                  </p>
                )}
              </div>
            </div>

            {/* Acciones de Cabecera */}
            {onEdit && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onEdit(supplier)}
                  className="rounded-xl border border-neutral-200 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold text-xs gap-1.5 h-8.5 px-3 cursor-pointer shadow-2xs transition-all active:scale-[0.98]"
                >
                  <Pencil className="h-3.5 w-3.5 text-neutral-600" />
                  <span>Editar Proveedor</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* 2. Ribbon de 4 KPIs Ejecutivos (Tarjetas Blancas con Micro-Bordes) */}
        <div className="flex-shrink-0 px-5 sm:px-6 py-3.5 bg-neutral-50/70 border-b border-neutral-200/80">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* KPI 1: Total Comprado */}
            <div className="rounded-2xl border border-neutral-200/80 bg-white p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Total Comprado
                </span>
                <div className="h-6.5 w-6.5 rounded-lg bg-emerald-50 border border-emerald-200/70 flex items-center justify-center text-emerald-700">
                  <ShoppingCart className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-1.5 flex items-baseline gap-1 font-mono">
                <span className="text-[11px] font-bold text-neutral-400">RD$</span>
                <span className="text-base sm:text-lg font-black text-neutral-900 tabular-nums">
                  {totalPurchased.toLocaleString("es-DO", { maximumFractionDigits: 0 })}
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 font-medium mt-0.5 truncate">
                {totalOrders} {totalOrders === 1 ? "orden generada" : "órdenes generadas"}
              </p>
            </div>

            {/* KPI 2: Balance Pendiente */}
            <div className="rounded-2xl border border-neutral-200/80 bg-white p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Deuda Pendiente
                </span>
                <div
                  className={cn(
                    "h-6.5 w-6.5 rounded-lg border flex items-center justify-center",
                    pendingBalance > 0
                      ? "bg-rose-50 border-rose-200/70 text-rose-700"
                      : "bg-blue-50 border-blue-200/70 text-blue-700"
                  )}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-1.5 flex items-baseline gap-1 font-mono">
                <span className="text-[11px] font-bold text-neutral-400">RD$</span>
                <span className="text-base sm:text-lg font-black text-neutral-900 tabular-nums">
                  {pendingBalance.toLocaleString("es-DO", { maximumFractionDigits: 0 })}
                </span>
              </div>
              <p
                className={cn(
                  "text-[10px] font-medium mt-0.5 truncate",
                  overdueBalance > 0 ? "text-rose-600 font-semibold" : "text-neutral-400"
                )}
              >
                {overdueBalance > 0
                  ? `RD$ ${overdueBalance.toLocaleString("es-DO", { maximumFractionDigits: 0 })} vencido`
                  : "Al día sin mora"}
              </p>
            </div>

            {/* KPI 3: Crédito Disponible / Cupo */}
            <div className="rounded-2xl border border-neutral-200/80 bg-white p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Cupo de Crédito
                </span>
                <div className="h-6.5 w-6.5 rounded-lg bg-amber-50 border border-amber-200/70 flex items-center justify-center text-amber-700">
                  <BadgePercent className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-1.5 flex items-baseline gap-1 font-mono">
                {supplier.creditLimit ? (
                  <>
                    <span className="text-[11px] font-bold text-neutral-400">RD$</span>
                    <span className="text-base sm:text-lg font-black text-neutral-900 tabular-nums">
                      {creditAvailable.toLocaleString("es-DO", { maximumFractionDigits: 0 })}
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-bold text-neutral-600">Al Contado</span>
                )}
              </div>
              <p className="text-[10px] text-neutral-400 font-medium mt-0.5 truncate">
                {supplier.creditLimit
                  ? `Límite RD$ ${supplier.creditLimit.toLocaleString("es-DO", { maximumFractionDigits: 0 })}`
                  : "Sin crédito otorgado"}
              </p>
            </div>

            {/* KPI 4: Evaluación / Score */}
            <div className="rounded-2xl border border-neutral-200/80 bg-white p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Score de Servicio
                </span>
                <div className="h-6.5 w-6.5 rounded-lg bg-amber-50 border border-amber-200/70 flex items-center justify-center text-amber-600">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                </div>
              </div>
              <div className="mt-1.5 flex items-baseline gap-1 font-mono">
                <span className="text-base sm:text-lg font-black text-neutral-900 tabular-nums">
                  {avgRating}
                </span>
                <span className="text-[11px] font-bold text-neutral-400">/ 5.0</span>
              </div>
              <p className="text-[10px] text-neutral-400 font-medium mt-0.5 truncate">
                {avgRatingNum >= 4.5
                  ? "Proveedor excelente"
                  : avgRatingNum >= 3.5
                  ? "Desempeño estándar"
                  : "Requiere seguimiento"}
              </p>
            </div>
          </div>
        </div>

        {/* 3. Barra de Pestañas con Pastillas Negras Ejecutivas */}
        <div className="flex-shrink-0 px-5 sm:px-6 pt-3.5 border-b border-neutral-100 bg-white">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {[
              { id: "general" as const, label: "General & Contacto", icon: Building2 },
              ...(!isWarehouse
                ? [{ id: "commercial" as const, label: "Condiciones Comerciales", icon: BadgePercent }]
                : []),
              {
                id: "catalog" as const,
                label: "Catálogo",
                icon: Package,
                count: supplierProducts.length,
              },
              {
                id: "history" as const,
                label: "Órdenes de Compra",
                icon: FileText,
                count: purchaseOrders.length,
              },
              ...(!isWarehouse
                ? [{ id: "rating" as const, label: "Evaluación & Desempeño", icon: Award }]
                : []),
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer",
                    isActive
                      ? "bg-neutral-900 text-white shadow-xs"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                  )}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={cn(
                        "ml-0.5 px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold",
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-neutral-200/80 text-neutral-700"
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

        {/* 4. Contenido Desplazable de las Pestañas */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* TAB 1: GENERAL */}
          {activeTab === "general" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Columna Izquierda: Información Fiscal y Legal */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-2xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-neutral-400" />
                    <span>Datos de la Empresa</span>
                  </h3>

                  <div className="divide-y divide-neutral-100 text-xs">
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-neutral-500 font-medium">RNC / Cédula</span>
                      {supplier.rnc ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-neutral-900">
                            {supplier.rnc}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(supplier.rnc!, "RNC")}
                            className="p-1 text-neutral-400 hover:text-neutral-800 rounded-md transition-colors"
                            title="Copiar RNC"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-neutral-400 italic">No registrado</span>
                      )}
                    </div>

                    <div className="py-2 flex items-center justify-between">
                      <span className="text-neutral-500 font-medium">Nombre Comercial</span>
                      <span className="font-semibold text-neutral-900">{supplier.commercialName}</span>
                    </div>

                    {supplier.legalName && (
                      <div className="py-2 flex items-center justify-between">
                        <span className="text-neutral-500 font-medium">Razón Social</span>
                        <span className="text-neutral-800 text-right truncate max-w-[200px]">{supplier.legalName}</span>
                      </div>
                    )}

                    <div className="py-2 flex items-center justify-between">
                      <span className="text-neutral-500 font-medium">Categoría</span>
                      <span className="font-medium text-neutral-800">{typeLabels[supplier.type] || supplier.type}</span>
                    </div>

                    <div className="py-2 flex items-center justify-between">
                      <span className="text-neutral-500 font-medium">Moneda Habitual</span>
                      <span className="font-mono font-bold text-neutral-800">{supplier.currency || "DOP"}</span>
                    </div>

                    <div className="py-2 flex items-center justify-between">
                      <span className="text-neutral-500 font-medium">Registrado el</span>
                      <span className="text-neutral-600">
                        {new Date(supplier.createdAt).toLocaleDateString("es-DO", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ubicación Física */}
                <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-2xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                    <span>Ubicación & Logística</span>
                  </h3>

                  {supplier.address || supplier.city ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-neutral-900 leading-snug">
                        {supplier.address || "Dirección no especificada"}
                      </p>
                      <p className="text-xs text-neutral-500 font-medium">
                        {[supplier.city, supplier.province, supplier.country].filter(Boolean).join(", ")}
                      </p>

                      {supplier.googleMapsUrl && (
                        <div className="pt-2">
                          <a
                            href={supplier.googleMapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 hover:underline bg-blue-50/80 border border-blue-200/70 px-2.5 py-1.5 rounded-xl transition-all"
                          >
                            <Globe className="h-3.5 w-3.5 text-blue-600" />
                            <span>Abrir en Google Maps</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-400 italic py-2">
                      No se ha registrado ubicación física para este proveedor.
                    </p>
                  )}
                </div>
              </div>

              {/* Columna Derecha: Directorio de Contactos & Notas */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-2xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-neutral-400" />
                    <span>Directorio de Contactos ({supplier.contacts.length})</span>
                  </h3>

                  {supplier.contacts.length === 0 ? (
                    <p className="text-xs text-neutral-400 italic py-4 text-center">
                      Sin contactos registrados para este proveedor.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {supplier.contacts.map((c, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 rounded-xl bg-neutral-50/80 border border-neutral-200/70 hover:bg-neutral-50 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-9 w-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center text-xs font-bold font-mono shrink-0 shadow-2xs">
                              {c.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-neutral-900 truncate">{c.name}</p>
                              <p className="text-xs text-neutral-500 font-medium truncate">{c.role || "Representante comercial"}</p>
                              {c.phone && (
                                <p className="text-xs font-mono text-neutral-700 font-semibold mt-0.5">
                                  {c.phone}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Botones de acción directa */}
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {c.phone && (
                              <a
                                href={`tel:${c.phone}`}
                                className="h-8 w-8 rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 flex items-center justify-center transition-all shadow-2xs"
                                title="Llamar"
                              >
                                <Phone className="h-3.5 w-3.5 text-neutral-600" />
                              </a>
                            )}
                            {c.whatsapp && (
                              <a
                                href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="h-8 w-8 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center justify-center transition-all shadow-2xs"
                                title="WhatsApp"
                              >
                                <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                              </a>
                            )}
                            {c.email && (
                              <a
                                href={`mailto:${c.email}`}
                                className="h-8 w-8 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center justify-center transition-all shadow-2xs"
                                title="Enviar correo"
                              >
                                <Mail className="h-3.5 w-3.5 text-blue-600" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notas y Condiciones Especiales */}
                <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-2xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-neutral-400" />
                    <span>Notas Internas & Observaciones</span>
                  </h3>
                  {supplier.notes ? (
                    <p className="text-xs text-neutral-700 leading-relaxed bg-neutral-50 p-3 rounded-xl border border-neutral-100 font-medium">
                      {supplier.notes}
                    </p>
                  ) : (
                    <p className="text-xs text-neutral-400 italic py-2">
                      Sin observaciones internas registradas.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COMERCIAL */}
          {!isWarehouse && activeTab === "commercial" && (
            <div className="space-y-5">
              {/* Barra de Progreso de Crédito */}
              {supplier.creditLimit ? (
                <div className="rounded-2xl border border-neutral-200/80 bg-white p-4.5 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                        <span>Límite y Uso de Crédito Comercial</span>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-bold font-mono",
                            creditUsagePct >= 90
                              ? "bg-rose-100 text-rose-700"
                              : creditUsagePct >= 70
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          )}
                        >
                          {creditUsagePct}% utilizado
                        </span>
                      </h3>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {supplier.creditDays ? `${supplier.creditDays} días de crédito otorgados` : "Plazo no establecido"}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-semibold text-neutral-500">Crédito Disponible: </span>
                      <span className="font-mono font-black text-sm text-neutral-900">
                        RD$ {creditAvailable.toLocaleString("es-DO", { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>

                  {/* Barra Visual */}
                  <div className="h-3 w-full bg-neutral-100 rounded-full overflow-hidden p-0.5">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        creditUsagePct >= 90
                          ? "bg-rose-500"
                          : creditUsagePct >= 70
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      )}
                      style={{ width: `${Math.min(100, Math.max(2, creditUsagePct))}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-neutral-400 font-mono mt-2">
                    <span>Usado: RD$ {pendingBalance.toLocaleString("es-DO", { maximumFractionDigits: 0 })}</span>
                    <span>Límite Total: RD$ {supplier.creditLimit.toLocaleString("es-DO", { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/50 p-4 text-center">
                  <ShieldCheck className="h-6 w-6 text-neutral-400 mx-auto mb-1" />
                  <p className="text-xs font-bold text-neutral-700">Término de Pago: Al Contado</p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Este proveedor no tiene cupo de crédito configurado. Todas las compras son pagaderas contra entrega o de inmediato.
                  </p>
                </div>
              )}

              {/* Tarjetas de Términos Comerciales */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Días de Crédito</p>
                  <p className="text-xl font-mono font-black text-neutral-900 mt-1">
                    {supplier.creditDays ? `${supplier.creditDays} d` : "Contado"}
                  </p>
                  <p className="text-[10px] text-neutral-400 font-medium mt-0.5">Plazo de factura</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Descuento General</p>
                  <p className="text-xl font-mono font-black text-emerald-700 mt-1">
                    {supplier.generalDiscount ? `${supplier.generalDiscount}%` : "0%"}
                  </p>
                  <p className="text-[10px] text-neutral-400 font-medium mt-0.5">En toda la orden</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Desc. por Volumen</p>
                  <p className="text-xl font-mono font-black text-blue-700 mt-1">
                    {supplier.volumeDiscount ? `${supplier.volumeDiscount}%` : "0%"}
                  </p>
                  <p className="text-[10px] text-neutral-400 font-medium mt-0.5">Compras al por mayor</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Moneda Facturación</p>
                  <p className="text-xl font-mono font-black text-neutral-900 mt-1">
                    {supplier.currency || "DOP"}
                  </p>
                  <p className="text-[10px] text-neutral-400 font-medium mt-0.5">Pesos Dominicanos</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CATÁLOGO */}
          {activeTab === "catalog" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                  <Input
                    placeholder="Buscar producto en catálogo..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    className="pl-8.5 h-8.5 rounded-xl text-xs bg-neutral-50 border-neutral-200 focus:bg-white"
                  />
                </div>
                <div className="text-xs font-medium text-neutral-500">
                  Mostrando <span className="font-mono font-bold text-neutral-900">{filteredCatalog.length}</span> de {supplierProducts.length} productos
                </div>
              </div>

              {filteredCatalog.length === 0 ? (
                <div className="text-center py-12 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50">
                  <Package className="h-9 w-9 text-neutral-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-neutral-700">Sin productos vinculados</p>
                  <p className="text-xs text-neutral-400 mt-1">
                    {catalogSearch
                      ? "No hay productos que coincidan con la búsqueda."
                      : "Este proveedor aún no tiene repuestos o artículos asociados en el catálogo."}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-neutral-200/80 bg-white overflow-hidden shadow-2xs">
                  <Table>
                    <TableHeader className="bg-neutral-50/80">
                      <TableRow className="border-neutral-200/80">
                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 pl-4">Producto</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Precio Actual</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Último Precio</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Variación</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 pr-4">Actualizado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCatalog.map((sp) => {
                        const product = products.find((p) => p.id === sp.productId);
                        const variation = sp.lastPrice
                          ? ((sp.currentPrice - sp.lastPrice) / sp.lastPrice) * 100
                          : 0;
                        return (
                          <TableRow key={sp.id} className="hover:bg-neutral-50/60 border-neutral-100">
                            <TableCell className="pl-4 py-3">
                              <div className="font-semibold text-xs text-neutral-900">
                                {product?.name || "Artículo vinculado"}
                              </div>
                              {product?.sku && (
                                <span className="font-mono text-[10px] text-neutral-400">
                                  SKU: {product.sku}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="py-3 font-mono font-bold text-xs text-neutral-900">
                              RD$ {sp.currentPrice.toLocaleString("es-DO", { maximumFractionDigits: 0 })}
                            </TableCell>
                            <TableCell className="py-3 font-mono text-xs text-neutral-500">
                              {sp.lastPrice
                                ? `RD$ ${sp.lastPrice.toLocaleString("es-DO", { maximumFractionDigits: 0 })}`
                                : "—"}
                            </TableCell>
                            <TableCell className="py-3">
                              {variation !== 0 ? (
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-md",
                                    variation > 0
                                      ? "bg-rose-50 text-rose-700 border border-rose-200/80"
                                      : "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                                  )}
                                >
                                  {variation > 0 ? (
                                    <TrendingUp className="h-3 w-3" />
                                  ) : (
                                    <TrendingDown className="h-3 w-3" />
                                  )}
                                  {Math.abs(variation).toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-xs text-neutral-400 font-mono">—</span>
                              )}
                            </TableCell>
                            <TableCell className="pr-4 py-3 text-xs text-neutral-500">
                              {sp.lastUpdated
                                ? new Date(sp.lastUpdated).toLocaleDateString("es-DO", {
                                    day: "2-digit",
                                    month: "short",
                                  })
                                : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: HISTORIAL DE ÓRDENES */}
          {activeTab === "history" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Órdenes de Compra Realizadas ({purchaseOrders.length})
                </h3>
                {lastOrder && (
                  <span className="text-xs text-neutral-500 font-medium">
                    Última orden:{" "}
                    <strong className="text-neutral-800">
                      {lastOrder.toLocaleDateString("es-DO", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </strong>
                  </span>
                )}
              </div>

              {purchaseOrders.length === 0 ? (
                <div className="text-center py-12 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50">
                  <FileText className="h-9 w-9 text-neutral-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-neutral-700">Sin órdenes de compra</p>
                  <p className="text-xs text-neutral-400 mt-1">
                    No se han registrado órdenes de compra con este proveedor todavía.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-neutral-200/80 bg-white overflow-hidden shadow-2xs">
                  <Table>
                    <TableHeader className="bg-neutral-50/80">
                      <TableRow className="border-neutral-200/80">
                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 pl-4">Nº Orden</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Fecha</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Ítems</TableHead>
                        {!isWarehouse && (
                          <TableHead className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Monto Total</TableHead>
                        )}
                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 pr-4">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...purchaseOrders]
                        .sort(
                          (a, b) =>
                            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                        )
                        .slice(0, 15)
                        .map((po) => {
                          const statusBadges: Record<
                            string,
                            { label: string; badge: string; dot: string }
                          > = {
                            borrador: {
                              label: "Borrador",
                              badge: "bg-neutral-100 text-neutral-700 border-neutral-200",
                              dot: "bg-neutral-400",
                            },
                            pendiente: {
                              label: "Pendiente",
                              badge: "bg-amber-50 text-amber-700 border-amber-200/80",
                              dot: "bg-amber-500",
                            },
                            enviada: {
                              label: "Enviada",
                              badge: "bg-blue-50 text-blue-700 border-blue-200/80",
                              dot: "bg-blue-500",
                            },
                            recibida_parcial: {
                              label: "Parcial",
                              badge: "bg-orange-50 text-orange-700 border-orange-200/80",
                              dot: "bg-orange-500",
                            },
                            recibida_completa: {
                              label: "Recibida",
                              badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
                              dot: "bg-emerald-500",
                            },
                            cancelada: {
                              label: "Cancelada",
                              badge: "bg-rose-50 text-rose-700 border-rose-200/80",
                              dot: "bg-rose-500",
                            },
                          };
                          const conf = statusBadges[po.status] || {
                            label: po.status,
                            badge: "bg-neutral-100 text-neutral-700 border-neutral-200",
                            dot: "bg-neutral-400",
                          };

                          return (
                            <TableRow key={po.id} className="hover:bg-neutral-50/60 border-neutral-100">
                              <TableCell className="pl-4 py-3 font-mono font-bold text-xs text-neutral-900">
                                {po.number}
                              </TableCell>
                              <TableCell className="py-3 text-xs text-neutral-600">
                                {new Date(po.createdAt).toLocaleDateString("es-DO", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </TableCell>
                              <TableCell className="py-3 text-xs text-neutral-500 font-mono">
                                {po.items?.length || 0} art.
                              </TableCell>
                              {!isWarehouse && (
                                <TableCell className="py-3 font-mono font-bold text-xs text-neutral-900">
                                  RD$ {po.total.toLocaleString("es-DO", { maximumFractionDigits: 0 })}
                                </TableCell>
                              )}
                              <TableCell className="pr-4 py-3">
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border",
                                    conf.badge
                                  )}
                                >
                                  <span className={cn("h-1.5 w-1.5 rounded-full", conf.dot)} />
                                  <span>{conf.label}</span>
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: EVALUACIÓN & DESEMPEÑO */}
          {!isWarehouse && activeTab === "rating" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    key: "ratingDelivery" as const,
                    label: "Puntualidad en Entregas",
                    desc: "Cumplimiento de plazos acordados y despacho puntual.",
                  },
                  {
                    key: "ratingQuality" as const,
                    label: "Calidad de Productos",
                    desc: "Artículos en estado óptimo, empaque y especificaciones correctas.",
                  },
                  {
                    key: "ratingPrice" as const,
                    label: "Competitividad de Precios",
                    desc: "Costos competitivos vs promedio de mercado y margen ofrecido.",
                  },
                  {
                    key: "ratingService" as const,
                    label: "Atención & Servicio al Cliente",
                    desc: "Disponibilidad del agente comercial, solución de reclamos y garantías.",
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      <p className="font-bold text-sm text-neutral-900">{item.label}</p>
                      <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                        Calificación:
                      </span>
                      <StarRating
                        value={supplier[item.key]}
                        onChange={(v) => handleRatingChange(item.key, v)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Tarjeta de Score Consolidado */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50/80 via-amber-50/50 to-orange-50/40 border border-amber-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-2xl bg-amber-400 text-neutral-900 flex items-center justify-center font-black text-xl shadow-xs">
                    <Star className="h-6 w-6 fill-neutral-900 text-neutral-900" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-neutral-900">
                      Score Global de Proveedor
                    </h4>
                    <p className="text-xs text-amber-900/80 mt-0.5">
                      Promedio ponderado de los 4 criterios de evaluación continua de ServiTracks.
                    </p>
                  </div>
                </div>

                <div className="flex items-baseline gap-1 font-mono text-center sm:text-right">
                  <span className="text-4xl font-black text-neutral-900 tabular-nums">
                    {avgRating}
                  </span>
                  <span className="text-sm font-bold text-amber-600">/ 5.0</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5. Footer Ejecutivo */}
        <div className="flex-shrink-0 border-t border-neutral-200/80 bg-neutral-50/80 px-5 sm:px-6 py-3 flex items-center justify-between">
          <div className="text-[11px] text-neutral-400 font-mono">
            Código: <span className="font-bold text-neutral-700">{supplier.code}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700 text-xs font-semibold h-8.5 px-4 cursor-pointer shadow-2xs"
            >
              Cerrar
            </Button>
            {onEdit && (
              <Button
                type="button"
                size="sm"
                onClick={() => onEdit(supplier)}
                className="rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-semibold h-8.5 px-4 gap-1.5 cursor-pointer shadow-xs"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Editar Proveedor</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
