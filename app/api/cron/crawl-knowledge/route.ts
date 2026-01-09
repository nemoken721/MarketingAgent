/**
 * Marty Intelligence: 月次クローラー Cron Job
 *
 * スケジュール: 毎月1日 AM 0:00 (JST)
 * Vercel Cron: 0 15 1 * * (UTC 15:00 = JST 00:00)
 */

import { NextRequest, NextResponse } from "next/server";
import { createOrchestrator } from "@/lib/intelligence";

// Vercel Cron 設定
export const runtime = "nodejs";
export const maxDuration = 300; // 5分（Cronジョブの最大実行時間）

/**
 * GET: 月次自動クロール
 * Vercel Cron または手動トリガーで実行
 */
export async function GET(request: NextRequest) {
  // Cron Secret の検証
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[CrawlKnowledge] Unauthorized cron request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[CrawlKnowledge] Starting monthly knowledge crawl...");

  try {
    const orchestrator = createOrchestrator();

    // クロール実行
    const summary = await orchestrator.runFullCrawl("regular");

    // 現在の年月でレポート生成
    const yearMonth = new Date().toISOString().slice(0, 7);
    await orchestrator.generateMonthlyReport(yearMonth);

    console.log("[CrawlKnowledge] Crawl completed successfully");

    return NextResponse.json({
      success: true,
      summary: {
        batchId: summary.batchId,
        sourcesProcessed: summary.sourcesProcessed,
        sourcesSucceeded: summary.sourcesSucceeded,
        articlesFound: summary.articlesFound,
        knowledgeAdded: summary.knowledgeAdded,
        duration: `${(summary.completedAt.getTime() - summary.startedAt.getTime()) / 1000}s`,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[CrawlKnowledge] Crawl failed:", errorMessage);

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST: 緊急クロール（Force Update）
 * 管理画面からの手動トリガー用
 */
export async function POST(request: NextRequest) {
  // 認証チェック（実際の実装では管理者権限を確認）
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // API Key または Cron Secret での認証
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // TODO: 管理者セッションの検証を追加
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[CrawlKnowledge] Starting emergency crawl...");

  try {
    const body = await request.json().catch(() => ({}));
    const sourceIds = body.sourceIds as string[] | undefined;

    const orchestrator = createOrchestrator();

    // 緊急クロール実行
    const summary = await orchestrator.runFullCrawl("emergency");

    return NextResponse.json({
      success: true,
      summary: {
        batchId: summary.batchId,
        type: "emergency",
        sourcesProcessed: summary.sourcesProcessed,
        knowledgeAdded: summary.knowledgeAdded,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[CrawlKnowledge] Emergency crawl failed:", errorMessage);

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
