/**
 * POST /api/generate-content-image
 *
 * Satori + resvg-js を使用した軽量画像生成API
 * フレームテンプレートにテキストを流し込んで「完パケ画像」を生成
 *
 * Request:
 * {
 *   "templateId": "line_chat" | "magazine" | "memo" | "cinema" | "quiz",
 *   "textData": { ... },        // テンプレート固有のテキストデータ
 *   "backgroundUrl": "...",     // 背景画像のURL (オプション)
 *   "aspectRatio": "feed" | "reels"
 *   "format": "png" | "jpeg"    // (オプション, デフォルト: "png")
 *   "quality": 90               // JPEG用品質 (オプション)
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "imageUrl": "https://...",
 *   "width": 1080,
 *   "height": 1350 | 1920,
 *   "creditsUsed": 10
 * }
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { exportSatoriImage, type TemplateId } from "@/lib/content-engine/satori";
import { CREDIT_COSTS, deductCredit, checkCreditSufficient } from "@/lib/credits";
import type { AspectRatio } from "@/lib/content-engine";

/** 有効なテンプレートID */
const VALID_TEMPLATE_IDS: TemplateId[] = [
  "line_chat",
  "magazine",
  "memo",
  "cinema",
  "quiz",
];

/** 有効なアスペクト比 */
const VALID_ASPECT_RATIOS: AspectRatio[] = ["reels", "feed"];

/** 有効な画像フォーマット */
const VALID_FORMATS = ["png", "jpeg"] as const;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "認証されていません",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    // 2. リクエストボディのパース
    const body = await request.json();
    const {
      templateId,
      textData,
      backgroundUrl,
      aspectRatio,
      format = "png",
      quality,
    } = body;

    // 3. バリデーション
    if (!templateId || !VALID_TEMPLATE_IDS.includes(templateId)) {
      return NextResponse.json(
        {
          success: false,
          error: `templateIdは ${VALID_TEMPLATE_IDS.join(", ")} のいずれかである必要があります`,
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    if (!aspectRatio || !VALID_ASPECT_RATIOS.includes(aspectRatio)) {
      return NextResponse.json(
        {
          success: false,
          error: `aspectRatioは ${VALID_ASPECT_RATIOS.join(", ")} のいずれかである必要があります`,
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    if (format && !VALID_FORMATS.includes(format)) {
      return NextResponse.json(
        {
          success: false,
          error: `formatは ${VALID_FORMATS.join(", ")} のいずれかである必要があります`,
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    if (!textData || typeof textData !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "textDataオブジェクトが必要です",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    // テンプレート固有のバリデーション
    const validationError = validateTextData(templateId, textData);
    if (validationError) {
      return NextResponse.json(
        {
          success: false,
          error: validationError,
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    if (
      quality !== undefined &&
      (typeof quality !== "number" || quality < 0 || quality > 100)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "qualityは0〜100の数値である必要があります",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    // 4. クレジット残高チェック
    const creditCost = CREDIT_COSTS.IMAGE_GENERATION;
    const { sufficient, balance } = await checkCreditSufficient(
      user.id,
      creditCost
    );

    if (!sufficient) {
      return NextResponse.json(
        {
          success: false,
          error: "クレジットが不足しています",
          code: "INSUFFICIENT_CREDITS",
          required: creditCost,
          current: balance,
        },
        { status: 402 }
      );
    }

    // 5. Satori画像生成
    let result;
    try {
      result = await exportSatoriImage({
        userId: user.id,
        templateId,
        aspectRatio,
        textData,
        backgroundUrl,
        format,
        quality,
      });
    } catch (renderError) {
      console.error("Satori render error:", renderError);
      return NextResponse.json(
        {
          success: false,
          error: "画像のレンダリングに失敗しました",
          code: "RENDER_ERROR",
          details:
            renderError instanceof Error ? renderError.message : String(renderError),
        },
        { status: 500 }
      );
    }

    // 6. クレジット消費
    const newBalance = await deductCredit(
      user.id,
      creditCost,
      `コンテンツ画像生成: ${templateId} (${aspectRatio})`
    );

    if (newBalance === null) {
      console.error("Failed to deduct credits, but image was generated");
    }

    // 7. レスポンス
    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      width: result.width,
      height: result.height,
      format: result.format,
      creditsUsed: creditCost,
      remainingCredits: newBalance ?? balance - creditCost,
    });
  } catch (error: unknown) {
    console.error("Content image generation error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "画像生成中にエラーが発生しました";
    return NextResponse.json(
      {
        success: false,
        error: message,
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

/**
 * テンプレート固有のtextDataバリデーション
 */
function validateTextData(
  templateId: TemplateId,
  textData: Record<string, unknown>
): string | null {
  switch (templateId) {
    case "line_chat":
      if (!Array.isArray(textData.messages) || textData.messages.length === 0) {
        return "line_chatテンプレートにはmessages配列が必要です";
      }
      for (const msg of textData.messages) {
        if (!msg.sender || !["customer", "shop"].includes(msg.sender)) {
          return "各メッセージにはsender (customer | shop) が必要です";
        }
        if (!msg.content || typeof msg.content !== "string") {
          return "各メッセージにはcontent (文字列) が必要です";
        }
      }
      break;

    case "magazine":
      if (!textData.title || typeof textData.title !== "string") {
        return "magazineテンプレートにはtitle (文字列) が必要です";
      }
      break;

    case "memo":
      if (!textData.content || typeof textData.content !== "string") {
        return "memoテンプレートにはcontent (文字列) が必要です";
      }
      break;

    case "cinema":
      if (!textData.subtitle || typeof textData.subtitle !== "string") {
        return "cinemaテンプレートにはsubtitle (文字列) が必要です";
      }
      break;

    case "quiz":
      if (!textData.question || typeof textData.question !== "string") {
        return "quizテンプレートにはquestion (文字列) が必要です";
      }
      if (!Array.isArray(textData.options) || textData.options.length < 2) {
        return "quizテンプレートにはoptions配列 (2つ以上) が必要です";
      }
      break;
  }

  return null;
}
