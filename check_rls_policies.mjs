import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Checking RLS policies...");
  
  // We can query pg_policies using RPC or a direct query if we have permissions
  const { data, error } = await supabase.rpc('exec', {
    sql_query: `
      SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename IN ('wa_messages', 'wa_conversations');
    `
  });

  if (error) {
    // If exec RPC doesn't exist, let's try direct REST query or fallback
    console.error("RPC error:", error.message);
    
    // Let's try running direct SQL via fetching the rest API
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Prefer': 'return=representation',
        'Content-Profile': 'public'
      },
      body: JSON.stringify({
        query: `SELECT policyname, tablename, cmd, qual FROM pg_policies WHERE tablename IN ('wa_messages', 'wa_conversations');`
      })
    });
    console.log("Direct REST select pg_policies status:", res.status);
    const text = await res.text();
    console.log("REST response:", text.substring(0, 500));
  } else {
    console.log("Policies found via RPC:");
    console.log(data);
  }
}

main();
