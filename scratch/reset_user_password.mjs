import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://api.servitracks.com/";
const serviceRoleKey = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4MzM5MDUwMCwiZXhwIjo0OTM5MDY0MTAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.d3PUP2XsMjRySYopRLYoUoFQ1pHb7LyMp9X_Fv4AX-M";

// Initialize Supabase with the service_role key to access admin functions
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetPasswordAndTest() {
  const email = 'autocheck.do@gmail.com';
  const newPassword = 'Password123!';

  console.log(`Searching for user with email ${email}...`);
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }

  const targetUser = users.find(u => u.email === email);
  if (!targetUser) {
    console.error(`User ${email} not found in the database!`);
    return;
  }

  console.log(`Found user: ${targetUser.id}. Resetting password to "${newPassword}"...`);
  const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    targetUser.id,
    { password: newPassword }
  );

  if (updateError) {
    console.error('Error updating password:', updateError);
    return;
  }

  console.log('Password updated successfully in database! Testing sign in...');

  // Now try to sign in with the new password using the standard anon key
  const anonKey = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4MzM5MDUwMCwiZXhwIjo0OTM5MDY0MTAwLCJyb2xlIjoiYW5vbiJ9.2skO6Kz-e19ergobnEANdOE6f1Hy-08kfMNiFgeJV9Y";
  const supabaseAnon = createClient(supabaseUrl, anonKey);

  const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
    email,
    password: newPassword
  });

  if (signInError) {
    console.error('Sign In with new password FAILED:', signInError.message, signInError.status, signInError.code);
  } else {
    console.log('Sign In with new password SUCCESSFUL!', signInData.user.id, signInData.user.email);
  }
}

resetPasswordAndTest();
