"use client";

import { useState, useEffect } from "react";
import { Check, Zap, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import { getPlans } from "@/lib/storage";
import type { Plan } from "@/store/types";

function planToTier(plan: Plan) {
  return {
    id: plan.id,
    name: plan.nombre,
    price: plan.precio_mensual === 0 ? "Personalizado" : `RD$ ${plan.precio_mensual.toLocaleString("es-DO")}`,
    period: plan.precio_mensual === 0 ? "" : "/mes",
    description: `Plan ideal para tu taller con hasta ${plan.limite_empleados} usuarios y ${plan.limite_ordenes_mes ? plan.limite_ordenes_mes : "ilimitadas"} órdenes.`,
    features: [
      plan.limite_empleados ? `Hasta ${plan.limite_empleados} técnicos/usuarios` : "Usuarios ilimitados",
      plan.limite_ordenes_mes ? `Hasta ${plan.limite_ordenes_mes} órdenes de trabajo/mes` : "Órdenes de trabajo ilimitadas",
      plan.limite_whatsapp_mes ? `Hasta ${plan.limite_whatsapp_mes.toLocaleString()} mensajes WhatsApp/mes` : "Mensajes WhatsApp ilimitados",
      plan.precio_sucursal_adicional
        ? `Sucursales extra a RD$ ${plan.precio_sucursal_adicional.toLocaleString("es-DO")}/mes`
        : "Sucursales extra sin costo",
      plan.modulos.facturacion_fiscal ? "Facturación Electrónica (NCF)" : "POS básico y facturación",
      plan.modulos.whatsapp ? "WhatsApp Automation" : null,
      plan.modulos.multisucursal ? "Gestión Multi-sucursal" : null,
      plan.modulos.logistica ? "Logística y Repartidores" : null,
      "Gestión de clientes y vehículos",
      plan.destacado ? "Soporte prioritario 24/7" : "Soporte vía email",
    ].filter(Boolean) as string[],
    cta: plan.destacado ? "Empezar con Plan " + plan.nombre : "Empezar gratis",
    featured: !!plan.destacado,
    badge: plan.destacado ? "Más popular" : "",
  };
}

export function Pricing() {
  const storePlans = useStore((s) => s.plans);

  // Start with whatever the store already has (persisted in localStorage)
  const [displayPlans, setDisplayPlans] = useState<ReturnType<typeof planToTier>[]>(
    () => (storePlans && storePlans.length > 0) ? storePlans.map(planToTier) : []
  );

  // Fetch fresh plans from Supabase on mount and sync to store + local state
  useEffect(() => {
    let cancelled = false;
    async function loadPlans() {
      try {
        const plans = await getPlans();
        if (cancelled || !plans || plans.length === 0) return;

        // Sync to Zustand store so other components (register, settings) benefit
        const store = useStore.getState();
        plans.forEach((p) => {
          const exists = store.plans.some((sp) => sp.id === p.id);
          if (exists) store.updatePlan?.(p.id, p);
          else store.addPlan?.(p);
        });

        setDisplayPlans(plans.map(planToTier));
      } catch (err) {
        console.error("[Pricing] Error loading plans:", err);
      }
    }
    loadPlans();
    return () => { cancelled = true; };
  }, []);

  // Reactive fallback: if store gets updated by another source, reflect it
  useEffect(() => {
    if (displayPlans.length === 0 && storePlans && storePlans.length > 0) {
      setDisplayPlans(storePlans.map(planToTier));
    }
  }, [storePlans, displayPlans.length]);

  return (
    <section id="pricing" className="py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-1.5 text-sm font-medium text-neutral-700 border border-neutral-200 mb-6">
            <Zap className="h-3.5 w-3.5" />
            Precios transparentes
          </div>
          <h2 className="text-4xl font-heading font-bold tracking-tight text-neutral-900 sm:text-5xl">
            Planes que crecen{" "}
            <span className="text-neutral-400">con tu negocio.</span>
          </h2>
          <p className="mt-6 text-lg text-neutral-600">
            Sin contratos anuales obligatorios. Sin costos ocultos. Cancela cuando quieras.
          </p>
        </div>

        {/* Billing toggle hint */}
        <p className="text-center text-sm text-neutral-500 mb-10">
          ✨ Primeros <strong className="text-neutral-900">30 días gratis</strong> en cualquier plan. Sin tarjeta de crédito.
        </p>

        {/* Plans */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8 items-center">
          {displayPlans.map((tier, i) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={cn(
                "relative rounded-3xl p-8 border transition-all duration-300 flex flex-col h-full",
                tier.featured
                  ? "bg-neutral-950 border-neutral-800 shadow-2xl scale-[1.03] z-10"
                  : "bg-white border-neutral-200 hover:border-neutral-300 hover:shadow-md"
              )}
            >
              {tier.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-1.5 text-xs font-bold text-white shadow-lg">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {tier.badge}
                  </span>
                </div>
              )}

              {/* Plan header */}
              <div className="mb-6">
                <h3 className={cn("text-lg font-bold", tier.featured ? "text-white" : "text-neutral-900")}>
                  {tier.name}
                </h3>
                <p className={cn("mt-2 text-sm leading-relaxed", tier.featured ? "text-neutral-400" : "text-neutral-600")}>
                  {tier.description}
                </p>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-1 mb-6">
                <span className={cn("text-4xl font-black tracking-tight", tier.featured ? "text-white" : "text-neutral-900")}>
                  {tier.price}
                </span>
                {tier.period && (
                  <span className={cn("text-sm font-semibold", tier.featured ? "text-neutral-500" : "text-neutral-500")}>
                    {tier.period}
                  </span>
                )}
              </div>

              {/* CTA */}
              <Button
                className={cn(
                  "w-full h-12 rounded-xl font-bold text-sm",
                  tier.featured
                    ? "bg-white text-black hover:bg-neutral-100"
                    : "bg-black text-white hover:bg-neutral-800"
                )}
              >
                {tier.cta}
              </Button>

              {/* Divider */}
              <div className={cn("my-8 border-t", tier.featured ? "border-neutral-800" : "border-neutral-100")} />

              {/* Features */}
              <ul className="space-y-3 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className={cn("h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                      tier.featured ? "bg-white/10" : "bg-neutral-100"
                    )}>
                      <Check className={cn("h-3 w-3", tier.featured ? "text-white" : "text-black")} />
                    </div>
                    <span className={cn("text-sm leading-relaxed", tier.featured ? "text-neutral-300" : "text-neutral-700")}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom note */}
        <p className="mt-12 text-center text-sm text-neutral-400">
          ¿Tienes preguntas? Escríbenos a{" "}
          <a href="mailto:hola@www.servitracks.com" className="text-neutral-700 font-medium hover:text-black underline">
            hola@www.servitracks.com
          </a>{" "}
          o agenda una demo gratuita.
        </p>
      </div>
    </section>
  );
}
