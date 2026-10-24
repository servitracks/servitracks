"use client";

import { useState, useMemo } from "react";
import type { Supplier, SupplierType, SupplierStatus, SupplierContact, Currency } from "@/store/types";
import { useStore } from "@/store/useStore";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Building2,
  Users,
  MapPin,
  CreditCard,
  FileText,
  Phone,
  Mail,
  MessageSquare,
  Globe,
  Percent,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SUPPLIER_TYPES: { value: SupplierType; label: string }[] = [
  { value: "repuestos", label: "Repuestos" },
  { value: "lubricantes", label: "Lubricantes" },
  { value: "neumaticos", label: "Neumáticos" },
  { value: "herramientas", label: "Herramientas" },
  { value: "servicios_externos", label: "Servicios Externos" },
];

const CURRENCIES: Currency[] = ["DOP", "USD", "EUR"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  editSupplier?: Supplier | null;
  onSuccess?: (supplierId: string) => void;
}

interface FormState {
  commercialName: string;
  legalName: string;
  rnc: string;
  type: SupplierType;
  status: SupplierStatus;
  country: string;
  province: string;
  city: string;
  address: string;
  googleMapsUrl: string;
  creditLimit: string;
  creditDays: string;
  generalDiscount: string;
  volumeDiscount: string;
  itbis: string;
  currency: Currency;
  notes: string;
  contacts: SupplierContact[];
}

const emptyForm: FormState = {
  commercialName: "",
  legalName: "",
  rnc: "",
  type: "repuestos",
  status: "activo",
  country: "República Dominicana",
  province: "",
  city: "",
  address: "",
  googleMapsUrl: "",
  creditLimit: "",
  creditDays: "30",
  generalDiscount: "",
  volumeDiscount: "",
  itbis: "18",
  currency: "DOP",
  notes: "",
  contacts: [{ name: "", role: "", phone: "", whatsapp: "", email: "" }],
};

