# 📊 Auditoría SEO Completa: ServiTracks (Local)

**Fecha:** 20 de mayo de 2026
**Objetivo:** Análisis del código fuente base (`index.html` y estructura SPA) utilizando *Agentic SEO Skill*.
**Puntuación General:** **60/100 (Needs Improvement)**

## 📑 Resumen de Severidad

| Categoría | Elemento | Estado | Severidad |
|-----------|----------|--------|-----------|
| On-Page | Etiquetas `<title>` y `<meta description>` | Presentes y optimizadas | ✅ Pass |
| On-Page | Atributo de idioma (`lang="es"`) | Presente | ✅ Pass |
| On-Page | Meta Keywords | Etiqueta obsoleta detectada | ℹ️ Info |
| Técnico | Client-Side Rendering (CSR) | Aplicación SPA sin SSR | ⚠️ Warning |
| Técnico | URL Canónica (`rel="canonical"`) | Ausente | 🔴 Critical |
| Social | Etiquetas Open Graph y Twitter Cards | Ausentes | 🔴 Critical |
| Schema | JSON-LD Structured Data | Ausente | 🔴 Critical |

---

## 🔍 Hallazgos Detallados

### 1. SEO On-Page Básicos
- **Finding:** La etiqueta Title ("ServiTracks | El Software #1 para Talleres Mecánicos en RD") y la Meta Description están bien redactadas y atacan palabras clave relevantes para el mercado local dominicano.
- **Evidence:** Encontrado en `<head>` de `index.html`.
- **Impact:** Alto impacto positivo en CTR (Click-Through Rate) en la SERP de Google.
- **Fix:** Mantener.

- **Finding:** Uso de la etiqueta obsoleta `<meta name="keywords">`.
- **Evidence:** `<meta name="keywords" content="..." />` en la línea 9.
- **Impact:** Nulo. Google ignora esta etiqueta desde hace más de una década.
- **Fix:** Eliminar para ahorrar unos bytes, o dejarla si otros motores de búsqueda locales la requieren (muy raro). (Confianza: `Confirmed`).

### 2. SEO Técnico y Estructura
- **Finding:** Ausencia de etiqueta Canonical (`rel="canonical"`).
- **Evidence:** No existe etiqueta `<link rel="canonical" href="..." />` en el `<head>`.
- **Impact:** Puede causar problemas de contenido duplicado si la aplicación se sirve bajo múltiples parámetros de URL o subdominios (ej. `www.www.servitracks.com` vs `www.servitracks.com`).
- **Fix:** Agregar la URL canónica principal del software. (Confianza: `Confirmed`).

- **Finding:** La aplicación utiliza Renderizado del Lado del Cliente (CSR - Vite/React SPA).
- **Evidence:** `<div id="root"></div>` y `<script type="module" src="/src/main.tsx"></script>`.
- **Impact:** Googlebot puede renderizar JavaScript (dos pasadas de indexación), pero otros motores de búsqueda (Bing, DuckDuckGo) y redes sociales pueden tener problemas indexando el contenido.
- **Fix:** Considerar implementar pre-renderizado (SSG), migraciones a SSR (ej. Next.js, Remix) o usar Helmet para inyectar metas dinámicamente si hay múltiples páginas de landing. (Confianza: `Likely`).

### 3. Redes Sociales (Open Graph & Twitter Cards)
- **Finding:** Falta total de metadatos sociales.
- **Evidence:** Ausencia de `og:title`, `og:image`, `twitter:card`, etc.
- **Impact:** Si los usuarios comparten la URL en WhatsApp, LinkedIn, Facebook o Twitter, no se generará una vista previa atractiva, reduciendo el tráfico referencial.
- **Fix:** Añadir meta etiquetas Open Graph y Twitter Cards con una imagen destacada (`og:image`). (Confianza: `Confirmed`).

### 4. Datos Estructurados (Schema.org / JSON-LD)
- **Finding:** No hay Schema.org Markup implementado.
- **Evidence:** Falta de bloques `<script type="application/ld+json">`.
- **Impact:** Google no comprende automáticamente que ServiTracks es una Aplicación de Software (SaaS) orientada a Talleres, perdiendo oportunidad de Rich Snippets en las búsquedas.
- **Fix:** Implementar schema de `SoftwareApplication` y/o `Organization`. (Confianza: `Confirmed`).

---

*Reporte generado automáticamente usando Agentic SEO Skill.*
