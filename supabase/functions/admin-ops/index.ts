import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, payload } = await req.json();

    // Crear cliente admin (usando la variable de entorno protegida en el servidor)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    if (action === "create_tenant_and_user") {
      const { email, password, name, tenantName, phone } = payload;
      
      // 1. Crear usuario en Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError) throw new Error(authError.message);

      // 2. Crear Tenant
      const { data: tenantData, error: tenantError } = await supabaseAdmin
        .from("tenants")
        .insert({ name: tenantName, phone, status: "active", plan_id: "basico" })
        .select()
        .single();

      if (tenantError) throw new Error(tenantError.message);

      // 3. Vincular Usuario al Tenant
      const { error: linkError } = await supabaseAdmin
        .from("tenant_users")
        .insert({
          id: authData.user.id,
          tenant_id: tenantData.id,
          name,
          email,
          role: "owner",
          status: "active"
        });

      if (linkError) throw new Error(linkError.message);

      return new Response(JSON.stringify({ success: true, user: authData.user, tenant: tenantData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === "invite_user") {
      const { email, password, name, role, tenantId } = payload;
      
      // 1. Crear usuario en Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError) throw new Error(authError.message);

      // 2. Vincular
      const { error: linkError } = await supabaseAdmin
        .from("tenant_users")
        .insert({
          id: authData.user.id,
          tenant_id: tenantId,
          name,
          email,
          role,
          status: "active"
        });

      if (linkError) throw new Error(linkError.message);

      return new Response(JSON.stringify({ success: true, user: authData.user }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error("Action not supported");

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
