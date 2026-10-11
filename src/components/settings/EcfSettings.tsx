import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { updateTenantConfig } from "@/lib/storage";
import {
  fetchEf2Sequences,
  createEf2Sequence,
  updateEf2Sequence,
  deleteEf2Sequence,
  verifyEf2Token,
  fetchEf2Tipos,
  resolveEcfEnvironment,
  EF2_DEFAULT_TEST_TOKEN,
  EF2_DEFAULT_TEST_USERNAME,
  EF2_DEFAULT_TEST_RNC,
  EF2_DEFAULT_TEST_EMPRESA,
  type EF2SecuenciaRango,
  type EF2TipoECF,
  type EF2Environment,
} from "@/lib/ecf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Plus,
  Eye,
  EyeOff,
  Check,
  Building2,
  Sparkles,
  ExternalLink,
  Trash2,
  Sliders,
  CheckCircle2,
  FileText,
  Clock,
  Layers,
  Search,
  HelpCircle,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EcfSequenceDialog } from "./EcfSequenceDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export function EcfSettings({ tenant }: { tenant: any }) {
  const ecfConfig = tenant.config?.ecfConfig || {
    environment: "TesteCF",
    token: EF2_DEFAULT_TEST_TOKEN,
    username: EF2_DEFAULT_TEST_USERNAME,
    rnc: tenant.rnc || EF2_DEFAULT_TEST_RNC,
    businessName: tenant.name || EF2_DEFAULT_TEST_EMPRESA,
    is_active: false,
  };

  const [env, setEnv] = useState<EF2Environment>(resolveEcfEnvironment(ecfConfig.environment));
  const [token, setToken] = useState(ecfConfig.token || EF2_DEFAULT_TEST_TOKEN);
  const [username, setUsername] = useState(ecfConfig.username || EF2_DEFAULT_TEST_USERNAME);
  const [rnc, setRnc] = useState(ecfConfig.rnc || tenant.rnc || EF2_DEFAULT_TEST_RNC);
  const [businessName, setBusinessName] = useState(ecfConfig.businessName || tenant.name || EF2_DEFAULT_TEST_EMPRESA);
  const [isActive, setIsActive] = useState<boolean>(ecfConfig.is_active ?? false);
  const [showToken, setShowToken] = useState(false);

  const [isVerifying, setIsVerifying] = useState(false);
  const [isTokenVerified, setIsTokenVerified] = useState<boolean | null>(null);

  const [sequences, setSequences] = useState<EF2SecuenciaRango[]>([]);
  const [availableTipos, setAvailableTipos] = useState<EF2TipoECF[]>([]);
  const [isLoadingSequences, setIsLoadingSequences] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Modal para ajustar secuencia_actual
  const [adjustSequenceItem, setAdjustSequenceItem] = useState<EF2SecuenciaRango | null>(null);
  const [newActualSeq, setNewActualSeq] = useState<number>(0);
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Cargar secuencias al montar o al cambiar token
  useEffect(() => {
    if (token) {
      loadSequences();
      loadTipos();
    }
  }, [token]);

  const loadTipos = async () => {
    try {
      const res = await fetchEf2Tipos(token);
      if (res.success && Array.isArray(res.data)) {
        setAvailableTipos(res.data);
      }
    } catch {
      // Ignorar error secundario
    }
  };

  const loadSequences = async () => {
    setIsLoadingSequences(true);
    try {
      const res = await fetchEf2Sequences(token);
      if (res.success && Array.isArray(res.data)) {
        setSequences(res.data);
        setIsTokenVerified(true);
      } else {
        setSequences([]);
      }
    } catch (err: any) {
      console.error("Error al cargar secuencias EF2:", err);
      setIsTokenVerified(false);
    } finally {
      setIsLoadingSequences(false);
    }
  };

  const handleVerifyToken = async () => {
    if (!token.trim()) {
      toast.error("Ingresa el Bearer Token de EF2");
      return;
    }
    setIsVerifying(true);
    try {
      const res = await verifyEf2Token(token);
      if (res.success) {
        setIsTokenVerified(true);
        toast.success("¡Conexión exitosa con EF2! Token autenticado correctamente.");
        loadSequences();
        loadTipos();
      } else {
        setIsTokenVerified(false);
        toast.error(res.message || "EF2 rechazó las credenciales ingresadas.");
      }
    } catch (err: any) {
      setIsTokenVerified(false);
      toast.error(err.message || "Error al verificar conexión con EF2.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleUseOfficialTestCredentials = () => {
    setToken(EF2_DEFAULT_TEST_TOKEN);
    setUsername(EF2_DEFAULT_TEST_USERNAME);
    setRnc(EF2_DEFAULT_TEST_RNC);
    setBusinessName(EF2_DEFAULT_TEST_EMPRESA);
    setEnv("TesteCF");
    setIsTokenVerified(true);
    toast.info("Credenciales oficiales de prueba de EF2 cargadas. Haz clic en 'Guardar Configuración'.");
  };

  const handleSaveConfig = async () => {
    if (!rnc.trim()) {
      toast.error("Ingresa el RNC emisor");
      return;
    }
    if (!token.trim()) {
      toast.error("Ingresa el token de EF2");
      return;
    }

    try {
      const newConfig = {
        ...tenant.config,
        ecfConfig: {
          provider: "ef2" as const,
          token: token.trim(),
          username: username.trim(),
          environment: env,
          rnc: rnc.replace(/\D/g, ""),
          businessName: businessName.trim(),
          is_active: isActive,
          updatedAt: new Date().toISOString(),
        },
      };

      await updateTenantConfig(tenant.id, newConfig);
      toast.success("Configuración de Facturación Electrónica guardada exitosamente");
      loadSequences();
    } catch (e: any) {
      console.error("Error al guardar config e-CF:", e);
      toast.error(e.message || "Error al guardar la configuración");
    }
  };

  const handleCreateSequence = async (data: any) => {
    try {
      await createEf2Sequence(token, data);
      toast.success(`Secuencia ${data.prefijo} creada exitosamente en EF2`);
      loadSequences();
    } catch (e: any) {
      toast.error(e.message || "Error al registrar la secuencia en EF2");
      throw e;
    }
  };

  const handleToggleState = async (seq: EF2SecuenciaRango) => {
    const nextState = !(seq.estado === true || seq.estado === 1);
    try {
      toast.info(`Actualizando estado de ${seq.prefijo} en EF2...`, { id: "toggle-seq" });
      await updateEf2Sequence(token, { id: seq.id, estado: nextState });
      toast.success(`Secuencia ${seq.prefijo} ${nextState ? "activada" : "desactivada"} en EF2`, { id: "toggle-seq" });
      loadSequences();
    } catch (err: any) {
      toast.error(err.message || "No se pudo actualizar el estado de la secuencia", { id: "toggle-seq" });
    }
  };

  const handleOpenAdjust = (seq: EF2SecuenciaRango) => {
    setAdjustSequenceItem(seq);
    setNewActualSeq(seq.secuencia_actual || 0);
  };

  const handleSaveAdjust = async () => {
    if (!adjustSequenceItem) return;
    setIsAdjusting(true);
    try {
      await updateEf2Sequence(token, {
        id: adjustSequenceItem.id,
        secuencia_actual: Number(newActualSeq),
      });
      toast.success(`Secuencia actual de ${adjustSequenceItem.prefijo} ajustada a ${newActualSeq} en EF2`);
      setAdjustSequenceItem(null);
      loadSequences();
    } catch (err: any) {
      toast.error(err.message || "Error al ajustar la secuencia");
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleDeleteSequence = async (seq: EF2SecuenciaRango) => {
    if (!confirm(`¿Estás seguro de eliminar el rango ${seq.prefijo} (${seq.desde}-${seq.hasta}) en EF2? Solo se pueden eliminar rangos inactivos.`)) {
      return;
    }
    try {
      toast.info(`Eliminando rango ${seq.prefijo} en EF2...`, { id: "del-seq" });
      await deleteEf2Sequence(token, seq.id);
      toast.success(`Rango ${seq.prefijo} eliminado correctamente de EF2`, { id: "del-seq" });
      loadSequences();
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar el rango en EF2", { id: "del-seq" });
    }
  };

  // Cálculos estadísticos
  const totalDisponibles = sequences
    .filter((s) => s.estado === true || s.estado === 1)
    .reduce((acc, s) => acc + (s.secuencias_disponibles ?? s.disponibles ?? Math.max(0, s.hasta - s.secuencia_actual)), 0);

  const activeRangesCount = sequences.filter((s) => s.estado === true || s.estado === 1).length;

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
      {/* ── 1. HEADER & ESTADO PRINCIPAL EF2 ── */}
      <Card className="border-neutral-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-neutral-50 via-sky-50/30 to-blue-50/40 border-b border-neutral-100 pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-black flex items-center gap-2 text-neutral-900">
                <ShieldCheck className="h-5 w-5 text-[#0051A8]" />
                Facturación Electrónica DGII con EF2 API
              </CardTitle>
              <CardDescription className="mt-1 text-neutral-500 text-xs">
                Emisión oficial de comprobantes e-CF (E31, E32, E34, E44, etc.) y administración directa de secuencias fiscales vía EF2.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider",
                  isTokenVerified
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : isTokenVerified === false
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                )}
              >
                <span className="relative flex h-2 w-2">
                  <span
                    className={cn(
                      "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                      isTokenVerified ? "bg-emerald-400" : isTokenVerified === false ? "bg-rose-400" : "bg-blue-400"
                    )}
                  />
                  <span
                    className={cn(
                      "relative inline-flex rounded-full h-2 w-2",
                      isTokenVerified ? "bg-emerald-500" : isTokenVerified === false ? "bg-rose-500" : "bg-blue-500"
                    )}
                  />
                </span>
                <span>
                  {isTokenVerified ? "EF2 Conectado" : isTokenVerified === false ? "Sin Conexión" : "EF2 API Directa"}
                </span>
              </div>
              <a
                href="https://doc.ef2.do/"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-[#0051A8] hover:underline flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-neutral-200"
              >
                Docs EF2 <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-5">
          {/* Switch de activación global */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 bg-neutral-50/50">
            <div>
              <div className="font-bold text-sm text-neutral-900">Activar Emisión de Comprobantes Electrónicos</div>
              <div className="text-xs text-neutral-500 mt-0.5">
                Al activar, las ventas del POS generarán comprobantes e-CF timbrados ante la DGII con e-NCF y código QR oficial.
              </div>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {/* Formulario de Credenciales EF2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-700">Ambiente de Operación</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["TesteCF", "CerteCF", "eCF"] as EF2Environment[]).map((envOption) => (
                  <button
                    key={envOption}
                    type="button"
                    onClick={() => setEnv(envOption)}
                    className={cn(
                      "py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center",
                      env === envOption
                        ? "bg-[#0051A8] text-white border-[#0051A8] shadow-sm"
                        : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
                    )}
                  >
                    {envOption === "TesteCF" ? "🧪 Pruebas" : envOption === "CerteCF" ? "📋 Certificación" : "🚀 Producción"}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-neutral-400">
                TesteCF para pruebas locales, CerteCF para homologación DGII, eCF para facturas reales.
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-700">Usuario de API en EF2</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="api_2buy_mliec4sb"
                className="h-10 rounded-xl border-neutral-200 text-xs font-semibold"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-neutral-700">Token de Autenticación EF2 (Bearer Token)</Label>
                <button
                  type="button"
                  onClick={handleUseOfficialTestCredentials}
                  className="text-[11px] font-bold text-[#0051A8] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="h-3 w-3" /> Cargar Credenciales de Prueba Oficiales
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showToken ? "text" : "password"}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="tok_..."
                  className="h-10 rounded-xl border-neutral-200 text-xs font-mono pr-20"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute inset-y-0 right-3 flex items-center text-neutral-400 hover:text-neutral-700 text-xs font-semibold"
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <span className="text-[10px] text-neutral-400">
                Los tokens que inician con <code>tok_</code> se autentican directamente sin requerir login manual.
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-700">RNC Emisor de la Empresa</Label>
              <Input
                value={rnc}
                onChange={(e) => setRnc(e.target.value)}
                placeholder="132596161"
                className="h-10 rounded-xl border-neutral-200 text-xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-700">Razón Social Emisor</Label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Nombre legal de la empresa"
                className="h-10 rounded-xl border-neutral-200 text-xs font-semibold"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleVerifyToken}
              disabled={isVerifying}
              className="h-10 rounded-xl text-xs font-bold border-neutral-300"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Verificando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-[#0051A8]" />
                  Verificar Conexión EF2
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={handleSaveConfig}
              className="h-10 rounded-xl text-xs font-bold bg-[#0051A8] hover:bg-[#003d7e] text-white shadow-sm"
            >
              Guardar Configuración
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── 2. GESTIÓN DE SECUENCIAS DIRECTAMENTE DESDE EF2 ── */}
      <Card className="border-neutral-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-neutral-50/60 border-b border-neutral-100 pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-black flex items-center gap-2 text-neutral-900">
                <Layers className="h-4 w-4 text-[#0051A8]" />
                Secuencias e-NCF Autorizadas en EF2
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500 mt-0.5">
                Rangos de comprobantes autorizados por la DGII y registrados en EF2 para asignación automática.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadSequences}
                disabled={isLoadingSequences}
                className="h-9 rounded-xl text-xs font-bold border-neutral-200"
              >
                <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isLoadingSequences && "animate-spin")} />
                Sincronizar en Vivo
              </Button>
              <Button
                size="sm"
                onClick={() => setShowCreateDialog(true)}
                className="h-9 rounded-xl text-xs font-bold bg-[#0051A8] hover:bg-[#003d7e] text-white"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Nueva Secuencia en EF2
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-5">
          {/* Resumen numérico */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-100 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-sky-800 uppercase tracking-wide">Comprobantes Disponibles</div>
                <div className="text-2xl font-black text-[#0051A8] mt-0.5">{totalDisponibles.toLocaleString()}</div>
              </div>
              <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center text-[#0051A8]">
                <FileText className="h-5 w-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">Rangos Activos</div>
                <div className="text-2xl font-black text-emerald-700 mt-0.5">{activeRangesCount}</div>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-neutral-600 uppercase tracking-wide">Total de Rangos Registrados</div>
                <div className="text-2xl font-black text-neutral-900 mt-0.5">{sequences.length}</div>
              </div>
              <div className="h-10 w-10 rounded-full bg-neutral-200/70 flex items-center justify-center text-neutral-700">
                <Sliders className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Listado de Secuencias traídas desde EF2 */}
          {isLoadingSequences ? (
            <div className="py-12 text-center text-neutral-400 space-y-3">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#0051A8]" />
              <p className="text-xs font-semibold">Consultando secuencias directamente desde EF2...</p>
            </div>
          ) : sequences.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-neutral-200 rounded-2xl p-8 space-y-3">
              <div className="h-12 w-12 rounded-full bg-sky-50 text-[#0051A8] flex items-center justify-center mx-auto">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-sm text-neutral-800">No hay secuencias registradas en EF2</h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Agrega tu primer rango autorizado de la DGII (ej: E32 para consumidor final o E31 para crédito fiscal).
              </p>
              <Button
                size="sm"
                onClick={() => setShowCreateDialog(true)}
                className="mt-2 rounded-xl text-xs font-bold bg-[#0051A8] text-white"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Crear Primera Secuencia
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sequences.map((seq) => {
                const isSeqActive = seq.estado === true || seq.estado === 1;
                const total = seq.total_secuencias || Math.max(1, seq.hasta - seq.desde + 1);
                const current = seq.secuencia_actual || 0;
                const used = seq.secuencias_usadas ?? Math.max(0, current - seq.desde + 1);
                const remaining = seq.secuencias_disponibles ?? seq.disponibles ?? Math.max(0, seq.hasta - current);
                const percent = seq.porcentaje_uso ?? Math.min(100, Math.round((used / total) * 100));

                return (
                  <div
                    key={seq.id}
                    className={cn(
                      "p-4 rounded-xl border transition-all space-y-3 relative overflow-hidden",
                      isSeqActive
                        ? "bg-white border-neutral-200 hover:border-[#0078D4] hover:shadow-sm"
                        : "bg-neutral-50/80 border-neutral-200 opacity-75"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-md text-xs font-black bg-gradient-to-r from-[#0051A8] to-[#0078D4] text-white">
                          {seq.prefijo}
                        </span>
                        <div>
                          <div className="font-bold text-xs text-neutral-900 leading-tight">
                            {seq.tipo_nombre || (seq.prefijo === "E31" ? "Crédito Fiscal" : seq.prefijo === "E32" ? "Consumidor Final" : "Comprobante Fiscal")}
                          </div>
                          <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                            Rango: {seq.desde.toLocaleString()} → {seq.hasta.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5",
                            isSeqActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-neutral-100 text-neutral-600 border-neutral-200"
                          )}
                        >
                          {isSeqActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </div>

                    {/* Barra de progreso de consumo */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-neutral-600">
                        <span>Actual: <strong className="text-neutral-900">{current.toLocaleString()}</strong></span>
                        <span>Disponibles: <strong className={cn(remaining < 50 ? "text-rose-600" : "text-emerald-700")}>{remaining.toLocaleString()}</strong></span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            percent > 90 ? "bg-rose-500" : percent > 70 ? "bg-amber-500" : "bg-emerald-500"
                          )}
                          style={{ width: `${Math.min(100, Math.max(2, percent))}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9.5px] text-neutral-400">
                        <span>{used.toLocaleString()} usadas ({percent}%)</span>
                        {seq.fecha_vencimiento ? (
                          <span className="flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" /> Vence: {seq.fecha_vencimiento}
                          </span>
                        ) : (
                          <span>Sin vencimiento</span>
                        )}
                      </div>
                    </div>

                    {/* Acciones directas sobre la secuencia */}
                    <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleState(seq)}
                          className={cn(
                            "text-[11px] font-bold px-2 py-1 rounded-md transition-colors",
                            isSeqActive
                              ? "text-neutral-600 hover:bg-neutral-100"
                              : "text-emerald-700 hover:bg-emerald-50"
                          )}
                        >
                          {isSeqActive ? "Desactivar" : "Activar en EF2"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenAdjust(seq)}
                          className="text-[11px] font-bold text-[#0051A8] hover:bg-sky-50 px-2 py-1 rounded-md transition-colors"
                        >
                          Ajustar Contador
                        </button>
                      </div>

                      {!isSeqActive && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSequence(seq)}
                          className="text-rose-600 hover:bg-rose-50 p-1 rounded-md transition-colors"
                          title="Eliminar rango inactivo de EF2"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal para Crear Secuencia en EF2 */}
      {showCreateDialog && (
        <EcfSequenceDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          token={token}
          tipos={availableTipos}
          onSave={handleCreateSequence}
        />
      )}

      {/* Modal para Ajustar Secuencia Actual */}
      {adjustSequenceItem && (
        <Dialog open={!!adjustSequenceItem} onOpenChange={() => setAdjustSequenceItem(null)}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-neutral-900">
                Ajustar Secuencia Actual ({adjustSequenceItem.prefijo})
              </DialogTitle>
              <CardDescription className="text-xs text-neutral-500">
                Ajusta el número del último comprobante emitido en EF2 si estás migrando desde otro sistema.
              </CardDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-neutral-700">Rango Autorizado</Label>
                <div className="text-xs font-mono bg-neutral-50 p-2.5 rounded-lg border border-neutral-200">
                  {adjustSequenceItem.desde} hasta {adjustSequenceItem.hasta}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-neutral-700">Nuevo Valor de Secuencia Actual</Label>
                <Input
                  type="number"
                  value={newActualSeq}
                  onChange={(e) => setNewActualSeq(Number(e.target.value))}
                  min={adjustSequenceItem.desde - 1}
                  max={adjustSequenceItem.hasta}
                  className="h-10 rounded-xl border-neutral-200 text-xs font-semibold"
                />
                <span className="text-[10px] text-neutral-400">
                  La próxima factura se emitirá con el número <strong>{Number(newActualSeq) + 1}</strong>.
                </span>
              </div>
            </div>

            <DialogFooter className="pt-2 flex gap-2 sm:justify-end">
              <Button
                variant="ghost"
                onClick={() => setAdjustSequenceItem(null)}
                className="h-9 px-4 rounded-xl text-xs font-bold"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveAdjust}
                disabled={isAdjusting}
                className="h-9 px-5 rounded-xl text-xs font-bold bg-[#0051A8] text-white"
              >
                {isAdjusting ? "Guardando..." : "Guardar en EF2"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
