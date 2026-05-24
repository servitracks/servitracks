import dotenv from 'dotenv';
dotenv.config();

const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vbigrtifoxsehgbapxtc.supabase.co';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'apikey': SERVICE_KEY,
};

async function main() {
  console.log("Fetching PostgREST OpenAPI schema...");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'GET',
    headers,
  });
  
  if (!res.ok) {
    console.error("Failed to fetch schema:", res.status, await res.text());
    return;
  }
  
  const data = await res.json();
  const paths = Object.keys(data.paths || {});
  const rpcPaths = paths.filter(p => p.startsWith('/rpc/'));
  
  console.log("Available RPC functions:");
  rpcPaths.forEach(p => console.log(` - ${p}`));
}

main().catch(console.error);
