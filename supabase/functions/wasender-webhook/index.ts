import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Extraer número de teléfono limpio (sin @s.whatsapp.net, sin @c.us)
function cleanPhone(jid: string): string {
  return "+" + jid.replace(/@.*/, "").replace(/\D/g, "");
}

// Extraer texto del mensaje de cualquier formato WaSender
function extractMessageText(data: any): string {
  if (!data) return "";
  // Formato directo
  if (typeof data.body === "string") return data.body;
  if (typeof data.text === "string") return data.text;
  if (typeof data.message === "string") return data.message;
  // Formato WhatsApp Web JS / Baileys
  const msg = data.message;
  if (!msg) return "";
  return (
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    msg.documentMessage?.caption ||
    "[Archivo multimedia]"
  );
}

serve(async (req) => {
  // Permitir OPTIONS para CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log("WaSender webhook received:", JSON.stringify(payload, null, 2));

  // Solo procesar mensajes recibidos (no los que enviamos nosotros)
  const event = payload.event || payload.type;
  const data = payload.data || payload;

  // Ignorar mensajes enviados por nosotros (fromMe)
  const fromMe = data?.key?.fromMe || data?.fromMe || false;
  if (fromMe) {
    return new Response(JSON.stringify({ ok: true, skipped: "fromMe" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Extraer datos del mensaje
  const remoteJid =
    data?.key?.remoteJid ||
    data?.from ||
    data?.sender ||
    data?.remoteJid ||
    "";

  const phone = cleanPhone(remoteJid);
  const contactName = data?.pushName || data?.notifyName || phone;
  const messageText = extractMessageText(data);
  const wasenderId = data?.key?.id || data?.id || null;

  if (!phone || phone === "+") {
    console.log("No phone number found, skipping");
    return new Response(JSON.stringify({ ok: true, skipped: "no_phone" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Buscar tenant por número de teléfono de WaSender (wasender_phone)
  // El número del taller recibe el mensaje, necesitamos saber qué tenant es
  // Buscamos en la tabla tenants el campo wasender_phone
  const toJid = data?.key?.remoteJid === undefined 
    ? data?.to || data?.receiver || ""
    : null;
  
  // Intentar obtener el tenant_id desde query param o header
  // WaSender puede enviar el sessionId que coincide con el wasender_phone del tenant
  const sessionId = payload?.sessionId || payload?.session || "";
  
  let tenantId: string | null = null;
  
  // Buscar tenant por sessionId (que es el wasender_phone configurado)
  if (sessionId) {
    const { data: tenantData } = await supabase
      .from("tenants")
      .select("id")
      .or(`wasender_phone.eq.${sessionId},wasender_phone.eq.+${sessionId}`)
      .limit(1)
      .single();
    
    if (tenantData) tenantId = tenantData.id;
  }
  
  // Si no encontramos por session, buscar el primer tenant con API configurada
  if (!tenantId) {
    const { data: tenantData } = await supabase
      .from("tenants")
      .select("id")
      .not("wasender_api_key", "is", null)
      .limit(1)
      .single();
    
    if (tenantData) tenantId = tenantData.id;
  }

  if (!tenantId) {
    console.log("No tenant found for this webhook");
    return new Response(JSON.stringify({ ok: true, skipped: "no_tenant" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 1. Upsert conversación (crear o actualizar)
  const { data: conv, error: convError } = await supabase
    .from("wa_conversations")
    .upsert(
      {
        tenant_id: tenantId,
        phone,
        name: contactName,
        last_message: messageText,
        last_message_at: new Date().toISOString(),
        unread_count: 1,
        status: "activa",
      },
      {
        onConflict: "tenant_id,phone",
        ignoreDuplicates: false,
      }
    )
    .select("id")
    .single();

  if (convError || !conv) {
    console.error("Error upserting conversation:", convError);
    return new Response(
      JSON.stringify({ error: "DB error", detail: convError?.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Incrementar unread_count
  await supabase.rpc("increment_unread", { conv_id: conv.id });

  // 2. Insertar mensaje
  if (messageText) {
    const { error: msgError } = await supabase.from("wa_messages").insert({
      conversation_id: conv.id,
      tenant_id: tenantId,
      role: "user",
      content: messageText,
      message_type: "text",
      status: "delivered",
      wasender_id: wasenderId,
    });

    if (msgError) {
      console.error("Error inserting message:", msgError);
    }
  }

  console.log(
    `✅ Message saved: ${phone} → conv ${conv.id}, text: "${messageText}"`
  );

  return new Response(JSON.stringify({ ok: true, convId: conv.id }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
