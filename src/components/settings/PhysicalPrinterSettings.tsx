"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowRight,
  Bluetooth,
  MonitorDot,
  Usb,
  AlertTriangle,
  Printer,
  Wrench,
  Download,
  Zap,
  CheckCircle2,
  Copy,
  Check,
  HelpCircle,
  Unplug,
} from "lucide-react";
import {
  EscPosEncoder,
  printViaSerial,
  printViaBluetooth,
  connectSerialPort,
  connectBluetoothDevice,
  disconnectSerial,
  disconnectBluetooth,
  getAutoConnectedSerialPort,
  getActiveConnectionStatus,
  detectKioskEnvironment,
  downloadWindowsKioskInstaller,
} from "@/lib/escpos";
import { printThermalDocument } from "@/lib/thermalPrint";

export function PhysicalPrinterSettings() {
  const { printSettings, updatePrintSettings, currentTenant } = useStore();
  const [showKioskHelpModal, setShowKioskHelpModal] = useState(false);
  const [copiedFlag, setCopiedFlag] = useState<string | null>(null);
  const [portStatus, setPortStatus] = useState(() => getActiveConnectionStatus());
  const [kioskEnv, setKioskEnv] = useState(() => detectKioskEnvironment());

  const physicalSettings = printSettings.physicalPrinter || {
    connectionType: "usb",
    printProfile: "basic",
    isConfigured: false,
  };

  const setPhysicalSettings = (updates: Partial<typeof physicalSettings>) => {
    updatePrintSettings({
      physicalPrinter: { ...physicalSettings, ...updates },
    });
  };

  // Auto-detectar puertos previamente autorizados al cargar la pantalla (igual que Klynn)
  useEffect(() => {
    let mounted = true;
    const checkConnections = async () => {
      if (physicalSettings.connectionType === "serial") {
        await getAutoConnectedSerialPort(9600);
      }
      if (mounted) {
        setPortStatus(getActiveConnectionStatus());
        setKioskEnv(detectKioskEnvironment());
      }
    };
    checkConnections();
    return () => {
      mounted = false;
    };
  }, [physicalSettings.connectionType]);

  const copyCommand = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFlag(key);
    toast.success("Comando copiado al portapapeles");
    setTimeout(() => setCopiedFlag(null), 2000);
  };

  const handleDownloadDiagnostic = () => {
    const status = getActiveConnectionStatus();
    const env = detectKioskEnvironment();
    const diagnosticInfo = [
      `--- Diagnóstico de Impresora ServiTracks ---`,
      `Fecha: ${new Date().toLocaleString()}`,
      `Navegador: ${navigator.userAgent}`,
      `Navegador Detectado: ${env.browserName} (Chromium: ${env.isChromium ? "Sí" : "No"})`,
      `Modo Kiosco Activo: ${env.isStandaloneOrKioskWindow ? "Sí" : "No"}`,
      `Plataforma: ${navigator.platform}`,
      `Estado de Puertos Directos: ${JSON.stringify(status)}`,
      `Configuración de Impresión:`,
      JSON.stringify(printSettings, null, 2),
      `Estado Web Bluetooth: ${"bluetooth" in navigator ? "Soportado" : "No Soportado"}`,
      `Estado Web Serial: ${"serial" in navigator ? "Soportado" : "No Soportado"}`,
      `Estado Web USB: ${"usb" in navigator ? "Soportado" : "No Soportado"}`,
    ].join("\n");

    const blob = new Blob([diagnosticInfo], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `servitracks_impresora_diagnostico_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Archivo de diagnóstico descargado");
  };

  const handleConnectHardware = async () => {
    if (physicalSettings.connectionType === "serial") {
      const res = await connectSerialPort(9600);
      setPortStatus(getActiveConnectionStatus());
      if (res.success) {
        setPhysicalSettings({ isConfigured: true });
        toast.success(`Conectado a ${res.name}. Impresión directa activada.`);
      } else {
        toast.error(res.error || "No se pudo conectar al Puerto Serie.");
      }
    } else if (physicalSettings.connectionType === "bluetooth") {
      const res = await connectBluetoothDevice();
      setPortStatus(getActiveConnectionStatus());
      if (res.success) {
        setPhysicalSettings({ isConfigured: true });
        toast.success(`Conectado a ${res.name}. Impresión Bluetooth activada.`);
      } else {
        toast.error(res.error || "No se pudo conectar por Bluetooth.");
      }
    }
  };

  const handleDisconnectHardware = async () => {
    if (physicalSettings.connectionType === "serial") {
      await disconnectSerial();
    } else if (physicalSettings.connectionType === "bluetooth") {
      disconnectBluetooth();
    }
    setPortStatus(getActiveConnectionStatus());
    setPhysicalSettings({ isConfigured: false });
    toast.info("Puerto desconectado");
  };

  const handleTestBasic = () => {
    toast.info(
      printSettings.printInternalCopy
        ? "Enviando prueba de impresión (Ticket Cliente + Copia Interna)..."
        : "Enviando prueba de impresión térmica..."
    );

    const tempContainer = document.createElement("div");
    const widthCss = printSettings.paperSize === "58mm" ? "58mm" : "80mm";
    const businessName = currentTenant?.name || "ServiTracks Taller";

    const buildSampleTicketHtml = (isInternal: boolean) => `
      <div class="thermal-ticket" style="width: ${widthCss}; font-family: monospace; padding: 3mm 2.5mm; color: #000; background: #fff;">
        ${
          isInternal
            ? `<div class="internal-copy-banner" style="width: 100%; background-color: #000000; color: #ffffff; text-align: center; font-weight: 900; font-size: 13px; letter-spacing: 0.12em; padding: 6px 4px; margin-bottom: 8px; text-transform: uppercase; box-shadow: inset 0 0 0 1000px #000000;">COPIA INTERNA</div>`
            : ""
        }
        <div style="text-align: center; font-weight: 900; font-size: 16px; margin-bottom: 4px;">${businessName}</div>
        <div style="text-align: center; font-size: 11px; margin-bottom: 8px;">Prueba de Impresión Térmica (${widthCss})</div>
        <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
        <div style="font-size: 11px; display: flex; justify-content: space-between;">
          <span>Modo:</span>
          <strong>Navegador / Kiosco</strong>
        </div>
        <div style="font-size: 11px; display: flex; justify-content: space-between;">
          <span>Copia:</span>
          <strong>${isInternal ? "NEGOCIO (INTERNA)" : "ORIGINAL CLIENTE"}</strong>
        </div>
        <div style="font-size: 11px; display: flex; justify-content: space-between;">
          <span>Fecha:</span>
          <span>${new Date().toLocaleTimeString()}</span>
        </div>
        <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
        <div style="text-align: center; font-weight: 800; font-size: 12px; margin-top: 6px;">¡IMPRESIÓN CONFIGURADA!</div>
      </div>
    `;

    tempContainer.innerHTML =
      buildSampleTicketHtml(false) +
      (printSettings.printInternalCopy
        ? `<div class="ticket-separator"></div>` + buildSampleTicketHtml(true)
        : "");

    printThermalDocument({
      element: tempContainer,
      title: "Prueba_Ticket_ServiTracks",
      paperSize: (printSettings.paperSize as any) || "80mm",
    });
  };

  const handleTestEscPos = async () => {
    if (physicalSettings.connectionType === "usb") {
      handleTestBasic();
      return;
    }

    toast.info("Enviando prueba directa ESC/POS a la impresora...");

    try {
      const buildTicketBytes = (isInternalCopy: boolean) => {
        const encoder = new EscPosEncoder();
        encoder.initialize();

        if (isInternalCopy) {
          encoder
            .align("center")
            .invert(true)
            .bold(true)
            .line("         COPIA INTERNA          ")
            .invert(false)
            .bold(false)
            .emptyLines(1);
        }

        encoder.align("center").bold(true);

        if (
          physicalSettings.printProfile === "complete" ||
          physicalSettings.printProfile === "standard"
        ) {
          encoder.size(2, 2);
        }

        encoder
          .line(currentTenant?.name || "ServiTracks")
          .size(1, 1)
          .bold(false)
          .emptyLines(1)
          .line("Prueba de Impresion ESC/POS")
          .line(`Copia: ${isInternalCopy ? "INTERNA (NEGOCIO)" : "CLIENTE (ORIGINAL)"}`)
          .line(`Modo: ${physicalSettings.connectionType?.toUpperCase() || "DIRECTO"}`)
          .line(`Fecha: ${new Date().toLocaleString()}`)
          .emptyLines(1)
          .separator()
          .emptyLines(1)
          .bold(true)
          .line("CONEXION DIRECTA EXITOSA")
          .bold(false)
          .emptyLines(1)
          .cut(true);

        return encoder.encode();
      };

      const ticket1 = buildTicketBytes(false);
      let finalPayload = ticket1;

      if (printSettings.printInternalCopy) {
        const ticket2 = buildTicketBytes(true);
        const combined = new Uint8Array(ticket1.length + ticket2.length);
        combined.set(ticket1, 0);
        combined.set(ticket2, ticket1.length);
        finalPayload = combined;
      }

      if (physicalSettings.connectionType === "bluetooth") {
        await printViaBluetooth(finalPayload);
        setPortStatus(getActiveConnectionStatus());
        toast.success("Prueba enviada directamente por Bluetooth.");
      } else if (physicalSettings.connectionType === "serial") {
        await printViaSerial(finalPayload);
        setPortStatus(getActiveConnectionStatus());
        toast.success("Prueba enviada directamente por Puerto Serie.");
      }
    } catch (err: any) {
      toast.error(err.message || "No se pudo completar la impresión directa.");
    }
  };

  const isHardwareConnected =
    (physicalSettings.connectionType === "serial" && portStatus.serialConnected) ||
    (physicalSettings.connectionType === "bluetooth" && portStatus.bluetoothConnected) ||
    (physicalSettings.connectionType === "usb" &&
      (physicalSettings.isConfigured || kioskEnv.isStandaloneOrKioskWindow));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* ── BANNER DE MODO KIOSCO (IMPRESIÓN AUTOMÁTICA SIN DIÁLOGO) ── */}
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50/90 via-white to-emerald-50/40 shadow-sm">
        <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Zap className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-neutral-900 text-base">
                  Impresión Automática Instantánea (Modo Kiosco)
                </h3>
                {kioskEnv.isStandaloneOrKioskWindow && (
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                    Kiosco Configurado
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-600 max-w-2xl leading-relaxed">
                Imprime tus tickets de órdenes y ventas al instante sin que aparezca la ventana de vista previa de Windows/Chrome. Si tienes activada la <strong>Copia Interna</strong>, la impresora cortará automáticamente entre el ticket del cliente y el ticket del negocio.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto">
            <Button
              type="button"
              onClick={() => {
                downloadWindowsKioskInstaller(
                  typeof window !== "undefined" ? window.location.origin : undefined,
                  (printSettings.paperSize as any) || "80mm"
                );
                setKioskEnv(detectKioskEnvironment());
                toast.success(
                  "Instalador de Modo Kiosco descargado. Ejecútalo para crear el acceso directo automático."
                );
              }}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-4 gap-2 cursor-pointer shadow-xs"
            >
              <Download className="h-4 w-4" />
              Activar en 1 Clic (Windows)
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowKioskHelpModal(true)}
              className="rounded-xl border-emerald-300 text-emerald-800 hover:bg-emerald-100/60 font-bold text-xs h-10 px-3.5 gap-1.5 cursor-pointer bg-white"
            >
              <HelpCircle className="h-4 w-4 text-emerald-600" />
              Ver Guía Paso a Paso
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── CONNECTION TYPE ── */}
      <Card className="border-neutral-100 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <Printer className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Ajustes de Impresora Física</CardTitle>
              <CardDescription>
                Configura cómo se conecta tu impresora térmica al sistema.
              </CardDescription>
            </div>
          </div>
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-full border",
              isHardwareConnected
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-neutral-100 border-neutral-200 text-neutral-600"
            )}
          >
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                isHardwareConnected ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"
              )}
            />
            <span className="text-xs font-bold uppercase tracking-wider">
              {portStatus.deviceName ||
                (isHardwareConnected ? "Modo Kiosco / Driver Listo" : "No Conectada")}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Switch de Impresión Automática al Cobrar */}
          <div className="p-4 rounded-2xl border border-neutral-200/80 bg-neutral-50/70 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="font-bold text-sm text-neutral-900 block">
                Imprimir automáticamente al completar venta o cobro
              </span>
              <span className="text-xs text-neutral-500 block">
                Envía el ticket (y la copia interna si está activa) directamente a la impresora al finalizar el cobro.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={printSettings.autoPrint !== false}
              onClick={() => {
                const next = printSettings.autoPrint === false;
                updatePrintSettings({ autoPrint: next });
                toast.success(
                  next
                    ? "Impresión automática al cobrar activada"
                    : "Impresión automática al cobrar desactivada"
                );
              }}
              className={cn(
                "h-7 w-12 rounded-full transition-all relative cursor-pointer border-none shrink-0",
                printSettings.autoPrint !== false ? "bg-emerald-600" : "bg-neutral-300"
              )}
            >
              <div
                className={cn(
                  "absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-all",
                  printSettings.autoPrint !== false ? "left-6" : "left-1"
                )}
              />
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="text-base font-bold text-neutral-900">Tipo de conexión</h3>
            <p className="text-sm text-neutral-500">
              Selecciona cómo está conectada tu impresora para configurarla.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              {[
                {
                  id: "usb",
                  icon: Usb,
                  title: "USB / Modo Kiosco (Win/Mac)",
                  subtitle: "Driver de Windows o --kiosk-printing",
                },
                {
                  id: "serial",
                  icon: MonitorDot,
                  title: "Puerto Serie Directo",
                  subtitle: "COM / USB-Serial sin diálogo",
                },
                {
                  id: "bluetooth",
                  icon: Bluetooth,
                  title: "Bluetooth Directo",
                  subtitle: "Impresoras térmicas inalámbricas",
                },
              ].map((conn) => {
                const isActive = physicalSettings.connectionType === conn.id;
                return (
                  <button
                    key={conn.id}
                    type="button"
                    onClick={() =>
                      setPhysicalSettings({
                        connectionType: conn.id as any,
                        isConfigured: conn.id === "usb" ? true : portStatus.serialConnected || portStatus.bluetoothConnected,
                      })
                    }
                    className={cn(
                      "flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all cursor-pointer text-center",
                      isActive
                        ? "border-emerald-600 bg-emerald-50/30 text-emerald-700 shadow-sm ring-4 ring-emerald-50"
                        : "border-neutral-200 hover:border-emerald-200 hover:bg-neutral-50 text-neutral-600"
                    )}
                  >
                    <conn.icon
                      className={cn(
                        "h-8 w-8 mb-3",
                        isActive ? "text-emerald-600" : "text-neutral-400"
                      )}
                    />
                    <span className="font-bold text-[15px]">{conn.title}</span>
                    <span className="text-xs mt-1 opacity-70">{conn.subtitle}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* USB / Kiosk Mode Specific Instructions */}
          {physicalSettings.connectionType === "usb" && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 leading-relaxed">
                  <strong>Recomendación para Impresión Silenciosa:</strong> Conecta tu impresora por USB, establécela como <strong>Impresora Predeterminada en Windows</strong> y activa el <strong>Modo Kiosco</strong> arriba para que los tickets salgan automáticamente sin mostrar la ventana de impresión.
                </p>
              </div>

              <div className="space-y-3 px-2">
                {[
                  "Conecta tu impresora por USB e instala su controlador en Windows o Mac",
                  "Márcala como 'Impresora predeterminada' en la configuración de tu equipo",
                  "Descarga y ejecuta el Configurador de Modo Kiosco (o agrega --kiosk-printing a tu navegador) para impresión 100% directa",
                ].map((step, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {idx + 1}
                    </div>
                    <span className="text-sm text-neutral-700 font-medium">{step}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  type="button"
                  className="w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 h-12 text-sm font-bold shadow-sm cursor-pointer"
                  onClick={() => {
                    setPhysicalSettings({ isConfigured: true });
                    toast.success("Modo Controlador de Sistema / Kiosco activado.");
                  }}
                >
                  <MonitorDot className="h-5 w-5 mr-2" /> Guardar como Impresora del Sistema
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-xl border-emerald-300 text-emerald-800 hover:bg-emerald-50 h-12 text-sm font-bold cursor-pointer"
                  onClick={() => setShowKioskHelpModal(true)}
                >
                  <Zap className="h-5 w-5 mr-2 text-emerald-600" /> Configurar Modo Kiosco Silencioso
                </Button>
              </div>
            </div>
          )}

          {/* Bluetooth / Serial Direct Actions */}
          {(physicalSettings.connectionType === "bluetooth" ||
            physicalSettings.connectionType === "serial") && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200 pt-2">
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 flex gap-3">
                <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800 leading-relaxed">
                  <strong>Conexión Directa al Hardware</strong> — El sistema recordará el puerto autorizado durante toda la sesión y reconectará automáticamente sin volver a pedir confirmación.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  className="flex-1 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 h-12 text-base font-bold shadow-sm cursor-pointer"
                  onClick={handleConnectHardware}
                >
                  <MonitorDot className="h-5 w-5 mr-2" />
                  {portStatus.serialConnected || portStatus.bluetoothConnected
                    ? `Reconectar ${
                        physicalSettings.connectionType === "bluetooth"
                          ? "Impresora Bluetooth"
                          : "Puerto Serie (COM)"
                      }`
                    : `Vincular ${
                        physicalSettings.connectionType === "bluetooth"
                          ? "Impresora Bluetooth"
                          : "Puerto Serie (COM)"
                      }`}
                </Button>
                {(portStatus.serialConnected || portStatus.bluetoothConnected) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDisconnectHardware}
                    className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 h-12 px-4 font-bold cursor-pointer"
                  >
                    <Unplug className="h-4 w-4 mr-2" /> Desconectar
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── PRINT PROFILE & TESTING ── */}
      <Card className="border-neutral-100 shadow-sm">
        <CardHeader>
          <button
            type="button"
            onClick={() => setShowKioskHelpModal(true)}
            className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-bold text-sm cursor-pointer justify-center mb-3 bg-emerald-50/70 hover:bg-emerald-50 py-2 px-4 rounded-xl border border-emerald-200/70 transition-colors w-fit mx-auto"
          >
            <Wrench className="h-4 w-4" /> ¿Cómo activar la impresión automática instantánea (Modo Kiosco)?
          </button>
          <CardTitle>Perfil de impresión</CardTitle>
          <CardDescription>Elige según la calidad de tu impresora térmica.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                id: "basic",
                icon: Printer,
                title: "Básica",
                subtitle: "Compatible con todas las impresoras",
                extra: "",
              },
              {
                id: "standard",
                icon: MonitorDot,
                title: "Estándar",
                subtitle: "Título y total en tamaño doble",
                extra: "Si el ticket sale cortado o con símbolos raros, cambia a Básica.",
              },
              {
                id: "complete",
                icon: Wrench,
                title: "Completa",
                subtitle: "Todo en tamaño doble + logo grande",
                extra: "",
              },
            ].map((prof) => {
              const isActive = physicalSettings.printProfile === prof.id;
              return (
                <div key={prof.id} className="space-y-2 relative">
                  <button
                    type="button"
                    onClick={() => setPhysicalSettings({ printProfile: prof.id as any })}
                    className={cn(
                      "w-full flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all cursor-pointer text-center relative",
                      isActive
                        ? "border-emerald-500 bg-emerald-50/10 text-emerald-700"
                        : "border-neutral-200 hover:border-emerald-200 text-neutral-600"
                    )}
                  >
                    {isActive && (
                      <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                    )}
                    <prof.icon
                      className={cn(
                        "h-6 w-6 mb-2",
                        isActive ? "text-emerald-500" : "text-neutral-400"
                      )}
                    />
                    <span className="font-bold text-sm">{prof.title}</span>
                    <span className="text-[11px] mt-0.5 opacity-70">{prof.subtitle}</span>
                  </button>
                  {prof.extra && isActive && (
                    <p className="text-[10px] text-center text-neutral-500 px-2 absolute -bottom-5 w-full">
                      {prof.extra}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <Button
            type="button"
            className="w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 h-11 font-bold mt-2 shadow-sm cursor-pointer"
            onClick={() => toast.success("Perfil de impresión guardado")}
          >
            Guardar configuración
          </Button>

          <div className="pt-6 border-t border-neutral-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-neutral-900">Imprimir prueba</h4>
                <p className="text-sm text-neutral-500">
                  Realiza un test para verificar el corte de papel y el formato (incluye Copia Interna si está activa).
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Lista</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={handleTestBasic}
                className="flex items-center justify-between p-4 rounded-xl border border-blue-100 bg-blue-50/50 hover:bg-blue-50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Printer className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <span className="block font-bold text-neutral-900">
                      Prueba Modo Kiosco / Windows
                    </span>
                    <span className="block text-xs text-neutral-500">
                      {printSettings.printInternalCopy
                        ? "Imprime 2 tickets separados (Cliente + Copia Interna)"
                        : "Prueba de ticket térmico con corte automático"}
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-blue-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </button>

              <button
                type="button"
                onClick={handleTestEscPos}
                className="flex items-center justify-between p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Printer className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <span className="block font-bold text-neutral-900">Prueba ESC/POS Directa</span>
                    <span className="block text-xs text-neutral-500">
                      Comandos nativos por Puerto Serie / Bluetooth
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-emerald-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── DIAGNOSTICS ── */}
      <Card className="border-neutral-100 shadow-sm bg-neutral-50/50">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <h4 className="font-bold text-neutral-900">¿Problemas con tu impresora?</h4>
            <p className="text-sm text-neutral-500">
              Descarga un archivo de diagnóstico con tu configuración, sistema operativo y registro de puertos.
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 font-bold h-11 cursor-pointer"
              onClick={handleDownloadDiagnostic}
            >
              <Wrench className="h-4 w-4 mr-2" /> Descargar diagnóstico (.txt)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── MODAL DE GUÍA DE MODO KIOSCO (IDÉNTICO A KLYNN) ── */}
      <Dialog open={showKioskHelpModal} onOpenChange={setShowKioskHelpModal}>
        <DialogContent className="sm:max-w-xl rounded-2xl p-6 bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-neutral-900">
                  Impresión Automática (Modo Kiosco)
                </DialogTitle>
                <DialogDescription className="text-xs text-neutral-500">
                  Haz que los tickets se impriman al instante sin que aparezca el cuadro de diálogo del navegador.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 py-2 text-sm text-neutral-700">
            {/* Opción Automática 1 Clic */}
            <div className="p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-emerald-950 text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Opción 1: Configurador Automático para Windows (Recomendado)
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-600 text-white">
                  1 Clic
                </span>
              </div>
              <p className="text-xs text-emerald-900 leading-relaxed">
                Descarga y abre nuestro asistente automático. Detectará tu navegador (Chrome o Edge), configurará el papel térmico sin márgenes ni encabezados y creará en tu Escritorio el acceso directo <strong>&ldquo;ServiTracks (Impresión Automática)&rdquo;</strong>.
              </p>
              <Button
                type="button"
                onClick={() => {
                  downloadWindowsKioskInstaller(
                    typeof window !== "undefined" ? window.location.origin : undefined,
                    (printSettings.paperSize as any) || "80mm"
                  );
                  setKioskEnv(detectKioskEnvironment());
                  toast.success("Instalador descargado. Ábrelo desde tus descargas.");
                }}
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 gap-2 cursor-pointer"
              >
                <Download className="h-4 w-4" />
                Descargar Activador Automático (.bat)
              </Button>
            </div>

            {/* Opción Manual Windows */}
            <div className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50 space-y-2.5">
              <h4 className="font-bold text-neutral-900 text-sm">
                Opción 2: Configuración Manual en Windows (Chrome / Edge / Brave)
              </h4>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-neutral-600 leading-relaxed">
                <li>
                  Asegúrate de que tu impresora térmica esté marcada como{" "}
                  <strong className="text-neutral-900">Impresora Predeterminada</strong> en Windows.
                </li>
                <li>
                  Haz clic derecho sobre el icono de <strong>Google Chrome</strong> o{" "}
                  <strong>Microsoft Edge</strong> en tu Escritorio y selecciona{" "}
                  <strong>Propiedades</strong>.
                </li>
                <li>
                  En el campo <strong>Destino</strong>, ve hasta el final (después de las comillas), deja un espacio y pega este parámetro:
                </li>
              </ol>
              <div className="flex items-center justify-between gap-2 bg-neutral-900 text-emerald-400 font-mono text-xs px-3 py-2.5 rounded-xl">
                <code>--kiosk-printing</code>
                <button
                  type="button"
                  onClick={() => copyCommand("--kiosk-printing", "win")}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[11px] font-sans font-bold cursor-pointer"
                >
                  {copiedFlag === "win" ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" /> Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" /> Copiar
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-neutral-500">
                4. Haz clic en <strong>Aplicar</strong>, cierra todas las ventanas del navegador y vuelve a abrirlo desde ese acceso directo.
              </p>
            </div>

            {/* Opción macOS */}
            <div className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50 space-y-2">
              <h4 className="font-bold text-neutral-900 text-sm">Opción 3: En macOS (Terminal)</h4>
              <p className="text-xs text-neutral-600">
                Cierra Google Chrome y ejecuta el siguiente comando en la aplicación Terminal:
              </p>
              <div className="flex items-center justify-between gap-2 bg-neutral-900 text-emerald-400 font-mono text-xs px-3 py-2.5 rounded-xl">
                <code className="truncate">open -a &quot;Google Chrome&quot; --args --kiosk-printing</code>
                <button
                  type="button"
                  onClick={() =>
                    copyCommand('open -a "Google Chrome" --args --kiosk-printing', "mac")
                  }
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[11px] font-sans font-bold shrink-0 cursor-pointer"
                >
                  {copiedFlag === "mac" ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" /> Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" /> Copiar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={() => setShowKioskHelpModal(false)}
              className="rounded-xl bg-black text-white hover:bg-neutral-800 text-xs font-bold h-10 px-5 cursor-pointer"
            >
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
