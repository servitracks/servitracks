"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useRouter } from "@/lib/next-compat";
import { useStore } from "@/store/useStore";

export function CTASection({ city }: { city?: string | null }) {
  const router = useRouter();
  const setDemoActive = useStore((s) => s.setDemoActive);

  return (
    <section className="py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden bg-neutral-950 rounded-3xl px-8 py-16 sm:px-16 sm:py-24 text-center"
        >
          {/* Background pattern */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(to right, #fff 1px, transparent 1px)`,
              backgroundSize: "48px 48px",
            }}
          />

          {/* Glows */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-white/5 rounded-full blur-3xl" />

          <div className="relative">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold text-white tracking-tight leading-tight">
              Tu taller merece{" "}
              <span className="text-neutral-400">tecnología de primer nivel.</span>
            </h2>
            <p className="mt-6 text-lg sm:text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed">
              Únete a los talleres mecánicos en {city ? city : "República Dominicana"} que ya operan con más orden,
              más velocidad y más rentabilidad con ServiTracks.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="w-full sm:w-auto rounded-full px-10 h-14 text-base font-bold bg-white text-black hover:bg-neutral-100 shadow-xl gap-2"
                onClick={() => router.push("/register")}
              >
                Empezar gratis — 07 días
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="w-full sm:w-auto rounded-full px-10 h-14 text-base font-medium text-neutral-400 hover:text-white hover:bg-white/10 border border-white/10"
                onClick={() => {
                  setDemoActive(true);
                  router.push("/autocheck");
                }}
              >
                Ver demostración
              </Button>
            </div>

            <p className="mt-6 text-sm text-neutral-600">
              Sin tarjeta de crédito · Sin contratos · Cancela cuando quieras
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
