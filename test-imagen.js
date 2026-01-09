// Gemini 2.5 Flash Image 画像生成テスト
// Usage: node test-imagen.js

require('dotenv').config({ path: '.env.local' });
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');

async function testImageGeneration() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    console.error('❌ GOOGLE_GENERATIVE_AI_API_KEY が設定されていません');
    process.exit(1);
  }

  console.log('✅ API キー確認OK:', apiKey.substring(0, 10) + '...');

  try {
    const genAI = new GoogleGenAI({ apiKey });

    console.log('🎨 Gemini 2.5 Flash Image で画像生成中...');
    console.log('   プロンプト: A cute cat sitting on a cozy sofa');

    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: 'A cute cat sitting on a cozy sofa, warm lighting, photorealistic. Generate this image in square format (1:1 aspect ratio).',
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    // レスポンスから画像を抽出
    const parts = response.candidates?.[0]?.content?.parts;

    if (!parts) {
      console.error('❌ レスポンスにパーツがありません');
      console.log('レスポンス:', JSON.stringify(response, null, 2));
      process.exit(1);
    }

    // 画像データを探す
    let imageData = null;
    let mimeType = 'image/png';

    for (const part of parts) {
      if (part.text) {
        console.log('📝 テキスト応答:', part.text);
      }
      if (part.inlineData?.data) {
        imageData = part.inlineData.data;
        mimeType = part.inlineData.mimeType || 'image/png';
      }
    }

    if (!imageData) {
      console.error('❌ 画像が生成されませんでした');
      console.log('パーツ:', JSON.stringify(parts, null, 2));
      process.exit(1);
    }

    // 画像をファイルに保存
    const buffer = Buffer.from(imageData, 'base64');
    const extension = mimeType.split('/')[1] || 'png';
    const filename = `test-image-output.${extension}`;
    fs.writeFileSync(filename, buffer);

    console.log('✅ 画像生成成功!');
    console.log('   ファイル:', filename);
    console.log('   MIME タイプ:', mimeType);
    console.log('   サイズ:', (buffer.length / 1024).toFixed(2) + ' KB');

  } catch (error) {
    console.error('❌ エラー:', error.message);
    if (error.response) {
      console.error('レスポンス:', JSON.stringify(error.response, null, 2));
    }
    process.exit(1);
  }
}

testImageGeneration();
