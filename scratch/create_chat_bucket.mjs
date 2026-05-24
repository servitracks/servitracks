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

async function createBucket() {
  console.log("Attempting to create public storage bucket 'chat-media'...");
  const { data, error } = await supabase.storage.createBucket('chat-media', {
    public: true,
    allowedMimeTypes: ['image/*', 'video/*', 'application/pdf', 'audio/*'],
    fileSizeLimit: 10485760, // 10MB
  });
  
  if (error) {
    console.error("Error creating bucket:", error.message);
  } else {
    console.log("Bucket created successfully!", data);
  }
}

createBucket();
