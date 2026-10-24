import { Tenant, Plan } from '@/store/types';
import { useStore } from '@/store/useStore';

export function isModuleEnabled(
  tenant: Tenant | null,
  moduleKey: 'whatsapp' | 'facturacion_fiscal' | 'multisucursal' | 'logistica' | 'procesos',
  plan?: Plan | null
): boolean {
  if (!tenant) return false;

  // 1. PRIMERO verifica si el Super Admin forzó un Override para este negocio
  const override = tenant.config?.modulos_override?.[moduleKey];
  if (override !== undefined) {
    return override; // Retorna true/false directo del negocio
  }

  // 2. SEGUNDO: Si se pasó el plan como argumento, usarlo directamente
  if (plan) {
    return !!plan.modulos?.[moduleKey];
  }

  // 3. TERCERO: Resolver el plan del tenant desde el store global
  try {
    const state = useStore.getState();
    const resolvedPlan = state.plans?.find(p => p.id === tenant.plan_id);
    if (resolvedPlan?.modulos?.[moduleKey] !== undefined) {
      return !!resolvedPlan.modulos[moduleKey];
    }
  } catch {
    // Si no está listo el store, continuar con defaults seguros
  }

  // Defaults según el plan_id si aún no se han cargado los planes
  if (tenant.plan_id === 'enterprise' || tenant.plan_id === 'premium') {
    return true;
  }

  if (tenant.plan_id === 'pro') {
    if (moduleKey === 'multisucursal' || moduleKey === 'logistica') return false;
    return true; // whatsapp, facturacion_fiscal, procesos
  }

  // Plan basico por defecto: sólo whatsapp y procesos
  if (moduleKey === 'procesos' || moduleKey === 'whatsapp') {
    return true;
  }

  return false;
}
