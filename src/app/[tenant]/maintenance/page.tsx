"use client";

import { useState, useMemo, useEffect, memo, Suspense } from "react";
import { useRouter, useSearchParams, useParams } from "@/lib/next-compat";
import { useStore } from "@/store/useStore";
import { supabaseAdmin } from "@/lib/supabase";
import { MaintenanceDetailModal } from "@/components/maintenance/MaintenanceDetailModal";
import { VehicleMaintenanceHistoryModal } from "@/components/maintenance/VehicleMaintenanceHistoryModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Filter,
  Car,
  User,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Zap,
  MessageSquare,
  History,
  ChevronRight,
  Trash2,
  Gauge,
  Edit3,
  Clock,
  Send,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { sendEvolutionTextMessage, cleanBaseUrl, cleanApiKey } from "@/lib/evolutionApi";

export default function MaintenancePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-neutral-400 font-bold">Cargando Control de Mantenimiento...</div>}>
      <MaintenanceContent />
    </Suspense>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  engine: 'Motor & Aceite',
  brakes: 'Frenos',
  tires: 'Neumáticos',
  battery: 'Sistema Eléctrico',
  suspension: 'Suspensión',
  transmission: 'Transmisión',
  cooling: 'Enfriamiento',
  ac: 'Aire Acondicionado',
  steering: 'Dirección',
  others: 'Mantenimiento General'
};

