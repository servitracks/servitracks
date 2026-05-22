"use client";

import { useState } from "react";
import { useStore } from "@/store/useStore";
import { useParams, useRouter } from "@/lib/next-compat";
import {
  ArrowLeft, Car, Plus, Settings, Phone, Mail, MapPin,
  History, ShieldCheck, Wrench, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const COLORS = ["Blanco", "Negro", "Gris", "Rojo", "Azul", "Verde", "Plata", "Beige", "Otro"];

export default function CustomerDetailPage() {
  const { id, tenant } = useParams();
  const router = useRouter();
  const { customers, vehicles, orders, addVehicle, tenants } = useStore();
  const currentTenant = tenants.find((t) => t.slug === tenant) || tenants[0];
  const tenantId = currentTenant?.id || "1";

  const customer = customers.find(c => c.id === id);
  const customerVehicles = vehicles.filter(v => v.customerId === id);
  const customerOrders = orders.filter(o => o.customerId === id);
  const totalSpent = customerOrders.reduce((s, o) => s + (o.total || 0), 0);

  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const [vForm, setVForm] = useState({ brand: "", model: "", year: "", plate: "", color: "Blanco", km: "", kmUnit: "km" as "km" | "mi" });

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vForm.brand || !vForm.model || !vForm.plate) {
      toast.error("Marca, modelo y placa son obligatorios");
      return;
    }
    addVehicle({
      id: `v${Date.now()}`,
      tenantId: tenantId,
      customerId: id as string,
      brand: vForm.brand,
      model: vForm.model,
      year: Number(vForm.year) || new Date().getFullYear(),
      plate: vForm.plate.toUpperCase(),
      color: vForm.color,
      km: vForm.km ? (vForm.kmUnit === "mi" ? Math.round(Number(vForm.km) * 1.60934) : Number(vForm.km)) : 0,
    });
    toast.success(`${vForm.brand} ${vForm.model} agregado`);
    setAddVehicleOpen(false);
    setVForm({ brand: "", model: "", year: "", plate: "", color: "Blanco", km: "", kmUnit: "km" });
  };

  if (!customer) {
    return <div className="p-8 text-center text-neutral-400">Cliente no encontrado</div>;
  }

  const initials = customer.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-full hover:bg-neutral-100 h-9 w-9" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Expediente de Cliente</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Compact Profile Card */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="border-neutral-100 shadow-sm">
            <CardContent className="p-5">
              {/* Avatar + name row */}
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-12 w-12 border-2 border-neutral-100 flex-shrink-0">
                  <AvatarFallback className="bg-neutral-900 text-white text-sm font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-bold text-neutral-900 truncate">{customer.name}</p>
                  <Badge variant="secondary" className="mt-0.5 rounded-full bg-emerald-50 text-emerald-600 border-none text-[10px]">
                    Cliente VIP
                  </Badge>
                </div>
              </div>

              {/* Contact info */}
              <div className="space-y-2 text-sm">
                {[
                  { icon: Phone, val: customer.phone },
                  { icon: Mail, val: customer.email || "—" },
                  { icon: MapPin, val: "Santo Domingo, RD" },
                ].map(({ icon: Icon, val }) => (
                  <div key={val} className="flex items-center gap-2 text-neutral-600">
                    <Icon className="h-3.5 w-3.5 text-neutral-400 flex-shrink-0" />
                    <span className="truncate text-xs">{val}</span>
                  </div>
                ))}
              </div>

              <Button variant="outline" size="sm" className="mt-4 w-full rounded-lg text-xs border-neutral-100 hover:bg-neutral-50">
                <Settings className="mr-1.5 h-3 w-3" /> Editar Perfil
              </Button>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card className="border-neutral-100 shadow-sm">
            <CardContent className="p-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="text-[10px] text-neutral-500 font-medium">Visitas</p>
                <p className="text-lg font-black text-neutral-900">{customerOrders.length}</p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="text-[10px] text-neutral-500 font-medium">Gastado</p>
                <p className="text-sm font-black text-neutral-900">
                  {totalSpent > 0 ? `RD$ ${(totalSpent / 1000).toFixed(0)}k` : "—"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Tabs */}
        <div className="lg:col-span-9">
          <Tabs defaultValue="vehicles" className="space-y-4">
            <TabsList className="inline-flex h-10 items-center rounded-xl bg-neutral-100 p-1 text-neutral-500">
              <TabsTrigger value="vehicles" className="rounded-lg px-5 py-1.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-neutral-900 data-[state=active]:shadow-sm transition-all">
                Vehículos
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-lg px-5 py-1.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-neutral-900 data-[state=active]:shadow-sm transition-all">
                Historial de Servicios
              </TabsTrigger>
            </TabsList>

            {/* VEHÍCULOS */}
            <TabsContent value="vehicles" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-neutral-900">Flota Registrada
                  <span className="ml-2 text-xs font-normal text-neutral-400">({customerVehicles.length})</span>
                </h3>
                <Button size="sm" className="rounded-lg bg-black text-white hover:bg-neutral-800 gap-1.5 text-xs"
                  onClick={() => setAddVehicleOpen(true)}>
                  <Plus className="h-3.5 w-3.5" /> Agregar Vehículo
                </Button>
              </div>

              {customerVehicles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-neutral-200 rounded-2xl">
                  <Car className="h-10 w-10 text-neutral-300 mb-3" />
                  <p className="text-sm font-medium text-neutral-500">Sin vehículos registrados</p>
                  <Button size="sm" variant="outline" className="mt-4 rounded-lg text-xs"
                    onClick={() => setAddVehicleOpen(true)}>
                    <Plus className="h-3 w-3 mr-1" /> Agregar primero
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {customerVehicles.map((vehicle) => (
                    <Card key={vehicle.id} className="border-neutral-100 shadow-sm group hover:border-neutral-300 hover:shadow-md transition-all cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white">
                            <Car className="h-5 w-5" />
                          </div>
                          <Badge variant="outline" className="rounded-full font-mono text-[10px] border-neutral-200">
                            {vehicle.plate}
                          </Badge>
                        </div>
                        <h4 className="font-bold text-neutral-900 text-sm">{vehicle.brand} {vehicle.model}</h4>
                        <p className="text-xs text-neutral-500 mt-0.5">{vehicle.year} · {vehicle.color}</p>
                        {vehicle.km !== undefined && vehicle.km > 0 && (
                          <p className="text-xs text-neutral-400 mt-1">{vehicle.km.toLocaleString("es-DO")} km</p>
                        )}
                        <div className="mt-3 flex items-center justify-between pt-3 border-t border-neutral-50">
                          <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" /> Al día
                          </span>
                          <button className="text-[10px] font-bold text-neutral-400 group-hover:text-black transition-colors">
                            Ver detalles →
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* HISTORIAL */}
            <TabsContent value="history" className="space-y-4">
              {customerOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-neutral-200 rounded-2xl">
                  <History className="h-10 w-10 text-neutral-300 mb-3" />
                  <p className="text-sm font-medium text-neutral-500">Sin historial de servicios</p>
                </div>
              ) : (
                <Card className="border-neutral-100 shadow-sm overflow-hidden">
                  <CardContent className="p-0">
                    <div className="divide-y divide-neutral-50">
                      {customerOrders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-4 hover:bg-neutral-50/50 transition-all">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-full flex-shrink-0",
                              order.status === "finished" || order.status === "delivered" ? "bg-emerald-50" : "bg-neutral-50"
                            )}>
                              {order.status === "finished" || order.status === "delivered"
                                ? <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                : <Wrench className="h-4 w-4 text-neutral-400" />
                              }
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-neutral-900">{order.description}</p>
                              <p className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5">
                                <Clock className="h-3 w-3" />
                                {new Date(order.createdAt).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <Badge variant="secondary" className={cn(
                              "text-[10px] uppercase font-bold border-none",
                              order.status === "finished" || order.status === "delivered"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-neutral-100 text-neutral-600"
                            )}>
                              {order.status === "pending" ? "Pendiente" : order.status === "repairing" ? "En Reparación"
                                : order.status === "finished" ? "Finalizado" : order.status === "delivered" ? "Entregado" : order.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Add Vehicle Dialog */}
      <Dialog open={addVehicleOpen} onOpenChange={setAddVehicleOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Agregar Vehículo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddVehicle} className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Marca *</Label>
                <Input placeholder="Ej: Toyota" className="h-10 rounded-xl border-neutral-200"
                  value={vForm.brand} onChange={e => setVForm({ ...vForm, brand: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Modelo *</Label>
                <Input placeholder="Ej: Hilux" className="h-10 rounded-xl border-neutral-200"
                  value={vForm.model} onChange={e => setVForm({ ...vForm, model: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Año</Label>
                <Input type="number" placeholder="2024" className="h-10 rounded-xl border-neutral-200"
                  value={vForm.year} onChange={e => setVForm({ ...vForm, year: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Placa *</Label>
                <Input placeholder="A123456" className="h-10 rounded-xl border-neutral-200"
                  value={vForm.plate} onChange={e => setVForm({ ...vForm, plate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setVForm({ ...vForm, color: c })}
                    className={cn("px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                      vForm.color === c ? "bg-black text-white border-black" : "border-neutral-200 text-neutral-600 hover:border-neutral-400")}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Kilometraje actual</Label>
              <div className="relative">
                <Input type="number" placeholder="Ej: 45000" className="h-10 rounded-xl border-neutral-200 pr-10"
                  value={vForm.km} onChange={e => setVForm({ ...vForm, km: e.target.value })} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 font-medium">km</span>
              </div>
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAddVehicleOpen(false)} className="rounded-xl flex-1">Cancelar</Button>
              <Button type="submit" className="rounded-xl flex-1 bg-black text-white hover:bg-neutral-800">Agregar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
