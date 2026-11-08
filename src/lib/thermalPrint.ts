/**
 * Utility for thermal receipt and document printing.
 * Uses Klynn's proven `atomic-print-target` + `printBrowserElementsIndividually` architecture:
 * mounts each `.thermal-ticket` onto `document.body` and dispatches an independent `window.print()`
 * job per ticket (1st: Original Cliente, 2nd: COPIA INTERNA) with proper bottom cutter clearance,
 * ensuring Windows thermal printer drivers execute `DrvEndDoc` (hardware blade auto-cut)
 * cleanly after EVERY ticket.
 */

export interface ThermalPrintOptions {
  element: HTMLElement;
  title?: string;
  paperSize?: "80mm" | "58mm" | "57mm" | "A4";
  onComplete?: () => void;
}

let printQueue: Promise<void> = Promise.resolve();

function waitForPaintFrames(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(resolve, 60);
      });
    });
  });
}

function triggerSingleWindowPrint(): Promise<void> {
  return new Promise<void>((resolve) => {
    let settled = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    let maxSafetyTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = () => {
      if (settled) return;
      settled = true;
      window.removeEventListener("afterprint", onAfterPrint);
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (maxSafetyTimer) clearTimeout(maxSafetyTimer);
      // Margen para que el Spooler de Windows cierre EndDoc y ejecute el corte físico
      // antes de lanzar el segundo ticket o desmontar el nodo de impresión.
      setTimeout(resolve, 450);
    };

    const onAfterPrint = () => {
      finish();
    };

    window.addEventListener("afterprint", onAfterPrint, { once: true });

    try {
      window.focus();
      window.print();
    } catch (err) {
      console.error("Error al disparar window.print():", err);
      finish();
      return;
    }

    // En modo --kiosk-printing (impresión silenciosa sin ventana que robe el foco),
    // si afterprint se disparó sincrónicamente o no se emitió, continuar tras 1200ms (igual que Klynn).
    const checkSilentFallback = () => {
      if (settled) return;
      if (document.hasFocus()) {
        finish();
      } else {
        fallbackTimer = setTimeout(checkSilentFallback, 800);
      }
    };

    fallbackTimer = setTimeout(checkSilentFallback, 1200);
    maxSafetyTimer = setTimeout(finish, 60000);
  });
}

