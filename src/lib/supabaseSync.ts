/**
 * Supabase ↔ Zustand sync service for maintenance-related data.
 * Maps snake_case Supabase columns ↔ camelCase store types.
 */
import { supabaseAdmin } from "@/lib/supabase";
import type { Customer, Vehicle, MaintenanceItem, Quote, Invoice, Service, Product, WorkOrder, Caja, MovimientoCaja, Technician, InventoryMovement, Inspection, Supplier, SupplierProduct, PurchaseOrder, GoodsReceipt, AccountPayable, QuoteRequest, MaintenanceAlert, MaintenanceHistoryItem } from "@/store/types";

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


export async function loadCajasFromSupabase(tenantId: string): Promise<Caja[]> {
  const { data, error } = await supabaseAdmin.from("cajas").select("*").eq("tenant_id", tenantId);
  if (error) { console.error("[sync] cajas:", error); return []; }
  return (data || []).map(dbToCaja);
}
export async function loadMovimientosCajaFromSupabase(tenantId: string): Promise<MovimientoCaja[]> {
  const { data, error } = await supabaseAdmin.from("movimientos_caja").select("*").eq("tenant_id", tenantId);
  if (error) { console.error("[sync] movimientos_caja:", error); return []; }
  return (data || []).map(dbToMovimientoCaja);
}
export async function loadTechniciansFromSupabase(tenantId: string): Promise<Technician[]> {
  const { data, error } = await supabaseAdmin.from("technicians").select("*").eq("tenant_id", tenantId);
  if (error) { console.error("[sync] technicians:", error); return []; }
  return (data || []).map(dbToTechnician);
}
export async function loadInventoryMovementsFromSupabase(tenantId: string): Promise<InventoryMovement[]> {
  const { data, error } = await supabaseAdmin.from("movements").select("*").eq("tenant_id", tenantId);
  if (error) { console.error("[sync] movements:", error); return []; }
  return (data || []).map(dbToInventoryMovement);
}
export async function loadInspectionsFromSupabase(tenantId: string): Promise<Inspection[]> {
  const { data, error } = await supabaseAdmin.from("inspections").select("*").eq("tenant_id", tenantId);
  if (error) { console.error("[sync] inspections:", error); return []; }
  return (data || []).map(dbToInspection);
}
export async function loadMaintenanceAlertsFromSupabase(tenantId: string): Promise<MaintenanceAlert[]> {
  const { data, error } = await supabaseAdmin.from("maintenance_alerts").select("*").eq("tenant_id", tenantId);
  if (error) { console.error("[sync] maintenance_alerts:", error); return []; }
  return (data || []).map(dbToMaintenanceAlert);
}
export async function loadMaintenanceHistoryFromSupabase(tenantId: string): Promise<MaintenanceHistoryItem[]> {
  const { data, error } = await supabaseAdmin.from("maintenance_history").select("*").eq("tenant_id", tenantId);
  if (error) { console.error("[sync] maintenance_history:", error); return []; }
  return (data || []).map(dbToMaintenanceHistoryItem);
}
export async function loadSuppliersFromSupabase(tenantId: string): Promise<Supplier[]> {
  const { data, error } = await supabaseAdmin.from("suppliers").select("*").eq("tenant_id", tenantId);
  if (error) { console.error("[sync] suppliers:", error); return []; }
  return (data || []).map(dbToSupplier);
}
export async function loadSupplierProductsFromSupabase(tenantId: string): Promise<SupplierProduct[]> {
  const { data, error } = await supabaseAdmin.from("supplier_products").select("*").eq("tenant_id", tenantId);
  if (error) { console.error("[sync] supplier_products:", error); return []; }
  return (data || []).map(dbToSupplierProduct);
}
export async function loadPurchaseOrdersFromSupabase(tenantId: string): Promise<PurchaseOrder[]> {
  const { data, error } = await supabaseAdmin.from("purchase_orders").select("*").eq("tenant_id", tenantId);
  if (error) { console.error("[sync] purchase_orders:", error); return []; }
  return (data || []).map(dbToPurchaseOrder);
}
export async function loadGoodsReceiptsFromSupabase(tenantId: string): Promise<GoodsReceipt[]> {
  const { data, error } = await supabaseAdmin.from("goods_receipts").select("*").eq("tenant_id", tenantId);
  if (error) { console.error("[sync] goods_receipts:", error); return []; }
  return (data || []).map(dbToGoodsReceipt);
}
export async function loadAccountsPayableFromSupabase(tenantId: string): Promise<AccountPayable[]> {
  const { data, error } = await supabaseAdmin.from("accounts_payable").select("*").eq("tenant_id", tenantId);
  if (error) { console.error("[sync] accounts_payable:", error); return []; }
  return (data || []).map(dbToAccountPayable);
}
export async function loadQuoteRequestsFromSupabase(tenantId: string): Promise<QuoteRequest[]> {
  const { data, error } = await supabaseAdmin.from("quote_requests").select("*").eq("tenant_id", tenantId);
  if (error) { console.error("[sync] quote_requests:", error); return []; }
  return (data || []).map(dbToQuoteRequest);
}

