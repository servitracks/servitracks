"use client";

import { useState, useMemo, useEffect, memo, Suspense, useRef } from "react";
import { useRouter, useSearchParams, useParams } from "@/lib/next-compat";
import { useStore } from "@/store/useStore";
import { supabaseAdmin } from "@/lib/supabase";
import {
  loadCustomersFromSupabase, loadVehiclesFromSupabase,
  loadMaintenanceItemsFromSupabase, syncStoreToSupabase,
} from "@/lib/supabaseSync";
import { MaintenanceDetailModal } from "@/components/maintenance/MaintenanceDetailModal";
import { VehicleMaintenanceHistoryModal } from "@/components/maintenance/VehicleMaintenanceHistoryModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ArrowRight,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function MaintenancePage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <MaintenanceContent />
    </Suspense>
  );
}

function MaintenanceContent() {
  const { tenant } = useParams();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const storeCustomers = useStore((s) => s.customers);
  const storeVehicles = useStore((s) => s.vehicles);
  const storeMaintenanceItems = useStore((s) => s.maintenanceItems);
  const storeOrders = useStore((s) => s.orders);
  const storeServices = useStore((s) => s.services);
  const calculateMaintenanceHealth = useStore((s) => s.calculateMaintenanceHealth);
  const deleteVehicle = useStore((s) => s.deleteVehicle);
  const deleteMaintenanceItem = useStore((s) => s.deleteMaintenanceItem);
  const tenants = useStore((s) => s.tenants);

  const currentTenant = tenants.find((t) => t.slug === tenant) ?? null;
  const tenantId = currentTenant?.id ?? "";

  const [customers, setLocalCustomers] = useState(() => storeCustomers.filter(c => !tenantId || c.tenantId === tenantId));
  const [vehicles, setLocalVehicles] = useState(() => storeVehicles.filter(v => !tenantId || v.tenantId === tenantId));
  const [maintenanceItems, setLocalItems] = useState(() => storeMaintenanceItems.filter(m => !tenantId || m.tenantId === tenantId));
  const [loading, setLoading] = useState(true);
  const syncedRef = useRef(false);

  // ── Load from Supabase, fallback to store ─────────────────────────────────
  useEffect(() => {
    if (syncedRef.current) return;
    syncedRef.current = true;

    const slug = tenant;
    if (!slug) {
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        const { data: tenantRow, error: tenantError } = await supabaseAdmin
          .from("tenants")
          .select("id")
          .eq("slug", slug)
          .single();

        if (tenantError || !tenantRow) {
          // No Supabase tenant — use store data
          setLocalCustomers(storeCustomers.filter(c => !tenantId || c.tenantId === tenantId));
          setLocalVehicles(storeVehicles.filter(v => !tenantId || v.tenantId === tenantId));
          setLocalItems(storeMaintenanceItems.filter(m => !tenantId || m.tenantId === tenantId));
          setLoading(false);
          return;
        }
        const tid = tenantRow.id;

        // Load from Supabase
        const [dbCustomers, dbVehicles, dbItems] = await Promise.all([
          loadCustomersFromSupabase(tid),
          loadVehiclesFromSupabase(tid),
          loadMaintenanceItemsFromSupabase(tid),
        ]);

        if (dbCustomers.length > 0 || dbVehicles.length > 0) {
          // Use DB data
          setLocalCustomers(dbCustomers);
          setLocalVehicles(dbVehicles);
          setLocalItems(dbItems);
        } else if (storeVehicles.length > 0) {
          // DB empty but store has data — push store data up to Supabase
          console.log("[Maintenance] Syncing local store to Supabase...");
          await syncStoreToSupabase(tid, storeCustomers, storeVehicles, storeMaintenanceItems);
          setLocalCustomers(storeCustomers);
          setLocalVehicles(storeVehicles);
          setLocalItems(storeMaintenanceItems);
        } else {
          setLocalCustomers([]);
          setLocalVehicles([]);
          setLocalItems([]);
        }
        setLoading(false);
      } catch (error: any) {
        console.error("[Maintenance] load error:", error);
        setLocalCustomers(storeCustomers.filter(c => !tenantId || c.tenantId === tenantId));
        setLocalVehicles(storeVehicles.filter(v => !tenantId || v.tenantId === tenantId));
        setLocalItems(storeMaintenanceItems.filter(m => !tenantId || m.tenantId === tenantId));
        setLoading(false);
      }
    }

    loadData();
  }, [tenant, storeCustomers, storeVehicles, storeMaintenanceItems]);

  const [search, setSearch] = useState(initialSearch);
  const [filter, setFilter] = useState<'all' | 'critical' | 'preventive' | 'healthy'>('all');
  const [selectedData, setSelectedData] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyVehicle, setHistoryVehicle] = useState<any>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<string | null>(null);
  // IDs de vehículos ocultos instantáneamente en la UI al eliminar mantenimiento
  const [hiddenVehicleIds, setHiddenVehicleIds] = useState<Set<string>>(new Set());

  const openHistory = (vehicle: any) => {
    setHistoryVehicle(vehicle);
    setHistoryOpen(true);
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    setVehicleToDelete(vehicleId);
  };

  const confirmDeleteVehicle = () => {
    if (vehicleToDelete) {
      // 1. Ocultar INMEDIATAMENTE del UI (realtime visual)
      setHiddenVehicleIds(prev => new Set([...prev, vehicleToDelete]));

      // 2. Limpiar items de mantenimiento del store
      const itemsToDelete = maintenanceItems.filter(item => item.vehicleId === vehicleToDelete);
      itemsToDelete.forEach(item => deleteMaintenanceItem(item.id));

      // 3. Limpiar items sintéticos del state local
      setLocalItems(prev => prev.filter(item => item.vehicleId !== vehicleToDelete));

      toast.success("Mantenimiento eliminado correctamente.", { duration: 3000 });
      setVehicleToDelete(null);
    }
  };

  useEffect(() => {
    const kmMap: Record<string, number> = {};
    vehicles.forEach(v => {
      if (v.km) kmMap[v.id] = v.km;
    });
    calculateMaintenanceHealth(kmMap);
  }, [vehicles, calculateMaintenanceHealth]);

  const openDetail = (data: any) => {
    setSelectedData(data);
    setIsModalOpen(true);
  };

  /**
   * Genera items de mantenimiento sintéticos a partir de las órdenes de trabajo entregadas.
   * Esto garantiza que cada orden entregada aparezca en el módulo de mantenimiento.
   */
  const derivedMaintenanceItems = useMemo(() => {
    // Filtrar solo las órdenes del tenant actual para garantizar aislamiento por taller
    const deliveredOrders = storeOrders.filter((o) => {
      const statusOk = o.status === 'delivered' || o.status === 'invoiced';
      // Verificar que la orden pertenece al tenant actual (por tenantId)
      const tenantOk = !tenantId || o.tenantId === tenantId;
      return statusOk && tenantOk;
    });

    const syntheticItems: any[] = [];

    deliveredOrders.forEach((order) => {
      const daysSince = Math.floor(
        (Date.now() - new Date(order.updatedAt || order.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Each service in the order becomes a maintenance item
      const services = (order.serviceIds || [])
        .map((sid) => storeServices.find((s) => s.id === sid))
        .filter(Boolean);

      if (services.length > 0) {
        services.forEach((svc: any) => {
          const lifespanDays = svc?.lifespanDays || 90;
          const lifespanKm = svc?.lifespanKm || 5000;

          const vehicle = vehicles.find(v => v.id === order.vehicleId);
          const currentKm = vehicle?.km || order.km || 0;
          const kmPassed = Math.max(0, currentKm - (order.km || 0));

          const timeUsage = (daysSince / lifespanDays) * 100;
          const kmUsage = (kmPassed / lifespanKm) * 100;
          const maxUsage = Math.max(timeUsage, kmUsage);
          const pct = Math.max(0, Math.floor(100 - maxUsage));

          syntheticItems.push({
            id: `synth_${order.id}_${svc.id}`,
            vehicleId: order.vehicleId,
            tenantId: order.tenantId,
            name: svc.name,
            category: svc.maintenanceCategory || getMaintenanceCategoryFromText(svc.category),
            lastServiceDate: order.updatedAt || order.createdAt,
            lastServiceKm: order.km || 0,
            lifespanKm,
            lifespanDays,
            currentPercentage: pct,
            _fromOrder: order.id,
          });
        });
      } else {
        // No services mapped — create a generic maintenance item from the order description
        const lifespanDays = 90;
        const lifespanKm = 5000;

        const vehicle = vehicles.find(v => v.id === order.vehicleId);
        const currentKm = vehicle?.km || order.km || 0;
        const kmPassed = Math.max(0, currentKm - (order.km || 0));

        const timeUsage = (daysSince / lifespanDays) * 100;
        const kmUsage = (kmPassed / lifespanKm) * 100;
        const maxUsage = Math.max(timeUsage, kmUsage);
        const pct = Math.max(0, Math.floor(100 - maxUsage));

        syntheticItems.push({
          id: `synth_${order.id}`,
          vehicleId: order.vehicleId,
          tenantId: order.tenantId,
          name: order.description || 'Servicio realizado',
          category: 'others',
          lastServiceDate: order.updatedAt || order.createdAt,
          lastServiceKm: order.km || 0,
          lifespanKm,
          lifespanDays,
          currentPercentage: pct,
          _fromOrder: order.id,
        });
      }
    });

    // Merge: real items take priority, then synthetics for categories without any real items for that vehicle
    const allItems = [...maintenanceItems];
    const realVehicleCategories = new Set(
      maintenanceItems.map((m) => `${m.vehicleId}_${m.category}`)
    );
    syntheticItems.forEach((s) => {
      if (!realVehicleCategories.has(`${s.vehicleId}_${s.category}`)) {
        allItems.push(s);
      }
    });
    return allItems;
  }, [storeOrders, storeServices, maintenanceItems, vehicles]);

  const maintenanceData = useMemo(() => {
    return vehicles.map(vehicle => {
      const customer = customers.find(c => c.id === vehicle.customerId);
      const items = derivedMaintenanceItems.filter(m => m.vehicleId === vehicle.id);

      const minPercentage = items.length > 0
        ? Math.min(...items.map(i => i.currentPercentage))
        : 100;

      let status: 'critical' | 'preventive' | 'healthy' = 'healthy';
      if (minPercentage <= 10) status = 'critical';
      else if (minPercentage <= 30) status = 'preventive';

      return { vehicle, customer, items, minPercentage, status };
    }).filter(data => {
      // Ocultar inmediatamente los vehículos marcados para eliminación
      if (hiddenVehicleIds.has(data.vehicle.id)) return false;
      if (data.items.length === 0) return false;

      const matchesSearch =
        data.customer?.name.toLowerCase().includes(search.toLowerCase()) ||
        data.vehicle.plate.toLowerCase().includes(search.toLowerCase()) ||
        `${data.vehicle.brand} ${data.vehicle.model}`.toLowerCase().includes(search.toLowerCase());

      const matchesFilter = filter === 'all' || data.status === filter;
      return matchesSearch && matchesFilter;
    }).sort((a, b) => a.minPercentage - b.minPercentage);
  }, [vehicles, customers, derivedMaintenanceItems, search, filter, hiddenVehicleIds]);

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-neutral-900">Control de Mantenimiento</h1>
          <p className="text-neutral-500 mt-1">
            {loading ? "Cargando datos desde Supabase..." : "Gestión inteligente de vida útil y alertas preventivas."}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              placeholder="Buscar cliente, placa..."
              className="w-64 pl-10 rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" className="rounded-xl gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
        </div>
      </div>

      {/* Tabs / Quick Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <Button 
          variant={filter === 'all' ? 'default' : 'outline'} 
          onClick={() => setFilter('all')}
          className="rounded-full px-6"
        >
          Todos
        </Button>
        <Button 
          variant={filter === 'critical' ? 'default' : 'outline'} 
          onClick={() => setFilter('critical')}
          className={cn("rounded-full px-6 gap-2", filter === 'critical' ? "bg-rose-600 hover:bg-rose-700" : "text-rose-600 border-rose-100")}
        >
          <AlertTriangle className="h-4 w-4" />
          Críticos
        </Button>
        <Button 
          variant={filter === 'preventive' ? 'default' : 'outline'} 
          onClick={() => setFilter('preventive')}
          className={cn("rounded-full px-6 gap-2", filter === 'preventive' ? "bg-amber-500 hover:bg-amber-600" : "text-amber-600 border-amber-100")}
        >
          <AlertTriangle className="h-4 w-4" />
          Preventivos
        </Button>
        <Button 
          variant={filter === 'healthy' ? 'default' : 'outline'} 
          onClick={() => setFilter('healthy')}
          className={cn("rounded-full px-6 gap-2", filter === 'healthy' ? "bg-emerald-600 hover:bg-emerald-700" : "text-emerald-600 border-emerald-100")}
        >
          <CheckCircle2 className="h-4 w-4" />
          En Orden
        </Button>
      </div>

      {/* Grid — CSS animations instead of framer-motion */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {maintenanceData.map((data, i) => (
          <div
            key={data.vehicle.id}
            className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
            style={{ animationDelay: `${i * 50}ms`, animationDuration: '250ms' }}
          >
            <MaintenanceCard 
              data={data} 
              onViewDetail={() => openDetail(data)} 
              onViewHistory={openHistory}
              onDelete={handleDeleteVehicle}
            />
          </div>
        ))}
      </div>

      <MaintenanceDetailModal 
        isOpen={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        data={selectedData} 
      />

      <VehicleMaintenanceHistoryModal
        isOpen={historyOpen}
        onOpenChange={setHistoryOpen}
        vehicle={historyVehicle}
      />

      {/* AlertDialog para confirmar la eliminación */}
      <AlertDialog open={!!vehicleToDelete} onOpenChange={(open) => !open && setVehicleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este vehículo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el vehículo y todo su historial de mantenimiento asociado. No podrás deshacer esta acción.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteVehicle} className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
              Sí, Eliminar Vehículo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function getMaintenanceCategoryFromText(category?: string): string {
  const cat = category?.toLowerCase() || '';
  if (cat.includes('motor')) return 'engine';
  if (cat.includes('freno')) return 'brakes';
  if (cat.includes('neumatic') || cat.includes('neumátic') || cat.includes('llanta')) return 'tires';
  if (cat.includes('electr') || cat.includes('eléctr') || cat.includes('bater')) return 'battery';
  if (cat.includes('suspens')) return 'suspension';
  if (cat.includes('transmi')) return 'transmission';
  if (cat.includes('enfria') || cat.includes('cool')) return 'cooling';
  if (cat.includes('aire') || cat.includes('a/c') || cat.includes('ac')) return 'ac';
  if (cat.includes('direcc') || cat.includes('steer')) return 'steering';
  return 'others';
}

const CATEGORY_LABELS: Record<string, string> = {
  engine: 'Motor',
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

const MaintenanceCard = memo(function MaintenanceCard({ 
  data, 
  onViewDetail,
  onViewHistory,
  onDelete
}: { 
  data: any; 
  onViewDetail: () => void;
  onViewHistory: (vehicle: any) => void;
  onDelete: (vehicleId: string) => void;
}) {
  const { vehicle, customer, items, minPercentage, status } = data;

  const statusConfig = {
    critical: { color: "rose", bg: "bg-rose-50", border: "border-rose-100", text: "text-rose-700", accent: "bg-rose-600" },
    preventive: { color: "amber", bg: "bg-amber-50", border: "border-amber-100", text: "text-amber-700", accent: "bg-amber-500" },
    healthy: { color: "emerald", bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-700", accent: "bg-emerald-600" },
  };

  const config = statusConfig[status as keyof typeof statusConfig];

  return (
    <Card 
      onClick={onViewDetail}
      className={cn("group overflow-hidden border-none shadow-sm ring-1 transition-all hover:shadow-xl hover:ring-2 cursor-pointer active:scale-[0.99]", 
        status === 'critical' ? "ring-rose-200 hover:ring-rose-400" : 
        status === 'preventive' ? "ring-amber-200 hover:ring-amber-400" : "ring-neutral-100 hover:ring-neutral-200")}
    >
      
      <div className={cn("h-1.5 w-full", config.accent)} />
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", config.bg)}>
              <Car className={cn("h-5 w-5", config.text)} />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-neutral-900 group-hover:text-black transition-colors">
                {vehicle.brand} {vehicle.model}
              </CardTitle>
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <span className="font-mono bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-700 font-bold uppercase">{vehicle.plate}</span>
                <span>•</span>
                <span>{vehicle.year}</span>
              </div>
            </div>
          </div>
          <Badge className={cn("font-bold border-none", 
            status === 'critical' ? "bg-rose-100 text-rose-700" : 
            status === 'preventive' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>
            {minPercentage}%
          </Badge>
        </div>
      </CardHeader>
 
      <CardContent className="space-y-4">
        {/* Customer Info */}
        <div className="flex items-center justify-between rounded-xl bg-neutral-50 p-3">
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-neutral-400" />
            <span className="text-xs font-semibold text-neutral-700">{customer?.name}</span>
          </div>
          <span className="text-[10px] text-neutral-400 font-medium">{customer?.phone}</span>
        </div>
 
        {/* Services List */}
        <div className="space-y-3">
          {items.slice(0, 3).map((item: any) => (
            <div key={item.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
                <div className="flex flex-col">
                  <span className="text-neutral-900">{CATEGORY_LABELS[item.category] || 'Mantenimiento'}</span>
                  <span className="text-[9.5px] text-neutral-500 font-medium normal-case tracking-normal mt-0.5 leading-tight">
                    ↳ {item.name}
                  </span>
                </div>
                <span className={cn(
                  item.currentPercentage <= 10 ? "text-rose-600" : 
                  item.currentPercentage <= 30 ? "text-amber-600" : "text-emerald-600"
                )}>{item.currentPercentage}%</span>
              </div>
              <Progress 
                value={item.currentPercentage} 
                className="h-1.5 bg-neutral-100" 
                indicatorClassName={cn(
                  item.currentPercentage <= 10 ? "bg-rose-500" : 
                  item.currentPercentage <= 30 ? "bg-amber-400" : "bg-emerald-500"
                )}
              />
            </div>
          ))}
          {items.length > 3 && (
            <p className="text-[10px] text-center text-neutral-400 font-medium">+{items.length - 3} servicios adicionales</p>
          )}
        </div>
 
        {/* Quick Action */}
        <div className="pt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button 
            className="flex-1 rounded-xl bg-neutral-900 hover:bg-black text-[12px] font-bold h-9"
            onClick={onViewDetail}
          >
            Ver Detalle
            <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-xl h-9 w-9 border-neutral-100 hover:bg-emerald-50 active:scale-95 transition-all"
            onClick={() => onViewHistory(vehicle)}
            title="Ver Historial de Mantenimientos"
          >
            <History className="h-4 w-4 text-emerald-600" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-xl h-9 w-9 border-neutral-100 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            onClick={() => onDelete(vehicle.id)}
          >
            <Trash2 className="h-4 w-4 text-rose-600" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});
