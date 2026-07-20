import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Tenant, TenantUser, PrintSettings, BarcodeSettings, Customer, Vehicle,
  Service, Product, InventoryMovement, WorkOrder, Invoice,
  WhatsAppLog, MaintenanceItem, MaintenanceHistoryItem, MaintenanceAlert, Technician,
  Caja, MovimientoCaja, Empleado, Plan, PlanId, GlobalConfig, LicenciaLocal, Conversation, ChatMessage,
  Supplier, SupplierProduct, PurchaseOrder, GoodsReceipt, AccountPayable, QuoteRequest,
  Inspection, InspectionItem, Quote, QuoteItem, QuoteStatus, InventorySession
} from './types';

// Re-export types for backward compatibility
export type { Tenant, TenantUser, PrintSettings, BarcodeSettings, Customer, Vehicle, Service, Product, ProductVariant, InventoryMovement, WorkOrder, InvoiceItem, Invoice, WhatsAppLog, MaintenanceItem, MaintenanceHistoryItem, MaintenanceAlert, Technician, Caja, MovimientoCaja, Empleado, Conversation, ChatMessage, Supplier, SupplierProduct, PurchaseOrder, GoodsReceipt, AccountPayable, QuoteRequest, Inspection, InspectionItem, Quote, QuoteItem, QuoteStatus } from './types';

export const SERVICE_CATEGORY_TO_PRODUCT_CATEGORIES: Record<string, string[]> = {
  "Motor": ["Lubricantes", "Filtros"],
  "Frenos": ["Frenos"],
  "Neumáticos": ["Neumáticos"],
  "Suspensión": ["Suspensión"],
  "Transmisión": ["Lubricantes"],
  "Sistema Eléctrico": ["Eléctrico"],
  "Aire Acondicionado": ["Filtros"],
};

interface AppState {
  tenants: Tenant[];
  currentTenant: Tenant | null;
  customers: Customer[];
  vehicles: Vehicle[];
  orders: WorkOrder[];
  products: Product[];
  services: Service[];
  movements: InventoryMovement[];
  invoices: Invoice[];
  whatsappLogs: WhatsAppLog[];
  users: TenantUser[];
  technicians: Technician[];
  maintenanceItems: MaintenanceItem[];
  maintenanceHistory: MaintenanceHistoryItem[];
  maintenanceAlerts: MaintenanceAlert[];
  printSettings: PrintSettings;
  barcodeSettings: BarcodeSettings;
  conversations: Conversation[];
  chatMessages: ChatMessage[];

  // Inventory Sessions
  inventorySessions: InventorySession[];
  addInventorySession: (session: InventorySession) => void;
  updateInventorySession: (id: string, updates: Partial<InventorySession>) => void;

  // Inspecciones Digitales (MPI)
  inspections: Inspection[];

  // Cotizaciones
  quotes: Quote[];

  // Proveedores
  suppliers: Supplier[];
  supplierProducts: SupplierProduct[];
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceipt[];
  accountsPayable: AccountPayable[];
  quoteRequests: QuoteRequest[];

  // Tenant
  setTenants: (tenants: Tenant[]) => void;
  setCurrentTenant: (tenant: Tenant | null) => void;
  updateTenant: (id: string, updates: Partial<Tenant>) => void;
  addTenant: (tenant: Tenant) => void;
  deleteTenant: (id: string) => void;

  // Users
  addUser: (user: TenantUser) => void;
  updateUser: (id: string, updates: Partial<TenantUser>) => void;
  deleteUser: (id: string) => void;

  // Technicians
  addTechnician: (technician: Technician) => void;
  updateTechnician: (id: string, updates: Partial<Technician>) => void;
  deleteTechnician: (id: string) => void;

  // Print settings
  updatePrintSettings: (updates: Partial<PrintSettings>) => void;
  updateBarcodeSettings: (updates: Partial<BarcodeSettings>) => void;

  // Customers
  addCustomer: (customer: Customer) => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  // Vehicles
  addVehicle: (vehicle: Vehicle) => void;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;

  deliverWorkOrder: (orderId: string) => void;

  // Orders
  addOrder: (order: WorkOrder) => void;
  updateOrder: (id: string, updates: Partial<WorkOrder>) => void;
  deleteOrder: (id: string) => void;

  // Products
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  // Services
  addService: (service: Service) => void;
  updateService: (id: string, updates: Partial<Service>) => void;
  deleteService: (id: string) => void;

  // Inventory
  addMovement: (movement: InventoryMovement) => void;

  // Invoices
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;

  // WhatsApp
  addWhatsAppLog: (log: WhatsAppLog) => void;
  updateWhatsAppLog: (id: string, updates: Partial<WhatsAppLog>) => void;
  deleteWhatsAppLog: (id: string) => void;

