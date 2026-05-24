import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
dotenv.config();

async function listModels() {
  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API key");
    return;
  }
  
  // Note: SDK doesn't expose listModels directly easily if we don't have the REST client, 
  // let's just do a direct fetch to the REST API.
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const data = await response.json();
  
  if (data.models) {
      console.log("Available models:");
      data.models.forEach(m => console.log(m.name, m.supportedGenerationMethods));
  } else {
      console.error(data);
  }
}

listModels();
