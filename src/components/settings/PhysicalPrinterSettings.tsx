"use client";

import { useState } from "react";
import { useStore } from "@/store/useStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowRight, Bluetooth, MonitorDot, Usb, AlertTriangle, Printer, Wrench, Download } from "lucide-react";
import { EscPosEncoder, printViaSerial, printViaBluetooth } from "@/lib/escpos";

export function PhysicalPrinterSettings() {
  const { printSettings, updatePrintSettings } = useStore();
  
  // Provide defaults in case they are missing in older stores
  const physicalSettings = printSettings.physicalPrinter || {
    connectionType: 'usb',
    printProfile: 'basic',
    isConfigured: false,
  };

  const setPhysicalSettings = (updates: Partial<typeof physicalSettings>) => {
    updatePrintSettings({
      physicalPrinter: { ...physicalSettings, ...updates }
    });
  };

  const handleDownloadDiagnostic = () => {
    const diagnosticInfo = [
      `--- Diagnóstico de Impresora ServiTracks ---`,
      `Fecha: ${new Date().toLocaleString()}`,
      `Navegador: ${navigator.userAgent}`,
      `Plataforma: ${navigator.platform}`,
      `Configuración de Impresión:`,
      JSON.stringify(printSettings, null, 2),
      `Estado Web Bluetooth: ${'bluetooth' in navigator ? 'Soportado' : 'No Soportado'}`,
      `Estado Web Serial: ${'serial' in navigator ? 'Soportado' : 'No Soportado'}`,
      `Estado Web USB: ${'usb' in navigator ? 'Soportado' : 'No Soportado'}`,
    ].join('\n');

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

  const handleTestBasic = () => {
    toast.info("Generando prueba de impresión...");
    if (physicalSettings.connectionType === 'usb') {
      // In USB mode, we just use the browser's native print
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Prueba de Impresión</title>
              <style>
                body { font-family: monospace; padding: 20px; font-size: 14px; text-align: center; }
                h1 { font-size: 18px; margin-bottom: 10px; }
                p { margin: 5px 0; }
                .separator { border-top: 1px dashed #000; margin: 15px 0; }
              </style>
            </head>
            <body>
              <h1>ServiTracks</h1>
              <p>Prueba Básica de Impresión (USB)</p>
              <div class="separator"></div>
              <p>Perfil: ${physicalSettings.printProfile}</p>
              <p>Fecha: ${new Date().toLocaleString()}</p>
              <div class="separator"></div>
              <p>¡Configuración exitosa!</p>
              <script>
                window.onload = () => {
                  window.print();
                  setTimeout(() => window.close(), 500);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } else {
      toast.error("Para pruebas directas (Bluetooth/Serial), usa el botón 'Prueba ESC/POS'");
    }
  };

  const handleTestEscPos = async () => {
    if (physicalSettings.connectionType === 'usb') {
      toast.error("Prueba ESC/POS no está disponible en modo USB. Usa la Prueba básica.");
      return;
    }
    
    toast.info("Conectando con la impresora para prueba ESC/POS...");
    
    try {
      const encoder = new EscPosEncoder();
      
      // Build a test receipt
      encoder.initialize()
             .align('center')
             .bold(true);
      
      if (physicalSettings.printProfile === 'complete' || physicalSettings.printProfile === 'standard') {
        encoder.size(2, 2);
      }
      
      encoder.line('ServiTracks')
             .size(1, 1)
             .bold(false)
             .emptyLines(1)
             .line('Prueba de Impresion')
             .line(`Modo: ${physicalSettings.connectionType?.toUpperCase() || 'DESCONOCIDO'}`)
             .line(`Perfil: ${physicalSettings.printProfile.toUpperCase()}`)
             .line(`Fecha: ${new Date().toLocaleString()}`)
             .emptyLines(1)
             .separator()
             .emptyLines(1)
             .bold(true)
             .line('CONEXION EXITOSA')
             .bold(false)
             .emptyLines(1)
             .cut(true);
             
      const data = encoder.encode();
      
      if (physicalSettings.connectionType === 'bluetooth') {
        await printViaBluetooth(data);
        toast.success("Impresión enviada por Bluetooth.");
      } else if (physicalSettings.connectionType === 'serial') {
        await printViaSerial(data);
        toast.success("Impresión enviada por Puerto Serie.");
      }
    } catch (err: any) {
      toast.error(err.message || "No se pudo completar la impresión.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* ── CONNECTION TYPE ── */}
      <Card className="border-neutral-100 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <Printer className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Ajustes de Impresora Física</CardTitle>
              <CardDescription>Configura cómo se conecta tu impresora térmica al sistema.</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-neutral-100 rounded-full">
            <div className={cn("h-2 w-2 rounded-full", physicalSettings.isConfigured ? "bg-emerald-500" : "bg-neutral-400")} />
            <span className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
              {physicalSettings.isConfigured ? "Conectada" : "No Conectada"}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-base font-bold text-neutral-900">Tipo de conexión</h3>
            <p className="text-sm text-neutral-500">Selecciona cómo está conectada tu impresora para configurarla.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              {[
                { id: "bluetooth", icon: Bluetooth, title: "Bluetooth", subtitle: "Impresoras inalámbricas" },
                { id: "serial", icon: MonitorDot, title: "Puerto Serie", subtitle: "COM / TTL directo" },
                { id: "usb", icon: Usb, title: "USB (Mac/Win)", subtitle: "Driver instalado en el equipo" },
              ].map((conn) => {
                const isActive = physicalSettings.connectionType === conn.id;
                return (
                  <button
                    key={conn.id}
                    onClick={() => setPhysicalSettings({ connectionType: conn.id as any, isConfigured: false })}
                    className={cn(
                      "flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all cursor-pointer text-center",
                      isActive 
                        ? "border-emerald-600 bg-emerald-50/30 text-emerald-700 shadow-sm ring-4 ring-emerald-50" 
                        : "border-neutral-200 hover:border-emerald-200 hover:bg-neutral-50 text-neutral-600"
                    )}
                  >
                    <conn.icon className={cn("h-8 w-8 mb-3", isActive ? "text-emerald-600" : "text-neutral-400")} />
                    <span className="font-bold text-[15px]">{conn.title}</span>
                    <span className="text-xs mt-1 opacity-70">{conn.subtitle}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* USB Specific Instructions */}
          {physicalSettings.connectionType === "usb" && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 leading-relaxed">
                  <strong>Driver requerido</strong> — Si imprime caracteres extraños o código, tu impresora está usando el driver "Generic PostScript". Busca e instala el driver específico de tu modelo (Epson, Star, Xprinter, etc.) desde el sitio del fabricante.
                </p>
              </div>

              <div className="space-y-3 px-2">
                {[
                  "Conecta tu impresora por USB e instala el driver del fabricante",
                  "Verifica que funciona imprimiendo una página de prueba desde tu sistema operativo",
                  "Haz clic en el botón de abajo. Al imprimir un ticket, selecciona tu impresora en el diálogo del navegador"
                ].map((step, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {idx + 1}
                    </div>
                    <span className="text-sm text-neutral-700 font-medium">{step}</span>
                  </div>
                ))}
              </div>

              <Button 
                className="w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 h-12 text-base font-bold shadow-sm"
                onClick={() => {
                  setPhysicalSettings({ isConfigured: true });
                  toast.success("Modo Impresora Windows configurado. Recuerda seleccionarla al imprimir.");
                }}
              >
                <MonitorDot className="h-5 w-5 mr-2" /> Guardar como Impresora Windows
              </Button>
            </div>
          )}

          {/* Bluetooth / Serial Actions */}
          {(physicalSettings.connectionType === "bluetooth" || physicalSettings.connectionType === "serial") && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200 pt-4">
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 flex gap-3">
                <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800 leading-relaxed">
                  <strong>Conexión Directa</strong> — El navegador te pedirá permiso para emparejar la impresora. Asegúrate de que la impresora esté encendida.
                </p>
              </div>
              <Button 
                className="w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 h-12 text-base font-bold shadow-sm"
                onClick={() => {
                  setPhysicalSettings({ isConfigured: true });
                  toast.success(`Modo ${physicalSettings.connectionType?.toUpperCase()} habilitado. Realiza una prueba ESC/POS abajo para confirmar.`);
                }}
              >
                <MonitorDot className="h-5 w-5 mr-2" /> Habilitar {physicalSettings.connectionType === 'bluetooth' ? 'Bluetooth' : 'Puerto Serie'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── PRINT PROFILE & TESTING ── */}
      <Card className="border-neutral-100 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm cursor-help justify-center mb-4">
            <Wrench className="h-4 w-4" /> ¿Cómo activar la impresión automática instantánea?
          </div>
          <CardTitle>Perfil de impresión</CardTitle>
          <CardDescription>Elige según la calidad de tu impresora térmica.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: "basic", icon: Printer, title: "Básica", subtitle: "Compatible con todas las impresoras", extra: "" },
              { id: "standard", icon: MonitorDot, title: "Estándar", subtitle: "Título y total en tamaño doble", extra: "Si el ticket sale cortado o con símbolos raros, cambia a Básica." },
              { id: "complete", icon: Wrench, title: "Completa", subtitle: "Todo en tamaño doble + logo grande", extra: "" },
            ].map((prof) => {
              const isActive = physicalSettings.printProfile === prof.id;
              return (
                <div key={prof.id} className="space-y-2 relative">
                  <button
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
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                    )}
                    <prof.icon className={cn("h-6 w-6 mb-2", isActive ? "text-emerald-500" : "text-neutral-400")} />
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
            className="w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 h-11 font-bold mt-2 shadow-sm"
            onClick={() => toast.success("Perfil de impresión guardado")}
          >
            ✓ Guardar configuración
          </Button>
          
          <div className="pt-6 border-t border-neutral-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-neutral-900">Imprimir prueba</h4>
                <p className="text-sm text-neutral-500">Realiza un test para verificar que la conexión y el formato de impresión sean correctos.</p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Conectada</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={handleTestBasic}
                className="flex items-center justify-between p-4 rounded-xl border border-blue-100 bg-blue-50/50 hover:bg-blue-50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Printer className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <span className="block font-bold text-neutral-900">Prueba básica</span>
                    <span className="block text-xs text-neutral-500">Texto sin formato</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-blue-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </button>

              <button 
                onClick={handleTestEscPos}
                className="flex items-center justify-between p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Printer className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <span className="block font-bold text-neutral-900">Prueba ESC/POS</span>
                    <span className="block text-xs text-neutral-500">Negritas, alineación y corte</span>
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
              Descarga un archivo de diagnóstico con tu configuración, sistema operativo y registro de errores. Envíalo a soporte por WhatsApp.
            </p>
            <Button 
              variant="outline" 
              className="w-full rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 font-bold h-11"
              onClick={handleDownloadDiagnostic}
            >
              <Wrench className="h-4 w-4 mr-2" /> Descargar diagnóstico (.txt)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
