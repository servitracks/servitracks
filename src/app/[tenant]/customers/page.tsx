"use client";

import { useState } from "react";
import { useStore, Customer, Vehicle } from "@/store/useStore";
import {
  UserPlus, Search, MoreVertical, Car, Phone, Mail, Calendar,
  ChevronRight, Users, TrendingUp, Edit, Trash2, X, Tag, User as UserIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useParams, useRouter } from "@/lib/next-compat";

type CustomerForm = {
  name: string; phone: string; email: string;
  address: string; notes: string; birthday: string;
};
const emptyCustomerForm: CustomerForm = { name: "", phone: "", email: "", address: "", notes: "", birthday: "" };

type VehicleForm = {
  brand: string; model: string; year: string; plate: string; vin: string;
};
const emptyVehicleForm: VehicleForm = { brand: "", model: "", year: "", plate: "", vin: "" };

interface CustomerFormFieldsProps {
  form: CustomerForm;
  setForm: React.Dispatch<React.SetStateAction<CustomerForm>>;
}

function CustomerFormFields({ form, setForm }: CustomerFormFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2 space-y-1.5">
        <Label>Nombre Completo *</Label>
        <Input placeholder="Ej: Juan Pérez" className="h-10 rounded-xl border-neutral-200"
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Teléfono *</Label>
        <Input placeholder="809-000-0000" className="h-10 rounded-xl border-neutral-200"
          value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Correo Electrónico</Label>
        <Input type="email" placeholder="correo@ejemplo.com" className="h-10 rounded-xl border-neutral-200"
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <div className="col-span-2 space-y-1.5">
        <Label>Dirección</Label>
        <Input placeholder="Ej: Av. 27 de Febrero #123, Santo Domingo" className="h-10 rounded-xl border-neutral-200"
          value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Fecha de Cumpleaños</Label>
        <Input type="date" className="h-10 rounded-xl border-neutral-200"
          value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} />
      </div>
      <div className="col-span-2 space-y-1.5">
        <Label>Notas Internas</Label>
        <Input placeholder="Ej: Cliente VIP, prefiere llamadas por la tarde" className="h-10 rounded-xl border-neutral-200"
          value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
    </div>
  );
}