export async function downloadFullStateFromSupabase(tenantId: string) {
  const [
    customers, vehicles, maintenanceItems, services, products, orders, quotes, invoices,
    cajas, cajaMovements, technicians, movements, inspections, maintenanceAlerts, maintenanceHistory,
    suppliers, supplierProducts, purchaseOrders, goodsReceipts, accountsPayable, quoteRequests
  ] = await Promise.all([
    loadCustomersFromSupabase(tenantId),
    loadVehiclesFromSupabase(tenantId),
    loadMaintenanceItemsFromSupabase(tenantId),
    loadServicesFromSupabase(tenantId),
    loadProductsFromSupabase(tenantId),
    loadOrdersFromSupabase(tenantId),
    loadQuotesFromSupabase(tenantId),
    loadInvoicesFromSupabase(tenantId),
    loadCajasFromSupabase(tenantId),
    loadMovimientosCajaFromSupabase(tenantId),
    loadTechniciansFromSupabase(tenantId),
    loadInventoryMovementsFromSupabase(tenantId),
    loadInspectionsFromSupabase(tenantId),
    loadMaintenanceAlertsFromSupabase(tenantId),
    loadMaintenanceHistoryFromSupabase(tenantId),
    loadSuppliersFromSupabase(tenantId),
    loadSupplierProductsFromSupabase(tenantId),
    loadPurchaseOrdersFromSupabase(tenantId),
    loadGoodsReceiptsFromSupabase(tenantId),
    loadAccountsPayableFromSupabase(tenantId),
    loadQuoteRequestsFromSupabase(tenantId)
  ]);
  
  return { customers, vehicles, maintenanceItems, services, products, orders, quotes, invoices, cajas, cajaMovements, technicians, movements, inspections, maintenanceAlerts, maintenanceHistory, suppliers, supplierProducts, purchaseOrders, goodsReceipts, accountsPayable, quoteRequests };
}


// --- NEW MAPPERS ---
function dbToCaja(row: any): Caja {
  return { id: row.id, tenant_id: row.tenant_id, empleado_id: row.empleado_id, monto_inicial: row.monto_inicial, estado: row.estado, abierta_en: row.abierta_en, cerrada_en: row.cerrada_en, monto_esperado_efectivo: row.monto_esperado_efectivo, monto_contado_efectivo: row.monto_contado_efectivo, monto_contado_tarjeta: row.monto_contado_tarjeta, monto_contado_transferencia: row.monto_contado_transferencia, diferencia: row.diferencia, notas_apertura: row.notas_apertura, notas_cierre: row.notas_cierre };
}
function cajaToDb(c: Caja) {
  return { id: c.id, tenant_id: c.tenant_id, empleado_id: c.empleado_id, monto_inicial: c.monto_inicial, estado: c.estado, abierta_en: c.abierta_en, cerrada_en: c.cerrada_en, monto_esperado_efectivo: c.monto_esperado_efectivo, monto_contado_efectivo: c.monto_contado_efectivo, monto_contado_tarjeta: c.monto_contado_tarjeta, monto_contado_transferencia: c.monto_contado_transferencia, diferencia: c.diferencia, notas_apertura: c.notas_apertura, notas_cierre: c.notas_cierre };
}

function dbToMovimientoCaja(row: any): MovimientoCaja {
  return { id: row.id, tenant_id: row.tenant_id, caja_id: row.caja_id, empleado_id: row.empleado_id, tecnico_id: row.tecnico_id, tipo: row.tipo, concepto: row.concepto, monto: row.monto, monto_mano_obra: row.monto_mano_obra, metodo: row.metodo, creado_en: row.creado_en };
}
function movimientoCajaToDb(m: MovimientoCaja) {
  return { id: m.id, tenant_id: m.tenant_id, caja_id: m.caja_id, empleado_id: m.empleado_id, tecnico_id: m.tecnico_id, tipo: m.tipo, concepto: m.concepto, monto: m.monto, monto_mano_obra: m.monto_mano_obra, metodo: m.metodo, creado_en: m.creado_en };
}

