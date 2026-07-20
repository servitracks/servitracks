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
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY no está configurada en el entorno.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

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

  // Strip markdown code fences if Gemini adds them
  const cleaned = responseText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let products: ExtractedProduct[];
  try {
    products = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `La IA no devolvió JSON válido. Respuesta: ${responseText.slice(0, 200)}`
    );
  }

  if (!Array.isArray(products)) {
    throw new Error("La respuesta de la IA no es un array de productos.");
  }

  return products;
}
