const webhookUrl = 'https://vbigrtifoxsehgbapxtc.supabase.co/functions/v1/wasender-webhook?tenant_id=6b72afd6-4131-4622-9be3-ca10d4477980';

const payload = {
  event: "messages.received",
  data: {
    messages: {
      key: {
        remoteJid: "18297740320@s.whatsapp.net",
        fromMe: false,
        id: "TEST_REAL_WEBHOOK_" + Date.now(),
        cleanedSenderPn: "18297740320"
      },
      pushName: "Penélope Cruz",
      messageBody: "¡Prueba final anónima exitosa! El webhook funciona 100% sin autenticación.",
      message: {
        conversation: "¡Prueba final anónima exitosa! El webhook funciona 100% sin autenticación."
      }
    }
  }
};

async function testWebhook() {
  console.log("Sending anonymous POST request to webhook with real tenant ID...");
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
