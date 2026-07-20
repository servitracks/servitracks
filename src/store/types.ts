export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  rnc?: string;
  status?: 'active' | 'pending' | 'suspended';
  wasenderApiKey?: string;
  wasenderPhone?: string;
  monto_caja_chica?: number;
  monto_actual_caja_chica?: number;
  adminPin?: string;
  config?: {
    umbral_diferencia_caja?: number;
    formato_ticket?: '57mm' | '80mm';
    formato_ticket_default?: '57mm' | '80mm';
    autoDeductInventory?: boolean;
    ecfConfig?: {
      useOwnCredentials: boolean;
      clientId?: string;
      clientSecret?: string;
      environment: 'sandbox' | 'production';
    };
  };
  plan_id?: string;
  estado?: 'ACTIVO' | 'TRIAL' | 'SUSPENDIDO' | 'CANCELADO';
  trial_hasta?: string;
  color_primario?: string;
  color_secundario?: string;
}

export interface TenantUser {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: 'owner' | 'mechanic' | 'cashier' | 'receptionist' | 'warehouse';
  status: 'active' | 'invited' | 'inactive';
  pin?: string;
  createdAt: string;
}

export interface PrintSettings {
  paperSize: '80mm' | '58mm' | 'A4';
  showLogo: boolean;
  showNcf: boolean;
  showItbis: boolean;
  showChange: boolean;
  copies: number;
  footer: string;
  warrantyText?: string;
  showWarranty?: boolean;
}

export interface BarcodeSettings {
  width: number;
  height: number;
  showText: boolean;
  fontSize: number;
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  email?: string;
  rnc?: string;
  address?: string;
  notes?: string;
  tags?: string[];
  birthday?: string;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  customerId: string;
  tenantId: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  vin?: string;
  color?: string;
  km?: number;
  fuel?: string;
  transmission?: string;
  lastService?: string;
  nextService?: string;
}

export interface Service {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  price: number;
  laborPrice?: number; // Comisión del técnico / Costo de mano de obra
  duration?: string;
  category?: string;
  /** Categoría interna de mantenimiento que dispara este servicio */
  maintenanceCategory?: 'engine' | 'brakes' | 'tires' | 'battery' | 'suspension' | 'transmission' | 'cooling' | 'ac' | 'steering' | 'others';
  /** Vida útil en kilómetros que otorga este servicio al vehículo */
  lifespanKm?: number;
  /** Vida útil en días que otorga este servicio al vehículo */
  lifespanDays?: number;
  /** Impuesto aplicable al servicio (%) */
  tax?: number;
}

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  brand?: string;
  type?: string;
  costPrice: number;
  salePrice: number;
  laborPrice?: number; // Comisión del técnico si este producto incluye mano de obra o es un servicio
  stock: number;
  minStock: number;
  tax: number;
  image?: string;
  supplier?: string;
  location?: string;
  serviceIds?: string[];
  variants?: ProductVariant[];
  /** Categoría interna de mantenimiento que dispara este producto al instalarse */
  maintenanceCategory?: 'engine' | 'brakes' | 'tires' | 'battery' | 'suspension' | 'transmission' | 'cooling' | 'ac' | 'steering' | 'others';
  /** Vida útil en kilómetros que otorga este producto al vehículo */
  lifespanKm?: number;
  /** Vida útil en días que otorga este producto al vehículo */
  lifespanDays?: number;
  /** Compatibilidad de vehículo */
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  vehicleCompatibilities?: { make: string; model: string; year: string }[];
  /** Indica si este producto es un combo/paquete de varios productos */
  isCombo?: boolean;
  /** Artículos incluidos en el combo (si isCombo es true) */
  comboItems?: {
    productId: string;
    quantity: number;
    unitPriceAtCreation?: number;
  }[];
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  stock: number;
  price?: number;
}

export interface InventoryMovement {
  id: string;
  tenantId: string;
  productId: string;
  productName: string;
  variantId?: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  date: string;
  userId?: string;
  technicianId?: string;
  customerId?: string;
  invoiceId?: string;
}

