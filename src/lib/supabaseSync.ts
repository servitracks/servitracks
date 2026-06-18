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

export async function loadServicesFromSupabase(tenantId: string): Promise<Service[]> {
  const { data, error } = await supabaseAdmin.from("services").select("*").eq("tenant_id", tenantId);
  if (error) { console.error("[sync] services:", error); return []; }
  return (data || []).map(dbToService);
}

export async function loadProductsFromSupabase(tenantId: string): Promise<Product[]> {
  const { data, error } = await supabaseAdmin.from("products").select("*").eq("tenant_id", tenantId);
  if (error) { console.error("[sync] products:", error); return []; }
  return (data || []).map(dbToProduct);
}

export async function loadOrdersFromSupabase(tenantId: string): Promise<WorkOrder[]> {
  const { data, error } = await supabaseAdmin.from("orders").select("*").eq("tenant_id", tenantId);
  if (error) { console.error("[sync] orders:", error); return []; }
  return (data || []).map(dbToWorkOrder);
}

export async function loadQuotesFromSupabase(tenantId: string): Promise<Quote[]> {
  const { data, error } = await supabaseAdmin.from("quotes").select("*").eq("tenant_id", tenantId);
  if (error) { console.error("[sync] quotes:", error); return []; }
  return (data || []).map(dbToQuote);
}

export async function loadInvoicesFromSupabase(tenantId: string): Promise<Invoice[]> {
  const { data, error } = await supabaseAdmin.from("invoices").select("*").eq("tenant_id", tenantId);
  if (error) { console.error("[sync] invoices:", error); return []; }
  return (data || []).map(dbToInvoice);
}

export async function downloadFullStateFromSupabase(tenantId: string) {
  const [
    customers, vehicles, maintenanceItems, services, products, orders, quotes, invoices
  ] = await Promise.all([
    loadCustomersFromSupabase(tenantId),
    loadVehiclesFromSupabase(tenantId),
    loadMaintenanceItemsFromSupabase(tenantId),
    loadServicesFromSupabase(tenantId),
    loadProductsFromSupabase(tenantId),
    loadOrdersFromSupabase(tenantId),
    loadQuotesFromSupabase(tenantId),
    loadInvoicesFromSupabase(tenantId)
  ]);
  
  return { customers, vehicles, maintenanceItems, services, products, orders, quotes, invoices };
}

// ─── NEW MAPPERS ──────────────────────────────────────────────────────────────

function dbToService(row: any): Service {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description || undefined,
    price: row.price,
    laborPrice: row.labor_price || undefined,
    duration: row.duration || undefined,
    category: row.category || undefined,
    maintenanceCategory: row.maintenance_category || undefined,
    lifespanKm: row.lifespan_km || undefined,
    lifespanDays: row.lifespan_days || undefined,
  };
}

function serviceToDb(s: Service) {
  return {
    id: s.id,
    tenant_id: s.tenantId,
    name: s.name,
    description: s.description || null,
    price: s.price,
    labor_price: s.laborPrice || null,
    duration: s.duration || null,
    category: s.category || null,
    maintenance_category: s.maintenanceCategory || null,
    lifespan_km: s.lifespanKm || null,
    lifespan_days: s.lifespanDays || null,
  };
}

function dbToProduct(row: any): Product {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    sku: row.sku,
    barcode: row.barcode || undefined,
    category: row.category,
    brand: row.brand || undefined,
    type: row.type || undefined,
    costPrice: row.cost_price,
    salePrice: row.sale_price,
    laborPrice: row.labor_price || undefined,
    stock: row.stock,
    minStock: row.min_stock,
    tax: row.tax,
    image: row.image || undefined,
    supplier: row.supplier || undefined,
    location: row.location || undefined,
    serviceIds: row.service_ids || undefined,
    variants: row.variants || undefined,
    maintenanceCategory: row.maintenance_category || undefined,
    lifespanKm: row.lifespan_km || undefined,
    lifespanDays: row.lifespan_days || undefined,
    vehicleMake: row.vehicle_make || undefined,
    vehicleModel: row.vehicle_model || undefined,
    vehicleYear: row.vehicle_year || undefined,
    isCombo: row.is_combo || undefined,
    comboItems: row.combo_items || undefined,
  };
}

