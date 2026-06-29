import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vbigrtifoxsehgbapxtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiaWdydGlmb3hzZWhnYmFweHRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTM5OTc0MCwiZXhwIjoyMDk0OTc1NzQwfQ.Ye5edqBY2fDcp5mqpDe-m7SWCWEcdnDwf3olgyDNOzQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { data: products, error: pError, count } = await supabase.from('products').select('*');
  
  if (pError) {
    console.error("Error fetching products:", pError);
  } else {
    console.log(`Productos en Supabase: ${products.length}`);
    if (products.length > 0) {
      console.log("Muestra de los primeros 3 productos:");
      console.log(products.slice(0, 3).map(p => p.name).join(", "));
    }
  }
}

checkData();
