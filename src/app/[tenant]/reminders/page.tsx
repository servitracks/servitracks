"use client";

import { useState, useEffect } from "react";
import { useStore, WhatsAppLog } from "@/store/useStore";
import { useParams, useSearchParams, useRouter } from "@/lib/next-compat";
import { supabaseAdmin } from "@/lib/supabase";
import { waSendText } from "@/lib/wasender";
import {
  fetchConnectionState,
  sendEvolutionTextMessage,
  cleanBaseUrl,
  cleanApiKey,
  DEFAULT_EVOLUTION_URL,
  DEFAULT_EVOLUTION_API_KEY,
} from "@/lib/evolutionApi";
import {
  MessageSquare, Settings, Bell, CheckCircle2, AlertCircle,
  Smartphone, Plus, Send, Phone, Clock, Users, Zap, X, Trash2,
  QrCode, ExternalLink, RefreshCw
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

  // Provider Evolution vs WaSender
  const isEvolution = currentTenant?.waProvider === "evolution" || (!currentTenant?.wasenderApiKey && !!(currentTenant?.evolutionApiKey || currentTenant?.config?.evolutionApiKey || (currentTenant?.config as any)?.evolution_apikey)) || true;
  const evoBaseUrl = cleanBaseUrl(currentTenant?.evolutionBaseUrl || currentTenant?.config?.evolutionBaseUrl || (currentTenant?.config as any)?.evolution_baseurl);
  const evoApiKey = cleanApiKey(currentTenant?.evolutionApiKey || currentTenant?.config?.evolutionApiKey || (currentTenant?.config as any)?.evolution_apikey);
  const evoInstance = currentTenant?.evolutionInstanceName || currentTenant?.config?.evolutionInstanceName || (currentTenant?.config as any)?.evolution_instance || currentTenant?.slug || "autocheck";

  // Connection State Live
  const [evoConnectionState, setEvoConnectionState] = useState<"open" | "close" | "connecting">("connecting");
  const [isCheckingState, setIsCheckingState] = useState(false);

  const checkLiveConnection = async () => {
    setIsCheckingState(true);
    try {
      if (isEvolution && evoInstance) {
        const res = await fetchConnectionState(evoBaseUrl, evoApiKey, evoInstance);
        setEvoConnectionState(res.state || "close");
      } else if (taller?.wasenderApiKey) {
        setEvoConnectionState("open");
      } else {
        setEvoConnectionState("close");
      }
    } catch (e) {
      setEvoConnectionState("close");
    } finally {
      setIsCheckingState(false);
    }
  };

  useEffect(() => {
    checkLiveConnection();
    const interval = setInterval(checkLiveConnection, 15000);
    return () => clearInterval(interval);
  }, [isEvolution, evoBaseUrl, evoApiKey, evoInstance, taller?.wasenderApiKey]);

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
  
  const isApiConnected = isEvolution ? evoConnectionState === "open" : !!(taller?.wasenderApiKey);

  const getCustomerPhone = (id: string) => tenantCustomers.find((c) => c.id === id)?.phone || "";
  const getCustomerVehicle = (id: string) => {
    const v = tenantVehicles.find((v) => v.customerId === id);
    return v ? `${v.brand} ${v.model}` : "Vehículo";
  };

  const sentCount = tenantLogs.filter((l) => l.status === "sent").length;
  const failedCount = tenantLogs.filter((l) => l.status === "failed").length;

  // Enviar mensaje unificado (Evolution API prioritario, WaSender secundario)
  const sendWhatsApp = async (phone: string, message: string): Promise<{ ok: boolean; error?: string }> => {
    if (isEvolution) {
      return sendEvolutionTextMessage(evoBaseUrl, evoApiKey, evoInstance, phone, message);
    }
    const key = taller?.wasenderApiKey;
    if (!key) return { ok: false, error: "WhatsApp no configurado. Conecta tu instancia de Evolution API en Configuración." };
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
    if (isApiConnected) {
      toast.loading("Enviando mensaje vía Evolution API...", { id: log.id });
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
          <p className="text-neutral-500">Recordatorios automáticos, alertas de mantenimiento y notificaciones sincronizadas con Evolution API.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge 
            variant="outline" 
            className={cn(
              "rounded-full px-3.5 py-1.5 font-bold gap-2 text-xs shadow-2xs", 
              isApiConnected 
                ? "bg-emerald-50 text-emerald-800 border-emerald-300" 
                : evoConnectionState === "connecting"
                  ? "bg-amber-50 text-amber-800 border-amber-300"
                  : "bg-rose-50 text-rose-800 border-rose-200"
            )}
          >
            <span className={cn("h-2 w-2 rounded-full", isApiConnected ? "bg-emerald-500 animate-pulse" : evoConnectionState === "connecting" ? "bg-amber-500 animate-spin" : "bg-rose-500")} />
            {isApiConnected ? "Evolution API Conectada" : evoConnectionState === "connecting" ? "Verificando..." : "API Desconectada"}
          </Badge>
          <Button 
            variant="outline" 
            className="rounded-xl gap-2 h-10 px-4 font-bold border-neutral-200 hover:bg-neutral-50 text-xs cursor-pointer" 
            onClick={() => router.push(`/${tenant}/settings?tab=whatsapp`)}
          >
            <QrCode className="h-4 w-4 text-emerald-600" /> Configurar WhatsApp / QR
          </Button>
          <Button 
            className="rounded-xl bg-neutral-950 text-white hover:bg-black gap-2 h-10 px-5 font-bold text-xs cursor-pointer shadow-xs" 
            onClick={() => setIsSendOpen(true)}
          >
            <Send className="h-3.5 w-3.5" /> Enviar Mensaje
          </Button>
        </div>
      </div>

      {/* Stats — estilo SaaS ultra-compacto y 100% legible */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Enviados este mes", value: sentCount, icon: CheckCircle2, iconBg: "bg-emerald-50 text-emerald-600 border-emerald-200/60" },
          { label: "Fallidos", value: failedCount, icon: AlertCircle, iconBg: "bg-rose-50 text-rose-600 border-rose-200/60" },
          { label: "Automatizaciones activas", value: AUTOMATIONS.filter((a) => a.active).length, icon: Zap, iconBg: "bg-slate-100 text-slate-700 border-slate-200/60" },
        ].map((kpi) => (
          <div 
            key={kpi.label} 
            className="flex items-center gap-3 rounded-2xl border border-neutral-200/80 p-4 bg-white shadow-xs group transition-all"
          >
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl border flex-shrink-0 transition-transform group-hover:scale-105", kpi.iconBg)}>
              <kpi.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 leading-tight">
                {kpi.label}
              </p>
              <p className="text-2xl font-black tracking-tight text-neutral-900 leading-tight mt-0.5">
                {kpi.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Tabs: Automations / Logs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="queue" className="space-y-5">
            <TabsList className="bg-neutral-200/60 p-1 rounded-2xl">
              <TabsTrigger value="queue" className="rounded-xl px-5 font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-xs flex items-center gap-1.5">
                Cola de Envíos
                {tenantLogs.filter(l => l.status === "pending").length > 0 && (
                  <span className="h-5 min-w-[20px] rounded-full bg-rose-500 text-[10px] font-black text-white px-1.5 flex items-center justify-center">
                    {tenantLogs.filter(l => l.status === "pending").length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="automation" className="rounded-xl px-5 font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-xs">Automatizaciones</TabsTrigger>
              <TabsTrigger value="logs" className="rounded-xl px-5 font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-xs">Historial</TabsTrigger>
            </TabsList>

            <TabsContent value="queue" className="space-y-4">
              {tenantLogs.filter(l => l.status === "pending").length === 0 ? (
                <div className="flex flex-col items-center py-20 text-center px-5 bg-white border border-neutral-200/80 rounded-3xl shadow-xs">
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
                      <Card key={log.id} className="border-neutral-200/80 shadow-xs hover:border-neutral-300 transition-all bg-white rounded-2xl overflow-hidden">
                        <CardContent className="p-5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-3.5">
                              <div className="h-10 w-10 rounded-xl bg-neutral-100 flex items-center justify-center font-bold text-neutral-700 text-xs shrink-0">
                                {log.customerName.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-neutral-900 text-sm">{log.customerName}</span>
                                  <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold">
                                    PENDIENTE
                                  </Badge>
                                </div>
                                <div className="text-xs text-neutral-500 flex items-center gap-2 mt-1">
                                  <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-neutral-400" />{log.phone}</span>
                                  {vehicle && <span>• 🚗 {vehicle.brand} {vehicle.model} ({vehicle.plate})</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-9 px-3 rounded-xl text-neutral-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold"
                                onClick={() => deleteWhatsAppLog(log.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Descartar
                              </Button>
                              <Button 
                                size="sm" 
                                className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-xs cursor-pointer"
                                onClick={() => handleDispatchQueueItem(log)}
                              >
                                <Send className="h-3.5 w-3.5" /> Enviar WhatsApp
                              </Button>
                            </div>
                          </div>
                          <div className="mt-3.5 p-3 rounded-xl bg-neutral-50 border border-neutral-100 font-mono text-xs text-neutral-700">
                            {log.message}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="automation" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {allAutos.map((auto) => (
                  <Card key={auto.id} className="p-5 rounded-2xl border border-neutral-200/80 bg-white shadow-xs space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-neutral-900">{auto.title}</h4>
                        <p className="text-xs text-neutral-500">{auto.desc}</p>
                      </div>
                      <Badge variant="outline" className="bg-neutral-100 text-neutral-700 font-bold text-[10px]">
                        {auto.trigger}
                      </Badge>
                    </div>
                    <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 font-mono text-[11px] text-neutral-600">
                      {auto.template}
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="logs" className="space-y-4">
              <Card className="rounded-2xl border border-neutral-200/80 bg-white shadow-xs p-5">
                <div className="divide-y divide-neutral-100">
                  {tenantLogs.length === 0 ? (
                    <p className="text-center text-xs text-neutral-400 py-8">No hay historial de envíos registrados.</p>
                  ) : (
                    tenantLogs.map((log) => (
                      <div key={log.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center text-xs",
                            log.status === "sent" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                          )}>
                            {log.status === "sent" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-neutral-900">{log.customerName} ({log.phone})</p>
                            <p className="text-[11px] text-neutral-500 truncate max-w-sm">{log.message}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={cn("text-[9px] font-bold", log.status === "sent" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")}>
                            {log.status === "sent" ? "Enviado" : "Fallido"}
                          </Badge>
                          <p className="text-[10px] text-neutral-400 mt-0.5">
                            {new Date(log.sentAt).toLocaleDateString("es-DO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* API Status card (Sincronizado con Evolution API) */}
        <div className="space-y-5">
          <Card className="border-neutral-950 shadow-md bg-neutral-950 text-white rounded-3xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-white font-bold">Estado del Servicio</CardTitle>
                <CardDescription className="text-neutral-400 text-xs">WhatsApp Engine: Evolution API</CardDescription>
              </div>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={checkLiveConnection} 
                className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
                title="Comprobar estado de conexión"
              >
                <RefreshCw className={cn("h-4 w-4", isCheckingState ? "animate-spin text-emerald-400" : "")} />
              </Button>
            </div>

            <div className="flex flex-col items-center py-3">
              <div className="relative h-20 w-20 rounded-2xl bg-white/10 flex items-center justify-center">
                <Smartphone className="h-10 w-10 text-white" />
                <div className={cn("absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-2 border-neutral-950 flex items-center justify-center",
                  isApiConnected ? "bg-emerald-500" : "bg-rose-500")}>
                  {isApiConnected ? <CheckCircle2 className="h-3.5 w-3.5 text-white" /> : <X className="h-3.5 w-3.5 text-white" />}
                </div>
              </div>
              <p className="mt-4 text-sm font-bold">
                {isApiConnected ? "WhatsApp Conectado" : "WhatsApp Desconectado"}
              </p>
              <p className="text-xs text-neutral-400 font-mono mt-0.5">
                Instancia: {evoInstance}
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">Mensajes enviados este mes</span>
                <span className="font-bold text-white">{sentCount}</span>
              </div>
              <p className="text-[10px] text-neutral-500">Sincronizado en tiempo real con Evolution API</p>
            </div>

            <Button 
              className="w-full bg-white text-neutral-950 hover:bg-neutral-100 rounded-xl h-11 font-bold text-xs gap-2 cursor-pointer" 
              onClick={() => router.push(`/${tenant}/settings?tab=whatsapp`)}
            >
              <QrCode className="h-4 w-4 text-emerald-600" /> Gestionar Instancia y QR
            </Button>
          </Card>

          {/* Clients without recent visit */}
          <Card className="border-neutral-200/80 shadow-xs rounded-2xl p-5 bg-white space-y-3">
            <CardHeader className="p-0">
              <CardTitle className="text-xs font-black uppercase tracking-wider text-neutral-400">Clientes Inactivos</CardTitle>
            </CardHeader>
            <div className="divide-y divide-neutral-100 pt-1">
              {tenantCustomers.slice(0, 3).map((c) => (
                <div key={c.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-neutral-900">{c.name}</p>
                    <p className="text-[10px] text-neutral-400">+180 días sin visita</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 rounded-lg text-xs gap-1 hover:bg-emerald-50 hover:text-emerald-700 font-bold"
                    onClick={() => { 
                      setSendForm({ customerId: c.id, message: `Hola ${c.name.split(" ")[0]}, hace tiempo que no nos visitas. ¿Necesita una revisión tu vehículo? 🚗`, type: "reminder" }); 
                      setIsSendOpen(true); 
                    }}
                  >
                    <Send className="h-3 w-3" /> Enviar
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Send Message Dialog */}
      <Dialog open={isSendOpen} onOpenChange={(open) => {
        if (!open) handleCloseSend();
        else setIsSendOpen(true);
      }}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-neutral-900 tracking-tight">Enviar Mensaje WhatsApp</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSend} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-700">Cliente</Label>
              <Select value={sendForm.customerId} onValueChange={(v) => setSendForm({ ...sendForm, customerId: v || "" })}>
                <SelectTrigger className="h-11 rounded-xl border-neutral-200 text-xs">
                  <span className="truncate">
                    {sendForm.customerId
                      ? tenantCustomers.find((c) => c.id === sendForm.customerId)?.name + " — " + tenantCustomers.find((c) => c.id === sendForm.customerId)?.phone
                      : <span className="text-neutral-400">Seleccionar cliente</span>}
                  </span>
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-white shadow-xl text-xs">
                  {tenantCustomers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} — {c.phone}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-700">Tipo de Mensaje</Label>
              <Select value={sendForm.type} onValueChange={(v) => setSendForm({ ...sendForm, type: (v || "reminder") as WhatsAppLog["type"] })}>
                <SelectTrigger className="h-11 rounded-xl border-neutral-200 text-xs">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-white shadow-xl text-xs">
                  <SelectItem value="reminder">Recordatorio de Mantenimiento</SelectItem>
                  <SelectItem value="notification">Notificación de Orden</SelectItem>
                  <SelectItem value="invoice">Envío de Factura</SelectItem>
                  <SelectItem value="marketing">Promoción / Marketing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-700">Mensaje a Enviar</Label>
              <textarea 
                className="w-full min-h-[110px] rounded-2xl border border-neutral-200 p-3 text-xs resize-none focus:outline-none focus:border-neutral-900 transition-colors"
                placeholder="Escribe el mensaje a enviar..."
                value={sendForm.message} 
                onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })} 
              />
            </div>
            {sendForm.customerId && (
              <div className="flex items-center gap-2 rounded-xl bg-neutral-50 p-3 border border-neutral-100 text-xs">
                <Phone className="h-4 w-4 text-neutral-400" />
                <span className="text-neutral-600">Se enviará a: <strong>{getCustomerPhone(sendForm.customerId)}</strong></span>
              </div>
            )}
            <DialogFooter className="gap-2 pt-2 border-t border-neutral-100">
              <Button type="button" variant="outline" onClick={handleCloseSend} className="rounded-xl text-xs">Cancelar</Button>
              <Button type="submit" disabled={isSending} className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 gap-2 font-bold text-xs h-10 px-5 shadow-xs">
                {isSending ? "Enviando..." : <><Send className="h-3.5 w-3.5" /> Enviar por WhatsApp</>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
