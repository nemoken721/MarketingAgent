-- WordPress Builder Extension Migration
-- WordPress構築機能のためのテーブル拡張
-- Based on WordPress構築マスタ要件定義書 v2.1

-- ============================================================================
-- 1. websites テーブルの拡張
-- ============================================================================

-- SSH接続情報の追加
ALTER TABLE public.websites
  ADD COLUMN IF NOT EXISTS server_host TEXT,
  ADD COLUMN IF NOT EXISTS server_user TEXT,
  ADD COLUMN IF NOT EXISTS server_pass_encrypted TEXT, -- AES-256暗号化
  ADD COLUMN IF NOT EXISTS server_port INTEGER DEFAULT 22;

-- 進捗管理フィールドの追加
ALTER TABLE public.websites
  ADD COLUMN IF NOT EXISTS current_step INTEGER DEFAULT 1 CHECK (current_step BETWEEN 1 AND 4);

-- ステータスの拡張（既存の制約を削除して再作成）
ALTER TABLE public.websites
  DROP CONSTRAINT IF EXISTS websites_status_check;

ALTER TABLE public.websites
  ADD CONSTRAINT websites_status_check
  CHECK (status IN ('draft', 'dns_wait', 'building', 'ssl_pending', 'active', 'error'));

-- エラー情報の追加
ALTER TABLE public.websites
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMP WITH TIME ZONE;

-- SSL証明書情報
ALTER TABLE public.websites
  ADD COLUMN IF NOT EXISTS ssl_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ssl_installed_at TIMESTAMP WITH TIME ZONE;

-- WordPress情報の追加
ALTER TABLE public.websites
  ADD COLUMN IF NOT EXISTS wp_version TEXT,
  ADD COLUMN IF NOT EXISTS wp_theme TEXT DEFAULT 'Lightning',
  ADD COLUMN IF NOT EXISTS wp_plugins TEXT[] DEFAULT ARRAY['vk-all-in-one-expansion-unit', 'vk-blocks'];

-- ============================================================================
-- 2. affiliate_tools テーブルの拡張
-- ============================================================================

-- ガイドコンテンツの追加（DNS設定手順など）
ALTER TABLE public.affiliate_tools
  ADD COLUMN IF NOT EXISTS guide_content TEXT;

-- 更新: Xserver のガイドコンテンツを追加
UPDATE public.affiliate_tools
SET guide_content = 'Xserver WordPressクイックスタートを利用すると、ドメイン取得・DNS設定・WordPress インストール・SSL化が自動で完了します。最も簡単な方法です。'
WHERE name = 'Xserver';

-- ============================================================================
-- 3. credit_ledger テーブルの追加（credit_logs の改名版）
-- ============================================================================
-- 既存の credit_logs テーブルを credit_ledger にリネーム
-- （要件定義書では credit_ledger という名前が使われているため）

-- すでに credit_ledger が存在する場合はスキップ
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_ledger') THEN
    -- credit_logs を credit_ledger にリネーム
    ALTER TABLE public.credit_logs RENAME TO credit_ledger;

    -- インデックスもリネーム
    ALTER INDEX IF EXISTS idx_credit_logs_user_id RENAME TO idx_credit_ledger_user_id;
    ALTER INDEX IF EXISTS idx_credit_logs_created_at RENAME TO idx_credit_ledger_created_at;
  END IF;
END $$;

-- amount カラムを拡張（負の値も許可）
ALTER TABLE public.credit_ledger
  DROP CONSTRAINT IF EXISTS credit_logs_amount_check;

-- credit_ledger に description カラムが存在しない場合は追加
ALTER TABLE public.credit_ledger
  ADD COLUMN IF NOT EXISTS description TEXT;

-- ============================================================================
-- 4. ストアドファンクション: クレジット追加
-- ============================================================================
CREATE OR REPLACE FUNCTION add_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- クレジット残高を更新
  UPDATE public.credits
  SET balance = balance + p_amount,
      updated_at = timezone('utc'::text, now())
  WHERE user_id = p_user_id;

  -- 履歴に記録
  INSERT INTO public.credit_ledger (user_id, amount, type, description)
  VALUES (p_user_id, p_amount, 'purchase', p_description);
END;
$$;

-- ============================================================================
-- 5. ストアドファンクション: クレジット控除
-- ============================================================================
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  -- 現在の残高を取得
  SELECT balance INTO current_balance
  FROM public.credits
  WHERE user_id = p_user_id;

  -- 残高チェック
  IF current_balance IS NULL OR current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits: current=%, required=%', current_balance, p_amount;
  END IF;

  -- クレジット残高を更新
  UPDATE public.credits
  SET balance = balance - p_amount,
      updated_at = timezone('utc'::text, now())
  WHERE user_id = p_user_id;

  -- 履歴に記録（マイナス値で記録）
  INSERT INTO public.credit_ledger (user_id, amount, type, description)
  VALUES (p_user_id, -p_amount, 'usage', p_description);
END;
$$;

-- ============================================================================
-- 6. インデックスの追加
-- ============================================================================

-- websites テーブルのインデックス追加
CREATE INDEX IF NOT EXISTS idx_websites_current_step ON public.websites(current_step);
CREATE INDEX IF NOT EXISTS idx_websites_server_host ON public.websites(server_host);

-- ============================================================================
-- 7. コメント追加（ドキュメント化）
-- ============================================================================

COMMENT ON COLUMN public.websites.server_host IS 'SSH接続先ホスト名（例: sv12345.xserver.jp）';
COMMENT ON COLUMN public.websites.server_user IS 'SSH接続ユーザー名';
COMMENT ON COLUMN public.websites.server_pass_encrypted IS 'SSH接続パスワード（AES-256暗号化済み）';
COMMENT ON COLUMN public.websites.current_step IS '構築進捗ステップ（1:ドメイン・サーバー, 2:DNS設定, 3:インストール, 4:コンテンツ制作）';
COMMENT ON COLUMN public.websites.status IS 'サイトステータス: draft=下書き, dns_wait=DNS浸透待ち, building=構築中, ssl_pending=SSL設定待ち, active=稼働中, error=エラー';
