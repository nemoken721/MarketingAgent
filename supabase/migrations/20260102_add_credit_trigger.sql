-- Marty Database Schema Migration
-- Credit System Trigger
-- ユーザー登録時に自動でcreditsレコードを作成

-- ============================================================================
-- 1. ユーザー登録時のクレジット初期化トリガー関数
-- ============================================================================

-- トリガー関数: 新規ユーザー作成時にcreditsレコードを自動生成
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- creditsテーブルに初期レコードを挿入
  INSERT INTO public.credits (user_id, balance, updated_at)
  VALUES (
    NEW.id,
    0, -- Free Planは初期0ポイント
    timezone('utc'::text, now())
  );

  -- credit_logsテーブルに初期化ログを記録
  INSERT INTO public.credit_logs (user_id, amount, type, description, created_at)
  VALUES (
    NEW.id,
    0,
    'bonus',
    'アカウント作成時の初期ポイント',
    timezone('utc'::text, now())
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. トリガーの設定
-- ============================================================================

-- usersテーブルにINSERT時にトリガーを発火
CREATE TRIGGER on_user_created
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 3. 既存ユーザー向けの初期化（マイグレーション実行時のみ）
-- ============================================================================

-- 既存のユーザーでcreditsレコードがない場合は作成
INSERT INTO public.credits (user_id, balance, updated_at)
SELECT
  u.id,
  0,
  timezone('utc'::text, now())
FROM public.users u
LEFT JOIN public.credits c ON u.id = c.user_id
WHERE c.user_id IS NULL;

-- 既存ユーザーのログも追加
INSERT INTO public.credit_logs (user_id, amount, type, description, created_at)
SELECT
  u.id,
  0,
  'bonus',
  'マイグレーション時の初期ポイント',
  timezone('utc'::text, now())
FROM public.users u
LEFT JOIN public.credit_logs cl ON u.id = cl.user_id
WHERE cl.user_id IS NULL;
