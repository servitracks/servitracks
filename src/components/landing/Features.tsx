"use client";

import { motion } from "framer-motion";
import {
  Package,
  CreditCard,
  Car,
  Smartphone,
  BarChart3,
  ShieldCheck,
  ClipboardList,
  Users,
  Bell,
  Wrench,
} from "lucide-react";

const features = [
  {
    name: "Control de Inventario",
    description:
      "CRUD completo con SKU, variaciones, alertas de stock bajo, historial de movimientos, importación CSV y lector de código de barras.",
    icon: Package,
    badge: "Esencial",
    highlight: false,
  },
  {
    name: "POS Ultrarrápido",
    description:
      "Terminal de venta moderna con búsqueda instantánea, impresoras térmicas 80mm, ITBIS automático, cotizaciones y cierre de caja.",
    icon: CreditCard,
    badge: "Más popular",
    highlight: true,
  },
  {
    name: "Gestión de Vehículos",
    description:
      "Historial completo por placa, VIN y marca. Kilometraje, fotos, notas técnicas y próximas visitas en un solo lugar.",
    icon: Car,
    badge: "",
    highlight: false,
  },
  {
    name: "WhatsApp Automation",
    description:
      "Recordatorios de cambio de aceite, mantenimiento preventivo, cumpleaños y facturas pendientes via WaSender API.",
    icon: Smartphone,
    badge: "Pro",
    highlight: false,
  },
  {
    name: "Órdenes de Trabajo",
    description:
      "Flujo Pendiente → Diagnóstico → Reparación → Finalizado. Asigna mecánicos, agrega fotos, checklists y firma digital.",
    icon: ClipboardList,
    badge: "",
    highlight: false,
  },
  {
    name: "CRM de Clientes",
    description:
      "Historial completo, frecuencia de visitas, gasto total, etiquetas VIP y campañas de marketing por WhatsApp.",
    icon: Users,
    badge: "",
    highlight: false,
  },
  {
    name: "Dashboard Financiero",
    description:
      "Métricas del día, ingresos mensuales, top productos, top clientes, mecánicos más activos y gráficos en tiempo real.",
    icon: BarChart3,
    badge: "",
    highlight: false,
  },
  {
    name: "Recordatorios Inteligentes",
    description:
      "El sistema calcula fechas automáticamente, detecta clientes inactivos y sugiere seguimientos basados en kilometraje.",
    icon: Bell,
    badge: "",
    highlight: false,
  },
  {
    name: "Seguridad y RBAC",
    description:
      "Aislamiento total de datos por taller, roles granulares (Dueño, Cajero, Mecánico, Recepción), 2FA y auditoría completa.",
    icon: ShieldCheck,
    badge: "",
    highlight: false,
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-1.5 text-sm font-medium text-neutral-700 border border-neutral-200 mb-6">
            <Wrench className="h-3.5 w-3.5" />
            Todo lo que necesitas
          </div>
          <h2 className="text-4xl font-heading font-bold tracking-tight text-neutral-900 sm:text-5xl">
            Diseñado para la velocidad{" "}
            <span className="text-neutral-400">operativa de tu taller.</span>
          </h2>
          <p className="mt-6 text-lg leading-8 text-neutral-600">
            Cada módulo fue pensado con talleres reales. Menos clics, más operación.
            Un solo sistema que reemplaza 5 hojas de cálculo.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: (i % 3) * 0.08, duration: 0.5 }}
              className={`group relative rounded-2xl p-6 border transition-all duration-300 hover:shadow-lg ${
                feature.highlight
                  ? "bg-neutral-950 border-neutral-800 text-white hover:shadow-black/20"
                  : "bg-white border-neutral-100 hover:border-neutral-200"
              }`}
            >
              {feature.badge && (
                <span
                  className={`absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    feature.highlight
                      ? "bg-white/10 text-white"
                      : "bg-black text-white"
                  }`}
                >
                  {feature.badge}
                </span>
              )}
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center mb-5 transition-colors ${
                  feature.highlight
                    ? "bg-white/10 text-white"
                    : "bg-neutral-100 text-neutral-900 group-hover:bg-black group-hover:text-white"
                }`}
              >
                <feature.icon className="h-5 w-5" />
              </div>
              <h3
                className={`text-base font-bold mb-2 ${
                  feature.highlight ? "text-white" : "text-neutral-900"
                }`}
              >
                {feature.name}
              </h3>
              <p
                className={`text-sm leading-relaxed ${
                  feature.highlight ? "text-neutral-400" : "text-neutral-600"
                }`}
              >
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
