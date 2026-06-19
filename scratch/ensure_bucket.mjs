import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vbigrtifoxsehgbapxtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiaWdydGlmb3hzZWhnYmFweHRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTM5OTc0MCwiZXhwIjoyMDk0OTc1NzQwfQ.Ye5edqBY2fDcp5mqpDe-m7SWCWEcdnDwf3olgyDNOzQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: buckets, error: getError } = await supabase.storage.listBuckets();
  if (getError) {
    console.error("Error fetching buckets:", getError);
    return;
  }
  const bucketExists = buckets.find(b => b.name === 'documents');
  if (!bucketExists) {
    console.log("Bucket 'documents' not found, creating it...");
    const { data, error } = await supabase.storage.createBucket('documents', {
      public: false,
    });
    if (error) {
      console.error("Error creating bucket:", error);
    } else {
      console.log("Bucket created successfully:", data);
    }
  } else {
    console.log("Bucket 'documents' already exists.");
  }
}

main();
