/**
 * Evolution API Client Helper
 * Proporciona métodos para conectar WhatsApp mediante código QR,
 * consultar el estado de la conexión, enviar mensajes y gestionar la sesión multi-instancia.
 */

export interface ConnectionStateResponse {
  instance?: {
    instanceName?: string;
    state?: "open" | "connecting" | "close";
  };
  state?: "open" | "connecting" | "close";
}

export interface ConnectQrResponse {
  pairingCode?: string;
  code?: string;
  base64?: string;
  count?: number;
}

export const DEFAULT_EVOLUTION_URL = "https://wa.servitracks.com";
export const DEFAULT_EVOLUTION_API_KEY = "servitracks_evolution_secret_key_2026";

export function cleanBaseUrl(url?: string): string {
  if (!url || typeof url !== "string") return DEFAULT_EVOLUTION_URL;
  const trimmed = url.trim();
  if (
    trimmed.includes("ip_de_tu_vps") ||
    trimmed.includes("8080") ||
    trimmed.includes("evolution.servitracks.com") ||
    !trimmed.startsWith("http")
  ) {
    return DEFAULT_EVOLUTION_URL;
  }
  return trimmed.replace(/\/+$/, "");
}

export function cleanApiKey(key?: string): string {
  if (
    !key ||
    typeof key !== "string" ||
    key.includes("ip_de_tu_vps") ||
    key.includes("8080") ||
    key.trim() === "" ||
    key !== DEFAULT_EVOLUTION_API_KEY
  ) {
    return DEFAULT_EVOLUTION_API_KEY;
  }
  return key.trim();
}

/**
 * Consulta el estado de la conexión de la instancia
 */
export async function fetchConnectionState(
  baseUrl: string,
  apiKey: string,
  instanceName: string
): Promise<{ state: "open" | "connecting" | "close"; error?: string }> {
  try {
    const cleanUrl = cleanBaseUrl(baseUrl);
    const cleanKey = cleanApiKey(apiKey);
    const res = await fetch(`${cleanUrl}/instance/connectionState/${instanceName}`, {
      method: "GET",
      headers: {
        "apikey": cleanKey,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      if (res.status === 404) {
        return { state: "close", error: "Instancia no encontrada." };
      }
      return { state: "close", error: `Error ${res.status}: ${res.statusText}` };
    }

    const data = (await res.json()) as ConnectionStateResponse;
    const currentState = data.instance?.state || data.state || "close";
    return { state: currentState };
  } catch (err: any) {
    console.error("[fetchConnectionState] error:", err);
    return { state: "close", error: err.message || "Error al conectar con Evolution API" };
  }
}

/**
 * Crea la instancia en Evolution API si no existe
 */
export async function createInstance(
  baseUrl: string,
  apiKey: string,
  instanceName: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const cleanUrl = cleanBaseUrl(baseUrl);
    const cleanKey = cleanApiKey(apiKey);
    const res = await fetch(`${cleanUrl}/instance/create`, {
      method: "POST",
      headers: {
        "apikey": cleanKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      }),
    });

    if (res.ok || res.status === 403) {
      // 403 o 200/201 generalmente significa que la instancia se creó o ya existe
      return { ok: true };
    }

    const errorData = await res.json().catch(() => null);
    return {
      ok: false,
      error: errorData?.message || errorData?.response?.message || `Error HTTP ${res.status}`,
    };
  } catch (err: any) {
    console.error("[createInstance] error:", err);
    return { ok: false, error: err.message || "No se pudo crear la instancia" };
  }
}

/**
 * Solicita el código QR (base64) para conectar WhatsApp
 */
