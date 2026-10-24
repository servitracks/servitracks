"use client";

import { useState, useMemo } from "react";
import { useStore, Customer, Vehicle } from "@/store/useStore";
import {
  UserPlus, Search, MoreVertical, Car, Phone, Mail, Calendar,
  ChevronRight, Users, TrendingUp, Edit, Trash2, X, User as UserIcon, Upload,
  Building2, CarFront, AlertCircle, Wrench, ShieldCheck, Plus, ExternalLink,
  MapPin, Hash, Sparkles, Gauge, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useParams, useRouter } from "@/lib/next-compat";
import BulkCustomerImportModal from "@/components/customers/BulkCustomerImportModal";

type CustomerFilterTab = "all" | "personal" | "business" | "with_vehicles" | "no_vehicles";

type CustomerForm = {
  name: string;
  phone: string;
  email: string;
  rnc: string;
  type: "Persona" | "Empresa";
  address: string;
  notes: string;
  birthday: string;
};

const emptyCustomerForm: CustomerForm = {
  name: "",
  phone: "",
  email: "",
  rnc: "",
  type: "Persona",
  address: "",
  notes: "",
  birthday: "",
};

type VehicleForm = {
  brand: string;
  model: string;
  year: string;
  plate: string;
  vin: string;
  color?: string;
};

const emptyVehicleForm: VehicleForm = {
  brand: "",
  model: "",
  year: new Date().getFullYear().toString(),
  plate: "",
  vin: "",
  color: "Blanco",
};

interface CustomerFormFieldsProps {
  form: CustomerForm;
  setForm: React.Dispatch<React.SetStateAction<CustomerForm>>;
}

