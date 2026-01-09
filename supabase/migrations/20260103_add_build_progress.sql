-- WordPress構築進捗管理の追加
-- 構築中のリアルタイム進捗を表示するためのカラム

-- ============================================================================
-- 1. build_progress カラムの追加
-- ============================================================================

ALTER TABLE public.websites
  ADD COLUMN IF NOT EXISTS build_progress JSONB DEFAULT '{"step": 0, "message": "", "percent": 0}'::jsonb;

-- ============================================================================
-- 2. インデックスの追加
-- ============================================================================

-- build_progressの検索を高速化（GINインデックス）
CREATE INDEX IF NOT EXISTS idx_websites_build_progress ON public.websites USING GIN (build_progress);

-- ============================================================================
-- 3. コメント追加（ドキュメント化）
-- ============================================================================

COMMENT ON COLUMN public.websites.build_progress IS 'WordPress構築進捗（JSON形式）。例: {"step": 1, "message": "WP-CLIインストール中...", "percent": 20, "completed": false}';