export interface WorkOrder {
  id: string;
  tenantId: string;
  customerId: string;
  vehicleId: string;
  mechanicId?: string;
  km?: number;
  kmUnit?: 'km' | 'mi';
  status: 'pending' | 'diagnosing' | 'repairing' | 'waiting_parts' | 'finished' | 'delivered' | 'invoiced';
  description: string;
  serviceIds?: string[]; // Multiple services selected
  parts?: { productId: string; quantity: number }[]; // Parts dispatched from warehouse
  estimatedTime?: string;
  notes?: string;
  checklist?: { item: string; completed: boolean }[];
  total: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  productId?: string;
  serviceId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  laborPrice?: number; // Comisión del técnico extraída en el momento de la venta
  discount?: number;
  tax: number;
}

export interface Invoice {
  id: string;
  tenantId: string;
  customerId?: string;
  customerName?: string;
  customerRnc?: string;
  vehicleId?: string;
  orderId?: string;
  mechanicId?: string;
  km?: number;
  kmUnit?: 'km' | 'mi';
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount?: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'credit';
  status: 'paid' | 'pending' | 'cancelled';
  ncf?: string;
  qrUrl?: string;
  securityCode?: string;
  signatureDate?: string;
  notes?: string;
  isCommissionPaid?: boolean;
  createdAt: string;
}

export interface Technician {
  id: string;
  tenantId: string;
  name: string;
  phone?: string;
  status: 'active' | 'inactive';
  pagoNomina?: number;
  tipoPago?: 'porcentaje' | 'fijo';
  createdAt: string;
}

export interface WhatsAppLog {
  id: string;
  tenantId: string;
  customerId: string;
  customerName: string;
  phone: string;
  type: 'reminder' | 'notification' | 'marketing' | 'invoice';
  message: string;
  status: 'sent' | 'failed' | 'pending';
  sentAt: string;
}

export interface MaintenanceItem {
  id: string;
  vehicleId: string;
  tenantId: string;
  name: string; // e.g., "Cambio de Aceite"
  lastServiceDate: string;
  lastServiceKm: number;
  lifespanKm: number;
  lifespanDays: number;
  currentPercentage: number;
  category: 'engine' | 'brakes' | 'tires' | 'battery' | 'suspension' | 'transmission' | 'cooling' | 'ac' | 'steering' | 'others';
}

export interface MaintenanceHistoryItem {
  id: string;
  vehicleId: string;
  tenantId: string;
  name: string;
  serviceDate: string;
  serviceKm: number;
  completedAt: string;
  notes?: string;
}

export interface MaintenanceAlert {
  id: string;
  tenantId: string;
  vehicleId: string;
  customerId: string;
  maintenanceItemId: string;
  type: 'preventive' | 'critical';
  percentage: number;
  createdAt: string;
  status: 'pending' | 'dismissed' | 'notified';
}

export interface Caja {
  id: string;
  tenant_id: string;
  empleado_id: string;
  monto_inicial: number;
  estado: 'ABIERTA' | 'CERRADA';
  abierta_en: string;
  cerrada_en?: string;
  monto_esperado_efectivo?: number;
  monto_contado_efectivo?: number;
  monto_contado_tarjeta?: number;
  monto_contado_transferencia?: number;
  diferencia?: number;
  notas_apertura?: string;
  notas_cierre?: string;
}

export type TipoMovimiento = 'INGRESO' | 'EGRESO' | 'RETIRO' | 'GASTO_CAJA_CHICA' | 'VENTA' | 'ABONO' | 'PAGO_NOMINA';
export type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';

export interface MovimientoCaja {
  id: string;
  tenant_id: string;
  caja_id: string;
  empleado_id: string;
  tecnico_id?: string;
  tipo: TipoMovimiento;
  concepto: string;
  monto: number;
  monto_mano_obra?: number;
  metodo: MetodoPago;
  creado_en: string;
}

export interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  rol: 'ADMIN' | 'CAJERO' | 'TECNICO';
  pin: string;
}

export type PlanId = 'basico' | 'pro' | 'enterprise' | string;

export interface Plan {
  id: PlanId;
  nombre: string;
  precio_mensual: number;
  precio_anual?: number;
  limite_empleados: number;
  limite_ordenes_mes: number | null;
  limite_whatsapp_mes?: number;
  /** Máximo de sucursales permitidas. null = ilimitadas */
  limite_sucursales: number | null;
  /** Costo mensual (RD$) por cada sucursal adicional */
  precio_sucursal_adicional: number;
  modulos: {
    whatsapp: boolean;
    facturacion_fiscal: boolean;
    multisucursal: boolean;
    logistica: boolean;
  };
  destacado?: boolean;
  polar_product_monthly_url?: string;
  polar_product_yearly_url?: string;
}

export interface BankDetails {
  banco: string;
  titular: string;
  rnc: string;
  tipo_cuenta: string;
  numero_cuenta: string;
}

export interface GlobalConfig {
  requirePlanOnRegistration: boolean;
  trialDays: number;
  defaultPlanId: PlanId;
  bankDetails?: BankDetails;
}

export interface LicenciaLocal {
  id: string;
  codigo: string;
  nombre_lavanderia: string;
  estado: 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO';
  es_anual: boolean;
  expira_en?: string;
  whatsapp_activo: boolean;
  facturacion_activa: boolean;
}

export interface Conversation {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  last_msg: string;
  time: string;
  unread: number;
  status: 'activa' | 'finalizada';
  agent: 'ia' | 'humano';
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
  payload?: any;
  reply_to_id?: string | null;
  reactions?: { emoji: string; from: string }[] | null;
  status?: string;
}

// ════════════════════════════════════════════════════════════════════════════════
// MÓDULO DE PROVEEDORES — Centro de Gestión de Compras y Abastecimiento
// ════════════════════════════════════════════════════════════════════════════════

export type SupplierType = 'repuestos' | 'lubricantes' | 'neumaticos' | 'herramientas' | 'servicios_externos';
export type SupplierStatus = 'activo' | 'suspendido' | 'bloqueado';
export type Currency = 'DOP' | 'USD' | 'EUR';

export interface SupplierContact {
  name: string;
  role: string;
  phone: string;
  whatsapp?: string;
  email?: string;
}

export interface Supplier {
  id: string;
  tenantId: string;
  code: string;              // Auto-generated: PROV-001
  commercialName: string;
  legalName?: string;
  rnc?: string;
  type: SupplierType;
  status: SupplierStatus;
  contacts: SupplierContact[];
  // Location
  country?: string;
  province?: string;
  city?: string;
  address?: string;
  googleMapsUrl?: string;
  // Commercial Conditions
  creditLimit?: number;
  creditDays?: number;
  generalDiscount?: number;
  volumeDiscount?: number;
  itbis?: number;
  currency: Currency;
  // Evaluation (1-5 stars)
  ratingDelivery: number;
  ratingQuality: number;
  ratingPrice: number;
  ratingService: number;
  // Notes
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/** Vinculación Proveedor-Producto (catálogo del proveedor) */
export interface SupplierProduct {
  id: string;
  tenantId: string;
  supplierId: string;
  productId: string;         // Link to existing Product
  currentPrice: number;
  lastPrice?: number;
  lastUpdated: string;
}

// ──── ÓRDENES DE COMPRA ──────────────────────────────────────────────────────

export type PurchaseOrderStatus = 'borrador' | 'pendiente' | 'enviada' | 'recibida_parcial' | 'recibida_completa' | 'cancelada';

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  salePrice: number;
  receivedQuantity: number;
}

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  supplierId: string;
  number: string;            // OC-2026-001
  invoiceNumber?: string;    // Factura/NCF del proveedor
  paymentStatus: 'paid' | 'pending' | 'partial' | 'transfer' | 'check';
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  expectedDelivery?: string;
}

