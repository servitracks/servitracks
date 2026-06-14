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

      const tenantSlug = pathname.split('/')[1] || 'autocheck';
      const basePath = `/${tenantSlug}`;

      if (pathname === basePath || pathname === `${basePath}/`) {
        driverObj = driver({
          ...commonConfig,
          showProgress: true,
          doneBtnText: "Ir a Órdenes 🚀",
          steps: [
            { popover: { title: "✨ Bienvenido a ServiTracks", description: "La plataforma de primer nivel para administrar tu taller mecánico. Vamos a dar un recorrido completo por todos los módulos.", side: "bottom", align: "center", showButtons: ['next'] } },
            { element: "#tour-metrics", popover: { title: "📊 Dashboard Principal", description: "Controla tus ingresos diarios, identifica stock bajo y monitorea todas las órdenes activas en el taller desde este panel en tiempo real.", showButtons: ['previous', 'next'] } }
          ],
          onDestroyStarted: () => {
            driverObj.destroy();
            router.push(`${basePath}/orders`);
          }
        });
      } 
      else if (pathname.endsWith("/orders")) {
        driverObj = driver({
          ...commonConfig,
          showProgress: true,
          doneBtnText: "Ir a Cotizaciones 📝",
          steps: [
            { element: "main", popover: { title: "🛠️ Órdenes de Trabajo", description: "Desde aquí creas nuevas órdenes de servicio, registras los vehículos que ingresan, les asignas técnicos y ves el estado de cada vehículo.", showButtons: ['next'] } }
          ],
          onDestroyStarted: () => {
            driverObj.destroy();
            router.push(`${basePath}/cotizaciones`);
          }
        });
      }
      else if (pathname.endsWith("/cotizaciones")) {
        driverObj = driver({
          ...commonConfig,
          showProgress: false,
          showButtons: ['next'],
          doneBtnText: "Ir a Facturación POS 💳",
          steps: [
            { element: "main", popover: { title: "📝 Cotizaciones Profesionales", description: "Crea estimados rápidos para tus clientes antes de comenzar el trabajo y envíalos directamente por WhatsApp." } },
          ],
          onDestroyStarted: () => {
            driverObj.destroy();
            router.push(`${basePath}/pos`);
          }
        });
      }
      else if (pathname.endsWith("/pos")) {
        driverObj = driver({
          ...commonConfig,
          showProgress: true,
          doneBtnText: "Ir a Caja 💰",
          steps: [
            { element: "main", popover: { title: "💻 Facturación POS Ultrarrápida", description: "Vende repuestos directos, aplica descuentos, gestiona propinas y emite comprobantes fiscales (NCF) válidos.", showButtons: ['next'] } }
          ],
          onDestroyStarted: () => {
            driverObj.destroy();
            router.push(`${basePath}/caja`);
          }
        });
      }
      else if (pathname.endsWith("/caja")) {
        driverObj = driver({
          ...commonConfig,
          showProgress: false,
          showButtons: ['next'],
          doneBtnText: "Ir a Conversaciones 💬",
          steps: [
            { element: "main", popover: { title: "💰 Control de Caja", description: "Asegúrate de que cada centavo cuadre. Controla los ingresos en efectivo, tarjeta, transferencias y previene pérdidas." } },
          ],
          onDestroyStarted: () => {
            driverObj.destroy();
            router.push(`${basePath}/conversaciones`);
          }
        });
      }
      else if (pathname.endsWith("/conversaciones")) {
        driverObj = driver({
          ...commonConfig,
          showProgress: false,
          showButtons: ['next'],
          doneBtnText: "Ir a Recordatorios 🔔",
          steps: [
            { element: "main", popover: { title: "💬 Conversaciones (WhatsApp)", description: "Chatea en tiempo real con tus clientes, envíales fotos de los repuestos dañados y obtén su aprobación sin salir de la plataforma." } },
          ],
          onDestroyStarted: () => {
            driverObj.destroy();
            router.push(`${basePath}/reminders`);
          }
        });
      }
      else if (pathname.endsWith("/reminders")) {
        driverObj = driver({
          ...commonConfig,
          showProgress: false,
          showButtons: ['next'],
          doneBtnText: "Ir a Clientes 👥",
          steps: [
            { element: "main", popover: { title: "🔔 Notificaciones y Recordatorios", description: "El sistema automatiza el seguimiento. Configura avisos automáticos para que tus clientes regresen a su próximo mantenimiento." } },
          ],
          onDestroyStarted: () => {
            driverObj.destroy();
            router.push(`${basePath}/customers`);
          }
        });
      }
      else if (pathname.endsWith("/customers")) {
        driverObj = driver({
          ...commonConfig,
          showProgress: false,
          showButtons: ['next'],
          doneBtnText: "Ir a Inventario 📦",
          steps: [
            { element: "main", popover: { title: "👥 Clientes y Vehículos", description: "Mantén una base de datos centralizada de todo el historial de reparaciones y flota de vehículos de tus clientes." } },
          ],
          onDestroyStarted: () => {
            driverObj.destroy();
            router.push(`${basePath}/inventory`);
          }
        });
      }
      else if (pathname.endsWith("/inventory")) {
        driverObj = driver({
          ...commonConfig,
          showProgress: false,
          showButtons: ['next'],
          doneBtnText: "Ir a Servicios 🔧",
          steps: [
            { element: "main", popover: { title: "📦 Control de Inventario", description: "Gestiona tus repuestos. El sistema te alertará automáticamente cuando un producto esté por agotarse y puedes importar usando IA." } },
          ],
          onDestroyStarted: () => {
            driverObj.destroy();
            router.push(`${basePath}/services`);
          }
        });
      }
      else if (pathname.endsWith("/services")) {
        driverObj = driver({
          ...commonConfig,
          showProgress: false,
          showButtons: ['next'],
          doneBtnText: "Ir a Proveedores 🚚",
          steps: [
            { element: "main", popover: { title: "🔧 Catálogo de Servicios", description: "Estandariza los precios de tu mano de obra (Alineación, Cambio de Aceite, etc) para facturar más rápido." } },
          ],
          onDestroyStarted: () => {
            driverObj.destroy();
            router.push(`${basePath}/proveedores`);
          }
        });
      }
      else if (pathname.endsWith("/proveedores")) {
        driverObj = driver({
          ...commonConfig,
          showProgress: false,
          showButtons: ['next'],
          doneBtnText: "Ir a Reportes 📈",
          steps: [
            { element: "main", popover: { title: "🚚 Gestión de Proveedores", description: "Crea órdenes de compra, escanea facturas con Inteligencia Artificial y compara precios entre suplidores." } },
          ],
          onDestroyStarted: () => {
            driverObj.destroy();
            router.push(`${basePath}/reports`);
          }
        });
      }
      else if (pathname.endsWith("/reports")) {
        driverObj = driver({
          ...commonConfig,
          showProgress: false,
          showButtons: ['next'],
          doneBtnText: "Ir a Mantenimiento ⚙️",
          steps: [
            { element: "main", popover: { title: "📈 Reportes Inteligentes", description: "Toma decisiones basadas en datos. Descubre qué servicios te generan más dinero y la rentabilidad de tu taller." } },
          ],
          onDestroyStarted: () => {
            driverObj.destroy();
            router.push(`${basePath}/maintenance`);
          }
        });
      }
      else if (pathname.endsWith("/maintenance")) {
        driverObj = driver({
          ...commonConfig,
          showProgress: false,
          showButtons: ['next'],
          doneBtnText: "Ir a Configuración ⚙️",
          steps: [
            { element: "main", popover: { title: "⚙️ Mantenimiento Preventivo", description: "Genera proyecciones y citas de mantenimiento predictivo basados en el kilometraje de los vehículos." } },
          ],
          onDestroyStarted: () => {
            driverObj.destroy();
            router.push(`${basePath}/settings`);
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
            { element: "main", popover: { title: "⚙️ Configuración del Sistema", description: "Personaliza tu logo, ajusta el NCF, configura roles de equipo y plantillas de mensajes de WhatsApp." } },
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
