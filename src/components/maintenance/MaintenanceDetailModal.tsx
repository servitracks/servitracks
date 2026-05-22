"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "@/lib/next-compat";
import { useStore } from "@/store/useStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  Zap,
  Wrench,
  Car,
  MessageSquare,
  History,
  ChevronRight,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

interface MaintenanceDetailModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  data: any;
}

export function MaintenanceDetailModal({ isOpen, onOpenChange, data }: MaintenanceDetailModalProps) {
  const { updateMaintenanceItem, addWhatsAppLog, calculateMaintenanceHealth, addMaintenanceHistoryItem, tenants } = useStore();
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    if (isOpen && data?.vehicle?.id) {
      calculateMaintenanceHealth({ [data.vehicle.id]: data.vehicle.km });
    }
  }, [isOpen, data?.vehicle?.id, data?.vehicle?.km, calculateMaintenanceHealth]);

  if (!data) return null;

  const { vehicle, customer, items, status } = data;

  const handleReset = (item: any) => {
    // Archivar ciclo previo en el historial
    addMaintenanceHistoryItem({
      id: `mh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      vehicleId: vehicle.id,
      tenantId: item.tenantId || '1',
      name: item.name,
      serviceDate: item.lastServiceDate,
      serviceKm: item.lastServiceKm,
      completedAt: new Date().toISOString(),
      notes: `Mantenimiento completado exitosamente a los ${vehicle.km || 0} km.`
    });

    updateMaintenanceItem(item.id, {
      lastServiceDate: new Date().toISOString(),
      lastServiceKm: vehicle.km || 0,
      currentPercentage: 100,
    });

    toast.success(`¡Mantenimiento archivado! Se registró el ciclo anterior en la bitácora.`);
  };

  const handleQueueWhatsApp = (item: any) => {
    const tenantSlug = (params.tenant as string) || '';
    const currentTenant = tenants.find((t) => t.slug === tenantSlug) || tenants[0];
    const tenantName = currentTenant ? currentTenant.name : 'ServiTracks';
    
    const text = `Hola ${customer.name}, te saludo de ${tenantName}. Tu vehículo ${vehicle.brand} ${vehicle.model} tiene el ${item.name} al ${item.currentPercentage}%. Te recomendamos agendar una cita pronto.`;
    
    addWhatsAppLog({
      id: `wl_pending_${Date.now()}`,
      tenantId: currentTenant?.id || '1',
      customerId: customer.id,
      customerName: customer.name,
      phone: customer.phone,
      type: 'reminder',
      message: text,
      status: 'pending',
      sentAt: new Date().toISOString()
    });

    toast.success("¡Recordatorio programado! Revisa la cola de envíos en Recordatorios.");
  };

  const handleCreateOrder = (item: any) => {
    onOpenChange(false);
    const tenant = params.tenant || 'autocheck';
    router.push(`/${tenant}/orders?customerId=${customer.id}&vehicleId=${vehicle.id}&category=${item.category}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 bg-white shadow-none overflow-y-auto"
        style={{ width: 680, maxWidth: '95vw', maxHeight: '90vh', borderRadius: 12, border: '0.5px solid #e5e5e5' }}
      >
        {/* ═══════════════ HEADER ═══════════════ */}
        <div style={{ padding: '24px 28px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Avatar */}
            <div
              style={{
                width: 48, height: 48, borderRadius: '50%',
                background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Car style={{ width: 22, height: 22, color: '#737373' }} />
            </div>

            {/* Title + Badge */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: '#171717', lineHeight: 1.2 }}>
                  {vehicle.brand} {vehicle.model}
                </span>
                <span
                  style={{
                    fontSize: 11, fontWeight: 800, lineHeight: 1,
                    padding: '4px 10px', borderRadius: 999,
                    background: status === 'critical' ? '#fee2e2' : status === 'preventive' ? '#fef3c7' : '#dcfce7',
                    color: status === 'critical' ? '#b91c1c' : status === 'preventive' ? '#a16207' : '#15803d',
                  }}
                >
                  {status === 'critical' ? 'CRÍTICO' : status === 'preventive' ? 'PREVENTIVO' : 'EN ORDEN'}
                </span>
              </div>
              <p style={{ fontSize: 13, color: '#a3a3a3', marginTop: 2, fontWeight: 500, letterSpacing: '0.02em' }}>
                PLACA: {vehicle.plate} • {vehicle.year}
              </p>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div style={{ height: 0.5, background: '#e5e5e5' }} />

        {/* ═══════════════ BODY — Two Columns ═══════════════ */}
        <div style={{ display: 'flex', gap: 16, padding: '24px 28px 28px' }}>

          {/* ── Left Column (58%) ── */}
          <div style={{ flex: '0 0 58%', minWidth: 0 }}>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#171717' }}>Servicios activos</span>
              <span
                style={{
                  fontSize: 10, fontWeight: 700, color: '#a3a3a3',
                  padding: '3px 10px', borderRadius: 999,
                  border: '0.5px solid #e5e5e5',
                }}
              >
                {items.length} TOTAL
              </span>
            </div>

            {/* Service Cards */}
            <div 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 12,
              }}
            >
              {items.map((item: any) => {
                const pct = item.currentPercentage;
                const pctColor = pct <= 10 ? '#dc2626' : pct <= 30 ? '#d97706' : '#16a34a';
                const barColor = pct <= 10 ? '#dc2626' : pct <= 30 ? '#d97706' : '#16a34a';

                return (
                  <div
                    key={item.id}
                    style={{
                      border: '0.5px solid #e5e5e5', borderRadius: 12,
                      padding: 16, background: '#fff',
                    }}
                  >
                    {/* Row: icon + name + percentage */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 4 }}>
                      <div
                        style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Wrench style={{ width: 18, height: 18, color: '#525252' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#171717', display: 'block', textTransform: 'uppercase' }}>
                          {
                            {
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
                            }[item.category as string] || 'Mantenimiento'
                          }
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#525252', display: 'block', marginTop: 2, marginBottom: 4 }}>
                          ↳ {item.name}
                        </span>
                        <span style={{ fontSize: 11, color: '#a3a3a3', fontWeight: 500 }}>
                          Último: {format(new Date(item.lastServiceDate), 'PP', { locale: es })} • {item.lastServiceKm.toLocaleString()} km
                        </span>
                      </div>
                      <span style={{ fontSize: 18, fontWeight: 800, color: pctColor, flexShrink: 0 }}>
                        {pct}%
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div style={{ margin: '12px 0 14px', height: 4, borderRadius: 2, background: '#f5f5f5', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: barColor, transition: 'width 0.4s ease' }} />
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleQueueWhatsApp(item)}
                        style={{
                          flex: 1, height: 36, borderRadius: 999,
                          border: '0.5px solid #e5e5e5', background: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          fontSize: 12, fontWeight: 700, color: '#171717', cursor: 'pointer',
                        }}
                      >
                        <Bell style={{ width: 14, height: 14 }} />
                        Programar
                      </button>
                      <button
                        onClick={() => handleCreateOrder(item)}
                        style={{
                          flex: 1, height: 36, borderRadius: 999,
                          border: 'none', background: '#171717',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer',
                        }}
                      >
                        <Wrench style={{ width: 14, height: 14 }} />
                        Crear Orden
                      </button>
                      <button
                        onClick={() => handleReset(item)}
                        title="Reiniciar ciclo / Mantenido"
                        style={{
                          width: 36, height: 36, borderRadius: 999,
                          border: '0.5px solid #e5e5e5', background: '#f5f5f5',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#525252', cursor: 'pointer', flexShrink: 0,
                        }}
                      >
                        <Zap style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Right Column (42%) ── */}
          <div style={{ flex: '0 0 42%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Cliente Card */}
            <div style={{ border: '0.5px solid #e5e5e5', borderRadius: 12, padding: 20 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 14 }}>
                Cliente
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div
                  style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: '#171717', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 800, flexShrink: 0,
                  }}
                >
                  {customer?.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#171717', display: 'block' }}>
                    {customer?.name}
                  </span>
                  <span style={{ fontSize: 13, color: '#a3a3a3', fontWeight: 500 }}>
                    {customer?.phone}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  const tenant = params.tenant || 'autocheck';
                  if (customer?.id) {
                    onOpenChange(false);
                    router.push(`/${tenant}/customers/${customer.id}`);
                  }
                }}
                style={{
                  fontSize: 12, fontWeight: 700, color: '#171717',
                  textDecoration: 'underline', background: 'none', border: 'none',
                  cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                Ver Perfil Cliente <ChevronRight style={{ width: 12, height: 12 }} />
              </button>
            </div>

            {/* Uso Actual Card */}
            <div style={{ border: '0.5px solid #e5e5e5', borderRadius: 12, padding: 20 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 16 }}>
                Uso actual
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Kilometraje */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <History style={{ width: 16, height: 16, color: '#a3a3a3' }} />
                    <span style={{ fontSize: 13, color: '#a3a3a3', fontWeight: 500 }}>Kilometraje</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#171717' }}>
                    {vehicle.km?.toLocaleString()} km
                  </span>
                </div>
                {/* Días en uso */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Calendar style={{ width: 16, height: 16, color: '#a3a3a3' }} />
                    <span style={{ fontSize: 13, color: '#a3a3a3', fontWeight: 500 }}>Días en uso</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#171717' }}>120 días</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
