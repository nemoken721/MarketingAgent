/**
 * POST /api/export/image
 *
 * フレームテンプレートを静止画(PNG/JPEG)にエクスポート
 *
 * Request:
 * - frameType: "frame1" | "frame2" | "frame3" | "frame4" | "frame5"
 * - aspectRatio: "reels" | "feed"
 * - data: フレーム固有のデータ
 * - format: "png" | "jpeg"
 * - quality?: number (JPEG用, 0-100)
 *
 * Response:
 * - success: true
 * - imageUrl: string (Supabase Storage URL)
 * - width: number
 * - height: number
 * - creditsUsed: number
 * - remainingCredits: number
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { exportImage } from "@/lib/content-engine/export";
import { CREDIT_COSTS, deductCredit, checkCreditSufficient } from "@/lib/credits";
import type { FrameType, ImageFormat } from "@/lib/content-engine/export";
import type { AspectRatio } from "@/lib/content-engine";

/** バリデーション用の許可値 */
const VALID_FRAME_TYPES: FrameType[] = [
  "frame1",
  "frame2",
  "frame3",
  "frame4",
  "frame5",
];
const VALID_ASPECT_RATIOS: AspectRatio[] = ["reels", "feed"];
const VALID_FORMATS: ImageFormat[] = ["png", "jpeg"];

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
    const { frameType, aspectRatio, data, format, quality } = body;

    // 3. バリデーション
    if (!frameType || !VALID_FRAME_TYPES.includes(frameType)) {
      return NextResponse.json(
        {
          success: false,
          error: `frameTypeは ${VALID_FRAME_TYPES.join(", ")} のいずれかである必要があります`,
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

    if (!format || !VALID_FORMATS.includes(format)) {
      return NextResponse.json(
        {
          success: false,
          error: `formatは ${VALID_FORMATS.join(", ")} のいずれかである必要があります`,
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    if (!data || typeof data !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "dataオブジェクトが必要です",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    if (quality !== undefined && (typeof quality !== "number" || quality < 0 || quality > 100)) {
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

    // 5. 画像エクスポート
    let result;
    try {
      result = await exportImage({
        userId: user.id,
        frameType,
        aspectRatio,
        data,
        format,
        quality,
      });
    } catch (renderError) {
      console.error("Render error:", renderError);
      return NextResponse.json(
        {
          success: false,
          error: "画像のレンダリングに失敗しました",
          code: "RENDER_ERROR",
        },
        { status: 500 }
      );
    }

    // 6. クレジット消費
    const newBalance = await deductCredit(
      user.id,
      creditCost,
      `画像エクスポート: ${frameType} (${aspectRatio})`
    );

    if (newBalance === null) {
      // クレジット消費に失敗しても画像は生成済み
      // ログを記録して続行
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
    console.error("Image export error:", error);
    const message =
      error instanceof Error ? error.message : "画像エクスポート中にエラーが発生しました";
    return NextResponse.json(
      {
        success: false,
        error: message,
        code: "RENDER_ERROR",
      },
      { status: 500 }
    );
  }
}
