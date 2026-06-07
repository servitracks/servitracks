"use client";

import { useState } from "react";
import { useStore, Service, Technician } from "@/store/useStore";
import { 
  Plus, Search, MoreVertical, Layers, Clock, 
  Trash2, Edit, Filter, ChevronRight, X, 
  UserCog, UserCheck, UserX, Phone, CalendarDays 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useParams } from "@/lib/next-compat";

const CATEGORIES = [
  "Todos", "Motor", "Frenos", "Neumáticos", "Suspensión", 
  "Transmisión", "Enfriamiento", "Aire Acondicionado", 
  "Sistema Eléctrico", "Otros"
];

const emptyService: Partial<Service> = {
  name: "",
  category: "Otros",
  price: 0,
  laborPrice: 0,
  duration: "1h",
  description: "",
};

const emptyTechnician: Partial<Technician> = {
  name: "",
  phone: "",
  status: "active",
  pagoNomina: 0,
  tipoPago: "porcentaje",
};

export default function ServicesPage() {
  const { tenant } = useParams();
  const { services, addService, updateService, deleteService, tenants, technicians, addTechnician, updateTechnician, deleteTechnician } = useStore();
  const currentTenant = tenants.find((t) => t.slug === tenant) ?? null;
  const tenantId = currentTenant?.id ?? "";
  
  // Services State
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todos");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState(emptyService);

  // Technicians State
  const [isTechsModalOpen, setIsTechsModalOpen] = useState(false);
  const [techSearch, setTechSearch] = useState("");
  const [techStatusFilter, setTechStatusFilter] = useState("all");
  const [isTechFormOpen, setIsTechFormOpen] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
  const [techForm, setTechForm] = useState(emptyTechnician);

  const filteredServices = services
    .filter((s) => !tenantId || s.tenantId === tenantId)
    .filter((s) => {
      const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                          s.category?.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === "Todos" || s.category === categoryFilter;
      return matchSearch && matchCategory;
    });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast.error("El nombre del servicio es obligatorio");
      return;
    }

    if (editingService) {
      updateService(editingService.id, form);
      toast.success("Servicio actualizado");
    } else {
      const newService: Service = {
        ...(form as Service),
        id: `s${Date.now()}`,
        tenantId: tenantId,
      };
      addService(newService);
      toast.success("Servicio agregado");
    }
    setIsModalOpen(false);
    setEditingService(null);
    setForm(emptyService);
  };

  const openEdit = (service: Service) => {
    setEditingService(service);
    setForm(service);
    setIsModalOpen(true);
  };

  const openCreate = () => {
    setEditingService(null);
    setForm(emptyService);
    setIsModalOpen(true);
  };

  // --- Technicians Logic ---
  const filteredTechnicians = (technicians || [])
    .filter((t) => !tenantId || t.tenantId === tenantId)
    .filter((t) => {
      const matchSearch = t.name.toLowerCase().includes(techSearch.toLowerCase()) ||
                          (t.phone && t.phone.toLowerCase().includes(techSearch.toLowerCase()));
      const matchStatus = techStatusFilter === "all" || t.status === techStatusFilter;
      return matchSearch && matchStatus;
    });

  const handleTechSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!techForm.name) {
      toast.error("El nombre del técnico es obligatorio");
      return;
    }

    if (editingTechnician) {
      updateTechnician(editingTechnician.id, techForm);
      toast.success("Técnico actualizado con éxito");
    } else {
      const newTechnician: Technician = {
        id: `tech-${Date.now()}`,
        tenantId: tenantId,
        name: techForm.name,
        phone: techForm.phone || undefined,
        status: (techForm.status as "active" | "inactive") || "active",
        pagoNomina: techForm.pagoNomina || 0,
        tipoPago: techForm.tipoPago || "porcentaje",
        createdAt: new Date().toISOString(),
      };
      addTechnician(newTechnician);
      toast.success(`Técnico ${techForm.name} registrado con éxito`);
    }
    setIsTechFormOpen(false);
    setEditingTechnician(null);
    setTechForm(emptyTechnician);
  };

  const openTechEdit = (tech: Technician) => {
    setEditingTechnician(tech);
    setTechForm(tech);
    setIsTechFormOpen(true);
  };

  const openTechCreate = () => {
    setEditingTechnician(null);
    setTechForm(emptyTechnician);
    setIsTechFormOpen(true);
  };

  const toggleTechStatus = (tech: Technician) => {
    const nextStatus = tech.status === "active" ? "inactive" : "active";
    updateTechnician(tech.id, { status: nextStatus });
    toast.success(`Técnico ${tech.name} ahora está ${nextStatus === "active" ? "Activo" : "Inactivo"}`);
  };

  const techActiveCount = (technicians || []).filter((t) => t.tenantId === tenantId && t.status === "active").length;
  const techInactiveCount = (technicians || []).filter((t) => t.tenantId === tenantId && t.status === "inactive").length;
  const techTotalCount = (technicians || []).filter((t) => t.tenantId === tenantId).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-neutral-900">Catálogo de Servicios</h1>
          <p className="text-neutral-500">Gestiona los servicios que ofrece tu taller y los técnicos.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button 
            variant="outline" 
            className="rounded-lg border-neutral-200 text-neutral-700 font-bold hover:bg-neutral-50 gap-2 shrink-0" 
            onClick={() => setIsTechsModalOpen(true)}
          >
            <UserCog className="h-4 w-4" /> Técnicos
          </Button>
          <Button className="rounded-lg bg-black text-white hover:bg-neutral-800 gap-2 shrink-0 font-bold" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nuevo Servicio
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input 
            placeholder="Buscar por nombre o categoría..." 
            className="rounded-full border-neutral-200 bg-white pl-10"
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v || "Todos")}>
          <SelectTrigger className="w-48 h-10 rounded-full border-neutral-200 bg-white">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-neutral-400" />
            <span className="text-sm">{categoryFilter}</span>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filteredServices.length === 0 ? (
          <div className="col-span-full py-20 text-center text-neutral-400">
            <Layers className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No se encontraron servicios</p>
          </div>
        ) : filteredServices.map((service) => (
          <Card key={service.id} className="group border-neutral-100 shadow-sm hover:shadow-md transition-all overflow-hidden border-l-4 border-l-neutral-900">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <Badge variant="outline" className="bg-neutral-50 text-[10px] font-bold border-neutral-200 uppercase tracking-wider">
                    {service.category}
                  </Badge>
                  <h3 className="font-bold text-neutral-900 leading-tight">{service.name}</h3>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs font-black text-neutral-900">RD$ {service.price.toLocaleString()}</span>
                    {service.laborPrice ? (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        Comisión: {service.laborPrice}%
                      </span>
                    ) : null}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 h-8 w-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-all">
                    <MoreVertical className="h-4 w-4 text-neutral-400" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl border-neutral-100">
                    <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => openEdit(service)}>
                      <Edit className="h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 cursor-pointer text-rose-600 focus:text-rose-600" 
                      onClick={() => { deleteService(service.id); toast.success("Servicio eliminado"); }}>
                      <Trash2 className="h-4 w-4" /> Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="mt-2 flex items-center justify-between border-t border-neutral-50 pt-2">
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <Clock className="h-3.5 w-3.5 text-neutral-400" />
                  <span>{service.duration || "—"}</span>
                </div>
                {service.description && (
                  <span className="text-[10px] text-neutral-400 line-clamp-1 italic max-w-[60%]">
                    {service.description}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingService ? "Editar Servicio" : "Nuevo Servicio"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nombre del Servicio *</Label>
              <Input 
                placeholder="Ej: Cambio de Aceite de Motor" 
                className="h-10 rounded-xl"
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Precio al Cliente (RD$) *</Label>
                <Input 
                  type="number"
                  placeholder="Ej: 1500" 
                  className="h-10 rounded-xl font-bold"
                  value={form.price || ""} 
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} 
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Comisión Técnico (%)</Label>
                <Input 
                  type="number"
                  placeholder="Ej: 25" 
                  className="h-10 rounded-xl text-blue-600 font-bold bg-blue-50/50"
                  value={form.laborPrice || ""} 
                  onChange={(e) => setForm({ ...form, laborPrice: Number(e.target.value) })} 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Categoría</Label>
                <Select 
                  value={form.category} 
                  onValueChange={(v) => setForm({ ...form, category: v || "" })}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {CATEGORIES.filter(c => c !== "Todos").map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Duración Est.</Label>
                <Input 
                  placeholder="Ej: 45min, 1h" 
                  className="h-10 rounded-xl"
                  value={form.duration} 
                  onChange={(e) => setForm({ ...form, duration: e.target.value })} 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Input 
                placeholder="Detalles adicionales del servicio..." 
                className="h-10 rounded-xl"
                value={form.description} 
                onChange={(e) => setForm({ ...form, description: e.target.value })} 
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" className="rounded-xl bg-black text-white hover:bg-neutral-800">
                Guardar Servicio
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- TECHNICIANS MODALS --- */}
      {/* 1. Directory Modal */}
      <Dialog open={isTechsModalOpen} onOpenChange={setIsTechsModalOpen}>
        <DialogContent className="sm:max-w-4xl rounded-2xl bg-neutral-50/50 p-0 shadow-2xl border-none max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="p-6 pb-4 bg-white border-b border-neutral-100 flex-shrink-0 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
                <UserCog className="h-6 w-6 text-neutral-950" />
                Directorio de Técnicos
              </DialogTitle>
            </div>
            <Button className="rounded-lg bg-black text-white hover:bg-neutral-800 gap-2 shrink-0 font-bold" onClick={openTechCreate}>
              <Plus className="h-4 w-4" /> Agregar Técnico
            </Button>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Total Técnicos", value: techTotalCount, color: "text-neutral-900", bg: "bg-neutral-100", icon: UserCog },
                { label: "Activos", value: techActiveCount, color: "text-emerald-700", bg: "bg-emerald-100", icon: UserCheck },
                { label: "Inactivos", value: techInactiveCount, color: "text-rose-700", bg: "bg-rose-100", icon: UserX },
              ].map((kpi) => (
                <Card key={kpi.label} className="border-neutral-200/60 shadow-sm overflow-hidden relative bg-white">
                  <div className={cn("absolute right-3 top-1/2 -translate-y-1/2 opacity-10", kpi.color)}>
                    <kpi.icon className="h-16 w-16" />
                  </div>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div>
                      <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">{kpi.label}</p>
                      <p className={cn("text-3xl font-black mt-1", kpi.color)}>{kpi.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <Input 
                  placeholder="Buscar por nombre o teléfono..." 
                  className="rounded-full border-neutral-200 bg-white pl-10 h-10"
                  value={techSearch} 
                  onChange={(e) => setTechSearch(e.target.value)} 
                />
              </div>
              <Select value={techStatusFilter} onValueChange={(val) => setTechStatusFilter(val || "all")}>
                <SelectTrigger className="w-48 h-10 rounded-full border-neutral-200 bg-white shrink-0">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-neutral-400" />
                  <span className="text-sm">
                    {techStatusFilter === "all" ? "Todos los estados" : techStatusFilter === "active" ? "Solo Activos" : "Solo Inactivos"}
                  </span>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="active">Solo Activos</SelectItem>
                  <SelectItem value="inactive">Solo Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Technicians Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTechnicians.length === 0 ? (
                <div className="col-span-full py-16 text-center text-neutral-400 bg-white rounded-2xl border border-neutral-100">
                  <UserCog className="h-12 w-12 mx-auto mb-3 opacity-25" />
                  <p className="text-sm font-medium">No se encontraron técnicos registrados</p>
                </div>
              ) : filteredTechnicians.map((tech) => (
                <Card key={tech.id} className={cn(
                  "group border-neutral-200/60 shadow-sm hover:shadow-md transition-all overflow-hidden border-l-4 bg-white",
                  tech.status === "active" ? "border-l-emerald-500" : "border-l-neutral-300 opacity-80"
                )}>
                  <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-neutral-900 text-lg leading-tight group-hover:text-black transition-colors">
                            {tech.name}
                          </h3>
                          <Badge 
                            onClick={() => toggleTechStatus(tech)}
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[9px] font-black uppercase border cursor-pointer select-none transition-all hover:scale-105 active:scale-95",
                              tech.status === "active" 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                : "bg-neutral-100 text-neutral-500 border-neutral-200"
                            )}
                          >
                            {tech.status === "active" ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>
                        <p className="text-xs text-neutral-400 flex items-center gap-1 font-mono mt-0.5">
                          ID: #{tech.id.slice(-6).toUpperCase()}
                        </p>
                      </div>

                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100" 
                          onClick={() => openTechEdit(tech)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100" 
                          onClick={() => toggleTechStatus(tech)}
                        >
                          {tech.status === "active" ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-full text-rose-400 hover:text-rose-700 hover:bg-rose-50" 
                          onClick={() => {
                            deleteTechnician(tech.id);
                            toast.success(`Técnico ${tech.name} eliminado`);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="border-t border-dashed border-neutral-100 pt-3 flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium">
                        <Phone className="h-3.5 w-3.5 text-neutral-400" />
                        <span>{tech.phone || "Sin teléfono registrado"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-neutral-400">
                        <CalendarDays className="h-3.5 w-3.5 text-neutral-400" />
                        <span>Registrado el {new Date(tech.createdAt).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. Create/Edit Technician Modal */}
      <Dialog open={isTechFormOpen} onOpenChange={setIsTechFormOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white border-none shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserCog className="h-5 w-5 text-neutral-800" />
              {editingTechnician ? "Editar Técnico" : "Nuevo Técnico"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTechSave} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nombre Completo *</Label>
              <Input 
                placeholder="Ej: Gregorio" 
                className="h-10 rounded-xl"
                value={techForm.name} 
                onChange={(e) => setTechForm({ ...techForm, name: e.target.value })} 
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono de Contacto</Label>
              <Input 
                placeholder="Ej: 809-555-0199" 
                className="h-10 rounded-xl"
                value={techForm.phone} 
                onChange={(e) => setTechForm({ ...techForm, phone: e.target.value })} 
              />
            </div>
            <div className="space-y-1.5">
              <Label>Estado de Disponibilidad</Label>
              <Select 
                value={techForm.status} 
                onValueChange={(v) => setTechForm({ ...techForm, status: v as "active" | "inactive" })}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="active">Activo (Disponible)</SelectItem>
                  <SelectItem value="inactive">Inactivo (No Disponible)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo de Pago *</Label>
                <Select 
                  value={techForm.tipoPago || "porcentaje"} 
                  onValueChange={(v) => setTechForm({ ...techForm, tipoPago: v as "porcentaje" | "fijo" })}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Tipo de Pago" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="porcentaje">Porcentaje (%)</SelectItem>
                    <SelectItem value="fijo">Monto Fijo ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Monto / Porcentaje *</Label>
                <Input 
                  type="number"
                  placeholder={techForm.tipoPago === 'fijo' ? "Ej: 500" : "Ej: 30"}
                  className="h-10 rounded-xl"
                  value={techForm.pagoNomina || ""} 
                  onChange={(e) => setTechForm({ ...techForm, pagoNomina: parseFloat(e.target.value) || 0 })} 
                />
              </div>
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsTechFormOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" className="rounded-xl bg-black text-white hover:bg-neutral-800 font-bold">
                {editingTechnician ? "Guardar Cambios" : "Registrar Técnico"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
