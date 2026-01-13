/**
 * User Learning Engine
 * ユーザー学習の保存・検索・活用
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type {
  UserLearning,
  UserContext,
  PersonalizationMode,
  LearningType,
} from "./types";
import { generateLearningEmbedding } from "./learning-extractor";

/** エンジン設定 */
interface LearningEngineConfig {
  maxLearningsPerType?: number;
  similarityThreshold?: number;
}

/**
 * ユーザー学習エンジン
 */
export class UserLearningEngine {
  private supabase: SupabaseClient;
  private config: Required<LearningEngineConfig>;

  constructor(config?: LearningEngineConfig) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.config = {
      maxLearningsPerType: config?.maxLearningsPerType ?? 5,
      similarityThreshold: config?.similarityThreshold ?? 0.6,
    };
  }

  /**
   * ユーザーコンテキストを取得
   * クエリに関連する学習を検索し、パーソナライズに使用
   */
  async getUserContext(
    userId: string,
    query: string,
    mode: PersonalizationMode = "balanced"
  ): Promise<UserContext> {
    // クエリの埋め込みを生成
    const queryEmbedding = await this.generateQueryEmbedding(query);

    // 各種学習を取得
    const [businessContext, recurringTopics, relevantHistory] = await Promise.all([
      this.getLearningsByType(userId, "business_context"),
      this.getLearningsByType(userId, "recurring_topic"),
      queryEmbedding.length > 0
        ? this.searchRelevantLearnings(userId, queryEmbedding)
        : [],
    ]);

    // フォーマット済みコンテキストを生成
    const formattedContext = this.formatUserContext(
      businessContext,
      recurringTopics,
      relevantHistory,
      mode
    );

    return {
      userId,
      businessContext,
      recurringTopics,
      relevantHistory,
      formattedContext,
      mode,
    };
  }

  /**
   * 学習を保存
   */
  async saveLearning(learning: UserLearning): Promise<boolean> {
    try {
      // 埋め込みを生成
      const embedding = await generateLearningEmbedding(learning);

      const { error } = await this.supabase.from("user_learnings").insert({
        user_id: learning.userId,
        learning_type: learning.learningType,
        title: learning.title,
        content: learning.content,
        context: learning.context,
        confidence: learning.confidence,
        source_thread_id: learning.sourceThreadId,
        embedding: embedding.length > 0 ? embedding : null,
        is_active: true,
      });

      if (error) {
        console.error("[LearningEngine] Save error:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("[LearningEngine] Save error:", error);
      return false;
    }
  }

  /**
   * 複数の学習を一括保存
   */
  async saveLearnings(learnings: UserLearning[]): Promise<number> {
    let saved = 0;
    for (const learning of learnings) {
      const success = await this.saveLearning(learning);
      if (success) saved++;
      // レート制限対策
      await this.sleep(200);
    }
    return saved;
  }

  /**
   * 参照カウントを更新
   */
  async incrementReference(learningId: string): Promise<void> {
    await this.supabase.rpc("increment_learning_reference", {
      p_learning_id: learningId,
    });
  }

  /**
   * タイプ別に学習を取得
   */
  private async getLearningsByType(
    userId: string,
    learningType: LearningType
  ): Promise<UserLearning[]> {
    const { data, error } = await this.supabase
      .from("user_learnings")
      .select("*")
      .eq("user_id", userId)
      .eq("learning_type", learningType)
      .eq("is_active", true)
      .order("confidence", { ascending: false })
      .order("reference_count", { ascending: false })
      .limit(this.config.maxLearningsPerType);

    if (error || !data) return [];

    return data.map(this.mapToUserLearning);
  }

  /**
   * 関連する学習をベクトル検索
   */
  private async searchRelevantLearnings(
    userId: string,
    queryEmbedding: number[]
  ): Promise<UserLearning[]> {
    const { data, error } = await this.supabase.rpc("search_user_learnings", {
      p_user_id: userId,
      p_query_embedding: queryEmbedding,
      p_match_count: 5,
    });

    if (error || !data) return [];

    return data
      .filter((d: { similarity: number }) => d.similarity >= this.config.similarityThreshold)
      .map((d: Record<string, unknown>) => ({
        id: d.id as string,
        userId,
        learningType: d.learning_type as LearningType,
        title: d.title as string,
        content: d.content as string,
        confidence: d.confidence as number,
        referenceCount: d.reference_count as number,
      }));
  }

  /**
   * ユーザーコンテキストをフォーマット
   */
  private formatUserContext(
    businessContext: UserLearning[],
    recurringTopics: UserLearning[],
    relevantHistory: UserLearning[],
    mode: PersonalizationMode
  ): string {
    const sections: string[] = [];

    // モードに応じた導入文
    if (mode === "partner") {
      sections.push("【このユーザーについて把握している情報】");
      sections.push("※ 親しいパートナーとして、過去の文脈を踏まえて対話してください");
    } else if (mode === "objective") {
      sections.push("【参考：ユーザー背景情報】");
      sections.push("※ 客観的・分析的な視点を維持し、必要に応じて別の視点も提示してください");
    } else {
      sections.push("【ユーザーコンテキスト】");
      sections.push("※ 状況に応じて、親密さと客観性のバランスを取ってください");
    }

    // ビジネス背景
    if (businessContext.length > 0) {
      sections.push("\n## ビジネス背景");
      businessContext.forEach((l) => {
        sections.push(`- ${l.title}: ${l.content}`);
      });
    }

    // よく相談するトピック
    if (recurringTopics.length > 0) {
      sections.push("\n## よく相談されるトピック");
      recurringTopics.forEach((l) => {
        sections.push(`- ${l.title}`);
      });
    }

    // 関連する過去の文脈
    if (relevantHistory.length > 0 && mode !== "objective") {
      sections.push("\n## 関連する過去の会話・決定");
      relevantHistory.forEach((l) => {
        const typeLabel = this.getLearningTypeLabel(l.learningType);
        sections.push(`- [${typeLabel}] ${l.title}: ${l.content}`);
      });
    }

    // アドバイス
    sections.push("\n## 対応指針");
    if (mode === "partner") {
      sections.push("- 「前におっしゃっていた〇〇の件ですね」など、過去の文脈を積極的に参照");
      sections.push("- ユーザーの状況を理解している前提で、具体的なアドバイスを提供");
    } else if (mode === "objective") {
      sections.push("- 客観的なデータや一般論に基づいた分析を優先");
      sections.push("- 「別の視点から見ると〜」など、多角的な意見を提示");
      sections.push("- ユーザーの既存の考えに囚われず、率直なフィードバックを提供");
    } else {
      sections.push("- 基本は親しいパートナーとして対応しつつ、必要に応じて客観的視点も提供");
      sections.push("- 「ちなみに別の観点から言うと〜」で視野を広げる提案も可");
    }

    return sections.join("\n");
  }

  /**
   * 学習タイプのラベルを取得
   */
  private getLearningTypeLabel(type: LearningType): string {
    const labels: Record<LearningType, string> = {
      business_context: "背景",
      recurring_topic: "トピック",
      preference: "好み",
      past_decision: "決定",
      challenge: "課題",
      success: "成功",
      terminology: "用語",
    };
    return labels[type] || type;
  }

  /**
   * DBレコードをUserLearningにマップ
   */
  private mapToUserLearning(record: Record<string, unknown>): UserLearning {
    return {
      id: record.id as string,
      userId: record.user_id as string,
      learningType: record.learning_type as LearningType,
      title: record.title as string,
      content: record.content as string,
      context: record.context as string | undefined,
      confidence: record.confidence as number,
      sourceThreadId: record.source_thread_id as string | undefined,
      referenceCount: record.reference_count as number,
      isActive: record.is_active as boolean,
    };
  }

  /**
   * クエリの埋め込みを生成
   */
  private async generateQueryEmbedding(query: string): Promise<number[]> {
    const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!geminiKey) return [];

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/text-embedding-004",
            content: { parts: [{ text: query }] },
          }),
        }
      );

      if (!response.ok) return [];

      const data = await response.json();
      return data.embedding?.values || [];
    } catch {
      return [];
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * ユーザー学習エンジンを作成
 */
export function createUserLearningEngine(
  config?: LearningEngineConfig
): UserLearningEngine {
  return new UserLearningEngine(config);
}

/**
 * クエリからパーソナライズモードを推測
 */
export function inferPersonalizationMode(query: string): PersonalizationMode {
  const lowerQuery = query.toLowerCase();

  // 客観的な視点を求めるキーワード
  const objectiveKeywords = [
    "客観的",
    "第三者",
    "別の視点",
    "一般的に",
    "他社",
    "業界では",
    "データ",
    "統計",
    "比較",
    "分析",
    "評価",
    "フィードバック",
    "率直",
    "正直",
  ];

  if (objectiveKeywords.some((k) => lowerQuery.includes(k))) {
    return "objective";
  }

  // パートナーモードを示唆するキーワード
  const partnerKeywords = [
    "前に話した",
    "この前の",
    "続き",
    "あの件",
    "例の",
    "いつもの",
  ];

  if (partnerKeywords.some((k) => lowerQuery.includes(k))) {
    return "partner";
  }

  return "balanced";
}
