import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `Eres un asistente experto en extracción de datos de documentos comerciales (facturas, listas de precios, catálogos, órdenes de compra).

Analiza el documento proporcionado y extrae TODOS los productos/artículos que encuentres.

Para cada producto extrae:
- name: nombre completo del producto (string, OBLIGATORIO)
- sku: código, referencia o número de parte (string, usa "" si no hay)
- brand: marca del producto (string, usa "" si no hay)
- category: categoría que mejor aplique entre: Lubricantes, Filtros, Frenos, Suspensión, Eléctrico, Neumáticos, Transmisión, Otros (string)
- supplier: proveedor o distribuidor si aparece (string, usa "" si no hay)
- costPrice: precio de costo o compra indicado en el documento (número, usa el precio unitario que aparezca, 0 si no hay)
- salePrice: precio de venta al público (número, pon 0 por defecto ya que los documentos suelen ser de compra)
- quantity: cantidad que se está comprando o facturando en este documento (número, usa 0 si no hay)
- stock: usa siempre 0
- minStock: stock mínimo sugerido (número, usa 5 por defecto)
- tax: porcentaje de ITBIS/impuesto (número, usa 18 por defecto)
- location: ubicación en almacén (string, usa "" si no hay)

REGLAS IMPORTANTES:
- Devuelve ÚNICAMENTE un array JSON válido sin ningún texto adicional, markdown ni explicación
- No incluyas codigo markdown en tu respuesta, solo el JSON puro
- Si un campo no está disponible usa el valor por defecto indicado
- Los precios siempre deben ser números, nunca strings
- Si hay precios con símbolos (RD$, $, etc.) extrae solo el número
- Si encuentras el mismo producto varias veces, inclúyelo una sola vez con la información más completa

Ejemplo de formato esperado:
[{"name":"Aceite Castrol 20W50","sku":"CAS-001","brand":"Castrol","category":"Lubricantes","supplier":"","costPrice":450,"salePrice":0,"quantity":12,"stock":0,"minStock":5,"tax":18,"location":""}]`;

export interface ExtractedProduct {
  name: string;
  sku: string;
  brand: string;
  category: string;
  supplier: string;
  costPrice: number;
  salePrice: number;
  quantity: number;
  stock: number;
  minStock: number;
  tax: number;
  location: string;
}

export async function extractProductsWithAI(
  fileData: string,
  mimeType: string,
  fileName: string
): Promise<ExtractedProduct[]> {
  const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || (import.meta.env as Record<string, string | undefined>).GEMINI_API_KEY) as string | undefined;
  if (!apiKey) {
    throw new Error("La clave API de Gemini no está configurada en el entorno (VITE_GEMINI_API_KEY).");
  }

  // Pre-validate file data length (~20MB max in base64)
  if (fileData.length > 28 * 1024 * 1024) {
    throw new Error("El archivo seleccionado excede el tamaño máximo permitido de 20MB.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Force pure JSON output format via generationConfig
  const model = genAI.getGenerativeModel({ 
    model: "gemini-flash-latest",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    }
  });

  const prompt =
    SYSTEM_PROMPT +
    `\n\nDocumento a analizar: ${fileName || "documento sin nombre"}`;

  const result = await model.generateContent([
    {
      inlineData: {
        data: fileData,
        mimeType: mimeType,
      },
    },
    prompt,
  ]);

  const responseText = result.response.text().trim();

  let parsed: unknown;
  try {
    // 1. Direct parse (expected when responseMimeType is application/json)
    parsed = JSON.parse(responseText);
  } catch {
    // 2. Resilient fallback: extract JSON array using regex
    const arrayMatch = responseText.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        parsed = JSON.parse(arrayMatch[0]);
      } catch {
        // Continue to strip fences fallback
      }
    }
    
    if (!parsed) {
      // 3. Strip code fences fallback
      const cleaned = responseText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        throw new Error(
          `La IA no devolvió un formato JSON reconocible. Respuesta: ${responseText.slice(0, 180)}...`
        );
      }
    }
  }

  // Handle if the model wrapped it in an object like { "products": [...] } or { "items": [...] }
  let productsArray: unknown[] = [];
  if (Array.isArray(parsed)) {
    productsArray = parsed;
  } else if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    const candidate = obj.products || obj.items || obj.articulos || obj.datos || Object.values(obj).find(v => Array.isArray(v));
    if (Array.isArray(candidate)) {
      productsArray = candidate;
    }
  }

  if (!Array.isArray(productsArray) || productsArray.length === 0) {
    throw new Error("No se detectaron productos estructurados en el documento analizado.");
  }

  // Map and sanitize fields
  return productsArray.map((p: any) => ({
    name: String(p?.name || p?.nombre || p?.descripcion || "").trim(),
    sku: String(p?.sku || p?.codigo || p?.referencia || "").trim(),
    brand: String(p?.brand || p?.marca || "").trim(),
    category: String(p?.category || p?.categoria || "Otros").trim(),
    supplier: String(p?.supplier || p?.proveedor || "").trim(),
    costPrice: Math.max(0, Number(p?.costPrice ?? p?.costo ?? p?.precio_costo) || 0),
    salePrice: Math.max(0, Number(p?.salePrice ?? p?.venta ?? p?.precio_venta) || 0),
    quantity: Math.max(0, Number(p?.quantity ?? p?.cantidad ?? 0) || 0),
    stock: Math.max(0, Number(p?.stock ?? p?.existencia ?? 0) || 0),
    minStock: Math.max(1, Number(p?.minStock ?? p?.stock_minimo) || 5),
    tax: Math.max(0, Number(p?.tax ?? p?.itbis ?? p?.impuesto) || 18),
    location: String(p?.location || p?.ubicacion || "").trim(),
  })).filter((p) => p.name.length > 0);
}
