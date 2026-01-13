-- Export Jobs Table
-- 静止画・動画エクスポートのジョブ管理

CREATE TABLE IF NOT EXISTS export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- ジョブタイプ
  type TEXT NOT NULL CHECK (type IN ('image', 'video')),

  -- ステータス
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

  -- エクスポート設定
  frame_type TEXT NOT NULL CHECK (frame_type IN ('frame1', 'frame2', 'frame3', 'frame4', 'frame5')),
  aspect_ratio TEXT NOT NULL CHECK (aspect_ratio IN ('reels', 'feed')),
  input_data JSONB NOT NULL,

  -- 出力
  output_url TEXT,
  output_width INTEGER,
  output_height INTEGER,
  output_format TEXT,

  -- 進捗
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

  -- クレジット
  credits_reserved INTEGER NOT NULL,
  credits_charged INTEGER,

  -- エラー
  error_message TEXT,

  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- インデックス
CREATE INDEX idx_export_jobs_user ON export_jobs(user_id, created_at DESC);
CREATE INDEX idx_export_jobs_status ON export_jobs(status) WHERE status IN ('pending', 'processing');

-- RLS有効化
ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のジョブのみ閲覧可能
CREATE POLICY "Users can view own export jobs" ON export_jobs
  FOR SELECT USING (auth.uid() = user_id);

-- ユーザーは自分のジョブのみ作成可能
CREATE POLICY "Users can create own export jobs" ON export_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- サービスロールのみ更新可能
CREATE POLICY "Service role can update export jobs" ON export_jobs
  FOR UPDATE USING (true);

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_export_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_export_jobs_updated_at
  BEFORE UPDATE ON export_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_export_jobs_updated_at();

-- コメント
COMMENT ON TABLE export_jobs IS 'Content Engineのエクスポートジョブ管理';
COMMENT ON COLUMN export_jobs.type IS 'エクスポートタイプ: image または video';
COMMENT ON COLUMN export_jobs.status IS 'ジョブステータス: pending, processing, completed, failed';
COMMENT ON COLUMN export_jobs.frame_type IS 'フレームタイプ: frame1-5';
COMMENT ON COLUMN export_jobs.input_data IS 'フレームのプロパティデータ (JSON)';
COMMENT ON COLUMN export_jobs.credits_reserved IS '予約したクレジット数';
COMMENT ON COLUMN export_jobs.credits_charged IS '実際に消費したクレジット数';
