-- =====================================================
-- 履歴機能: chat_threads テーブルと関連拡張
-- =====================================================

-- pgvector拡張（RAG検索用）
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- 1. chat_threads テーブル（スレッド管理）
-- =====================================================

CREATE TABLE IF NOT EXISTS public.chat_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '新しい会話',
  preview TEXT,
  canvas_mode TEXT DEFAULT 'home' CHECK (canvas_mode IN ('home', 'calendar', 'analytics', 'preview', 'history')),
  canvas_context JSONB DEFAULT '{}',
  message_count INTEGER DEFAULT 0,
  is_archived BOOLEAN DEFAULT false,
  summary TEXT,
  is_summarized BOOLEAN DEFAULT false,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_chat_threads_user_id ON public.chat_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_last_message ON public.chat_threads(last_message_at DESC);

-- RLSポリシー
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own threads" ON public.chat_threads;
CREATE POLICY "Users can view own threads" ON public.chat_threads FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own threads" ON public.chat_threads;
CREATE POLICY "Users can create own threads" ON public.chat_threads FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own threads" ON public.chat_threads;
CREATE POLICY "Users can update own threads" ON public.chat_threads FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own threads" ON public.chat_threads;
CREATE POLICY "Users can delete own threads" ON public.chat_threads FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 2. chat_messages テーブル拡張
-- =====================================================

ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS embedding vector(768);

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_id ON public.chat_messages(thread_id);

-- =====================================================
-- 3. updated_at 自動更新トリガー
-- =====================================================

CREATE OR REPLACE FUNCTION update_chat_threads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chat_threads_updated_at_trigger ON public.chat_threads;
CREATE TRIGGER chat_threads_updated_at_trigger
BEFORE UPDATE ON public.chat_threads
FOR EACH ROW EXECUTE FUNCTION update_chat_threads_updated_at();

-- =====================================================
-- 4. message_count 自動更新トリガー（INSERT用）
-- =====================================================

CREATE OR REPLACE FUNCTION update_thread_on_message_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.thread_id IS NOT NULL THEN
    UPDATE public.chat_threads
    SET message_count = message_count + 1,
        last_message_at = NEW.created_at,
        preview = LEFT(NEW.content, 100)
    WHERE id = NEW.thread_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chat_messages_insert_trigger ON public.chat_messages;
CREATE TRIGGER chat_messages_insert_trigger
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION update_thread_on_message_insert();

-- =====================================================
-- 5. message_count 自動更新トリガー（DELETE用）
-- =====================================================

CREATE OR REPLACE FUNCTION update_thread_on_message_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.thread_id IS NOT NULL THEN
    UPDATE public.chat_threads
    SET message_count = message_count - 1
    WHERE id = OLD.thread_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chat_messages_delete_trigger ON public.chat_messages;
CREATE TRIGGER chat_messages_delete_trigger
AFTER DELETE ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION update_thread_on_message_delete();

-- =====================================================
-- 6. ベクトル検索関数
-- =====================================================

CREATE OR REPLACE FUNCTION search_messages_by_embedding(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  user_id_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  message_id uuid,
  thread_id uuid,
  thread_title text,
  content text,
  role text,
  created_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cm.id as message_id,
    cm.thread_id,
    ct.title as thread_title,
    cm.content,
    cm.role,
    cm.created_at,
    1 - (cm.embedding <=> query_embedding) as similarity
  FROM public.chat_messages cm
  INNER JOIN public.chat_threads ct ON cm.thread_id = ct.id
  WHERE cm.embedding IS NOT NULL
    AND ct.user_id = user_id_filter
    AND 1 - (cm.embedding <=> query_embedding) > match_threshold
  ORDER BY cm.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