function VehicleFormFields({ form, setForm }: { form: VehicleForm, setForm: React.Dispatch<React.SetStateAction<VehicleForm>> }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label>Marca *</Label>
        <Input placeholder="Ej: Toyota" className="h-10 rounded-xl border-neutral-200"
          value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Modelo *</Label>
        <Input placeholder="Ej: Corolla" className="h-10 rounded-xl border-neutral-200"
          value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Año</Label>
        <Input placeholder="Ej: 2022" className="h-10 rounded-xl border-neutral-200"
          value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Placa *</Label>
        <Input placeholder="Ej: G123456" className="h-10 rounded-xl border-neutral-200 uppercase"
          value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })} />
      </div>
      <div className="col-span-2 space-y-1.5">
        <Label>VIN / Chasis (Opcional)</Label>
        <Input placeholder="Número de chasis" className="h-10 rounded-xl border-neutral-200 uppercase"
          value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value.toUpperCase() })} />
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const { tenant } = useParams();
  const router = useRouter();
  const { customers, vehicles, orders, addCustomer, updateCustomer, deleteCustomer, addVehicle, deleteVehicle, deleteMaintenanceItem, maintenanceItems, tenants } = useStore();
  const currentTenant = tenants.find((t) => t.slug === tenant) ?? null;
  const tenantId = currentTenant?.id ?? "";

  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isVehiclesModalOpen, setIsVehiclesModalOpen] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState("");
  
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyCustomerForm);
  const [vehForm, setVehForm] = useState<VehicleForm>(emptyVehicleForm);

  const tenantCustomers = customers.filter((c) => !tenantId || c.tenantId === tenantId);
  const tenantVehicles = vehicles.filter((v) => !tenantId || v.tenantId === tenantId);

  const filteredCustomers = tenantCustomers
    .filter(
      (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search) || (c.email || "").toLowerCase().includes(search.toLowerCase())
    );

  const getVehicleCount = (id: string) => tenantVehicles.filter((v) => v.customerId === id).length;
  const getOrderCount = (id: string) => orders.filter((o) => o.customerId === id && (!tenantId || o.tenantId === tenantId)).length;
  const getCustomerName = (id: string) => tenantCustomers.find(c => c.id === id)?.name || "Desconocido";

  const newThisMonth = tenantCustomers.filter((c) => {
    const d = new Date(c.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const handleCreateCustomerAndVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (createStep === 1) {
      if (!form.name || !form.phone) { toast.error("Nombre y teléfono son obligatorios"); return; }
      setCreateStep(2);
      return;
    }
    
    // Step 2 submit
    const newCustomerId = `c${Date.now()}`;
    const newCustomer: Customer = {
      id: newCustomerId,
      tenantId: tenantId,
      name: form.name,
      phone: form.phone,
      email: form.email || undefined,
      address: form.address || undefined,
      notes: form.notes || undefined,
      birthday: form.birthday || undefined,
      createdAt: new Date().toISOString(),
    };
    
    addCustomer(newCustomer);
    
    // Register vehicle if filled
    if (vehForm.brand || vehForm.model || vehForm.plate) {
      if (!vehForm.brand || !vehForm.model || !vehForm.plate) {
        toast.error("Para registrar un vehículo, completa la marca, modelo y placa.");
        return;
      }
      const newVehicle: Vehicle = {
        id: `v${Date.now()}`,
        tenantId: tenantId,
        customerId: newCustomerId,
        brand: vehForm.brand,
        model: vehForm.model,
        year: Number(vehForm.year) || new Date().getFullYear(),
        plate: vehForm.plate,
        vin: vehForm.vin,
        lastService: new Date().toISOString()
      };
      addVehicle(newVehicle);
      toast.success(`${form.name} y su vehículo registrado correctamente`);
    } else {
      toast.success(`${form.name} registrado correctamente (Sin vehículo)`);
    }

    setIsCreateOpen(false);
    setCreateStep(1);
    setForm(emptyCustomerForm);
    setVehForm(emptyVehicleForm);
  };

  const skipVehicleRegistration = () => {
    const newCustomerId = `c${Date.now()}`;
    addCustomer({
      id: newCustomerId,
      tenantId,
      name: form.name,
      phone: form.phone,
      email: form.email || undefined,
      address: form.address || undefined,
      notes: form.notes || undefined,
      birthday: form.birthday || undefined,
      createdAt: new Date().toISOString(),
    });
    toast.success(`${form.name} registrado correctamente (Sin vehículo)`);
    setIsCreateOpen(false);
    setCreateStep(1);
    setForm(emptyCustomerForm);
    setVehForm(emptyVehicleForm);
  };

  const openEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setForm({ name: customer.name, phone: customer.phone, email: customer.email || "", address: customer.address || "", notes: customer.notes || "", birthday: customer.birthday || "" });
    setIsEditOpen(true);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    updateCustomer(selectedCustomer.id, { name: form.name, phone: form.phone, email: form.email, address: form.address, notes: form.notes, birthday: form.birthday });
    toast.success("Cliente actualizado");
    setIsEditOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    deleteCustomer(id);
    toast.success(`${name} eliminado`);
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este vehículo y todo su historial de mantenimiento?")) {
      deleteVehicle(vehicleId);
      const itemsToDelete = maintenanceItems.filter(item => item.vehicleId === vehicleId);
      itemsToDelete.forEach(item => deleteMaintenanceItem(item.id));
      toast.success("Vehículo eliminado correctamente");
    }
  };

  const filteredVehicles = vehicles
    .filter((v) => !tenantId || v.tenantId === tenantId)
    .filter(v =>
      v.plate.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
      v.brand.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
      v.model.toLowerCase().includes(vehicleSearch.toLowerCase())
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-neutral-900">Clientes</h1>
          <p className="text-neutral-500">Directorio de clientes y gestión de flota vehicular.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-lg gap-2 cursor-pointer bg-white"
            onClick={() => setIsVehiclesModalOpen(true)}>
            <Car className="h-4 w-4 text-neutral-500" /> Vehículos
          </Button>
          <Button className="rounded-lg bg-black text-white hover:bg-neutral-800 gap-2 cursor-pointer"
            onClick={() => { setForm(emptyCustomerForm); setVehForm(emptyVehicleForm); setCreateStep(1); setIsCreateOpen(true); }}>
            <UserPlus className="h-4 w-4" /> Nuevo Cliente
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "Total Clientes", value: tenantCustomers.length, icon: Users, color: "text-neutral-700", bg: "bg-neutral-50" },
          { label: "Nuevos este mes", value: newThisMonth, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Vehículos Registrados", value: tenantVehicles.length, icon: Car, color: "text-blue-600", bg: "bg-blue-50" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-neutral-100 shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0", kpi.bg)}>
                <kpi.icon className={cn("h-5 w-5", kpi.color)} />
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-500">{kpi.label}</p>
                <p className="text-xl font-black text-neutral-900">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <Input placeholder="Buscar por nombre, teléfono o correo..."
          className="rounded-full border-neutral-200 bg-white pl-10"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-neutral-100 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-neutral-50/50">
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Vehículos</TableHead>
              <TableHead>Órdenes</TableHead>
              <TableHead>Registro</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-32 text-center text-neutral-400">No se encontraron clientes.</TableCell></TableRow>
            ) : filteredCustomers.map((customer) => (
              <TableRow key={customer.id} className="group hover:bg-neutral-50/50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 rounded-full border-2 border-neutral-100 flex-shrink-0">
                      <AvatarFallback className="bg-neutral-900 text-white text-xs font-bold">
                        {customer.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-neutral-900 text-sm">{customer.name}</p>
                      {customer.tags?.map((tag) => (
                        <Badge key={tag} className="text-[10px] bg-black text-white border-none rounded-full px-1.5 py-0">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-sm text-neutral-600"><Phone className="h-3 w-3" />{customer.phone}</div>
                    {customer.email && <div className="flex items-center gap-1.5 text-xs text-neutral-400"><Mail className="h-3 w-3" />{customer.email}</div>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-neutral-100 flex items-center justify-center"><Car className="h-3.5 w-3.5 text-neutral-600" /></div>
                    <span className="text-sm font-medium">{getVehicleCount(customer.id)}</span>
                  </div>
                </TableCell>
                <TableCell><span className="text-sm font-medium">{getOrderCount(customer.id)}</span></TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(customer.createdAt).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {/* Plain div-button to avoid a>button nesting */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => router.push(`/${tenant}/customers/${customer.id}`)}
                      onKeyDown={(e) => e.key === 'Enter' && router.push(`/${tenant}/customers/${customer.id}`)}
                      className="h-8 w-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-neutral-100 cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4 text-neutral-500" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" />}>
                        <MoreVertical className="h-4 w-4 text-neutral-400" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-neutral-100 p-2 shadow-lg w-44">
                        <DropdownMenuItem className="rounded-lg py-2 cursor-pointer gap-2" onClick={() => openEdit(customer)}>
                          <Edit className="h-4 w-4" /> Editar Perfil
                        </DropdownMenuItem>
                        <DropdownMenuItem className="rounded-lg py-2 cursor-pointer gap-2"
                          onClick={() => router.push(`/${tenant}/customers/${customer.id}`)}
                        >
                          <ChevronRight className="h-4 w-4" /> Ver Expediente
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="rounded-lg py-2 text-rose-600 focus:text-rose-600 cursor-pointer gap-2"
                          onClick={() => handleDelete(customer.id, customer.name)}>
                          <Trash2 className="h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog (2-Step Wizard) */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl bg-white p-6 shadow-2xl border-none">
          <DialogHeader className="pb-3 border-b border-neutral-100">
            <DialogTitle className="text-xl font-black text-neutral-900 tracking-tight">
              {createStep === 1 ? "1. Datos del Cliente" : "2. Datos del Vehículo"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleCreateCustomerAndVehicle} className="space-y-4 pt-2">
            {createStep === 1 ? (
              <CustomerFormFields form={form} setForm={setForm} />
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-neutral-50 rounded-xl mb-2 text-sm text-neutral-600 border border-neutral-100">
                  <p>Registrando vehículo para: <span className="font-bold text-neutral-900">{form.name}</span></p>
                </div>
                <VehicleFormFields form={vehForm} setForm={setVehForm} />
              </div>
            )}
            
            <DialogFooter className="gap-2 pt-3 border-t border-neutral-100">
              {createStep === 1 ? (
                <>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-xl flex-1 cursor-pointer">Cancelar</Button>
                  <Button type="submit" className="rounded-xl flex-1 bg-black text-white hover:bg-neutral-800 cursor-pointer border-none">Siguiente</Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="outline" onClick={() => setCreateStep(1)} className="rounded-xl cursor-pointer">Atrás</Button>
                  <Button type="button" variant="ghost" onClick={skipVehicleRegistration} className="rounded-xl text-neutral-500 cursor-pointer">Omitir</Button>
                  <Button type="submit" className="rounded-xl flex-1 bg-black text-white hover:bg-neutral-800 cursor-pointer border-none">Registrar Todo</Button>
                </>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Vehicles Management Modal */}
      <Dialog open={isVehiclesModalOpen} onOpenChange={setIsVehiclesModalOpen}>
        <DialogContent className="sm:max-w-4xl rounded-2xl bg-white shadow-2xl border-none max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-neutral-100 flex-shrink-0 bg-neutral-50/50">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
                  <Car className="h-6 w-6 text-neutral-500" /> Directorio de Vehículos
                </DialogTitle>
                <p className="text-neutral-500 mt-1 text-sm">Gestiona la flota vehicular de todos tus clientes.</p>
              </div>
            </div>
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input placeholder="Buscar por placa, marca o modelo..."
                className="rounded-xl border-neutral-200 bg-white pl-10 h-10 w-full"
                value={vehicleSearch} onChange={(e) => setVehicleSearch(e.target.value)} />
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto bg-neutral-50/20">
            <Table>
              <TableHeader className="bg-white sticky top-0 shadow-sm z-10">
                <TableRow>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Propietario</TableHead>
                  <TableHead>Año</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVehicles.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="h-32 text-center text-neutral-400 bg-white">No se encontraron vehículos.</TableCell></TableRow>
                ) : filteredVehicles.map((v) => (
                  <TableRow key={v.id} className="group hover:bg-neutral-50/50 bg-white cursor-default">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600 transition-colors group-hover:bg-black group-hover:text-white flex-shrink-0">
                          <Car className="h-5 w-5" />
                        </div>
                        <span className="font-bold text-neutral-900">{v.brand} {v.model}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-full font-mono border-neutral-200 bg-white px-3">{v.plate}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm font-medium text-neutral-700">
                        <div className="h-6 w-6 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0">
                          <UserIcon className="h-3 w-3 text-neutral-500" />
                        </div>
                        {getCustomerName(v.customerId)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-neutral-500">{v.year}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-all outline-none cursor-pointer">
                          <MoreVertical className="h-4 w-4 text-neutral-400" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border-neutral-100 p-2 shadow-lg w-32">
                          <DropdownMenuItem className="rounded-lg py-2 text-rose-600 focus:text-rose-600 cursor-pointer gap-2"
                            onClick={() => handleDeleteVehicle(v.id)}>
                            <Trash2 className="h-4 w-4" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader><DialogTitle className="text-xl font-bold">Editar Cliente</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 py-2">
            <CustomerFormFields form={form} setForm={setForm} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="rounded-xl">Cancelar</Button>
              <Button type="submit" className="rounded-xl bg-black text-white hover:bg-neutral-800">Guardar Cambios</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
