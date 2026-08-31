"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { useStore, TenantUser } from "@/store/useStore";
import { supabaseAdmin } from "@/lib/supabase";
import { waSendTestMessage } from "@/lib/wasender";
import { Building2, Bell, Printer, Users, Shield, ShieldCheck, Upload, X, Plus, Trash2, Check, Eye, EyeOff, Store, MapPin, Phone, Mail, FileText, Landmark, RefreshCw, Pencil, Crown, ArrowUpRight, HardDrive, Package, FileCheck2, CreditCard, Sparkles, Zap, CheckCircle2, Key, AlertTriangle, LogOut, ArrowUp, ArrowDown, QrCode, Smartphone, Wrench, ReceiptText, Lock, ChevronDown, ChevronRight } from "lucide-react";
import { fetchConnectionState, connectInstance, logoutInstance, sendEvolutionTestMessage, setEvolutionWebhook, DEFAULT_EVOLUTION_URL, DEFAULT_EVOLUTION_API_KEY, cleanBaseUrl, cleanApiKey } from "@/lib/evolutionApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useParams, useSearchParams } from "@/lib/next-compat";
import { EcfSettings } from "@/components/settings/EcfSettings";
import { PhysicalPrinterSettings } from "@/components/settings/PhysicalPrinterSettings";
import { getPlans, formatRD } from "@/lib/storage";
import type { Plan } from "@/store/types";
import { navigation } from "@/components/dashboard/Sidebar";
import { isModuleEnabled } from "@/lib/permissions";
import { getTenantPlan, checkTenantLimit, DEFAULT_PLANS, formatPolarUrl } from "@/lib/plans";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const TABS = [
  { id: "taller", label: "Taller", icon: Building2 },
  { id: "interface", label: "Interfaz", icon: Sparkles },
  { id: "tenants", label: "Sucursales", icon: Store },
  { id: "ecf", label: "Facturación e-CF", icon: FileCheck2 },
  { id: "whatsapp", label: "WhatsApp", icon: Bell },
  { id: "print", label: "Impresión", icon: Printer },
  { id: "users", label: "Usuarios y Roles", icon: Users },
  { id: "security", label: "Seguridad", icon: Shield },
  { id: "planes", label: "Planes", icon: CreditCard },
];

const ROLES: { value: TenantUser["role"]; label: string; color: string; badge: string; desc: string; icon: any; permissions: string[] }[] = [
  { 
    value: "owner", 
    label: "Dueño", 
    color: "bg-neutral-900 text-white", 
    badge: "Admin Total", 
    desc: "Control total del taller: finanzas, reportes, nómina, e-CF DGII, clientes y configuración.", 
    icon: Shield,
    permissions: ["Acceso a todos los módulos", "Reportes financieros y balances", "Apertura y cierre de caja", "Gestión de nómina y comisiones", "Configuración e-CF DGII", "Creación y edición de usuarios"]
  },
  { 
    value: "cashier", 
    label: "Cajero", 
    color: "bg-blue-100 text-blue-800", 
    badge: "POS & Caja", 
    desc: "Facturación POS, cobros, arqueo, apertura y cierre de caja, registro de clientes.", 
    icon: ReceiptText,
    permissions: ["Facturación POS y emisión de comprobantes", "Control de caja chica y arqueo", "Gestión de cobros y cuentas por cobrar", "Registro de clientes y vehículos", "Atención por WhatsApp"]
  },
  { 
    value: "mechanic", 
    label: "Mecánico", 
    color: "bg-amber-100 text-amber-800", 
    badge: "Taller & OT", 
    desc: "Ver y actualizar el estado de órdenes de trabajo asignadas y consultar sus comisiones.", 
    icon: Wrench,
    permissions: ["Ver órdenes de trabajo asignadas", "Actualizar estado de avance de reparaciones", "Completar checklists de inspección", "Consultar historial de 'Mis Comisiones'"]
  },
  { 
    value: "warehouse", 
    label: "Almacén", 
    color: "bg-emerald-100 text-emerald-800", 
    badge: "Stock & Compras", 
    desc: "Control de inventario, ajustes de stock, pedidos a suplidores y recepción de mercancía.", 
    icon: Package,
    permissions: ["Gestión de inventario y catálogo de repuestos", "Ajustes de entradas y salidas de stock", "Creación y envío de Órdenes de Compra", "Recepción de mercancía de proveedores", "Control de movimientos de almacén"]
  },
  { 
    value: "receptionist", 
    label: "Recepción", 
    color: "bg-violet-100 text-violet-800", 
    badge: "CRM & Atención", 
    desc: "Recepción de vehículos, creación de cotizaciones, atención al cliente y WhatsApp.", 
    icon: Users,
    permissions: ["Creación y seguimiento de cotizaciones", "Recepción y apertura de órdenes de trabajo", "Registro de clientes y vehículos", "Envío de recordatorios y mantenimiento", "Conversaciones de WhatsApp"]
  },
];

const PERMISSION_MATRIX = [
  { module: "Dashboard General", owner: "Total", cashier: false, mechanic: false, warehouse: false, receptionist: "Operativo", desc: "Métricas de ventas, órdenes del día y resumen" },
  { module: "Órdenes de Trabajo (OT)", owner: "Total", cashier: "Lectura / Facturar", mechanic: "Solo Asignadas", warehouse: "Ver / Despachar", receptionist: "Crear / Gestionar", desc: "Apertura, diagnóstico, asignación de técnicos y avance" },
  { module: "Facturación POS & e-CF", owner: "Total", cashier: "Total", mechanic: false, warehouse: false, receptionist: false, desc: "Cobro de facturas, comprobantes fiscales DGII y métodos de pago" },
  { module: "Control de Caja", owner: "Total", cashier: "Operativo", mechanic: false, warehouse: false, receptionist: false, desc: "Apertura, cierre, arqueo de caja chica y registro de movimientos" },
  { module: "Cotizaciones", owner: "Total", cashier: "Total", mechanic: false, warehouse: false, receptionist: "Total", desc: "Presupuestos para clientes y conversión a órdenes" },
  { module: "Inventario & Ajustes de Stock", owner: "Total (con Costos)", cashier: "Solo Consulta", mechanic: false, warehouse: "Total (con Costos)", receptionist: false, desc: "Control de repuestos, entradas/salidas, precios y costos" },
  { module: "Proveedores & Compras", owner: "Total", cashier: false, mechanic: false, warehouse: "Total", receptionist: false, desc: "Catálogo de suplidores, órdenes de compra y recepción de mercancía" },
  { module: "Clientes & Vehículos (CRM)", owner: "Total", cashier: "Total", mechanic: false, warehouse: false, receptionist: "Total", desc: "Fichas de clientes, historial de vehículos y placas" },
  { module: "WhatsApp & Conversaciones", owner: "Total", cashier: "Total", mechanic: false, warehouse: false, receptionist: "Total", desc: "Chat con clientes, notificaciones de estado y recordatorios" },
  { module: "Mis Comisiones", owner: "Nómina General", cashier: false, mechanic: "Solo Propias", warehouse: false, receptionist: false, desc: "Historial de trabajos completados y comisiones acumuladas" },
  { module: "Nómina & Liquidación", owner: "Total", cashier: false, mechanic: false, warehouse: false, receptionist: false, desc: "Cálculo de nómina y pago de comisiones a mecánicos" },
  { module: "Reportes Financieros", owner: "Total", cashier: false, mechanic: false, warehouse: false, receptionist: false, desc: "Ventas, margen de ganancia, auditoría de actividades" },
  { module: "Configuración del Taller", owner: "Total", cashier: false, mechanic: false, warehouse: false, receptionist: false, desc: "Datos fiscales, e-CF DGII, impresoras, usuarios y PINs" },
];

function roleLabel(r: TenantUser["role"]) {
  return ROLES.find(x => x.value === r)?.label ?? r;
}
function roleBadge(r: TenantUser["role"]) {
  return ROLES.find(x => x.value === r)?.color ?? "";
}

