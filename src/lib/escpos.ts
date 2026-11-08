/**
 * ESC/POS encoder & Direct Hardware Printer Manager (Web Serial, Web USB, Web Bluetooth).
 * Ported from Klynn Cloud's automatic port detection & Kiosk printing architecture.
 */

// ─── Persistent Hardware Connections (Session-level) ──────────────────────────
let activeSerialPort: any = null;
let activeUsbDevice: any = null;
let activeUsbInterface = 0;
let activeUsbEndpoint = 1;
let activeBluetoothDevice: any = null;
let activeBluetoothCharacteristic: any = null;

export function isSerialSupported(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

export function isUsbSupported(): boolean {
  return typeof navigator !== "undefined" && "usb" in navigator;
}

export function isBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

export async function listAuthorizedSerialPorts(): Promise<any[]> {
  if (!isSerialSupported()) return [];
  try {
    return await (navigator as any).serial.getPorts();
  } catch {
    return [];
  }
}

/**
 * Automatically reconnects to a previously authorized Serial port without opening a browser picker.
 */
export async function getAutoConnectedSerialPort(baudRate = 9600): Promise<any | null> {
  if (activeSerialPort && activeSerialPort.writable) {
    return activeSerialPort;
  }
  if (!isSerialSupported()) return null;

  try {
    const ports = await (navigator as any).serial.getPorts();
    if (ports.length > 0) {
      const port = ports[0];
      if (!port.writable) {
        await port.open({ baudRate });
      }
      activeSerialPort = port;
      return port;
    }
  } catch (e) {
    console.warn("No se pudo reconectar automáticamente al puerto serial:", e);
  }
  return null;
}

/**
 * Automatically reconnects to a previously authorized WebUSB thermal printer without opening a picker.
 */
export async function getAutoConnectedUsbDevice(): Promise<{ device: any; endpoint: number } | null> {
  if (activeUsbDevice && activeUsbDevice.opened) {
    return { device: activeUsbDevice, endpoint: activeUsbEndpoint };
  }
  if (!isUsbSupported()) return null;

  try {
    const devices = await (navigator as any).usb.getDevices();
    if (devices.length > 0) {
      const device = devices[0];
      if (!device.opened) {
        await device.open();
      }
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }

      let ifaceNum = 0;
      let endpointNum = 1;
      const interfaces = device.configuration?.interfaces || [];
      for (const iface of interfaces) {
        for (const alt of iface.alternates) {
          if (alt.interfaceClass === 7 || interfaces.length === 1) {
            ifaceNum = iface.interfaceNumber;
            for (const ep of alt.endpoints) {
              if (ep.direction === "out" && ep.type === "bulk") {
                endpointNum = ep.endpointNumber;
                break;
              }
            }
          }
        }
      }

      try {
        await device.claimInterface(ifaceNum);
      } catch (e) {
        console.warn("Interfaz USB ya reclamada o restringida:", e);
      }

      activeUsbDevice = device;
      activeUsbInterface = ifaceNum;
      activeUsbEndpoint = endpointNum;
      return { device, endpoint: endpointNum };
    }
  } catch (e) {
    console.warn("No se pudo reconectar automáticamente al dispositivo USB:", e);
  }
  return null;
}

/**
 * Prompts the user to select and connect a Serial Port, keeping it open for the session.
 */
export async function connectSerialPort(baudRate = 9600): Promise<{ success: boolean; name?: string; error?: string }> {
  if (!isSerialSupported()) {
    return {
      success: false,
      error: "Tu navegador no soporta Web Serial. Usa Google Chrome o Microsoft Edge en PC.",
    };
  }

  try {
    if (activeSerialPort) {
      try {
        await activeSerialPort.close();
      } catch {}
      activeSerialPort = null;
    }

    const port = await (navigator as any).serial.requestPort();
    await port.open({ baudRate });
    activeSerialPort = port;

    const info = port.getInfo?.() || {};
    const name = info.usbVendorId
      ? `Impresora Serial (VID:${info.usbVendorId.toString(16).toUpperCase()})`
      : `Puerto Serial (${baudRate} baud)`;
    return { success: true, name };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "No se seleccionó ningún puerto o está ocupado por otro programa.",
    };
  }
}

/**
 * Prompts the user to select and connect a WebUSB thermal printer.
 */
