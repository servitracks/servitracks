"use client";

import { useState, useMemo, useRef } from "react";
import { useStore, Invoice, WorkOrder } from "@/store/useStore";
import { useParams, useRouter } from "@/lib/next-compat";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Search,
  Filter,
  Calendar,
  ShieldCheck,
  Receipt,
  FileText,
  Printer,
  Download,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Wrench,
  Car,
  User,
  DollarSign,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  RotateCcw,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageSquare,
  Sparkles,
  QrCode,
  FileCode2,
  X,
  ArrowLeft,
  Wallet,
  UserCog,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Ticket, translatePaymentMethod } from "@/components/pos/Ticket";
import { printThermalDocument } from "@/lib/thermalPrint";
import {
  submitInvoiceToEf2,
  buildEf2InvoicePayload,
  parseEf2SignatureDate,
  EF2_DEFAULT_TEST_TOKEN,
} from "@/lib/ecf";
import {
  OrdenesDailyMetricsCards,
  UnifiedWorkshopOrder,
  PeriodoCreacion,
} from "./OrdenesDailyMetricsCards";

const PAGE_SIZE = 15;

function parseInvoiceNotesMeta(rawNotes?: string): {
  meta: Record<string, any> | null;
  cleanText: string;
} {
  if (!rawNotes) return { meta: null, cleanText: "" };
  const trimmed = rawNotes.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") {
        return {
          meta: parsed,
          cleanText: typeof parsed.notas === "string" ? parsed.notas : "",
        };
      }
    } catch {
      // plain text fallback
    }
  }
  return { meta: null, cleanText: rawNotes };
}

function getEcfTypeLabel(ncf?: string): string | undefined {
  if (!ncf) return undefined;
  const upper = ncf.toUpperCase().trim();
  if (upper.startsWith("E31") || upper.startsWith("B01")) return "E31 • Crédito Fiscal";
  if (upper.startsWith("E32") || upper.startsWith("B02")) return "E32 • Consumo";
  if (upper.startsWith("E33") || upper.startsWith("B03")) return "E33 • Nota de Débito";
  if (upper.startsWith("E34") || upper.startsWith("B04")) return "E34 • Nota de Crédito";
  if (upper.startsWith("E44") || upper.startsWith("B14")) return "E44 • Reg. Especial";
  if (upper.startsWith("E45") || upper.startsWith("B15")) return "E45 • Gubernamental";
  if (upper.startsWith("E")) return `${upper.slice(0, 3)} • e-CF`;
  return "Comprobante";
}

function getWorkshopStatusConfig(status: UnifiedWorkshopOrder["workshopStatus"]) {
  switch (status) {
    case "pending":
      return {
        label: "Pendiente",
        bg: "bg-amber-50 text-amber-800 border-amber-200",
        dot: "bg-amber-500",
      };
    case "diagnosing":
      return {
        label: "En Diagnóstico",
        bg: "bg-sky-50 text-sky-800 border-sky-200",
        dot: "bg-sky-500",
      };
    case "repairing":
      return {
        label: "En Reparación",
        bg: "bg-blue-50 text-blue-800 border-blue-200",
        dot: "bg-blue-600",
      };
    case "waiting_parts":
      return {
        label: "Esperando Piezas",
        bg: "bg-purple-50 text-purple-800 border-purple-200",
        dot: "bg-purple-500",
      };
    case "finished":
      return {
        label: "Listo / Finalizado",
        bg: "bg-teal-50 text-teal-800 border-teal-200",
        dot: "bg-teal-500",
      };
    case "delivered":
    case "invoiced":
      return {
        label: status === "delivered" ? "Entregado" : "Facturado",
        bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
        dot: "bg-emerald-500",
      };
    case "cancelled":
      return {
        label: "Anulada",
        bg: "bg-rose-50 text-rose-700 border-rose-200",
        dot: "bg-rose-500",
      };
    default:
      return {
        label: "En Taller",
        bg: "bg-neutral-100 text-neutral-700 border-neutral-200",
        dot: "bg-neutral-500",
      };
  }
}

