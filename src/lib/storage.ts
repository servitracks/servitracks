import { supabaseAdmin } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import type { Plan, PlanId, Tenant, GlobalConfig, LicenciaLocal, BankDetails } from "@/store/types";

export type { Plan, PlanId, Tenant, GlobalConfig, LicenciaLocal, BankDetails };

export const ADMIN_EMAILS = ["admin@servitracks.com", "admin@klynn.com", "rubenpolanco487@gmail.com"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dbToPlan(row: any): Plan {
  return {
    id: row.id as PlanId,
    nombre: row.nombre,
    precio_mensual: row.precio_mensual ?? 0,
    precio_anual: row.precio_anual ?? 0,
    limite_empleados: row.limite_empleados ?? 5,
    limite_ordenes_mes: row.limite_ordenes_mes ?? null,
    limite_whatsapp_mes: row.limite_whatsapp_mes ?? 0,
    limite_sucursales: row.limite_sucursales ?? null,
    precio_sucursal_adicional: row.precio_sucursal_adicional ?? 0,
    modulos: row.modulos ?? { whatsapp: false, facturacion_fiscal: false, multisucursal: false, logistica: false },
    destacado: row.destacado ?? false,
    polar_product_monthly_url: row.polar_product_monthly_url ?? undefined,
    polar_product_yearly_url: row.polar_product_yearly_url ?? undefined,
  };
}

function planToDb(plan: Plan) {
  return {
    id: plan.id,
    nombre: plan.nombre,
    precio_mensual: plan.precio_mensual,
    precio_anual: plan.precio_anual ?? 0,
    limite_empleados: plan.limite_empleados,
    limite_ordenes_mes: plan.limite_ordenes_mes ?? null,
    limite_whatsapp_mes: plan.limite_whatsapp_mes ?? 0,
    limite_sucursales: plan.limite_sucursales ?? null,
    precio_sucursal_adicional: plan.precio_sucursal_adicional ?? 0,
    modulos: plan.modulos,
    destacado: plan.destacado ?? false,
    polar_product_monthly_url: plan.polar_product_monthly_url ?? null,
    polar_product_yearly_url: plan.polar_product_yearly_url ?? null,
  };
}

function dbToTenant(row: any): Tenant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logo: row.logo ?? undefined,
    address: row.address ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    rnc: row.rnc ?? undefined,
    status: row.status ?? 'active',
    wasender_api_key: row.wasender_api_key ?? undefined,
    wasender_phone: row.wasender_phone ?? undefined,
    monto_caja_chica: row.monto_caja_chica ?? 0,
    monto_actual_caja_chica: row.monto_actual_caja_chica ?? 0,
    config: row.config ?? {},
    plan_id: row.plan_id ?? 'basico',
    estado: row.estado ?? 'ACTIVO',
    trial_hasta: row.trial_hasta ?? undefined,
    color_primario: row.color_primario ?? '#000000',
    color_secundario: row.color_secundario ?? '#4b5563',
  };
}

// ─── Plans ────────────────────────────────────────────────────────────────────

export async function getPlans(): Promise<Plan[]> {
  const { data, error } = await supabaseAdmin
    .from("plans")
    .select("*")
    .order("precio_mensual", { ascending: true });
  if (error) { console.error("[storage] getPlans:", error); return useStore.getState().plans; }
  return (data || []).map(dbToPlan);
}

export async function savePlan(plan: Plan): Promise<void> {
  const { error } = await supabaseAdmin
    .from("plans")
    .upsert(planToDb(plan), { onConflict: "id" });
  if (error) { console.error("[storage] savePlan:", error); throw error; }
  // Sync store
  const state = useStore.getState();
  const exists = state.plans.some(p => p.id === plan.id);
  if (exists) state.updatePlan?.(plan.id, plan);
  else state.addPlan?.(plan);
}

export async function deletePlan(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("plans").delete().eq("id", id);
  if (error) { console.error("[storage] deletePlan:", error); throw error; }
  useStore.getState().deletePlan?.(id);
}

// ─── Tenants ──────────────────────────────────────────────────────────────────

