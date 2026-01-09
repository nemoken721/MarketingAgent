-- ============================================================
-- Marty Intelligence: Knowledge Base Schema
-- RAGシステムのためのベクトルデータベース設計
-- ============================================================

-- pgvector拡張を有効化（まだの場合）
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 1. knowledge_vectors: 知識ベクトルテーブル（メイン）
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 知識ID（例: CORE-202601-fanbase, INSTAGRAM-202601-reels-algorithm）
  knowledge_id TEXT UNIQUE NOT NULL,

  -- 知識の種類: 'core'（憲法/不変）または 'trends'（時流/可変）
  knowledge_type TEXT NOT NULL CHECK (knowledge_type IN ('core', 'trends')),

  -- カテゴリ（例: instagram, seo, marketing, design）
  category TEXT NOT NULL,

  -- 知識タイトル
  title TEXT NOT NULL,

  -- テンプレート化された知識本文（Universal Knowledge Template形式）
  content TEXT NOT NULL,

  -- ベクトル埋め込み（OpenAI text-embedding-3-small: 1536次元）
  embedding vector(1536),

  -- 情報源URL（複数可、JSON配列）
  source_urls JSONB DEFAULT '[]'::jsonb,

  -- 情報の有効開始日（鮮度管理）
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,

  -- 情報の有効終了日（NULLの場合は現在も有効）
  valid_until DATE,

  -- アクティブフラグ（古い情報は FALSE にする）
  is_active BOOLEAN DEFAULT TRUE,

  -- メタデータ（追加情報用）
  metadata JSONB DEFAULT '{}'::jsonb,

  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_knowledge_vectors_embedding
  ON knowledge_vectors USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_knowledge_vectors_type ON knowledge_vectors(knowledge_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_vectors_category ON knowledge_vectors(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_vectors_active ON knowledge_vectors(is_active);
CREATE INDEX IF NOT EXISTS idx_knowledge_vectors_valid_from ON knowledge_vectors(valid_from DESC);

-- ============================================================
-- 2. knowledge_sources: 情報源マスタ
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ソース識別子（例: instagram_creators, meta_newsroom）
  source_id TEXT UNIQUE NOT NULL,

  -- ソース名
  name TEXT NOT NULL,

  -- ソースタイプ: 'instagram_api', 'web_rss', 'web_sitemap', 'manual'
  source_type TEXT NOT NULL CHECK (source_type IN ('instagram_api', 'web_rss', 'web_sitemap', 'manual')),

  -- ソースURL/エンドポイント
  url TEXT NOT NULL,

  -- RSS/サイトマップURL（Web系の場合）
  feed_url TEXT,

  -- Instagram アカウント名（Instagram系の場合）
  instagram_username TEXT,

  -- グループ分類: 'A'（公式）, 'B'（Webメディア）
  source_group TEXT NOT NULL CHECK (source_group IN ('A', 'B')),

  -- デフォルトカテゴリ
  default_category TEXT NOT NULL DEFAULT 'general',

  -- クロール有効フラグ
  is_enabled BOOLEAN DEFAULT TRUE,

  -- 前回クロール日時
  last_crawled_at TIMESTAMPTZ,

  -- 前回クロール成功フラグ
  last_crawl_success BOOLEAN,

  -- メタデータ
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. crawl_logs: クロールログ
-- ============================================================
CREATE TABLE IF NOT EXISTS crawl_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- クロール実行ID（同一バッチのログをグループ化）
  crawl_batch_id UUID NOT NULL,

  -- 対象ソース
  source_id TEXT REFERENCES knowledge_sources(source_id),

  -- クロール種別: 'regular'（定期）, 'emergency'（緊急）, 'manual'（手動）
  crawl_type TEXT NOT NULL CHECK (crawl_type IN ('regular', 'emergency', 'manual')),

  -- ステータス: 'running', 'success', 'failed', 'partial'
  status TEXT NOT NULL DEFAULT 'running',

  -- 取得した記事数
  articles_fetched INTEGER DEFAULT 0,

  -- 処理した記事数
  articles_processed INTEGER DEFAULT 0,

  -- 新規追加した知識数
  knowledge_added INTEGER DEFAULT 0,

  -- エラーメッセージ
  error_message TEXT,

  -- 詳細ログ（JSON）
  details JSONB DEFAULT '{}'::jsonb,

  -- 開始・終了時刻
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_crawl_logs_batch ON crawl_logs(crawl_batch_id);
CREATE INDEX IF NOT EXISTS idx_crawl_logs_source ON crawl_logs(source_id);
CREATE INDEX IF NOT EXISTS idx_crawl_logs_started ON crawl_logs(started_at DESC);

-- ============================================================
-- 4. trend_reports: 月次トレンドレポート
-- ============================================================
CREATE TABLE IF NOT EXISTS trend_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- レポート対象年月（例: 2026-01）
  report_month TEXT NOT NULL,

  -- レポートタイトル
  title TEXT NOT NULL,

  -- レポート本文（Markdown形式）
  content TEXT NOT NULL,

  -- 今月の重要変更点（JSON配列）
  highlights JSONB DEFAULT '[]'::jsonb,

  -- 新規追加された知識のID一覧
  new_knowledge_ids JSONB DEFAULT '[]'::jsonb,

  -- 更新された知識のID一覧
  updated_knowledge_ids JSONB DEFAULT '[]'::jsonb,

  -- 非アクティブ化された知識のID一覧
  deactivated_knowledge_ids JSONB DEFAULT '[]'::jsonb,

  -- 公開フラグ（ユーザーに通知済みか）
  is_published BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_trend_reports_month ON trend_reports(report_month);

-- ============================================================
-- 5. 初期データ: 信頼できるソース10件
-- ============================================================
INSERT INTO knowledge_sources (source_id, name, source_type, url, feed_url, instagram_username, source_group, default_category)
VALUES
  -- Group A: Instagram公式（API経由）
  ('instagram_creators', 'Instagram @creators', 'instagram_api', 'https://www.instagram.com/creators/', NULL, 'creators', 'A', 'instagram'),
  ('instagram_mosseri', 'Adam Mosseri', 'instagram_api', 'https://www.instagram.com/mosseri/', NULL, 'mosseri', 'A', 'instagram'),

  -- Group B: 権威あるWebメディア
  ('meta_newsroom', 'Meta Newsroom', 'web_rss', 'https://about.fb.com/news/', 'https://about.fb.com/news/feed/', NULL, 'B', 'meta'),
  ('socialmediatoday', 'Social Media Today', 'web_rss', 'https://www.socialmediatoday.com/', 'https://www.socialmediatoday.com/rss.xml', NULL, 'B', 'social'),
  ('later_blog', 'Later Blog', 'web_sitemap', 'https://later.com/blog/', 'https://later.com/blog/sitemap.xml', NULL, 'B', 'instagram'),
  ('hootsuite_blog', 'Hootsuite Blog', 'web_rss', 'https://blog.hootsuite.com/', 'https://blog.hootsuite.com/feed/', NULL, 'B', 'social'),
  ('gaiax_sociallab', 'Gaiax Social Media Lab', 'web_sitemap', 'https://gaiax-socialmedialab.jp/', 'https://gaiax-socialmedialab.jp/sitemap.xml', NULL, 'B', 'social'),
  ('webtan', 'Web担当者Forum', 'web_rss', 'https://webtan.impress.co.jp/', 'https://webtan.impress.co.jp/feed', NULL, 'B', 'marketing'),
  ('ferret', 'ferret', 'web_sitemap', 'https://ferret-plus.com/', 'https://ferret-plus.com/sitemap.xml', NULL, 'B', 'marketing'),
  ('searchenginejournal', 'Search Engine Journal', 'web_rss', 'https://www.searchenginejournal.com/', 'https://www.searchenginejournal.com/feed/', NULL, 'B', 'seo')
ON CONFLICT (source_id) DO NOTHING;

-- ============================================================
-- 6. ベクトル類似度検索関数
-- ============================================================
CREATE OR REPLACE FUNCTION search_knowledge(
  query_embedding vector(1536),
  match_count INT DEFAULT 5,
  filter_category TEXT DEFAULT NULL,
  filter_type TEXT DEFAULT NULL,
  include_inactive BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  knowledge_id TEXT,
  knowledge_type TEXT,
  category TEXT,
  title TEXT,
  content TEXT,
  valid_from DATE,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kv.id,
    kv.knowledge_id,
    kv.knowledge_type,
    kv.category,
    kv.title,
    kv.content,
    kv.valid_from,
    1 - (kv.embedding <=> query_embedding) as similarity
  FROM knowledge_vectors kv
  WHERE
    (include_inactive OR kv.is_active = TRUE)
    AND (filter_category IS NULL OR kv.category = filter_category)
    AND (filter_type IS NULL OR kv.knowledge_type = filter_type)
    AND kv.embedding IS NOT NULL
  ORDER BY kv.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================
-- 7. 知識の優先度付き検索関数（Time Machine Filter対応）
-- 同じトピックで新旧の知識がある場合、新しいものを優先
-- ============================================================
CREATE OR REPLACE FUNCTION search_knowledge_with_priority(
  query_embedding vector(1536),
  match_count INT DEFAULT 5,
  filter_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  knowledge_id TEXT,
  knowledge_type TEXT,
  category TEXT,
  title TEXT,
  content TEXT,
  valid_from DATE,
  similarity FLOAT,
  priority_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH ranked_knowledge AS (
    SELECT
      kv.id,
      kv.knowledge_id,
      kv.knowledge_type,
      kv.category,
      kv.title,
      kv.content,
      kv.valid_from,
      1 - (kv.embedding <=> query_embedding) as similarity,
      -- Core知識は常に高優先度、Trendsは新しいほど高優先度
      CASE
        WHEN kv.knowledge_type = 'core' THEN 1000
        ELSE EXTRACT(EPOCH FROM (kv.valid_from::timestamp - '2020-01-01'::timestamp)) / 86400
      END as recency_score
    FROM knowledge_vectors kv
    WHERE
      kv.is_active = TRUE
      AND (filter_category IS NULL OR kv.category = filter_category)
      AND kv.embedding IS NOT NULL
  )
  SELECT
    rk.id,
    rk.knowledge_id,
    rk.knowledge_type,
    rk.category,
    rk.title,
    rk.content,
    rk.valid_from,
    rk.similarity,
    -- 最終スコア = 類似度 * 0.7 + 優先度 * 0.3
    (rk.similarity * 0.7 + (rk.recency_score / 2000) * 0.3) as priority_score
  FROM ranked_knowledge rk
  ORDER BY
    -- Core知識を常に上位に
    CASE WHEN rk.knowledge_type = 'core' THEN 0 ELSE 1 END,
    priority_score DESC
  LIMIT match_count;
END;
$$;

-- ============================================================
-- 8. RLSポリシー（Row Level Security）
-- ============================================================
ALTER TABLE knowledge_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_reports ENABLE ROW LEVEL SECURITY;

-- Service Role用（フルアクセス）
CREATE POLICY "Service role full access on knowledge_vectors"
  ON knowledge_vectors FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on knowledge_sources"
  ON knowledge_sources FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on crawl_logs"
  ON crawl_logs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on trend_reports"
  ON trend_reports FOR ALL
  USING (auth.role() = 'service_role');

-- 認証済みユーザーは読み取りのみ（knowledge_vectors, trend_reports）
CREATE POLICY "Authenticated users can read knowledge"
  ON knowledge_vectors FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = TRUE);

CREATE POLICY "Authenticated users can read published reports"
  ON trend_reports FOR SELECT
  USING (auth.role() = 'authenticated' AND is_published = TRUE);

-- ============================================================
-- 9. Updated_at トリガー
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_knowledge_vectors_updated_at
  BEFORE UPDATE ON knowledge_vectors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_sources_updated_at
  BEFORE UPDATE ON knowledge_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 完了メッセージ
-- ============================================================
COMMENT ON TABLE knowledge_vectors IS 'Marty Intelligence: RAGシステムの知識ベクトルテーブル';
COMMENT ON TABLE knowledge_sources IS 'Marty Intelligence: 信頼できる情報源のマスタ';
COMMENT ON TABLE crawl_logs IS 'Marty Intelligence: クローラー実行ログ';
COMMENT ON TABLE trend_reports IS 'Marty Intelligence: 月次トレンドレポート';
