import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `Eres un asistente experto en extracción de datos de facturas y órdenes de compra comerciales.

Analiza la imagen o documento proporcionado (que es una factura de proveedor) y extrae la siguiente información:
- ncf: El Número de Comprobante Fiscal (NCF) o número de factura (string, ej: "B0100000012", usa "" si no hay)
- supplierName: El nombre de la empresa proveedora o comercial (string, usa "" si no está claro)
- items: Un array de los productos comprados en esta factura.

Para cada producto en el array 'items' extrae:
- productName: nombre del producto (string, OBLIGATORIO)
- quantity: cantidad comprada (número, OBLIGATORIO, ej: 10)
- unitPrice: precio unitario o costo unitario (número, usa 0 si no hay)
- tax: porcentaje de ITBIS/impuesto (número, usa 18 por defecto)

REGLAS IMPORTANTES:
- Devuelve ÚNICAMENTE un objeto JSON válido sin ningún texto adicional, markdown ni explicación
- No incluyas codigo markdown en tu respuesta, solo el JSON puro
- Los precios y cantidades siempre deben ser números, nunca strings
- Si hay precios con símbolos (RD$, $, etc.) extrae solo el número

Ejemplo de formato esperado:
{
  "ncf": "B0100000123",
  "supplierName": "Repuestos Perez",
  "items": [
    {"productName": "Aceite Castrol 20W50", "quantity": 12, "unitPrice": 450, "tax": 18},
    {"productName": "Filtro de Aceite Toyota", "quantity": 5, "unitPrice": 250, "tax": 18}
  ]
}`;

export interface ExtractedInvoice {
  ncf: string;
  supplierName: string;
  items: {
    productName: string;
    quantity: number;
    unitPrice: number;
    tax: number;
  }[];
}

export async function extractInvoiceWithAI(
  fileData: string,
  mimeType: string,
  fileName: string
): Promise<ExtractedInvoice> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY no está configurada en el entorno.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

  const prompt =
    SYSTEM_PROMPT +
    `\n\nDocumento a analizar: ${fileName || "factura"}`;

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

  let invoice: ExtractedInvoice;
  try {
    invoice = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `La IA no devolvió JSON válido. Respuesta: ${responseText.slice(0, 200)}`
    );
  }

  return invoice;
}
