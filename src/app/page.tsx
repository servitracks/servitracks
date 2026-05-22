import { useParams } from "react-router-dom";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { SocialProof } from "@/components/landing/SocialProof";
import { Features } from "@/components/landing/Features";
import { WorkflowSection } from "@/components/landing/WorkflowSection";
import { Benefits } from "@/components/landing/Benefits";
import { Testimonials } from "@/components/landing/Testimonials";
import { Pricing } from "@/components/landing/Pricing";
import { FAQ } from "@/components/landing/FAQ";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";
import { useEffect } from "react";

export default function Home() {
  const { city } = useParams();
  
  const formattedCity = city 
    ? city.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : null;

  useEffect(() => {
    if (formattedCity) {
      document.title = `ServiTracks | Software para Talleres Mecánicos en ${formattedCity}`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute("content", `Administra tu taller mecánico en ${formattedCity} con ServiTracks. Facturación con NCF, control de inventario y automatización por WhatsApp.`);
      }
    }
  }, [formattedCity]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <Hero city={formattedCity} />
        <SocialProof />
        <Features />
        <WorkflowSection />
        <Benefits />
        <Testimonials />
        <Pricing />
        <FAQ />
        <CTASection city={formattedCity} />
      </main>
      <Footer />
    </div>
  );
}
