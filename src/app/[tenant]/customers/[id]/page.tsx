"use client";

import { useState, useEffect, useMemo } from "react";
import { useStore, Vehicle } from "@/store/useStore";
import { useParams, useRouter } from "@/lib/next-compat";
import { supabaseAdmin } from "@/lib/supabase";
import {
  ArrowLeft, Car, Plus, Settings, Phone, Mail, MapPin,
  History, ShieldCheck, Wrench, Clock, Receipt, FileText,
  Building2, User as UserIcon, Check, Calendar, AlertCircle,
  MessageCircle, ExternalLink, MoreVertical, Trash2, Edit3,
  Gauge, DollarSign, Sparkles, Star, ChevronRight, Hash,
  CheckCircle2, CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LocalFileManager } from "@/components/ui/LocalFileManager";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type TabKey = "vehicles" | "history" | "invoices" | "documents";

const COLOR_PALETTE = [
  { name: "Blanco", bg: "bg-white", border: "border-neutral-300" },
  { name: "Negro", bg: "bg-neutral-900", border: "border-neutral-900" },
  { name: "Gris", bg: "bg-neutral-500", border: "border-neutral-500" },
  { name: "Plata", bg: "bg-neutral-300", border: "border-neutral-400" },
  { name: "Rojo", bg: "bg-red-500", border: "border-red-600" },
  { name: "Azul", bg: "bg-blue-600", border: "border-blue-700" },
  { name: "Verde", bg: "bg-emerald-600", border: "border-emerald-700" },
  { name: "Beige", bg: "bg-amber-100", border: "border-amber-300" },
  { name: "Otro", bg: "bg-neutral-200", border: "border-neutral-400" },
];

