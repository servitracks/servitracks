"use client";

import { Link } from "@/lib/next-compat";
import { Wrench } from "lucide-react";

const footerLinks = {
  Producto: [
    { label: "Características", href: "/#features" },
    { label: "Módulos", href: "/#modules" },
    { label: "Precios", href: "/#pricing" },
    { label: "Testimonios", href: "/#testimonials" },
    { label: "Demo en vivo", href: "/autocheck" },
  ],
  Empresa: [
    { label: "Nosotros", href: "/nosotros" },
    { label: "Blog", href: "/blog" },
    { label: "Contacto", href: "/contacto" },
    { label: "Soporte", href: "https://wa.me/18299681720?text=%2ASOPORTE%20SERVITRACKS%2A%20%F0%9F%9B%A0%EF%B8%8F%0A%C2%A1Hola%20equipo%21%20%F0%9F%91%8B%F0%9F%8F%BC%0AEstoy%20utilizando%20el%20sistema%20y%20necesito%20asistencia%20t%C3%A9cnica%20con%20mi%20cuenta." },
  ],
  Legal: [
    { label: "Privacidad", href: "/legal/privacidad" },
    { label: "Términos de Uso", href: "/legal/terminos" },
    { label: "Cookies", href: "/legal/cookies" },
  ],
  Módulos: [
    { label: "POS / Facturación", href: "/#features" },
    { label: "Inventario", href: "/#features" },
    { label: "Órdenes de Trabajo", href: "/#modules" },
    { label: "CRM Clientes", href: "/#features" },
    { label: "WhatsApp Automation", href: "/#features" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-white border-t border-neutral-100">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16">
        {/* Top: logo + columns */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 pb-12 border-b border-neutral-100">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 group mb-4">
              <img src="/logo.servitracks.png" alt="ServiTracks" className="h-20 w-auto object-contain" />
            </Link>
            <p className="text-sm text-neutral-500 leading-relaxed">
              El software líder para talleres mecánicos en República Dominicana.
            </p>
            <p className="mt-4 text-xs text-neutral-400 font-medium">
              📍 Santo Domingo, RD
            </p>
            <a
              href="mailto:hola@www.servitracks.com"
              className="text-xs text-neutral-500 hover:text-black transition-colors mt-1 block"
            >
              hola@www.servitracks.com
            </a>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-4">
                {section}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      onClick={(e) => {
                        if (link.href.startsWith('/#')) {
                          const hash = link.href.substring(1);
                          if (window.location.pathname === '/') {
                            e.preventDefault();
                            const el = document.querySelector(hash);
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }
                        }
                      }}
                      className="text-sm text-neutral-600 hover:text-black transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-neutral-400">
            © 2026 ServiTracks. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-6">
            <span className="text-xs text-neutral-400 flex items-center gap-1.5">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              Todos los sistemas operativos
            </span>
            <span className="text-xs text-neutral-400">
              Hecho con ♥ en República Dominicana 🇩🇴
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
