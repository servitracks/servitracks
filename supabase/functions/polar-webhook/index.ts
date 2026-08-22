import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, polar-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const body = await req.json();
    console.log("[Polar Webhook] Recibido evento:", body?.type || "unknown", JSON.stringify(body));

    const eventType = body?.type;
    const data = body?.data;

    if (!data) {
      return new Response(JSON.stringify({ error: "No payload data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Identificar el email del cliente y metadata del taller
    const customerEmail = (data.customer?.email || data.user?.email || data.email || "")
      .toLowerCase()
      .trim();
    const metadataTenantId = data.metadata?.tenant_id || data.custom_field_data?.tenant_id;
    const productId = data.product_id || data.product?.id;

    console.log(`[Polar Webhook] Procesando: Email='${customerEmail}', TenantId='${metadataTenantId}', ProductId='${productId}'`);

    // 1. Buscar el taller afectado
    let targetTenantId = metadataTenantId;

    if (!targetTenantId && customerEmail) {
      // Buscar por email en tenants
      const { data: tenantByEmail } = await supabaseAdmin
        .from("tenants")
        .select("id, name, plan_id")
        .ilike("email", customerEmail)
        .maybeSingle();

      if (tenantByEmail) {
        targetTenantId = tenantByEmail.id;
      } else {
        // Buscar por email en tenant_users
        const { data: userLink } = await supabaseAdmin
          .from("tenant_users")
          .select("tenant_id")
          .ilike("email", customerEmail)
          .maybeSingle();

        if (userLink) {
          targetTenantId = userLink.tenant_id;
        }
      }
    }

    if (!targetTenantId) {
      console.warn(`[Polar Webhook] No se encontró taller asociado para el email: ${customerEmail}`);
      return new Response(JSON.stringify({ received: true, note: "Tenant not matched" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Manejo de Eventos de Polar
    if (
      eventType === "subscription.created" ||
      eventType === "subscription.updated" ||
      eventType === "subscription.active" ||
      eventType === "order.created"
    ) {
      // Determinar si hay un plan_id asociado al producto de Polar
      let resolvedPlanId: string | null = data.metadata?.plan_id || null;

      if (!resolvedPlanId && productId) {
        // Buscar en la tabla plans si este productId coincide con alguna URL o ID de Polar
        const { data: matchedPlans } = await supabaseAdmin
          .from("plans")
          .select("id, polar_product_monthly_url, polar_product_yearly_url");

        if (matchedPlans) {
          const matched = matchedPlans.find(
            (p: any) =>
              (p.polar_product_monthly_url && p.polar_product_monthly_url.includes(productId)) ||
              (p.polar_product_yearly_url && p.polar_product_yearly_url.includes(productId))
          );
          if (matched) {
            resolvedPlanId = matched.id;
          }
        }
      }

      // Si no se resolvió pero el nombre del producto contiene "pro" o "enterprise", inferirlo
      const productName = (data.product?.name || "").toLowerCase();
      if (!resolvedPlanId) {
        if (productName.includes("enterprise") || productName.includes("red")) resolvedPlanId = "enterprise";
        else if (productName.includes("pro") || productName.includes("profesional")) resolvedPlanId = "pro";
        else if (productName.includes("básico") || productName.includes("basico")) resolvedPlanId = "basico";
      }

      const updates: any = {
        estado: "ACTIVO",
        status: "active",
      };

      if (resolvedPlanId) {
        updates.plan_id = resolvedPlanId;
      }

      const { error: updateError } = await supabaseAdmin
        .from("tenants")
        .update(updates)
        .eq("id", targetTenantId);

      if (updateError) {
        console.error("[Polar Webhook] Error al activar taller:", updateError);
        throw updateError;
      }

      console.log(`[Polar Webhook] ✅ Taller '${targetTenantId}' activado con éxito en plan '${resolvedPlanId || "actual"}'`);
    } else if (
      eventType === "subscription.canceled" ||
      eventType === "subscription.revoked"
    ) {
      // Suspender taller al vencer o cancelar suscripción
      const { error: cancelError } = await supabaseAdmin
        .from("tenants")
        .update({ estado: "SUSPENDIDO", status: "suspended" })
        .eq("id", targetTenantId);

      if (cancelError) {
        console.error("[Polar Webhook] Error al suspender taller:", cancelError);
        throw cancelError;
      }

      console.log(`[Polar Webhook] ⚠️ Taller '${targetTenantId}' suspendido por cancelación en Polar`);
    }

    return new Response(JSON.stringify({ success: true, processedTenant: targetTenantId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[Polar Webhook] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
