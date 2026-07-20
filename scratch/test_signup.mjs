import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://api.servitracks.com/";
const supabaseAnonKey = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4MzM5MDUwMCwiZXhwIjo0OTM5MDY0MTAwLCJyb2xlIjoiYW5vbiJ9.2skO6Kz-e19ergobnEANdOE6f1Hy-08kfMNiFgeJV9Y";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSignUpDetail() {
  const randomEmail = `test_${Date.now()}@autocheck.com`;
  console.log(`Testing detailed sign up with email ${randomEmail}...`);
  
  const response = await supabase.auth.signUp({
    email: randomEmail,
    password: 'Password123!',
    options: {
      data: {
        name: 'Test SignUp'
      }
    }
  });

  console.log('Complete signUp response:');
  console.log(JSON.stringify(response, null, 2));
}

testSignUpDetail();
