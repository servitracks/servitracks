"use client";

import { useRouter, useParams } from "@/lib/next-compat";
import { useStore } from "@/store/useStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, MessageSquare, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AlertsPanelProps {
  onClose?: () => void;
}

export function AlertsPanel({ onClose }: AlertsPanelProps) {
  const router = useRouter();
  const params = useParams();
  const tenants = useStore((s) => s.tenants);
  const tenantSlug = (params.tenant as string) || '';
  const currentTenant = tenants.find((t) => t.slug === tenantSlug) ?? null;
  const tenantId = currentTenant?.id ?? "";

  const allAlerts = useStore((s) => s.maintenanceAlerts);
  const maintenanceAlerts = allAlerts.filter((a) => a.tenantId === tenantId);
  const allVehicles = useStore((s) => s.vehicles);
  const vehicles = allVehicles.filter((v) => v.tenantId === tenantId);
  const allCustomers = useStore((s) => s.customers);
  const customers = allCustomers.filter((c) => c.tenantId === tenantId);
  const allMaintenanceItems = useStore((s) => s.maintenanceItems);
  const maintenanceItems = allMaintenanceItems.filter((m) => m.tenantId === tenantId);
  const updateMaintenanceAlert = useStore((s) => s.updateMaintenanceAlert);
  const addWhatsAppLog = useStore((s) => s.addWhatsAppLog);
  
  const pendingAlerts = maintenanceAlerts.filter(a => a.status === 'pending');
  const criticalAlerts = pendingAlerts.filter(a => a.type === 'critical');
  const preventiveAlerts = pendingAlerts.filter(a => a.type === 'preventive');

  const handleVer = (alert: any) => {
    const tenant = params.tenant || 'autocheck';
    onClose?.();
    router.push(`/${tenant}/maintenance`);
  };

  const handleWhatsApp = (alert: any) => {
    const vehicle = vehicles.find(v => v.id === alert.vehicleId);
    const customer = customers.find(c => c.id === alert.customerId);
    const item = maintenanceItems.find(m => m.id === alert.maintenanceItemId);

    if (!customer || !vehicle || !item) return;

    const tenantSlug = (params.tenant as string) || '';
    const currentTenant = tenants.find((t) => t.slug === tenantSlug) ?? null;
    const tenantName = currentTenant ? currentTenant.name : 'ServiTracks';

    const text = `Hola ${customer.name}, te saludo de ${tenantName}. Tu vehículo ${vehicle.brand} ${vehicle.model} (${vehicle.plate}) tiene el servicio "${item.name}" al ${alert.percentage}%. Te recomendamos agendar una cita pronto. ¡Gracias!`;
    
    window.open(`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, '_blank');

    addWhatsAppLog({
      id: Math.random().toString(36).substr(2, 9),
      tenantId: currentTenant?.id || '1',
      customerId: customer.id,
      customerName: customer.name,
      phone: customer.phone,
      type: 'reminder',
      message: text,
      status: 'sent',
      sentAt: new Date().toISOString(),
    });

    updateMaintenanceAlert(alert.id, { status: 'notified' });
  };

  const renderAlert = (alert: any) => {
    const vehicle = vehicles.find(v => v.id === alert.vehicleId);
    const customer = customers.find(c => c.id === alert.customerId);
    const item = maintenanceItems.find(m => m.id === alert.maintenanceItemId);

    return (
      <div key={alert.id} className="flex gap-4 p-4 hover:bg-neutral-50 transition-colors border-b border-neutral-100 last:border-none">
        <div className={cn("h-10 w-10 shrink-0 rounded-xl flex items-center justify-center", 
          alert.type === 'critical' ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600")}>
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-black text-neutral-900">
              {item?.name} - {alert.percentage}%
            </p>
            <span className="text-[10px] font-bold text-neutral-400 capitalize">
              {format(new Date(alert.createdAt), 'HH:mm', { locale: es })}
            </span>
          </div>
          <p className="text-xs text-neutral-500 truncate">
            {vehicle?.brand} {vehicle?.model} • <span className="font-bold">{customer?.name}</span>
          </p>
          <div className="mt-3 flex gap-2">
            <Button 
              size="sm" 
              className="h-7 rounded-lg text-[10px] font-black bg-neutral-900 hover:bg-black px-3"
              onClick={() => handleVer(alert)}
            >
              Ver
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 rounded-lg text-[10px] font-black border-neutral-200 px-3 gap-1.5 text-emerald-600"
              onClick={() => handleWhatsApp(alert)}
            >
              <MessageSquare className="h-3 w-3" />
              WhatsApp
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-[380px] max-h-[600px] overflow-hidden flex flex-col bg-white rounded-3xl shadow-2xl border border-neutral-100">
      <div className="p-5 border-b border-neutral-100 bg-white sticky top-0 z-10 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-neutral-900">Alertas del Día</h3>
          <p className="text-xs text-neutral-400 font-bold">{pendingAlerts.length} alertas pendientes</p>
        </div>
        <Badge className="bg-rose-500 text-white font-black border-none px-2 rounded-lg">{pendingAlerts.length}</Badge>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Critical Section */}
        {criticalAlerts.length > 0 && (
          <div>
            <div className="px-5 py-2 bg-rose-50/50 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
              <span className="text-[10px] font-black text-rose-700 uppercase tracking-widest">Alertas Críticas (≤ 10%)</span>
            </div>
            {criticalAlerts.map(renderAlert)}
          </div>
        )}

        {/* Preventive Section */}
        {preventiveAlerts.length > 0 && (
          <div>
            <div className="px-5 py-2 bg-amber-50/50 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
              <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Alertas Preventivas (10–30%)</span>
            </div>
            {preventiveAlerts.map(renderAlert)}
          </div>
        )}

        {pendingAlerts.length === 0 && (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="h-16 w-16 rounded-3xl bg-neutral-50 flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-neutral-200" />
            </div>
            <p className="text-sm font-bold text-neutral-500 italic">No hay alertas activas hoy.</p>
          </div>
        )}
      </div>

      <div className="p-4 bg-neutral-50 border-t border-neutral-100">
        <Button 
          variant="ghost" 
          className="w-full text-xs font-black text-neutral-500 hover:text-neutral-900 hover:bg-white transition-all rounded-xl h-10"
          onClick={() => {
            pendingAlerts.forEach(a => updateMaintenanceAlert(a.id, { status: 'dismissed' }));
          }}
        >
          Limpiar todas las alertas
        </Button>
      </div>
    </div>
  );
}
