const url = "https://api.servitracks.com/auth/v1/admin/users";
const serviceRoleKey = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4MzM5MDUwMCwiZXhwIjo0OTM5MDY0MTAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.d3PUP2XsMjRySYopRLYoUoFQ1pHb7LyMp9X_Fv4AX-M";

async function testFetchAllUsers() {
  console.log("Sending direct GET request to admin users endpoint...");
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json"
      }
    });

    console.log(`Response status: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log("Response body length:", text.length);
    
    const parsed = JSON.parse(text);
    console.log("Parsed users count:", parsed.length || (parsed.users ? parsed.users.length : "no users array"));
    if (parsed.users) {
      console.log("User emails in GoTrue API list:");
      console.table(parsed.users.map(u => ({ id: u.id, email: u.email, created_at: u.created_at })));
    } else {
      console.log(parsed);
    }
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

testFetchAllUsers();
