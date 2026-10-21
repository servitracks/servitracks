/**
 * Utility for thermal receipt and document printing.
 * Dynamically computes content height to prevent continuous roll thermal printers
 * from feeding unnecessary blank paper before cutting.
 */

export interface ThermalPrintOptions {
  element: HTMLElement;
  title?: string;
  paperSize?: "80mm" | "58mm" | "57mm" | "A4";
  onComplete?: () => void;
}

export function printThermalDocument({
  element,
  title = "Documento",
  paperSize = "80mm",
  onComplete,
}: ThermalPrintOptions) {
  if (!element || typeof window === "undefined") return;

  const isA4 = paperSize === "A4";
  const rollWidth = paperSize === "58mm" ? "58mm" : paperSize === "57mm" ? "57mm" : "80mm";

  // Limpiar cualquier iframe de impresión previo huérfano en el DOM
  document.querySelectorAll(".thermal-print-frame").forEach((el) => {
    try {
      el.remove();
    } catch (_) {}
  });

  // Crear iframe invisible pero con el ancho exacto del rollo para cálculo milimétrico
  const iframe = document.createElement("iframe");
  iframe.className = "thermal-print-frame";
  iframe.style.position = "fixed";
  iframe.style.top = "0";
  iframe.style.left = "-9999px";
  iframe.style.width = isA4 ? "210mm" : rollWidth;
  iframe.style.height = "2500px"; // Altura holgada para renderizado natural sin scrollbars internos
  iframe.style.border = "none";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.setAttribute("aria-hidden", "true");

  document.body.appendChild(iframe);

  // Extraer todas las hojas de estilo aplicadas (Tailwind, tipografías, componentes)
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((tag) => tag.outerHTML)
    .join("\n");

  const doc = iframe.contentWindow?.document;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    if (document.body.contains(iframe)) document.body.removeChild(iframe);
    return;
  }

  // Regla inicial de tamaño de página
  const initialPageRule = isA4
    ? `@page { size: A4; margin: 8mm !important; }`
    : `@page { size: ${rollWidth} auto; margin: 0mm !important; }`;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        ${styles}
        <style id="thermal-page-style">
          ${initialPageRule}
          @media print {
            ${initialPageRule}
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color: black !important;
              border-color: black !important;
              -webkit-font-smoothing: antialiased !important;
            }
            img {
              filter: grayscale(100%) contrast(150%) !important;
            }
          }
          html, body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            width: ${isA4 ? "210mm" : rollWidth} !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }
          .thermal-ticket {
            box-shadow: none !important;
            margin: 0 auto !important;
            border: none !important;
          }
        </style>
      </head>
      <body>
        <div id="print-root">
          ${element.innerHTML}
        </div>
      </body>
    </html>
  `);
  doc.close();

  const cleanup = () => {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
    if (onComplete) {
      onComplete();
    }
  };

  win.addEventListener("afterprint", cleanup);
  setTimeout(cleanup, 120000);

  // Proceso autónomo de medición de contenido y disparo de impresión
  const startPrint = async () => {
    try {
      // 1. Esperar a que las fuentes se encuentren listas
      if (doc.fonts && doc.fonts.ready) {
        try {
          await doc.fonts.ready;
        } catch (_) {}
      }

      // 2. Esperar a que las imágenes (logos, QR, etc.) terminen de cargar completamente
      const images = Array.from(doc.images || []);
      if (images.length > 0) {
        await Promise.all(
          images.map((img) => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
              img.onload = () => resolve(true);
              img.onerror = () => resolve(true);
              setTimeout(() => resolve(true), 1200); // Límite de seguridad
            });
          })
        );
      }

      // 3. Breve pausa para asegurar reflujo completo de layout en el navegador
      await new Promise((resolve) => setTimeout(resolve, 80));

      if (!isA4) {
        // Medir estrictamente el contenedor real del ticket
        const ticketEl =
          (doc.querySelector(".thermal-ticket") as HTMLElement) ||
          (doc.getElementById("print-root")?.firstElementChild as HTMLElement) ||
          (doc.getElementById("print-root") as HTMLElement);

        if (ticketEl) {
          const rect = ticketEl.getBoundingClientRect();
          const contentPx = Math.ceil(
            Math.max(
              rect.height,
              ticketEl.scrollHeight || 0,
              ticketEl.offsetHeight || 0
            )
          );

          if (contentPx > 0) {
            // Conversión exacta: 96 DPI (1 in = 25.4 mm)
            // + 2mm de margen de seguridad para que la cuchilla física corte después de la última línea
            const calculatedMm = Math.ceil((contentPx * 25.4) / 96) + 2;

            const finalPageCss = `
              @page {
                size: ${rollWidth} ${calculatedMm}mm;
                margin: 0mm !important;
              }
              @media print {
                @page {
                  size: ${rollWidth} ${calculatedMm}mm;
                  margin: 0mm !important;
                }
                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color: black !important;
                  border-color: black !important;
                  -webkit-font-smoothing: antialiased !important;
                }
                img {
                  filter: grayscale(100%) contrast(150%) !important;
                }
                html, body {
                  width: ${rollWidth} !important;
                  height: ${calculatedMm}mm !important;
                  max-height: ${calculatedMm}mm !important;
                  margin: 0mm !important;
                  padding: 0mm !important;
                  overflow: hidden !important;
                }
                .thermal-ticket {
                  box-shadow: none !important;
                  margin: 0 auto !important;
                  border: none !important;
                }
              }
              html, body {
                background: white !important;
                color: black !important;
                margin: 0 !important;
                padding: 0 !important;
                width: ${rollWidth} !important;
                height: ${calculatedMm}mm !important;
                max-height: ${calculatedMm}mm !important;
                overflow: hidden !important;
              }
            `;

            let styleEl = doc.getElementById("thermal-page-style");
            if (styleEl) {
              styleEl.innerHTML = finalPageCss;
            } else {
              const newStyle = doc.createElement("style");
              newStyle.id = "thermal-page-style";
              newStyle.innerHTML = finalPageCss;
              doc.head.appendChild(newStyle);
            }
          }
        }
      }

      // 4. Invocar el diálogo nativo de impresión
      setTimeout(() => {
        try {
          win.focus();
          win.print();
        } catch (err) {
          console.error("Error al disparar impresión en iframe:", err);
        }
      }, 100);
    } catch (err) {
      console.error("Error al preparar documento para impresión:", err);
      try {
        win.focus();
        win.print();
      } catch (_) {}
    }
  };

  // Ejecutar proceso de medición autónoma
  startPrint();
}
