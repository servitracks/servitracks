import { useEffect } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export default function PrivacidadPage() {
  useEffect(() => {
    document.title = "Política de Privacidad | ServiTracks";
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
              Política de Privacidad
            </h1>
            <p className="text-neutral-500">Última actualización: 20 de Mayo, 2026</p>
          </header>

          <div className="prose prose-lg prose-neutral max-w-none prose-headings:font-bold prose-a:text-emerald-600">
            <p>
              En <strong>ServiTracks</strong>, accesible desde servitracks.com, una de nuestras principales prioridades es la privacidad de nuestros visitantes y clientes en la República Dominicana y el extranjero. Esta Política de Privacidad documenta los tipos de información que recopila y registra ServiTracks y cómo la usamos.
            </p>
            
            <h2>1. Información que recopilamos</h2>
            <p>
              La información personal que se le pide que proporcione y las razones por las que se le pide que la proporcione, se le aclararán en el momento en que le pidamos que proporcione su información personal.
            </p>
            <p>
              Si se comunica con nosotros directamente, es posible que recibamos información adicional sobre usted, como su nombre, dirección de correo electrónico, número de teléfono, el contenido del mensaje y/o los archivos adjuntos que nos envíe, y cualquier otra información que decida proporcionar.
            </p>

            <h2>2. Cómo usamos su información</h2>
            <p>
              Usamos la información que recopilamos de varias maneras, que incluyen:
            </p>
            <ul>
              <li>Proporcionar, operar y mantener nuestra plataforma y servicios (POS, Inventario, CRM).</li>
              <li>Mejorar, personalizar y expandir nuestra aplicación para las necesidades del mercado dominicano.</li>
              <li>Comprender y analizar cómo utiliza nuestra plataforma.</li>
              <li>Desarrollar nuevos productos, servicios, características y funcionalidades.</li>
              <li>Comunicarnos con usted, ya sea directamente o a través de uno de nuestros socios, incluso para el servicio al cliente, para proporcionarle actualizaciones y otra información relacionada con el software, y con fines promocionales y de marketing.</li>
              <li>Enviarle correos electrónicos o notificaciones sobre comprobantes fiscales (e-CF) de la DGII si utiliza nuestro módulo de facturación electrónica.</li>
            </ul>

            <h2>3. Archivos de registro (Log Files)</h2>
            <p>
              ServiTracks sigue un procedimiento estándar de uso de archivos de registro. Estos archivos registran a los visitantes cuando visitan sitios web. Todas las empresas de alojamiento hacen esto y es una parte de la analítica de los servicios de alojamiento. La información recopilada por los archivos de registro incluye direcciones de protocolo de Internet (IP), tipo de navegador, proveedor de servicios de Internet (ISP), marca de fecha y hora, páginas de referencia/salida y posiblemente el número de clics. Estos no están vinculados a ninguna información que sea personalmente identificable.
            </p>

            <h2>4. Cumplimiento Legal y DGII</h2>
            <p>
              Debido a la naturaleza de nuestro software (facturación y contabilidad para talleres mecánicos), almacenamos datos de transacciones financieras. Estos datos se mantienen bajo estricta confidencialidad y solo se comparten con las autoridades fiscales correspondientes (Dirección General de Impuestos Internos - DGII) a solicitud del titular de la cuenta o mediante integraciones automatizadas (e-CF) autorizadas expresamente por el cliente.
            </p>

            <h2>5. Sus derechos de privacidad</h2>
            <p>
              Bajo la ley de Protección de Datos Personales de la República Dominicana (Ley No. 172-13), usted tiene derecho a acceder, rectificar y cancelar sus datos personales, así como oponerse al tratamiento de los mismos. Puede ejercer estos derechos enviando un correo electrónico a <strong>hola@www.servitracks.com</strong>.
            </p>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
