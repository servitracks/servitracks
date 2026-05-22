import { useEffect } from "react";
import { blogPosts } from "../../lib/blog-data";
import { Link } from "react-router-dom";
import { Navbar } from "../../components/landing/Navbar";
import { Footer } from "../../components/landing/Footer";

export default function BlogIndex() {
  useEffect(() => {
    document.title = "Blog para Talleres Mecánicos | ServiTracks";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "Consejos, estrategias y herramientas tecnológicas para modernizar la gestión de tu taller mecánico en República Dominicana.");
    } else {
      const meta = document.createElement('meta');
      meta.name = "description";
      meta.content = "Consejos, estrategias y herramientas tecnológicas para modernizar la gestión de tu taller mecánico en República Dominicana.";
      document.head.appendChild(meta);
    }
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 font-sans selection:bg-neutral-900 selection:text-white">
      <Navbar />
      
      <main className="pt-32 pb-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl">
              El Blog del Taller Moderno
            </h1>
            <p className="mt-4 text-lg leading-8 text-neutral-600">
              Estrategias, consejos y herramientas para dueños de centros automotrices en República Dominicana que quieren crecer su negocio.
            </p>
          </div>
          
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {blogPosts.map((post) => (
              <article key={post.slug} className="flex max-w-xl flex-col items-start justify-between bg-white rounded-3xl p-6 shadow-sm border border-neutral-100 hover:shadow-md transition-shadow">
                <div className="w-full relative h-48 mb-6 rounded-2xl overflow-hidden bg-neutral-100">
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
                <div className="flex items-center gap-x-4 text-xs">
                  <time dateTime={post.date} className="text-neutral-500 font-medium">
                    {new Date(post.date).toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </time>
                </div>
                <div className="group relative mt-3">
                  <h3 className="text-xl font-bold leading-6 text-neutral-900 group-hover:text-emerald-700 transition-colors">
                    <Link to={`/blog/${post.slug}`}>
                      <span className="absolute inset-0" />
                      {post.title}
                    </Link>
                  </h3>
                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-neutral-600">
                    {post.excerpt}
                  </p>
                </div>
                <div className="mt-8 flex items-center gap-x-4">
                  <div className="text-sm leading-6">
                    <p className="font-semibold text-neutral-900">
                      {post.author}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
