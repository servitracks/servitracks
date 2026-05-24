import dotenv from 'dotenv';
import fetch from 'node-fetch';
dotenv.config();

const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vbigrtifoxsehgbapxtc.supabase.co';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'apikey': SERVICE_KEY,
};

async function runSQL(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sql }),
  });
  
  if (!res.ok) {
    console.error("SQL failed:", res.status, await res.text());
    return null;
  }
  
  return await res.json();
}

async function main() {
  console.log("Checking table RLS status...");
  const rlsStatus = await runSQL(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename IN ('wa_messages', 'wa_conversations');
  `);
  console.log("RLS Status:");
  console.log(rlsStatus);

  console.log("\nChecking active policies...");
  const policies = await runSQL(`
    SELECT policyname, tablename, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename IN ('wa_messages', 'wa_conversations');
  `);
  console.log("Policies:");
  console.log(policies);
}

main().catch(console.error);
