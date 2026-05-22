import { useStore } from "@/store/useStore";
import type { Plan, PlanId, Tenant, GlobalConfig, LicenciaLocal, BankDetails } from "@/store/types";

export type { Plan, PlanId, Tenant, GlobalConfig, LicenciaLocal, BankDetails };

export const ADMIN_EMAILS = ["admin@servitracks.com", "admin@klynn.com"];

export async function getTenants() {
  return useStore.getState().tenants;
}

export async function deleteTenant(id: string) {
  useStore.getState().deleteTenant(id);
}

export async function getPlans() {
  return useStore.getState().plans;
}

export async function getOrdenes(tenantId: string) {
  const orders = useStore.getState().orders;
  return orders.filter(o => o.tenantId === tenantId);
}

export function formatRD(amount: number) {
  return `RD$ ${amount.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function setActiveTenant(slug: string) {
  const tenant = useStore.getState().tenants.find(t => t.slug === slug) || null;
  useStore.getState().setCurrentTenant(tenant);
}

export function setSession(session: any) {
  localStorage.setItem("servitracks-session", JSON.stringify(session));
}

export function logout() {
  localStorage.removeItem("servitracks-session");
  useStore.getState().setCurrentTenant(null);
}

export async function savePlan(plan: Plan) {
  const exists = useStore.getState().plans.some(p => p.id === plan.id);
  if (exists) {
    useStore.getState().updatePlan(plan.id, plan);
  } else {
    useStore.getState().addPlan(plan);
  }
}

export async function deletePlan(id: string) {
  useStore.getState().deletePlan(id);
}

export async function updateTenantAdmin(id: string, email: string, password?: string) {
  useStore.getState().updateTenant(id, { email });
  
  // También actualizamos el correo del usuario administrador asociado
  const state = useStore.getState();
  const owner = state.users.find(u => u.tenantId === id && u.role === 'owner');
  if (owner) {
    state.updateUser(owner.id, { email });
  }
}

export async function updateTenantPlan(id: string, planId: string) {
  useStore.getState().updateTenant(id, { plan_id: planId });
}

export async function updateTenantStatus(id: string, status: any) {
  useStore.getState().updateTenant(id, { 
    estado: status, 
    status: status === 'ACTIVO' || status === 'TRIAL' ? 'active' : 'suspended' 
  });
}

export async function getGlobalConfig() {
  return useStore.getState().globalConfig;
}

export async function saveGlobalConfig(config: GlobalConfig) {
  useStore.getState().setGlobalConfig(config);
}

export function formatCedulaRD(val: string) {
  const cleaned = val.replace(/\D/g, "");
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 10) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 10)}-${cleaned.slice(10, 11)}`;
}

export async function getLicenciasLocales() {
  return useStore.getState().licencias;
}

export async function createLicenciaLocal(lic: Omit<LicenciaLocal, "id">) {
  const newLic: LicenciaLocal = {
    ...lic,
    id: "lic_" + Math.random().toString(36).substr(2, 9)
  };
  useStore.getState().addLicencia(newLic);
}

export async function updateLicenciaLocal(id: string, updates: Partial<LicenciaLocal>) {
  useStore.getState().updateLicencia(id, updates);
}

export async function deleteLicenciaLocal(id: string) {
  useStore.getState().deleteLicencia(id);
}
