import { useEffect } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export default function TerminosPage() {
  useEffect(() => {
    document.title = "Términos de Uso | ServiTracks";
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
              Términos de Uso
            </h1>
            <p className="text-neutral-500">Última actualización: 20 de Mayo, 2026</p>
          </header>

          <div className="prose prose-lg prose-neutral max-w-none prose-headings:font-bold prose-a:text-emerald-600">
            <p>
              Bienvenido a <strong>ServiTracks</strong>. Al acceder a este sitio web y utilizar nuestro software de gestión para talleres, usted acepta estar sujeto a estos Términos y Condiciones de uso, a todas las leyes y regulaciones aplicables, y acepta que es responsable del cumplimiento de las leyes locales aplicables, específicamente las de la República Dominicana.
            </p>

            <h2>1. Licencia de Uso</h2>
            <p>
              Se concede permiso para descargar temporalmente una copia de los materiales (información o software) en el sitio web de ServiTracks solo para visualización transitoria personal y no comercial. Esta es la concesión de una licencia, no una transferencia de título, y bajo esta licencia usted no puede:
            </p>
            <ul>
              <li>Modificar o copiar los materiales;</li>
              <li>Usar los materiales para cualquier propósito comercial, o para cualquier exhibición pública (comercial o no comercial);</li>
              <li>Intentar descompilar o aplicar ingeniería inversa a cualquier software contenido en el sitio web de ServiTracks;</li>
              <li>Eliminar cualquier derecho de autor u otras anotaciones de propiedad de los materiales; o</li>
              <li>Transferir los materiales a otra persona o "reflejar" los materiales en cualquier otro servidor.</li>
            </ul>

            <h2>2. Cuentas de Usuario y Suscripciones</h2>
            <p>
              Al crear una cuenta en ServiTracks, usted garantiza que es mayor de 18 años y que la información que nos proporciona es precisa, completa y actual en todo momento. La información inexacta, incompleta u obsoleta puede resultar en la terminación inmediata de su cuenta en el Servicio.
            </p>
            <p>
              Nuestros planes de suscripción están diseñados para una <strong>Sede Principal</strong>. Cada sucursal física adicional que desee conectar a su red en ServiTracks conllevará un cargo adicional, según se estipula en nuestra página de precios. Usted es responsable de mantener la confidencialidad de su cuenta y contraseña.
            </p>

            <h2>3. Limitaciones</h2>
            <p>
              En ningún caso ServiTracks o sus proveedores serán responsables de ningún daño (incluyendo, sin limitación, daños por pérdida de datos o ganancias, o debido a la interrupción del negocio) que surja del uso o la incapacidad de usar los materiales en el sitio web de ServiTracks, incluso si ServiTracks o un representante autorizado de ServiTracks ha sido notificado verbalmente o por escrito de la posibilidad de tal daño.
            </p>

            <h2>4. Integraciones (DGII y WhatsApp)</h2>
            <p>
              ServiTracks ofrece integraciones con servicios de terceros como la API de WhatsApp y la Dirección General de Impuestos Internos (DGII) para comprobantes fiscales electrónicos (e-CF). El uso de estas funciones está sujeto a la disponibilidad de dichos servicios de terceros. ServiTracks no es responsable por caídas en los servidores de la DGII o de Meta (WhatsApp).
            </p>

            <h2>5. Modificaciones a los Términos</h2>
            <p>
              ServiTracks puede revisar estos términos de servicio para su sitio web en cualquier momento sin previo aviso. Al utilizar este sitio web, usted acepta estar sujeto a la versión actual de estos Términos y Condiciones de uso.
            </p>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
