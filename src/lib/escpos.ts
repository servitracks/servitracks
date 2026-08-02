/**
 * A simple ESC/POS encoder for thermal printers.
 * Generates Uint8Array byte arrays to be sent via Web Serial or Web Bluetooth.
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
      this.buffer.push(0x1d, 0x56, 0x01); // partial cut
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
 * Utility to connect and print via Web Serial API
 */
export async function printViaSerial(data: Uint8Array): Promise<boolean> {
  if (!('serial' in navigator)) {
    throw new Error('Web Serial API no soportada en este navegador (intenta con Chrome/Edge).');
  }

  let port: any = null;
  try {
    port = await (navigator as any).serial.requestPort();
    await port.open({ baudRate: 9600 }); // Common thermal printer baud rate
    
    const writer = port.writable.getWriter();
    await writer.write(data);
    writer.releaseLock();
    
    return true;
  } catch (error: any) {
    console.error('Error Serial Print:', error);
    throw new Error(error.message || 'Error al conectar por Puerto Serie.');
  } finally {
    if (port) {
      try { await port.close(); } catch (e) {}
    }
  }
}

/**
 * Utility to connect and print via Web Bluetooth API
 */
export async function printViaBluetooth(data: Uint8Array): Promise<boolean> {
  if (!('bluetooth' in navigator)) {
    throw new Error('Web Bluetooth API no soportada en este navegador (intenta con Chrome móvil o Mac).');
  }

  let device: any = null;
  try {
    device = await (navigator as any).bluetooth.requestDevice({
      filters: [
        { services: ['000018f0-0000-1000-8000-00805f9b34fb'] } // Commonly used generic serial/printer service
      ],
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '49535343-fe7d-4ae5-8fa9-9fafd205e455'] // Another common one
    });

    const server = await device.gatt.connect();
    
    // We need to find the specific characteristic to write to.
    // This is often vendor-specific, but these are common UUIDs.
    const services = await server.getPrimaryServices();
    let writeCharacteristic: any = null;

    for (const service of services) {
      const characteristics = await service.getCharacteristics();
      for (const characteristic of characteristics) {
        if (characteristic.properties.write || characteristic.properties.writeWithoutResponse) {
          writeCharacteristic = characteristic;
          break;
        }
      }
      if (writeCharacteristic) break;
    }

    if (!writeCharacteristic) {
      throw new Error('No se encontró un canal de escritura en esta impresora Bluetooth.');
    }

    // Bluetooth has MTU limits, usually need to chunk data. Max is often 512, sometimes 20.
    const CHUNK_SIZE = 100;
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      if (writeCharacteristic.properties.writeWithoutResponse) {
        await writeCharacteristic.writeValueWithoutResponse(chunk);
      } else {
        await writeCharacteristic.writeValue(chunk);
      }
    }

    return true;
  } catch (error: any) {
    console.error('Error Bluetooth Print:', error);
    throw new Error(error.message || 'Error al conectar por Bluetooth.');
  } finally {
    if (device && device.gatt.connected) {
      try { device.gatt.disconnect(); } catch (e) {}
    }
  }
}
