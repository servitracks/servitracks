import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vbigrtifoxsehgbapxtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiaWdydGlmb3hzZWhnYmFweHRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTM5OTc0MCwiZXhwIjoyMDk0OTc1NzQwfQ.Ye5edqBY2fDcp5mqpDe-m7SWCWEcdnDwf3olgyDNOzQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Comprobando buckets...");
  const { data: buckets, error: getError } = await supabase.storage.listBuckets();
  if (getError) {
    console.error("Error fetching buckets:", getError);
    return;
  }
  
  for (const b of buckets) {
    console.log(`\nBucket: ${b.name}`);
    console.log(`Public: ${b.public}`);
    console.log(`File Size Limit: ${b.file_size_limit || 'Default'}`);
    console.log(`Allowed MIME Types: ${b.allowed_mime_types ? b.allowed_mime_types.join(', ') : 'All'}`);
  }
}

main();
