import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: vehicles } = await supabase.from('vehicles').select('*').ilike('model', '%Corolla%');
  console.log("Vehicles:", vehicles.map(v => ({id: v.id, plate: v.plate})));

  if (vehicles.length > 0) {
    const { data: orders } = await supabase.from('orders').select('*').eq('vehicle_id', vehicles[0].id);
    console.log("Orders:", orders.map(o => ({
      id: o.id, 
      status: o.status, 
      description: o.description,
      service_ids: o.service_ids
    })));
  }
}
check();
