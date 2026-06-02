import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { updateTenantConfig } from "@/lib/storage";
import { getEcfToken, fetchTaxSequences } from "@/lib/ecf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { KeyRound, ShieldCheck, RefreshCw, Server, AlertCircle, Plus, Eye, EyeOff, Check, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { EcfSequenceDialog } from "./EcfSequenceDialog";
import { createTaxSequence } from "@/lib/ecf";

export function EcfSettings({ tenant }: { tenant: any }) {
  const ecfConfig = tenant.config?.ecfConfig || {
    useOwnCredentials: true,
    environment: 'sandbox',
    clientId: '',
    clientSecret: ''
  };

  const [useOwn, setUseOwn] = useState(ecfConfig.useOwnCredentials);
  const [env, setEnv] = useState<'sandbox'|'production'>(ecfConfig.environment);
  const [clientId, setClientId] = useState(ecfConfig.clientId || '');
  const [clientSecret, setClientSecret] = useState(ecfConfig.clientSecret || '');
  
  const [showSecret, setShowSecret] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [sequences, setSequences] = useState<any[]>([]);
  const [isLoadingSequences, setIsLoadingSequences] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    if (useOwn && clientId && clientSecret) {
      loadSequences();
    }
  }, [useOwn, clientId, clientSecret, env]);

  const loadSequences = async () => {
    setIsLoadingSequences(true);
    try {
      const token = await getEcfToken(clientId, clientSecret, env);
      const data = await fetchTaxSequences(token, env);
      setSequences(data.data || []);
    } catch (err: any) {
      console.error(err);
      // We don't toast error here because it might be invalid credentials while typing
    } finally {
      setIsLoadingSequences(false);
    }
  };

  const handleSave = async () => {
    if (useOwn && (!clientId || !clientSecret)) {
      toast.error("Debes completar el Client ID y Client Secret");
      return;
    }
    
    const newConfig = {
      ...tenant.config,
      ecfConfig: {
        useOwnCredentials: useOwn,
        environment: env,
        clientId,
        clientSecret
      }
    };
    
    try {
      await updateTenantConfig(tenant.id, newConfig);
      toast.success("Configuración e-CF guardada correctamente");
    } catch (e) {
      toast.error("Error al guardar la configuración");
    }
  };

  const handleTest = async () => {
    if (!clientId || !clientSecret) return toast.error("Ingresa las credenciales");
    setIsTesting(true);
    try {
      await getEcfToken(clientId, clientSecret, env);
      toast.success("¡Conexión exitosa a Pronesoft DGII!");
      loadSequences();
    } catch (e: any) {
      toast.error(e.message || "Error al conectar. Verifica tus credenciales.");
    } finally {
      setIsTesting(false);
    }
  };

  const handleCreateSequence = async (data: any) => {
    try {
      const token = await getEcfToken(clientId, clientSecret, env);
      await createTaxSequence(token, env, data);
      toast.success("Secuencia creada correctamente");
      loadSequences();
    } catch (e: any) {
      toast.error(e.message || "Error al crear la secuencia");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
      <Card className="border-neutral-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                Facturación Electrónica e-CF
              </CardTitle>
              <CardDescription className="mt-1.5 text-neutral-500">
                Configura tu conexión a la plataforma de Pronesoft para emitir comprobantes electrónicos directamente a la DGII.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span className="text-xs font-bold text-blue-700 uppercase tracking-widest">
                Pronesoft SDK
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 bg-white">
            <div className="space-y-1">
              <Label className="text-base font-bold flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-neutral-500" />
                Usar credenciales propias (Pronesoft)
              </Label>
              <p className="text-sm text-neutral-500">
                Activa esta opción si tienes tu propia cuenta de desarrollador en Pronesoft.
              </p>
            </div>
            <Switch checked={useOwn} onCheckedChange={setUseOwn} />
          </div>

          {useOwn && (
            <div className="space-y-5 bg-neutral-50/50 border border-neutral-100 rounded-xl p-5">
              <div className="grid gap-2">
                <Label className="font-bold">Ambiente de DGII</Label>
                <Select value={env} onValueChange={(val) => val && setEnv(val as 'sandbox'|'production')}>
                  <SelectTrigger className="h-11 rounded-xl bg-white">
                    <SelectValue placeholder="Selecciona el ambiente" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="sandbox">Sandbox (Pruebas de Certificación)</SelectItem>
                    <SelectItem value="production">Producción (Emisión Real)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label className="font-bold">Client ID (Pronesoft)</Label>
                <Input
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="h-11 rounded-xl font-mono text-sm bg-white"
                  placeholder="Ej: 12345678-abcd-..."
                />
              </div>

              <div className="grid gap-2">
                <Label className="font-bold">Client Secret (Pronesoft)</Label>
                <div className="relative">
                  <Input
                    type={showSecret ? "text" : "password"}
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    className="h-11 rounded-xl font-mono text-sm bg-white pr-10"
                    placeholder="••••••••••••••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-neutral-500">
                  Estas credenciales se guardan de forma segura en tu base de datos de Supabase.
                </p>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleTest}
                  disabled={isTesting || !clientId || !clientSecret}
                  className="h-11 rounded-xl font-bold flex-1"
                >
                  {isTesting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Server className="h-4 w-4 mr-2" />}
                  Probar Conexión
                </Button>
                
                <Button 
                  onClick={handleSave}
                  className="h-11 rounded-xl font-bold flex-1 bg-black text-white hover:bg-neutral-800"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Guardar Credenciales
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Secuencias */}
      <Card className="border-neutral-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-black">Secuencias e-NCF</CardTitle>
              <CardDescription className="text-neutral-500">
                Rangos de comprobantes autorizados por la DGII.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={loadSequences} variant="outline" size="sm" className="h-9 rounded-lg font-bold">
                <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isLoadingSequences && "animate-spin")} />
                Actualizar
              </Button>
              <Button onClick={() => setShowDialog(true)} size="sm" className="h-9 rounded-lg font-bold bg-[#1B2B4D] hover:bg-[#121c32] text-white">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                AÑADIR
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {sequences.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="h-12 w-12 bg-neutral-100 rounded-full flex items-center justify-center mb-3">
                <AlertCircle className="h-5 w-5 text-neutral-400" />
              </div>
              <h3 className="font-bold text-neutral-900">No hay secuencias</h3>
              <p className="text-sm text-neutral-500 mt-1 max-w-sm">
                No tienes ninguna secuencia e-NCF activa en tu cuenta de Pronesoft. Añade una para poder emitir comprobantes.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {sequences.map((seq, i) => (
                <div key={i} className="p-5 flex items-center justify-between hover:bg-neutral-50/50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black text-neutral-900">{seq.sequenceType} - {seq.name || 'COMPROBANTE'}</span>
                      <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 uppercase tracking-widest font-black">
                        e-CF
                      </Badge>
                    </div>
                    <p className="text-sm text-neutral-500 font-mono tracking-wider">
                      {seq.prefix}{seq.currentNumber?.toString().padStart(10, '0')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-emerald-600">
                      {seq.to - seq.currentNumber} disp.
                    </div>
                    <div className="text-xs font-medium text-rose-500 mt-0.5">
                      Alerta: {seq.alertThreshold || 50}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <EcfSequenceDialog 
        open={showDialog} 
        onClose={() => setShowDialog(false)} 
        onSave={handleCreateSequence} 
      />
    </div>
  );
}