function dbToTechnician(row: any): Technician {
  return { id: row.id, tenantId: row.tenant_id, name: row.name, phone: row.phone, status: row.status, pagoNomina: row.pago_nomina, tipoPago: row.tipo_pago, createdAt: row.created_at };
}
function technicianToDb(t: Technician) {
  return { id: t.id, tenant_id: t.tenantId, name: t.name, phone: t.phone, status: t.status, pago_nomina: t.pagoNomina, tipo_pago: t.tipoPago, created_at: t.createdAt };
}

function dbToInventoryMovement(row: any): InventoryMovement {
  return { id: row.id, tenantId: row.tenant_id, productId: row.product_id, productName: row.product_name, variantId: row.variant_id, type: row.type, quantity: row.quantity, reason: row.reason, date: row.date, userId: row.user_id };
}
function inventoryMovementToDb(m: InventoryMovement) {
  return { id: m.id, tenant_id: m.tenantId, product_id: m.productId, product_name: m.productName, variant_id: m.variantId, type: m.type, quantity: m.quantity, reason: m.reason, date: m.date, user_id: m.userId };
}

function dbToInspection(row: any): Inspection {
  return { id: row.id, tenantId: row.tenant_id, vehicleId: row.vehicle_id, customerId: row.customer_id, workOrderId: row.work_order_id, technicianId: row.technician_id, status: row.status, fuelLevel: row.fuel_level, bodyDamageNotes: row.body_damage_notes, items: row.items, createdAt: row.created_at, completedAt: row.completed_at };
}
function inspectionToDb(i: Inspection) {
  return { id: i.id, tenant_id: i.tenantId, vehicle_id: i.vehicleId, customer_id: i.customerId, work_order_id: i.workOrderId, technician_id: i.technicianId, status: i.status, fuel_level: i.fuelLevel, body_damage_notes: i.bodyDamageNotes, items: i.items, created_at: i.createdAt, completed_at: i.completedAt };
}

function dbToMaintenanceAlert(row: any): MaintenanceAlert {
  return { id: row.id, tenantId: row.tenant_id, vehicleId: row.vehicle_id, customerId: row.customer_id, maintenanceItemId: row.maintenance_item_id, type: row.type, percentage: row.percentage, createdAt: row.created_at, status: row.status };
}
function maintenanceAlertToDb(a: MaintenanceAlert) {
  return { id: a.id, tenant_id: a.tenantId, vehicle_id: a.vehicleId, customer_id: a.customerId, maintenance_item_id: a.maintenanceItemId, type: a.type, percentage: a.percentage, created_at: a.createdAt, status: a.status };
}

function dbToMaintenanceHistoryItem(row: any): MaintenanceHistoryItem {
  return { id: row.id, vehicleId: row.vehicle_id, tenantId: row.tenant_id, name: row.name, serviceDate: row.service_date, serviceKm: row.service_km, completedAt: row.completed_at, notes: row.notes };
}
function maintenanceHistoryItemToDb(h: MaintenanceHistoryItem) {
  return { id: h.id, vehicle_id: h.vehicleId, tenant_id: h.tenantId, name: h.name, service_date: h.serviceDate, service_km: h.serviceKm, completed_at: h.completedAt, notes: h.notes };
}

function dbToSupplier(row: any): Supplier {
  return { id: row.id, tenantId: row.tenant_id, code: row.code, commercialName: row.commercial_name, legalName: row.legal_name, rnc: row.rnc, type: row.type, status: row.status, contacts: row.contacts, country: row.country, province: row.province, city: row.city, address: row.address, googleMapsUrl: row.google_maps_url, creditLimit: row.credit_limit, creditDays: row.credit_days, generalDiscount: row.general_discount, volumeDiscount: row.volume_discount, itbis: row.itbis, currency: row.currency, ratingDelivery: row.rating_delivery, ratingQuality: row.rating_quality, ratingPrice: row.rating_price, ratingService: row.rating_service, notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at };
}
function supplierToDb(s: Supplier) {
  return { id: s.id, tenant_id: s.tenantId, code: s.code, commercial_name: s.commercialName, legal_name: s.legalName, rnc: s.rnc, type: s.type, status: s.status, contacts: s.contacts, country: s.country, province: s.province, city: s.city, address: s.address, google_maps_url: s.googleMapsUrl, credit_limit: s.creditLimit, credit_days: s.creditDays, general_discount: s.generalDiscount, volume_discount: s.volumeDiscount, itbis: s.itbis, currency: s.currency, rating_delivery: s.ratingDelivery, rating_quality: s.ratingQuality, rating_price: s.ratingPrice, rating_service: s.ratingService, notes: s.notes, created_at: s.createdAt, updated_at: s.updatedAt };
}

