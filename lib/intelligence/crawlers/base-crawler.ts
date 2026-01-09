/**
 * Marty Intelligence: Base Crawler
 * すべてのクローラーの基底クラス
 */

import type {
  KnowledgeSource,
  CrawledArticle,
  CrawlResult,
  CrawlerConfig,
} from "../types";

/** デフォルト設定 */
const DEFAULT_CONFIG: CrawlerConfig = {
  concurrency: 3,
  retryCount: 3,
  retryDelay: 1000,
  timeout: 30000,
  userAgent:
    "Marty Intelligence Bot/1.0 (+https://marty.example.com/bot; Educational Purpose)",
};

/**
 * 基底クローラークラス
 * すべてのクローラーはこのクラスを継承する
 */
export abstract class BaseCrawler {
  protected source: KnowledgeSource;
  protected config: CrawlerConfig;
  protected lastCrawledAt: Date | null;

  constructor(source: KnowledgeSource, config?: Partial<CrawlerConfig>) {
    this.source = source;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.lastCrawledAt = source.last_crawled_at
      ? new Date(source.last_crawled_at)
      : null;
  }

  /**
   * クロール実行（テンプレートメソッド）
   * 子クラスで fetchArticles() を実装する
   */
  async crawl(): Promise<CrawlResult> {
    const startTime = Date.now();
    console.log(`[Crawler] Starting crawl for ${this.source.name}...`);

    try {
      // 1. 記事一覧を取得
      const articles = await this.fetchArticles();

      // 2. 前回クロール日以降の記事のみフィルタ
      const newArticles = this.filterNewArticles(articles);

      console.log(
        `[Crawler] ${this.source.name}: Found ${articles.length} articles, ${newArticles.length} new since last crawl`
      );

      return {
        sourceId: this.source.source_id,
        success: true,
        articles: newArticles,
        crawledAt: new Date(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`[Crawler] ${this.source.name} failed:`, errorMessage);

      return {
        sourceId: this.source.source_id,
        success: false,
        articles: [],
        error: errorMessage,
        crawledAt: new Date(),
      };
    } finally {
      const duration = Date.now() - startTime;
      console.log(`[Crawler] ${this.source.name} completed in ${duration}ms`);
    }
  }

  /**
   * 記事一覧を取得（子クラスで実装）
   */
  protected abstract fetchArticles(): Promise<CrawledArticle[]>;

  /**
   * 前回クロール日以降の記事をフィルタ
   */
  protected filterNewArticles(articles: CrawledArticle[]): CrawledArticle[] {
    if (!this.lastCrawledAt) {
      // 初回クロールの場合は直近30日分
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return articles.filter((a) => a.publishedAt >= thirtyDaysAgo);
    }

    return articles.filter((a) => a.publishedAt > this.lastCrawledAt!);
  }

  /**
   * HTTPリクエスト（リトライ付き）
   */
  protected async fetchWithRetry(
    url: string,
    options?: RequestInit
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retryCount; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.config.timeout
        );

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            "User-Agent": this.config.userAgent,
            ...options?.headers,
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(
          `[Crawler] Attempt ${attempt + 1}/${this.config.retryCount} failed for ${url}:`,
          lastError.message
        );

        if (attempt < this.config.retryCount - 1) {
          await this.sleep(this.config.retryDelay * (attempt + 1));
        }
      }
    }

    throw lastError || new Error("All retry attempts failed");
  }

  /**
   * スリープ
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * HTMLからテキストを抽出（簡易版）
   */
  protected extractTextFromHtml(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * 日付文字列をパース
   */
  protected parseDate(dateString: string): Date {
    const parsed = new Date(dateString);
    if (isNaN(parsed.getTime())) {
      return new Date(); // パース失敗時は現在時刻
    }
    return parsed;
  }
}
