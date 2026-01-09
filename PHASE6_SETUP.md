# Phase 6: API とロジックの堅牢化 - セットアップガイド

Phase 6 では、以下の API とロジックの堅牢化を実装しました:

1. **Stripe Webhook の強化** - 署名検証とイベント重複処理の防止
2. **Instagram API トークンリフレッシュ** - 自動トークン更新による連携維持
3. **X API レートリミット管理** - 制限超過の防止と自動リトライ
4. **予約投稿ワーカー** - Cron ジョブによる自動投稿処理
5. **WordPress API セキュリティ** - SSRF/XSS 対策の実装

---

## 📋 実装内容

### 1. Stripe Webhook の強化

#### idempotency（重複処理防止）

Stripe は同じイベントを複数回送信する可能性があるため、`stripe_events` テーブルでイベント ID を記録し、重複処理を防止します。

```typescript
// イベント ID をチェック
const { data: existingEvent } = await supabase
  .from("stripe_events")
  .select("id")
  .eq("id", event.id)
  .single();

if (existingEvent) {
  return NextResponse.json({ received: true, status: "already_processed" });
}
```

#### webhook_logs テーブル

すべての Webhook イベントをログに記録し、監視・デバッグを容易にします。

```typescript
await supabase.from("webhook_logs").insert({
  source: "stripe",
  event_type: event.type,
  status: "success",
  metadata: { user_id, credits, new_balance },
});
```

### 2. Instagram API トークンリフレッシュ

#### Long-Lived トークンの自動更新

Instagram の Long-Lived トークンは 60 日で期限切れになるため、定期的にリフレッシュが必要です。

**リフレッシュロジック:**
```typescript
// 有効期限が 30 日以内の連携を取得
const { data: integrations } = await supabase
  .from("integrations")
  .select("*")
  .eq("platform", "instagram")
  .eq("is_valid", true)
  .lt("token_expires_at", thirtyDaysFromNow);

// 各トークンをリフレッシュ
for (const integration of integrations) {
  const result = await refreshInstagramToken(integration.access_token);

  if (result.success) {
    await supabase
      .from("integrations")
      .update({ token_expires_at: result.newExpiresAt })
      .eq("id", integration.id);
  }
}
```

### 3. X API レートリミット管理

#### レートリミット情報の追跡

X API のレスポンスヘッダーからレートリミット情報を抽出し、制限超過を防ぎます。

```typescript
const rateLimitInfo = {
  limit: parseInt(headers.get("x-rate-limit-limit")),
  remaining: parseInt(headers.get("x-rate-limit-remaining")),
  reset: parseInt(headers.get("x-rate-limit-reset")),
};

// 残りが少ない場合は警告
if (rateLimitInfo.remaining < 10) {
  Sentry.captureMessage("X API rate limit running low", { level: "warning" });
}
```

#### Exponential Backoff によるリトライ

レートリミット超過時は、リセット時刻まで待機してからリトライします。

```typescript
if (isRateLimitError(res.status)) {
  const waitTime = calculateBackoffTime(rateLimitInfo.reset);
  await new Promise((resolve) => setTimeout(resolve, waitTime));
  throw new Error("Rate limit exceeded, retrying...");
}
```

### 4. 予約投稿ワーカー

#### Vercel Cron による定期実行

`vercel.json` で Cron ジョブを設定:

```json
{
  "crons": [
    {
      "path": "/api/cron/refresh-tokens",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/process-scheduled-posts",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

#### 予約投稿の処理フロー

1. `scheduled_at` が現在時刻以前の投稿を取得
2. プラットフォームごとに投稿を実行
3. 成功: `status = 'published'`, `published_at` を更新
4. 失敗: `status = 'failed'`, `error_message` を記録

### 5. WordPress API セキュリティ

#### SSRF（Server-Side Request Forgery）対策

サイト URL を検証し、ローカルホスト・プライベート IP へのリクエストを禁止:

```typescript
// localhost, 127.0.0.1, 192.168.x.x, 10.x.x.x などを拒否
if (
  hostname === "localhost" ||
  hostname.startsWith("192.168.") ||
  hostname.startsWith("10.")
) {
  return { valid: false, error: "Local and private IP addresses are not allowed" };
}
```

#### XSS（Cross-Site Scripting）対策

HTML コンテンツから危険なタグとスクリプトを除去:

```typescript
const dangerousPatterns = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, // onclick, onerror, etc.
];
```

#### Application Password による認証

WordPress の Application Password を使用し、本パスワードを使用しない安全な認証:

```typescript
const credentials = Buffer.from(`${username}:${applicationPassword}`).toString("base64");

