"use client";

import { motion } from "framer-motion";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Users, Target, ShieldCheck, Heart } from "lucide-react";

export default function NosotrosPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-20">
            <h1 className="text-4xl font-heading font-bold tracking-tight text-neutral-900 sm:text-6xl">
              Nuestra Misión en <span className="text-neutral-400">RD</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-neutral-600">
              Transformar la industria automotriz de la República Dominicana a través de tecnología intuitiva, eficiente y profesional.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-32">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-neutral-900">¿Quiénes somos?</h2>
              <p className="text-neutral-600 leading-relaxed">
                ServiTracks nació de la necesidad observada en cientos de talleres mecánicos en Santo Domingo y Santiago que aún dependían del papel o sistemas obsoletos. 
              </p>
              <p className="text-neutral-600 leading-relaxed">
                Somos un equipo de desarrolladores y expertos en la industria automotriz apasionados por el orden y la eficiencia operativa. Creemos que cada taller, sin importar su tamaño, merece herramientas de clase mundial.
              </p>
            </div>
            <div className="h-96 rounded-3xl bg-neutral-100 flex items-center justify-center p-12 text-center border border-neutral-200">
               <p className="text-neutral-400 font-medium italic">"Nuestra visión es ser el estándar de gestión para todo taller líder en el Caribe."</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Users, title: "Comunidad", desc: "Apoyamos el crecimiento de los talleres locales." },
              { icon: Target, title: "Precisión", desc: "Software exacto para finanzas y stock." },
              { icon: ShieldCheck, title: "Confianza", desc: "Seguridad total para tus datos y clientes." },
              { icon: Heart, title: "Servicio", desc: "Soporte local en tu mismo idioma y horario." },
            ].map((v, i) => (
              <Card key={i} className="border-neutral-100 p-8 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white mb-6">
                  <v.icon className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-neutral-900 mb-2">{v.title}</h3>
                <p className="text-sm text-neutral-500">{v.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border ${className}`}>{children}</div>;
}
