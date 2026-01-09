import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function testGemini() {
  console.log("🔑 API Key:", process.env.GOOGLE_GENERATIVE_AI_API_KEY?.substring(0, 20) + "...");

  try {
    const result = await generateText({
      model: google("gemini-pro"),
      prompt: "こんにちは、元気ですか？日本語で答えてください。",
    });

    console.log("✅ Success!");
    console.log("📝 Response:", result.text);
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

testGemini();