function dbToSupplierProduct(row: any): SupplierProduct {
  return { id: row.id, tenantId: row.tenant_id, supplierId: row.supplier_id, productId: row.product_id, currentPrice: row.current_price, lastPrice: row.last_price, lastUpdated: row.last_updated };
}
function supplierProductToDb(s: SupplierProduct) {
  return { id: s.id, tenant_id: s.tenantId, supplier_id: s.supplierId, product_id: s.productId, current_price: s.currentPrice, last_price: s.lastPrice, last_updated: s.lastUpdated };
}

function dbToPurchaseOrder(row: any): PurchaseOrder {
  return { id: row.id, tenantId: row.tenant_id, supplierId: row.supplier_id, number: row.number, invoiceNumber: row.invoice_number, paymentStatus: row.payment_status, status: row.status, items: row.items, subtotal: row.subtotal, tax: row.tax, total: row.total, notes: row.notes, createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at, expectedDelivery: row.expected_delivery };
}
function purchaseOrderToDb(p: PurchaseOrder) {
  return { id: p.id, tenant_id: p.tenantId, supplier_id: p.supplierId, number: p.number, invoice_number: p.invoiceNumber, payment_status: p.paymentStatus, status: p.status, items: p.items, subtotal: p.subtotal, tax: p.tax, total: p.total, notes: p.notes, created_by: p.createdBy, created_at: p.createdAt, updated_at: p.updatedAt, expected_delivery: p.expectedDelivery };
}

function dbToGoodsReceipt(row: any): GoodsReceipt {
  return { id: row.id, tenantId: row.tenant_id, purchaseOrderId: row.purchase_order_id, supplierId: row.supplier_id, items: row.items, receivedAt: row.received_at, receivedBy: row.received_by, notes: row.notes };
}
function goodsReceiptToDb(g: GoodsReceipt) {
  return { id: g.id, tenant_id: g.tenantId, purchase_order_id: g.purchaseOrderId, supplier_id: g.supplierId, items: g.items, received_at: g.receivedAt, received_by: g.receivedBy, notes: g.notes };
}

function dbToAccountPayable(row: any): AccountPayable {
  return { id: row.id, tenantId: row.tenant_id, supplierId: row.supplier_id, purchaseOrderId: row.purchase_order_id, invoiceNumber: row.invoice_number, amount: row.amount, paidAmount: row.paid_amount, dueDate: row.due_date, status: row.status, createdAt: row.created_at, paidAt: row.paid_at, notes: row.notes };
}
function accountPayableToDb(a: AccountPayable) {
  return { id: a.id, tenant_id: a.tenantId, supplier_id: a.supplierId, purchase_order_id: a.purchaseOrderId, invoice_number: a.invoiceNumber, amount: a.amount, paid_amount: a.paidAmount, due_date: a.dueDate, status: a.status, created_at: a.createdAt, paid_at: a.paidAt, notes: a.notes };
}

