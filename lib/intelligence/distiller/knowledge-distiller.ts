/**
 * Marty Intelligence: Knowledge Distiller
 * LLMを使って記事を Universal Knowledge Template に変換する
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  CrawledArticle,
  UniversalKnowledge,
  DistillationResult,
  DistillationConfig,
  Guideline,
  ContextChange,
} from "../types";

/** デフォルト設定 */
const DEFAULT_CONFIG: DistillationConfig = {
  model: "gemini-1.5-flash",
  maxTokens: 4096,
  temperature: 0.3,
};

/** 蒸留プロンプト */
const DISTILLATION_PROMPT = `あなたはマーケティング知識を体系化するエキスパートです。
与えられた記事を、以下のJSON形式の「Universal Knowledge Template」に変換してください。

【重要ルール】
1. 単なる要約ではなく、「実践で使える知識」として再構成すること
2. Guidelinesは必ず「If-Then」形式で、具体的な状況と対応を記述すること
3. Contextには「以前はどうだったか→今はどうなったか」の変化を含めること
4. キラーフレーズは、この知識を説明する際に使える印象的な表現を抽出すること
5. 情報が不十分な場合は、推測せず該当フィールドを空にすること

【出力形式 (JSON)】
{
  "title": "知識のタイトル（20文字以内）",
  "concept": "この知識の核心を1-2文で説明",
  "guidelines": [
    {
      "if": "ユーザーが○○の時",
      "then": "△△を提案する",
      "reason": "その理由は□□である"
    }
  ],
  "toneAndPhrasing": [
    "キラーフレーズ1",
    "キラーフレーズ2"
  ],
  "context": [
    {
      "beforePeriod": "2024年以前",
      "oldPractice": "以前の常識",
      "newPractice": "現在の常識"
    }
  ],
  "suggestedCategory": "instagram | seo | marketing | design | social | meta",
  "suggestedKeyword": "knowledge-idに使う英単語（例: reels-algorithm）"
}

【記事情報】
タイトル: {title}
URL: {url}
公開日: {publishedAt}
著者: {author}
ソース: {sourceId}

【記事本文】
{content}

上記の記事を分析し、JSON形式で知識を抽出してください。JSONのみを出力し、他の説明は不要です。`;

/**
 * Knowledge Distiller
 * 記事を Universal Knowledge Template に変換する
 */
export class KnowledgeDistiller {
  private genAI: GoogleGenerativeAI;
  private config: DistillationConfig;

  constructor(config?: Partial<DistillationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured");
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * 記事を知識に蒸留
   */
  async distill(article: CrawledArticle): Promise<DistillationResult> {
    console.log(`[Distiller] Processing: ${article.title}`);

    try {
      // プロンプト生成
      const prompt = this.buildPrompt(article);

      // LLM呼び出し
      const model = this.genAI.getGenerativeModel({
        model: this.config.model,
      });

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: this.config.maxTokens,
          temperature: this.config.temperature,
        },
      });

      const responseText = result.response.text();

      // JSONをパース
      const knowledge = this.parseResponse(responseText, article);

      console.log(`[Distiller] Successfully distilled: ${knowledge.title}`);

      return {
        success: true,
        knowledge,
        sourceArticle: article,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`[Distiller] Failed to distill "${article.title}":`, errorMessage);

