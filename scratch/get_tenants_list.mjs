import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function getTenants() {
  const { data, error } = await supabase.from('tenants').select('id, name, slug');
  if (error) {
    console.error("Error fetching tenants:", error.message);
  } else {
    console.log("Tenants in database:");
    data.forEach(t => {
      console.log(`- Name: ${t.name}, Slug: ${t.slug}, ID: ${t.id}`);
    });
  }
}

getTenants();
