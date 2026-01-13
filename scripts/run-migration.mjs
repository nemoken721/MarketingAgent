/**
 * export_jobs テーブルのマイグレーションスクリプト
 *
 * Usage: node scripts/run-migration.mjs
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const sql = `
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
CREATE INDEX IF NOT EXISTS idx_export_jobs_user ON export_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status) WHERE status IN ('pending', 'processing');

-- RLS有効化
ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;

-- ポリシー (IF NOT EXISTS相当の処理)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'export_jobs' AND policyname = 'Users can view own export jobs'
  ) THEN
    CREATE POLICY "Users can view own export jobs" ON export_jobs
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'export_jobs' AND policyname = 'Users can create own export jobs'
  ) THEN
    CREATE POLICY "Users can create own export jobs" ON export_jobs
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'export_jobs' AND policyname = 'Service role can update export jobs'
  ) THEN
    CREATE POLICY "Service role can update export jobs" ON export_jobs
      FOR UPDATE USING (true);
  END IF;
END
$$;

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_export_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_export_jobs_updated_at ON export_jobs;
CREATE TRIGGER trigger_export_jobs_updated_at
  BEFORE UPDATE ON export_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_export_jobs_updated_at();

-- コメント
COMMENT ON TABLE export_jobs IS 'Content Engineのエクスポートジョブ管理';
`;

async function runMigration() {
  console.log('Running export_jobs migration...');

  try {
    // Supabase doesn't support raw SQL via the JS client
    // We need to use the RPC or postgres connection directly
    // Let's try using pg library instead

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql doesn't exist, we need to create the table through a different method
      console.log('RPC not available. Please run the SQL manually in Supabase dashboard.');
      console.log('\n--- SQL to execute ---\n');
      console.log(sql);
      console.log('\n--- End SQL ---\n');
      return;
    }

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    console.log('\nPlease run the following SQL in Supabase dashboard:');
    console.log('\n--- SQL to execute ---\n');
    console.log(sql);
    console.log('\n--- End SQL ---\n');
  }
}

runMigration();
