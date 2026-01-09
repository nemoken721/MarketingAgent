/**
 * Marty Intelligence: Core Knowledge Ingestion Script
 * 「憲法」となるCore知識をDBに投入するスクリプト
 */

import { createClient } from "@supabase/supabase-js";
import { ALL_CORE_KNOWLEDGE } from "./fanbase-strategy";
import { knowledgeToMarkdown } from "../distiller/knowledge-distiller";
import type { UniversalKnowledge } from "../types";

/**
 * Core知識をDBに投入
 */
export async function ingestCoreKnowledge(): Promise<{
  success: boolean;
  inserted: number;
  errors: string[];
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase credentials not configured");
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const errors: string[] = [];
  let inserted = 0;

  console.log(`[IngestCore] Starting ingestion of ${ALL_CORE_KNOWLEDGE.length} core knowledge items...`);

  for (const knowledge of ALL_CORE_KNOWLEDGE) {
    try {
      console.log(`[IngestCore] Processing: ${knowledge.title}`);

      // Markdown形式に変換
      const content = knowledgeToMarkdown(knowledge);

      // ベクトル埋め込みを生成
      let embedding: number[] = [];
      if (openaiKey) {
        embedding = await generateEmbedding(content, openaiKey);
      } else {
        console.warn("[IngestCore] OPENAI_API_KEY not set, skipping embedding");
      }

      // DBに保存（upsert）
      const { error } = await supabase.from("knowledge_vectors").upsert(
        {
          knowledge_id: knowledge.knowledgeId,
          knowledge_type: knowledge.knowledgeType,
          category: knowledge.category,
          title: knowledge.title,
          content,
          embedding: embedding.length > 0 ? embedding : null,
          source_urls: knowledge.sourceUrls,
          valid_from: knowledge.validFrom.toISOString().split("T")[0],
          is_active: true,
          metadata: knowledge.metadata,
        },
        { onConflict: "knowledge_id" }
      );

      if (error) {
        console.error(`[IngestCore] Failed to insert ${knowledge.knowledgeId}:`, error);
        errors.push(`${knowledge.knowledgeId}: ${error.message}`);
      } else {
        console.log(`[IngestCore] Successfully inserted: ${knowledge.knowledgeId}`);
        inserted++;
      }

      // レート制限対策
      await sleep(500);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[IngestCore] Error processing ${knowledge.knowledgeId}:`, message);
      errors.push(`${knowledge.knowledgeId}: ${message}`);
    }
  }

  console.log(`[IngestCore] Completed: ${inserted}/${ALL_CORE_KNOWLEDGE.length} inserted`);

  return {
    success: errors.length === 0,
    inserted,
    errors,
  };
}

/**
 * カスタムCore知識を追加
 */
export async function addCustomCoreKnowledge(knowledge: UniversalKnowledge): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase credentials not configured");
  }

  // Core知識のIDプレフィックスを強制
  if (!knowledge.knowledgeId.startsWith("CORE-")) {
    knowledge.knowledgeId = `CORE-${knowledge.knowledgeId}`;
  }
  knowledge.knowledgeType = "core";

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const content = knowledgeToMarkdown(knowledge);

  let embedding: number[] = [];
  if (openaiKey) {
    embedding = await generateEmbedding(content, openaiKey);
  }

  const { error } = await supabase.from("knowledge_vectors").upsert(
    {
      knowledge_id: knowledge.knowledgeId,
      knowledge_type: "core",
      category: knowledge.category,
      title: knowledge.title,
      content,
      embedding: embedding.length > 0 ? embedding : null,
      source_urls: knowledge.sourceUrls,
      valid_from: knowledge.validFrom.toISOString().split("T")[0],
      is_active: true,
      metadata: { ...knowledge.metadata, neverOverride: true },
    },
    { onConflict: "knowledge_id" }
  );

  if (error) {
    console.error("[IngestCore] Failed to add custom knowledge:", error);
    return false;
  }

  return true;
}

/**
 * テキストをベクトル埋め込みに変換
 */
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text.slice(0, 8000),
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error("[IngestCore] Embedding generation failed:", error);
    return [];
  }
}

/**
 * スリープ
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
