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

  // Pre-calcular altura a partir del elemento en pantalla si está disponible (96 DPI: 1in = 25.4mm)
  const screenPx = Math.max(element.scrollHeight || 0, element.offsetHeight || 0);
  const initialMm = isA4 ? 297 : Math.max(60, Math.ceil((screenPx * 25.4) / 96) + 4);
  const initialPageSize = isA4 ? "A4" : `${rollWidth} ${initialMm}mm`;

  // Crear iframe oculto posicionado fuera de pantalla pero con el ancho real del papel
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.top = "0";
  iframe.style.left = "-9999px";
  iframe.style.width = isA4 ? "210mm" : rollWidth;
  iframe.style.height = "auto";
  iframe.style.border = "none";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.setAttribute("aria-hidden", "true");

  document.body.appendChild(iframe);

  // Extraer hojas de estilo de la aplicación (Tailwind, tipografías, componentes)
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((tag) => tag.outerHTML)
    .join("\n");

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    if (document.body.contains(iframe)) document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        ${styles}
        <style id="thermal-page-style">
          @media print {
            @page {
              size: ${initialPageSize};
              margin: 0mm !important;
            }
            * {
              color: black !important;
              border-color: black !important;
              -webkit-font-smoothing: none !important;
              font-smooth: never !important;
              text-rendering: optimizeSpeed !important;
            }
            img {
              filter: grayscale(100%) contrast(1000%) !important;
            }
          }
          html, body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            ${!isA4 ? `max-height: ${initialMm}mm !important; overflow: hidden !important;` : "overflow: visible !important;"}
          }
          .thermal-ticket {
            box-shadow: none !important;
            margin: 0 auto !important;
            padding-top: 0 !important;
            border: none !important;
          }
        </style>
      </head>
      <body>
        <div id="print-root">
          ${element.innerHTML}
        </div>
        <script>
          function executePrint() {
            ${!isA4 ? `
            try {
              var root = document.getElementById('print-root');
              var ticket = document.querySelector('.thermal-ticket') || (root && root.firstElementChild) || document.body;
              var measuredPx = Math.max(
                ticket ? ticket.scrollHeight : 0,
                ticket ? ticket.offsetHeight : 0,
                root ? root.scrollHeight : 0,
                document.body.scrollHeight,
                document.documentElement.scrollHeight
              );
              if (measuredPx > 0) {
                // Conversión exacta de px a mm + 4mm de margen de seguridad para la guillotina/corte
                var calculatedMm = Math.ceil((measuredPx * 25.4) / 96) + 4;
                var styleEl = document.getElementById('thermal-page-style');
                if (styleEl) {
                  styleEl.innerHTML = \`
                    @media print {
                      @page {
                        size: ${rollWidth} \${calculatedMm}mm;
                        margin: 0mm !important;
                      }
                      * {
                        color: black !important;
                        border-color: black !important;
                        -webkit-font-smoothing: none !important;
                        font-smooth: never !important;
                        text-rendering: optimizeSpeed !important;
                      }
                      img {
                        filter: grayscale(100%) contrast(1000%) !important;
                      }
                    }
                    html, body {
                      background: white !important;
                      color: black !important;
                      margin: 0 !important;
                      padding: 0 !important;
                      height: auto !important;
                      min-height: 0 !important;
                      max-height: \${calculatedMm}mm !important;
                      overflow: hidden !important;
                    }
                    .thermal-ticket {
                      box-shadow: none !important;
                      margin: 0 auto !important;
                      padding-top: 0 !important;
                      border: none !important;
                    }
                  \`;
                }
              }
            } catch (err) {
              console.error("Error ajustando altura dinámica de impresión:", err);
            }
            ` : ""}
            setTimeout(function() {
              window.focus();
              window.print();
            }, 200);
          }

          if (document.readyState === 'complete') {
            executePrint();
          } else {
            window.addEventListener('load', executePrint);
          }
        </script>
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

  iframe.contentWindow?.addEventListener("afterprint", cleanup);
  setTimeout(cleanup, 120000);
}
