import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "@/lib/next-compat";
import { useStore } from "@/store/useStore";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export function TourController() {
  const { isDemoActive, setDemoActive } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const driverRef = useRef<any>(null);

  useEffect(() => {
    if (!isDemoActive) return;

    if (driverRef.current) {
      driverRef.current.destroy();
    }

    const timer = setTimeout(() => {
      let driverObj: any;

      const commonConfig = {
        allowClose: false,
        overlayColor: 'rgba(0, 0, 0, 0.7)',
        nextBtnText: "Siguiente →",
        prevBtnText: "← Anterior",
        progressText: "{{current}} de {{total}}",
      };

      if (pathname === "/autocheck" || pathname.endsWith("/autocheck")) {
        driverObj = driver({
          ...commonConfig,
          showProgress: true,
          doneBtnText: "Ver Órdenes 🚀",
          steps: [
            { popover: { title: "✨ Bienvenido a ServiTracks", description: "La plataforma de primer nivel para administrar tu taller mecánico. Vamos a dar un recorrido completo por todos los módulos.", side: "bottom", align: "center", showButtons: ['next'] } },
            { element: "#tour-metrics", popover: { title: "📊 Centro de Mando Financiero", description: "Controla tus ingresos diarios, identifica stock bajo y monitorea todas las órdenes activas en el taller desde este dashboard en tiempo real.", showButtons: ['previous', 'next'] } },
            { element: "#tour-sidebar-orders", popover: { title: "🛠️ Órdenes de Trabajo", description: "El corazón operativo de tu negocio. Haz clic aquí para entrar y ver cómo se gestionan las reparaciones.", showButtons: ['previous', 'next'] } }
          ],
          onDestroyStarted: () => {
            driverObj.destroy();
            router.push("/autocheck/orders");
          }
        });
      } 
      else if (pathname.endsWith("/orders")) {
        driverObj = driver({
          ...commonConfig,
          showProgress: true,
          doneBtnText: "Ver Clientes 👥",
          steps: [
            { element: "#tour-orders-header", popover: { title: "📋 Control Total de Reparaciones", description: "Desde aquí creas nuevas órdenes de servicio, registras los vehículos que ingresan y les asignas técnicos.", showButtons: ['next'] } },
            { element: "#tour-orders-list", popover: { title: "⚡ Flujo de Trabajo Inteligente", description: "Visualiza de un vistazo en qué estado se encuentra cada vehículo (Diagnóstico, Reparación, Listo) y envíale actualizaciones por WhatsApp al cliente.", showButtons: ['previous', 'next'] } }
          ],
          onDestroyStarted: () => {
            driverObj.destroy();
            router.push("/autocheck/customers");
          }
        });
      }
      else if (pathname.endsWith("/customers")) {
        driverObj = driver({
          ...commonConfig,
          showProgress: false,
          showButtons: ['next'],
          doneBtnText: "Ver Inventario 📦",
          steps: [
            { element: "main", popover: { title: "👥 CRM de Clientes y Vehículos", description: "Mantén una base de datos de todos tus clientes y su flota de vehículos. Envía recordatorios automáticos por WhatsApp cuando les toque revisión." } },
          ],
          onDestroyStarted: () => {
            driverObj.destroy();
            router.push("/autocheck/inventory");
          }
        });
      }
      else if (pathname.endsWith("/inventory")) {
        driverObj = driver({
          ...commonConfig,
          showProgress: false,
          showButtons: ['next'],
          doneBtnText: "Ir a Facturar 💳",
          steps: [
            { element: "main", popover: { title: "📦 Control de Inventario", description: "Gestiona tus repuestos, aceites y filtros. El sistema te alertará automáticamente cuando un producto esté por agotarse." } },
          ],
          onDestroyStarted: () => {
            driverObj.destroy();
            router.push("/autocheck/pos");
          }
        });
      }
      else if (pathname.endsWith("/pos")) {
        driverObj = driver({
          ...commonConfig,
          showProgress: true,
          doneBtnText: "Ir a Caja 💰",
          steps: [
            { element: "#tour-pos-search", popover: { title: "💻 Facturación POS Ultrarrápida", description: "El sistema de caja está optimizado para velocidad. Busca servicios, técnicos o productos con el teclado o lector de código de barras.", showButtons: ['next'] } },
            { element: "#tour-pos-payment", popover: { title: "🧾 Cumplimiento DGII", description: "Aplica descuentos, gestiona propinas y emite comprobantes fiscales (NCF) totalmente válidos de forma automática al cobrar.", showButtons: ['previous', 'next'] } }
          ],
          onDestroyStarted: () => {
            driverObj.destroy();
            router.push("/autocheck/caja");
          }
        });
      }
      else if (pathname.endsWith("/caja")) {
        driverObj = driver({
          ...commonConfig,
          showProgress: false,
          showButtons: ['next'],
          doneBtnText: "Ver Recordatorios 🔔",
          steps: [
            { element: "main", popover: { title: "💰 Control y Cierre de Caja", description: "Asegúrate de que cada centavo cuadre. Controla los ingresos en efectivo, tarjeta, transferencias y previene pérdidas con el historial de movimientos." } },
          ],
          onDestroyStarted: () => {
            driverObj.destroy();
            router.push("/autocheck/reminders");
          }
        });
      }
      else if (pathname.endsWith("/reminders")) {
        driverObj = driver({
          ...commonConfig,
          showProgress: false,
          showButtons: ['next'],
          doneBtnText: "Ver Reportes 📈",
          steps: [
            { element: "main", popover: { title: "🔔 Notificaciones Automáticas", description: "El sistema automatiza el seguimiento. Envía recordatorios por WhatsApp para que tus clientes no olviden su próximo cambio de aceite." } },
          ],
          onDestroyStarted: () => {
            driverObj.destroy();
            router.push("/autocheck/reports");
          }
        });
      }
      else if (pathname.endsWith("/reports")) {
        driverObj = driver({
          ...commonConfig,
          showProgress: false,
          showButtons: ['next'],
          doneBtnText: "Ver Mantenimiento 🛠️",
          steps: [
            { element: "main", popover: { title: "📈 Reportes Inteligentes", description: "Toma decisiones basadas en datos. Descubre qué servicios te generan más dinero y mide la productividad real de tus mecánicos." } },
          ],
          onDestroyStarted: () => {
            driverObj.destroy();
            router.push("/autocheck/maintenance");
          }
        });
      }
      else if (pathname.endsWith("/maintenance")) {
        driverObj = driver({
          ...commonConfig,
          showProgress: false,
          showButtons: ['next'],
          doneBtnText: "Ver Configuración ⚙️",
          steps: [
            { element: "main", popover: { title: "🛠️ Mantenimiento Preventivo", description: "Añade valor avisándole a tus clientes cuándo reemplazar piezas según su kilometraje. Aumenta tus ventas y mejora su seguridad vial." } },
          ],
          onDestroyStarted: () => {
            driverObj.destroy();
            router.push("/autocheck/settings");
          }
        });
      }
      else if (pathname.endsWith("/settings")) {
        driverObj = driver({
          ...commonConfig,
          showProgress: false,
          showButtons: ['next'],
          doneBtnText: "Finalizar Tour 🎉",
          steps: [
            { element: "main", popover: { title: "⚙️ Configuración de Negocio", description: "Adapta la plataforma a tu medida. Configura tu logo, la serie de comprobantes fiscales, las plantillas de WhatsApp y los usuarios de tu equipo." } },
          ],
          onDestroyStarted: () => {
            driverObj.destroy();
            setDemoActive(false);
          }
        });
      }

      if (driverObj) {
        driverRef.current = driverObj;
        driverObj.drive();
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [pathname, isDemoActive, router, setDemoActive]);

  return null;
}
