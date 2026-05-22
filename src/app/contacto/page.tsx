"use client";

import { motion } from "framer-motion";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Mail, Phone, MapPin, Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ContactoPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div className="space-y-8">
              <div>
                <h1 className="text-4xl font-heading font-bold tracking-tight text-neutral-900 sm:text-6xl">
                  Hablemos.
                </h1>
                <p className="mt-6 text-lg leading-8 text-neutral-600">
                  ¿Tienes dudas sobre cómo implementar ServiTracks en tu taller? Nuestro equipo técnico en RD está listo para ayudarte.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-50 text-neutral-900">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900">Teléfono</h3>
                    <p className="text-neutral-600">+1 (829) 968-1720</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-50 text-neutral-900">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900">Email</h3>
                    <p className="text-neutral-600">contacto@servitracks.com.do</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-50 text-neutral-900">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900">Oficina</h3>
                    <p className="text-neutral-600">Av. Winston Churchill, Santo Domingo, RD</p>
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <a href="https://wa.me/18299681720?text=%2AVENTAS%20SERVITRACKS%2A%20%F0%9F%9A%80%0A%C2%A1Hola%21%20%F0%9F%91%8B%F0%9F%8F%BC%0AEstoy%20interesado%20en%20implementar%20ServiTracks%20en%20mi%20taller%20y%20me%20gustar%C3%ADa%20recibir%20m%C3%A1s%20informaci%C3%B3n." target="_blank" rel="noopener noreferrer">
                  <Button type="button" className="rounded-2xl bg-emerald-500 text-white hover:bg-emerald-600 px-8 h-14 font-bold text-lg">
                    <MessageCircle className="mr-2 h-6 w-6" /> WhatsApp Directo
                  </Button>
                </a>
              </div>
            </div>

            <div className="rounded-3xl border border-neutral-100 bg-white p-8 shadow-2xl shadow-neutral-200/50">
              <form className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input placeholder="Tu nombre" className="h-12 rounded-xl border-neutral-100" />
                  </div>
                  <div className="space-y-2">
                    <Label>Taller</Label>
                    <Input placeholder="Nombre del taller" className="h-12 rounded-xl border-neutral-100" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Correo</Label>
                  <Input type="email" placeholder="ejemplo@correo.com" className="h-12 rounded-xl border-neutral-100" />
                </div>
                <div className="space-y-2">
                  <Label>Mensaje</Label>
                  <Textarea placeholder="¿En qué podemos ayudarte?" className="min-h-[150px] rounded-xl border-neutral-100 p-4" />
                </div>
                <Button className="w-full h-14 rounded-xl bg-black text-white font-bold text-lg hover:bg-neutral-800">
                  <Send className="mr-2 h-5 w-5" /> Enviar Mensaje
                </Button>
              </form>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
