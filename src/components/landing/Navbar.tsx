"use client";

import { Link, useRouter } from "@/lib/next-compat";
import { useState, useEffect } from "react";
import { Menu, X, ChevronDown, Wrench, Lock, Sparkles } from "lucide-react";
import { useStore } from "@/store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

const nav = [
  { label: "Características", href: "/#features" },
  { label: "Módulos", href: "/#modules" },
  { label: "Precios", href: "/#pricing" },
  { label: "Testimonios", href: "/#testimonials" },
  { label: "Blog", href: "/blog" },
];

export function Navbar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  const { currentUserId, isAuthenticated, users, tenants } = useStore();
  const currentUser = users.find(u => u.id === currentUserId);
  const userTenant = currentUser ? tenants.find(t => t.id === currentUser.tenantId) : null;

  // ── Leer sesión desde localStorage para detectar auth entre recargas ──
  const [sessionDashboard, setSessionDashboard] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("servitracks-session") || sessionStorage.getItem("servitracks-session");
    if (!raw) { setHasSession(false); return; }
    try {
      const s = JSON.parse(raw);
      setHasSession(true);
      // Superadmin
      if (s.empleado_id === 'admin' || s.role === 'superadmin') {
        setSessionDashboard('/admin');
        return;
      }
      // Tenant user: usar slug directo de la sesión si está disponible
      if (s.tenant_slug) {
        setSessionDashboard(`/${s.tenant_slug}`);
        return;
      }
      if (s.tenant_id) {
        const t = tenants.find(t => t.id === s.tenant_id);
        if (t?.slug) { setSessionDashboard(`/${t.slug}`); return; }
        setSessionDashboard(`/login`);
      }
    } catch { setHasSession(false); }
  }, [tenants]);

  // El usuario está "logueado" si el store lo dice O si hay sesión en localStorage
  const loggedIn = isAuthenticated || hasSession;

  const getDashboardPath = () => {
    // Primero prioridad: sesión localStorage (más confiable tras recarga)
    if (sessionDashboard && sessionDashboard !== '/login') return sessionDashboard;
    // Fallback: store Zustand
    if (currentUserId === 'admin') return '/admin';
    if (currentUser && userTenant) return `/${userTenant.slug}`;
    return '/login';
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-neutral-100"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <img src="/logo.servitracks.png" alt="ServiTracks" className="h-20 w-auto object-contain" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-x-8">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  if (item.href.startsWith('/#')) {
                    const hash = item.href.substring(1);
                    if (window.location.pathname === '/') {
                      e.preventDefault();
                      const el = document.querySelector(hash);
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }
                  }
                }}
                className="text-sm font-medium text-neutral-600 hover:text-black transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-x-3">
            {loggedIn ? (
              <Button
                className="rounded-full px-6 bg-black text-white hover:bg-neutral-800 font-medium shadow-sm"
                onClick={() => router.push(getDashboardPath())}
              >
                Ir a mi cuenta →
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="text-sm font-medium text-neutral-600 hover:text-black cursor-pointer gap-2"
                  onClick={() => router.push("/login")}
                >
                  <Lock className="h-4 w-4" />
                  Ingresar
                </Button>
                <Button
                  className="rounded-full px-6 bg-black text-white hover:bg-neutral-800 font-semibold shadow-md gap-2"
                  onClick={() => router.push("/register")}
                >
                  <Sparkles className="h-4 w-4" />
                  Registrarse →
                </Button>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-neutral-100 transition-colors"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-white border-t border-neutral-100 overflow-hidden"
          >
            <div className="px-6 py-6 space-y-4">
              {nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(e) => {
                    if (item.href.startsWith('/#')) {
                      const hash = item.href.substring(1);
                      if (window.location.pathname === '/') {
                        e.preventDefault();
                        setOpen(false);
                        const el = document.querySelector(hash);
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      } else {
                        setOpen(false);
                      }
                    } else {
                      setOpen(false);
                    }
                  }}
                  className="block text-base font-medium text-neutral-700 hover:text-black transition-colors py-1"
                >
                  {item.label}
                </a>
              ))}
              <div className="pt-4 flex flex-col gap-3">
                {loggedIn ? (
                  <Button className="w-full rounded-xl bg-black text-white" onClick={() => { setOpen(false); router.push(getDashboardPath()); }}>
                    Ir a mi cuenta →
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" className="w-full rounded-xl gap-2" onClick={() => { setOpen(false); router.push("/login"); }}>
                      <Lock className="h-4 w-4" />
                      Ingresar
                    </Button>
                    <Button className="w-full rounded-xl bg-black text-white gap-2" onClick={() => { setOpen(false); router.push("/register"); }}>
                      <Sparkles className="h-4 w-4" />
                      Registrarse →
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
