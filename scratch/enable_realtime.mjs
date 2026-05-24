import dotenv from 'dotenv';
dotenv.config();

const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vbigrtifoxsehgbapxtc.supabase.co';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'apikey': SERVICE_KEY,
};

async function execSQL(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sql }),
  });
  const text = await res.text();
  console.log(`Status: ${res.status}`, text.slice(0, 500));
}

async function main() {
  console.log("Enabling Supabase Realtime publication...");
  await execSQL(`
    DO $$
    BEGIN
      -- Add tables to realtime publication if they are not already in it
      IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
          ALTER PUBLICATION supabase_realtime ADD TABLE wa_conversations;
        EXCEPTION WHEN duplicate_object THEN
          RAISE NOTICE 'wa_conversations already in publication';
        END;
        
        BEGIN
          ALTER PUBLICATION supabase_realtime ADD TABLE wa_messages;
        EXCEPTION WHEN duplicate_object THEN
          RAISE NOTICE 'wa_messages already in publication';
        END;
      END IF;
    END $$;
  `);

  console.log("Setting RLS policies to allow SELECT for anonymous and authenticated users...");
  await execSQL(`
    ALTER TABLE wa_conversations ENABLE ROW LEVEL SECURITY;
    ALTER TABLE wa_messages ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow select for all" ON wa_conversations;
    CREATE POLICY "Allow select for all" ON wa_conversations FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Allow select for all" ON wa_messages;
    CREATE POLICY "Allow select for all" ON wa_messages FOR SELECT USING (true);
  `);
  
  console.log("Realtime and RLS rules successfully set up!");
}

main().catch(console.error);
