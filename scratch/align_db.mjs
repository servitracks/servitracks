import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function alignDatabase() {
  console.log("Aligning database schema...");
  
  // Adding tax to services
  const query1 = `
    ALTER TABLE public.services
    ADD COLUMN IF NOT EXISTS tax numeric DEFAULT 0;
  `;
  
  const { error: e1 } = await supabase.rpc('execute_sql', { query: query1 }).catch(() => ({ error: { message: "execute_sql might not be defined" }}));
  
  if (e1 && e1.message.includes("execute_sql")) {
    console.log("No RPC execute_sql available. We should inform the user to run the migration via Supabase Dashboard SQL Editor.");
  } else if (e1) {
     console.error("Error running query1:", e1.message);
  } else {
     console.log("Query1 executed successfully.");
  }
}

alignDatabase();
