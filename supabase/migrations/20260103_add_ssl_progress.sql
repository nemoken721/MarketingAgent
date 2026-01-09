-- SSL証明書設定進捗管理の追加
-- SSL証明書インストール中のリアルタイム進捗を表示するためのカラム

-- ============================================================================
-- 1. ssl_progress カラムの追加
-- ============================================================================

ALTER TABLE public.websites
  ADD COLUMN IF NOT EXISTS ssl_progress JSONB DEFAULT '{"step": 0, "message": "", "percent": 0}'::jsonb;

-- ============================================================================
-- 2. インデックスの追加
-- ============================================================================

-- ssl_progressの検索を高速化（GINインデックス）
CREATE INDEX IF NOT EXISTS idx_websites_ssl_progress ON public.websites USING GIN (ssl_progress);

-- ============================================================================
-- 3. コメント追加（ドキュメント化）
-- ============================================================================

COMMENT ON COLUMN public.websites.ssl_progress IS 'SSL証明書設定進捗（JSON形式）。例: {"step": 1, "message": "DNS伝播確認中...", "percent": 20, "completed": false}';