export default function OrdenesControlPage() {
  const { tenant } = useParams();
  const router = useRouter();
  const {
    tenants,
    orders,
    invoices,
    customers,
    vehicles,
    technicians,
    services,
    products,
    cajas,
    printSettings,
    updateOrder,
    addInvoice,
    updateInvoice,
    addCajaMovement,
  } = useStore();

  const currentTenant = tenants.find((t) => t.slug === tenant) || tenants[0] || null;
  const tenantId = currentTenant?.id || "";

  // Estados de vista y filtros
  const [showPendientes, setShowPendientes] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendientesSearch, setPendientesSearch] = useState("");
  const [pendientesStatusFilter, setPendientesStatusFilter] = useState<string>("todos");

  const [periodoCreacion, setPeriodoCreacion] = useState<PeriodoCreacion>("todas");
  const [customFechaDesde, setCustomFechaDesde] = useState<string>("");
  const [customFechaHasta, setCustomFechaHasta] = useState<string>("");
  const [isCustomDateModalOpen, setIsCustomDateModalOpen] = useState(false);

  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [filtroFiscal, setFiltroFiscal] = useState<string>("todos");
  const [filtroCobro, setFiltroCobro] = useState<string>("todos");
  const [filtroMetodo, setFiltroMetodo] = useState<string>("todos");
  const [filtroTecnico, setFiltroTecnico] = useState<string>("todos");
  const [currentPage, setCurrentPage] = useState(1);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Estados de Modales
  const [detailOrder, setDetailOrder] = useState<UnifiedWorkshopOrder | null>(null);
  const [detailPaperFormat, setDetailPaperFormat] = useState<"80mm" | "A4">(() =>
    printSettings?.paperSize === "A4" ? "A4" : "80mm"
  );
  const detailPrintRef = useRef<HTMLDivElement>(null);

  const [statusModalOrder, setStatusModalOrder] = useState<UnifiedWorkshopOrder | null>(null);
  const [cobrarModalOrder, setCobrarModalOrder] = useState<UnifiedWorkshopOrder | null>(null);
  const [cobrarMetodo, setCobrarMetodo] = useState<"EFECTIVO" | "TARJETA" | "TRANSFERENCIA">("EFECTIVO");
  const [cobrarMonto, setCobrarMonto] = useState<string>("");
  const [cobrarEfectivoRecibido, setCobrarEfectivoRecibido] = useState<string>("");
  const [cobrarReferencia, setCobrarReferencia] = useState<string>("");

  const [timbrarModalOrder, setTimbrarModalOrder] = useState<UnifiedWorkshopOrder | null>(null);
  const [timbrarTipoEcf, setTimbrarTipoEcf] = useState<"32" | "31" | "44" | "45">("32");
  const [timbrarBuyerRnc, setTimbrarBuyerRnc] = useState<string>("");
  const [timbrarBuyerName, setTimbrarBuyerName] = useState<string>("");
  const [isSubmittingEcf, setIsSubmittingEcf] = useState(false);

  const [notaCreditoOrder, setNotaCreditoOrder] = useState<UnifiedWorkshopOrder | null>(null);
  const [notaCreditoMotivo, setNotaCreditoMotivo] = useState<string>("Anulación de factura / devolución de servicio");
  const [notaCreditoCode, setNotaCreditoCode] = useState<number>(1);
  const [isSubmittingNotaCredito, setIsSubmittingNotaCredito] = useState(false);

  // Datos filtrados por tenant
  const tenantOrders = useMemo(
    () => orders.filter((o) => !tenantId || o.tenantId === tenantId),
    [orders, tenantId]
  );
  const tenantInvoices = useMemo(
    () => invoices.filter((i) => !tenantId || i.tenantId === tenantId),
    [invoices, tenantId]
  );
  const tenantCustomers = useMemo(
    () => customers.filter((c) => !tenantId || c.tenantId === tenantId),
    [customers, tenantId]
  );
  const tenantVehicles = useMemo(
    () => vehicles.filter((v) => !tenantId || v.tenantId === tenantId),
    [vehicles, tenantId]
  );
  const tenantTechnicians = useMemo(
    () => technicians.filter((t) => !tenantId || t.tenantId === tenantId),
    [technicians, tenantId]
  );

  const activeCaja = useMemo(
    () => cajas.find((c) => (!tenantId || c.tenant_id === tenantId) && c.estado === "ABIERTA"),
    [cajas, tenantId]
  );

  // Construir listado unificado de Órdenes de Servicio + Facturas POS
  const unifiedOrders = useMemo<UnifiedWorkshopOrder[]>(() => {
    const result: UnifiedWorkshopOrder[] = [];
    const linkedWorkOrderIds = new Set<string>();

    // 1. Procesar todas las facturas (vinculando su WorkOrder si tiene orderId)
    for (const inv of tenantInvoices) {
      const linkedWo = inv.orderId
        ? tenantOrders.find((o) => o.id === inv.orderId)
        : undefined;
      if (linkedWo) {
        linkedWorkOrderIds.add(linkedWo.id);
      }

      const customer =
        tenantCustomers.find((c) => c.id === (inv.customerId || linkedWo?.customerId)) || null;
      const vehicleId = (inv as any).vehicleId || linkedWo?.vehicleId;
      const vehicle = vehicleId ? tenantVehicles.find((v) => v.id === vehicleId) : null;
      const mechanicId = inv.mechanicId || linkedWo?.mechanicId;
      const mechanic = mechanicId ? tenantTechnicians.find((t) => t.id === mechanicId) : null;

      const { meta, cleanText } = parseInvoiceNotesMeta(inv.notes);
      const ef2Meta = meta?.ef2 || {};

      const ncf = inv.ncf || ef2Meta?.ncf || undefined;
      const qrUrl = inv.qrUrl || ef2Meta?.qr_link || ef2Meta?.consulta_url || undefined;
      const securityCode = inv.securityCode || ef2Meta?.codigo_seguridad || undefined;
      const signatureDate = inv.signatureDate || ef2Meta?.fecha_firma || undefined;
      const isEcf = Boolean(
        (ncf && ncf.toUpperCase().startsWith("E")) || qrUrl || securityCode || ef2Meta?.id_factura
      );

      const total = Number(inv.total || 0);
      const isCancelled = inv.status === "cancelled";
      const rawPaid =
        inv.paidAmount !== undefined
          ? Number(inv.paidAmount)
          : meta?.paidAmount !== undefined
          ? Number(meta.paidAmount)
          : inv.status === "paid"
          ? total
          : 0;
      const rawPending =
        inv.pendingAmount !== undefined
          ? Number(inv.pendingAmount)
          : meta?.pendingAmount !== undefined
          ? Number(meta.pendingAmount)
          : inv.status === "pending"
          ? Math.max(0, total - rawPaid)
          : 0;

      const paymentStatus: UnifiedWorkshopOrder["paymentStatus"] = isCancelled
        ? "cancelled"
        : rawPending > 0.01 || inv.status === "pending"
        ? "pending"
        : "paid";

      const workshopStatus: UnifiedWorkshopOrder["workshopStatus"] = isCancelled
        ? "cancelled"
        : linkedWo
        ? (linkedWo.status as UnifiedWorkshopOrder["workshopStatus"])
        : "delivered";

      const items = (inv.items || []).map((it, idx) => ({
        id: it.id || `item-${idx}`,
        name: it.name || "Servicio / Repuesto",
        quantity: Number(it.quantity || 1),
        unitPrice: Number(it.unitPrice || 0),
        tax: Number(it.tax || 0),
      }));

      const numero = `#${inv.id.slice(-6).toUpperCase()}`;

      result.push({
        id: inv.id,
        numero,
        source: "invoice",
        invoiceId: inv.id,
        workOrderId: linkedWo?.id,
        createdAt: inv.createdAt || linkedWo?.createdAt || new Date().toISOString(),
        deliveredAt: linkedWo?.updatedAt || inv.createdAt,
        customerId: inv.customerId || linkedWo?.customerId,
        customerName:
          customer?.name ||
          inv.customerName ||
          linkedWo?.customerBusinessName ||
          "Cliente de Contado",
        customerPhone: customer?.phone,
        customerRnc: customer?.rnc || inv.customerRnc || linkedWo?.customerRnc,
        vehicleId: vehicle?.id,
        vehicleLabel: vehicle
          ? `${vehicle.brand} ${vehicle.model} ${vehicle.year || ""}`.trim()
          : undefined,
        vehiclePlate: vehicle?.plate,
        mechanicId: mechanic?.id || mechanicId,
        mechanicName: mechanic?.name,
        workshopStatus,
        paymentStatus,
        paymentMethod: meta?.instrumentoPago || inv.paymentMethod || "cash",
        condicionCobro: inv.condicionCobro || meta?.condicionCobro || "CONTADO",
        referencia: meta?.referencia || undefined,
        subtotal: Number(inv.subtotal || 0),
        tax: Number(inv.tax || 0),
        discount: Number(inv.discount || 0),
        total,
        paidAmount: isCancelled ? 0 : rawPaid,
        pendingAmount: isCancelled ? 0 : rawPending,
        itemsCount: items.reduce((acc, i) => acc + (i.quantity || 1), 0) || 1,
        items,
        ncf,
        qrUrl,
        securityCode,
        signatureDate,
        isEcf,
        ecfStatus: isCancelled
          ? "cancelled"
          : isEcf
          ? "accepted"
          : ncf
          ? "traditional"
          : "none",
        ecfTypeLabel: getEcfTypeLabel(ncf),
        pdfCloudUrl: ef2Meta?.pdf_cloud_url,
        xmlCloudUrl: ef2Meta?.xml_cloud_url,
        trackId: ef2Meta?.track_id,
        creditNoteNcf: meta?.creditNote?.ncf,
        creditNoteAmount: meta?.creditNote?.amount,
        debitNoteNcf: meta?.debitNote?.ncf,
        debitNoteAmount: meta?.debitNote?.amount,
        notesText: cleanText || linkedWo?.description || linkedWo?.notes || "",
        rawNotes: inv.notes,
      });
    }

    // 2. Procesar las Órdenes de Servicio (WorkOrders) que aún no tienen factura emitida
    for (const wo of tenantOrders) {
      if (linkedWorkOrderIds.has(wo.id)) continue;

      const customer = tenantCustomers.find((c) => c.id === wo.customerId) || null;
      const vehicle = tenantVehicles.find((v) => v.id === wo.vehicleId) || null;
      const mechanic = wo.mechanicId
        ? tenantTechnicians.find((t) => t.id === wo.mechanicId)
        : null;

      // Construir ítems de la orden de servicio
      const builtItems: UnifiedWorkshopOrder["items"] = [];
      if (wo.items && wo.items.length > 0) {
        wo.items.forEach((it, idx) => {
          builtItems.push({
            id: it.productId || it.serviceId || `wo-item-${idx}`,
            name: it.name,
            quantity: Number(it.quantity || 1),
            unitPrice: Number(it.unitPrice || 0),
            tax: wo.applyItbis === false ? 0 : Number(it.taxPercentage || 0),
            isService: Boolean(it.serviceId),
          });
        });
      } else {
        (wo.serviceIds || []).forEach((sid) => {
          const srv = services.find((s) => s.id === sid);
          if (srv) {
            builtItems.push({
              id: srv.id,
              name: srv.name,
              quantity: 1,
              unitPrice: Number(srv.price || 0),
              tax: 0,
              isService: true,
            });
          }
        });
        (wo.parts || []).forEach((pt, idx) => {
          const prod = products.find((p) => p.id === pt.productId);
          builtItems.push({
            id: pt.productId || `part-${idx}`,
            name: prod?.name || "Repuesto",
            quantity: Number(pt.quantity || 1),
            unitPrice: Number((pt as any).price || prod?.salePrice || 0),
            tax: wo.applyItbis === false ? 0 : 18,
          });
        });
      }

      const calcSubtotal = builtItems.reduce(
        (acc, it) => acc + it.unitPrice * it.quantity,
        0
      );
      const calcTax =
        wo.applyItbis === false
          ? 0
          : builtItems.reduce(
              (acc, it) =>
                acc +
                (it.tax > 0 ? Math.round(it.unitPrice * it.quantity * (it.tax / 100) * 100) / 100 : 0),
              0
            );
      const total = Number(wo.total || calcSubtotal + calcTax || 0);
      const isCancelled = (wo.status as string) === "cancelled";

      result.push({
        id: wo.id,
        numero: `#OS-${wo.id.slice(-5).toUpperCase()}`,
        source: "work_order",
        workOrderId: wo.id,
        createdAt: wo.createdAt || new Date().toISOString(),
        deliveredAt: wo.updatedAt,
        customerId: wo.customerId,
        customerName:
          customer?.name || wo.customerBusinessName || "Cliente de Taller",
        customerPhone: customer?.phone,
        customerRnc: customer?.rnc || wo.customerRnc,
        vehicleId: vehicle?.id || wo.vehicleId,
        vehicleLabel: vehicle
          ? `${vehicle.brand} ${vehicle.model} ${vehicle.year || ""}`.trim()
          : undefined,
        vehiclePlate: vehicle?.plate,
        mechanicId: mechanic?.id || wo.mechanicId,
        mechanicName: mechanic?.name,
        workshopStatus: (wo.status as UnifiedWorkshopOrder["workshopStatus"]) || "pending",
        paymentStatus: isCancelled ? "cancelled" : "pending",
        paymentMethod: "pending",
        condicionCobro: "PENDIENTE FACTURAR",
        subtotal: calcSubtotal || total,
        tax: calcTax,
        discount: 0,
        total,
        paidAmount: 0,
        pendingAmount: isCancelled ? 0 : total,
        itemsCount: builtItems.reduce((acc, i) => acc + i.quantity, 0) || 1,
        items: builtItems,
        ncf: undefined,
        isEcf: false,
        ecfStatus: "none",
        ecfTypeLabel: getEcfTypeLabel(wo.ncfType),
        notesText: wo.description || wo.notes || "",
      });
    }

    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [
    tenantInvoices,
    tenantOrders,
    tenantCustomers,
    tenantVehicles,
    tenantTechnicians,
    services,
    products,
  ]);

  // Órdenes con saldo pendiente de cobro
  const ordenesPendientesCobro = useMemo(
    () =>
      unifiedOrders.filter(
        (o) =>
          o.workshopStatus !== "cancelled" &&
          o.paymentStatus === "pending" &&
          o.pendingAmount > 0
      ),
    [unifiedOrders]
  );

  // Filtrado por período de fechas
  const matchesPeriodo = (dateStr: string): boolean => {
    if (periodoCreacion === "todas") return true;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (periodoCreacion === "hoy") {
      return d >= todayStart && d <= todayEnd;
    }
    if (periodoCreacion === "ayer") {
      const yStart = new Date(todayStart);
      yStart.setDate(yStart.getDate() - 1);
      const yEnd = new Date(todayEnd);
      yEnd.setDate(yEnd.getDate() - 1);
      return d >= yStart && d <= yEnd;
    }
    if (periodoCreacion === "esta_semana") {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const wStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
      const wEnd = new Date(wStart.getFullYear(), wStart.getMonth(), wStart.getDate() + 6, 23, 59, 59, 999);
      return d >= wStart && d <= wEnd;
    }
    if (periodoCreacion === "semana_pasada") {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const lwStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday - 7, 0, 0, 0, 0);
      const lwEnd = new Date(lwStart.getFullYear(), lwStart.getMonth(), lwStart.getDate() + 6, 23, 59, 59, 999);
      return d >= lwStart && d <= lwEnd;
    }
    if (periodoCreacion === "este_mes") {
      const mStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return d >= mStart && d <= mEnd;
    }
    if (periodoCreacion === "mes_pasado") {
      const lmStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return d >= lmStart && d <= lmEnd;
    }
    if (periodoCreacion === "personalizado") {
      if (!customFechaDesde && !customFechaHasta) return true;
      const fromStr = customFechaDesde || customFechaHasta;
      const toStr = customFechaHasta || customFechaDesde;
      const [fy, fm, fd] = fromStr.split("-").map(Number);
      const [ty, tm, td] = toStr.split("-").map(Number);
      const pStart = new Date(fy, (fm || 1) - 1, fd || 1, 0, 0, 0, 0);
      const pEnd = new Date(ty, (tm || 1) - 1, td || 1, 23, 59, 59, 999);
      return d >= pStart && d <= pEnd;
    }
    return true;
  };

  // Lista filtrada principal
  const filteredOrders = useMemo(() => {
    return unifiedOrders.filter((o) => {
      // 1. Período
      if (!matchesPeriodo(o.createdAt)) return false;

      // 2. Estado pill
      if (filtroEstado === "en_taller") {
        if (!["pending", "diagnosing", "repairing", "waiting_parts"].includes(o.workshopStatus)) {
          return false;
        }
      } else if (filtroEstado === "finalizadas") {
        if (o.workshopStatus !== "finished") return false;
      } else if (filtroEstado === "entregadas") {
        if (!["delivered", "invoiced"].includes(o.workshopStatus)) return false;
      } else if (filtroEstado === "timbradas_ecf") {
        if (!o.isEcf) return false;
      } else if (filtroEstado === "pendientes_cobro") {
        if (o.paymentStatus !== "pending" || o.pendingAmount <= 0) return false;
      } else if (filtroEstado === "anuladas") {
        if (o.workshopStatus !== "cancelled" && o.paymentStatus !== "cancelled") return false;
      }

      // 3. Filtro Fiscal DGII
      if (filtroFiscal === "ecf_aceptados" && !o.isEcf) return false;
      if (filtroFiscal === "e31" && !o.ncf?.toUpperCase().startsWith("E31")) return false;
      if (filtroFiscal === "e32" && !o.ncf?.toUpperCase().startsWith("E32")) return false;
      if (
        filtroFiscal === "e44_45" &&
        !o.ncf?.toUpperCase().startsWith("E44") &&
        !o.ncf?.toUpperCase().startsWith("E45")
      ) {
        return false;
      }
      if (filtroFiscal === "con_nota_credito" && !o.creditNoteNcf) return false;
      if (filtroFiscal === "sin_timbrar" && o.isEcf) return false;

      // 4. Filtro Cobro
      if (filtroCobro === "pagadas" && o.paymentStatus !== "paid") return false;
      if (filtroCobro === "pendientes" && o.paymentStatus !== "pending") return false;
      if (filtroCobro === "anuladas" && o.paymentStatus !== "cancelled") return false;

      // 5. Filtro Método de Pago
      if (filtroMetodo !== "todos") {
        const m = (o.paymentMethod || "").toLowerCase();
        if (filtroMetodo === "efectivo" && m !== "cash" && m !== "efectivo") return false;
        if (filtroMetodo === "tarjeta" && m !== "card" && m !== "tarjeta") return false;
        if (filtroMetodo === "transferencia" && m !== "transfer" && m !== "transferencia") return false;
        if (filtroMetodo === "mixto" && m !== "mixto") return false;
      }

      // 6. Filtro Técnico
      if (filtroTecnico !== "todos" && o.mechanicId !== filtroTecnico) return false;

      // 7. Búsqueda de texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const haystack = [
          o.numero,
          o.id,
          o.ncf,
          o.customerName,
          o.customerRnc,
          o.customerPhone,
          o.vehicleLabel,
          o.vehiclePlate,
          o.mechanicName,
          o.referencia,
          String(o.total),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [
    unifiedOrders,
    periodoCreacion,
    customFechaDesde,
    customFechaHasta,
    filtroEstado,
    filtroFiscal,
    filtroCobro,
    filtroMetodo,
    filtroTecnico,
    searchQuery,
  ]);

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, currentPage]);

  // Contadores para los pills de estado
  const statusCounts = useMemo(() => {
    const base = unifiedOrders.filter((o) => matchesPeriodo(o.createdAt));
    return {
      todos: base.length,
      en_taller: base.filter((o) =>
        ["pending", "diagnosing", "repairing", "waiting_parts"].includes(o.workshopStatus)
      ).length,
      finalizadas: base.filter((o) => o.workshopStatus === "finished").length,
      entregadas: base.filter((o) => ["delivered", "invoiced"].includes(o.workshopStatus)).length,
      timbradas_ecf: base.filter((o) => o.isEcf).length,
      pendientes_cobro: base.filter(
        (o) => o.paymentStatus === "pending" && o.pendingAmount > 0
      ).length,
      anuladas: base.filter(
        (o) => o.workshopStatus === "cancelled" || o.paymentStatus === "cancelled"
      ).length,
    };
  }, [unifiedOrders, periodoCreacion, customFechaDesde, customFechaHasta]);

  // Resumen financiero de la vista actual
  const financialSummary = useMemo(() => {
    const active = filteredOrders.filter(
      (o) => o.workshopStatus !== "cancelled" && o.paymentStatus !== "cancelled"
    );
    const totalFacturado = active.reduce((acc, o) => acc + o.total, 0);
    const totalCobrado = active.reduce((acc, o) => acc + o.paidAmount, 0);
    const totalPorCobrar = active.reduce((acc, o) => acc + o.pendingAmount, 0);
    const totalEcf = active.filter((o) => o.isEcf).length;
    return { totalFacturado, totalCobrado, totalPorCobrar, totalEcf, count: active.length };
  }, [filteredOrders]);

  const handleCopyText = (text: string, idKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(idKey);
    toast.success(`Copiado: ${text}`);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const resetAllFilters = () => {
    setPeriodoCreacion("todas");
    setCustomFechaDesde("");
    setCustomFechaHasta("");
    setFiltroEstado("todos");
    setFiltroFiscal("todos");
    setFiltroCobro("todos");
    setFiltroMetodo("todos");
    setFiltroTecnico("todos");
    setSearchQuery("");
    setCurrentPage(1);
  };

  // Exportar CSV
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      toast.info("No hay órdenes para exportar con los filtros actuales");
      return;
    }
    const headers = [
      "Orden/Factura",
      "Origen",
      "Fecha",
      "Cliente",
      "RNC/Cedula",
      "Vehiculo",
      "Placa",
      "Tecnico",
      "Estado Taller",
      "NCF / e-CF",
      "Codigo Seguridad DGII",
      "Subtotal",
      "ITBIS",
      "Total",
      "Pagado",
      "Saldo Pendiente",
      "Metodo Pago",
    ];
    const rows = filteredOrders.map((o) => [
      o.numero,
      o.source === "invoice" ? "Factura POS" : "Orden de Servicio",
      new Date(o.createdAt).toLocaleString("es-DO"),
      `"${(o.customerName || "").replace(/"/g, '""')}"`,
      o.customerRnc || "",
      `"${(o.vehicleLabel || "").replace(/"/g, '""')}"`,
      o.vehiclePlate || "",
      `"${(o.mechanicName || "").replace(/"/g, '""')}"`,
      getWorkshopStatusConfig(o.workshopStatus).label,
      o.ncf || "Sin Comprobante",
      o.securityCode || "",
      o.subtotal.toFixed(2),
      o.tax.toFixed(2),
      o.total.toFixed(2),
      o.paidAmount.toFixed(2),
      o.pendingAmount.toFixed(2),
      translatePaymentMethod(o.paymentMethod),
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `ordenes_taller_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exportadas ${filteredOrders.length} órdenes a CSV`);
  };

  // Cambiar Estado de Taller
  const handleUpdateWorkshopStatus = (
    order: UnifiedWorkshopOrder,
    newStatus: WorkOrder["status"]
  ) => {
    if (order.workOrderId) {
      updateOrder(order.workOrderId, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      toast.success(
        `Estado de orden ${order.numero} actualizado a "${getWorkshopStatusConfig(newStatus).label}"`
      );
    } else if (order.invoiceId) {
      toast.success(`Estado operativo de ${order.numero} registrado como "${getWorkshopStatusConfig(newStatus).label}"`);
    }
    if (detailOrder && detailOrder.id === order.id) {
      setDetailOrder({ ...detailOrder, workshopStatus: newStatus });
    }
    setStatusModalOrder(null);
  };

  // Abrir Modal de Cobro Rápido
  const openCobrarModal = (order: UnifiedWorkshopOrder) => {
    setCobrarModalOrder(order);
    setCobrarMonto(String(order.pendingAmount > 0 ? order.pendingAmount : order.total));
    setCobrarEfectivoRecibido(String(order.pendingAmount > 0 ? order.pendingAmount : order.total));
    setCobrarMetodo("EFECTIVO");
    setCobrarReferencia("");
  };

  // Confirmar Cobro de Saldo Pendiente
  const handleConfirmCobro = () => {
    if (!cobrarModalOrder) return;
    const montoAbono = Number(cobrarMonto || 0);
    if (isNaN(montoAbono) || montoAbono <= 0) {
      toast.error("Ingresa un monto válido a cobrar");
      return;
    }

    const nuevoPagado = Math.min(
      cobrarModalOrder.total,
      cobrarModalOrder.paidAmount + montoAbono
    );
    const nuevoPendiente = Math.max(0, cobrarModalOrder.total - nuevoPagado);
    const nuevoStatus: "paid" | "pending" = nuevoPendiente <= 0.01 ? "paid" : "pending";
    const payMethodInternal =
      cobrarMetodo === "EFECTIVO"
        ? "cash"
        : cobrarMetodo === "TARJETA"
        ? "card"
        : "transfer";

    if (cobrarModalOrder.invoiceId) {
      const existingInv = tenantInvoices.find((i) => i.id === cobrarModalOrder.invoiceId);
      const { meta } = parseInvoiceNotesMeta(existingInv?.notes);
      const updatedNotes = JSON.stringify({
        ...(meta || {}),
        condicionCobro: nuevoStatus === "paid" ? "CONTADO" : "CREDITO",
        instrumentoPago: cobrarMetodo,
        paidAmount: nuevoPagado,
        pendingAmount: nuevoPendiente,
        referencia: cobrarReferencia || meta?.referencia || undefined,
      });

      updateInvoice(cobrarModalOrder.invoiceId, {
        status: nuevoStatus,
        paymentMethod: payMethodInternal,
        paidAmount: nuevoPagado,
        pendingAmount: nuevoPendiente,
        notes: updatedNotes,
      });
    } else if (cobrarModalOrder.workOrderId) {
      // Crear la factura en Supabase a partir de la Orden de Servicio
      const newInvId = `inv-${Date.now()}`;
      const newInv: Invoice = {
        id: newInvId,
        tenantId: tenantId || "default",
        orderId: cobrarModalOrder.workOrderId,
        customerId: cobrarModalOrder.customerId || "walk-in",
        customerName: cobrarModalOrder.customerName,
        customerRnc: cobrarModalOrder.customerRnc,
        mechanicId: cobrarModalOrder.mechanicId,
        items: cobrarModalOrder.items.map((it) => ({
          id: it.id,
          name: it.name,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          tax: it.tax,
        })),
        subtotal: cobrarModalOrder.subtotal,
        tax: cobrarModalOrder.tax,
        discount: cobrarModalOrder.discount,
        total: cobrarModalOrder.total,
        paymentMethod: payMethodInternal,
        status: nuevoStatus,
        paidAmount: nuevoPagado,
        pendingAmount: nuevoPendiente,
        createdAt: new Date().toISOString(),
        notes: JSON.stringify({
          condicionCobro: nuevoStatus === "paid" ? "CONTADO" : "CREDITO",
          instrumentoPago: cobrarMetodo,
          paidAmount: nuevoPagado,
          pendingAmount: nuevoPendiente,
          referencia: cobrarReferencia || undefined,
        }),
      };
      addInvoice(newInv);
      if (nuevoStatus === "paid") {
        updateOrder(cobrarModalOrder.workOrderId, {
          status: "delivered",
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // Registrar movimiento en caja activa si está abierta
    if (activeCaja) {
      addCajaMovement({
        id: `mov-${Date.now()}`,
        caja_id: activeCaja.id,
        tenant_id: tenantId || activeCaja.tenant_id,
        empleado_id: activeCaja.empleado_id || "admin",
        tipo: "ABONO",
        concepto: `Cobro orden ${cobrarModalOrder.numero} - ${cobrarModalOrder.customerName}`,
        monto: montoAbono,
        metodo: cobrarMetodo,
        creado_en: new Date().toISOString(),
      });
    }

    toast.success(
      nuevoStatus === "paid"
        ? `Orden ${cobrarModalOrder.numero} saldada por completo (RD$ ${montoAbono.toLocaleString("es-DO")})`
        : `Abono registrado: RD$ ${montoAbono.toLocaleString("es-DO")}. Resta RD$ ${nuevoPendiente.toLocaleString("es-DO")}`
    );
    setCobrarModalOrder(null);
  };

  // Abrir Modal de Timbrado e-CF con EF2
  const openTimbrarModal = (order: UnifiedWorkshopOrder) => {
    if (order.isEcf && order.ncf && !order.creditNoteNcf) {
      toast.warning(
        `Esta orden ya tiene el comprobante electrónico activo ${order.ncf}. Para emitir otro, primero debes anularlo con una Nota de Crédito (E34).`
      );
      return;
    }
    setTimbrarModalOrder(order);
    const hasRnc = Boolean(order.customerRnc && order.customerRnc.replace(/\D/g, "").length >= 9);
    setTimbrarTipoEcf(hasRnc ? "31" : "32");
    setTimbrarBuyerRnc(order.customerRnc || "");
    setTimbrarBuyerName(
      order.customerName !== "Cliente de Contado" ? order.customerName : ""
    );
  };

  // Emitir Comprobante Fiscal Electrónico (e-CF) vía EF2 y guardar en Supabase
  const handleEmitirEcf = async () => {
    if (!timbrarModalOrder || isSubmittingEcf) return;

    if (timbrarModalOrder.isEcf && timbrarModalOrder.ncf && !timbrarModalOrder.creditNoteNcf) {
      toast.warning(
        `Esta orden ya posee el e-CF activo ${timbrarModalOrder.ncf}. No se permiten comprobantes duplicados.`
      );
      return;
    }

    const cleanRnc = timbrarBuyerRnc.replace(/\D/g, "");
    if ((timbrarTipoEcf === "31" || timbrarTipoEcf === "44" || timbrarTipoEcf === "45") && cleanRnc.length !== 9 && cleanRnc.length !== 11) {
      toast.error(
        `Para emitir E${timbrarTipoEcf} la DGII exige un RNC (9 dígitos) o Cédula (11 dígitos) válido.`
      );
      return;
    }

    setIsSubmittingEcf(true);
    try {
      toast.info(`Timbrando e-CF (E${timbrarTipoEcf}) ante EF2 / DGII...`, {
        id: "ordenes-ecf-submit",
      });

      const ecfConfig = currentTenant?.config?.ecfConfig;
      const activeToken = ecfConfig?.token?.trim() || EF2_DEFAULT_TEST_TOKEN;
      const isSpecialRegime = timbrarTipoEcf === "44";

      const effectiveItems =
        timbrarModalOrder.items.length > 0
          ? timbrarModalOrder.items
          : [
              {
                id: "srv-general",
                name: "Servicio de Taller Automotriz",
                quantity: 1,
                unitPrice: timbrarModalOrder.subtotal || timbrarModalOrder.total,
                tax: isSpecialRegime ? 0 : timbrarModalOrder.tax > 0 ? 18 : 0,
              },
            ];

      const effectiveSubtotal = timbrarModalOrder.subtotal || timbrarModalOrder.total;
      const effectiveItbis = isSpecialRegime ? 0 : timbrarModalOrder.tax;
      const effectiveTotal = isSpecialRegime
        ? effectiveSubtotal
        : timbrarModalOrder.total;

      const payload = buildEf2InvoicePayload({
        invoiceType: timbrarTipoEcf,
        items: effectiveItems.map((it) => {
          const isExento = isSpecialRegime || it.tax === 0;
          return {
            name: it.name,
            quantity: it.quantity,
            salePrice: it.unitPrice,
            tax: isExento ? 0 : 0.18,
            is_exento: isExento,
            category: it.isService ? "Servicios" : "Repuestos",
          };
        }),
        subtotal: effectiveSubtotal,
        itbis: effectiveItbis,
        total: effectiveTotal,
        payMethod:
          timbrarModalOrder.paymentStatus === "pending"
            ? "credit"
            : timbrarModalOrder.paymentMethod || "cash",
        issuer: {
          rnc: ecfConfig?.rnc || currentTenant?.rnc,
          businessName: ecfConfig?.businessName || currentTenant?.name || "ServiTracks",
          address: currentTenant?.address,
          phone: currentTenant?.phone,
        },
        buyer:
          cleanRnc || timbrarBuyerName.trim()
            ? {
                rnc: cleanRnc || undefined,
                name: timbrarBuyerName.trim() || timbrarModalOrder.customerName,
              }
            : undefined,
      });

      const result = await submitInvoiceToEf2(activeToken, payload);

      if (!result || !result.ncf) {
        throw new Error("EF2 no devolvió un e-NCF válido.");
      }

      const parsedSigDate = parseEf2SignatureDate(result.fecha_firma);
      const ef2Metadata = {
        id_factura: result.id_factura,
        ncf: result.ncf,
        estado: result.estado,
        pdf_cloud_url: result.pdf_cloud_url,
        xml_cloud_url: result.xml_cloud_url,
        consulta_url: result.consulta_url,
        fecha_vencimiento: result.fecha_vencimiento,
        track_id: result.dgii_info?.track_id,
      };

      if (timbrarModalOrder.invoiceId) {
        const existingInv = tenantInvoices.find(
          (i) => i.id === timbrarModalOrder.invoiceId
        );
        const { meta } = parseInvoiceNotesMeta(existingInv?.notes);
        updateInvoice(timbrarModalOrder.invoiceId, {
          ncf: result.ncf,
          qrUrl: result.qr_link,
          securityCode: result.codigo_seguridad,
          signatureDate: parsedSigDate,
          customerRnc: cleanRnc || timbrarModalOrder.customerRnc,
          customerName: timbrarBuyerName.trim() || timbrarModalOrder.customerName,
          notes: JSON.stringify({
            ...(meta || {}),
            ef2: ef2Metadata,
          }),
        });
      } else if (timbrarModalOrder.workOrderId) {
        // Si era una Orden de Servicio sin factura en `invoices`, creamos la factura timbrada en Supabase
        const newInvId = `inv-${Date.now()}`;
        const rawMethod = (timbrarModalOrder.paymentMethod || "cash").toLowerCase();
        const normalizedMethod: Invoice["paymentMethod"] =
          rawMethod === "card" || rawMethod === "tarjeta"
            ? "card"
            : rawMethod === "transfer" || rawMethod === "transferencia"
            ? "transfer"
            : timbrarModalOrder.paymentStatus === "pending"
            ? "credit"
            : "cash";

        const newInv: Invoice = {
          id: newInvId,
          tenantId: tenantId || "default",
          orderId: timbrarModalOrder.workOrderId,
          customerId: timbrarModalOrder.customerId || "walk-in",
          customerName: timbrarBuyerName.trim() || timbrarModalOrder.customerName,
          customerRnc: cleanRnc || timbrarModalOrder.customerRnc,
          mechanicId: timbrarModalOrder.mechanicId,
          items: effectiveItems.map((it) => ({
            id: it.id,
            name: it.name,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            tax: it.tax,
          })),
          subtotal: effectiveSubtotal,
          tax: effectiveItbis,
          discount: timbrarModalOrder.discount,
          total: effectiveTotal,
          paymentMethod: normalizedMethod,
          status: timbrarModalOrder.paymentStatus === "paid" ? "paid" : "pending",
          paidAmount: timbrarModalOrder.paidAmount,
          pendingAmount: timbrarModalOrder.pendingAmount,
          ncf: result.ncf,
          qrUrl: result.qr_link,
          securityCode: result.codigo_seguridad,
          signatureDate: parsedSigDate,
          createdAt: new Date().toISOString(),
          notes: JSON.stringify({
            condicionCobro:
              timbrarModalOrder.paymentStatus === "paid" ? "CONTADO" : "CREDITO",
            instrumentoPago: "EFECTIVO",
            paidAmount: timbrarModalOrder.paidAmount,
            pendingAmount: timbrarModalOrder.pendingAmount,
            ef2: ef2Metadata,
          }),
        };
        addInvoice(newInv);
        updateOrder(timbrarModalOrder.workOrderId, {
          ncfType: `E${timbrarTipoEcf}`,
        });
      }

      toast.success(`Comprobante e-CF timbrado exitosamente: ${result.ncf}`, {
        id: "ordenes-ecf-submit",
      });
      setTimbrarModalOrder(null);
    } catch (err: any) {
      toast.error(
        `Error al timbrar en EF2: ${err?.message || "Verifica la conexión o datos fiscales"}`,
        { id: "ordenes-ecf-submit" }
      );
    } finally {
      setIsSubmittingEcf(false);
    }
  };

  // Emitir Nota de Crédito Electrónica E34 / Anular Orden
  const handleEmitirNotaCredito = async () => {
    if (!notaCreditoOrder) return;
    setIsSubmittingNotaCredito(true);

    try {
      let creditNoteNcf: string | undefined = undefined;
      let creditNoteEf2: Record<string, any> | undefined = undefined;

      // Si la factura tiene un e-NCF electrónico, emitir E34 ante EF2
      if (notaCreditoOrder.isEcf && notaCreditoOrder.ncf) {
        toast.info(
          `Emitiendo Nota de Crédito Electrónica (E34) para ${notaCreditoOrder.ncf}...`,
          { id: "ordenes-e34-submit" }
        );
        const ecfConfig = currentTenant?.config?.ecfConfig;
        const activeToken = ecfConfig?.token?.trim() || EF2_DEFAULT_TEST_TOKEN;

        const origDate = new Date(notaCreditoOrder.createdAt);
        const dd = String(origDate.getDate()).padStart(2, "0");
        const mm = String(origDate.getMonth() + 1).padStart(2, "0");
        const yyyy = origDate.getFullYear();

        const effectiveItems =
          notaCreditoOrder.items.length > 0
            ? notaCreditoOrder.items
            : [
                {
                  id: "srv-nc",
                  name: "Devolución / Anulación de Servicio",
                  quantity: 1,
                  unitPrice: notaCreditoOrder.subtotal || notaCreditoOrder.total,
                  tax: notaCreditoOrder.tax > 0 ? 18 : 0,
                },
              ];

        const payload = buildEf2InvoicePayload({
          invoiceType: "34",
          items: effectiveItems.map((it) => ({
            name: it.name,
            quantity: it.quantity,
            salePrice: it.unitPrice,
            tax: it.tax > 0 ? 0.18 : 0,
            is_exento: it.tax === 0,
          })),
          subtotal: notaCreditoOrder.subtotal,
          itbis: notaCreditoOrder.tax,
          total: notaCreditoOrder.total,
          payMethod: notaCreditoOrder.paymentMethod || "cash",
          issuer: {
            rnc: ecfConfig?.rnc || currentTenant?.rnc,
            businessName: ecfConfig?.businessName || currentTenant?.name || "ServiTracks",
          },
          buyer:
            notaCreditoOrder.customerRnc || notaCreditoOrder.customerName
              ? {
                  rnc: notaCreditoOrder.customerRnc,
                  name: notaCreditoOrder.customerName,
                }
              : undefined,
          reference: {
            ncf: notaCreditoOrder.ncf,
            date: `${dd}-${mm}-${yyyy}`,
            code: String(notaCreditoCode),
            reason: notaCreditoMotivo || "Anulación de operación",
          },
        });

        const res = await submitInvoiceToEf2(activeToken, payload);
        if (res && res.ncf) {
          creditNoteNcf = res.ncf;
          creditNoteEf2 = {
            ncf: res.ncf,
            amount: notaCreditoOrder.total,
            reason: notaCreditoMotivo,
            createdAt: new Date().toISOString(),
            pdf_cloud_url: res.pdf_cloud_url,
            xml_cloud_url: res.xml_cloud_url,
            codigo_seguridad: res.codigo_seguridad,
          };
          toast.success(`Nota de Crédito E34 emitida ante DGII: ${res.ncf}`, {
            id: "ordenes-e34-submit",
          });
        }
      }

      if (notaCreditoOrder.invoiceId) {
        const existingInv = tenantInvoices.find(
          (i) => i.id === notaCreditoOrder.invoiceId
        );
        const { meta } = parseInvoiceNotesMeta(existingInv?.notes);
        updateInvoice(notaCreditoOrder.invoiceId, {
          status: "cancelled",
          pendingAmount: 0,
          notes: JSON.stringify({
            ...(meta || {}),
            creditNote: creditNoteEf2 || {
              ncf: creditNoteNcf || "ANULADA",
              amount: notaCreditoOrder.total,
              reason: notaCreditoMotivo,
              createdAt: new Date().toISOString(),
            },
          }),
        });
      }

      if (notaCreditoOrder.workOrderId) {
        updateOrder(notaCreditoOrder.workOrderId, {
          status: "cancelled" as any,
        });
      }

      if (activeCaja && notaCreditoOrder.paidAmount > 0) {
        addCajaMovement({
          id: `mov-nc-${Date.now()}`,
          caja_id: activeCaja.id,
          tenant_id: tenantId || activeCaja.tenant_id,
          empleado_id: activeCaja.empleado_id || "admin",
          tipo: "EGRESO",
          concepto: `Anulación / Nota de Crédito ${creditNoteNcf || notaCreditoOrder.numero} - ${notaCreditoMotivo}`,
          monto: notaCreditoOrder.paidAmount,
          metodo: "EFECTIVO",
          creado_en: new Date().toISOString(),
        });
      }

      toast.success(
        creditNoteNcf
          ? `Orden ${notaCreditoOrder.numero} anulada con Nota de Crédito ${creditNoteNcf}`
          : `Orden ${notaCreditoOrder.numero} anulada correctamente`
      );
      setNotaCreditoOrder(null);
    } catch (err: any) {
      toast.error(
        `Error al procesar Nota de Crédito: ${err?.message || "Intenta nuevamente"}`,
        { id: "ordenes-e34-submit" }
      );
    } finally {
      setIsSubmittingNotaCredito(false);
    }
  };

  // Compartir por WhatsApp
  const handleShareWhatsApp = (order: UnifiedWorkshopOrder) => {
    const phone = order.customerPhone;
    if (!phone) {
      toast.error("El cliente no tiene un número de teléfono registrado");
      return;
    }
    const itemsLines = order.items
      .map(
        (i) =>
          `• ${i.quantity}x ${i.name} — RD$ ${(i.quantity * i.unitPrice).toLocaleString("es-DO")}`
      )
      .join("\n");

    const message =
      `*${currentTenant?.name || "ServiTracks"} — Detalle de Orden ${order.numero}*\n\n` +
      `Hola *${order.customerName}*,\n` +
      (order.vehicleLabel
        ? `Vehículo: *${order.vehicleLabel}* ${order.vehiclePlate ? `[${order.vehiclePlate}]` : ""}\n`
        : "") +
      `Estado: *${getWorkshopStatusConfig(order.workshopStatus).label}*\n` +
      (order.ncf ? `Comprobante Fiscal (e-NCF): *${order.ncf}*\n` : "") +
      (order.securityCode ? `Código Seguridad DGII: *${order.securityCode}*\n` : "") +
      `\n*Detalle:*\n${itemsLines || "• Servicio automotriz general"}\n\n` +
      `*Total:* RD$ ${order.total.toLocaleString("es-DO")}\n` +
      (order.pendingAmount > 0
        ? `*Saldo Pendiente:* RD$ ${order.pendingAmount.toLocaleString("es-DO")}\n`
        : `*Estado de Pago:* PAGADA\n`) +
      `\n¡Gracias por confiar su vehículo en nuestras manos!`;

    const cleanPhone = phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `1${cleanPhone}` : cleanPhone;
    window.open(
      `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  // ============================================================================
  // VISTA SECUNDARIA: CENTRO DE COBROS / PENDIENTES DE COBRO (Inspirado en Klynn)
  // ============================================================================
  if (showPendientes) {
    const filteredPendientes = ordenesPendientesCobro.filter((o) => {
      if (pendientesStatusFilter !== "todos") {
        if (pendientesStatusFilter === "listas" && o.workshopStatus !== "finished") {
          return false;
        }
        if (
          pendientesStatusFilter === "en_taller" &&
          !["pending", "diagnosing", "repairing", "waiting_parts"].includes(o.workshopStatus)
        ) {
          return false;
        }
        if (
          pendientesStatusFilter === "entregadas" &&
          !["delivered", "invoiced"].includes(o.workshopStatus)
        ) {
          return false;
        }
      }
      if (pendientesSearch.trim()) {
        const q = pendientesSearch.toLowerCase().trim();
        const hay = `${o.numero} ${o.customerName} ${o.vehicleLabel || ""} ${o.vehiclePlate || ""} ${o.ncf || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const totalPorCobrar = ordenesPendientesCobro.reduce(
      (acc, o) => acc + o.pendingAmount,
      0
    );
    const listasParaEntrega = ordenesPendientesCobro.filter(
      (o) => o.workshopStatus === "finished"
    ).length;

    return (
      <div className="w-full space-y-4">
        {/* Header Centro de Cobros (Sin borde de tarjeta) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5 pb-1">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowPendientes(false)}
              className="rounded-xl h-10 px-3.5 border-neutral-200 hover:bg-neutral-100 font-bold text-xs gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Volver a Órdenes</span>
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-neutral-900 tracking-tight uppercase">
                  Órdenes Pendientes de Cobro
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-black rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  {ordenesPendientesCobro.length}
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Gestiona cuentas por cobrar de clientes, órdenes listas para entrega y saldos pendientes
              </p>
            </div>
          </div>

          <Button
            onClick={() => router.push(`/${tenant}/pos`)}
            className="rounded-xl bg-neutral-900 hover:bg-neutral-800 text-amber-400 font-bold text-xs h-10 px-4 gap-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Ir a Punto de Venta (POS)</span>
          </Button>
        </div>

        {/* 3 Tarjetas KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-neutral-500">
                Órdenes Pendientes
              </span>
              <p className="text-2xl font-black text-neutral-900 mt-1 tabular-nums">
                {ordenesPendientesCobro.length}
              </p>
              <span className="text-[11px] text-neutral-400">
                Con balance activo por saldar
              </span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
              <Clock className="h-6 w-6" />
            </div>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-rose-700">
                Total por Cobrar
              </span>
              <p className="text-2xl font-black text-rose-700 mt-1 tabular-nums">
                RD$ {totalPorCobrar.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[11px] text-rose-600/80">
                Cartera pendiente en taller
              </span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-rose-100 border border-rose-200 text-rose-700 flex items-center justify-center">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-emerald-800">
                Vehículos Listos para Entrega
              </span>
              <p className="text-2xl font-black text-emerald-700 mt-1 tabular-nums">
                {listasParaEntrega}
              </p>
              <span className="text-[11px] text-emerald-700/80">
                Trabajos finalizados pendientes de pago
              </span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center">
              <Car className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Barra de filtro rápido de pendientes */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-neutral-200">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="h-4 w-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={pendientesSearch}
              onChange={(e) => setPendientesSearch(e.target.value)}
              placeholder="Buscar por orden, cliente, placa o vehículo..."
              className="pl-9 h-10 rounded-xl border-neutral-200 text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "todos", label: "Todas" },
              { id: "listas", label: "Listas para Entrega" },
              { id: "en_taller", label: "En Taller" },
              { id: "entregadas", label: "Entregadas a Crédito" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPendientesStatusFilter(tab.id)}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  pendientesStatusFilter === tab.id
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de tarjetas pendientes */}
        {filteredPendientes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-black text-neutral-900">
              ¡Excelente! No hay órdenes pendientes de cobro con este filtro
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Todas las órdenes y facturas consultadas se encuentran al día.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPendientes.map((o) => {
              const st = getWorkshopStatusConfig(o.workshopStatus);
              return (
                <div
                  key={o.id}
                  className="bg-white rounded-2xl border border-neutral-200/90 p-4 shadow-2xs hover:border-neutral-400 transition-all flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-neutral-900">
                            {o.numero}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                              st.bg
                            )}
                          >
                            {st.label}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-neutral-900 mt-1">
                          {o.customerName}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase text-rose-600 block">
                          Saldo Pendiente
                        </span>
                        <span className="text-base font-black text-rose-600 tabular-nums">
                          RD$ {o.pendingAmount.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {o.vehicleLabel && (
                      <div className="mt-3 p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/70 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 font-semibold text-neutral-800">
                          <Car className="h-4 w-4 text-neutral-500" />
                          <span>{o.vehicleLabel}</span>
                        </div>
                        {o.vehiclePlate && (
                          <span className="font-mono font-bold text-[11px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-300">
                            {o.vehiclePlate}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
                      <span>
                        Total Orden:{" "}
                        <strong className="text-neutral-800">
                          RD$ {o.total.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                        </strong>
                      </span>
                      <span>
                        Abonado:{" "}
                        <strong className="text-emerald-700">
                          RD$ {o.paidAmount.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDetailOrder(o)}
                      className="rounded-xl text-xs font-bold h-9 flex-1 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      Ver Detalle
                    </Button>
                    {o.source === "work_order" && o.workOrderId ? (
                      <Button
                        size="sm"
                        onClick={() =>
                          router.push(`/${tenant}/pos?orderId=${o.workOrderId}`)
                        }
                        className="rounded-xl bg-neutral-900 hover:bg-neutral-800 text-amber-400 text-xs font-bold h-9 flex-1 cursor-pointer"
                      >
                        <Receipt className="h-3.5 w-3.5 mr-1.5" />
                        Facturar en POS
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => openCobrarModal(o)}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 flex-1 cursor-pointer"
                      >
                        <DollarSign className="h-3.5 w-3.5 mr-1" />
                        Cobrar Ahora
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // VISTA PRINCIPAL: /ORDENES (CONTROL UNIFICADO DE ÓRDENES, TIMBRADOS Y COBROS)
  // ============================================================================
  const periodoLabelMap: Record<PeriodoCreacion, string> = {
    todas: "Todas las fechas",
    hoy: "Hoy",
    ayer: "Ayer",
    esta_semana: "Esta Semana",
    semana_pasada: "Semana Pasada",
    este_mes: "Este Mes",
    mes_pasado: "Mes Pasado",
    personalizado:
      customFechaDesde && customFechaHasta
        ? `${customFechaDesde} → ${customFechaHasta}`
        : "Rango Personalizado",
  };

  const fiscalLabelMap: Record<string, string> = {
    todos: "Todos los Comprobantes",
    ecf_aceptados: "Timbrados e-CF (EF2)",
    e31: "E31 • Crédito Fiscal",
    e32: "E32 • Consumo",
    e44_45: "E44 / E45 • Reg. Esp.",
    con_nota_credito: "Con Nota Crédito E34",
    sin_timbrar: "Sin Timbrar e-CF",
  };

  const cobroLabelMap: Record<string, string> = {
    todos: "Todos los Cobros",
    pagadas: "Pagadas al 100%",
    pendientes: "Con Saldo Pendiente",
    anuladas: "Anuladas",
  };

  const selectedTechName =
    filtroTecnico === "todos"
      ? "Todos los Técnicos"
      : tenantTechnicians.find((t) => t.id === filtroTecnico)?.name || "Técnico";

  return (
    <div className="w-full space-y-3">
      {/* 1. Header Principal Limpio (Sin borde de tarjeta, más arriba y a ancho completo) */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pt-0.5 pb-1">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              Órdenes
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
              {unifiedOrders.length} registradas
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Timbrado DGII / EF2 Activo
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Consulta centralizada de órdenes del taller, facturación POS, comprobantes electrónicos e-CF y cobros.
          </p>
        </div>

        {/* Botones de Acción Superior en una sola fila */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Button
            variant="outline"
            onClick={() => setShowPendientes(true)}
            className="rounded-xl h-9 px-3.5 border-amber-300 bg-amber-50/90 hover:bg-amber-100 text-amber-950 font-bold text-xs gap-2 cursor-pointer shadow-2xs"
          >
            <Wallet className="h-3.5 w-3.5 text-amber-700" />
            <span>Pendientes de cobro</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-neutral-950 text-[10px] font-black">
              {ordenesPendientesCobro.length}
            </span>
          </Button>

          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="rounded-xl h-9 px-3 border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700 font-bold text-xs gap-1.5 cursor-pointer shadow-2xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push(`/${tenant}/orders`)}
            className="rounded-xl h-9 px-3.5 border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-800 font-bold text-xs gap-1.5 cursor-pointer shadow-2xs"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            <span>Órdenes de Servicio</span>
          </Button>

          <Button
            onClick={() => router.push(`/${tenant}/pos`)}
            className="rounded-xl h-9 px-4 bg-neutral-900 hover:bg-neutral-800 text-amber-400 font-bold text-xs gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nueva Factura POS</span>
          </Button>
        </div>
      </div>

      {/* 2. Métricas y Gráficas Diarias Colapsables */}
      <OrdenesDailyMetricsCards
        ordenes={unifiedOrders}
        periodoCreacion={periodoCreacion}
        filtroEstado={filtroEstado}
        customFechaDesde={customFechaDesde}
        customFechaHasta={customFechaHasta}
        onFilterPeriodo={(p, customDate) => {
          setPeriodoCreacion(p);
          if (customDate) {
            setCustomFechaDesde(customDate);
            setCustomFechaHasta(customDate);
          }
          setCurrentPage(1);
        }}
        onFilterEstado={(est) => {
          setFiltroEstado(est);
          setCurrentPage(1);
        }}
        onResetFilter={resetAllFilters}
      />

      {/* 3. Barra de Búsqueda y Filtros Avanzados */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 p-3.5 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-2.5">
          {/* Buscador */}
          <div className="relative lg:col-span-4">
            <Search className="h-4 w-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por # orden, e-NCF (E31/E32), cliente, RNC, placa o vehículo..."
              className="pl-9 pr-8 h-10 rounded-xl border-neutral-200 text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filtro Período */}
          <div className="lg:col-span-2">
            <Select
              value={periodoCreacion}
              onValueChange={(val) => {
                if (!val) return;
                if (val === "personalizado") {
                  setIsCustomDateModalOpen(true);
                } else {
                  setPeriodoCreacion(val as PeriodoCreacion);
                  setCustomFechaDesde("");
                  setCustomFechaHasta("");
                  setCurrentPage(1);
                }
              }}
            >
              <SelectTrigger className="w-full h-10 rounded-xl border-neutral-200 text-xs font-semibold">
                <div className="flex items-center gap-1.5 truncate">
                  <Calendar className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                  <span className="truncate">{periodoLabelMap[periodoCreacion]}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las fechas</SelectItem>
                <SelectItem value="hoy">Hoy</SelectItem>
                <SelectItem value="ayer">Ayer</SelectItem>
                <SelectItem value="esta_semana">Esta Semana</SelectItem>
                <SelectItem value="semana_pasada">Semana Pasada</SelectItem>
                <SelectItem value="este_mes">Este Mes</SelectItem>
                <SelectItem value="mes_pasado">Mes Pasado</SelectItem>
                <SelectItem value="personalizado">Rango Personalizado...</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro Fiscal / Timbrado DGII */}
          <div className="lg:col-span-2">
            <Select
              value={filtroFiscal}
              onValueChange={(val) => {
                if (!val) return;
                setFiltroFiscal(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full h-10 rounded-xl border-neutral-200 text-xs font-semibold">
                <div className="flex items-center gap-1.5 truncate">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{fiscalLabelMap[filtroFiscal] || "Comprobante DGII"}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los Comprobantes</SelectItem>
                <SelectItem value="ecf_aceptados">Timbrados e-CF (EF2)</SelectItem>
                <SelectItem value="e31">E31 • Crédito Fiscal</SelectItem>
                <SelectItem value="e32">E32 • Consumo</SelectItem>
                <SelectItem value="e44_45">E44 / E45 • Reg. Esp. y Gub.</SelectItem>
                <SelectItem value="con_nota_credito">Con Nota de Crédito E34</SelectItem>
                <SelectItem value="sin_timbrar">Sin Timbrar e-CF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro Estado de Cobro */}
          <div className="lg:col-span-2">
            <Select
              value={filtroCobro}
              onValueChange={(val) => {
                if (!val) return;
                setFiltroCobro(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full h-10 rounded-xl border-neutral-200 text-xs font-semibold">
                <div className="flex items-center gap-1.5 truncate">
                  <DollarSign className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                  <span className="truncate">{cobroLabelMap[filtroCobro] || "Estado de Cobro"}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los Cobros</SelectItem>
                <SelectItem value="pagadas">Pagadas al 100%</SelectItem>
                <SelectItem value="pendientes">Con Saldo Pendiente</SelectItem>
                <SelectItem value="anuladas">Anuladas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro Técnico */}
          <div className="lg:col-span-2">
            <Select
              value={filtroTecnico}
              onValueChange={(val) => {
                if (!val) return;
                setFiltroTecnico(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full h-10 rounded-xl border-neutral-200 text-xs font-semibold">
                <div className="flex items-center gap-1.5 truncate">
                  <UserCog className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                  <span className="truncate">{selectedTechName}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los Técnicos</SelectItem>
                {tenantTechnicians.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Banner informativo cuando hay un período o filtro activo */}
        {(periodoCreacion !== "todas" ||
          filtroFiscal !== "todos" ||
          filtroCobro !== "todos" ||
          filtroTecnico !== "todos" ||
          Boolean(searchQuery)) && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-neutral-900 text-white text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-bold text-amber-400 uppercase tracking-wide text-[11px]">
                Resumen Selección ({financialSummary.count} órdenes):
              </span>
              <span>
                Total Facturado:{" "}
                <strong className="text-white">
                  RD$ {financialSummary.totalFacturado.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                </strong>
              </span>
              <span>•</span>
              <span>
                Cobrado:{" "}
                <strong className="text-emerald-400">
                  RD$ {financialSummary.totalCobrado.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                </strong>
              </span>
              <span>•</span>
              <span>
                Por Cobrar:{" "}
                <strong className="text-amber-300">
                  RD$ {financialSummary.totalPorCobrar.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                </strong>
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-emerald-300 font-bold">
                <ShieldCheck className="h-3.5 w-3.5" />
                {financialSummary.totalEcf} e-CF
              </span>
            </div>

            <button
              type="button"
              onClick={resetAllFilters}
              className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar filtros
            </button>
          </div>
        )}

        {/* Pills de Estado (flex-wrap sin barra de scroll horizontal) */}
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          {[
            { id: "todos", label: "Todas", count: statusCounts.todos },
            { id: "en_taller", label: "En Taller", count: statusCounts.en_taller },
            { id: "finalizadas", label: "Listas / Finalizadas", count: statusCounts.finalizadas },
            {
              id: "entregadas",
              label: "Entregadas / Facturadas",
              count: statusCounts.entregadas,
            },
            {
              id: "timbradas_ecf",
              label: "Timbradas e-CF",
              count: statusCounts.timbradas_ecf,
              highlight: "emerald",
            },
            {
              id: "pendientes_cobro",
              label: "Pendientes de Cobro",
              count: statusCounts.pendientes_cobro,
              highlight: "amber",
            },
            { id: "anuladas", label: "Anuladas", count: statusCounts.anuladas },
          ].map((pill) => {
            const active = filtroEstado === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => {
                  setFiltroEstado(pill.id);
                  setCurrentPage(1);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border",
                  active
                    ? "bg-neutral-900 text-white border-neutral-900 shadow-2xs"
                    : pill.highlight === "emerald"
                    ? "bg-emerald-50/70 text-emerald-800 border-emerald-200 hover:bg-emerald-100/80"
                    : pill.highlight === "amber"
                    ? "bg-amber-50/70 text-amber-900 border-amber-200 hover:bg-amber-100/80"
                    : "bg-neutral-50 text-neutral-600 border-neutral-200/80 hover:bg-neutral-100"
                )}
              >
                <span>{pill.label}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                    active
                      ? "bg-amber-400 text-neutral-950"
                      : "bg-white/90 text-neutral-700 border border-neutral-200/60"
                  )}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Tabla Principal de Órdenes y Comprobantes */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/80 text-[11px] font-black uppercase tracking-wider text-neutral-500">
                <th className="py-3.5 px-4">Orden / Cliente / Vehículo</th>
                <th className="py-3.5 px-3">Estado Taller</th>
                <th className="py-3.5 px-3">Timbrado Fiscal DGII</th>
                <th className="py-3.5 px-3 text-right">Total</th>
                <th className="py-3.5 px-3 text-right">Saldo / Cobro</th>
                <th className="py-3.5 px-3">Pago / Ref.</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-xs">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center">
                    <div className="max-w-sm mx-auto space-y-2">
                      <div className="h-12 w-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
                        <Receipt className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-black text-neutral-900">
                        No se encontraron órdenes con estos criterios
                      </p>
                      <p className="text-xs text-neutral-500">
                        Intenta ajustar el período de fechas, el filtro de comprobante fiscal o la búsqueda.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetAllFilters}
                        className="mt-2 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Restablecer filtros
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((o) => {
                  const st = getWorkshopStatusConfig(o.workshopStatus);
                  const isCancelled =
                    o.workshopStatus === "cancelled" || o.paymentStatus === "cancelled";

                  return (
                    <tr
                      key={o.id}
                      onClick={() => setDetailOrder(o)}
                      className={cn(
                        "group transition-colors hover:bg-neutral-50/90 cursor-pointer",
                        isCancelled && "opacity-60 bg-neutral-50/40"
                      )}
                    >
                      {/* 1. Orden / Cliente / Vehículo */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2.5">
                          <div
                            className={cn(
                              "h-9 w-9 rounded-xl flex items-center justify-center font-mono text-[11px] font-black shrink-0 border",
                              o.source === "invoice"
                                ? "bg-neutral-900 text-amber-400 border-neutral-900"
                                : "bg-amber-50 text-amber-900 border-amber-200"
                            )}
                          >
                            {o.source === "invoice" ? "POS" : "OS"}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-black text-neutral-900 text-xs">
                                {o.numero}
                              </span>
                              <span className="text-[10px] font-semibold text-neutral-400">
                                •{" "}
                                {new Date(o.createdAt).toLocaleDateString("es-DO", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-bold text-neutral-900 truncate max-w-[220px]">
                                {o.customerName}
                              </span>
                              {o.customerRnc && (
                                <span className="text-[10px] font-mono bg-neutral-100 text-neutral-600 px-1.5 py-0.2 rounded border border-neutral-200">
                                  RNC: {o.customerRnc}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {o.vehicleLabel && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-600">
                                  <Car className="h-3 w-3 text-neutral-400" />
                                  {o.vehicleLabel}
                                </span>
                              )}
                              {o.vehiclePlate && (
                                <span className="font-mono font-bold text-[10px] px-1.5 py-0.2 rounded bg-amber-100/80 text-amber-950 border border-amber-300">
                                  {o.vehiclePlate}
                                </span>
                              )}
                              {o.mechanicName && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-neutral-500">
                                  <Wrench className="h-2.5 w-2.5 text-neutral-400" />
                                  {o.mechanicName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Estado Operativo del Taller */}
                      <td
                        className="py-3.5 px-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatusModalOrder(o);
                        }}
                      >
                        <button
                          type="button"
                          title="Clic para cambiar estado operativo del taller"
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-transform hover:scale-105 cursor-pointer",
                            st.bg
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
                          <span>{st.label}</span>
                        </button>
                      </td>

                      {/* 3. Timbrado Fiscal DGII (e-CF / EF2) */}
                      <td
                        className="py-3.5 px-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {o.ncf ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleCopyText(o.ncf!, `ncf-${o.id}`)}
                                title="Clic para copiar e-NCF"
                                className={cn(
                                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-mono text-[11px] font-black border transition-all cursor-pointer",
                                  o.isEcf
                                    ? "bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100"
                                    : "bg-neutral-100 text-neutral-800 border-neutral-200 hover:bg-neutral-200"
                                )}
                              >
                                {o.isEcf && (
                                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                )}
                                <span>{o.ncf}</span>
                                {copiedId === `ncf-${o.id}` ? (
                                  <Check className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <Copy className="h-2.5 w-2.5 opacity-50" />
                                )}
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              {o.ecfTypeLabel && (
                                <span className="text-[10px] font-bold text-neutral-500">
                                  {o.ecfTypeLabel}
                                </span>
                              )}
                              {o.securityCode && (
                                <span className="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50/70 px-1.5 rounded border border-emerald-200/60">
                                  Cód: {o.securityCode}
                                </span>
                              )}
                            </div>

                            {o.creditNoteNcf && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                                NC E34: {o.creditNoteNcf}
                              </span>
                            )}
                          </div>
                        ) : !isCancelled ? (
                          <button
                            type="button"
                            onClick={() => openTimbrarModal(o)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-neutral-100 hover:bg-neutral-900 text-neutral-700 hover:text-amber-400 border border-neutral-200 transition-all cursor-pointer"
                          >
                            <Sparkles className="h-3 w-3" />
                            <span>Timbrar e-CF</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-neutral-400">Sin comprobante</span>
                        )}
                      </td>

                      {/* 4. Total */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="font-black text-neutral-900 tabular-nums text-xs sm:text-sm">
                          RD$ {o.total.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                        </div>
                        {o.tax > 0 && (
                          <div className="text-[10px] text-neutral-400 tabular-nums">
                            ITBIS: RD$ {o.tax.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </td>

                      {/* 5. Saldo / Estado de Cobro */}
                      <td
                        className="py-3.5 px-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isCancelled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Anulada
                          </span>
                        ) : o.pendingAmount <= 0.01 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Pagada
                          </span>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-black text-rose-600 tabular-nums text-xs">
                              RD$ {o.pendingAmount.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                            </span>
                            <button
                              type="button"
                              onClick={() => openCobrarModal(o)}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-neutral-950 font-black text-[10px] shadow-2xs transition-all cursor-pointer"
                            >
                              <DollarSign className="h-3 w-3" />
                              <span>Cobrar</span>
                            </button>
                          </div>
                        )}
                      </td>

                      {/* 6. Método de Pago y Referencia */}
                      <td
                        className="py-3.5 px-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-700">
                            {o.paymentMethod === "Pending" || o.paymentMethod === "pending" ? (
                              <span className="text-amber-700">Por Cobrar</span>
                            ) : (
                              translatePaymentMethod(o.paymentMethod)
                            )}
                          </span>
                          {o.referencia && (
                            <div>
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopyText(o.referencia!, `ref-${o.id}`)
                                }
                                className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-mono text-[10px] border border-neutral-200 cursor-pointer"
                                title="Clic para copiar referencia de pago"
                              >
                                <span>REF: {o.referencia}</span>
                                {copiedId === `ref-${o.id}` ? (
                                  <Check className="h-2.5 w-2.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-2.5 w-2.5 opacity-50" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 7. Menú de Acciones */}
                      <td
                        className="py-3.5 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Popover
                          open={openMenuId === o.id}
                          onOpenChange={(open) => setOpenMenuId(open ? o.id : null)}
                        >
                          <PopoverTrigger className="inline-flex items-center justify-center h-8 w-8 p-0 rounded-xl hover:bg-neutral-200/70 cursor-pointer">
                            <MoreVertical className="h-4 w-4 text-neutral-600" />
                          </PopoverTrigger>
                          <PopoverContent
                            align="end"
                            className="w-60 p-1.5 rounded-2xl border border-neutral-200 shadow-xl bg-white space-y-0.5"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                setDetailOrder(o);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer text-left"
                            >
                              <Eye className="h-4 w-4 text-neutral-500" />
                              <span>Ver Detalles y Recibo / QR</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                setStatusModalOrder(o);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer text-left"
                            >
                              <Wrench className="h-4 w-4 text-neutral-500" />
                              <span>Cambiar Estado de Taller</span>
                            </button>

                            {!isCancelled && (!o.isEcf || Boolean(o.creditNoteNcf)) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  openTimbrarModal(o);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer text-left"
                              >
                                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                <span>Emitir Timbrado e-CF (EF2)</span>
                              </button>
                            )}

                            {o.pendingAmount > 0.01 && !isCancelled && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  openCobrarModal(o);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-900 hover:bg-amber-50 transition-colors cursor-pointer text-left"
                              >
                                <DollarSign className="h-4 w-4 text-amber-600" />
                                <span>Cobrar Saldo Pendiente</span>
                              </button>
                            )}

                            {o.source === "work_order" && o.workOrderId && !isCancelled && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  router.push(`/${tenant}/pos?orderId=${o.workOrderId}`);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer text-left"
                              >
                                <Receipt className="h-4 w-4 text-neutral-600" />
                                <span>Abrir en Punto de Venta (POS)</span>
                              </button>
                            )}

                            {o.pdfCloudUrl && (
                              <a
                                href={o.pdfCloudUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => setOpenMenuId(null)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer text-left"
                              >
                                <ExternalLink className="h-4 w-4 text-neutral-500" />
                                <span>Descargar PDF Fiscal EF2</span>
                              </a>
                            )}

                            {o.xmlCloudUrl && (
                              <a
                                href={o.xmlCloudUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => setOpenMenuId(null)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer text-left"
                              >
                                <FileCode2 className="h-4 w-4 text-neutral-500" />
                                <span>Descargar XML Firmado DGII</span>
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                handleShareWhatsApp(o);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer text-left"
                            >
                              <MessageSquare className="h-4 w-4 text-emerald-600" />
                              <span>Enviar Comprobante por WhatsApp</span>
                            </button>

                            {!isCancelled && (
                              <>
                                <div className="my-1 border-t border-neutral-100" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setNotaCreditoOrder(o);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer text-left"
                                >
                                  <RotateCcw className="h-4 w-4 text-rose-600" />
                                  <span>
                                    {o.isEcf
                                      ? "Emitir Nota de Crédito E34 / Anular"
                                      : "Anular Orden / Factura"}
                                  </span>
                                </button>
                              </>
                            )}
                          </PopoverContent>
                        </Popover>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer de Paginación */}
        {filteredOrders.length > 0 && (
          <div className="px-4 py-3 bg-neutral-50/70 border-t border-neutral-200/80 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-600">
            <span>
              Mostrando{" "}
              <strong>
                {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filteredOrders.length)}
              </strong>{" "}
              de <strong>{filteredOrders.length}</strong> órdenes
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 px-2.5 rounded-xl text-xs font-bold cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Anterior
              </Button>
              <span className="px-2.5 font-bold text-neutral-900">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 px-2.5 rounded-xl text-xs font-bold cursor-pointer"
              >
                Siguiente
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================
          MODAL 1: VISTA DETALLE DIVIDIDA (ESTILO KLYNN + TICKET / QR EN VIVO)
          ======================================================================== */}
      <Dialog
        open={Boolean(detailOrder)}
        onOpenChange={(o) => {
          if (!o) setDetailOrder(null);
        }}
      >
        <DialogContent className="sm:max-w-[1080px] w-[96vw] rounded-3xl p-0 bg-white overflow-hidden h-[88vh] max-h-[90vh] flex flex-col border border-neutral-200 shadow-2xl">
          {detailOrder && (
            <>
              {/* Barra Superior del Modal */}
              <div className="bg-neutral-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0 pr-8">
                  <div className="h-9 w-9 rounded-xl bg-amber-400 text-neutral-950 font-mono text-xs font-black flex items-center justify-center shrink-0">
                    {detailOrder.source === "invoice" ? "POS" : "OS"}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-base text-white">
                        Orden {detailOrder.numero}
                      </span>
                      {detailOrder.ncf && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                          {detailOrder.ncf}
                        </span>
                      )}
                      <span
                        className={cn(
                          "text-[10px] font-bold px-2.5 py-0.5 rounded-full border",
                          getWorkshopStatusConfig(detailOrder.workshopStatus).bg
                        )}
                      >
                        {getWorkshopStatusConfig(detailOrder.workshopStatus).label}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                      {detailOrder.customerName}{" "}
                      {detailOrder.vehicleLabel ? `• ${detailOrder.vehicleLabel}` : ""}{" "}
                      {detailOrder.vehiclePlate ? `[${detailOrder.vehiclePlate}]` : ""}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cuerpo Dividido: Izquierda (Gestión y Fiscal) / Derecha (Vista Previa Ticket 80mm / A4) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 overflow-hidden">
                {/* Columna Izquierda: Datos del Taller, Cliente, Fiscal y Estado */}
                <div className="lg:col-span-5 p-4 sm:p-5 overflow-y-auto space-y-4 border-b lg:border-b-0 lg:border-r border-neutral-200 bg-white">
                  {/* Tarjeta Cliente y Vehículo */}
                  <div className="rounded-2xl border border-neutral-200 p-3.5 space-y-2.5 bg-neutral-50/60">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                        Cliente y Vehículo
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        {new Date(detailOrder.createdAt).toLocaleString("es-DO")}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-black text-neutral-900">
                          {detailOrder.customerName}
                        </p>
                        {detailOrder.customerRnc && (
                          <p className="text-xs font-mono text-neutral-600">
                            RNC / Cédula: <strong>{detailOrder.customerRnc}</strong>
                          </p>
                        )}
                        {detailOrder.customerPhone && (
                          <p className="text-xs text-neutral-500">
                            Tel: {detailOrder.customerPhone}
                          </p>
                        )}
                      </div>
                      {detailOrder.vehiclePlate && (
                        <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-amber-100 text-amber-950 border border-amber-300">
                          {detailOrder.vehiclePlate}
                        </span>
                      )}
                    </div>

                    {detailOrder.vehicleLabel && (
                      <div className="pt-2 border-t border-neutral-200/70 flex items-center justify-between text-xs">
                        <span className="font-bold text-neutral-800 flex items-center gap-1.5">
                          <Car className="h-4 w-4 text-neutral-500" />
                          {detailOrder.vehicleLabel}
                        </span>
                        {detailOrder.mechanicName && (
                          <span className="text-neutral-500 flex items-center gap-1">
                            <Wrench className="h-3.5 w-3.5" />
                            {detailOrder.mechanicName}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selector Rápido de Estado del Taller (4 Pasos) */}
                  <div className="rounded-2xl border border-neutral-200 p-3.5 space-y-2.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block">
                      Estado Operativo en Taller
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {(
                        [
                          { id: "pending", label: "Pendiente" },
                          { id: "repairing", label: "En Taller" },
                          { id: "finished", label: "Finalizado" },
                          { id: "delivered", label: "Entregado" },
                        ] as const
                      ).map((step) => {
                        const isCurrent = detailOrder.workshopStatus === step.id;
                        return (
                          <button
                            key={step.id}
                            type="button"
                            onClick={() =>
                              handleUpdateWorkshopStatus(detailOrder, step.id)
                            }
                            className={cn(
                              "py-2 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer",
                              isCurrent
                                ? "bg-neutral-900 text-amber-400 border-neutral-900 shadow-2xs"
                                : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100"
                            )}
                          >
                            {step.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tarjeta Comprobante Fiscal Electrónico (DGII / EF2) */}
                  <div
                    className={cn(
                      "rounded-2xl border p-3.5 space-y-2.5",
                      detailOrder.isEcf
                        ? "border-emerald-200 bg-emerald-50/40"
                        : "border-neutral-200 bg-neutral-50/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        Facturación Electrónica DGII (EF2)
                      </span>
                      {detailOrder.ecfTypeLabel && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-emerald-800 border border-emerald-200">
                          {detailOrder.ecfTypeLabel}
                        </span>
                      )}
                    </div>

                    {detailOrder.ncf ? (
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-500">e-NCF:</span>
                          <span className="font-mono font-black text-neutral-900">
                            {detailOrder.ncf}
                          </span>
                        </div>
                        {detailOrder.securityCode && (
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-500">Código Seguridad DGII:</span>
                            <span className="font-mono font-bold text-emerald-700">
                              {detailOrder.securityCode}
                            </span>
                          </div>
                        )}
                        {detailOrder.signatureDate && (
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-500">Fecha de Firma:</span>
                            <span className="font-mono text-neutral-700">
                              {detailOrder.signatureDate}
                            </span>
                          </div>
                        )}

                        <div className="pt-1 flex items-center gap-2 flex-wrap">
                          {detailOrder.pdfCloudUrl && (
                            <a
                              href={detailOrder.pdfCloudUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-200 text-[11px] font-bold"
                            >
                              <ExternalLink className="h-3 w-3" />
                              PDF EF2
                            </a>
                          )}
                          {detailOrder.xmlCloudUrl && (
                            <a
                              href={detailOrder.xmlCloudUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-200 text-[11px] font-bold"
                            >
                              <FileCode2 className="h-3 w-3" />
                              XML Firmado
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <p className="text-xs text-neutral-500">
                          Esta orden aún no tiene un e-CF timbrado ante la DGII.
                        </p>
                        <Button
                          size="sm"
                          onClick={() => {
                            const target = detailOrder;
                            setDetailOrder(null);
                            openTimbrarModal(target);
                          }}
                          className="rounded-xl bg-neutral-900 hover:bg-neutral-800 text-amber-400 text-xs font-bold h-8 px-3 shrink-0 cursor-pointer"
                        >
                          <Sparkles className="h-3.5 w-3.5 mr-1" />
                          Timbrar e-CF
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Resumen Financiero */}
                  <div className="rounded-2xl border border-neutral-200 p-3.5 space-y-2">
                    <div className="flex justify-between text-xs text-neutral-600">
                      <span>Subtotal</span>
                      <span className="font-bold tabular-nums">
                        RD$ {detailOrder.subtotal.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-neutral-600">
                      <span>ITBIS (18%)</span>
                      <span className="font-bold tabular-nums">
                        RD$ {detailOrder.tax.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {detailOrder.discount > 0 && (
                      <div className="flex justify-between text-xs text-emerald-700">
                        <span>Descuento</span>
                        <span className="font-bold tabular-nums">
                          - RD$ {detailOrder.discount.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-neutral-200 flex justify-between text-sm font-black text-neutral-900">
                      <span>Total</span>
                      <span className="tabular-nums">
                        RD$ {detailOrder.total.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500">Pagado</span>
                      <span className="font-bold text-emerald-700 tabular-nums">
                        RD$ {detailOrder.paidAmount.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {detailOrder.pendingAmount > 0.01 && (
                      <div className="flex items-center justify-between pt-2 border-t border-rose-100">
                        <span className="text-xs font-bold text-rose-600">
                          Saldo Pendiente: RD${" "}
                          {detailOrder.pendingAmount.toLocaleString("es-DO", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => {
                            const target = detailOrder;
                            setDetailOrder(null);
                            openCobrarModal(target);
                          }}
                          className="rounded-xl bg-amber-400 hover:bg-amber-500 text-neutral-950 font-black text-xs h-8 px-3 cursor-pointer"
                        >
                          <DollarSign className="h-3.5 w-3.5 mr-1" />
                          Cobrar Saldo
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Columna Derecha: Vista Previa del Ticket / Factura A4 con QR DGII */}
                <div className="lg:col-span-7 bg-neutral-100 flex flex-col min-h-0">
                  <div className="p-3 bg-white border-b border-neutral-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-1 p-0.5 bg-neutral-100 rounded-xl border border-neutral-200">
                      <button
                        type="button"
                        onClick={() => setDetailPaperFormat("80mm")}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                          detailPaperFormat === "80mm"
                            ? "bg-white text-neutral-900 shadow-2xs"
                            : "text-neutral-500 hover:text-neutral-900"
                        )}
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        Ticket 80mm
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetailPaperFormat("A4")}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                          detailPaperFormat === "A4"
                            ? "bg-white text-neutral-900 shadow-2xs"
                            : "text-neutral-500 hover:text-neutral-900"
                        )}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Factura A4
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShareWhatsApp(detailOrder)}
                        className="rounded-xl border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold h-8 px-3 gap-1.5 cursor-pointer"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                        WhatsApp
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (!detailPrintRef.current) return;
                          printThermalDocument({
                            element: detailPrintRef.current,
                            title: `Orden_${detailOrder.numero}`,
                            paperSize: detailPaperFormat,
                          });
                        }}
                        className="rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold h-8 px-3.5 gap-1.5 cursor-pointer"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Imprimir ({detailPaperFormat})
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex justify-center items-start">
                    <div
                      ref={detailPrintRef}
                      className={cn(
                        "bg-white shadow-xl rounded-xl transition-all",
                        detailPaperFormat === "A4"
                          ? "w-full max-w-[820px] p-4 sm:p-6"
                          : "w-auto"
                      )}
                    >
                      <Ticket
                        invoiceId={detailOrder.numero}
                        ncf={detailOrder.ncf}
                        qrUrl={detailOrder.qrUrl}
                        securityCode={detailOrder.securityCode}
                        signatureDate={detailOrder.signatureDate}
                        createdAt={detailOrder.createdAt}
                        tenant={{
                          nombre: currentTenant?.name || "ServiTracks",
                          name: currentTenant?.name || "ServiTracks",
                          logo: currentTenant?.logo,
                          logo_url: currentTenant?.logo,
                          direccion: currentTenant?.address,
                          address: currentTenant?.address,
                          telefono: currentTenant?.phone,
                          phone: currentTenant?.phone,
                          rnc: currentTenant?.rnc,
                        }}
                        customer={{
                          nombre: detailOrder.customerName,
                          name: detailOrder.customerName,
                          telefono: detailOrder.customerPhone,
                          phone: detailOrder.customerPhone,
                          rnc: detailOrder.customerRnc,
                          cedula: detailOrder.customerRnc,
                        }}
                        items={detailOrder.items.map((it) => ({
                          id: it.id,
                          name: it.name,
                          descripcion: it.name,
                          quantity: it.quantity,
                          cantidad: it.quantity,
                          unitPrice: it.unitPrice,
                          precio_unitario: it.unitPrice,
                          salePrice: it.unitPrice,
                          tax: it.tax,
                          is_exento: it.tax === 0,
                          total: it.quantity * it.unitPrice,
                        }))}
                        subtotal={detailOrder.subtotal}
                        itbis={detailOrder.tax}
                        discount={detailOrder.discount}
                        total={detailOrder.total}
                        payMethod={detailOrder.paymentMethod}
                        notes={detailOrder.notesText}
                        formato={detailPaperFormat}
                        orden={{
                          numero: detailOrder.ncf || detailOrder.numero,
                          creado_en: detailOrder.createdAt,
                          subtotal: detailOrder.subtotal,
                          itbis: detailOrder.tax,
                          descuento: detailOrder.discount,
                          total: detailOrder.total,
                          saldo: detailOrder.pendingAmount,
                          pagado: detailOrder.paidAmount,
                          metodo_pago: detailOrder.paymentMethod,
                          pago_referencia: detailOrder.referencia,
                          notas: detailOrder.notesText,
                          items: detailOrder.items.map((it) => ({
                            id: it.id,
                            name: it.name,
                            descripcion: it.name,
                            quantity: it.quantity,
                            cantidad: it.quantity,
                            unitPrice: it.unitPrice,
                            precio_unitario: it.unitPrice,
                            salePrice: it.unitPrice,
                            tax: it.tax,
                            is_exento: it.tax === 0,
                            total: it.quantity * it.unitPrice,
                          })),
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================
          MODAL 2: CAMBIAR ESTADO DE TALLER + ACCIONES RÁPIDAS
          ======================================================================== */}
      <Dialog
        open={Boolean(statusModalOrder)}
        onOpenChange={(o) => {
          if (!o) setStatusModalOrder(null);
        }}
      >
        <DialogContent className="sm:max-w-[520px] rounded-3xl p-5 bg-white border border-neutral-200 shadow-2xl">
          {statusModalOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-black text-neutral-900 uppercase">
                  Estado Operativo — Orden {statusModalOrder.numero}
                </DialogTitle>
                <DialogDescription className="text-xs text-neutral-500">
                  {statusModalOrder.customerName}{" "}
                  {statusModalOrder.vehicleLabel
                    ? `• ${statusModalOrder.vehicleLabel}`
                    : ""}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-2.5 my-3">
                {(
                  [
                    {
                      id: "pending",
                      label: "Pendiente",
                      desc: "Recibido en recepción",
                    },
                    {
                      id: "diagnosing",
                      label: "En Diagnóstico",
                      desc: "Evaluación técnica",
                    },
                    {
                      id: "repairing",
                      label: "En Reparación",
                      desc: "Trabajo en rampa / bahía",
                    },
                    {
                      id: "waiting_parts",
                      label: "Esperando Piezas",
                      desc: "Pendiente de repuestos",
                    },
                    {
                      id: "finished",
                      label: "Listo / Finalizado",
                      desc: "Listo para entregar",
                    },
                    {
                      id: "delivered",
                      label: "Vehículo Entregado",
                      desc: "Retirado por el cliente",
                    },
                  ] as const
                ).map((st) => {
                  const active = statusModalOrder.workshopStatus === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() =>
                        handleUpdateWorkshopStatus(statusModalOrder, st.id)
                      }
                      className={cn(
                        "p-3 rounded-2xl border text-left transition-all cursor-pointer",
                        active
                          ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                          : "bg-neutral-50/80 hover:bg-neutral-100 text-neutral-900 border-neutral-200"
                      )}
                    >
                      <div className="font-black text-xs">{st.label}</div>
                      <div
                        className={cn(
                          "text-[10px] mt-0.5",
                          active ? "text-neutral-300" : "text-neutral-500"
                        )}
                      >
                        {st.desc}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-2">
                {(!statusModalOrder.isEcf || Boolean(statusModalOrder.creditNoteNcf)) ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const target = statusModalOrder;
                      setStatusModalOrder(null);
                      openTimbrarModal(target);
                    }}
                    className="rounded-xl text-xs font-bold h-9 gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Timbrar e-CF</span>
                  </Button>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Timbrado: {statusModalOrder.ncf}</span>
                  </div>
                )}

                {statusModalOrder.pendingAmount > 0.01 && (
                  <Button
                    size="sm"
                    onClick={() => {
                      const target = statusModalOrder;
                      setStatusModalOrder(null);
                      openCobrarModal(target);
                    }}
                    className="rounded-xl bg-amber-400 hover:bg-amber-500 text-neutral-950 font-black text-xs h-9 gap-1 cursor-pointer"
                  >
                    <DollarSign className="h-3.5 w-3.5" />
                    <span>Cobrar Saldo</span>
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusModalOrder(null)}
                  className="rounded-xl text-xs font-bold h-9 cursor-pointer"
                >
                  Cerrar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================
          MODAL 3: TIMBRAR / EMITIR COMPROBANTE FISCAL ELECTRÓNICO (EF2)
          ======================================================================== */}
      <Dialog
        open={Boolean(timbrarModalOrder)}
        onOpenChange={(o) => {
          if (!o && !isSubmittingEcf) setTimbrarModalOrder(null);
        }}
      >
        <DialogContent className="sm:max-w-[500px] rounded-3xl p-5 bg-white border border-neutral-200 shadow-2xl">
          {timbrarModalOrder && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-black text-neutral-900 uppercase">
                      Emitir Comprobante e-CF (EF2 / DGII)
                    </DialogTitle>
                    <DialogDescription className="text-xs text-neutral-500">
                      Orden {timbrarModalOrder.numero} • Total RD${" "}
                      {timbrarModalOrder.total.toLocaleString("es-DO", {
                        minimumFractionDigits: 2,
                      })}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-3.5 my-3">
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1.5">
                    Tipo de Comprobante Electrónico (e-CF)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        code: "32",
                        title: "E32 • Consumo",
                        desc: "Cliente final / sin RNC obligatorio",
                      },
                      {
                        code: "31",
                        title: "E31 • Crédito Fiscal",
                        desc: "Empresas (Requiere RNC/Cédula)",
                      },
                      {
                        code: "44",
                        title: "E44 • Reg. Especial",
                        desc: "Exento de ITBIS (Zonas Francas, etc.)",
                      },
                      {
                        code: "45",
                        title: "E45 • Gubernamental",
                        desc: "Instituciones del Estado",
                      },
                    ].map((t) => (
                      <button
                        key={t.code}
                        type="button"
                        onClick={() => setTimbrarTipoEcf(t.code as any)}
                        className={cn(
                          "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                          timbrarTipoEcf === t.code
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                            : "bg-neutral-50 hover:bg-neutral-100 text-neutral-900 border-neutral-200"
                        )}
                      >
                        <div className="text-xs font-black">{t.title}</div>
                        <div
                          className={cn(
                            "text-[10px] mt-0.5",
                            timbrarTipoEcf === t.code
                              ? "text-emerald-100"
                              : "text-neutral-500"
                          )}
                        >
                          {t.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="text-xs font-bold text-neutral-700 block mb-1">
                      RNC o Cédula del Comprador{" "}
                      {timbrarTipoEcf !== "32" && (
                        <span className="text-rose-600">* Obligatorio</span>
                      )}
                    </label>
                    <Input
                      value={timbrarBuyerRnc}
                      onChange={(e) => setTimbrarBuyerRnc(e.target.value)}
                      placeholder="Ej: 131000000 (9 dígitos) o Cédula (11 dígitos)"
                      className="rounded-xl h-10 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-neutral-700 block mb-1">
                      Nombre o Razón Social del Comprador
                    </label>
                    <Input
                      value={timbrarBuyerName}
                      onChange={(e) => setTimbrarBuyerName(e.target.value)}
                      placeholder="Nombre del cliente o empresa"
                      className="rounded-xl h-10 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={isSubmittingEcf}
                  onClick={() => setTimbrarModalOrder(null)}
                  className="rounded-xl text-xs font-bold h-9 cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  disabled={isSubmittingEcf}
                  onClick={handleEmitirEcf}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black h-9 px-4 gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>
                    {isSubmittingEcf
                      ? "Timbrando ante EF2..."
                      : `Timbrar E${timbrarTipoEcf} Ahora`}
                  </span>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================
          MODAL 4: COBRAR SALDO PENDIENTE
          ======================================================================== */}
      <Dialog
        open={Boolean(cobrarModalOrder)}
        onOpenChange={(o) => {
          if (!o) setCobrarModalOrder(null);
        }}
      >
        <DialogContent className="sm:max-w-[460px] rounded-3xl p-5 bg-white border border-neutral-200 shadow-2xl">
          {cobrarModalOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-black text-neutral-900 uppercase">
                  Registrar Cobro — Orden {cobrarModalOrder.numero}
                </DialogTitle>
                <DialogDescription className="text-xs text-neutral-500">
                  Cliente: <strong>{cobrarModalOrder.customerName}</strong> • Saldo
                  Pendiente:{" "}
                  <strong className="text-rose-600">
                    RD${" "}
                    {cobrarModalOrder.pendingAmount.toLocaleString("es-DO", {
                      minimumFractionDigits: 2,
                    })}
                  </strong>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 my-3">
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1.5">
                    Método de Pago
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: "EFECTIVO", label: "Efectivo", icon: Banknote },
                        { id: "TARJETA", label: "Tarjeta", icon: CreditCard },
                        {
                          id: "TRANSFERENCIA",
                          label: "Transferencia",
                          icon: ArrowRightLeft,
                        },
                      ] as const
                    ).map((m) => {
                      const Icon = m.icon;
                      const active = cobrarMetodo === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setCobrarMetodo(m.id)}
                          className={cn(
                            "p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 transition-all cursor-pointer",
                            active
                              ? "bg-neutral-900 text-amber-400 border-neutral-900 font-black"
                              : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100 font-bold"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="text-[11px]">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    Monto a Cobrar (RD$)
                  </label>
                  <Input
                    type="number"
                    value={cobrarMonto}
                    onChange={(e) => setCobrarMonto(e.target.value)}
                    className="rounded-xl h-10 text-sm font-black tabular-nums"
                  />
                </div>

                {cobrarMetodo === "EFECTIVO" ? (
                  <div>
                    <label className="text-xs font-bold text-neutral-700 block mb-1">
                      Efectivo Recibido del Cliente (RD$)
                    </label>
                    <Input
                      type="number"
                      value={cobrarEfectivoRecibido}
                      onChange={(e) => setCobrarEfectivoRecibido(e.target.value)}
                      className="rounded-xl h-10 text-sm font-bold tabular-nums"
                    />
                    {Number(cobrarEfectivoRecibido) > Number(cobrarMonto) && (
                      <p className="text-xs font-black text-emerald-700 mt-1.5">
                        Devuelta / Cambio: RD${" "}
                        {(
                          Number(cobrarEfectivoRecibido) - Number(cobrarMonto)
                        ).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-bold text-neutral-700 block mb-1">
                      Número de Referencia / Voucher
                    </label>
                    <Input
                      value={cobrarReferencia}
                      onChange={(e) => setCobrarReferencia(e.target.value)}
                      placeholder="Ej: AUTH-94821 o # de transferencia"
                      className="rounded-xl h-10 text-xs font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCobrarModalOrder(null)}
                  className="rounded-xl text-xs font-bold h-9 cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmCobro}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black h-9 px-4 gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Confirmar Cobro</span>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================
          MODAL 5: NOTA DE CRÉDITO ELECTRÓNICA (E34) / ANULACIÓN
          ======================================================================== */}
      <Dialog
        open={Boolean(notaCreditoOrder)}
        onOpenChange={(o) => {
          if (!o && !isSubmittingNotaCredito) setNotaCreditoOrder(null);
        }}
      >
        <DialogContent className="sm:max-w-[480px] rounded-3xl p-5 bg-white border border-neutral-200 shadow-2xl">
          {notaCreditoOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-black text-rose-700 uppercase">
                  {notaCreditoOrder.isEcf
                    ? "Emitir Nota de Crédito E34 y Anular"
                    : "Anular Orden / Factura"}
                </DialogTitle>
                <DialogDescription className="text-xs text-neutral-500">
                  Orden {notaCreditoOrder.numero}{" "}
                  {notaCreditoOrder.ncf ? `• NCF Original: ${notaCreditoOrder.ncf}` : ""}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 my-3">
                {notaCreditoOrder.isEcf && (
                  <div>
                    <label className="text-xs font-bold text-neutral-700 block mb-1">
                      Código de Modificación DGII
                    </label>
                    <Select
                      value={String(notaCreditoCode)}
                      onValueChange={(v) => setNotaCreditoCode(Number(v))}
                    >
                      <SelectTrigger className="rounded-xl h-10 text-xs font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">
                          1 — Anula el NCF modificado por completo
                        </SelectItem>
                        <SelectItem value="2">
                          2 — Corrige texto del comprobante fiscal
                        </SelectItem>
                        <SelectItem value="3">
                          3 — Corrige montos del NCF modificado
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    Motivo de Anulación / Nota de Crédito
                  </label>
                  <Input
                    value={notaCreditoMotivo}
                    onChange={(e) => setNotaCreditoMotivo(e.target.value)}
                    placeholder="Describe la razón de la anulación"
                    className="rounded-xl h-10 text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={isSubmittingNotaCredito}
                  onClick={() => setNotaCreditoOrder(null)}
                  className="rounded-xl text-xs font-bold h-9 cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  disabled={isSubmittingNotaCredito}
                  onClick={handleEmitirNotaCredito}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black h-9 px-4 gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>
                    {isSubmittingNotaCredito
                      ? "Procesando E34..."
                      : notaCreditoOrder.isEcf
                      ? "Emitir E34 y Anular"
                      : "Confirmar Anulación"}
                  </span>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================
          MODAL 6: RANGO DE FECHAS PERSONALIZADO
          ======================================================================== */}
      <Dialog
        open={isCustomDateModalOpen}
        onOpenChange={setIsCustomDateModalOpen}
      >
        <DialogContent className="sm:max-w-[420px] rounded-3xl p-5 bg-white border border-neutral-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-neutral-900 uppercase">
              Filtrar por Rango de Fechas
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Selecciona la fecha inicial y final para consultar las órdenes del taller
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 my-3">
            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1">
                Desde
              </label>
              <Input
                type="date"
                value={customFechaDesde}
                onChange={(e) => setCustomFechaDesde(e.target.value)}
                className="rounded-xl h-10 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1">
                Hasta
              </label>
              <Input
                type="date"
                value={customFechaHasta}
                onChange={(e) => setCustomFechaHasta(e.target.value)}
                className="rounded-xl h-10 text-xs"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCustomDateModalOpen(false)}
              className="rounded-xl text-xs font-bold h-9 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setPeriodoCreacion("personalizado");
                setCurrentPage(1);
                setIsCustomDateModalOpen(false);
              }}
              className="rounded-xl bg-neutral-900 hover:bg-neutral-800 text-amber-400 text-xs font-black h-9 px-4 cursor-pointer"
            >
              Aplicar Rango
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
