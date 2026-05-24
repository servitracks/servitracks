import dotenv from 'dotenv';
import fetch from 'node-fetch';
dotenv.config();

const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vbigrtifoxsehgbapxtc.supabase.co';

async function main() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    }
  });
  
  if (!res.ok) {
    console.error("Failed to fetch schema:", res.status, await res.text());
    return;
  }
  
  const schema = await res.json();
  const paths = Object.keys(schema.paths || {});
  const rpcs = paths.filter(p => p.startsWith('/rpc/'));
  
  console.log("Available RPC paths:");
  console.log(rpcs);
}

main().catch(console.error);
