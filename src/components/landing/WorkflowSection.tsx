"use client";

import { motion } from "framer-motion";
import {
  ClipboardList,
  Clock,
  Wrench,
  Package,
  CheckCircle,
  Truck,
} from "lucide-react";

const steps = [
  {
    icon: ClipboardList,
    label: "Pendiente",
    description: "Cliente trae el vehículo. Se registra la orden con fotos y síntomas.",
    color: "bg-neutral-100 text-neutral-700",
  },
  {
    icon: Clock,
    label: "En diagnóstico",
    description: "El mecánico evalúa el vehículo y crea el presupuesto para aprobación.",
    color: "bg-blue-50 text-blue-700",
  },
  {
    icon: Wrench,
    label: "En reparación",
    description: "Trabajo en progreso. Registro de tiempo y piezas en tiempo real.",
    color: "bg-orange-50 text-orange-700",
  },
  {
    icon: Package,
    label: "Esperando piezas",
    description: "Sistema notifica al cliente automáticamente por WhatsApp.",
    color: "bg-purple-50 text-purple-700",
  },
  {
    icon: CheckCircle,
    label: "Finalizado",
    description: "Control de calidad completado. Factura generada con NCF.",
    color: "bg-emerald-50 text-emerald-700",
  },
  {
    icon: Truck,
    label: "Entregado",
    description: "Historial actualizado. Próximo mantenimiento agendado automáticamente.",
    color: "bg-black text-white",
  },
];

export function WorkflowSection() {
  return (
    <section id="modules" className="py-24 sm:py-32 bg-neutral-50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left text */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-neutral-200 px-4 py-1.5 text-sm font-medium text-neutral-700 mb-6">
              Órdenes de Trabajo
            </div>
            <h2 className="text-4xl font-heading font-bold tracking-tight text-neutral-900 sm:text-5xl">
              Cada vehículo,{" "}
              <span className="text-neutral-400">bajo control total.</span>
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-neutral-600">
              Las órdenes de trabajo de ServiTracks siguen el ciclo completo del servicio.
              Desde la recepción hasta la entrega, con trazabilidad total para ti y tu equipo.
            </p>
            <div className="mt-8 space-y-4">
              {[
                "Asignación de mecánicos con tiempo estimado",
                "Checklists de diagnóstico personalizables",
                "Adjuntos de fotos del vehículo",
                "Firma digital del cliente",
                "Notificaciones automáticas por WhatsApp",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-neutral-700 font-medium">
                  <div className="h-5 w-5 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-3 w-3 text-white" />
                  </div>
                  {item}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right flow */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative"
          >
            <div className="space-y-3">
              {steps.map((step, i) => (
                <motion.div
                  key={step.label}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                  className="flex items-center gap-4 bg-white rounded-xl border border-neutral-100 p-4 shadow-sm hover:shadow-md transition-all group"
                >
                  {/* Step number */}
                  <span className="text-xs font-black text-neutral-300 w-4 flex-shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {/* Icon */}
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${step.color}`}
                  >
                    <step.icon className="h-4.5 w-4.5" />
                  </div>
                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-neutral-900">{step.label}</p>
                    <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{step.description}</p>
                  </div>
                  {/* Connector dot */}
                  {i < steps.length - 1 && (
                    <div className="h-2 w-2 rounded-full bg-neutral-200 flex-shrink-0" />
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
