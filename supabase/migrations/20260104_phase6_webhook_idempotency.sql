-- ============================================================================
-- Marty Database Schema Migration - Phase 6
-- Webhook Idempotency (重複処理防止)
-- ============================================================================

-- ============================================================================
-- 1. stripe_events テーブルの作成
-- ============================================================================
-- Stripe Webhook イベントの重複処理を防止するための idempotency テーブル

CREATE TABLE IF NOT EXISTS public.stripe_events (
  id TEXT PRIMARY KEY, -- Stripe Event ID (evt_xxx)
  type TEXT NOT NULL, -- イベントタイプ (checkout.session.completed, etc.)
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  payload JSONB, -- イベントの詳細データ（デバッグ用、オプション）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- インデックス作成
CREATE INDEX idx_stripe_events_type ON public.stripe_events(type);
CREATE INDEX idx_stripe_events_created_at ON public.stripe_events(created_at DESC);

-- RLS 有効化（管理者のみアクセス可能）
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

-- 管理者ポリシー（サービスロールのみアクセス可能）
CREATE POLICY "Service role can manage stripe events"
  ON public.stripe_events
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 2. webhook_logs テーブルの作成（監視・デバッグ用）
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL CHECK (source IN ('stripe', 'instagram', 'x', 'other')),
  event_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- インデックス作成
CREATE INDEX idx_webhook_logs_source ON public.webhook_logs(source);
CREATE INDEX idx_webhook_logs_status ON public.webhook_logs(status);
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);

-- RLS 有効化
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- 管理者ポリシー
CREATE POLICY "Service role can manage webhook logs"
  ON public.webhook_logs
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 3. 古いイベントログの自動削除関数（パフォーマンス維持）
-- ============================================================================

-- 30日以上前のログを削除する関数
CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.webhook_logs
  WHERE created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;

-- stripe_events も同様に古いイベントを削除
CREATE OR REPLACE FUNCTION public.cleanup_old_stripe_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.stripe_events
  WHERE created_at < NOW() - INTERVAL '90 days'; -- Stripeイベントは90日保持

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;

-- ============================================================================
-- 4. コメント追加（ドキュメント化）
-- ============================================================================

COMMENT ON TABLE public.stripe_events IS 'Stripe Webhookイベントの重複処理防止用テーブル';
COMMENT ON COLUMN public.stripe_events.id IS 'Stripe Event ID (evt_xxx)';
COMMENT ON COLUMN public.stripe_events.processed_at IS 'イベント処理完了時刻';

COMMENT ON TABLE public.webhook_logs IS 'すべてのWebhookイベントのログ（監視・デバッグ用）';
COMMENT ON FUNCTION public.cleanup_old_webhook_logs IS '30日以上前のWebhookログを削除';
COMMENT ON FUNCTION public.cleanup_old_stripe_events IS '90日以上前のStripeイベントを削除';
