import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://api.servitracks.com/";
const serviceRoleKey = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4MzM5MDUwMCwiZXhwIjo0OTM5MDY0MTAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.d3PUP2XsMjRySYopRLYoUoFQ1pHb7LyMp9X_Fv4AX-M";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  console.log('Counting tenants and tenant_users in TARGET...');
  
  const tenantsRes = await supabase.from('tenants').select('id, name', { count: 'exact' });
  const tenantUsersRes = await supabase.from('tenant_users').select('id, email', { count: 'exact' });
  
  console.log(`Tenants count in TARGET: ${tenantsRes.count}`);
  if (tenantsRes.data) {
    console.log('Tenants details in TARGET:');
    console.table(tenantsRes.data);
  }
  
  console.log(`Tenant users count in TARGET: ${tenantUsersRes.count}`);
  if (tenantUsersRes.data) {
    console.log('Tenant users details in TARGET:');
    console.table(tenantUsersRes.data);
  }
}

run();
