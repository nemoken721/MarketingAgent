-- WordPress検出結果保存用カラムの追加
-- 既存のWordPressを検出した結果を保存する

-- ============================================================================
-- 1. wp_detection_result カラムの追加
-- ============================================================================

ALTER TABLE public.websites
  ADD COLUMN IF NOT EXISTS wp_detection_result JSONB DEFAULT NULL;

-- ============================================================================
-- 2. コメント追加（ドキュメント化）
-- ============================================================================

COMMENT ON COLUMN public.websites.wp_detection_result IS 'WordPress検出結果（JSON形式）。例: {"installed": true, "hasWpConfig": true, "hasWpCli": true, "wpVersion": "6.4.2", "siteUrl": "https://example.com", "themes": ["lightning"], "plugins": ["vk-blocks"]}';

-- ============================================================================
-- 3. インデックスの追加（検索高速化）
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_websites_wp_detection ON public.websites USING GIN (wp_detection_result);

-- ============================================================================
-- 4. ステータス拡張（activeの追加確認）
-- ============================================================================

-- 既存の制約を削除してから新しい制約を追加
ALTER TABLE public.websites
  DROP CONSTRAINT IF EXISTS websites_status_check;

DO $$
BEGIN
  ALTER TABLE public.websites
    ADD CONSTRAINT websites_status_check
    CHECK (status IN ('draft', 'dns_wait', 'building', 'ssl_pending', 'ssl_installing', 'active', 'completed', 'error'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 完了メッセージ
-- ============================================================================
SELECT 'WordPress detection migration completed successfully!' as result;
