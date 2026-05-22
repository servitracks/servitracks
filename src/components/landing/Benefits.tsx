"use client";

import { motion } from "framer-motion";
import { Shield, Zap, Heart, CheckCircle2, TrendingUp, Lock } from "lucide-react";

const benefits = [
  {
    title: "Cumplimiento con NCF y DGII",
    description:
      "Genera facturas con Comprobante de Crédito Fiscal (B01), Consumo (B02) y regímenes especiales. 100% adaptado a las normativas vigentes.",
    icon: Shield,
  },
  {
    title: "40% menos tiempo en administración",
    description:
      "Automatiza recordatorios, facturas y reportes. Tus mecánicos se enfocan en reparar; el sistema hace lo demás.",
    icon: Zap,
  },
  {
    title: "Retención de clientes comprobada",
    description:
      "Los recordatorios automáticos por WhatsApp aumentan el retorno de clientes hasta un 35% en los primeros 3 meses.",
    icon: Heart,
  },
  {
    title: "Control de inventario anti-pérdidas",
    description:
      "Evita el robo hormiga y el desabastecimiento. Alertas en tiempo real cuando un producto baja de su mínimo.",
    icon: CheckCircle2,
  },
  {
    title: "Datos que impulsan decisiones",
    description:
      "Dashboard financiero con ingresos diarios, productos más vendidos y mecánicos más productivos.",
    icon: TrendingUp,
  },
  {
    title: "Seguridad de grado bancario",
    description:
      "Tus datos están en servidores con encriptación AES-256, backups automáticos cada 6 horas y uptime del 99.9%.",
    icon: Lock,
  },
];

export function Benefits() {
  return (
    <section className="py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-1.5 text-sm font-medium text-neutral-700 border border-neutral-200 mb-6">
            ¿Por qué ServiTracks?
          </div>
          <h2 className="text-4xl font-heading font-bold tracking-tight text-neutral-900 sm:text-5xl">
            La ventaja competitiva que{" "}
            <span className="text-neutral-400">tu taller necesita.</span>
          </h2>
          <p className="mt-6 text-lg leading-8 text-neutral-600">
            En República Dominicana, el mercado automotriz es altamente competitivo.
            ServiTracks te da las herramientas para destacar con un servicio profesional y organizado.
          </p>
        </div>

        {/* Benefits grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, i) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: (i % 3) * 0.1, duration: 0.5 }}
              className="group flex gap-4"
            >
              <div className="flex-none h-12 w-12 rounded-xl bg-neutral-100 text-neutral-900 flex items-center justify-center transition-all duration-300 group-hover:bg-black group-hover:text-white">
                <benefit.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 mb-1.5">{benefit.title}</h3>
                <p className="text-sm leading-relaxed text-neutral-600">{benefit.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Big number banner */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-20 bg-neutral-950 rounded-3xl p-10 flex flex-col md:flex-row items-center justify-between gap-8"
        >
          <div>
            <p className="text-white text-xl font-heading font-bold leading-relaxed">
              "Con ServiTracks reduje el tiempo de facturación de{" "}
              <span className="text-neutral-400">15 minutos a menos de 2.</span>"
            </p>
            <p className="mt-4 text-neutral-500 text-sm font-medium">
              — Carlos García, Taller García Automotriz, Santo Domingo
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-6xl font-heading font-black text-white tracking-tighter">87%</div>
            <div className="text-neutral-500 text-sm font-medium mt-1">de mejora en eficiencia</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
