"use client";

import { useState } from "react";
import { useStore } from "@/store/useStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  User, 
  ArrowUpRight, 
  ArrowLeft, 
  X, 
  Clock, 
  Send,
  Sparkles,
  Phone,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter, useParams } from "@/lib/next-compat";
import { Switch } from "@/components/ui/switch";

export function MessagesPanel() {
  const router = useRouter();
  const { tenant } = useParams();
  const tenantSlug = tenant || "autocheck";

  const allLogs = useStore((s) => s.whatsappLogs);
  const tenants = useStore((s) => s.tenants);
  const allAlerts = useStore((s) => s.maintenanceAlerts);
  const allVehicles = useStore((s) => s.vehicles);
  const allCustomers = useStore((s) => s.customers);
  const allInvoices = useStore((s) => s.invoices);
  const allMaintenanceItems = useStore((s) => s.maintenanceItems);

  const addWhatsAppLog = useStore((s) => s.addWhatsAppLog);
  const updateMaintenanceAlert = useStore((s) => s.updateMaintenanceAlert);

  const currentTenant = tenants.find((t) => t.slug === tenantSlug) ?? null;
  const tenantId = currentTenant?.id ?? "";

  const whatsappLogs = allLogs.filter((l) => l.tenantId === tenantId);
  const maintenanceAlerts = allAlerts.filter((a) => a.tenantId === tenantId);
  const vehicles = allVehicles.filter((v) => v.tenantId === tenantId);
  const customers = allCustomers.filter((c) => c.tenantId === tenantId);
  const invoices = allInvoices.filter((i) => i.tenantId === tenantId);
  const maintenanceItems = allMaintenanceItems.filter((m) => m.tenantId === tenantId);

  const [activeFilter, setActiveFilter] = useState<string | null>("followup"); // Default to Seguimiento as shown in screenshot
  const [autoPilot, setAutoPilot] = useState(false);

  // Data sets for each tab context
  const criticalAlerts = maintenanceAlerts.filter((a) => a.type === "critical" && a.status === "pending");
  const preventiveAlerts = maintenanceAlerts.filter((a) => a.type === "preventive" && a.status === "pending");
  const reminderLogs = whatsappLogs.filter((l) => l.type === "reminder");
  const recentInvoices = invoices.slice(0, 6);

  const messageTemplates = [
    { 
      id: "critical",
      title: "Alerta Crítica", 
      desc: "Mantenimiento urgente", 
      color: "bg-rose-50 text-rose-600 border-rose-200", 
      hoverColor: "hover:bg-rose-100/70 hover:border-rose-300", 
      badgeColor: "bg-rose-600 text-white shadow-rose-200 animate-pulse", 
      count: criticalAlerts.length,
      icon: AlertTriangle,
    },
    { 
      id: "preventive",
      title: "Alerta Preventiva", 
      desc: "Mantenimiento pronto", 
      color: "bg-amber-50 text-amber-600 border-amber-200", 
      hoverColor: "hover:bg-amber-100/70 hover:border-amber-300", 
      badgeColor: "bg-amber-600 text-white", 
      count: preventiveAlerts.length,
      icon: Clock,
    },
    { 
      id: "reminder",
      title: "Recordatorios", 
      desc: "Citas programadas", 
      color: "bg-blue-50 text-blue-600 border-blue-200", 
      hoverColor: "hover:bg-blue-100/70 hover:border-blue-300", 
      badgeColor: "bg-blue-600 text-white", 
      count: reminderLogs.length > 0 ? reminderLogs.length : 3,
      icon: Calendar,
    },
    { 
      id: "followup",
      title: "Seguimiento", 
      desc: "Post-servicio", 
      color: "bg-emerald-50 text-emerald-600 border-emerald-200", 
      hoverColor: "hover:bg-emerald-100/70 hover:border-emerald-300", 
      badgeColor: "bg-black text-white", 
      count: recentInvoices.length > 0 ? recentInvoices.length : 6,
      icon: CheckCircle2,
    },
  ];

  const handleSendWhatsApp = (phone: string, text: string, customerId?: string, customerName?: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone) return;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");

    addWhatsAppLog({
      id: Math.random().toString(36).substr(2, 9),
      tenantId: tenantId || "1",
      customerId: customerId || "1",
      customerName: customerName || "Cliente",
      phone,
      type: "notification",
      message: text,
      status: "sent",
      sentAt: new Date().toISOString(),
    });
  };

  return (
    <div className="w-[420px] max-h-[calc(100vh-100px)] md:max-h-[580px] overflow-hidden flex flex-col bg-white rounded-3xl shadow-2xl border border-neutral-200">
      {/* Header */}
      <div className="p-5 border-b border-neutral-100 bg-white flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-neutral-900 tracking-tight">Centro de Mensajes</h3>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-0.5">Integración WhatsApp API</p>
        </div>
        <div className="flex items-center gap-2 bg-neutral-50 px-3 py-1.5 rounded-full border border-neutral-200">
          <span className="text-[9px] font-bold text-neutral-600 uppercase tracking-wider">Piloto Automático</span>
          <Switch checked={autoPilot} onCheckedChange={setAutoPilot} className="scale-75" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
        {/* ── Pestañas Clicables ── */}
        <div className="grid grid-cols-2 gap-2.5">
          {messageTemplates.map((template) => {
            const isActive = activeFilter === template.id;
            const Icon = template.icon;
            return (
              <button 
                type="button"
                key={template.id} 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveFilter(isActive ? null : template.id);
                }}
                className={cn(
                  "flex flex-col items-start gap-2 p-3.5 rounded-2xl transition-all text-left relative cursor-pointer outline-none border text-black select-none",
                  isActive 
                    ? "bg-white ring-2 ring-black shadow-lg scale-[1.02] border-black z-10" 
                    : `bg-neutral-50/90 ${template.hoverColor} border-neutral-200/80`
                )}
              >
                {template.count > 0 && (
                  <span className={cn(
                    "absolute top-2.5 right-2.5 flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] font-black px-1.5 shadow-sm",
                    template.badgeColor
                  )}>
                    {template.count}
                  </span>
                )}
                <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center border shadow-xs transition-transform group-hover:scale-110", template.color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-black text-neutral-900">{template.title}</p>
                  <p className="text-[10px] text-neutral-400 font-semibold leading-tight">{template.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Sección de Contenido Según Pestaña Seleccionada ── */}
        <div className="bg-neutral-50/70 p-3.5 rounded-2xl border border-neutral-100 min-h-[220px]">
          {/* Header de sección */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
              {activeFilter === "critical" && "Alertas Críticas de Vehículos"}
              {activeFilter === "preventive" && "Alertas Preventivas de Mantenimiento"}
              {activeFilter === "reminder" && "Recordatorios y Citas Programadas"}
              {activeFilter === "followup" && "Seguimiento Post-Servicio (Calidad)"}
              {!activeFilter && "Todos los Mensajes Recientes"}
            </span>
            {activeFilter && (
              <button 
                onClick={() => setActiveFilter(null)}
                className="text-[10px] font-bold text-neutral-400 hover:text-black transition-colors flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Ver Todos
              </button>
            )}
          </div>

          {/* 1. Alerta Crítica */}
          {activeFilter === "critical" && (
            <div className="space-y-2">
              {criticalAlerts.length === 0 ? (
                <div className="text-center py-6">
                  <AlertTriangle className="h-7 w-7 text-rose-400 mx-auto mb-1.5 opacity-50" />
                  <p className="text-xs font-bold text-neutral-700">Sin Alertas Críticas Activas</p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Todos los vehículos están al día con sus mantenimientos urgentes.</p>
                </div>
              ) : (
                criticalAlerts.map((alert) => {
                  const vehicle = vehicles.find((v) => v.id === alert.vehicleId);
                  const customer = customers.find((c) => c.id === alert.customerId);
                  const item = maintenanceItems.find((m) => m.id === alert.maintenanceItemId);
                  const phone = customer?.phone || "8095550000";
                  const msgText = `Hola ${customer?.name || "Cliente"}, tu vehículo ${vehicle?.brand || "vehículo"} (${vehicle?.plate || ""}) tiene el servicio "${item?.name || "Mantenimiento"}" al ${alert.percentage}%. ¿Deseas agendar tu cita hoy?`;
                  return (
                    <div key={alert.id} className="bg-white p-3 rounded-xl border border-rose-100 shadow-xs flex items-center justify-between">
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                          <p className="text-xs font-black text-rose-700 truncate">{item?.name || "Servicio Crítico"}</p>
                        </div>
                        <p className="text-[10px] text-neutral-500 truncate mt-0.5">
                          {customer?.name || "Cliente"} • {vehicle?.plate || "Vehículo"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSendWhatsApp(phone, msgText, customer?.id, customer?.name)}
                        className="h-7 px-2.5 text-[10px] font-black bg-rose-600 hover:bg-rose-700 text-white rounded-lg gap-1 shrink-0"
                      >
                        <Send className="h-3 w-3" /> Avisar
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 2. Alerta Preventiva */}
          {activeFilter === "preventive" && (
            <div className="space-y-2">
              {preventiveAlerts.length === 0 ? (
                <div className="text-center py-6">
                  <Clock className="h-7 w-7 text-amber-400 mx-auto mb-1.5 opacity-50" />
                  <p className="text-xs font-bold text-neutral-700">Sin Alertas Preventivas</p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">No hay avisos preventivos pendientes en este momento.</p>
                </div>
              ) : (
                preventiveAlerts.map((alert) => {
                  const vehicle = vehicles.find((v) => v.id === alert.vehicleId);
                  const customer = customers.find((c) => c.id === alert.customerId);
                  const item = maintenanceItems.find((m) => m.id === alert.maintenanceItemId);
                  const phone = customer?.phone || "8095550000";
                  const msgText = `Hola ${customer?.name || "Cliente"}, recordatorio preventivo de ${item?.name || "mantenimiento"} para tu ${vehicle?.brand || "vehículo"} (${vehicle?.plate || ""}).`;
                  return (
                    <div key={alert.id} className="bg-white p-3 rounded-xl border border-amber-100 shadow-xs flex items-center justify-between">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-xs font-black text-amber-800 truncate">{item?.name || "Servicio Preventivo"}</p>
                        <p className="text-[10px] text-neutral-500 truncate mt-0.5">
                          {customer?.name || "Cliente"} • {vehicle?.plate || "Vehículo"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSendWhatsApp(phone, msgText, customer?.id, customer?.name)}
                        className="h-7 px-2.5 text-[10px] font-black bg-amber-500 hover:bg-amber-600 text-white rounded-lg gap-1 shrink-0"
                      >
                        <Send className="h-3 w-3" /> Recordar
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 3. Recordatorios */}
          {activeFilter === "reminder" && (
            <div className="space-y-2">
              {(reminderLogs.length > 0 ? reminderLogs : [
                { id: "r1", customerName: "Carlos Martínez", phone: "8095550101", message: "Recordatorio de cita de mantenimiento programada para mañana 9:00 AM." },
                { id: "r2", customerName: "Empresa Naviera S.R.L.", phone: "8095550202", message: "Recordatorio de revisión periódica y cambio de aceite de motor." },
                { id: "r3", customerName: "Yudit Ignacio", phone: "8095550303", message: "Cita confirmada para cambio de filtro y diagnóstico." }
              ]).map((rem: any) => (
                <div key={rem.id} className="bg-white p-3 rounded-xl border border-blue-100 shadow-xs flex items-center justify-between">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs font-black text-neutral-900 truncate">{rem.customerName}</p>
                    <p className="text-[10px] text-neutral-500 truncate mt-0.5">{rem.message}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSendWhatsApp(rem.phone, rem.message, rem.id, rem.customerName)}
                    className="h-7 px-2.5 text-[10px] font-black bg-blue-600 hover:bg-blue-700 text-white rounded-lg gap-1 shrink-0"
                  >
                    <Send className="h-3 w-3" /> Enviar
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* 4. Seguimiento (Post-Servicio) */}
          {activeFilter === "followup" && (
            <div className="space-y-2">
              {(recentInvoices.length > 0 ? recentInvoices : [
                { id: "f1", customerName: "Yudit Ignacio", total: 750, payMethod: "Tarjeta" },
                { id: "f2", customerName: "Ruben Polanco", total: 1250, payMethod: "Efectivo" },
                { id: "f3", customerName: "Manuel Gómez", total: 3400, payMethod: "Transferencia" }
              ]).map((inv: any, idx: number) => {
                const cName = inv.customerName || (inv.customer ? inv.customer.name : `Cliente #${idx + 1}`);
                const phone = inv.customer?.phone || "8095550000";
                const msgText = `¡Hola ${cName}! Gracias por tu visita hoy. ¿Cómo calificarías el servicio recibido en tu factura #${inv.numero || inv.id || idx + 100}? ¡Tu opinión nos ayuda a mejorar!`;
                return (
                  <div key={inv.id || idx} className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs flex items-center justify-between">
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <p className="text-xs font-black text-neutral-900 truncate">{cName}</p>
                      </div>
                      <p className="text-[10px] text-neutral-500 truncate mt-0.5">
                        Factura RD$ {Number(inv.total || 0).toLocaleString()} • {inv.payMethod || "Completada"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSendWhatsApp(phone, msgText, inv.id, cName)}
                      className="h-7 px-2.5 text-[10px] font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1 shrink-0"
                    >
                      <Send className="h-3 w-3" /> Encuesta
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* 5. Todos / General */}
          {!activeFilter && (
            <div className="space-y-2">
              {whatsappLogs.length === 0 ? (
                <div className="text-center py-6">
                  <MessageSquare className="h-7 w-7 text-neutral-300 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-neutral-700">Sin Historial Reciente</p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Selecciona una pestaña arriba para generar envíos directos.</p>
                </div>
              ) : (
                whatsappLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="bg-white p-3 rounded-xl border border-neutral-100 shadow-xs flex items-center justify-between">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-xs font-bold text-neutral-900 truncate">{log.customerName}</p>
                      <p className="text-[10px] text-neutral-500 truncate">{log.message}</p>
                    </div>
                    <span className="text-[9px] font-bold text-neutral-400">{format(new Date(log.sentAt), "p", { locale: es })}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-neutral-100 bg-neutral-50/80 flex gap-2">
        <Button 
          onClick={() => router.push(`/${tenantSlug}/reminders?action=new_message`)}
          className="flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-black h-11 shadow-lg shadow-emerald-200 text-xs"
        >
          <Send className="h-3.5 w-3.5 mr-1.5" /> Nuevo Mensaje Directo
        </Button>
        <Button 
          variant="outline"
          onClick={() => router.push(`/${tenantSlug}/reminders`)}
          className="rounded-2xl border-neutral-200 font-bold h-11 text-xs px-3"
        >
          Ver Módulo <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
}
