-- ============================================================================
-- Marty Database Schema Migration - Phase 5
-- データベースと認証の強化
-- Based on 要件定義書 v3.0 - Phase 5
-- ============================================================================

-- ============================================================================
-- 1. credit_ledger テーブルの作成（credit_logs の改良版）
-- ============================================================================

-- 既存の credit_logs を credit_ledger にリネームし、balance_after カラムを追加
-- ※ 既存データがある場合は移行が必要

CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- 変動量（プラスまたはマイナス）
  amount INTEGER NOT NULL,

  -- 変動後の残高（監査証跡として重要）
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),

  -- 取引タイプ
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('usage', 'purchase', 'monthly_grant', 'refund', 'bonus')),

  -- 詳細説明
  description TEXT NOT NULL,

  -- 参照ID（Stripe決済ID、投稿IDなど）
  reference_id TEXT,

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- インデックス作成（パフォーマンス最適化）
CREATE INDEX idx_credit_ledger_user_id ON public.credit_ledger(user_id);
CREATE INDEX idx_credit_ledger_created_at ON public.credit_ledger(created_at DESC);
CREATE INDEX idx_credit_ledger_transaction_type ON public.credit_ledger(transaction_type);
CREATE INDEX idx_credit_ledger_reference_id ON public.credit_ledger(reference_id) WHERE reference_id IS NOT NULL;

-- RLS 有効化
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. users テーブルの拡張（本番環境用カラム追加）
-- ============================================================================

-- Stripe 顧客IDの追加（既に存在する場合はスキップ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE public.users ADD COLUMN stripe_customer_id TEXT UNIQUE;
  END IF;
END $$;

-- サブスクリプションステータスの追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE public.users ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'free'
      CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'free'));
  END IF;
END $$;

-- メール確認フラグの追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'email_confirmed'
  ) THEN
    ALTER TABLE public.users ADD COLUMN email_confirmed BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ============================================================================
-- 3. integrations テーブルの拡張（トークン管理強化）
-- ============================================================================

-- トークン有効期限の追加（既存の expires_at とは別）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'integrations'
    AND column_name = 'token_expires_at'
  ) THEN
    ALTER TABLE public.integrations ADD COLUMN token_expires_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- 連携が有効かどうかのフラグ
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'integrations'
    AND column_name = 'is_valid'
  ) THEN
    ALTER TABLE public.integrations ADD COLUMN is_valid BOOLEAN DEFAULT true;
  END IF;
END $$;

-- 最後に発生したエラーログ
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'integrations'
    AND column_name = 'last_error'
  ) THEN
    ALTER TABLE public.integrations ADD COLUMN last_error TEXT;
  END IF;
END $$;

-- ============================================================================
-- 4. posts テーブルの拡張（エラー管理追加）
-- ============================================================================

-- error_message カラムの追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'posts'
    AND column_name = 'error_message'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN error_message TEXT;
  END IF;
END $$;

