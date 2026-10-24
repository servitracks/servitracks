"use client";

import { useState, useMemo } from "react";
import { useParams } from "@/lib/next-compat";
import { useStore } from "@/store/useStore";
import { useNominaStore, EmpleadoNomina, NominaPeriodo, NominaDetalle } from "@/store/useNominaStore";
import { calcularRetenciones, generarArchivoTSS } from "@/lib/nomina-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Users,
  FileText,
  Calculator,
  Plus,
  Search,
  CheckCircle2,
  Download,
  Check,
  AlertCircle,
  Briefcase,
  Building2,
  Printer,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  ShieldCheck,
  Wallet,
  Coins,
  DollarSign,
  ArrowRight,
  UserCheck,
  Wrench,
  Trash2,
  Sparkles,
  FileCheck,
} from "lucide-react";
import { cn, calculateInvoiceCommission } from "@/lib/utils";

const formatRD = (amount: number) => {
  return `RD$ ${Number(amount || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export default function NominaPage() {
  const { tenant } = useParams();
  const { tenants, technicians, invoices, services } = useStore();
  const { empleados, nominas, addEmpleado, updateEmpleado, addNomina, updateNomina, deleteNomina } = useNominaStore();

  const currentTenant = tenants.find((t) => t.slug === tenant) || null;
  const tenantId = currentTenant?.id || "";

  const [activeTab, setActiveTab] = useState<"personal" | "tecnicos" | "nominas" | "tss">("personal");
  const [expandedNominaId, setExpandedNominaId] = useState<string | null>(null);

  // -- Filtro de Personal --
  const [searchEmp, setSearchEmp] = useState("");
  const [isEmpDialogOpen, setIsEmpDialogOpen] = useState(false);
  const [empForm, setEmpForm] = useState<Partial<EmpleadoNomina>>({});

  const tenantEmpleados = useMemo(() => {
    return empleados.filter((e) => e.tenantId === tenantId);
  }, [empleados, tenantId]);

  const filteredEmpleados = useMemo(() => {
    return tenantEmpleados.filter(
      (e) =>
        e.nombres.toLowerCase().includes(searchEmp.toLowerCase()) ||
        e.apellidos.toLowerCase().includes(searchEmp.toLowerCase()) ||
        (e.cedula || "").includes(searchEmp) ||
        (e.cargo || "").toLowerCase().includes(searchEmp.toLowerCase())
    );
  }, [tenantEmpleados, searchEmp]);

  // Técnicos del taller que no están aún registrados como colaboradores en la nómina
  const unregisteredTechnicians = useMemo(() => {
    const tenantTechs = technicians.filter((t) => t.tenantId === tenantId);
    return tenantTechs
      .filter((tech) => {
        return !tenantEmpleados.some(
          (e) => tech.name.toLowerCase().includes(e.nombres.toLowerCase()) ||
            `${e.nombres} ${e.apellidos}`.toLowerCase().includes(tech.name.toLowerCase())
        );
      })
      .filter((tech) => tech.name.toLowerCase().includes(searchEmp.toLowerCase()));
  }, [technicians, tenantEmpleados, tenantId, searchEmp]);

  // -- Historial de Nóminas --
  const tenantNominas = useMemo(() => {
    return nominas
      .filter((n) => n.tenantId === tenantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [nominas, tenantId]);

  // -- Resumen KPI Global --
  const kpiData = useMemo(() => {
    const activos = tenantEmpleados.filter((e) => e.estado === "activo");
    const masaSalarialMensual = activos.reduce((sum, e) => sum + (e.salarioBase || 0), 0);
    
    // Retención estimada TSS SFS (3.04%) + AFP (2.87%) = 5.91%
    const tssEstimada = masaSalarialMensual * (0.0304 + 0.0287);
    const quincenales = activos.filter((e) => e.tipoCobro === "quincenal").length;
    const mensuales = activos.filter((e) => e.tipoCobro === "mensual").length;

    return {
      totalEmpleados: tenantEmpleados.length,
      activosCount: activos.length,
      masaSalarialMensual,
      tssEstimada,
      quincenales,
      mensuales,
      nominasAprobadas: tenantNominas.filter((n) => n.estado === "aprobada" || n.estado === "pagada").length,
    };
  }, [tenantEmpleados, tenantNominas]);

  // -- Diálogo Generación de Nómina --
  const [isGenDialogOpen, setIsGenDialogOpen] = useState(false);
  const [genTipo, setGenTipo] = useState<"quincenal" | "mensual">("quincenal");
  const [genTitulo, setGenTitulo] = useState("");

  // -- Handlers Personal --
  const handleSaveEmp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.nombres?.trim() || !empForm.apellidos?.trim()) {
      toast.error("El nombre y apellido son obligatorios");
      return;
    }

    if (empForm.id) {
      updateEmpleado(empForm.id, {
        ...empForm,
        salarioBase: Number(empForm.salarioBase || 0),
        cedula: empForm.cedula?.trim() || "000-0000000-0",
      });
      toast.success("Colaborador actualizado exitosamente");
    } else {
      addEmpleado({
        ...empForm,
        id: `emp-nom-${Date.now()}`,
        tenantId,
        cedula: empForm.cedula?.trim() || "000-0000000-0",
        nombres: empForm.nombres?.trim() || "",
        apellidos: empForm.apellidos?.trim() || "",
        cargo: empForm.cargo?.trim() || "Técnico General",
        departamento: empForm.departamento?.trim() || "Taller",
        salarioBase: Number(empForm.salarioBase || 0),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        estado: empForm.estado || "activo",
        tipoCobro: empForm.tipoCobro || "quincenal",
        dependientes: empForm.dependientes || 0,
      } as EmpleadoNomina);
      toast.success("Colaborador registrado exitosamente en la nómina");
    }
    setIsEmpDialogOpen(false);
    setEmpForm({});
  };

  const openEditEmp = (emp: EmpleadoNomina) => {
    setEmpForm(emp);
    setIsEmpDialogOpen(true);
  };

  const openRegisterTech = (tech: any) => {
    const parts = tech.name.split(" ");
    const nombres = parts[0];
    const apellidos = parts.slice(1).join(" ") || "";

    setEmpForm({
      nombres,
      apellidos,
      cargo: "Técnico de Taller",
      departamento: "Taller Mecánico",
      tipoCobro: tech.tipoPago === "fijo" ? "mensual" : "quincenal",
      salarioBase: tech.tipoPago === "fijo" ? tech.pagoNomina : 0,
      estado: tech.status === "inactive" ? "inactivo" : "activo",
      cedula: "000-0000000-0",
    });
    setIsEmpDialogOpen(true);
  };

  // -- Handlers Generación de Nómina --
  const handleOpenGenDialog = () => {
    const mesNombre = new Intl.DateTimeFormat("es-DO", { month: "long" }).format(new Date());
    const anio = new Date().getFullYear();
    const dia = new Date().getDate();
    const quincena = dia <= 15 ? "1ra Quincena" : "2da Quincena";

    setGenTipo("quincenal");
    setGenTitulo(`${quincena} de ${mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1)} ${anio}`);
    setIsGenDialogOpen(true);
  };

  const handlePreviewNomina = () => {
    if (!genTitulo.trim()) {
      toast.error("Indique un título para la nómina");
      return;
    }

    const empleadosActivos = tenantEmpleados.filter(
      (e) => e.estado === "activo" && e.tipoCobro === genTipo
    );

    if (empleadosActivos.length === 0) {
      toast.error(`No hay empleados activos con modalidad de cobro "${genTipo}"`);
      return;
    }

    const detalles: NominaDetalle[] = empleadosActivos.map((emp) => {
      const salarioBaseCalculo = genTipo === "quincenal" ? (emp.salarioBase || 0) / 2 : (emp.salarioBase || 0);
      const fullEmpName = `${emp.nombres} ${emp.apellidos}`.toLowerCase().trim();
      const matchedTech = technicians.find(
        (t) =>
          t.tenantId === tenantId &&
          (t.name.toLowerCase().trim() === fullEmpName ||
            t.name.toLowerCase().includes(emp.nombres.toLowerCase().trim()))
      );

      let pendingCommissions = 0;
      if (matchedTech) {
        const pendingInvs = invoices.filter(
          (inv) =>
            inv.tenantId === tenantId &&
            inv.status === "paid" &&
            !inv.isCommissionPaid &&
            inv.mechanicId === matchedTech.id
        );
        pendingInvs.forEach((inv) => {
          const { totalFila } = calculateInvoiceCommission(inv, matchedTech, services);
          pendingCommissions += totalFila;
        });
      }
      pendingCommissions = Math.round(pendingCommissions * 100) / 100;

      const salarioBruto = Math.round((salarioBaseCalculo + pendingCommissions) * 100) / 100;
      const retenciones = calcularRetenciones(salarioBruto);

      return {
        id: `det-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        empleadoId: emp.id,
        salarioBase: salarioBaseCalculo,
        comisiones: pendingCommissions,
        horasExtras: 0,
        otrosIngresos: 0,
        salarioBruto,
        sfs: retenciones.sfs,
        afp: retenciones.afp,
        isr: retenciones.isr,
        prestamos: 0,
        otrasDeducciones: 0,
        salarioNeto: retenciones.salarioNeto,
      };
    });

    const totalBruto = detalles.reduce((sum, d) => sum + d.salarioBruto, 0);
    const totalTss = detalles.reduce((sum, d) => sum + d.sfs + d.afp, 0);
    const totalIsr = detalles.reduce((sum, d) => sum + d.isr, 0);
    const totalNeto = detalles.reduce((sum, d) => sum + d.salarioNeto, 0);

    const nuevaNomina: NominaPeriodo = {
      id: `nom-${Date.now()}`,
      tenantId,
      titulo: genTitulo.trim(),
      fechaInicio: new Date().toISOString(),
      fechaFin: new Date().toISOString(),
      tipo: genTipo,
      estado: "borrador",
      detalles,
      totalBruto,
      totalTss,
      totalIsr,
      totalNeto,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addNomina(nuevaNomina);
    setIsGenDialogOpen(false);
    setActiveTab("nominas");
    setExpandedNominaId(nuevaNomina.id);
    toast.success("Nómina calculada exitosamente en modo Borrador");
  };

  const handleAprobarNomina = (nomId: string) => {
    updateNomina(nomId, { estado: "aprobada" });
    toast.success("Nómina Aprobada y consolidada");
  };

  const handlePrintNomina = (nom: NominaPeriodo) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const tallerName = currentTenant?.name || "SERVITRACKS TALLER AUTOMOTRIZ";
    const tallerRnc = currentTenant?.rnc || "";
    const dateStr = new Date(nom.createdAt).toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const rowsHtml = nom.detalles
      .map((d) => {
        const emp = empleados.find((e) => e.id === d.empleadoId);
        return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
            <b>${emp?.nombres || ""} ${emp?.apellidos || ""}</b><br/>
            <span style="font-size: 10px; color: #6b7280;">Cédula: ${emp?.cedula || "—"} · ${emp?.cargo || "Técnico"}</span>
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace;">
            ${formatRD(d.salarioBase)}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace; color: #2563eb;">
            ${formatRD(d.comisiones)}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace; font-weight: bold;">
            ${formatRD(d.salarioBruto)}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace; color: #dc2626;">
            -${formatRD(d.sfs + d.afp)}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace; color: #dc2626;">
            -${formatRD(d.isr)}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace; font-weight: 900; color: #166534; font-size: 12px;">
            ${formatRD(d.salarioNeto)}
          </td>
        </tr>
      `;
      })
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Volante de Nómina - ${nom.titulo}</title>
          <style>
            @page { margin: 12mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 15px; color: #111; font-size: 11px; }
            .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 15px; }
            .header h1 { margin: 0 0 4px 0; font-size: 18px; font-weight: 900; }
            .header p { margin: 2px 0; color: #555; font-size: 11px; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; background: #111827; color: white; font-weight: bold; font-size: 9px; margin-top: 6px; text-transform: uppercase; }
            .info-grid { display: flex; justify-content: space-between; background: #f8fafc; padding: 10px 14px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #e2e8f0; }
            .info-item label { font-size: 9px; color: #64748b; font-weight: bold; text-transform: uppercase; display: block; }
            .info-item span { font-size: 12px; font-weight: bold; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #f1f5f9; padding: 8px; text-align: left; font-size: 9px; font-weight: 800; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; color: #475569; }
            .totals-box { text-align: right; background: #f8fafc; border: 1.5px solid #cbd5e1; padding: 12px 16px; border-radius: 10px; margin-bottom: 35px; }
            .totals-box .label { font-size: 10px; font-weight: 800; color: #334155; text-transform: uppercase; }
            .totals-box .value { font-size: 20px; font-weight: 900; color: #0f172a; margin-top: 2px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
            .sig-line { width: 40%; text-align: center; border-top: 1px dashed #64748b; padding-top: 8px; font-size: 10px; font-weight: bold; color: #334155; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${tallerName}</h1>
            ${tallerRnc ? `<p>RNC: ${tallerRnc}</p>` : ""}
            <p style="font-weight: 800; text-transform: uppercase; margin-top: 4px;">VOLANTE DE NÓMINA GENERAL</p>
            <div class="badge">${nom.titulo} · ${nom.tipo.toUpperCase()}</div>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <label>Período de Pago</label>
              <span>${nom.titulo}</span>
            </div>
            <div class="info-item">
              <label>Colaboradores</label>
              <span>${nom.detalles.length} personas</span>
            </div>
            <div class="info-item" style="text-align: right;">
              <label>Fecha de Emisión</label>
              <span>${dateStr}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Colaborador / Cédula</th>
                <th style="text-align: right;">Salario Base</th>
                <th style="text-align: right;">Comisiones</th>
                <th style="text-align: right;">Bruto</th>
                <th style="text-align: right;">TSS (5.91%)</th>
                <th style="text-align: right;">ISR</th>
                <th style="text-align: right;">Neto a Cobrar</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="totals-box">
            <span class="label">TOTAL NETO A DISPERSAR:</span>
            <div class="value">${formatRD(nom.totalNeto)}</div>
          </div>

          <div class="signatures">
            <div class="sig-line">Elaborado por Recursos Humanos</div>
            <div class="sig-line">Aprobado por Dirección / Gerencia</div>
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

  const handleDescargarTSS = (periodoStr: string) => {
    const contenido = generarArchivoTSS(tenantEmpleados, periodoStr);
    const blob = new Blob([contenido], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `SUIR_TSS_${periodoStr}_${tenantId || "taller"}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Archivo SUIR TXT generado para el período ${periodoStr}`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-1 animate-in fade-in duration-300">
      {/* CABECERA EJECUTIVA */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
              Nómina y Personal
            </h1>
            <Badge
              variant="outline"
              className="text-[11px] font-bold rounded-full bg-neutral-100 text-neutral-700 border-neutral-200"
            >
              {tenantEmpleados.length} Colaboradores
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Gestión de colaboradores, cálculo de retenciones dominicanas (TSS Ley 87-01 e ISR DGII) y dispersión de sueldos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setEmpForm({});
              setIsEmpDialogOpen(true);
            }}
            className="h-10 rounded-xl border-neutral-200 text-neutral-700 hover:bg-neutral-50 font-semibold text-xs gap-1.5 cursor-pointer shadow-2xs"
          >
            <Plus className="h-4 w-4" /> Nuevo Colaborador
          </Button>

          <Button
            onClick={handleOpenGenDialog}
            className="h-10 rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 font-semibold text-xs gap-2 cursor-pointer shadow-xs transition-all duration-150"
          >
            <Calculator className="h-4 w-4" /> Correr Nómina
          </Button>
        </div>
      </div>

      {/* KPI CARDS EJECUTIVAS */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Masa Salarial Mensual */}
        <Card className="border border-neutral-200/80 bg-white shadow-2xs hover:shadow-xs transition-all duration-200 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Masa Salarial Base
            </span>
            <div className="h-9 w-9 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-700">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-heading text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 tabular-nums">
              {formatRD(kpiData.masaSalarialMensual)}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1.5">
              Costo mensual en salarios base activos
            </p>
          </div>
        </Card>

        {/* Card 2: Retenciones TSS Estimadas */}
        <Card className="border border-neutral-200/80 bg-white shadow-2xs hover:shadow-xs transition-all duration-200 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Retención TSS Estimada
            </span>
            <div className="h-9 w-9 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-700">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-heading text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 tabular-nums">
              {formatRD(kpiData.tssEstimada)}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1.5">
              SFS (3.04%) + AFP (2.87%) Ley 87-01
            </p>
          </div>
        </Card>

        {/* Card 3: Personal Activo */}
        <Card className="border border-neutral-200/80 bg-white shadow-2xs hover:shadow-xs transition-all duration-200 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Personal Activo
            </span>
            <div className="h-9 w-9 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-700">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-heading text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 tabular-nums">
              {kpiData.activosCount}{" "}
              <span className="text-base font-normal text-neutral-400">
                / {kpiData.totalEmpleados}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[11px] text-neutral-500">
                {kpiData.quincenales} quincenales · {kpiData.mensuales} mensuales
              </span>
            </div>
          </div>
        </Card>

        {/* Card 4: Nóminas Aprobadas */}
        <Card className="border border-neutral-200/80 bg-white shadow-2xs hover:shadow-xs transition-all duration-200 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Períodos Procesados
            </span>
            <div className="h-9 w-9 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-700">
              <FileCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-heading text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 tabular-nums">
              {tenantNominas.length}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1.5">
              {kpiData.nominasAprobadas} aprobadas · {tenantNominas.filter((n) => n.estado === "borrador").length} en borrador
            </p>
          </div>
        </Card>
      </div>

      {/* PESTAÑAS PRINCIPALES (Estándar Negro Primario) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 bg-neutral-100/80 p-1 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("personal")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer",
              activeTab === "personal"
                ? "bg-neutral-900 text-white shadow-xs"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50"
            )}
          >
            <Users className="h-3.5 w-3.5" />
            Directorio de Personal
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                activeTab === "personal" ? "bg-neutral-800 text-white" : "bg-neutral-200 text-neutral-700"
              )}
            >
              {filteredEmpleados.length}
            </span>
          </button>

          {unregisteredTechnicians.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("tecnicos")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer",
                activeTab === "tecnicos"
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/60"
              )}
            >
              <Wrench className="h-3.5 w-3.5 text-amber-500" />
              Técnicos por Registrar ({unregisteredTechnicians.length})
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab("nominas")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer",
              activeTab === "nominas"
                ? "bg-neutral-900 text-white shadow-xs"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50"
            )}
          >
            <Calculator className="h-3.5 w-3.5" />
            Historial de Nóminas
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                activeTab === "nominas" ? "bg-neutral-800 text-white" : "bg-neutral-200 text-neutral-700"
              )}
            >
              {tenantNominas.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tss")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer",
              activeTab === "tss"
                ? "bg-neutral-900 text-white shadow-xs"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50"
            )}
          >
            <FileText className="h-3.5 w-3.5" />
            TSS & SUIR
          </button>
        </div>

        {activeTab === "personal" && (
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <Input
              placeholder="Buscar por nombre o cédula..."
              value={searchEmp}
              onChange={(e) => setSearchEmp(e.target.value)}
              className="pl-8 h-9 text-xs rounded-xl border-neutral-200 bg-white"
            />
          </div>
        )}
      </div>

      {/* CONTENIDO 1: DIRECTORIO DE PERSONAL */}
      {activeTab === "personal" && (
        <Card className="border border-neutral-200/80 bg-white shadow-2xs rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-200/70 text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Colaborador / Identidad</th>
                  <th className="py-3 px-4">Cédula</th>
                  <th className="py-3 px-4">Cargo & Departamento</th>
                  <th className="py-3 px-4 text-center">Frecuencia Pago</th>
                  <th className="py-3 px-4 text-right">Salario Base</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredEmpleados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center text-neutral-400 font-medium">
                      No se encontraron colaboradores registrados.
                    </td>
                  </tr>
                ) : (
                  filteredEmpleados.map((emp) => {
                    const isMissingData =
                      emp.cedula === "000-0000000-0" || (emp.salarioBase || 0) === 0;
                    return (
                      <tr
                        key={emp.id}
                        onClick={() => openEditEmp(emp)}
                        className="hover:bg-neutral-50/70 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shrink-0 uppercase">
                              {(emp.nombres || "").slice(0, 1)}
                              {(emp.apellidos || "").slice(0, 1)}
                            </div>
                            <div>
                              <div className="font-bold text-neutral-900 text-xs">
                                {emp.nombres} {emp.apellidos}
                              </div>
                              <div className="text-[10px] text-neutral-400">
                                Registrado el {new Date(emp.createdAt).toLocaleDateString("es-DO")}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {isMissingData ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                              <AlertCircle className="h-3 w-3" /> Faltan Datos
                            </span>
                          ) : (
                            <span className="font-mono text-xs font-semibold text-neutral-800">
                              {emp.cedula}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-neutral-800">{emp.cargo || "Técnico"}</div>
                          <div className="text-[11px] text-neutral-400">{emp.departamento || "Taller"}</div>
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-semibold capitalize bg-neutral-100 text-neutral-800 border-neutral-200"
                          >
                            {emp.tipoCobro}
                          </Badge>
                        </td>

                        <td className="py-3 px-4 text-right font-black text-neutral-900 font-mono tabular-nums whitespace-nowrap text-xs">
                          {formatRD(emp.salarioBase || 0)}
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                              emp.estado === "activo"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                                : "bg-neutral-100 text-neutral-500 border-neutral-200"
                            )}
                          >
                            {emp.estado === "activo" ? "Activo" : "Inactivo"}
                          </Badge>
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditEmp(emp)}
                            className="h-7 px-2.5 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 text-[11px] font-medium cursor-pointer"
                          >
                            Editar
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* CONTENIDO 2: TÉCNICOS POR REGISTRAR */}
      {activeTab === "tecnicos" && (
        <Card className="border border-neutral-200/80 bg-white shadow-2xs rounded-2xl overflow-hidden p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-heading text-base font-bold text-neutral-900 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-neutral-900" />
                Mecánicos del Taller Pendientes de Registro en Nómina
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5 max-w-xl">
                Los siguientes mecánicos están registrados en el taller operando comisiones, pero aún no están incorporados en la nómina formal (TSS / ISR).
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
            {unregisteredTechnicians.map((tech) => (
              <Card
                key={tech.id}
                className="border border-neutral-200/80 bg-neutral-50/50 rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                    {tech.name.slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900">{tech.name}</h3>
                    <p className="text-[11px] text-neutral-500">
                      Esquema: {tech.tipoPago === "fijo" ? `Fijo ${formatRD(tech.pagoNomina || 0)}` : `${tech.pagoNomina || 0}% Comisión`}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => openRegisterTech(tech)}
                  className="w-full h-8 rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
                >
                  <UserCheck className="h-3.5 w-3.5" /> Incorporar a Nómina
                </Button>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* CONTENIDO 3: HISTORIAL DE NÓMINAS */}
      {activeTab === "nominas" && (
        <div className="space-y-4">
          {tenantNominas.length === 0 ? (
            <Card className="border-dashed border-neutral-200 bg-neutral-50/60 rounded-2xl">
              <CardContent className="py-14 text-center">
                <Calculator className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-neutral-800">No hay períodos de nómina generados</h3>
                <p className="text-xs text-neutral-500 mt-1 mb-4 max-w-sm mx-auto">
                  Calcula automáticamente la nómina quincenal o mensual integrando los salarios base y comisiones de taller acumuladas.
                </p>
                <Button
                  onClick={handleOpenGenDialog}
                  className="rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 font-semibold text-xs gap-2 cursor-pointer shadow-xs"
                >
                  <Calculator className="h-4 w-4" /> Correr Primera Nómina
                </Button>
              </CardContent>
            </Card>
          ) : (
            tenantNominas.map((nom) => {
              const isExpanded = expandedNominaId === nom.id;
              return (
                <Card
                  key={nom.id}
                  className="border border-neutral-200/80 bg-white shadow-2xs rounded-2xl overflow-hidden transition-all duration-200"
                >
                  {/* CABECERA DEL PERIODO */}
                  <div className="p-4 sm:p-5 border-b border-neutral-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-50/40">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading font-bold text-base text-neutral-900">{nom.titulo}</h3>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase",
                            nom.estado === "borrador"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : nom.estado === "aprobada"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-neutral-100 text-neutral-700 border-neutral-200"
                          )}
                        >
                          {nom.estado}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        Generada el {new Date(nom.createdAt).toLocaleDateString("es-DO")} · Frecuencia:{" "}
                        <span className="capitalize font-semibold text-neutral-700">{nom.tipo}</span> ·{" "}
                        {nom.detalles.length} colaboradores
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handlePrintNomina(nom)}
                        className="h-8 rounded-xl border-neutral-200 text-neutral-700 hover:bg-neutral-100 text-xs font-semibold gap-1.5 cursor-pointer"
                      >
                        <Printer className="h-3.5 w-3.5" /> Volante General
                      </Button>

                      {nom.estado === "borrador" && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleAprobarNomina(nom.id)}
                          className="h-8 rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Check className="h-3.5 w-3.5" /> Aprobar Nómina
                        </Button>
                      )}

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setExpandedNominaId(isExpanded ? null : nom.id)}
                        className="h-8 w-8 p-0 rounded-xl text-neutral-500 hover:text-neutral-900 cursor-pointer"
                        title={isExpanded ? "Ocultar desglose" : "Ver desglose"}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* MINI KPIS DE LA NÓMINA */}
                  <div className="p-4 sm:p-5">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/70">
                        <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider block mb-1">
                          Total Bruto
                        </span>
                        <span className="font-heading text-base font-black text-neutral-900 font-mono tabular-nums">
                          {formatRD(nom.totalBruto)}
                        </span>
                      </div>

                      <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/70">
                        <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider block mb-1">
                          Retenciones TSS (5.91%)
                        </span>
                        <span className="font-heading text-base font-black text-neutral-900 font-mono tabular-nums">
                          -{formatRD(nom.totalTss)}
                        </span>
                      </div>

                      <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/70">
                        <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider block mb-1">
                          Retenciones ISR (DGII)
                        </span>
                        <span className="font-heading text-base font-black text-neutral-900 font-mono tabular-nums">
                          -{formatRD(nom.totalIsr)}
                        </span>
                      </div>

                      <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/70">
                        <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider block mb-1">
                          Neto a Dispersar
                        </span>
                        <span className="font-heading text-base font-black text-neutral-950 font-mono tabular-nums">
                          {formatRD(nom.totalNeto)}
                        </span>
                      </div>
                    </div>

                    {/* TABLA DESPLEGABLE DE EMPLEADOS */}
                    {isExpanded && (
                      <div className="mt-4 border border-neutral-200/80 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold uppercase text-[10px] tracking-wider">
                              <th className="p-3">Colaborador</th>
                              <th className="p-3 text-right">Salario Base</th>
                              <th className="p-3 text-right">Comisiones Taller</th>
                              <th className="p-3 text-right">Bruto</th>
                              <th className="p-3 text-right">SFS (3.04%)</th>
                              <th className="p-3 text-right">AFP (2.87%)</th>
                              <th className="p-3 text-right">ISR</th>
                              <th className="p-3 text-right">Neto a Cobrar</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100">
                            {nom.detalles.map((det) => {
                              const emp = empleados.find((e) => e.id === det.empleadoId);
                              return (
                                <tr key={det.id} className="hover:bg-neutral-50/60 transition-colors">
                                  <td className="p-3 font-semibold text-neutral-900">
                                    {emp?.nombres} {emp?.apellidos}
                                    <span className="block text-[10px] text-neutral-400 font-normal">
                                      {emp?.cargo || "Técnico"}
                                    </span>
                                  </td>
                                  <td className="p-3 text-right font-mono tabular-nums text-neutral-700">
                                    {formatRD(det.salarioBase)}
                                  </td>
                                  <td className="p-3 text-right font-mono tabular-nums text-neutral-700 font-semibold">
                                    {det.comisiones > 0 ? formatRD(det.comisiones) : "—"}
                                  </td>
                                  <td className="p-3 text-right font-mono tabular-nums font-bold text-neutral-900">
                                    {formatRD(det.salarioBruto)}
                                  </td>
                                  <td className="p-3 text-right font-mono tabular-nums text-neutral-600">
                                    -{formatRD(det.sfs)}
                                  </td>
                                  <td className="p-3 text-right font-mono tabular-nums text-neutral-600">
                                    -{formatRD(det.afp)}
                                  </td>
                                  <td className="p-3 text-right font-mono tabular-nums text-neutral-600">
                                    {det.isr > 0 ? `-${formatRD(det.isr)}` : "—"}
                                  </td>
                                  <td className="p-3 text-right font-mono tabular-nums font-black text-neutral-950">
                                    {formatRD(det.salarioNeto)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* CONTENIDO 4: REPORTES TSS & SUIR */}
      {activeTab === "tss" && (
        <Card className="border border-neutral-200/80 bg-white shadow-2xs rounded-2xl p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-heading text-lg font-bold text-neutral-900 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-neutral-900" />
                Exportación SUIR — Tesorería de la Seguridad Social (TSS)
              </h2>
              <p className="text-xs text-neutral-500 mt-1 max-w-xl">
                Genera el archivo TXT estructurado con las novedades de autodeterminación para cargar en la plataforma oficial del SUIR de la República Dominicana.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-neutral-50 border border-neutral-200/80 p-5 space-y-4 max-w-2xl">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="space-y-1.5 flex-1">
                <Label className="text-xs font-semibold text-neutral-700">Período de Novedades (Año / Mes)</Label>
                <Select defaultValue="202610">
                  <SelectTrigger className="h-10 rounded-xl border-neutral-200 text-xs bg-white">
                    <SelectValue placeholder="Periodo" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="202610">Octubre 2026 (202610)</SelectItem>
                    <SelectItem value="202609">Septiembre 2026 (202609)</SelectItem>
                    <SelectItem value="202608">Agosto 2026 (202608)</SelectItem>
                    <SelectItem value="202607">Julio 2026 (202607)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => handleDescargarTSS("202610")}
                className="h-10 rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 font-semibold text-xs gap-2 cursor-pointer shadow-xs"
              >
                <Download className="h-4 w-4" /> Descargar Archivo TXT SUIR
              </Button>
            </div>

            <div className="pt-2 border-t border-neutral-200 text-[11px] text-neutral-500 space-y-1">
              <p className="font-semibold text-neutral-700">Reglas de validación SUIR República Dominicana:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>El archivo incluye cédulas dominicanas válidas de 11 dígitos sin guiones.</li>
                <li>Monto salarial reportado con 2 decimales según los topes salariales legales (SFS 10 salarios mínimos, AFP 20 salarios mínimos).</li>
                <li>Se contemplan deducciones obligatorias del trabajador (SFS 3.04%, AFP 2.87%).</li>
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* DIALOG: Empleado */}
      <Dialog open={isEmpDialogOpen} onOpenChange={setIsEmpDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl bg-white border border-neutral-200 shadow-2xl p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="font-heading text-lg font-bold text-neutral-900">
              {empForm.id ? "Editar Colaborador" : "Registrar Nuevo Colaborador"}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Ingresa los datos del empleado para el cálculo de salarios, retenciones de TSS e impuestos DGII.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEmp} className="space-y-3.5 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-700">Nombres *</Label>
                <Input
                  value={empForm.nombres || ""}
                  onChange={(e) => setEmpForm({ ...empForm, nombres: e.target.value })}
                  placeholder="Ej: Gregorio"
                  className="h-9.5 rounded-xl border-neutral-200 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-700">Apellidos *</Label>
                <Input
                  value={empForm.apellidos || ""}
                  onChange={(e) => setEmpForm({ ...empForm, apellidos: e.target.value })}
                  placeholder="Ej: Pérez"
                  className="h-9.5 rounded-xl border-neutral-200 text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-700">Cédula Dominicana *</Label>
                <Input
                  placeholder="402-0000000-0"
                  value={empForm.cedula || ""}
                  onChange={(e) => setEmpForm({ ...empForm, cedula: e.target.value })}
                  className="h-9.5 rounded-xl border-neutral-200 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-700">Estado Operativo</Label>
                <Select
                  value={empForm.estado || "activo"}
                  onValueChange={(v: any) => setEmpForm({ ...empForm, estado: v })}
                >
                  <SelectTrigger className="h-9.5 rounded-xl border-neutral-200 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-700">Cargo</Label>
                <Input
                  value={empForm.cargo || ""}
                  onChange={(e) => setEmpForm({ ...empForm, cargo: e.target.value })}
                  placeholder="Ej: Técnico Automotriz"
                  className="h-9.5 rounded-xl border-neutral-200 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-700">Departamento</Label>
                <Input
                  value={empForm.departamento || ""}
                  onChange={(e) => setEmpForm({ ...empForm, departamento: e.target.value })}
                  placeholder="Ej: Taller Mecánico"
                  className="h-9.5 rounded-xl border-neutral-200 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-700">Modalidad de Cobro</Label>
                <Select
                  value={empForm.tipoCobro || "quincenal"}
                  onValueChange={(v: any) => setEmpForm({ ...empForm, tipoCobro: v })}
                >
                  <SelectTrigger className="h-9.5 rounded-xl border-neutral-200 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="quincenal">Quincenal (Cada 15 días)</SelectItem>
                    <SelectItem value="mensual">Mensual (Fin de mes)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-700">Salario Base Mensual (RD$)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  className="h-9.5 rounded-xl border-neutral-200 text-xs font-bold font-mono"
                  value={empForm.salarioBase || ""}
                  onChange={(e) => setEmpForm({ ...empForm, salarioBase: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-3 border-t border-neutral-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEmpDialogOpen(false)}
                className="h-9 rounded-xl border-neutral-200 text-xs cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="h-9 rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 font-semibold text-xs cursor-pointer shadow-xs"
              >
                {empForm.id ? "Guardar Cambios" : "Registrar Colaborador"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Correr Nómina */}
      <Dialog open={isGenDialogOpen} onOpenChange={setIsGenDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white border border-neutral-200 shadow-2xl p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="font-heading text-lg font-bold text-neutral-900 flex items-center gap-2">
              <Calculator className="h-5 w-5 text-neutral-900" />
              Procesar Nuevo Período de Nómina
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Se calculará el salario bruto prorrateado, comisiones del taller acumuladas y las retenciones legales dominicanas (TSS e ISR).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-700">Título del Período *</Label>
              <Input
                placeholder="Ej. 1ra Quincena Octubre 2026"
                value={genTitulo}
                onChange={(e) => setGenTitulo(e.target.value)}
                className="h-9.5 rounded-xl border-neutral-200 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-700">Frecuencia de Nómina</Label>
              <Select value={genTipo} onValueChange={(v: any) => setGenTipo(v)}>
                <SelectTrigger className="h-9.5 rounded-xl border-neutral-200 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="quincenal">Quincenal (Aplica al personal quincenal)</SelectItem>
                  <SelectItem value="mensual">Mensual (Aplica al personal mensual)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl bg-neutral-50 border border-neutral-200/80 p-3 text-xs text-neutral-600 space-y-1">
              <p className="font-semibold text-neutral-900 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Cálculo Automático Ley 87-01:
              </p>
              <p>• Seguro Familiar de Salud (SFS): 3.04% a cargo del empleado.</p>
              <p>• Fondo de Pensiones (AFP): 2.87% a cargo del empleado.</p>
              <p>• Impuesto sobre la Renta (DGII): Según escala progresiva mensual.</p>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-3 border-t border-neutral-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsGenDialogOpen(false)}
              className="h-9 rounded-xl border-neutral-200 text-xs cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handlePreviewNomina}
              className="h-9 rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 font-semibold text-xs cursor-pointer shadow-xs"
            >
              Generar Pre-nómina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
