/**
 * Supabase ↔ Zustand sync service for maintenance-related data.
 * Maps snake_case Supabase columns ↔ camelCase store types.
 */
import { supabaseAdmin } from "@/lib/supabase";
import type { Customer, Vehicle, MaintenanceItem } from "@/store/types";

// ─── Column mappers ───────────────────────────────────────────────────────────

function dbToCustomer(row: any): Customer {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    phone: row.phone || "",
    email: row.email || undefined,
    address: row.address || undefined,
    notes: row.notes || undefined,
    tags: row.tags || [],
    birthday: row.birthday || undefined,
    createdAt: row.created_at,
  };
}

function customerToDb(c: Customer) {
  return {
    id: c.id,
    tenant_id: c.tenantId,
    name: c.name,
    phone: c.phone,
    email: c.email || null,
    address: c.address || null,
    notes: c.notes || null,
    tags: c.tags || [],
    birthday: c.birthday || null,
  };
}

function dbToVehicle(row: any): Vehicle {
  return {
    id: row.id,
    customerId: row.customer_id,
    tenantId: row.tenant_id,
    brand: row.brand,
    model: row.model,
    year: row.year,
    plate: row.plate,
    vin: row.vin || undefined,
    color: row.color || undefined,
    km: row.km || undefined,
    fuel: row.fuel || undefined,
    transmission: row.transmission || undefined,
    lastService: row.last_service || undefined,
    nextService: row.next_service || undefined,
  };
}

function vehicleToDb(v: Vehicle) {
  return {
    id: v.id,
    tenant_id: v.tenantId,
    customer_id: v.customerId,
    brand: v.brand,
    model: v.model,
    year: v.year,
    plate: v.plate,
    vin: v.vin || null,
    color: v.color || null,
    km: v.km || null,
    fuel: v.fuel || null,
    transmission: v.transmission || null,
    last_service: v.lastService || null,
    next_service: v.nextService || null,
  };
}

function dbToMaintenanceItem(row: any): MaintenanceItem {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    tenantId: row.tenant_id,
    name: row.name,
    lastServiceDate: row.last_service_date,
    lastServiceKm: row.last_service_km,
    lifespanKm: row.lifespan_km,
    lifespanDays: row.lifespan_days,
    currentPercentage: row.current_percentage,
    category: row.category,
  };
}

function maintenanceItemToDb(m: MaintenanceItem) {
  return {
    id: m.id,
    tenant_id: m.tenantId,
    vehicle_id: m.vehicleId,
    name: m.name,
    last_service_date: m.lastServiceDate,
    last_service_km: m.lastServiceKm,
    lifespan_km: m.lifespanKm,
    lifespan_days: m.lifespanDays,
    current_percentage: m.currentPercentage,
    category: m.category,
  };
}

// ─── Load from Supabase ────────────────────────────────────────────────────────

export async function loadCustomersFromSupabase(tenantId: string): Promise<Customer[]> {
  const { data, error } = await supabaseAdmin
    .from("customers")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  if (error) { console.error("[sync] customers:", error); return []; }
  return (data || []).map(dbToCustomer);
}

export async function loadVehiclesFromSupabase(tenantId: string): Promise<Vehicle[]> {
  const { data, error } = await supabaseAdmin
    .from("vehicles")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  if (error) { console.error("[sync] vehicles:", error); return []; }
  return (data || []).map(dbToVehicle);
}

export async function loadMaintenanceItemsFromSupabase(tenantId: string): Promise<MaintenanceItem[]> {
  const { data, error } = await supabaseAdmin
    .from("maintenance_items")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("id");
  if (error) { console.error("[sync] maintenance_items:", error); return []; }
  return (data || []).map(dbToMaintenanceItem);
}

// ─── Upsert to Supabase ───────────────────────────────────────────────────────

export async function upsertCustomers(customers: Customer[]): Promise<void> {
  if (customers.length === 0) return;
  const { error } = await supabaseAdmin
    .from("customers")
    .upsert(customers.map(customerToDb), { onConflict: "id" });
  if (error) console.error("[sync] upsert customers:", error);
}

export async function upsertVehicles(vehicles: Vehicle[]): Promise<void> {
  if (vehicles.length === 0) return;
  const { error } = await supabaseAdmin
    .from("vehicles")
    .upsert(vehicles.map(vehicleToDb), { onConflict: "id" });
  if (error) console.error("[sync] upsert vehicles:", error);
}

export async function upsertMaintenanceItems(items: MaintenanceItem[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabaseAdmin
    .from("maintenance_items")
    .upsert(items.map(maintenanceItemToDb), { onConflict: "id" });
  if (error) console.error("[sync] upsert maintenance_items:", error);
}

// ─── Full sync: store → Supabase ──────────────────────────────────────────────

export async function syncStoreToSupabase(
  tenantId: string,
  customers: Customer[],
  vehicles: Vehicle[],
  maintenanceItems: MaintenanceItem[],
): Promise<void> {
  const tenantCustomers = customers.filter(c => c.tenantId === tenantId);
  const tenantVehicles = vehicles.filter(v => v.tenantId === tenantId);
  const tenantItems = maintenanceItems.filter(m => m.tenantId === tenantId);

  await Promise.all([
    upsertCustomers(tenantCustomers),
    upsertVehicles(tenantVehicles),
    upsertMaintenanceItems(tenantItems),
  ]);
  console.log(`[sync] Synced ${tenantCustomers.length} customers, ${tenantVehicles.length} vehicles, ${tenantItems.length} maintenance items to Supabase`);
}
