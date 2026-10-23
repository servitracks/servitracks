"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams } from "@/lib/next-compat";
import { useStore, Technician, Invoice, MovimientoCaja } from "@/store/useStore";
import { useNominaStore } from "@/store/useNominaStore";
import {
  Wallet,
  ShieldAlert,
  BadgeCheck,
  Users,
  Percent,
  Wrench,
  CheckCircle2,
  History,
  Printer,
  Edit,
  Plus,
  Search,
  Receipt,
  Check,
  AlertTriangle,
  UserCog,
  Coins,
  Eye,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn, formatRD, calculateInvoiceCommission, isServiceItem } from "@/lib/utils";
import { InvoiceDetailDialog } from "@/components/dashboard/InvoiceDetailDialog";

export default function MisComisionesPage() {
  const { tenant } = useParams();
  const {
    tenants,
    services,
    users,
    currentUserId,
    technicians,
    addTechnician,
    updateTechnician,
    invoices,
    updateInvoice,
    orders,
    cajas,
    addCajaMovement,
  } = useStore();
  const { empleados, addEmpleado, updateEmpleado } = useNominaStore();

  const currentTenant = tenants.find((t) => t.slug === tenant) ?? null;
  const tenantId = currentTenant?.id ?? "";

  const currentUser = useMemo(() => {
    if (currentUserId === "admin") {
      return {
        id: "admin",
        name: "Super Administrador",
        email: "admin@servitracks.com",
        role: "owner" as const,
      };
    }
    if (typeof window !== "undefined") {
      try {
        const sessionStr = localStorage.getItem("servitracks-session");
        if (sessionStr) {
          const sess = JSON.parse(sessionStr);
          if (sess.role === "superadmin") {
            return {
              id: "admin",
              name: "Super Administrador",
              email: "admin@servitracks.com",
              role: "owner" as const,
            };
          }
          if (sess.user) return sess.user;
        }
      } catch {}
    }
    return (
      users.find((u) => u.id === currentUserId) ||
      users.find((u) => u.tenantId === tenantId) ||
      null
    );
  }, [users, currentUserId, tenantId]);

  const simulatedRole =
    typeof window !== "undefined" ? localStorage.getItem("simulated-role") : null;
  const activeRole = simulatedRole || currentUser?.role || "owner";
  const isAdminOrCashier =
    activeRole === "owner" || activeRole === "cashier" || activeRole === "superadmin";

  const tenantTechnicians = useMemo(
    () => (technicians || []).filter((t) => !tenantId || t.tenantId === tenantId),
    [technicians, tenantId]
  );

  // Vincular técnico si el usuario es mecánico (coincidencia exacta o parcial)
  const miPerfilTecnico = useMemo(() => {
    if (!currentUser?.name) return null;
    const cleanUser = currentUser.name.toLowerCase().trim();
    return (
      tenantTechnicians.find((t) => t.name.toLowerCase().trim() === cleanUser) ||
      tenantTechnicians.find(
        (t) =>
          t.name.toLowerCase().includes(cleanUser) ||
          cleanUser.includes(t.name.toLowerCase().trim())
      ) ||
      null
    );
  }, [tenantTechnicians, currentUser]);

  const [selectedTechId, setSelectedTechId] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"pending" | "paid" | "unassigned">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Modal de creación/edición de técnico y porcentaje
  const [isTechModalOpen, setIsTechModalOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const [techForm, setTechForm] = useState<{
    name: string;
    phone: string;
    status: "active" | "inactive";
    tipoPago: "porcentaje" | "fijo";
    pagoNomina: string;
  }>({
    name: "",
    phone: "",
    status: "active",
    tipoPago: "porcentaje",
    pagoNomina: "30",
  });

  // Inicializar filtro según rol
  useEffect(() => {
    if (!isAdminOrCashier && miPerfilTecnico) {
      setSelectedTechId(miPerfilTecnico.id);
    }
  }, [isAdminOrCashier, miPerfilTecnico]);

  // Turno de caja abierto (para registrar egreso al liquidar si hay caja abierta)
  const activeCaja = useMemo(() => {
    const tenantCajas = (cajas || [])
      .filter((c) => c.tenant_id === tenantId)
      .sort(
        (a, b) =>
          new Date(b.abierta_en || 0).getTime() - new Date(a.abierta_en || 0).getTime()
      );
    return tenantCajas[0]?.estado === "ABIERTA" ? tenantCajas[0] : undefined;
  }, [cajas, tenantId]);

  // Resolver técnico efectivo de cada factura (incluyendo vínculo con Orden de Trabajo si existía)
  const resolveInvoiceTechId = (inv: Invoice): string | undefined => {
    if (inv.mechanicId && inv.mechanicId !== "none") return inv.mechanicId;
    if (inv.orderId) {
      const linkedOrd = orders.find((o) => o.id === inv.orderId);
      if (linkedOrd?.mechanicId && linkedOrd.mechanicId !== "none") {
        return linkedOrd.mechanicId;
      }
    }
    return undefined;
  };

  // Procesar todas las facturas pagadas del taller que contienen servicios o mano de obra
  const allCommissionRows = useMemo(() => {
    const paidInvoices = (invoices || []).filter(
      (inv) => inv.tenantId === tenantId && inv.status !== "cancelled"
    );

    return paidInvoices
      .map((inv) => {
        const effectiveTechId = resolveInvoiceTechId(inv);
        const tech = effectiveTechId
          ? tenantTechnicians.find((t) => t.id === effectiveTechId)
          : undefined;

        const breakdown = calculateInvoiceCommission(inv, tech, services);
        const hasServiceItems = (inv.items || []).some((it) =>
          isServiceItem(it, services)
        );

        return {
          inv,
          effectiveTechId,
          tech,
          hasServiceItems,
          ...breakdown,
        };
      })
      .filter((row) => row.hasServiceItems || row.totalFila > 0 || row.servicesBaseTotal > 0)
      .sort(
        (a, b) =>
          new Date(b.inv.createdAt || 0).getTime() -
          new Date(a.inv.createdAt || 0).getTime()
      );
  }, [invoices, tenantId, tenantTechnicians, services, orders]);

  // Resumen por cada técnico
  const technicianSummaries = useMemo(() => {
    return tenantTechnicians.map((tech) => {
      const techRows = allCommissionRows.filter(
        (r) => r.effectiveTechId === tech.id && r.inv.status === "paid"
      );
      const pendingRows = techRows.filter((r) => !r.inv.isCommissionPaid && r.totalFila > 0);
      const paidRows = techRows.filter((r) => Boolean(r.inv.isCommissionPaid) && r.totalFila > 0);

      const pendingTotal =
        Math.round(pendingRows.reduce((s, r) => s + r.totalFila, 0) * 100) / 100;
      const paidTotal =
        Math.round(paidRows.reduce((s, r) => s + r.totalFila, 0) * 100) / 100;
      const baseServicesTotal =
        Math.round(pendingRows.reduce((s, r) => s + r.servicesBaseTotal, 0) * 100) / 100;

      return {
        tech,
        pendingCount: pendingRows.length,
        pendingTotal,
        paidCount: paidRows.length,
        paidTotal,
        baseServicesTotal,
        pendingRows,
      };
    });
  }, [tenantTechnicians, allCommissionRows]);

  // Facturas con servicios/mano de obra pero sin técnico asignado
  const unassignedRows = useMemo(() => {
    return allCommissionRows.filter(
      (r) => !r.effectiveTechId && r.servicesBaseTotal > 0
    );
  }, [allCommissionRows]);

  // Filtrar filas según pestaña, técnico seleccionado y búsqueda
  const filteredRows = useMemo(() => {
    let rows = allCommissionRows;

    if (activeTab === "unassigned") {
      rows = unassignedRows;
    } else if (activeTab === "pending") {
      rows = rows.filter(
        (r) =>
          Boolean(r.effectiveTechId) &&
          r.inv.status === "paid" &&
          !r.inv.isCommissionPaid &&
          (r.totalFila > 0 || r.servicesBaseTotal > 0)
      );
    } else {
      rows = rows.filter(
        (r) =>
          Boolean(r.effectiveTechId) &&
          Boolean(r.inv.isCommissionPaid) &&
          (r.totalFila > 0 || r.servicesBaseTotal > 0)
      );
    }

    if (activeTab !== "unassigned" && selectedTechId && selectedTechId !== "all") {
      rows = rows.filter((r) => r.effectiveTechId === selectedTechId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      rows = rows.filter(
        (r) =>
          (r.inv.ncf || "").toLowerCase().includes(q) ||
          r.inv.id.toLowerCase().includes(q) ||
          (r.inv.customerName || "").toLowerCase().includes(q) ||
          (r.tech?.name || "").toLowerCase().includes(q) ||
          r.nombresAplicables.some((n) => n.toLowerCase().includes(q))
      );
    }

    return rows;
  }, [allCommissionRows, unassignedRows, activeTab, selectedTechId, searchQuery]);

  // Totales de las tarjetas superiores según el filtro activo
  const kpiTotals = useMemo(() => {
    const targetSummaries =
      selectedTechId && selectedTechId !== "all"
        ? technicianSummaries.filter((s) => s.tech.id === selectedTechId)
        : technicianSummaries;

    const totalPendiente =
      Math.round(targetSummaries.reduce((acc, s) => acc + s.pendingTotal, 0) * 100) / 100;
    const totalPagado =
      Math.round(targetSummaries.reduce((acc, s) => acc + s.paidTotal, 0) * 100) / 100;
    const totalFacturasPendientes = targetSummaries.reduce(
      (acc, s) => acc + s.pendingCount,
      0
    );
    const totalBaseServicios =
      Math.round(targetSummaries.reduce((acc, s) => acc + s.baseServicesTotal, 0) * 100) /
      100;

    return {
      totalPendiente,
      totalPagado,
      totalFacturasPendientes,
      totalBaseServicios,
    };
  }, [technicianSummaries, selectedTechId]);

  const openCreateTechModal = () => {
    setEditingTech(null);
    setTechForm({
      name: "",
      phone: "",
      status: "active",
      tipoPago: "porcentaje",
      pagoNomina: "30",
    });
    setIsTechModalOpen(true);
  };

  const openEditTechModal = (tech: Technician) => {
    setEditingTech(tech);
    setTechForm({
      name: tech.name,
      phone: tech.phone || "",
      status: tech.status === "inactive" ? "inactive" : "active",
      tipoPago: tech.tipoPago === "fijo" ? "fijo" : "porcentaje",
      pagoNomina: String(tech.pagoNomina ?? 0),
    });
    setIsTechModalOpen(true);
  };

  const handleSaveTech = (e: React.FormEvent) => {
    e.preventDefault();
    if (!techForm.name.trim()) {
      toast.error("El nombre del técnico es obligatorio");
      return;
    }

    const tipoPago: "porcentaje" | "fijo" =
      techForm.tipoPago === "fijo" ? "fijo" : "porcentaje";
    const pagoNomina = Math.max(0, parseFloat(techForm.pagoNomina) || 0);

    if (tipoPago === "porcentaje" && pagoNomina > 100) {
      toast.error("El porcentaje no puede ser mayor a 100%");
      return;
    }

    if (editingTech) {
      updateTechnician(editingTech.id, {
        name: techForm.name.trim(),
        phone: techForm.phone.trim() || undefined,
        status: techForm.status,
        tipoPago,
        pagoNomina,
      });

      const matchingEmp = empleados.find(
        (emp) =>
          emp.tenantId === tenantId &&
          `${emp.nombres} ${emp.apellidos}`.toLowerCase().trim() ===
            editingTech.name.toLowerCase().trim()
      );
      if (matchingEmp) {
        const parts = techForm.name.trim().split(" ");
        updateEmpleado(matchingEmp.id, {
          nombres: parts[0] || "",
          apellidos: parts.slice(1).join(" ") || "",
          salarioBase: tipoPago === "fijo" ? pagoNomina : matchingEmp.salarioBase,
          estado: techForm.status === "active" ? "activo" : "inactivo",
        });
      }

      toast.success(
        `Comisión de ${techForm.name.trim()} actualizada a ${
          tipoPago === "fijo" ? formatRD(pagoNomina) : `${pagoNomina}%`
        }`
      );
    } else {
      const newTech: Technician = {
        id: crypto.randomUUID(),
        tenantId,
        name: techForm.name.trim(),
        phone: techForm.phone.trim() || undefined,
        status: techForm.status,
        tipoPago,
        pagoNomina,
        createdAt: new Date().toISOString(),
      };
      addTechnician(newTech);

      const parts = newTech.name.split(" ");
      addEmpleado({
        id: crypto.randomUUID(),
        tenantId,
        cedula: "000-0000000-0",
        nombres: parts[0] || "",
        apellidos: parts.slice(1).join(" ") || "",
        cargo: "Técnico",
        departamento: "Taller",
        salarioBase: tipoPago === "fijo" ? pagoNomina : 0,
        tipoCobro: tipoPago === "fijo" ? "mensual" : "quincenal",
        fechaIngreso: new Date().toISOString(),
        estado: newTech.status === "active" ? "activo" : "inactivo",
        dependientes: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      toast.success(`Técnico ${newTech.name} creado exitosamente`);
    }

    setIsTechModalOpen(false);
    setEditingTech(null);
  };

  // Liquidar todas las comisiones pendientes de un técnico
  const handleLiquidarTecnico = (tech: Technician) => {
    const summary = technicianSummaries.find((s) => s.tech.id === tech.id);
    if (!summary || summary.pendingTotal <= 0) {
      toast.info(`El técnico ${tech.name} no tiene comisiones pendientes.`);
      return;
    }

    if (activeCaja) {
      const nuevoMov: MovimientoCaja = {
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        caja_id: activeCaja.id,
        empleado_id: activeCaja.empleado_id || currentUser?.id || "cajero",
        tecnico_id: tech.id,
        tipo: "PAGO_NOMINA",
        concepto: `[Pago Técnico] Liquidación a ${tech.name} por ${summary.pendingRows.length} factura(s)`,
        monto: summary.pendingTotal,
        metodo: "EFECTIVO",
        creado_en: new Date().toISOString(),
      };
      addCajaMovement(nuevoMov);
    }

    summary.pendingRows.forEach((row) => {
      updateInvoice(row.inv.id, {
        mechanicId: tech.id,
        isCommissionPaid: true,
      });
    });

    handlePrintComprobante(tech, summary.pendingRows, summary.pendingTotal, true);
    toast.success(
      `Liquidación de ${formatRD(summary.pendingTotal)} a ${tech.name} completada con éxito`
    );
  };

  // Liquidar una sola factura individual
  const handleLiquidarFactura = (row: (typeof allCommissionRows)[number]) => {
    if (!row.tech) {
      toast.error("Asigne un técnico a la factura antes de liquidarla.");
      return;
    }

    if (activeCaja && row.totalFila > 0) {
      const nuevoMov: MovimientoCaja = {
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        caja_id: activeCaja.id,
        empleado_id: activeCaja.empleado_id || currentUser?.id || "cajero",
        tecnico_id: row.tech.id,
        tipo: "PAGO_NOMINA",
        concepto: `[Pago Técnico] Comisión Factura ${
          row.inv.ncf || `#${row.inv.id.slice(-6).toUpperCase()}`
        } - ${row.tech.name}`,
        monto: row.totalFila,
        metodo: "EFECTIVO",
        creado_en: new Date().toISOString(),
      };
      addCajaMovement(nuevoMov);
    }

    updateInvoice(row.inv.id, {
      mechanicId: row.tech.id,
      isCommissionPaid: true,
    });
    toast.success(
      `Comisión de ${formatRD(row.totalFila)} marcada como pagada para ${row.tech.name}`
    );
  };

  const handleRevertirPago = (inv: Invoice) => {
    updateInvoice(inv.id, { isCommissionPaid: false });
    toast.info("La comisión de la factura volvió al estado Pendiente");
  };

  const handleAssignTechToInvoice = (invId: string, techId: string) => {
    if (!techId || techId === "none") return;
    const tech = tenantTechnicians.find((t) => t.id === techId);
    updateInvoice(invId, { mechanicId: techId });
    toast.success(`Factura asignada al técnico ${tech?.name || ""}`);
  };

  const handlePrintComprobante = (
    tech: Technician,
    rows: typeof allCommissionRows,
    totalAmount: number,
    isPaid: boolean
  ) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const tallerName = currentTenant?.name || "SERVITRACKS";
    const tallerRnc = currentTenant?.rnc || "";
    const dateStr = new Date().toLocaleString("es-DO");
    const esquema =
      tech.pagoNomina && tech.pagoNomina > 0
        ? tech.tipoPago === "fijo"
          ? `Monto Fijo: ${formatRD(tech.pagoNomina)}`
          : `Porcentaje: ${tech.pagoNomina}%`
        : "100% Mano de Obra";

    const rowsHtml = rows
      .map(
        (r) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
          <b>${r.inv.ncf || `#${r.inv.id.slice(-6).toUpperCase()}`}</b><br/>
          <span style="font-size: 10px; color: #6b7280;">${new Date(
            r.inv.createdAt
          ).toLocaleDateString("es-DO")} · ${r.inv.customerName || "Consumidor Final"}</span>
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px;">
          ${r.nombresAplicables.join(", ") || "Servicio de taller"}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 11px;">
          ${formatRD(r.servicesBaseTotal)}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 11px; font-weight: 700; color: #7e22ce;">
          ${formatRD(r.comisionTotal)}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 11px; font-weight: 700; color: #1d4ed8;">
          ${formatRD(r.manoObraTotal)}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 12px; font-weight: 900;">
          ${formatRD(r.totalFila)}
        </td>
      </tr>
    `
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Comisiones - ${tech.name}</title>
          <style>
            @page { margin: 10mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 15px; color: #111; font-size: 12px; }
            .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 15px; }
            .header h1 { margin: 0 0 4px 0; font-size: 20px; font-weight: 900; }
            .header p { margin: 2px 0; color: #555; font-size: 11px; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; background: #111827; color: white; font-weight: bold; font-size: 10px; margin-top: 6px; text-transform: uppercase; }
            .info-grid { display: flex; justify-content: space-between; background: #f8fafc; padding: 12px 16px; border-radius: 10px; margin-bottom: 15px; border: 1px solid #e2e8f0; }
            .info-item label { font-size: 9px; color: #64748b; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 2px; }
            .info-item span { font-size: 13px; font-weight: 800; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #f1f5f9; padding: 8px; text-align: left; font-size: 10px; font-weight: 800; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; color: #475569; }
            .totals-box { text-align: right; background: #eff6ff; border: 1.5px solid #bfdbfe; padding: 14px 18px; border-radius: 12px; margin-bottom: 40px; }
            .totals-box .label { font-size: 11px; font-weight: 800; color: #1e40af; text-transform: uppercase; }
            .totals-box .value { font-size: 22px; font-weight: 900; color: #1e3a8a; margin-top: 2px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
            .sig-line { width: 40%; text-align: center; border-top: 1px dashed #64748b; padding-top: 8px; font-size: 11px; font-weight: bold; color: #334155; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${tallerName}</h1>
            ${tallerRnc ? `<p>RNC: ${tallerRnc}</p>` : ""}
            <p style="font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">REPORTE DE COMISIONES DE TÉCNICO</p>
            <div class="badge">${isPaid ? "COMPROBANTE LIQUIDADO" : "DESGLOSE PENDIENTE POR PAGAR"}</div>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <label>Técnico / Mecánico</label>
              <span>${tech.name}</span>
            </div>
            <div class="info-item">
              <label>Esquema Configurado</label>
              <span>${esquema}</span>
            </div>
            <div class="info-item" style="text-align: right;">
              <label>Fecha de Emisión</label>
              <span>${dateStr}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Factura / Cliente</th>
                <th>Servicios Realizados</th>
                <th style="text-align: right;">Facturado Serv.</th>
                <th style="text-align: right;">Comisión Serv.</th>
                <th style="text-align: right;">Mano de Obra</th>
                <th style="text-align: right;">Total Ganancia</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="totals-box">
            <span class="label">TOTAL ${isPaid ? "PAGADO AL TÉCNICO" : "PENDIENTE POR LIQUIDAR"}:</span>
            <div class="value">${formatRD(totalAmount)}</div>
          </div>

          <div class="signatures">
            <div class="sig-line">Firma del Técnico (${tech.name})</div>
            <div class="sig-line">Autorizado por Administración / Caja</div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  if (
    !currentUser ||
    !["mechanic", "owner", "cashier", "superadmin"].includes(activeRole)
  ) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="h-16 w-16 text-rose-500 mb-4 opacity-50" />
        <h2 className="text-xl font-bold text-neutral-800">Acceso Restringido</h2>
        <p className="text-neutral-500 mt-2">
          No tienes permiso para ver esta sección.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-1 animate-in fade-in duration-300">
      {/* ENCABEZADO */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
            {isAdminOrCashier ? "Comisiones y Porcentajes de Técnicos" : "Mis Comisiones"}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            {isAdminOrCashier
              ? "Configura el porcentaje (%) o monto fijo de cada mecánico y liquida sus comisiones de servicios y mano de obra."
              : `Hola ${
                  miPerfilTecnico?.name || currentUser.name
                }, consulta tus ganancias por servicios y mano de obra.`}
          </p>
        </div>

        {isAdminOrCashier && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={openCreateTechModal}
              className="h-9 rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 font-bold text-xs gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" /> Nuevo Técnico
            </Button>
          </div>
        )}
      </div>

      {/* KPI CARDS GLOBALES */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md rounded-2xl overflow-hidden">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-100">
                Pendiente por Liquidar
              </span>
              <Wallet className="h-4 w-4 text-blue-200" />
            </div>
            <div className="mt-2">
              <div className="font-heading text-2xl sm:text-3xl font-black tracking-tight">
                {formatRD(kpiTotals.totalPendiente)}
              </div>
              <p className="text-[11px] text-blue-100 mt-1 flex items-center gap-1">
                <BadgeCheck className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
                {kpiTotals.totalFacturasPendientes} factura(s) pendientes de pago
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-200/90 bg-white shadow-2xs rounded-2xl">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Base Servicios / M.O.
              </span>
              <Wrench className="h-4 w-4 text-purple-600" />
            </div>
            <div className="mt-2">
              <div className="font-heading text-2xl font-black text-neutral-900">
                {formatRD(kpiTotals.totalBaseServicios)}
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">
                Monto facturado en servicios (sin repuestos)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-200/90 bg-white shadow-2xs rounded-2xl">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Total Liquidado (Histórico)
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2">
              <div className="font-heading text-2xl font-black text-emerald-700">
                {formatRD(kpiTotals.totalPagado)}
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">
                Comisiones ya pagadas a técnicos
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-200/90 bg-white shadow-2xs rounded-2xl">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Técnicos Activos
              </span>
              <Users className="h-4 w-4 text-neutral-600" />
            </div>
            <div className="mt-2">
              <div className="font-heading text-2xl font-black text-neutral-900">
                {tenantTechnicians.filter((t) => t.status === "active").length}{" "}
                <span className="text-sm font-semibold text-neutral-400">
                  / {tenantTechnicians.length}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">
                {unassignedRows.length > 0
                  ? `${unassignedRows.length} factura(s) sin técnico asignado`
                  : "Todas las facturas tienen técnico"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DIRECTORIO Y PORCENTAJES POR TÉCNICO */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-base font-bold text-neutral-900 flex items-center gap-2">
              <Percent className="h-4 w-4 text-blue-600" />
              Esquema de Porcentajes y Balance por Técnico
            </h2>
            <p className="text-xs text-neutral-500">
              Haz clic en un técnico para filtrar sus trabajos o en &quot;Editar %&quot; para ajustar su comisión.
            </p>
          </div>
          {selectedTechId !== "all" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedTechId("all")}
              className="h-8 rounded-xl text-xs font-bold cursor-pointer"
            >
              Ver Todos los Técnicos
            </Button>
          )}
        </div>

        {technicianSummaries.length === 0 ? (
          <Card className="border-dashed border-neutral-300 bg-neutral-50/50 rounded-2xl">
            <CardContent className="py-10 text-center">
              <UserCog className="h-10 w-10 text-neutral-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-neutral-800">
                No hay técnicos registrados todavía
              </p>
              <p className="text-xs text-neutral-500 mt-1 mb-4">
                Registra tus mecánicos y asigna su porcentaje de comisión (ej. 30%, 40%) o monto fijo.
              </p>
              {isAdminOrCashier && (
                <Button
                  onClick={openCreateTechModal}
                  className="rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 font-bold text-xs gap-1.5 cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Registrar Primer Técnico
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {technicianSummaries.map((summary) => {
              const { tech, pendingCount, pendingTotal, paidTotal, pendingRows } = summary;
              const isSelected = selectedTechId === tech.id;
              const pctOrFixed = Number(tech.pagoNomina || 0);
              const tipoPago = tech.tipoPago === "fijo" ? "fijo" : "porcentaje";

              return (
                <Card
                  key={tech.id}
                  onClick={() =>
                    setSelectedTechId(isSelected && isAdminOrCashier ? "all" : tech.id)
                  }
                  className={cn(
                    "rounded-2xl transition-all cursor-pointer border bg-white shadow-2xs hover:shadow-md",
                    isSelected
                      ? "border-blue-600 ring-2 ring-blue-600/15"
                      : "border-neutral-200/90"
                  )}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-heading font-extrabold text-base text-neutral-900 truncate">
                            {tech.name}
                          </h3>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] font-bold px-2 py-0 rounded-full",
                              tech.status === "active"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-neutral-100 text-neutral-500 border-neutral-200"
                            )}
                          >
                            {tech.status === "active" ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          {tech.phone || "Sin teléfono"}
                        </p>
                      </div>

                      {isAdminOrCashier && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditTechModal(tech);
                          }}
                          className="h-7 px-2.5 rounded-lg text-[11px] font-bold border-blue-200 bg-blue-50/70 text-blue-700 hover:bg-blue-100 gap-1 cursor-pointer shrink-0"
                        >
                          <Edit className="h-3 w-3" /> Editar %
                        </Button>
                      )}
                    </div>

                    {/* Badge de Porcentaje / Esquema */}
                    <div className="flex items-center justify-between rounded-xl bg-neutral-50 border border-neutral-200/80 px-3 py-2">
                      <span className="text-[11px] font-semibold text-neutral-600 flex items-center gap-1.5">
                        <Percent className="h-3.5 w-3.5 text-purple-600" />
                        Esquema de Comisión:
                      </span>
                      <span
                        className={cn(
                          "text-xs font-black px-2 py-0.5 rounded-md",
                          pctOrFixed > 0
                            ? "bg-purple-100 text-purple-800"
                            : "bg-amber-100 text-amber-800"
                        )}
                      >
                        {pctOrFixed > 0
                          ? tipoPago === "fijo"
                            ? `Fijo ${formatRD(pctOrFixed)}`
                            : `${pctOrFixed}% por Servicio / M.O.`
                          : "Sin % (100% M.O.)"}
                      </span>
                    </div>

                    {/* Montos Pendiente vs Pagado */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-2.5">
                        <span className="text-[10px] font-bold uppercase text-blue-700 block">
                          Por Pagar ({pendingCount})
                        </span>
                        <span className="font-heading text-base font-black text-blue-950">
                          {formatRD(pendingTotal)}
                        </span>
                      </div>
                      <div className="rounded-xl bg-emerald-50/50 border border-emerald-100 p-2.5">
                        <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                          Ya Liquidado
                        </span>
                        <span className="font-heading text-base font-black text-emerald-900">
                          {formatRD(paidTotal)}
                        </span>
                      </div>
                    </div>

                    {/* Botones de Liquidación e Impresión rápida */}
                    {isAdminOrCashier && pendingTotal > 0 && (
                      <div
                        className="flex items-center gap-2 pt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleLiquidarTecnico(tech)}
                          className="flex-1 h-8 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs gap-1.5 cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" /> Liquidar ({formatRD(pendingTotal)})
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handlePrintComprobante(tech, pendingRows, pendingTotal, false)
                          }
                          className="h-8 px-2.5 rounded-xl border-neutral-200 text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                          title="Imprimir desglose pendiente"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* TABLA DE DESGLOSE DE FACTURAS Y COMISIONES */}
      <Card className="border border-neutral-200/90 bg-white shadow-2xs rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-neutral-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 bg-neutral-100 p-1 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                activeTab === "pending"
                  ? "bg-white text-neutral-950 shadow-2xs"
                  : "text-neutral-600 hover:text-neutral-900"
              )}
            >
              <Coins className="h-3.5 w-3.5 text-blue-600" />
              Pendientes por Pagar
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("paid")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                activeTab === "paid"
                  ? "bg-white text-neutral-950 shadow-2xs"
                  : "text-neutral-600 hover:text-neutral-900"
              )}
            >
              <History className="h-3.5 w-3.5 text-emerald-600" />
              Historial Liquidado
            </button>
            {isAdminOrCashier && unassignedRows.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("unassigned")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                  activeTab === "unassigned"
                    ? "bg-amber-500 text-white shadow-2xs"
                    : "text-amber-700 bg-amber-50 hover:bg-amber-100"
                )}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Sin Técnico ({unassignedRows.length})
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            { activeTab !== "unassigned" && (
              <Select
                value={selectedTechId}
                onValueChange={(v) => setSelectedTechId(v || "all")}
              >
                <SelectTrigger className="h-9 w-48 rounded-xl border-neutral-200 text-xs font-semibold bg-white">
                  <SelectValue placeholder="Filtrar por técnico">
                    {selectedTechId === "all"
                      ? "Todos los Técnicos"
                      : tenantTechnicians.find((t) => t.id === selectedTechId)?.name ||
                        "Seleccione Técnico"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Todos los Técnicos</SelectItem>
                  {tenantTechnicians.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} (
                      {t.pagoNomina && t.pagoNomina > 0
                        ? t.tipoPago === "fijo"
                          ? formatRD(t.pagoNomina)
                          : `${t.pagoNomina}%`
                        : "100% M.O."}
                      )
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="relative w-full sm:w-60">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <Input
                placeholder="Buscar factura, cliente, servicio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs rounded-xl border-neutral-200"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredRows.length === 0 ? (
            <div className="py-14 px-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-bold text-neutral-800">
                {activeTab === "pending"
                  ? "No hay comisiones pendientes para este filtro"
                  : activeTab === "paid"
                  ? "Aún no hay comisiones liquidadas en este filtro"
                  : "Todas las facturas con servicios tienen técnico asignado"}
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Las facturas cobradas con servicios o mano de obra aparecen automáticamente aquí.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50/90 border-b border-neutral-100 text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Factura / Fecha</th>
                  <th className="py-3 px-4">Técnico</th>
                  <th className="py-3 px-4">Servicios / Mano de Obra</th>
                  <th className="py-3 px-4 text-right">Facturado Serv.</th>
                  <th className="py-3 px-4 text-center">Esquema</th>
                  <th className="py-3 px-4 text-right text-purple-700">Comisión Serv.</th>
                  <th className="py-3 px-4 text-right text-blue-700">Mano de Obra</th>
                  <th className="py-3 px-4 text-right text-neutral-900">Ganancia Técnico</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredRows.map((row) => {
                  const invNum = row.inv.ncf || `#${row.inv.id.slice(-6).toUpperCase()}`;
                  return (
                    <tr
                      key={row.inv.id}
                      className="hover:bg-neutral-50/70 transition-colors"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-neutral-900">{invNum}</div>
                        <div className="text-[11px] text-neutral-500">
                          {row.inv.customerName || "Consumidor Final"}
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          {new Date(row.inv.createdAt).toLocaleString("es-DO", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {isAdminOrCashier ? (
                          <Select
                            value={row.effectiveTechId || "none"}
                            onValueChange={(val) =>
                              val && handleAssignTechToInvoice(row.inv.id, val)
                            }
                          >
                            <SelectTrigger className="h-7.5 w-40 rounded-lg border-neutral-200 text-xs font-semibold bg-white">
                              <SelectValue placeholder="Asignar técnico">
                                {row.tech?.name || "Sin asignar"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {tenantTechnicians.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="font-bold text-neutral-800">
                            {row.tech?.name || "Sin asignar"}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 max-w-[240px]">
                        <div
                          className="font-medium text-neutral-800 line-clamp-2"
                          title={row.nombresAplicables.join(", ")}
                        >
                          {row.nombresAplicables.length > 0
                            ? row.nombresAplicables.join(", ")
                            : "Servicio general"}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-semibold text-neutral-700 tabular-nums whitespace-nowrap">
                        {formatRD(row.servicesBaseTotal)}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold bg-purple-50 text-purple-700 border-purple-200"
                        >
                          {row.esquemaLabel}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-purple-700 tabular-nums whitespace-nowrap">
                        {row.comisionTotal > 0 ? formatRD(row.comisionTotal) : "-"}
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-blue-700 tabular-nums whitespace-nowrap">
                        {row.manoObraTotal > 0 ? formatRD(row.manoObraTotal) : "-"}
                      </td>

                      <td className="py-3 px-4 text-right font-black text-neutral-950 text-sm tabular-nums whitespace-nowrap">
                        {formatRD(row.totalFila)}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedInvoice(row.inv)}
                            className="h-7 px-2 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 text-[11px] font-bold gap-1 cursor-pointer"
                            title="Ver factura"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          {isAdminOrCashier &&
                            !row.inv.isCommissionPaid &&
                            row.tech &&
                            row.totalFila > 0 && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleLiquidarFactura(row)}
                                className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold gap-1 cursor-pointer"
                              >
                                <Check className="h-3 w-3" /> Pagar
                              </Button>
                            )}

                          {isAdminOrCashier && row.inv.isCommissionPaid && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleRevertirPago(row.inv)}
                              className="h-7 px-2 rounded-lg border-neutral-200 text-neutral-600 hover:bg-neutral-100 text-[11px] font-semibold gap-1 cursor-pointer"
                              title="Revertir a pendiente"
                            >
                              <RotateCcw className="h-3 w-3" /> Revertir
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-neutral-50 border-t border-neutral-200 font-bold text-xs">
                <tr>
                  <td colSpan={3} className="py-3 px-4 text-right uppercase text-neutral-500">
                    Totales del listado ({filteredRows.length} facturas):
                  </td>
                  <td className="py-3 px-4 text-right text-neutral-800 tabular-nums">
                    {formatRD(
                      filteredRows.reduce((s, r) => s + r.servicesBaseTotal, 0)
                    )}
                  </td>
                  <td />
                  <td className="py-3 px-4 text-right text-purple-700 tabular-nums">
                    {formatRD(filteredRows.reduce((s, r) => s + r.comisionTotal, 0))}
                  </td>
                  <td className="py-3 px-4 text-right text-blue-700 tabular-nums">
                    {formatRD(filteredRows.reduce((s, r) => s + r.manoObraTotal, 0))}
                  </td>
                  <td className="py-3 px-4 text-right font-black text-neutral-950 text-sm tabular-nums">
                    {formatRD(filteredRows.reduce((s, r) => s + r.totalFila, 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </Card>

      {/* MODAL PARA CREAR / EDITAR TÉCNICO Y SU PORCENTAJE */}
      <Dialog open={isTechModalOpen} onOpenChange={setIsTechModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white border border-neutral-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <UserCog className="h-5 w-5 text-neutral-900" />
              {editingTech
                ? `Configurar Comisión — ${editingTech.name}`
                : "Registrar Nuevo Técnico"}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Define el porcentaje (%) o monto fijo que gana el técnico sobre cada servicio y mano de obra facturada.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTech} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nombre del Técnico / Mecánico *</Label>
              <Input
                placeholder="Ej: Gregorio Pérez"
                className="h-10 rounded-xl"
                value={techForm.name}
                onChange={(e) => setTechForm({ ...techForm, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Teléfono</Label>
                <Input
                  placeholder="809-555-0000"
                  className="h-10 rounded-xl"
                  value={techForm.phone}
                  onChange={(e) => setTechForm({ ...techForm, phone: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select
                  value={techForm.status}
                  onValueChange={(v) =>
                    setTechForm({ ...techForm, status: v as "active" | "inactive" })
                  }
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="active">Activo (Disponible)</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-xl bg-blue-50/60 border border-blue-200/80 p-3.5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-blue-950 font-bold">Tipo de Comisión *</Label>
                  <Select
                    value={techForm.tipoPago}
                    onValueChange={(v) =>
                      setTechForm({
                        ...techForm,
                        tipoPago: v as "porcentaje" | "fijo",
                      })
                    }
                  >
                    <SelectTrigger className="h-10 rounded-xl bg-white">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="porcentaje">Porcentaje (%)</SelectItem>
                      <SelectItem value="fijo">Monto Fijo (RD$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-blue-950 font-bold">
                    {techForm.tipoPago === "fijo" ? "Monto Fijo (RD$) *" : "Porcentaje (%) *"}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={techForm.tipoPago === "porcentaje" ? "100" : undefined}
                    placeholder={techForm.tipoPago === "fijo" ? "Ej: 500" : "Ej: 30"}
                    className="h-10 rounded-xl bg-white font-black text-base"
                    value={techForm.pagoNomina}
                    onChange={(e) =>
                      setTechForm({ ...techForm, pagoNomina: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              {/* Botones rápidos de porcentaje común en talleres */}
              {techForm.tipoPago === "porcentaje" && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-blue-700 block">
                    Porcentajes rápidos:
                  </span>
                  <div className="grid grid-cols-6 gap-1.5">
                    {["20", "30", "40", "50", "60", "100"].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setTechForm({ ...techForm, pagoNomina: pct })}
                        className={cn(
                          "py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer",
                          Number(techForm.pagoNomina) === Number(pct)
                            ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                            : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
                        )}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTechModalOpen(false)}
                className="rounded-xl cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 font-bold cursor-pointer"
              >
                {editingTech ? "Guardar Porcentaje" : "Registrar Técnico"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <InvoiceDetailDialog
        open={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
      />
    </div>
  );
}
