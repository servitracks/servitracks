"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Building2, Shield, TrendingUp, Users, Package, Wrench, Wallet, 
  ReceiptText, ArrowUpRight, ArrowDownRight, RefreshCw, Download, 
  Printer, Plus, Search, CheckCircle2, AlertTriangle, Clock, 
  DollarSign, Percent, BarChart3, Truck, Car, History, FileText,
  ExternalLink, Copy, Check, ChevronRight, Layers, Eye, ShieldCheck,
  CreditCard, Sparkles, Filter, Calendar, Award
} from "lucide-react";
import { useStore, Invoice, WorkOrder, Product, Service, Customer, Vehicle, Caja, MovimientoCaja, Technician, Supplier, AccountPayable, Tenant } from "@/store/useStore";
import { useNominaStore } from "@/store/useNominaStore";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { InvoiceDetailDialog } from "@/components/dashboard/InvoiceDetailDialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabaseAdmin } from "@/lib/supabase";
import { getTenantPlan, checkTenantLimit } from "@/lib/plans";

// Format currency
const formatRD = (amount: number) => {
  return `RD$ ${Number(amount || 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatShortRD = (amount: number) => {
  return `RD$ ${Number(amount || 0).toLocaleString("es-DO", { maximumFractionDigits: 0 })}`;
};

type AdminModuleType = "ventas" | "caja" | "servicios" | "ordenes" | "inventario" | "personal";

export default function AdminPanelPage() {
  const params = useParams();
  const navigate = useNavigate();
  const tenantSlug = (params?.tenant as string) || "autocheck";

  // Zustand Store
  const { 
    tenants, 
    currentUserId, 
    users, 
    orders: allOrders, 
    invoices: allInvoices, 
    products: allProducts, 
    services: allServices, 
    customers: allCustomers, 
    vehicles: allVehicles, 
    cajas: allCajas, 
    cajaMovements: allCajaMovements, 
    technicians: allTechnicians, 
    suppliers: allSuppliers, 
    accountsPayable: allAccountsPayable, 
    activityLogs: allActivityLogs,
    quotes: allQuotes,
    addTenant
  } = useStore();

  const { empleados, nominas } = useNominaStore();

  const currentTenant = tenants.find((t) => t.slug === tenantSlug) ?? null;
  const tenantId = currentTenant?.id ?? "";

  // Filtered by current tenant
  const tenantOrders = useMemo(() => tenantId ? allOrders.filter((o) => o.tenantId === tenantId) : [], [allOrders, tenantId]);
  const tenantInvoices = useMemo(() => tenantId ? allInvoices.filter((i) => i.tenantId === tenantId) : [], [allInvoices, tenantId]);
  const tenantProducts = useMemo(() => tenantId ? allProducts.filter((p) => p.tenantId === tenantId) : [], [allProducts, tenantId]);
  const tenantServices = useMemo(() => tenantId ? allServices.filter((s) => s.tenantId === tenantId) : [], [allServices, tenantId]);
  const tenantCustomers = useMemo(() => tenantId ? allCustomers.filter((c) => c.tenantId === tenantId) : [], [allCustomers, tenantId]);
  const tenantVehicles = useMemo(() => tenantId ? allVehicles.filter((v) => v.tenantId === tenantId) : [], [allVehicles, tenantId]);
  const tenantCajas = useMemo(() => tenantId ? allCajas.filter((c) => c.tenant_id === tenantId) : [], [allCajas, tenantId]);
  const tenantCajaMovements = useMemo(() => tenantId ? allCajaMovements.filter((m) => m.tenant_id === tenantId) : [], [allCajaMovements, tenantId]);
  const tenantTechnicians = useMemo(() => tenantId ? allTechnicians.filter((t) => t.tenantId === tenantId) : [], [allTechnicians, tenantId]);
  const tenantSuppliers = useMemo(() => tenantId ? allSuppliers.filter((s) => s.tenantId === tenantId) : [], [allSuppliers, tenantId]);
  const tenantAccountsPayable = useMemo(() => tenantId ? allAccountsPayable.filter((a) => a.tenantId === tenantId) : [], [allAccountsPayable, tenantId]);
  const tenantActivityLogs = useMemo(() => tenantId ? allActivityLogs.filter((a) => a.tenantId === tenantId) : [], [allActivityLogs, tenantId]);
  const tenantQuotes = useMemo(() => tenantId ? allQuotes.filter((q) => q.tenantId === tenantId) : [], [allQuotes, tenantId]);
  const tenantUsers = useMemo(() => tenantId ? users.filter((u) => u.tenantId === tenantId) : [], [users, tenantId]);

  // Associated tenants (multi-branch belonging to the same user or organization)
  const userTenants = useMemo(() => {
    const currentUser = users.find((u) => u.id === currentUserId);
    if (!currentUser) return tenants;
    if (currentUser.email === "admin@servitracks.com") return tenants;
    const sameEmailUsers = users.filter((u) => u.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim());
    const allowedIds = new Set(sameEmailUsers.map((u) => u.tenantId));
    const matching = tenants.filter((t) => allowedIds.has(t.id));
    return matching.length > 0 ? matching : tenants.filter((t) => t.id === tenantId);
  }, [tenants, users, currentUserId, tenantId]);

  // Active navigation module
  const [activeModule, setActiveModule] = useState<AdminModuleType>("ventas");

  // States
  const [period, setPeriod] = useState<"today" | "week" | "month" | "year" | "all">("month");
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isNewBranchOpen, setIsNewBranchOpen] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");

  // New branch form state
  const [newBranchForm, setNewBranchForm] = useState({
    name: "",
    slug: "",
    address: "",
    phone: "",
    email: "",
    rnc: ""
  });

  // Filter dates calculation
  const filterTimestamp = useMemo(() => {
    const now = new Date();
    if (period === "today") {
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      return todayStart.getTime();
    }
    if (period === "week") {
      return now.getTime() - 7 * 24 * 60 * 60 * 1000;
    }
    if (period === "month") {
      return now.getTime() - 30 * 24 * 60 * 60 * 1000;
    }
    if (period === "year") {
      return now.getTime() - 365 * 24 * 60 * 60 * 1000;
    }
    return 0; // All time
  }, [period]);

  // Filtered dataset by period
  const filteredInvoices = useMemo(() => {
    if (period === "all") return tenantInvoices;
    return tenantInvoices.filter((i) => new Date(i.createdAt).getTime() >= filterTimestamp);
  }, [tenantInvoices, filterTimestamp, period]);

  const filteredOrders = useMemo(() => {
    if (period === "all") return tenantOrders;
    return tenantOrders.filter((o) => new Date(o.createdAt).getTime() >= filterTimestamp);
  }, [tenantOrders, filterTimestamp, period]);

  const filteredCajaMovements = useMemo(() => {
    if (period === "all") return tenantCajaMovements;
    return tenantCajaMovements.filter((m) => new Date(m.creado_en).getTime() >= filterTimestamp);
  }, [tenantCajaMovements, filterTimestamp, period]);

  // Financial Metrics
  const paidInvoices = useMemo(() => filteredInvoices.filter((i) => i.status === "paid"), [filteredInvoices]);
  const totalSales = useMemo(() => paidInvoices.reduce((sum, i) => sum + (i.total || 0), 0), [paidInvoices]);
  const totalTax = useMemo(() => paidInvoices.reduce((sum, i) => sum + (i.tax || 0), 0), [paidInvoices]);
  const netSales = totalSales - totalTax;

  // Payment methods breakdown
  const paymentMethodsData = useMemo(() => {
    let cash = 0;
    let card = 0;
    let transfer = 0;
    paidInvoices.forEach((inv) => {
      const pm = (inv.paymentMethod || "").toLowerCase();
      if (pm.includes("efectivo") || pm === "cash") cash += inv.total;
      else if (pm.includes("tarjeta") || pm === "card" || pm === "card_credit" || pm === "card_debit") card += inv.total;
      else if (pm.includes("transfer") || pm === "transferencia") transfer += inv.total;
      else cash += inv.total; // Default fallback
    });
    return { cash, card, transfer, total: cash + card + transfer };
  }, [paidInvoices]);

  // NCF Types breakdown
  const ncfBreakdown = useMemo(() => {
    const map: Record<string, { count: number; total: number; label: string }> = {
      B01: { count: 0, total: 0, label: "Crédito Fiscal (B01)" },
      B02: { count: 0, total: 0, label: "Consumidor Final (B02)" },
      B14: { count: 0, total: 0, label: "Regímenes Especiales (B14)" },
      B15: { count: 0, total: 0, label: "Gubernamental (B15)" },
      OTRO: { count: 0, total: 0, label: "Factura Estándar / Sin NCF" },
    };

    paidInvoices.forEach((inv) => {
      const ncf = inv.ncf || "";
      let matched = false;
      for (const prefix of ["B01", "B02", "B14", "B15"]) {
        if (ncf.startsWith(prefix) || ncf.startsWith(`E${prefix.slice(1)}`)) {
          map[prefix].count += 1;
          map[prefix].total += inv.total;
          matched = true;
          break;
        }
      }
      if (!matched) {
        map.OTRO.count += 1;
        map.OTRO.total += inv.total;
      }
    });

    return Object.entries(map).filter(([_, val]) => val.count > 0 || val.total > 0);
  }, [paidInvoices]);

  // Active Orders metrics
  const activeOrdersCount = useMemo(() => {
    return tenantOrders.filter((o) => ["pending", "diagnosing", "waiting_parts", "repairing"].includes(o.status)).length;
  }, [tenantOrders]);

  const ordersByStatus = useMemo(() => {
    const labels: Record<string, string> = {
      pending: "Pendiente",
      diagnosing: "Diagnóstico",
      waiting_parts: "Esperando Piezas",
      repairing: "En Reparación",
      finished: "Finalizado",
      delivered: "Entregado"
    };
    return Object.keys(labels).map((status) => ({
      status,
      label: labels[status],
      count: filteredOrders.filter((o) => o.status === status).length,
    }));
  }, [filteredOrders]);

  // Cash Register (Caja) status and summary
  const activeCaja = useMemo(() => {
    return tenantCajas.find((c) => c.estado === "ABIERTA");
  }, [tenantCajas]);

  const closedCajasHistory = useMemo(() => {
    return tenantCajas
      .filter((c) => c.estado === "CERRADA")
      .sort((a, b) => new Date(b.cerrada_en || b.abierta_en).getTime() - new Date(a.cerrada_en || a.abierta_en).getTime());
  }, [tenantCajas]);

  const activeCajaTotals = useMemo(() => {
    if (!activeCaja) return null;
    const movements = tenantCajaMovements.filter((m) => m.caja_id === activeCaja.id);
    let ingresosEfectivo = 0;
    let egresosEfectivo = 0;
    let digitalTotal = 0;

    movements.forEach((m) => {
      const isIngreso = ["INGRESO", "VENTA", "ABONO"].includes(m.tipo);
      if (m.metodo === "EFECTIVO") {
        if (isIngreso) ingresosEfectivo += m.monto;
        else egresosEfectivo += m.monto;
      } else {
        digitalTotal += m.monto;
      }
    });

    const efectivoEsperado = (activeCaja.monto_inicial || 0) + ingresosEfectivo - egresosEfectivo;
    return {
      montoInicial: activeCaja.monto_inicial || 0,
      ingresosEfectivo,
      egresosEfectivo,
      digitalTotal,
      efectivoEsperado,
      movementsCount: movements.length
    };
  }, [activeCaja, tenantCajaMovements]);

  // Egresos by category
  const egresosByCategory = useMemo(() => {
    const categories: Record<string, number> = {};
    filteredCajaMovements
      .filter((m) => ["EGRESO", "RETIRO", "GASTO_CAJA_CHICA", "PAGO_NOMINA"].includes(m.tipo))
      .forEach((m) => {
        let cat = "Operativos / Otros";
        const c = (m.concepto || "").toLowerCase();
        if (c.includes("combustible") || c.includes("gasolina") || c.includes("gasoil")) cat = "Combustible";
        else if (c.includes("almuerzo") || c.includes("comida")) cat = "Almuerzos";
        else if (c.includes("limpieza")) cat = "Limpieza";
        else if (c.includes("suministro") || c.includes("repuesto") || c.includes("pieza")) cat = "Piezas / Taller";
        else if (c.includes("nomina") || c.includes("técnico") || c.includes("pago")) cat = "Nómina y Comisiones";
        else if (c.includes("papelería")) cat = "Papelería y Oficina";

        categories[cat] = (categories[cat] || 0) + m.monto;
      });

    return Object.entries(categories)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredCajaMovements]);

  // Inventory valuation & low stock
  const inventoryValuation = useMemo(() => {
    let totalCost = 0;
    let totalSale = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    tenantProducts.forEach((p) => {
      const stock = p.stock || 0;
      const cost = p.costPrice || 0;
      const sale = p.salePrice || 0;
      totalCost += stock * cost;
      totalSale += stock * sale;
      if (stock <= 0) outOfStockCount += 1;
      else if (stock <= (p.minStock || 3)) lowStockCount += 1;
    });

    return { totalCost, totalSale, potentialProfit: totalSale - totalCost, lowStockCount, outOfStockCount };
  }, [tenantProducts]);

  // Services Ranking & Labor Analysis
  const topServices = useMemo(() => {
    const map: Record<string, { name: string; count: number; total: number; labor: number }> = {};
    paidInvoices.forEach((inv) => {
      inv.items.forEach((item) => {
        const key = item.name;
        if (!map[key]) map[key] = { name: item.name, count: 0, total: 0, labor: 0 };
        map[key].count += item.quantity;
        map[key].total += item.unitPrice * item.quantity;
        map[key].labor += (item.laborPrice || 0) * item.quantity;
      });
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 6);
  }, [paidInvoices]);

  // Top Vehicle Brands
  const vehicleBrands = useMemo(() => {
    const counts: Record<string, number> = {};
    tenantVehicles.forEach((v) => {
      const b = (v.brand || "Otras").trim().toUpperCase();
      counts[b] = (counts[b] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [tenantVehicles]);

  // Suppliers & Accounts Payable
  const accountsPayableSummary = useMemo(() => {
    let pending = 0;
    let paid = 0;
    tenantAccountsPayable.forEach((ap) => {
      if (ap.status === "pagada") paid += ap.amount || 0;
      else pending += (ap.amount || 0) - (ap.paidAmount || 0);
    });
    return { pending, paid, totalBills: tenantAccountsPayable.length };
  }, [tenantAccountsPayable]);

  // Synchronize state directly from Supabase
  const handleRefreshSupabase = async () => {
    if (!tenantId) {
      toast.error("No se encontró el ID del taller");
      return;
    }
    setIsSyncing(true);
    try {
      const { downloadFullStateFromSupabase } = await import("@/lib/supabaseSync");
      const dbState = await downloadFullStateFromSupabase(tenantId);
      
      useStore.setState({
        customers: dbState.customers,
        vehicles: dbState.vehicles,
        maintenanceItems: dbState.maintenanceItems,
        services: dbState.services,
        products: dbState.products,
        orders: dbState.orders,
        quotes: dbState.quotes,
        invoices: dbState.invoices,
        cajas: dbState.cajas,
        cajaMovements: dbState.cajaMovements,
        technicians: dbState.technicians,
        suppliers: dbState.suppliers,
        accountsPayable: dbState.accountsPayable,
        activityLogs: dbState.activityLogs,
        users: dbState.users
      });

      // Nomina Sync
      const { loadEmpleadosFromSupabase, loadNominasFromSupabase } = await import("@/lib/nominaSync");
      const dbEmpleados = await loadEmpleadosFromSupabase(tenantId);
      const dbNominas = await loadNominasFromSupabase(tenantId);
      useNominaStore.setState({
        empleados: dbEmpleados,
        nominas: dbNominas
      });

      toast.success("✅ Datos sincronizados correctamente desde Supabase");
    } catch (err: any) {
      console.error("[AdminPanel] Error syncing:", err);
      toast.error("Error al sincronizar con Supabase: " + (err.message || ""));
    } finally {
      setIsSyncing(false);
    }
  };

  // Export Executive Report to CSV
  const handleExportReport = () => {
    try {
      const csvRows = [];
      csvRows.push(["REPORTE EJECUTIVO DEL ADMINISTRADOR - SERVITRACKS"]);
      csvRows.push([`Taller: ${currentTenant?.name || tenantSlug}`]);
      csvRows.push([`Generado el: ${new Date().toLocaleString("es-DO")}`]);
      csvRows.push([`Período: ${period.toUpperCase()}`]);
      csvRows.push([]);
      
      csvRows.push(["RESUMEN FINANCIERO"]);
      csvRows.push(["Métrica", "Monto (RD$)"]);
      csvRows.push(["Ventas Totales Brutas", totalSales]);
      csvRows.push(["ITBIS Facturado", totalTax]);
      csvRows.push(["Ventas Netas", netSales]);
      csvRows.push(["Cobrado en Efectivo", paymentMethodsData.cash]);
      csvRows.push(["Cobrado en Tarjeta", paymentMethodsData.card]);
      csvRows.push(["Cobrado en Transferencia", paymentMethodsData.transfer]);
      csvRows.push([]);

      csvRows.push(["ESTADO OPERATIVO"]);
      csvRows.push(["Métrica", "Cantidad"]);
      csvRows.push(["Órdenes en Proceso", activeOrdersCount]);
      csvRows.push(["Órdenes Históricas Totales", tenantOrders.length]);
      csvRows.push(["Total Clientes Registrados", tenantCustomers.length]);
      csvRows.push(["Total Vehículos Registrados", tenantVehicles.length]);
      csvRows.push(["Productos con Stock Bajo", inventoryValuation.lowStockCount]);
      csvRows.push([]);

      csvRows.push(["HISTORIAL DE FACTURAS DEL PERIODO"]);
      csvRows.push(["NCF / ID", "Cliente", "Total (RD$)", "ITBIS (RD$)", "Método", "Estado", "Fecha"]);
      filteredInvoices.forEach((inv) => {
        const cust = tenantCustomers.find((c) => c.id === inv.customerId);
        csvRows.push([
          inv.ncf || inv.id.slice(-8).toUpperCase(),
          `"${cust?.name || 'Cliente General'}"`,
          inv.total,
          inv.tax,
          inv.paymentMethod || "Efectivo",
          inv.status,
          new Date(inv.createdAt).toLocaleDateString("es-DO")
        ]);
      });

      const csvString = csvRows.map((r) => r.join(",")).join("\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `reporte_administrador_${tenantSlug}_${period}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Reporte ejecutivo exportado con éxito");
    } catch (e) {
      toast.error("Error al exportar reporte");
    }
  };

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    toast.success("Enlace de sucursal copiado al portapapeles");
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  // Handle create branch
  const handleCreateBranch = async () => {
    if (!newBranchForm.name.trim()) {
      toast.error("El nombre de la sucursal es obligatorio");
      return;
    }
    if (!newBranchForm.slug.trim()) {
      toast.error("El identificador (slug) es requerido");
      return;
    }

    // Validar límite del plan para sucursales
    const limitCheck = checkTenantLimit(currentTenant, "limite_sucursales", userTenants.length);
    if (!limitCheck.allowed) {
      toast.error(limitCheck.message || "Has alcanzado el límite de sucursales de tu plan");
      return;
    }

    const cleanSlug = newBranchForm.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-");
    const existing = tenants.find((t) => t.slug === cleanSlug);
    if (existing) {
      toast.error("Ya existe una sucursal con ese identificador (slug)");
      return;
    }

    try {
      const newTenantObj: Tenant = {
        id: crypto.randomUUID(),
        name: newBranchForm.name.trim(),
        slug: cleanSlug,
        phone: newBranchForm.phone.trim() || undefined,
        email: newBranchForm.email.trim() || undefined,
        address: newBranchForm.address.trim() || undefined,
        rnc: newBranchForm.rnc.trim() || undefined,
        status: "active",
        estado: "ACTIVO",
        plan_id: currentTenant?.plan_id || "basico",
        color_primario: currentTenant?.color_primario || "#000000",
        color_secundario: currentTenant?.color_secundario || "#4b5563"
      };

      // Save to Supabase
      const { error } = await supabaseAdmin.from("tenants").insert({
        id: newTenantObj.id,
        name: newTenantObj.name,
        slug: newTenantObj.slug,
        phone: newTenantObj.phone,
        email: newTenantObj.email,
        address: newTenantObj.address,
        rnc: newTenantObj.rnc,
        status: "active",
        estado: "ACTIVO",
        plan_id: newTenantObj.plan_id,
        color_primario: newTenantObj.color_primario,
        color_secundario: newTenantObj.color_secundario
      });

      if (error) {
        console.error("Error creating branch in Supabase:", error);
      }

      // Add user to tenant_users table
      if (currentUserId && currentUserId !== "admin") {
        await supabaseAdmin.from("tenant_users").insert({
          id: crypto.randomUUID(),
          tenant_id: newTenantObj.id,
          user_id: currentUserId,
          name: users.find((u) => u.id === currentUserId)?.name || "Administrador",
          email: users.find((u) => u.id === currentUserId)?.email || "",
          role: "owner",
          status: "active"
        });
      }

      addTenant(newTenantObj);
      toast.success(`¡Sucursal "${newTenantObj.name}" creada exitosamente!`);
      setIsNewBranchOpen(false);
      setNewBranchForm({ name: "", slug: "", address: "", phone: "", email: "", rnc: "" });
    } catch (e: any) {
      toast.error("Error al crear la sucursal: " + (e.message || ""));
    }
  };

  // Nav pastel modules definitions
  const navModules = [
    {
      id: "ventas" as AdminModuleType,
      name: "Ventas & POS",
      desc: "Facturas y NCF",
      icon: ReceiptText,
      badge: `${paidInvoices.length} docs`,
      pastelBg: "bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-950 border-emerald-200/90",
      activePastelBg: "bg-emerald-100 text-emerald-950 border-emerald-500 shadow-md ring-2 ring-emerald-400/40",
      iconBg: "bg-emerald-500/10 text-emerald-700",
      activeIconBg: "bg-emerald-600 text-white shadow-xs",
    },
    {
      id: "caja" as AdminModuleType,
      name: "Caja & Cuadres",
      desc: "Turnos y Gastos",
      icon: Wallet,
      badge: activeCaja ? "Abierta" : "Cerrada",
      pastelBg: "bg-sky-50/70 hover:bg-sky-100/80 text-sky-950 border-sky-200/90",
      activePastelBg: "bg-sky-100 text-sky-950 border-sky-500 shadow-md ring-2 ring-sky-400/40",
      iconBg: "bg-sky-500/10 text-sky-700",
      activeIconBg: "bg-sky-600 text-white shadow-xs",
    },
    {
      id: "servicios" as AdminModuleType,
      name: "Servicios & Mecánicos",
      desc: "Ranking y Mano Obra",
      icon: Sparkles,
      badge: `${tenantTechnicians.length} técnicos`,
      pastelBg: "bg-amber-50/70 hover:bg-amber-100/80 text-amber-950 border-amber-200/90",
      activePastelBg: "bg-amber-100 text-amber-950 border-amber-500 shadow-md ring-2 ring-amber-400/40",
      iconBg: "bg-amber-500/10 text-amber-700",
      activeIconBg: "bg-amber-600 text-white shadow-xs",
    },
    {
      id: "ordenes" as AdminModuleType,
      name: "Órdenes & Taller",
      desc: "Flujo de Trabajo",
      icon: Wrench,
      badge: `${activeOrdersCount} activas`,
      pastelBg: "bg-purple-50/70 hover:bg-purple-100/80 text-purple-950 border-purple-200/90",
      activePastelBg: "bg-purple-100 text-purple-950 border-purple-500 shadow-md ring-2 ring-purple-400/40",
      iconBg: "bg-purple-500/10 text-purple-700",
      activeIconBg: "bg-purple-600 text-white shadow-xs",
    },
    {
      id: "inventario" as AdminModuleType,
      name: "Inventario & Compras",
      desc: "Stock y Proveedores",
      icon: Package,
      badge: `${inventoryValuation.lowStockCount} alertas`,
      pastelBg: "bg-indigo-50/70 hover:bg-indigo-100/80 text-indigo-950 border-indigo-200/90",
      activePastelBg: "bg-indigo-100 text-indigo-950 border-indigo-500 shadow-md ring-2 ring-indigo-400/40",
      iconBg: "bg-indigo-500/10 text-indigo-700",
      activeIconBg: "bg-indigo-600 text-white shadow-xs",
    },
    {
      id: "personal" as AdminModuleType,
      name: "Personal & Auditoría",
      desc: "Equipo y Eventos",
      icon: Users,
      badge: `${tenantUsers.length} usuarios`,
      pastelBg: "bg-rose-50/70 hover:bg-rose-100/80 text-rose-950 border-rose-200/90",
      activePastelBg: "bg-rose-100 text-rose-950 border-rose-500 shadow-md ring-2 ring-rose-400/40",
      iconBg: "bg-rose-500/10 text-rose-700",
      activeIconBg: "bg-rose-600 text-white shadow-xs",
    },
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* ── HEADER EXECUTIVE BAR ── */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5 bg-white p-5 sm:p-6 rounded-3xl border border-neutral-200/80 shadow-xs">
        {/* Left: Title & Workshop Identity */}
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-950 text-white shadow-xs shrink-0">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-heading text-xl sm:text-2xl font-black tracking-tight text-neutral-900">
                Panel Administrador
              </h1>
              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                {currentTenant?.estado || "ACTIVO"}
              </Badge>
            </div>
            <p className="text-xs text-neutral-500 font-medium mt-0.5">
              Supervisión general, rendimiento y control total de <strong className="text-neutral-900 font-bold">{currentTenant?.name || tenantSlug}</strong>
            </p>
          </div>
        </div>

        {/* Right: Plan Pill & Executive Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Plan capacity indicator */}
          {(() => {
            const currentPlan = getTenantPlan(currentTenant);
            const maxBranches = currentTenant?.max_sucursales || currentPlan.limite_sucursales || 1;
            return (
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-neutral-200/90 bg-neutral-50 text-xs font-semibold text-neutral-700 shadow-2xs h-10">
                <span className="text-neutral-400 uppercase text-[10px] font-bold tracking-wider">Plan:</span>
                <span className="capitalize font-bold text-neutral-900">{currentPlan.nombre}</span>
                <span className="h-3.5 w-px bg-neutral-300" />
                <span className="text-neutral-500 font-medium text-[11px]">{userTenants.length} de {currentPlan.limite_sucursales ? maxBranches : "∞"} Sucursales</span>
              </div>
            );
          })()}

          {/* Sync Button */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefreshSupabase} 
            disabled={isSyncing}
            className="rounded-xl gap-1.5 h-10 px-3.5 font-bold text-xs text-neutral-700 border-neutral-200 hover:bg-neutral-50 shadow-2xs cursor-pointer"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 text-emerald-600", isSyncing && "animate-spin")} />
            {isSyncing ? "Sincronizando..." : "Sincronizar Supabase"}
          </Button>

          {/* Export Report */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportReport}
            className="rounded-xl gap-1.5 h-10 px-3.5 font-bold text-xs text-neutral-700 border-neutral-200 hover:bg-neutral-50 shadow-2xs cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-neutral-500" /> Exportar Informe
          </Button>

          {/* Add Branch Button */}
          <Button 
            size="sm" 
            onClick={() => setIsNewBranchOpen(true)}
            className="rounded-xl gap-1.5 h-10 px-4 bg-neutral-950 text-white hover:bg-black shadow-xs font-bold text-xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-emerald-400" /> Nueva Sucursal
          </Button>
        </div>
      </div>

      {/* ── PERIOD SELECTOR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-3.5 sm:p-4 rounded-3xl border border-neutral-200/80 shadow-xs">
        <div className="flex items-center gap-2.5 px-3">
          <Calendar className="h-4 w-4 text-neutral-500" />
          <span className="text-xs sm:text-sm font-bold text-neutral-700 uppercase tracking-wider">Período de Análisis:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 bg-neutral-100/80 p-1.5 rounded-2xl border border-neutral-200/60">
          {[
            { key: "today", label: "Hoy" },
            { key: "week", label: "Esta Semana" },
            { key: "month", label: "Este Mes" },
            { key: "year", label: "Este Año" },
            { key: "all", label: "Histórico Total" }
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setPeriod(item.key as any)}
              className={cn(
                "px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer",
                period === item.key
                  ? "bg-neutral-950 text-white shadow-xs"
                  : "text-neutral-600 hover:bg-white hover:text-neutral-900"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 4 GRAND EXECUTIVE KPIS ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Ventas Consolidadas */}
        <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs hover:border-neutral-300 hover:shadow-sm transition-all flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Ventas Consolidadas
            </span>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/70 flex items-center justify-center font-bold text-sm shadow-2xs">
              $
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-neutral-900 tracking-tight">
              {formatShortRD(totalSales)}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200/60 shrink-0">
              <ArrowUpRight className="h-3 w-3" />
              {paidInvoices.length} facturas
            </span>
            <span className="text-neutral-400 text-[11px] font-medium truncate">en el período</span>
          </div>
        </div>

        {/* KPI 2: Órdenes en Proceso */}
        <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs hover:border-neutral-300 hover:shadow-sm transition-all flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Órdenes en Proceso
            </span>
            <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/70 flex items-center justify-center shadow-2xs">
              <Wrench className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-neutral-900 tracking-tight">
              {activeOrdersCount} <span className="text-sm font-medium text-neutral-400">vehículos</span>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200/60 shrink-0">
              <Wrench className="h-3 w-3" />
              {tenantOrders.filter((o) => o.status === "repairing").length} en taller
            </span>
            <span className="text-neutral-400 text-[11px] font-medium truncate">en reparación</span>
          </div>
        </div>

        {/* KPI 3: Sucursales Activas */}
        <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs hover:border-neutral-300 hover:shadow-sm transition-all flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Sucursales Activas
            </span>
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/70 flex items-center justify-center shadow-2xs">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-neutral-900 tracking-tight">
              {userTenants.length} / {currentTenant?.max_sucursales || 1}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200/60 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {userTenants.length} activa{userTenants.length > 1 ? "s" : ""}
            </span>
            <span className="text-neutral-400 text-[11px] font-medium truncate">centros operativos</span>
          </div>
        </div>

        {/* KPI 4: Histórico de Órdenes */}
        <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs hover:border-neutral-300 hover:shadow-sm transition-all flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Histórico de Órdenes
            </span>
            <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-200/70 flex items-center justify-center shadow-2xs">
              <BarChart3 className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-neutral-900 tracking-tight">
              {tenantOrders.length}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[11px] border border-purple-200/60 shrink-0">
              <Users className="h-3 w-3" />
              {tenantCustomers.length} clientes
            </span>
            <span className="text-neutral-400 text-[11px] font-medium truncate">atendidos</span>
          </div>
        </div>
      </div>

      {/* ── RED DE SUCURSALES (BRANCH DIRECTORY) ── */}
      <Card className="border-neutral-200/80 shadow-xs rounded-3xl bg-white overflow-hidden">
        <CardHeader className="border-b border-neutral-100 p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl font-bold text-neutral-900 flex items-center gap-2.5">
                <Building2 className="h-6 w-6 text-neutral-800" />
                Red de Sucursales ({userTenants.length})
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-neutral-500 mt-1">
                Selecciona una sucursal para ingresar a su espacio de trabajo o administrar su configuración.
              </CardDescription>
            </div>
            <div className="text-xs sm:text-sm text-neutral-500 font-medium bg-neutral-50 px-4 py-2 rounded-2xl border border-neutral-200/70">
              Sede principal: <strong className="text-neutral-900 capitalize font-bold">{currentTenant?.name || tenantSlug}</strong>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 sm:p-7">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {userTenants.map((t) => {
              const isCurrent = t.slug === tenantSlug;
              const branchInvoices = allInvoices.filter((i) => i.tenantId === t.id && i.status === "paid");
              const branchSales = branchInvoices.reduce((s, i) => s + (i.total || 0), 0);
              const branchActiveOrders = allOrders.filter((o) => o.tenantId === t.id && !["delivered"].includes(o.status)).length;
              const branchOpenCaja = allCajas.find((c) => c.tenant_id === t.id && c.estado === "ABIERTA");

              return (
                <div 
                  key={t.id}
                  className={cn(
                    "rounded-3xl border p-6 transition-all duration-200 flex flex-col justify-between gap-5 min-h-[270px]",
                    isCurrent 
                      ? "border-emerald-500 bg-emerald-50/20 shadow-md ring-4 ring-emerald-500/10" 
                      : "border-neutral-200 hover:border-neutral-300 bg-white hover:shadow-md"
                  )}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className="h-14 w-14 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-xs">
                          {t.logo ? (
                            <img src={t.logo} alt={t.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="font-black text-base text-neutral-700 uppercase">
                              {t.name.substring(0, 2)}
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-base text-neutral-900 leading-tight">{t.name}</h4>
                          <p className="text-xs text-neutral-400 mt-1 font-medium">
                            servitracks.com/{t.slug}
                          </p>
                        </div>
                      </div>
                      <Badge className={cn(
                        "text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full",
                        isCurrent ? "bg-emerald-600 text-white" : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                      )}>
                        {isCurrent ? "ACTIVO" : "DISPONIBLE"}
                      </Badge>
                    </div>

                    {/* Quick branch stats */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-neutral-100 text-xs">
                      <div className="bg-neutral-50 p-3 rounded-2xl border border-neutral-100">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block">Ventas</span>
                        <span className="text-sm font-black text-neutral-900 mt-0.5 block">{formatShortRD(branchSales)}</span>
                      </div>
                      <div className="bg-neutral-50 p-3 rounded-2xl border border-neutral-100">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block">Órdenes</span>
                        <span className="text-sm font-black text-neutral-900 mt-0.5 block">{branchActiveOrders} activas</span>
                      </div>
                    </div>

                    {/* Cash register state */}
                    <div className="flex items-center justify-between text-xs sm:text-sm px-1 pt-1">
                      <span className="text-neutral-500 font-medium">Estado de Caja:</span>
                      <span className={cn("font-bold flex items-center gap-1.5", branchOpenCaja ? "text-emerald-600" : "text-neutral-400")}>
                        <span className={cn("h-2 w-2 rounded-full", branchOpenCaja ? "bg-emerald-500 animate-pulse" : "bg-neutral-300")} />
                        {branchOpenCaja ? "Abierta y Operando" : "Cerrada"}
                      </span>
                    </div>
                  </div>

                  {/* Branch action buttons */}
                  <div className="flex items-center gap-2.5 pt-3 border-t border-neutral-100">
                    {isCurrent ? (
                      <div className="flex-1 text-center py-2.5 text-xs sm:text-sm font-bold text-emerald-700 bg-emerald-100/70 rounded-2xl">
                        Espacio de Trabajo Actual
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        onClick={() => navigate(`/${t.slug}/admin-panel`)}
                        className="flex-1 rounded-2xl bg-neutral-900 text-white hover:bg-black font-semibold text-xs sm:text-sm h-11 cursor-pointer"
                      >
                        Ingresar a Sucursal
                      </Button>
                    )}

                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => handleCopyLink(t.slug)}
                      className="h-11 w-11 rounded-2xl border-neutral-200 hover:bg-neutral-100 cursor-pointer flex-shrink-0"
                      title="Copiar enlace"
                    >
                      {copiedSlug === t.slug ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-neutral-500" />}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── 6 INDEPENDENT PASTEL NAVIGATION BUTTONS (EXPANDED HEIGHT & DISTINCT COLORS) ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-2">
            <Layers className="h-5 w-5 text-neutral-600" /> Módulos y Reportes Operativos
          </h2>
          <span className="text-xs text-neutral-400 font-medium hidden sm:inline-block">
            Haz clic en un módulo para explorar sus detalles
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
          {navModules.map((mod) => {
            const isActive = activeModule === mod.id;
            const Icon = mod.icon;
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => setActiveModule(mod.id)}
                className={cn(
                  "p-4 sm:p-5 rounded-3xl border text-left transition-all duration-200 flex flex-col justify-between gap-3 min-h-[105px] sm:min-h-[115px] cursor-pointer relative overflow-hidden group",
                  isActive ? mod.activePastelBg : mod.pastelBg
                )}
              >
                {/* Header with icon and badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className={cn(
                    "h-11 w-11 rounded-2xl flex items-center justify-center transition-all duration-200",
                    isActive ? mod.activeIconBg : mod.iconBg
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className={cn(
                    "text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border bg-white/70 backdrop-blur-xs",
                    isActive ? "border-current" : "border-neutral-200/80 text-neutral-600"
                  )}>
                    {mod.badge}
                  </Badge>
                </div>

                {/* Name and desc */}
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base leading-tight tracking-tight">
                    {mod.name}
                  </h3>
                  <p className="text-[11px] font-medium opacity-75 mt-0.5 leading-snug truncate">
                    {mod.desc}
                  </p>
                </div>

                {/* Active bottom highlight indicator */}
                {isActive && (
                  <div className="absolute bottom-0 left-4 right-4 h-1 rounded-t-full bg-current opacity-80" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── ACTIVE MODULE CONTENT SECTION ── */}
      <div className="transition-all duration-300">
        {/* ════ MODULE 1: VENTAS & FACTURACIÓN (POS) ════ */}
        {activeModule === "ventas" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Summary Metric Strip */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex flex-col justify-between">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Ingresos Totales (Bruto)</span>
                <div className="text-xl font-bold tracking-tight text-neutral-900 mt-1">{formatRD(totalSales)}</div>
                <span className="text-xs text-neutral-500 mt-1.5 block font-medium">Total cobrado en facturas</span>
              </div>
              <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex flex-col justify-between">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">ITBIS Facturado</span>
                <div className="text-xl font-bold tracking-tight text-emerald-600 mt-1">{formatRD(totalTax)}</div>
                <span className="text-xs text-neutral-500 mt-1.5 block font-medium">Impuestos generados (18%)</span>
              </div>
              <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex flex-col justify-between">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Ventas Netas</span>
                <div className="text-xl font-bold tracking-tight text-blue-600 mt-1">{formatRD(netSales)}</div>
                <span className="text-xs text-neutral-500 mt-1.5 block font-medium">Ingreso real antes de ITBIS</span>
              </div>
              <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex flex-col justify-between">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Ticket Promedio</span>
                <div className="text-xl font-bold tracking-tight text-purple-600 mt-1">
                  {formatRD(paidInvoices.length > 0 ? totalSales / paidInvoices.length : 0)}
                </div>
                <span className="text-xs text-neutral-500 mt-1.5 block font-medium">Por factura emitida</span>
              </div>
            </div>

            {/* Payment Methods & NCF Breakdown */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Payment Methods Card */}
              <Card className="border-neutral-200/80 shadow-xs rounded-3xl bg-white p-6 sm:p-7 min-h-[320px] flex flex-col justify-between">
                <div>
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-lg font-bold text-neutral-900">Métodos de Pago</CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-1">Distribución de cobros en el período</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 pt-3 space-y-5">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
                        <span className="text-neutral-700">💵 Efectivo</span>
                        <span>{formatShortRD(paymentMethodsData.cash)} ({paymentMethodsData.total > 0 ? Math.round((paymentMethodsData.cash / paymentMethodsData.total) * 100) : 0}%)</span>
                      </div>
                      <Progress value={paymentMethodsData.total > 0 ? (paymentMethodsData.cash / paymentMethodsData.total) * 100 : 0} className="h-2.5 bg-neutral-100" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
                        <span className="text-neutral-700">💳 Tarjeta</span>
                        <span>{formatShortRD(paymentMethodsData.card)} ({paymentMethodsData.total > 0 ? Math.round((paymentMethodsData.card / paymentMethodsData.total) * 100) : 0}%)</span>
                      </div>
                      <Progress value={paymentMethodsData.total > 0 ? (paymentMethodsData.card / paymentMethodsData.total) * 100 : 0} className="h-2.5 bg-neutral-100" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
                        <span className="text-neutral-700">🏦 Transferencia Bancaria</span>
                        <span>{formatShortRD(paymentMethodsData.transfer)} ({paymentMethodsData.total > 0 ? Math.round((paymentMethodsData.transfer / paymentMethodsData.total) * 100) : 0}%)</span>
                      </div>
                      <Progress value={paymentMethodsData.total > 0 ? (paymentMethodsData.transfer / paymentMethodsData.total) * 100 : 0} className="h-2.5 bg-neutral-100" />
                    </div>
                  </CardContent>
                </div>
              </Card>

              {/* Fiscal NCF Card */}
              <Card className="border-neutral-200/80 shadow-xs rounded-3xl bg-white lg:col-span-2 p-6 sm:p-7 min-h-[320px] flex flex-col justify-between">
                <div>
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-lg font-bold text-neutral-900">Facturación Fiscal (Comprobantes NCF)</CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-1">Desglose por tipo de comprobante emitido</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 pt-3">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {ncfBreakdown.length === 0 ? (
                        <div className="col-span-2 py-12 text-center text-xs sm:text-sm text-neutral-400 font-medium">
                          No hay facturas emitidas en el período seleccionado.
                        </div>
                      ) : (
                        ncfBreakdown.map(([key, item]) => (
                          <div key={key} className="p-4 sm:p-5 rounded-2xl border border-neutral-100 bg-neutral-50 flex items-center justify-between">
                            <div>
                              <span className="font-bold text-xs sm:text-sm text-neutral-900 block">{item.label}</span>
                              <span className="text-xs text-neutral-400 font-medium mt-0.5 block">{item.count} facturas emitidas</span>
                            </div>
                            <span className="font-black text-base sm:text-lg text-neutral-900">{formatShortRD(item.total)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </div>
              </Card>
            </div>

            {/* Invoices Table */}
            <Card className="border-neutral-200/80 shadow-xs rounded-3xl bg-white overflow-hidden">
              <CardHeader className="p-6 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold text-neutral-900">Historial de Facturación Reciente</CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-0.5">Listado de transacciones registradas desde el POS</CardDescription>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input 
                    placeholder="Buscar por NCF o cliente..."
                    value={invoiceSearchQuery}
                    onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                    className="pl-10 h-10 text-xs sm:text-sm rounded-2xl border-neutral-200"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead className="bg-neutral-50 text-neutral-500 font-bold uppercase tracking-wider border-b border-neutral-100 text-[11px]">
                      <tr>
                        <th className="px-6 py-4 text-left">Factura / NCF</th>
                        <th className="px-6 py-4 text-left">Cliente</th>
                        <th className="px-6 py-4 text-center">Método</th>
                        <th className="px-6 py-4 text-right">Total</th>
                        <th className="px-6 py-4 text-center">Estado</th>
                        <th className="px-6 py-4 text-right">Fecha</th>
                        <th className="px-6 py-4 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {filteredInvoices
                        .filter((inv) => {
                          if (!invoiceSearchQuery) return true;
                          const q = invoiceSearchQuery.toLowerCase();
                          const customer = tenantCustomers.find((c) => c.id === inv.customerId);
                          return (
                            (inv.ncf && inv.ncf.toLowerCase().includes(q)) ||
                            (inv.id && inv.id.toLowerCase().includes(q)) ||
                            (customer && customer.name.toLowerCase().includes(q))
                          );
                        })
                        .slice(0, 10)
                        .map((inv) => {
                          const customer = tenantCustomers.find((c) => c.id === inv.customerId);
                          return (
                            <tr key={inv.id} className="hover:bg-neutral-50/60 transition-colors">
                              <td className="px-6 py-4.5 font-mono font-bold text-neutral-900">
                                {inv.ncf || inv.id.slice(-8).toUpperCase()}
                              </td>
                              <td className="px-6 py-4.5 font-semibold text-neutral-800">
                                {customer?.name || "Cliente General"}
                              </td>
                              <td className="px-6 py-4.5 text-center capitalize text-neutral-600">
                                {inv.paymentMethod || "Efectivo"}
                              </td>
                              <td className="px-6 py-4.5 text-right font-black text-neutral-900">
                                {formatRD(inv.total)}
                              </td>
                              <td className="px-6 py-4.5 text-center">
                                <Badge className={cn(
                                 "text-[10px] font-bold border-none px-2.5 py-1",
                                  inv.status === "paid" ? "bg-emerald-100 text-emerald-700" :
                                  inv.status === "cancelled" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                                )}>
                                  {inv.status === "paid" ? "Pagada" : inv.status === "cancelled" ? "Anulada" : "Pendiente"}
                                </Badge>
                              </td>
                              <td className="px-6 py-4.5 text-right text-neutral-400">
                                {new Date(inv.createdAt).toLocaleDateString("es-DO")}
                              </td>
                              <td className="px-6 py-4.5 text-center">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => setSelectedInvoice(inv)}
                                  className="h-8 px-3 text-xs text-neutral-700 hover:bg-neutral-100 rounded-xl cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5 mr-1 text-neutral-500" /> Ver
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ════ MODULE 2: CAJA, CUADRES & CIERRES DE TURNO ════ */}
        {activeModule === "caja" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Active Caja Shift Card */}
            <Card className="border-neutral-200/80 shadow-xs rounded-3xl bg-white overflow-hidden">
              <CardHeader className="border-b border-neutral-100 p-6 sm:p-7">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-neutral-900 flex items-center gap-2.5">
                      <Wallet className="h-6 w-6 text-blue-600" />
                      Estado de Caja en Vivo
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-1">
                      {activeCaja ? "Turno de caja actualmente abierto y operativo" : "No hay turno de caja abierto en este momento"}
                    </CardDescription>
                  </div>
                  <Badge className={cn(
                    "text-xs font-bold uppercase px-3.5 py-1.5 rounded-full",
                    activeCaja ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"
                  )}>
                    {activeCaja ? "TURNO ABIERTO" : "CAJA CERRADA"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 sm:p-7">
                {activeCaja && activeCajaTotals ? (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="p-5 sm:p-6 rounded-2xl bg-neutral-50 border border-neutral-100 min-h-[125px] flex flex-col justify-between">
                      <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Fondo Inicial</span>
                      <span className="text-2xl font-black text-neutral-900 mt-1 block">{formatRD(activeCajaTotals.montoInicial)}</span>
                    </div>
                    <div className="p-5 sm:p-6 rounded-2xl bg-emerald-50/50 border border-emerald-100 min-h-[125px] flex flex-col justify-between">
                      <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">Ingresos Efectivo</span>
                      <span className="text-2xl font-black text-emerald-700 mt-1 block">{formatRD(activeCajaTotals.ingresosEfectivo)}</span>
                    </div>
                    <div className="p-5 sm:p-6 rounded-2xl bg-rose-50/50 border border-rose-100 min-h-[125px] flex flex-col justify-between">
                      <span className="text-xs font-bold text-rose-600 uppercase tracking-wider block">Egresos / Gastos</span>
                      <span className="text-2xl font-black text-rose-700 mt-1 block">{formatRD(activeCajaTotals.egresosEfectivo)}</span>
                    </div>
                    <div className="p-5 sm:p-6 rounded-2xl bg-blue-50/50 border border-blue-100 min-h-[125px] flex flex-col justify-between">
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block">Ventas Digitales</span>
                      <span className="text-2xl font-black text-blue-700 mt-1 block">{formatRD(activeCajaTotals.digitalTotal)}</span>
                    </div>
                    <div className="p-5 sm:p-6 rounded-2xl bg-neutral-950 text-white shadow-md min-h-[125px] flex flex-col justify-between">
                      <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Efectivo Esperado</span>
                      <span className="text-2xl font-black text-emerald-400 mt-1 block">{formatRD(activeCajaTotals.efectivoEsperado)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-neutral-400 text-sm font-medium">
                    Para registrar ventas en efectivo y gestionar turnos, abre una nueva caja desde el módulo de Control de Caja.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Historial de Cierres y Cuadres de Caja */}
            <Card className="border-neutral-200/80 shadow-xs rounded-3xl bg-white overflow-hidden">
              <CardHeader className="border-b border-neutral-100 p-6">
                <CardTitle className="text-lg font-bold text-neutral-900">Auditoría de Cuadres y Cierres de Turno</CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-0.5">Registro histórico de cajas cerradas con análisis de diferencias (faltantes o sobrantes)</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead className="bg-neutral-50 text-neutral-500 font-bold uppercase tracking-wider border-b border-neutral-100 text-[11px]">
                      <tr>
                        <th className="px-6 py-4 text-left">Apertura</th>
                        <th className="px-6 py-4 text-left">Cierre</th>
                        <th className="px-6 py-4 text-right">Fondo Inicial</th>
                        <th className="px-6 py-4 text-right">Efectivo Contado</th>
                        <th className="px-6 py-4 text-right">Tarjeta / Transf</th>
                        <th className="px-6 py-4 text-center">Diferencia Cuadre</th>
                        <th className="px-6 py-4 text-left">Notas de Cierre</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {closedCajasHistory.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-neutral-400 text-sm">
                            Aún no hay registros de turnos de caja cerrados.
                          </td>
                        </tr>
                      ) : (
                        closedCajasHistory.slice(0, 8).map((caja) => {
                          const diff = caja.diferencia || 0;
                          const isExact = diff === 0;
                          const isMissing = diff < 0;

                          return (
                            <tr key={caja.id} className="hover:bg-neutral-50/60 transition-colors">
                              <td className="px-6 py-4.5 text-neutral-600">
                                {caja.abierta_en ? new Date(caja.abierta_en).toLocaleString("es-DO", { dateStyle: "short", timeStyle: "short" }) : "—"}
                              </td>
                              <td className="px-6 py-4.5 text-neutral-600">
                                {caja.cerrada_en ? new Date(caja.cerrada_en).toLocaleString("es-DO", { dateStyle: "short", timeStyle: "short" }) : "—"}
                              </td>
                              <td className="px-6 py-4.5 text-right font-medium text-neutral-700">
                                {formatShortRD(caja.monto_inicial)}
                              </td>
                              <td className="px-6 py-4.5 text-right font-black text-neutral-900">
                                {formatShortRD(caja.monto_contado_efectivo || 0)}
                              </td>
                              <td className="px-6 py-4.5 text-right font-semibold text-neutral-700">
                                {formatShortRD((caja.monto_contado_tarjeta || 0) + (caja.monto_contado_transferencia || 0))}
                              </td>
                              <td className="px-6 py-4.5 text-center">
                                <Badge className={cn(
                                  "text-[10px] font-black px-2.5 py-1 border-none rounded-full",
                                  isExact ? "bg-emerald-100 text-emerald-700" :
                                  isMissing ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"
                                )}>
                                  {isExact ? "Exacto (RD$ 0)" : isMissing ? `Faltante (${formatShortRD(diff)})` : `Sobrante (+${formatShortRD(diff)})`}
                                </Badge>
                              </td>
                              <td className="px-6 py-4.5 text-neutral-500 truncate max-w-[220px]">
                                {caja.notas_cierre || "Sin observaciones"}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Egresos Categorizados */}
            <Card className="border-neutral-200/80 shadow-xs rounded-3xl bg-white p-6 sm:p-7">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-lg font-bold text-neutral-900">Gastos y Egresos Operativos del Taller</CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">Clasificación de salidas de dinero registradas en caja chica y turnos</CardDescription>
              </CardHeader>
              <CardContent className="p-0 pt-3">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {egresosByCategory.length === 0 ? (
                    <div className="col-span-3 py-8 text-center text-xs sm:text-sm text-neutral-400">
                      No hay egresos registrados en el período actual.
                    </div>
                  ) : (
                    egresosByCategory.map((cat, idx) => (
                      <div key={idx} className="p-4 sm:p-5 rounded-2xl border border-neutral-100 bg-neutral-50 flex items-center justify-between min-h-[80px]">
                        <span className="text-xs sm:text-sm font-bold text-neutral-800">{cat.name}</span>
                        <span className="text-base sm:text-lg font-black text-rose-600">{formatShortRD(cat.amount)}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ════ MODULE 3: SERVICIOS & MANO DE OBRA ════ */}
        {activeModule === "servicios" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Top Services Card */}
              <Card className="border-neutral-200/80 shadow-xs rounded-3xl bg-white p-6 sm:p-7 min-h-[440px] flex flex-col justify-between">
                <div>
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-lg font-bold text-neutral-900">Servicios Más Vendidos</CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-1">Ranking por volumen de facturación e ingresos</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 pt-3 space-y-3.5">
                    {topServices.length === 0 ? (
                      <div className="py-12 text-center text-xs sm:text-sm text-neutral-400">
                        Sin ventas de servicios registradas en el período.
                      </div>
                    ) : (
                      topServices.map((srv, i) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
                          <div className="flex items-center gap-3.5">
                            <div className="h-10 w-10 rounded-xl bg-neutral-900 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-xs">
                              #{i + 1}
                            </div>
                            <div>
                              <p className="font-bold text-xs sm:text-sm text-neutral-900">{srv.name}</p>
                              <p className="text-xs text-neutral-400 mt-0.5">{srv.count} veces solicitado</p>
                            </div>
                          </div>
                          <span className="font-black text-base sm:text-lg text-neutral-900">{formatShortRD(srv.total)}</span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </div>
              </Card>

              {/* Technicians & Labor Productivity */}
              <Card className="border-neutral-200/80 shadow-xs rounded-3xl bg-white p-6 sm:p-7 min-h-[440px] flex flex-col justify-between">
                <div>
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-lg font-bold text-neutral-900">Técnicos & Mano de Obra</CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-1">Productividad y comisiones registradas por mecánico</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 pt-3 space-y-3.5">
                    {tenantTechnicians.length === 0 ? (
                      <div className="py-12 text-center text-xs sm:text-sm text-neutral-400">
                        No hay mecánicos/técnicos registrados en el taller.
                      </div>
                    ) : (
                      tenantTechnicians.map((t) => {
                        const techOrders = tenantOrders.filter((o) => o.mechanicId === t.id);
                        return (
                          <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
                            <div className="flex items-center gap-3.5">
                              <div className="h-11 w-11 rounded-2xl bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center shadow-xs">
                                {t.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-xs sm:text-sm text-neutral-900">{t.name}</p>
                                <p className="text-xs text-neutral-400 mt-0.5">{techOrders.length} órdenes asignadas · {t.tipoPago || "Porcentaje"}</p>
                              </div>
                            </div>
                            <Badge className="bg-blue-50 text-blue-700 border border-blue-200 font-bold text-xs px-2.5 py-1 rounded-full">
                              {t.status === "active" ? "Activo" : "Inactivo"}
                            </Badge>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ════ MODULE 4: ÓRDENES & FLUJO DE TALLER ════ */}
        {activeModule === "ordenes" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Order Status Funnel */}
            <Card className="border-neutral-200/80 shadow-xs rounded-3xl bg-white p-6 sm:p-7">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-lg font-bold text-neutral-900">Embudo de Órdenes de Trabajo</CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">Estado del flujo de reparación en taller en tiempo real</CardDescription>
              </CardHeader>
              <CardContent className="p-0 pt-3">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                  {ordersByStatus.map((item) => (
                    <div key={item.status} className="p-5 rounded-2xl bg-neutral-50 border border-neutral-100 text-center min-h-[125px] flex flex-col justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">{item.label}</span>
                      <span className="text-3xl font-black text-neutral-900 mt-1 block">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Vehicle Brands & Models */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-neutral-200/80 shadow-xs rounded-3xl bg-white p-6 sm:p-7 min-h-[380px] flex flex-col justify-between">
                <div>
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-lg font-bold text-neutral-900">Marcas de Vehículos Más Atendidas</CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-1">Distribución de marcas atendidas en el taller</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 pt-3 space-y-3">
                    {vehicleBrands.length === 0 ? (
                      <div className="py-10 text-center text-xs sm:text-sm text-neutral-400">Sin vehículos registrados</div>
                    ) : (
                      vehicleBrands.map((v) => (
                        <div key={v.brand} className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100 text-xs sm:text-sm">
                          <span className="font-bold text-neutral-800 flex items-center gap-2.5">
                            <Car className="h-5 w-5 text-neutral-400" /> {v.brand}
                          </span>
                          <span className="font-black text-neutral-900">{v.count} vehículos</span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </div>
              </Card>

              <Card className="border-neutral-200/80 shadow-xs rounded-3xl bg-white p-6 sm:p-7 min-h-[380px] flex flex-col justify-between">
                <div>
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-lg font-bold text-neutral-900">Cotizaciones vs Órdenes</CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-1">Tasa de conversión de presupuestos a órdenes de trabajo</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 pt-3 space-y-5">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-100">
                        <span className="text-xs font-bold text-neutral-400 uppercase">Cotizaciones</span>
                        <span className="text-2xl font-black text-neutral-900 block mt-1">{tenantQuotes.length}</span>
                      </div>
                      <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-100">
                        <span className="text-xs font-bold text-neutral-400 uppercase">Aprobadas / En OT</span>
                        <span className="text-2xl font-black text-emerald-600 block mt-1">
                          {tenantQuotes.filter((q) => q.status === "accepted").length}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-100 text-center">
                      <span className="text-sm font-bold text-emerald-800">
                        Tasa de Conversión: {tenantQuotes.length > 0 ? Math.round((tenantQuotes.filter((q) => q.status === "accepted").length / tenantQuotes.length) * 100) : 0}%
                      </span>
                    </div>
                  </CardContent>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ════ MODULE 5: INVENTARIO & PROVEEDORES ════ */}
        {activeModule === "inventario" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid gap-5 sm:grid-cols-3">
              <div className="p-6 sm:p-7 rounded-3xl bg-white border border-neutral-200/80 shadow-xs min-h-[145px] flex flex-col justify-between">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Valoración al Costo</span>
                <div className="text-2xl sm:text-3xl font-black text-neutral-900 mt-2">{formatRD(inventoryValuation.totalCost)}</div>
                <span className="text-xs sm:text-sm text-neutral-500 mt-2 block font-medium">Inversión actual en almacén</span>
              </div>
              <div className="p-6 sm:p-7 rounded-3xl bg-white border border-neutral-200/80 shadow-xs min-h-[145px] flex flex-col justify-between">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Valoración a la Venta</span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2">{formatRD(inventoryValuation.totalSale)}</div>
                <span className="text-xs sm:text-sm text-neutral-500 mt-2 block font-medium">Ingreso potencial en inventario</span>
              </div>
              <div className="p-6 sm:p-7 rounded-3xl bg-white border border-neutral-200/80 shadow-xs min-h-[145px] flex flex-col justify-between">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Artículos Críticos</span>
                <div className="text-2xl sm:text-3xl font-black text-rose-600 mt-2">{inventoryValuation.lowStockCount} items</div>
                <span className="text-xs sm:text-sm text-neutral-500 mt-2 block font-medium">Requieren reposición urgente</span>
              </div>
            </div>

            {/* Suppliers & Accounts Payable */}
            <Card className="border-neutral-200/80 shadow-xs rounded-3xl bg-white p-6 sm:p-7">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-lg font-bold text-neutral-900">Cuentas por Pagar a Proveedores</CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">Estado de deudas pendientes y compras a distribuidores</CardDescription>
              </CardHeader>
              <CardContent className="p-0 pt-3">
                <div className="grid gap-5 sm:grid-cols-3">
                  <div className="p-5 rounded-2xl bg-rose-50/60 border border-rose-100 min-h-[110px] flex flex-col justify-between">
                    <span className="text-xs font-bold text-rose-600 uppercase">Monto Pendiente de Pago</span>
                    <span className="text-2xl font-black text-rose-700 block mt-1">{formatRD(accountsPayableSummary.pending)}</span>
                  </div>
                  <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-100 min-h-[110px] flex flex-col justify-between">
                    <span className="text-xs font-bold text-emerald-600 uppercase">Monto Pagado</span>
                    <span className="text-2xl font-black text-emerald-700 block mt-1">{formatRD(accountsPayableSummary.paid)}</span>
                  </div>
                  <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-100 min-h-[110px] flex flex-col justify-between">
                    <span className="text-xs font-bold text-neutral-400 uppercase">Proveedores Registrados</span>
                    <span className="text-2xl font-black text-neutral-900 block mt-1">{tenantSuppliers.length} empresas</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ════ MODULE 6: PERSONAL, NÓMINA & AUDITORÍA ════ */}
        {activeModule === "personal" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Team Users Card */}
              <Card className="border-neutral-200/80 shadow-xs rounded-3xl bg-white p-6 sm:p-7 min-h-[460px] flex flex-col justify-between">
                <div>
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-lg font-bold text-neutral-900">Equipo de Trabajo del Taller</CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-1">Colaboradores registrados con acceso al sistema</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 pt-3 space-y-3.5">
                    {tenantUsers.length === 0 ? (
                      <div className="py-12 text-center text-xs sm:text-sm text-neutral-400">Sin colaboradores registrados</div>
                    ) : (
                      tenantUsers.map((u) => (
                        <div key={u.id} className="flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-neutral-50 border border-neutral-100">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-neutral-900 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                              {u.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-sm sm:text-base text-neutral-900">{u.name}</p>
                              <p className="text-xs text-neutral-400 mt-0.5 font-medium">{u.email}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs font-bold uppercase capitalize px-3 py-1 rounded-full border-neutral-200">
                            {u.role === "owner" ? "Administrador" : u.role}
                          </Badge>
                        </div>
                      ))
                    )}
                  </CardContent>
                </div>
              </Card>

              {/* Live Activity Log */}
              <Card className="border-neutral-200/80 shadow-xs rounded-3xl bg-white p-6 sm:p-7 min-h-[460px] flex flex-col justify-between">
                <div>
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-lg font-bold text-neutral-900">Registro de Actividad (Auditoría)</CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-1">Últimos eventos registrados en la sucursal</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 pt-3">
                    <div className="max-h-[480px] overflow-y-auto divide-y divide-neutral-100">
                      {tenantActivityLogs.length === 0 ? (
                        <div className="py-12 text-center text-xs sm:text-sm text-neutral-400">Sin registros de actividad recientes</div>
                      ) : (
                        tenantActivityLogs.slice(0, 10).map((log) => (
                          <div key={log.id} className="p-4 text-xs sm:text-sm flex items-start gap-3.5">
                            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-neutral-900 leading-tight">{log.action || log.details}</p>
                              <span className="text-xs text-neutral-400 block mt-1 font-medium">
                                {new Date(log.createdAt).toLocaleString("es-DO")} · {log.userName || "Sistema"}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: REGISTRAR NUEVA SUCURSAL ── */}
      <Dialog open={isNewBranchOpen} onOpenChange={setIsNewBranchOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-xl sm:text-2xl font-bold">
              <Building2 className="h-6 w-6 text-emerald-600" /> Registrar Nueva Sucursal
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-neutral-500 mt-1">
              Expande tu red de talleres agregando una nueva sede operativa a tu cuenta.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div>
              <Label className="text-xs sm:text-sm font-bold text-neutral-700">Nombre de la Sucursal / Taller *</Label>
              <Input 
                placeholder="Ej: AutoCheck Bella Vista"
                value={newBranchForm.name}
                onChange={(e) => {
                  const val = e.target.value;
                  const autoSlug = val.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
                  setNewBranchForm({ ...newBranchForm, name: val, slug: newBranchForm.slug ? newBranchForm.slug : autoSlug });
                }}
                className="h-11 text-xs sm:text-sm rounded-2xl mt-1.5"
              />
            </div>
            <div>
              <Label className="text-xs sm:text-sm font-bold text-neutral-700">Identificador / Subdominio (Slug) *</Label>
              <Input 
                placeholder="Ej: autocheck-bellavista"
                value={newBranchForm.slug}
                onChange={(e) => setNewBranchForm({ ...newBranchForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                className="h-11 text-xs sm:text-sm rounded-2xl mt-1.5"
              />
              <p className="text-xs text-neutral-400 mt-1">Acceso: servitracks.com/{newBranchForm.slug || "nombre-sucursal"}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs sm:text-sm font-bold text-neutral-700">Teléfono</Label>
                <Input 
                  placeholder="809-555-0100"
                  value={newBranchForm.phone}
                  onChange={(e) => setNewBranchForm({ ...newBranchForm, phone: e.target.value })}
                  className="h-11 text-xs sm:text-sm rounded-2xl mt-1.5"
                />
              </div>
              <div>
                <Label className="text-xs sm:text-sm font-bold text-neutral-700">RNC (Opcional)</Label>
                <Input 
                  placeholder="130-12345-6"
                  value={newBranchForm.rnc}
                  onChange={(e) => setNewBranchForm({ ...newBranchForm, rnc: e.target.value })}
                  className="h-11 text-xs sm:text-sm rounded-2xl mt-1.5"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs sm:text-sm font-bold text-neutral-700">Dirección Física</Label>
              <Input 
                placeholder="Av. Principal #123, Santo Domingo"
                value={newBranchForm.address}
                onChange={(e) => setNewBranchForm({ ...newBranchForm, address: e.target.value })}
                className="h-11 text-xs sm:text-sm rounded-2xl mt-1.5"
              />
            </div>
          </div>
          <DialogFooter className="gap-3 pt-3">
            <Button variant="outline" onClick={() => setIsNewBranchOpen(false)} className="rounded-2xl text-xs sm:text-sm h-11 flex-1">
              Cancelar
            </Button>
            <Button onClick={handleCreateBranch} className="rounded-2xl text-xs sm:text-sm h-11 flex-1 bg-neutral-950 text-white font-bold hover:bg-black">
              Guardar Sucursal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: INVOICE DETAIL ── */}
      <InvoiceDetailDialog 
        open={!!selectedInvoice} 
        onClose={() => setSelectedInvoice(null)} 
        invoice={selectedInvoice}
      />
    </div>
  );
}
