# Phase 4: 本番インフラ整備 - セットアップガイド

Phase 4 では、以下の本番環境向け機能を実装しました:

1. **環境変数の型安全な管理** - Zod によるバリデーション
2. **Sentry によるエラー監視** - クライアント/サーバー両方
3. **Resend によるトランザクションメール** - 認証メール、購入確認メールなど

## 📋 前提条件

以下のアカウントとサービスのセットアップが必要です:

- ✅ Supabase プロジェクト
- ✅ Stripe アカウント（テスト/本番）
- ✅ Google AI Studio（Gemini API）
- 🆕 Sentry プロジェクト
- 🆕 Resend アカウント

---

## 1️⃣ パッケージのインストール

```bash
npm install
```

新しく追加されたパッケージ:
- `@sentry/nextjs` - エラー監視
- `resend` - トランザクションメール送信

---

## 2️⃣ Sentry のセットアップ

### 2-1. Sentry プロジェクトの作成

1. [Sentry](https://sentry.io/) にサインアップ
2. 新しいプロジェクトを作成（Platform: Next.js を選択）
3. DSN（Data Source Name）をコピー

### 2-2. 環境変数の設定

`.env.local` に以下を追加:

```env
# Sentry（エラー監視）
SENTRY_DSN=https://your-key@o123456.ingest.sentry.io/123456
NEXT_PUBLIC_SENTRY_DSN=https://your-key@o123456.ingest.sentry.io/123456

# ビルド時のソースマップアップロード用（オプション）
SENTRY_ORG=your_organization_slug
SENTRY_PROJECT=your_project_name
SENTRY_AUTH_TOKEN=your_auth_token
```

### 2-3. 動作確認

開発サーバーを起動して、エラーを意図的に発生させてテスト:

```bash
npm run dev
```

エラーが Sentry ダッシュボードに表示されることを確認してください。

**重要:** 開発環境では `enabled: false` にしてノイズを減らすことも可能です（[sentry.client.config.ts:11](sentry.client.config.ts#L11)）

---

## 3️⃣ Resend のセットアップ

### 3-1. Resend アカウントの作成

1. [Resend](https://resend.com/) にサインアップ
2. ドメインを追加して認証（DNS 設定が必要）
   - TXT、MX、CNAME レコードを追加
3. API キーを取得

### 3-2. 環境変数の設定

`.env.local` に以下を追加:

```env
# Resend（トランザクションメール）
RESEND_API_KEY=re_123456789
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### 3-3. Supabase Auth Email Hook の設定

Supabase で認証メールを Resend 経由で送信するように設定:

1. Supabase Dashboard → **Authentication** → **Email Templates**
2. 各テンプレート（Confirm signup, Reset password）で **Use custom SMTP** を無効化
3. **Authentication** → **Hooks** → **Send Email Hook** を有効化
4. Webhook URL を設定:
   ```
   https://your-domain.com/api/auth/email-hook
   ```
5. Webhook Secret を生成して、`.env.local` に追加:
   ```env
   SUPABASE_WEBHOOK_SECRET=your_webhook_secret
   ```

### 3-4. メールテンプレートのカスタマイズ

メールテンプレートは [lib/email/resend.ts](lib/email/resend.ts) で管理されています:

- `sendWelcomeEmail()` - アカウント登録確認メール
- `sendPasswordResetEmail()` - パスワードリセットメール
- `sendCreditPurchaseEmail()` - ポイント購入完了メール

必要に応じて HTML/テキストをカスタマイズしてください。

---

## 4️⃣ 環境変数の完全な設定

`.env.local` に以下をすべて設定してください（[.env.example](.env.example) を参照）:

```env
# Node 環境
NODE_ENV=development

# Google AI (Gemini)
GOOGLE_GENERATIVE_AI_API_KEY=your_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_WEBHOOK_SECRET=your_webhook_secret

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ORG=your_org
SENTRY_PROJECT=your_project
SENTRY_AUTH_TOKEN=your_token

# Resend
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=noreply@yourdomain.com

# アプリケーション URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 5️⃣ 開発サーバーの起動

すべての設定が完了したら、開発サーバーを起動:

```bash
npm run dev
```

### 動作確認チェックリスト

- ✅ アプリが起動する（エラーが出ない）
- ✅ Sentry にエラーが送信される（テストエラーを発生させる）
- ✅ 新規ユーザー登録でメールが届く
- ✅ パスワードリセットでメールが届く
- ✅ ポイント購入後に確認メールが届く

---

## 6️⃣ Vercel へのデプロイ（本番環境）

### 6-1. Vercel プロジェクトの作成

```bash
# Vercel CLI をインストール（未インストールの場合）
npm install -g vercel

# ログイン
vercel login

# プロジェクトをリンク
vercel link

# 環境変数を設定
vercel env add SENTRY_DSN production
vercel env add RESEND_API_KEY production
# ... すべての環境変数を設定
```

または、Vercel Dashboard から手動で設定してください。

### 6-2. Stripe Webhook の本番設定

1. [Stripe Dashboard](https://dashboard.stripe.com/webhooks) でエンドポイントを追加
2. Endpoint URL: `https://your-domain.vercel.app/api/stripe/webhook`
3. イベント選択: `checkout.session.completed`
4. Signing secret を `.env` に追加

### 6-3. Supabase Email Hook の本番設定

1. Supabase Dashboard → Authentication → Hooks
2. Send Email Hook URL を本番 URL に変更:
   ```
   https://your-domain.vercel.app/api/auth/email-hook
   ```

### 6-4. デプロイ

```bash
vercel --prod
```

---

## 7️⃣ セキュリティチェックリスト

本番環境にデプロイする前に確認:

- ✅ `.env.local` を `.gitignore` に追加（コミットしない）
- ✅ Stripe は本番キーを使用（`sk_live_` で始まる）
- ✅ Sentry の `enabled` が `production` のみで有効
- ✅ エラーメッセージに機密情報が含まれていない
- ✅ CORS 設定が適切（必要な場合）
- ✅ Rate Limiting を実装（必要な場合）

---

## 8️⃣ エラー監視の確認

### Sentry ダッシュボード

- **Issues**: 発生したエラーの一覧
- **Performance**: API レスポンス時間の監視
- **Releases**: デプロイバージョンの追跡

### アラート設定

Sentry で以下のアラートを設定することを推奨:

1. エラー率が 1% を超えた場合
2. 特定のエラーが 10回/時間 を超えた場合
3. API レスポンスが 5秒 を超えた場合

---

## 9️⃣ トラブルシューティング

### Sentry にエラーが送信されない

- `SENTRY_DSN` と `NEXT_PUBLIC_SENTRY_DSN` が正しく設定されているか確認
- 開発環境で `enabled: true` に設定してテスト
- ブラウザのネットワークタブで Sentry へのリクエストを確認

### メールが送信されない

- Resend の API キーが正しいか確認
- Resend ダッシュボードでドメイン認証が完了しているか確認
- `RESEND_FROM_EMAIL` が認証済みドメインと一致しているか確認
- Supabase の Email Hook が正しく設定されているか確認

### 環境変数が反映されない

- Next.js では環境変数の変更後、サーバーを再起動する必要があります
- Vercel では環境変数変更後、再デプロイが必要です

---

## 📚 参考リンク

- [Sentry Next.js ドキュメント](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Resend ドキュメント](https://resend.com/docs/introduction)
- [Supabase Auth Hooks](https://supabase.com/docs/guides/auth/auth-hooks)
- [Next.js 環境変数](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

---

## 🎉 Phase 4 完了

これで本番環境向けのインフラ整備が完了しました。

次のステップ（Phase 5）では、データベースと認証の強化を行います:

- RLS（Row Level Security）の設定
- `credit_ledger` テーブルへの移行
- トランザクション処理の実装

ご質問やエラーが発生した場合は、お気軽にお知らせください。
