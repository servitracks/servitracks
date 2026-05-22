const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vbigrtifoxsehgbapxtc.supabase.co';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'apikey': SERVICE_KEY,
};

// Use the pg proxy endpoint for raw SQL
async function runSQL(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=minimal', 'Content-Profile': 'public' },
    body: sql,
  });
  return res;
}

// Use Supabase DB directly via management API approach
// The correct way is via the SQL editor endpoint
async function execSQL(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sql_query: sql }),
  });
  const text = await res.text();
  console.log(`Status: ${res.status}`, text.slice(0, 300));
}

// Create tables via direct PostgreSQL statements using the pg proxy
const steps = [
  {
    name: 'Create wa_conversations table',
    sql: `
      CREATE TABLE IF NOT EXISTS wa_conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        phone TEXT NOT NULL,
        name TEXT,
        last_message TEXT,
        last_message_at TIMESTAMPTZ DEFAULT now(),
        unread_count INT DEFAULT 0,
        status TEXT DEFAULT 'activa',
        agent TEXT DEFAULT 'humano',
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(tenant_id, phone)
      );
    `
  },
  {
    name: 'Create wa_messages table',
    sql: `
      CREATE TABLE IF NOT EXISTS wa_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES wa_conversations(id) ON DELETE CASCADE,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        message_type TEXT DEFAULT 'text',
        status TEXT DEFAULT 'delivered',
        wasender_id TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `
  }
];

// Try via Supabase Management API SQL endpoint
async function main() {
  console.log('Creating WhatsApp tables in Supabase...\n');
  
  for (const step of steps) {
    console.log(`Running: ${step.name}`);
    
    // Try management API
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sql: step.sql }),
    });
    
    if (res.ok) {
      console.log(`  ✅ ${step.name} - OK\n`);
    } else {
      const err = await res.text();
      console.log(`  Status ${res.status}: ${err.slice(0, 200)}\n`);
    }
  }
  
  console.log('Done. Check Supabase dashboard to verify tables.');
}

main().catch(console.error);
