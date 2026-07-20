import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://api.servitracks.com/";
const serviceRoleKey = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4MzM5MDUwMCwiZXhwIjo0OTM5MDY0MTAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.d3PUP2XsMjRySYopRLYoUoFQ1pHb7LyMp9X_Fv4AX-M";

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function listAllUsers() {
  console.log('Listing users from TARGET database...');
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  
  if (error) {
    console.error('Error listing users:', error);
    return;
  }

  console.log(`Total users found: ${users.length}`);
  console.table(users.map(u => ({ id: u.id, email: u.email, created_at: u.created_at })));
}

listAllUsers();
