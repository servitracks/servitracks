"use client";

import { useEffect } from "react";
import { blogPosts } from "../../../lib/blog-data";
import { useParams, Navigate, Link } from "react-router-dom";
import { Navbar } from "../../../components/landing/Navbar";
import { Footer } from "../../../components/landing/Footer";
import { ChevronLeft } from "lucide-react";

export default function BlogPost() {
  const { slug } = useParams();
  const post = blogPosts.find((p) => p.slug === slug);

  useEffect(() => {
    if (post) {
      document.title = `${post.title} | Blog ServiTracks`;
      
      // Update meta description
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute("content", post.metaDescription);

      // Inject JSON-LD dynamically for SEO
      const existingScript = document.querySelector('script[type="application/ld+json"][data-blog="true"]');
      if (existingScript) existingScript.remove();

      const jsonLd = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        image: [post.coverImage],
        datePublished: new Date(post.date).toISOString(),
        dateModified: new Date(post.date).toISOString(),
        author: [{
            "@type": "Organization",
            name: post.author,
            url: "https://servitracks.com/"
        }],
        publisher: {
            "@type": "Organization",
            name: "ServiTracks",
            logo: {
                "@type": "ImageObject",
                url: "https://servitracks.com/logo.servitracks.png"
            }
        },
        description: post.metaDescription
      };

      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-blog', 'true');
      script.text = JSON.stringify(jsonLd);
      document.head.appendChild(script);

      return () => {
        // Clean up schema when leaving page
        const scriptToRemove = document.querySelector('script[type="application/ld+json"][data-blog="true"]');
        if (scriptToRemove) scriptToRemove.remove();
      };
    }
  }, [post]);

  if (!post) {
    return <Navigate to="/not-found" />;
  }

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-neutral-900 selection:text-white">
      <Navbar />

      <main className="pt-32 pb-20">
        <article className="mx-auto max-w-3xl px-6 lg:px-8">
          <div className="mb-8">
            <Link to="/blog" className="inline-flex items-center text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Volver al blog
            </Link>
          </div>
          
          <header className="mb-10 text-center">
            <div className="flex items-center justify-center gap-x-4 text-sm mb-6">
              <time dateTime={post.date} className="text-neutral-500 font-semibold uppercase tracking-wider">
                {new Date(post.date).toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' })}
              </time>
              <span className="text-neutral-300">•</span>
              <span className="text-emerald-700 font-bold">{post.author}</span>
            </div>
            
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl leading-tight mb-8">
              {post.title}
            </h1>
            
            <div className="w-full relative h-[400px] sm:h-[500px] rounded-3xl overflow-hidden shadow-md">
              <img
                src={post.coverImage}
                alt={post.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          </header>

          <div 
            className="prose prose-lg prose-neutral max-w-none prose-headings:font-bold prose-a:text-emerald-600 hover:prose-a:text-emerald-500 prose-img:rounded-2xl"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          <div className="mt-16 pt-8 border-t border-neutral-100">
            <div className="rounded-2xl bg-neutral-50 p-8 text-center">
              <h3 className="text-xl font-bold text-neutral-900 mb-2">¿Listo para llevar tu taller al próximo nivel?</h3>
              <p className="text-neutral-600 mb-6">ServiTracks es el software todo-en-uno diseñado para talleres automotrices en República Dominicana.</p>
              <Link href="/register" className="inline-block rounded-full bg-black px-8 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-neutral-800 transition-all cursor-pointer">
                Comenzar prueba gratis ahora
              </Link>
            </div>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
