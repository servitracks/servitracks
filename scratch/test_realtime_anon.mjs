import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

// Emulate browser permission scope
const supabase = createClient(supabaseUrl, anonKey);

const tenantId = '6b72afd6-4131-4622-9be3-ca10d4477980';

async function main() {
  console.log(`Subscribing as ANON client to Realtime with tenantId: ${tenantId}...`);
  
  const ch = supabase
    .channel(`test_channel_anon`)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "wa_conversations",
      filter: `tenant_id=eq.${tenantId}`,
    }, (payload) => {
      console.log("🔥 [ANON] RECEIVED EVENT FOR wa_conversations:", payload.eventType, payload.new);
    })
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "wa_messages",
      filter: `tenant_id=eq.${tenantId}`,
    }, (payload) => {
      console.log("🔥 [ANON] RECEIVED EVENT FOR wa_messages:", payload.eventType, payload.new);
    })
    .subscribe((status, err) => {
      console.log(`[ANON] Subscription status: ${status}`, err || '');
      if (status === 'SUBSCRIBED') {
        console.log("✅ [ANON] Subscribed successfully! Keeping process alive for 30s...");
      }
    });

  setTimeout(() => {
    console.log("Timeout reached. Exiting.");
    supabase.removeChannel(ch);
    process.exit(0);
  }, 30000);
}

main().catch(console.error);
