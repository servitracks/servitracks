import { Tenant, Plan } from '@/store/types';

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

  // 2. SEGUNDO (Fallback): Si no hay override, usa la regla por defecto de su plan
  // En un caso real, el plan debería estar cargado en memoria o pasarse como argumento.
  if (plan) {
    return !!plan.modulos?.[moduleKey];
  }

  // Si no tenemos el plan a mano, por seguridad retornamos falso, 
  // o podemos asumir que 'procesos' y 'whatsapp' son true en básico según el schema de planes
  if (moduleKey === 'procesos' || moduleKey === 'whatsapp') {
    return true; // Comportamiento default del plan básico
  }

  return false;
}