// ──── RECEPCIÓN DE MERCANCÍA ─────────────────────────────────────────────────

export interface GoodsReceiptItem {
  productId: string;
  productName: string;
  expectedQuantity: number;
  receivedQuantity: number;
  damagedQuantity: number;
  notes?: string;
}

export interface GoodsReceipt {
  id: string;
  tenantId: string;
  purchaseOrderId: string;
  supplierId: string;
  items: GoodsReceiptItem[];
  receivedAt: string;
  receivedBy: string;
  notes?: string;
}

// ──── CUENTAS POR PAGAR ──────────────────────────────────────────────────────

export type PayableStatus = 'pendiente' | 'parcial' | 'pagada' | 'vencida';

export interface AccountPayable {
  id: string;
  tenantId: string;
  supplierId: string;
  purchaseOrderId?: string;
  invoiceNumber: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: PayableStatus;
  createdAt: string;
  paidAt?: string;
  notes?: string;
}

// ──── SOLICITUD DE COTIZACIÓN ────────────────────────────────────────────────

export type QuoteRequestStatus = 'pendiente' | 'cotizada' | 'aceptada' | 'rechazada';

export interface QuoteResponse {
  supplierId: string;
  price: number;
  deliveryDays?: number;
  notes?: string;
  receivedAt: string;
}

export interface QuoteRequest {
  id: string;
  tenantId: string;
  productName: string;
  description?: string;
  supplierIds: string[];
  responses: QuoteResponse[];
  status: QuoteRequestStatus;
  createdAt: string;
}

// ════════════════════════════════════════════════════════════════════════════════
// MÓDULO DE INSPECCIONES DIGITALES (MPI - Multi-Point Inspection)
// ════════════════════════════════════════════════════════════════════════════════

export interface InspectionItem {
  id: string;
  category: string; // Ej: "Frenos", "Líquidos", "Neumáticos"
  name: string; // Ej: "Pastillas delanteras"
  condition: 'ok' | 'warning' | 'critical' | 'unchecked';
  notes?: string;
  photoUrl?: string; // Evidencia fotográfica
}

export interface Inspection {
  id: string;
  tenantId: string;
  vehicleId: string;
  customerId: string;
  workOrderId?: string;
  technicianId?: string;
  status: 'draft' | 'completed';
  fuelLevel: 'empty' | '1/4' | '1/2' | '3/4' | 'full';
  bodyDamageNotes?: string;
  items: InspectionItem[];
  createdAt: string;
  completedAt?: string;
}

// ════════════════════════════════════════════════════════════════════════════════
// MÓDULO DE COTIZACIONES (CLIENTES)
// ════════════════════════════════════════════════════════════════════════════════

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

export interface QuoteItem {
  id: string;
  productId?: string;
  serviceId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  taxPercentage: number;
  discountPercentage?: number;
  total: number;
}

export interface Quote {
  id: string;
  tenantId: string;
  customerId: string;
  vehicleId: string;
  quoteNumber: string; // Ej: COT-2026-0001
  status: QuoteStatus;
  validUntil?: string; // Formato YYYY-MM-DD
  subtotal: number;
  tax: number;
  discount?: number;
  total: number;
  notes?: string;
  items: QuoteItem[];
  createdAt: string;
  updatedAt: string;
}

// ════════════════════════════════════════════════════════════════════════════════
// MÓDULO DE CONTROL DE INVENTARIO
// ════════════════════════════════════════════════════════════════════════════════

export interface InventorySessionItem {
  productId: string;
  productName: string;
  expectedQuantity: number;
  actualQuantity: number;
  difference: number;
  notes?: string;
}

export interface InventorySession {
  id: string;
  tenantId: string;
  name: string;
  status: 'en_progreso' | 'cerrado';
  auditorId?: string;
  discrepancies: InventorySessionItem[];
  createdAt: string;
  completedAt?: string;
}

