"use client";

import { motion } from "framer-motion";

const stats = [
  { value: "200+", label: "Talleres activos en RD" },
  { value: "48K+", label: "Facturas emitidas" },
  { value: "99.9%", label: "Uptime garantizado" },
  { value: "40%", label: "Menos tiempo en admin" },
];

export function SocialProof() {
  return (
    <section className="bg-neutral-950 py-16 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="text-center"
            >
              <div className="text-4xl lg:text-5xl font-heading font-black text-white tracking-tight">
                {stat.value}
              </div>
              <div className="mt-2 text-sm text-neutral-400 font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Scrolling marquee logos */}
        <div className="mt-14 relative overflow-hidden">
          <p className="text-center text-xs font-semibold text-neutral-600 uppercase tracking-widest mb-8">
            Confiado por talleres en toda República Dominicana
          </p>
          <div className="flex gap-12 animate-marquee whitespace-nowrap">
            {[
              "Taller García Automotriz",
              "AutoCare RD",
              "Servicentro Santiago",
              "Mecánica Bienvenido",
              "CenterCar SDE",
              "AutoFix Punta Cana",
              "Taller El As",
              "Mecánica Express",
              "Taller García Automotriz",
              "AutoCare RD",
              "Servicentro Santiago",
              "Mecánica Bienvenido",
            ].map((name, i) => (
              <span key={i} className="text-neutral-700 font-heading font-semibold text-sm">
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
