import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('wa_conversations')
    .select('tenant_id, phone, name')
    .limit(1);

  if (error) {
    console.error("Error:", error);
  } else if (data && data.length > 0) {
    console.log("Real Tenant ID in database:", data[0].tenant_id);
    console.log("Conversation Phone:", data[0].phone);
    console.log("Conversation Name:", data[0].name);
  } else {
    console.log("No conversations found.");
  }
}

main();
