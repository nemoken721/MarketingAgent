/**
 * POST /api/export/video
 *
 * フレームテンプレートを動画(MP4)にエクスポート
 *
 * Request:
 * - frameType: "frame1" | "frame2" | "frame3" | "frame4" | "frame5"
 * - aspectRatio: "reels" | "feed"
 * - data: フレーム固有のデータ
 * - duration?: number (秒)
 * - fps?: 30 | 60
 *
 * Response (同期モード):
 * - success: true
 * - videoUrl: string (Supabase Storage URL)
 * - width: number
 * - height: number
 * - durationInSeconds: number
 * - creditsUsed: number
 *
 * 注意: 動画レンダリングは時間がかかるため、
 * 本番環境ではバックグラウンドジョブ + ポーリングを推奨
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  exportVideo,
  createExportJob,
  updateExportJob,
} from "@/lib/content-engine/export";
import { CREDIT_COSTS, deductCredit, checkCreditSufficient } from "@/lib/credits";
import type { FrameType } from "@/lib/content-engine/export";
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
const VALID_FPS = [30, 60] as const;

export async function POST(request: NextRequest) {
  let jobId: string | null = null;

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
    const { frameType, aspectRatio, data, duration, fps = 30 } = body;

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

    if (!VALID_FPS.includes(fps)) {
      return NextResponse.json(
        {
          success: false,
          error: "fpsは30または60である必要があります",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    if (duration !== undefined && (typeof duration !== "number" || duration < 1 || duration > 60)) {
      return NextResponse.json(
        {
          success: false,
          error: "durationは1〜60秒の数値である必要があります",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    // 4. クレジット残高チェック
    const creditCost = CREDIT_COSTS.VIDEO_GENERATION;
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

    // 5. ジョブを作成
    jobId = await createExportJob({
      userId: user.id,
      type: "video",
      frameType,
      aspectRatio,
      inputData: data,
      creditsReserved: creditCost,
    });

    // 6. ジョブを処理中に更新
    await updateExportJob(jobId, {
      status: "processing",
      startedAt: new Date(),
    });

    // 7. 動画レンダリング (同期)
    let result;
    try {
      result = await exportVideo({
        userId: user.id,
        frameType,
        aspectRatio,
        data,
        fps,
        duration,
        onProgress: async (progress) => {
          // 進捗を更新
          await updateExportJob(jobId!, { progress });
        },
      });
    } catch (renderError) {
      console.error("Render error:", renderError);

      // ジョブを失敗に更新
      await updateExportJob(jobId, {
        status: "failed",
        errorMessage:
          renderError instanceof Error
            ? renderError.message
            : "レンダリングに失敗しました",
        completedAt: new Date(),
      });

      return NextResponse.json(
        {
          success: false,
          error: "動画のレンダリングに失敗しました",
          code: "RENDER_ERROR",
          jobId,
        },
        { status: 500 }
      );
    }

    // 8. クレジット消費
    const newBalance = await deductCredit(
      user.id,
      creditCost,
      `動画エクスポート: ${frameType} (${aspectRatio})`
    );

    // 9. ジョブを完了に更新
    await updateExportJob(jobId, {
      status: "completed",
      progress: 100,
      outputUrl: result.videoUrl,
      outputWidth: result.width,
      outputHeight: result.height,
      outputFormat: "mp4",
      creditsCharged: creditCost,
      completedAt: new Date(),
    });

    // 10. レスポンス
    return NextResponse.json({
      success: true,
      jobId,
      videoUrl: result.videoUrl,
      width: result.width,
      height: result.height,
      durationInSeconds: result.durationInSeconds,
      fps: result.fps,
      creditsUsed: creditCost,
      remainingCredits: newBalance ?? balance - creditCost,
    });
  } catch (error: unknown) {
    console.error("Video export error:", error);

    // ジョブがある場合は失敗に更新
    if (jobId) {
      await updateExportJob(jobId, {
        status: "failed",
        errorMessage:
          error instanceof Error ? error.message : "不明なエラー",
        completedAt: new Date(),
      });
    }

    const message =
      error instanceof Error
        ? error.message
        : "動画エクスポート中にエラーが発生しました";
    return NextResponse.json(
      {
        success: false,
        error: message,
        code: "RENDER_ERROR",
        jobId,
      },
      { status: 500 }
    );
  }
}