export default function CustomerDetailPage() {
  const { id, tenant } = useParams();
  const router = useRouter();
  const {
    customers,
    vehicles,
    orders,
    invoices,
    addVehicle,
    deleteVehicle,
    updateCustomer,
    deleteMaintenanceItem,
    maintenanceItems,
    tenants
  } = useStore();

  const currentTenant = tenants.find((t) => t.slug === tenant) ?? null;
  const tenantId = currentTenant?.id ?? "";

  const customer = customers.find(c => c.id === id && (!tenantId || c.tenantId === tenantId));
  const [supaVehicles, setSupaVehicles] = useState<any[]>([]);
  const storeCustomerVehicles = vehicles.filter(v => v.customerId === id && (!tenantId || v.tenantId === tenantId));

  // Merge: Supabase + store (Supabase tiene prioridad, evita duplicados por id)
  const customerVehicles = useMemo(() => {
    return [
      ...supaVehicles,
      ...storeCustomerVehicles.filter(v => !supaVehicles.some(sv => sv.id === v.id))
    ];
  }, [supaVehicles, storeCustomerVehicles]);

  const customerOrders = useMemo(() => {
    return orders
      .filter(o => o.customerId === id && (!tenantId || o.tenantId === tenantId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, id, tenantId]);

  const customerInvoices = useMemo(() => {
    return invoices
      .filter(i => i.customerId === id && (!tenantId || i.tenantId === tenantId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [invoices, id, tenantId]);

  // Métricas financieras calculadas
  const totalSpent = useMemo(() => {
    return customerOrders.reduce((s, o) => s + (o.total || 0), 0);
  }, [customerOrders]);

  const averageTicket = useMemo(() => {
    return customerOrders.length > 0 ? totalSpent / customerOrders.length : 0;
  }, [totalSpent, customerOrders]);

  const pendingInvoicesTotal = useMemo(() => {
    return customerInvoices
      .filter(i => i.status === "pending")
      .reduce((s, i) => s + (i.total || 0), 0);
  }, [customerInvoices]);

  // Cargar vehículos del cliente desde Supabase
  useEffect(() => {
    if (!id || !tenantId || tenantId === '1') return;
    supabaseAdmin
      .from("vehicles")
      .select("*")
      .eq("customer_id", id)
      .eq("tenant_id", tenantId)
      .then(({ data, error }) => {
        if (error) {
          console.error("[Vehicles] load error:", error);
          return;
        }
        if (data && data.length > 0) {
          const mapped = data.map((row: any) => ({
            id: row.id,
            tenantId: row.tenant_id,
            customerId: row.customer_id,
            brand: row.brand,
            model: row.model,
            year: row.year,
            plate: row.plate,
            color: row.color,
            km: row.km ?? 0,
          }));
          setSupaVehicles(mapped);
          mapped.forEach(v => {
            if (!vehicles.some(sv => sv.id === v.id)) addVehicle(v);
          });
        }
      });
  }, [id, tenantId]);

  // Estado de pestañas directas para garantizar active state negro primario sin interferencias
  const [activeTab, setActiveTab] = useState<TabKey>("vehicles");

  // Modales
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    email: "",
    rnc: "",
    type: "Persona" as "Persona" | "Empresa",
    address: "",
    notes: "",
  });

  const [vForm, setVForm] = useState({
    brand: "",
    model: "",
    year: new Date().getFullYear().toString(),
    plate: "",
    color: "Gris",
    km: "",
    kmUnit: "km" as "km" | "mi"
  });

  const handleOpenEditProfile = () => {
    if (!customer) return;
    setProfileForm({
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      rnc: customer.rnc || "",
      type: customer.type || (customer.rnc ? "Empresa" : "Persona"),
      address: customer.address || "",
      notes: customer.notes || "",
    });
    setEditProfileOpen(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    if (!profileForm.name.trim() || !profileForm.phone.trim()) {
      toast.error("El nombre y el teléfono son obligatorios");
      return;
    }
    updateCustomer(customer.id, {
      name: profileForm.name.trim(),
      phone: profileForm.phone.trim(),
      email: profileForm.email.trim() || undefined,
      rnc: profileForm.rnc.trim() || undefined,
      type: profileForm.type,
      taxReceiptType: profileForm.type === "Empresa" || profileForm.rnc.trim() ? "B01" : "B02",
      address: profileForm.address.trim() || undefined,
      notes: profileForm.notes.trim() || undefined,
    });
    toast.success("Perfil del cliente actualizado correctamente");
    setEditProfileOpen(false);
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vForm.brand || !vForm.model || !vForm.plate) {
      toast.error("Marca, modelo y placa son obligatorios");
      return;
    }
    const newVehicle: Vehicle = {
      id: crypto.randomUUID(),
      tenantId: tenantId,
      customerId: id as string,
      brand: vForm.brand.trim(),
      model: vForm.model.trim(),
      year: Number(vForm.year) || new Date().getFullYear(),
      plate: vForm.plate.trim().toUpperCase(),
      color: vForm.color,
      km: vForm.km ? (vForm.kmUnit === "mi" ? Math.round(Number(vForm.km) * 1.60934) : Number(vForm.km)) : 0,
      lastService: new Date().toISOString()
    };

    addVehicle(newVehicle);
    toast.success(`Vehículo ${vForm.brand} ${vForm.model} agregado a la flota`);
    setAddVehicleOpen(false);
    setVForm({
      brand: "",
      model: "",
      year: new Date().getFullYear().toString(),
      plate: "",
      color: "Gris",
      km: "",
      kmUnit: "km"
    });
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este vehículo de la flota?")) {
      deleteVehicle(vehicleId);
      const itemsToDelete = maintenanceItems.filter((item) => item.vehicleId === vehicleId);
      itemsToDelete.forEach((item) => deleteMaintenanceItem(item.id));
      toast.success("Vehículo eliminado de la flota");
    }
  };

  if (!customer) {
    return (
      <div className="p-16 text-center max-w-md mx-auto">
        <div className="h-14 w-14 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400 mx-auto mb-3">
          <UserIcon className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 font-heading">Cliente no encontrado</h2>
        <p className="text-xs text-neutral-500 mt-1">
          El cliente solicitado no existe en esta sucursal o ha sido eliminado.
        </p>
        <Button
          onClick={() => router.push(`/${tenant}/customers`)}
          variant="outline"
          className="mt-5 rounded-xl text-xs font-semibold"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Volver a Clientes
        </Button>
      </div>
    );
  }

  const initials = customer.name
    .split(" ")
    .map(n => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isCompany = customer.type === "Empresa" || (customer.rnc && customer.rnc.length >= 9);

  // Limpieza de teléfono para enlace directo de WhatsApp (RD format 809/829/849)
  const cleanPhone = customer.phone.replace(/\D/g, "");
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone.startsWith("1") ? cleanPhone : `1${cleanPhone}`}`
    : null;

  const tabsConfig = [
    {
      id: "vehicles" as TabKey,
      label: "Vehículos",
      icon: Car,
      count: customerVehicles.length,
    },
    {
      id: "history" as TabKey,
      label: "Historial de Servicios",
      icon: Wrench,
      count: customerOrders.length,
    },
    {
      id: "invoices" as TabKey,
      label: "Facturas",
      icon: Receipt,
      count: customerInvoices.length,
    },
    {
      id: "documents" as TabKey,
      label: "Documentos",
      icon: FileText,
      count: null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. HERO HEADER DE EXPEDIENTE */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          {/* Lado izquierdo: Breadcrumb + Nombre + Badges de estado */}
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => router.push(`/${tenant}/customers`)}
              className="h-10 w-10 rounded-2xl bg-neutral-100 hover:bg-neutral-200/70 text-neutral-600 hover:text-neutral-900 flex items-center justify-center transition-all cursor-pointer flex-shrink-0 active:scale-[0.96]"
              title="Volver al directorio de clientes"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  Expediente de Cliente
                </span>
                <span className="text-neutral-300">/</span>
                <span className="text-[11px] font-mono text-neutral-500">
                  ID: {customer.id.slice(0, 8)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
                  {customer.name}
                </h1>

                {isCompany ? (
                  <Badge
                    variant="outline"
                    className="text-xs font-semibold bg-amber-50 text-amber-800 border-amber-200/90 rounded-lg px-2.5 py-0.5 flex items-center gap-1.5"
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    Empresa (Crédito Fiscal)
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-xs font-medium bg-neutral-100 text-neutral-700 border-neutral-200 rounded-lg px-2.5 py-0.5 flex items-center gap-1.5"
                  >
                    <UserIcon className="h-3.5 w-3.5 text-neutral-500" />
                    Consumidor Final
                  </Badge>
                )}

                {customerOrders.length >= 3 && (
                  <Badge
                    variant="outline"
                    className="text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200/90 rounded-lg px-2.5 py-0.5 flex items-center gap-1"
                  >
                    <Star className="h-3 w-3 fill-emerald-600 text-emerald-600" />
                    Cliente Frecuente
                  </Badge>
                )}
              </div>

              <p className="text-xs text-neutral-500 mt-1 flex items-center gap-2">
                <span>Registrado el {new Date(customer.createdAt).toLocaleDateString("es-DO", { day: "2-digit", month: "long", year: "numeric" })}</span>
                <span>·</span>
                <span>{customerVehicles.length} {customerVehicles.length === 1 ? "vehículo en flota" : "vehículos en flota"}</span>
              </p>
            </div>
          </div>

          {/* Lado derecho: Acciones rápidas (WhatsApp, Editar, Nueva Orden) */}
          <div className="flex flex-wrap items-center gap-2 sm:self-end lg:self-center">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 h-10 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition-all active:scale-[0.98] shadow-2xs"
              >
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                <span>WhatsApp</span>
              </a>
            )}

            <Button
              variant="outline"
              onClick={handleOpenEditProfile}
              className="rounded-xl border-neutral-200/90 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold h-10 px-3.5 gap-1.5 active:scale-[0.98] shadow-2xs"
            >
              <Edit3 className="h-3.5 w-3.5 text-neutral-500" />
              <span>Editar Datos</span>
            </Button>

            <Button
              onClick={() => setAddVehicleOpen(true)}
              className="rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-semibold h-10 px-4 gap-1.5 active:scale-[0.98] shadow-sm cursor-pointer"
            >
              <Car className="h-4 w-4" />
              <span>+ Agregar Vehículo</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. GRID PRINCIPAL: Ficha de Perfil Lateral + Área de Contenido */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* COLUMNA IZQUIERDA: Tarjeta de Identidad y Contacto del Cliente */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border border-neutral-200/80 rounded-3xl shadow-2xs bg-white overflow-hidden">
            <CardContent className="p-5 sm:p-6 space-y-5">
              {/* Header de la Tarjeta */}
              <div className="flex items-center gap-3.5 pb-4 border-b border-neutral-100">
                <Avatar className="h-14 w-14 rounded-2xl border-2 border-white shadow-xs bg-neutral-900 flex-shrink-0 ring-2 ring-neutral-100">
                  <AvatarFallback className="bg-neutral-900 text-white text-base font-extrabold tracking-wide">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-bold text-neutral-900 text-base leading-tight truncate">
                    {customer.name}
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5 truncate">
                    {customer.email || "Sin correo registrado"}
                  </p>
                  {customer.rnc && (
                    <span className="inline-block mt-1 font-mono text-[11px] font-semibold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">
                      RNC: {customer.rnc}
                    </span>
                  )}
                </div>
              </div>

              {/* Canales de Contacto Directo */}
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50/70 border border-neutral-100">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center flex-shrink-0">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Teléfono</p>
                      <a href={`tel:${customer.phone}`} className="font-semibold text-neutral-900 hover:underline truncate block">
                        {customer.phone}
                      </a>
                    </div>
                  </div>
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 flex items-center justify-center transition-colors"
                      title="Enviar WhatsApp"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>

                {customer.email && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50/70 border border-neutral-100">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center flex-shrink-0">
                        <Mail className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Correo</p>
                        <a href={`mailto:${customer.email}`} className="font-semibold text-neutral-900 hover:underline truncate block max-w-[180px]">
                          {customer.email}
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {customer.address && (
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-neutral-50/70 border border-neutral-100">
                    <div className="h-8 w-8 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Dirección</p>
                      <p className="font-medium text-neutral-800 leading-snug">{customer.address}</p>
                    </div>
                  </div>
                )}

                {customer.notes && (
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900">Nota del Cliente</p>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">{customer.notes}</p>
                  </div>
                )}
              </div>

              {/* Bloque Financiero y de Rendimiento */}
              <div className="pt-2 border-t border-neutral-100">
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-3">
                  Resumen Comercial
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/70">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                      Total Facturado
                    </span>
                    <p className="text-base font-bold font-mono text-neutral-900 mt-0.5 tabular-nums">
                      RD$ {totalSpent.toLocaleString("es-DO")}
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/70">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                      Visitas / Órdenes
                    </span>
                    <p className="text-base font-bold font-mono text-neutral-900 mt-0.5">
                      {customerOrders.length}
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/70">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                      Ticket Promedio
                    </span>
                    <p className="text-base font-bold font-mono text-neutral-900 mt-0.5 tabular-nums">
                      RD$ {Math.round(averageTicket).toLocaleString("es-DO")}
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/70">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                      Flota Activa
                    </span>
                    <p className="text-base font-bold font-mono text-neutral-900 mt-0.5">
                      {customerVehicles.length} {customerVehicles.length === 1 ? "auto" : "autos"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Botón rápido para abrir nueva orden */}
              <Button
                onClick={() => router.push(`/${tenant}/orders`)}
                className="w-full rounded-2xl bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-semibold h-11 gap-2 shadow-sm cursor-pointer active:scale-[0.98]"
              >
                <Wrench className="h-4 w-4" />
                <span>+ Crear Orden para este Cliente</span>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* COLUMNA DERECHA: Pestañas con Pestaña Activa en Negro Primario */}
        <div className="lg:col-span-8 space-y-4">
          {/* BARRA DE PESTAÑAS (Con control directo y activo garantizado en negro) */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-neutral-100/90 border border-neutral-200/80 overflow-x-auto scrollbar-none">
            {tabsConfig.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs transition-all whitespace-nowrap cursor-pointer active:scale-[0.98]",
                    isActive
                      ? "bg-neutral-900 text-white font-semibold shadow-xs"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 font-medium"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-white" : "text-neutral-500")} />
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span
                      className={cn(
                        "text-[10px] font-mono px-2 py-0.5 rounded-full",
                        isActive ? "bg-white/20 text-white" : "bg-neutral-200 text-neutral-700"
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* CONTENIDO 1: VEHÍCULOS */}
          {activeTab === "vehicles" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-neutral-200/80">
                <div>
                  <h3 className="font-bold text-neutral-900 text-sm font-heading">
                    Flota Vehicular Vinculada
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Vehículos registrados para diagnóstico, historial y asignación de órdenes de trabajo.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setAddVehicleOpen(true)}
                  className="rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-semibold h-9 px-3.5 gap-1.5 shadow-xs cursor-pointer active:scale-[0.98]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Agregar Vehículo</span>
                </Button>
              </div>

              {customerVehicles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-neutral-200 rounded-3xl bg-white p-8">
                  <div className="h-14 w-14 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400 mb-3">
                    <Car className="h-7 w-7" />
                  </div>
                  <h4 className="font-bold text-neutral-900 text-base">Sin vehículos en la flota</h4>
                  <p className="text-xs text-neutral-500 max-w-sm mt-1">
                    Registra el primer vehículo de {customer.name} para asignarle mantenimientos y diagnósticos.
                  </p>
                  <Button
                    onClick={() => setAddVehicleOpen(true)}
                    className="mt-4 rounded-xl text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 h-9 px-4 gap-1.5 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Registrar Primer Vehículo
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {customerVehicles.map((vehicle) => {
                    const vehicleColorObj = COLOR_PALETTE.find(
                      c => c.name.toLowerCase() === (vehicle.color || "").toLowerCase()
                    );

                    return (
                      <div
                        key={vehicle.id}
                        className="rounded-3xl border border-neutral-200/90 bg-white p-5 shadow-2xs hover:shadow-xs hover:border-neutral-300 transition-all flex flex-col justify-between"
                      >
                        <div>
                          {/* Header de la tarjeta del auto con placa estilo dominicano */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            {/* Placa Metálica Estilo Dominicano */}
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-neutral-100 border border-neutral-300 shadow-2xs">
                              <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest font-mono">
                                RD
                              </span>
                              <span className="font-mono text-sm font-black text-neutral-900 tracking-wider">
                                {vehicle.plate}
                              </span>
                            </div>

                            {/* Badge de Estado y Menú de opciones */}
                            <div className="flex items-center gap-1">
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                <ShieldCheck className="h-3 w-3" />
                                Al día
                              </span>

                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  render={
                                    <button
                                      type="button"
                                      className="h-7 w-7 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-all outline-none cursor-pointer"
                                    />
                                  }
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-2xl border-neutral-200 p-1.5 shadow-xl w-36">
                                  <DropdownMenuItem
                                    className="rounded-xl py-2 cursor-pointer gap-2 text-xs font-medium"
                                    onClick={() => router.push(`/${tenant}/orders?search=${vehicle.plate}`)}
                                  >
                                    <Wrench className="h-3.5 w-3.5 text-neutral-500" /> Ver Órdenes
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="my-1 bg-neutral-100" />
                                  <DropdownMenuItem
                                    className="rounded-xl py-2 text-rose-600 focus:text-rose-600 cursor-pointer gap-2 text-xs font-medium"
                                    onClick={() => handleDeleteVehicle(vehicle.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" /> Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          {/* Marca y Modelo */}
                          <div className="mb-3">
                            <h4 className="font-heading font-extrabold text-lg text-neutral-900 leading-tight">
                              {vehicle.brand} {vehicle.model}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-neutral-500">
                              <span>Año {vehicle.year}</span>
                              <span>·</span>
                              <span className="flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    "h-2.5 w-2.5 rounded-full border",
                                    vehicleColorObj ? vehicleColorObj.bg : "bg-neutral-400",
                                    vehicleColorObj ? vehicleColorObj.border : "border-neutral-400"
                                  )}
                                />
                                {vehicle.color || "Color no esp."}
                              </span>
                              {vehicle.vin && (
                                <>
                                  <span>·</span>
                                  <span className="font-mono text-[11px] text-neutral-400 truncate max-w-[120px]">
                                    VIN: {vehicle.vin}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Kilometraje Actual */}
                          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 text-xs mb-4">
                            <Gauge className="h-4 w-4 text-neutral-500 flex-shrink-0" />
                            <span className="text-neutral-500 font-medium">Odómetro:</span>
                            <span className="font-mono font-bold text-neutral-900">
                              {vehicle.km ? `${vehicle.km.toLocaleString("es-DO")} km` : "Sin registrar"}
                            </span>
                          </div>
                        </div>

                        {/* Botones de Acción al pie de la tarjeta del vehículo */}
                        <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => router.push(`/${tenant}/orders?search=${vehicle.plate}`)}
                            className="text-xs font-semibold text-neutral-600 hover:text-black transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <span>Historial de órdenes</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>

                          <Button
                            size="sm"
                            onClick={() => router.push(`/${tenant}/orders?create=true&customer=${customer.id}&plate=${vehicle.plate}`)}
                            className="rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-semibold h-8 px-3 gap-1 shadow-2xs cursor-pointer active:scale-[0.98]"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Nueva Orden</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* CONTENIDO 2: HISTORIAL DE SERVICIOS */}
          {activeTab === "history" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-neutral-200/80">
                <div>
                  <h3 className="font-bold text-neutral-900 text-sm font-heading">
                    Historial de Reparaciones y Mantenimiento
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Cronología completa de órdenes ejecutadas para este cliente.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => router.push(`/${tenant}/orders`)}
                  className="rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-semibold h-9 px-3.5 gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Crear Orden</span>
                </Button>
              </div>

              {customerOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-neutral-200 rounded-3xl bg-white p-8">
                  <div className="h-14 w-14 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400 mb-3">
                    <History className="h-7 w-7" />
                  </div>
                  <h4 className="font-bold text-neutral-900 text-base">Sin órdenes registradas</h4>
                  <p className="text-xs text-neutral-500 max-w-sm mt-1">
                    Aún no se han generado órdenes de servicio para este cliente.
                  </p>
                  <Button
                    onClick={() => router.push(`/${tenant}/orders`)}
                    className="mt-4 rounded-xl text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 h-9 px-4 gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Abrir Primera Orden
                  </Button>
                </div>
              ) : (
                <div className="border border-neutral-200/80 rounded-3xl bg-white shadow-2xs overflow-hidden divide-y divide-neutral-100">
                  {customerOrders.map((order) => {
                    const isFinished = order.status === "finished" || order.status === "delivered";

                    return (
                      <div
                        key={order.id}
                        onClick={() => router.push(`/${tenant}/orders`)}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 hover:bg-neutral-50/70 transition-colors cursor-pointer gap-3"
                      >
                        <div className="flex items-start gap-3.5">
                          <div
                            className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-2xl flex-shrink-0 mt-0.5",
                              isFinished
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/90"
                                : "bg-neutral-100 text-neutral-700 border border-neutral-200"
                            )}
                          >
                            {isFinished ? (
                              <ShieldCheck className="h-5 w-5" />
                            ) : (
                              <Wrench className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-neutral-900 text-sm">
                                {order.description || "Mantenimiento General"}
                              </span>
                              <span className="font-mono text-[11px] text-neutral-400">
                                #{order.id.slice(0, 6).toUpperCase()}
                              </span>
                            </div>

                            <p className="text-xs text-neutral-500 flex flex-wrap items-center gap-2 mt-1">
                              <span className="flex items-center gap-1 text-neutral-400">
                                <Clock className="h-3 w-3" />
                                {new Date(order.createdAt).toLocaleDateString("es-DO", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                              {order.items && order.items.length > 0 && (
                                <>
                                  <span>·</span>
                                  <span>{order.items.length} {order.items.length === 1 ? "tarea" : "tareas"}</span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 flex-shrink-0 pl-13 sm:pl-0">
                          {order.total !== undefined && (
                            <span className="font-mono font-bold text-sm text-neutral-900">
                              RD$ {order.total.toLocaleString("es-DO")}
                            </span>
                          )}
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px] uppercase font-bold border-none px-2.5 py-0.5 rounded-full",
                              isFinished
                                ? "bg-emerald-100 text-emerald-800"
                                : order.status === "repairing"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-neutral-100 text-neutral-700"
                            )}
                          >
                            {order.status === "pending"
                              ? "Pendiente"
                              : order.status === "repairing"
                              ? "En Reparación"
                              : order.status === "finished"
                              ? "Finalizado"
                              : order.status === "delivered"
                              ? "Entregado"
                              : order.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* CONTENIDO 3: FACTURAS */}
          {activeTab === "invoices" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-neutral-200/80">
                <div>
                  <h3 className="font-bold text-neutral-900 text-sm font-heading">
                    Comprobantes y Facturación
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Historial de facturas comerciales y comprobantes fiscales generados.
                  </p>
                </div>
                {pendingInvoicesTotal > 0 && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                    Pendiente: RD$ {pendingInvoicesTotal.toLocaleString("es-DO")}
                  </span>
                )}
              </div>

              {customerInvoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-neutral-200 rounded-3xl bg-white p-8">
                  <div className="h-14 w-14 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400 mb-3">
                    <Receipt className="h-7 w-7" />
                  </div>
                  <h4 className="font-bold text-neutral-900 text-base">Sin facturas emitidas</h4>
                  <p className="text-xs text-neutral-500 max-w-sm mt-1">
                    No se han generado comprobantes fiscales o recibos para este cliente.
                  </p>
                </div>
              ) : (
                <div className="border border-neutral-200/80 rounded-3xl bg-white shadow-2xs overflow-hidden divide-y divide-neutral-100">
                  {customerInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 hover:bg-neutral-50/70 transition-colors gap-3"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 border border-blue-200/90 flex-shrink-0 mt-0.5">
                          <Receipt className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-neutral-900 text-sm">
                              Factura #{inv.id.slice(-6).toUpperCase()}
                            </span>
                            {inv.ncf && (
                              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-neutral-800">
                                {inv.ncf}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-neutral-400 flex items-center gap-1.5 mt-1">
                            <Clock className="h-3 w-3" />
                            {new Date(inv.createdAt).toLocaleDateString("es-DO", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                            <span>·</span>
                            <span>{inv.items.length} {inv.items.length === 1 ? "artículo" : "artículos"}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 flex-shrink-0 pl-13 sm:pl-0">
                        <p className="font-bold font-mono text-sm text-neutral-900">
                          RD$ {inv.total.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                        </p>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[9px] uppercase font-bold border-none px-2 py-0.5 rounded-full",
                            inv.status === "paid"
                              ? "bg-emerald-100 text-emerald-800"
                              : inv.status === "cancelled"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          )}
                        >
                          {inv.status === "paid" ? "Pagada" : inv.status === "cancelled" ? "Anulada" : "Pendiente"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CONTENIDO 4: DOCUMENTOS */}
          {activeTab === "documents" && (
            <div className="space-y-4">
              <LocalFileManager
                entityType="customer"
                entityId={customer.id}
                title={`Expediente y Archivos de ${customer.name}`}
              />
            </div>
          )}
        </div>
      </div>

      {/* MODAL: AGREGAR VEHÍCULO (REDISEÑADO COMPACTO) */}
      <Dialog open={addVehicleOpen} onOpenChange={setAddVehicleOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-neutral-100">
          <DialogHeader className="pb-3 border-b border-neutral-100">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center flex-shrink-0">
                <Car className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-neutral-900 font-heading">
                  Agregar Vehículo a {customer.name}
                </DialogTitle>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Registra un nuevo automóvil para diagnósticos y reparaciones.
                </p>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleAddVehicle} className="space-y-3.5 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-neutral-700">Marca *</Label>
                <Input
                  placeholder="Ej: Toyota"
                  className="h-9 rounded-xl border-neutral-200 text-xs"
                  value={vForm.brand}
                  onChange={e => setVForm({ ...vForm, brand: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-neutral-700">Modelo *</Label>
                <Input
                  placeholder="Ej: Rav4"
                  className="h-9 rounded-xl border-neutral-200 text-xs"
                  value={vForm.model}
                  onChange={e => setVForm({ ...vForm, model: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-neutral-700">Año de Fabricación *</Label>
                <Input
                  type="number"
                  placeholder="2018"
                  className="h-9 rounded-xl border-neutral-200 text-xs font-mono"
                  value={vForm.year}
                  onChange={e => setVForm({ ...vForm, year: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-neutral-700">Placa / Matrícula *</Label>
                <Input
                  placeholder="G123456"
                  className="h-9 rounded-xl border-neutral-200 uppercase font-mono font-bold text-xs tracking-wider"
                  value={vForm.plate}
                  onChange={e => setVForm({ ...vForm, plate: e.target.value.toUpperCase() })}
                  required
                />
              </div>
            </div>

            {/* Selector de Color en Chips Limpios y Compactos */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-neutral-700">Color del Vehículo</Label>
              <div className="flex flex-wrap gap-1">
                {COLOR_PALETTE.map(c => {
                  const isSelected = vForm.color.toLowerCase() === c.name.toLowerCase();
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setVForm({ ...vForm, color: c.name })}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer",
                        isSelected
                          ? "bg-neutral-900 text-white border-neutral-900 shadow-2xs"
                          : "border-neutral-200 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50"
                      )}
                    >
                      <span className={cn("h-2.5 w-2.5 rounded-full border", c.bg, c.border)} />
                      <span>{c.name}</span>
                      {isSelected && <Check className="h-3 w-3 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Kilometraje con Switch Km / Mi */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-neutral-700">Kilometraje Actual</Label>
              <div className="relative flex items-center">
                <Input
                  type="number"
                  placeholder="Ej: 654321"
                  className="h-9 rounded-xl border-neutral-200 pr-20 text-xs font-mono"
                  value={vForm.km}
                  onChange={e => setVForm({ ...vForm, km: e.target.value })}
                />
                <div className="absolute right-1 flex rounded-lg overflow-hidden border border-neutral-200 bg-neutral-50 text-[10px] font-bold p-0.5">
                  <button
                    type="button"
                    onClick={() => setVForm({ ...vForm, kmUnit: 'km' })}
                    className={cn(
                      "px-2 py-0.5 rounded-md transition-all cursor-pointer",
                      vForm.kmUnit === 'km' ? "bg-neutral-900 text-white" : "text-neutral-500 hover:bg-neutral-200"
                    )}
                  >
                    km
                  </button>
                  <button
                    type="button"
                    onClick={() => setVForm({ ...vForm, kmUnit: 'mi' })}
                    className={cn(
                      "px-2 py-0.5 rounded-md transition-all cursor-pointer",
                      vForm.kmUnit === 'mi' ? "bg-neutral-900 text-white" : "text-neutral-500 hover:bg-neutral-200"
                    )}
                  >
                    mi
                  </button>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-3 border-t border-neutral-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddVehicleOpen(false)}
                className="rounded-xl flex-1 border-neutral-200 h-9 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="rounded-xl flex-1 bg-neutral-900 text-white hover:bg-neutral-800 h-9 text-xs font-semibold cursor-pointer"
              >
                Guardar Vehículo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: EDITAR PERFIL (REDISEÑADO COMPACTO DE 2 COLUMNAS) */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-neutral-100">
          <DialogHeader className="pb-3 border-b border-neutral-100">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center flex-shrink-0">
                <Edit3 className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-neutral-900 font-heading">
                  Editar Datos del Cliente
                </DialogTitle>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Actualiza la información general, contacto y clasificación fiscal.
                </p>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-3.5 pt-2">
            {/* Selector de Tipo en segmented control compacto */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                Tipo de Cliente
              </Label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setProfileForm({ ...profileForm, type: "Persona" })}
                  className={cn(
                    "flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                    profileForm.type === "Persona"
                      ? "bg-neutral-900 text-white shadow-xs"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50"
                  )}
                >
                  <UserIcon className="h-3.5 w-3.5" />
                  Individual (Consumidor Final)
                </button>
                <button
                  type="button"
                  onClick={() => setProfileForm({ ...profileForm, type: "Empresa" })}
                  className={cn(
                    "flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                    profileForm.type === "Empresa"
                      ? "bg-neutral-900 text-white shadow-xs"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50"
                  )}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  Empresa (Crédito Fiscal)
                </button>
              </div>
            </div>

            {/* Campos en Grid de 2 Columnas Balanceado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Fila 1: Nombre y Teléfono */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-neutral-700">Nombre / Razón Social *</Label>
                <Input
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="h-9 rounded-xl border-neutral-200 text-xs"
                  placeholder="Ej: Yudit Ignacio"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-neutral-700">Teléfono *</Label>
                <Input
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="h-9 rounded-xl border-neutral-200 text-xs"
                  placeholder="809-000-0000"
                  required
                />
              </div>

              {/* Fila 2: Correo y RNC */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-neutral-700">Correo Electrónico</Label>
                <Input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="h-9 rounded-xl border-neutral-200 text-xs"
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-neutral-700">
                  {profileForm.type === "Empresa" ? "RNC (Obligatorio) *" : "RNC / Cédula (Opcional)"}
                </Label>
                <Input
                  value={profileForm.rnc}
                  onChange={(e) => setProfileForm({ ...profileForm, rnc: e.target.value })}
                  className="h-9 rounded-xl border-neutral-200 font-mono text-xs uppercase"
                  placeholder={profileForm.type === "Empresa" ? "Ej: 131123456" : "Ej: 001-0000000-0"}
                />
              </div>

              {/* Fila 3: Dirección y Notas */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-neutral-700">Dirección Física</Label>
                <Input
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  className="h-9 rounded-xl border-neutral-200 text-xs"
                  placeholder="Ej: Ciudad Juan Bosch"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-neutral-700">Notas Internas</Label>
                <Input
                  value={profileForm.notes}
                  onChange={(e) => setProfileForm({ ...profileForm, notes: e.target.value })}
                  className="h-9 rounded-xl border-neutral-200 text-xs"
                  placeholder="Ej: Cliente preferente"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-3 border-t border-neutral-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditProfileOpen(false)}
                className="rounded-xl flex-1 border-neutral-200 h-9 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="rounded-xl flex-1 bg-neutral-900 text-white hover:bg-neutral-800 h-9 text-xs font-semibold cursor-pointer shadow-xs"
              >
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