export function printThermalDocument({
  element,
  title = "Documento",
  paperSize = "80mm",
  onComplete,
}: ThermalPrintOptions) {
  if (!element || typeof window === "undefined" || typeof document === "undefined") return;

  const isA4 = paperSize === "A4";
  const is58 = paperSize === "58mm" || paperSize === "57mm";
  const rollMaxWidth = isA4 ? "210mm" : is58 ? "54mm" : "72mm";

  // Extraer cada ticket individualmente en el momento de la llamada (antes de cualquier cierre de modal)
  const ticketNodes = Array.from(element.querySelectorAll<HTMLElement>(".thermal-ticket"));
  const rawJobsHtml: string[] =
    ticketNodes.length > 0
      ? ticketNodes.map(
          (node) =>
            `${node.outerHTML}${
              !isA4 ? '<div class="thermal-cut-feed" aria-hidden="true">.</div>' : ""
            }`
        )
      : [
          `${element.innerHTML}${
            !isA4 ? '<div class="thermal-cut-feed" aria-hidden="true">.</div>' : ""
          }`,
        ];

  printQueue = printQueue
    .catch(() => {})
    .then(async () => {
      const originalTitle = document.title;

      // Limpiar cualquier contenedor o iframe residual previo
      document
        .querySelectorAll(
          ".thermal-print-frame, #servitracks-atomic-print-root, #servitracks-atomic-print-style"
        )
        .forEach((el) => {
          try {
            el.remove();
          } catch (_) {}
        });

      const pageRule = isA4
        ? `@page { size: A4 portrait; margin: 8mm !important; }`
        : `@page { margin: 0 !important; }`;

      const styleEl = document.createElement("style");
      styleEl.id = "servitracks-atomic-print-style";
      styleEl.textContent = `
        @media screen {
          #servitracks-atomic-print-root {
            position: fixed !important;
            top: 0 !important;
            left: -10000px !important;
            width: ${isA4 ? "210mm" : is58 ? "58mm" : "80mm"} !important;
            opacity: 0 !important;
            pointer-events: none !important;
            z-index: -9999 !important;
            overflow: hidden !important;
          }
        }
        @media print {
          ${pageRule}
          html,
          body.servitracks-printing {
            background: #ffffff !important;
            color: #000000 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            display: block !important;
          }
          body.servitracks-printing > *:not(#servitracks-atomic-print-root) {
            display: none !important;
          }
          #servitracks-atomic-print-root {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: relative !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            max-width: ${rollMaxWidth} !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
            box-sizing: border-box !important;
          }
          #servitracks-atomic-print-root * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            border-color: black !important;
            -webkit-font-smoothing: antialiased !important;
          }
          #servitracks-atomic-print-root .text-white,
          #servitracks-atomic-print-root [class*="text-white"],
          #servitracks-atomic-print-root [style*="color: white"],
          #servitracks-atomic-print-root [style*="color: rgb(255, 255, 255)"],
          #servitracks-atomic-print-root [style*="color:#fff"],
          #servitracks-atomic-print-root [style*="color: #ffffff"] {
            color: #ffffff !important;
          }
          #servitracks-atomic-print-root .bg-black,
          #servitracks-atomic-print-root [class*="bg-black"],
          #servitracks-atomic-print-root [style*="background-color: black"],
          #servitracks-atomic-print-root [style*="background-color: #000"],
          #servitracks-atomic-print-root [style*="background-color: rgb(0, 0, 0)"] {
            background-color: #000000 !important;
          }
          #servitracks-atomic-print-root .internal-copy-banner {
            background-color: #000000 !important;
            color: #ffffff !important;
            box-shadow: inset 0 0 0 1000px #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #servitracks-atomic-print-root img {
            filter: grayscale(100%) contrast(150%) !important;
          }
          #servitracks-atomic-print-root .atomic-ticket-job {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          #servitracks-atomic-print-root .thermal-ticket {
            display: block !important;
            position: relative !important;
            width: 100% !important;
            max-width: ${rollMaxWidth} !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
            box-sizing: border-box !important;
            padding-bottom: ${isA4 ? "12mm" : "5mm"} !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #servitracks-atomic-print-root .thermal-cut-feed {
            display: block !important;
            margin-top: 8mm !important;
            padding-bottom: 2mm !important;
            font-size: 6px !important;
            line-height: 1 !important;
            text-align: center !important;
            color: #000000 !important;
            opacity: 0.25 !important;
            user-select: none !important;
          }
          #servitracks-atomic-print-root .ticket-separator {
            display: none !important;
          }
        }
      `;

      const printRoot = document.createElement("div");
      printRoot.id = "servitracks-atomic-print-root";
      printRoot.setAttribute("aria-hidden", "true");

      const jobWrappers: HTMLDivElement[] = rawJobsHtml.map((jobHtml, idx) => {
        const wrapper = document.createElement("div");
        wrapper.className = "atomic-ticket-job";
        wrapper.dataset.printJobIndex = String(idx);
        wrapper.style.display = idx === 0 ? "block" : "none";
        wrapper.innerHTML = jobHtml;
        printRoot.appendChild(wrapper);
        return wrapper;
      });

      document.head.appendChild(styleEl);
      document.body.appendChild(printRoot);
      document.body.classList.add("servitracks-printing");

      try {
        // 1. Esperar tipografías listas
        if (document.fonts && document.fonts.ready) {
          try {
            await document.fonts.ready;
          } catch (_) {}
        }

        // 2. Esperar carga completa de logos e imágenes dentro del contenedor de impresión
        const images = Array.from(printRoot.querySelectorAll("img"));
        if (images.length > 0) {
          await Promise.all(
            images.map((img) => {
              if (img.complete) return Promise.resolve();
              return new Promise((resolve) => {
                img.onload = () => resolve(true);
                img.onerror = () => resolve(true);
                setTimeout(() => resolve(true), 1200);
              });
            })
          );
        }

        // 3. Imprimir cada ticket como un trabajo independiente (EndDoc por ticket => corte físico en ambos)
        for (let i = 0; i < jobWrappers.length; i++) {
          jobWrappers.forEach((w, idx) => {
            w.style.setProperty("display", idx === i ? "block" : "none", "important");
          });
          document.title = i === 0 ? title : `${title}_Copia_Interna`;
          await waitForPaintFrames();
          await triggerSingleWindowPrint();
        }
      } catch (err) {
        console.error("Error durante secuencia de impresión térmica:", err);
      } finally {
        document.title = originalTitle;
        // Conservar brevemente el nodo en el DOM tras el último afterprint para no abortar el spooler
        await new Promise((resolve) => setTimeout(resolve, 600));
        document.body.classList.remove("servitracks-printing");
        try {
          if (document.body.contains(printRoot)) document.body.removeChild(printRoot);
        } catch (_) {}
        try {
          if (document.head.contains(styleEl)) document.head.removeChild(styleEl);
        } catch (_) {}
        if (onComplete) {
          onComplete();
        }
      }
    });
}
