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

async function checkBuckets() {
  console.log("Checking Supabase Storage buckets...");
  const { data, error } = await supabase.storage.listBuckets();
  
  if (error) {
    console.error("Error listing buckets:", error.message);
  } else {
    console.log("Found buckets:");
    data.forEach(b => {
      console.log(`- ID: ${b.id}, Name: ${b.name}, Public: ${b.public}`);
    });
  }
}

checkBuckets();
