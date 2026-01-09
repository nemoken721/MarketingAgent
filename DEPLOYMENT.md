# Marty デプロイガイド

このドキュメントでは、Martyアプリケーションを本番環境にデプロイする手順を説明します。

## 目次

1. [前提条件](#前提条件)
2. [Vercelへのデプロイ](#vercelへのデプロイ)
3. [環境変数の設定](#環境変数の設定)
4. [Supabaseの設定](#supabaseの設定)
5. [外部サービスの設定](#外部サービスの設定)
6. [カスタムドメインの設定](#カスタムドメインの設定)
7. [デプロイ後の確認](#デプロイ後の確認)
8. [トラブルシューティング](#トラブルシューティング)

---

## 前提条件

デプロイ前に以下のアカウントとリソースを準備してください：

- [ ] GitHubアカウント（リポジトリをホスト）
- [ ] Vercelアカウント（ホスティング）
- [ ] Supabaseプロジェクト（データベース・認証）
- [ ] OpenAI APIキー（DALL-E 3画像生成）
- [ ] Resend APIキー（メール送信）
- [ ] Stripeアカウント（決済処理）
- [ ] （オプション）Sentryアカウント（エラー監視）
- [ ] （オプション）独自ドメイン

---

## Vercelへのデプロイ

### 1. GitHubリポジトリの準備

```bash
# まだリポジトリを作成していない場合
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/marty.git
git push -u origin main
```

### 2. Vercelプロジェクトの作成

1. [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
2. "Add New..." > "Project" をクリック
3. GitHubリポジトリをインポート
4. プロジェクト設定：
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` （ルート）
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`
   - **Node Version**: 18.x 以上

### 3. 環境変数の設定（後述）

環境変数を設定してから "Deploy" をクリックしてください。

---

## 環境変数の設定

Vercel Dashboard > Project Settings > Environment Variables で以下の環境変数を設定します。

### 必須の環境変数

#### Node環境
```
NODE_ENV=production
```

#### Google Gemini AI
```
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
```
[取得方法](https://aistudio.google.com/app/apikey)

#### Supabase
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```
Supabase Dashboard > Project Settings > API から取得

#### OpenAI（画像生成）
```
OPENAI_API_KEY=sk-your-openai-api-key
```
[取得方法](https://platform.openai.com/api-keys)

#### Stripe（決済）
```
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
```
[取得方法](https://dashboard.stripe.com/apikeys)

⚠️ **注意**: 本番環境では `sk_live_` と `pk_live_` キーを使用してください。

#### Resend（メール）
```
RESEND_API_KEY=re_your-resend-api-key
RESEND_FROM_EMAIL=noreply@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com
```
[取得方法](https://resend.com/api-keys)

#### アプリケーションURL
```
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### オプションの環境変数

#### Sentry（エラー監視）
```
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ORG=your_sentry_org
SENTRY_PROJECT=your_sentry_project
SENTRY_AUTH_TOKEN=your_sentry_auth_token
```

#### SNS連携（Instagram）
```
INSTAGRAM_APP_ID=your_instagram_app_id
INSTAGRAM_APP_SECRET=your_instagram_app_secret
```

#### SNS連携（X / Twitter）
```
X_API_KEY=your_x_api_key
X_API_SECRET=your_x_api_secret
X_BEARER_TOKEN=your_x_bearer_token
```

#### Cron Jobs
```
CRON_SECRET=your_cron_secret
```
ランダムな文字列を生成：`openssl rand -base64 32`

### 環境変数の適用範囲

すべての環境変数を以下の環境に設定してください：
- ✅ Production
- ✅ Preview
- ✅ Development

---

## Supabaseの設定

### 1. データベーステーブルの作成

Supabase SQL Editor で以下のSQLを実行：

```sql
-- usersテーブル（auth.usersと連携）
CREATE TABLE public.users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- creditsテーブル（クレジット残高）
CREATE TABLE public.credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  balance INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- credit_ledgerテーブル（クレジット履歴）
CREATE TABLE public.credit_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_credits_user_id ON public.credits(user_id);
CREATE INDEX idx_credit_ledger_user_id ON public.credit_ledger(user_id);
CREATE INDEX idx_credit_ledger_created_at ON public.credit_ledger(created_at DESC);
```

### 2. RLS（Row Level Security）ポリシーの設定

```sql
-- RLSを有効化
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

-- usersテーブルのポリシー
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- creditsテーブルのポリシー
CREATE POLICY "Users can view own credits" ON public.credits
  FOR SELECT USING (auth.uid() = user_id);

-- credit_ledgerテーブルのポリシー
CREATE POLICY "Users can view own ledger" ON public.credit_ledger
  FOR SELECT USING (auth.uid() = user_id);
```

### 3. データベース関数の作成

```sql
-- クレジット追加関数
CREATE OR REPLACE FUNCTION add_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT
)
RETURNS void AS $$
BEGIN
  -- クレジット残高を更新
  INSERT INTO credits (user_id, balance)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id)
  DO UPDATE SET
    balance = credits.balance + p_amount,
    updated_at = NOW();

  -- 履歴に記録
  INSERT INTO credit_ledger (user_id, amount, description)
  VALUES (p_user_id, p_amount, p_description);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- クレジット控除関数
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT
)
RETURNS void AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  -- 現在の残高を取得
  SELECT balance INTO current_balance
  FROM credits
  WHERE user_id = p_user_id;

  -- 残高チェック
  IF current_balance IS NULL OR current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  -- クレジット残高を更新
  UPDATE credits
  SET balance = balance - p_amount, updated_at = NOW()
  WHERE user_id = p_user_id;

  -- 履歴に記録（マイナス値で記録）
  INSERT INTO credit_ledger (user_id, amount, description)
  VALUES (p_user_id, -p_amount, p_description);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4. 認証設定

Supabase Dashboard > Authentication > Settings:

- **Site URL**: `https://your-domain.com`
- **Redirect URLs**: 以下を追加
  - `https://your-domain.com/auth/callback`
  - `http://localhost:3000/auth/callback` （開発用）

### 5. メールテンプレート

Authentication > Email Templates で以下のテンプレートをカスタマイズ：

- **Confirm signup**: アカウント確認メール
- **Invite user**: ユーザー招待メール
- **Magic Link**: マジックリンク認証メール
- **Change Email Address**: メールアドレス変更確認
- **Reset Password**: パスワードリセット

---

## 外部サービスの設定

### Stripe Webhookの設定

1. [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks) にアクセス
2. "Add endpoint" をクリック
3. Endpoint URL: `https://your-domain.com/api/stripe/webhook`
4. Events to send: 以下を選択
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Webhook signing secret をコピーして `STRIPE_WEBHOOK_SECRET` に設定

### Resendドメイン認証

1. [Resend Dashboard > Domains](https://resend.com/domains) にアクセス
2. "Add Domain" をクリック
3. ドメインのDNSレコードに指定されたレコードを追加
4. 認証完了後、`RESEND_FROM_EMAIL` を設定

### Sentry プロジェクト作成（オプション）

1. [Sentry](https://sentry.io/) でプロジェクトを作成
2. Platform: Next.js を選択
3. DSN をコピーして環境変数に設定
4. Auth Token を生成（Scope: `project:releases`, `project:write`）

---

## カスタムドメインの設定

### 1. Vercelでドメインを追加

1. Vercel Dashboard > Project Settings > Domains
2. "Add" をクリックしてドメインを入力
3. DNSプロバイダーで指定されたレコードを追加：

**Aレコード（ルートドメイン）**:
```
Type: A
Name: @
Value: 76.76.21.21
```

**CNAMEレコード（サブドメイン）**:
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 2. SSL証明書の自動発行

Vercelが自動的にSSL証明書を発行します（Let's Encrypt）。
通常、数分〜1時間以内に発行されます。

### 3. 環境変数の更新

ドメイン設定後、以下の環境変数を更新：
```
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

## デプロイ後の確認

### 1. 基本動作確認

- [ ] トップページが正常に表示される
- [ ] サインアップ/ログインが動作する
- [ ] ダッシュボードにアクセスできる
- [ ] クレジット購入が動作する
- [ ] AI画像生成が動作する
- [ ] お問い合わせフォームからメールが送信される

### 2. パフォーマンス確認

Chrome DevTools > Lighthouse でスコアを確認：

- **Performance**: 90点以上
- **Accessibility**: 90点以上
- **Best Practices**: 90点以上
- **SEO**: 90点以上

### 3. Core Web Vitals確認

- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

### 4. セキュリティ確認

[セキュリティチェックリスト](SECURITY_CHECKLIST.md) を参照してください。

### 5. エラー監視

Sentryダッシュボードでエラーが発生していないか確認。

---

## トラブルシューティング

### デプロイが失敗する

**症状**: ビルドエラーが発生する

**解決策**:
```bash
# ローカルで本番ビルドを試す
npm run build

# エラーがあれば修正
npm run lint
```

### 環境変数が反映されない

**症状**: APIキーが認識されない

**解決策**:
1. Vercel Dashboard > Settings > Environment Variables で変数を確認
2. すべての環境（Production/Preview/Development）にチェックが入っているか確認
3. Redeploy を実行

### Supabase認証エラー

**症状**: ログインできない、リダイレクトエラー

**解決策**:
1. Supabase Dashboard > Authentication > Settings
2. Site URL と Redirect URLs が正しく設定されているか確認
3. `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` が正しいか確認

### Stripe Webhookが動作しない

**症状**: 決済後にクレジットが付与されない

**解決策**:
1. Stripe Dashboard > Webhooks でエンドポイントのステータスを確認
2. `STRIPE_WEBHOOK_SECRET` が正しく設定されているか確認
3. Webhook のイベントログでエラーを確認

### メール送信エラー

**症状**: お問い合わせメールが送信されない

**解決策**:
1. Resend Dashboard でドメイン認証が完了しているか確認
2. `RESEND_API_KEY` が正しく設定されているか確認
3. `RESEND_FROM_EMAIL` がドメイン認証済みアドレスか確認

### 画像生成エラー

**症状**: DALL-E 3画像生成が失敗する

**解決策**:
1. `OPENAI_API_KEY` が正しく設定されているか確認
2. OpenAI アカウントに十分な残高があるか確認
3. APIキーの権限設定を確認

---

## 継続的デプロイメント

GitHubのmainブランチにプッシュすると、Vercelが自動的にデプロイします。

```bash
# 変更をプッシュ
git add .
git commit -m "Update feature"
git push origin main

# Vercelが自動的にビルド・デプロイ
```

### Preview Deployments

プルリクエストを作成すると、Vercelが自動的にプレビュー環境を作成します。

---

## サポート

問題が解決しない場合：

- [Vercel サポート](https://vercel.com/support)
- [Supabase ドキュメント](https://supabase.com/docs)
- [Next.js ドキュメント](https://nextjs.org/docs)

---

## チェックリスト

デプロイ完了前に以下を確認してください：

- [ ] すべての環境変数が設定されている
- [ ] Supabaseのテーブルとポリシーが作成されている
- [ ] Stripe Webhookが設定されている
- [ ] Resendドメイン認証が完了している
- [ ] カスタムドメインが設定されている（オプション）
- [ ] SSL証明書が発行されている
- [ ] 基本動作確認が完了している
- [ ] Lighthouseスコアが90点以上
- [ ] セキュリティチェックが完了している
- [ ] Sentryエラー監視が動作している（オプション）
