-- Marty Database Schema Migration
-- Phase 2: Initial Database Setup
-- Based on 要件定義書 v2.0 Section 4

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. users テーブル
-- ============================================================================
-- Note: Supabase Auth自動生成のauth.usersを使用するため、
-- このテーブルはプロファイル情報のみを格納
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  plan_tier TEXT NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'pro')),
  business_info JSONB DEFAULT '{}',
  is_server_contracted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ユーザー作成時の自動プロファイル作成トリガー
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 2. credits テーブル（Ma-Point管理）
-- ============================================================================
CREATE TABLE public.credits (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ユーザー作成時の自動クレジット初期化トリガー
CREATE OR REPLACE FUNCTION public.init_user_credits()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.credits (user_id, balance)
  VALUES (new.id, 0);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_created_init_credits
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.init_user_credits();

-- ============================================================================
-- 3. credit_logs テーブル（ポイント増減履歴）
-- ============================================================================
CREATE TABLE public.credit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('usage', 'purchase', 'bonus', 'monthly_grant')),
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- インデックス作成（パフォーマンス向上）
CREATE INDEX idx_credit_logs_user_id ON public.credit_logs(user_id);
CREATE INDEX idx_credit_logs_created_at ON public.credit_logs(created_at DESC);

-- ============================================================================
-- 4. integrations テーブル（SNS/外部サービス連携）
-- ============================================================================
CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'x', 'wordpress')),
  access_token TEXT,  -- 暗号化推奨
  refresh_token TEXT, -- 暗号化推奨
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, platform)
);

-- インデックス作成
CREATE INDEX idx_integrations_user_id ON public.integrations(user_id);

-- ============================================================================
-- 5. websites テーブル（Webサイト管理）
-- ============================================================================
CREATE TABLE public.websites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  wp_url TEXT,
  wp_username TEXT,
  wp_app_password TEXT, -- 暗号化推奨
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'building', 'active')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, domain)
);

-- インデックス作成
CREATE INDEX idx_websites_user_id ON public.websites(user_id);
CREATE INDEX idx_websites_status ON public.websites(status);

-- ============================================================================
-- 6. affiliate_tools テーブル（アフィリエイトツール管理）
-- ============================================================================
CREATE TABLE public.affiliate_tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('server', 'mail', 'line', 'other')),
  description TEXT NOT NULL,
  affiliate_url TEXT NOT NULL,
  trigger_keywords TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- インデックス作成
CREATE INDEX idx_affiliate_tools_category ON public.affiliate_tools(category);
CREATE INDEX idx_affiliate_tools_active ON public.affiliate_tools(is_active);

-- ============================================================================
-- 7. Row Level Security (RLS) ポリシー設定
-- ============================================================================

-- users テーブル
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- credits テーブル
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits"
  ON public.credits FOR SELECT
  USING (auth.uid() = user_id);

-- credit_logs テーブル
ALTER TABLE public.credit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credit logs"
  ON public.credit_logs FOR SELECT
  USING (auth.uid() = user_id);

-- integrations テーブル
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own integrations"
  ON public.integrations FOR ALL
  USING (auth.uid() = user_id);

-- websites テーブル
ALTER TABLE public.websites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own websites"
  ON public.websites FOR ALL
  USING (auth.uid() = user_id);

-- affiliate_tools テーブル（全ユーザーが参照可能）
ALTER TABLE public.affiliate_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active affiliate tools"
  ON public.affiliate_tools FOR SELECT
  USING (is_active = true);

-- ============================================================================
-- 8. 初期データ投入（アフィリエイトツール）
-- ============================================================================
INSERT INTO public.affiliate_tools (name, category, description, affiliate_url, trigger_keywords) VALUES
  ('Xserver', 'server', '国内シェアNo.1のレンタルサーバー。WordPress簡単インストール機能付き。', 'https://www.xserver.ne.jp/', ARRAY['サーバー', 'レンタルサーバー', 'ホームページ', 'WordPress', 'ドメイン']),
  ('ConoHa WING', 'server', '高速・安定のレンタルサーバー。初心者にも優しい管理画面。', 'https://www.conoha.jp/wing/', ARRAY['サーバー', 'レンタルサーバー', 'WordPress', 'ホームページ']),
  ('お名前.com', 'server', 'ドメイン取得とサーバーをセットで提供。', 'https://www.onamae.com/', ARRAY['ドメイン', 'サーバー', 'ホームページ']);

-- ============================================================================
-- 9. 更新日時の自動更新関数
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルに更新トリガーを設定
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_credits_updated_at BEFORE UPDATE ON public.credits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_websites_updated_at BEFORE UPDATE ON public.websites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_affiliate_tools_updated_at BEFORE UPDATE ON public.affiliate_tools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
