import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWaTables() {
  const { data: convData, error: convError } = await supabase.from('wa_conversations').select('id').limit(1);
  if (convError) {
    console.error("wa_conversations error:", convError.message);
  } else {
    console.log("wa_conversations table exists. Found rows:", convData.length);
  }

  const { data: msgData, error: msgError } = await supabase.from('wa_messages').select('id').limit(1);
  if (msgError) {
    console.error("wa_messages error:", msgError.message);
  } else {
    console.log("wa_messages table exists. Found rows:", msgData.length);
  }
}

checkWaTables();
