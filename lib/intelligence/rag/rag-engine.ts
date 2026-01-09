/**
 * Marty Intelligence: RAG Engine
 * 知識検索とコンテキスト生成
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { SearchResult, RAGContext, RAGConfig } from "../types";

/** デフォルトRAG設定 */
const DEFAULT_RAG_CONFIG: RAGConfig = {
  maxResults: 5,
  similarityThreshold: 0.7,
  alwaysIncludeCore: true,
};

/**
 * RAG Engine
 * ユーザーのクエリに関連する知識を検索し、System Promptに注入可能な形式で返す
 */
export class RAGEngine {
  private supabase: SupabaseClient;
  private config: RAGConfig;

  constructor(config?: Partial<RAGConfig>) {
    this.config = { ...DEFAULT_RAG_CONFIG, ...config };

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * クエリに関連する知識を検索し、RAGコンテキストを生成
   */
  async retrieve(query: string, category?: string): Promise<RAGContext> {
    console.log(`[RAG] Retrieving knowledge for query: "${query.slice(0, 50)}..."`);

    // 1. クエリをベクトル化
    const queryEmbedding = await this.generateQueryEmbedding(query);

    if (queryEmbedding.length === 0) {
      console.warn("[RAG] Failed to generate query embedding, using fallback");
      return this.createEmptyContext(query);
    }

    // 2. ベクトル検索を実行
    const { data: results, error } = await this.supabase.rpc(
      "search_knowledge_with_priority",
      {
        query_embedding: queryEmbedding,
        match_count: this.config.maxResults,
        filter_category: category || null,
      }
    );

    if (error) {
      console.error("[RAG] Search failed:", error);
      return this.createEmptyContext(query);
    }

    // 3. 結果を整形
    const searchResults: SearchResult[] = (results || []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      knowledgeId: r.knowledge_id as string,
      knowledgeType: r.knowledge_type as "core" | "trends",
      category: r.category as string,
      title: r.title as string,
      content: r.content as string,
      validFrom: new Date(r.valid_from as string),
      similarity: r.similarity as number,
      priorityScore: r.priority_score as number,
    }));

    // 4. CoreとTrendsに分離
    const coreKnowledge = searchResults.filter((r) => r.knowledgeType === "core");
    const trendsKnowledge = searchResults.filter((r) => r.knowledgeType === "trends");

    console.log(
      `[RAG] Found ${coreKnowledge.length} core, ${trendsKnowledge.length} trends knowledge`
    );

    // 5. System Prompt用にフォーマット
    const formattedContext = this.formatForSystemPrompt(
      coreKnowledge,
      trendsKnowledge
    );

    return {
      query,
      retrievedKnowledge: searchResults,
      coreKnowledge,
      trendsKnowledge,
      formattedContext,
    };
  }

  /**
   * クエリをベクトル埋め込みに変換（Gemini text-embedding-004）
   */
  private async generateQueryEmbedding(query: string): Promise<number[]> {
    const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!geminiKey) {
      console.warn("[RAG] GOOGLE_GENERATIVE_AI_API_KEY not set");
      return [];
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "models/text-embedding-004",
            content: {
              parts: [{ text: query }],
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.embedding.values;
    } catch (error) {
      console.error("[RAG] Embedding generation failed:", error);
      return [];
    }
  }

  /**
   * System Prompt用にコンテキストをフォーマット
   */
  private formatForSystemPrompt(
    coreKnowledge: SearchResult[],
    trendsKnowledge: SearchResult[]
  ): string {
    const lines: string[] = [];

    // Core知識（最重要）
    if (coreKnowledge.length > 0) {
      lines.push("【あなたの信念・行動原則（The Core）】");
      lines.push("以下は、あなたの根幹をなす「憲法」です。いかなるトレンドがあっても、この原則を最優先してください。\n");

      for (const knowledge of coreKnowledge) {
        lines.push(`■ ${knowledge.title}`);
        lines.push(knowledge.content);
        lines.push("");
      }
    }

    // Trends知識
    if (trendsKnowledge.length > 0) {
      lines.push("【最新の知識・トレンド（The Trends）】");
      lines.push("以下は、最新のマーケティング動向です。Core（信念）と矛盾する場合は、Coreを優先してください。\n");

      for (const knowledge of trendsKnowledge) {
        const dateStr = knowledge.validFrom.toISOString().split("T")[0];
        lines.push(`■ ${knowledge.title}（${dateStr}時点の情報）`);
        lines.push(knowledge.content);
        lines.push("");
      }
    }

    return lines.join("\n");
  }

  /**
   * 空のコンテキストを生成
   */
  private createEmptyContext(query: string): RAGContext {
    return {
      query,
      retrievedKnowledge: [],
      coreKnowledge: [],
      trendsKnowledge: [],
      formattedContext: "",
    };
  }
}

/**
 * デフォルトのRAGエンジンを作成
 */
export function createRAGEngine(config?: Partial<RAGConfig>): RAGEngine {
  return new RAGEngine(config);
}
