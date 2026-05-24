import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Fetching latest messages...");
  const { data, error } = await supabase
    .from('wa_messages')
    .select(`
      id,
      conversation_id,
      role,
      content,
      created_at,
      wa_conversations (
        name,
        phone
      )
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching messages:", error);
  } else {
    console.log("Latest 10 messages in database:");
    data.forEach(m => {
      console.log(`[${m.created_at}] Role: ${m.role} | Name: ${m.wa_conversations?.name || 'N/A'} | Phone: ${m.wa_conversations?.phone || 'N/A'} | Content: "${m.content}"`);
    });
  }
}

main();