  // Chat/Conversaciones
  addConversation: (conv: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  addChatMessage: (msg: ChatMessage) => void;
  updateChatMessage: (id: string, updates: Partial<ChatMessage>) => void;

  // Inspecciones
  addInspection: (inspection: Inspection) => void;
  updateInspection: (id: string, updates: Partial<Inspection>) => void;
  deleteInspection: (id: string) => void;

  // Cotizaciones
  addQuote: (quote: Quote) => void;
  updateQuote: (id: string, updates: Partial<Quote>) => void;
  deleteQuote: (id: string) => void;

  // Proveedores
  addSupplier: (supplier: Supplier) => void;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  addSupplierProduct: (sp: SupplierProduct) => void;
  updateSupplierProduct: (id: string, updates: Partial<SupplierProduct>) => void;
  deleteSupplierProduct: (id: string) => void;
  addPurchaseOrder: (po: PurchaseOrder) => void;
  updatePurchaseOrder: (id: string, updates: Partial<PurchaseOrder>) => void;
  deletePurchaseOrder: (id: string) => void;
  checkInventoryForPurchaseOrders: (tenantId: string) => void;
  addGoodsReceipt: (gr: GoodsReceipt) => void;
  addAccountPayable: (ap: AccountPayable) => void;
  updateAccountPayable: (id: string, updates: Partial<AccountPayable>) => void;
  addQuoteRequest: (qr: QuoteRequest) => void;
  updateQuoteRequest: (id: string, updates: Partial<QuoteRequest>) => void;

  // Maintenance
  addMaintenanceItem: (item: MaintenanceItem) => void;
  updateMaintenanceItem: (id: string, updates: Partial<MaintenanceItem>) => void;
  deleteMaintenanceItem: (id: string) => void;
  addMaintenanceHistoryItem: (item: MaintenanceHistoryItem) => void;
  deleteMaintenanceHistoryItem: (id: string) => void;
  calculateMaintenanceHealth: (currentKmMap: Record<string, number>) => void;
  addMaintenanceAlert: (alert: MaintenanceAlert) => void;
  updateMaintenanceAlert: (id: string, updates: Partial<MaintenanceAlert>) => void;
  /**
   * Motor Central de Mantenimiento.
   * Procesa los items aplicados a un vehículo y actualiza/crea los registros
   * de mantenimiento preventivo de forma dinámica, sin valores hardcodeados.
   * Es llamado automáticamente por deliverWorkOrder y addInvoice.
   */
  processVehicleMaintenance: (
    vehicleId: string,
    tenantId: string,
    currentKm: number,
    appliedServiceIds: string[],
    appliedProductIds: string[]
  ) => void;

  // Caja
  cajas: Caja[];
  cajaMovements: MovimientoCaja[];
  addCaja: (caja: Caja) => void;
  updateCaja: (id: string, updates: Partial<Caja>) => void;
  addCajaMovement: (mov: MovimientoCaja) => void;

  // Superadmin States
  plans: Plan[];
  globalConfig: GlobalConfig;
  licencias: LicenciaLocal[];

  // Superadmin Actions
  addPlan: (plan: Plan) => void;
  updatePlan: (id: PlanId, updates: Partial<Plan>) => void;
  deletePlan: (id: PlanId) => void;
  setGlobalConfig: (cfg: GlobalConfig) => void;
  addLicencia: (lic: LicenciaLocal) => void;
  updateLicencia: (id: string, updates: Partial<LicenciaLocal>) => void;
  deleteLicencia: (id: string) => void;

  currentUserId: string | null;
  setCurrentUserId: (id: string | null) => void;

  // Auth State
  isAuthenticated: boolean;
  setAuthenticated: (auth: boolean) => void;

  // Demo Tour State
  isDemoActive: boolean;
  setDemoActive: (active: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      setAuthenticated: (auth) => set({ isAuthenticated: auth }),
      isDemoActive: false,
      setDemoActive: (active) => set({ isDemoActive: active }),
      tenants: [],
      plans: [],
      globalConfig: {
        requirePlanOnRegistration: true,
        trialDays: 14,
        defaultPlanId: 'basico',
      },
      licencias: [],
      currentUserId: null,
      currentTenant: null,

      users: [],

      technicians: [],

      printSettings: {
        paperSize: '80mm',
        showLogo: true,
        showNcf: true,
        showItbis: true,
        showChange: true,
        copies: 1,
        footer: '¡Gracias por su preferencia!',
        warrantyText: 'Garantía: 30 días en mano de obra.',
        showWarranty: true,
      },

      barcodeSettings: {
        width: 1.5,
        height: 40,
        showText: true,
        fontSize: 14,
      },

      customers: [],

      vehicles: [],

      orders: [],

      products: [],

      services: [],

      movements: [],
      purchaseOrders: [],
      cajas: [],
      cajaMovements: [],
      invoices: [],

      whatsappLogs: [],

      maintenanceItems: [],

      maintenanceHistory: [],

      maintenanceAlerts: [],

      conversations: [],

      chatMessages: [],

      inventorySessions: [],

      inspections: [],
      quotes: [],

      // Proveedores
      suppliers: [],
      supplierProducts: [],
      purchaseOrders: [],
      goodsReceipts: [],
      accountsPayable: [],
      quoteRequests: [],

      // Actions
      setCurrentUserId: (id) => set({ currentUserId: id }),
      setTenants: (tenants) => set({ tenants }),
      setCurrentTenant: (tenant) => set({ currentTenant: tenant }),
      updateTenant: (id, updates) =>
        set((state) => ({
          tenants: state.tenants.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),
      addTenant: (tenant) =>
        set((state) => ({ tenants: [...state.tenants, tenant] })),
      deleteTenant: (id) =>
        set((state) => ({ tenants: state.tenants.filter((t) => t.id !== id) })),

      addUser: (user) => set((state) => ({ users: [...state.users, user] })),
      updateUser: (id, updates) =>
        set((state) => ({ users: state.users.map((u) => (u.id === id ? { ...u, ...updates } : u)) })),
      deleteUser: (id) => set((state) => ({ users: state.users.filter((u) => u.id !== id) })),

      addTechnician: (tech) => set((state) => ({ technicians: [...state.technicians, tech] })),
      updateTechnician: (id, updates) =>
        set((state) => ({
          technicians: state.technicians.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),
      deleteTechnician: (id) => {
        set((state) => ({ technicians: state.technicians.filter((t) => t.id !== id) }));
        import("@/lib/supabaseSync").then(m => m.deleteRecordFromSupabase('technicians', id));
      },

      updatePrintSettings: (updates) =>
        set((state) => ({ printSettings: { ...state.printSettings, ...updates } })),

      updateBarcodeSettings: (updates) =>
        set((state) => ({ barcodeSettings: { ...state.barcodeSettings, ...updates } })),

      addCustomer: (customer) => set((state) => ({ customers: [...state.customers, customer] })),
      updateCustomer: (id, updates) =>
        set((state) => ({
          customers: state.customers.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),
      deleteCustomer: (id) => {
        set((state) => ({ customers: state.customers.filter((c) => c.id !== id) }));
        import("@/lib/supabaseSync").then(m => m.deleteRecordFromSupabase('customers', id));
      },

      addVehicle: (vehicle) => set((state) => ({ vehicles: [...state.vehicles, vehicle] })),
      updateVehicle: (id, updates) =>
        set((state) => ({
          vehicles: state.vehicles.map((v) => (v.id === id ? { ...v, ...updates } : v)),
        })),
      deleteVehicle: (id) => {
        set((state) => ({ vehicles: state.vehicles.filter((v) => v.id !== id) }));
        import("@/lib/supabaseSync").then(m => m.deleteRecordFromSupabase('vehicles', id));
      },

      addOrder: (order) => set((state) => ({ orders: [...state.orders, order] })),
      updateOrder: (id, updates) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === id ? { ...o, ...updates, updatedAt: new Date().toISOString() } : o
          ),
        })),
      deleteOrder: (id) => {
        set((state) => ({ orders: state.orders.filter((o) => o.id !== id) }));
        import("@/lib/supabaseSync").then(m => m.deleteRecordFromSupabase('orders', id));
      },

      addProduct: (product) => set((state) => ({ products: [...state.products, product] })),
      updateProduct: (id, updates) =>
        set((state) => ({
          products: state.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),
      deleteProduct: (id) => {
        set((state) => ({ products: state.products.filter((p) => p.id !== id) }));
        import("@/lib/supabaseSync").then(m => m.deleteRecordFromSupabase('products', id));
      },

      addService: (service) => set((state) => ({ services: [...state.services, service] })),
      updateService: (id, updates) =>
        set((state) => ({
          services: state.services.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        })),
      deleteService: (id) => {
        set((state) => ({ services: state.services.filter((s) => s.id !== id) }));
        import("@/lib/supabaseSync").then(m => m.deleteRecordFromSupabase('services', id));
      },

      addMovement: (movement) =>
        set((state) => ({ movements: [...state.movements, { ...movement, userId: movement.userId ?? state.currentUserId ?? undefined }] })),

      addInvoice: (invoice) => {
        set((state) => {
          const updatedProducts = [...state.products];
          const newMovements = [...state.movements];
          
          if (invoice.status !== 'cancelled') {
            invoice.items.forEach(item => {
              if (item.productId) {
                const productIndex = updatedProducts.findIndex(p => p.id === item.productId);
                if (productIndex !== -1) {
                  const product = updatedProducts[productIndex];
                  if (product.isCombo && product.comboItems) {
                    product.comboItems.forEach(ci => {
                      const ciIndex = updatedProducts.findIndex(p => p.id === ci.productId);
                      if (ciIndex !== -1) {
                        const subProd = updatedProducts[ciIndex];
                        updatedProducts[ciIndex] = { ...subProd, stock: subProd.stock - (ci.quantity * item.quantity) };
                        newMovements.push({
                          id: Math.random().toString(36).substr(2, 9),
                          tenantId: invoice.tenantId,
                          productId: ci.productId,
                          productName: subProd.name,
                          type: "out",
                          quantity: ci.quantity * item.quantity,
                          reason: `Venta combo (Factura #${invoice.id.slice(-6).toUpperCase()})`,
                          date: new Date().toISOString(),
                          userId: state.currentUserId ?? undefined,
                        });
                      }
                    });
                  } else {
                    updatedProducts[productIndex] = { ...product, stock: product.stock - item.quantity };
                    newMovements.push({
                      id: Math.random().toString(36).substr(2, 9),
                      tenantId: invoice.tenantId,
                      productId: item.productId,
                      productName: product.name,
                      type: "out",
                      quantity: item.quantity,
                      reason: `Venta (Factura #${invoice.id.slice(-6).toUpperCase()})`,
                      date: new Date().toISOString(),
                      userId: state.currentUserId ?? undefined,
                    });
                  }
                }
              }
            });
          }

          return { 
            invoices: [...state.invoices, invoice],
            products: updatedProducts,
            movements: newMovements
          };
        });
        
        // Disparador Automático de Pedidos (Revisar niveles de stock bajos)
        if (invoice.status !== 'cancelled') {
          setTimeout(() => {
            get().checkInventoryForPurchaseOrders(invoice.tenantId);
          }, 500);
        }
        
        // Integración con Mantenimiento Automático (Omnicanal)
        if (invoice.vehicleId && invoice.status === 'paid') {
          const serviceIds = invoice.items.filter(i => i.serviceId).map(i => i.serviceId as string);
          const productIds = invoice.items.filter(i => i.productId).map(i => i.productId as string);
          
          if (serviceIds.length > 0 || productIds.length > 0) {
            const state = get() as AppState;
            const vehicle = state.vehicles.find(v => v.id === invoice.vehicleId);
            
            // Usamos el KM de la factura si lo ingresaron en el POS, sino el actual del vehículo
            let currentKm = vehicle?.km || 0;
            if (invoice.km) {
              currentKm = invoice.kmUnit === 'mi' ? Math.round(invoice.km * 1.60934) : invoice.km;
              // Opcional: Actualizar el KM del vehículo aquí si se ingresó en el POS
              set((s) => ({
                vehicles: s.vehicles.map(v => 
                  v.id === invoice.vehicleId ? { ...v, km: currentKm } : v
                )
              }));
            }
            
            get().processVehicleMaintenance(
              invoice.vehicleId,
              invoice.tenantId,
              currentKm,
              serviceIds,
              productIds
            );
          }
        }
      },
      updateInvoice: (id, updates) => {
        set((state) => {
          const oldInvoice = state.invoices.find(inv => inv.id === id);
          const updatedProducts = [...state.products];
          const newMovements = [...state.movements];

          if (oldInvoice && updates.status === 'cancelled' && oldInvoice.status !== 'cancelled') {
            oldInvoice.items.forEach(item => {
              if (item.productId) {
                const productIndex = updatedProducts.findIndex(p => p.id === item.productId);
                if (productIndex !== -1) {
                  const product = updatedProducts[productIndex];
                  if (product.isCombo && product.comboItems) {
                    product.comboItems.forEach(ci => {
                      const ciIndex = updatedProducts.findIndex(p => p.id === ci.productId);
                      if (ciIndex !== -1) {
                        const subProd = updatedProducts[ciIndex];
                        updatedProducts[ciIndex] = { ...subProd, stock: subProd.stock + (ci.quantity * item.quantity) };
                        newMovements.push({
                          id: Math.random().toString(36).substr(2, 9),
                          tenantId: oldInvoice.tenantId,
                          productId: ci.productId,
                          productName: subProd.name,
                          type: "in",
                          quantity: ci.quantity * item.quantity,
                          reason: `Cancelación (Factura #${oldInvoice.id.slice(-6).toUpperCase()})`,
                          date: new Date().toISOString()
                        });
                      }
                    });
                  } else {
                    updatedProducts[productIndex] = { ...product, stock: product.stock + item.quantity };
                    newMovements.push({
                      id: Math.random().toString(36).substr(2, 9),
                      tenantId: oldInvoice.tenantId,
                      productId: item.productId,
                      productName: product.name,
                      type: "in",
                      quantity: item.quantity,
                      reason: `Cancelación (Factura #${oldInvoice.id.slice(-6).toUpperCase()})`,
                      date: new Date().toISOString()
                    });
                  }
                }
              }
            });
          }

          return {
            invoices: state.invoices.map((inv) => (inv.id === id ? { ...inv, ...updates } : inv)),
            products: updatedProducts,
            movements: newMovements
          };
        });
      },

      addCaja: (caja) => set((state) => ({ cajas: [...state.cajas, caja] })),
      updateCaja: (id, updates) =>
        set((state) => ({
          cajas: state.cajas.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),
      addCajaMovement: (mov) =>
        set((state) => ({
          cajaMovements: [...state.cajaMovements, mov],
        })),

      addWhatsAppLog: (log) =>
        set((state) => ({ whatsappLogs: [...state.whatsappLogs, log] })),
      updateWhatsAppLog: (id, updates) =>
        set((state) => ({
          whatsappLogs: state.whatsappLogs.map((log) => (log.id === id ? { ...log, ...updates } : log)),
        })),
      deleteWhatsAppLog: (id) =>
        set((state) => ({
          whatsappLogs: state.whatsappLogs.filter((log) => log.id !== id),
        })),

      addConversation: (conv) =>
        set((state) => ({ conversations: [conv, ...state.conversations] })),
      updateConversation: (id, updates) =>
        set((state) => ({
          conversations: state.conversations.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),
      addChatMessage: (msg) =>
        set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
      updateChatMessage: (id, updates) =>
        set((state) => ({
          chatMessages: state.chatMessages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        })),

      addInventorySession: (session) =>
        set((state) => ({ inventorySessions: [session, ...state.inventorySessions] })),
      updateInventorySession: (id, updates) =>
        set((state) => ({
          inventorySessions: state.inventorySessions.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        })),

      addInspection: (inspection) =>
        set((state) => ({ inspections: [inspection, ...state.inspections] })),
      updateInspection: (id, updates) =>
        set((state) => ({
          inspections: state.inspections.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        })),
      deleteInspection: (id) =>
        set((state) => ({
          inspections: state.inspections.filter((i) => i.id !== id),
        })),

      addQuote: (quote) =>
        set((state) => ({ quotes: [quote, ...state.quotes] })),
      updateQuote: (id, updates) =>
        set((state) => ({
          quotes: state.quotes.map((q) =>
            q.id === id ? { ...q, ...updates, updatedAt: new Date().toISOString() } : q
          ),
        })),
      deleteQuote: (id) =>
        set((state) => ({ quotes: state.quotes.filter((q) => q.id !== id) })),

      // ──── PROVEEDORES ────────────────────────────────────────────────────────
      addSupplier: (supplier) =>
        set((state) => ({ suppliers: [...state.suppliers, supplier] })),
      updateSupplier: (id, updates) =>
        set((state) => ({
          suppliers: state.suppliers.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s)),
        })),
      deleteSupplier: (id) =>
        set((state) => ({ suppliers: state.suppliers.filter((s) => s.id !== id) })),
      addSupplierProduct: (sp) =>
        set((state) => ({ supplierProducts: [...state.supplierProducts, sp] })),
      updateSupplierProduct: (id, updates) =>
        set((state) => ({
          supplierProducts: state.supplierProducts.map((sp) => (sp.id === id ? { ...sp, ...updates } : sp)),
        })),
      deleteSupplierProduct: (id) =>
        set((state) => ({ supplierProducts: state.supplierProducts.filter((sp) => sp.id !== id) })),
      addPurchaseOrder: (po) =>
        set((state) => ({ purchaseOrders: [...state.purchaseOrders, po] })),
      updatePurchaseOrder: (id, updates) =>
        set((state) => ({
          purchaseOrders: state.purchaseOrders.map((po) => (po.id === id ? { ...po, ...updates, updatedAt: new Date().toISOString() } : po)),
        })),
      deletePurchaseOrder: (id) =>
        set((state) => ({ purchaseOrders: state.purchaseOrders.filter((po) => po.id !== id) })),

      checkInventoryForPurchaseOrders: (tenantId) => {
        const state = get() as AppState;
        const tenantProducts = state.products.filter(p => p.tenantId === tenantId && !p.isCombo);
        
        const newOrders: PurchaseOrder[] = [];
        const updatedOrders: PurchaseOrder[] = [];

        tenantProducts.forEach(product => {
          if (product.stock <= product.minStock) {
            const supplierId = product.supplier || "Suplidor Desconocido";
            
            // Revisa si ya hay un borrador para este suplidor
            let draftOrder = state.purchaseOrders.find(
              po => po.tenantId === tenantId && po.status === 'borrador' && po.supplierId === supplierId
            );
            
            if (!draftOrder) {
               draftOrder = newOrders.find(po => po.supplierId === supplierId);
            }

            const neededQuantity = Math.max(1, (product.minStock * 2) - product.stock);
            
            const newItem: PurchaseOrderItem = {
              id: Math.random().toString(36).substr(2, 9),
              productId: product.id,
              productName: product.name,
              quantity: neededQuantity,
              unitPrice: product.costPrice || 0,
              salePrice: product.salePrice || 0,
              receivedQuantity: 0
            };

            if (draftOrder) {
              const existingItem = draftOrder.items.find(i => i.productId === product.id);
              if (!existingItem) {
                // Modificar una copia fresca
                const clonedDraft = JSON.parse(JSON.stringify(draftOrder)) as PurchaseOrder;
                clonedDraft.items.push(newItem);
                clonedDraft.subtotal += (newItem.quantity * newItem.unitPrice);
                clonedDraft.total = clonedDraft.subtotal + clonedDraft.tax;
                clonedDraft.updatedAt = new Date().toISOString();
                
                if (!newOrders.some(no => no.id === clonedDraft.id)) {
                   const existingUpdateIdx = updatedOrders.findIndex(uo => uo.id === clonedDraft.id);
                   if (existingUpdateIdx !== -1) updatedOrders[existingUpdateIdx] = clonedDraft;
                   else updatedOrders.push(clonedDraft);
                } else {
                   const newOrderIdx = newOrders.findIndex(no => no.id === clonedDraft.id);
                   if (newOrderIdx !== -1) newOrders[newOrderIdx] = clonedDraft;
                }
              }
            } else {
              const newOrder: PurchaseOrder = {
                id: `po_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                tenantId,
                supplierId,
                number: `OC-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
                paymentStatus: 'pending',
                status: 'borrador',
                items: [newItem],
                subtotal: newItem.quantity * newItem.unitPrice,
                tax: 0,
                total: newItem.quantity * newItem.unitPrice,
                createdBy: 'auto_system',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              newOrders.push(newOrder);
            }
          }
        });

        if (newOrders.length > 0 || updatedOrders.length > 0) {
          set(s => {
             const baseOrders = s.purchaseOrders.map(po => {
               const updated = updatedOrders.find(uo => uo.id === po.id);
               return updated ? updated : po;
             });
             return { purchaseOrders: [...baseOrders, ...newOrders] };
          });
        }
      },

      addGoodsReceipt: (gr) =>
        set((state) => ({ goodsReceipts: [...state.goodsReceipts, gr] })),
      addAccountPayable: (ap) =>
        set((state) => ({ accountsPayable: [...state.accountsPayable, ap] })),
      updateAccountPayable: (id, updates) =>
        set((state) => ({
          accountsPayable: state.accountsPayable.map((ap) => (ap.id === id ? { ...ap, ...updates } : ap)),
        })),
      addQuoteRequest: (qr) =>
        set((state) => ({ quoteRequests: [...state.quoteRequests, qr] })),
      updateQuoteRequest: (id, updates) =>
        set((state) => ({
          quoteRequests: state.quoteRequests.map((qr) => (qr.id === id ? { ...qr, ...updates } : qr)),
        })),

      addMaintenanceItem: (item) =>
        set((state) => ({ maintenanceItems: [...state.maintenanceItems, item] })),
      updateMaintenanceItem: (id, updates) =>
        set((state) => ({
          maintenanceItems: state.maintenanceItems.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        })),
      deleteMaintenanceItem: (id) =>
        set((state) => ({ maintenanceItems: state.maintenanceItems.filter((m) => m.id !== id) })),
      addMaintenanceHistoryItem: (item) =>
        set((state) => ({ maintenanceHistory: [item, ...state.maintenanceHistory] })),
      deleteMaintenanceHistoryItem: (id) =>
        set((state) => ({ maintenanceHistory: state.maintenanceHistory.filter((m) => m.id !== id) })),

      addMaintenanceAlert: (alert) =>
        set((state) => ({ maintenanceAlerts: [...state.maintenanceAlerts, alert] })),
      updateMaintenanceAlert: (id, updates) =>
        set((state) => ({
          maintenanceAlerts: state.maintenanceAlerts.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),

      calculateMaintenanceHealth: (currentKmMap) =>
        set((state) => {
          const now = new Date();
          const newItems = state.maintenanceItems.map((item) => {
            const lastDate = new Date(item.lastServiceDate);
            const daysPassed = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
            const vehicle = state.vehicles.find(v => v.id === item.vehicleId);
            const currentKm = currentKmMap[item.vehicleId] ?? vehicle?.km ?? item.lastServiceKm;
            const kmPassed = Math.max(0, currentKm - item.lastServiceKm);

            const timeUsage = (daysPassed / item.lifespanDays) * 100;
            const kmUsage = (kmPassed / item.lifespanKm) * 100;
            const maxUsage = Math.max(timeUsage, kmUsage);
            const currentPercentage = Math.max(0, Math.floor(100 - maxUsage));

            return { ...item, currentPercentage };
          });

          // Generar alertas automáticas por umbrales de salud
          const newAlerts: MaintenanceAlert[] = [];
          newItems.forEach((item) => {
            if (item.currentPercentage <= 30) {
              const vehicle = state.vehicles.find(v => v.id === item.vehicleId);
              if (vehicle) {
                const existingAlert = state.maintenanceAlerts.find(a => a.maintenanceItemId === item.id && a.status === 'pending');
                if (!existingAlert) {
                  newAlerts.push({
                    id: Math.random().toString(36).substr(2, 9),
                    tenantId: item.tenantId,
                    vehicleId: item.vehicleId,
                    customerId: vehicle.customerId,
                    maintenanceItemId: item.id,
                    type: item.currentPercentage <= 10 ? 'critical' : 'preventive',
                    percentage: item.currentPercentage,
                    createdAt: now.toISOString(),
                    status: 'pending'
                  });
                }
              }
            }
          });

          return { 
            maintenanceItems: newItems,
            maintenanceAlerts: [...state.maintenanceAlerts, ...newAlerts]
          };
        }),

      // ─────────────────────────────────────────────────────────────────────────
      // MOTOR CENTRAL DE MANTENIMIENTO
      // Recibe los IDs de servicios y productos aplicados a un vehículo.
      // Lee la vida útil directamente del catálogo (dinámica), NO de valores fijos.
      // Es llamado por deliverWorkOrder y addInvoice automáticamente.
      // ─────────────────────────────────────────────────────────────────────────
      processVehicleMaintenance: (vehicleId, tenantId, currentKm, appliedServiceIds, appliedProductIds) => {
        const state = get() as AppState;

        // Fallbacks de vida útil para categorías que no tienen datos en el catálogo
        const FALLBACK_LIFESPANS: Record<string, { km: number; days: number; label: string }> = {
          engine:       { km: 5000,  days: 180,  label: 'Motor / Aceite' },
          brakes:       { km: 25000, days: 365,  label: 'Frenos' },
          tires:        { km: 50000, days: 730,  label: 'Neumáticos' },
          battery:      { km: 60000, days: 1095, label: 'Batería' },
          suspension:   { km: 40000, days: 730,  label: 'Suspensión' },
          transmission: { km: 50000, days: 540,  label: 'Transmisión' },
          cooling:      { km: 30000, days: 365,  label: 'Enfriamiento' },
          ac:           { km: 15000, days: 365,  label: 'Aire Acondicionado' },
          steering:     { km: 40000, days: 730,  label: 'Dirección' },
          others:       { km: 10000, days: 180,  label: 'Mantenimiento General' },
        };

        const getMaintenanceCategoryFromText = (category?: string): string => {
          const cat = category?.toLowerCase() || '';
          if (cat.includes('motor')) return 'engine';
          if (cat.includes('freno')) return 'brakes';
          if (cat.includes('neumatic') || cat.includes('neumátic') || cat.includes('llanta')) return 'tires';
          if (cat.includes('electr') || cat.includes('eléctr') || cat.includes('bater')) return 'battery';
          if (cat.includes('suspens')) return 'suspension';
          if (cat.includes('transmi')) return 'transmission';
          if (cat.includes('enfria') || cat.includes('cool')) return 'cooling';
          if (cat.includes('aire') || cat.includes('a/c') || cat.includes('ac')) return 'ac';
          if (cat.includes('direcc') || cat.includes('steer')) return 'steering';
          return 'others';
        };

        // Estructura para agrupar: { category -> { lifespanKm, lifespanDays, label } }
        const categoriesToUpdate = new Map<string, { lifespanKm: number; lifespanDays: number; label: string }>();

        // 1. Leer datos de los SERVICIOS aplicados
        const appliedServices = state.services.filter(s => appliedServiceIds.includes(s.id));
        appliedServices.forEach(service => {
          const categoryKey = service.maintenanceCategory || getMaintenanceCategoryFromText(service.category);
          if (categoryKey) {
            const existing = categoriesToUpdate.get(categoryKey);
            const fallback = FALLBACK_LIFESPANS[categoryKey] || FALLBACK_LIFESPANS.others;
            // Si hay múltiples servicios de la misma categoría, tomamos el de mayor duración
            const newKm = service.lifespanKm ?? fallback.km;
            const newDays = service.lifespanDays ?? fallback.days;
            if (!existing) {
              categoriesToUpdate.set(categoryKey, {
                lifespanKm: newKm,
                lifespanDays: newDays,
                label: service.name,
              });
            } else {
              categoriesToUpdate.set(categoryKey, {
                lifespanKm: Math.max(existing.lifespanKm, newKm),
                lifespanDays: Math.max(existing.lifespanDays, newDays),
                label: existing.label.includes(service.name) ? existing.label : `${existing.label}, ${service.name}`,
              });
            }
          }
        });

        // 2. Leer datos de los PRODUCTOS aplicados (ej. batería, pastillas)
        const appliedProducts = state.products.filter(p => appliedProductIds.includes(p.id));
        appliedProducts.forEach(product => {
          const categoryKey = product.maintenanceCategory || getMaintenanceCategoryFromText(product.category);
          if (categoryKey) {
            const existing = categoriesToUpdate.get(categoryKey);
            const fallback = FALLBACK_LIFESPANS[categoryKey] || FALLBACK_LIFESPANS.others;
            const newKm = product.lifespanKm ?? fallback.km;
            const newDays = product.lifespanDays ?? fallback.days;
            if (!existing) {
              categoriesToUpdate.set(categoryKey, {
                lifespanKm: newKm,
                lifespanDays: newDays,
                label: product.name,
              });
            } else {
              categoriesToUpdate.set(categoryKey, {
                lifespanKm: Math.max(existing.lifespanKm, newKm),
                lifespanDays: Math.max(existing.lifespanDays, newDays),
                label: existing.label.includes(product.name) ? existing.label : `${existing.label}, ${product.name}`,
              });
            }
          }
        });

        if (categoriesToUpdate.size === 0) return;

        const now = new Date().toISOString();
        let newMaintenanceItems = [...state.maintenanceItems];
        const newHistoryItems: MaintenanceHistoryItem[] = [];

        categoriesToUpdate.forEach((data, category) => {
          const existingItem = newMaintenanceItems.find(
            m => m.vehicleId === vehicleId && m.category === category
          );

          if (existingItem) {
            // Registrar en historial el servicio anterior antes de reiniciarlo
            newHistoryItems.push({
              id: Math.random().toString(36).substr(2, 9),
              vehicleId,
              tenantId,
              name: existingItem.name,
              serviceDate: existingItem.lastServiceDate,
              serviceKm: existingItem.lastServiceKm,
              completedAt: now,
              notes: `Actualizado automáticamente. Nuevo ciclo: ${data.lifespanKm.toLocaleString()} km / ${data.lifespanDays} días.`,
            });

            // Actualizar el item existente con los nuevos datos dinámicos
            newMaintenanceItems = newMaintenanceItems.map(m =>
              m.id === existingItem.id
                ? {
                    ...m,
                    name: data.label,
                    lastServiceDate: now,
                    lastServiceKm: currentKm,
                    lifespanKm: data.lifespanKm,
                    lifespanDays: data.lifespanDays,
                    currentPercentage: 100,
                  }
                : m
            );
          } else {
            // No existe un item real en la base de datos para esta categoría
            // Busquemos si existe un servicio anterior sintético (orden de trabajo entregada anteriormente)
            const vehicleOrders = state.orders.filter(
              o => o.vehicleId === vehicleId && (o.status === 'delivered' || o.status === 'invoiced')
            );
            const matchingOrders = vehicleOrders.filter(o => {
              const oServices = (o.serviceIds || [])
                .map((sid: string) => state.services.find(s => s.id === sid))
                .filter((s): s is NonNullable<typeof s> => !!s);
              return oServices.some(s => (s.maintenanceCategory || getMaintenanceCategoryFromText(s.category)) === category);
            }).sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());

            // Si hay más de una orden con esta categoría, la segunda es la anterior (ya que la primera es la actual)
            if (matchingOrders.length > 1) {
              const prevOrder = matchingOrders[1];
              const prevServices = (prevOrder.serviceIds || [])
                .map((sid: string) => state.services.find(s => s.id === sid))
                .filter((s): s is NonNullable<typeof s> => !!s);
              
              const prevItemNames = prevServices
                .filter(s => (s.maintenanceCategory || getMaintenanceCategoryFromText(s.category)) === category)
                .map(s => s.name)
                .join(', ');

              newHistoryItems.push({
                id: Math.random().toString(36).substr(2, 9),
                vehicleId,
                tenantId,
                name: prevItemNames || 'Servicio anterior',
                serviceDate: prevOrder.updatedAt || prevOrder.createdAt,
                serviceKm: prevOrder.km || 0,
                completedAt: now,
                notes: `Registrado en historial desde orden anterior #${prevOrder.id.slice(-6).toUpperCase()} al iniciar ciclo real.`,
              });
            }

            // Crear nuevo registro de mantenimiento desde cero
            newMaintenanceItems.push({
              id: Math.random().toString(36).substr(2, 9),
              vehicleId,
              tenantId,
              name: data.label,
              lastServiceDate: now,
              lastServiceKm: currentKm,
              lifespanKm: data.lifespanKm,
              lifespanDays: data.lifespanDays,
              currentPercentage: 100,
              category: category as MaintenanceItem['category'],
            });
          }
        });

        // Aplicar cambios y recalcular salud global
        set((state) => ({
          maintenanceItems: newMaintenanceItems,
          maintenanceHistory: [...newHistoryItems, ...state.maintenanceHistory],
          // Descartar alertas 'pending' de las categorías que se acaban de atender
          maintenanceAlerts: state.maintenanceAlerts.map(a => {
            const itemWasServiced = newMaintenanceItems.find(
              m => m.id === a.maintenanceItemId && m.vehicleId === vehicleId && m.currentPercentage === 100
            );
            return itemWasServiced ? { ...a, status: 'dismissed' as const } : a;
          }),
        }));

        // Recalcular salud con el kilometraje actual
        get().calculateMaintenanceHealth({ [vehicleId]: currentKm });
      },

      deliverWorkOrder: (orderId) => {
        const state = get() as AppState;
        const order = state.orders.find(o => o.id === orderId);
        if (!order) return;

        // Calcular KM actuales del vehículo
        const vehicle = state.vehicles.find(v => v.id === order.vehicleId);
        let currentKm = vehicle?.km || 0;
        if (order.km) {
          currentKm = order.kmUnit === 'mi' ? Math.round(order.km * 1.60934) : order.km;
        }

        // Marcar la orden como entregada y actualizar KM del vehículo
        set((state) => ({
          orders: state.orders.map(o =>
            o.id === orderId ? { ...o, status: 'delivered' as const, updatedAt: new Date().toISOString() } : o
          ),
          vehicles: state.vehicles.map(v =>
            v.id === order.vehicleId ? { ...v, km: currentKm } : v
          ),
        }));

        // Delegar toda la lógica de mantenimiento al Motor Central
        get().processVehicleMaintenance(
          order.vehicleId,
          order.tenantId,
          currentKm,
          order.serviceIds ?? [],
          []
        );
      },

      addPlan: (plan) =>
        set((state) => ({ plans: [...state.plans, plan] })),
      updatePlan: (id, updates) =>
        set((state) => ({
          plans: state.plans.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),
      deletePlan: (id) =>
        set((state) => ({ plans: state.plans.filter((p) => p.id !== id) })),
      setGlobalConfig: (globalConfig) => set({ globalConfig }),
      addLicencia: (lic) =>
        set((state) => ({ licencias: [...state.licencias, lic] })),
      updateLicencia: (id, updates) =>
        set((state) => ({
          licencias: state.licencias.map((l) => (l.id === id ? { ...l, ...updates } : l)),
        })),
      deleteLicencia: (id) =>
        set((state) => ({ licencias: state.licencias.filter((l) => l.id !== id) })),
    }),
    { 
      name: 'servitracks-storage',
      version: 2,
      migrate: (_persistedState: any, fromVersion: number) => {
        // Version 2: wipe all operational data (orders, customers, etc.) that may have dev/mock data
        // Preserve only printSettings and auth state
        if (fromVersion < 2) {
          return {
            tenants: [],
            currentTenant: null,
            customers: [],
            vehicles: [],
            orders: [],
            products: [],
            services: [],
            invoices: [],
            users: [],
            technicians: [],
            maintenanceItems: [],
            maintenanceHistory: [],
            whatsappLogs: [],
            cajas: [],
            cajaMovements: [],
            plans: [],
            licencias: [],
            globalConfig: { requirePlanOnRegistration: true, trialDays: 14, defaultPlanId: 'basico' },
            printSettings: _persistedState?.printSettings ?? { paperSize: '80mm', showLogo: true, showNcf: true, showItbis: true, showChange: true, copies: 1, footer: '¡Gracias por su preferencia!', warrantyText: 'Garantía: 30 días en mano de obra.', showWarranty: true },
            barcodeSettings: _persistedState?.barcodeSettings ?? { width: 1.5, height: 40, showText: true, fontSize: 14 },
            currentUserId: null,
            isAuthenticated: false,
          };
        }
        return _persistedState;
      },
      partialize: (state: AppState) => ({
        tenants: state.tenants,
        currentTenant: state.currentTenant,
        customers: state.customers,
        vehicles: state.vehicles,
        orders: state.orders,
        products: state.products,
        services: state.services,
        invoices: state.invoices,
        users: state.users,
        technicians: state.technicians,
        maintenanceItems: state.maintenanceItems,
        maintenanceHistory: state.maintenanceHistory,
        whatsappLogs: state.whatsappLogs,
        printSettings: state.printSettings,
        barcodeSettings: state.barcodeSettings,
        cajas: state.cajas,
        cajaMovements: state.cajaMovements,
        plans: state.plans,
        globalConfig: state.globalConfig,
        licencias: state.licencias,
        currentUserId: state.currentUserId,
        isAuthenticated: state.isAuthenticated,
        // Proveedores
        suppliers: state.suppliers,
        supplierProducts: state.supplierProducts,
        purchaseOrders: state.purchaseOrders,
        goodsReceipts: state.goodsReceipts,
        accountsPayable: state.accountsPayable,
        quoteRequests: state.quoteRequests,
        inspections: state.inspections,
      }),
    }
  )
);
