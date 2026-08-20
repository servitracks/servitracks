import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRD(value: number): string {
  return `RD$ ${value.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Determina si un artículo de factura o carrito es un SERVICIO o mano de obra
 * para aplicar comisiones únicamente a servicios y NADA a productos/inventario.
 */
export function isServiceItem(
  item: { id?: string; sku?: string; category?: string; name?: string; serviceId?: string; productId?: string },
  services: { id: string; name?: string }[] = []
): boolean {
  if (!item) return false;
  if (item.serviceId) return true;
  if (item.category === "Servicios") return true;
  if (item.sku?.startsWith("SRV-")) return true;
  if (item.sku === "MANO-OBRA") return true;
  if (item.id?.startsWith("labor-")) return true;
  if (item.name?.toLowerCase() === "mano de obra") return true;
  if (item.id?.startsWith("s") && !item.id?.startsWith("sku") && !item.id?.startsWith("sup")) {
    if (/^s\d+/.test(item.id)) return true;
  }
  if (services && services.length > 0) {
    if (services.some(s => s.id === item.id || s.id === item.serviceId || (item.name && s.name && s.name.toLowerCase() === item.name.toLowerCase()))) {
      return true;
    }
  }
  return false;
}

