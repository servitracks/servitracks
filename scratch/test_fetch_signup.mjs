const url = "https://api.servitracks.com/auth/v1/signup";
const apiKey = "2skO6Kz-e19ergobnEANdOE6f1Hy-08kfMNiFgeJV9Y"; // wait, let's verify if the key starts with eyJ...

const anonKey = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4MzM5MDUwMCwiZXhwIjo0OTM5MDY0MTAwLCJyb2xlIjoiYW5vbiJ9.2skO6Kz-e19ergobnEANdOE6f1Hy-08kfMNiFgeJV9Y";

async function testFetchSignUp() {
  const randomEmail = `test_fetch_${Date.now()}@autocheck.com`;
  console.log(`Sending direct POST request to ${url} for email ${randomEmail}...`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "apikey": anonKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: randomEmail,
        password: "Password123!",
        data: {
          name: "Test Fetch User"
        }
      })
    });

    console.log(`Response status: ${response.status} ${response.statusText}`);
    console.log("Response headers:");
    for (const [key, value] of response.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }

    const text = await response.text();
    console.log("Response body:");
    console.log(text);
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

testFetchSignUp();
