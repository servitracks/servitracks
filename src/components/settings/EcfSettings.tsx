import { useState, useEffect, useRef } from "react";
import { useStore } from "@/store/useStore";
import { updateTenantConfig } from "@/lib/storage";
import { getEcfToken, fetchTaxSequences, uploadDigitalCertificate, createTaxSequence, resolveEcfEnvironment } from "@/lib/ecf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ShieldCheck, RefreshCw, AlertCircle, Plus, Eye, EyeOff, Check, Upload, FileCheck, Building2, FileKey, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { EcfSequenceDialog } from "./EcfSequenceDialog";

export function EcfSettings({ tenant }: { tenant: any }) {
  const ecfConfig = tenant.config?.ecfConfig || {
    environment: resolveEcfEnvironment(),
    rnc: tenant.rnc || '',
    businessName: tenant.name || '',
    certFileName: '',
    certPassword: '',
    certUploaded: false,
  };

  const [env, setEnv] = useState<'sandbox' | 'production'>(resolveEcfEnvironment(ecfConfig.environment));
  const [rnc, setRnc] = useState(ecfConfig.rnc || tenant.rnc || '');
  const [businessName, setBusinessName] = useState(ecfConfig.businessName || tenant.name || '');
  const [certPassword, setCertPassword] = useState(ecfConfig.certPassword || '');
  const [showPassword, setShowPassword] = useState(false);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [certFileName, setCertFileName] = useState(ecfConfig.certFileName || '');
  const [certUploaded, setCertUploaded] = useState(ecfConfig.certUploaded || false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [sequences, setSequences] = useState<any[]>([]);
  const [isLoadingSequences, setIsLoadingSequences] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    if (rnc) {
      loadSequences();
    }
  }, [rnc, env]);

  const loadSequences = async () => {
    setIsLoadingSequences(true);
    try {
      const token = await getEcfToken(undefined, undefined, env);
      const data = await fetchTaxSequences(token, env);
      setSequences(data.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingSequences(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.p12') && !file.name.toLowerCase().endsWith('.pfx')) {
      toast.error("El archivo debe ser un certificado digital en formato .p12 o .pfx");
      return;
    }

    setSelectedFile(file);
    setCertFileName(file.name);
    toast.success(`Archivo "${file.name}" seleccionado`);
  };

  const handleSaveAndUpload = async () => {
    if (!rnc.trim()) {
      toast.error("Ingresa el RNC de la empresa");
      return;
    }
    if (!businessName.trim()) {
      toast.error("Ingresa el Nombre o Razón Social");
      return;
    }

    setIsUploading(true);
    try {
      let isUploaded = certUploaded;

      if (selectedFile && certPassword) {
        toast.info("Conectando con Pronesoft SDK y registrando Certificado Digital...");
        const token = await getEcfToken(undefined, undefined, env);
        await uploadDigitalCertificate(token, env, rnc.replace(/\D/g, ''), selectedFile, certPassword);
        isUploaded = true;
        setCertUploaded(true);
        toast.success("¡Certificado Digital (.p12) cargado y validado correctamente con la DGII!");
      }

      const newConfig = {
        ...tenant.config,
        ecfConfig: {
          environment: env,
          rnc,
          businessName,
          certFileName: certFileName || (selectedFile ? selectedFile.name : ''),
          certPassword,
          certUploaded: isUploaded,
          updatedAt: new Date().toISOString(),
        }
      };

      await updateTenantConfig(tenant.id, newConfig);
      toast.success("Configuración e-CF guardada exitosamente");
      loadSequences();
    } catch (e: any) {
      console.error("Error e-CF config:", e);
      toast.error(e.message || "Error al procesar el certificado digital con Pronesoft");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateSequence = async (data: any) => {
    try {
      const token = await getEcfToken(undefined, undefined, env);
      await createTaxSequence(token, env, data);
      toast.success("Secuencia e-NCF creada correctamente");
      loadSequences();
    } catch (e: any) {
      toast.error(e.message || "Error al crear la secuencia");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
      {/* Principal Header & Status */}
      <Card className="border-neutral-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                Facturación Electrónica DGII (e-CF)
              </CardTitle>
              <CardDescription className="mt-1.5 text-neutral-500">
                Emisión oficial de comprobantes fiscales electrónicos firmados con Certificado Digital (.p12 / .pfx) vía Pronesoft SDK.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
                Pronesoft SDK Directo
              </span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          {/* Toggle Sandbox / Producción */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 bg-neutral-50/50">
            <div className="space-y-0.5">
              <Label className="text-base font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Modo Sandbox (Ambiente de Pruebas DGII)
              </Label>
              <p className="text-xs text-neutral-500">
                Activa esta opción para emitir e-CF en el ambiente de pruebas sin enviar comprobantes reales a la DGII.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn("text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full",
                env === 'sandbox' ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800")}>
                {env === 'sandbox' ? 'Pruebas (Sandbox)' : 'Producción Real'}
              </span>
              <Switch
                checked={env === 'sandbox'}
                onCheckedChange={(checked) => setEnv(checked ? 'sandbox' : 'production')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* RNC */}
            <div className="space-y-1.5">
              <Label className="font-bold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-neutral-500" />
                RNC de la Empresa *
              </Label>
              <Input
                value={rnc}
                onChange={(e) => setRnc(e.target.value)}
                className="h-11 rounded-xl font-bold bg-white"
                placeholder="Ej: 133190907 (o prefijo SBX...)"
              />
            </div>

            {/* Nombre o Razón Social */}
            <div className="space-y-1.5">
              <Label className="font-bold flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-neutral-500" />
                Nombre o Razón Social *
              </Label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="h-11 rounded-xl font-bold bg-white"
                placeholder="Ej: LUBRIMART SRL"
              />
            </div>
          </div>

          {/* Certificado Digital Section */}
          <div className="p-5 border border-dashed border-neutral-300 rounded-2xl bg-neutral-50/30 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-neutral-900 flex items-center gap-2 text-base">
                  <FileKey className="h-5 w-5 text-blue-600" />
                  Certificado Digital (.p12 / .pfx)
                </h4>
                <p className="text-xs text-neutral-500 mt-1">
                  Sube el archivo de tu firma digital emitido por una entidad de certificación autorizada por la DGII.
                </p>
              </div>
              {certUploaded && (
                <Badge className="bg-emerald-100 text-emerald-800 font-bold border-none px-3 py-1 text-xs">
                  <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Certificado Activo
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* File Selector */}
              <div className="space-y-1.5">
                <Label className="font-semibold text-xs text-neutral-700">Archivo del Certificado (.p12 / .pfx)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".p12,.pfx"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-11 rounded-xl justify-start font-medium text-xs bg-white border-neutral-200"
                >
                  <Upload className="h-4 w-4 mr-2 text-neutral-500" />
                  <span className="truncate">{certFileName || selectedFile?.name || "Seleccionar certificado .p12..."}</span>
                </Button>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <Label className="font-semibold text-xs text-neutral-700">Contraseña del Certificado</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={certPassword}
                    onChange={(e) => setCertPassword(e.target.value)}
                    className="h-11 rounded-xl font-mono text-sm bg-white pr-10"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              onClick={handleSaveAndUpload}
              disabled={isUploading}
              className="h-12 px-8 rounded-xl font-bold bg-black text-white hover:bg-neutral-800 shadow-sm cursor-pointer"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Registrando Certificado...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" /> Guardar Configuración e-CF
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Secuencias e-NCF */}
      <Card className="border-neutral-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-black">Secuencias e-NCF</CardTitle>
              <CardDescription className="text-neutral-500">
                Rangos de comprobantes fiscales electrónicos autorizados por la DGII.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={loadSequences} variant="outline" size="sm" className="h-9 rounded-lg font-bold">
                <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isLoadingSequences && "animate-spin")} />
                Actualizar
              </Button>
              <Button onClick={() => setShowDialog(true)} size="sm" className="h-9 rounded-lg font-bold bg-[#1B2B4D] hover:bg-[#121c32] text-white">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                AÑADIR SECUENCIA
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
              <h3 className="font-bold text-neutral-900">No hay secuencias registradas</h3>
              <p className="text-sm text-neutral-500 mt-1 max-w-sm">
                No tienes ninguna secuencia e-NCF activa. Haz clic en "AÑADIR SECUENCIA" para agregar un rango fiscal.
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