export default function SupplierFormDialog({
  open,
  onOpenChange,
  tenantId,
  editSupplier,
  onSuccess,
}: Props) {
  const suppliers = useStore((s) => s.suppliers).filter((s) => s.tenantId === tenantId);
  const { addSupplier, updateSupplier } = useStore();
  const isEdit = !!editSupplier;

  const [activeTab, setActiveTab] = useState<"general" | "contacts" | "location" | "commercial">("general");

  const [form, setForm] = useState<FormState>(() => {
    if (editSupplier) {
      return {
        commercialName: editSupplier.commercialName,
        legalName: editSupplier.legalName || "",
        rnc: editSupplier.rnc || "",
        type: editSupplier.type,
        status: editSupplier.status,
        country: editSupplier.country || "República Dominicana",
        province: editSupplier.province || "",
        city: editSupplier.city || "",
        address: editSupplier.address || "",
        googleMapsUrl: editSupplier.googleMapsUrl || "",
        creditLimit: editSupplier.creditLimit ? String(editSupplier.creditLimit) : "",
        creditDays: editSupplier.creditDays ? String(editSupplier.creditDays) : "30",
        generalDiscount: editSupplier.generalDiscount ? String(editSupplier.generalDiscount) : "",
        volumeDiscount: editSupplier.volumeDiscount ? String(editSupplier.volumeDiscount) : "",
        itbis: editSupplier.itbis !== undefined ? String(editSupplier.itbis) : "18",
        currency: editSupplier.currency,
        notes: editSupplier.notes || "",
        contacts:
          editSupplier.contacts.length > 0
            ? editSupplier.contacts
            : [{ name: "", role: "", phone: "", whatsapp: "", email: "" }],
      };
    }
    return emptyForm;
  });

  const nextCodePreview = useMemo(() => {
    if (editSupplier) return editSupplier.code;
    const num = suppliers.length + 1;
    return `PROV-${String(num).padStart(3, "0")}`;
  }, [suppliers.length, editSupplier]);

  const addContact = () => {
    setForm((f) => ({
      ...f,
      contacts: [...f.contacts, { name: "", role: "", phone: "", whatsapp: "", email: "" }],
    }));
  };

  const removeContact = (i: number) => {
    setForm((f) => ({ ...f, contacts: f.contacts.filter((_, idx) => idx !== i) }));
  };

  const updateContact = (i: number, field: keyof SupplierContact, value: string) => {
    setForm((f) => ({
      ...f,
      contacts: f.contacts.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.commercialName.trim()) {
      setActiveTab("general");
      toast.error("El nombre comercial del proveedor es obligatorio");
      return;
    }

    const now = new Date().toISOString();
    const validContacts = form.contacts.filter((c) => c.name.trim());

    if (isEdit && editSupplier) {
      updateSupplier(editSupplier.id, {
        commercialName: form.commercialName.trim(),
        legalName: form.legalName.trim() || undefined,
        rnc: form.rnc.trim() || undefined,
        type: form.type,
        status: form.status,
        contacts: validContacts,
        country: form.country.trim() || undefined,
        province: form.province.trim() || undefined,
        city: form.city.trim() || undefined,
        address: form.address.trim() || undefined,
        googleMapsUrl: form.googleMapsUrl.trim() || undefined,
        creditLimit: Number(form.creditLimit) || undefined,
        creditDays: Number(form.creditDays) || undefined,
        generalDiscount: Number(form.generalDiscount) || undefined,
        volumeDiscount: Number(form.volumeDiscount) || undefined,
        itbis: form.itbis !== "" ? Number(form.itbis) : undefined,
        currency: form.currency,
        notes: form.notes.trim() || undefined,
      });
      toast.success(`Proveedor "${form.commercialName}" actualizado`);
      if (onSuccess) onSuccess(editSupplier.id);
    } else {
      const newSupplier: Supplier = {
        id: `sup_${Date.now()}`,
        tenantId,
        code: nextCodePreview,
        commercialName: form.commercialName.trim(),
        legalName: form.legalName.trim() || undefined,
        rnc: form.rnc.trim() || undefined,
        type: form.type,
        status: form.status,
        contacts: validContacts,
        country: form.country.trim() || undefined,
        province: form.province.trim() || undefined,
        city: form.city.trim() || undefined,
        address: form.address.trim() || undefined,
        googleMapsUrl: form.googleMapsUrl.trim() || undefined,
        creditLimit: Number(form.creditLimit) || undefined,
        creditDays: Number(form.creditDays) || undefined,
        generalDiscount: Number(form.generalDiscount) || undefined,
        volumeDiscount: Number(form.volumeDiscount) || undefined,
        itbis: form.itbis !== "" ? Number(form.itbis) : undefined,
        currency: form.currency,
        ratingDelivery: 5,
        ratingQuality: 5,
        ratingPrice: 4,
        ratingService: 5,
        notes: form.notes.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };
      addSupplier(newSupplier);
      toast.success(`Proveedor ${newSupplier.code} registrado correctamente`);
      if (onSuccess) onSuccess(newSupplier.id);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-3xl p-0 overflow-hidden border border-neutral-200/90 shadow-2xl bg-white flex flex-col max-h-[92vh]">
        {/* 1. Header Luminoso & Ejecutivo */}
        <div className="flex-shrink-0 border-b border-neutral-100 bg-neutral-50/70 p-5 sm:p-6 pr-12">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-neutral-900 text-white flex items-center justify-center font-bold shadow-xs ring-4 ring-neutral-100">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl font-black text-neutral-900 tracking-tight">
                  {isEdit ? "Editar Proveedor" : "Nuevo Proveedor"}
                </DialogTitle>
                <span className="font-mono text-xs font-bold text-neutral-600 bg-neutral-200/80 px-2 py-0.5 rounded-md">
                  {nextCodePreview}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Registra ficha comercial, contactos y condiciones de crédito con el taller.
              </p>
            </div>
          </div>
        </div>

        {/* 2. Barra de Navegación por Secciones (Pastillas) */}
        <div className="flex-shrink-0 px-5 sm:px-6 pt-3 pb-2 border-b border-neutral-100 bg-white">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {[
              { id: "general" as const, label: "Datos Generales", icon: Building2 },
              { id: "contacts" as const, label: `Contactos (${form.contacts.length})`, icon: Users },
              { id: "location" as const, label: "Ubicación", icon: MapPin },
              { id: "commercial" as const, label: "Condiciones Comerciales", icon: CreditCard },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer",
                    isActive
                      ? "bg-neutral-900 text-white shadow-xs"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                  )}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Formulario por Pestañas */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {/* SECCIÓN 1: DATOS GENERALES */}
            {activeTab === "general" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-700">Nombre Comercial *</Label>
                    <Input
                      placeholder="Ej: Auto Parts Dominicana"
                      className="h-9.5 rounded-xl text-xs bg-neutral-50/50 border-neutral-200 focus:bg-white"
                      value={form.commercialName}
                      onChange={(e) => setForm((f) => ({ ...f, commercialName: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-700">Razón Social</Label>
                    <Input
                      placeholder="Ej: Auto Partes del Caribe SRL"
                      className="h-9.5 rounded-xl text-xs bg-neutral-50/50 border-neutral-200 focus:bg-white"
                      value={form.legalName}
                      onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-700">RNC / Cédula Fiscal</Label>
                    <Input
                      placeholder="Ej: 131-00001-1"
                      className="h-9.5 rounded-xl text-xs font-mono font-bold bg-neutral-50/50 border-neutral-200 focus:bg-white"
                      value={form.rnc}
                      onChange={(e) => setForm((f) => ({ ...f, rnc: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-700">Tipo de Suministro *</Label>
                    <Select
                      value={form.type}
                      onValueChange={(v) => setForm((f) => ({ ...f, type: v as SupplierType }))}
                    >
                      <SelectTrigger className="h-9.5 rounded-xl text-xs bg-neutral-50/50 border-neutral-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-neutral-200 shadow-lg text-xs">
                        {SUPPLIER_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value} className="text-xs cursor-pointer">
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-700">Estado</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) => setForm((f) => ({ ...f, status: v as SupplierStatus }))}
                    >
                      <SelectTrigger className="h-9.5 rounded-xl text-xs bg-neutral-50/50 border-neutral-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-neutral-200 shadow-lg text-xs">
                        <SelectItem value="activo" className="text-xs cursor-pointer">Activo</SelectItem>
                        <SelectItem value="suspendido" className="text-xs cursor-pointer">Suspendido</SelectItem>
                        <SelectItem value="bloqueado" className="text-xs cursor-pointer">Bloqueado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-700">Moneda Habitual</Label>
                    <Select
                      value={form.currency}
                      onValueChange={(v) => setForm((f) => ({ ...f, currency: v as Currency }))}
                    >
                      <SelectTrigger className="h-9.5 rounded-xl text-xs font-mono font-bold bg-neutral-50/50 border-neutral-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-neutral-200 shadow-lg text-xs">
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c} value={c} className="text-xs cursor-pointer font-mono font-bold">
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <Label className="text-xs font-bold text-neutral-700">Notas / Observaciones</Label>
                  <textarea
                    rows={3}
                    placeholder="Condiciones especiales, horarios de despacho, etc..."
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50/50 p-3 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 transition-all placeholder:text-neutral-400 resize-none"
                  />
                </div>
              </div>
            )}

            {/* SECCIÓN 2: CONTACTOS */}
            {activeTab === "contacts" && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-neutral-500 font-medium">
                    Agrega los asesores comerciales y despachadores de este suplidor.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addContact}
                    className="rounded-xl text-xs font-semibold gap-1.5 h-8 px-3 border-neutral-200 hover:bg-neutral-100 shadow-2xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Agregar Contacto</span>
                  </Button>
                </div>

                <div className="space-y-3">
                  {form.contacts.map((contact, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-neutral-200/80 bg-neutral-50/50 p-3.5 space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-200/60">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-neutral-400" />
                          <span>Contacto #{i + 1}</span>
                        </span>
                        {form.contacts.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeContact(i)}
                            className="h-7 px-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-xs"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            <span>Eliminar</span>
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium text-neutral-600">Nombre Completo *</Label>
                          <Input
                            placeholder="Ej: Nicolás Gómez"
                            value={contact.name}
                            onChange={(e) => updateContact(i, "name", e.target.value)}
                            className="h-8.5 rounded-xl text-xs bg-white border-neutral-200"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium text-neutral-600">Cargo / Posición</Label>
                          <Input
                            placeholder="Ej: Vendedor de Repuestos"
                            value={contact.role}
                            onChange={(e) => updateContact(i, "role", e.target.value)}
                            className="h-8.5 rounded-xl text-xs bg-white border-neutral-200"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium text-neutral-600 flex items-center gap-1">
                            <Phone className="h-3 w-3 text-neutral-400" />
                            <span>Teléfono</span>
                          </Label>
                          <Input
                            placeholder="Ej: 809-555-0123"
                            value={contact.phone}
                            onChange={(e) => updateContact(i, "phone", e.target.value)}
                            className="h-8.5 rounded-xl text-xs font-mono bg-white border-neutral-200"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium text-neutral-600 flex items-center gap-1">
                            <MessageSquare className="h-3 w-3 text-emerald-600" />
                            <span>WhatsApp</span>
                          </Label>
                          <Input
                            placeholder="Ej: 809-555-0123"
                            value={contact.whatsapp || ""}
                            onChange={(e) => updateContact(i, "whatsapp", e.target.value)}
                            className="h-8.5 rounded-xl text-xs font-mono bg-white border-neutral-200"
                          />
                        </div>

                        <div className="col-span-1 sm:col-span-2 space-y-1">
                          <Label className="text-[11px] font-medium text-neutral-600 flex items-center gap-1">
                            <Mail className="h-3 w-3 text-neutral-400" />
                            <span>Correo Electrónico</span>
                          </Label>
                          <Input
                            type="email"
                            placeholder="nicolas@autoparts.com"
                            value={contact.email || ""}
                            onChange={(e) => updateContact(i, "email", e.target.value)}
                            className="h-8.5 rounded-xl text-xs bg-white border-neutral-200"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECCIÓN 3: UBICACIÓN */}
            {activeTab === "location" && (
              <div className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-700">País</Label>
                    <Input
                      placeholder="República Dominicana"
                      value={form.country}
                      onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                      className="h-9.5 rounded-xl text-xs bg-neutral-50/50 border-neutral-200 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-700">Provincia</Label>
                    <Input
                      placeholder="Ej: Santo Domingo"
                      value={form.province}
                      onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
                      className="h-9.5 rounded-xl text-xs bg-neutral-50/50 border-neutral-200 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-700">Ciudad</Label>
                    <Input
                      placeholder="Ej: Santo Domingo Este"
                      value={form.city}
                      onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                      className="h-9.5 rounded-xl text-xs bg-neutral-50/50 border-neutral-200 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-700">Dirección Física</Label>
                    <Input
                      placeholder="Ej: Av. 27 de Febrero #45, Ensanche La Fe"
                      value={form.address}
                      onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                      className="h-9.5 rounded-xl text-xs bg-neutral-50/50 border-neutral-200 focus:bg-white"
                    />
                  </div>

                  <div className="col-span-1 sm:col-span-2 space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-blue-600" />
                      <span>Enlace de Google Maps</span>
                    </Label>
                    <Input
                      placeholder="https://maps.google.com/?q=..."
                      value={form.googleMapsUrl}
                      onChange={(e) => setForm((f) => ({ ...f, googleMapsUrl: e.target.value }))}
                      className="h-9.5 rounded-xl text-xs bg-neutral-50/50 border-neutral-200 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECCIÓN 4: CONDICIONES COMERCIALES */}
            {activeTab === "commercial" && (
              <div className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-700">Límite de Crédito (RD$)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-neutral-400">
                        RD$
                      </span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={form.creditLimit}
                        onChange={(e) => setForm((f) => ({ ...f, creditLimit: e.target.value }))}
                        className="pl-11 h-9.5 rounded-xl text-xs font-mono font-bold bg-neutral-50/50 border-neutral-200 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-700">Días de Plazo de Crédito</Label>
                    <Input
                      type="number"
                      placeholder="30"
                      value={form.creditDays}
                      onChange={(e) => setForm((f) => ({ ...f, creditDays: e.target.value }))}
                      className="h-9.5 rounded-xl text-xs font-mono font-bold bg-neutral-50/50 border-neutral-200 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-700">Descuento General (%)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={form.generalDiscount}
                      onChange={(e) => setForm((f) => ({ ...f, generalDiscount: e.target.value }))}
                      className="h-9.5 rounded-xl text-xs font-mono font-bold bg-neutral-50/50 border-neutral-200 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-700">Descuento por Volumen (%)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={form.volumeDiscount}
                      onChange={(e) => setForm((f) => ({ ...f, volumeDiscount: e.target.value }))}
                      className="h-9.5 rounded-xl text-xs font-mono font-bold bg-neutral-50/50 border-neutral-200 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-bold text-neutral-700">Tasa de ITBIS Aplicable (%)</Label>
                    <Input
                      type="number"
                      placeholder="18"
                      value={form.itbis}
                      onChange={(e) => setForm((f) => ({ ...f, itbis: e.target.value }))}
                      className="h-9.5 rounded-xl text-xs font-mono font-bold bg-blue-50/40 text-blue-900 border-blue-200 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. Footer Ejecutivo */}
          <div className="flex-shrink-0 border-t border-neutral-200/80 bg-neutral-50/80 px-5 sm:px-6 py-3.5 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs font-semibold h-9 px-4 border-neutral-200 bg-white hover:bg-neutral-100"
            >
              Cancelar
            </Button>

            <div className="flex items-center gap-2">
              {activeTab !== "commercial" ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (activeTab === "general") setActiveTab("contacts");
                    else if (activeTab === "contacts") setActiveTab("location");
                    else if (activeTab === "location") setActiveTab("commercial");
                  }}
                  className="rounded-xl bg-neutral-100 text-neutral-800 hover:bg-neutral-200 text-xs font-semibold h-9 px-3.5 gap-1.5 border border-neutral-200 shadow-2xs"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              ) : null}

              <Button
                type="submit"
                size="sm"
                className="rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-semibold h-9 px-4.5 cursor-pointer shadow-xs active:scale-[0.98] transition-all"
              >
                {isEdit ? "Guardar Cambios" : "Crear Proveedor"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
