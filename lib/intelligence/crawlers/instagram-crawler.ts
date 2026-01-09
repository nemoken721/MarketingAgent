/**
 * Marty Intelligence: Instagram API Crawler
 * Instagram Graph API (ig_business_discovery) を使用してキャプションを取得
 */

import { BaseCrawler } from "./base-crawler";
import type { CrawledArticle, KnowledgeSource, CrawlerConfig } from "../types";

/** Instagram メディアの型 */
interface InstagramMedia {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  permalink: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
}

/** Instagram API レスポンスの型 */
interface InstagramBusinessDiscoveryResponse {
  business_discovery: {
    id: string;
    username: string;
    name: string;
    media: {
      data: InstagramMedia[];
      paging?: {
        cursors: {
          before: string;
          after: string;
        };
        next?: string;
      };
    };
  };
}

/**
 * Instagram Crawler
 * Instagram Graph API の ig_business_discovery を使用
 * Bot対策を回避しつつ、公式アカウントのキャプションを取得
 */
export class InstagramCrawler extends BaseCrawler {
  private accessToken: string;
  private businessAccountId: string;

  constructor(
    source: KnowledgeSource,
    config?: Partial<CrawlerConfig>,
    accessToken?: string,
    businessAccountId?: string
  ) {
    super(source, config);

    // 環境変数から取得（未指定の場合）
    this.accessToken = accessToken || process.env.INSTAGRAM_ACCESS_TOKEN || "";
    this.businessAccountId =
      businessAccountId ||
      process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ||
      "";

    if (!this.accessToken || !this.businessAccountId) {
      console.warn(
        "[InstagramCrawler] Missing INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_BUSINESS_ACCOUNT_ID"
      );
    }
  }

  /**
   * 記事（投稿キャプション）を取得
   */
  protected async fetchArticles(): Promise<CrawledArticle[]> {
    if (!this.accessToken || !this.businessAccountId) {
      console.warn(
        "[InstagramCrawler] Skipping - Instagram API credentials not configured"
      );
      return [];
    }

    if (!this.source.instagram_username) {
      throw new Error("Instagram username is not configured");
    }

    const username = this.source.instagram_username;
    const articles: CrawledArticle[] = [];

    try {
      // ig_business_discovery API を使用
      const fields = [
        "id",
        "caption",
        "media_type",
        "permalink",
        "timestamp",
        "like_count",
        "comments_count",
      ].join(",");

      const url = new URL(
        `https://graph.facebook.com/v18.0/${this.businessAccountId}`
      );
      url.searchParams.set(
        "fields",
        `business_discovery.username(${username}){media.limit(25){${fields}}}`
      );
      url.searchParams.set("access_token", this.accessToken);

      const response = await this.fetchWithRetry(url.toString());
      const data: InstagramBusinessDiscoveryResponse = await response.json();

      if (!data.business_discovery?.media?.data) {
        console.warn(`[InstagramCrawler] No media found for @${username}`);
        return [];
      }

      for (const media of data.business_discovery.media.data) {
        // キャプションがない投稿はスキップ
        if (!media.caption || media.caption.length < 50) {
          continue;
        }

        // 情報価値の高い投稿のみ抽出（キーワードフィルタ）
        if (!this.isInformativePost(media.caption)) {
          continue;
        }

        articles.push({
          url: media.permalink,
          title: this.extractTitle(media.caption),
          content: media.caption,
          publishedAt: new Date(media.timestamp),
          author: `@${username}`,
          sourceId: this.source.source_id,
          category: this.source.default_category,
          metadata: {
            mediaType: media.media_type,
            likeCount: media.like_count,
            commentsCount: media.comments_count,
            mediaId: media.id,
          },
        });
      }

      console.log(
        `[InstagramCrawler] @${username}: Found ${articles.length} informative posts`
      );

      return articles;
    } catch (error) {
      // API エラーの詳細をログ
      if (error instanceof Error) {
        console.error(
          `[InstagramCrawler] API error for @${username}:`,
          error.message
        );
      }
      throw error;
    }
  }

  /**
   * 情報価値の高い投稿かどうかを判定
   */
  private isInformativePost(caption: string): boolean {
    // 情報価値のあるキーワード
    const informativeKeywords = [
      // アルゴリズム・機能関連
      "algorithm",
      "アルゴリズム",
      "update",
      "アップデート",
      "new feature",
      "新機能",
      "tip",
      "tips",
      "ヒント",
      "advice",
      "アドバイス",
      // エンゲージメント関連
      "engagement",
      "エンゲージメント",
      "reach",
      "リーチ",
      "followers",
      "フォロワー",
      // コンテンツ関連
      "reels",
      "リール",
      "stories",
      "ストーリー",
      "carousel",
      "カルーセル",
      "content",
      "コンテンツ",
      // ビジネス関連
      "creator",
      "クリエイター",
      "business",
      "ビジネス",
      "brand",
      "ブランド",
      "monetize",
      "収益化",
      // 変更・発表
      "announcement",
      "発表",
      "change",
      "変更",
      "launch",
      "ローンチ",
      "rolling out",
      "展開",
    ];

    const lowerCaption = caption.toLowerCase();
    return informativeKeywords.some(
      (keyword) =>
        lowerCaption.includes(keyword.toLowerCase())
    );
  }

  /**
   * キャプションからタイトルを抽出
   */
  private extractTitle(caption: string): string {
    // 最初の1行または最初の100文字をタイトルとして使用
    const firstLine = caption.split("\n")[0];

    if (firstLine.length <= 100) {
      return firstLine;
    }

    // 100文字で切り詰め
    return firstLine.slice(0, 97) + "...";
  }
}

/**
 * Instagram API 認証情報の検証
 */
export async function validateInstagramCredentials(
  accessToken: string,
  businessAccountId: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const url = new URL(
      `https://graph.facebook.com/v18.0/${businessAccountId}`
    );
    url.searchParams.set("fields", "id,name");
    url.searchParams.set("access_token", accessToken);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.error) {
      return { valid: false, error: data.error.message };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