headers: {
  Authorization: `Basic ${credentials}`,
}
```

---

## 🚀 セットアップ手順

### 1. マイグレーションの実行

Supabase Dashboard の SQL Editor で以下のマイグレーションを実行:

```bash
supabase/migrations/20260104_phase6_webhook_idempotency.sql
```

または、Supabase CLI を使用:

```bash
supabase db push
```

### 2. 実行内容の確認

以下が正しく作成されたか確認:

✅ **stripe_events テーブル**
```sql
SELECT * FROM public.stripe_events LIMIT 5;
```

✅ **webhook_logs テーブル**
```sql
SELECT * FROM public.webhook_logs LIMIT 5;
```

✅ **クリーンアップ関数**
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('cleanup_old_webhook_logs', 'cleanup_old_stripe_events');
```

### 3. 環境変数の設定

`.env.local` に以下を追加:

```bash
# Instagram API
INSTAGRAM_APP_ID=your_instagram_app_id
INSTAGRAM_APP_SECRET=your_instagram_app_secret

# X (Twitter) API
X_API_KEY=your_x_api_key
X_API_SECRET=your_x_api_secret
X_BEARER_TOKEN=your_x_bearer_token

# Cron Jobs
CRON_SECRET=your_cron_secret  # ランダムな文字列 (openssl rand -base64 32)
```

**Cron Secret の生成方法:**

```bash
# macOS / Linux
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### 4. Vercel でのデプロイ設定

#### Vercel Dashboard で環境変数を設定

1. Vercel Dashboard を開く
2. プロジェクトの Settings > Environment Variables
3. 上記の環境変数を追加（Production, Preview, Development）

#### Cron Jobs の有効化

Vercel では `vercel.json` に記述した Cron ジョブが自動的に有効化されます。

**確認方法:**
1. Vercel Dashboard > Settings > Cron Jobs
2. 設定された Cron ジョブが表示される
3. 実行ログを確認

### 5. 開発サーバーの再起動

```bash
# 現在のサーバーを停止（Ctrl+C）
npm run dev
```

---

## 🧪 動作確認

### 1. Stripe Webhook の Idempotency テスト

#### Stripe CLI で同じイベントを複数回送信

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook

# 別のターミナルで
stripe trigger checkout.session.completed
stripe trigger checkout.session.completed  # 同じイベントを再送
```

#### 期待される結果

1. **1 回目**: クレジット付与成功、`stripe_events` に記録
2. **2 回目**: `already_processed` でスキップ、重複付与なし

#### 確認

```sql
SELECT * FROM public.stripe_events ORDER BY created_at DESC LIMIT 5;
SELECT * FROM public.webhook_logs WHERE source = 'stripe' ORDER BY created_at DESC LIMIT 5;
```

### 2. Instagram トークンリフレッシュのテスト

#### 手動でリフレッシュを実行

```bash
curl -X GET http://localhost:3000/api/cron/refresh-tokens \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

#### 期待される結果

```json
{
  "success": true,
  "instagram": {
    "refreshed": 1,
    "failed": 0,
    "errors": []
  }
}
```

#### データベース確認

```sql
SELECT id, platform, token_expires_at, is_valid
FROM public.integrations
WHERE platform = 'instagram';
```

`token_expires_at` が更新されていることを確認。

### 3. X API レートリミットのテスト

#### レートリミット情報の確認

```typescript
import { checkRateLimitStatus } from "@/lib/integrations/x";

const status = await checkRateLimitStatus();
console.log(status);
// { available: true, message: "Rate limit OK", rateLimitInfo: {...} }
```

#### Webhook ログの確認

```sql
SELECT * FROM public.webhook_logs
WHERE source = 'x' AND event_type = 'rate_limit_exceeded'
ORDER BY created_at DESC;
```

### 4. 予約投稿ワーカーのテスト

#### テスト用の予約投稿を作成

```sql
INSERT INTO public.posts (user_id, platform, content, status, scheduled_at)
VALUES (
  'your-user-id',
  'x',
  'これはテスト投稿です',
  'scheduled',
  NOW() - INTERVAL '1 minute'  -- 1分前（すぐに処理される）
);
```

#### Cron ジョブを手動実行

```bash
curl -X GET http://localhost:3000/api/cron/process-scheduled-posts \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

#### 期待される結果

```json
{
  "success": true,
  "processed": 1,
  "succeeded": 1,
  "failed": 0,
  "errors": []
}
```

#### データベース確認

```sql
SELECT id, platform, content, status, published_at, error_message
FROM public.posts
WHERE status IN ('published', 'failed')
ORDER BY created_at DESC
LIMIT 5;
```

`status = 'published'` かつ `published_at` が設定されていることを確認。

### 5. WordPress セキュリティのテスト

#### SSRF 対策のテスト

```typescript
import { testWordPressConnection } from "@/lib/integrations/wordpress";

// ローカルホストへのアクセスは拒否される
const result = await testWordPressConnection(
  "http://localhost:8080",
  "admin",
  "password"
);
console.log(result);
// { success: false, error: "Only HTTPS URLs are allowed..." }
```

#### XSS 対策のテスト

```typescript
import { createWordPressPost } from "@/lib/integrations/wordpress";

const result = await createWordPressPost(
  "https://example.com",
  "admin",
  "app-password",
  {
    title: "テスト投稿",
    content: '<script>alert("XSS")</script><p>安全なコンテンツ</p>',
    status: "draft",
  }
);

// <script> タグは除去される
```

