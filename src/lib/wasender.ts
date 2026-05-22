/**
 * WaSender API helper.
 * Usa el proxy Vite /api/whatsapp (reescribe a wasenderapi.com/api/send-message)
 * con el header Authorization: Bearer correcto.
 */

export interface WaSenderResult {
  ok: boolean;
  error?: string;
  data?: any;
}

/**
 * Envía un mensaje de texto via WaSender.
 */
export async function waSendText(apiKey: string, to: string, text: string): Promise<WaSenderResult> {
  if (!apiKey) return { ok: false, error: "API Key no configurada." };
  if (!to)     return { ok: false, error: "Número de destino requerido." };

  // WaSender no acepta el + en el número
  const phone = to.replace(/^\+/, "");

  try {
    const res = await fetch("/api/whatsapp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ to: phone, text }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data?.message ?? data?.error ?? data?.errors?.[0]?.message ?? `Error ${res.status}`;
      console.error("[WaSender] Error:", res.status, data);
      return { ok: false, error: msg };
    }

    return { ok: true, data };
  } catch (e: any) {
    console.error("[WaSender] Network error:", e);
    return { ok: false, error: e?.message ?? "Error de conexión" };
  }
}

/**
 * Prueba la conexión enviando un mensaje al propio número del taller.
 */
export async function waSendTestMessage(apiKey: string, phone: string): Promise<WaSenderResult> {
  return waSendText(apiKey, phone, "✅ ServiTracks conectado correctamente con WaSender API.");
}
