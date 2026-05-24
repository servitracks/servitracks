import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

// We use service role to bypass any RLS filters for this test,
// so we can isolate whether the database is even publishing events or not.
const supabase = createClient(supabaseUrl, serviceKey);

const tenantId = '6b72afd6-4131-4622-9be3-ca10d4477980';

async function main() {
  console.log(`Subscribing to Realtime with tenantId: ${tenantId}...`);
  
  const ch = supabase
    .channel(`test_channel_node`)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "wa_conversations",
      // We filter by tenant_id to match the app
      filter: `tenant_id=eq.${tenantId}`,
    }, (payload) => {
      console.log("🔥 RECEIVED REALTIME EVENT FOR wa_conversations:", payload.eventType, payload.new);
    })
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "wa_messages",
      filter: `tenant_id=eq.${tenantId}`,
    }, (payload) => {
      console.log("🔥 RECEIVED REALTIME EVENT FOR wa_messages:", payload.eventType, payload.new);
    })
    .subscribe((status, err) => {
      console.log(`Subscription status: ${status}`, err || '');
      
      if (status === 'SUBSCRIBED') {
        console.log("✅ Successfully subscribed to Realtime! Keeping process alive for 30s...");
        console.log("Try sending a WhatsApp message or updating a record in Supabase now!");
      }
    });

  // Keep alive for 35 seconds to receive messages
  setTimeout(() => {
    console.log("Timeout reached. Cleaning up and exiting.");
    supabase.removeChannel(ch);
    process.exit(0);
  }, 35000);
}

main().catch(console.error);
