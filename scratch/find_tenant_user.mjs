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

async function findUsers() {
  console.log("Listing authenticated users...");
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error("Error listing auth users:", error.message);
    return;
  }
  
  console.log(`Found ${users.length} users in auth schema:`);
  users.forEach(u => {
    console.log(`- Email: ${u.email}, ID: ${u.id}, Raw User Metadata:`, u.user_metadata);
  });
}

findUsers();
