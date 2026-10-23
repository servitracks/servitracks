/**
 * Supabase ↔ Zustand sync service for maintenance-related data.
 * Maps snake_case Supabase columns ↔ camelCase store types.
 */
import { supabaseAdmin } from "@/lib/supabase";
import type { Customer, Vehicle, MaintenanceItem, Quote, Invoice, Service, Product, WorkOrder, Caja, MovimientoCaja, Technician, InventoryMovement, Inspection, Supplier, SupplierProduct, PurchaseOrder, GoodsReceipt, AccountPayable, QuoteRequest, MaintenanceAlert, MaintenanceHistoryItem, ActivityLog, OpenTab, InventorySession, Tenant } from "@/store/types";

// ─── Column mappers ───────────────────────────────────────────────────────────

function dbToCustomer(row: any): Customer {
  let notes: string | undefined = row.notes || undefined;
  let meta: any = {};

  if (notes && notes.includes("[META]:")) {
    const [cleanNotes, rawMeta] = notes.split("[META]:");
    notes = cleanNotes.trim() || undefined;
    try {
      meta = JSON.parse(rawMeta.trim());
    } catch {
      meta = {};
    }
  }

  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    phone: row.phone || "",
    email: row.email || undefined,
    rnc: row.rnc || meta.rnc || undefined,
    type: row.type || meta.type || undefined,
    taxReceiptType: row.tax_receipt_type || meta.taxReceiptType || undefined,
    businessName: row.business_name || meta.businessName || undefined,
    address: row.address || undefined,
    notes,
    tags: row.tags || [],
    birthday: row.birthday || undefined,
    createdAt: row.created_at,
  };
}

function customerToDb(c: Customer) {
  let cleanNotes = (c.notes || "").split("[META]:")[0].trim();
  const meta: Record<string, any> = {};
  if (c.rnc) meta.rnc = c.rnc;
  if (c.type) meta.type = c.type;
  if (c.taxReceiptType) meta.taxReceiptType = c.taxReceiptType;
  if (c.businessName) meta.businessName = c.businessName;

  const hasMeta = Object.keys(meta).length > 0;
  const serializedNotes = hasMeta
    ? `${cleanNotes ? `${cleanNotes}\n` : ""}[META]:${JSON.stringify(meta)}`
    : cleanNotes || null;

  return {
    id: c.id,
    tenant_id: c.tenantId,
    name: c.name,
    phone: c.phone,
    email: c.email || null,
    address: c.address || null,
    notes: serializedNotes,
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

async function fetchAllRowsPaginated<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: any }>,
  mapper: (row: any) => T,
  pageSize = 1000
): Promise<T[]> {
  let allRows: T[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) {
      console.error("[sync] pagination error:", error);
      break;
    }
    if (data && data.length > 0) {
      for (let i = 0; i < data.length; i++) {
        allRows.push(mapper(data[i]));
      }
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        from += pageSize;
      }
    } else {
      hasMore = false;
    }
  }

  return allRows;
}

export async function loadCustomersFromSupabase(tenantId: string): Promise<Customer[]> {
  return fetchAllRowsPaginated(
    (from, to) =>
      supabaseAdmin
        .from("customers")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    dbToCustomer
  );
}

export async function loadVehiclesFromSupabase(tenantId: string): Promise<Vehicle[]> {
  return fetchAllRowsPaginated(
    (from, to) =>
      supabaseAdmin
        .from("vehicles")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    dbToVehicle
  );
}

export async function loadMaintenanceItemsFromSupabase(tenantId: string): Promise<MaintenanceItem[]> {
  return fetchAllRowsPaginated(
    (from, to) =>
      supabaseAdmin
        .from("maintenance_items")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("id", { ascending: true })
        .range(from, to),
    dbToMaintenanceItem
  );
}

export async function loadServicesFromSupabase(tenantId: string): Promise<Service[]> {
  return fetchAllRowsPaginated(
    (from, to) =>
      supabaseAdmin
        .from("services")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("id", { ascending: true })
        .range(from, to),
    dbToService
  );
}

export async function loadProductsFromSupabase(tenantId: string): Promise<Product[]> {
  const rows = await fetchAllRowsPaginated(
    (from, to) =>
      supabaseAdmin
        .from("products")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("id", { ascending: true })
        .range(from, to),
    dbToProduct
  );
  
  // Consolidación automática y transparente: cero duplicados, existencias sumadas
  const bySku = new Map<string, Product>();
  const byBarcode = new Map<string, Product>();
  const byName = new Map<string, Product>();
  const byId = new Map<string, Product>();
  const consolidated: Product[] = [];

  for (const p of rows) {
    const s = (p.sku || "").trim().toLowerCase();
    const b = (p.barcode || "").trim().toLowerCase();
    const n = (p.name || "").trim().toLowerCase();

    const existing =
      (s && s !== "n/a" && s !== "-" && s !== "null" ? bySku.get(s) : null) ||
      (b && b !== "n/a" && b !== "-" && b !== "null" ? byBarcode.get(b) : null) ||
      (n && n.length >= 3 ? byName.get(n) : null) ||
      byId.get(p.id);

    if (existing) {
      // Consolidar existencias y metadatos en el registro maestro
      existing.stock = (Number(existing.stock) || 0) + (Number(p.stock) || 0);
      if ((!existing.barcode || existing.barcode === "null") && p.barcode && p.barcode !== "null") {
        existing.barcode = p.barcode;
        byBarcode.set(p.barcode.trim().toLowerCase(), existing);
      }
      if (!existing.brand && p.brand) existing.brand = p.brand;
      if (!existing.supplier && p.supplier) existing.supplier = p.supplier;
      if (!existing.location && p.location) existing.location = p.location;
      if (Number(existing.costPrice) <= 0 && Number(p.costPrice) > 0) existing.costPrice = Number(p.costPrice);
      if (Number(existing.salePrice) <= 0 && Number(p.salePrice) > 0) existing.salePrice = Number(p.salePrice);
    } else {
      const copy = { ...p };
      consolidated.push(copy);
      byId.set(copy.id, copy);
      if (s && s !== "n/a" && s !== "-" && s !== "null") bySku.set(s, copy);
      if (b && b !== "n/a" && b !== "-" && b !== "null") byBarcode.set(b, copy);
      if (n && n.length >= 3) byName.set(n, copy);
    }
  }

  return consolidated;
}

