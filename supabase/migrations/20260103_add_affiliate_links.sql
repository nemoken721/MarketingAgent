-- アフィリエイトリンク管理テーブル
-- サーバープロバイダーのアフィリエイトリンクを管理する

-- ============================================================================
-- 1. affiliate_links テーブルの作成
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name TEXT NOT NULL UNIQUE, -- サーバープロバイダー名（例: "xserver", "conoha-wing"）
  display_name TEXT NOT NULL, -- 表示名（例: "エックスサーバー", "ConoHa WING"）
  affiliate_url TEXT NOT NULL, -- アフィリエイトリンクURL
  description TEXT, -- サーバーの説明
  features TEXT[], -- 特徴（配列形式）
  recommended_plan TEXT, -- おすすめプラン
  price_range TEXT, -- 価格帯（例: "月額990円〜"）
  is_active BOOLEAN DEFAULT true, -- 有効/無効フラグ
  display_order INTEGER DEFAULT 0, -- 表示順序（小さい順に表示）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. インデックスの作成
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_affiliate_links_provider_name ON public.affiliate_links(provider_name);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_is_active ON public.affiliate_links(is_active);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_display_order ON public.affiliate_links(display_order);

-- ============================================================================
-- 3. RLSポリシーの設定
-- ============================================================================

-- RLSを有効化（アフィリエイトリンクは公開情報）
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが読み取り可能（公開情報）
CREATE POLICY "Anyone can view active affiliate links"
  ON public.affiliate_links
  FOR SELECT
  USING (is_active = true);

-- 管理者のみが作成・更新可能（後で管理画面を作る際に使用）
-- 注: サービスロールでの操作は制限されない

-- ============================================================================
-- 4. 初期データの挿入（主要サーバープロバイダー）
-- ============================================================================

INSERT INTO public.affiliate_links (
  provider_name,
  display_name,
  affiliate_url,
  description,
  features,
  recommended_plan,
  price_range,
  display_order
) VALUES
(
  'xserver',
  'エックスサーバー',
  'https://www.xserver.ne.jp/',
  '国内シェアNo.1の高速・安定レンタルサーバー。WordPress自動インストール機能付き。',
  ARRAY['高速SSD', '自動バックアップ', 'WordPress簡単インストール', '無料独自SSL', '電話サポート'],
  'スタンダードプラン',
  '月額990円〜',
  1
),
(
  'conoha-wing',
  'ConoHa WING',
  'https://www.conoha.jp/wing/',
  '国内最速クラスのレンタルサーバー。WordPressかんたんセットアップ機能搭載。',
  ARRAY['国内最速', 'WordPress簡単セットアップ', '無料独自SSL', '自動バックアップ', 'WINGパック割引'],
  'ベーシックプラン',
  '月額643円〜',
  2
),
(
  'lolipop',
  'ロリポップ！',
  'https://lolipop.jp/',
  'コストパフォーマンスに優れたレンタルサーバー。初心者にも使いやすい管理画面。',
  ARRAY['低価格', 'WordPress簡単インストール', '無料独自SSL', '自動バックアップ（有料）', '電話サポート'],
  'ハイスピードプラン',
  '月額550円〜',
  3
),
(
  'sakura',
  'さくらのレンタルサーバ',
  'https://rs.sakura.ad.jp/',
  '老舗の安定したレンタルサーバー。豊富なプランと高い信頼性。',
  ARRAY['安定性', 'WordPress簡単インストール', '無料SSL', '2週間お試し', '電話サポート'],
  'スタンダードプラン',
  '月額425円〜',
  4
),
(
  'mixhost',
  'mixhost',
  'https://mixhost.jp/',
  'アダルトサイトも運営可能なクラウド型レンタルサーバー。高速で柔軟。',
  ARRAY['高速LiteSpeed', 'WordPress簡単インストール', '無料独自SSL', '自動バックアップ', 'アダルト可'],
  'スタンダードプラン',
  '月額968円〜',
  5
);

-- ============================================================================
-- 5. コメント追加（ドキュメント化）
-- ============================================================================

COMMENT ON TABLE public.affiliate_links IS 'アフィリエイトリンク管理テーブル。サーバープロバイダーのアフィリエイトリンク情報を保存。';
COMMENT ON COLUMN public.affiliate_links.provider_name IS 'サーバープロバイダー名（一意識別子、例: xserver, conoha-wing）';
COMMENT ON COLUMN public.affiliate_links.display_name IS '表示名（例: エックスサーバー、ConoHa WING）';
COMMENT ON COLUMN public.affiliate_links.affiliate_url IS 'アフィリエイトリンクURL';
COMMENT ON COLUMN public.affiliate_links.description IS 'サーバーの説明';
COMMENT ON COLUMN public.affiliate_links.features IS '特徴（配列形式）';
COMMENT ON COLUMN public.affiliate_links.recommended_plan IS 'おすすめプラン名';
COMMENT ON COLUMN public.affiliate_links.price_range IS '価格帯（例: 月額990円〜）';
COMMENT ON COLUMN public.affiliate_links.is_active IS '有効/無効フラグ';
COMMENT ON COLUMN public.affiliate_links.display_order IS '表示順序（小さい順に表示）';