function MaintenanceContent() {
  const { tenant } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const storeCustomers = useStore((s) => s.customers);
  const storeVehicles = useStore((s) => s.vehicles);
  const storeMaintenanceItems = useStore((s) => s.maintenanceItems);
  const storeOrders = useStore((s) => s.orders);
  const storeServices = useStore((s) => s.services);
  const calculateMaintenanceHealth = useStore((s) => s.calculateMaintenanceHealth);
  const updateVehicle = useStore((s) => s.updateVehicle);
  const deleteMaintenanceItem = useStore((s) => s.deleteMaintenanceItem);
  const addWhatsAppLog = useStore((s) => s.addWhatsAppLog);
  const tenants = useStore((s) => s.tenants);

  const currentTenant = tenants.find((t) => t.slug === tenant) ?? null;
  const tenantId = currentTenant?.id ?? "";

  const customers = useMemo(() => storeCustomers.filter(c => !tenantId || c.tenantId === tenantId), [storeCustomers, tenantId]);
  const vehicles = useMemo(() => storeVehicles.filter(v => !tenantId || v.tenantId === tenantId), [storeVehicles, tenantId]);
  const maintenanceItems = useMemo(() => storeMaintenanceItems.filter(m => !tenantId || m.tenantId === tenantId), [storeMaintenanceItems, tenantId]);
  const orders = useMemo(() => storeOrders.filter(o => !tenantId || o.tenantId === tenantId), [storeOrders, tenantId]);

  const [search, setSearch] = useState(initialSearch);
  const [filter, setFilter] = useState<'all' | 'critical' | 'preventive' | 'healthy'>('all');
  const [selectedData, setSelectedData] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyVehicle, setHistoryVehicle] = useState<any>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<string | null>(null);
  const [hiddenVehicleIds, setHiddenVehicleIds] = useState<Set<string>>(new Set());

  // Quick Odometer Modal State
  const [kmModalOpen, setKmModalOpen] = useState(false);
  const [selectedVehicleForKm, setSelectedVehicleForKm] = useState<any>(null);
  const [newKmValue, setNewKmValue] = useState<string>("");

  // Quick WhatsApp Dispatch Modal State
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waTarget, setWaTarget] = useState<{ customer: any; vehicle: any; item: any; message: string } | null>(null);
  const [isSendingWa, setIsSendingWa] = useState(false);

  // Recalculate health on mount / vehicle change
  useEffect(() => {
    const kmMap: Record<string, number> = {};
    let hasValidKms = false;
    vehicles.forEach(v => {
      if (v.km != null) {
        kmMap[v.id] = v.km;
        hasValidKms = true;
      }
    });
    if (hasValidKms) {
      calculateMaintenanceHealth(kmMap);
    }
  }, [vehicles, calculateMaintenanceHealth]);

  // Handle Quick KM Update
  const openKmModal = (vehicle: any) => {
    setSelectedVehicleForKm(vehicle);
    setNewKmValue(vehicle.km ? String(vehicle.km) : "");
    setKmModalOpen(true);
  };

  const handleSaveKm = async () => {
    if (!selectedVehicleForKm) return;
    const kmNum = parseInt(newKmValue.replace(/[^0-9]/g, ""), 10);
    if (isNaN(kmNum) || kmNum < 0) {
      toast.error("Ingresa un kilometraje válido");
      return;
    }

    // Update store & recalculate
    updateVehicle(selectedVehicleForKm.id, { km: kmNum });
    calculateMaintenanceHealth({ [selectedVehicleForKm.id]: kmNum });

    // Persist to Supabase
    try {
      await supabaseAdmin.from("vehicles").update({ km: kmNum }).eq("id", selectedVehicleForKm.id);
      toast.success(`Odómetro de ${selectedVehicleForKm.brand} actualizado a ${kmNum.toLocaleString()} km`);
    } catch (e) {
      console.error("Error updating km in DB:", e);
    }

    setKmModalOpen(false);
  };

  // Open Quick WhatsApp Modal
  const openWhatsAppNotify = (customer: any, vehicle: any, criticalItem: any) => {
    if (!customer || !vehicle) return;
    const shopName = currentTenant?.name || "Autocheck";
    const itemName = criticalItem ? (CATEGORY_LABELS[criticalItem.category] || criticalItem.name) : "Mantenimiento Preventivo";
    const remainingKm = criticalItem?.kmRemaining != null ? Math.max(0, criticalItem.kmRemaining) : null;
    
    const msg = `Hola ${customer.name}, te saludamos de ${shopName}. 🚗 Notamos que tu ${vehicle.brand} ${vehicle.model} (Placa ${vehicle.plate}) está próximo a su servicio de ${itemName}${remainingKm !== null ? ` (le quedan aprox. ${remainingKm.toLocaleString()} km)` : ""}. ¿Deseas agendar tu cita para esta semana?`;

    setWaTarget({ customer, vehicle, item: criticalItem, message: msg });
    setWaModalOpen(true);
  };

  const handleSendWhatsApp = async () => {
    if (!waTarget) return;
    setIsSendingWa(true);
    const { customer, vehicle, item, message } = waTarget;
    try {
      const evoUrl = cleanBaseUrl(currentTenant?.evolutionBaseUrl || currentTenant?.config?.evolutionBaseUrl || (currentTenant?.config as any)?.evolution_baseurl);
      const evoKey = cleanApiKey(currentTenant?.evolutionApiKey || currentTenant?.config?.evolutionApiKey || (currentTenant?.config as any)?.evolution_apikey);
      const evoInstance = currentTenant?.evolutionInstanceName || currentTenant?.config?.evolutionInstanceName || (currentTenant?.config as any)?.evolution_instance || currentTenant?.slug || "autocheck";

      // Attempt sending via Evolution API
      const res = await sendEvolutionTextMessage(evoUrl, evoKey, evoInstance, customer.phone, message);
      
      // Save log in store
      addWhatsAppLog({
        id: `wl_${Date.now()}`,
        tenantId: tenantId,
        customerId: customer.id,
        customerName: customer.name,
        phone: customer.phone,
        type: "reminder",
        message: message,
        status: res.ok ? "sent" : "failed",
        sentAt: new Date().toISOString(),
      });

      if (res.ok) {
        toast.success(`✅ Recordatorio enviado a ${customer.name} (${customer.phone})`);
      } else {
        // Fallback to wa.me
        const cleanPhone = customer.phone.replace(/[^0-9]/g, "");
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, "_blank");
        toast.info("Abriendo WhatsApp Web...");
      }
      setWaModalOpen(false);
    } catch (e: any) {
      toast.error("Error al despachar mensaje: " + e.message);
    } finally {
      setIsSendingWa(false);
    }
  };

  const openHistory = (vehicle: any) => {
    setHistoryVehicle(vehicle);
    setHistoryOpen(true);
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    setVehicleToDelete(vehicleId);
  };

  const confirmDeleteVehicle = () => {
    if (vehicleToDelete) {
      setHiddenVehicleIds(prev => new Set([...prev, vehicleToDelete]));
      const itemsToDelete = storeMaintenanceItems.filter(item => item.vehicleId === vehicleToDelete);
      itemsToDelete.forEach(item => deleteMaintenanceItem(item.id));
      toast.success("Mantenimiento eliminado de la lista de monitoreo.");
      setVehicleToDelete(null);
    }
  };

  const openDetail = (data: any) => {
    setSelectedData(data);
    setIsModalOpen(true);
  };

  // Comprehensive Predictive Maintenance Calculations
  const maintenanceData = useMemo(() => {
    const now = new Date();

    return vehicles.map(vehicle => {
      const customer = customers.find(c => c.id === vehicle.customerId);
      const rawItems = maintenanceItems.filter(m => m.vehicleId === vehicle.id);

      // Estimate vehicle daily usage based on order history
      const vehicleOrders = orders
        .filter(o => o.vehicleId === vehicle.id && o.km && o.km > 0)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      let dailyKmRate = 35; // Default standard: 35 km/day
      if (vehicleOrders.length >= 2) {
        const first = vehicleOrders[0];
        const last = vehicleOrders[vehicleOrders.length - 1];
        const daysDiff = Math.max(1, Math.floor((new Date(last.createdAt).getTime() - new Date(first.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
        const kmDiff = Math.max(0, (last.km || 0) - (first.km || 0));
        if (kmDiff > 0 && daysDiff > 0) {
          dailyKmRate = Math.min(250, Math.max(10, Math.round(kmDiff / daysDiff)));
        }
      }

      // Calculate precision wear metrics for each item
      const enrichedItems = rawItems.map(item => {
        const lastDate = new Date(item.lastServiceDate);
        const daysPassed = Math.max(0, Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)));
        const currentKm = vehicle.km ?? item.lastServiceKm ?? 0;
        const kmPassed = Math.max(0, currentKm - item.lastServiceKm);

        const timeUsage = (daysPassed / (item.lifespanDays || 180)) * 100;
        const kmUsage = (kmPassed / (item.lifespanKm || 5000)) * 100;
        const maxUsage = Math.max(timeUsage, kmUsage);
        const currentPercentage = Math.max(0, Math.min(100, Math.floor(100 - maxUsage)));

        const kmRemaining = Math.round((item.lifespanKm || 5000) - kmPassed);
        const daysRemaining = Math.round((item.lifespanDays || 180) - daysPassed);
        const dominantFactor = kmUsage >= timeUsage ? 'km' : 'time';

        return {
          ...item,
          daysPassed,
          kmPassed,
          kmRemaining,
          daysRemaining,
          dominantFactor,
          currentPercentage,
        };
      });

      const minPercentage = enrichedItems.length > 0
        ? Math.min(...enrichedItems.map(i => i.currentPercentage))
        : 100;

      // Find the most urgent item
      const mostUrgentItem = enrichedItems.length > 0
        ? [...enrichedItems].sort((a, b) => a.currentPercentage - b.currentPercentage)[0]
        : null;

      let status: 'critical' | 'preventive' | 'healthy' = 'healthy';
      if (minPercentage <= 10) status = 'critical';
      else if (minPercentage <= 30) status = 'preventive';

      return { 
        vehicle, 
        customer, 
        items: enrichedItems, 
        minPercentage, 
        status, 
        dailyKmRate, 
        mostUrgentItem 
      };
    }).filter(data => {
      if (hiddenVehicleIds.has(data.vehicle.id)) return false;
      if (data.items.length === 0) return false;

      const matchesSearch =
        data.customer?.name.toLowerCase().includes(search.toLowerCase()) ||
        data.vehicle.plate.toLowerCase().includes(search.toLowerCase()) ||
        `${data.vehicle.brand} ${data.vehicle.model}`.toLowerCase().includes(search.toLowerCase());

      const matchesFilter = filter === 'all' || data.status === filter;
      return matchesSearch && matchesFilter;
    }).sort((a, b) => a.minPercentage - b.minPercentage);
  }, [vehicles, customers, maintenanceItems, orders, search, filter, hiddenVehicleIds]);

  // Overall Fleet Health KPIs
  const fleetKpis = useMemo(() => {
    const total = maintenanceData.length;
    const critical = maintenanceData.filter(d => d.status === 'critical').length;
    const preventive = maintenanceData.filter(d => d.status === 'preventive').length;
    const healthy = maintenanceData.filter(d => d.status === 'healthy').length;
    
    // Estimate sales potential (approx. RD$ 3,500 average per expiring service)
    const pendingServicesCount = maintenanceData
      .flatMap(d => d.items)
      .filter(i => i.currentPercentage <= 30).length;
    const potentialRevenue = pendingServicesCount * 3500;

    return { total, critical, preventive, healthy, potentialRevenue, pendingServicesCount };
  }, [maintenanceData]);

  return (
    <div className="space-y-7 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900">
            Control de Mantenimiento Predictivo
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5 font-medium">
            Telemetría de desgaste, odómetros en vivo y alertas preventivas certeras.
          </p>
        </div>
        
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              placeholder="Buscar cliente, placa, modelo..."
              className="w-64 sm:w-72 pl-10 rounded-xl h-10 text-xs border-neutral-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Fleet Health Summary KPIs (Executive Bar) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Monitoreados</span>
            <span className="text-xl font-black text-neutral-900 mt-0.5 block">{fleetKpis.total} autos</span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700">
            <Car className="h-4 w-4" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">Críticos (≤10% vida)</span>
            <span className="text-xl font-black text-rose-700 mt-0.5 block">{fleetKpis.critical} urgentes</span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-xs">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">Preventivos (≤30%)</span>
            <span className="text-xl font-black text-amber-700 mt-0.5 block">{fleetKpis.preventive} por vencer</span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
            <Clock className="h-4 w-4" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">En Óptimo Estado</span>
            <span className="text-xl font-black text-emerald-700 mt-0.5 block">{fleetKpis.healthy} al día</span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Tabs / Quick Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <Button 
          variant={filter === 'all' ? 'default' : 'outline'} 
          onClick={() => setFilter('all')}
          className={cn("rounded-xl px-5 h-9 font-bold text-xs cursor-pointer", filter === 'all' ? "bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50")}
        >
          Todos ({fleetKpis.total})
        </Button>
        <Button 
          variant={filter === 'critical' ? 'default' : 'outline'} 
          onClick={() => setFilter('critical')}
          className={cn("rounded-xl px-4 h-9 font-bold text-xs gap-1.5 cursor-pointer", filter === 'critical' ? "bg-rose-600 text-white hover:bg-rose-700" : "text-rose-700 border-rose-200 bg-rose-50/50 hover:bg-rose-100")}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Críticos ({fleetKpis.critical})
        </Button>
        <Button 
          variant={filter === 'preventive' ? 'default' : 'outline'} 
          onClick={() => setFilter('preventive')}
          className={cn("rounded-xl px-4 h-9 font-bold text-xs gap-1.5 cursor-pointer", filter === 'preventive' ? "bg-amber-500 text-white hover:bg-amber-600" : "text-amber-800 border-amber-200 bg-amber-50/50 hover:bg-amber-100")}
        >
          <Clock className="h-3.5 w-3.5" />
          Preventivos ({fleetKpis.preventive})
        </Button>
        <Button 
          variant={filter === 'healthy' ? 'default' : 'outline'} 
          onClick={() => setFilter('healthy')}
          className={cn("rounded-xl px-4 h-9 font-bold text-xs gap-1.5 cursor-pointer", filter === 'healthy' ? "bg-emerald-600 text-white hover:bg-emerald-700" : "text-emerald-700 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100")}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          En Orden ({fleetKpis.healthy})
        </Button>
      </div>

      {/* Vehicles Grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {maintenanceData.map((data) => (
          <MaintenanceCard 
            key={data.vehicle.id}
            data={data} 
            onViewDetail={() => openDetail(data)} 
            onViewHistory={openHistory}
            onDelete={handleDeleteVehicle}
            onUpdateKm={openKmModal}
            onNotifyWhatsApp={openWhatsAppNotify}
          />
        ))}
      </div>

      {maintenanceData.length === 0 && (
        <div className="p-12 text-center bg-white border border-neutral-200/80 rounded-3xl shadow-xs">
          <Car className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-neutral-900">No se encontraron vehículos</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            No hay vehículos que coincidan con el filtro o término de búsqueda seleccionado.
          </p>
        </div>
      )}

      {/* Detail Modal */}
      <MaintenanceDetailModal 
        isOpen={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        data={selectedData} 
      />

      {/* History Modal */}
      <VehicleMaintenanceHistoryModal
        isOpen={historyOpen}
        onOpenChange={setHistoryOpen}
        vehicle={historyVehicle}
      />

      {/* Quick KM Update Modal */}
      <Dialog open={kmModalOpen} onOpenChange={setKmModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
              <Gauge className="h-5 w-5 text-emerald-600" />
              Actualizar Odómetro
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-neutral-900">{selectedVehicleForKm?.brand} {selectedVehicleForKm?.model}</p>
                <p className="text-neutral-500 font-mono">Placa: {selectedVehicleForKm?.plate}</p>
              </div>
              <span className="font-bold text-neutral-600 bg-neutral-200/60 px-2.5 py-1 rounded-lg">
                Actual: {selectedVehicleForKm?.km ? `${selectedVehicleForKm.km.toLocaleString()} km` : "No registrado"}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-700">Nuevo Kilometraje (KM)</Label>
              <Input
                type="number"
                placeholder="Ej: 85200"
                value={newKmValue}
                onChange={(e) => setNewKmValue(e.target.value)}
                className="h-11 rounded-xl font-mono text-sm border-neutral-200"
                autoFocus
              />
              <p className="text-[11px] text-neutral-400">
                Al guardar, la salud de todos los servicios del vehículo se recalculará automáticamente.
              </p>
            </div>
          </div>
          <DialogFooter className="pt-2 border-t border-neutral-100 gap-2">
            <Button variant="outline" onClick={() => setKmModalOpen(false)} className="rounded-xl text-xs">
              Cancelar
            </Button>
            <Button onClick={handleSaveKm} className="rounded-xl bg-neutral-950 text-white hover:bg-black font-bold text-xs h-10 px-5 shadow-xs">
              Guardar y Recalcular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick WhatsApp Dispatch Modal */}
      <Dialog open={waModalOpen} onOpenChange={setWaModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-600" />
              Notificar Cliente por WhatsApp
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-neutral-900">{waTarget?.customer?.name}</span>
                <span className="text-neutral-500 block font-mono mt-0.5">{waTarget?.customer?.phone}</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
                {waTarget?.vehicle?.brand} {waTarget?.vehicle?.model}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-700">Mensaje Personalizado</Label>
              <textarea
                value={waTarget?.message || ""}
                onChange={(e) => setWaTarget(prev => prev ? { ...prev, message: e.target.value } : null)}
                className="w-full min-h-[110px] rounded-2xl border border-neutral-200 p-3 text-xs resize-none focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>
          </div>
          <DialogFooter className="pt-2 border-t border-neutral-100 gap-2">
            <Button variant="outline" onClick={() => setWaModalOpen(false)} className="rounded-xl text-xs">
              Cancelar
            </Button>
            <Button 
              onClick={handleSendWhatsApp} 
              disabled={isSendingWa}
              className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs h-10 px-5 shadow-xs gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              {isSendingWa ? "Enviando..." : "Enviar WhatsApp"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <AlertDialog open={!!vehicleToDelete} onOpenChange={(open) => !open && setVehicleToDelete(null)}>
        <AlertDialogContent className="rounded-3xl p-6 bg-white border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-black text-neutral-900">¿Remover vehículo de monitoreo?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-neutral-500">
              Esta acción ocultará el vehículo y sus alertas preventivas de la lista. Su historial quedará preservado en las órdenes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2 border-t border-neutral-100">
            <AlertDialogCancel className="rounded-xl text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteVehicle} className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs">
              Sí, Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const MaintenanceCard = memo(function MaintenanceCard({ 
  data, 
  onViewDetail,
  onViewHistory,
  onDelete,
  onUpdateKm,
  onNotifyWhatsApp
}: { 
  data: any; 
  onViewDetail: () => void;
  onViewHistory: (vehicle: any) => void;
  onDelete: (vehicleId: string) => void;
  onUpdateKm: (vehicle: any) => void;
  onNotifyWhatsApp: (customer: any, vehicle: any, criticalItem: any) => void;
}) {
  const { vehicle, customer, items, minPercentage, status, dailyKmRate, mostUrgentItem } = data;

  const statusConfig = {
    critical: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", badgeBg: "bg-rose-100 text-rose-800 border-rose-200", accent: "bg-rose-600" },
    preventive: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", badgeBg: "bg-amber-100 text-amber-800 border-amber-200", accent: "bg-amber-500" },
    healthy: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-200", accent: "bg-emerald-600" },
  };

  const config = statusConfig[status as keyof typeof statusConfig];

  return (
    <Card 
      className={cn(
        "overflow-hidden border border-neutral-200/80 shadow-xs hover:border-neutral-300 hover:shadow-md transition-all rounded-3xl bg-white flex flex-col justify-between"
      )}
    >
      <div className={cn("h-1.5 w-full", config.accent)} />
      
      <CardHeader className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn("h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs", config.bg, config.text)}>
              <Car className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-black text-neutral-900 leading-tight">
                {vehicle.brand} {vehicle.model}
              </CardTitle>
              <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1">
                <span className="font-mono bg-neutral-100 px-2 py-0.5 rounded-md text-neutral-800 font-bold text-[11px] uppercase border border-neutral-200">
                  {vehicle.plate}
                </span>
                {vehicle.year && <span>• {vehicle.year}</span>}
              </div>
            </div>
          </div>
          
          <Badge className={cn("font-black text-xs px-2.5 py-1 rounded-xl border shadow-2xs shrink-0", config.badgeBg)}>
            {minPercentage}%
          </Badge>
        </div>

        {/* Real-time Odometer & Telemetry Strip */}
        <div className="mt-3.5 p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Gauge className="h-3.5 w-3.5 text-neutral-500" />
            <span className="font-mono font-bold text-neutral-800 text-xs">
              {vehicle.km ? `${vehicle.km.toLocaleString()} km` : "Sin odómetro"}
            </span>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onUpdateKm(vehicle); }}
            className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer bg-white px-2 py-0.5 rounded-md border border-neutral-200 shadow-2xs"
            title="Actualizar odómetro"
          >
            <Edit3 className="h-3 w-3" /> Editar KM
          </button>
        </div>
      </CardHeader>
 
      <CardContent className="p-5 pt-0 space-y-4">
        {/* Customer Info */}
        <div className="flex items-center justify-between rounded-xl bg-neutral-50/70 p-2.5 border border-neutral-100/80">
          <div className="flex items-center gap-2 truncate">
            <User className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
            <span className="text-xs font-bold text-neutral-800 truncate">{customer?.name || "Cliente General"}</span>
          </div>
          <span className="text-[11px] text-neutral-500 font-mono shrink-0">{customer?.phone}</span>
        </div>
 
        {/* Services / Component Wear Breakdown */}
        <div className="space-y-3 pt-1">
          {items.slice(0, 3).map((item: any) => {
            const isCritical = item.currentPercentage <= 10;
            const isPreventive = item.currentPercentage <= 30 && item.currentPercentage > 10;

            return (
              <div key={item.id} className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold gap-2">
                  <span className="text-neutral-900 truncate">
                    {CATEGORY_LABELS[item.category] || item.name}
                  </span>
                  <span className={cn(
                    "shrink-0 font-black",
                    isCritical ? "text-rose-600" : isPreventive ? "text-amber-600" : "text-emerald-600"
                  )}>
                    {item.currentPercentage}%
                  </span>
                </div>

                <Progress 
                  value={item.currentPercentage} 
                  className="h-1.5 bg-neutral-100 rounded-full" 
                  indicatorClassName={cn(
                    isCritical ? "bg-rose-500" : isPreventive ? "bg-amber-400" : "bg-emerald-500"
                  )}
                />

                <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-0.5">
                  <span className="truncate">
                    {item.kmRemaining <= 0 
                      ? `⚠️ Vencido (${Math.abs(item.kmRemaining).toLocaleString()} km)` 
                      : `Faltan ${item.kmRemaining.toLocaleString()} km`}
                  </span>
                  <span className="shrink-0 font-medium">
                    {item.daysRemaining <= 0 ? "Vencido por tiempo" : `~${item.daysRemaining}d`}
                  </span>
                </div>
              </div>
            );
          })}
          {items.length > 3 && (
            <p className="text-[10px] text-center text-neutral-400 font-medium pt-1">
              +{items.length - 3} servicios adicionales
            </p>
          )}
        </div>
 
        {/* Action Button Bar */}
        <div className="pt-3 border-t border-neutral-100 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {/* WhatsApp Button */}
          {customer?.phone && (
            <Button 
              size="sm"
              variant="outline"
              className="h-9 px-2.5 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold text-xs gap-1 cursor-pointer"
              onClick={() => onNotifyWhatsApp(customer, vehicle, mostUrgentItem)}
              title="Notificar por WhatsApp"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>
          )}

          {/* Ver Detalle */}
          <Button 
            className="flex-1 rounded-xl bg-neutral-950 hover:bg-black text-white text-xs font-bold h-9 cursor-pointer shadow-2xs"
            onClick={onViewDetail}
          >
            Ver Detalle
            <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>

          {/* History */}
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-xl h-9 w-9 border-neutral-200 hover:bg-neutral-100 text-neutral-700 cursor-pointer"
            onClick={() => onViewHistory(vehicle)}
            title="Historial de Mantenimiento"
          >
            <History className="h-4 w-4" />
          </Button>

          {/* Delete */}
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-xl h-9 w-9 border-neutral-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-neutral-400 cursor-pointer"
            onClick={() => onDelete(vehicle.id)}
            title="Remover de monitoreo"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});
