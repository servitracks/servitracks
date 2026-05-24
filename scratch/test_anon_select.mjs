import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function testSelect() {
  console.log("Testing SELECT as anonymous client...");
  
  const { data: convData, error: convError } = await supabase.from('wa_conversations').select('*');
  if (convError) {
    console.error("❌ wa_conversations select error:", convError.message);
  } else {
    console.log("✅ wa_conversations select success. Count:", convData.length);
    if (convData.length > 0) {
      console.log("   First row tenant_id:", convData[0].tenant_id);
    }
  }

  const { data: msgData, error: msgError } = await supabase.from('wa_messages').select('*').limit(5);
  if (msgError) {
    console.error("❌ wa_messages select error:", msgError.message);
  } else {
    console.log("✅ wa_messages select success. Count:", msgData.length);
  }
}

testSelect();
