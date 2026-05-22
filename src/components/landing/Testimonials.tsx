"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Carlos García",
    role: "Dueño — Taller García Automotriz",
    location: "Santo Domingo",
    avatar: "CG",
    rating: 5,
    quote:
      "Antes manejaba todo en hojas de Excel y WhatsApp manual. Ahora con ServiTracks facturó en 90 segundos y mis clientes reciben recordatorios automáticos. Fue la mejor inversión del año.",
  },
  {
    name: "Ana Mercedes Belliard",
    role: "Administradora — Servicentro Santiago",
    location: "Santiago de los Caballeros",
    avatar: "AB",
    rating: 5,
    quote:
      "El control de inventario me salvó de múltiples pérdidas. Las alertas de stock bajo llegan justo cuando deben. Y la facturación con NCF está perfectamente integrada con nuestra operación.",
  },
  {
    name: "Ramón Féliz",
    role: "Gerente — AutoCare RD",
    location: "La Romana",
    avatar: "RF",
    rating: 5,
    quote:
      "Lo que más valoro es que funciona desde el celular. Puedo ver el estado de mi taller desde cualquier lugar. El dashboard de métricas me ayuda a tomar decisiones en tiempo real.",
  },
  {
    name: "Ingrid Peralta",
    role: "Dueña — CenterCar SDE",
    location: "Santo Domingo Este",
    avatar: "IP",
    rating: 5,
    quote:
      "Mis clientes me preguntan qué sistema uso porque se impresionan con las facturas. Nunca pensé que un software pudiera hacer que mi negocio se vea tan profesional.",
  },
  {
    name: "Luis Pérez",
    role: "Técnico Senior — MecánicaExpress",
    location: "Punta Cana",
    avatar: "LP",
    rating: 5,
    quote:
      "Las órdenes de trabajo son geniales. Puedo ver qué vehículos me tocan, subir fotos y marcar el progreso sin papel. Antes perdíamos ordenes. Ahora todo está registrado.",
  },
  {
    name: "Yanelys Rodríguez",
    role: "Recepcionista — Taller El As",
    location: "La Vega",
    avatar: "YR",
    rating: 5,
    quote:
      "Registro un vehículo nuevo en menos de 2 minutos. El historial del cliente está siempre a la mano. Ha reducido los errores de comunicación con los mecánicos al mínimo.",
  },
];

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
      ))}
    </div>
  );
}

export function Testimonials() {
  return (
    <section id="testimonials" className="py-24 sm:py-32 bg-neutral-50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-neutral-200 px-4 py-1.5 text-sm font-medium text-neutral-700 mb-6">
            <Stars count={5} />
            <span>+200 talleres confían en ServiTracks</span>
          </div>
          <h2 className="text-4xl font-heading font-bold tracking-tight text-neutral-900 sm:text-5xl">
            Lo que dicen{" "}
            <span className="text-neutral-400">los que ya lo usan.</span>
          </h2>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: (i % 3) * 0.1, duration: 0.5 }}
              className="bg-white rounded-2xl border border-neutral-100 p-6 shadow-sm hover:shadow-md transition-all"
            >
              <Stars count={t.rating} />
              <blockquote className="mt-4 text-sm leading-relaxed text-neutral-700 font-medium">
                "{t.quote}"
              </blockquote>
              <div className="mt-6 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-neutral-900 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-black text-white">{t.avatar}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-neutral-900 truncate">{t.name}</p>
                  <p className="text-xs text-neutral-500 truncate">{t.role}</p>
                </div>
                <div className="ml-auto flex-shrink-0">
                  <span className="text-[10px] font-semibold text-neutral-400 bg-neutral-100 px-2 py-1 rounded-full">
                    {t.location}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
