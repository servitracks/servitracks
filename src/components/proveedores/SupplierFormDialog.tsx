"use client";

import { useState, useMemo } from "react";
import type { Supplier, SupplierType, SupplierStatus, SupplierContact, Currency } from "@/store/types";
import { useStore } from "@/store/useStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
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
  commercialName: "", legalName: "", rnc: "",
  type: "repuestos", status: "activo",
  country: "República Dominicana", province: "", city: "", address: "", googleMapsUrl: "",
  creditLimit: "", creditDays: "30", generalDiscount: "", volumeDiscount: "",
  itbis: "18",
  currency: "DOP", notes: "",
  contacts: [{ name: "", role: "", phone: "", whatsapp: "", email: "" }],
};

export default function SupplierFormDialog({ open, onOpenChange, tenantId, editSupplier, onSuccess }: Props) {
  const suppliers = useStore((s) => s.suppliers).filter((s) => s.tenantId === tenantId);
  const { addSupplier, updateSupplier } = useStore();
  const isEdit = !!editSupplier;

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
        contacts: editSupplier.contacts.length > 0 ? editSupplier.contacts : [{ name: "", role: "", phone: "", whatsapp: "", email: "" }],
      };
    }
    return emptyForm;
  });

  const generateCode = () => {
    const num = suppliers.length + 1;
    return `PROV-${String(num).padStart(3, "0")}`;
  };

  const addContact = () => {
    setForm((f) => ({ ...f, contacts: [...f.contacts, { name: "", role: "", phone: "", whatsapp: "", email: "" }] }));
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
      toast.error("El nombre comercial es obligatorio");
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
      toast.success("Proveedor actualizado");
      if (onSuccess) onSuccess(editSupplier.id);
    } else {
      const newSupplier: Supplier = {
        id: `sup_${Date.now()}`,
        tenantId,
        code: generateCode(),
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
      toast.success(`Proveedor ${newSupplier.code} creado`);
      if (onSuccess) onSuccess(newSupplier.id);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{isEdit ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* Basic Info */}
          <div>
            <p className="text-xs font-black uppercase text-neutral-400 tracking-wider mb-3">Información General</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nombre Comercial *</Label>
                <Input placeholder="Ej: Auto Parts SRL" className="h-10 rounded-xl border-neutral-200"
                  value={form.commercialName} onChange={(e) => setForm((f) => ({ ...f, commercialName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Razón Social</Label>
                <Input placeholder="Ej: Auto Partes del Caribe SRL" className="h-10 rounded-xl border-neutral-200"
                  value={form.legalName} onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>RNC / ID Fiscal</Label>
                <Input placeholder="Ej: 131-00001-1" className="h-10 rounded-xl border-neutral-200"
                  value={form.rnc} onChange={(e) => setForm((f) => ({ ...f, rnc: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de Proveedor *</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as SupplierType }))}>
                  <SelectTrigger className="h-10 rounded-xl border-neutral-200"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {SUPPLIER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as SupplierStatus }))}>
                  <SelectTrigger className="h-10 rounded-xl border-neutral-200"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="suspendido">Suspendido</SelectItem>
                    <SelectItem value="bloqueado">Bloqueado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Moneda</Label>
                <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v as Currency }))}>
                  <SelectTrigger className="h-10 rounded-xl border-neutral-200"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Contacts */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black uppercase text-neutral-400 tracking-wider">Contactos</p>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addContact}>
                <Plus className="h-3 w-3" /> Agregar
              </Button>
            </div>
            <div className="space-y-3">
              {form.contacts.map((contact, i) => (
                <div key={i} className="grid grid-cols-6 gap-2 items-end p-3 rounded-xl bg-neutral-50/80 border border-neutral-100">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Nombre</Label>
                    <Input className="h-8 rounded-lg border-neutral-200 text-xs" placeholder="Nombre"
                      value={contact.name} onChange={(e) => updateContact(i, "name", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Cargo</Label>
                    <Input className="h-8 rounded-lg border-neutral-200 text-xs" placeholder="Cargo"
                      value={contact.role} onChange={(e) => updateContact(i, "role", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Teléfono</Label>
                    <Input className="h-8 rounded-lg border-neutral-200 text-xs" placeholder="Tel"
                      value={contact.phone} onChange={(e) => updateContact(i, "phone", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">WhatsApp</Label>
                    <Input className="h-8 rounded-lg border-neutral-200 text-xs" placeholder="WhatsApp"
                      value={contact.whatsapp || ""} onChange={(e) => updateContact(i, "whatsapp", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Correo</Label>
                    <Input className="h-8 rounded-lg border-neutral-200 text-xs" placeholder="Email"
                      value={contact.email || ""} onChange={(e) => updateContact(i, "email", e.target.value)} />
                  </div>
                  <div className="flex justify-end">
                    {form.contacts.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50" onClick={() => removeContact(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <p className="text-xs font-black uppercase text-neutral-400 tracking-wider mb-3">Ubicación</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>País</Label>
                <Input className="h-10 rounded-xl border-neutral-200" value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Provincia</Label>
                <Input placeholder="Ej: Santo Domingo" className="h-10 rounded-xl border-neutral-200" value={form.province}
                  onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Ciudad</Label>
                <Input placeholder="Ej: Santiago" className="h-10 rounded-xl border-neutral-200" value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Dirección</Label>
                <Input placeholder="Ej: Av. 27 de Febrero #45" className="h-10 rounded-xl border-neutral-200" value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Google Maps URL</Label>
                <Input placeholder="https://maps.google.com/..." className="h-10 rounded-xl border-neutral-200" value={form.googleMapsUrl}
                  onChange={(e) => setForm((f) => ({ ...f, googleMapsUrl: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Commercial */}
          <div>
            <p className="text-xs font-black uppercase text-neutral-400 tracking-wider mb-3">Condiciones Comerciales</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Límite de Crédito (RD$)</Label>
                <Input type="number" placeholder="0" className="h-10 rounded-xl border-neutral-200" value={form.creditLimit}
                  onChange={(e) => setForm((f) => ({ ...f, creditLimit: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Días de Crédito</Label>
                <Input type="number" placeholder="30" className="h-10 rounded-xl border-neutral-200" value={form.creditDays}
                  onChange={(e) => setForm((f) => ({ ...f, creditDays: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Descuento General (%)</Label>
                <Input type="number" placeholder="0" className="h-10 rounded-xl border-neutral-200" value={form.generalDiscount}
                  onChange={(e) => setForm((f) => ({ ...f, generalDiscount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Descuento por Volumen (%)</Label>
                <Input type="number" placeholder="0" className="h-10 rounded-xl border-neutral-200" value={form.volumeDiscount}
                  onChange={(e) => setForm((f) => ({ ...f, volumeDiscount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>ITBIS (%)</Label>
                <Input type="number" placeholder="18" className="h-10 rounded-xl border-neutral-200 text-blue-600 font-bold bg-blue-50/50" value={form.itbis}
                  onChange={(e) => setForm((f) => ({ ...f, itbis: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notas</Label>
            <textarea className="w-full min-h-[60px] rounded-xl border border-neutral-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
              placeholder="Observaciones adicionales..."
              value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
            <Button type="submit" className="rounded-xl bg-black text-white hover:bg-neutral-800">
              {isEdit ? "Guardar Cambios" : "Crear Proveedor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
