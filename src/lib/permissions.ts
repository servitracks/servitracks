import type { Tenant, Plan, PlanModulos } from "@/store/types";
import { isFeatureAllowed, getTenantPlan } from "@/lib/plans";

export type ModuleKey = keyof PlanModulos | "whatsapp" | "facturacion_fiscal" | "multisucursal" | "nomina_comisiones" | "inspecciones_mpi" | "proveedores_cuentas" | "inventario_avanzado";

export function isModuleEnabled(
  tenant: Tenant | null | undefined,
  moduleKey: ModuleKey,
  plan?: Plan | null
): boolean {
  if (!tenant) return false;

  // 1. Verificar Override manual del Superadmin
  const override = (tenant.config?.modulos_override as any)?.[moduleKey];
  if (override !== undefined && override !== null) {
    return Boolean(override);
  }

  // 2. Verificar en el Plan provisto o en el Plan del Tenant
  const activePlan = plan || getTenantPlan(tenant);
  if (activePlan && activePlan.modulos && (activePlan.modulos as any)[moduleKey] !== undefined) {
    return Boolean((activePlan.modulos as any)[moduleKey]);
  }

  // 3. Fallbacks coherentes para taller mecánico:
  // WhatsApp básico siempre habilitado para comunicación con clientes
  if (moduleKey === "whatsapp") return true;

  return false;
}
