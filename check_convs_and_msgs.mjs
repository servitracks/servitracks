import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Fetching all conversations...");
  const { data: convs, error: convsError } = await supabase
    .from('wa_conversations')
    .select('*')
    .order('last_message_at', { ascending: false });

  if (convsError) {
    console.error("Error fetching conversations:", convsError);
    return;
  }

  for (const conv of convs) {
    console.log(`\n========================================`);
    console.log(`Conversation ID: ${conv.id}`);
    console.log(`Name: ${conv.name} | Phone: ${conv.phone} | Unread: ${conv.unread_count}`);
    
    const { data: msgs, error: msgsError } = await supabase
      .from('wa_messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true });

    if (msgsError) {
      console.error(`Error fetching messages for ${conv.name}:`, msgsError);
      continue;
    }

    console.log(`Messages (${msgs.length}):`);
    msgs.forEach((m, idx) => {
      console.log(`  ${idx+1}. [${m.created_at}] [${m.role}] -> "${m.content}"`);
    });
  }
}

main();
