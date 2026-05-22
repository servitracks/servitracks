# 📊 Acciones Prioritarias de SEO: ServiTracks (Local)

**Fecha:** 20 de mayo de 2026

Implementa las siguientes tareas en el archivo `index.html` de ServiTracks para mejorar tu puntuación técnica:

## 🔴 Prioridad Crítica (Hacer de Inmediato)

### 1. Añadir Datos Estructurados (JSON-LD)
Para que Google sepa que ServiTracks es un software SaaS. Agrega esto justo antes de cerrar `</head>`:
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "ServiTracks",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "description": "Software de facturación y administración para talleres mecánicos en República Dominicana.",
  "offers": {
    "@type": "Offer",
    "price": "2500.00",
    "priceCurrency": "DOP"
  }
}
</script>
```

### 2. Añadir Etiquetas Open Graph (Redes Sociales)
Para que se vea bonito cuando compartan tu link en WhatsApp. Agrega en el `<head>`:
```html
<meta property="og:type" content="website" />
<meta property="og:title" content="ServiTracks | Software para Talleres Mecánicos" />
<meta property="og:description" content="Administra tu taller, facturación NCF, y recordatorios automáticos por WhatsApp." />
<meta property="og:url" content="https://www.servitracks.com/" />
<meta property="og:image" content="https://www.servitracks.com/og-image.jpg" />
```

### 3. Añadir URL Canónica
Evita penalizaciones por contenido duplicado. En el `<head>`:
```html
<link rel="canonical" href="https://www.servitracks.com/" />
```

## ⚠️ Prioridad Media (Planificar)

### 4. Solucionar el SSR/Prerenderizado
Actualmente usas Vite (React clásico), lo que fuerza a Google a usar JavaScript para leer el contenido de tu web (Client-Side Rendering).
- **Acción:** Si en el futuro agregas muchas páginas de "Aterrizaje" (Landing Pages) o un "Blog" a ServiTracks para atraer clientes, deberás migrar la capa pública a un framework como **Next.js**, o usar un plugin como `vite-plugin-prerender` para que Google lea HTML estático rápidamente.

## ℹ️ Optimizaciones Opcionales

### 5. Eliminar Meta Keywords
- **Acción:** Borra la línea `<meta name="keywords" content="..." />` en tu `index.html`. Google ya no usa esto desde hace años.

---
*Fin del plan de acción.*