      return {
        success: false,
        sourceArticle: article,
        error: errorMessage,
      };
    }
  }

  /**
   * 複数記事を一括蒸留
   */
  async distillBatch(
    articles: CrawledArticle[],
    concurrency: number = 2
  ): Promise<DistillationResult[]> {
    const results: DistillationResult[] = [];

    // 同時実行数を制限しながら処理
    for (let i = 0; i < articles.length; i += concurrency) {
      const batch = articles.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map((article) => this.distill(article))
      );
      results.push(...batchResults);

      // レート制限対策（バッチ間で1秒待機）
      if (i + concurrency < articles.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(
      `[Distiller] Batch complete: ${successCount}/${results.length} successful`
    );

    return results;
  }

  /**
   * プロンプトを構築
   */
  private buildPrompt(article: CrawledArticle): string {
    // コンテンツを3000文字に制限
    const truncatedContent =
      article.content.length > 3000
        ? article.content.slice(0, 3000) + "..."
        : article.content;

    return DISTILLATION_PROMPT
      .replace("{title}", article.title)
      .replace("{url}", article.url)
      .replace("{publishedAt}", article.publishedAt.toISOString().split("T")[0])
      .replace("{author}", article.author || "不明")
      .replace("{sourceId}", article.sourceId)
      .replace("{content}", truncatedContent);
  }

  /**
   * LLMレスポンスをパース
   */
  private parseResponse(
    responseText: string,
    article: CrawledArticle
  ): UniversalKnowledge {
    // JSONブロックを抽出
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // knowledge_id を生成
    const date = article.publishedAt;
    const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
    const keyword = parsed.suggestedKeyword || this.generateKeyword(parsed.title);
    const sourcePrefix = article.sourceId.toUpperCase().replace(/_/g, "-");
    const knowledgeId = `${sourcePrefix}-${yearMonth}-${keyword}`;

    // Guidelines を正規化
    const guidelines: Guideline[] = (parsed.guidelines || []).map(
      (g: Record<string, string>) => ({
        if: g.if || "",
        then: g.then || "",
        reason: g.reason || "",
      })
    );

    // Context を正規化
    const context: ContextChange[] = (parsed.context || []).map(
      (c: Record<string, string>) => ({
        beforePeriod: c.beforePeriod || "",
        oldPractice: c.oldPractice || "",
        newPractice: c.newPractice || "",
      })
    );

    return {
      knowledgeId,
      knowledgeType: "trends", // 自動収集は常に trends
      category: parsed.suggestedCategory || article.category,
      title: parsed.title || article.title,
      validFrom: article.publishedAt,
      concept: parsed.concept || "",
      guidelines,
      toneAndPhrasing: parsed.toneAndPhrasing || [],
      context,
      sourceUrls: [article.url],
      metadata: {
        author: article.author,
        originalTitle: article.title,
        ...article.metadata,
      },
    };
  }

  /**
   * タイトルからキーワードを生成
   */
  private generateKeyword(title: string): string {
    // 日本語の場合は簡易ローマ字変換
    const normalized = title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, " ")
      .trim()
      .split(/\s+/)
      .slice(0, 3)
      .join("-");

    // 日本語が含まれる場合はランダムID
    if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(normalized)) {
      return `topic-${Date.now().toString(36)}`;
    }

    return normalized || `topic-${Date.now().toString(36)}`;
  }
}

/**
 * 知識をMarkdown形式に変換
 */
export function knowledgeToMarkdown(knowledge: UniversalKnowledge): string {
  const lines: string[] = [];

  lines.push(`# ID: ${knowledge.knowledgeId}`);
  lines.push(`# Title: ${knowledge.title}`);
  lines.push(`# Valid From: ${knowledge.validFrom.toISOString().split("T")[0]}`);
  lines.push("");

  lines.push("## 🧠 Concept (定義)");
  lines.push(knowledge.concept);
  lines.push("");

  lines.push("## 🚦 Guidelines (判断基準 If-Then)");
  for (const g of knowledge.guidelines) {
    lines.push(`- IF: ${g.if}`);
    lines.push(`- THEN: ${g.then}。その理由は ${g.reason} である。`);
    lines.push("");
  }

  lines.push("## 🗣️ Tone & Phrasing (キラーフレーズ)");
  for (const phrase of knowledge.toneAndPhrasing) {
    lines.push(`- ${phrase}`);
  }
  lines.push("");

  lines.push("## ⚠️ Context (文脈・履歴)");
  for (const c of knowledge.context) {
    lines.push(
      `- 以前（${c.beforePeriod}）は ${c.oldPractice} と言われていたが、現在は ${c.newPractice} に変化している。`
    );
  }

  return lines.join("\n");
}
