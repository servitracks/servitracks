import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
});

const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const key = env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing Supabase URL or Service Role Key in .env file.");
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  console.log("Creating documents_metadata table...");
  const sql = `
    CREATE TABLE IF NOT EXISTS public.documents_metadata (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
        filename TEXT NOT NULL,
        file_type TEXT,
        size_bytes BIGINT,
        local_path TEXT, -- Optional, just to store original name/info if needed
        created_at TIMESTAMPTZ DEFAULT NOW(),
        created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
    );

    ALTER TABLE public.documents_metadata ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view docs in their tenant" ON public.documents_metadata;
    CREATE POLICY "Users can view docs in their tenant"
        ON public.documents_metadata FOR SELECT
        USING (tenant_id IN (
            SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
        ));

    DROP POLICY IF EXISTS "Users can insert docs in their tenant" ON public.documents_metadata;
    CREATE POLICY "Users can insert docs in their tenant"
        ON public.documents_metadata FOR INSERT
        WITH CHECK (tenant_id IN (
            SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
        ));

    DROP POLICY IF EXISTS "Users can update docs in their tenant" ON public.documents_metadata;
    CREATE POLICY "Users can update docs in their tenant"
        ON public.documents_metadata FOR UPDATE
        USING (tenant_id IN (
            SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
        ));

    DROP POLICY IF EXISTS "Users can delete docs in their tenant" ON public.documents_metadata;
    CREATE POLICY "Users can delete docs in their tenant"
        ON public.documents_metadata FOR DELETE
        USING (tenant_id IN (
            SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
        ));
  `;
  
  // Try using RPC to execute SQL or falling back to the standard API
  // Using an existing RPC "exec_sql" if available. Wait, we don't know if exec_sql is available.
  // Instead, since this is raw SQL, we can try to just insert a test row to verify existence, but we need to create it.
  // To create table, we need to query via REST or postgres. Let's try inserting via REST. If it fails, we inform the user to run the SQL in Supabase dashboard.
  console.log("Since Supabase REST API doesn't execute DDL directly, please run the following SQL in your Supabase SQL Editor:");
  console.log(sql);
}

run();
