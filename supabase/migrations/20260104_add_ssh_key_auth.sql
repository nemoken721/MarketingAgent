-- SSH鍵認証対応のためのカラム追加
-- websitesテーブルに秘密鍵保存用と認証方式用のカラムを追加

-- 秘密鍵保存用カラム（暗号化して保存）
ALTER TABLE public.websites
ADD COLUMN IF NOT EXISTS server_key_encrypted TEXT;

-- 認証方式カラム
ALTER TABLE public.websites
ADD COLUMN IF NOT EXISTS server_auth_method TEXT DEFAULT 'password';

-- コメント追加
COMMENT ON COLUMN public.websites.server_key_encrypted IS 'SSH秘密鍵（AES-256暗号化）';
COMMENT ON COLUMN public.websites.server_auth_method IS 'SSH認証方式（password または privateKey）';
