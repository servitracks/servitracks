import type { Plan, PlanId, Tenant, PlanModulos } from "@/store/types";
import { useStore } from "@/store/useStore";

// ════════════════════════════════════════════════════════════════════════════════
// PLANES OFICIALES POR DEFECTO PARA TALLERES AUTOMOTRICES (SERVITRACKS)
// ════════════════════════════════════════════════════════════════════════════════

export const DEFAULT_PLANS: Plan[] = [
  {
    id: "basico",
    nombre: "Taller Emprendedor",
    precio_mensual: 1490,
    precio_anual: 14900,
    limite_empleados: 3,
    limite_ordenes_mes: 100,
    limite_whatsapp_mes: 500,
    limite_sucursales: 1,
    precio_sucursal_adicional: 1200,
    modulos: {
      whatsapp: true,
      facturacion_fiscal: false,
      multisucursal: false,
      nomina_comisiones: false,
      inspecciones_mpi: false,
      proveedores_cuentas: false,
      inventario_avanzado: false,
    },
    destacado: false,
    polar_product_monthly_url: "",
    polar_product_yearly_url: "",
  },
  {
    id: "pro",
    nombre: "Taller Profesional",
    precio_mensual: 2990,
    precio_anual: 29900,
    limite_empleados: 10,
    limite_ordenes_mes: null, // Ilimitadas
    limite_whatsapp_mes: 2500,
    limite_sucursales: 2,
    precio_sucursal_adicional: 1000,
    modulos: {
      whatsapp: true,
      facturacion_fiscal: true,
      multisucursal: true,
      nomina_comisiones: true,
      inspecciones_mpi: true,
      proveedores_cuentas: true,
      inventario_avanzado: true,
    },
    destacado: true,
    polar_product_monthly_url: "",
    polar_product_yearly_url: "",
  },
  {
    id: "enterprise",
    nombre: "Red de Talleres & Concesionarios",
    precio_mensual: 5990,
    precio_anual: 59900,
    limite_empleados: null, // Ilimitados
    limite_ordenes_mes: null, // Ilimitadas
    limite_whatsapp_mes: null, // Ilimitados
    limite_sucursales: null, // Ilimitadas
    precio_sucursal_adicional: 0,
    modulos: {
      whatsapp: true,
      facturacion_fiscal: true,
      multisucursal: true,
      nomina_comisiones: true,
      inspecciones_mpi: true,
      proveedores_cuentas: true,
      inventario_avanzado: true,
    },
    destacado: false,
    polar_product_monthly_url: "",
    polar_product_yearly_url: "",
  },
];

/**
 * Obtiene el plan asignado a un taller (o el plan básico como fallback)
 */
export function getTenantPlan(tenant: Tenant | null | undefined, customPlans?: Plan[]): Plan {
  const plansPool = (customPlans && customPlans.length > 0) 
    ? customPlans 
    : (useStore.getState().plans?.length > 0 ? useStore.getState().plans : DEFAULT_PLANS);

  if (!tenant || !tenant.plan_id) {
    return plansPool.find((p) => p.id === "basico") || DEFAULT_PLANS[0];
  }

  const normalizedPlanId = tenant.plan_id.toLowerCase().trim();
  const matched = plansPool.find((p) => p.id.toLowerCase() === normalizedPlanId);

  if (matched) return matched;
  return plansPool.find((p) => p.id === "basico") || DEFAULT_PLANS[0];
}

/**
 * Verifica si un módulo específico está habilitado para el taller (revisando overrides primero)
 */
export function isFeatureAllowed(
  tenant: Tenant | null | undefined,
  moduleKey: keyof PlanModulos,
  customPlans?: Plan[]
): boolean {
  if (!tenant) return false;

  // 1. Overrides manuales asignados por el Super Administrador
  const override = tenant.config?.modulos_override?.[moduleKey];
  if (override !== undefined && override !== null) {
    return Boolean(override);
  }

  // 2. Regla según el Plan del taller
  const plan = getTenantPlan(tenant, customPlans);
  if (plan && plan.modulos && plan.modulos[moduleKey] !== undefined) {
    return Boolean(plan.modulos[moduleKey]);
  }

  // Fallback seguro: básico siempre incluye POS, WhatsApp básico y gestión de taller
  if (moduleKey === "whatsapp") return true;
  return false;
}

/**
 * Valida si el taller puede añadir más elementos según el límite de su plan
 */
export function checkTenantLimit(
  tenant: Tenant | null | undefined,
  limitKey: "limite_empleados" | "limite_sucursales" | "limite_ordenes_mes" | "limite_whatsapp_mes",
  currentCount: number,
  customPlans?: Plan[]
): { allowed: boolean; limit: number | null; current: number; message?: string } {
  if (!tenant) return { allowed: false, limit: 0, current: currentCount, message: "Taller no identificado" };

  const plan = getTenantPlan(tenant, customPlans);
  
  // Para sucursales, si el tenant tiene un max_sucursales explícito, se respeta ese valor
  let maxAllowed = plan[limitKey];
  if (limitKey === "limite_sucursales" && tenant.max_sucursales) {
    maxAllowed = tenant.max_sucursales;
  }

  if (maxAllowed === null || maxAllowed === undefined) {
    return { allowed: true, limit: null, current: currentCount };
  }

  if (currentCount >= maxAllowed) {
    const labels: Record<string, string> = {
      limite_empleados: "empleados/técnicos",
      limite_sucursales: "sucursales",
      limite_ordenes_mes: "órdenes de trabajo mensuales",
      limite_whatsapp_mes: "mensajes de WhatsApp",
    };

    return {
      allowed: false,
      limit: maxAllowed,
      current: currentCount,
      message: `Has alcanzado el límite máximo de ${maxAllowed} ${labels[limitKey] || 'elementos'} permitidos en tu Plan ${plan.nombre}. Actualiza tu plan para desbloquear más capacidad.`,
    };
  }

  return { allowed: true, limit: maxAllowed, current: currentCount };
}

/**
 * Convierte un URL o Product ID de Polar en un enlace de checkout web válido
 */
export function formatPolarUrl(rawUrl?: string | null): string | null {
  if (!rawUrl || !rawUrl.trim()) return null;
  const clean = rawUrl.trim();
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    return clean;
  }
  // Si es un UUID de producto de Polar o un checkout ID de Polar
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean) || clean.startsWith("polar_")) {
    return `https://buy.polar.sh/${clean}`;
  }
  return `https://${clean}`;
}

