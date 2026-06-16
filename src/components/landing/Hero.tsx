"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/lib/next-compat";
import { useStore } from "@/store/useStore";
import { ArrowRight, CheckCircle2, Play, TrendingUp, Users, Package } from "lucide-react";

const trustBadges = [
  "Multitenant SaaS",
  "POS con ITBIS",
  "WhatsApp Automation",
  "NCF / DGII",
  "Sin instalación",
];

const floatingStats = [
  { label: "Talleres activos", value: "200+", icon: Users, color: "bg-blue-50 text-blue-600" },
  { label: "Facturas generadas", value: "48K+", icon: TrendingUp, color: "bg-emerald-50 text-emerald-600" },
  { label: "Productos gestionados", value: "120K+", icon: Package, color: "bg-orange-50 text-orange-600" },
];

export function Hero({ city }: { city?: string | null }) {
  const router = useRouter();
  const setDemoActive = useStore((s) => s.setDemoActive);
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const currentTenant = useStore((s) => s.currentTenant);

  return (
    <section className="relative overflow-hidden bg-white pt-24 pb-0">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(to right, #000 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Radial glow top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-radial from-neutral-100 to-transparent opacity-60 pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex justify-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-1.5 text-sm font-medium text-neutral-700 border border-neutral-200 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Nuevo: Automatización WhatsApp con WaSender API
            <ArrowRight className="h-3 w-3" />
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center max-w-4xl mx-auto"
        >
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-heading font-semibold tracking-tight text-neutral-900 leading-[1.08]">
            {city ? "El mejor software para tu taller" : "Administra tu taller"}{" "}
            <span className="relative">
              <span className="text-neutral-900">mecánico</span>
              <svg className="absolute -bottom-2 left-0 w-full" height="6" viewBox="0 0 400 6" fill="none">
                <path d="M0 3 Q100 0 200 3 Q300 6 400 3" stroke="#000" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.2" />
              </svg>
            </span>{" "}
            {city ? `en ${city}.` : <span className="text-neutral-400">sin caos.</span>}
          </h1>

          <p className="mt-8 text-lg sm:text-xl leading-relaxed text-neutral-500 max-w-2xl mx-auto">
            Inventario, facturación POS, clientes, vehículos y mantenimientos —
            todo en una plataforma ultramoderna diseñada para los mejores talleres de{" "}
            <span className="font-semibold text-neutral-700">{city ? city : "República Dominicana"}</span>.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              className="w-full sm:w-auto rounded-full px-8 h-14 text-base font-semibold bg-black text-white hover:bg-neutral-800 shadow-lg hover:shadow-xl transition-all gap-2"
              onClick={() => router.push("/register")}
            >
              Empezar gratis — es fácil
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto rounded-full px-8 h-14 text-base font-medium border-neutral-200 hover:border-neutral-400 gap-2"
              onClick={() => {
                setDemoActive(true);
                if (isAuthenticated && currentTenant?.slug) {
                  router.push(`/${currentTenant.slug}`);
                } else {
                  router.push("/autocheck");
                }
              }}
            >
              <div className="h-6 w-6 rounded-full bg-neutral-900 flex items-center justify-center">
                <Play className="h-2.5 w-2.5 text-white fill-white ml-0.5" />
              </div>
              Ver demostración
            </Button>
          </div>

          {/* Trust badges */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {trustBadges.map((badge) => (
              <div key={badge} className="flex items-center gap-1.5 text-sm text-neutral-500">
                <CheckCircle2 className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                {badge}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, y: 48, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-20 relative"
        >
          {/* Floating stat cards */}
          {floatingStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, x: i === 0 ? -20 : i === 1 ? 0 : 20, y: i === 1 ? -20 : 0 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ delay: 0.7 + i * 0.15, duration: 0.5 }}
              className={`absolute z-10 hidden md:flex items-center gap-3 bg-white border border-neutral-100 rounded-2xl px-4 py-3 shadow-xl ${i === 0 ? "-left-4 top-16" : i === 1 ? "right-0 -top-6" : "-right-4 bottom-24"
                }`}
            >
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${stat.color}`}>
                <stat.icon className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 font-medium">{stat.label}</p>
                <p className="text-lg font-black text-neutral-900 leading-tight">{stat.value}</p>
              </div>
            </motion.div>
          ))}

          {/* Main browser mockup */}
          <div className="relative mx-auto max-w-5xl rounded-t-2xl border border-neutral-200 border-b-0 bg-white shadow-2xl overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-neutral-50 border-b border-neutral-200">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-[#FF5F57]" />
                <div className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
                <div className="h-3 w-3 rounded-full bg-[#28C840]" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-neutral-200/60 rounded-lg h-6 flex items-center px-3 max-w-xs mx-auto">
                  <span className="text-xs text-neutral-500">www.servitracks.com/autocheck</span>
                </div>
              </div>
            </div>

            {/* Dashboard preview — SVG inline */}
            <div className="bg-neutral-50 min-h-[460px] flex">
              {/* Sidebar */}
              <div className="w-52 bg-white border-r border-neutral-100 p-4 hidden sm:flex flex-col gap-1">
                <div className="flex items-center gap-2 px-3 py-2 mb-4">
                  <div className="h-7 w-7 rounded-lg bg-black flex items-center justify-center">
                    <span className="text-white text-xs font-bold">S</span>
                  </div>
                  <span className="text-sm font-bold text-neutral-900">ServiTrackss</span>
                </div>
                {["Dashboard", "Inventario", "POS", "Clientes", "Vehículos", "Órdenes", "Reportes"].map((item, i) => (
                  <div
                    key={item}
                    className={`text-xs px-3 py-2 rounded-lg font-medium transition-colors ${i === 0 ? "bg-black text-white" : "text-neutral-500 hover:bg-neutral-50"
                      }`}
                  >
                    {item}
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="flex-1 p-6 overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-base font-bold text-neutral-900">Buenos días, Autocheck 👋</h3>
                    <p className="text-xs text-neutral-500">Martes, 13 de mayo 2026</p>
                  </div>
                  <div className="h-8 w-24 bg-black rounded-lg text-white text-xs flex items-center justify-center font-medium">
                    + Nueva orden
                  </div>
                </div>

                {/* KPI cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: "Ingresos hoy", value: "RD$ 28,400", color: "text-neutral-900" },
                    { label: "Órdenes activas", value: "12", color: "text-blue-600" },
                    { label: "Vehículos en taller", value: "8", color: "text-orange-600" },
                    { label: "Facturas pendientes", value: "RD$ 5,200", color: "text-rose-600" },
                  ].map((kpi) => (
                    <div key={kpi.label} className="bg-white border border-neutral-100 rounded-xl p-3 shadow-sm">
                      <p className="text-[10px] text-neutral-500 font-medium mb-1">{kpi.label}</p>
                      <p className={`text-base font-black ${kpi.color}`}>{kpi.value}</p>
                    </div>
                  ))}
                </div>

                {/* Chart placeholder */}
                <div className="bg-white border border-neutral-100 rounded-xl p-4 shadow-sm h-[160px] flex items-end gap-1.5 overflow-hidden">
                  {[45, 72, 55, 88, 62, 95, 70, 48, 82, 90, 65, 78].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end">
                      <div
                        className={`rounded-sm ${i === 6 ? "bg-black" : "bg-neutral-200"} transition-all`}
                        style={{ height: `${h}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
