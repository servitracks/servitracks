"use client";

import { useState, useEffect } from "react";
import { useStore, WhatsAppLog } from "@/store/useStore";
import { useParams, useSearchParams, useRouter } from "@/lib/next-compat";
import { supabaseAdmin } from "@/lib/supabase";
import { waSendText } from "@/lib/wasender";
import {
  MessageSquare, Settings, Bell, CheckCircle2, AlertCircle,
  Smartphone, Plus, Send, Phone, Clock, Users, Zap, X, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const AUTOMATIONS = [
  {
    id: "oil_change",
    title: "Próximo Cambio de Aceite",
    desc: "Enviado 3 días antes de la fecha estimada según kilometraje.",
    trigger: "Automático",
    active: true,
    template: "Hola {nombre}, tu {vehiculo} tiene un cambio de aceite programado para el {fecha}. ¡Visítanos en Taller García!",
  },
  {
    id: "maintenance_6m",
    title: "Recordatorio 6 Meses",
    desc: "Clientes que no han visitado en 6 meses reciben un recordatorio.",
    trigger: "Condicional",
    active: true,
    template: "Hola {nombre}, hace mucho que no te vemos. Tu {vehiculo} puede necesitar una revisión. ¡Agenda tu cita hoy!",
  },
  {
    id: "order_ready",
    title: "Vehículo Listo",
    desc: "Enviado al marcar una orden como Finalizada.",
    trigger: "Evento",
    active: true,
    template: "¡Hola {nombre}! Tu {vehiculo} está listo para ser retirado. Taller García — {telefono}.",
  },
  {
    id: "birthday",
    title: "Felicitación de Cumpleaños",
    desc: "Enviado el día del cumpleaños del cliente con descuento especial.",
    trigger: "Fecha",
    active: false,
    template: "¡Feliz cumpleaños {nombre}! Como regalo, tienes un 10% de descuento en tu próxima visita. 🎉",
  },
];

export default function RemindersPage() {
  const { tenant } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { whatsappLogs, customers, vehicles, addWhatsAppLog, tenants, updateTenant, updateWhatsAppLog, deleteWhatsAppLog } = useStore();
  const currentTenant = tenants.find((t) => t.slug === tenant) ?? null;
  const tenantId = currentTenant?.id ?? "";
  const taller = currentTenant ?? { id: tenantId, name: "", address: "", phone: "", email: "", rnc: "", logo: "", wasenderApiKey: undefined, wasenderPhone: undefined };

  // Filtrar por tenantId para garantizar el aislamiento de datos multi-tenant
  const tenantLogs = whatsappLogs.filter((l) => !tenantId || l.tenantId === tenantId);
  const tenantCustomers = customers.filter((c) => !tenantId || c.tenantId === tenantId);
  const tenantVehicles = vehicles.filter((v) => !tenantId || v.tenantId === tenantId);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [isApiOpen, setIsApiOpen] = useState(false);
  const [apiKey, setApiKey] = useState(taller?.wasenderApiKey ?? "");
  const [apiPhone, setApiPhone] = useState(taller?.wasenderPhone ?? "");
  const [sendForm, setSendForm] = useState({ customerId: "", message: "", type: "reminder" as WhatsAppLog["type"] });

  useEffect(() => {
    const action = searchParams.get("action");
    const customerId = searchParams.get("customerId");
    if (action === "new_message") {
      setIsSendOpen(true);
      if (customerId) {
        setSendForm(f => ({ ...f, customerId }));
      }
    }
  }, [searchParams]);

  const handleCloseSend = () => {
    setIsSendOpen(false);
    setSendForm({ customerId: "", message: "", type: "reminder" });
    router.replace(`/${tenant}/reminders`);
  };
  const [isSending, setIsSending] = useState(false);
  const [editAuto, setEditAuto] = useState<(typeof AUTOMATIONS[number] & { template: string; active: boolean; kmThreshold: string; timeMonths: string; kmUnit: "km" | "mi" }) | null>(null);
  const [customAutos, setCustomAutos] = useState<Array<typeof AUTOMATIONS[number] & { template: string; active: boolean; kmThreshold: string; timeMonths: string; kmUnit: "km" | "mi" }>>([]);
  const allAutos = [...AUTOMATIONS, ...customAutos];
  const [autoStates, setAutoStates] = useState<Record<string, { template: string; active: boolean; kmThreshold: string; timeMonths: string; kmUnit: "km" | "mi" }>>(
    Object.fromEntries(AUTOMATIONS.map(a => [a.id, { template: a.template, active: a.active, kmThreshold: "", timeMonths: "", kmUnit: "km" as const }]))
  );
  const openNewAuto = () => setEditAuto({ id: `custom_${Date.now()}`, title: "", desc: "", trigger: "Automático", active: true, template: "", kmThreshold: "", timeMonths: "", kmUnit: "km" });
  const isApiConnected = !!(taller?.wasenderApiKey);

  const getCustomerPhone = (id: string) => tenantCustomers.find((c) => c.id === id)?.phone || "";
  const getCustomerVehicle = (id: string) => {
    const v = tenantVehicles.find((v) => v.customerId === id);
    return v ? `${v.brand} ${v.model}` : "Vehículo";
  };

  const sentCount = tenantLogs.filter((l) => l.status === "sent").length;
  const failedCount = tenantLogs.filter((l) => l.status === "failed").length;

  // Send via WaSender proxy Edge Function
  const sendWhatsApp = async (phone: string, message: string): Promise<{ ok: boolean; error?: string }> => {
    const key = taller?.wasenderApiKey;
    if (!key) return { ok: false, error: "API Key no configurada. Ve a Configurar Dispositivo." };
    return waSendText(key, phone, message);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendForm.customerId || !sendForm.message) {
      toast.error("Selecciona un cliente y escribe el mensaje");
      return;
    }
    const customer = tenantCustomers.find((c) => c.id === sendForm.customerId);
    if (!customer) return;
    setIsSending(true);
    try {
      const result = await sendWhatsApp(customer.phone, sendForm.message);
      const log: WhatsAppLog = {
        id: `wl${Date.now()}`,
        tenantId: tenantId,
        customerId: customer.id,
        customerName: customer.name,
        phone: customer.phone,
        type: sendForm.type,
        message: sendForm.message,
        status: result.ok ? "sent" : "failed",
        sentAt: new Date().toISOString(),
      };
      addWhatsAppLog(log);
      handleCloseSend();
      if (result.ok) {
        toast.success(`✅ Mensaje enviado a ${customer.name} (${customer.phone})`);
      } else {
        toast.error(result.error ?? "No se pudo enviar el mensaje");
      }
    } catch (err: any) {
      toast.error(`Error inesperado: ${err?.message ?? "desconocido"}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleDispatchQueueItem = async (log: WhatsAppLog) => {
    const isApiConnected = !!(taller?.wasenderApiKey);
    if (isApiConnected) {
      toast.loading("Enviando mensaje vía WaSender API...", { id: log.id });
      const res = await sendWhatsApp(log.phone, log.message);
      if (res.ok) {
        updateWhatsAppLog(log.id, { status: "sent", sentAt: new Date().toISOString() });
        toast.success(`✅ Recordatorio enviado a ${log.customerName}`, { id: log.id });
      } else {
        toast.error(`❌ Error: ${res.error ?? "No se pudo enviar"}`, { id: log.id });
      }
    } else {
      // Fallback: open WhatsApp link
      const text = log.message;
      const cleanPhone = log.phone.replace(/[^0-9]/g, '');
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');

      // Update state to sent
      updateWhatsAppLog(log.id, { status: "sent", sentAt: new Date().toISOString() });
      toast.success(`✅ Redirigido a WhatsApp para ${log.customerName}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-neutral-900">WhatsApp Automation</h1>
          <p className="text-neutral-500">Recordatorios automáticos y notificaciones con WaSender API.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={cn("rounded-full px-3 py-1.5 font-semibold gap-1.5", isApiConnected ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-neutral-100 text-neutral-500")}>
            <span className={cn("h-2 w-2 rounded-full", isApiConnected ? "bg-emerald-500 animate-pulse" : "bg-neutral-400")} />
            {isApiConnected ? "API Conectada" : "API Desconectada"}
          </Badge>
          <Button variant="outline" className="rounded-lg gap-2" onClick={() => setIsApiOpen(true)}>
            <Settings className="h-4 w-4" /> Configurar API
          </Button>
          <Button className="rounded-lg bg-black text-white hover:bg-neutral-800 gap-2" onClick={() => setIsSendOpen(true)}>
            <Send className="h-4 w-4" /> Enviar Mensaje
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Enviados este mes", value: sentCount, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Fallidos", value: failedCount, icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-50" },
          { label: "Automatizaciones activas", value: AUTOMATIONS.filter((a) => a.active).length, icon: Zap, color: "text-neutral-700", bg: "bg-neutral-50" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-neutral-100 shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0", kpi.bg)}>
                <kpi.icon className={cn("h-5 w-5", kpi.color)} />
              </div>
              <div>
                <p className="text-xs text-neutral-500 font-medium">{kpi.label}</p>
                <p className="text-xl font-black text-neutral-900">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Tabs: Automations / Logs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="queue" className="space-y-5">
            <TabsList className="bg-neutral-100 p-1 rounded-xl">
              <TabsTrigger value="queue" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-1.5">
                Cola de Envíos
                {tenantLogs.filter(l => l.status === "pending").length > 0 && (
                  <span className="h-5 min-w-[20px] rounded-full bg-rose-500 text-[10px] font-black text-white px-1.5 flex items-center justify-center">
                    {tenantLogs.filter(l => l.status === "pending").length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="automation" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">Automatizaciones</TabsTrigger>
              <TabsTrigger value="logs" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">Historial</TabsTrigger>
            </TabsList>

            <TabsContent value="queue" className="space-y-4">
              {tenantLogs.filter(l => l.status === "pending").length === 0 ? (
                <div className="flex flex-col items-center py-20 text-center px-5 bg-white border border-neutral-100 rounded-2xl shadow-sm">
                  <div className="h-14 w-14 rounded-2xl bg-neutral-50 flex items-center justify-center mb-4 border border-neutral-100">
                    <Clock className="h-6 w-6 text-neutral-400" />
                  </div>
                  <h3 className="text-base font-bold text-neutral-900">Cola de Envíos Vacía</h3>
                  <p className="text-sm text-neutral-500 max-w-sm mt-1">
                    No tienes mensajes pendientes. Ve a la sección de Mantenimiento Preventivo para programar recordatorios de desgaste.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tenantLogs.filter(l => l.status === "pending").map((log) => {
                    const vehicle = tenantVehicles.find((v) => v.customerId === log.customerId);
                    return (
                      <Card key={log.id} className="border-neutral-100 shadow-sm hover:border-neutral-200 transition-all bg-white overflow-hidden">
                        <CardContent className="p-5">
                          <div className="flex flex-col gap-4">
                            {/* Card Header info */}
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-neutral-100 flex items-center justify-center font-bold text-neutral-700 flex-shrink-0">
                                  {log.customerName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-bold text-neutral-900 text-sm leading-none">{log.customerName}</h4>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-2 py-0.5 uppercase tracking-wide">
                                      Pendiente
                                    </span>
                                  </div>
                                  <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1.5">
                                    <Phone className="h-3 w-3" /> {log.phone}
                                    {vehicle && (
                                      <>
                                        <span className="text-neutral-300">•</span>
                                        🚗 {vehicle.brand} {vehicle.model} ({vehicle.plate})
                                      </>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
                                Programado: {new Date(log.sentAt).toLocaleDateString("es-DO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>

                            {/* Editable Text Area */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Mensaje a Enviar</label>
                              <textarea
                                className="w-full min-h-[90px] rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 text-xs text-neutral-800 font-mono resize-none focus:outline-none focus:border-neutral-400 focus:bg-white transition-all leading-relaxed"
                                value={log.message}
                                onChange={(e) => updateWhatsAppLog(log.id, { message: e.target.value })}
                                placeholder="Escribe el mensaje personalizado..."
                              />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-between gap-3 pt-1 border-t border-neutral-50">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-xl text-neutral-500 hover:text-rose-600 hover:bg-rose-50 font-bold gap-1.5 h-9 px-4 text-xs"
                                onClick={() => {
                                  deleteWhatsAppLog(log.id);
                                  toast.success("Recordatorio descartado de la cola");
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Descartar
                              </Button>

                              <Button
                                className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold gap-1.5 h-9 px-5 text-xs border-none shadow-sm shadow-emerald-100"
                                onClick={() => handleDispatchQueueItem(log)}
                              >
                                <Send className="h-3.5 w-3.5" />
                                Enviar WhatsApp
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="automation" className="space-y-3">
              {AUTOMATIONS.map((auto) => {
                const state = autoStates[auto.id];
                return (
                  <Card key={auto.id} className={cn("border-neutral-100 shadow-sm hover:border-neutral-200 transition-all", !state.active && "opacity-60")}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5",
                            state.active ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-400")}>
                            <MessageSquare className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-bold text-neutral-900 text-sm">{auto.title}</h3>
                              <Badge variant="secondary" className="rounded-full bg-neutral-100 text-neutral-600 border-none text-xs">{auto.trigger}</Badge>
                              {!state.active && <Badge className="rounded-full bg-neutral-100 text-neutral-400 border-none text-xs">Inactivo</Badge>}
                            </div>
                            <p className="text-xs text-neutral-500 mb-2">{auto.desc}</p>
                            {(state.kmThreshold || state.timeMonths) && (
                              <div className="flex gap-2 mb-2 flex-wrap">
                                {state.kmThreshold && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5">
                                    🛣 Cada {Number(state.kmThreshold).toLocaleString("es-DO")} {state.kmUnit}
                                  </span>
                                )}
                                {state.timeMonths && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-2 py-0.5">
                                    🗓 Cada {state.timeMonths} {Number(state.timeMonths) === 1 ? "mes" : "meses"}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="bg-neutral-50 rounded-lg p-3 text-xs text-neutral-600 font-mono border border-neutral-100">
                              {state.template}
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 flex-shrink-0"
                          onClick={() => setEditAuto({ ...auto, template: state.template, active: state.active, kmThreshold: state.kmThreshold, timeMonths: state.timeMonths, kmUnit: state.kmUnit })}>
                          <Settings className="h-4 w-4 text-neutral-400" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              <button
                onClick={openNewAuto}
                className="w-full h-14 border-2 border-dashed border-neutral-200 rounded-xl text-neutral-500 hover:text-black hover:border-black transition-all flex items-center justify-center gap-2 text-sm font-medium">
                <Plus className="h-4 w-4" /> Nueva Automatización
              </button>
            </TabsContent>

            <TabsContent value="logs">
              <Card className="border-neutral-100 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  {tenantLogs.length === 0 ? (
                    <div className="flex flex-col items-center py-14 text-center px-5">
                      <MessageSquare className="h-10 w-10 text-neutral-200 mb-3" />
                      <p className="text-sm font-medium text-neutral-500">Sin mensajes enviados aún.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-neutral-100">
                      {[...tenantLogs].reverse().map((log) => (
                        <div key={log.id} className="flex items-start justify-between p-5 hover:bg-neutral-50/50 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className={cn("h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0",
                              log.status === "sent" ? "bg-emerald-50 text-emerald-600" : log.status === "failed" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600")}>
                              {log.status === "sent" ? <CheckCircle2 className="h-4 w-4" /> : log.status === "failed" ? <AlertCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-neutral-900">{log.customerName}</p>
                              <p className="text-xs text-neutral-500 flex items-center gap-1"><Phone className="h-3 w-3" />{log.phone}</p>
                              <p className="text-xs text-neutral-600 mt-1 max-w-xs line-clamp-2">{log.message}</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <Badge className={cn("border-none text-[10px]",
                              log.status === "sent" ? "bg-emerald-100 text-emerald-700" : log.status === "failed" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700")}>
                              {log.status === "sent" ? "Enviado" : log.status === "failed" ? "Fallido" : "Pendiente"}
                            </Badge>
                            <p className="text-[10px] text-neutral-400 mt-1">
                              {new Date(log.sentAt).toLocaleDateString("es-DO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* API Status card */}
        <div className="space-y-5">
          <Card className="border-neutral-100 shadow-sm bg-neutral-950 text-white overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base text-white">Estado del Servicio</CardTitle>
              <CardDescription className="text-neutral-400">WaSender API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-col items-center py-4">
                <div className="relative h-24 w-24 rounded-3xl bg-white/10 flex items-center justify-center">
                  <Smartphone className="h-12 w-12 text-white" />
                  <div className={cn("absolute -bottom-2 -right-2 h-8 w-8 rounded-full border-4 border-neutral-950 flex items-center justify-center",
                    isApiConnected ? "bg-emerald-500" : "bg-neutral-500")}>
                    {isApiConnected ? <CheckCircle2 className="h-4 w-4 text-white" /> : <X className="h-4 w-4 text-white" />}
                  </div>
                </div>
                <p className="mt-5 text-sm font-semibold">WaSender · {isApiConnected ? "Conectado" : "Desconectado"}</p>
                <p className="text-xs text-neutral-500">{taller?.wasenderPhone || "Número no configurado"}</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Mensajes este mes</span>
                  <span className="font-bold">{sentCount} / 5,000</span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-white rounded-full" style={{ width: `${Math.min((sentCount / 5000) * 100, 100)}%` }} />
                </div>
                <p className="text-[10px] text-neutral-500">Plan Pro · 5,000 mensajes mensuales</p>
              </div>
              <Button className="w-full bg-white text-black hover:bg-neutral-100 rounded-xl h-11 font-bold gap-2" onClick={() => setIsApiOpen(true)}>
                <Settings className="h-4 w-4" /> Configurar Dispositivo
              </Button>
            </CardContent>
          </Card>

          {/* Clients without recent visit */}
          <Card className="border-neutral-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-neutral-400">Clientes Inactivos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tenantCustomers.slice(0, 3).map((c) => (
                <div key={c.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-bold text-neutral-600">
                      {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{c.name}</p>
                      <p className="text-xs text-neutral-400">+180 días sin visita</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 rounded-lg text-xs gap-1 hover:bg-emerald-50 hover:text-emerald-700"
                    onClick={() => { setSendForm({ customerId: c.id, message: `Hola ${c.name.split(" ")[0]}, hace tiempo que no nos visitas. ¿Necesita una revisión tu vehículo? 🚗`, type: "reminder" }); setIsSendOpen(true); }}>
                    <Send className="h-3 w-3" /> Enviar
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Send Message Dialog */}
      <Dialog open={isSendOpen} onOpenChange={(open) => {
        if (!open) handleCloseSend();
        else setIsSendOpen(true);
      }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="text-xl font-bold">Enviar Mensaje WhatsApp</DialogTitle></DialogHeader>
          <form onSubmit={handleSend} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select value={sendForm.customerId} onValueChange={(v) => setSendForm({ ...sendForm, customerId: v || "" })}>
                <SelectTrigger className="h-10 rounded-xl border-neutral-200">
                  <span className="truncate text-sm">
                    {sendForm.customerId
                      ? tenantCustomers.find((c) => c.id === sendForm.customerId)?.name + " — " + tenantCustomers.find((c) => c.id === sendForm.customerId)?.phone
                      : <span className="text-neutral-400">Seleccionar cliente</span>}
                  </span>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {tenantCustomers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} — {c.phone}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={sendForm.type} onValueChange={(v) => setSendForm({ ...sendForm, type: (v || "reminder") as WhatsAppLog["type"] })}>
                <SelectTrigger className="h-10 rounded-xl border-neutral-200">
                  <span className="text-sm">{(({
                    reminder: "Recordatorio",
                    notification: "Notificación",
                    invoice: "Factura",
                    marketing: "Marketing",
                  } as Record<string, string>)[sendForm.type] ?? sendForm.type)}</span>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="reminder">Recordatorio</SelectItem>
                  <SelectItem value="notification">Notificación</SelectItem>
                  <SelectItem value="invoice">Factura</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Mensaje</Label>
              <textarea className="w-full min-h-[100px] rounded-xl border border-neutral-200 p-3 text-sm resize-none focus:outline-none focus:border-neutral-400 transition-colors"
                placeholder="Escribe el mensaje a enviar..."
                value={sendForm.message} onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })} />
            </div>
            {sendForm.customerId && (
              <div className="flex items-center gap-2 rounded-xl bg-neutral-50 p-3 border border-neutral-100">
                <Phone className="h-4 w-4 text-neutral-400" />
                <span className="text-sm text-neutral-600">Se enviará a: <strong>{getCustomerPhone(sendForm.customerId)}</strong></span>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseSend} className="rounded-xl">Cancelar</Button>
              <Button type="submit" disabled={isSending} className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 gap-2">
                {isSending ? "Enviando..." : <><Send className="h-4 w-4" /> Enviar por WhatsApp</>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* API Config Dialog */}
      <Dialog open={isApiOpen} onOpenChange={setIsApiOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Configurar WaSender API</DialogTitle>
            <p className="text-sm text-neutral-500">Consigue tu API key en <a href="https://wasenderapi.com" target="_blank" className="text-black font-medium underline">wasenderapi.com</a></p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>API Key</Label>
              <Input type="password" placeholder="Bearer token de WaSender..." className="h-10 rounded-xl border-neutral-200"
                value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Número de WhatsApp del Taller</Label>
              <Input type="tel" placeholder="+1809XXXXXXX" className="h-10 rounded-xl border-neutral-200"
                value={apiPhone} onChange={(e) => setApiPhone(e.target.value)} />
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-xs text-amber-700 space-y-1">
              <p className="font-bold">📱 Cómo conectar:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Crea cuenta en wasenderapi.com</li>
                <li>Escanea el QR con tu WhatsApp</li>
                <li>Copia tu Bearer Token y pégalo arriba</li>
              </ol>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApiOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button className="rounded-xl bg-black text-white hover:bg-neutral-800" onClick={async () => {
              if (!apiKey.trim()) { toast.error("Ingresa tu API Key"); return; }
              // 1. Update local store for immediate reactivity
              updateTenant(taller.id, { wasenderApiKey: apiKey.trim(), wasenderPhone: apiPhone.trim() });
              // 2. Persist to Supabase so it survives across devices
              const { error } = await supabaseAdmin
                .from("tenants")
                .update({ wasender_api_key: apiKey.trim(), wasender_phone: apiPhone.trim() })
                .eq("id", taller.id);
              if (error) {
                console.error("Error saving WaSender to Supabase:", error);
                toast.warning("Guardado localmente. Error al sincronizar con servidor.");
              } else {
                toast.success("Configuración de WaSender guardada correctamente");
              }
              setIsApiOpen(false);
            }}>
              Guardar Configuración
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Automation Dialog — Split View (light) */}
      <Dialog open={!!editAuto} onOpenChange={(o) => !o && setEditAuto(null)}>
        <DialogContent className="!max-w-2xl rounded-2xl p-0 overflow-hidden">
          {editAuto && (
            <div className="flex min-h-0">

              {/* LEFT — light panel: triggers */}
              <div className="w-64 flex-shrink-0 bg-neutral-50 border-r border-neutral-100 flex flex-col p-5 gap-4">
                {/* Header */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-0.5">Automatización</p>
                  <h2 className="text-sm font-black text-neutral-900 leading-snug">{editAuto.title || "Nueva Automatización"}</h2>
                  <span className="inline-block mt-1 text-[10px] font-semibold bg-neutral-200 text-neutral-600 rounded-full px-2 py-0.5">{editAuto.trigger}</span>
                </div>

                <div className="h-px bg-neutral-200" />

                {/* KM threshold */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-neutral-700">
                      Por {editAuto.kmUnit === "mi" ? "Millaje" : "Kilometraje"}
                    </p>
                    <div className="flex items-center gap-0.5 bg-neutral-100 rounded-lg p-0.5">
                      {(["km", "mi"] as const).map(u => (
                        <button key={u} type="button"
                          onClick={() => setEditAuto({ ...editAuto, kmUnit: u })}
                          className={cn("px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all",
                            editAuto.kmUnit === u ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700")}>
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="number"
                    placeholder={`Ej: ${editAuto.kmUnit === "mi" ? "3,000 mi" : "5,000 km"}`}
                    className="w-full h-9 rounded-xl border border-neutral-200 bg-white px-3 text-xs focus:outline-none focus:border-neutral-400 transition-colors"
                    value={editAuto.kmThreshold}
                    onChange={e => setEditAuto({ ...editAuto, kmThreshold: e.target.value })}
                  />
                  <p className="text-[10px] text-neutral-400">
                    {editAuto.kmThreshold ? `Cada ${Number(editAuto.kmThreshold).toLocaleString("es-DO")} ${editAuto.kmUnit} desde el último servicio.` : "Opcional — deja vacío para omitir."}
                  </p>
                </div>

                {/* Time threshold */}
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-neutral-700">Por Tiempo (meses)</p>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number" min="1" max="24"
                      placeholder="Ej: 3"
                      className="w-16 h-8 rounded-lg bg-white border border-neutral-200 px-2.5 text-xs focus:outline-none focus:border-neutral-400 transition-colors"
                      value={editAuto.timeMonths}
                      onChange={e => setEditAuto({ ...editAuto, timeMonths: e.target.value })}
                    />
                    <span className="text-xs text-neutral-500">meses sin servicio</span>
                  </div>
                  <p className="text-[10px] text-neutral-400">
                    {editAuto.timeMonths ? `Recordatorio cada ${editAuto.timeMonths} mes(es).` : "Opcional — deja vacío para omitir."}
                  </p>
                </div>

                {/* Active toggle */}
                <div className="mt-auto pt-3 border-t border-neutral-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-neutral-900">Activa</p>
                    <p className="text-[10px] text-neutral-400">Envío automático</p>
                  </div>
                  <button type="button"
                    onClick={() => setEditAuto({ ...editAuto, active: !editAuto.active })}
                    className={cn(
                      "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                      editAuto.active ? "bg-emerald-500" : "bg-neutral-300"
                    )}>
                    <span className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200",
                      editAuto.active ? "translate-x-5" : "translate-x-0"
                    )} />
                  </button>
                </div>
              </div>

              {/* RIGHT — white panel: template */}
              <div className="flex-1 flex flex-col p-5 gap-3">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Plantilla del Mensaje</h3>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Haz clic en una variable para insertarla:</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {["{nombre}", "{vehiculo}", "{fecha}", "{km}", "{telefono}"].map(v => (
                      <span key={v}
                        className="text-[10px] font-mono bg-neutral-100 text-neutral-700 rounded-md px-1.5 py-0.5 cursor-pointer hover:bg-neutral-200 transition-colors border border-neutral-200"
                        onClick={() => setEditAuto({ ...editAuto, template: editAuto.template + v })}>
                        {v}
                      </span>
                    ))}
                  </div>
                </div>

                <textarea
                  className="flex-1 min-h-[130px] w-full rounded-xl border border-neutral-200 p-3 text-sm font-mono resize-none focus:outline-none focus:border-neutral-400 transition-colors bg-white"
                  placeholder="Hola {nombre}, tu {vehiculo} tiene un servicio programado..."
                  value={editAuto.template}
                  onChange={e => setEditAuto({ ...editAuto, template: e.target.value })}
                />

                {/* Preview */}
                {editAuto.template && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Vista previa</p>
                    <p className="text-xs text-emerald-900 leading-relaxed">
                      {editAuto.template
                        .replace("{nombre}", "Carlos")
                        .replace("{vehiculo}", "Toyota Hilux")
                        .replace("{fecha}", new Date(Date.now() + 7 * 864e5).toLocaleDateString("es-DO", { day: "2-digit", month: "long" }))
                        .replace("{km}", editAuto.kmThreshold ? Number(editAuto.kmThreshold).toLocaleString("es-DO") + " " + editAuto.kmUnit : "5,000 km")
                        .replace("{telefono}", "+1 809-555-0101")}
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" className="rounded-xl h-9 px-5 text-sm" onClick={() => setEditAuto(null)}>Cancelar</Button>
                  <Button className="rounded-xl h-9 px-6 text-sm bg-neutral-900 text-white hover:bg-neutral-800" onClick={() => {
                    setAutoStates(prev => ({ ...prev, [editAuto.id]: { template: editAuto.template, active: editAuto.active, kmThreshold: editAuto.kmThreshold, timeMonths: editAuto.timeMonths, kmUnit: editAuto.kmUnit } }));
                    toast.success("Automatización actualizada");
                    setEditAuto(null);
                  }}>Guardar</Button>
                </div>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