export async function connectUsbDevice(): Promise<{ success: boolean; name?: string; error?: string }> {
  if (!isUsbSupported()) {
    return {
      success: false,
      error: "Tu navegador no soporta WebUSB. Usa Google Chrome o Microsoft Edge.",
    };
  }

  try {
    const device = await (navigator as any).usb.requestDevice({ filters: [] });
    await device.open();
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }

    let ifaceNum = 0;
    let endpointNum = 1;
    const interfaces = device.configuration?.interfaces || [];
    for (const iface of interfaces) {
      for (const alt of iface.alternates) {
        if (alt.interfaceClass === 7 || interfaces.length === 1) {
          ifaceNum = iface.interfaceNumber;
          for (const ep of alt.endpoints) {
            if (ep.direction === "out" && ep.type === "bulk") {
              endpointNum = ep.endpointNumber;
              break;
            }
          }
        }
      }
    }

    await device.claimInterface(ifaceNum);
    activeUsbDevice = device;
    activeUsbInterface = ifaceNum;
    activeUsbEndpoint = endpointNum;

    return {
      success: true,
      name: device.productName || device.manufacturerName || "Impresora Térmica USB",
    };
  } catch (err: any) {
    return {
      success: false,
      error:
        err?.message ||
        "No se pudo reclamar el puerto USB. En Windows, si el driver bloquea WebUSB, usa Modo Kiosco o Puerto Serial.",
    };
  }
}

/**
 * Prompts the user to select and connect a Bluetooth BLE thermal printer.
 */
export async function connectBluetoothDevice(): Promise<{ success: boolean; name?: string; error?: string }> {
  if (!isBluetoothSupported()) {
    return {
      success: false,
      error: "Tu navegador no soporta Web Bluetooth. Usa Chrome o Edge.",
    };
  }

  const KNOWN_SERVICES = [
    "000018f0-0000-1000-8000-00805f9b34fb",
    "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
    "49535343-fe7d-4ae5-8fa9-9fafd205e455",
    "0000ff00-0000-1000-8000-00805f9b34fb",
    "0000ffe0-0000-1000-8000-00805f9b34fb",
  ];

  try {
    const device = await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: KNOWN_SERVICES,
    });

    const server = await device.gatt.connect();
    let targetChar: any = null;

    for (const serviceUuid of KNOWN_SERVICES) {
      try {
        const service = await server.getPrimaryService(serviceUuid);
        const chars = await service.getCharacteristics();
        for (const c of chars) {
          if (c.properties.write || c.properties.writeWithoutResponse) {
            targetChar = c;
            break;
          }
        }
        if (targetChar) break;
      } catch {
        // Check next service UUID
      }
    }

    if (!targetChar) {
      const services = await server.getPrimaryServices();
      for (const service of services) {
        const chars = await service.getCharacteristics();
        for (const c of chars) {
          if (c.properties.write || c.properties.writeWithoutResponse) {
            targetChar = c;
            break;
          }
        }
        if (targetChar) break;
      }
    }

    if (!targetChar) {
      return {
        success: false,
        error: "Se conectó al dispositivo Bluetooth, pero no se encontró un canal de escritura compatible.",
      };
    }

    activeBluetoothDevice = device;
    activeBluetoothCharacteristic = targetChar;

    return {
      success: true,
      name: device.name || "Impresora Térmica Bluetooth",
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Conexión Bluetooth cancelada o fallida.",
    };
  }
}

export async function disconnectSerial(): Promise<void> {
  if (activeSerialPort) {
    try {
      await activeSerialPort.close();
    } catch {}
    activeSerialPort = null;
  }
}

export async function disconnectUsb(): Promise<void> {
  if (activeUsbDevice) {
    try {
      await activeUsbDevice.releaseInterface(activeUsbInterface);
      await activeUsbDevice.close();
    } catch {}
    activeUsbDevice = null;
  }
}

export function disconnectBluetooth(): void {
  if (activeBluetoothDevice?.gatt?.connected) {
    try {
      activeBluetoothDevice.gatt.disconnect();
    } catch {}
  }
  activeBluetoothDevice = null;
  activeBluetoothCharacteristic = null;
}

export function getActiveConnectionStatus(): {
  serialConnected: boolean;
  usbConnected: boolean;
  bluetoothConnected: boolean;
  deviceName: string | null;
} {
  const serialConnected = Boolean(activeSerialPort && activeSerialPort.writable);
  const usbConnected = Boolean(activeUsbDevice && activeUsbDevice.opened);
  const bluetoothConnected = Boolean(
    activeBluetoothDevice?.gatt?.connected && activeBluetoothCharacteristic
  );

  let deviceName: string | null = null;
  if (usbConnected) {
    deviceName = activeUsbDevice.productName || "Impresora USB Conectada";
  } else if (bluetoothConnected) {
    deviceName = activeBluetoothDevice.name || "Impresora Bluetooth Conectada";
  } else if (serialConnected) {
    deviceName = "Puerto Serial Activo";
  }

  return { serialConnected, usbConnected, bluetoothConnected, deviceName };
}

