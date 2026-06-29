import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const tables = ['services', 'products', 'invoices', 'customers', 'tenants', 'tenant_users'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.error(`Error with ${table}:`, error.message);
    } else {
      if (data && data.length > 0) {
        console.log(`Table '${table}' columns:`, Object.keys(data[0]).join(', '));
      } else {
        console.log(`Table '${table}' is empty, cannot infer schema this way.`);
      }
    }
  }
}

checkSchema();
