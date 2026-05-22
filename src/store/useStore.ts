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

  // Demo Tour State
  isDemoActive: boolean;
  setDemoActive: (active: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      isDemoActive: false,
      setDemoActive: (active) => set({ isDemoActive: active }),
      tenants: [
        {
          id: '1',
          name: 'Autocheck',
          slug: 'autocheck',
          logo: '/logo.servitracks.png',
          address: 'C/Terminal Esso #49, Los Mameyes, Santo Domingo Este, RD.',
          phone: '829-774-0320',
          email: 'autocheck.do@gmail.com',
          rnc: '',
          status: 'active',
          plan_id: 'pro',
          estado: 'ACTIVO',
          color_primario: '#0f172a',
          color_secundario: '#475569'
        }
      ],
      plans: [
        {
          id: 'basico',
          nombre: 'Básico',
          precio_mensual: 2500,
          precio_anual: 24000,
          limite_empleados: 5,
          limite_ordenes_mes: 300,
          limite_whatsapp_mes: 200,
          limite_sucursales: 1,
          precio_sucursal_adicional: 1500,
          modulos: { whatsapp: true, facturacion_fiscal: false, multisucursal: false, logistica: false },
          destacado: false
        },
        {
          id: 'pro',
          nombre: 'Pro',
          precio_mensual: 5000,
          precio_anual: 48000,
          limite_empleados: 15,
          limite_ordenes_mes: 1000,
          limite_whatsapp_mes: 800,
          limite_sucursales: 3,
          precio_sucursal_adicional: 2500,
          modulos: { whatsapp: true, facturacion_fiscal: true, multisucursal: true, logistica: false },
          destacado: true
        },
        {
          id: 'enterprise',
          nombre: 'Enterprise',
          precio_mensual: 10000,
          precio_anual: 96000,
          limite_empleados: 50,
          limite_ordenes_mes: null,
          limite_whatsapp_mes: 3000,
          limite_sucursales: null,
          precio_sucursal_adicional: 4000,
          modulos: { whatsapp: true, facturacion_fiscal: true, multisucursal: true, logistica: true },
          destacado: false
        }
      ],
      globalConfig: {
        requirePlanOnRegistration: true,
        trialDays: 14,
        defaultPlanId: 'basico',
        bankDetails: {
          banco: 'Banreservas',
          titular: 'ServiTracks SRL',
          rnc: '1-32-12345-6',
          tipo_cuenta: 'Corriente',
          numero_cuenta: '9601482012'
        }
      },
      licencias: [
        {
          id: 'lic1',
          codigo: 'KLYNN-A7B8-9C2D',
          nombre_lavanderia: 'Taller Central Las Praderas',
          estado: 'ACTIVO',
          es_anual: true,
          expira_en: new Date(Date.now() + 86400000 * 180).toISOString(),
          whatsapp_activo: true,
          facturacion_activa: false
        }
      ],
      currentUserId: 'u1',
      currentTenant: null,

      users: [
        {
          id: 'u1', tenantId: '1', name: 'Rubén Polanco', email: 'autocheck.do@gmail.com',
          role: 'owner', status: 'active', createdAt: new Date().toISOString()
        },
        {
          id: 'u2', tenantId: '1', name: 'Carlos Méndez', email: 'carlos@autocheck.do',
          role: 'mechanic', status: 'active', createdAt: new Date(Date.now() - 86400000 * 30).toISOString()
        },
      ],

      technicians: [
        { id: 'tech1', tenantId: '1', name: 'Gregorio', phone: '809-555-0201', status: 'active', createdAt: new Date().toISOString() },
        { id: 'tech2', tenantId: '1', name: 'Carlos Méndez', phone: '809-555-0202', status: 'active', createdAt: new Date().toISOString() },
        { id: 'tech3', tenantId: '1', name: 'Juan Pérez', phone: '809-555-0203', status: 'inactive', createdAt: new Date().toISOString() },
      ],

      printSettings: {
        paperSize: '80mm',
        showLogo: true,
        showNcf: true,
        showItbis: true,
        showChange: true,
        copies: 1,
        footer: '¡Gracias por su preferencia!',
      },

      customers: [
        {
          id: 'c1',
          tenantId: '1',
          name: 'Yeri Orlando',
          phone: '809-555-0123',
          email: 'yeri@example.com',
          address: 'Santo Domingo, RD',
          tags: ['VIP'],
          createdAt: new Date().toISOString()
        },
        {
          id: 'c2',
          tenantId: '1',
          name: 'María Garcia',
          phone: '829-555-4567',
          email: 'maria@example.com',
          tags: ['Regular'],
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
        },
        {
          id: 'c3',
          tenantId: '1',
          name: 'Pedro Ramírez',
          phone: '849-555-7890',
          email: 'pedro@example.com',
          createdAt: new Date(Date.now() - 86400000 * 10).toISOString()
        },
      ],

      vehicles: [
        {
          id: 'v1',
          customerId: 'c1',
          tenantId: '1',
          brand: 'Toyota',
          model: 'Hilux',
          year: 2022,
          plate: 'G123456',
          color: 'Blanco',
          km: 45000,
          fuel: 'Gasolina',
          transmission: 'Manual',
          lastService: new Date(Date.now() - 86400000 * 90).toISOString(),
        },
        {
          id: 'v2',
          customerId: 'c1',
          tenantId: '1',
          brand: 'Honda',
          model: 'Civic',
          year: 2020,
          plate: 'A987654',
          color: 'Gris',
          km: 62000,
          fuel: 'Gasolina',
          transmission: 'Automático',
          lastService: new Date(Date.now() - 86400000 * 45).toISOString(),
        },
        {
          id: 'v3',
          customerId: 'c2',
          tenantId: '1',
          brand: 'Hyundai',
          model: 'Tucson',
          year: 2021,
          plate: 'M654321',
          color: 'Azul',
          km: 30000,
          fuel: 'Gasolina',
          transmission: 'Automático',
          lastService: new Date(Date.now() - 86400000 * 180).toISOString(),
        },
      ],

      orders: [
        {
          id: 'o1',
          tenantId: '1',
          customerId: 'c1',
          vehicleId: 'v1',
          mechanicId: 'm1',
          status: 'repairing',
          description: 'Cambio de banda de distribución y bomba de agua.',
          estimatedTime: '4h',
          checklist: [
            { item: 'Diagnóstico inicial', completed: true },
            { item: 'Desmontaje motor', completed: true },
            { item: 'Cambio de banda', completed: false },
            { item: 'Cambio bomba de agua', completed: false },
            { item: 'Montaje y prueba', completed: false },
          ],
          total: 8500,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'o2',
          tenantId: '1',
          customerId: 'c2',
          vehicleId: 'v3',
          status: 'pending',
          description: 'Mantenimiento preventivo de los 30,000km.',
          total: 4200,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'o3',
          tenantId: '1',
          customerId: 'c3',
          vehicleId: 'v2',
          status: 'finished',
          description: 'Cambio de aceite y filtros.',
          estimatedTime: '1h',
          // Reemplazo de aceite + filtros de aceite, aire y cabina
          serviceIds: ['s_m1', 's_m2', 's_m3', 's_m4'],
          total: 3200,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        }
      ],

      products: [
        {
          id: 'p1',
          tenantId: '1',
          name: 'Aceite Castrol Magnatec',
          sku: 'CAS-MAG-01',
          category: 'Lubricantes',
          brand: 'Castrol',
          costPrice: 450,
          salePrice: 650,
          stock: 24,
          minStock: 5,
          tax: 18,
          serviceIds: ['s_m1', 's_m2', 's_m6'],
          maintenanceCategory: 'engine',
          lifespanKm: 10000,
          lifespanDays: 365,
          variants: [
            { id: 'pv1', productId: 'p1', name: '5W30 Full Synthetic', sku: 'CAS-5W30', stock: 12 },
            { id: 'pv2', productId: 'p1', name: '10W40 Semi Synthetic', sku: 'CAS-10W40', stock: 12 },
          ]
        },
        {
          id: 'p2',
          tenantId: '1',
          name: 'Filtro de Aceite Bosch',
          sku: 'BOS-FIL-77',
          category: 'Filtros',
          brand: 'Bosch',
          costPrice: 200,
          salePrice: 350,
          stock: 3,
          minStock: 10,
          tax: 18,
          serviceIds: ['s_m1', 's_m2', 's_m3', 's_m4'],
        },
        {
          id: 'p3',
          tenantId: '1',
          name: 'Pastilla de Freno Wagner',
          sku: 'WAG-PAS-32',
          category: 'Frenos',
          brand: 'Wagner',
          costPrice: 800,
          salePrice: 1200,
          stock: 8,
          minStock: 4,
          tax: 18,
          serviceIds: ['s_f1', 's_f2', 's_f4', 's_f5'],
          maintenanceCategory: 'brakes',
          lifespanKm: 25000,
          lifespanDays: 365,
        },
        {
          id: 'p4',
          tenantId: '1',
          name: 'Batería Fullriver 12V',
          sku: 'FUL-BAT-12',
          category: 'Eléctrico',
          brand: 'Fullriver',
          costPrice: 3500,
          salePrice: 5200,
          stock: 0,
          minStock: 2,
          tax: 18,
          serviceIds: ['s_el1', 's_el2'],
          maintenanceCategory: 'battery',
          lifespanKm: 60000,
          lifespanDays: 1095,
        }
      ],

      services: [
        // Motor
        { id: 's_m1', tenantId: '1', name: 'Cambio de Aceite de Motor', price: 0, duration: '45min', category: 'Motor', maintenanceCategory: 'engine', lifespanKm: 5000, lifespanDays: 180 },
        { id: 's_m2', tenantId: '1', name: 'Reemplazo de Filtro de Aceite', price: 0, duration: '30min', category: 'Motor', maintenanceCategory: 'engine', lifespanKm: 5000, lifespanDays: 180 },
        { id: 's_m3', tenantId: '1', name: 'Reemplazo de Filtro de Aire', price: 0, duration: '20min', category: 'Motor' },
        { id: 's_m4', tenantId: '1', name: 'Reemplazo de Filtro de Cabina', price: 0, duration: '20min', category: 'Motor', maintenanceCategory: 'ac', lifespanKm: 15000, lifespanDays: 365 },
        { id: 's_m5', tenantId: '1', name: 'Reemplazo de Bujías', price: 0, duration: '1h', category: 'Motor', maintenanceCategory: 'engine', lifespanKm: 40000, lifespanDays: 730 },
        { id: 's_m6', tenantId: '1', name: 'Limpieza de Inyectores', price: 0, duration: '1.5h', category: 'Motor' },
        { id: 's_m7', tenantId: '1', name: 'Limpieza de Cuerpo de Aceleración', price: 0, duration: '1h', category: 'Motor' },
        
        // Frenos
        { id: 's_f1', tenantId: '1', name: 'Reemplazo de Pastillas Delanteras', price: 0, duration: '1h', category: 'Frenos', maintenanceCategory: 'brakes', lifespanKm: 25000, lifespanDays: 365 },
        { id: 's_f2', tenantId: '1', name: 'Reemplazo de Pastillas Traseras', price: 0, duration: '1h', category: 'Frenos', maintenanceCategory: 'brakes', lifespanKm: 25000, lifespanDays: 365 },
        { id: 's_f3', tenantId: '1', name: 'Cambio de Líquido de Frenos', price: 0, duration: '45min', category: 'Frenos', maintenanceCategory: 'brakes', lifespanKm: 40000, lifespanDays: 730 },
        { id: 's_f4', tenantId: '1', name: 'Rectificación de Discos', price: 0, duration: '1.5h', category: 'Frenos' },
        { id: 's_f5', tenantId: '1', name: 'Reemplazo de Discos de Freno', price: 0, duration: '2h', category: 'Frenos', maintenanceCategory: 'brakes', lifespanKm: 50000, lifespanDays: 1095 },
        
        // Neumáticos
        { id: 's_n1', tenantId: '1', name: 'Rotación de Neumáticos', price: 0, duration: '30min', category: 'Neumáticos' },
        { id: 's_n2', tenantId: '1', name: 'Balanceo de Ruedas', price: 0, duration: '45min', category: 'Neumáticos' },
        { id: 's_n3', tenantId: '1', name: 'Alineación Computarizada', price: 0, duration: '1h', category: 'Neumáticos' },
        { id: 's_n4', tenantId: '1', name: 'Reemplazo de Neumáticos', price: 0, duration: '30min', category: 'Neumáticos' },
        { id: 's_n5', tenantId: '1', name: 'Calibración de Presión', price: 0, duration: '10min', category: 'Neumáticos' },
        
        // Suspensión
        { id: 's_s1', tenantId: '1', name: 'Reemplazo de Amortiguadores', price: 0, duration: '2h', category: 'Suspensión' },
        { id: 's_s2', tenantId: '1', name: 'Reemplazo de Terminales', price: 0, duration: '1.5h', category: 'Suspensión' },
        { id: 's_s3', tenantId: '1', name: 'Reemplazo de Rótulas', price: 0, duration: '1.5h', category: 'Suspensión' },
        { id: 's_s4', tenantId: '1', name: 'Inspección de Suspensión', price: 0, duration: '30min', category: 'Suspensión' },
        
        // Transmisión
        { id: 's_t1', tenantId: '1', name: 'Cambio de Aceite de Transmisión', price: 0, duration: '1h', category: 'Transmisión' },
        { id: 's_t2', tenantId: '1', name: 'Flush de Transmisión', price: 0, duration: '2h', category: 'Transmisión' },
        { id: 's_t3', tenantId: '1', name: 'Cambio de Aceite CVT', price: 0, duration: '1h', category: 'Transmisión' },
        
        // Enfriamiento
        { id: 's_e1', tenantId: '1', name: 'Cambio de Refrigerante', price: 0, duration: '45min', category: 'Enfriamiento' },
        { id: 's_e2', tenantId: '1', name: 'Flush de Radiador', price: 0, duration: '1h', category: 'Enfriamiento' },
        { id: 's_e3', tenantId: '1', name: 'Reemplazo de Termostato', price: 0, duration: '1h', category: 'Enfriamiento' },
        
        // Aire Acondicionado
        { id: 's_ac1', tenantId: '1', name: 'Servicio de Aire Acondicionado', price: 0, duration: '2h', category: 'Aire Acondicionado' },
        { id: 's_ac2', tenantId: '1', name: 'Recarga de Gas A/C', price: 0, duration: '1h', category: 'Aire Acondicionado' },
        
        // Sistema Eléctrico
        { id: 's_el1', tenantId: '1', name: 'Reemplazo de Batería', price: 0, duration: '20min', category: 'Sistema Eléctrico' },
        { id: 's_el2', tenantId: '1', name: 'Diagnóstico Electrónico', price: 0, duration: '1h', category: 'Sistema Eléctrico' },
        { id: 's_el3', tenantId: '1', name: 'Escaneo OBDII', price: 0, duration: '30min', category: 'Sistema Eléctrico' },
      ],

      movements: [],
      cajas: [],
      cajaMovements: [],
      invoices: [
        {
          id: 'inv1',
          tenantId: '1',
          customerId: 'c1',
          items: [
            { id: 'ii1', productId: 'p1', name: 'Aceite Castrol Magnatec 5W30', quantity: 4, unitPrice: 650, tax: 18 },
            { id: 'ii2', serviceId: 's1', name: 'Cambio de Aceite', quantity: 1, unitPrice: 800, tax: 18 },
          ],
          subtotal: 3400,
          tax: 612,
          total: 4012,
          paymentMethod: 'cash',
          status: 'paid',
          ncf: 'B02-00000001',
          createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        },
        {
          id: 'inv2',
          tenantId: '1',
          customerId: 'c2',
          items: [
            { id: 'ii3', serviceId: 's2', name: 'Alineación y Balanceo', quantity: 1, unitPrice: 1500, tax: 18 },
          ],
          subtotal: 1500,
          tax: 270,
          total: 1770,
          paymentMethod: 'card',
          status: 'paid',
          ncf: 'B02-00000002',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ],

      whatsappLogs: [
        {
          id: 'wl1',
          tenantId: '1',
          customerId: 'c1',
          customerName: 'Yeri Orlando',
          phone: '809-555-0123',
          type: 'reminder',
          message: 'Hola Yeri, tu Toyota Hilux tiene un cambio de aceite pendiente para esta semana.',
          status: 'sent',
          sentAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
        {
          id: 'wl2',
          tenantId: '1',
          customerId: 'c2',
          customerName: 'María Garcia',
          phone: '829-555-4567',
          type: 'notification',
          message: 'Tu vehículo Hyundai Tucson está listo para ser retirado. ¡Gracias por tu confianza!',
          status: 'sent',
          sentAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 'wl3',
          tenantId: '1',
          customerId: 'c3',
          customerName: 'Pedro Ramírez',
          phone: '849-555-7890',
          type: 'reminder',
          message: 'Recordatorio de mantenimiento preventivo para tu Honda Civic.',
          status: 'failed',
          sentAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
      ],

      maintenanceItems: [
        {
          id: 'm1', vehicleId: 'v1', tenantId: '1', name: 'Cambio de Aceite',
          lastServiceDate: new Date(Date.now() - 86400000 * 90).toISOString(),
          lastServiceKm: 40000, lifespanKm: 5000, lifespanDays: 180,
          currentPercentage: 80, category: 'engine'
        },
        {
          id: 'm2', vehicleId: 'v1', tenantId: '1', name: 'Frenos Delanteros',
          lastServiceDate: new Date(Date.now() - 86400000 * 200).toISOString(),
          lastServiceKm: 35000, lifespanKm: 20000, lifespanDays: 730,
          currentPercentage: 90, category: 'brakes'
        },
        {
          id: 'm3', vehicleId: 'v2', tenantId: '1', name: 'Cambio de Aceite',
          lastServiceDate: new Date(Date.now() - 86400000 * 120).toISOString(),
          lastServiceKm: 58000, lifespanKm: 5000, lifespanDays: 180,
          currentPercentage: 30, category: 'engine'
        },
        {
          id: 'm4', vehicleId: 'v3', tenantId: '1', name: 'Batería',
          lastServiceDate: new Date(Date.now() - 86400000 * 600).toISOString(),
          lastServiceKm: 15000, lifespanKm: 50000, lifespanDays: 730,
          currentPercentage: 10, category: 'battery'
        },
      ],

      maintenanceHistory: [
        {
          id: 'mh1', vehicleId: 'v1', tenantId: '1', name: 'Cambio de Aceite',
          serviceDate: new Date(Date.now() - 86400000 * 180).toISOString(),
          serviceKm: 35000,
          completedAt: new Date(Date.now() - 86400000 * 90).toISOString(),
          notes: 'Mantenimiento preventivo periódico: Aceite sintético 5W-30 y filtro de aceite original.'
        },
        {
          id: 'mh2', vehicleId: 'v1', tenantId: '1', name: 'Frenos Delanteros',
          serviceDate: new Date(Date.now() - 86400000 * 400).toISOString(),
          serviceKm: 20000,
          completedAt: new Date(Date.now() - 86400000 * 200).toISOString(),
          notes: 'Reemplazo de pastillas de freno delanteras y rectificado de discos.'
        },
        {
          id: 'mh3', vehicleId: 'v2', tenantId: '1', name: 'Cambio de Aceite',
          serviceDate: new Date(Date.now() - 86400000 * 240).toISOString(),
          serviceKm: 53000,
          completedAt: new Date(Date.now() - 86400000 * 120).toISOString(),
          notes: 'Cambio periódico de aceite de motor y filtro de aire del habitáculo.'
        },
        {
          id: 'mh4', vehicleId: 'v3', tenantId: '1', name: 'Batería',
          serviceDate: new Date(Date.now() - 86400000 * 1000).toISOString(),
          serviceKm: 5000,
          completedAt: new Date(Date.now() - 86400000 * 600).toISOString(),
          notes: 'Reemplazo de batería de 12V debido a pérdida de capacidad de arranque en frío.'
        }
      ],

      maintenanceAlerts: [],

      conversations: [
        {
          id: 'conv1',
          tenantId: '1',
          name: 'Yeri Orlando',
          phone: '809-555-0123',
          last_msg: 'Hola, ¿mi vehículo está listo?',
          time: new Date().toISOString(),
          unread: 1,
          status: 'activa',
          agent: 'humano'
        },
        {
          id: 'conv2',
          tenantId: '1',
          name: 'María Garcia',
          phone: '829-555-4567',
          last_msg: 'Confirmado, estaré a las 3pm.',
          time: new Date(Date.now() - 3600000).toISOString(),
          unread: 0,
          status: 'activa',
          agent: 'ia'
        }
      ],

      chatMessages: [
        {
          id: 'msg1',
          conversation_id: 'conv1',
          role: 'user',
          content: 'Hola, ¿mi vehículo está listo?',
          time: new Date().toISOString(),
          status: 'read'
        },
        {
          id: 'msg2',
          conversation_id: 'conv2',
          role: 'assistant',
          content: 'Hola María, te recordamos tu cita de mañana a las 3pm.',
          time: new Date(Date.now() - 7200000).toISOString(),
          status: 'read'
        },
        {
          id: 'msg3',
          conversation_id: 'conv2',
          role: 'user',
          content: 'Confirmado, estaré a las 3pm.',
          time: new Date(Date.now() - 3600000).toISOString(),
          status: 'read'
        }
      ],

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
      }),
    }
  )
);