export async function loadOrdersFromSupabase(tenantId: string): Promise<WorkOrder[]> {
  return fetchAllRowsPaginated(
    (from, to) =>
      supabaseAdmin
        .from("orders")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    dbToWorkOrder
  );
}

export async function loadQuotesFromSupabase(tenantId: string): Promise<Quote[]> {
  return fetchAllRowsPaginated(
    (from, to) =>
      supabaseAdmin
        .from("quotes")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    dbToQuote
  );
}

export async function loadInvoicesFromSupabase(tenantId: string): Promise<Invoice[]> {
  return fetchAllRowsPaginated(
    (from, to) =>
      supabaseAdmin
        .from("invoices")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    dbToInvoice
  );
}

export async function loadCajasFromSupabase(tenantId: string): Promise<Caja[]> {
  const rows = await fetchAllRowsPaginated(
    (from, to) =>
      supabaseAdmin
        .from("cajas")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("abierta_en", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    dbToCaja
  );

  // Sanear turnos antiguos que quedaron huérfanos con estado ABIERTA detrás de un turno más reciente
  const sorted = [...rows].sort(
    (a, b) => new Date(b.abierta_en || 0).getTime() - new Date(a.abierta_en || 0).getTime()
  );
  const zombieToClose: Caja[] = [];
  const cleaned = sorted.map((c, idx) => {
    if (idx > 0 && c.estado === "ABIERTA") {
      const fixed: Caja = {
        ...c,
        estado: "CERRADA",
        cerrada_en: c.cerrada_en || sorted[idx - 1]?.abierta_en || new Date().toISOString(),
        notas_cierre: c.notas_cierre || "Cierre automático de turno anterior",
      };
      zombieToClose.push(fixed);
      return fixed;
    }
    return c;
  });

  if (zombieToClose.length > 0) {
    upsertCajas(zombieToClose).catch(() => {});
  }

  return cleaned;
}

export async function loadMovimientosCajaFromSupabase(tenantId: string): Promise<MovimientoCaja[]> {
  return fetchAllRowsPaginated(
    (from, to) =>
      supabaseAdmin
        .from("movimientos_caja")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("creado_en", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    dbToMovimientoCaja
  );
}

export async function loadTechniciansFromSupabase(tenantId: string): Promise<Technician[]> {
  return fetchAllRowsPaginated(
    (from, to) =>
      supabaseAdmin
        .from("technicians")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("id", { ascending: true })
        .range(from, to),
    dbToTechnician
  );
}

export async function loadInventoryMovementsFromSupabase(tenantId: string): Promise<InventoryMovement[]> {
  return fetchAllRowsPaginated(
    (from, to) =>
      supabaseAdmin
        .from("movements")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("date", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    dbToInventoryMovement
  );
}

export async function loadInspectionsFromSupabase(tenantId: string): Promise<Inspection[]> {
  return fetchAllRowsPaginated(
    (from, to) =>
      supabaseAdmin
        .from("inspections")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    dbToInspection
  );
}

export async function loadMaintenanceAlertsFromSupabase(tenantId: string): Promise<MaintenanceAlert[]> {
  return fetchAllRowsPaginated(
    (from, to) =>
      supabaseAdmin
        .from("maintenance_alerts")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    dbToMaintenanceAlert
  );
}

export async function loadMaintenanceHistoryFromSupabase(tenantId: string): Promise<MaintenanceHistoryItem[]> {
  return fetchAllRowsPaginated(
    (from, to) =>
      supabaseAdmin
        .from("maintenance_history")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("id", { ascending: true })
        .range(from, to),
    dbToMaintenanceHistoryItem
  );
}

export async function loadSuppliersFromSupabase(tenantId: string): Promise<Supplier[]> {
  return fetchAllRowsPaginated(
    (from, to) =>
      supabaseAdmin
        .from("suppliers")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    dbToSupplier
  );
}

export async function loadSupplierProductsFromSupabase(tenantId: string): Promise<SupplierProduct[]> {
  return fetchAllRowsPaginated(
    (from, to) =>
      supabaseAdmin
        .from("supplier_products")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("id", { ascending: true })
        .range(from, to),
    dbToSupplierProduct
  );
}

export async function loadPurchaseOrdersFromSupabase(tenantId: string): Promise<PurchaseOrder[]> {
  return fetchAllRowsPaginated(
    (from, to) =>
      supabaseAdmin
        .from("purchase_orders")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    dbToPurchaseOrder
  );
}

export async function loadGoodsReceiptsFromSupabase(tenantId: string): Promise<GoodsReceipt[]> {
  return fetchAllRowsPaginated(
    (from, to) =>
      supabaseAdmin
        .from("goods_receipts")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("received_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    dbToGoodsReceipt
  );
}

export async function loadAccountsPayableFromSupabase(tenantId: string): Promise<AccountPayable[]> {
  return fetchAllRowsPaginated(
    (from, to) =>
      supabaseAdmin
        .from("accounts_payable")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    dbToAccountPayable
  );
}

export async function loadQuoteRequestsFromSupabase(tenantId: string): Promise<QuoteRequest[]> {
  return fetchAllRowsPaginated(
    (from, to) =>
      supabaseAdmin
        .from("quote_requests")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    dbToQuoteRequest
  );
}

export async function loadActivityLogsFromSupabase(tenantId: string): Promise<ActivityLog[]> {
  const { data, error } = await supabaseAdmin.from("activity_logs").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(1000);
  if (error) { console.error("[sync] activity_logs:", error); return []; }
  return (data || []).map(dbToActivityLog);
}

export async function loadUsersFromSupabase(tenantId: string) {
  return fetchAllRowsPaginated(
    (from, to) =>
      supabaseAdmin
        .from("tenant_users")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("id", { ascending: true })
        .range(from, to),
    (row: any) => ({
      id: row.user_id || row.id,
      tenantId: row.tenant_id,
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.status,
      pin: row.pin || undefined,
      createdAt: row.created_at
    })
  );
}

export async function loadOpenTabsFromSupabase(tenantId: string): Promise<OpenTab[]> {
  const rows = await fetchAllRowsPaginated(
    (from, to) =>
      supabaseAdmin
        .from("open_tabs")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    (row: any) => ({
      id: row.id,
      tenantId: row.tenant_id,
      tabName: row.tab_name,
      customerId: row.customer_id,
      mechanicId: row.mechanic_id,
      orderId: row.order_id,
      discount: row.discount || undefined,
      discountType: row.discount_type || undefined,
      items: row.items || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })
  );

  // Ordenar de más reciente a más antigua para conservar siempre la versión más actual y eliminar duplicadas
  const sorted = [...rows].sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt || 0).getTime() -
      new Date(a.updatedAt || a.createdAt || 0).getTime()
  );

  const seenIds = new Set<string>();
  const seenOrderIds = new Set<string>();
  const seenCustomerIds = new Set<string>();
  const seenCustomerNames = new Set<string>();
  const deduped: OpenTab[] = [];
  const duplicateIdsToDelete: string[] = [];

  for (const tab of sorted) {
    if (!tab.id || seenIds.has(tab.id)) continue;
    seenIds.add(tab.id);

    const orderKey = tab.orderId?.trim();
    const custIdKey =
      tab.customerId && tab.customerId !== "walk-in" && tab.customerId !== "none"
        ? tab.customerId.trim()
        : "";
    const custNameKey =
      tab.tabName && tab.tabName.trim().toLowerCase() !== "consumidor final"
        ? tab.tabName.trim().toLowerCase()
        : "";

    let isDuplicate = false;
    if (orderKey && seenOrderIds.has(orderKey)) {
      isDuplicate = true;
    } else if (custIdKey && seenCustomerIds.has(custIdKey)) {
      isDuplicate = true;
    } else if (custNameKey && seenCustomerNames.has(custNameKey)) {
      isDuplicate = true;
    }

    if (isDuplicate) {
      duplicateIdsToDelete.push(tab.id);
      continue;
    }

    if (orderKey) seenOrderIds.add(orderKey);
    if (custIdKey) seenCustomerIds.add(custIdKey);
    if (custNameKey) seenCustomerNames.add(custNameKey);
    deduped.push(tab);
  }

  if (duplicateIdsToDelete.length > 0) {
    duplicateIdsToDelete.forEach((dupId) => {
      deleteRecordFromSupabase("open_tabs", dupId).catch(() => {});
    });
  }

  return deduped;
}

export async function loadInventorySessionsFromSupabase(tenantId: string): Promise<InventorySession[]> {
  return fetchAllRowsPaginated(
    (from, to) =>
      supabaseAdmin
        .from("inventory_sessions")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    dbToInventorySession
  );
}

export async function downloadFullStateFromSupabase(tenantId: string) {
  const [
    customers, vehicles, maintenanceItems, services, products, orders, quotes, invoices,
    cajas, cajaMovements, technicians, movements, inspections, maintenanceAlerts, maintenanceHistory,
    suppliers, supplierProducts, purchaseOrders, goodsReceipts, accountsPayable, quoteRequests, activityLogs, users, openTabs, inventorySessions
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
    loadQuoteRequestsFromSupabase(tenantId),
    loadActivityLogsFromSupabase(tenantId),
    loadUsersFromSupabase(tenantId),
    loadOpenTabsFromSupabase(tenantId),
    loadInventorySessionsFromSupabase(tenantId)
  ]);
  
  return { customers, vehicles, maintenanceItems, services, products, orders, quotes, invoices, cajas, cajaMovements, technicians, movements, inspections, maintenanceAlerts, maintenanceHistory, suppliers, supplierProducts, purchaseOrders, goodsReceipts, accountsPayable, quoteRequests, activityLogs, users, openTabs, inventorySessions };
}


// --- NEW MAPPERS ---
function dbToCaja(row: any): Caja {
  return { id: row.id, tenant_id: row.tenant_id, empleado_id: row.empleado_id, monto_inicial: row.monto_inicial, estado: row.estado, abierta_en: row.abierta_en, cerrada_en: row.cerrada_en, monto_esperado_efectivo: row.monto_esperado_efectivo, monto_contado_efectivo: row.monto_contado_efectivo, monto_contado_tarjeta: row.monto_contado_tarjeta, monto_contado_transferencia: row.monto_contado_transferencia, diferencia: row.diferencia, notas_apertura: row.notas_apertura, notas_cierre: row.notas_cierre };
}
function cajaToDb(c: Caja) {
  return { id: c.id, tenant_id: c.tenant_id, empleado_id: c.empleado_id, monto_inicial: c.monto_inicial, estado: c.estado, abierta_en: c.abierta_en, cerrada_en: c.cerrada_en, monto_esperado_efectivo: c.monto_esperado_efectivo, monto_contado_efectivo: c.monto_contado_efectivo, monto_contado_tarjeta: c.monto_contado_tarjeta, monto_contado_transferencia: c.monto_contado_transferencia, diferencia: c.diferencia, notas_apertura: c.notas_apertura, notas_cierre: c.notas_cierre };
}

function dbToMovimientoCaja(row: any): MovimientoCaja {
  let tipo = row.tipo;
  if (tipo === 'EGRESO' && row.concepto && (row.concepto.includes('[Pago Técnico]') || row.concepto.includes('Liquidación'))) {
    tipo = 'PAGO_NOMINA';
  }
  return { id: row.id, tenant_id: row.tenant_id, caja_id: row.caja_id, empleado_id: row.empleado_id, tecnico_id: row.tecnico_id, tipo, concepto: row.concepto, monto: row.monto, monto_mano_obra: row.monto_mano_obra, metodo: row.metodo, creado_en: row.creado_en };
}
function movimientoCajaToDb(m: MovimientoCaja) {
  const safeTipo = (m.tipo === 'PAGO_NOMINA' || (m.tipo as string) === 'GASTO') ? 'EGRESO' : m.tipo;
  let safeMetodo: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' = 'EFECTIVO';
  const rawMetodo = String(m.metodo || '').toUpperCase();
  if (rawMetodo === 'TARJETA' || rawMetodo === 'CARD') safeMetodo = 'TARJETA';
  else if (rawMetodo === 'TRANSFERENCIA' || rawMetodo === 'TRANSFER') safeMetodo = 'TRANSFERENCIA';
  else safeMetodo = 'EFECTIVO';

  return {
    id: m.id,
    tenant_id: m.tenant_id,
    caja_id: m.caja_id,
    empleado_id: m.empleado_id?.trim() ? m.empleado_id : 'cajero',
    tecnico_id: (m.tecnico_id?.trim() && m.tecnico_id !== 'none') ? m.tecnico_id : null,
    tipo: safeTipo,
    concepto: m.concepto,
    monto: Number(m.monto || 0),
    monto_mano_obra: m.monto_mano_obra ? Number(m.monto_mano_obra) : null,
    metodo: safeMetodo,
    creado_en: m.creado_en || new Date().toISOString(),
  };
}

function dbToTechnician(row: any): Technician {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    phone: row.phone || undefined,
    status: row.status === "inactive" ? "inactive" : "active",
    pagoNomina: row.pago_nomina != null ? Number(row.pago_nomina) || 0 : 0,
    tipoPago: row.tipo_pago === "fijo" ? "fijo" : "porcentaje",
    createdAt: row.created_at || new Date().toISOString(),
  };
}
function technicianToDb(t: Technician) {
  return {
    id: t.id,
    tenant_id: t.tenantId,
    name: t.name,
    phone: t.phone || null,
    status: t.status || "active",
    pago_nomina: Number(t.pagoNomina || 0),
    tipo_pago: t.tipoPago === "fijo" ? "fijo" : "porcentaje",
    created_at: t.createdAt || new Date().toISOString(),
  };
}

