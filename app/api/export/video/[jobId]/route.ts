/**
 * GET /api/export/video/[jobId]
 *
 * 動画エクスポートジョブのステータスを取得
 *
 * Response:
 * - jobId: string
 * - status: "pending" | "processing" | "completed" | "failed"
 * - progress: number (0-100)
 * - videoUrl?: string (完了時)
 * - error?: string (失敗時)
 * - creditsCharged?: number (完了時)
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getExportJob } from "@/lib/content-engine/export";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const supabase = await createClient();
    const { jobId } = await params;

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

    // 2. ジョブIDのバリデーション
    if (!jobId || typeof jobId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "jobIdが必要です",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    // 3. ジョブを取得
    const job = await getExportJob(jobId);

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: "ジョブが見つかりません",
          code: "NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // 4. 所有者チェック
    if (job.userId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: "このジョブにアクセスする権限がありません",
          code: "FORBIDDEN",
        },
        { status: 403 }
      );
    }

    // 5. レスポンス
    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      frameType: job.frameType,
      aspectRatio: job.aspectRatio,
      videoUrl: job.outputUrl,
      error: job.errorMessage,
      creditsCharged: job.creditsCharged,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    });
  } catch (error: unknown) {
    console.error("Get job status error:", error);
    const message =
      error instanceof Error ? error.message : "ジョブステータスの取得に失敗しました";
    return NextResponse.json(
      {
        success: false,
        error: message,
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