/**
 * Sends raw ESC/POS bytes directly to an active or previously-authorized hardware port.
 */
export async function printDirectRaw(
  bytes: Uint8Array,
  preferredType?: "serial" | "usb" | "bluetooth" | null,
  baudRate = 9600
): Promise<boolean> {
  // 1. Try Serial Port (if preferred or already active)
  if (!preferredType || preferredType === "serial") {
    const port = await getAutoConnectedSerialPort(baudRate);
    if (port && port.writable) {
      try {
        const writer = port.writable.getWriter();
        await writer.write(bytes);
        writer.releaseLock();
        return true;
      } catch (e) {
        console.error("Error escribiendo en puerto serial:", e);
        activeSerialPort = null;
      }
    }
  }

  // 2. Try Bluetooth (if preferred or already active)
  if (!preferredType || preferredType === "bluetooth") {
    if (activeBluetoothDevice?.gatt?.connected && activeBluetoothCharacteristic) {
      try {
        const CHUNK_SIZE = 128;
        for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
          const slice = bytes.slice(i, i + CHUNK_SIZE);
          if (activeBluetoothCharacteristic.properties.writeWithoutResponse) {
            await activeBluetoothCharacteristic.writeValueWithoutResponse(slice);
          } else {
            await activeBluetoothCharacteristic.writeValue(slice);
          }
        }
        return true;
      } catch (e) {
        console.error("Error escribiendo en impresora Bluetooth:", e);
        activeBluetoothCharacteristic = null;
      }
    }
  }

  // 3. Try WebUSB (only if explicitly connected)
  if (activeUsbDevice && activeUsbDevice.opened) {
    try {
      await activeUsbDevice.transferOut(activeUsbEndpoint, bytes);
      return true;
    } catch (e) {
      console.error("Error escribiendo en puerto WebUSB:", e);
      activeUsbDevice = null;
    }
  }

  return false;
}

/**
 * Detects if the current browser appears to be running in a dedicated Kiosk profile or standalone window.
 */
export function detectKioskEnvironment(): {
  isStandaloneOrKioskWindow: boolean;
  isChromium: boolean;
  browserName: string;
} {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { isStandaloneOrKioskWindow: false, isChromium: false, browserName: "Navegador" };
  }
  const ua = navigator.userAgent || "";
  const isEdge = ua.includes("Edg/");
  const isBrave = Boolean((navigator as any).brave);
  const isChrome = ua.includes("Chrome/") && !isEdge;
  const isChromium = isChrome || isEdge || isBrave;
  const browserName = isEdge ? "Microsoft Edge" : isBrave ? "Brave" : isChrome ? "Google Chrome" : "Navegador";

  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.matchMedia?.("(display-mode: fullscreen)")?.matches ||
    localStorage.getItem("servitracks_kiosk_configured") === "true";

  return {
    isStandaloneOrKioskWindow: Boolean(isStandalone),
    isChromium,
    browserName,
  };
}

/**
 * Generates and downloads a 1-click Windows Batch assistant (.bat) that configures
 * Chrome / Edge / Brave with `--kiosk-printing` and sticky thermal paper settings,
 * creating a direct desktop shortcut for ServiTracks Kiosk Mode (just like KlynnKioskInstaller).
 */
