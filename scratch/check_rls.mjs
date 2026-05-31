import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'apikey': SERVICE_KEY,
};

async function checkRLS() {
  const sql = `
    SELECT
      relname AS table_name,
      relrowsecurity AS rls_enabled
    FROM pg_class
    JOIN pg_catalog.pg_namespace n ON n.oid = pg_class.relnamespace
    WHERE n.nspname = 'public'
      AND relkind = 'r'
    ORDER BY relname;
  `;

  const resRpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sql })
  });
  
  if (resRpc.ok) {
    const data = await resRpc.json();
    console.log(data);
  } else {
    const text = await resRpc.text();
    console.log("Error:", text);
  }
}

checkRLS().catch(console.error);