function dbToInventoryMovement(row: any): InventoryMovement {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    productId: row.product_id,
    productName: row.product_name,
    variantId: row.variant_id || undefined,
    type: row.type,
    quantity: Number(row.quantity) || 0,
    reason: row.reason,
    date: row.date,
    userId: row.user_id || undefined,
    technicianId: row.technician_id || undefined,
    customerId: row.customer_id || undefined,
    invoiceId: row.invoice_id || undefined,
  };
}
function inventoryMovementToDb(m: InventoryMovement) {
  const isValidUuid = (val?: string | null) =>
    Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

  return {
    id: m.id,
    tenant_id: m.tenantId,
    product_id: m.productId,
    product_name: m.productName,
    variant_id: m.variantId || null,
    type: m.type,
    quantity: Number(m.quantity) || 0,
    reason: m.reason || "",
    date: m.date || new Date().toISOString(),
    user_id: m.userId || null,
    technician_id: m.technicianId || null,
    customer_id: isValidUuid(m.customerId) ? m.customerId : null,
    invoice_id: m.invoiceId || null,
  };
}

function dbToInspection(row: any): Inspection {
  return { id: row.id, tenantId: row.tenant_id, vehicleId: row.vehicle_id, customerId: row.customer_id, workOrderId: row.work_order_id, technicianId: row.technician_id, status: row.status, fuelLevel: row.fuel_level, bodyDamageNotes: row.body_damage_notes, items: row.items, createdAt: row.created_at, completedAt: row.completed_at };
}
function inspectionToDb(i: Inspection) {
  return { id: i.id, tenant_id: i.tenantId, vehicle_id: i.vehicleId, customer_id: i.customerId, work_order_id: i.workOrderId, technician_id: i.technicianId, status: i.status, fuel_level: i.fuelLevel, body_damage_notes: i.bodyDamageNotes, items: i.items, created_at: i.createdAt, completed_at: i.completedAt };
}

