import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const adminPassword = process.env.VITE_ADMIN_PASSWORD || 'Servitracks2024!';

if (!supabaseUrl || !anonKey) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

// Emulate browser public client
const supabase = createClient(supabaseUrl, anonKey);

const email = 'autocheck.do@gmail.com';
const tenantId = '6b72afd6-4131-4622-9be3-ca10d4477980';

async function main() {
  console.log(`Attempting login as: ${email}...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password: adminPassword,
  });

  if (authError) {
    console.error("❌ Login failed:", authError.message);
    process.exit(1);
  }

  console.log("✅ Authenticated successfully! User ID:", authData.user.id);
  console.log(`Subscribing as AUTHENTICATED user to Realtime with tenantId: ${tenantId}...`);

  const ch = supabase
    .channel(`test_channel_auth`)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "wa_conversations",
      filter: `tenant_id=eq.${tenantId}`,
    }, (payload) => {
      console.log("🔥 [AUTH] RECEIVED EVENT FOR wa_conversations:", payload.eventType, payload.new);
    })
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "wa_messages",
      filter: `tenant_id=eq.${tenantId}`,
    }, (payload) => {
      console.log("🔥 [AUTH] RECEIVED EVENT FOR wa_messages:", payload.eventType, payload.new);
    })
    .subscribe((status, err) => {
      console.log(`[AUTH] Subscription status: ${status}`, err || '');
      if (status === 'SUBSCRIBED') {
        console.log("✅ [AUTH] Subscribed successfully! Keeping process alive for 30s...");
      }
    });

  setTimeout(() => {
    console.log("Timeout reached. Exiting.");
    supabase.removeChannel(ch);
    process.exit(0);
  }, 30000);
}

main().catch(console.error);
