import { useEffect } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export default function CookiesPage() {
  useEffect(() => {
    document.title = "Política de Cookies | ServiTracks";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-neutral-900 selection:text-white">
      <Navbar />

      <main className="pt-32 pb-20">
        <article className="mx-auto max-w-3xl px-6 lg:px-8">
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Volver al inicio
            </Link>
          </div>
          
          <header className="mb-10 text-center border-b border-neutral-100 pb-10">
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl leading-tight mb-4">
              Política de Cookies
            </h1>
            <p className="text-neutral-500">Última actualización: 20 de Mayo, 2026</p>
          </header>

          <div className="prose prose-lg prose-neutral max-w-none prose-headings:font-bold prose-a:text-emerald-600">
            <p>
              Esta es la Política de Cookies de <strong>ServiTracks</strong>, accesible desde servitracks.com.
            </p>

            <h2>¿Qué son las Cookies?</h2>
            <p>
              Como es práctica común en casi todos los sitios web profesionales, este sitio utiliza cookies, que son pequeños archivos que se descargan en su computadora o dispositivo móvil, para mejorar su experiencia. Esta página describe qué información recopilan, cómo la usamos y por qué a veces necesitamos almacenar estas cookies. También compartiremos cómo puede evitar que se almacenen estas cookies, sin embargo, esto puede degradar o 'romper' ciertos elementos de la funcionalidad de los sitios.
            </p>

            <h2>Cómo utilizamos las Cookies</h2>
            <p>
              Utilizamos cookies por una variedad de razones que se detallan a continuación. Desafortunadamente, en la mayoría de los casos no hay opciones estándar en la industria para deshabilitar las cookies sin deshabilitar completamente la funcionalidad y las características que agregan a este sitio. Se recomienda que deje habilitadas todas las cookies si no está seguro de si las necesita o no, en caso de que se utilicen para proporcionar un servicio que usted utiliza.
            </p>

            <h2>Las Cookies que establecemos</h2>
            <ul>
              <li>
                <strong>Cookies relacionadas con la cuenta y el inicio de sesión:</strong> Si crea una cuenta con nosotros en ServiTracks, utilizaremos cookies para la gestión del proceso de registro, la administración general y para recordar su estado de sesión. Estas cookies generalmente se destruyen cuando cierra sesión, pero en algunos casos pueden permanecer para recordar sus preferencias en el sistema del taller cuando cierre la sesión.
              </li>
              <li>
                <strong>Cookies de preferencias del sitio:</strong> Para brindarle una gran experiencia en este sitio, le brindamos la funcionalidad de establecer sus preferencias de cómo se ejecuta este sitio cuando lo usa (por ejemplo, preferencias de notificaciones, temas, o vistas de la interfaz del punto de venta).
              </li>
              <li>
                <strong>Cookies de seguridad y protección:</strong> Empleamos cookies para proteger el acceso a su panel administrativo y evitar ataques maliciosos (como Cross-Site Request Forgery).
              </li>
            </ul>

            <h2>Cookies de Terceros</h2>
            <p>
              En algunos casos especiales también utilizamos cookies proporcionadas por terceros de confianza.
            </p>
            <ul>
              <li>Este sitio utiliza Google Analytics, que es una de las soluciones analíticas más extendidas y confiables en la web para ayudarnos a comprender cómo utiliza el sitio y las formas en que podemos mejorar su experiencia.</li>
              <li>También utilizamos cookies de herramientas de soporte técnico para el chat en vivo que ofrecemos a nuestros clientes de los talleres mecánicos.</li>
            </ul>

            <h2>Deshabilitar las Cookies</h2>
            <p>
              Puede evitar la configuración de cookies ajustando la configuración en su navegador (consulte la Ayuda de su navegador para saber cómo hacerlo). Tenga en cuenta que deshabilitar las cookies afectará gravemente la funcionalidad de su sistema de ServiTracks, no podrá mantener su sesión iniciada ni operar el módulo de facturación (POS). Por lo tanto, se recomienda que no deshabilite las cookies.
            </p>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
