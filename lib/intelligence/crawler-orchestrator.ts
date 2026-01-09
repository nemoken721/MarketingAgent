/**
 * Marty Intelligence: Crawler Orchestrator
 * クロール→蒸留→保存の全体フローを制御
 */

import { createClient } from "@supabase/supabase-js";
import { WebCrawler } from "./crawlers/web-crawler";
import { InstagramCrawler } from "./crawlers/instagram-crawler";
import { KnowledgeDistiller, knowledgeToMarkdown } from "./distiller/knowledge-distiller";
import type {
  KnowledgeSource,
  CrawlResult,
  DistillationResult,
  UniversalKnowledge,
  CrawlType,
  CrawlLog,
  TrendHighlight,
} from "./types";

/** オーケストレーター設定 */
interface OrchestratorConfig {
  /** Supabase URL */
  supabaseUrl: string;
  /** Supabase Service Role Key */
  supabaseServiceKey: string;
  /** Gemini API Key（埋め込み用） */
  geminiApiKey?: string;
  /** 同時クロール数 */
  crawlConcurrency: number;
  /** 同時蒸留数 */
  distillConcurrency: number;
}

/** クロール結果サマリー */
interface CrawlSummary {
  batchId: string;
  crawlType: CrawlType;
  startedAt: Date;
  completedAt: Date;
  sourcesProcessed: number;
  sourcesSucceeded: number;
  sourcesFailed: number;
  articlesFound: number;
  articlesDistilled: number;
  knowledgeAdded: number;
  errors: string[];
}

/**
 * Crawler Orchestrator
 * 月次自動学習システムの中核
 */
export class CrawlerOrchestrator {
  private supabase;
  private distiller: KnowledgeDistiller;
  private config: OrchestratorConfig;

  constructor(config: OrchestratorConfig) {
    this.config = config;
    this.supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
    this.distiller = new KnowledgeDistiller();
  }

  /**
   * 全ソースのクロール実行
   */
  async runFullCrawl(crawlType: CrawlType = "regular"): Promise<CrawlSummary> {
    const batchId = crypto.randomUUID();
    const startedAt = new Date();

    console.log(`[Orchestrator] Starting ${crawlType} crawl (batch: ${batchId})`);

    const summary: CrawlSummary = {
      batchId,
      crawlType,
      startedAt,
      completedAt: new Date(),
      sourcesProcessed: 0,
      sourcesSucceeded: 0,
      sourcesFailed: 0,
      articlesFound: 0,
      articlesDistilled: 0,
      knowledgeAdded: 0,
      errors: [],
    };

    try {
      // 1. 有効なソースを取得
      const sources = await this.getEnabledSources();
      summary.sourcesProcessed = sources.length;

      console.log(`[Orchestrator] Found ${sources.length} enabled sources`);

      // 2. 各ソースをクロール
      const crawlResults: CrawlResult[] = [];

      for (const source of sources) {
        const result = await this.crawlSource(source, batchId, crawlType);
        crawlResults.push(result);

        if (result.success) {
          summary.sourcesSucceeded++;
          summary.articlesFound += result.articles.length;
        } else {
          summary.sourcesFailed++;
          if (result.error) {
            summary.errors.push(`${source.name}: ${result.error}`);
          }
        }

        // ソース間で少し待機
        await this.sleep(500);
      }

      // 3. 記事を蒸留
      const allArticles = crawlResults.flatMap((r) => r.articles);
      console.log(`[Orchestrator] Distilling ${allArticles.length} articles...`);

      const distillResults = await this.distiller.distillBatch(
        allArticles,
        this.config.distillConcurrency
      );

      summary.articlesDistilled = distillResults.filter((r) => r.success).length;

      // 4. 知識をベクトル化して保存
      const successfulKnowledge = distillResults
        .filter((r) => r.success && r.knowledge)
        .map((r) => r.knowledge!);

      for (const knowledge of successfulKnowledge) {
        const saved = await this.saveKnowledge(knowledge);
        if (saved) {
          summary.knowledgeAdded++;
        }
      }

      // 5. ソースの last_crawled_at を更新
      await this.updateSourcesLastCrawled(sources);

      summary.completedAt = new Date();

      console.log(
        `[Orchestrator] Crawl complete: ${summary.sourcesSucceeded}/${summary.sourcesProcessed} sources, ` +
        `${summary.knowledgeAdded} knowledge added`
      );

      return summary;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      summary.errors.push(`Fatal: ${errorMessage}`);
      summary.completedAt = new Date();
      throw error;
    }
  }

