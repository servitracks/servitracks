import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRD(value: number): string {
  return `RD$ ${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0)}`;
}

/** Parse formatted currency strings like "1,000.50" into a standard numeric float. */
export function parseAmount(raw: string): number {
  const cleaned = (raw || "").replace(/[^\d.]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Formats user input with comma thousands separators while preserving typing state and decimals. */
export function formatAmountInput(raw: string): string {
  const cleaned = (raw || "").replace(/[^\d.]/g, "");
  if (!cleaned) return "";
  const parts = cleaned.split(".");
  const intPart = parts[0].replace(/^0+(?=\d)/, "");
  const intFmt = new Intl.NumberFormat("en-US").format(Number(intPart || "0"));
  if (parts.length === 1) return intFmt;
  const dec = parts.slice(1).join("").slice(0, 2);
  return `${intFmt}.${dec}`;
}

/**
 * Determina si un artículo de factura o carrito es un SERVICIO o mano de obra
 * para aplicar comisiones únicamente a servicios y NADA a productos/inventario.
 */
export function isServiceItem(
  item: {
    id?: string;
    sku?: string;
    category?: string;
    name?: string;
    serviceId?: string;
    productId?: string;
    laborPrice?: number;
  },
  services: { id: string; name?: string; laborPrice?: number }[] = []
): boolean {
  if (!item) return false;
  if (item.serviceId) return true;
  if (item.category === "Servicios") return true;
  if (item.sku?.startsWith("SRV-")) return true;
  if (item.sku === "MANO-OBRA") return true;
  if (item.id?.startsWith("labor-")) return true;
  if (item.name?.toLowerCase().includes("mano de obra")) return true;
  if (!item.productId && typeof item.laborPrice === "number" && item.laborPrice > 0) return true;
  if (item.id?.startsWith("s") && !item.id?.startsWith("sku") && !item.id?.startsWith("sup")) {
    if (/^s\d+/.test(item.id)) return true;
  }
  if (services && services.length > 0) {
    if (
      services.some(
        (s) =>
          s.id === item.id ||
          s.id === item.serviceId ||
          (item.name && s.name && s.name.toLowerCase().trim() === item.name.toLowerCase().trim())
      )
    ) {
      return true;
    }
  }
  return false;
}

export interface InvoiceCommissionBreakdown {
  servicesBaseTotal: number;
  comisionTotal: number;
  manoObraTotal: number;
  totalFila: number;
  nombresAplicables: string[];
  esquemaLabel: string;
}

/**
 * Calcula de forma unificada y exacta la comisión de un técnico sobre los servicios
 * y mano de obra de una factura, respetando siempre el porcentaje (%) o monto fijo (RD$)
 * configurado en el perfil del técnico.
 */
export function calculateInvoiceCommission(
  inv: { items?: any[] },
  tech: { pagoNomina?: number; tipoPago?: "porcentaje" | "fijo" } | null | undefined,
  services: { id: string; name?: string; laborPrice?: number }[] = []
): InvoiceCommissionBreakdown {
  let servicesBaseTotal = 0;
  let comisionTotal = 0;
  let manoObraTotal = 0;
  const nombresAplicables: string[] = [];

  const pctOrFixed = Number(tech?.pagoNomina || 0);
  const tipoPago = tech?.tipoPago || "porcentaje";
  const esquemaLabel =
    pctOrFixed > 0
      ? tipoPago === "fijo"
        ? `Fijo ${formatRD(pctOrFixed)}`
        : `${pctOrFixed}%`
      : "100% M.O.";

  (inv.items || []).forEach((item) => {
    if (!item) return;
    if (!isServiceItem(item, services)) return;

    const matchedService = services.find(
      (s) =>
        s.id === item.serviceId ||
        s.id === item.id ||
        (item.name && s.name && s.name.toLowerCase().trim() === item.name.toLowerCase().trim())
    );

    const isManoObra = Boolean(
      !matchedService &&
        ((item.id && String(item.id).startsWith("labor-")) ||
          (item.serviceId && String(item.serviceId).startsWith("labor-")) ||
          item.sku === "MANO-OBRA" ||
          (item.name && String(item.name).toLowerCase().includes("mano de obra")))
    );

    const qty = Math.max(1, Number(item.quantity || 1));
    const unitPrice = Number(item.unitPrice ?? item.salePrice ?? item.price ?? 0);
    const itemBaseSubtotal = unitPrice * qty;
    servicesBaseTotal += itemBaseSubtotal;

    let itemGain = 0;

    if (pctOrFixed > 0 && tipoPago === "porcentaje") {
      const baseForPct = itemBaseSubtotal > 0 ? itemBaseSubtotal : Number(item.laborPrice || 0) * qty;
      itemGain = Math.round(((baseForPct * pctOrFixed) / 100) * 100) / 100;
    } else if (pctOrFixed > 0 && tipoPago === "fijo") {
      itemGain = Math.round(pctOrFixed * qty * 100) / 100;
    } else {
      // Técnico sin porcentaje configurado: usar laborPrice del servicio o 100% en mano de obra directa
      if (isManoObra) {
        const rawLabor = Number(item.laborPrice ?? unitPrice ?? 0);
        itemGain = Math.round(rawLabor * qty * 100) / 100;
      } else {
        let safeLabor = Number(item.laborPrice ?? matchedService?.laborPrice ?? 0);
        if (unitPrice > 0 && safeLabor > unitPrice) {
          safeLabor = safeLabor / 100;
        }
        itemGain = Math.round(safeLabor * qty * 100) / 100;
      }
    }

    if (itemGain > 0 || itemBaseSubtotal > 0) {
      if (item.name) nombresAplicables.push(item.name);
    }

    if (isManoObra) {
      manoObraTotal += itemGain;
    } else {
      comisionTotal += itemGain;
    }
  });

  comisionTotal = Math.round(comisionTotal * 100) / 100;
  manoObraTotal = Math.round(manoObraTotal * 100) / 100;
  const totalFila = Math.round((comisionTotal + manoObraTotal) * 100) / 100;

  return {
    servicesBaseTotal: Math.round(servicesBaseTotal * 100) / 100,
    comisionTotal,
    manoObraTotal,
    totalFila,
    nombresAplicables,
    esquemaLabel,
  };
}

