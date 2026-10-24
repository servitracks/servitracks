"use client";

import { useState, useEffect, useMemo } from "react";
import { useStore, WhatsAppLog, Tenant } from "@/store/useStore";
import { useParams, useSearchParams, useRouter } from "@/lib/next-compat";
import { supabaseAdmin } from "@/lib/supabase";
import { waSendText } from "@/lib/wasender";
import {
  MessageSquare,
  Settings,
  Bell,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Plus,
  Send,
  Phone,
  Clock,
  Users,
  Zap,
  X,
  Trash2,
  Car,
  Gauge,
  Calendar,
  ShieldCheck,
  Check,
  Sparkles,
  Filter,
  ExternalLink,
  RefreshCw,
  Copy,
  ChevronRight,
  Info,
  Search,
  ArrowRight,
  UserCheck,
  Wrench,
  RotateCcw,
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
    desc: "Enviado 3 días antes de la fecha estimada según kilometraje registrado.",
    trigger: "Automático",
    category: "Mantenimiento",
    active: true,
    template: "Estimado/a {nombre}, tu vehículo {vehiculo} tiene un mantenimiento programado para la fecha {fecha}. Te invitamos a pasar por nuestro taller.",
  },
  {
    id: "maintenance_6m",
    title: "Revisión Preventiva Semestral",
    desc: "Clientes sin visitas registradas durante los últimos 6 meses.",
    trigger: "Condicional",
    category: "Seguimiento",
    active: true,
    template: "Hola {nombre}, hace tiempo que no registras servicios para tu {vehiculo}. Una inspección preventiva mantiene tu vehículo en óptimas condiciones.",
  },
  {
    id: "order_ready",
    title: "Vehículo Listo para Entrega",
    desc: "Notificación inmediata al cambiar el estado de la orden a Finalizada.",
    trigger: "Evento",
    category: "Taller",
    active: true,
    template: "Estimado/a {nombre}, tu {vehiculo} ya se encuentra listo para entrega tras completar los trabajos en taller.",
  },
  {
    id: "birthday",
    title: "Felicitación de Cumpleaños",
    desc: "Enviado de forma programada el día del cumpleaños del cliente registrado.",
    trigger: "Fecha",
    category: "Fidelización",
    active: false,
    template: "Estimado/a {nombre}, de parte de todo el equipo te felicitamos en tu día y te ofrecemos un 10% de descuento en tu próximo servicio.",
  },
];

const QUICK_TEMPLATES = [
  {
    id: "inspection_general",
    title: "Inspección General Recomendada",
    type: "reminder",
    template: "Estimado/a {nombre}, te recordamos que tu vehículo {vehiculo} tiene pendiente una inspección preventiva de fluidos y frenos. Puedes agendar tu visita respondiendo a este mensaje.",
  },
  {
    id: "quote_followup",
    title: "Seguimiento de Cotización",
    type: "notification",
    template: "Hola {nombre}, te escribimos de Servitracks para dar seguimiento a la cotización entregada para tu {vehiculo}. ¿Tienes alguna consulta sobre el presupuesto o los repuestos recomendados?",
  },
  {
    id: "parts_received",
    title: "Repuestos Disponibles en Taller",
    type: "notification",
    template: "Estimado/a {nombre}, te informamos que ya recibimos en almacén las piezas requeridas para tu {vehiculo}. Ya puedes coordinar la fecha para ingresar a taller.",
  },
  {
    id: "ready_pickup",
    title: "Aviso de Retiro y Facturación",
    type: "notification",
    template: "Hola {nombre}, los servicios de tu {vehiculo} han concluido con éxito y la inspección final fue aprobada. Puedes pasar a retirar tu vehículo en horario de taller.",
  },
];

