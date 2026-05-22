import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Tenant, TenantUser, PrintSettings, Customer, Vehicle,
  Service, Product, InventoryMovement, WorkOrder, Invoice,
  WhatsAppLog, MaintenanceItem, MaintenanceHistoryItem, MaintenanceAlert, Technician,
  Caja, MovimientoCaja, Empleado, Plan, PlanId, GlobalConfig, LicenciaLocal, Conversation, ChatMessage
} from './types';

// Re-export types for backward compatibility
export type { Tenant, TenantUser, PrintSettings, Customer, Vehicle, Service, Product, ProductVariant, InventoryMovement, WorkOrder, InvoiceItem, Invoice, WhatsAppLog, MaintenanceItem, MaintenanceHistoryItem, MaintenanceAlert, Technician, Caja, MovimientoCaja, Empleado, Conversation, ChatMessage } from './types';

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
  conversations: Conversation[];
  chatMessages: ChatMessage[];

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
      },

      customers: [],

      vehicles: [],

      orders: [],

      products: [],

      services: [],

      movements: [],
      cajas: [],
      cajaMovements: [],
      invoices: [],

      whatsappLogs: [],

      maintenanceItems: [],

      maintenanceHistory: [],

      maintenanceAlerts: [],

      conversations: [],

      chatMessages: [],

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
      deleteTechnician: (id) =>
        set((state) => ({ technicians: state.technicians.filter((t) => t.id !== id) })),

      updatePrintSettings: (updates) =>
        set((state) => ({ printSettings: { ...state.printSettings, ...updates } })),

      addCustomer: (customer) => set((state) => ({ customers: [...state.customers, customer] })),
      updateCustomer: (id, updates) =>
        set((state) => ({
          customers: state.customers.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),
      deleteCustomer: (id) =>
        set((state) => ({ customers: state.customers.filter((c) => c.id !== id) })),

      addVehicle: (vehicle) => set((state) => ({ vehicles: [...state.vehicles, vehicle] })),
      updateVehicle: (id, updates) =>
        set((state) => ({
          vehicles: state.vehicles.map((v) => (v.id === id ? { ...v, ...updates } : v)),
        })),
      deleteVehicle: (id) =>
        set((state) => ({ vehicles: state.vehicles.filter((v) => v.id !== id) })),

      addOrder: (order) => set((state) => ({ orders: [...state.orders, order] })),
      updateOrder: (id, updates) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === id ? { ...o, ...updates, updatedAt: new Date().toISOString() } : o
          ),
        })),
      deleteOrder: (id) =>
        set((state) => ({ orders: state.orders.filter((o) => o.id !== id) })),

      addProduct: (product) => set((state) => ({ products: [...state.products, product] })),
      updateProduct: (id, updates) =>
        set((state) => ({
          products: state.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),
      deleteProduct: (id) =>
        set((state) => ({ products: state.products.filter((p) => p.id !== id) })),

      addService: (service) => set((state) => ({ services: [...state.services, service] })),
      updateService: (id, updates) =>
        set((state) => ({
          services: state.services.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        })),
      deleteService: (id) =>
        set((state) => ({ services: state.services.filter((s) => s.id !== id) })),

      addMovement: (movement) =>
        set((state) => ({ movements: [...state.movements, movement] })),

      addInvoice: (invoice) => {
        set((state) => ({ invoices: [...state.invoices, invoice] }));
        
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
      updateInvoice: (id, updates) =>
        set((state) => ({
          invoices: state.invoices.map((inv) => (inv.id === id ? { ...inv, ...updates } : inv)),
        })),

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
            const currentKm = currentKmMap[item.vehicleId] || item.lastServiceKm;
            const kmPassed = currentKm - item.lastServiceKm;

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

        // Estructura para agrupar: { category -> { lifespanKm, lifespanDays, label } }
        const categoriesToUpdate = new Map<string, { lifespanKm: number; lifespanDays: number; label: string }>();

        // 1. Leer datos de los SERVICIOS aplicados
        const appliedServices = state.services.filter(s => appliedServiceIds.includes(s.id));
        appliedServices.forEach(service => {
          if (service.maintenanceCategory) {
            const existing = categoriesToUpdate.get(service.maintenanceCategory);
            const fallback = FALLBACK_LIFESPANS[service.maintenanceCategory] || FALLBACK_LIFESPANS.others;
            // Si hay múltiples servicios de la misma categoría, tomamos el de mayor duración
            const newKm = service.lifespanKm ?? fallback.km;
            const newDays = service.lifespanDays ?? fallback.days;
            if (!existing) {
              categoriesToUpdate.set(service.maintenanceCategory, {
                lifespanKm: newKm,
                lifespanDays: newDays,
                label: service.name,
              });
            } else {
              categoriesToUpdate.set(service.maintenanceCategory, {
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
          if (product.maintenanceCategory) {
            const existing = categoriesToUpdate.get(product.maintenanceCategory);
            const fallback = FALLBACK_LIFESPANS[product.maintenanceCategory] || FALLBACK_LIFESPANS.others;
            const newKm = product.lifespanKm ?? fallback.km;
            const newDays = product.lifespanDays ?? fallback.days;
            if (!existing) {
              categoriesToUpdate.set(product.maintenanceCategory, {
                lifespanKm: newKm,
                lifespanDays: newDays,
                label: product.name,
              });
            } else {
              categoriesToUpdate.set(product.maintenanceCategory, {
                lifespanKm: Math.max(existing.lifespanKm, newKm),
                lifespanDays: Math.max(existing.lifespanDays, newDays),
                label: existing.label.includes(product.name) ? existing.label : `${existing.label}, ${product.name}`,
              });
            }
          }
        });

        // Si no hay nada que procesar, salir
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
            printSettings: _persistedState?.printSettings ?? { paperSize: '80mm', showLogo: true, showNcf: true, showItbis: true, showChange: true, copies: 1, footer: '¡Gracias por su preferencia!' },
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
        cajas: state.cajas,
        cajaMovements: state.cajaMovements,
        plans: state.plans,
        globalConfig: state.globalConfig,
        licencias: state.licencias,
        currentUserId: state.currentUserId,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