  /**
   * 特定ソースのみクロール
   */
  async crawlSource(
    source: KnowledgeSource,
    batchId: string,
    crawlType: CrawlType
  ): Promise<CrawlResult> {
    // クロールログを開始
    const logId = await this.createCrawlLog(batchId, source.source_id, crawlType);

    let crawler;

    // ソースタイプに応じたクローラーを選択
    switch (source.source_type) {
      case "instagram_api":
        crawler = new InstagramCrawler(source);
        break;
      case "web_rss":
      case "web_sitemap":
        crawler = new WebCrawler(source);
        break;
      default:
        console.warn(`[Orchestrator] Unsupported source type: ${source.source_type}`);
        return {
          sourceId: source.source_id,
          success: false,
          articles: [],
          error: `Unsupported source type: ${source.source_type}`,
          crawledAt: new Date(),
        };
    }

    // クロール実行
    const result = await crawler.crawl();

    // クロールログを更新
    await this.updateCrawlLog(logId, result);

    return result;
  }

  /**
   * 知識をベクトル化して保存
   */
  async saveKnowledge(knowledge: UniversalKnowledge): Promise<boolean> {
    try {
      // Markdown形式に変換
      const content = knowledgeToMarkdown(knowledge);

      // ベクトル埋め込みを生成
      const embedding = await this.generateEmbedding(content);

      // DBに保存
      const { error } = await this.supabase.from("knowledge_vectors").upsert(
        {
          knowledge_id: knowledge.knowledgeId,
          knowledge_type: knowledge.knowledgeType,
          category: knowledge.category,
          title: knowledge.title,
          content,
          embedding,
          source_urls: knowledge.sourceUrls,
          valid_from: knowledge.validFrom.toISOString().split("T")[0],
          is_active: true,
          metadata: knowledge.metadata,
        },
        { onConflict: "knowledge_id" }
      );

      if (error) {
        console.error(`[Orchestrator] Failed to save knowledge:`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`[Orchestrator] Error saving knowledge:`, error);
      return false;
    }
  }

  /**
   * テキストをベクトル埋め込みに変換（Gemini text-embedding-004）
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const geminiKey = this.config.geminiApiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!geminiKey) {
      console.warn("[Orchestrator] GOOGLE_GENERATIVE_AI_API_KEY not set, skipping embedding");
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
              parts: [{ text: text.slice(0, 8000) }], // 8000文字に制限
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
      console.error("[Orchestrator] Embedding generation failed:", error);
      return [];
    }
  }

  /**
   * 有効なソースを取得
   */
  private async getEnabledSources(): Promise<KnowledgeSource[]> {
    const { data, error } = await this.supabase
      .from("knowledge_sources")
      .select("*")
      .eq("is_enabled", true);

    if (error) {
      throw new Error(`Failed to fetch sources: ${error.message}`);
    }

    return data as KnowledgeSource[];
  }

  /**
   * ソースの last_crawled_at を更新
   */
  private async updateSourcesLastCrawled(sources: KnowledgeSource[]): Promise<void> {
    const now = new Date().toISOString();

    for (const source of sources) {
      await this.supabase
        .from("knowledge_sources")
        .update({ last_crawled_at: now, last_crawl_success: true })
        .eq("source_id", source.source_id);
    }
  }

  /**
   * クロールログを作成
   */
  private async createCrawlLog(
    batchId: string,
    sourceId: string,
    crawlType: CrawlType
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from("crawl_logs")
      .insert({
        crawl_batch_id: batchId,
        source_id: sourceId,
        crawl_type: crawlType,
        status: "running",
      })
      .select("id")
      .single();

    if (error) {
      console.error("[Orchestrator] Failed to create crawl log:", error);
      return "";
    }

    return data.id;
  }

  /**
   * クロールログを更新
   */
  private async updateCrawlLog(logId: string, result: CrawlResult): Promise<void> {
    if (!logId) return;

    await this.supabase
      .from("crawl_logs")
      .update({
        status: result.success ? "success" : "failed",
        articles_fetched: result.articles.length,
        error_message: result.error,
        completed_at: new Date().toISOString(),
      })
      .eq("id", logId);
  }

  /**
   * 月次レポートを生成
   */
  async generateMonthlyReport(yearMonth: string): Promise<void> {
    console.log(`[Orchestrator] Generating report for ${yearMonth}...`);

    // 今月追加された知識を取得
    const { data: newKnowledge } = await this.supabase
      .from("knowledge_vectors")
      .select("knowledge_id, title, category")
      .gte("created_at", `${yearMonth}-01`)
      .lt("created_at", this.getNextMonth(yearMonth));

    // ハイライトを生成（カテゴリ別にグループ化）
    const highlights: TrendHighlight[] = [];
    const categoryGroups = this.groupByCategory(newKnowledge || []);

    for (const [category, items] of Object.entries(categoryGroups)) {
      highlights.push({
        category,
        title: `${category}の新着情報: ${items.length}件`,
        summary: items.map((i) => i.title).join(", "),
        importance: items.length >= 5 ? "high" : items.length >= 2 ? "medium" : "low",
      });
    }

    // レポートを保存
    await this.supabase.from("trend_reports").upsert(
      {
        report_month: yearMonth,
        title: `${yearMonth} マーケティングトレンドレポート`,
        content: this.formatReportContent(highlights, newKnowledge || []),
        highlights,
        new_knowledge_ids: (newKnowledge || []).map((k: { knowledge_id: string }) => k.knowledge_id),
        is_published: false,
      },
      { onConflict: "report_month" }
    );

    console.log(`[Orchestrator] Report generated for ${yearMonth}`);
  }

  /**
   * カテゴリ別にグループ化
   */
  private groupByCategory<T extends { category: string }>(items: T[]): Record<string, T[]> {
    return items.reduce((acc, item) => {
      const category = item.category || "other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<string, T[]>);
  }

  /**
   * レポートコンテンツをフォーマット
   */
  private formatReportContent(
    highlights: TrendHighlight[],
    knowledge: Array<{ knowledge_id: string; title: string; category: string }>
  ): string {
    const lines: string[] = [];

    lines.push("# 今月のハイライト\n");
    for (const h of highlights) {
      const icon = h.importance === "high" ? "🔥" : h.importance === "medium" ? "📌" : "📝";
      lines.push(`${icon} **${h.title}**`);
      lines.push(h.summary);
      lines.push("");
    }

    lines.push("# 新着知識一覧\n");
    for (const k of knowledge) {
      lines.push(`- [${k.category}] ${k.title}`);
    }

    return lines.join("\n");
  }

  /**
   * 翌月を取得
   */
  private getNextMonth(yearMonth: string): string {
    const [year, month] = yearMonth.split("-").map(Number);
    if (month === 12) {
      return `${year + 1}-01`;
    }
    return `${year}-${String(month + 1).padStart(2, "0")}`;
  }

  /**
   * スリープ
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * デフォルトのオーケストレーターを作成
 */
export function createOrchestrator(): CrawlerOrchestrator {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase credentials not configured");
  }

  return new CrawlerOrchestrator({
    supabaseUrl,
    supabaseServiceKey,
    crawlConcurrency: 3,
    distillConcurrency: 2,
  });
}
