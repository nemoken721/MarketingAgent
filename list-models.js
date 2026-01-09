import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function listModels() {
  try {
    console.log("📋 利用可能なモデルリスト:\n");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`
    );

    const data = await response.json();

    if (data.models) {
      data.models.forEach(model => {
        if (model.supportedGenerationMethods?.includes("generateContent")) {
          console.log(`✅ ${model.name}`);
          console.log(`   - Display Name: ${model.displayName}`);
          console.log(`   - Description: ${model.description?.substring(0, 100)}...`);
          console.log();
        }
      });
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

listModels();
