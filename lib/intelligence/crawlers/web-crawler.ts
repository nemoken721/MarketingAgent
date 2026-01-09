/**
 * Marty Intelligence: Web Crawler
 * RSS/サイトマップからの記事取得
 */

import { BaseCrawler } from "./base-crawler";
import type { CrawledArticle, KnowledgeSource, CrawlerConfig } from "../types";

/**
 * Web Crawler
 * RSS フィードまたはサイトマップから記事を取得
 */
export class WebCrawler extends BaseCrawler {
  constructor(source: KnowledgeSource, config?: Partial<CrawlerConfig>) {
    super(source, config);
  }

  /**
   * 記事一覧を取得
   */
  protected async fetchArticles(): Promise<CrawledArticle[]> {
    if (this.source.source_type === "web_rss") {
      return this.fetchFromRss();
    } else if (this.source.source_type === "web_sitemap") {
      return this.fetchFromSitemap();
    }

    throw new Error(`Unsupported source type: ${this.source.source_type}`);
  }

  /**
   * RSSフィードから記事を取得
   */
  private async fetchFromRss(): Promise<CrawledArticle[]> {
    if (!this.source.feed_url) {
      throw new Error("RSS feed URL is not configured");
    }

    const response = await this.fetchWithRetry(this.source.feed_url);
    const xml = await response.text();

    return this.parseRssFeed(xml);
  }

  /**
   * サイトマップから記事を取得
   */
  private async fetchFromSitemap(): Promise<CrawledArticle[]> {
    if (!this.source.feed_url) {
      throw new Error("Sitemap URL is not configured");
    }

    const response = await this.fetchWithRetry(this.source.feed_url);
    const xml = await response.text();

    const urls = this.parseSitemap(xml);

    // 最新20件の記事のみ取得（負荷軽減）
    const recentUrls = urls.slice(0, 20);

    const articles: CrawledArticle[] = [];

    for (const urlInfo of recentUrls) {
      try {
        // レート制限のため間隔を空ける
        await this.sleep(500);

        const article = await this.fetchArticleContent(
          urlInfo.url,
          urlInfo.lastmod
        );
        if (article) {
          articles.push(article);
        }
      } catch (error) {
        console.warn(`[WebCrawler] Failed to fetch ${urlInfo.url}:`, error);
      }
    }

    return articles;
  }

  /**
   * RSSフィードをパース
   */
  private parseRssFeed(xml: string): CrawledArticle[] {
    const articles: CrawledArticle[] = [];

    // RSS 2.0形式
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/gi);

    for (const match of itemMatches) {
      const item = match[1];

      const title = this.extractXmlTag(item, "title");
      const link = this.extractXmlTag(item, "link");
      const description = this.extractXmlTag(item, "description");
      const pubDate =
        this.extractXmlTag(item, "pubDate") ||
        this.extractXmlTag(item, "dc:date");
      const author =
        this.extractXmlTag(item, "author") ||
        this.extractXmlTag(item, "dc:creator");
      const content =
        this.extractXmlTag(item, "content:encoded") || description;

      if (title && link) {
        articles.push({
          url: link,
          title: this.decodeHtmlEntities(title),
          content: content
            ? this.extractTextFromHtml(this.decodeHtmlEntities(content))
            : "",
          publishedAt: pubDate ? this.parseDate(pubDate) : new Date(),
          author: author ? this.decodeHtmlEntities(author) : undefined,
          sourceId: this.source.source_id,
          category: this.source.default_category,
        });
      }
    }

    // Atom形式もサポート
    if (articles.length === 0) {
      const entryMatches = xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi);

      for (const match of entryMatches) {
        const entry = match[1];

        const title = this.extractXmlTag(entry, "title");
        const linkMatch = entry.match(/<link[^>]*href="([^"]+)"/);
        const link = linkMatch ? linkMatch[1] : null;
        const summary = this.extractXmlTag(entry, "summary");
        const content = this.extractXmlTag(entry, "content") || summary;
        const published =
          this.extractXmlTag(entry, "published") ||
          this.extractXmlTag(entry, "updated");
        const authorName = this.extractXmlTag(entry, "name");