---

## 🔒 セキュリティチェックリスト

Phase 6 をデプロイする前に確認:

- ✅ **stripe_events テーブルが作成されている**
  - イベントの重複処理が防止される

- ✅ **webhook_logs テーブルが作成されている**
  - すべての Webhook イベントがログに記録される

- ✅ **Cron Secret が設定されている**
  - 本番環境では必須（`CRON_SECRET` 環境変数）

- ✅ **Instagram/X API の認証情報が設定されている**
  - 環境変数: `INSTAGRAM_APP_ID`, `X_BEARER_TOKEN` など

- ✅ **WordPress API で SSRF 対策が有効**
  - ローカルホスト・プライベート IP へのアクセスが拒否される

- ✅ **WordPress API で XSS 対策が有効**
  - 危険なタグとスクリプトが除去される

- ✅ **Sentry でエラーが監視されている**
  - API エラー、レートリミット超過が Sentry に送信される

---

## 📊 監視とメンテナンス

### 1. Webhook ログの監視

```sql
-- 最近の失敗した Webhook を確認
SELECT * FROM public.webhook_logs
WHERE status = 'failed'
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- プラットフォームごとの成功率
SELECT
  source,
  COUNT(*) FILTER (WHERE status = 'success') as success_count,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'success') / COUNT(*), 2) as success_rate
FROM public.webhook_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY source;
```

### 2. レートリミット状況の監視

```sql
-- X API のレートリミット超過イベント
SELECT * FROM public.webhook_logs
WHERE source = 'x'
AND event_type = 'rate_limit_exceeded'
ORDER BY created_at DESC
LIMIT 10;
```

### 3. 古いログの削除（定期実行）

```sql
-- 手動で実行する場合
SELECT public.cleanup_old_webhook_logs();  -- 30日以上前のログを削除
SELECT public.cleanup_old_stripe_events(); -- 90日以上前のイベントを削除
```

定期的に実行するには、Vercel Cron に追加:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-logs",
      "schedule": "0 2 * * 0"
    }
  ]
}
```

### 4. Cron ジョブの実行状況を確認

Vercel Dashboard:
1. プロジェクト > Deployments
2. Cron ジョブの実行ログを確認
3. エラーがあれば Sentry で詳細を確認

---

## 🐛 トラブルシューティング

### エラー: "table stripe_events does not exist"

**原因:** マイグレーションが実行されていない

**解決策:**
```sql
-- Supabase Dashboard の SQL Editor で実行
\i supabase/migrations/20260104_phase6_webhook_idempotency.sql
```

### エラー: "Unauthorized" (Cron ジョブ)

**原因:** `CRON_SECRET` が設定されていない、または間違っている

**確認:**
```bash
# .env.local を確認
cat .env.local | grep CRON_SECRET

# Vercel Dashboard で環境変数を確認
```

**解決策:**
```bash
# 新しいシークレットを生成
openssl rand -base64 32

# .env.local と Vercel Dashboard で設定
```

### エラー: "Instagram API credentials not configured"

**原因:** `INSTAGRAM_APP_ID` または `INSTAGRAM_APP_SECRET` が未設定

**解決策:**
1. Meta for Developers でアプリを作成
2. App ID と App Secret を取得
3. `.env.local` と Vercel Dashboard で設定

### エラー: "X API rate limit exceeded"

**原因:** X API のレートリミットに達した

**確認:**
```sql
SELECT * FROM public.webhook_logs
WHERE source = 'x' AND event_type = 'rate_limit_exceeded'
ORDER BY created_at DESC LIMIT 1;
```

**解決策:**
- レートリミットがリセットされるまで待機（通常 15 分）
- API 呼び出しの頻度を減らす
- より高い API プランにアップグレード

### 予約投稿が実行されない

**原因:** Cron ジョブが実行されていない

**確認:**
```bash
# ローカル環境で手動実行
curl -X GET http://localhost:3000/api/cron/process-scheduled-posts \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**解決策:**
1. Vercel Dashboard で Cron ジョブが有効か確認
2. `vercel.json` が正しく設定されているか確認
3. デプロイ後に Cron ジョブが自動的に有効化される

---

## 📚 参考リンク

- [Stripe Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Instagram Basic Display API - Long-Lived Tokens](https://developers.facebook.com/docs/instagram-basic-display-api/guides/long-lived-access-tokens)
- [X (Twitter) API Rate Limits](https://developer.twitter.com/en/docs/twitter-api/rate-limits)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [WordPress REST API Authentication](https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/)
- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)

---

## 🎉 Phase 6 完了

これで API とロジックの堅牢化が完了しました。

次のステップ（Phase 7）では、UI/UX の改善とパフォーマンス最適化を行います:

- アニメーションとトランジションの追加
- モバイル対応の強化
- ページ読み込み速度の最適化
- アクセシビリティの向上

ご質問やエラーが発生した場合は、お気軽にお知らせください。
