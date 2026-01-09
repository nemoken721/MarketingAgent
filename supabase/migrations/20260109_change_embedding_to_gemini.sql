-- =====================================================
-- Marty Intelligence: Gemini Embedding Migration
-- OpenAI (1536次元) → Gemini text-embedding-004 (768次元)
-- =====================================================

-- 既存のembeddingカラムを削除して新しい次元で再作成
ALTER TABLE knowledge_vectors
DROP COLUMN IF EXISTS embedding;

ALTER TABLE knowledge_vectors
ADD COLUMN embedding vector(768);

-- インデックスを再作成
DROP INDEX IF EXISTS idx_knowledge_vectors_embedding;
CREATE INDEX idx_knowledge_vectors_embedding
ON knowledge_vectors
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 検索関数を更新（768次元対応）
CREATE OR REPLACE FUNCTION search_knowledge(
  query_embedding vector(768),
  match_count int DEFAULT 5,
  filter_category text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  knowledge_id text,
  knowledge_type text,
  category text,
  title text,
  content text,
  valid_from date,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kv.id,
    kv.knowledge_id,
    kv.knowledge_type,
    kv.category,
    kv.title,
    kv.content,
    kv.valid_from,
    1 - (kv.embedding <=> query_embedding) AS similarity
  FROM knowledge_vectors kv
  WHERE kv.is_active = true
    AND kv.embedding IS NOT NULL
    AND (filter_category IS NULL OR kv.category = filter_category)
  ORDER BY kv.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 優先度付き検索関数を更新（768次元対応）
CREATE OR REPLACE FUNCTION search_knowledge_with_priority(
  query_embedding vector(768),
  match_count int DEFAULT 5,
  filter_category text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  knowledge_id text,
  knowledge_type text,
  category text,
  title text,
  content text,
  valid_from date,
  similarity float,
  priority_score float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kv.id,
    kv.knowledge_id,
    kv.knowledge_type,
    kv.category,
    kv.title,
    kv.content,
    kv.valid_from,
    1 - (kv.embedding <=> query_embedding) AS similarity,
    -- Core knowledge gets 2x priority boost
    CASE
      WHEN kv.knowledge_type = 'core' THEN (1 - (kv.embedding <=> query_embedding)) * 2.0
      ELSE (1 - (kv.embedding <=> query_embedding)) * 1.0
    END AS priority_score
  FROM knowledge_vectors kv
  WHERE kv.is_active = true
    AND kv.embedding IS NOT NULL
    AND (filter_category IS NULL OR kv.category = filter_category)
  ORDER BY priority_score DESC
  LIMIT match_count;
END;
$$;

-- 完了メッセージ
COMMENT ON FUNCTION search_knowledge IS 'Gemini text-embedding-004 (768次元) 対応の知識検索関数';
COMMENT ON FUNCTION search_knowledge_with_priority IS 'Gemini text-embedding-004 (768次元) 対応の優先度付き知識検索関数';
