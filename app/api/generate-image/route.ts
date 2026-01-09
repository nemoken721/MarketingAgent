import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// 遅延初期化 - ビルド時のエラーを防ぐ
let openai: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

// DALL-E 3画像生成のクレジットコスト
const IMAGE_GENERATION_COST = 100; // 1枚あたり100クレジット

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // ユーザー認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "認証されていません" },
        { status: 401 }
      );
    }

    const { prompt, size = "1024x1024", quality = "standard" } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "プロンプトを入力してください" },
        { status: 400 }
      );
    }

    // クレジット残高を確認
    const { data: credits, error: creditsError } = await supabase
      .from("credits")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (creditsError || !credits) {
      return NextResponse.json(
        { error: "クレジット情報の取得に失敗しました" },
        { status: 500 }
      );
    }

    if (credits.balance < IMAGE_GENERATION_COST) {
      return NextResponse.json(
        {
          error: "クレジットが不足しています",
          required: IMAGE_GENERATION_COST,
          current: credits.balance,
        },
        { status: 402 }
      );
    }

    // DALL-E 3で画像生成
    const response = await getOpenAIClient().images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: size as "1024x1024" | "1024x1792" | "1792x1024",
      quality: quality as "standard" | "hd",
    });

    const imageUrl = response.data?.[0]?.url;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "画像の生成に失敗しました" },
        { status: 500 }
      );
    }

    // クレジットを消費
    const { error: deductError } = await supabase.rpc("deduct_credits", {
      p_user_id: user.id,
      p_amount: IMAGE_GENERATION_COST,
      p_description: `画像生成: ${prompt.substring(0, 50)}...`,
    });

    if (deductError) {
      console.error("Failed to deduct credits:", deductError);
      return NextResponse.json(
        { error: "クレジットの消費に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      revisedPrompt: response.data?.[0]?.revised_prompt,
      creditsUsed: IMAGE_GENERATION_COST,
    });
  } catch (error: any) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: error.message || "画像生成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