        if (title && link) {
          articles.push({
            url: link,
            title: this.decodeHtmlEntities(title),
            content: content
              ? this.extractTextFromHtml(this.decodeHtmlEntities(content))
              : "",
            publishedAt: published ? this.parseDate(published) : new Date(),
            author: authorName
              ? this.decodeHtmlEntities(authorName)
              : undefined,
            sourceId: this.source.source_id,
            category: this.source.default_category,
          });
        }
      }
    }

    return articles;
  }

  /**
   * サイトマップをパース
   */
  private parseSitemap(
    xml: string
  ): Array<{ url: string; lastmod?: Date }> {
    const urls: Array<{ url: string; lastmod?: Date }> = [];

    // サイトマップインデックスの場合
    const sitemapMatches = xml.matchAll(
      /<sitemap>([\s\S]*?)<\/sitemap>/gi
    );
    const sitemapUrls: string[] = [];

    for (const match of sitemapMatches) {
      const loc = this.extractXmlTag(match[1], "loc");
      if (loc) {
        sitemapUrls.push(loc);
      }
    }

    // 通常のサイトマップエントリ
    const urlMatches = xml.matchAll(/<url>([\s\S]*?)<\/url>/gi);

    for (const match of urlMatches) {
      const loc = this.extractXmlTag(match[1], "loc");
      const lastmod = this.extractXmlTag(match[1], "lastmod");

      if (loc) {
        // ブログ記事っぽいURLのみ抽出
        if (this.isArticleUrl(loc)) {
          urls.push({
            url: loc,
            lastmod: lastmod ? this.parseDate(lastmod) : undefined,
          });
        }
      }
    }

    // lastmodで降順ソート
    return urls.sort((a, b) => {
      if (!a.lastmod || !b.lastmod) return 0;
      return b.lastmod.getTime() - a.lastmod.getTime();
    });
  }

  /**
   * 記事URLかどうかを判定
   */
  private isArticleUrl(url: string): boolean {
    // ブログ記事のパターン
    const articlePatterns = [
      /\/blog\//,
      /\/article/,
      /\/post\//,
      /\/news\//,
      /\/\d{4}\/\d{2}\//,
      /\d{4}-\d{2}-\d{2}/,
    ];

    // 除外パターン
    const excludePatterns = [
      /\/tag\//,
      /\/category\//,
      /\/author\//,
      /\/page\/\d+/,
      /\?/,
      /#/,
    ];

    const isArticle = articlePatterns.some((p) => p.test(url));
    const isExcluded = excludePatterns.some((p) => p.test(url));

    return isArticle && !isExcluded;
  }

  /**
   * 個別記事のコンテンツを取得
   */
  private async fetchArticleContent(
    url: string,
    lastmod?: Date
  ): Promise<CrawledArticle | null> {
    try {
      const response = await this.fetchWithRetry(url);
      const html = await response.text();

      // タイトル抽出
      const titleMatch =
        html.match(/<title>([^<]+)<\/title>/i) ||
        html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      const title = titleMatch
        ? this.decodeHtmlEntities(titleMatch[1])
        : "Untitled";

      // 本文抽出（article, main, または .content クラス）
      const articleMatch =
        html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
        html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
        html.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

      const content = articleMatch
        ? this.extractTextFromHtml(articleMatch[1])
        : this.extractTextFromHtml(html).slice(0, 5000);

      // 公開日抽出
      const dateMatch =
        html.match(
          /<meta[^>]*property="article:published_time"[^>]*content="([^"]+)"/i
        ) ||
        html.match(/<time[^>]*datetime="([^"]+)"/i) ||
        html.match(/"datePublished":\s*"([^"]+)"/i);

      const publishedAt = dateMatch
        ? this.parseDate(dateMatch[1])
        : lastmod || new Date();

      // 著者抽出
      const authorMatch =
        html.match(
          /<meta[^>]*name="author"[^>]*content="([^"]+)"/i
        ) ||
        html.match(/"author":\s*{\s*"name":\s*"([^"]+)"/i);

      return {
        url,
        title,
        content,
        publishedAt,
        author: authorMatch ? this.decodeHtmlEntities(authorMatch[1]) : undefined,
        sourceId: this.source.source_id,
        category: this.source.default_category,
      };
    } catch (error) {
      console.warn(`[WebCrawler] Failed to fetch article ${url}:`, error);
      return null;
    }
  }

  /**
   * XMLタグの内容を抽出
   */
  private extractXmlTag(xml: string, tagName: string): string | null {
    const regex = new RegExp(
      `<${tagName}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tagName}>|<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`,
      "i"
    );
    const match = xml.match(regex);
    return match ? (match[1] || match[2])?.trim() || null : null;
  }

  /**
   * HTMLエンティティをデコード
   */
  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ");
  }
}
