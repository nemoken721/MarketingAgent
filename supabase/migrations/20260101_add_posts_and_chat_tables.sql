-- Marty Database Schema Migration
-- Posts and Chat History Tables
-- 企画投稿管理とチャット履歴の保存

-- ============================================================================
-- 1. posts テーブル（投稿企画管理）
-- ============================================================================
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'x', 'wordpress')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),

  -- 投稿内容
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'none')),

  -- スケジュール情報
  scheduled_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,

  -- メタデータ
  metadata JSONB DEFAULT '{}',

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- インデックス作成
CREATE INDEX idx_posts_user_id ON public.posts(user_id);
CREATE INDEX idx_posts_status ON public.posts(status);
CREATE INDEX idx_posts_scheduled_at ON public.posts(scheduled_at);
CREATE INDEX idx_posts_platform ON public.posts(platform);

-- ============================================================================
-- 2. chat_messages テーブル（チャット履歴）
-- ============================================================================
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tool_calls JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- インデックス作成
CREATE INDEX idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- ============================================================================
-- 3. Row Level Security (RLS) ポリシー設定
-- ============================================================================

-- posts テーブル
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own posts"
  ON public.posts FOR ALL
  USING (auth.uid() = user_id);

-- chat_messages テーブル
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own chat messages"
  ON public.chat_messages FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. 更新日時の自動更新トリガー
-- ============================================================================

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