export async function connectInstance(
  baseUrl: string,
  apiKey: string,
  instanceName: string
): Promise<{ base64?: string; pairingCode?: string; error?: string }> {
  try {
    const cleanUrl = cleanBaseUrl(baseUrl);
    const cleanKey = cleanApiKey(apiKey);

    // Intentar conectar a la instancia existente primero para evitar llamados innecesarios a /create (HTTP 403)
    let res = await fetch(`${cleanUrl}/instance/connect/${instanceName}`, {
      method: "GET",
      headers: {
        "apikey": cleanKey,
        "Content-Type": "application/json",
      },
    });

    // Si la instancia no existe (HTTP 404), la creamos y reintentamos la conexión
    if (res.status === 404) {
      const createRes = await createInstance(cleanUrl, cleanKey, instanceName);
      if (!createRes.ok) {
        return { error: createRes.error || "No se pudo crear la instancia." };
      }
      res = await fetch(`${cleanUrl}/instance/connect/${instanceName}`, {
        method: "GET",
        headers: {
          "apikey": cleanKey,
          "Content-Type": "application/json",
        },
      });
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { error: `Error ${res.status}: ${errText || res.statusText}` };
    }

    const data = await res.json();
    const base64 = data.base64 || data.qrcode?.base64 || data.code;
    const pairingCode = data.pairingCode;

    return { base64, pairingCode };
  } catch (err: any) {
    console.error("[connectInstance] error:", err);
    return { error: err.message || "Error al obtener el código QR" };
  }
}

/**
 * Desconecta la sesión de WhatsApp (Logout)
 */
export async function logoutInstance(
  baseUrl: string,
  apiKey: string,
  instanceName: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const cleanUrl = cleanBaseUrl(baseUrl);
    const cleanKey = cleanApiKey(apiKey);
    const res = await fetch(`${cleanUrl}/instance/logout/${instanceName}`, {
      method: "DELETE",
      headers: {
        "apikey": cleanKey,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { ok: false, error: errText || res.statusText };
    }

    return { ok: true };
  } catch (err: any) {
    console.error("[logoutInstance] error:", err);
    return { ok: false, error: err.message || "Error al cerrar sesión" };
  }
}

/**
 * Envía un mensaje de texto dinámico mediante Evolution API
 */
export async function sendEvolutionTextMessage(
  baseUrl: string,
  apiKey: string,
  instanceName: string,
  phone: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const cleanUrl = cleanBaseUrl(baseUrl);
    const cleanKey = cleanApiKey(apiKey);
    let cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length === 10 && (cleanPhone.startsWith("809") || cleanPhone.startsWith("829") || cleanPhone.startsWith("849"))) {
      cleanPhone = "1" + cleanPhone;
    }

    const res = await fetch(`${cleanUrl}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: {
        "apikey": cleanKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: text,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      return {
        ok: false,
        error: errData?.message || errData?.response?.message || `Error HTTP ${res.status}`,
      };
    }

    return { ok: true };
  } catch (err: any) {
    console.error("[sendEvolutionTextMessage] error:", err);
    return { ok: false, error: err.message || "Error al enviar mensaje vía Evolution API" };
  }
}

/**
 * Envia un mensaje de prueba mediante Evolution API
 */
export async function sendEvolutionTestMessage(
  baseUrl: string,
  apiKey: string,
  instanceName: string,
  phone: string
): Promise<{ ok: boolean; error?: string }> {
  return sendEvolutionTextMessage(
    baseUrl,
    apiKey,
    instanceName,
    phone,
    "✅ ¡Conexión exitosa desde ServiTracks a través de Evolution API! Tu WhatsApp está listo para enviar notificaciones."
  );
}

/**
 * Configura el Webhook en la instancia de Evolution API para recepción de mensajes
 */
export async function setEvolutionWebhook(
  baseUrl: string,
  apiKey: string,
  instanceName: string,
  tenantId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const cleanUrl = cleanBaseUrl(baseUrl);
    const cleanKey = cleanApiKey(apiKey);
    const webhookUrl = `https://vbigrtifoxsehgbapxtc.supabase.co/functions/v1/evolution-webhook?tenant_id=${tenantId}`;

    const res = await fetch(`${cleanUrl}/webhook/set/${instanceName}`, {
      method: "POST",
      headers: {
        "apikey": cleanKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: webhookUrl,
          byEvents: false,
          base64: true,
          events: [
            "MESSAGES_UPSERT",
            "MESSAGES_UPDATE",
            "SEND_MESSAGE",
            "CONNECTION_UPDATE",
            "QRCODE_UPDATED"
          ]
        }
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { ok: false, error: errText };
    }
    return { ok: true };
  } catch (err: any) {
    console.error("[setEvolutionWebhook] error:", err);
    return { ok: false, error: err.message };
  }
}
