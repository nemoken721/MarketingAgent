/**
 * Marty Intelligence: 型定義
 * RAGシステムのための型定義
 */

// ============================================================
// Knowledge Types
// ============================================================

/** 知識の種類 */
export type KnowledgeType = "core" | "trends";

/** 情報源タイプ */
export type SourceType = "instagram_api" | "web_rss" | "web_sitemap" | "manual";

/** 情報源グループ */
export type SourceGroup = "A" | "B";

/** クロール種別 */
export type CrawlType = "regular" | "emergency" | "manual";

/** クロールステータス */
export type CrawlStatus = "running" | "success" | "failed" | "partial";

// ============================================================
// Universal Knowledge Template
// ============================================================

/**
 * Universal Knowledge Template
 * すべての知識はこの形式に変換される
 */
export interface UniversalKnowledge {
  /** 知識ID: [SOURCE]-[YYYYMM]-[KEYWORD] */
  knowledgeId: string;

  /** 知識の種類 */
  knowledgeType: KnowledgeType;

  /** カテゴリ */
  category: string;

  /** タイトル */
  title: string;

  /** 情報の有効開始日 */
  validFrom: Date;

  /** Concept（定義） */
  concept: string;

  /** Guidelines（If-Then形式の判断基準） */
  guidelines: Guideline[];

  /** Tone & Phrasing（キラーフレーズ） */
  toneAndPhrasing: string[];

  /** Context（文脈・履歴） */
  context: ContextChange[];

  /** 情報源URL */
  sourceUrls: string[];

  /** メタデータ */
  metadata?: Record<string, unknown>;
}

/** If-Then形式のガイドライン */
export interface Guideline {
  /** 条件: ユーザーが [状況A] の時 */
  if: string;
  /** アクション: [アドバイスB] を提案する */
  then: string;
  /** 理由: その理由は [理由C] である */
  reason: string;
}

/** 文脈変化（旧常識→新常識） */
export interface ContextChange {
  /** 変化前の時期 */
  beforePeriod: string;
  /** 旧常識 */
  oldPractice: string;
  /** 新常識 */
  newPractice: string;
}

// ============================================================
// Database Models
// ============================================================

/** knowledge_vectors テーブルの型 */
export interface KnowledgeVector {
  id: string;
  knowledge_id: string;
  knowledge_type: KnowledgeType;
  category: string;
  title: string;
  content: string;
  embedding?: number[];
  source_urls: string[];
  valid_from: string;
  valid_until?: string;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** knowledge_sources テーブルの型 */
export interface KnowledgeSource {
  id: string;
  source_id: string;
  name: string;
  source_type: SourceType;
  url: string;
  feed_url?: string;
  instagram_username?: string;
  source_group: SourceGroup;
  default_category: string;
  is_enabled: boolean;
  last_crawled_at?: string;
  last_crawl_success?: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** crawl_logs テーブルの型 */
export interface CrawlLog {
  id: string;
  crawl_batch_id: string;
  source_id: string;
  crawl_type: CrawlType;
  status: CrawlStatus;
  articles_fetched: number;
  articles_processed: number;
  knowledge_added: number;
  error_message?: string;
  details: Record<string, unknown>;
  started_at: string;
  completed_at?: string;
}

/** trend_reports テーブルの型 */
export interface TrendReport {
  id: string;
  report_month: string;
  title: string;
  content: string;
  highlights: TrendHighlight[];
  new_knowledge_ids: string[];
  updated_knowledge_ids: string[];
  deactivated_knowledge_ids: string[];
  is_published: boolean;
  created_at: string;
}

/** トレンドハイライト */
export interface TrendHighlight {
  category: string;
  title: string;
  summary: string;
  importance: "high" | "medium" | "low";
}

// ============================================================
// Crawler Types
// ============================================================

/** クロール対象の記事 */
export interface CrawledArticle {
  /** 記事URL */
  url: string;
  /** 記事タイトル */
  title: string;
  /** 記事本文 */
  content: string;
  /** 公開日 */
  publishedAt: Date;
  /** 著者（あれば） */
  author?: string;
  /** ソースID */
  sourceId: string;
  /** カテゴリ */
  category: string;
  /** メタデータ */
  metadata?: Record<string, unknown>;
}

/** クロール結果 */
export interface CrawlResult {
  /** ソースID */
  sourceId: string;
  /** 成功フラグ */
  success: boolean;
  /** 取得した記事 */
  articles: CrawledArticle[];
  /** エラー（あれば） */
  error?: string;
  /** クロール時刻 */
  crawledAt: Date;
}

/** 蒸留結果 */
export interface DistillationResult {
  /** 成功フラグ */
  success: boolean;
  /** 蒸留された知識 */
  knowledge?: UniversalKnowledge;
  /** 元記事 */
  sourceArticle: CrawledArticle;
  /** エラー（あれば） */
  error?: string;
}

// ============================================================
// RAG Types
// ============================================================

/** 検索結果 */
export interface SearchResult {
  id: string;
  knowledgeId: string;
  knowledgeType: KnowledgeType;
  category: string;
  title: string;
  content: string;
  validFrom: Date;
  similarity: number;
  priorityScore?: number;
}

/** RAG コンテキスト */
export interface RAGContext {
  /** 検索クエリ */
  query: string;
  /** 取得した知識 */
  retrievedKnowledge: SearchResult[];
  /** Core知識（優先） */
  coreKnowledge: SearchResult[];
  /** Trends知識 */
  trendsKnowledge: SearchResult[];
  /** System Prompt用に整形されたコンテキスト */
  formattedContext: string;
}

// ============================================================
// Config Types
// ============================================================

/** クローラー設定 */
export interface CrawlerConfig {
  /** 同時実行数 */
  concurrency: number;
  /** リトライ回数 */
  retryCount: number;
  /** リトライ間隔（ミリ秒） */
  retryDelay: number;
  /** タイムアウト（ミリ秒） */
  timeout: number;
  /** User Agent */
  userAgent: string;
}

/** 蒸留設定 */
export interface DistillationConfig {
  /** 使用するモデル */
  model: string;
  /** 最大トークン数 */
  maxTokens: number;
  /** 温度 */
  temperature: number;
}

/** RAG設定 */
export interface RAGConfig {
  /** 取得する知識の最大数 */
  maxResults: number;
  /** 類似度の閾値 */
  similarityThreshold: number;
  /** Core知識を常に含めるか */
  alwaysIncludeCore: boolean;
}
