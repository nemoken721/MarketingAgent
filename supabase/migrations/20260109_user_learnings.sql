-- =====================================================
-- Marty Intelligence: User Learnings (パーソナライゼーション)
-- ユーザーごとの学習・インサイトを蓄積
-- =====================================================

-- ユーザー学習テーブル
CREATE TABLE IF NOT EXISTS user_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 学習タイプ
  learning_type TEXT NOT NULL CHECK (learning_type IN (
    'business_context',    -- ビジネス背景（業種、規模、目標など）
    'recurring_topic',     -- よく相談するトピック
    'preference',          -- 好み・スタイル（詳細派/要点派など）
    'past_decision',       -- 過去の決定事項
    'challenge',           -- 継続的な課題
    'success',             -- 成功事例・良かった施策
    'terminology'          -- ユーザー固有の用語・表現
  )),

  -- 学習内容
  title TEXT NOT NULL,                    -- 学習のタイトル（例: 「Instagram運用に注力中」）
  content TEXT NOT NULL,                  -- 詳細内容
  context TEXT,                           -- どの会話から抽出されたか

  -- メタデータ
  confidence FLOAT DEFAULT 0.8,           -- 確信度（0-1）
  source_thread_id UUID REFERENCES chat_threads(id) ON DELETE SET NULL,
  extracted_at TIMESTAMPTZ DEFAULT NOW(), -- 抽出日時
  last_referenced_at TIMESTAMPTZ,         -- 最後に参照された日時
  reference_count INT DEFAULT 0,          -- 参照回数

  -- 有効性
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,                 -- 期限（古くなった情報は失効）

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_user_learnings_user_id ON user_learnings(user_id);
CREATE INDEX idx_user_learnings_type ON user_learnings(user_id, learning_type);
CREATE INDEX idx_user_learnings_active ON user_learnings(user_id, is_active) WHERE is_active = true;

-- ユーザー学習の埋め込みベクトル（類似検索用）
ALTER TABLE user_learnings ADD COLUMN IF NOT EXISTS embedding vector(768);
CREATE INDEX idx_user_learnings_embedding ON user_learnings
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- RLS (Row Level Security)
ALTER TABLE user_learnings ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の学習のみ参照可能
CREATE POLICY "Users can view own learnings" ON user_learnings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own learnings" ON user_learnings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own learnings" ON user_learnings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own learnings" ON user_learnings
  FOR DELETE USING (auth.uid() = user_id);

-- Service Role は全アクセス可能
CREATE POLICY "Service role has full access" ON user_learnings
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ユーザー学習を検索する関数
CREATE OR REPLACE FUNCTION search_user_learnings(
  p_user_id UUID,
  p_query_embedding vector(768),
  p_match_count INT DEFAULT 5,
  p_learning_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  learning_type TEXT,
  title TEXT,
  content TEXT,
  confidence FLOAT,
  reference_count INT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ul.id,
    ul.learning_type,
    ul.title,
    ul.content,
    ul.confidence,
    ul.reference_count,
    1 - (ul.embedding <=> p_query_embedding) AS similarity
  FROM user_learnings ul
  WHERE ul.user_id = p_user_id
    AND ul.is_active = true
    AND ul.embedding IS NOT NULL
    AND (ul.expires_at IS NULL OR ul.expires_at > NOW())
    AND (p_learning_type IS NULL OR ul.learning_type = p_learning_type)
  ORDER BY ul.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$;

-- ユーザーの学習サマリーを取得する関数
CREATE OR REPLACE FUNCTION get_user_learning_summary(p_user_id UUID)
RETURNS TABLE (
  learning_type TEXT,
  count BIGINT,
  recent_titles TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ul.learning_type,
    COUNT(*)::BIGINT,
    (ARRAY_AGG(ul.title ORDER BY ul.updated_at DESC))[1:3] AS recent_titles
  FROM user_learnings ul
  WHERE ul.user_id = p_user_id
    AND ul.is_active = true
    AND (ul.expires_at IS NULL OR ul.expires_at > NOW())
  GROUP BY ul.learning_type;
END;
$$;

-- 参照カウントを更新する関数
CREATE OR REPLACE FUNCTION increment_learning_reference(p_learning_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_learnings
  SET
    reference_count = reference_count + 1,
    last_referenced_at = NOW(),
    updated_at = NOW()
  WHERE id = p_learning_id;
END;
$$;

-- 古い学習を自動失効させるトリガー（business_context以外は180日で失効）
CREATE OR REPLACE FUNCTION set_learning_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.learning_type != 'business_context' AND NEW.expires_at IS NULL THEN
    NEW.expires_at := NOW() + INTERVAL '180 days';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_learning_expiry
  BEFORE INSERT ON user_learnings
  FOR EACH ROW
  EXECUTE FUNCTION set_learning_expiry();

-- updated_at自動更新
CREATE TRIGGER trigger_user_learnings_updated_at
  BEFORE UPDATE ON user_learnings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE user_learnings IS 'ユーザーごとの学習・インサイトを蓄積するテーブル';
COMMENT ON COLUMN user_learnings.learning_type IS 'business_context=ビジネス背景, recurring_topic=よく相談するトピック, preference=好み, past_decision=過去の決定, challenge=課題, success=成功事例, terminology=固有用語';