function CustomerFormFields({ form, setForm }: CustomerFormFieldsProps) {
  return (
    <div className="space-y-3">
      {/* Selector de Tipo de Cliente tipo segmented compacto */}
      <div className="space-y-1">
        <Label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
          Tipo de Cliente
        </Label>
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-100 rounded-xl">
          <button
            type="button"
            onClick={() => setForm({ ...form, type: "Persona" })}
            className={cn(
              "flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              form.type === "Persona"
                ? "bg-neutral-900 text-white shadow-xs"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50"
            )}
          >
            <UserIcon className="h-3.5 w-3.5" />
            Individual (Consumidor Final)
          </button>
          <button
            type="button"
            onClick={() => setForm({ ...form, type: "Empresa" })}
            className={cn(
              "flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              form.type === "Empresa"
                ? "bg-neutral-900 text-white shadow-xs"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50"
            )}
          >
            <Building2 className="h-3.5 w-3.5" />
            Empresa (Crédito Fiscal)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-neutral-700">
            {form.type === "Empresa" ? "Razón Social *" : "Nombre Completo *"}
          </Label>
          <Input
            placeholder={form.type === "Empresa" ? "Ej: Inversiones SRL" : "Ej: Juan Pérez"}
            className="h-9 rounded-xl border-neutral-200 bg-neutral-50/40 focus:bg-white text-xs"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold text-neutral-700">Teléfono *</Label>
          <Input
            placeholder="809-000-0000"
            className="h-9 rounded-xl border-neutral-200 bg-neutral-50/40 focus:bg-white text-xs"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold text-neutral-700">Correo Electrónico</Label>
          <Input
            type="email"
            placeholder="correo@ejemplo.com"
            className="h-9 rounded-xl border-neutral-200 bg-neutral-50/40 focus:bg-white text-xs"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold text-neutral-700">
            {form.type === "Empresa" ? "RNC (Obligatorio) *" : "RNC / Cédula (Opcional)"}
          </Label>
          <Input
            placeholder={form.type === "Empresa" ? "Ej: 131123456" : "Ej: 001-0000000-0"}
            className="h-9 rounded-xl border-neutral-200 bg-neutral-50/40 focus:bg-white font-mono text-xs uppercase"
            value={form.rnc}
            onChange={(e) => setForm({ ...form, rnc: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold text-neutral-700">Dirección Física</Label>
          <Input
            placeholder="Ej: Av. 27 de Febrero #123"
            className="h-9 rounded-xl border-neutral-200 bg-neutral-50/40 focus:bg-white text-xs"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold text-neutral-700">Notas Internas</Label>
          <Input
            placeholder="Ej: Preferencia de contacto"
            className="h-9 rounded-xl border-neutral-200 bg-neutral-50/40 focus:bg-white text-xs"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

function VehicleFormFields({
  form,
  setForm,
}: {
  form: VehicleForm;
  setForm: React.Dispatch<React.SetStateAction<VehicleForm>>;
}) {
  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-neutral-700">Marca del Vehículo *</Label>
          <Input
            placeholder="Ej: Toyota, Honda, Ford"
            className="h-10 rounded-xl border-neutral-200 bg-neutral-50/40 focus:bg-white text-sm"
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-neutral-700">Modelo *</Label>
          <Input
            placeholder="Ej: Corolla, Civic, Ranger"
            className="h-10 rounded-xl border-neutral-200 bg-neutral-50/40 focus:bg-white text-sm"
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-neutral-700">Placa / Matrícula *</Label>
          <Input
            placeholder="Ej: A123456"
            className="h-10 rounded-xl border-neutral-200 bg-neutral-50/40 focus:bg-white font-mono uppercase text-sm font-semibold tracking-wider"
            value={form.plate}
            onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-neutral-700">Año de Fabricación</Label>
          <Input
            type="number"
            placeholder="Ej: 2022"
            className="h-10 rounded-xl border-neutral-200 bg-neutral-50/40 focus:bg-white text-sm"
            value={form.year}
            onChange={(e) => setForm({ ...form, year: e.target.value })}
          />
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label className="text-xs font-semibold text-neutral-700">VIN / Número de Chasis (Opcional)</Label>
          <Input
            placeholder="Ej: 1HGCR2F83HA123456"
            className="h-10 rounded-xl border-neutral-200 bg-neutral-50/40 focus:bg-white font-mono uppercase text-sm"
            value={form.vin}
            onChange={(e) => setForm({ ...form, vin: e.target.value.toUpperCase() })}
          />
        </div>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const { tenant } = useParams();
  const router = useRouter();
  const {
    customers,
    vehicles,
    orders,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addVehicle,
    deleteVehicle,
    deleteMaintenanceItem,
    maintenanceItems,
    tenants,
  } = useStore();

  const currentTenant = tenants.find((t) => t.slug === tenant) ?? null;
  const tenantId = currentTenant?.id ?? "";

  const [activeTab, setActiveTab] = useState<CustomerFilterTab>("all");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isVehiclesModalOpen, setIsVehiclesModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState("");

  // Modal para agregar vehículo rápido a un cliente existente
  const [quickVehicleCustomer, setQuickVehicleCustomer] = useState<Customer | null>(null);
  const [quickVehForm, setQuickVehForm] = useState<VehicleForm>(emptyVehicleForm);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyCustomerForm);
  const [vehForm, setVehForm] = useState<VehicleForm>(emptyVehicleForm);

  const tenantCustomers = useMemo(() => {
    return customers.filter((c) => !tenantId || c.tenantId === tenantId);
  }, [customers, tenantId]);

  const tenantVehicles = useMemo(() => {
    return vehicles.filter((v) => !tenantId || v.tenantId === tenantId);
  }, [vehicles, tenantId]);

  // Contadores y métricas
  const customerVehiclesMap = useMemo(() => {
    const map = new Map<string, Vehicle[]>();
    for (const v of tenantVehicles) {
      const list = map.get(v.customerId) || [];
      list.push(v);
      map.set(v.customerId, list);
    }
    return map;
  }, [tenantVehicles]);

  const customerOrdersMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      if (!tenantId || o.tenantId === tenantId) {
        map.set(o.customerId, (map.get(o.customerId) || 0) + 1);
      }
    }
    return map;
  }, [orders, tenantId]);

  const getVehicleCount = (id: string) => customerVehiclesMap.get(id)?.length || 0;
  const getOrderCount = (id: string) => customerOrdersMap.get(id) || 0;
  const getCustomerName = (id: string) => tenantCustomers.find((c) => c.id === id)?.name || "Desconocido";
  const getCustomer = (id: string) => tenantCustomers.find((c) => c.id === id);

  const newThisMonth = useMemo(() => {
    const now = new Date();
    return tenantCustomers.filter((c) => {
      const d = new Date(c.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [tenantCustomers]);

  const businessCustomersCount = useMemo(() => {
    return tenantCustomers.filter((c) => c.type === "Empresa" || (c.rnc && c.rnc.length >= 9)).length;
  }, [tenantCustomers]);

  const withVehiclesCount = useMemo(() => {
    return tenantCustomers.filter((c) => (customerVehiclesMap.get(c.id)?.length || 0) > 0).length;
  }, [tenantCustomers, customerVehiclesMap]);

  const noVehiclesCount = tenantCustomers.length - withVehiclesCount;

  // Filtrado compuesto: Tab + Buscador (nombre, teléfono, correo, rnc, y placas de sus vehículos)
  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return tenantCustomers.filter((c) => {
      // 1. Filtro por Pestaña
      const cVehicles = customerVehiclesMap.get(c.id) || [];
      const hasVehicles = cVehicles.length > 0;
      const isBusiness = c.type === "Empresa" || (c.rnc && c.rnc.length >= 9);

      if (activeTab === "personal" && isBusiness) return false;
      if (activeTab === "business" && !isBusiness) return false;
      if (activeTab === "with_vehicles" && !hasVehicles) return false;
      if (activeTab === "no_vehicles" && hasVehicles) return false;

      // 2. Filtro por Texto de Búsqueda
      if (!q) return true;

      const matchesName = c.name.toLowerCase().includes(q);
      const matchesPhone = c.phone.includes(q);
      const matchesEmail = (c.email || "").toLowerCase().includes(q);
      const matchesRnc = (c.rnc || "").toLowerCase().includes(q);
      const matchesPlate = cVehicles.some((v) => v.plate.toLowerCase().includes(q));

      return matchesName || matchesPhone || matchesEmail || matchesRnc || matchesPlate;
    });
  }, [tenantCustomers, activeTab, search, customerVehiclesMap]);

  const handleCreateCustomerAndVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (createStep === 1) {
      if (!form.name || !form.phone) {
        toast.error("El nombre y el teléfono son obligatorios");
        return;
      }
      setCreateStep(2);
      return;
    }

    // Paso 2: Crear cliente y opcionalmente su vehículo
    const newCustomerId = crypto.randomUUID();
    const newCustomer: Customer = {
      id: newCustomerId,
      tenantId: tenantId,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      rnc: form.rnc.trim() || undefined,
      type: form.type,
      taxReceiptType: form.type === "Empresa" || form.rnc.trim() ? "B01" : "B02",
      address: form.address.trim() || undefined,
      notes: form.notes.trim() || undefined,
      birthday: form.birthday || undefined,
      createdAt: new Date().toISOString(),
    };

    addCustomer(newCustomer);

    // Registro de vehículo inicial si se completó la placa
    if (vehForm.brand || vehForm.model || vehForm.plate) {
      if (!vehForm.brand || !vehForm.model || !vehForm.plate) {
        toast.error("Para registrar el vehículo, completa marca, modelo y placa.");
        return;
      }
      const newVehicle: Vehicle = {
        id: crypto.randomUUID(),
        tenantId: tenantId,
        customerId: newCustomerId,
        brand: vehForm.brand.trim(),
        model: vehForm.model.trim(),
        year: Number(vehForm.year) || new Date().getFullYear(),
        plate: vehForm.plate.trim().toUpperCase(),
        vin: vehForm.vin.trim().toUpperCase() || undefined,
        lastService: new Date().toISOString(),
      };
      addVehicle(newVehicle);
      toast.success(`${form.name} y vehículo registrados correctamente`);
    } else {
      toast.success(`${form.name} registrado con éxito`);
    }

    setIsCreateOpen(false);
    setCreateStep(1);
    setForm(emptyCustomerForm);
    setVehForm(emptyVehicleForm);
  };

  const skipVehicleRegistration = () => {
    const newCustomerId = crypto.randomUUID();
    addCustomer({
      id: newCustomerId,
      tenantId,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      rnc: form.rnc.trim() || undefined,
      type: form.type,
      taxReceiptType: form.type === "Empresa" || form.rnc.trim() ? "B01" : "B02",
      address: form.address.trim() || undefined,
      notes: form.notes.trim() || undefined,
      birthday: form.birthday || undefined,
      createdAt: new Date().toISOString(),
    });
    toast.success(`${form.name} registrado correctamente (Sin vehículo)`);
    setIsCreateOpen(false);
    setCreateStep(1);
    setForm(emptyCustomerForm);
    setVehForm(emptyVehicleForm);
  };

  const handleQuickAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickVehicleCustomer) return;
    if (!quickVehForm.brand.trim() || !quickVehForm.model.trim() || !quickVehForm.plate.trim()) {
      toast.error("Marca, modelo y placa son obligatorios");
      return;
    }

    const newVehicle: Vehicle = {
      id: crypto.randomUUID(),
      tenantId: tenantId,
      customerId: quickVehicleCustomer.id,
      brand: quickVehForm.brand.trim(),
      model: quickVehForm.model.trim(),
      year: Number(quickVehForm.year) || new Date().getFullYear(),
      plate: quickVehForm.plate.trim().toUpperCase(),
      vin: quickVehForm.vin.trim().toUpperCase() || undefined,
      lastService: new Date().toISOString(),
    };

    addVehicle(newVehicle);
    toast.success(`Vehículo ${newVehicle.brand} ${newVehicle.model} agregado a ${quickVehicleCustomer.name}`);
    setQuickVehicleCustomer(null);
    setQuickVehForm(emptyVehicleForm);
  };

  const openEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || "",
      rnc: customer.rnc || "",
      type: customer.type || (customer.rnc ? "Empresa" : "Persona"),
      address: customer.address || "",
      notes: customer.notes || "",
      birthday: customer.birthday || "",
    });
    setIsEditOpen(true);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    updateCustomer(selectedCustomer.id, {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      rnc: form.rnc.trim() || undefined,
      type: form.type,
      taxReceiptType: form.type === "Empresa" || form.rnc.trim() ? "B01" : "B02",
      address: form.address.trim() || undefined,
      notes: form.notes.trim() || undefined,
      birthday: form.birthday || undefined,
    });
    toast.success("Cliente actualizado exitosamente");
    setIsEditOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`¿Eliminar al cliente "${name}"? Esta acción no se puede deshacer.`)) {
      deleteCustomer(id);
      toast.success(`${name} ha sido eliminado`);
    }
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este vehículo y todo su historial de mantenimiento?")) {
      deleteVehicle(vehicleId);
      const itemsToDelete = maintenanceItems.filter((item) => item.vehicleId === vehicleId);
      itemsToDelete.forEach((item) => deleteMaintenanceItem(item.id));
      toast.success("Vehículo eliminado correctamente");
    }
  };

  const filteredVehicles = useMemo(() => {
    const q = vehicleSearch.trim().toLowerCase();
    return tenantVehicles.filter(
      (v) =>
        v.plate.toLowerCase().includes(q) ||
        v.brand.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        getCustomerName(v.customerId).toLowerCase().includes(q)
    );
  }, [tenantVehicles, vehicleSearch]);

  const tabsConfig = [
    {
      id: "all" as CustomerFilterTab,
      label: "Todos",
      icon: Users,
      count: tenantCustomers.length,
    },
    {
      id: "personal" as CustomerFilterTab,
      label: "Particulares",
      icon: UserIcon,
      count: tenantCustomers.length - businessCustomersCount,
    },
    {
      id: "business" as CustomerFilterTab,
      label: "Empresas",
      icon: Building2,
      count: businessCustomersCount,
    },
    {
      id: "with_vehicles" as CustomerFilterTab,
      label: "Con Vehículos",
      icon: Car,
      count: withVehiclesCount,
    },
    {
      id: "no_vehicles" as CustomerFilterTab,
      label: "Sin Vehículo",
      icon: AlertCircle,
      count: noVehiclesCount,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              Directorio de Clientes
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
              {tenantCustomers.length} registrados
            </span>
          </div>
          <p className="text-sm text-neutral-500 mt-1">
            Gestión de expedientes de clientes, flota vehicular asignada y seguimiento de órdenes.
          </p>
        </div>

        {/* Acciones Superiores */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="rounded-xl gap-2 cursor-pointer bg-white border-neutral-200 hover:bg-neutral-50 active:scale-[0.98] transition-all text-xs font-semibold text-neutral-700 h-10 px-3.5 shadow-2xs"
            onClick={() => setIsVehiclesModalOpen(true)}
          >
            <Car className="h-4 w-4 text-neutral-600" />
            Directorio de Flota
            <span className="font-mono text-[11px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded-md">
              {tenantVehicles.length}
            </span>
          </Button>

          <Button
            variant="outline"
            className="rounded-xl gap-2 cursor-pointer bg-white border-neutral-200 hover:bg-neutral-50 active:scale-[0.98] transition-all text-xs font-semibold text-neutral-700 h-10 px-3.5 shadow-2xs"
            onClick={() => setIsImportModalOpen(true)}
          >
            <Upload className="h-4 w-4 text-neutral-600" />
            Importar
          </Button>

          <Button
            className="rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 active:scale-[0.98] transition-all gap-2 cursor-pointer text-xs font-semibold h-10 px-4 shadow-sm"
            onClick={() => {
              setForm(emptyCustomerForm);
              setVehForm(emptyVehicleForm);
              setCreateStep(1);
              setIsCreateOpen(true);
            }}
          >
            <UserPlus className="h-4 w-4" />
            Nuevo Cliente
          </Button>
        </div>
      </div>

      {/* KPI Cards Interactivas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Clientes",
            value: tenantCustomers.length,
            icon: Users,
            iconBg: "bg-neutral-100 text-neutral-800 border-neutral-200",
            tabAction: "all" as CustomerFilterTab,
          },
          {
            label: "Nuevos del Mes",
            value: newThisMonth,
            icon: TrendingUp,
            iconBg: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
            tabAction: "all" as CustomerFilterTab,
          },
          {
            label: "Flota Registrada",
            value: tenantVehicles.length,
            icon: Car,
            iconBg: "bg-blue-50 text-blue-700 border-blue-200/80",
            tabAction: "with_vehicles" as CustomerFilterTab,
          },
          {
            label: "Cuentas Corporativas",
            value: businessCustomersCount,
            icon: Building2,
            iconBg: "bg-amber-50 text-amber-700 border-amber-200/80",
            tabAction: "business" as CustomerFilterTab,
          },
        ].map((kpi) => (
          <button
            key={kpi.label}
            type="button"
            onClick={() => setActiveTab(kpi.tabAction)}
            className={cn(
              "flex items-center gap-3 rounded-2xl border p-3.5 bg-white shadow-2xs text-left transition-all cursor-pointer group active:scale-[0.98]",
              activeTab === kpi.tabAction
                ? "border-neutral-900 ring-1 ring-neutral-900"
                : "border-neutral-200/80 hover:border-neutral-300 hover:shadow-xs"
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl border flex-shrink-0 transition-transform group-hover:scale-105",
                kpi.iconBg
              )}
            >
              <kpi.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 leading-tight">
                {kpi.label}
              </p>
              <p className="text-xl font-bold tracking-tight text-neutral-900 leading-tight mt-0.5 font-mono tabular-nums">
                {kpi.value}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Barra de Filtros: Pestañas con Iconos y Active State Negro Primario */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50/80 p-2 rounded-2xl border border-neutral-200/80">
        {/* Pestañas con iconos */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {tabsConfig.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all whitespace-nowrap cursor-pointer active:scale-[0.98]",
                  isActive
                    ? "bg-neutral-900 text-white font-semibold shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 font-medium"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", isActive ? "text-white" : "text-neutral-500")} />
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "text-[10px] font-mono px-1.5 py-0.2 rounded-full",
                    isActive ? "bg-white/20 text-white" : "bg-neutral-200/70 text-neutral-600"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Buscador inteligente */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder="Buscar por nombre, tel, RNC o placa..."
            className="h-9 w-full rounded-xl border-neutral-200 bg-white pl-9 pr-8 text-xs focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all placeholder:text-neutral-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5 rounded-md hover:bg-neutral-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Clientes con Diseño Refinado */}
      <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-2xs overflow-hidden">
        <Table>
          <TableHeader className="bg-neutral-50/75 border-b border-neutral-200/80">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 py-3.5 pl-6">
                Cliente / Razón Social
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 py-3.5">
                Contacto Directo
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 py-3.5">
                Flota Vehicular
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 py-3.5">
                Historial Órdenes
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 py-3.5">
                Fecha Registro
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 py-3.5 text-right pr-6">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center bg-white">
                  <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                    <div className="h-12 w-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400 mb-1">
                      <Users className="h-6 w-6" />
                    </div>
                    <p className="font-semibold text-neutral-900 text-sm">No se encontraron clientes</p>
                    <p className="text-xs text-neutral-500">
                      {search
                        ? `No hay coincidencias para "${search}". Intenta con otro término o limpia el buscador.`
                        : "Aún no tienes clientes registrados bajo este filtro."}
                    </p>
                    {search && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSearch("")}
                        className="mt-2 rounded-xl text-xs"
                      >
                        Limpiar búsqueda
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => {
                const cVehicles = customerVehiclesMap.get(customer.id) || [];
                const cOrdersCount = customerOrdersMap.get(customer.id) || 0;
                const isCompany = customer.type === "Empresa" || (customer.rnc && customer.rnc.length >= 9);

                return (
                  <TableRow
                    key={customer.id}
                    className="group hover:bg-neutral-50/70 border-b border-neutral-100 transition-colors cursor-pointer"
                    onClick={() => router.push(`/${tenant}/customers/${customer.id}`)}
                  >
                    {/* Cliente / Razón Social */}
                    <TableCell className="py-3.5 pl-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 rounded-xl border border-neutral-200/80 bg-neutral-900 flex-shrink-0">
                          <AvatarFallback className="bg-neutral-900 text-white text-xs font-bold">
                            {customer.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-neutral-900 text-sm group-hover:text-black">
                              {customer.name}
                            </span>
                            {isCompany ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-semibold bg-amber-50 text-amber-800 border-amber-200/80 rounded-md px-1.5 py-0 flex items-center gap-1"
                              >
                                <Building2 className="h-2.5 w-2.5" />
                                Empresa
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-medium bg-neutral-100 text-neutral-600 border-neutral-200 rounded-md px-1.5 py-0"
                              >
                                Personal
                              </Badge>
                            )}
                          </div>
                          {customer.rnc ? (
                            <p className="text-[11px] font-mono text-neutral-500 mt-0.5">
                              RNC/Céd: {customer.rnc}
                            </p>
                          ) : customer.address ? (
                            <p className="text-[11px] text-neutral-400 truncate max-w-xs mt-0.5">
                              {customer.address}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>

                    {/* Contacto Directo */}
                    <TableCell className="py-3.5">
                      <div className="space-y-1 text-xs">
                        <a
                          href={`tel:${customer.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 font-medium text-neutral-700 hover:text-black transition-colors"
                        >
                          <Phone className="h-3 w-3 text-neutral-400" />
                          <span>{customer.phone}</span>
                        </a>
                        {customer.email ? (
                          <a
                            href={`mailto:${customer.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 text-neutral-500 hover:text-black transition-colors truncate max-w-[180px]"
                          >
                            <Mail className="h-3 w-3 text-neutral-400 flex-shrink-0" />
                            <span className="truncate">{customer.email}</span>
                          </a>
                        ) : (
                          <span className="text-[11px] text-neutral-400">Sin correo</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Flota Vehicular */}
                    <TableCell className="py-3.5">
                      {cVehicles.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-neutral-100 text-neutral-900 border border-neutral-200">
                              <Car className="h-3 w-3 text-neutral-600" />
                              {cVehicles.length} {cVehicles.length === 1 ? "vehículo" : "vehículos"}
                            </span>
                          </div>
                          {/* Badges de placas */}
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {cVehicles.slice(0, 2).map((v) => (
                              <span
                                key={v.id}
                                className="text-[10px] font-mono font-bold bg-neutral-50 border border-neutral-200 px-1.5 py-0.2 rounded text-neutral-700"
                              >
                                {v.plate}
                              </span>
                            ))}
                            {cVehicles.length > 2 && (
                              <span className="text-[10px] font-medium text-neutral-400 self-center">
                                +{cVehicles.length - 2}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickVehicleCustomer(customer);
                            setQuickVehForm(emptyVehicleForm);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500 hover:text-neutral-900 hover:underline cursor-pointer"
                        >
                          <Plus className="h-3 w-3 text-neutral-400" />
                          Asignar vehículo
                        </button>
                      )}
                    </TableCell>

                    {/* Historial Órdenes */}
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold font-mono",
                            cOrdersCount > 0
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80"
                              : "bg-neutral-50 text-neutral-500 border border-neutral-200"
                          )}
                        >
                          <Wrench className="h-3 w-3" />
                          {cOrdersCount} {cOrdersCount === 1 ? "orden" : "órdenes"}
                        </span>
                      </div>
                    </TableCell>

                    {/* Fecha de Registro */}
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                        <span>
                          {new Date(customer.createdAt).toLocaleDateString("es-DO", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </TableCell>

                    {/* Acciones */}
                    <TableCell className="py-3.5 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-xl text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"
                          onClick={() => router.push(`/${tenant}/customers/${customer.id}`)}
                          title="Ver Expediente"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-xl text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"
                              />
                            }
                          >
                            <MoreVertical className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-2xl border-neutral-200 p-1.5 shadow-xl w-48 z-50">
                            <DropdownMenuItem
                              className="rounded-xl py-2 cursor-pointer gap-2 text-xs font-medium"
                              onClick={() => router.push(`/${tenant}/customers/${customer.id}`)}
                            >
                              <ChevronRight className="h-4 w-4 text-neutral-500" />
                              Ver Expediente Completo
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              className="rounded-xl py-2 cursor-pointer gap-2 text-xs font-medium"
                              onClick={() => {
                                setQuickVehicleCustomer(customer);
                                setQuickVehForm(emptyVehicleForm);
                              }}
                            >
                              <Car className="h-4 w-4 text-neutral-500" />
                              Registrar Vehículo
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              className="rounded-xl py-2 cursor-pointer gap-2 text-xs font-medium"
                              onClick={() => openEdit(customer)}
                            >
                              <Edit className="h-4 w-4 text-neutral-500" />
                              Editar Datos
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="my-1 bg-neutral-100" />

                            <DropdownMenuItem
                              className="rounded-xl py-2 text-rose-600 focus:text-rose-600 cursor-pointer gap-2 text-xs font-medium"
                              onClick={() => handleDelete(customer.id, customer.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Eliminar Cliente
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Nuevo Cliente (Wizard de 2 pasos) */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl bg-white p-0 shadow-2xl border border-neutral-100 overflow-hidden">
          {/* Header con Stepper */}
          <div className="px-6 pt-6 pb-4 border-b border-neutral-100 bg-neutral-50/50">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase font-mono",
                  createStep === 1
                    ? "bg-neutral-900 text-white"
                    : "bg-emerald-100 text-emerald-800"
                )}
              >
                Paso {createStep} de 2
              </span>
              <span className="text-xs text-neutral-500">
                {createStep === 1 ? "Identidad y Datos Fiscales" : "Vehículo Inicial (Opcional)"}
              </span>
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight text-neutral-900 font-heading">
              {createStep === 1 ? "Registrar Nuevo Cliente" : "Asignar Vehículo Inicial"}
            </DialogTitle>
          </div>

          <form onSubmit={handleCreateCustomerAndVehicle} className="p-6 space-y-4">
            {createStep === 1 ? (
              <CustomerFormFields form={form} setForm={setForm} />
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/80 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                      Cliente Asignado
                    </p>
                    <p className="text-sm font-bold text-neutral-900 mt-0.5">{form.name}</p>
                    <p className="text-xs text-neutral-500">{form.phone}</p>
                  </div>
                  <span className="px-2 py-1 bg-white rounded-lg border border-neutral-200 text-xs font-medium text-neutral-700">
                    {form.type}
                  </span>
                </div>

                <VehicleFormFields form={vehForm} setForm={setVehForm} />
              </div>
            )}

            <DialogFooter className="gap-2 pt-4 border-t border-neutral-100 flex-col sm:flex-row">
              {createStep === 1 ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                    className="rounded-xl flex-1 cursor-pointer border-neutral-200 h-10 text-xs font-semibold"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-xl flex-1 bg-neutral-900 text-white hover:bg-neutral-800 cursor-pointer h-10 text-xs font-semibold"
                  >
                    Continuar al Vehículo
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateStep(1)}
                    className="rounded-xl cursor-pointer border-neutral-200 h-10 text-xs font-semibold"
                  >
                    Volver a Datos
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={skipVehicleRegistration}
                    className="rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 cursor-pointer h-10 text-xs font-semibold"
                  >
                    Omitir Vehículo
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-xl flex-1 bg-neutral-900 text-white hover:bg-neutral-800 cursor-pointer h-10 text-xs font-semibold"
                  >
                    Guardar Cliente y Vehículo
                  </Button>
                </>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal para Agregar Vehículo Rápido a Cliente Existente */}
      <Dialog
        open={Boolean(quickVehicleCustomer)}
        onOpenChange={(val) => !val && setQuickVehicleCustomer(null)}
      >
        <DialogContent className="sm:max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-neutral-100">
          <DialogHeader className="pb-3 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center">
                <Car className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-neutral-900">
                  Agregar Vehículo a {quickVehicleCustomer?.name}
                </DialogTitle>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Ingresa los datos del vehículo para agregarlo a su flota.
                </p>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleQuickAddVehicle} className="space-y-4 pt-3">
            <VehicleFormFields form={quickVehForm} setForm={setQuickVehForm} />

            <DialogFooter className="gap-2 pt-3 border-t border-neutral-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setQuickVehicleCustomer(null)}
                className="rounded-xl flex-1 cursor-pointer border-neutral-200 h-10 text-xs font-semibold"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="rounded-xl flex-1 bg-neutral-900 text-white hover:bg-neutral-800 cursor-pointer h-10 text-xs font-semibold"
              >
                Registrar Vehículo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Directorio General de Flota (Rediseño de Alta Gama) */}
      <Dialog open={isVehiclesModalOpen} onOpenChange={setIsVehiclesModalOpen}>
        <DialogContent className="sm:max-w-4xl rounded-3xl bg-white shadow-2xl border border-neutral-100 max-h-[85vh] flex flex-col p-0 overflow-hidden">
          {/* Header del Modal */}
          <div className="p-5 sm:p-6 pb-4 border-b border-neutral-100 flex-shrink-0 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Car className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-lg sm:text-xl font-bold text-neutral-900 font-heading">
                      Directorio General de Flota
                    </DialogTitle>
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                      {tenantVehicles.length} registrados
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Flota activa de tus clientes, odómetro e historial de servicio directo.
                  </p>
                </div>
              </div>
            </div>

            {/* Buscador ultra-nítido */}
            <div className="mt-4 relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                placeholder="Buscar por placa, marca, modelo o nombre del cliente..."
                className="rounded-xl border-neutral-200 bg-neutral-50/60 focus:bg-white pl-10 pr-9 h-10 w-full text-xs transition-all placeholder:text-neutral-400"
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
              />
              {vehicleSearch && (
                <button
                  type="button"
                  onClick={() => setVehicleSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5 rounded-md hover:bg-neutral-200/50"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Tabla de Vehículos */}
          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableHeader className="bg-neutral-50/80 sticky top-0 shadow-xs z-10 border-b border-neutral-200/70">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 py-3.5 pl-6">
                    Placa / Matrícula
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 py-3.5">
                    Vehículo & Especificaciones
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 py-3.5">
                    Propietario / Cliente
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 py-3.5">
                    Odómetro
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 py-3.5 text-right pr-6">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-44 text-center bg-white">
                      <div className="flex flex-col items-center justify-center gap-1.5 max-w-sm mx-auto">
                        <div className="h-10 w-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-400 mb-1">
                          <Car className="h-5 w-5" />
                        </div>
                        <p className="font-semibold text-neutral-800 text-xs">No se encontraron vehículos</p>
                        <p className="text-[11px] text-neutral-400">
                          {vehicleSearch
                            ? `Sin coincidencias para "${vehicleSearch}".`
                            : "Aún no hay vehículos registrados en la flota."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVehicles.map((v) => {
                    const cust = getCustomer(v.customerId);
                    const custInitials = cust?.name
                      ? cust.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                      : "CL";

                    return (
                      <TableRow
                        key={v.id}
                        className="group hover:bg-neutral-50/70 bg-white border-b border-neutral-100 transition-colors"
                      >
                        {/* 1. Placa estilo matrícula dominicana */}
                        <TableCell className="py-3.5 pl-6">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-neutral-100 border border-neutral-300 shadow-2xs">
                            <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest font-mono">
                              RD
                            </span>
                            <span className="font-mono text-xs sm:text-sm font-black text-neutral-900 tracking-wider">
                              {v.plate}
                            </span>
                          </div>
                        </TableCell>

                        {/* 2. Vehículo */}
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-800 flex-shrink-0 group-hover:bg-neutral-900 group-hover:text-white transition-colors">
                              <Car className="h-4.5 w-4.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-neutral-900 text-sm block">
                                {v.brand} {v.model}
                              </span>
                              <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-0.5">
                                <span className="font-mono font-medium">Año {v.year}</span>
                                {v.color && (
                                  <>
                                    <span>·</span>
                                    <span>{v.color}</span>
                                  </>
                                )}
                                {v.vin && (
                                  <>
                                    <span>·</span>
                                    <span className="font-mono text-[10px] text-neutral-400">VIN: {v.vin}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* 3. Propietario / Cliente */}
                        <TableCell className="py-3.5">
                          <button
                            type="button"
                            onClick={() => {
                              setIsVehiclesModalOpen(false);
                              router.push(`/${tenant}/customers/${v.customerId}`);
                            }}
                            className="flex items-center gap-2.5 text-left group/cust cursor-pointer"
                          >
                            <Avatar className="h-8 w-8 rounded-xl border border-neutral-200 bg-neutral-900 flex-shrink-0">
                              <AvatarFallback className="bg-neutral-900 text-white text-[11px] font-bold">
                                {custInitials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <span className="font-semibold text-xs text-neutral-900 group-hover/cust:text-black group-hover/cust:underline block truncate max-w-[150px]">
                                {cust?.name || "Desconocido"}
                              </span>
                              {cust?.phone && (
                                <span className="text-[11px] font-mono text-neutral-400 block">
                                  {cust.phone}
                                </span>
                              )}
                            </div>
                          </button>
                        </TableCell>

                        {/* 4. Odómetro */}
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-neutral-700">
                            <Gauge className="h-3.5 w-3.5 text-neutral-400 flex-shrink-0" />
                            <span>{v.km ? `${v.km.toLocaleString("es-DO")} km` : "Sin odómetro"}</span>
                          </div>
                        </TableCell>

                        {/* 5. Acciones */}
                        <TableCell className="py-3.5 pr-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => {
                                setIsVehiclesModalOpen(false);
                                router.push(`/${tenant}/orders?create=true&customerId=${v.customerId}&vehicleId=${v.id}`);
                              }}
                              className="rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 text-[11px] font-semibold h-8 px-2.5 gap-1 shadow-2xs cursor-pointer active:scale-[0.98]"
                            >
                              <Plus className="h-3 w-3" />
                              <span>Orden</span>
                            </Button>

                            <button
                              type="button"
                              onClick={() => {
                                setIsVehiclesModalOpen(false);
                                router.push(`/${tenant}/customers/${v.customerId}`);
                              }}
                              className="h-8 w-8 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900 flex items-center justify-center transition-all cursor-pointer"
                              title="Ver Expediente"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>

                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <button
                                    type="button"
                                    className="h-8 w-8 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900 flex items-center justify-center transition-all outline-none cursor-pointer"
                                  />
                                }
                              >
                                <MoreVertical className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-2xl border-neutral-200 p-1.5 shadow-xl w-36 z-[100]">
                                <DropdownMenuItem
                                  className="rounded-xl py-2 cursor-pointer gap-2 text-xs font-medium"
                                  onClick={() => {
                                    setIsVehiclesModalOpen(false);
                                    router.push(`/${tenant}/customers/${v.customerId}`);
                                  }}
                                >
                                  <ChevronRight className="h-4 w-4 text-neutral-500" /> Ver Cliente
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="my-1 bg-neutral-100" />
                                <DropdownMenuItem
                                  className="rounded-xl py-2 text-rose-600 focus:text-rose-600 cursor-pointer gap-2 text-xs font-medium"
                                  onClick={() => handleDeleteVehicle(v.id)}
                                >
                                  <Trash2 className="h-4 w-4" /> Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Cliente */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl bg-white p-6 shadow-2xl border border-neutral-100">
          <DialogHeader className="pb-3 border-b border-neutral-100">
            <DialogTitle className="text-xl font-bold text-neutral-900 font-heading">
              Editar Datos del Cliente
            </DialogTitle>
            <p className="text-xs text-neutral-500 mt-0.5">
              Actualiza la información general, contacto o datos fiscales.
            </p>
          </DialogHeader>

          <form onSubmit={handleEdit} className="space-y-4 pt-3">
            <CustomerFormFields form={form} setForm={setForm} />

            <DialogFooter className="gap-2 pt-3 border-t border-neutral-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                className="rounded-xl flex-1 cursor-pointer border-neutral-200 h-10 text-xs font-semibold"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="rounded-xl flex-1 bg-neutral-900 text-white hover:bg-neutral-800 cursor-pointer h-10 text-xs font-semibold"
              >
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Importación Masiva */}
      <BulkCustomerImportModal
        open={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        tenantId={tenantId}
      />
    </div>
  );
}