function productToDb(p: Product) {
  return {
    id: p.id,
    tenant_id: p.tenantId,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode || null,
    category: p.category,
    brand: p.brand || null,
    type: p.type || null,
    cost_price: p.costPrice,
    sale_price: p.salePrice,
    labor_price: p.laborPrice || null,
    stock: p.stock,
    min_stock: p.minStock,
    tax: p.tax,
    image: p.image || null,
    supplier: p.supplier || null,
    location: p.location || null,
    service_ids: p.serviceIds || null,
    variants: p.variants || null,
    maintenance_category: p.maintenanceCategory || null,
    lifespan_km: p.lifespanKm || null,
    lifespan_days: p.lifespanDays || null,
    vehicle_make: p.vehicleMake || null,
    vehicle_model: p.vehicleModel || null,
    vehicle_year: p.vehicleYear || null,
    is_combo: p.isCombo || null,
    combo_items: p.comboItems || null,
  };
}

function dbToWorkOrder(row: any): WorkOrder {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    customerId: row.customer_id,
    vehicleId: row.vehicle_id,
    mechanicId: row.mechanic_id || undefined,
    km: row.km || undefined,
    kmUnit: row.km_unit || undefined,
    status: row.status,
    description: row.description,
    serviceIds: row.service_ids || undefined,
    parts: row.parts || undefined,
    estimatedTime: row.estimated_time || undefined,
    notes: row.notes || undefined,
    checklist: row.checklist || undefined,
    total: row.total,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function workOrderToDb(o: WorkOrder) {
  return {
    id: o.id,
    tenant_id: o.tenantId,
    customer_id: o.customerId,
    vehicle_id: o.vehicleId,
    mechanic_id: o.mechanicId || null,
    km: o.km || null,
    km_unit: o.kmUnit || null,
    status: o.status,
    description: o.description,
    service_ids: o.serviceIds || null,
    parts: o.parts || null,
    estimated_time: o.estimatedTime || null,
    notes: o.notes || null,
    checklist: o.checklist || null,
    total: o.total,
    created_at: o.createdAt,
    updated_at: o.updatedAt,
  };
}

function dbToQuote(row: any): Quote {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    customerId: row.customer_id,
    vehicleId: row.vehicle_id,
    quoteNumber: row.quote_number,
    status: row.status,
    validUntil: row.valid_until || undefined,
    subtotal: row.subtotal,
    tax: row.tax,
    discount: row.discount || undefined,
    total: row.total,
    notes: row.notes || undefined,
    items: row.items || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function quoteToDb(q: Quote) {
  return {
    id: q.id,
    tenant_id: q.tenantId,
    customer_id: q.customerId,
    vehicle_id: q.vehicleId,
    quote_number: q.quoteNumber,
    status: q.status,
    valid_until: q.validUntil || null,
    subtotal: q.subtotal,
    tax: q.tax,
    discount: q.discount || null,
    total: q.total,
    notes: q.notes || null,
    items: q.items || [],
    created_at: q.createdAt,
    updated_at: q.updatedAt,
  };
}

function dbToInvoice(row: any): Invoice {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    customerId: row.customer_id || undefined,
    customerName: row.customer_name || undefined,
    customerRnc: row.customer_rnc || undefined,
    vehicleId: row.vehicle_id || undefined,
    orderId: row.order_id || undefined,
    mechanicId: row.mechanic_id || undefined,
    km: row.km || undefined,
    kmUnit: row.km_unit || undefined,
    items: row.items || [],
    subtotal: row.subtotal,
    tax: row.tax,
    discount: row.discount || undefined,
    total: row.total,
    paymentMethod: row.payment_method,
    status: row.status,
    ncf: row.ncf || undefined,
    qrUrl: row.qr_url || undefined,
    securityCode: row.security_code || undefined,
    signatureDate: row.signature_date || undefined,
    notes: row.notes || undefined,
    isCommissionPaid: row.is_commission_paid || undefined,
    createdAt: row.created_at,
  };
}

function invoiceToDb(i: Invoice) {
  return {
    id: i.id,
    tenant_id: i.tenantId,
    customer_id: i.customerId || null,
    customer_name: i.customerName || null,
    customer_rnc: i.customerRnc || null,
    vehicle_id: i.vehicleId || null,
    order_id: i.orderId || null,
    mechanic_id: i.mechanicId || null,
    km: i.km || null,
    km_unit: i.kmUnit || null,
    items: i.items || [],
    subtotal: i.subtotal,
    tax: i.tax,
    discount: i.discount || null,
    total: i.total,
    payment_method: i.paymentMethod,
    status: i.status,
    ncf: i.ncf || null,
    qr_url: i.qrUrl || null,
    security_code: i.securityCode || null,
    signature_date: i.signatureDate || null,
    notes: i.notes || null,
    is_commission_paid: i.isCommissionPaid || null,
    created_at: i.createdAt,
  };
}

// ─── Upsert to Supabase ───────────────────────────────────────────────────────

export async function upsertCustomers(customers: Customer[]): Promise<void> {
  if (customers.length === 0) return;
  const { error } = await supabaseAdmin.from("customers").upsert(customers.map(customerToDb), { onConflict: "id" });
  if (error) console.error("[sync] upsert customers:", error);
}

export async function upsertVehicles(vehicles: Vehicle[]): Promise<void> {
  if (vehicles.length === 0) return;
  const { error } = await supabaseAdmin.from("vehicles").upsert(vehicles.map(vehicleToDb), { onConflict: "id" });
  if (error) console.error("[sync] upsert vehicles:", error);
}

export async function upsertMaintenanceItems(items: MaintenanceItem[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabaseAdmin.from("maintenance_items").upsert(items.map(maintenanceItemToDb), { onConflict: "id" });
  if (error) console.error("[sync] upsert maintenance_items:", error);
}

export async function upsertServices(items: Service[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabaseAdmin.from("services").upsert(items.map(serviceToDb), { onConflict: "id" });
  if (error) console.error("[sync] upsert services:", error);
}

export async function upsertProducts(items: Product[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabaseAdmin.from("products").upsert(items.map(productToDb), { onConflict: "id" });
  if (error) console.error("[sync] upsert products:", error);
}

export async function upsertOrders(items: WorkOrder[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabaseAdmin.from("orders").upsert(items.map(workOrderToDb), { onConflict: "id" });
  if (error) console.error("[sync] upsert orders:", error);
}

export async function upsertQuotes(items: Quote[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabaseAdmin.from("quotes").upsert(items.map(quoteToDb), { onConflict: "id" });
  if (error) console.error("[sync] upsert quotes:", error);
}

export async function upsertInvoices(items: Invoice[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabaseAdmin.from("invoices").upsert(items.map(invoiceToDb), { onConflict: "id" });
  if (error) console.error("[sync] upsert invoices:", error);
}

// ─── Full sync: store → Supabase ──────────────────────────────────────────────

export async function syncStoreToSupabase(
  tenantId: string,
  state: {
    customers?: Customer[],
    vehicles?: Vehicle[],
    maintenanceItems?: MaintenanceItem[],
    services?: Service[],
    products?: Product[],
    orders?: WorkOrder[],
    quotes?: Quote[],
    invoices?: Invoice[]
  }
): Promise<void> {
  const tasks = [];
  
  if (state.customers) tasks.push(upsertCustomers(state.customers.filter(i => i.tenantId === tenantId)));
  if (state.vehicles) tasks.push(upsertVehicles(state.vehicles.filter(i => i.tenantId === tenantId)));
  if (state.maintenanceItems) tasks.push(upsertMaintenanceItems(state.maintenanceItems.filter(i => i.tenantId === tenantId)));
  if (state.services) tasks.push(upsertServices(state.services.filter(i => i.tenantId === tenantId)));
  if (state.products) tasks.push(upsertProducts(state.products.filter(i => i.tenantId === tenantId)));
  if (state.orders) tasks.push(upsertOrders(state.orders.filter(i => i.tenantId === tenantId)));
  if (state.quotes) tasks.push(upsertQuotes(state.quotes.filter(i => i.tenantId === tenantId)));
  if (state.invoices) tasks.push(upsertInvoices(state.invoices.filter(i => i.tenantId === tenantId)));

  await Promise.all(tasks);
  console.log(`[sync] Synced full state for tenant ${tenantId} to Supabase`);
}
