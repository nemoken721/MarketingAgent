-- 不足しているカラムの追加（20260107）
-- これまでのマイグレーションが適用されていない場合の修正

-- ============================================================================
-- 1. WordPress Builder 基本カラム
-- ============================================================================

-- SSH接続情報
ALTER TABLE public.websites
  ADD COLUMN IF NOT EXISTS server_host TEXT,
  ADD COLUMN IF NOT EXISTS server_user TEXT,
  ADD COLUMN IF NOT EXISTS server_pass_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS server_key_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS server_port INTEGER DEFAULT 22,
  ADD COLUMN IF NOT EXISTS server_auth_method TEXT DEFAULT 'password';

-- 進捗管理フィールド
ALTER TABLE public.websites
  ADD COLUMN IF NOT EXISTS current_step INTEGER DEFAULT 1;

-- エラー情報
ALTER TABLE public.websites
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMP WITH TIME ZONE;

-- SSL証明書情報
ALTER TABLE public.websites
  ADD COLUMN IF NOT EXISTS ssl_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ssl_installed_at TIMESTAMP WITH TIME ZONE;

-- WordPress情報
ALTER TABLE public.websites
  ADD COLUMN IF NOT EXISTS wp_version TEXT,
  ADD COLUMN IF NOT EXISTS wp_theme TEXT DEFAULT 'Lightning',
  ADD COLUMN IF NOT EXISTS wp_plugins TEXT[] DEFAULT ARRAY['vk-all-in-one-expansion-unit', 'vk-blocks'];

-- ============================================================================
-- 2. build_progress カラムの追加
-- ============================================================================

ALTER TABLE public.websites
  ADD COLUMN IF NOT EXISTS build_progress JSONB DEFAULT '{"step": 0, "message": "", "percent": 0, "completed": false}'::jsonb;

-- ============================================================================
-- 3. ssl_progress カラムの追加
-- ============================================================================

ALTER TABLE public.websites
  ADD COLUMN IF NOT EXISTS ssl_progress JSONB DEFAULT '{"step": 0, "message": "", "percent": 0, "completed": false}'::jsonb;

-- ============================================================================
-- 4. ステータスの拡張
-- ============================================================================

-- 既存の制約を削除（エラーを無視）
ALTER TABLE public.websites
  DROP CONSTRAINT IF EXISTS websites_status_check;

-- 新しい制約を追加
DO $$
BEGIN
  ALTER TABLE public.websites
    ADD CONSTRAINT websites_status_check
    CHECK (status IN ('draft', 'dns_wait', 'building', 'ssl_pending', 'active', 'error'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 5. インデックスの追加
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_websites_current_step ON public.websites(current_step);
CREATE INDEX IF NOT EXISTS idx_websites_server_host ON public.websites(server_host);
CREATE INDEX IF NOT EXISTS idx_websites_build_progress ON public.websites USING GIN (build_progress);
CREATE INDEX IF NOT EXISTS idx_websites_ssl_progress ON public.websites USING GIN (ssl_progress);

-- ============================================================================
-- 完了メッセージ
-- ============================================================================
SELECT 'Migration completed successfully!' as result;
