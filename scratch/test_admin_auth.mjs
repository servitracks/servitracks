import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://api.servitracks.com/";
const supabaseAnonKey = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4MzM5MDUwMCwiZXhwIjo0OTM5MDY0MTAwLCJyb2xlIjoiYW5vbiJ9.2skO6Kz-e19ergobnEANdOE6f1Hy-08kfMNiFgeJV9Y";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSignIn(email, password) {
  console.log(`Testing sign in with ${email} and password "${password}"...`);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error('Sign In Error:', error.message, error.status, error.code);
  } else {
    console.log('Sign In Success!', data.user.id, data.user.email);
  }
}

async function runTests() {
  await testSignIn('admin@servitracks.com', 'Servitracks2024!');
  await testSignIn('autocheck.do@gmail.com', 'Servitracks2024!');
}

runTests();