function dbToMaintenanceAlert(row: any): MaintenanceAlert {
  return { id: row.id, tenantId: row.tenant_id, vehicleId: row.vehicle_id || "", customerId: row.customer_id || "", maintenanceItemId: row.maintenance_item_id || "", type: row.type, percentage: row.percentage, createdAt: row.created_at, status: row.status };
}
function maintenanceAlertToDb(a: MaintenanceAlert) {
  return { id: a.id, tenant_id: a.tenantId, vehicle_id: a.vehicleId || "", customer_id: a.customerId || "", maintenance_item_id: a.maintenanceItemId || "", type: a.type, percentage: a.percentage, created_at: a.createdAt, status: a.status };
}

function dbToMaintenanceHistoryItem(row: any): MaintenanceHistoryItem {
  return { id: row.id, vehicleId: row.vehicle_id || "", tenantId: row.tenant_id, name: row.name, serviceDate: row.service_date, serviceKm: row.service_km, completedAt: row.completed_at, notes: row.notes };
}
function maintenanceHistoryItemToDb(h: MaintenanceHistoryItem) {
  return { id: h.id, vehicle_id: h.vehicleId || "", tenant_id: h.tenantId, name: h.name, service_date: h.serviceDate, service_km: h.serviceKm, completed_at: h.completedAt, notes: h.notes };
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

function dbToActivityLog(row: any): ActivityLog {
  return { id: row.id, tenantId: row.tenant_id, userId: row.user_id, userName: row.user_name, userRole: row.user_role, action: row.action, details: row.details, module: row.module, createdAt: row.created_at };
}
function activityLogToDb(log: ActivityLog) {
  return { id: log.id, tenant_id: log.tenantId, user_id: log.userId, user_name: log.userName, user_role: log.userRole, action: log.action, details: log.details, module: log.module, created_at: log.createdAt };
}

function dbToInventorySession(row: any): InventorySession {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    status: row.status,
    auditorId: row.auditor_id || undefined,
    discrepancies: row.discrepancies || [],
    createdAt: row.created_at,
    completedAt: row.completed_at || undefined,
  };
}
function inventorySessionToDb(s: InventorySession) {
  return {
    id: s.id,
    tenant_id: s.tenantId,
    name: s.name,
    status: s.status,
    auditor_id: s.auditorId || null,
    discrepancies: s.discrepancies || [],
    created_at: s.createdAt,
    completed_at: s.completedAt || null,
  };
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
    tax: row.tax || 0,
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
    tax: s.tax || 0,
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
    tax: (typeof row.tax === 'number' && row.tax > 0 && row.tax <= 30) ? row.tax : 18,
    image: row.image || undefined,
    supplier: row.supplier || undefined,
    location: row.location || undefined,
    serviceIds: row.service_ids || undefined,
    variants: row.variants || undefined,
    maintenanceCategory: row.maintenance_category || undefined,
    lifespanKm: row.lifespan_km || undefined,
    lifespanDays: row.lifespan_days || undefined,
    vehicleMake: (row.vehicle_make && row.vehicle_make.startsWith('[')) ? (JSON.parse(row.vehicle_make)[0]?.make || undefined) : (row.vehicle_make || undefined),
    vehicleModel: row.vehicle_model || undefined,
    vehicleYear: row.vehicle_year || undefined,
    vehicleCompatibilities: (row.vehicle_make && row.vehicle_make.startsWith('[')) ? JSON.parse(row.vehicle_make) : undefined,
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
    vehicle_make: (p.vehicleCompatibilities && p.vehicleCompatibilities.length > 0) ? JSON.stringify(p.vehicleCompatibilities) : (p.vehicleMake || null),
    vehicle_model: p.vehicleModel || null,
    vehicle_year: p.vehicleYear || null,
    is_combo: p.isCombo || null,
    combo_items: p.comboItems || null,
  };
}

