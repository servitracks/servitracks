"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "¿ServiTracks soporta facturación con NCF?",
    answer:
      "Sí. ServiTracks está completamente adaptado a las normativas de la DGII. Puedes configurar y emitir comprobantes de Crédito Fiscal (B01), Consumo (B02), Nota de Débito (B03) y regímenes especiales. El sistema calcula el ITBIS automáticamente.",
  },
  {
    question: "¿Puedo usarlo desde mi celular o tablet?",
    answer:
      "¡Por supuesto! ServiTracks es una plataforma web 100% responsive y mobile-first. Accede desde cualquier dispositivo sin instalar nada. El POS tiene una vista optimizada para tablets perfecta para el punto de venta.",
  },
  {
    question: "¿Cómo funciona la integración con WhatsApp?",
    answer:
      "Usamos WaSender API para conectar tu número de WhatsApp al sistema. Configuras los mensajes una vez y el sistema los envía automáticamente: recordatorios de mantenimiento, notificaciones de entrega de vehículos y facturas pendientes.",
  },
  {
    question: "¿Mis datos están seguros en la nube?",
    answer:
      "Totalmente. Utilizamos Supabase y Vercel con encriptación AES-256, backups automáticos cada 6 horas, Row Level Security por tenant y un uptime garantizado del 99.9%. Tus datos nunca se mezclan con los de otros talleres.",
  },
  {
    question: "¿Qué pasa si tengo más de una sucursal?",
    answer:
      "El plan Enterprise soporta múltiples sucursales bajo una misma organización. Puedes ver métricas consolidadas o por sucursal, con usuarios y roles independientes para cada una.",
  },
  {
    question: "¿Cuánto tiempo toma configurar el sistema?",
    answer:
      "La mayoría de talleres están operativos en menos de 1 hora. El proceso incluye: registro, configuración del taller, importación de inventario (CSV) y primera factura. Ofrecemos onboarding guiado sin costo adicional.",
  },
  {
    question: "¿Puedo importar mi inventario existente?",
    answer:
      "Sí. ServiTracks acepta importación de inventario vía CSV/Excel con una plantilla que descargamos para ti. También puedes registrar productos con lector de código de barras conectado al navegador.",
  },
  {
    question: "¿ServiTracks funciona con impresoras térmicas?",
    answer:
      "Sí. Compatible con impresoras térmicas de 80mm y 57mm. El sistema genera tickets con tu logo, datos del taller, desglose de productos/servicios, ITBIS, NCF y QR de comprobación. Todo en una sola impresión.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-24 sm:py-32 bg-neutral-50">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-heading font-bold tracking-tight text-neutral-900 sm:text-5xl">
            Preguntas{" "}
            <span className="text-neutral-400">Frecuentes</span>
          </h2>
          <p className="mt-4 text-lg text-neutral-600">
            Todo lo que necesitas saber antes de empezar.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04, duration: 0.4 }}
              className={cn(
                "rounded-2xl border bg-white overflow-hidden transition-all duration-200",
                openIndex === i ? "border-neutral-300 shadow-md" : "border-neutral-100 shadow-sm hover:border-neutral-200"
              )}
            >
              <button
                className="flex w-full items-center justify-between px-6 py-5 text-left gap-4"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <span className="text-sm font-bold text-neutral-900 leading-snug">{faq.question}</span>
                <div className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200",
                  openIndex === i ? "bg-black" : "bg-neutral-100"
                )}>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      openIndex === i ? "rotate-180 text-white" : "text-neutral-600"
                    )}
                  />
                </div>
              </button>
              <AnimatePresence initial={false}>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                  >
                    <div className="px-6 pb-6 text-sm leading-relaxed text-neutral-600">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        <p className="mt-12 text-center text-sm text-neutral-500">
          ¿No encontraste tu respuesta?{" "}
          <a href="mailto:hola@www.servitracks.com" className="font-semibold text-neutral-900 hover:underline">
            Escríbenos →
          </a>
        </p>
      </div>
    </section>
  );
}
