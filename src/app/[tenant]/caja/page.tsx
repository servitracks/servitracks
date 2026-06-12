"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { 
  Wallet, Lock, ArrowDownLeft, ArrowUpRight, AlertTriangle, Plus, 
  CheckCircle2, Printer, Search, FileText, PiggyBank, Coins, 
  History, Settings, Eye, Info, RefreshCw, X, Receipt, Check, FileCheck, Users,
  CreditCard, Smartphone
} from "lucide-react";
import { useStore, Caja, MovimientoCaja, Empleado, Tenant, Invoice } from "@/store/useStore";
import { useParams } from "@/lib/next-compat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { InvoiceDetailDialog } from "@/components/dashboard/InvoiceDetailDialog";

// Dominican peso formatting helper
const formatRD = (amount: number) => {
  return `RD$ ${amount.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDateTimeRD = (dateStr: string) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const CATEGORIAS_GASTOS = [
  "Combustible",
  "Almuerzo",
  "Suministros de Taller",
  "Limpieza",
  "Papelería",
  "Servicios Públicos",
  "Otros"
];

// Default simulated employees for PIN signing
const DEFAULT_EMPLEADOS: Empleado[] = [
  { id: "emp-yeri", nombre: "Yeri", apellido: "Orlando", rol: "ADMIN", pin: "1234" },
  { id: "emp-carlos", nombre: "Carlos", apellido: "Méndez", rol: "CAJERO", pin: "0000" }
];

export default function CajaPage() {
  const { tenant } = useParams();
  
  const { 
    tenants, 
    cajas = [], 
    cajaMovements = [], 
    addCaja, 
    updateCaja,
    addCajaMovement, 
    updateTenant,
    technicians = [],
    invoices = [],
    updateInvoice
  } = useStore();

  const currentTenant = tenants.find(t => t.slug === tenant) ?? null;
  const tenantId = currentTenant?.id ?? "";

  // Active caja shift
  const activeCaja = useMemo(() => {
    return cajas.find(c => c.tenant_id === tenantId && c.estado === 'ABIERTA');
  }, [cajas, tenantId]);

  // Current session movements
  const activeMovements = useMemo(() => {
    if (!activeCaja) return [];
    return cajaMovements.filter(m => m.caja_id === activeCaja.id && m.tenant_id === tenantId);
  }, [cajaMovements, activeCaja, tenantId]);

  // Calculated totals for the current open cash shift
  const metrics = useMemo(() => {
    if (!activeCaja) {
      return {
        montoInicial: 0,
        ingresosEfectivo: 0,
        egresosEfectivo: 0,
        tarjetaTotal: 0,
        transferenciaTotal: 0,
        efectivoEsperado: 0,
        totalGeneral: 0,
        totalManoObra: 0
      };
    }

    const montoInicial = activeCaja.monto_inicial;
    let ingresosEfectivo = 0;
    let egresosEfectivo = 0;
    let tarjetaTotal = 0;
    let transferenciaTotal = 0;
    let totalManoObra = 0;

    activeMovements.forEach(m => {
      const isIngreso = ['INGRESO', 'VENTA', 'ABONO'].includes(m.tipo);
      
      // Accumulate labor if present
      if (m.monto_mano_obra) {
        totalManoObra += m.monto_mano_obra;
      }

      if (m.metodo === 'EFECTIVO') {
        if (isIngreso) {
          ingresosEfectivo += m.monto;
        } else {
          egresosEfectivo += m.monto;
        }
      } else if (m.metodo === 'TARJETA') {
        tarjetaTotal += m.monto;
      } else if (m.metodo === 'TRANSFERENCIA') {
        transferenciaTotal += m.monto;
      }
    });

    const efectivoEsperado = montoInicial + ingresosEfectivo - egresosEfectivo;
    const totalGeneral = efectivoEsperado + tarjetaTotal + transferenciaTotal;

    return {
      montoInicial,
      ingresosEfectivo,
      egresosEfectivo,
      tarjetaTotal,
      transferenciaTotal,
      efectivoEsperado,
      totalGeneral,
      totalManoObra
    };
  }, [activeCaja, activeMovements]);

  // Calculate global pending commission for ALL technicians (past and present shifts)
  const totalGlobalPending = useMemo(() => {
    let globalTotal = 0;
    const pendingInvoices = invoices.filter(inv => 
      inv.tenantId === tenantId && 
      inv.status === 'paid' && 
      !inv.isCommissionPaid && 
      inv.mechanicId && 
      inv.mechanicId !== 'none'
    );
    
    pendingInvoices.forEach(inv => {
      (inv.items || []).forEach(item => {
        if (!item) return;
        const isManoObra = (item.id && item.id.startsWith("labor-")) || (item.name && item.name.toLowerCase() === "mano de obra");
        if (isManoObra) {
          globalTotal += ((item.laborPrice ?? item.unitPrice) || 0) * (item.quantity || 1);
        } else {
          globalTotal += (item.laborPrice || 0) * (item.quantity || 1);
        }
      });
    });
    return globalTotal;
  }, [invoices, tenantId]);

  // Helper to calculate pending labor sum for a technician
  const calculateTechCommission = (techId: string) => {
    const tech = technicians.find(t => t.id === techId);
    if (!tech) return { total: 0, pendingIds: [] };

    const pending = invoices.filter(inv => 
      inv.tenantId === tenantId && 
      inv.status === 'paid' && 
      inv.mechanicId === techId && 
      !inv.isCommissionPaid
    );

    let total = 0;
    pending.forEach(inv => {
      let invTotal = 0;
      (inv.items || []).forEach(item => {
        if (!item) return;
        const isManoObra = (item.id && item.id.startsWith("labor-")) || (item.name && item.name.toLowerCase() === "mano de obra");
        if (isManoObra) {
          invTotal += ((item.laborPrice ?? item.unitPrice) || 0) * (item.quantity || 1);
        } else {
          invTotal += (item.laborPrice || 0) * (item.quantity || 1);
        }
      });
      total += invTotal;
    });
    return { total, pendingIds: pending.map(i => i.id) };
  };

  // Dialog open states
  const [isAperturaOpen, setIsAperturaOpen] = useState(false);
  const [isCierreOpen, setIsCierreOpen] = useState(false);
  const [isMovOpen, setIsMovOpen] = useState(false);
  const [isCajaChicaOpen, setIsCajaChicaOpen] = useState(false);
  const [isHistoricoOpen, setIsHistoricoOpen] = useState(false);
  const [isTicketPreviewOpen, setIsTicketPreviewOpen] = useState(false);
  const [selectedTicketCaja, setSelectedTicketCaja] = useState<Caja | null>(null);
  const [isCxcOpen, setIsCxcOpen] = useState(false);
  const [cxcSearch, setCxcSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedInvoiceEdit, setSelectedInvoiceEdit] = useState(false);

  const findInvoiceForMovement = (mov: MovimientoCaja) => {
    // 1. Try to find any sequence of B or E followed by 10-12 digits (NCF/e-CF)
    const ncfMatch = mov.concepto.match(/([BE]\d{10,12})/i);
    if (ncfMatch) {
      const code = ncfMatch[1].toLowerCase();
      const found = invoices.find(inv => inv.ncf && inv.ncf.toLowerCase() === code);
      if (found) return found;
    }

    // 2. Try to find the word "Factura" followed by some code
    const facturaMatch = mov.concepto.match(/Factura\s+([A-Za-z0-9\-]+)/i);
    if (facturaMatch) {
      const code = facturaMatch[1].toLowerCase();
      const found = invoices.find(inv => 
        (inv.ncf && inv.ncf.toLowerCase() === code) ||
        inv.id.toLowerCase().endsWith(code) ||
        inv.id.toLowerCase() === code
      );
      if (found) return found;
    }

    // 3. Try to find hash prefix e.g. #abcdef
    const idMatch = mov.concepto.match(/#([a-z0-9]+)/i);
    if (idMatch) {
      const suffix = idMatch[1].toLowerCase();
      const found = invoices.find(inv => inv.id.toLowerCase().endsWith(suffix));
      if (found) return found;
    }

    // 4. Try fallback matching by exact amount
    const matches = invoices.filter(inv => Math.abs(inv.total - mov.monto) < 0.01);
    if (matches.length === 1) return matches[0];

    return null;
  };
  
  // -- PAGO TECNICO LIQUIDACION --
  const [isPagoTecnicoOpen, setIsPagoTecnicoOpen] = useState(false);
  const [selectedTechToPay, setSelectedTechToPay] = useState("");

  const pendingTechInvoices = useMemo(() => {
    if (!selectedTechToPay) return [];
    return invoices.filter(inv => 
      inv.tenantId === tenantId && 
      inv.status === 'paid' && 
      inv.mechanicId === selectedTechToPay && 
      !inv.isCommissionPaid
    );
  }, [invoices, tenantId, selectedTechToPay]);

  const techCommissionInfo = useMemo(() => {
    const tech = technicians.find(t => t.id === selectedTechToPay);
    if (!tech) return { total: 0, items: [] };

    let totalGlobal = 0;
    const items = pendingTechInvoices.map(inv => {
      let comisionTotal = 0;
      let manoObraTotal = 0;

      (inv.items || []).forEach(item => {
        if (!item) return;
        const isManoObra = (item.id && item.id.startsWith("labor-")) || (item.name && item.name.toLowerCase() === "mano de obra");
        if (isManoObra) {
          manoObraTotal += ((item.laborPrice ?? item.unitPrice) || 0) * (item.quantity || 1);
        } else {
          comisionTotal += (item.laborPrice || 0) * (item.quantity || 1);
        }
      });
      
      const totalFila = comisionTotal + manoObraTotal;
      totalGlobal += totalFila;

      return {
        inv,
        comisionTotal,
        manoObraTotal,
        totalFila
      };
    });

    return { total: totalGlobal, items };
  }, [pendingTechInvoices, technicians, selectedTechToPay]);

  const handleLiquidarTecnico = () => {
    if (!activeCaja) return;
    if (!selectedTechToPay || techCommissionInfo.total <= 0) return;

    const tech = technicians.find(t => t.id === selectedTechToPay);
    const monto = techCommissionInfo.total;

    const nuevoMov: MovimientoCaja = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenant_id: tenantId,
      caja_id: activeCaja.id,
      empleado_id: activeCaja.empleado_id,
      tecnico_id: selectedTechToPay,
      tipo: 'PAGO_NOMINA',
      concepto: `[Pago Técnico] Liquidación a ${tech?.name} por ${pendingTechInvoices.length} facturas`,
      monto,
      metodo: 'EFECTIVO',
      creado_en: new Date().toISOString()
    };

    addCajaMovement(nuevoMov);
    
    // Marcar facturas como pagadas
    pendingTechInvoices.forEach(inv => {
      updateInvoice(inv.id, { isCommissionPaid: true });
    });

    setIsPagoTecnicoOpen(false);
    setSelectedTechToPay("");
    toast.success("Liquidación a técnico registrada con éxito");
  };
  
  const cxcInvoices = useMemo(() => {
    return invoices.filter(inv => inv.tenantId === tenantId && inv.status === 'pending' && inv.paymentMethod === 'credit');
  }, [invoices, tenantId]);

  const processedCxcInvoices = useMemo(() => {
    if (!cxcSearch) return cxcInvoices;
    return cxcInvoices.filter(inv => 
      (inv.customerName || '').toLowerCase().includes(cxcSearch.toLowerCase()) ||
      inv.id.toLowerCase().includes(cxcSearch.toLowerCase())
    );
  }, [cxcInvoices, cxcSearch]);
  // Apertura Form States
  const [aperturaMonto, setAperturaMonto] = useState("");
  const [aperturaCajero, setAperturaCajero] = useState(DEFAULT_EMPLEADOS[0].id);
  const [aperturaNotas, setAperturaNotas] = useState("");

  // Movimiento Form States
  const [movTipo, setMovTipo] = useState<'INGRESO' | 'EGRESO' | 'RETIRO' | 'GASTO_CAJA_CHICA' | 'PAGO_NOMINA'>('INGRESO');
  const [movMonto, setMovMonto] = useState("");
  const [movConcepto, setMovConcepto] = useState("");
  const [movMetodo, setMovMetodo] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA'>('EFECTIVO');
  const [movGastoCategoria, setMovGastoCategoria] = useState(CATEGORIAS_GASTOS[0]);
  const [movTecnicoId, setMovTecnicoId] = useState("");

  // Cierre Form States
  const [contadoEfectivo, setContadoEfectivo] = useState("");
  const [contadoTarjeta, setContadoTarjeta] = useState("");
  const [contadoTransferencia, setContadoTransferencia] = useState("");
  const [cierreCajeroId, setCierreCajeroId] = useState(DEFAULT_EMPLEADOS[0].id);
  const [cierrePin, setCierrePin] = useState("");
  const [cierreNotas, setCierreNotas] = useState("");

  // Caja Chica Setup Form
  const [ccMontoFijo, setCcMontoFijo] = useState(currentTenant?.monto_caja_chica?.toString() || "10000");

  // Filters for History
  const [histFiltroCajero, setHistFiltroCajero] = useState("all");
  const [histSearch, setHistSearch] = useState("");

  // Search movements
  const [movSearch, setMovSearch] = useState("");

  // Sort configuration for movements table
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  // Open Caja Shift
  const handleAperturaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseFloat(aperturaMonto);
    if (isNaN(monto) || monto < 0) {
      toast.error("Por favor, ingrese un monto inicial válido");
      return;
    }

    const nuevaCaja: Caja = {
      id: `caja-${Date.now()}`,
      tenant_id: tenantId,
      empleado_id: aperturaCajero,
      monto_inicial: monto,
      estado: 'ABIERTA',
      abierta_en: new Date().toISOString(),
      notas_apertura: aperturaNotas
    };

    addCaja(nuevaCaja);
    setIsAperturaOpen(false);
    setAperturaMonto("");
    setAperturaNotas("");
    toast.success("¡Caja abierta exitosamente!");
  };

  // Submit quick cash movement
  const handleMovSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseFloat(movMonto);
    if (isNaN(monto) || monto <= 0) {
      toast.error("Por favor, ingrese un monto válido");
      return;
    }
    if (!movConcepto.trim()) {
      toast.error("Por favor, ingrese un concepto o motivo del movimiento");
      return;
    }

    if (!activeCaja) {
      toast.error("Debe abrir la caja primero");
      return;
    }

    // Gasto Caja Chica verification
    if (movTipo === 'GASTO_CAJA_CHICA') {
      const actualCChica = currentTenant?.monto_actual_caja_chica ?? 10000;
      if (monto > actualCChica) {
        toast.error(`Fondos insuficientes en Caja Chica. Saldo actual: ${formatRD(actualCChica)}`);
        return;
      }

      // Deduct from tenant's caja chica
      updateTenant(tenantId, {
        monto_actual_caja_chica: actualCChica - monto
      });
    }

    const nuevoMov: MovimientoCaja = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenant_id: tenantId,
      caja_id: activeCaja.id,
      empleado_id: activeCaja.empleado_id,
      tecnico_id: movTipo === 'PAGO_NOMINA' ? movTecnicoId : undefined,
      tipo: movTipo === 'GASTO_CAJA_CHICA' || movTipo === 'PAGO_NOMINA' ? 'EGRESO' : movTipo,
      concepto: movTipo === 'GASTO_CAJA_CHICA' ? `[Caja Chica - ${movGastoCategoria}] ${movConcepto}` : 
                movTipo === 'PAGO_NOMINA' ? `[Pago Nómina] ${movConcepto}` : movConcepto,
      monto,
      metodo: movTipo === 'GASTO_CAJA_CHICA' || movTipo === 'PAGO_NOMINA' ? 'EFECTIVO' : movMetodo,
      creado_en: new Date().toISOString()
    };

    addCajaMovement(nuevoMov);
    
    // Si es pago de nómina, marcamos las facturas pendientes como pagadas
    if (movTipo === 'PAGO_NOMINA' && movTecnicoId) {
      const { pendingIds } = calculateTechCommission(movTecnicoId);
      pendingIds.forEach(id => {
        updateInvoice(id, { isCommissionPaid: true });
      });
    }

    setIsMovOpen(false);
    setMovMonto("");
    setMovConcepto("");
    setMovTecnicoId("");
    toast.success("Movimiento registrado con éxito");
  };

  // Close shift submission
  const handleCierreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCaja) return;

    // Validate Employee PIN
    const empleado = DEFAULT_EMPLEADOS.find(emp => emp.id === cierreCajeroId);
    if (!empleado) {
      toast.error("Empleado no válido");
      return;
    }

    if (cierrePin !== empleado.pin) {
      toast.error("PIN incorrecto. Inténtelo de nuevo.");
      return;
    }

    const valEfectivo = parseFloat(contadoEfectivo) || 0;
    const valTarjeta = parseFloat(contadoTarjeta) || 0;
    const valTransferencia = parseFloat(contadoTransferencia) || 0;

    const esperadoEfectivo = metrics.efectivoEsperado;
    const diferencia = valEfectivo - esperadoEfectivo;

    // Warning about large discrepancies
    const umbral = currentTenant?.config?.umbral_diferencia_caja || 500;
    if (Math.abs(diferencia) > umbral) {
      toast.warning(`La diferencia detectada (${formatRD(diferencia)}) supera el umbral límite establecido de ${formatRD(umbral)}.`);
    }

    // Update active caja to closed
    updateCaja(activeCaja.id, {
      estado: 'CERRADA',
      cerrada_en: new Date().toISOString(),
      monto_esperado_efectivo: esperadoEfectivo,
      monto_contado_efectivo: valEfectivo,
      monto_contado_tarjeta: valTarjeta,
      monto_contado_transferencia: valTransferencia,
      diferencia: diferencia,
      notas_cierre: cierreNotas
    });

    toast.success("¡Caja cerrada correctamente!");
    
    // Automatically open thermal ticket for printing
    const closedSession = cajas.find(c => c.id === activeCaja.id) || {
      ...activeCaja,
      estado: 'CERRADA' as const,
      cerrada_en: new Date().toISOString(),
      monto_esperado_efectivo: esperadoEfectivo,
      monto_contado_efectivo: valEfectivo,
      monto_contado_tarjeta: valTarjeta,
      monto_contado_transferencia: valTransferencia,
      diferencia: diferencia,
      notas_cierre: cierreNotas
    };
    
    setSelectedTicketCaja(closedSession);
    setIsCierreOpen(false);
    setIsTicketPreviewOpen(true);

    // Reset fields
    setContadoEfectivo("");
    setContadoTarjeta("");
    setContadoTransferencia("");
    setCierrePin("");
    setCierreNotas("");
  };

  // Configure Caja Chica limits
  const handleCcSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseFloat(ccMontoFijo);
    if (isNaN(monto) || monto <= 0) {
      toast.error("Monto inválido");
      return;
    }

    updateTenant(tenantId, {
      monto_caja_chica: monto,
      monto_actual_caja_chica: monto
    });

    setIsCajaChicaOpen(false);
    toast.success("Fondo de Caja Chica reiniciado y configurado correctamente");
  };

  // Filtered and Sorted movements
  const processedActiveMovements = useMemo(() => {
    let result = activeMovements.filter(m => 
      m.concepto.toLowerCase().includes(movSearch.toLowerCase()) ||
      m.tipo.toLowerCase().includes(movSearch.toLowerCase()) ||
      m.metodo.toLowerCase().includes(movSearch.toLowerCase())
    );

    if (sortConfig !== null) {
      result.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof typeof a];
        let bValue: any = b[sortConfig.key as keyof typeof b];

        // Especial para HORA
        if (sortConfig.key === 'creado_en') {
           aValue = new Date(a.creado_en).getTime();
           bValue = new Date(b.creado_en).getTime();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      // Default: más recientes primero
      result.sort((a,b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());
    }

    return result;
  }, [activeMovements, movSearch, sortConfig]);

  // Request sort
  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handlePayCxc = (invoice: Invoice, metodo: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' = 'EFECTIVO') => {
    if (!activeCaja) {
      toast.error("Debe abrir la caja primero para recibir un pago.");
      return;
    }

    // Mark as paid
    updateInvoice(invoice.id, {
      status: 'paid'
    });

    const nuevoMov: MovimientoCaja = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenant_id: tenantId,
      caja_id: activeCaja.id,
      empleado_id: activeCaja.empleado_id,
      tipo: 'INGRESO',
      concepto: `Cobro de Factura Crédito #${invoice.id.slice(-6).toUpperCase()} - ${invoice.customerName || 'Cliente'}`,
      monto: invoice.total,
      metodo,
      creado_en: new Date().toISOString()
    };
    addCajaMovement(nuevoMov);
    
    toast.success("Pago registrado con éxito");
  };

  // Closed shifts for history
  const closedShifts = useMemo(() => {
    return cajas
      .filter(c => c.tenant_id === tenantId && c.estado === 'CERRADA')
      .sort((a, b) => new Date(b.cerrada_en || 0).getTime() - new Date(a.cerrada_en || 0).getTime());
  }, [cajas, tenantId]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-1 animate-in fade-in duration-300">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Caja
          </h1>
          <p className="text-neutral-500">Apertura, movimientos del turno y cierre con cuadre.</p>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-shrink-0">
          <Button 
            className="rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-bold gap-2 h-11"
            onClick={() => setIsCxcOpen(true)}
          >
            Cuentas x Cobrar
          </Button>
          <Button 
            onClick={() => setIsCajaChicaOpen(true)}
            className="rounded-xl bg-[#0f3b6c] text-white hover:bg-blue-900 font-bold gap-2 h-11"
          >
            Caja Chica
          </Button>

          {activeCaja ? (
            <Button 
              onClick={() => setIsCierreOpen(true)}
              className="rounded-xl bg-rose-600 text-white hover:bg-rose-700 font-bold gap-2 h-11 flex-shrink-0 shadow-lg shadow-rose-600/10"
            >
              <Lock className="h-4 w-4" /> Cerrar caja
            </Button>
          ) : (
            <Button 
              onClick={() => setIsAperturaOpen(true)}
              className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold gap-2 h-11 flex-shrink-0 shadow-lg shadow-emerald-600/10"
            >
              <Plus className="h-4 w-4" /> Abrir caja
            </Button>
          )}
        </div>
      </div>

      {/* ── TOP METRICS ROW ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none bg-[#0f3b6c] shadow-sm rounded-2xl overflow-hidden text-white">
          <CardContent className="p-5 flex flex-col justify-center h-full">
            <span className="text-xs font-semibold text-blue-200 uppercase tracking-wider block mb-1">Efectivo en Caja</span>
            <h3 className="text-3xl font-black">{formatRD(metrics.efectivoEsperado)}</h3>
          </CardContent>
        </Card>
        
        <Card className="border-neutral-200 bg-white shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-5 flex flex-col justify-center h-full">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1">Ventas Efectivo</span>
            <h3 className="text-3xl font-black text-neutral-800">{formatRD(metrics.ingresosEfectivo)}</h3>
          </CardContent>
        </Card>

        <Card className="border-neutral-200 bg-white shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-5 flex flex-col justify-center h-full">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1">Ventas Tarjeta</span>
            <h3 className="text-3xl font-black text-neutral-800">{formatRD(metrics.tarjetaTotal)}</h3>
          </CardContent>
        </Card>

        <Card className="border-neutral-200 bg-white shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-5 flex flex-col justify-center h-full">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1">Ventas Transferencia</span>
            <h3 className="text-3xl font-black text-neutral-800">{formatRD(metrics.transferenciaTotal)}</h3>
          </CardContent>
        </Card>
      </div>

      {/* ── MIDDLE ROW (3 PANELS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* PANEL 1: Apertura */}
        <Card className="border-neutral-200 bg-white shadow-sm rounded-2xl">
          <CardContent className="p-5 h-full flex flex-col justify-center">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1">Apertura</span>
            <h3 className="text-2xl font-black text-neutral-800">{formatRD(activeCaja ? activeCaja.monto_inicial : 0)}</h3>
            {activeCaja ? (
              <div className="mt-3 space-y-1.5">
                <p className="text-xs text-neutral-500">{formatDateTimeRD(activeCaja.abierta_en)}</p>
                <p className="text-xs text-neutral-700">Empleado: <span className="font-bold">{DEFAULT_EMPLEADOS.find(e => e.id === activeCaja.empleado_id)?.nombre || "Administrador"}</span></p>
                <Badge className="mt-2 bg-orange-100 text-orange-800 border-none font-bold text-[10px] rounded-md px-2 py-0.5">
                  🌅 Turno: {new Date(activeCaja.abierta_en).getHours() < 12 ? 'Mañana' : 'Tarde'}
                </Badge>
              </div>
            ) : (
              <p className="text-xs text-neutral-400 mt-2 italic">Caja cerrada actualmente.</p>
            )}
          </CardContent>
        </Card>

        {/* PANEL 2: Acciones Rápidas */}
        <Card className="border-neutral-200 bg-white shadow-sm rounded-2xl">
          <CardContent className="p-5 h-full flex flex-col justify-center">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-3">Acciones Rápidas</span>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                disabled={!activeCaja}
                onClick={() => { setMovTipo('INGRESO'); setIsMovOpen(true); }}
                className="h-10 rounded-xl border-neutral-200 text-xs font-bold gap-2 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 cursor-pointer"
              >
                <ArrowDownLeft className="h-4 w-4" /> Ingreso
              </Button>
              <Button 
                variant="outline" 
                disabled={!activeCaja}
                onClick={() => { setMovTipo('EGRESO'); setIsMovOpen(true); }}
                className="h-10 rounded-xl border-neutral-200 text-xs font-bold gap-2 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 cursor-pointer"
              >
                <ArrowUpRight className="h-4 w-4" /> Egreso
              </Button>
              <Button 
                variant="outline" 
                disabled={!activeCaja}
                onClick={() => { setMovTipo('RETIRO'); setIsMovOpen(true); }}
                className="h-10 rounded-xl border-neutral-200 text-xs font-bold hover:bg-neutral-50 cursor-pointer"
              >
                Retiro
              </Button>
              <Button 
                variant="outline" 
                disabled={!activeCaja}
                onClick={() => { setMovTipo('GASTO_CAJA_CHICA'); setIsMovOpen(true); }}
                className="h-10 rounded-xl border-neutral-200 text-xs font-bold hover:bg-neutral-50 cursor-pointer"
              >
                Caja chica
              </Button>
            </div>
            <div className="mt-3">
              <Button 
                variant="outline" 
                disabled={!activeCaja || totalGlobalPending <= 0}
                onClick={() => setIsPagoTecnicoOpen(true)}
                className="w-full h-9 rounded-xl border-blue-200 text-blue-700 font-bold bg-blue-50 hover:bg-blue-100 cursor-pointer text-xs"
              >
                Pagar a Técnicos ({formatRD(totalGlobalPending)})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* PANEL 3: Resumen del Turno */}
        <Card className="border-neutral-200 bg-white shadow-sm rounded-2xl">
          <CardContent className="p-5 h-full flex flex-col justify-center">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-3">Resumen del Turno</span>
            <div className="space-y-2.5">
              <div className="flex justify-between text-xs text-neutral-600">
                <span>Movimientos</span>
                <span className="font-bold text-neutral-900">{activeMovements.length}</span>
              </div>
              <div className="flex justify-between text-xs text-neutral-600">
                <span>Otros ingresos</span>
                <span className="font-bold text-neutral-900">{formatRD(activeMovements.filter(m => m.tipo === 'INGRESO').reduce((sum, m) => sum + m.monto, 0))}</span>
              </div>
              <div className="flex justify-between text-xs text-neutral-600">
                <span>Egresos / gastos</span>
                <span className="font-bold text-rose-600">{formatRD(metrics.egresosEfectivo)}</span>
              </div>
              <div className="flex justify-between text-xs text-blue-800 bg-blue-50/80 px-2 py-1.5 rounded-md border border-blue-100">
                <span className="font-semibold">Comisiones Pendientes</span>
                <span className="font-bold">{formatRD(totalGlobalPending)}</span>
              </div>
              <div className="pt-2 mt-1 border-t border-neutral-100 flex justify-between text-sm">
                <span className="font-bold text-neutral-800">Total esperado</span>
                <span className="font-black text-neutral-900">{formatRD(metrics.efectivoEsperado)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── TABLES SECTION ── */}
      
      {/* Movimientos del Turno */}
      <Card className="border-neutral-200 bg-white shadow-sm rounded-2xl overflow-hidden mt-2">
        <CardHeader className="p-5 border-b border-neutral-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white">
          <div className="flex items-center gap-2">
            <CardTitle className="font-heading text-lg font-bold text-neutral-900 flex items-center gap-2">
              Movimientos del turno
            </CardTitle>
            <Badge variant="outline" className="rounded-full px-3 py-0.5 border-neutral-200 text-neutral-600 bg-white">
              {processedActiveMovements.length}
            </Badge>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input 
              placeholder="Buscar movimiento..." 
              value={movSearch}
              onChange={(e) => setMovSearch(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl border-neutral-200"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100 text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-4 w-40 cursor-pointer hover:bg-neutral-100 transition-colors" onClick={() => requestSort('creado_en')}>
                    Hora {sortConfig?.key === 'creado_en' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="p-4 w-32 cursor-pointer hover:bg-neutral-100 transition-colors" onClick={() => requestSort('tipo')}>
                    Tipo {sortConfig?.key === 'tipo' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="p-4 cursor-pointer hover:bg-neutral-100 transition-colors" onClick={() => requestSort('concepto')}>
                    Concepto {sortConfig?.key === 'concepto' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="p-4 w-32 text-center cursor-pointer hover:bg-neutral-100 transition-colors" onClick={() => requestSort('metodo')}>
                    Método {sortConfig?.key === 'metodo' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="p-4 w-32 text-right cursor-pointer hover:bg-neutral-100 transition-colors" onClick={() => requestSort('monto')}>
                    Monto {sortConfig?.key === 'monto' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {processedActiveMovements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-neutral-400 font-semibold">
                      No se encontraron movimientos registrados.
                    </td>
                  </tr>
                ) : (
                  processedActiveMovements.map((mov) => {
                    const isIngreso = ['INGRESO', 'VENTA', 'ABONO'].includes(mov.tipo);
                    const isEgreso = ['EGRESO', 'RETIRO', 'GASTO_CAJA_CHICA'].includes(mov.tipo);
                    const matchingInvoice = findInvoiceForMovement(mov);
                    const isClickable = !!matchingInvoice;

                    return (
                      <tr 
                        key={mov.id} 
                        onClick={() => {
                          if (matchingInvoice) {
                            setSelectedInvoice(matchingInvoice);
                            setSelectedInvoiceEdit(true);
                          }
                        }}
                        className={cn(
                          "transition-colors",
                          isClickable ? "hover:bg-blue-50/40 cursor-pointer" : "hover:bg-neutral-50/50"
                        )}
                      >
                        <td className="p-4 text-neutral-500 font-medium">
                          {new Date(mov.creado_en).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-4">
                          <Badge className={cn(
                            "rounded-full px-3 py-0.5 text-[10px] font-bold border-none",
                            isIngreso ? "bg-emerald-600 text-white" : isEgreso ? "bg-rose-600 text-white" : "bg-neutral-600 text-white"
                          )}>
                            <span className="flex items-center gap-1">
                              {isIngreso ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                              {mov.tipo === 'GASTO_CAJA_CHICA' ? 'Caja Chica' : mov.tipo === 'INGRESO' ? 'Ingreso' : mov.tipo}
                            </span>
                          </Badge>
                        </td>
                        <td className="p-4 font-semibold text-neutral-800 max-w-sm truncate">
                          <div className="flex items-center gap-2">
                            <span>{mov.concepto}</span>
                            {isClickable && (
                              <Badge variant="outline" className="text-[9px] font-bold border-blue-200 bg-blue-50 text-blue-700 rounded-md py-0 px-1 hover:bg-blue-100 transition-colors">
                                Editar Factura
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center text-neutral-500 font-medium">
                          {mov.metodo === 'EFECTIVO' ? '—' : mov.metodo}
                        </td>
                        <td className={cn(
                          "p-4 text-right font-bold text-sm tabular-nums",
                          isIngreso ? "text-emerald-600" : "text-rose-500"
                        )}>
                          {isIngreso ? "+" : "-"}{formatRD(mov.monto)}
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

      {/* Histórico de Cierres */}
      <Card className="border-neutral-200 bg-white shadow-sm rounded-2xl overflow-hidden mt-6">
        <CardHeader className="p-5 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
          <CardTitle className="font-heading text-lg font-bold text-neutral-900">
            Histórico de cierres
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              className="rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold gap-2 text-xs h-9 cursor-pointer"
              onClick={() => toast.info("Funcionalidad de impresión múltiple en desarrollo")}
            >
              <Printer className="h-3.5 w-3.5" /> Imprimir Cuadre
            </Button>
            <Button 
              className="rounded-xl bg-[#0f3b6c] text-white hover:bg-blue-900 font-bold gap-2 text-xs h-9 cursor-pointer"
              onClick={() => toast.info("Generación de reporte completo en desarrollo")}
            >
              <Printer className="h-3.5 w-3.5" /> Imprimir Cierres
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100 text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-4">Apertura</th>
                  <th className="p-4">Cierre</th>
                  <th className="p-4 text-right">Inicial</th>
                  <th className="p-4 text-right">Esperado</th>
                  <th className="p-4 text-right">Contado</th>
                  <th className="p-4 text-right">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {closedShifts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-neutral-400 font-semibold">
                      No hay historial de cierres disponible.
                    </td>
                  </tr>
                ) : (
                  closedShifts.map((shift) => (
                    <tr key={shift.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="p-4 text-neutral-600 font-medium">
                        {formatDateTimeRD(shift.abierta_en)}
                      </td>
                      <td className="p-4 text-neutral-600 font-medium">
                        {formatDateTimeRD(shift.cerrada_en || "")}
                      </td>
                      <td className="p-4 text-right font-medium text-neutral-800">
                        {formatRD(shift.monto_inicial)}
                      </td>
                      <td className="p-4 text-right font-bold text-neutral-800">
                        {formatRD(shift.monto_esperado_efectivo || 0)}
                      </td>
                      <td className="p-4 text-right font-bold text-neutral-800">
                        {formatRD(shift.monto_contado_efectivo || 0)}
                      </td>
                      <td className="p-4 text-right font-bold">
                        <Badge className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] border-none font-black",
                          (shift.diferencia || 0) === 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        )}>
                          {(shift.diferencia || 0) > 0 ? "+" : ""}{formatRD(shift.diferencia || 0)}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>


      {/* DIALOG 1: Apertura de Caja */}
      <Dialog open={isAperturaOpen} onOpenChange={setIsAperturaOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold flex items-center gap-2">
              <Wallet className="h-5 w-5 text-black" /> Apertura de Caja Diaria
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Ingrese el monto base de efectivo inicial en el cajón para dar inicio al turno.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAperturaSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="apertura-monto" className="text-xs font-semibold text-neutral-600">Efectivo Inicial en Caja (RD$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-sm">RD$</span>
                <Input 
                  id="apertura-monto"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  required
                  value={aperturaMonto}
                  onChange={(e) => setAperturaMonto(e.target.value)}
                  className="pl-12 h-11 rounded-xl border-neutral-200 text-sm focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="apertura-cajero" className="text-xs font-semibold text-neutral-600">Cajero Responsable</Label>
              <Select value={aperturaCajero} onValueChange={(val) => val && setAperturaCajero(val)}>
                <SelectTrigger className="h-11 rounded-xl border-neutral-200 text-sm">
                  <SelectValue placeholder="Seleccione cajero" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {DEFAULT_EMPLEADOS.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.nombre} {emp.apellido} ({emp.rol})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="apertura-notas" className="text-xs font-semibold text-neutral-600">Notas Adicionales (Opcional)</Label>
              <Textarea 
                id="apertura-notas"
                placeholder="Observaciones del cajón de efectivo..."
                value={aperturaNotas}
                onChange={(e) => setAperturaNotas(e.target.value)}
                className="rounded-xl border-neutral-200 text-sm"
              />
            </div>

            <DialogFooter className="mt-4 flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsAperturaOpen(false)}
                className="rounded-xl border-neutral-200"
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                className="rounded-xl bg-black text-white hover:bg-neutral-800 font-bold"
              >
                Abrir Caja
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: Cierre y Arqueo de Caja */}
      <Dialog open={isCierreOpen} onOpenChange={setIsCierreOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl p-6 overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold flex items-center gap-2">
              <Lock className="h-5 w-5 text-rose-600" /> Cierre y Arqueo de Caja
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Desglose y cuente los valores físicos presentes en la caja. Confirme su firma mediante PIN.
            </DialogDescription>
          </DialogHeader>

          {/* Quick instructions / Help for testing */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex gap-2 items-start mt-2">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Información de PIN para pruebas:</p>
              <ul className="list-disc pl-4 mt-1 space-y-0.5">
                <li><strong>Yeri Orlando (ADMIN)</strong>: PIN = <code className="bg-amber-100 font-bold px-1 rounded">1234</code></li>
                <li><strong>Carlos Méndez (CAJERO)</strong>: PIN = <code className="bg-amber-100 font-bold px-1 rounded">0000</code></li>
              </ul>
            </div>
          </div>

          <form onSubmit={handleCierreSubmit} className="space-y-4 pt-2">
            {/* Split count breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="count-efectivo" className="text-xs font-semibold text-neutral-600">Efectivo Contado</Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">RD$</span>
                  <Input 
                    id="count-efectivo"
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    required
                    value={contadoEfectivo}
                    onChange={(e) => setContadoEfectivo(e.target.value)}
                    className="pl-9 h-10 rounded-xl border-neutral-200 text-xs"
                  />
                </div>
                <p className="text-[10px] text-neutral-400">Esperado: {formatRD(metrics.efectivoEsperado)}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="count-tarjeta" className="text-xs font-semibold text-neutral-600">Voucher Tarjetas</Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">RD$</span>
                  <Input 
                    id="count-tarjeta"
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    required
                    value={contadoTarjeta}
                    onChange={(e) => setContadoTarjeta(e.target.value)}
                    className="pl-9 h-10 rounded-xl border-neutral-200 text-xs"
                  />
                </div>
                <p className="text-[10px] text-neutral-400">Esperado: {formatRD(metrics.tarjetaTotal)}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="count-transferencia" className="text-xs font-semibold text-neutral-600">Voucher Transf.</Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">RD$</span>
                  <Input 
                    id="count-transferencia"
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    required
                    value={contadoTransferencia}
                    onChange={(e) => setContadoTransferencia(e.target.value)}
                    className="pl-9 h-10 rounded-xl border-neutral-200 text-xs"
                  />
                </div>
                <p className="text-[10px] text-neutral-400">Esperado: {formatRD(metrics.transferenciaTotal)}</p>
              </div>
            </div>

            {/* Calculations preview dynamic banner */}
            {contadoEfectivo && (
              <div className={cn(
                "rounded-xl border p-3 flex justify-between items-center text-xs",
                (parseFloat(contadoEfectivo) - metrics.efectivoEsperado) === 0
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border-rose-200 text-rose-900"
              )}>
                <div>
                  <span className="font-bold">Diferencia Efectivo:</span>
                  <p className="text-[10px] text-neutral-500">Contado vs Esperado del sistema</p>
                </div>
                <span className="font-black text-sm tabular-nums">
                  {formatRD(parseFloat(contadoEfectivo) - metrics.efectivoEsperado)}
                </span>
              </div>
            )}

            {/* Cashier Verification PIN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-neutral-100 pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="cierre-cajero" className="text-xs font-semibold text-neutral-600">Firma Cajero Autorizante</Label>
                <Select value={cierreCajeroId} onValueChange={(val) => val && setCierreCajeroId(val)}>
                  <SelectTrigger className="h-10 rounded-xl border-neutral-200 text-xs">
                    <SelectValue placeholder="Seleccione firma" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {DEFAULT_EMPLEADOS.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.nombre} {emp.apellido} ({emp.rol})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cierre-pin" className="text-xs font-semibold text-neutral-600">PIN de Autorización</Label>
                <Input 
                  id="cierre-pin"
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  required
                  value={cierrePin}
                  onChange={(e) => setCierrePin(e.target.value)}
                  className="h-10 rounded-xl border-neutral-200 text-center font-mono tracking-widest text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cierre-notas" className="text-xs font-semibold text-neutral-600">Comentarios de Cuadre / Diferencias</Label>
              <Textarea 
                id="cierre-notas"
                placeholder="Explique aquí los motivos en caso de faltantes o sobrantes mayores de efectivo..."
                value={cierreNotas}
                onChange={(e) => setCierreNotas(e.target.value)}
                className="rounded-xl border-neutral-200 text-xs"
              />
            </div>

            <DialogFooter className="mt-4 flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsCierreOpen(false)}
                className="rounded-xl border-neutral-200 h-10"
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                className="rounded-xl bg-rose-600 text-white hover:bg-rose-700 font-bold h-10 shadow-lg shadow-rose-600/10"
              >
                Registrar Cuadre y Cerrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: Registrar Movimiento Rápido */}
      <Dialog open={isMovOpen} onOpenChange={setIsMovOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold flex items-center gap-2">
              <Plus className="h-5 w-5 text-black" /> Registrar Transacción Extra
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Permite registrar movimientos manuales de caja (Entradas, salidas o gastos directos).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleMovSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-600">Tipo de Movimiento</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'INGRESO', label: 'Ingreso Extra' },
                  { value: 'EGRESO', label: 'Egreso Extra' },
                  { value: 'RETIRO', label: 'Retiro / Remesa' },
                  { value: 'GASTO_CAJA_CHICA', label: 'Caja Chica' },
                  { value: 'PAGO_NOMINA', label: 'Pago Nómina' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMovTipo(opt.value as any)}
                    className={cn(
                      "py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all",
                      movTipo === opt.value
                        ? "bg-black text-white border-black"
                        : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mov-monto" className="text-xs font-semibold text-neutral-600">Monto (RD$)</Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">RD$</span>
                  <Input 
                    id="mov-monto"
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    required
                    value={movMonto}
                    onChange={(e) => setMovMonto(e.target.value)}
                    className="pl-9 h-10 rounded-xl border-neutral-200 text-xs"
                  />
                </div>
              </div>

              {movTipo !== 'GASTO_CAJA_CHICA' && movTipo !== 'PAGO_NOMINA' && (
                <div className="space-y-1.5">
                  <Label htmlFor="mov-metodo" className="text-xs font-semibold text-neutral-600">Forma de Pago</Label>
                  <Select value={movMetodo} onValueChange={(val) => val && setMovMetodo(val as any)}>
                    <SelectTrigger className="h-10 rounded-xl border-neutral-200 text-xs">
                      <SelectValue placeholder="Metodo" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                      <SelectItem value="TARJETA">Tarjeta</SelectItem>
                      <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {movTipo === 'GASTO_CAJA_CHICA' && (
                <div className="space-y-1.5">
                  <Label htmlFor="mov-gasto-cat" className="text-xs font-semibold text-neutral-600">Categoría Gasto</Label>
                  <Select value={movGastoCategoria} onValueChange={(val) => val && setMovGastoCategoria(val)}>
                    <SelectTrigger className="h-10 rounded-xl border-neutral-200 text-xs">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {CATEGORIAS_GASTOS.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {movTipo === 'PAGO_NOMINA' && (
                <div className="space-y-1.5">
                  <Label htmlFor="mov-tecnico" className="text-xs font-semibold text-neutral-600">Técnico a Pagar</Label>
                  <Select value={movTecnicoId} onValueChange={(val) => {
                      if (!val) return;
                      setMovTecnicoId(val);
                      const tech = technicians.find(t => t.id === val);
                      if (tech) {
                        const { total, pendingIds } = calculateTechCommission(val);
                        setMovMonto(total.toString());
                        setMovConcepto(`Pago Nómina a ${tech.name} (${pendingIds.length} facturas pendientes)`);
                      }
                    }}>
                    <SelectTrigger className="h-10 rounded-xl border-neutral-200 text-xs">
                      <SelectValue placeholder="Seleccione Técnico" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {technicians.filter(t => t.tenantId === tenantId).map(tech => (
                        <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mov-concepto" className="text-xs font-semibold text-neutral-600">Concepto / Motivo de la Operación</Label>
              <Input 
                id="mov-concepto"
                placeholder="Detalle el concepto (ej: Pago de almuerzo técnicos...)"
                required
                value={movConcepto}
                onChange={(e) => setMovConcepto(e.target.value)}
                className="h-10 rounded-xl border-neutral-200 text-xs"
              />
            </div>

            <DialogFooter className="mt-4 flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsMovOpen(false)}
                className="rounded-xl border-neutral-200 h-10"
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                className="rounded-xl bg-black text-white hover:bg-neutral-800 font-bold h-10"
              >
                Registrar Movimiento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 4: Caja Chica Setup */}
      <Dialog open={isCajaChicaOpen} onOpenChange={setIsCajaChicaOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-emerald-600" /> Configuración Fondo Caja Chica
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Ajuste el límite fijo de caja chica para gastos inmediatos o reponga el fondo al 100%.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCcSubmit} className="space-y-4 pt-2">
            <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4 text-xs">
              <div className="flex justify-between mb-1">
                <span className="text-neutral-500">Saldo Actual en Caja Chica:</span>
                <span className="font-bold text-neutral-800">{formatRD(currentTenant?.monto_actual_caja_chica ?? 10000)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Fondo Fijo Configurado:</span>
                <span className="font-bold text-neutral-800">{formatRD(currentTenant?.monto_caja_chica ?? 10000)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cc-monto" className="text-xs font-semibold text-neutral-600">Nuevo Límite de Fondo Fijo (RD$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-sm">RD$</span>
                <Input 
                  id="cc-monto"
                  type="number"
                  placeholder="10000.00"
                  step="0.01"
                  required
                  value={ccMontoFijo}
                  onChange={(e) => setCcMontoFijo(e.target.value)}
                  className="pl-12 h-11 rounded-xl border-neutral-200 text-sm focus:ring-2 focus:ring-black"
                />
              </div>
              <p className="text-[10px] text-neutral-400">
                Al guardar, el saldo actual se repondrá automáticamente completando el total de esta asignación de caja chica.
              </p>
            </div>

            <DialogFooter className="mt-4 flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsCajaChicaOpen(false)}
                className="rounded-xl border-neutral-200 h-10"
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold h-10"
              >
                Reponer y Configurar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 5: Historial de Turnos y Cierres */}
      <Dialog open={isHistoricoOpen} onOpenChange={setIsHistoricoOpen}>
        <DialogContent className="sm:max-w-4xl rounded-2xl p-6 overflow-y-auto max-h-[85vh]">
          <DialogHeader className="border-b border-neutral-100 pb-3">
            <DialogTitle className="font-heading text-lg font-bold flex items-center gap-2">
              <History className="h-5 w-5 text-black" /> Historial de Turnos y Arqueos Cerrados
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Consulte desgloses anteriores, auditorías de diferencias y reimprima recibos térmicos.
            </DialogDescription>
          </DialogHeader>

          {/* Table of historic closed shifts */}
          <div className="space-y-4 pt-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                <Input 
                  placeholder="Buscar cierres..."
                  value={histSearch}
                  onChange={(e) => setHistSearch(e.target.value)}
                  className="pl-9 h-9 rounded-xl border-neutral-200 text-xs"
                />
              </div>
              <Select value={histFiltroCajero} onValueChange={(val) => val && setHistFiltroCajero(val)}>
                <SelectTrigger className="w-full sm:w-44 h-9 rounded-xl border-neutral-200 text-xs">
                  <SelectValue placeholder="Cajero" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Todos los cajeros</SelectItem>
                  {DEFAULT_EMPLEADOS.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold uppercase tracking-wider text-[9px]">
                    <th className="p-3">Responsable</th>
                    <th className="p-3">Apertura</th>
                    <th className="p-3">Cierre</th>
                    <th className="p-3 text-right">Inicial</th>
                    <th className="p-3 text-right">Efectivo Contado</th>
                    <th className="p-3 text-right">Diferencia</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {closedShifts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-neutral-400 font-medium">
                        No hay cierres registrados en el historial aún
                      </td>
                    </tr>
                  ) : (
                    closedShifts.map((shift) => (
                      <tr key={shift.id} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="p-3 font-semibold text-neutral-800">
                          {DEFAULT_EMPLEADOS.find(e => e.id === shift.empleado_id)?.nombre || "Cajero"}
                        </td>
                        <td className="p-3 text-neutral-500 font-mono">{formatDateTimeRD(shift.abierta_en)}</td>
                        <td className="p-3 text-neutral-500 font-mono">{formatDateTimeRD(shift.cerrada_en || "")}</td>
                        <td className="p-3 text-right font-mono text-neutral-700">{formatRD(shift.monto_inicial)}</td>
                        <td className="p-3 text-right font-bold text-neutral-900">{formatRD(shift.monto_contado_efectivo || 0)}</td>
                        <td className={cn(
                          "p-3 text-right font-bold",
                          (shift.diferencia || 0) === 0 
                            ? "text-emerald-600" 
                            : (shift.diferencia || 0) > 0 
                              ? "text-emerald-600" 
                              : "text-rose-500"
                        )}>
                          {formatRD(shift.diferencia || 0)}
                        </td>
                        <td className="p-3 text-center">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedTicketCaja(shift);
                              setIsTicketPreviewOpen(true);
                            }}
                            className="h-8 rounded-lg hover:bg-neutral-100 text-neutral-600 gap-1.5"
                          >
                            <Printer className="h-3.5 w-3.5" /> Reimprimir
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsHistoricoOpen(false)}
              className="rounded-xl border-neutral-200"
            >
              Cerrar Panel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 6: Ticket Térmico Preview & Print */}
      <Dialog open={isTicketPreviewOpen} onOpenChange={setIsTicketPreviewOpen}>
        <DialogContent className="sm:max-w-xs rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold flex items-center gap-2">
              <Receipt className="h-5 w-5 text-neutral-800" /> Vista Recibo de Arqueo
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Imprima el comprobante físico de arqueo para archivo administrativo.
            </DialogDescription>
          </DialogHeader>

          {/* Paper size setting selector */}
          <div className="flex justify-between items-center gap-2 border-b border-neutral-100 pb-3 mb-3">
            <Label className="text-xs text-neutral-500">Formato:</Label>
            <div className="flex rounded-lg overflow-hidden border border-neutral-200">
              {['57mm', '80mm'].map(sz => (
                <button
                  key={sz}
                  onClick={() => {
                    updateTenant(tenantId, {
                      config: {
                        ...currentTenant?.config,
                        formato_ticket: sz as any
                      }
                    });
                  }}
                  className={cn(
                    "text-[10px] font-bold px-2 py-1 transition-all",
                    currentTenant?.config?.formato_ticket === sz
                      ? "bg-black text-white"
                      : "bg-white text-neutral-600 hover:bg-neutral-50"
                  )}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          {/* Printable Ticket Box */}
          <div className="bg-neutral-50 p-4 border border-neutral-200 rounded-xl max-h-[50vh] overflow-y-auto">
            <div 
              id="arqueo-thermal-receipt" 
              className={cn(
                "bg-white p-4 font-mono text-[10px] leading-relaxed shadow-sm mx-auto select-all",
                currentTenant?.config?.formato_ticket === "57mm" ? "w-[200px]" : "w-[260px]"
              )}
            >
              <div className="text-center">
                <p className="font-black text-sm uppercase">{currentTenant?.name || "ServiTracks"}</p>
                <p className="text-neutral-500 text-[9px] mt-0.5">RNC: {currentTenant?.rnc || "---"}</p>
                <p className="text-[9px]">TEL: {currentTenant?.phone || "---"}</p>
                <p className="text-[9px] border-b border-dashed border-neutral-400 pb-1.5 mb-1.5 uppercase font-bold tracking-wider">
                  Reporte de Arqueo Diario
                </p>
              </div>

              {selectedTicketCaja && (
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>TURNO ID:</span>
                    <span className="font-bold">#{selectedTicketCaja.id.slice(-6).toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ESTADO:</span>
                    <span className="font-bold uppercase bg-neutral-100 px-1.5 py-0.2 rounded">
                      {selectedTicketCaja.estado}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>CAJERO:</span>
                    <span className="font-bold">
                      {DEFAULT_EMPLEADOS.find(e => e.id === selectedTicketCaja.empleado_id)?.nombre || "Cajero"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>APERTURA:</span>
                    <span className="font-mono">{formatDateTimeRD(selectedTicketCaja.abierta_en).split(",")[0]}</span>
                  </div>
                  {selectedTicketCaja.estado === 'CERRADA' && (
                    <div className="flex justify-between">
                      <span>CIERRE:</span>
                      <span className="font-mono">{formatDateTimeRD(selectedTicketCaja.cerrada_en || "").split(",")[0]}</span>
                    </div>
                  )}
                  
                  <div className="border-t border-dashed border-neutral-400 my-2" />

                  <div className="flex justify-between">
                    <span>(+) FONDO INIC:</span>
                    <span className="font-bold">{formatRD(selectedTicketCaja.monto_inicial)}</span>
                  </div>

                  {selectedTicketCaja.estado === 'CERRADA' ? (
                    <>
                      <div className="flex justify-between">
                        <span>(=) EFEC ESP:</span>
                        <span className="font-bold">{formatRD(selectedTicketCaja.monto_esperado_efectivo || 0)}</span>
                      </div>
                      <div className="flex justify-between text-neutral-800">
                        <span>(=) EFEC CONT:</span>
                        <span className="font-bold">{formatRD(selectedTicketCaja.monto_contado_efectivo || 0)}</span>
                      </div>
                      
                      <div className="border-t border-dashed border-neutral-400 my-1" />

                      <div className="flex justify-between font-bold text-xs uppercase pt-0.5">
                        <span>DIFERENCIA:</span>
                        <span className={cn(
                          (selectedTicketCaja.diferencia || 0) === 0
                            ? "text-black"
                            : (selectedTicketCaja.diferencia || 0) > 0
                              ? "text-emerald-700"
                              : "text-rose-700 font-black"
                        )}>
                          {formatRD(selectedTicketCaja.diferencia || 0)}
                        </span>
                      </div>

                      <div className="border-t border-dashed border-neutral-400 my-2" />
                      
                      <div className="text-center font-bold text-[9px] uppercase tracking-wide mb-1 text-neutral-500">
                        OTROS MEDIOS
                      </div>
                      <div className="flex justify-between">
                        <span>TARJETAS:</span>
                        <span>{formatRD(selectedTicketCaja.monto_contado_tarjeta || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>TRANSFERENC:</span>
                        <span>{formatRD(selectedTicketCaja.monto_contado_transferencia || 0)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-neutral-700">
                        <span>(+) ING EFEC:</span>
                        <span>{formatRD(metrics.ingresosEfectivo)}</span>
                      </div>
                      <div className="flex justify-between text-neutral-700">
                        <span>(-) EGR EFEC:</span>
                        <span>{formatRD(metrics.egresosEfectivo)}</span>
                      </div>
                      <div className="border-t border-dashed border-neutral-400 my-1" />
                      <div className="flex justify-between font-bold text-xs">
                        <span>EST. CAJA:</span>
                        <span>{formatRD(metrics.efectivoEsperado)}</span>
                      </div>
                    </>
                  )}

                  {selectedTicketCaja.notas_cierre && (
                    <div className="mt-3 border-t border-dashed border-neutral-300 pt-1.5">
                      <p className="text-[8px] text-neutral-500 uppercase font-bold">Comentarios:</p>
                      <p className="text-[8px] italic leading-tight text-neutral-600">{selectedTicketCaja.notas_cierre}</p>
                    </div>
                  )}

                  <div className="border-t border-dashed border-neutral-400 pt-8 mt-8 text-center">
                    <div className="h-0.5 bg-neutral-300 w-2/3 mx-auto mb-1" />
                    <p className="text-[8px] uppercase">FIRMA CAJERO AUTORIZANTE</p>
                    <p className="text-[8px] font-bold text-neutral-400 mt-1">PIN FIRMADO EN SISTEMA</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4 flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsTicketPreviewOpen(false)}
              className="rounded-xl border-neutral-200"
            >
              Cerrar Vista
            </Button>
            <Button 
              onClick={() => {
                const printContents = document.getElementById("arqueo-thermal-receipt")?.innerHTML;
                if (!printContents) return;
                
                const originalContents = document.body.innerHTML;
                
                // Open separate printable popup or print inline
                document.body.innerHTML = `
                  <div style="font-family: monospace; padding: 20px; display: flex; justify-content: center;">
                    ${printContents}
                  </div>
                `;
                
                window.print();
                
                // Restore original DOM
                window.location.reload();
              }}
              className="rounded-xl bg-black text-white hover:bg-neutral-800 font-bold gap-2"
            >
              <Printer className="h-4 w-4" /> Imprimir Arqueo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* DIALOG 7: Cuentas x Cobrar Épico */}
      <Dialog open={isCxcOpen} onOpenChange={setIsCxcOpen}>
        <DialogContent className="sm:max-w-4xl rounded-3xl p-0 overflow-hidden bg-neutral-50/80 backdrop-blur-md border-neutral-200/50">
          <div className="bg-white/90 p-6 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50 -mr-20 -mt-20 pointer-events-none"></div>
            <div className="relative z-10">
              <DialogTitle className="font-heading text-2xl font-black flex items-center gap-2 text-neutral-900">
                <Wallet className="h-6 w-6 text-blue-600" /> Cuentas por Cobrar
              </DialogTitle>
              <DialogDescription className="text-sm text-neutral-500 mt-1">
                Gestión de facturas a crédito pendientes y recepción de pagos.
              </DialogDescription>
            </div>
            
            {/* Top Metrics Cards */}
            <div className="flex gap-3 relative z-10">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-4 shadow-lg shadow-blue-600/20 min-w-[150px] border border-blue-400/20">
                <p className="text-[10px] uppercase font-bold text-blue-200 tracking-wider mb-1">Total Pendiente</p>
                <p className="text-2xl font-black">{formatRD(processedCxcInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0))}</p>
              </div>
              <div className="bg-white border border-neutral-200 text-neutral-800 rounded-2xl p-4 shadow-sm min-w-[100px]">
                <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-1">Facturas</p>
                <p className="text-2xl font-black">{processedCxcInvoices.length}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input 
                placeholder="Buscar por cliente o número de factura..."
                value={cxcSearch}
                onChange={(e) => setCxcSearch(e.target.value)}
                className="pl-12 h-12 rounded-2xl border-neutral-200 text-sm shadow-sm focus:ring-blue-500 bg-white"
              />
            </div>

            <div className="space-y-3 mt-4">
              {processedCxcInvoices.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-neutral-200 text-center shadow-sm">
                  <div className="h-16 w-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-800">Todo al día</h3>
                  <p className="text-neutral-500 text-sm mt-1">No hay facturas de crédito pendientes por cobrar en este momento.</p>
                </div>
              ) : (
                processedCxcInvoices.map((inv) => (
                  <div key={inv.id} className="group bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-50/0 to-blue-50/0 group-hover:to-blue-50/50 transition-colors pointer-events-none"></div>
                    
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="h-12 w-12 bg-neutral-100 rounded-2xl flex items-center justify-center flex-shrink-0 text-neutral-500 font-black text-lg border border-neutral-200 group-hover:bg-blue-100 group-hover:text-blue-600 group-hover:border-blue-200 transition-colors shadow-inner">
                        {inv.customerName ? inv.customerName.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-neutral-900 text-base">{inv.customerName || 'Cliente No Registrado'}</h4>
                          <Badge variant="outline" className="text-[10px] h-5 bg-neutral-50 border-neutral-200 text-neutral-500 font-mono">#{inv.id.slice(-6).toUpperCase()}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-neutral-500 font-medium">
                          <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-neutral-400" /> {formatDateTimeRD(inv.createdAt).split(',')[0]}</span>
                          <span className="flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Pendiente</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:items-end gap-3 relative z-10 border-t sm:border-none pt-4 sm:pt-0 border-neutral-100">
                      <div className="font-black text-2xl text-neutral-900 tracking-tight">{formatRD(inv.total)}</div>
                      
                      <div className="flex items-center gap-2 bg-neutral-50 p-1.5 rounded-xl border border-neutral-100">
                        <span className="text-[10px] font-bold uppercase text-neutral-400 ml-2 mr-1">Cobrar:</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2.5 rounded-lg hover:bg-emerald-100 hover:text-emerald-700 text-emerald-600 transition-all text-xs font-bold gap-1.5"
                          onClick={() => handlePayCxc(inv, 'EFECTIVO')}
                        >
                          <Coins className="h-4 w-4" /> <span className="hidden sm:inline">Efectivo</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2.5 rounded-lg hover:bg-blue-100 hover:text-blue-700 text-blue-600 transition-all text-xs font-bold gap-1.5"
                          onClick={() => handlePayCxc(inv, 'TARJETA')}
                        >
                          <CreditCard className="h-4 w-4" /> <span className="hidden sm:inline">Tarjeta</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2.5 rounded-lg hover:bg-purple-100 hover:text-purple-700 text-purple-600 transition-all text-xs font-bold gap-1.5"
                          onClick={() => handlePayCxc(inv, 'TRANSFERENCIA')}
                        >
                          <Smartphone className="h-4 w-4" /> <span className="hidden sm:inline">Transf.</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-neutral-100 bg-white/90">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsCxcOpen(false)}
              className="rounded-xl border-neutral-200 h-11 w-full sm:w-auto font-semibold px-8"
            >
              Cerrar Panel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* DIALOG 8: Liquidación de Técnicos (Pago Técnico Detallado) */}
      <Dialog open={isPagoTecnicoOpen} onOpenChange={setIsPagoTecnicoOpen}>
        <DialogContent className="sm:max-w-[700px] rounded-2xl p-0 overflow-hidden bg-white">
          <DialogHeader className="p-6 pb-4 border-b border-neutral-100">
            <DialogTitle className="font-heading text-lg font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" /> Liquidación por Técnico
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Desglose detallado de comisiones por mano de obra pendientes de pago.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-1.5 max-w-sm">
              <Label className="text-xs font-semibold text-neutral-600">Seleccione el Técnico a Liquidar</Label>
              <Select value={selectedTechToPay} onValueChange={(val) => val && setSelectedTechToPay(val)}>
                <SelectTrigger className="h-10 rounded-xl border-neutral-200 text-sm">
                  <SelectValue placeholder="Seleccione Técnico" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {technicians.filter(t => t.tenantId === tenantId).map(tech => (
                    <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTechToPay && (
              <>
                {techCommissionInfo.items.length === 0 ? (
                  <div className="bg-neutral-50 p-6 rounded-xl border border-neutral-200 text-center">
                    <CheckCircle2 className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-neutral-700">El técnico está al día</p>
                    <p className="text-xs text-neutral-500">No hay facturas pendientes de comisión.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border border-neutral-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 uppercase">
                          <tr>
                            <th className="p-3 font-bold">Factura / Fecha</th>
                            <th className="p-3 font-bold text-right text-purple-700">Comisión</th>
                            <th className="p-3 font-bold text-right text-blue-700">Mano de Obra</th>
                            <th className="p-3 font-bold text-right text-neutral-900">Total Fila</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {techCommissionInfo.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-neutral-50 transition-colors">
                              <td className="p-3">
                                <div className="font-bold text-neutral-800">#{item.inv.id.slice(-6).toUpperCase()}</div>
                                <div className="text-[10px] text-neutral-400">{new Date(item.inv.createdAt).toLocaleDateString()}</div>
                              </td>
                              <td className="p-3 text-right font-bold text-purple-700">{formatRD(item.comisionTotal)}</td>
                              <td className="p-3 text-right font-bold text-blue-700">{formatRD(item.manoObraTotal)}</td>
                              <td className="p-3 text-right font-black text-neutral-900">{formatRD(item.totalFila)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-blue-50 border-t border-blue-100">
                          <tr>
                            <td colSpan={3} className="p-3 text-right font-bold text-blue-800 uppercase text-xs">
                              Total a Liquidar:
                            </td>
                            <td className="p-3 text-right font-black text-blue-900 text-sm">
                              {formatRD(techCommissionInfo.total)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="p-6 bg-neutral-50 border-t border-neutral-100">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsPagoTecnicoOpen(false)}
              className="rounded-xl border-neutral-200 h-10"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleLiquidarTecnico}
              disabled={!selectedTechToPay || techCommissionInfo.total <= 0}
              className="rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-bold h-10 shadow-lg shadow-blue-600/20"
            >
              Liquidar Técnico ({formatRD(techCommissionInfo.total)})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InvoiceDetailDialog 
        open={!!selectedInvoice} 
        onClose={() => {
          setSelectedInvoice(null);
          setSelectedInvoiceEdit(false);
        }} 
        invoice={selectedInvoice} 
        defaultEdit={selectedInvoiceEdit}
      />
    </div>
  );
}