export default function RemindersPage() {
  const { tenant } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    whatsappLogs,
    customers,
    vehicles,
    addWhatsAppLog,
    tenants,
    updateTenant,
    updateWhatsAppLog,
    deleteWhatsAppLog,
  } = useStore();

  const currentTenant = tenants.find((t) => t.slug === tenant) ?? null;
  const tenantId = currentTenant?.id ?? "";
  const taller = currentTenant ?? ({
    id: tenantId,
    name: "",
    address: "",
    phone: "",
    email: "",
    rnc: "",
    logo: "",
    wasenderApiKey: undefined,
    wasenderPhone: undefined,
    config: {},
  } as Tenant);

  // Filtrar por tenantId para garantizar aislamiento multi-tenant
  const tenantLogs = useMemo(
    () => whatsappLogs.filter((l) => !tenantId || l.tenantId === tenantId),
    [whatsappLogs, tenantId]
  );
  const tenantCustomers = useMemo(
    () => customers.filter((c) => !tenantId || c.tenantId === tenantId),
    [customers, tenantId]
  );
  const tenantVehicles = useMemo(
    () => vehicles.filter((v) => !tenantId || v.tenantId === tenantId),
    [vehicles, tenantId]
  );

  const [activeTab, setActiveTab] = useState<"queue" | "automation" | "logs" | "templates">("queue");
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilterStatus, setHistoryFilterStatus] = useState<string>("all");

  const [isSendOpen, setIsSendOpen] = useState(false);
  const [isApiOpen, setIsApiOpen] = useState(false);
  const [apiKey, setApiKey] = useState(taller?.wasenderApiKey ?? "");
  const [apiPhone, setApiPhone] = useState(taller?.wasenderPhone ?? "");
  const [sendForm, setSendForm] = useState({
    customerId: "",
    message: "",
    type: "reminder" as WhatsAppLog["type"],
  });

  useEffect(() => {
    const action = searchParams.get("action");
    const customerId = searchParams.get("customerId");
    if (action === "new_message") {
      setIsSendOpen(true);
      if (customerId) {
        setSendForm((f) => ({ ...f, customerId }));
      }
    }
  }, [searchParams]);

  const handleCloseSend = () => {
    setIsSendOpen(false);
    setSendForm({ customerId: "", message: "", type: "reminder" });
    router.replace(`/${tenant}/reminders`);
  };

  const [isSending, setIsSending] = useState(false);
  const [editAuto, setEditAuto] = useState<
    | (typeof AUTOMATIONS[number] & {
        template: string;
        active: boolean;
        kmThreshold: string;
        timeMonths: string;
        kmUnit: "km" | "mi";
      })
    | null
  >(null);

  const [customAutos, setCustomAutos] = useState<
    Array<
      typeof AUTOMATIONS[number] & {
        template: string;
        active: boolean;
        kmThreshold: string;
        timeMonths: string;
        kmUnit: "km" | "mi";
      }
    >
  >([]);

  const allAutos = [...AUTOMATIONS, ...customAutos];
  const [autoStates, setAutoStates] = useState<
    Record<
      string,
      {
        template: string;
        active: boolean;
        kmThreshold: string;
        timeMonths: string;
        kmUnit: "km" | "mi";
      }
    >
  >(
    Object.fromEntries(
      AUTOMATIONS.map((a) => [
        a.id,
        {
          template: a.template,
          active: a.active,
          kmThreshold: "",
          timeMonths: "",
          kmUnit: "km" as const,
        },
      ])
    )
  );

  useEffect(() => {
    if (taller?.config?.whatsappAutomations) {
      if (taller.config.whatsappAutomations.autoStates) {
        setAutoStates((prev) => ({ ...prev, ...taller.config!.whatsappAutomations!.autoStates }));
      }
      if (taller.config.whatsappAutomations.customAutos) {
        setCustomAutos(taller.config.whatsappAutomations.customAutos);
      }
    }
  }, [taller?.config?.whatsappAutomations]);

  const openNewAuto = () =>
    setEditAuto({
      id: `custom_${Date.now()}`,
      title: "",
      desc: "",
      trigger: "Automático",
      category: "Personalizado",
      active: true,
      template: "",
      kmThreshold: "",
      timeMonths: "",
      kmUnit: "km",
    });

  const handleSaveAutomation = (updatedAuto: typeof editAuto) => {
    if (!updatedAuto) return;
    const isCustom = updatedAuto.id.startsWith("custom_");
    let nextCustom = [...customAutos];
    if (isCustom) {
      const idx = nextCustom.findIndex((c) => c.id === updatedAuto.id);
      if (idx !== -1) {
        nextCustom[idx] = updatedAuto;
      } else {
        nextCustom.push(updatedAuto);
      }
      setCustomAutos(nextCustom);
    }
    const nextStates = {
      ...autoStates,
      [updatedAuto.id]: {
        template: updatedAuto.template,
        active: updatedAuto.active,
        kmThreshold: updatedAuto.kmThreshold,
        timeMonths: updatedAuto.timeMonths,
        kmUnit: updatedAuto.kmUnit,
      },
    };
    setAutoStates(nextStates);

    if (taller?.id) {
      const newConfig = {
        ...(taller.config || {}),
        whatsappAutomations: {
          autoStates: nextStates,
          customAutos: nextCustom,
        },
      };
      updateTenant(taller.id, { config: newConfig });
    }

    toast.success("Automatización guardada y sincronizada correctamente");
    setEditAuto(null);
  };

  const isApiConnected = !!(taller?.wasenderApiKey);

  const getCustomerPhone = (id: string) => tenantCustomers.find((c) => c.id === id)?.phone || "";
  const getCustomerVehicle = (id: string) => {
    const v = tenantVehicles.find((v) => v.customerId === id);
    return v ? `${v.brand} ${v.model}` : "Vehículo";
  };

  const sentCount = tenantLogs.filter((l) => l.status === "sent").length;
  const failedCount = tenantLogs.filter((l) => l.status === "failed").length;
  const pendingCount = tenantLogs.filter((l) => l.status === "pending").length;
  const activeAutosCount = allAutos.filter((a) => (autoStates[a.id]?.active ?? a.active)).length;

  // Send via WaSender proxy Edge Function
  const sendWhatsApp = async (phone: string, message: string): Promise<{ ok: boolean; error?: string }> => {
    const key = taller?.wasenderApiKey;
    if (!key) return { ok: false, error: "API Key no configurada. Ve a Configurar Conexión API." };
    return waSendText(key, phone, message);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendForm.customerId || !sendForm.message) {
      toast.error("Selecciona un cliente y redacta el mensaje");
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
        toast.success(`Mensaje enviado con éxito a ${customer.name} (${customer.phone})`);
      } else {
        toast.error(result.error ?? "No se pudo despachar el mensaje");
      }
    } catch (err: any) {
      toast.error(`Error inesperado: ${err?.message ?? "desconocido"}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleDispatchQueueItem = async (log: WhatsAppLog) => {
    const isConnected = !!(taller?.wasenderApiKey);
    if (isConnected) {
      toast.loading("Despachando mensaje vía API WaSender...", { id: log.id });
      const res = await sendWhatsApp(log.phone, log.message);
      if (res.ok) {
        updateWhatsAppLog(log.id, { status: "sent", sentAt: new Date().toISOString() });
        toast.success(`Recordatorio despachado a ${log.customerName}`, { id: log.id });
      } else {
        toast.error(`Error al despachar: ${res.error ?? "No se pudo conectar"}`, { id: log.id });
      }
    } else {
      const text = log.message;
      const cleanPhone = log.phone.replace(/[^0-9]/g, "");
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");
      updateWhatsAppLog(log.id, { status: "sent", sentAt: new Date().toISOString() });
      toast.success(`Abriendo WhatsApp Web para ${log.customerName}`);
    }
  };

  const filteredLogs = useMemo(() => {
    return [...tenantLogs].reverse().filter((log) => {
      const matchSearch =
        historySearch.trim() === "" ||
        log.customerName.toLowerCase().includes(historySearch.toLowerCase()) ||
        log.phone.includes(historySearch) ||
        log.message.toLowerCase().includes(historySearch.toLowerCase());
      const matchStatus =
        historyFilterStatus === "all" || log.status === historyFilterStatus;
      return matchSearch && matchStatus;
    });
  }, [tenantLogs, historySearch, historyFilterStatus]);

  return (
    <div className="space-y-6">
      {/* 1. Header Ejecutivo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shadow-sm shrink-0">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
                Centro de Automatización & WhatsApp
              </h1>
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full px-2.5 py-0.5 font-semibold text-xs gap-1.5",
                  isApiConnected
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-neutral-100 text-neutral-600 border-neutral-200"
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    isApiConnected ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"
                  )}
                />
                <span>{isApiConnected ? "API WaSender Activa" : "Modo Manual / Desconectado"}</span>
              </Badge>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Campañas de fidelización, alertas automáticas por kilometraje y notificaciones operativas de taller.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 font-semibold text-xs h-9 px-3.5 gap-1.5 shadow-2xs"
            onClick={() => setIsApiOpen(true)}
          >
            <Settings className="h-3.5 w-3.5 text-neutral-500" />
            <span>Configurar Conexión API</span>
          </Button>

          <Button
            size="sm"
            className="rounded-xl bg-neutral-900 text-white hover:bg-black font-semibold text-xs h-9 px-4 gap-1.5 shadow-xs transition-all cursor-pointer"
            onClick={() => setIsSendOpen(true)}
          >
            <Send className="h-3.5 w-3.5" />
            <span>Redactar Mensaje Directo</span>
          </Button>
        </div>
      </div>

      {/* 2. Ribbon de 4 KPI Cards Ejecutivas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          {
            label: "Enviados del Mes",
            value: sentCount,
            subtext: "Mensajes despachados con éxito",
            icon: CheckCircle2,
            iconBg: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
          },
          {
            label: "En Cola de Despacho",
            value: pendingCount,
            subtext: pendingCount > 0 ? "Pendientes de confirmación" : "Cola al día sin retrasos",
            icon: Clock,
            iconBg: pendingCount > 0 ? "bg-amber-50 text-amber-700 border-amber-200/80" : "bg-neutral-100 text-neutral-700 border-neutral-200/80",
          },
          {
            label: "Reglas Vigilantes",
            value: `${activeAutosCount} / ${allAutos.length}`,
            subtext: "Monitoreo activo de flota",
            icon: Zap,
            iconBg: "bg-blue-50 text-blue-700 border-blue-200/80",
          },
          {
            label: "Disponibles del Plan",
            value: `${Math.max(0, 5000 - sentCount)}`,
            subtext: `${sentCount} de 5,000 consumidos`,
            icon: Smartphone,
            iconBg: "bg-purple-50 text-purple-700 border-purple-200/80",
            progress: Math.min((sentCount / 5000) * 100, 100),
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="flex flex-col justify-between rounded-2xl border border-neutral-200/80 p-4 bg-white shadow-2xs transition-all hover:border-neutral-300"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                {kpi.label}
              </span>
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl border shrink-0",
                  kpi.iconBg
                )}
              >
                <kpi.icon className="h-4.5 w-4.5" />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-neutral-900 font-mono tabular-nums">
                {kpi.value}
              </div>
              <p className="text-[11px] text-neutral-400 font-medium mt-0.5">
                {kpi.subtext}
              </p>

              {kpi.progress !== undefined && (
                <div className="w-full bg-neutral-100 rounded-full h-1.5 mt-2.5 overflow-hidden border border-neutral-200/60">
                  <div
                    className="h-full bg-neutral-900 rounded-full transition-all duration-500"
                    style={{ width: `${kpi.progress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 3. Layout Principal: 8 Columnas Centro y 4 Columnas Widget Lateral */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Columna Izquierda / Centro (8 columnas) */}
        <div className="lg:col-span-8 space-y-4">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as any)}
            className="space-y-4"
          >
            <TabsList className="bg-white p-1 rounded-2xl border border-neutral-200/80 h-auto shadow-2xs flex flex-wrap sm:flex-nowrap gap-1">
              <TabsTrigger
                value="queue"
                className="flex-1 rounded-xl px-3.5 py-2 text-xs font-semibold data-[state=active]:bg-neutral-900 data-[state=active]:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Cola de Despacho</span>
                {pendingCount > 0 && (
                  <span className="h-5 min-w-[20px] rounded-full bg-amber-500 text-[10px] font-bold text-white px-1.5 flex items-center justify-center font-mono">
                    {pendingCount}
                  </span>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="automation"
                className="flex-1 rounded-xl px-3.5 py-2 text-xs font-semibold data-[state=active]:bg-neutral-900 data-[state=active]:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Zap className="h-3.5 w-3.5" />
                <span>Reglas & Automatizaciones</span>
              </TabsTrigger>

              <TabsTrigger
                value="templates"
                className="flex-1 rounded-xl px-3.5 py-2 text-xs font-semibold data-[state=active]:bg-neutral-900 data-[state=active]:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Plantillas Rápidas</span>
              </TabsTrigger>

              <TabsTrigger
                value="logs"
                className="flex-1 rounded-xl px-3.5 py-2 text-xs font-semibold data-[state=active]:bg-neutral-900 data-[state=active]:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Historial de Envíos</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: COLA DE DESPACHO */}
            <TabsContent value="queue" className="space-y-3 mt-0">
              {pendingCount === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 bg-white border border-neutral-200/80 rounded-2xl shadow-2xs text-center">
                  <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center mb-3">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <h3 className="text-base font-bold text-neutral-900">
                    Cola de envíos al día
                  </h3>
                  <p className="text-xs text-neutral-500 max-w-md mt-1 leading-relaxed">
                    No tienes mensajes pendientes en espera. Los recordatorios se encolan automáticamente cuando los vehículos de tus clientes alcanzan los umbrales de kilometraje o cuando una orden de taller cambia de estado.
                  </p>
                  <div className="flex items-center gap-2 mt-5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-neutral-200 text-xs font-semibold h-9 px-4 gap-1.5 shadow-2xs"
                      onClick={() => router.push(`/${tenant}/maintenance`)}
                    >
                      <Wrench className="h-3.5 w-3.5 text-neutral-500" />
                      <span>Ver Mantenimiento Preventivo</span>
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-xl bg-neutral-900 text-white hover:bg-black text-xs font-semibold h-9 px-4 gap-1.5 shadow-xs"
                      onClick={() => setIsSendOpen(true)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Redactar Recordatorio</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {tenantLogs
                    .filter((l) => l.status === "pending")
                    .map((log) => {
                      const vehicle = tenantVehicles.find((v) => v.customerId === log.customerId);
                      return (
                        <Card
                          key={log.id}
                          className="border border-neutral-200/80 shadow-2xs bg-white rounded-2xl overflow-hidden hover:border-neutral-300 transition-all"
                        >
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                  {log.customerName.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-bold text-neutral-900 text-sm">
                                      {log.customerName}
                                    </h4>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                      En Cola
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5 flex-wrap">
                                    <span className="flex items-center gap-1 font-mono text-[11px] text-neutral-600">
                                      <Phone className="h-3 w-3 text-neutral-400" />
                                      {log.phone}
                                    </span>
                                    {vehicle && (
                                      <>
                                        <span className="text-neutral-300">•</span>
                                        <span className="flex items-center gap-1 text-neutral-700 font-semibold text-[11px]">
                                          <Car className="h-3 w-3 text-neutral-400" />
                                          {vehicle.brand} {vehicle.model} ({vehicle.plate})
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <span className="text-[10px] text-neutral-400 font-mono font-medium">
                                Programado: {new Date(log.sentAt).toLocaleDateString("es-DO", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>

                            {/* Text Area */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                                Texto del Mensaje Personalizado
                              </label>
                              <textarea
                                className="w-full min-h-[72px] rounded-xl border border-neutral-200 bg-neutral-50/70 p-3 text-xs text-neutral-800 font-mono resize-none focus:outline-none focus:ring-1 focus:ring-black focus:bg-white transition-all leading-relaxed shadow-2xs"
                                value={log.message}
                                onChange={(e) => updateWhatsAppLog(log.id, { message: e.target.value })}
                                placeholder="Escribe el mensaje..."
                              />
                            </div>

                            {/* Buttons */}
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-100">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-xl text-neutral-500 hover:text-rose-600 hover:bg-rose-50 font-semibold gap-1.5 h-8 px-3 text-xs cursor-pointer"
                                onClick={() => {
                                  deleteWhatsAppLog(log.id);
                                  toast.success("Mensaje descartado de la cola");
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Descartar</span>
                              </Button>

                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-xl border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 font-semibold text-xs h-8 px-3 gap-1.5 shadow-2xs cursor-pointer"
                                  onClick={() => {
                                    const text = log.message;
                                    const cleanPhone = log.phone.replace(/[^0-9]/g, "");
                                    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");
                                    updateWhatsAppLog(log.id, { status: "sent", sentAt: new Date().toISOString() });
                                    toast.success(`Abriendo WhatsApp Web para ${log.customerName}`);
                                  }}
                                >
                                  <ExternalLink className="h-3.5 w-3.5 text-neutral-500" />
                                  <span>WhatsApp Web</span>
                                </Button>

                                <Button
                                  size="sm"
                                  className="rounded-xl bg-neutral-900 text-white hover:bg-black font-bold gap-1.5 h-8 px-4 text-xs shadow-2xs cursor-pointer"
                                  onClick={() => handleDispatchQueueItem(log)}
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  <span>Despachar por API</span>
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

            {/* TAB 2: REGLAS Y AUTOMATIZACIONES */}
            <TabsContent value="automation" className="space-y-3 mt-0">
              <div className="flex items-center justify-between pb-1">
                <p className="text-xs text-neutral-500">
                  Reglas que monitorean los vehículos del taller y preparan mensajes de aviso en tiempo real.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-neutral-200 text-xs font-semibold h-8 px-3 gap-1.5 shadow-2xs"
                  onClick={openNewAuto}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Nueva Regla</span>
                </Button>
              </div>

              {allAutos.map((auto) => {
                const state = autoStates[auto.id] || {
                  template: auto.template,
                  active: auto.active,
                  kmThreshold: "",
                  timeMonths: "",
                  kmUnit: "km",
                };
                return (
                  <Card
                    key={auto.id}
                    className={cn(
                      "border border-neutral-200/80 shadow-2xs bg-white rounded-2xl transition-all",
                      !state.active && "opacity-60 bg-neutral-50/50"
                    )}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <div
                            className={cn(
                              "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-2xs",
                              state.active ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-400"
                            )}
                          >
                            <MessageSquare className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-bold text-neutral-900 text-sm">{auto.title}</h3>
                              <Badge
                                variant="outline"
                                className="rounded-full bg-neutral-100 text-neutral-700 border-neutral-200 text-[10px] font-semibold"
                              >
                                {auto.trigger}
                              </Badge>
                              {!state.active && (
                                <Badge className="rounded-full bg-neutral-100 text-neutral-400 border-neutral-200 text-[10px]">
                                  Pausada
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-neutral-500">{auto.desc}</p>
                            {(state.kmThreshold || state.timeMonths) && (
                              <div className="flex gap-2 mt-2 flex-wrap">
                                {state.kmThreshold && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 rounded-full px-2 py-0.5">
                                    <Gauge className="h-3 w-3 text-blue-600" />
                                    <span>Cada {Number(state.kmThreshold).toLocaleString("es-DO")} {state.kmUnit}</span>
                                  </span>
                                )}
                                {state.timeMonths && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 rounded-full px-2 py-0.5">
                                    <Calendar className="h-3 w-3 text-amber-600" />
                                    <span>Cada {state.timeMonths} {Number(state.timeMonths) === 1 ? "mes" : "meses"}</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-xl h-8 w-8 p-0 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 shrink-0 cursor-pointer"
                            onClick={() =>
                              setEditAuto({
                                ...auto,
                                template: state.template,
                                active: state.active,
                                kmThreshold: state.kmThreshold,
                                timeMonths: state.timeMonths,
                                kmUnit: state.kmUnit,
                              })
                            }
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="bg-neutral-50/80 rounded-xl p-3 text-xs text-neutral-700 font-mono border border-neutral-200/70 leading-relaxed">
                        {state.template}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            {/* TAB 3: PLANTILLAS RÁPIDAS */}
            <TabsContent value="templates" className="space-y-3 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {QUICK_TEMPLATES.map((tmpl) => (
                  <Card
                    key={tmpl.id}
                    className="border border-neutral-200/80 shadow-2xs rounded-2xl bg-white hover:border-neutral-300 transition-all flex flex-col justify-between"
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-bold text-neutral-900">
                          {tmpl.title}
                        </CardTitle>
                        <Badge variant="outline" className="text-[10px] rounded-full border-neutral-200 text-neutral-600">
                          {tmpl.type === "reminder" ? "Recordatorio" : "Notificación"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-1 space-y-3">
                      <p className="text-xs text-neutral-600 font-mono bg-neutral-50/80 p-2.5 rounded-xl border border-neutral-100 leading-relaxed">
                        {tmpl.template}
                      </p>
                      <div className="flex justify-end gap-2 pt-1 border-t border-neutral-50">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-xl text-xs font-semibold border-neutral-200 gap-1.5"
                          onClick={() => {
                            navigator.clipboard.writeText(tmpl.template);
                            toast.success("Plantilla copiada al portapapeles");
                          }}
                        >
                          <Copy className="h-3 w-3 text-neutral-400" />
                          <span>Copiar</span>
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 rounded-xl bg-neutral-900 text-white hover:bg-black text-xs font-semibold gap-1.5"
                          onClick={() => {
                            setSendForm((prev) => ({
                              ...prev,
                              message: tmpl.template,
                              type: tmpl.type as any,
                            }));
                            setIsSendOpen(true);
                          }}
                        >
                          <Send className="h-3 w-3" />
                          <span>Usar para Enviar</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* TAB 4: HISTORIAL DE ENVÍOS */}
            <TabsContent value="logs" className="space-y-3 mt-0">
              <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-neutral-200/80 shadow-2xs flex-wrap sm:flex-nowrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <Input
                    className="pl-9 h-9 rounded-xl border-neutral-200 bg-white text-xs shadow-2xs"
                    placeholder="Buscar por cliente, teléfono o texto..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                  />
                </div>
                <Select value={historyFilterStatus} onValueChange={(v) => setHistoryFilterStatus(v || "all")}>
                  <SelectTrigger className="w-36 h-9 rounded-xl border-neutral-200 text-xs shadow-2xs bg-white">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-lg border-neutral-200">
                    <SelectItem value="all" className="text-xs">Todos los estados</SelectItem>
                    <SelectItem value="sent" className="text-xs">Enviados</SelectItem>
                    <SelectItem value="failed" className="text-xs">Fallidos</SelectItem>
                    <SelectItem value="pending" className="text-xs">En Cola</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Card className="border border-neutral-200/80 shadow-2xs rounded-2xl overflow-hidden bg-white">
                <CardContent className="p-0">
                  {filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-center px-5">
                      <MessageSquare className="h-10 w-10 text-neutral-300 mb-2" />
                      <p className="text-sm font-semibold text-neutral-700">Sin mensajes en el historial</p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Los despachos completados o fallidos quedarán archivados aquí.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-neutral-100">
                      {filteredLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-start justify-between p-4 hover:bg-neutral-50/60 transition-colors gap-3"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border",
                                log.status === "sent"
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                  : log.status === "failed"
                                  ? "bg-rose-50 text-rose-600 border-rose-200"
                                  : "bg-amber-50 text-amber-600 border-amber-200"
                              )}
                            >
                              {log.status === "sent" ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : log.status === "failed" ? (
                                <AlertCircle className="h-4 w-4" />
                              ) : (
                                <Clock className="h-4 w-4" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-neutral-900">{log.customerName}</p>
                                <span className="text-[10px] text-neutral-400 font-mono">
                                  {log.phone}
                                </span>
                              </div>
                              <p className="text-xs text-neutral-600 mt-1 max-w-md line-clamp-2 leading-relaxed">
                                {log.message}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <Badge
                              className={cn(
                                "border-none text-[10px] font-semibold px-2 py-0.5 rounded-full",
                                log.status === "sent"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : log.status === "failed"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-amber-100 text-amber-800"
                              )}
                            >
                              {log.status === "sent" ? "Enviado" : log.status === "failed" ? "Fallido" : "En Cola"}
                            </Badge>
                            <p className="text-[10px] text-neutral-400 font-mono mt-1">
                              {new Date(log.sentAt).toLocaleDateString("es-DO", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
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

        {/* Columna Lateral Derecha: Widget de Estado & Retención (4 columnas) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: Estado del Servicio WaSender */}
          <Card className="border border-neutral-200/80 shadow-2xs rounded-2xl bg-white overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b border-neutral-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
                  <Smartphone className="h-4 w-4 text-neutral-500" />
                  <span>Conexión de WhatsApp</span>
                </CardTitle>
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                    isApiConnected
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-neutral-100 text-neutral-500 border-neutral-200"
                  )}
                >
                  {isApiConnected ? "Activo" : "Sin Conexión"}
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/60 space-y-1">
                <p className="text-[11px] font-semibold text-neutral-500">Línea del Taller:</p>
                <p className="text-xs font-mono font-bold text-neutral-900">
                  {taller?.wasenderPhone || "Sin número registrado"}
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-neutral-700">
                  <span>Cuota Mensual</span>
                  <span className="font-mono">{sentCount} / 5,000</span>
                </div>
                <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden border border-neutral-200/70">
                  <div
                    className="h-full bg-neutral-900 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((sentCount / 5000) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-neutral-400">
                  Renovación automática con tu suscripción activa.
                </p>
              </div>

              <Button
                variant="outline"
                className="w-full rounded-xl border-neutral-200 bg-white hover:bg-neutral-50 font-semibold text-xs h-9 gap-1.5 shadow-2xs"
                onClick={() => setIsApiOpen(true)}
              >
                <Settings className="h-3.5 w-3.5 text-neutral-500" />
                <span>Configurar Credenciales API</span>
              </Button>
            </CardContent>
          </Card>

          {/* Card 2: Clientes Inactivos (Oportunidades de Retención) */}
          <Card className="border border-neutral-200/80 shadow-2xs rounded-2xl bg-white overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b border-neutral-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-neutral-500" />
                  <span>Oportunidades de Retención</span>
                </CardTitle>
                <span className="text-[10px] font-bold text-neutral-400 font-mono">
                  +180 días
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-2.5">
              {tenantCustomers.slice(0, 3).length === 0 ? (
                <p className="text-xs text-neutral-400 py-3 text-center">No hay clientes inactivos</p>
              ) : (
                tenantCustomers.slice(0, 3).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50/70 border border-neutral-200/60"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-neutral-200/80 text-neutral-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-neutral-900 truncate">{c.name}</p>
                        <p className="text-[10px] text-neutral-400 font-mono truncate">{c.phone}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 rounded-lg text-xs font-semibold gap-1 text-neutral-800 hover:text-black hover:bg-white shrink-0 shadow-2xs"
                      onClick={() => {
                        setSendForm({
                          customerId: c.id,
                          message: `Estimado/a ${c.name.split(" ")[0]}, hace tiempo que no registras visitas en nuestro taller. Te invitamos a una inspección de rutina para asegurar el óptimo rendimiento de tu vehículo. Saludos.`,
                          type: "reminder",
                        });
                        setIsSendOpen(true);
                      }}
                    >
                      <Send className="h-3 w-3" />
                      <span>Redactar</span>
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Card 3: Buenas Prácticas WhatsApp */}
          <Card className="border border-neutral-200/80 shadow-2xs rounded-2xl bg-neutral-50/60 p-4 space-y-2">
            <p className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Buenas Prácticas de Comunicación</span>
            </p>
            <ul className="text-[11px] text-neutral-600 space-y-1 leading-relaxed list-disc list-inside">
              <li>Envía mensajes preferentemente entre 8:30 AM y 6:30 PM.</li>
              <li>Incluye siempre la placa o modelo del vehículo en el mensaje.</li>
              <li>Verifica que el número incluya el código de área (+1 para RD).</li>
            </ul>
          </Card>
        </div>
      </div>

      {/* MODAL: Enviar Mensaje Directo */}
      <Dialog
        open={isSendOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseSend();
          else setIsSendOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl bg-white border border-neutral-200/90 shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-neutral-900">
              Redactar Mensaje WhatsApp
            </DialogTitle>
            <p className="text-xs text-neutral-500 font-normal">
              Envío personalizado directo al teléfono registrado del cliente.
            </p>
          </DialogHeader>
          <form onSubmit={handleSend} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-700">Cliente Destinatario *</Label>
              <Select
                value={sendForm.customerId}
                onValueChange={(v) => setSendForm({ ...sendForm, customerId: v || "" })}
              >
                <SelectTrigger className="h-10 rounded-xl border-neutral-200 bg-white font-medium text-xs shadow-2xs">
                  <SelectValue placeholder="Seleccionar cliente..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-lg border-neutral-200 max-h-56">
                  {tenantCustomers.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs py-2">
                      {c.name} — <span className="font-mono text-neutral-500">{c.phone}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-700">Categoría del Mensaje</Label>
              <Select
                value={sendForm.type}
                onValueChange={(v) =>
                  setSendForm({ ...sendForm, type: (v || "reminder") as WhatsAppLog["type"] })
                }
              >
                <SelectTrigger className="h-10 rounded-xl border-neutral-200 bg-white font-medium text-xs shadow-2xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-lg border-neutral-200">
                  <SelectItem value="reminder" className="text-xs py-2">Recordatorio Preventivo</SelectItem>
                  <SelectItem value="notification" className="text-xs py-2">Notificación Operativa</SelectItem>
                  <SelectItem value="invoice" className="text-xs py-2">Factura / Cobro</SelectItem>
                  <SelectItem value="marketing" className="text-xs py-2">Promoción / Fidelización</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-700">Texto del Mensaje *</Label>
              <textarea
                className="w-full min-h-[96px] rounded-xl border border-neutral-200 bg-white p-3 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-black placeholder:text-neutral-400 shadow-2xs leading-relaxed"
                placeholder="Escribe el mensaje formal para el cliente..."
                value={sendForm.message}
                onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
              />
            </div>

            {sendForm.customerId && (
              <div className="flex items-center gap-2 rounded-xl bg-neutral-50 p-2.5 border border-neutral-200/70 text-xs text-neutral-600">
                <Phone className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                <span>
                  Número destino: <strong className="font-mono text-neutral-900">{getCustomerPhone(sendForm.customerId)}</strong>
                </span>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseSend}
                className="rounded-xl font-semibold border-neutral-200 text-xs px-4 h-9 shadow-2xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSending}
                className="rounded-xl bg-neutral-900 hover:bg-black text-white font-bold text-xs px-5 h-9 shadow-sm transition-all gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSending ? "Despachando..." : "Despachar Mensaje"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Configurar API WaSender */}
      <Dialog open={isApiOpen} onOpenChange={setIsApiOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white border border-neutral-200/90 shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-neutral-900">
              Configurar Conexión WaSender API
            </DialogTitle>
            <p className="text-xs text-neutral-500 font-normal">
              Vincula tu cuenta de proveedor para automatizar despachos sin intervención manual.
            </p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-700">API Key / Token Bearer</Label>
              <Input
                type="password"
                placeholder="Bearer token provisto por la pasarela..."
                className="h-10 rounded-xl border-neutral-200 bg-white text-xs font-mono shadow-2xs"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-700">Número de WhatsApp del Taller</Label>
              <Input
                type="tel"
                placeholder="+18090000000"
                className="h-10 rounded-xl border-neutral-200 bg-white text-xs font-mono shadow-2xs"
                value={apiPhone}
                onChange={(e) => setApiPhone(e.target.value)}
              />
            </div>
            <div className="rounded-xl bg-blue-50/70 border border-blue-100 p-3.5 text-xs text-blue-900 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5 text-blue-950">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                Pasos para conectar:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-blue-800 text-[11px] leading-relaxed">
                <li>Accede a tu panel en wasenderapi.com</li>
                <li>Escanea el código QR desde WhatsApp en el teléfono del taller</li>
                <li>Genera tu Bearer Token y pégalo en el campo superior</li>
              </ol>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setIsApiOpen(false)}
              className="rounded-xl font-semibold border-neutral-200 text-xs px-4 h-9 shadow-2xs"
            >
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-neutral-900 text-white hover:bg-black font-bold text-xs px-5 h-9 shadow-sm"
              onClick={async () => {
                if (!apiKey.trim()) {
                  toast.error("Ingresa una API Key válida");
                  return;
                }
                updateTenant(taller.id, { wasenderApiKey: apiKey.trim(), wasenderPhone: apiPhone.trim() });
                const { error } = await supabaseAdmin
                  .from("tenants")
                  .update({ wasender_api_key: apiKey.trim(), wasender_phone: apiPhone.trim() })
                  .eq("id", taller.id);
                if (error) {
                  console.error("Error saving WaSender to Supabase:", error);
                  toast.warning("Guardado localmente. Error al sincronizar con servidor.");
                } else {
                  toast.success("Credenciales de WaSender guardadas con éxito");
                }
                setIsApiOpen(false);
              }}
            >
              Guardar Credenciales
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Editar Regla de Automatización */}
      <Dialog open={!!editAuto} onOpenChange={(o) => !o && setEditAuto(null)}>
        <DialogContent className="sm:max-w-2xl w-[95vw] rounded-3xl p-0 overflow-hidden bg-white border border-neutral-200/90 shadow-2xl">
          {editAuto && (
            <div className="flex flex-col sm:flex-row min-h-0">
              {/* Panel Izquierdo: Parámetros */}
              <div className="w-full sm:w-64 bg-neutral-50/80 border-b sm:border-b-0 sm:border-r border-neutral-200/80 flex flex-col p-5 gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-0.5">
                    Regla de Disparo
                  </p>
                  <h2 className="text-sm font-bold text-neutral-900 leading-snug">
                    {editAuto.title || "Nueva Automatización"}
                  </h2>
                  <Badge
                    variant="outline"
                    className="mt-1.5 text-[10px] font-semibold bg-neutral-200/60 text-neutral-700 border-neutral-200"
                  >
                    {editAuto.trigger}
                  </Badge>
                </div>

                <div className="h-px bg-neutral-200/70" />

                {/* Kilometraje */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-neutral-700">
                      Por {editAuto.kmUnit === "mi" ? "Millaje" : "Kilometraje"}
                    </p>
                    <div className="flex items-center gap-0.5 bg-neutral-200/60 rounded-lg p-0.5">
                      {(["km", "mi"] as const).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setEditAuto({ ...editAuto, kmUnit: u })}
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-bold transition-all",
                            editAuto.kmUnit === u
                              ? "bg-white text-neutral-900 shadow-2xs"
                              : "text-neutral-500 hover:text-neutral-700"
                          )}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Input
                    type="number"
                    placeholder={`Ej: ${editAuto.kmUnit === "mi" ? "3000" : "5000"}`}
                    className="h-9 rounded-xl border-neutral-200 bg-white text-xs font-mono shadow-2xs"
                    value={editAuto.kmThreshold}
                    onChange={(e) => setEditAuto({ ...editAuto, kmThreshold: e.target.value })}
                  />
                  <p className="text-[10px] text-neutral-400">
                    {editAuto.kmThreshold
                      ? `Cada ${Number(editAuto.kmThreshold).toLocaleString("es-DO")} ${editAuto.kmUnit}.`
                      : "Opcional (dejar vacío si no aplica)."}
                  </p>
                </div>

                {/* Meses */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-neutral-700">Por Tiempo Transcurrido</p>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      min="1"
                      max="24"
                      placeholder="6"
                      className="w-16 h-8 rounded-lg bg-white border-neutral-200 text-xs font-mono shadow-2xs text-center"
                      value={editAuto.timeMonths}
                      onChange={(e) => setEditAuto({ ...editAuto, timeMonths: e.target.value })}
                    />
                    <span className="text-xs text-neutral-600 font-medium">meses sin visita</span>
                  </div>
                </div>

                {/* Toggle Activo */}
                <div className="mt-auto pt-3 border-t border-neutral-200/70 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-neutral-900">Estado de Regla</p>
                    <p className="text-[10px] text-neutral-400">
                      {editAuto.active ? "Activa y vigilante" : "Pausada"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditAuto({ ...editAuto, active: !editAuto.active })}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                      editAuto.active ? "bg-neutral-900" : "bg-neutral-300"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-xs transition-transform duration-200",
                        editAuto.active ? "translate-x-4" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </div>

              {/* Panel Derecho: Plantilla */}
              <div className="flex-1 flex flex-col p-5 gap-3">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Plantilla del Mensaje</h3>
                  <p className="text-[10px] text-neutral-400 mt-0.5">
                    Haz clic en una variable para insertarla en el mensaje:
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {["{nombre}", "{vehiculo}", "{fecha}", "{km}", "{telefono}"].map((v) => (
                      <span
                        key={v}
                        className="text-[10px] font-mono bg-neutral-100 text-neutral-700 rounded-md px-2 py-0.5 cursor-pointer hover:bg-neutral-200 border border-neutral-200/80 transition-colors"
                        onClick={() => setEditAuto({ ...editAuto, template: editAuto.template + v })}
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>

                <textarea
                  className="flex-1 min-h-[120px] w-full rounded-xl border border-neutral-200 bg-white p-3 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-black transition-all leading-relaxed shadow-2xs"
                  placeholder="Estimado/a {nombre}, tu {vehiculo} tiene un servicio programado..."
                  value={editAuto.template}
                  onChange={(e) => setEditAuto({ ...editAuto, template: e.target.value })}
                />

                {/* Preview */}
                {editAuto.template && (
                  <div className="rounded-xl bg-neutral-50/90 border border-neutral-200/70 p-3 space-y-1">
                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                      Vista previa de sustitución
                    </p>
                    <p className="text-xs text-neutral-800 leading-relaxed font-sans">
                      {editAuto.template
                        .replace("{nombre}", "Carlos García")
                        .replace("{vehiculo}", "Toyota Hilux 2022")
                        .replace(
                          "{fecha}",
                          new Date(Date.now() + 7 * 864e5).toLocaleDateString("es-DO", {
                            day: "2-digit",
                            month: "long",
                          })
                        )
                        .replace(
                          "{km}",
                          editAuto.kmThreshold
                            ? Number(editAuto.kmThreshold).toLocaleString("es-DO") + " " + editAuto.kmUnit
                            : "5,000 km"
                        )
                        .replace("{telefono}", "+1 809-555-0101")}
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
                  <Button
                    variant="outline"
                    className="rounded-xl font-semibold border-neutral-200 text-xs px-4 h-9 shadow-2xs"
                    onClick={() => setEditAuto(null)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="rounded-xl bg-neutral-900 hover:bg-black text-white font-bold text-xs px-5 h-9 shadow-sm"
                    onClick={() => handleSaveAutomation(editAuto)}
                  >
                    Guardar Cambios
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