export async function getTenants(): Promise<Tenant[]> {
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.error("[storage] getTenants:", error); return useStore.getState().tenants; }
  const tenants = (data || []).map(dbToTenant);
  useStore.getState().setTenants?.(tenants);
  return tenants;
}

export async function deleteTenant(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("tenants").delete().eq("id", id);
  if (error) { console.error("[storage] deleteTenant:", error); throw error; }
  useStore.getState().deleteTenant?.(id);
}

export async function updateTenantAdmin(id: string, email: string, password?: string): Promise<void> {
  const updates: any = { email };
  const { error } = await supabaseAdmin.from("tenants").update(updates).eq("id", id);
  if (error) console.error("[storage] updateTenantAdmin:", error);
  useStore.getState().updateTenant?.(id, { email });
}

export async function updateTenantPlan(id: string, planId: string): Promise<void> {
  const { error } = await supabaseAdmin.from("tenants").update({ plan_id: planId }).eq("id", id);
  if (error) console.error("[storage] updateTenantPlan:", error);
  useStore.getState().updateTenant?.(id, { plan_id: planId });
}

export async function updateTenantStatus(id: string, status: any): Promise<void> {
  const supaStatus = (status === 'ACTIVO' || status === 'TRIAL') ? 'active' : 'suspended';
  const { error } = await supabaseAdmin
    .from("tenants")
    .update({ estado: status, status: supaStatus })
    .eq("id", id);
  if (error) console.error("[storage] updateTenantStatus:", error);
  useStore.getState().updateTenant?.(id, { estado: status, status: supaStatus });
}

// ─── Orders (for admin stats) ─────────────────────────────────────────────────

export async function getOrdenes(tenantId: string) {
  // Try Supabase first
  const { data, error } = await supabaseAdmin
    .from("work_orders")
    .select("id, total, status")
    .eq("tenant_id", tenantId);
  if (!error && data && data.length > 0) return data;
  // Fallback to local store
  const orders = useStore.getState().orders;
  return orders.filter(o => o.tenantId === tenantId);
}

// ─── Global Config ────────────────────────────────────────────────────────────

export async function getGlobalConfig(): Promise<GlobalConfig> {
  return useStore.getState().globalConfig;
}

export async function saveGlobalConfig(config: GlobalConfig): Promise<void> {
  useStore.getState().setGlobalConfig?.(config);
}

// ─── Licencias Locales ────────────────────────────────────────────────────────

export async function getLicenciasLocales(): Promise<LicenciaLocal[]> {
  const { data, error } = await supabaseAdmin
    .from("licencias_locales")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.error("[storage] getLicenciasLocales:", error); return useStore.getState().licencias; }
  return data || [];
}

export async function createLicenciaLocal(lic: Omit<LicenciaLocal, "id">): Promise<void> {
  const { error } = await supabaseAdmin.from("licencias_locales").insert(lic);
  if (error) { console.error("[storage] createLicenciaLocal:", error); throw error; }
}

export async function updateLicenciaLocal(id: string, updates: Partial<LicenciaLocal>): Promise<void> {
  const { error } = await supabaseAdmin.from("licencias_locales").update(updates).eq("id", id);
  if (error) { console.error("[storage] updateLicenciaLocal:", error); throw error; }
}

export async function deleteLicenciaLocal(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("licencias_locales").delete().eq("id", id);
  if (error) { console.error("[storage] deleteLicenciaLocal:", error); throw error; }
}

// ─── Helpers varios ───────────────────────────────────────────────────────────

export function formatRD(amount: number) {
  return `RD$ ${amount.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function setActiveTenant(slug: string) {
  const tenant = useStore.getState().tenants.find(t => t.slug === slug) || null;
  useStore.getState().setCurrentTenant?.(tenant);
}

export function setSession(session: any) {
  localStorage.setItem("servitracks-session", JSON.stringify(session));
}

export function logout() {
  localStorage.removeItem("servitracks-session");
  sessionStorage.removeItem("servitracks-session");
  useStore.getState().setCurrentTenant?.(null);
}

export function formatCedulaRD(val: string) {
  const cleaned = val.replace(/\D/g, "");
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 10) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 10)}-${cleaned.slice(10, 11)}`;
}
