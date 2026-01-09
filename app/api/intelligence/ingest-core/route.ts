/**
 * Marty Intelligence: Core Knowledge Ingestion API
 * 管理者がCore知識をDBに投入するためのエンドポイント
 */

import { NextRequest, NextResponse } from "next/server";
import { ingestCoreKnowledge, addCustomCoreKnowledge } from "@/lib/intelligence/core-knowledge/ingest-core";
import type { UniversalKnowledge, Guideline, ContextChange } from "@/lib/intelligence/types";

/**
 * POST: Core知識を投入
 *
 * Body:
 * - action: "ingest_all" | "add_custom"
 * - knowledge?: UniversalKnowledge (add_customの場合)
 */
export async function POST(request: NextRequest) {
  // 認証チェック（管理者のみ）
  const authHeader = request.headers.get("authorization");
  const adminSecret = process.env.CRON_SECRET; // 管理者用シークレットを流用

  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const action = body.action as string;

    if (action === "ingest_all") {
      // 全てのCore知識を投入
      const result = await ingestCoreKnowledge();

      return NextResponse.json({
        success: result.success,
        message: `Ingested ${result.inserted} core knowledge items`,
        errors: result.errors,
      });
    } else if (action === "add_custom") {
      // カスタムCore知識を追加
      const knowledgeInput = body.knowledge;

      if (!knowledgeInput) {
        return NextResponse.json(
          { error: "Missing 'knowledge' in request body" },
          { status: 400 }
        );
      }

      // 入力を UniversalKnowledge 形式に変換
      const knowledge: UniversalKnowledge = {
        knowledgeId: knowledgeInput.knowledgeId || `CORE-${Date.now()}`,
        knowledgeType: "core",
        category: knowledgeInput.category || "marketing",
        title: knowledgeInput.title,
        validFrom: new Date(knowledgeInput.validFrom || new Date()),
        concept: knowledgeInput.concept,
        guidelines: (knowledgeInput.guidelines || []) as Guideline[],
        toneAndPhrasing: knowledgeInput.toneAndPhrasing || [],
        context: (knowledgeInput.context || []) as ContextChange[],
        sourceUrls: knowledgeInput.sourceUrls || [],
        metadata: knowledgeInput.metadata || {},
      };

      const success = await addCustomCoreKnowledge(knowledge);

      return NextResponse.json({
        success,
        message: success
          ? `Added core knowledge: ${knowledge.knowledgeId}`
          : "Failed to add core knowledge",
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'ingest_all' or 'add_custom'" },
        { status: 400 }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[IngestCore API] Error:", message);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