export function downloadWindowsKioskInstaller(appUrl?: string, paperSize: "80mm" | "58mm" | "A4" = "80mm") {
  const targetUrl = appUrl || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  const mediaWidthMicrons = paperSize === "58mm" ? 48000 : 72000;

  const batContent = [
    "@echo off",
    "chcp 65001 >nul",
    "title Instalador de Modo Kiosco - ServiTracks",
    "echo =========================================================",
    "echo   CONFIGURADOR DE IMPRESION AUTOMATICA (MODO KIOSCO)",
    "echo   ServiTracks - Impresion Termica 100%% Directa sin Dialogo",
    "echo =========================================================",
    "echo.",
    "set \"BROWSER_EXE=\"",
    "if exist \"%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe\" set \"BROWSER_EXE=%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe\"",
    "if \"%BROWSER_EXE%\"==\"\" if exist \"%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe\" set \"BROWSER_EXE=%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe\"",
    "if \"%BROWSER_EXE%\"==\"\" if exist \"%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe\" set \"BROWSER_EXE=%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe\"",
    "if \"%BROWSER_EXE%\"==\"\" if exist \"%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe\" set \"BROWSER_EXE=%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe\"",
    "if \"%BROWSER_EXE%\"==\"\" if exist \"%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe\" set \"BROWSER_EXE=%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe\"",
    "",
    "if \"%BROWSER_EXE%\"==\"\" (",
    "  echo [ERROR] No se encontro Google Chrome ni Microsoft Edge instalado.",
    "  pause",
    "  exit /b 1",
    ")",
    "",
    "echo [1/3] Navegador detectado: %BROWSER_EXE%",
    "set \"KIOSK_PROFILE=%LocalAppData%\\ServiTracks\\Kiosco\\UserData\\Default\"",
    "if not exist \"%KIOSK_PROFILE%\" mkdir \"%KIOSK_PROFILE%\"",
    "",
    "echo [2/3] Configurando impresora predeterminada y rollo termico continuo...",
    `powershell -NoProfile -ExecutionPolicy Bypass -Command "$prefPath = Join-Path $env:LOCALAPPDATA 'ServiTracks\\Kiosco\\UserData\\Default\\Preferences'; $defPrinter = (Get-CimInstance Win32_Printer | Where-Object Default -eq $true | Select-Object -First 1).Name; if (-not $defPrinter) { $defPrinter = 'Save as PDF' }; $appState = @{ recentDestinations = @(@{ id = $defPrinter; origin = 'local'; account = ''; displayName = $defPrinter; extensionId = ''; extensionOriginalId = '' }); selectedDestinationId = $defPrinter; version = 2; isHeaderFooterEnabled = $false; isCssBackgroundEnabled = $true; marginsType = 1; scalingType = 3; scaling = '100'; mediaSize = @{ width_microns = ${mediaWidthMicrons}; height_microns = 3276000 } } | ConvertTo-Json -Compress -Depth 6; $prefs = @{ printing = @{ print_preview_sticky_settings = @{ appState = $appState } } } | ConvertTo-Json -Depth 6; Set-Content -Path $prefPath -Value $prefs -Encoding UTF8"`,
    "",
    "echo [3/3] Creando acceso directo 'ServiTracks Kiosco' en el Escritorio...",
    `powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $desktop = [Environment]::GetFolderPath('Desktop'); $lnk = $ws.CreateShortcut((Join-Path $desktop 'ServiTracks (Impresion Automatica).lnk')); $lnk.TargetPath = '%BROWSER_EXE%'; $profileDir = Join-Path $env:LOCALAPPDATA 'ServiTracks\\Kiosco\\UserData'; $lnk.Arguments = '--kiosk-printing --user-data-dir=\"' + $profileDir + '\" --no-first-run --disable-session-crashed-bubble --new-window \"${targetUrl}\"'; $lnk.Description = 'Abrir ServiTracks con impresion termica automatica sin cuadro de dialogo'; $lnk.Save()"`,
    "",
    "echo.",
    "echo [LISTO] Se ha creado el acceso directo 'ServiTracks (Impresion Automatica)' en tu Escritorio.",
    "echo Abriendo ServiTracks en Modo Kiosco...",
    `start "" "%BROWSER_EXE%" --kiosk-printing --user-data-dir="%LocalAppData%\\ServiTracks\\Kiosco\\UserData" --no-first-run --disable-session-crashed-bubble --new-window "${targetUrl}"`,
    "timeout /t 4 >nul",
  ].join("\r\n");

  const blob = new Blob([batContent], { type: "application/bat;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Activar_Impresion_Automatica_ServiTracks.bat";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  if (typeof window !== "undefined") {
    localStorage.setItem("servitracks_kiosk_configured", "true");
  }
}

/**
 * A simple ESC/POS encoder for thermal printers.
 * Generates Uint8Array byte arrays to be sent via Web Serial, Web USB, or Web Bluetooth.
 */
export class EscPosEncoder {
  private buffer: number[] = [];
  private encoder = new TextEncoder();

  constructor() {
    this.initialize();
  }

  /**
   * Initialize printer (ESC @)
   */
  public initialize(): this {
    this.buffer.push(0x1b, 0x40);
    return this;
  }

  /**
   * Enable or disable white-on-black reverse printing mode (GS B n)
   * Used for the "COPIA INTERNA" top header banner on ESC/POS printers.
   */
  public invert(enable: boolean): this {
    this.buffer.push(0x1d, 0x42, enable ? 0x01 : 0x00);
    return this;
  }

  /**
   * Set text alignment
   */
  public align(align: 'left' | 'center' | 'right'): this {
    const alignVal = align === 'left' ? 0 : align === 'center' ? 1 : 2;
    this.buffer.push(0x1b, 0x61, alignVal);
    return this;
  }

  /**
   * Set text bold
   */
  public bold(bold: boolean): this {
    this.buffer.push(0x1b, 0x45, bold ? 1 : 0);
    return this;
  }

  /**
   * Set text size
   * @param width 1-8
   * @param height 1-8
   */
  public size(width: number, height: number): this {
    const w = Math.max(1, Math.min(8, width)) - 1;
    const h = Math.max(1, Math.min(8, height)) - 1;
    const size = (w << 4) | h;
    this.buffer.push(0x1d, 0x21, size);
    return this;
  }

  /**
   * Write text
   */
  public text(text: string): this {
    const encoded = this.encoder.encode(text);
    for (let i = 0; i < encoded.length; i++) {
      this.buffer.push(encoded[i]);
    }
    return this;
  }

  /**
   * Write text and move to next line
   */
  public line(text: string = ''): this {
    if (text) {
      this.text(text);
    }
    this.buffer.push(0x0a); // LF
    return this;
  }

  /**
   * Add empty lines
   */
  public emptyLines(count: number): this {
    for (let i = 0; i < count; i++) {
      this.buffer.push(0x0a);
    }
    return this;
  }

  /**
   * Draw a separator line (based on paper size, typically 32 or 48 chars)
   */
  public separator(char: string = '-', width: number = 32): this {
    this.line(char.repeat(width));
    return this;
  }

  /**
   * Cut paper
   */
  public cut(partial: boolean = false): this {
    this.emptyLines(3);
    if (partial) {
      this.buffer.push(0x1d, 0x56, 0x41, 0x03); // GS V A 3 partial cut with feed
    } else {
      this.buffer.push(0x1d, 0x56, 0x00); // full cut
    }
    return this;
  }

  /**
   * Open cash drawer
   */
  public openDrawer(): this {
    // Standard ESC p m t1 t2
    // m = 0 (drawer 1), t1 = 50ms, t2 = 50ms
    this.buffer.push(0x1b, 0x70, 0x00, 0x32, 0x32);
    return this;
  }

  /**
   * Output the final byte array
   */
  public encode(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

/**
 * Utility to connect and print via Web Serial API (uses persistent port if already authorized)
 */
export async function printViaSerial(data: Uint8Array): Promise<boolean> {
  if (!isSerialSupported()) {
    throw new Error('Web Serial API no soportada en este navegador (intenta con Chrome/Edge).');
  }

  // First try auto-connected port without prompting user
  const autoPort = await getAutoConnectedSerialPort(9600);
  if (autoPort && autoPort.writable) {
    try {
      const writer = autoPort.writable.getWriter();
      await writer.write(data);
      writer.releaseLock();
      return true;
    } catch (err) {
      activeSerialPort = null;
    }
  }

  // Otherwise request port once and keep it open for future automatic prints
  const res = await connectSerialPort(9600);
  if (!res.success || !activeSerialPort) {
    throw new Error(res.error || 'Error al conectar por Puerto Serie.');
  }

  const writer = activeSerialPort.writable.getWriter();
  await writer.write(data);
  writer.releaseLock();
  return true;
}

/**
 * Utility to connect and print via Web Bluetooth API (uses persistent BLE connection if active)
 */
export async function printViaBluetooth(data: Uint8Array): Promise<boolean> {
  if (!isBluetoothSupported()) {
    throw new Error('Web Bluetooth API no soportada en este navegador (intenta con Chrome o Edge).');
  }

  if (activeBluetoothDevice?.gatt?.connected && activeBluetoothCharacteristic) {
    const ok = await printDirectRaw(data, "bluetooth");
    if (ok) return true;
  }

  const res = await connectBluetoothDevice();
  if (!res.success) {
    throw new Error(res.error || 'Error al conectar por Bluetooth.');
  }

  const ok = await printDirectRaw(data, "bluetooth");
  if (!ok) {
    throw new Error('No se pudo transmitir el trabajo a la impresora Bluetooth.');
  }
  return true;
}
