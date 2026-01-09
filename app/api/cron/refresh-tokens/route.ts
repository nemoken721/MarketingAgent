import { NextResponse } from "next/server";
import { refreshAllInstagramTokens } from "@/lib/integrations/instagram";
import * as Sentry from "@sentry/nextjs";

/**
 * Cron Job: Instagram トークンリフレッシュ
 *
 * Vercel Cron で定期実行される想定
 * 毎日実行して、期限切れ間近のトークンをリフレッシュ
 *
 * @see https://vercel.com/docs/cron-jobs
 */
export async function GET(request: Request) {
  try {
    // Cron Secret による認証（本番環境のみ）
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (process.env.NODE_ENV === "production") {
      if (!cronSecret) {
        const error = new Error("CRON_SECRET is not configured");
        Sentry.captureException(error, { level: "fatal" });
        throw error;
      }

      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error("Unauthorized cron request");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    console.log("🔄 Starting token refresh cron job...");

    // Instagram トークンをリフレッシュ
    const instagramResult = await refreshAllInstagramTokens();

    // 将来的には X (Twitter) API のトークンリフレッシュもここに追加
    // const xResult = await refreshAllXTokens();

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      instagram: {
        refreshed: instagramResult.refreshed,
        failed: instagramResult.failed,
        errors: instagramResult.errors,
      },
      // x: {
      //   refreshed: xResult.refreshed,
      //   failed: xResult.failed,
      //   errors: xResult.errors,
      // },
    };

    console.log("✅ Token refresh cron job completed:", result);

    // 失敗があった場合は Sentry に通知
    if (instagramResult.failed > 0) {
      Sentry.captureMessage("Token refresh failures detected", {
        level: "warning",
        extra: result,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Token refresh cron job failed:", error);
    Sentry.captureException(error, {
      tags: { cron: "refresh-tokens" },
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