function dbToQuoteRequest(row: any): QuoteRequest {
  return { id: row.id, tenantId: row.tenant_id, productName: row.product_name, description: row.description, supplierIds: row.supplier_ids, responses: row.responses, status: row.status, createdAt: row.created_at };
}
function quoteRequestToDb(q: QuoteRequest) {
  return { id: q.id, tenant_id: q.tenantId, product_name: q.productName, description: q.description, supplier_ids: q.supplierIds, responses: q.responses, status: q.status, created_at: q.createdAt };
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


export async function upsertCajas(items: Caja[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabaseAdmin.from("cajas").upsert(items.map(cajaToDb), { onConflict: "id" });
  if (error) console.error("[sync] upsert cajas:", error);
}
export async function upsertMovimientosCaja(items: MovimientoCaja[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabaseAdmin.from("movimientos_caja").upsert(items.map(movimientoCajaToDb), { onConflict: "id" });
  if (error) console.error("[sync] upsert movimientos_caja:", error);
}
export async function upsertTechnicians(items: Technician[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabaseAdmin.from("technicians").upsert(items.map(technicianToDb), { onConflict: "id" });
  if (error) console.error("[sync] upsert technicians:", error);
}
export async function upsertInventoryMovements(items: InventoryMovement[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabaseAdmin.from("movements").upsert(items.map(inventoryMovementToDb), { onConflict: "id" });
  if (error) console.error("[sync] upsert movements:", error);
}
export async function upsertInspections(items: Inspection[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabaseAdmin.from("inspections").upsert(items.map(inspectionToDb), { onConflict: "id" });
  if (error) console.error("[sync] upsert inspections:", error);
}
export async function upsertMaintenanceAlerts(items: MaintenanceAlert[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabaseAdmin.from("maintenance_alerts").upsert(items.map(maintenanceAlertToDb), { onConflict: "id" });
  if (error) console.error("[sync] upsert maintenance_alerts:", error);
}
export async function upsertMaintenanceHistory(items: MaintenanceHistoryItem[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabaseAdmin.from("maintenance_history").upsert(items.map(maintenanceHistoryItemToDb), { onConflict: "id" });
  if (error) console.error("[sync] upsert maintenance_history:", error);
}
export async function upsertSuppliers(items: Supplier[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabaseAdmin.from("suppliers").upsert(items.map(supplierToDb), { onConflict: "id" });
  if (error) console.error("[sync] upsert suppliers:", error);
}
export async function upsertSupplierProducts(items: SupplierProduct[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabaseAdmin.from("supplier_products").upsert(items.map(supplierProductToDb), { onConflict: "id" });
  if (error) console.error("[sync] upsert supplier_products:", error);
}
export async function upsertPurchaseOrders(items: PurchaseOrder[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabaseAdmin.from("purchase_orders").upsert(items.map(purchaseOrderToDb), { onConflict: "id" });
  if (error) console.error("[sync] upsert purchase_orders:", error);
}
export async function upsertGoodsReceipts(items: GoodsReceipt[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabaseAdmin.from("goods_receipts").upsert(items.map(goodsReceiptToDb), { onConflict: "id" });
  if (error) console.error("[sync] upsert goods_receipts:", error);
}
export async function upsertAccountsPayable(items: AccountPayable[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabaseAdmin.from("accounts_payable").upsert(items.map(accountPayableToDb), { onConflict: "id" });
  if (error) console.error("[sync] upsert accounts_payable:", error);
}
export async function upsertQuoteRequests(items: QuoteRequest[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabaseAdmin.from("quote_requests").upsert(items.map(quoteRequestToDb), { onConflict: "id" });
  if (error) console.error("[sync] upsert quote_requests:", error);
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
    invoices?: Invoice[],
    cajas?: Caja[],
    cajaMovements?: MovimientoCaja[],
    technicians?: Technician[],
    movements?: InventoryMovement[],
    inspections?: Inspection[],
    maintenanceAlerts?: MaintenanceAlert[],
    maintenanceHistory?: MaintenanceHistoryItem[],
    suppliers?: Supplier[],
    supplierProducts?: SupplierProduct[],
    purchaseOrders?: PurchaseOrder[],
    goodsReceipts?: GoodsReceipt[],
    accountsPayable?: AccountPayable[],
    quoteRequests?: QuoteRequest[]
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
  if (state.cajas) tasks.push(upsertCajas(state.cajas.filter(i => i.tenant_id === tenantId)));
  if (state.cajaMovements) tasks.push(upsertMovimientosCaja(state.cajaMovements.filter(i => i.tenant_id === tenantId)));
  if (state.technicians) tasks.push(upsertTechnicians(state.technicians.filter(i => i.tenantId === tenantId)));
  if (state.movements) tasks.push(upsertInventoryMovements(state.movements.filter(i => i.tenantId === tenantId)));
  if (state.inspections) tasks.push(upsertInspections(state.inspections.filter(i => i.tenantId === tenantId)));
  if (state.maintenanceAlerts) tasks.push(upsertMaintenanceAlerts(state.maintenanceAlerts.filter(i => i.tenantId === tenantId)));
  if (state.maintenanceHistory) tasks.push(upsertMaintenanceHistory(state.maintenanceHistory.filter(i => i.tenantId === tenantId)));
  if (state.suppliers) tasks.push(upsertSuppliers(state.suppliers.filter(i => i.tenantId === tenantId)));
  if (state.supplierProducts) tasks.push(upsertSupplierProducts(state.supplierProducts.filter(i => i.tenantId === tenantId)));
  if (state.purchaseOrders) tasks.push(upsertPurchaseOrders(state.purchaseOrders.filter(i => i.tenantId === tenantId)));
  if (state.goodsReceipts) tasks.push(upsertGoodsReceipts(state.goodsReceipts.filter(i => i.tenantId === tenantId)));
  if (state.accountsPayable) tasks.push(upsertAccountsPayable(state.accountsPayable.filter(i => i.tenantId === tenantId)));
  if (state.quoteRequests) tasks.push(upsertQuoteRequests(state.quoteRequests.filter(i => i.tenantId === tenantId)));

  await Promise.all(tasks);
  console.log(`[sync] Synced full state for tenant ${tenantId} to Supabase`);
}