function dbToWorkOrder(row: any): WorkOrder {
  let notes: string | undefined = row.notes || undefined;
  let meta: any = {};

  if (notes && notes.includes("[META]:")) {
    const [cleanNotes, rawMeta] = notes.split("[META]:");
    notes = cleanNotes.trim() || undefined;
    try {
      meta = JSON.parse(rawMeta.trim());
    } catch {
      meta = {};
    }
  }

  return {
    id: row.id,
    tenantId: row.tenant_id,
    customerId: row.customer_id || meta.rawCustomerId || "",
    vehicleId: row.vehicle_id || meta.rawVehicleId || "",
    mechanicId: row.mechanic_id || undefined,
    km: row.km || undefined,
    kmUnit: row.km_unit || undefined,
    status: row.status,
    description: row.description,
    serviceIds: row.service_ids || undefined,
    customServices: row.custom_services || meta.customServices || undefined,
    parts: row.parts || undefined,
    customParts: row.custom_parts || meta.customParts || undefined,
    estimatedTime: row.estimated_time || undefined,
    notes,
    checklist: row.checklist || undefined,
    customerType: row.customer_type || meta.customerType || undefined,
    ncfType: row.ncf_type || meta.ncfType || undefined,
    customerRnc: row.customer_rnc || meta.customerRnc || undefined,
    customerBusinessName: row.customer_business_name || meta.customerBusinessName || undefined,
    quoteId: row.quote_id || meta.quoteId || undefined,
    items: row.items || meta.items || undefined,
    total: Number(row.total) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function workOrderToDb(o: WorkOrder) {
  const isValidUuid = (val?: string | null) =>
    Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

  let cleanNotes = (o.notes || "").split("[META]:")[0].trim();
  const meta: Record<string, any> = {};
  if (o.customerType) meta.customerType = o.customerType;
  if (o.ncfType) meta.ncfType = o.ncfType;
  if (o.customerRnc) meta.customerRnc = o.customerRnc;
  if (o.customerBusinessName) meta.customerBusinessName = o.customerBusinessName;
  if (o.customServices && o.customServices.length > 0) meta.customServices = o.customServices;
  if (o.customParts && o.customParts.length > 0) meta.customParts = o.customParts;
  if (o.quoteId) meta.quoteId = o.quoteId;
  if (o.items && o.items.length > 0) meta.items = o.items;
  if (o.customerId && !isValidUuid(o.customerId)) meta.rawCustomerId = o.customerId;
  if (o.vehicleId && !isValidUuid(o.vehicleId)) meta.rawVehicleId = o.vehicleId;

  const hasMeta = Object.keys(meta).length > 0;
  const serializedNotes = hasMeta
    ? `${cleanNotes ? `${cleanNotes}\n` : ""}[META]:${JSON.stringify(meta)}`
    : cleanNotes || null;

  return {
    id: o.id,
    tenant_id: o.tenantId,
    customer_id: isValidUuid(o.customerId) ? o.customerId : null,
    vehicle_id: isValidUuid(o.vehicleId) ? o.vehicleId : null,
    mechanic_id: o.mechanicId || null,
    km: o.km || null,
    km_unit: o.kmUnit || null,
    status: o.status,
    description: o.description || "",
    service_ids: o.serviceIds || [],
    parts: o.parts || [],
    estimated_time: o.estimatedTime || null,
    notes: serializedNotes,
    checklist: o.checklist || [],
    total: o.total || 0,
    created_at: o.createdAt,
    updated_at: o.updatedAt,
  };
}

function dbToQuote(row: any): Quote {
  let notes: string | undefined = row.notes || undefined;
  let observation: string | undefined = undefined;
  let meta: any = {};

  if (notes && notes.includes("[META]:")) {
    const [beforeMeta, rawMeta] = notes.split("[META]:");
    notes = beforeMeta.trim() || undefined;
    try {
      meta = JSON.parse(rawMeta.trim());
    } catch {
      meta = {};
    }
  }

  if (notes && notes.includes("[OBS]:")) {
    const parts = notes.split("[OBS]:");
    notes = parts[0].trim() || undefined;
    observation = parts[1].trim() || undefined;
  }

  return {
    id: row.id,
    tenantId: row.tenant_id,
    customerId: row.customer_id || meta.rawCustomerId || "",
    vehicleId: row.vehicle_id || meta.rawVehicleId || "",
    quoteNumber: row.quote_number,
    status: row.status,
    validUntil: row.valid_until || undefined,
    subtotal: Number(row.subtotal) || 0,
    tax: Number(row.tax) || 0,
    discount: row.discount ? Number(row.discount) : undefined,
    total: Number(row.total) || 0,
    notes,
    observation,
    items: row.items || [],
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function quoteToDb(q: Quote) {
  const isValidUuid = (val?: string | null) =>
    Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

  let cleanNotes = (q.notes || "").split("[META]:")[0].split("[OBS]:")[0].trim();
  let combinedNotes = cleanNotes;
  if (q.observation) {
    combinedNotes = combinedNotes ? `${combinedNotes}\n[OBS]: ${q.observation}` : `[OBS]: ${q.observation}`;
  }

  const meta: Record<string, any> = {};
  if (q.customerId && !isValidUuid(q.customerId)) meta.rawCustomerId = q.customerId;
  if (q.vehicleId && !isValidUuid(q.vehicleId)) meta.rawVehicleId = q.vehicleId;

  if (Object.keys(meta).length > 0) {
    combinedNotes = combinedNotes ? `${combinedNotes}\n[META]:${JSON.stringify(meta)}` : `[META]:${JSON.stringify(meta)}`;
  }

  return {
    id: q.id,
    tenant_id: q.tenantId,
    customer_id: isValidUuid(q.customerId) ? q.customerId : null,
    vehicle_id: isValidUuid(q.vehicleId) ? q.vehicleId : null,
    quote_number: q.quoteNumber,
    status: q.status,
    valid_until: q.validUntil || null,
    subtotal: q.subtotal,
    tax: q.tax,
    discount: q.discount || null,
    total: q.total,
    notes: combinedNotes || null,
    items: q.items || [],
    created_at: q.createdAt || new Date().toISOString(),
    updated_at: q.updatedAt || new Date().toISOString(),
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
  const isValidUuid = (val?: string | null) =>
    Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

  let safePaymentMethod: 'cash' | 'card' | 'transfer' | 'credit' = 'cash';
  const pm = String(i.paymentMethod || '').toLowerCase();
  if (pm.includes('card') || pm.includes('tarjeta') || pm.includes('mixt')) safePaymentMethod = 'card';
  else if (pm.includes('transfer') || pm.includes('transf')) safePaymentMethod = 'transfer';
  else if (pm.includes('credit') || pm.includes('cred')) safePaymentMethod = 'credit';
  else safePaymentMethod = 'cash';

  const safeCustomerId = isValidUuid(i.customerId) ? i.customerId : null;
  const safeCustomerName = i.customerName || (i.customerId === 'walk-in' || !i.customerId ? 'Consumidor Final' : null);

  return {
    id: i.id,
    tenant_id: i.tenantId,
    customer_id: safeCustomerId,
    customer_name: safeCustomerName,
    customer_rnc: i.customerRnc || null,
    vehicle_id: (i.vehicleId && i.vehicleId !== 'none') ? i.vehicleId : null,
    order_id: (i.orderId && i.orderId !== 'none') ? i.orderId : null,
    mechanic_id: (i.mechanicId && i.mechanicId !== 'none') ? i.mechanicId : null,
    km: i.km || null,
    km_unit: i.kmUnit || null,
    items: i.items || [],
    subtotal: Number(i.subtotal || 0),
    tax: Number(i.tax || 0),
    discount: i.discount ? Number(i.discount) : null,
    total: Number(i.total || 0),
    payment_method: safePaymentMethod,
    status: i.status || 'paid',
    ncf: i.ncf || null,
    qr_url: i.qrUrl || null,
    security_code: i.securityCode || null,
    signature_date: i.signatureDate || null,
    notes: typeof i.notes === 'string' ? i.notes : (i.notes ? JSON.stringify(i.notes) : null),
    is_commission_paid: i.isCommissionPaid || null,
    created_at: i.createdAt || new Date().toISOString(),
  };
}

// ─── Upsert to Supabase ───────────────────────────────────────────────────────

export async function deleteRecordFromSupabase(table: string, id: string): Promise<void> {
  // Si la tabla es open_tabs, el ID en Supabase se almacena textualmente en la columna id
  const { error } = await supabaseAdmin.from(table).delete().eq("id", id);
  if (error) console.error(`[sync] delete ${table} error:`, error);
}


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
  const CHUNK_SIZE = 100;
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    const { error } = await supabaseAdmin.from("products").upsert(chunk.map(productToDb), { onConflict: "id" });
    if (error) console.error("[sync] upsert products chunk error:", error);
  }
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
  const CHUNK_SIZE = 100;
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    const { error } = await supabaseAdmin.from("movements").upsert(chunk.map(inventoryMovementToDb), { onConflict: "id" });
    if (error) console.error("[sync] upsert movements chunk error:", error);
  }
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
  // Ignorar items viejos con IDs cortos (Math.random) para no romper el tipo uuid en postgres
  const validItems = items.filter(i => i.id && i.id.length === 36);
  if (validItems.length === 0) return;
  const { error } = await supabaseAdmin.from("maintenance_history").upsert(validItems.map(maintenanceHistoryItemToDb), { onConflict: "id" });
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
export async function upsertActivityLogs(items: ActivityLog[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabaseAdmin.from("activity_logs").upsert(items.map(activityLogToDb), { onConflict: "id" });
  if (error) console.error("[sync] upsert activity_logs:", error);
}
export async function upsertOpenTabs(items: OpenTab[]): Promise<void> {
  if (items.length === 0) return;
  const dbItems = items.map(t => ({
    id: t.id,
    tenant_id: t.tenantId,
    tab_name: t.tabName,
    customer_id: t.customerId,
    mechanic_id: t.mechanicId,
    order_id: t.orderId || null,
    items: t.items,
    discount: t.discount || 0,
    discount_type: t.discountType || "fixed",
    created_at: t.createdAt,
    updated_at: t.updatedAt
  }));
  const { error } = await supabaseAdmin.from("open_tabs").upsert(dbItems, { onConflict: "id" });
  if (error) console.error("[sync] upsert open_tabs:", error);
}

export async function upsertInventorySessions(items: InventorySession[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabaseAdmin.from("inventory_sessions").upsert(items.map(inventorySessionToDb), { onConflict: "id" });
  if (error) console.error("[sync] upsert inventory_sessions:", error);
}

export async function deleteTenantUserFromSupabase(id: string, tenantId?: string): Promise<void> {
  try {
    // 1. Localizar el registro para obtener el user_id de Auth
    let findQuery = supabaseAdmin
      .from("tenant_users")
      .select("id, user_id, email, tenant_id")
      .or(`id.eq.${id},user_id.eq.${id}`);
    if (tenantId) findQuery = findQuery.eq("tenant_id", tenantId);
    const { data: records } = await findQuery;
    const targetUserId = records?.[0]?.user_id || (id.includes("-") ? id : null);

    // 2. Eliminar de tenant_users
    let query = supabaseAdmin.from("tenant_users").delete().or(`id.eq.${id},user_id.eq.${id}`);
    if (tenantId) query = query.eq("tenant_id", tenantId);
    const { error } = await query;
    if (error) console.error("[sync] delete tenant_user error:", error);

    // 3. Si ya no le quedan otros talleres, eliminar de auth.users
    if (targetUserId) {
      const { data: remaining } = await supabaseAdmin
        .from("tenant_users")
        .select("id")
        .eq("user_id", targetUserId);

      if (!remaining || remaining.length === 0) {
        const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
        if (authErr) {
          console.error("[sync] delete auth user error:", authErr);
        } else {
          console.log(`[sync] Usuario ${targetUserId} eliminado definitivamente de Supabase Auth.`);
        }
      }
    }
  } catch (err) {
    console.error("[sync] deleteTenantUserFromSupabase error:", err);
  }
}

export async function syncTenantToSupabase(id: string, updates: Partial<Tenant>): Promise<void> {
  const dbUpdates: Record<string, any> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.slug !== undefined) dbUpdates.slug = updates.slug;
  if (updates.logo !== undefined) dbUpdates.logo = updates.logo || null;
  if (updates.address !== undefined) dbUpdates.address = updates.address || null;
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone || null;
  if (updates.email !== undefined) dbUpdates.email = updates.email || null;
  if (updates.rnc !== undefined) dbUpdates.rnc = updates.rnc || null;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.wasenderApiKey !== undefined) dbUpdates.wasender_api_key = updates.wasenderApiKey || null;
  if (updates.wasenderPhone !== undefined) dbUpdates.wasender_phone = updates.wasenderPhone || null;
  if (updates.monto_caja_chica !== undefined) dbUpdates.monto_caja_chica = updates.monto_caja_chica;
  if (updates.monto_actual_caja_chica !== undefined) dbUpdates.monto_actual_caja_chica = updates.monto_actual_caja_chica;
  if (updates.plan_id !== undefined) dbUpdates.plan_id = updates.plan_id;
  if (updates.estado !== undefined) dbUpdates.estado = updates.estado;
  if (updates.trial_hasta !== undefined) dbUpdates.trial_hasta = updates.trial_hasta;
  if (updates.max_sucursales !== undefined) dbUpdates.max_sucursales = updates.max_sucursales;
  if (updates.color_primario !== undefined) dbUpdates.color_primario = updates.color_primario;
  if (updates.color_secundario !== undefined) dbUpdates.color_secundario = updates.color_secundario;
  
  if (updates.config !== undefined || updates.adminPin !== undefined) {
    const configToSave = { ...(updates.config || {}) };
    if (updates.adminPin !== undefined) {
      configToSave.adminPin = updates.adminPin;
    }
    dbUpdates.config = configToSave;
  }

  if (Object.keys(dbUpdates).length === 0) return;
  const { error } = await supabaseAdmin.from("tenants").update(dbUpdates).eq("id", id);
  if (error) console.error("[sync] error updating tenant in Supabase:", error);
}

export async function createTenantInSupabase(t: Tenant): Promise<void> {
  const dbRow = {
    id: t.id,
    name: t.name,
    slug: t.slug,
    logo: t.logo || null,
    address: t.address || null,
    phone: t.phone || null,
    email: t.email || null,
    rnc: t.rnc || null,
    status: t.status || 'pending',
    wasender_api_key: t.wasenderApiKey || null,
    wasender_phone: t.wasenderPhone || null,
    monto_caja_chica: t.monto_caja_chica || 0,
    monto_actual_caja_chica: t.monto_actual_caja_chica || 0,
    config: t.config || {},
    plan_id: t.plan_id || 'basico',
    estado: t.estado || 'ACTIVO',
    trial_hasta: t.trial_hasta || null,
    color_primario: t.color_primario || '#000000',
    color_secundario: t.color_secundario || '#4b5563',
  };
  const { error } = await supabaseAdmin.from("tenants").insert(dbRow);
  if (error) console.error("[sync] error inserting tenant:", error);
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
    quoteRequests?: QuoteRequest[],
    activityLogs?: ActivityLog[],
    openTabs?: OpenTab[],
    inventorySessions?: InventorySession[]
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
  if (state.activityLogs) tasks.push(upsertActivityLogs(state.activityLogs.filter(i => i.tenantId === tenantId)));
  if (state.openTabs) tasks.push(upsertOpenTabs(state.openTabs.filter(i => i.tenantId === tenantId)));
  if (state.inventorySessions) tasks.push(upsertInventorySessions(state.inventorySessions.filter(i => i.tenantId === tenantId)));

  await Promise.all(tasks);
  console.log(`[sync] Synced full state for tenant ${tenantId} to Supabase`);
}

/**
 * Recarga de forma quirúrgica e instantánea una sola tabla desde Supabase e impacta directamente el store local.
 * Esto evita re-descargar todo el sistema cuando solo cambió un pedido, factura, producto o caja.
 */
export async function syncTableFromSupabase(table: string, tenantId: string): Promise<void> {
  const store = (await import("@/store/useStore")).useStore;
  switch (table) {
    case "products": {
      const products = await loadProductsFromSupabase(tenantId);
      store.setState({ products });
      break;
    }
    case "orders": {
      const orders = await loadOrdersFromSupabase(tenantId);
      store.setState({ orders });
      break;
    }
    case "invoices": {
      const invoices = await loadInvoicesFromSupabase(tenantId);
      store.setState({ invoices });
      break;
    }
    case "cajas": {
      const cajas = await loadCajasFromSupabase(tenantId);
      store.setState({ cajas });
      break;
    }
    case "movimientos_caja": {
      const cajaMovements = await loadMovimientosCajaFromSupabase(tenantId);
      store.setState({ cajaMovements });
      break;
    }
    case "customers": {
      const customers = await loadCustomersFromSupabase(tenantId);
      store.setState({ customers });
      break;
    }
    case "vehicles": {
      const vehicles = await loadVehiclesFromSupabase(tenantId);
      store.setState({ vehicles });
      break;
    }
    case "quotes": {
      const quotes = await loadQuotesFromSupabase(tenantId);
      store.setState({ quotes });
      break;
    }
    case "movements": {
      const movements = await loadInventoryMovementsFromSupabase(tenantId);
      store.setState({ movements });
      break;
    }
    case "technicians": {
      const technicians = await loadTechniciansFromSupabase(tenantId);
      store.setState({ technicians });
      break;
    }
    case "services": {
      const services = await loadServicesFromSupabase(tenantId);
      store.setState({ services });
      break;
    }
    case "suppliers": {
      const suppliers = await loadSuppliersFromSupabase(tenantId);
      store.setState({ suppliers });
      break;
    }
    case "purchase_orders": {
      const purchaseOrders = await loadPurchaseOrdersFromSupabase(tenantId);
      store.setState({ purchaseOrders });
      break;
    }
    case "goods_receipts": {
      const goodsReceipts = await loadGoodsReceiptsFromSupabase(tenantId);
      store.setState({ goodsReceipts });
      break;
    }
    case "accounts_payable": {
      const accountsPayable = await loadAccountsPayableFromSupabase(tenantId);
      store.setState({ accountsPayable });
      break;
    }
    case "open_tabs": {
      const openTabs = await loadOpenTabsFromSupabase(tenantId);
      store.setState({ openTabs });
      break;
    }
    case "inventory_sessions": {
      const inventorySessions = await loadInventorySessionsFromSupabase(tenantId);
      store.setState({ inventorySessions });
      break;
    }
    case "inspections": {
      const inspections = await loadInspectionsFromSupabase(tenantId);
      store.setState({ inspections });
      break;
    }
    case "maintenance_items": {
      const maintenanceItems = await loadMaintenanceItemsFromSupabase(tenantId);
      store.setState({ maintenanceItems });
      break;
    }
    case "maintenance_alerts": {
      const maintenanceAlerts = await loadMaintenanceAlertsFromSupabase(tenantId);
      store.setState({ maintenanceAlerts });
      break;
    }
    case "maintenance_history": {
      const maintenanceHistory = await loadMaintenanceHistoryFromSupabase(tenantId);
      store.setState({ maintenanceHistory });
      break;
    }
    case "activity_logs": {
      const activityLogs = await loadActivityLogsFromSupabase(tenantId);
      store.setState({ activityLogs });
      break;
    }
    case "tenant_users": {
      const users = await loadUsersFromSupabase(tenantId);
      store.setState({ users });
      break;
    }
    default:
      console.warn(`[sync] Tabla '${table}' no mapeada en syncTableFromSupabase`);
  }
}

/**
 * Realiza un vaciado total y definitivo del inventario de un taller en Supabase.
 * Elimina movimientos, sesiones, productos vinculados a proveedores y productos.
 * Utiliza múltiples pasadas por lote si es necesario para garantizar que NINGÚN registro quede en el limbo.
 */
export async function wipeEntireInventoryFromSupabase(tenantId: string): Promise<{ success: boolean; error?: any }> {
  try {
    console.log(`[wipeInventory] Iniciando vaciado total de inventario para tenant ${tenantId}...`);

    // 1. Eliminar movimientos de inventario en masa y por lotes de seguridad
    await supabaseAdmin.from("movements").delete().eq("tenant_id", tenantId);
    let hasMovements = true;
    while (hasMovements) {
      const { data: batch, error: batchErr } = await supabaseAdmin
        .from("movements")
        .select("id")
        .eq("tenant_id", tenantId)
        .limit(500);
      if (batchErr || !batch || batch.length === 0) {
        hasMovements = false;
        break;
      }
      const ids = batch.map((r: any) => r.id);
      await supabaseAdmin.from("movements").delete().in("id", ids);
    }

    // 2. Eliminar sesiones de inventario (si existen)
    await supabaseAdmin.from("inventory_sessions").delete().eq("tenant_id", tenantId);

    // 3. Eliminar productos de proveedores vinculados (supplier_products)
    await supabaseAdmin.from("supplier_products").delete().eq("tenant_id", tenantId);

    // 4. Eliminar productos en masa
    const { error: directErr } = await supabaseAdmin.from("products").delete().eq("tenant_id", tenantId);
    if (directErr) {
      console.warn("[wipeInventory] Direct products delete error, trying chunked delete:", directErr);
    }

    // 5. Verificación activa y eliminación por lotes de IDs por si PostgREST dejó remanentes
    let hasProducts = true;
    let attempts = 0;
    while (hasProducts && attempts < 25) {
      attempts++;
      const { data: batch, error: bErr } = await supabaseAdmin
        .from("products")
        .select("id")
        .eq("tenant_id", tenantId)
        .limit(500);

      if (bErr) {
        console.error("[wipeInventory] Error verificando remanentes de productos:", bErr);
        break;
      }

      if (!batch || batch.length === 0) {
        hasProducts = false;
        break;
      }

      const ids = batch.map((p: any) => p.id);
      console.log(`[wipeInventory] Eliminando remanentes de productos (lote de ${ids.length})...`);
      const { error: delErr } = await supabaseAdmin.from("products").delete().in("id", ids);
      if (delErr) {
        console.error("[wipeInventory] Error borrando lote de productos:", delErr);
        throw delErr;
      }
    }

    // 6. Comprobación final en Supabase
    const { count: finalCount } = await supabaseAdmin
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId);

    if (finalCount && finalCount > 0) {
      throw new Error(`Quedaron ${finalCount} productos sin poder eliminarse en Supabase.`);
    }

    console.log(`[wipeInventory] ✅ Vaciado total completado con éxito para tenant ${tenantId}.`);
    return { success: true };
  } catch (err: any) {
    console.error(`[wipeInventory] ❌ Error durante el vaciado de inventario:`, err);
    return { success: false, error: err };
  }
}