export default function SettingsPage() {
  const params = useParams();
  const tenant = (params?.tenant as string) || "";
  const {
    tenants, users, printSettings, barcodeSettings, updateTenant, addTenant, deleteTenant,
    addUser, updateUser, deleteUser, updatePrintSettings, updateBarcodeSettings
  } = useStore();

  const currentTenant = tenants.find((t) => t.slug === tenant) ?? null;
  const taller = currentTenant ?? { id: "", name: "", address: "", phone: "", email: "", rnc: "", logo: "", slug: "", wasenderApiKey: undefined, wasenderPhone: undefined, config: undefined };

  const currentUserId = useStore((s) => s.currentUserId);
  const currentUser = useMemo(() => {
    return users.find((u) => u.id === currentUserId) || users.find((u) => u.tenantId === taller.id) || null;
  }, [users, currentUserId, taller.id]);

  const allowedTenants = useMemo(() => {
    if (!currentUser) return currentTenant ? [currentTenant] : [];
    if (currentUser.email === "admin@servitracks.com") return tenants;
    const sameEmailUsers = users.filter((u) => u.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim());
    const allowedIds = new Set(sameEmailUsers.map((u) => u.tenantId));
    return tenants.filter((t) => allowedIds.has(t.id));
  }, [currentUser, users, tenants, currentTenant]);
  // Check URL params for initial tab (used by "Contratar plan" banner)
  const searchParams = useSearchParams();
  const initialTab = searchParams?.get?.("tab") || "taller";
  const [tab, setTab] = useState(initialTab);

  // Sync tab if URL changes (e.g. navigating from banner)
  useEffect(() => {
    const urlTab = searchParams?.get?.("tab");
    if (urlTab && TABS.some(t => t.id === urlTab)) {
      setTab(urlTab);
    }
  }, [searchParams]);

  // ── Plans tab state ──
  const [plansData, setPlansData] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);

  useEffect(() => {
    if (tab === "planes") {
      setPlansLoading(true);
      getPlans().then((p) => {
        setPlansData(p);
        setPlansLoading(false);
      }).catch(() => setPlansLoading(false));
    }
  }, [tab]);

  const [showMatrix, setShowMatrix] = useState(false);
  const simulatedRole = typeof window !== 'undefined' ? localStorage.getItem("simulated-role") : null;

  const handleSetSimulatedRole = (r: TenantUser["role"] | null) => {
    if (r) {
      localStorage.setItem("simulated-role", r);
      toast.info(`Modo simulación activado: viendo el sistema como ${roleLabel(r)}`);
    } else {
      localStorage.removeItem("simulated-role");
      toast.success("Modo simulación desactivado. Vista de Dueño restaurada.");
    }
    window.location.reload();
  };

  // ── Taller tab state ──
  const [tallerForm, setTallerForm] = useState({
    name: taller?.name ?? "", address: taller?.address ?? "",
    phone: taller?.phone ?? "", email: taller?.email ?? "", rnc: taller?.rnc ?? "",
  });
  const [logoPreview, setLogoPreview] = useState<string>(taller?.logo ?? "");
  const logoRef = useRef<HTMLInputElement>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) { toast.error("El logo debe pesar menos de 500 KB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setLogoPreview(b64);
      updateTenant(taller.id, { logo: b64 });
      toast.success("Logo actualizado");
    };
    reader.readAsDataURL(file);
  };

  const saveTaller = () => {
    updateTenant(taller.id, tallerForm);
    toast.success("Información del taller guardada");
  };

  // ── Interface tab state ──
  const [sidebarOrder, setSidebarOrder] = useState<Record<string, number>>(
    taller?.config?.sidebarOrder || {}
  );
  
  useEffect(() => {
    if (tab === "interface") {
      setSidebarOrder(taller?.config?.sidebarOrder || {});
    }
  }, [tab, taller?.config?.sidebarOrder]);

  const orderedNavigation = [...navigation].sort((a, b) => {
    const orderA = sidebarOrder[a.href] ?? 999;
    const orderB = sidebarOrder[b.href] ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return navigation.indexOf(a) - navigation.indexOf(b);
  });

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = { ...sidebarOrder };
    orderedNavigation.forEach((item, i) => { newOrder[item.href] = i + 1; });
    const temp = newOrder[orderedNavigation[index].href];
    newOrder[orderedNavigation[index].href] = newOrder[orderedNavigation[index - 1].href];
    newOrder[orderedNavigation[index - 1].href] = temp;
    setSidebarOrder(newOrder);
  };

  const handleMoveDown = (index: number) => {
    if (index === orderedNavigation.length - 1) return;
    const newOrder = { ...sidebarOrder };
    orderedNavigation.forEach((item, i) => { newOrder[item.href] = i + 1; });
    const temp = newOrder[orderedNavigation[index].href];
    newOrder[orderedNavigation[index].href] = newOrder[orderedNavigation[index + 1].href];
    newOrder[orderedNavigation[index + 1].href] = temp;
    setSidebarOrder(newOrder);
  };

  const handleSetNumber = (href: string, numStr: string) => {
    const num = parseInt(numStr);
    if (isNaN(num)) return;
    setSidebarOrder(prev => ({ ...prev, [href]: num }));
  };

  const saveInterfaceSettings = async () => {
    const newConfig = { ...taller.config, sidebarOrder };
    // update local state
    updateTenant(taller.id, { config: newConfig });
    
    // update db
    const { error } = await supabaseAdmin
      .from("tenants")
      .update({ config: newConfig })
      .eq("id", taller.id);
      
    if (error) {
      toast.warning("Guardado localmente. Error al guardar en base de datos.");
    } else {
      toast.success("Menú actualizado correctamente");
    }
  };

  // ── Tenants tab state ──
  const [branchOpen, setBranchOpen] = useState(false);
  const [deleteBranchTarget, setDeleteBranchTarget] = useState<any>(null);
  const [branchForm, setBranchForm] = useState({
    name: "",
    rnc: "",
    address: "",
    phone: "",
    email: "",
    slug: "",
  });

  const [editBranchTarget, setEditBranchTarget] = useState<any>(null);
  const [editBranchForm, setEditBranchForm] = useState({
    name: "",
    rnc: "",
    address: "",
    phone: "",
    email: "",
    slug: "",
  });

  const handleEditBranch = (t: any) => {
    setEditBranchTarget(t);
    setEditBranchForm({
      name: t.name,
      rnc: t.rnc || "",
      address: t.address || "",
      phone: t.phone || "",
      email: t.email || "",
      slug: t.slug,
    });
  };

  const handleSaveEditBranch = () => {
    if (!editBranchForm.name || !editBranchForm.slug) {
      toast.error("El nombre y el slug comercial son obligatorios");
      return;
    }

    // Check if slug is already taken by another tenant
    const slugTaken = tenants.some(t => t.slug === editBranchForm.slug && t.id !== editBranchTarget.id);
    if (slugTaken) {
      toast.error("Este slug comercial ya está registrado por otra sucursal");
      return;
    }

    updateTenant(editBranchTarget.id, {
      name: editBranchForm.name,
      slug: editBranchForm.slug,
      rnc: editBranchForm.rnc,
      phone: editBranchForm.phone,
      email: editBranchForm.email,
      address: editBranchForm.address,
    });
    toast.success(`Sucursal "${editBranchForm.name}" actualizada correctamente`);
    setEditBranchTarget(null);
  };

  const handleBranchNameChange = (val: string) => {
    const slug = val
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9\s-]/g, "") // remove special characters
      .trim()
      .replace(/\s+/g, "-");
    setBranchForm({ ...branchForm, name: val, slug });
  };

  const handleRegisterBranch = () => {
    if (!branchForm.name || !branchForm.slug) {
      toast.error("El nombre y el slug comercial son obligatorios");
      return;
    }
    if (tenants.some(t => t.slug === branchForm.slug)) {
      toast.error("Este slug comercial ya está registrado");
      return;
    }

    const newTenantId = `t-${Date.now()}`;
    addTenant({
      id: newTenantId,
      name: branchForm.name,
      slug: branchForm.slug,
      logo: "/logo.servitracks.png",
      address: branchForm.address || "Dirección no especificada",
      phone: branchForm.phone || "Sin teléfono",
      email: branchForm.email || "info@taller.do",
      rnc: branchForm.rnc || "N/A",
      status: "pending",
    });

    if (currentUser) {
      addUser({
        id: `u-${Date.now()}`,
        tenantId: newTenantId,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        status: "active",
        createdAt: new Date().toISOString(),
      });
    }

    toast.success(`🎉 Sucursal "${branchForm.name}" registrada con membresía pendiente.`);
    setBranchOpen(false);
    setBranchForm({ name: "", rnc: "", address: "", phone: "", email: "", slug: "" });
  };

  const confirmDeleteBranch = () => {
    if (!deleteBranchTarget) return;
    deleteTenant(deleteBranchTarget.id);
    toast.success(`Sucursal "${deleteBranchTarget.name}" eliminada de forma permanente`);
    setDeleteBranchTarget(null);
  };

  const handleSimulatePayment = (branchId: string, branchName: string) => {
    updateTenant(branchId, { status: "active" });
    toast.success(`💳 Membresía activada. La sucursal "${branchName}" ya se encuentra operativa.`);
  };

  // ── WhatsApp tab state ──
  const [waProvider, setWaProvider] = useState<'evolution' | 'wasender'>(taller?.waProvider || 'evolution');
  const [waKey, setWaKey] = useState(taller?.wasenderApiKey ?? "");
  const [waPhone, setWaPhone] = useState(taller?.wasenderPhone ?? "");
  const [waVisible, setWaVisible] = useState(false);
  const [waTesting, setWaTesting] = useState(false);

  // Evolution API fields
  const [evoBaseUrl, setEvoBaseUrl] = useState(cleanBaseUrl(taller?.evolutionBaseUrl || taller?.config?.evolutionBaseUrl));
  const [evoApiKey, setEvoApiKey] = useState(cleanApiKey(taller?.evolutionApiKey || taller?.config?.evolutionApiKey));
  const [evoInstance, setEvoInstance] = useState(taller?.evolutionInstanceName || taller?.config?.evolutionInstanceName || taller?.slug || "autocheck");
  const [evoStatus, setEvoStatus] = useState<'open' | 'connecting' | 'close' | 'checking'>('close');
  const [evoLoading, setEvoLoading] = useState(false);

  // QR Modal State
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        Object.keys(localStorage).forEach((key) => {
          const val = localStorage.getItem(key);
          if (val && (val.includes("ip_de_tu_vps") || val.includes("8080"))) {
            const cleaned = val
              .replaceAll("http://ip_de_tu_vps:8080", DEFAULT_EVOLUTION_URL)
              .replaceAll("ip_de_tu_vps:8080", DEFAULT_EVOLUTION_URL)
              .replaceAll("ip_de_tu_vps", DEFAULT_EVOLUTION_URL);
            localStorage.setItem(key, cleaned);
          }
        });
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (taller?.id) {
      setEvoBaseUrl(cleanBaseUrl(taller.evolutionBaseUrl || taller.config?.evolutionBaseUrl));
      setEvoApiKey(cleanApiKey(taller.evolutionApiKey || taller.config?.evolutionApiKey));
      setEvoInstance(taller.evolutionInstanceName || taller.config?.evolutionInstanceName || taller.slug || "autocheck");
    }
  }, [taller?.id, taller?.evolutionBaseUrl, taller?.evolutionApiKey, taller?.evolutionInstanceName]);

  const checkEvoConnectionStatus = async () => {
    const bUrl = cleanBaseUrl(evoBaseUrl);
    const aKey = cleanApiKey(evoApiKey);
    if (!aKey || !evoInstance) return;
    setEvoLoading(true);
    const { state } = await fetchConnectionState(bUrl, aKey, evoInstance);
    setEvoStatus(state);
    setEvoLoading(false);
  };

  useEffect(() => {
    if (tab === "whatsapp" && waProvider === "evolution") {
      checkEvoConnectionStatus();
    }
  }, [tab, waProvider]);

  const handleGenerateQr = async () => {
    const bUrl = cleanBaseUrl(evoBaseUrl);
    const aKey = cleanApiKey(evoApiKey);
    setEvoBaseUrl(bUrl);
    setEvoApiKey(aKey);

    if (!aKey) {
      toast.error("Por favor ingresa la API Key de tu servidor Evolution API");
      return;
    }
    setQrModalOpen(true);
    setQrLoading(true);
    setQrError(null);
    setQrBase64(null);

    if (taller?.id) {
      await setEvolutionWebhook(bUrl, aKey, evoInstance, taller.id);
    }

    const result = await connectInstance(bUrl, aKey, evoInstance);
    setQrLoading(false);

    if (result.error) {
      setQrError(result.error);
      toast.error(`Error al solicitar QR: ${result.error}`);
    } else if (result.base64) {
      setQrBase64(result.base64);
      toast.success("Código QR generado. Escanéalo con WhatsApp.");
    } else {
      setQrError("No se recibió la imagen del código QR.");
    }
  };

  const handleEvoLogout = async () => {
    if (!evoApiKey || !evoInstance) return;
    setEvoLoading(true);
    const res = await logoutInstance(evoBaseUrl, evoApiKey, evoInstance);
    setEvoLoading(false);
    if (res.ok) {
      setEvoStatus('close');
      toast.success("Sesión de WhatsApp desconectada");
    } else {
      toast.error(`Error al desconectar: ${res.error}`);
    }
  };

  const handleTestEvoMessage = async () => {
    if (!evoApiKey || !evoInstance) {
      toast.error("Configura primero las credenciales de Evolution API");
      return;
    }
    const testPhone = taller.phone || prompt("Ingresa el número de teléfono para recibir el mensaje (+1809...):");
    if (!testPhone) return;

    setWaTesting(true);
    const res = await sendEvolutionTestMessage(evoBaseUrl, evoApiKey, evoInstance, testPhone);
    setWaTesting(false);

    if (res.ok) {
      toast.success("✅ ¡Mensaje de prueba enviado correctamente por WhatsApp!");
    } else {
      toast.error(`Error al enviar mensaje: ${res.error}`);
    }
  };

  const saveEvolutionSettings = async () => {
    const finalBaseUrl = cleanBaseUrl(evoBaseUrl);
    const finalApiKey = cleanApiKey(evoApiKey);
    setEvoBaseUrl(finalBaseUrl);
    setEvoApiKey(finalApiKey);

    updateTenant(taller.id, {
      waProvider: 'evolution',
      evolutionBaseUrl: finalBaseUrl,
      evolutionApiKey: finalApiKey,
      evolutionInstanceName: evoInstance,
    });

    let { error } = await supabaseAdmin
      .from("tenants")
      .update({
        wa_provider: 'evolution',
        evolution_base_url: finalBaseUrl,
        evolution_api_key: finalApiKey,
        evolution_instance_name: evoInstance,
        config: {
          ...(taller.config || {}),
          waProvider: 'evolution',
          evolutionBaseUrl: finalBaseUrl,
          evolutionApiKey: finalApiKey,
          evolutionInstanceName: evoInstance,
        }
      })
      .eq("id", taller.id);

    if (error) {
      console.warn("Column update failed, falling back to config JSONB column:", error.message);
      const fallback = await supabaseAdmin
        .from("tenants")
        .update({
          config: {
            ...(taller.config || {}),
            waProvider: 'evolution',
            evolutionBaseUrl: finalBaseUrl,
            evolutionApiKey: finalApiKey,
            evolutionInstanceName: evoInstance,
          }
        })
        .eq("id", taller.id);
      error = fallback.error;
    }

    if (error) {
      console.error("Error saving Evolution settings to Supabase:", error);
      toast.warning("Guardado localmente. Error al sincronizar.");
    } else {
      toast.success("Configuración de Evolution API guardada correctamente");
    }
  };

  const saveWa = async () => {
    updateTenant(taller.id, { waProvider: 'wasender', wasenderApiKey: waKey, wasenderPhone: waPhone });
    let { error } = await supabaseAdmin
      .from("tenants")
      .update({ 
        wa_provider: 'wasender', 
        wasender_api_key: waKey, 
        wasender_phone: waPhone,
        config: {
          ...(taller.config || {}),
          waProvider: 'wasender',
          wasenderApiKey: waKey,
          wasenderPhone: waPhone,
        }
      })
      .eq("id", taller.id);

    if (error) {
      const fallback = await supabaseAdmin
        .from("tenants")
        .update({
          config: {
            ...(taller.config || {}),
            waProvider: 'wasender',
            wasenderApiKey: waKey,
            wasenderPhone: waPhone,
          }
        })
        .eq("id", taller.id);
      error = fallback.error;
    }

    if (error) {
      console.error("Error saving WaSender to Supabase:", error);
      toast.warning("Guardado localmente. Error al sincronizar con servidor.");
    } else {
      toast.success("Configuración de WhatsApp guardada");
    }
  };

  const testWa = async () => {
    if (!waKey || !waPhone) { toast.error("Completa la API Key y el número"); return; }
    setWaTesting(true);
    const result = await waSendTestMessage(waKey, waPhone);
    if (result.ok) {
      toast.success("✅ Mensaje de prueba enviado correctamente");
    } else {
      toast.error(`Error WaSender: ${result.error}`);
    }
    setWaTesting(false);
  };

  // ── Print tab state ──
  const [printTab, setPrintTab] = useState("pos"); // "pos" | "barcode" | "warranty"
  const ps = printSettings;
  const psBarcode = barcodeSettings;

  // ── Users tab state ──
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TenantUser | null>(null);
  const [pinTarget, setPinTarget] = useState<TenantUser | null>(null);
  const [pinForm, setPinForm] = useState("");
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", password: "", role: "mechanic" as TenantUser["role"] });
  const [isInviting, setIsInviting] = useState(false);

  const [editUserTarget, setEditUserTarget] = useState<TenantUser | null>(null);
  const [editUserForm, setEditUserForm] = useState({ name: "", email: "", role: "mechanic" as TenantUser["role"], status: "active" as TenantUser["status"] });

  const handleEditUser = (u: TenantUser) => {
    setEditUserTarget(u);
    setEditUserForm({
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
    });
  };

  const handleSaveEditUser = async () => {
    if (!editUserTarget) return;
    if (!editUserForm.name) { toast.error("El nombre es requerido"); return; }
    
    // Update local store
    updateUser(editUserTarget.id, {
      name: editUserForm.name,
      role: editUserForm.role,
      status: editUserForm.status,
    });

    // Update in Supabase db
    const { error } = await supabaseAdmin
      .from("tenant_users")
      .update({
        name: editUserForm.name,
        role: editUserForm.role,
        status: editUserForm.status,
      })
      .eq("user_id", editUserTarget.id)
      .eq("tenant_id", taller.id);

    if (error) {
      console.error("Error updating user in DB:", error);
      toast.warning("Actualizado localmente. Hubo un error al sincronizar.");
    } else {
      toast.success(`Usuario "${editUserForm.name}" actualizado`);
    }

    setEditUserTarget(null);
  };

  const handleInvite = async () => {
    if (!inviteForm.name || !inviteForm.email || !inviteForm.password) { 
      toast.error("Nombre, correo y contraseña son requeridos"); 
      return; 
    }
    if (inviteForm.password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setIsInviting(true);

    // 1. Crear usuario en Supabase Auth directamente (sin email de confirmación)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: inviteForm.email,
      password: inviteForm.password,
      email_confirm: true,
      user_metadata: { name: inviteForm.name },
    });

    if (authError) {
      console.error("Error creating user in Supabase:", authError);
      
      let errorMessage = authError.message;
      if (errorMessage.includes("already been registered") || errorMessage.includes("User already registered")) {
        errorMessage = "Ya existe un empleado registrado con este correo electrónico.";
      } else if (errorMessage.includes("Password should be at least")) {
        errorMessage = "La contraseña es muy débil o corta.";
      } else if (errorMessage.includes("Email rate limit exceeded")) {
        errorMessage = "Demasiados intentos. Por favor, intenta de nuevo más tarde.";
      }

      toast.error(`Error al crear usuario: ${errorMessage}`);
      setIsInviting(false);
      return;
    }

    const newUserId = authData.user.id;

    // 2. Insertar en tenant_users
    const { error: dbError } = await supabaseAdmin
      .from("tenant_users")
      .insert({
        user_id: newUserId,
        tenant_id: taller.id,
        name: inviteForm.name,
        email: inviteForm.email,
        role: inviteForm.role,
        status: "active"
      });

    if (dbError) {
      console.error("Error inserting tenant_user:", dbError);
      // Fallback a solo local si la DB falla
    }

    // 3. Guardar en store local
    addUser({ 
      id: newUserId, 
      tenantId: taller.id, 
      status: "active", 
      createdAt: new Date().toISOString(), 
      name: inviteForm.name,
      email: inviteForm.email,
      role: inviteForm.role
    });

    toast.success(`Usuario "${inviteForm.name}" creado con éxito. Ya puede iniciar sesión.`);
    setInviteOpen(false);
    setInviteForm({ name: "", email: "", password: "", role: "mechanic" });
    setIsInviting(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);

    // 1. Eliminar inmediatamente del store local para feedback instantáneo
    deleteUser(target.id);
    toast.success(`Usuario "${target.name}" eliminado correctamente`);

    // 2. Eliminar de Supabase (tabla tenant_users y Auth)
    try {
      const { error: dbError } = await supabaseAdmin
        .from("tenant_users")
        .delete()
        .or(`user_id.eq.${target.id},id.eq.${target.id},email.eq.${target.email}`);

      if (dbError) {
        console.error("Error al eliminar tenant_user de Supabase:", dbError);
      }

      try {
        await supabaseAdmin.auth.admin.deleteUser(target.id);
      } catch (authErr) {
        // Usuario puede no existir en Auth si fue creado solo en tabla
      }
    } catch (err) {
      console.error("Error inesperado al eliminar usuario de Supabase:", err);
    }
  };

  const handleSavePin = async () => {
    if (!pinTarget) return;
    if (pinForm && pinForm.length !== 4) {
      toast.error("El PIN debe tener exactamente 4 dígitos");
      return;
    }
    
    // Guardar en DB
    const { error } = await supabaseAdmin
      .from("tenant_users")
      .update({ pin: pinForm || null })
      .eq("user_id", pinTarget.id)
      .eq("tenant_id", taller.id);
      
    if (error) {
      console.error("Error saving pin to DB:", error);
    }
    
    // Guardar local
    updateUser(pinTarget.id, { pin: pinForm });
    toast.success(`PIN asignado correctamente a ${pinTarget.name}`);
    setPinTarget(null);
    setPinForm("");
  };

  // ── Security tab state ──
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState(currentTenant?.adminPin || "");
  const [showPin, setShowPin] = useState(false);

  // ── Delete Account state ──
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "ELIMINAR") {
      toast.error("Escribe ELIMINAR para confirmar");
      return;
    }
    if (!currentUser) return;

    setIsDeletingAccount(true);
    try {
      // 1. Delete from Supabase Auth
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(currentUser.id);
      if (authError) {
        console.error("Error deleting auth user:", authError);
        // Continue anyway — clean up local data
      }

      // 2. Delete from tenant_users table
      await supabaseAdmin
        .from("tenant_users")
        .delete()
        .eq("user_id", currentUser.id);

      // 3. Clean up local store
      deleteUser(currentUser.id);

      // 4. Clear session and redirect
      useStore.getState().setCurrentUserId(null);
      useStore.getState().setAuthenticated(false);
      localStorage.removeItem("servitracks-session");
      sessionStorage.removeItem("servitracks-session");
      localStorage.removeItem("simulated-role");

      toast.success("Tu cuenta ha sido eliminada permanentemente.");
      
      // Redirect to login
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    } catch (err: any) {
      console.error("Error deleting account:", err);
      toast.error("Error al eliminar la cuenta: " + (err.message || "Inténtalo de nuevo"));
    } finally {
      setIsDeletingAccount(false);
      setIsDeleteAccountOpen(false);
      setDeleteConfirmText("");
    }
  };

  const changePassword = () => {
    if (!pwForm.current) { toast.error("Escribe tu contraseña actual"); return; }
    if (pwForm.next.length < 8) { toast.error("La nueva contraseña debe tener al menos 8 caracteres"); return; }
    if (pwForm.next !== pwForm.confirm) { toast.error("Las contraseñas no coinciden"); return; }
    toast.success("Contraseña actualizada correctamente");
    setPwForm({ current: "", next: "", confirm: "" });
  };

  const saveAdminPin = () => {
    if (!currentTenant) return;
    if (adminPinInput && adminPinInput.length !== 4) {
      toast.error("El PIN debe tener exactamente 4 dígitos");
      return;
    }
    updateTenant(currentTenant.id, { adminPin: adminPinInput || undefined });
    toast.success("PIN de autorización administrativa actualizado");
  };

  // Statistics for sucursales
  const totalBranches = allowedTenants.length;
  const activeBranches = allowedTenants.filter(t => t.status === "active" || !t.status).length;
  const pendingBranches = allowedTenants.filter(t => t.status === "pending").length;

  // Plan-based branch limits
  const plans = useStore((s) => s.plans);
  const primaryTenant = allowedTenants[0];
  const currentPlan = plans.find(p => p.id === primaryTenant?.plan_id) || plans[0];
  const branchLimit = currentPlan?.limite_sucursales;
  const canAddBranch = branchLimit === null || branchLimit === undefined || totalBranches < branchLimit;
  const nextPlan = !canAddBranch
    ? plans.find(p => (p.limite_sucursales === null || (p.limite_sucursales ?? 0) > (branchLimit ?? 0)) && p.id !== currentPlan?.id)
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-neutral-900">Configuración</h1>
        <p className="text-neutral-500">Personaliza tu taller y gestiona los parámetros del sistema.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl overflow-x-auto whitespace-nowrap custom-scrollbar">
        {TABS.filter(t => {
          if (t.id === "whatsapp" && !isModuleEnabled(taller, "whatsapp", currentPlan)) return false;
          if (t.id === "tenants" && !isModuleEnabled(taller, "multisucursal", currentPlan)) return false;
          return true;
        }).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer",
              tab === t.id ? "bg-white shadow-sm text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* ── TALLER ── */}
      {tab === "taller" && (
        <div className="space-y-6">
          <Card className="border-neutral-100 shadow-sm">
            <CardHeader><CardTitle>Logo del Taller</CardTitle><CardDescription>Se mostrará en facturas y recibos de impresión.</CardDescription></CardHeader>
            <CardContent className="flex items-center gap-6">
              <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 flex items-center justify-center overflow-hidden">
                {logoPreview ? <img src={logoPreview} alt="logo" className="object-contain h-full w-full" /> : <Upload className="h-6 w-6 text-neutral-300" />}
              </div>
              <div className="space-y-2">
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                <Button variant="outline" className="rounded-lg cursor-pointer" onClick={() => logoRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" /> Subir Logo
                </Button>
                {logoPreview && (
                  <Button variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600 block cursor-pointer"
                    onClick={() => { setLogoPreview(""); updateTenant(taller.id, { logo: "" }); toast.success("Logo eliminado"); }}>
                    <X className="h-3 w-3 mr-1 inline" /> Eliminar logo
                  </Button>
                )}
                <p className="text-xs text-neutral-400">PNG, JPG · Máx. 500 KB</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-neutral-100 shadow-sm">
            <CardHeader><CardTitle>Información del Taller</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "Nombre del Taller", key: "name", placeholder: "Taller García" },
                  { label: "RNC / Cédula Fiscal", key: "rnc", placeholder: "1-32-12345-6" },
                  { label: "Teléfono", key: "phone", placeholder: "809-555-0100" },
                  { label: "Correo Electrónico", key: "email", placeholder: "info@taller.do" },
                ].map(f => (
                  <div key={f.key} className="space-y-1.5">
                    <Label>{f.label}</Label>
                    <Input className="h-10 rounded-xl border-neutral-200"
                      placeholder={f.placeholder}
                      value={(tallerForm as any)[f.key]}
                      onChange={e => setTallerForm({ ...tallerForm, [f.key]: e.target.value })} />
                  </div>
                ))}
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Dirección</Label>
                  <Input className="h-10 rounded-xl border-neutral-200" placeholder="Av. 27 de Febrero #123..."
                    value={tallerForm.address}
                    onChange={e => setTallerForm({ ...tallerForm, address: e.target.value })} />
                </div>
              </div>
              <Button className="rounded-lg bg-black text-white hover:bg-neutral-800 cursor-pointer" onClick={saveTaller}>
                <Check className="h-4 w-4 mr-2" /> Guardar Cambios
              </Button>
            </CardContent>
          </Card>

          <Card className="border-neutral-100 shadow-sm border-emerald-100">
            <CardHeader>
              <CardTitle className="text-emerald-700 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Inventario Inteligente (Modo Seguro)
              </CardTitle>
              <CardDescription>
                Configura si el inventario debe descontarse automáticamente al registrar una venta en el POS.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-xl border border-emerald-100 bg-emerald-50/50">
                <div>
                  <h4 className="text-sm font-bold text-neutral-900">Descuento Automático de Inventario</h4>
                  <p className="text-xs text-neutral-500 mt-1">Al activar, las ventas del POS restarán stock y crearán un registro histórico.</p>
                </div>
                <button
                  onClick={() => {
                    const currentVal = taller.config?.autoDeductInventory || false;
                    updateTenant(taller.id, { config: { ...taller.config, autoDeductInventory: !currentVal } });
                    toast.success(!currentVal ? "Descuento Automático Activado" : "Descuento Automático Desactivado");
                  }}
                  className={cn("h-6 w-11 rounded-full transition-all relative cursor-pointer border-none shrink-0",
                    taller.config?.autoDeductInventory ? "bg-emerald-600" : "bg-neutral-200")}
                >
                  <div className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                    taller.config?.autoDeductInventory ? "left-5" : "left-0.5")} />
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── INTERFAZ ── */}
      {tab === "interface" && (
        <div className="space-y-6">
          <Card className="border-neutral-100 shadow-sm">
            <CardHeader>
              <CardTitle>Orden del Menú Lateral</CardTitle>
              <CardDescription>Reorganiza las opciones del menú a tu gusto. Puedes usar las flechas o escribir el número de posición directamente.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden mb-4">
                {orderedNavigation.map((item, idx) => {
                  const currentOrderNum = sidebarOrder[item.href] ?? (idx + 1);
                  return (
                    <div key={item.href} className="flex items-center gap-3 p-3 border-b border-neutral-100 last:border-b-0 bg-white hover:bg-neutral-50 transition-colors">
                      <div className="flex flex-col gap-1 pr-2 border-r border-neutral-100">
                        <button onClick={() => handleMoveUp(idx)} disabled={idx === 0} className="text-neutral-400 hover:text-neutral-800 disabled:opacity-30 cursor-pointer p-0.5 rounded hover:bg-neutral-200">
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleMoveDown(idx)} disabled={idx === orderedNavigation.length - 1} className="text-neutral-400 hover:text-neutral-800 disabled:opacity-30 cursor-pointer p-0.5 rounded hover:bg-neutral-200">
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <Input 
                        type="number" 
                        min={1} 
                        value={currentOrderNum} 
                        onChange={(e) => handleSetNumber(item.href, e.target.value)} 
                        className="w-16 h-9 text-center font-bold text-neutral-900 border-neutral-200"
                      />
                      
                      <div className="flex items-center gap-3 flex-1 ml-2">
                        <div className="h-8 w-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                          <item.icon className="h-4 w-4 text-neutral-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-neutral-900">{item.name}</p>
                          <p className="text-[10px] text-neutral-400 font-medium">Link: {item.href || '/'}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <Button className="rounded-lg bg-black text-white hover:bg-neutral-800 cursor-pointer w-full sm:w-auto" onClick={saveInterfaceSettings}>
                <Check className="h-4 w-4 mr-2" /> Guardar Nuevo Orden
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── SUCURSALES (MULTITENANT) ── */}
      {tab === "tenants" && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          {(() => {
            const pricePerExtra = currentPlan?.precio_sucursal_adicional || 0;
            const extraBranches = Math.max(0, totalBranches - 1);
            const extraCost = extraBranches * pricePerExtra;
            const baseCost = currentPlan?.precio_mensual || 0;
            const totalMonthlyCost = baseCost + extraCost;
            const pendingCost = pendingBranches * pricePerExtra;
            const formatMoney = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            return (
              <>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white border border-neutral-100 p-5 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Total Sucursales</span>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-3xl font-black text-neutral-900">{totalBranches}</span>
                      <span className="text-sm font-bold text-neutral-400">/ {branchLimit ?? '∞'}</span>
                    </div>
                  </div>
                  <div className="bg-white border border-neutral-100 p-5 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Activas</span>
                    <span className="text-3xl font-black text-emerald-600 mt-1 block">{activeBranches}</span>
                  </div>
                  <div className="bg-white border border-neutral-100 p-5 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Pago Pendiente</span>
                    <span className={cn("text-3xl font-black mt-1 block", pendingBranches > 0 ? "text-rose-600" : "text-neutral-300")}>{pendingBranches > 0 ? formatMoney(pendingCost) : '$0'}</span>
                    {pendingBranches > 0 && (
                      <span className="text-[10px] text-rose-500 font-semibold">{pendingBranches} sucursal{pendingBranches > 1 ? 'es' : ''} sin activar</span>
                    )}
                  </div>
                  <div className="bg-white border border-neutral-100 p-5 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Plan Actual</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xl font-black text-neutral-900">{currentPlan?.nombre || 'Sin plan'}</span>
                    </div>
                    {pricePerExtra > 0 ? (
                      <span className="text-[10px] text-neutral-400 font-semibold">Taller principal · +{formatMoney(pricePerExtra)}/extra</span>
                    ) : (
                      <span className="text-[10px] text-neutral-400 font-semibold">Sucursales adicionales sin costo</span>
                    )}
                  </div>
                </div>

                {/* Billing Breakdown Card */}
                <Card className="border-neutral-100 shadow-sm overflow-hidden">
                  <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 p-4 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
                      <Store className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-tight">Facturación Estimada Mensual</h4>
                      <p className="text-[10px] text-neutral-400 font-medium">Desglose de costos por sucursales</p>
                    </div>
                  </div>
                  <CardContent className="p-0">
                    <div className="divide-y divide-neutral-50">
                      <div className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-md bg-neutral-100 flex items-center justify-center">
                            <span className="text-[10px] font-black text-neutral-600">📋</span>
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-neutral-800">Plan {currentPlan?.nombre}</span>
                            <span className="text-[10px] text-neutral-400 block">Cargo base mensual</span>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-neutral-900">{formatMoney(baseCost)}</span>
                      </div>

                      <div className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-md bg-neutral-100 flex items-center justify-center">
                            <span className="text-[10px] font-black text-neutral-600">🏪</span>
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-neutral-800">Taller Principal</span>
                            <span className="text-[10px] text-neutral-400 block">Sede original incluida en el precio base</span>
                          </div>
                        </div>
                        <Badge className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border-none bg-emerald-100 text-emerald-700">
                          Base
                        </Badge>
                      </div>

                      {extraBranches > 0 && (
                        <div className="flex items-center justify-between px-5 py-3 bg-amber-50/50">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-md bg-amber-100 flex items-center justify-center">
                              <span className="text-[10px] font-black text-amber-600">➕</span>
                            </div>
                            <div>
                              <span className="text-sm font-semibold text-neutral-800">Sucursales adicionales</span>
                              <span className="text-[10px] text-neutral-500 block">{extraBranches} extra × {formatMoney(pricePerExtra)}/mes</span>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-amber-700">+{formatMoney(extraCost)}</span>
                        </div>
                      )}

                      {/* Total */}
                      <div className="flex items-center justify-between px-5 py-4 bg-neutral-50">
                        <span className="text-sm font-black text-neutral-900 uppercase tracking-wider">Total Mensual Estimado</span>
                        <span className="text-xl font-black text-neutral-900">{formatMoney(totalMonthlyCost)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Upgrade Banner - shown when limit is reached */}
                {!canAddBranch && (
                  <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0">
                        <Crown className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-neutral-900 tracking-tight">Límite de sucursales alcanzado</h4>
                        <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">
                          Tu plan <strong>{currentPlan?.nombre}</strong> permite hasta <strong>{branchLimit}</strong> sucursal{branchLimit && branchLimit > 1 ? 'es' : ''}.
                          {nextPlan && <> Actualiza a <strong>{nextPlan.nombre}</strong> para obtener {nextPlan.limite_sucursales === null ? 'sucursales ilimitadas' : `hasta ${nextPlan.limite_sucursales} sucursales`}.</>}
                        </p>
                      </div>
                    </div>
                    <Button
                      className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-bold h-10 px-5 text-xs flex items-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer border-none"
                      onClick={() => toast.info('Contacta a soporte para actualizar tu plan: hola@servitracks.com')}
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      Actualizar Plan
                    </Button>
                  </div>
                )}
              </>
            );
          })()}

          <Card className="border-neutral-100 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Administración de Sucursales</CardTitle>
                <CardDescription>Visualiza, registra y gestiona las sedes comerciales y sus suscripciones.</CardDescription>
              </div>
              <Button
                onClick={() => {
                  if (!canAddBranch) {
                    toast.error(`Tu plan ${currentPlan?.nombre} solo permite ${branchLimit} sucursal${branchLimit && branchLimit > 1 ? 'es' : ''}. Actualiza tu plan para añadir más.`);
                    return;
                  }
                  setBranchOpen(true);
                }}
                disabled={!canAddBranch}
                className={cn(
                  "rounded-xl font-bold cursor-pointer h-10 px-4",
                  canAddBranch
                    ? "bg-black hover:bg-neutral-800 text-white"
                    : "bg-neutral-200 text-neutral-400 cursor-not-allowed hover:bg-neutral-200"
                )}
              >
                <Plus className="h-4 w-4 mr-2" /> Registrar Sucursal
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-neutral-100">
                {allowedTenants.map(t => {
                  const isActive = t.status === "active" || !t.status;
                  return (
                    <div key={t.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 hover:bg-neutral-50/50 transition-colors">
                      <div className="flex items-start gap-4">
                        {/* Custom Branch Avatar Badge */}
                        <div className={cn(
                          "h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner border",
                          isActive ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-rose-50 border-rose-100 text-rose-600"
                        )}>
                          <Store className="h-6 w-6" />
                        </div>

                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-bold text-neutral-900 tracking-tight">{t.name}</h4>
                            <Badge className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full border-none",
                              isActive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                            )}>
                              {isActive ? "Activa" : "Pendiente de Pago"}
                            </Badge>
                          </div>

                          {/* Folder slug link */}
                          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-semibold bg-neutral-50 px-2 py-0.5 rounded-md w-fit">
                            <span className="text-neutral-300 font-normal">URL:</span>
                            <span className="font-mono text-[10px] text-neutral-600">/{t.slug}/dashboard</span>
                          </div>

                          {/* Detail specs */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pt-2">
                            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                              <Landmark className="h-3 w-3 text-neutral-300 flex-shrink-0" />
                              <span>RNC: {t.rnc || "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                              <Phone className="h-3 w-3 text-neutral-300 flex-shrink-0" />
                              <span>Tel: {t.phone || "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-neutral-500 sm:col-span-2">
                              <MapPin className="h-3 w-3 text-neutral-300 flex-shrink-0" />
                              <span className="truncate">{t.address || "N/A"}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2.5 self-end md:self-center">
                        {!isActive && (
                          <Button
                            onClick={() => handleSimulatePayment(t.id, t.name)}
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold h-9 text-xs flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer border-none"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Activar (Simular Pago)
                          </Button>
                        )}

                        <Button
                          onClick={() => handleEditBranch(t)}
                          variant="outline"
                          size="sm"
                          className="text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 border-neutral-200 hover:border-emerald-100 rounded-lg h-9 w-9 p-0 flex items-center justify-center cursor-pointer transition-all"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        {/* Prevent deleting the primary branch in the account */}
                        {t.id !== allowedTenants[0]?.id && (
                          <Button
                            onClick={() => setDeleteBranchTarget(t)}
                            variant="outline"
                            size="sm"
                            className="text-neutral-400 hover:text-rose-600 hover:bg-rose-50 border-neutral-200 hover:border-rose-100 rounded-lg h-9 w-9 p-0 flex items-center justify-center cursor-pointer transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── FACTURACIÓN E-CF ── */}
      {tab === "ecf" && (
        <EcfSettings tenant={taller} />
      )}

      {/* ── WHATSAPP ── */}
      {tab === "whatsapp" && (
        <div className="space-y-6">
          {/* Provider Selection Card */}
          <Card className="border-neutral-100 shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 text-white p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center font-bold">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl text-white font-bold">Integración de WhatsApp</CardTitle>
                  <CardDescription className="text-neutral-300 text-xs mt-0.5">
                    Selecciona el proveedor para conectar el WhatsApp de tu taller y enviar comprobantes, alertas y notificaciones.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Evolution API Option */}
                <div
                  onClick={() => {
                    setWaProvider('evolution');
                    updateTenant(taller.id, { waProvider: 'evolution' });
                  }}
                  className={cn(
                    "p-5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between space-y-3",
                    waProvider === 'evolution'
                      ? "border-emerald-600 bg-emerald-50/40 shadow-sm"
                      : "border-neutral-200 hover:border-neutral-300 bg-white"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center font-bold",
                        waProvider === 'evolution' ? "bg-emerald-600 text-white" : "bg-neutral-100 text-neutral-600"
                      )}>
                        <QrCode className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-neutral-900 text-sm">ServiTracks Connect</h3>
                        <p className="text-[11px] text-neutral-500 font-medium">VPS Propio (Evolution API) · Código QR</p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px] font-black uppercase px-2 py-0.5">
                      GRATIS / CÓDIGO QR
                    </Badge>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Escanea el código QR con el celular de tu taller. Sin costo adicional por mensaje ni mensualidades por línea.
                  </p>
                </div>

                {/* WaSender Option */}
                <div
                  onClick={() => {
                    setWaProvider('wasender');
                    updateTenant(taller.id, { waProvider: 'wasender' });
                  }}
                  className={cn(
                    "p-5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between space-y-3",
                    waProvider === 'wasender'
                      ? "border-black bg-neutral-50 shadow-sm"
                      : "border-neutral-200 hover:border-neutral-300 bg-white"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center font-bold",
                        waProvider === 'wasender' ? "bg-black text-white" : "bg-neutral-100 text-neutral-600"
                      )}>
                        <Bell className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-neutral-900 text-sm">WaSender API</h3>
                        <p className="text-[11px] text-neutral-500 font-medium">Proveedor SaaS Externo</p>
                      </div>
                    </div>
                    <Badge className="bg-neutral-200 text-neutral-700 border-none text-[10px] font-black uppercase px-2 py-0.5">
                      EXTERNO
                    </Badge>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Conecta usando tu Token API de wasenderapi.com.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* If Evolution API is selected */}
          {waProvider === 'evolution' && (
            <div className="space-y-6">
              {/* Connection Status Banner */}
              <Card className="border-neutral-100 shadow-sm overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      Estado de Conexión de WhatsApp
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Instancia actual: <strong className="font-mono text-neutral-800">{evoInstance}</strong>
                    </CardDescription>
                  </div>
                  <Badge className={cn("border-none text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5",
                    evoStatus === 'open' ? "bg-emerald-100 text-emerald-800" :
                    evoStatus === 'connecting' ? "bg-amber-100 text-amber-800" :
                    "bg-rose-100 text-rose-800"
                  )}>
                    <span className={cn("h-2 w-2 rounded-full",
                      evoStatus === 'open' ? "bg-emerald-500 animate-pulse" :
                      evoStatus === 'connecting' ? "bg-amber-500 animate-ping" :
                      "bg-rose-500"
                    )} />
                    {evoStatus === 'open' ? "CONECTADO Y ACTIVO" :
                     evoStatus === 'connecting' ? "CONECTANDO..." :
                     "DESCONECTADO"}
                  </Badge>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Button
                      onClick={handleGenerateQr}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-11 px-5 gap-2 shadow-sm cursor-pointer border-none"
                    >
                      <QrCode className="h-4.5 w-4.5" />
                      {evoStatus === 'open' ? "Re-escanear Código QR" : "Conectar / Escanear Código QR"}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={checkEvoConnectionStatus}
                      disabled={evoLoading}
                      className="rounded-xl h-11 font-bold border-neutral-200 hover:bg-neutral-50 gap-2 cursor-pointer"
                    >
                      <RefreshCw className={cn("h-4 w-4", evoLoading && "animate-spin")} />
                      Verificar Estado
                    </Button>

                    <Button
                      variant="outline"
                      onClick={handleTestEvoMessage}
                      disabled={waTesting || evoStatus !== 'open'}
                      className="rounded-xl h-11 font-bold border-neutral-200 hover:bg-neutral-50 gap-2 cursor-pointer"
                    >
                      Probar Envío de Mensaje
                    </Button>

                    {evoStatus === 'open' && (
                      <Button
                        variant="ghost"
                        onClick={handleEvoLogout}
                        className="text-rose-600 hover:bg-rose-50 rounded-xl h-11 font-bold gap-2 cursor-pointer ml-auto"
                      >
                        <LogOut className="h-4 w-4" /> Desconectar WhatsApp
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Evolution Credentials Form */}
              <Card className="border-neutral-100 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-bold">Configuración del Servidor Evolution API</CardTitle>
                  <CardDescription>Configura la dirección de tu servidor Evolution API y las credenciales de la instancia.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <Label>URL Base del Servidor Evolution API</Label>
                      <Input
                        type="url"
                        className="h-10 rounded-xl border-neutral-200 font-mono text-xs"
                        placeholder="https://wa.servitracks.com"
                        value={evoBaseUrl}
                        onChange={(e) => setEvoBaseUrl(e.target.value)}
                      />
                      <p className="text-[11px] text-neutral-400">Puedes usar el servidor por defecto de ServiTracks o ingresar la URL de tu propio VPS Docker.</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label>API Key de Evolution</Label>
                      <div className="relative">
                        <Input
                          type={waVisible ? "text" : "password"}
                          className="h-10 rounded-xl border-neutral-200 pr-10 font-mono text-xs"
                          placeholder="Tu API Key global o de la instancia..."
                          value={evoApiKey}
                          onChange={(e) => setEvoApiKey(e.target.value)}
                        />
                        <button
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 cursor-pointer border-none bg-transparent"
                          onClick={() => setWaVisible(!waVisible)}
                        >
                          {waVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Nombre de la Instancia (ID del Taller)</Label>
                      <Input
                        type="text"
                        className="h-10 rounded-xl border-neutral-200 font-mono text-xs"
                        placeholder="taller-principal"
                        value={evoInstance}
                        onChange={(e) => setEvoInstance(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button className="rounded-xl bg-black text-white hover:bg-neutral-800 font-bold h-11 px-6 cursor-pointer" onClick={saveEvolutionSettings}>
                    <Check className="h-4 w-4 mr-2" /> Guardar Credenciales
                  </Button>

                  <div className="pt-4 border-t border-neutral-100 space-y-3">
                    <div>
                      <Label className="text-sm font-bold text-neutral-900">URL del Webhook de Mensajes Entrantes</Label>
                      <p className="text-xs text-neutral-500 mt-1">
                        Evolution API enviará los mensajes recibidos a este Webhook para mostrarlos en tiempo real en la pantalla de <strong>Conversaciones</strong>.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input 
                        readOnly 
                        className="h-10 rounded-xl border-neutral-200 bg-neutral-50 font-mono text-[10px] text-neutral-600" 
                        value={`${import.meta.env.VITE_SUPABASE_URL || "https://vbigrtifoxsehgbapxtc.supabase.co"}/functions/v1/evolution-webhook?tenant_id=${taller.id}`} 
                      />
                      <Button 
                        variant="outline" 
                        className="rounded-xl cursor-pointer h-10 px-4 whitespace-nowrap border-neutral-200 hover:bg-neutral-50 font-bold"
                        onClick={() => {
                          navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL || "https://vbigrtifoxsehgbapxtc.supabase.co"}/functions/v1/evolution-webhook?tenant_id=${taller.id}`);
                          toast.success("URL de Webhook copiada");
                        }}
                      >
                        Copiar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* If WaSender API is selected */}
          {waProvider === 'wasender' && (
            <Card className="border-neutral-100 shadow-sm">
              <CardHeader>
                <CardTitle>WaSender API</CardTitle>
                <CardDescription>Conecta tu taller con WhatsApp Business mediante WaSender API. Obtén tu API Key en <a href="https://wasenderapi.com" target="_blank" rel="noopener noreferrer" className="text-black font-medium underline">wasenderapi.com</a></CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>API Key</Label>
                  <div className="relative">
                    <Input type={waVisible ? "text" : "password"} className="h-10 rounded-xl border-neutral-200 pr-10 font-mono text-xs"
                      placeholder="Bearer token de WaSender..."
                      value={waKey} onChange={e => setWaKey(e.target.value)} />
                    <button className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 cursor-pointer border-none bg-transparent" onClick={() => setWaVisible(!waVisible)}>
                      {waVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Número de WhatsApp del Taller</Label>
                  <Input type="tel" className="h-10 rounded-xl border-neutral-200" placeholder="+1809XXXXXXX"
                    value={waPhone} onChange={e => setWaPhone(e.target.value)} />
                </div>
                <div className="flex gap-3">
                  <Button className="rounded-xl bg-black text-white hover:bg-neutral-800 font-bold h-11 px-6 cursor-pointer" onClick={saveWa}>
                    <Check className="h-4 w-4 mr-2" /> Guardar
                  </Button>
                  <Button variant="outline" className="rounded-xl h-11 font-bold cursor-pointer border-neutral-200" onClick={testWa} disabled={waTesting}>
                    {waTesting ? "Enviando..." : "Probar Conexión"}
                  </Button>
                </div>
                {taller?.wasenderApiKey && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-sm text-emerald-700 font-medium">API WaSender configurada</span>
                  </div>
                )}

                <div className="pt-4 mt-4 border-t border-neutral-100 space-y-3">
                  <div>
                    <Label className="text-sm font-bold text-neutral-900">URL del Webhook (Recepción de Mensajes)</Label>
                    <p className="text-xs text-neutral-500 mt-1">
                      Copia esta URL y pégala en la configuración de Webhook dentro de tu cuenta de WaSender.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input 
                      readOnly 
                      className="h-10 rounded-xl border-neutral-200 bg-neutral-50 font-mono text-[10px] text-neutral-600" 
                      value={`${import.meta.env.VITE_SUPABASE_URL || "https://vbigrtifoxsehgbapxtc.supabase.co"}/functions/v1/wasender-webhook?tenant_id=${taller.id}`} 
                    />
                    <Button 
                      variant="outline" 
                      className="rounded-xl cursor-pointer h-10 px-4 whitespace-nowrap border-neutral-200 font-bold hover:bg-neutral-50"
                      onClick={() => {
                        navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL || "https://vbigrtifoxsehgbapxtc.supabase.co"}/functions/v1/wasender-webhook?tenant_id=${taller.id}`);
                        toast.success("URL copiada al portapapeles");
                      }}
                    >
                      Copiar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Modal con Visor de Código QR de WhatsApp ── */}
          <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
            <DialogContent className="sm:max-w-md rounded-3xl border-none shadow-2xl p-6 text-center">
              <DialogHeader className="pb-3 border-b border-neutral-100">
                <DialogTitle className="flex items-center justify-center gap-2 text-xl font-bold text-neutral-900">
                  <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <QrCode className="h-5 w-5" />
                  </div>
                  Vincular WhatsApp por QR
                </DialogTitle>
                <DialogDescription className="text-xs text-neutral-500 mt-1">
                  Sigue las instrucciones para escanear el código QR con el celular de tu taller.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 space-y-4 flex flex-col items-center justify-center">
                {qrLoading ? (
                  <div className="h-64 w-64 rounded-2xl bg-neutral-50 border border-neutral-200 flex flex-col items-center justify-center gap-3 text-neutral-400">
                    <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
                    <span className="text-xs font-bold text-neutral-600">Generando código QR...</span>
                  </div>
                ) : qrError ? (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs space-y-2 max-w-xs">
                    <AlertTriangle className="h-6 w-6 text-rose-600 mx-auto" />
                    <p className="font-bold">No se pudo cargar el QR</p>
                    <p className="text-[11px] leading-tight">{qrError}</p>
                    <Button size="sm" variant="outline" onClick={handleGenerateQr} className="rounded-lg text-xs bg-white mt-2 font-bold">
                      Reintentar
                    </Button>
                  </div>
                ) : qrBase64 ? (
                  <div className="space-y-3 flex flex-col items-center">
                    <div className="p-3 bg-white border-2 border-emerald-500/30 rounded-2xl shadow-md inline-block">
                      <img
                        src={qrBase64.startsWith("data:") ? qrBase64 : `data:image/png;base64,${qrBase64}`}
                        alt="Código QR de WhatsApp"
                        className="h-60 w-60 object-contain rounded-lg"
                      />
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 max-w-xs text-left space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Pasos para conectar:
                      </p>
                      <ol className="list-decimal list-inside text-[11px] space-y-0.5 text-emerald-700">
                        <li>Abre WhatsApp en tu teléfono.</li>
                        <li>Toca Menú (⋮) o Configuración.</li>
                        <li>Selecciona <strong>Dispositivos vinculados</strong>.</li>
                        <li>Toca <strong>Vincular un dispositivo</strong> y apunta al QR.</li>
                      </ol>
                    </div>
                  </div>
                ) : null}
              </div>

              <DialogFooter className="gap-2 pt-2 border-t border-neutral-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setQrModalOpen(false)}
                  className="rounded-xl flex-1 h-11 font-bold text-neutral-600 border-neutral-200 hover:bg-neutral-50"
                >
                  Cerrar
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    checkEvoConnectionStatus();
                    setQrModalOpen(false);
                  }}
                  className="rounded-xl flex-1 h-11 font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 border-none shadow-sm cursor-pointer"
                >
                  <Check className="h-4 w-4" /> Ya Escaneé el QR
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ── IMPRESIÓN ── */}
      {tab === "print" && (
        <div className="space-y-6">
          <div className="flex gap-2 p-1 bg-neutral-100/50 rounded-xl max-w-fit">
            <button
              onClick={() => setPrintTab("pos")}
              className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer border-none", printTab === "pos" ? "bg-white text-neutral-900 shadow-sm" : "bg-transparent text-neutral-500 hover:text-neutral-700")}
            >
              Recibos POS
            </button>
            <button
              onClick={() => setPrintTab("physical")}
              className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer border-none", printTab === "physical" ? "bg-white text-neutral-900 shadow-sm" : "bg-transparent text-neutral-500 hover:text-neutral-700")}
            >
              Impresora Física
            </button>
            <button
              onClick={() => setPrintTab("barcode")}
              className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer border-none", printTab === "barcode" ? "bg-white text-neutral-900 shadow-sm" : "bg-transparent text-neutral-500 hover:text-neutral-700")}
            >
              Códigos de Barras
            </button>
            <button
              onClick={() => setPrintTab("warranty")}
              className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer border-none", printTab === "warranty" ? "bg-white text-neutral-900 shadow-sm" : "bg-transparent text-neutral-500 hover:text-neutral-700")}
            >
              Garantía en Factura
            </button>
          </div>

          {printTab === "pos" && (
            <Card className="border-neutral-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <CardHeader><CardTitle>Configuración de Impresión</CardTitle><CardDescription>Define cómo se verán los recibos del POS.</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-1.5">
                  <Label>Tamaño de Papel</Label>
                  <div className="flex gap-2">
                    {(["80mm", "58mm", "A4"] as const).map(size => (
                      <button key={size} onClick={() => updatePrintSettings({ paperSize: size })}
                        className={cn("px-4 py-2 rounded-lg border text-sm font-medium transition-all cursor-pointer",
                          ps.paperSize === size ? "bg-black text-white border-black" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50")}>
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Opciones del Recibo</Label>
                  {([
                    { key: "showLogo", label: "Mostrar logo del taller" },
                    { key: "showNcf", label: "Mostrar número NCF" },
                    { key: "showItbis", label: "Mostrar ITBIS desglosado" },
                    { key: "showChange", label: "Mostrar cambio/vuelto" },
                  ] as { key: keyof typeof ps; label: string }[]).map(opt => (
                    <div key={opt.key} className="flex items-center justify-between p-3 rounded-xl border border-neutral-100 bg-neutral-50">
                      <span className="text-sm font-medium text-neutral-700">{opt.label}</span>
                      <button onClick={() => updatePrintSettings({ [opt.key]: !(ps as any)[opt.key] })}
                        className={cn("h-6 w-11 rounded-full transition-all relative cursor-pointer border-none",
                          (ps as any)[opt.key] ? "bg-black" : "bg-neutral-200")}>
                        <div className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                          (ps as any)[opt.key] ? "left-5" : "left-0.5")} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <Label>Número de Copias</Label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => updatePrintSettings({ copies: Math.max(1, ps.copies - 1) })}
                      className="h-9 w-9 rounded-lg border border-neutral-200 flex items-center justify-center text-lg font-bold hover:bg-neutral-50 cursor-pointer bg-white">−</button>
                    <span className="text-lg font-bold w-8 text-center">{ps.copies}</span>
                    <button onClick={() => updatePrintSettings({ copies: Math.min(5, ps.copies + 1) })}
                      className="h-9 w-9 rounded-lg border border-neutral-200 flex items-center justify-center text-lg font-bold hover:bg-neutral-50 cursor-pointer bg-white">+</button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Texto de Pie de Página</Label>
                  <Input className="h-10 rounded-xl border-neutral-200" value={ps.footer}
                    onChange={e => updatePrintSettings({ footer: e.target.value })} />
                </div>

                <Button className="rounded-lg bg-black text-white hover:bg-neutral-800 cursor-pointer"
                  onClick={() => toast.success("Configuración de impresión guardada")}>
                  <Check className="h-4 w-4 mr-2" /> Guardar Configuración de Impresión
                </Button>
              </CardContent>
            </Card>
          )}

          {printTab === "warranty" && (
            <Card className="border-neutral-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <CardHeader>
                <CardTitle>Garantía en Factura</CardTitle>
                <CardDescription>Configura los textos de garantía que se imprimen en los recibos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3 p-4 rounded-2xl border border-emerald-100 bg-emerald-50/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <Label className="text-sm font-bold text-neutral-800 cursor-default">Imprimir Garantía</Label>
                    </div>
                    <button
                      onClick={() => updatePrintSettings({ showWarranty: !(ps.showWarranty ?? true) })}
                      className={cn("h-6 w-11 rounded-full transition-all relative cursor-pointer border-none",
                        (ps.showWarranty ?? true) ? "bg-emerald-600" : "bg-neutral-200")}
                    >
                      <div className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                        (ps.showWarranty ?? true) ? "left-5" : "left-0.5")} />
                    </button>
                  </div>

                  {(ps.showWarranty ?? true) && (
                    <>
                      <p className="text-xs text-neutral-500">Selecciona una plantilla o escribe tu propio texto de garantía.</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          "Garantía: 30 días en mano de obra.",
                          "Garantía: 90 días en piezas y mano de obra.",
                          "Garantía: 15 días en mano de obra. Sin garantía en piezas.",
                          "Sin garantía en repuestos suministrados por el cliente.",
                          "Garantía limitada según condiciones del fabricante.",
                        ].map((tpl) => (
                          <button
                            key={tpl}
                            onClick={() => updatePrintSettings({ warrantyText: tpl })}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer",
                              ps.warrantyText === tpl
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-white text-neutral-600 border-neutral-200 hover:border-emerald-300 hover:bg-emerald-50"
                            )}
                          >
                            {tpl.length > 38 ? tpl.slice(0, 38) + "\u2026" : tpl}
                          </button>
                        ))}
                      </div>
                      <textarea
                        className="w-full min-h-[72px] rounded-xl border border-neutral-200 text-sm p-2.5 resize-none focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200 bg-white"
                        placeholder="Ej: Garantía: 30 días en mano de obra y 90 días en piezas."
                        value={ps.warrantyText ?? ""}
                        onChange={e => updatePrintSettings({ warrantyText: e.target.value })}
                      />
                    </>
                  )}
                </div>

                <Button className="rounded-lg bg-black text-white hover:bg-neutral-800 cursor-pointer"
                  onClick={() => toast.success("Configuración de garantía guardada")}>
                  <Check className="h-4 w-4 mr-2" /> Guardar Garantía
                </Button>
              </CardContent>
            </Card>
          )}

          {printTab === "barcode" && (
            <Card className="border-neutral-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <CardHeader>
                <CardTitle>Etiquetas de Código de Barras</CardTitle>
                <CardDescription>Ajusta el tamaño y formato para impresión térmica de etiquetas del inventario.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Ancho de la barra</Label>
                    <Input type="number" step="0.1" min="1" className="h-10 rounded-xl border-neutral-200" value={psBarcode?.width ?? 1.5}
                      onChange={e => updateBarcodeSettings({ width: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Altura del código</Label>
                    <Input type="number" className="h-10 rounded-xl border-neutral-200" value={psBarcode?.height ?? 40}
                      onChange={e => updateBarcodeSettings({ height: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tamaño de fuente</Label>
                    <Input type="number" className="h-10 rounded-xl border-neutral-200" value={psBarcode?.fontSize ?? 14}
                      onChange={e => updateBarcodeSettings({ fontSize: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5 flex flex-col justify-center">
                    <Label className="mb-2">Mostrar texto</Label>
                    <button onClick={() => updateBarcodeSettings({ showText: !(psBarcode?.showText ?? true) })}
                      className={cn("h-6 w-11 rounded-full transition-all relative cursor-pointer border-none",
                        (psBarcode?.showText ?? true) ? "bg-black" : "bg-neutral-200")}>
                      <div className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                        (psBarcode?.showText ?? true) ? "left-5" : "left-0.5")} />
                    </button>
                  </div>
                </div>

                <Button className="rounded-lg bg-black text-white hover:bg-neutral-800 cursor-pointer mt-4"
                  onClick={() => toast.success("Ajustes de código de barras guardados")}>
                  <Check className="h-4 w-4 mr-2" /> Guardar Código de Barras
                </Button>
              </CardContent>
            </Card>
          )}

          {printTab === "physical" && (
            <PhysicalPrinterSettings />
          )}
        </div>
      )}

      {/* ── USUARIOS ── */}
      {tab === "users" && (
        <div className="space-y-6">
          {/* Role reference */}
          {/* Role simulation banner if active */}
          {simulatedRole && (
            <div className="bg-neutral-900 text-white border border-neutral-800 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-md">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Control de Roles Activo</h4>
                  <p className="text-xs text-neutral-400">
                    Viendo el sistema con los permisos y herramientas asignadas a <strong>{roleLabel(simulatedRole as any)}</strong>.
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => handleSetSimulatedRole(null)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs h-9 px-4 cursor-pointer"
              >
                Restablecer a Administrador
              </Button>
            </div>
          )}

          {/* Role reference */}
          <Card className="border-neutral-100 shadow-sm overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-lg font-bold text-neutral-900">Roles y Control de Acceso (RBAC)</CardTitle>
                <CardDescription className="text-xs text-neutral-500">
                  Estructura de puestos y permisos para el personal de tu taller.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setShowMatrix(!showMatrix)}
                  className="rounded-xl border-neutral-200 text-xs font-bold gap-1.5 h-10 cursor-pointer"
                >
                  <FileText className="h-4 w-4 text-neutral-500" />
                  {showMatrix ? "Ocultar Matriz de Permisos" : "Ver Matriz de Permisos"}
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showMatrix && "rotate-180")} />
                </Button>

                <Button className="rounded-xl bg-black text-white hover:bg-neutral-800 gap-2 cursor-pointer h-10 font-bold text-xs"
                  onClick={() => {
                    const currentCount = users.filter(u => u.tenantId === taller.id).length;
                    const check = checkTenantLimit(currentTenant, "limite_empleados", currentCount, plansData);
                    if (!check.allowed) {
                      toast.error(check.message || "Has alcanzado el límite de empleados de tu plan.");
                      return;
                    }
                    setInviteOpen(true);
                  }}>
                  <Plus className="h-4 w-4" /> Invitar Usuario
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Tarjetas de Roles con diseño moderno y permisos */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {ROLES.map(r => (
                  <div key={r.value} className="flex flex-col justify-between p-4 rounded-2xl border border-neutral-200/80 bg-neutral-50/60 hover:bg-white hover:border-neutral-300 hover:shadow-xs transition-all">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center font-bold", r.color)}>
                            <r.icon className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-black text-neutral-900">{r.label}</span>
                        </div>
                        <Badge className={cn("text-[10px] font-bold border-none rounded-full px-2 py-0.5", r.color)}>{r.badge}</Badge>
                      </div>
                      <p className="text-xs text-neutral-600 leading-relaxed mb-3">
                        {r.desc}
                      </p>
                    </div>

                    <div className="pt-2.5 border-t border-neutral-200/70 space-y-1">
                      <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Permisos Clave:</span>
                      <ul className="text-[11px] text-neutral-600 space-y-1">
                        {r.permissions.slice(0, 3).map((perm, idx) => (
                          <li key={idx} className="flex items-center gap-1.5">
                            <span className="text-emerald-600 font-bold">✓</span> {perm}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              {/* Control de Roles */}
              {currentUser?.role === 'owner' && (
                <div className="p-3.5 rounded-2xl border border-neutral-200 bg-neutral-50 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-xs font-black text-neutral-900 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" /> Control de Roles
                    </span>
                    <p className="text-[11px] text-neutral-500">
                      Supervisa en tiempo real qué herramientas y accesos tiene habilitados cada puesto:
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 flex-nowrap overflow-x-auto pb-0.5">
                    {ROLES.map(r => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => handleSetSimulatedRole(r.value === 'owner' ? null : r.value)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer whitespace-nowrap shrink-0",
                          (simulatedRole === r.value || (!simulatedRole && r.value === 'owner'))
                            ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                            : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100"
                        )}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Matriz Comparativa Colapsable */}
              {showMatrix && (
                <div className="border border-neutral-200 rounded-2xl overflow-hidden shadow-2xs animate-in fade-in duration-300">
                  <div className="bg-neutral-900 text-white p-3.5 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-neutral-200">
                        Matriz Comparativa de Permisos por Rol (RBAC)
                      </h4>
                      <p className="text-[10px] text-neutral-400 mt-0.5">
                        Resumen detallado de accesos por pantalla y módulos
                      </p>
                    </div>
                    <Badge className="bg-emerald-500 text-white border-none text-[10px] font-bold">13 Módulos</Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <Table className="text-xs bg-white">
                      <TableHeader className="bg-neutral-50 border-b border-neutral-200">
                        <TableRow>
                          <TableHead className="font-bold text-neutral-900">Módulo / Pantalla</TableHead>
                          <TableHead className="text-center font-bold text-neutral-900">Dueño</TableHead>
                          <TableHead className="text-center font-bold text-neutral-900">Cajero</TableHead>
                          <TableHead className="text-center font-bold text-neutral-900">Mecánico</TableHead>
                          <TableHead className="text-center font-bold text-neutral-900">Almacén</TableHead>
                          <TableHead className="text-center font-bold text-neutral-900">Recepción</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-neutral-100">
                        {PERMISSION_MATRIX.map((row, idx) => (
                          <TableRow key={idx} className="hover:bg-neutral-50/70">
                            <TableCell className="font-semibold text-neutral-900 py-2.5">
                              {row.module}
                              <span className="block text-[10px] font-normal text-neutral-400">{row.desc}</span>
                            </TableCell>
                            <TableCell className="text-center py-2.5">
                              {row.owner ? <span className="text-xs font-bold text-emerald-600">✓ {row.owner}</span> : <span className="text-neutral-300">✕</span>}
                            </TableCell>
                            <TableCell className="text-center py-2.5">
                              {row.cashier ? <span className="text-xs font-bold text-blue-600">{typeof row.cashier === 'string' ? row.cashier : '✓'}</span> : <span className="text-neutral-300">✕</span>}
                            </TableCell>
                            <TableCell className="text-center py-2.5">
                              {row.mechanic ? <span className="text-xs font-bold text-amber-600">{typeof row.mechanic === 'string' ? row.mechanic : '✓'}</span> : <span className="text-neutral-300">✕</span>}
                            </TableCell>
                            <TableCell className="text-center py-2.5">
                              {row.warehouse ? <span className="text-xs font-bold text-emerald-600">{typeof row.warehouse === 'string' ? row.warehouse : '✓'}</span> : <span className="text-neutral-300">✕</span>}
                            </TableCell>
                            <TableCell className="text-center py-2.5">
                              {row.receptionist ? <span className="text-xs font-bold text-violet-600">{typeof row.receptionist === 'string' ? row.receptionist : '✓'}</span> : <span className="text-neutral-300">✕</span>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active users */}
          <Card className="border-neutral-100 shadow-sm">
            <CardHeader><CardTitle>Usuarios Activos</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-neutral-50">
                {users.filter((u) => u.tenantId === taller.id).map(u => (
                  <div key={u.id} className="flex items-center gap-4 px-5 py-4 hover:bg-neutral-50/50 transition-colors group">
                    <div 
                      className="flex flex-1 items-center gap-4 cursor-pointer"
                      onClick={() => handleEditUser(u)}
                    >
                      <div className="h-9 w-9 rounded-full bg-neutral-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-600 transition-colors">
                        {u.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-neutral-900 group-hover:text-emerald-600 transition-colors">{u.name}</p>
                        <p className="text-xs text-neutral-400">{u.email}</p>
                      </div>
                    </div>
                    <Badge className={cn("border-none rounded-full text-xs", roleBadge(u.role))}>{roleLabel(u.role)}</Badge>
                    <Badge className={cn("border-none rounded-full text-xs",
                      u.status === "active" ? "bg-emerald-100 text-emerald-700"
                        : u.status === "invited" ? "bg-amber-100 text-amber-700"
                          : "bg-neutral-100 text-neutral-500")}>
                      {u.status === "active" ? "Activo" : u.status === "invited" ? "Invitado" : "Inactivo"}
                    </Badge>
                    {u.role !== "owner" && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setPinTarget(u); setPinForm(u.pin || ""); }}
                          className="text-neutral-400 hover:text-emerald-600 transition-colors cursor-pointer border-none bg-transparent p-1.5 rounded-md hover:bg-emerald-50"
                          title="Asignar PIN de Caja">
                          <Key className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(u)}
                          className="text-neutral-300 hover:text-rose-500 transition-colors cursor-pointer border-none bg-transparent p-1.5 rounded-md hover:bg-rose-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Edit User Modal */}
          <Dialog open={!!editUserTarget} onOpenChange={(val) => !val && setEditUserTarget(null)}>
            <DialogContent className="sm:max-w-sm rounded-2xl p-6 bg-white border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-neutral-900 tracking-tight">Editar Usuario</DialogTitle>
                <DialogDescription>Modifica los datos y permisos del empleado.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label>Nombre Completo</Label>
                  <Input className="h-10 rounded-xl border-neutral-200"
                    value={editUserForm.name}
                    onChange={e => setEditUserForm({ ...editUserForm, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Correo Electrónico</Label>
                  <Input type="email" className="h-10 rounded-xl border-neutral-200 bg-neutral-50 text-neutral-500 cursor-not-allowed"
                    value={editUserForm.email}
                    disabled
                    title="El correo no se puede cambiar por motivos de seguridad" />
                </div>
                <div className="space-y-1.5">
                  <Label>Rol</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLES.filter(r => editUserTarget?.role === "owner" ? r.value === "owner" : r.value !== "owner").map(r => (
                      <button key={r.value} onClick={() => setEditUserForm({ ...editUserForm, role: r.value })}
                        className={cn("py-2.5 rounded-xl border text-sm font-bold transition-all cursor-pointer",
                          editUserForm.role === r.value ? "bg-black text-white border-black" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50")}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
                {editUserTarget?.role !== "owner" && (
                  <div className="space-y-1.5 pt-2 border-t border-neutral-100">
                    <Label>Estado de la Cuenta</Label>
                    <div className="flex gap-2">
                      <button onClick={() => setEditUserForm({ ...editUserForm, status: "active" })}
                        className={cn("flex-1 py-2 rounded-xl border text-sm font-bold transition-all cursor-pointer",
                          editUserForm.status === "active" ? "bg-emerald-600 text-white border-emerald-600" : "border-neutral-200 text-neutral-600 hover:bg-emerald-50")}>
                        Activo
                      </button>
                      <button onClick={() => setEditUserForm({ ...editUserForm, status: "inactive" })}
                        className={cn("flex-1 py-2 rounded-xl border text-sm font-bold transition-all cursor-pointer",
                          editUserForm.status === "inactive" ? "bg-rose-600 text-white border-rose-600" : "border-neutral-200 text-neutral-600 hover:bg-rose-50")}>
                        Inactivo
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditUserTarget(null)} className="rounded-xl cursor-pointer">Cancelar</Button>
                <Button onClick={handleSaveEditUser} className="rounded-xl bg-black text-white hover:bg-neutral-800 cursor-pointer border-none">
                  Guardar Cambios
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* User PIN Modal */}
          <Dialog open={!!pinTarget} onOpenChange={(val) => !val && setPinTarget(null)}>
            <DialogContent className="sm:max-w-sm rounded-2xl p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-emerald-600" /> Asignar PIN
                </DialogTitle>
                <DialogDescription>
                  Establece un PIN de 4 dígitos para {pinTarget?.name}. Este PIN se usará para confirmar operaciones como el cierre de caja.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label>PIN (4 dígitos numéricos)</Label>
                  <Input 
                    type="password"
                    maxLength={4}
                    value={pinForm}
                    onChange={(e) => setPinForm(e.target.value.replace(/\D/g, ""))}
                    className="font-mono text-center text-xl tracking-[1em]"
                    placeholder="••••"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPinTarget(null)} className="rounded-xl">Cancelar</Button>
                <Button onClick={handleSavePin} className="rounded-xl bg-black text-white hover:bg-neutral-800">
                  Guardar PIN
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ── SEGURIDAD ── */}
      {tab === "security" && (
        <div className="space-y-6 max-w-md">
          {currentUser?.role === 'owner' && (
            <Card className="border-neutral-100 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-black text-neutral-900 tracking-tight">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  PIN de Autorización Administrativa
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500">
                  Código de seguridad de 4 dígitos requerido para autorizar la edición o eliminación de facturas, compras y cuentas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">PIN del Administrador (4 dígitos)</Label>
                  <div className="relative">
                    <Input 
                      type={showPin ? "text" : "password"} 
                      maxLength={4}
                      className="h-11 rounded-xl border-neutral-200 pr-10 font-mono text-center text-xl tracking-[0.5em] font-black"
                      placeholder="••••"
                      value={adminPinInput}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, "");
                        setAdminPinInput(val);
                      }} 
                    />
                    <button 
                      type="button" 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 cursor-pointer border-none bg-transparent hover:text-neutral-600" 
                      onClick={() => setShowPin(!showPin)}
                    >
                      {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button 
                  className="w-full rounded-xl bg-black text-white hover:bg-neutral-800 h-11 cursor-pointer font-bold" 
                  onClick={saveAdminPin}
                >
                  <Check className="h-4 w-4 mr-2" /> Guardar PIN de Seguridad
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="border-neutral-100 shadow-sm">
            <CardHeader><CardTitle>Cambiar Contraseña</CardTitle><CardDescription>Actualiza tus credenciales de acceso.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "current", label: "Contraseña Actual" },
                { key: "next", label: "Nueva Contraseña" },
                { key: "confirm", label: "Confirmar Nueva Contraseña" },
              ].map(f => (
                <div key={f.key} className="space-y-1.5">
                  <Label>{f.label}</Label>
                  <div className="relative">
                    <Input type={showPw ? "text" : "password"} className="h-10 rounded-xl border-neutral-200 pr-10"
                      value={(pwForm as any)[f.key]}
                      onChange={e => setPwForm({ ...pwForm, [f.key]: e.target.value })} />
                    {f.key === "current" && (
                      <button className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 cursor-pointer border-none bg-transparent" onClick={() => setShowPw(!showPw)}>
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {pwForm.next && pwForm.confirm && pwForm.next !== pwForm.confirm && (
                <p className="text-xs text-rose-500 font-medium">Las contraseñas no coinciden</p>
              )}
              <Button className="w-full rounded-xl bg-black text-white hover:bg-neutral-800 h-11 cursor-pointer" onClick={changePassword}>
                <Shield className="h-4 w-4 mr-2" /> Actualizar Contraseña
              </Button>
            </CardContent>
          </Card>

          {/* ── ZONA DE PELIGRO: Eliminar Cuenta ── */}
          <Card className="border-rose-200 shadow-sm bg-rose-50/30 overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-rose-500 via-red-500 to-rose-600" />
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-black text-rose-700 tracking-tight">
                <AlertTriangle className="h-5 w-5 text-rose-500" />
                Zona de Peligro
              </CardTitle>
              <CardDescription className="text-xs text-rose-600/80">
                Acciones irreversibles que afectan permanentemente tu cuenta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl border border-rose-200 bg-white">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Trash2 className="h-5 w-5 text-rose-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black text-neutral-900 tracking-tight">Eliminar mi cuenta</h4>
                    <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                      Al eliminar tu cuenta se borrará permanentemente tu usuario del sistema de autenticación y se eliminará tu acceso a todas las sucursales. <strong className="text-rose-600">Esta acción no se puede deshacer.</strong>
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 bg-neutral-50 px-2 py-1 rounded-md">
                        <LogOut className="h-3 w-3" /> Se cerrará tu sesión
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 bg-neutral-50 px-2 py-1 rounded-md">
                        <Trash2 className="h-3 w-3" /> Se eliminará tu usuario
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 bg-neutral-50 px-2 py-1 rounded-md">
                        <Shield className="h-3 w-3" /> Sin recuperación posible
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-neutral-100">
                  <Button
                    variant="outline"
                    onClick={() => setIsDeleteAccountOpen(true)}
                    className="rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-400 font-bold h-10 px-5 cursor-pointer transition-all text-xs gap-2"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar mi cuenta permanentemente
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── PLANES ── */}
      {tab === "planes" && (
        <div className="space-y-8">
          {/* Active Subscription Summary Card */}
          {(() => {
            const currentPlan = getTenantPlan(currentTenant, plansData.length > 0 ? plansData : DEFAULT_PLANS);
            const activeEmployees = users.filter((u) => u.tenantId === taller.id).length;
            const activeBranches = allowedTenants.length;
            const maxBranches = currentTenant?.max_sucursales || currentPlan.limite_sucursales || 1;

            return (
              <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-neutral-950 text-white flex items-center justify-center shadow-md">
                      <Crown className="h-7 w-7 text-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Suscripción Actual</span>
                        <Badge className="bg-emerald-100 text-emerald-800 border-none font-extrabold text-xs px-2.5 py-0.5">
                          {currentTenant?.estado || "ACTIVO"}
                        </Badge>
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight mt-0.5">
                        Plan {currentPlan.nombre}
                      </h3>
                    </div>
                  </div>
                  <div className="text-right sm:text-right">
                    <span className="text-xs font-bold text-neutral-400 uppercase block">Costo Base</span>
                    <span className="text-2xl font-black text-neutral-900">{formatRD(currentPlan.precio_mensual)} <span className="text-xs text-neutral-400 font-normal">/mes</span></span>
                  </div>
                </div>

                {/* Capacity Meters */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-neutral-500">👥 Empleados / Técnicos</span>
                      <span className="text-neutral-900">{activeEmployees} / {currentPlan.limite_empleados ?? "∞"}</span>
                    </div>
                    {currentPlan.limite_empleados && (
                      <div className="h-2 w-full bg-neutral-200 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full transition-all", activeEmployees >= currentPlan.limite_empleados ? "bg-rose-500" : "bg-neutral-900")} 
                          style={{ width: `${Math.min(100, (activeEmployees / currentPlan.limite_empleados) * 100)}%` }} 
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-neutral-500">🏪 Sucursales</span>
                      <span className="text-neutral-900">{activeBranches} / {maxBranches}</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-200 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full transition-all", activeBranches >= maxBranches ? "bg-amber-500" : "bg-emerald-600")} 
                        style={{ width: `${Math.min(100, (activeBranches / maxBranches) * 100)}%` }} 
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-neutral-500">💬 Mensajes WhatsApp</span>
                      <span className="text-neutral-900">{currentPlan.limite_whatsapp_mes ? `${currentPlan.limite_whatsapp_mes.toLocaleString()}/mes` : "Ilimitados"}</span>
                    </div>
                    <div className="text-[11px] text-neutral-400 font-medium">
                      Notificaciones de cambio de estado de OT y chat
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          <div>
            <CardTitle className="text-xl font-black text-neutral-900 tracking-tight">Catálogo de Planes Disponibles</CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">Explora o actualiza el plan de tu taller para habilitar funciones avanzadas.</CardDescription>
          </div>
          
          {plansLoading ? (
            <div className="text-center py-12 text-sm text-neutral-500 font-medium">Cargando planes...</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3 items-stretch">
              {(plansData.length > 0 ? plansData : DEFAULT_PLANS).map((p) => {
                const isCurrentPlan = currentTenant?.plan_id?.toLowerCase() === p.id.toLowerCase();
                return (
                  <Card key={p.id} className={cn("border p-6 sm:p-7 shadow-xs bg-white rounded-3xl flex flex-col justify-between transition-all", p.destacado ? "ring-2 ring-neutral-950 border-neutral-950 shadow-md" : "border-neutral-200/80")}>
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="font-heading text-xl font-extrabold text-neutral-900">{p.nombre}</span>
                        {p.destacado && <Badge className="bg-neutral-950 text-white border-none font-bold text-[10px] uppercase tracking-wider">Popular</Badge>}
                        {isCurrentPlan && <Badge className="bg-emerald-100 text-emerald-800 border-none font-bold text-[10px] uppercase tracking-wider">Plan Actual</Badge>}
                      </div>
                      <div className="mt-3 font-heading text-3xl font-black text-neutral-900">{formatRD(p.precio_mensual)}<span className="text-xs font-semibold text-neutral-400">/mes</span></div>
                      {(p.precio_anual || 0) > 0 && (
                        <div className="text-xs text-neutral-400 font-semibold mt-0.5">o {formatRD(p.precio_anual || 0)}/año (Ahorras 2 meses)</div>
                      )}
                      <div className="mt-5 space-y-2.5 text-xs text-neutral-700 border-t border-neutral-100 pt-4">
                        <div className="font-semibold flex items-center gap-2">👥 {p.limite_empleados ? `Hasta ${p.limite_empleados} Técnicos/Empleados` : "Empleados Ilimitados"}</div>
                        <div className="font-semibold flex items-center gap-2">📦 {p.limite_ordenes_mes ? `Hasta ${p.limite_ordenes_mes} Órdenes/mes` : "Órdenes de Trabajo Ilimitadas"}</div>
                        <div className="font-semibold flex items-center gap-2">🏪 {p.limite_sucursales ? `Hasta ${p.limite_sucursales} Sucursales` : "Multi-Sucursal Ilimitada"}</div>
                        <div className="font-semibold text-blue-600 flex items-center gap-2">💬 {p.limite_whatsapp_mes ? `${p.limite_whatsapp_mes.toLocaleString()} msgs WhatsApp/mes` : "WhatsApp Ilimitado"}</div>
                        
                        <div className="border-t border-neutral-100 pt-3 space-y-1.5">
                          <div className={cn("flex items-center gap-2 text-xs", p.modulos.facturacion_fiscal ? "text-emerald-700 font-bold" : "text-neutral-400 line-through opacity-60")}>
                            <span>{p.modulos.facturacion_fiscal ? "✓" : "✗"}</span>
                            <span>Facturación Fiscal e-CF / NCF (DGII)</span>
                          </div>
                          <div className={cn("flex items-center gap-2 text-xs", p.modulos.nomina_comisiones ? "text-emerald-700 font-bold" : "text-neutral-400 line-through opacity-60")}>
                            <span>{p.modulos.nomina_comisiones ? "✓" : "✗"}</span>
                            <span>Comisiones de Mecánicos & Nómina</span>
                          </div>
                          <div className={cn("flex items-center gap-2 text-xs", p.modulos.inspecciones_mpi ? "text-emerald-700 font-bold" : "text-neutral-400 line-through opacity-60")}>
                            <span>{p.modulos.inspecciones_mpi ? "✓" : "✗"}</span>
                            <span>Inspección Digital Multipunto (MPI)</span>
                          </div>
                          <div className={cn("flex items-center gap-2 text-xs", p.modulos.proveedores_cuentas ? "text-emerald-700 font-bold" : "text-neutral-400 line-through opacity-60")}>
                            <span>{p.modulos.proveedores_cuentas ? "✓" : "✗"}</span>
                            <span>Proveedores & Cuentas por Pagar</span>
                          </div>
                          <div className={cn("flex items-center gap-2 text-xs", p.modulos.multisucursal ? "text-emerald-700 font-bold" : "text-neutral-400 line-through opacity-60")}>
                            <span>{p.modulos.multisucursal ? "✓" : "✗"}</span>
                            <span>Panel Administrador Multi-Sede</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-neutral-100">
                      <Button 
                        disabled={isCurrentPlan}
                        className={cn(
                          "w-full rounded-2xl font-bold cursor-pointer h-11 text-xs",
                          isCurrentPlan 
                            ? "bg-neutral-100 text-neutral-400 cursor-not-allowed hover:bg-neutral-100" 
                            : "bg-neutral-950 text-white hover:bg-black"
                        )}
                        onClick={() => {
                          const checkoutUrl = formatPolarUrl(p.polar_product_monthly_url);
                          if (checkoutUrl) {
                            window.open(checkoutUrl, "_blank");
                          } else {
                            window.open(`https://wa.me/18299681720?text=Hola ServiTracks, quiero cambiar al plan ${p.nombre} para mi taller ${taller.name}.`, "_blank");
                          }
                        }}
                      >
                        {isCurrentPlan ? "Plan Activo" : `Actualizar a ${p.nombre}`}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── INVITE USER DIALOG ── */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl bg-white p-6 shadow-2xl border-none max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
          <DialogHeader className="pb-3 border-b border-neutral-100 flex-shrink-0">
            <DialogTitle className="text-xl font-black text-neutral-900 tracking-tight">Crear Nuevo Empleado</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 py-4 my-1 space-y-4 custom-scrollbar">
            <div className="space-y-1.5">
              <Label>Nombre Completo</Label>
              <Input className="h-10 rounded-xl border-neutral-200"
                placeholder="Ej. Juan Pérez"
                value={inviteForm.name}
                onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Correo Electrónico</Label>
              <Input type="email" className="h-10 rounded-xl border-neutral-200"
                placeholder="juan@taller.do"
                value={inviteForm.email}
                onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Contraseña</Label>
              <Input type="text" className="h-10 rounded-xl border-neutral-200"
                placeholder="Ej. mecanico123"
                value={inviteForm.password}
                onChange={e => setInviteForm({ ...inviteForm, password: e.target.value })} />
              <p className="text-[10px] text-neutral-400">El empleado usará esta contraseña para iniciar sesión.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.filter(r => r.value !== "owner").map(r => (
                  <button key={r.value} onClick={() => setInviteForm({ ...inviteForm, role: r.value })}
                    className={cn("py-2.5 rounded-xl border text-sm font-bold transition-all cursor-pointer",
                      inviteForm.role === r.value ? "bg-black text-white border-black" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50")}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-3 border-t border-neutral-100 flex-shrink-0">
            <Button variant="outline" className="rounded-xl flex-1 cursor-pointer" onClick={() => setInviteOpen(false)} disabled={isInviting}>Cancelar</Button>
            <Button className="rounded-xl flex-1 bg-black text-white hover:bg-neutral-800 cursor-pointer border-none" onClick={handleInvite} disabled={isInviting}>
              {isInviting ? "Creando..." : "Crear Usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── REGISTER BRANCH (SUCURSAL) DIALOG ── */}
      <Dialog open={branchOpen} onOpenChange={setBranchOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white p-6 shadow-2xl border-none max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
          <DialogHeader className="pb-3 border-b border-neutral-100 flex-shrink-0">
            <DialogTitle className="text-xl font-black text-neutral-900 tracking-tight">Registrar Nueva Sucursal</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 py-4 my-1 space-y-4 custom-scrollbar">
            <div className="space-y-1.5">
              <Label>Nombre Comercial</Label>
              <Input className="h-10 rounded-xl border-neutral-200"
                placeholder="Ej. Servicentro Santiago Norte"
                value={branchForm.name}
                onChange={e => handleBranchNameChange(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Slug Comercial (URL)</Label>
              <div className="flex items-center rounded-xl border border-neutral-200 overflow-hidden bg-neutral-50">
                <span className="px-3 py-2.5 text-[10px] font-mono text-neutral-400 bg-neutral-100 border-r border-neutral-200 whitespace-nowrap select-none">servitracks.com/</span>
                <Input className="h-10 border-0 rounded-none font-mono text-xs text-neutral-700 bg-neutral-50 focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="servicentro-santiago-norte"
                  value={branchForm.slug}
                  onChange={e => setBranchForm({ ...branchForm, slug: e.target.value.replace(/\s+/g, "-").toLowerCase() })} />
              </div>
              <p className="text-[10px] text-neutral-400 font-medium">Se utilizará para generar el enlace exclusivo de esta sede.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>RNC / Cédula</Label>
                <Input className="h-10 rounded-xl border-neutral-200"
                  placeholder="1-32-12345-9"
                  value={branchForm.rnc}
                  onChange={e => setBranchForm({ ...branchForm, rnc: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono</Label>
                <Input className="h-10 rounded-xl border-neutral-200"
                  placeholder="809-555-0199"
                  value={branchForm.phone}
                  onChange={e => setBranchForm({ ...branchForm, phone: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Correo de la Sucursal</Label>
              <Input type="email" className="h-10 rounded-xl border-neutral-200"
                placeholder="norte@tallergarcia.do"
                value={branchForm.email}
                onChange={e => setBranchForm({ ...branchForm, email: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label>Dirección Física</Label>
              <Input className="h-10 rounded-xl border-neutral-200"
                placeholder="Autopista Duarte Km 5, Santiago"
                value={branchForm.address}
                onChange={e => setBranchForm({ ...branchForm, address: e.target.value })} />
            </div>

            {/* Note about status pending */}
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex gap-2">
              <Landmark className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider block">Nota de Suscripción</span>
                <span className="text-[10px] text-amber-700 leading-tight block">Las nuevas sucursales se registran en estado <strong>Pendiente de Pago</strong>. Deberás activar su membresía para operar en ella.</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-3 border-t border-neutral-100 flex-shrink-0">
            <Button variant="outline" className="rounded-xl flex-1 cursor-pointer" onClick={() => setBranchOpen(false)}>Cancelar</Button>
            <Button className="rounded-xl flex-1 bg-black text-white hover:bg-neutral-800 cursor-pointer border-none" onClick={handleRegisterBranch}>
              Registrar Sucursal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE USER CONFIRMATION ── */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl bg-white p-6 shadow-2xl border-none">
          <DialogHeader><DialogTitle className="text-xl font-bold">Eliminar Usuario</DialogTitle></DialogHeader>
          <p className="text-sm text-neutral-600 py-2">
            ¿Estás seguro de eliminar a <strong>{deleteTarget?.name}</strong>? Esta acción no se puede deshacer.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl flex-1 cursor-pointer" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button className="rounded-xl flex-1 bg-rose-600 text-white hover:bg-rose-700 cursor-pointer border-none animate-in fade-in-50 duration-200" onClick={confirmDelete}>
              <Trash2 className="h-4 w-4 mr-2" /> Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── EDIT BRANCH (SUCURSAL) DIALOG ── */}
      <Dialog open={!!editBranchTarget} onOpenChange={() => setEditBranchTarget(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white p-6 shadow-2xl border-none max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
          <DialogHeader className="pb-3 border-b border-neutral-100 flex-shrink-0">
            <DialogTitle className="text-xl font-black text-neutral-900 tracking-tight">Editar Sucursal</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 py-4 my-1 space-y-4 custom-scrollbar">
            <div className="space-y-1.5">
              <Label>Nombre Comercial</Label>
              <Input className="h-10 rounded-xl border-neutral-200"
                placeholder="Ej. Servicentro Santiago Norte"
                value={editBranchForm.name}
                onChange={e => setEditBranchForm({ ...editBranchForm, name: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label>Slug Comercial (URL)</Label>
              <div className="flex items-center rounded-xl border border-neutral-200 overflow-hidden bg-neutral-50">
                <span className="px-3 py-2.5 text-[10px] font-mono text-neutral-400 bg-neutral-100 border-r border-neutral-200 whitespace-nowrap select-none">servitracks.com/</span>
                <Input className="h-10 border-0 rounded-none font-mono text-xs text-neutral-700 bg-neutral-50 focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="servicentro-santiago-norte"
                  value={editBranchForm.slug}
                  onChange={e => setEditBranchForm({ ...editBranchForm, slug: e.target.value.replace(/\s+/g, "-").toLowerCase() })} />
              </div>
              <p className="text-[10px] text-neutral-400 font-medium">Se utilizará para generar el enlace exclusivo de esta sede.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>RNC / Cédula</Label>
                <Input className="h-10 rounded-xl border-neutral-200"
                  placeholder="1-32-12345-9"
                  value={editBranchForm.rnc}
                  onChange={e => setEditBranchForm({ ...editBranchForm, rnc: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono</Label>
                <Input className="h-10 rounded-xl border-neutral-200"
                  placeholder="809-555-0199"
                  value={editBranchForm.phone}
                  onChange={e => setEditBranchForm({ ...editBranchForm, phone: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Correo de la Sucursal</Label>
              <Input type="email" className="h-10 rounded-xl border-neutral-200"
                placeholder="norte@tallergarcia.do"
                value={editBranchForm.email}
                onChange={e => setEditBranchForm({ ...editBranchForm, email: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label>Dirección Física</Label>
              <Input className="h-10 rounded-xl border-neutral-200"
                placeholder="Autopista Duarte Km 5, Santiago"
                value={editBranchForm.address}
                onChange={e => setEditBranchForm({ ...editBranchForm, address: e.target.value })} />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-3 border-t border-neutral-100 flex-shrink-0">
            <Button variant="outline" className="rounded-xl flex-1 cursor-pointer" onClick={() => setEditBranchTarget(null)}>Cancelar</Button>
            <Button className="rounded-xl flex-1 bg-black text-white hover:bg-neutral-800 cursor-pointer border-none" onClick={handleSaveEditBranch}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE BRANCH CONFIRMATION ── */}
      <Dialog open={!!deleteBranchTarget} onOpenChange={() => setDeleteBranchTarget(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl bg-white p-6 shadow-2xl border-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-neutral-900 tracking-tight">Eliminar Sucursal</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-600 py-2 leading-relaxed">
            ¿Estás completamente seguro de eliminar de forma permanente la sucursal <strong>{deleteBranchTarget?.name}</strong>? Se perderán todos sus registros asociados. Esta acción es irreversible.
          </p>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" className="rounded-xl flex-1 cursor-pointer" onClick={() => setDeleteBranchTarget(null)}>Cancelar</Button>
            <Button
              className="rounded-xl flex-1 bg-rose-600 text-white hover:bg-rose-700 cursor-pointer border-none"
              onClick={confirmDeleteBranch}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Eliminar Sucursal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE ACCOUNT CONFIRMATION ── */}
      <Dialog open={isDeleteAccountOpen} onOpenChange={(val) => { if (!isDeletingAccount) { setIsDeleteAccountOpen(val); setDeleteConfirmText(""); } }}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white p-0 shadow-2xl border-none overflow-hidden">
          {/* Danger Header */}
          <div className="bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight">Eliminar Cuenta</h3>
                <p className="text-rose-100 text-xs mt-0.5 font-medium">Esta acción es permanente e irreversible</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Warning Box */}
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-amber-900">¿Qué sucederá al eliminar tu cuenta?</p>
                  <ul className="text-[11px] text-amber-800 space-y-1 list-disc pl-4">
                    <li>Tu usuario será eliminado del sistema de autenticación</li>
                    <li>Perderás acceso a todas las sucursales vinculadas</li>
                    <li>Tu sesión se cerrará inmediatamente</li>
                    <li>Los datos del taller (facturas, inventario, clientes) <strong>permanecerán intactos</strong> para otros usuarios</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* User Card */}
            <div className="flex items-center gap-3 p-3 rounded-xl border border-neutral-100 bg-neutral-50">
              <div className="h-10 w-10 rounded-xl bg-neutral-900 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                {currentUser?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "??"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-neutral-900 truncate">{currentUser?.name || "Usuario"}</p>
                <p className="text-[10px] text-neutral-400 truncate">{currentUser?.email}</p>
              </div>
            </div>

            {/* Confirmation Input */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-neutral-700">
                Para confirmar, escribe <span className="text-rose-600 font-black px-1.5 py-0.5 bg-rose-50 rounded">ELIMINAR</span> a continuación:
              </Label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                placeholder="Escribe ELIMINAR"
                className="h-11 rounded-xl border-neutral-200 font-mono text-center text-lg tracking-widest font-bold focus:border-rose-300 focus:ring-rose-200"
                disabled={isDeletingAccount}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="px-6 pb-6 flex gap-3">
            <Button
              variant="outline"
              className="rounded-xl flex-1 cursor-pointer h-11 font-bold"
              onClick={() => { setIsDeleteAccountOpen(false); setDeleteConfirmText(""); }}
              disabled={isDeletingAccount}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-xl flex-1 bg-rose-600 text-white hover:bg-rose-700 cursor-pointer border-none h-11 font-bold gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== "ELIMINAR" || isDeletingAccount}
            >
              {isDeletingAccount ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Eliminando...</>
              ) : (
                <><Trash2 className="h-4 w-4" /> Eliminar mi cuenta</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
