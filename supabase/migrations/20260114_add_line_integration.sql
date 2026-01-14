-- ============================================================================
-- LINE連携機能の追加
-- LIFF (LINE Front-end Framework) 統合のためのスキーマ拡張
-- Based on Marty LINE連携・実装要件定義書 v1.0
-- ============================================================================

-- ============================================================================
-- 1. usersテーブルにLINE連携カラムを追加
-- ============================================================================
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS line_user_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS line_display_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS line_picture_url TEXT;

-- LINE User IDのインデックス作成（検索高速化）
CREATE INDEX IF NOT EXISTS idx_users_line_user_id ON public.users(line_user_id);

-- ============================================================================
-- 2. line_sessions テーブル（LINEセッション管理）
-- LINEトーク画面で送信された画像などをセッションとして管理
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.line_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  line_user_id VARCHAR(255) NOT NULL,

  -- セッション状態
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),

  -- コンテキストデータ（送信された画像、進行中のタスク等）
  context JSONB DEFAULT '{}',

  -- 最後のアクティビティ
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_line_sessions_user_id ON public.line_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_line_sessions_line_user_id ON public.line_sessions(line_user_id);
CREATE INDEX IF NOT EXISTS idx_line_sessions_status ON public.line_sessions(status);

-- ============================================================================
-- 3. line_uploaded_images テーブル（LINE経由の画像管理）
-- LINEトークで送信された画像を管理
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.line_uploaded_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.line_sessions(id) ON DELETE SET NULL,

  -- 画像情報
  message_id VARCHAR(255) NOT NULL, -- LINE Message ID
  file_path TEXT NOT NULL, -- S3/Cloud Storage path
  content_type TEXT NOT NULL DEFAULT 'image/jpeg',
  file_size INTEGER,

  -- メタデータ
  metadata JSONB DEFAULT '{}',

  -- 処理状態
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_line_uploaded_images_user_id ON public.line_uploaded_images(user_id);
CREATE INDEX IF NOT EXISTS idx_line_uploaded_images_session_id ON public.line_uploaded_images(session_id);
CREATE INDEX IF NOT EXISTS idx_line_uploaded_images_message_id ON public.line_uploaded_images(message_id);

-- ============================================================================
-- 4. Row Level Security (RLS) ポリシー設定
-- ============================================================================

-- line_sessions テーブル
ALTER TABLE public.line_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own line sessions"
  ON public.line_sessions FOR ALL
  USING (auth.uid() = user_id);

-- line_uploaded_images テーブル
ALTER TABLE public.line_uploaded_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own line uploaded images"
  ON public.line_uploaded_images FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================================
-- 5. 更新トリガー
-- ============================================================================
CREATE TRIGGER update_line_sessions_updated_at BEFORE UPDATE ON public.line_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 6. セッション有効期限管理関数
-- 24時間経過したセッションを期限切れにする
-- ============================================================================
CREATE OR REPLACE FUNCTION public.expire_old_line_sessions()
RETURNS void AS $$
BEGIN
  UPDATE public.line_sessions
  SET status = 'expired', updated_at = now()
  WHERE status = 'active'
  AND last_activity_at < now() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. ユーザーコンテキスト取得関数
-- LIFF起動時に直近の画像や未完了タスクを取得するためのヘルパー関数
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_line_context(p_line_user_id VARCHAR(255))
RETURNS TABLE (
  session_id UUID,
  recent_images JSONB,
  session_context JSONB,
  last_activity TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ls.id as session_id,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', li.id,
          'file_path', li.file_path,
          'status', li.status,
          'created_at', li.created_at
        ) ORDER BY li.created_at DESC
      )
      FROM public.line_uploaded_images li
      WHERE li.session_id = ls.id
      AND li.created_at > now() - INTERVAL '24 hours'
      LIMIT 10),
      '[]'::jsonb
    ) as recent_images,
    ls.context as session_context,
    ls.last_activity_at as last_activity
  FROM public.line_sessions ls
  WHERE ls.line_user_id = p_line_user_id
  AND ls.status = 'active'
  ORDER BY ls.last_activity_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
