"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { 
  Wallet, Lock, ArrowDownLeft, ArrowUpRight, AlertTriangle, Plus, 
  CheckCircle2, Printer, Search, FileText, PiggyBank, Coins, 
  History, Settings, Eye, Info, RefreshCw, X, Receipt, Check, FileCheck
} from "lucide-react";
import { useStore, Caja, MovimientoCaja, Empleado, Tenant } from "@/store/useStore";
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
    updateTenant 
  } = useStore();

  const currentTenant = tenants.find(t => t.slug === tenant) || tenants[0] || {
    id: "1",
    name: "Autocheck",
    slug: "autocheck",
    rnc: "131-12345-6",
    monto_caja_chica: 10000,
    monto_actual_caja_chica: 10000,
    config: {
      umbral_diferencia_caja: 500,
      formato_ticket: "80mm"
    }
  };

  const tenantId = currentTenant?.id || "1";

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
        totalGeneral: 0
      };
    }

    const montoInicial = activeCaja.monto_inicial;
    let ingresosEfectivo = 0;
    let egresosEfectivo = 0;
    let tarjetaTotal = 0;
    let transferenciaTotal = 0;

    activeMovements.forEach(m => {
      const isIngreso = ['INGRESO', 'VENTA', 'ABONO'].includes(m.tipo);
      
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
      totalGeneral
    };
  }, [activeCaja, activeMovements]);

  // Dialog open states
  const [isAperturaOpen, setIsAperturaOpen] = useState(false);
  const [isCierreOpen, setIsCierreOpen] = useState(false);
  const [isMovOpen, setIsMovOpen] = useState(false);
  const [isCajaChicaOpen, setIsCajaChicaOpen] = useState(false);
  const [isHistoricoOpen, setIsHistoricoOpen] = useState(false);
  const [isTicketPreviewOpen, setIsTicketPreviewOpen] = useState(false);
  const [selectedTicketCaja, setSelectedTicketCaja] = useState<Caja | null>(null);

  // Apertura Form States
  const [aperturaMonto, setAperturaMonto] = useState("");
  const [aperturaCajero, setAperturaCajero] = useState(DEFAULT_EMPLEADOS[0].id);
  const [aperturaNotas, setAperturaNotas] = useState("");

  // Movimiento Form States
  const [movTipo, setMovTipo] = useState<'INGRESO' | 'EGRESO' | 'RETIRO' | 'GASTO_CAJA_CHICA'>('INGRESO');
  const [movMonto, setMovMonto] = useState("");
  const [movConcepto, setMovConcepto] = useState("");
  const [movMetodo, setMovMetodo] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA'>('EFECTIVO');
  const [movGastoCategoria, setMovGastoCategoria] = useState(CATEGORIAS_GASTOS[0]);

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
      const actualCChica = currentTenant.monto_actual_caja_chica ?? 10000;
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
      tipo: movTipo === 'GASTO_CAJA_CHICA' ? 'EGRESO' : movTipo,
      concepto: movTipo === 'GASTO_CAJA_CHICA' ? `[Caja Chica - ${movGastoCategoria}] ${movConcepto}` : movConcepto,
      monto,
      metodo: movTipo === 'GASTO_CAJA_CHICA' ? 'EFECTIVO' : movMetodo,
      creado_en: new Date().toISOString()
    };

    addCajaMovement(nuevoMov);
    setIsMovOpen(false);
    setMovMonto("");
    setMovConcepto("");
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
    const umbral = currentTenant.config?.umbral_diferencia_caja || 500;
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

  // Filtered movements for search
  const filteredActiveMovements = useMemo(() => {
    return activeMovements.filter(m => 
      m.concepto.toLowerCase().includes(movSearch.toLowerCase()) ||
      m.tipo.toLowerCase().includes(movSearch.toLowerCase())
    );
  }, [activeMovements, movSearch]);

  // Closed shifts for history
  const closedShifts = useMemo(() => {
    return cajas
      .filter(c => c.tenant_id === tenantId && c.estado === 'CERRADA')
      .sort((a, b) => new Date(b.cerrada_en || 0).getTime() - new Date(a.cerrada_en || 0).getTime());
  }, [cajas, tenantId]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-1 animate-in fade-in duration-300">
      
      {/* Header section with Action Buttons */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            <Coins className="h-8 w-8 text-black" /> Control de Caja Diario
          </h1>
          <p className="text-neutral-500 max-w-xl">Administra turnos, realiza arqueos y cuadres térmicos con soporte de caja chica.</p>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-shrink-0">
          <Button 
            variant="outline" 
            onClick={() => setIsHistoricoOpen(true)}
            className="rounded-xl border-neutral-200 text-neutral-700 hover:bg-neutral-50 font-semibold gap-2 h-11"
          >
            <History className="h-4 w-4" /> Historial de Turnos
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setIsCajaChicaOpen(true)}
            className="rounded-xl border-neutral-200 text-neutral-700 hover:bg-neutral-50 font-semibold gap-2 h-11"
          >
            <PiggyBank className="h-4 w-4 text-emerald-600" /> Caja Chica
          </Button>

          {activeCaja ? (
            <Button 
              onClick={() => setIsCierreOpen(true)}
              className="rounded-xl bg-rose-600 text-white hover:bg-rose-700 font-bold gap-2 h-11 shadow-lg shadow-rose-600/10 flex-shrink-0"
            >
              <Lock className="h-4 w-4" /> Cerrar Turno (Arqueo)
            </Button>
          ) : (
            <Button 
              onClick={() => setIsAperturaOpen(true)}
              className="rounded-xl bg-black text-white hover:bg-neutral-800 font-bold gap-2 h-11 shadow-lg shadow-black/10 flex-shrink-0"
            >
              <Plus className="h-4 w-4" /> Abrir Caja
            </Button>
          )}
        </div>
      </div>

      {/* Cash Register State Widget */}
      {!activeCaja ? (
        <Card className="border-neutral-200 bg-neutral-50/50 shadow-sm rounded-2xl p-6 text-center">
          <div className="h-16 w-16 mx-auto rounded-full bg-neutral-100 flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-bold text-neutral-800 mb-1">Caja Cerrada</h3>
          <p className="text-neutral-500 max-w-md mx-auto mb-6 text-sm">
            Para registrar transacciones de venta en el POS, egresos o cobros de abonos, primero debes realizar la apertura diaria de la caja.
          </p>
          <Button 
            onClick={() => setIsAperturaOpen(true)}
            className="rounded-xl bg-black text-white hover:bg-neutral-800 px-6 font-bold"
          >
            Abrir Caja Ahora
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Open Turn Details Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white animate-pulse">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-900 text-base">Caja Activa (Abierta)</span>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold text-[10px] uppercase rounded-full">En Curso</Badge>
                </div>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Abierta en: <span className="font-bold">{formatDateTimeRD(activeCaja.abierta_en)}</span> • Responsable: <span className="font-bold">{DEFAULT_EMPLEADOS.find(e => e.id === activeCaja.empleado_id)?.nombre || "Administrador"}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                onClick={() => {
                  setSelectedTicketCaja(activeCaja);
                  setIsTicketPreviewOpen(true);
                }}
                className="bg-white hover:bg-emerald-100/50 border-emerald-200 text-emerald-800 font-semibold rounded-xl text-xs gap-2"
              >
                <Printer className="h-3.5 w-3.5" /> Vista Rápida Arqueo
              </Button>
              <Button 
                onClick={() => setIsMovOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs gap-2"
              >
                <Plus className="h-3.5 w-3.5" /> Registrar Movimiento
              </Button>
            </div>
          </div>

          {/* Stats metrics row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-neutral-200 bg-white shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Fondo Inicial</span>
                  <div className="p-2 rounded-xl bg-neutral-100 text-neutral-600">
                    <Wallet className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-neutral-800">{formatRD(metrics.montoInicial)}</h3>
                <p className="text-xs text-neutral-400 mt-1">Efectivo base de apertura</p>
              </CardContent>
            </Card>

            <Card className="border-neutral-200 bg-white shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Esperado en Caja</span>
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                    <Coins className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-emerald-800">{formatRD(metrics.efectivoEsperado)}</h3>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-neutral-500">
                  <span className="text-emerald-600 font-bold">+{formatRD(metrics.ingresosEfectivo)} ing</span>
                  <span>•</span>
                  <span className="text-rose-500 font-bold">-{formatRD(metrics.egresosEfectivo)} egr</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-neutral-200 bg-white shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Ventas Digitales</span>
                  <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                    <RefreshCw className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-neutral-800">{formatRD(metrics.tarjetaTotal + metrics.transferenciaTotal)}</h3>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-neutral-500">
                  <span className="text-blue-600 font-bold">Tar: {formatRD(metrics.tarjetaTotal)}</span>
                  <span>•</span>
                  <span className="text-purple-600 font-bold">Tra: {formatRD(metrics.transferenciaTotal)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-neutral-200 bg-white shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Caja Chica</span>
                  <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                    <PiggyBank className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-neutral-800">
                  {formatRD(currentTenant?.monto_actual_caja_chica ?? 10000)}
                </h3>
                <div className="mt-2 w-full">
                  <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-600 rounded-full transition-all" 
                      style={{ 
                        width: `${((currentTenant?.monto_actual_caja_chica ?? 10000) / (currentTenant?.monto_caja_chica ?? 10000)) * 100}%` 
                      }} 
                    />
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1 flex justify-between">
                    <span>Fondo Fijo: {formatRD(currentTenant?.monto_caja_chica ?? 10000)}</span>
                    <span className="font-bold">
                      {Math.round(((currentTenant?.monto_actual_caja_chica ?? 10000) / (currentTenant?.monto_caja_chica ?? 10000)) * 100)}%
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Drawer Movements Section */}
          <Card className="border-neutral-200 bg-white shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="p-5 border-b border-neutral-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-neutral-50/50">
              <div>
                <CardTitle className="font-heading text-lg font-bold text-neutral-800">Flujo de Caja del Turno</CardTitle>
                <p className="text-xs text-neutral-400">Listado de ingresos, egresos y ventas de este arqueo diario.</p>
              </div>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                <Input 
                  placeholder="Buscar movimientos..."
                  value={movSearch}
                  onChange={(e) => setMovSearch(e.target.value)}
                  className="pl-9 h-9 rounded-xl border-neutral-200 text-xs"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-100 text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-4">Tipo</th>
                      <th className="p-4">Concepto / Motivo</th>
                      <th className="p-4 text-center">Método</th>
                      <th className="p-4">Fecha / Hora</th>
                      <th className="p-4 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredActiveMovements.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-10 text-center text-neutral-400 font-semibold">
                          No se han registrado movimientos en este turno aún
                        </td>
                      </tr>
                    ) : (
                      filteredActiveMovements.map((mov) => {
                        const isIngreso = ['INGRESO', 'VENTA', 'ABONO'].includes(mov.tipo);
                        return (
                          <tr key={mov.id} className="hover:bg-neutral-50/50 transition-colors">
                            <td className="p-4">
                              <Badge className={cn(
                                "rounded-full px-2.5 py-0.5 text-[10px] font-bold border",
                                isIngreso 
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                                  : "bg-rose-50 text-rose-800 border-rose-200"
                              )}>
                                <span className="flex items-center gap-1">
                                  {isIngreso ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                                  {mov.tipo}
                                </span>
                              </Badge>
                            </td>
                            <td className="p-4 font-semibold text-neutral-800 max-w-xs truncate">{mov.concepto}</td>
                            <td className="p-4 text-center">
                              <Badge variant="outline" className="rounded-full px-2 py-0 border-neutral-200 text-neutral-600 uppercase text-[9px] font-bold">
                                {mov.metodo}
                              </Badge>
                            </td>
                            <td className="p-4 text-neutral-500 font-mono">{formatDateTimeRD(mov.creado_en)}</td>
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
        </div>
      )}

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

              {movTipo !== 'GASTO_CAJA_CHICA' ? (
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
              ) : (
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
                        ...currentTenant.config,
                        formato_ticket: sz as any
                      }
                    });
                  }}
                  className={cn(
                    "text-[10px] font-bold px-2 py-1 transition-all",
                    currentTenant.config?.formato_ticket === sz
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
                currentTenant.config?.formato_ticket === "57mm" ? "w-[200px]" : "w-[260px]"
              )}
            >
              <div className="text-center">
                <p className="font-black text-sm uppercase">{currentTenant.name}</p>
                <p className="text-neutral-500 text-[9px] mt-0.5">RNC: {currentTenant.rnc || "---"}</p>
                <p className="text-[9px]">TEL: {currentTenant.phone || "---"}</p>
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
      
    </div>
  );
}
