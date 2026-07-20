import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://api.servitracks.com/";
const supabaseAnonKey = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4MzM5MDUwMCwiZXhwIjo0OTM5MDY0MTAwLCJyb2xlIjoiYW5vbiJ9.2skO6Kz-e19ergobnEANdOE6f1Hy-08kfMNiFgeJV9Y";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSignIn() {
  console.log('Testing sign in with autocheck.do@gmail.com...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'autocheck.do@gmail.com',
    password: 'wrongpassword'
  });

  if (error) {
    console.error('Sign In Error:', error);
  } else {
    console.log('Sign In Success:', data);
  }
}

async function testSignUp() {
  console.log('\nTesting sign up...');
  const randomEmail = `test_${Math.floor(Math.random() * 100000)}@autocheck.com`;
  const { data, error } = await supabase.auth.signUp({
    email: randomEmail,
    password: 'Password123!',
    options: {
      data: {
        name: 'Test User'
      }
    }
  });

  if (error) {
    console.error('Sign Up Error:', error);
  } else {
    console.log('Sign Up Success:', data);
  }
}

async function runTests() {
  await testSignIn();
  await testSignUp();
}

runTests();
