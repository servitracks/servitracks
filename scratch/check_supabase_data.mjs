import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const tables = ['tenants', 'customers', 'products', 'services', 'invoices', 'tenant_users'];
  
  console.log('Checking Supabase data...');
  for (const table of tables) {
    const { data, count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.error(`Error querying ${table}:`, error.message);
    } else {
      console.log(`Table '${table}' has ${count} rows.`);
    }
  }
}

checkData();
