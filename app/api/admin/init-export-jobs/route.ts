/**
 * POST /api/admin/init-export-jobs
 *
 * export_jobsテーブルを初期化
 * 一度だけ実行するための管理者用エンドポイント
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "認証されていません" },
        { status: 401 }
      );
    }

    // テーブルが存在するか確認
    const { data: tableExists, error: checkError } = await supabase
      .from("export_jobs")
      .select("id")
      .limit(1);

    if (!checkError) {
      // テーブルが既に存在
      return NextResponse.json({
        success: true,
        message: "export_jobsテーブルは既に存在します",
        exists: true,
      });
    }

    // テーブルが存在しない場合、エラーコードを確認
    if (checkError.code === "42P01") {
      // テーブルが存在しない - Supabaseダッシュボードでの作成が必要
      return NextResponse.json({
        success: false,
        message:
          "export_jobsテーブルが存在しません。Supabaseダッシュボードで以下のSQLを実行してください。",
        sql: getCreateTableSQL(),
        code: "TABLE_NOT_EXISTS",
      });
    }

    return NextResponse.json({
      success: false,
      error: checkError.message,
      code: checkError.code,
    });
  } catch (error: unknown) {
    console.error("Init export jobs error:", error);
    const message =
      error instanceof Error ? error.message : "初期化に失敗しました";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

function getCreateTableSQL(): string {
  return `
-- Export Jobs Table
CREATE TABLE IF NOT EXISTS export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'video')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  frame_type TEXT NOT NULL CHECK (frame_type IN ('frame1', 'frame2', 'frame3', 'frame4', 'frame5')),
  aspect_ratio TEXT NOT NULL CHECK (aspect_ratio IN ('reels', 'feed')),
  input_data JSONB NOT NULL,
  output_url TEXT,
  output_width INTEGER,
  output_height INTEGER,
  output_format TEXT,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  credits_reserved INTEGER NOT NULL,
  credits_charged INTEGER,
  error_message TEXT,
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

-- ポリシー
CREATE POLICY "Users can view own export jobs" ON export_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own export jobs" ON export_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

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
`.trim();
}
