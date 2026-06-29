import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vbigrtifoxsehgbapxtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiaWdydGlmb3hzZWhnYmFweHRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTM5OTc0MCwiZXhwIjoyMDk0OTc1NzQwfQ.Ye5edqBY2fDcp5mqpDe-m7SWCWEcdnDwf3olgyDNOzQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpsert() {
  const p = {
    id: "test1",
    tenant_id: "autocheck",
    name: "Test",
    sku: "TEST-01",
    category: "Otros",
    cost_price: 100,
    sale_price: 150,
    stock: 10,
    min_stock: 5,
    tax: 0
  };
  
  const { error } = await supabase.from("products").upsert([p], { onConflict: "id" });
  if (error) {
    console.error("Upsert failed:", error);
  } else {
    console.log("Upsert succeeded!");
  }
}

testUpsert();
