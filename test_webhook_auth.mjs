import dotenv from 'dotenv';
dotenv.config();

const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const webhookUrl = `https://vbigrtifoxsehgbapxtc.supabase.co/functions/v1/wasender-webhook?tenant_id=6b72afd6-4131-4622-9be3-ca10d4477980&apikey=${serviceKey}`;

const payload = {
  event: "messages.received",
  data: {
    messages: {
      key: {
        remoteJid: "18297740320@s.whatsapp.net",
        fromMe: false,
        id: "TEST_WEBHOOK_" + Date.now(),
        cleanedSenderPn: "18297740320"
      },
      pushName: "Penélope Cruz",
      messageBody: "Mensaje de prueba con tenant real a las " + new Date().toLocaleTimeString(),
      message: {
        conversation: "Mensaje de prueba con tenant real"
      }
    }
  }
};

async function testWebhook() {
  console.log("Sending POST request to webhook with real tenant ID...");
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`
      },
      body: JSON.stringify(payload)
    });

    console.log("Response Status:", res.status);
    const text = await res.text();
    console.log("Response Body:", text);
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

testWebhook();