-- status の制約を更新（pending_approval を追加）
DO $$
BEGIN
  ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_status_check;
  ALTER TABLE public.posts ADD CONSTRAINT posts_status_check
    CHECK (status IN ('draft', 'pending_approval', 'scheduled', 'published', 'failed'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- 5. RLS ポリシーの強化（細かい権限設定）
-- ============================================================================

-- 既存のポリシーを削除して再作成
-- users テーブル
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- credits テーブル（SELECT のみ、UPDATE/INSERT は関数経由のみ）
DROP POLICY IF EXISTS "Users can view own credits" ON public.credits;

CREATE POLICY "credits_select_own"
  ON public.credits FOR SELECT
  USING (auth.uid() = user_id);

-- credit_ledger テーブル（SELECT のみ、INSERT は関数経由のみ）
CREATE POLICY "credit_ledger_select_own"
  ON public.credit_ledger FOR SELECT
  USING (auth.uid() = user_id);

-- integrations テーブル
DROP POLICY IF EXISTS "Users can manage own integrations" ON public.integrations;

CREATE POLICY "integrations_select_own"
  ON public.integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "integrations_insert_own"
  ON public.integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "integrations_update_own"
  ON public.integrations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "integrations_delete_own"
  ON public.integrations FOR DELETE
  USING (auth.uid() = user_id);

-- websites テーブル
DROP POLICY IF EXISTS "Users can manage own websites" ON public.websites;

CREATE POLICY "websites_select_own"
  ON public.websites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "websites_insert_own"
  ON public.websites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "websites_update_own"
  ON public.websites FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "websites_delete_own"
  ON public.websites FOR DELETE
  USING (auth.uid() = user_id);

-- posts テーブル
DROP POLICY IF EXISTS "Users can manage own posts" ON public.posts;

CREATE POLICY "posts_select_own"
  ON public.posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "posts_insert_own"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "posts_update_own"
  ON public.posts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "posts_delete_own"
  ON public.posts FOR DELETE
  USING (auth.uid() = user_id);

-- chat_messages テーブル
DROP POLICY IF EXISTS "Users can manage own chat messages" ON public.chat_messages;

CREATE POLICY "chat_messages_select_own"
  ON public.chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "chat_messages_insert_own"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chat_messages_delete_own"
  ON public.chat_messages FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 6. トランザクション処理用の関数（排他制御）
-- ============================================================================

-- クレジット消費関数（アトミックな操作）
CREATE OR REPLACE FUNCTION public.consume_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- 排他ロックを取得
  SELECT balance INTO v_current_balance
  FROM public.credits
  WHERE user_id = p_user_id
  FOR UPDATE;  -- 重要: 他のトランザクションが同時に更新できないようにロック

  -- 残高チェック
  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'User credits not found';
  END IF;

  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits. Required: %, Available: %', p_amount, v_current_balance;
  END IF;

  -- 新しい残高を計算
  v_new_balance := v_current_balance - p_amount;

  -- credits テーブルを更新
  UPDATE public.credits
  SET balance = v_new_balance,
      updated_at = timezone('utc'::text, now())
  WHERE user_id = p_user_id;

  -- credit_ledger に記録
  INSERT INTO public.credit_ledger (user_id, amount, balance_after, transaction_type, description, reference_id)
  VALUES (p_user_id, -p_amount, v_new_balance, 'usage', p_description, p_reference_id);

  -- 結果を返す
  RETURN jsonb_build_object(
    'success', true,
    'previous_balance', v_current_balance,
    'new_balance', v_new_balance,
    'consumed', p_amount
  );
END;
$$;

-- クレジット付与関数（アトミックな操作）
CREATE OR REPLACE FUNCTION public.grant_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type TEXT,
  p_description TEXT,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- トランザクションタイプの検証
  IF p_transaction_type NOT IN ('purchase', 'monthly_grant', 'refund', 'bonus') THEN
    RAISE EXCEPTION 'Invalid transaction type: %', p_transaction_type;
  END IF;

  -- 排他ロックを取得
  SELECT balance INTO v_current_balance
  FROM public.credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'User credits not found';
  END IF;

  -- 新しい残高を計算
  v_new_balance := v_current_balance + p_amount;

  -- credits テーブルを更新
  UPDATE public.credits
  SET balance = v_new_balance,
      updated_at = timezone('utc'::text, now())
  WHERE user_id = p_user_id;

  -- credit_ledger に記録
  INSERT INTO public.credit_ledger (user_id, amount, balance_after, transaction_type, description, reference_id)
  VALUES (p_user_id, p_amount, v_new_balance, p_transaction_type, p_description, p_reference_id);

  -- 結果を返す
  RETURN jsonb_build_object(
    'success', true,
    'previous_balance', v_current_balance,
    'new_balance', v_new_balance,
    'granted', p_amount
  );
END;
$$;

-- ============================================================================
-- 7. セキュリティ: 関数へのアクセス許可
-- ============================================================================

-- 認証済みユーザーのみが関数を実行可能
GRANT EXECUTE ON FUNCTION public.consume_credits(UUID, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_credits(UUID, INTEGER, TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- 8. コメント追加（ドキュメント化）
-- ============================================================================

COMMENT ON TABLE public.credit_ledger IS '

クレジット台帳: すべてのポイント増減を記録';
COMMENT ON COLUMN public.credit_ledger.amount IS '変動量（プラス=付与、マイナス=消費）';
COMMENT ON COLUMN public.credit_ledger.balance_after IS '変動後の残高（監査証跡）';
COMMENT ON COLUMN public.credit_ledger.reference_id IS 'Stripe決済ID、投稿IDなどの参照';

COMMENT ON FUNCTION public.consume_credits IS 'クレジット消費（排他制御付き）';
COMMENT ON FUNCTION public.grant_credits IS 'クレジット付与（排他制御付き）';
