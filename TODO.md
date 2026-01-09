# 残タスク（TODO）

このファイルには、未実装の機能や、実装は完了しているが設定・テストが未完了のタスクを記録します。

---

## 📝 Phase 5 関連の残タスク

### 1. パスワードリセット機能の実装

**状態:** 未実装

**必要な作業:**

#### 1.1. パスワードリセット申請画面の作成
- `app/auth/reset-password/page.tsx` - メールアドレス入力画面

#### 1.2. パスワード変更画面の作成
- `app/auth/update-password/page.tsx` - 新しいパスワード設定画面
  - メール内のリンクからアクセス

#### 1.3. API エンドポイントの作成
```typescript
// app/api/auth/reset-password/route.ts
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/update-password`,
});
```

#### 1.4. メールテンプレート
- Resend でパスワードリセットメールを送信（Supabase Email Hook 経由）

**参考リンク:**
- [Supabase Auth - Reset Password](https://supabase.com/docs/guides/auth/passwords#reset-password)

---

### 2. Google OAuth の実装

**状態:** 未実装

**必要な作業:**

#### 2.1. Supabase でプロバイダー設定
1. Supabase Dashboard > Authentication > Providers
2. Google を有効化
3. Google Cloud Console で OAuth クライアント作成
4. Client ID と Client Secret を Supabase に設定

#### 2.2. ログイン/サインアップ画面に Google ボタン追加
```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
  },
});
```

#### 2.3. Callback 処理
- `app/auth/callback/route.ts` で OAuth コールバックを処理
- 初回ログイン時に `users` テーブルにユーザー情報を作成

**参考リンク:**
- [Supabase Auth - Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google)

---

## 🔄 Phase 6 関連の残タスク

### 1. Instagram API 連携のセットアップとテスト

**状態:** コード実装完了 / API 設定未完了

**実装済みファイル:**
- [lib/integrations/instagram.ts](lib/integrations/instagram.ts) - Instagram API ヘルパー
- [app/api/cron/refresh-tokens/route.ts](app/api/cron/refresh-tokens/route.ts) - トークンリフレッシュ Cron

**必要な作業:**

#### 1.1. Meta for Developers でアプリを作成
1. [Meta for Developers](https://developers.facebook.com/apps/) にアクセス
2. 新しいアプリを作成（種類: Business）
3. Instagram Basic Display API を追加
4. App ID と App Secret を取得

#### 1.2. 環境変数の設定
```bash
INSTAGRAM_APP_ID=your_instagram_app_id
INSTAGRAM_APP_SECRET=your_instagram_app_secret
```

#### 1.3. OAuth フローの実装
- ユーザーが Instagram アカウントを連携するための OAuth フローを実装
- 現在の `app/api/integrations/instagram/route.ts` はダミー実装

**参考リンク:**
- [Instagram Basic Display API - Getting Started](https://developers.facebook.com/docs/instagram-basic-display-api/getting-started)
- [Instagram Long-Lived Tokens](https://developers.facebook.com/docs/instagram-basic-display-api/guides/long-lived-access-tokens)

---

### 2. X (Twitter) API 連携のセットアップとテスト

**状態:** コード実装完了 / API 設定未完了

**実装済みファイル:**
- [lib/integrations/x.ts](lib/integrations/x.ts) - X API ヘルパー（レートリミット対応）
- [app/api/cron/process-scheduled-posts/route.ts](app/api/cron/process-scheduled-posts/route.ts) - 予約投稿ワーカー

**必要な作業:**

#### 2.1. X Developer Portal でアプリを作成
1. [X Developer Portal](https://developer.twitter.com/en/portal/dashboard) にアクセス
2. プロジェクトとアプリを作成
3. API Key, API Secret, Bearer Token を取得
4. OAuth 2.0 を有効化（ユーザー認証用）

#### 2.2. 環境変数の設定
```bash
X_API_KEY=your_x_api_key
X_API_SECRET=your_x_api_secret
X_BEARER_TOKEN=your_x_bearer_token
```

#### 2.3. OAuth フローの実装
- ユーザーが X アカウントを連携するための OAuth 2.0 フローを実装
- 現在の `app/api/integrations/x/route.ts` はダミー実装の可能性

#### 2.4. レートリミットのテスト
- 実際に API を呼び出してレートリミット管理が機能することを確認
- `checkRateLimitStatus()` 関数のテスト

**参考リンク:**
- [X API Documentation](https://developer.twitter.com/en/docs/twitter-api)
- [X API Rate Limits](https://developer.twitter.com/en/docs/twitter-api/rate-limits)
- [OAuth 2.0 Authorization Code Flow with PKCE](https://developer.twitter.com/en/docs/authentication/oauth-2-0/authorization-code)

**注意事項:**
- X API は無料プランでは機能制限が厳しい（月間 1,500 ツイート、読み取りのみなど）
- 投稿機能を使うには Basic プラン（$100/月）以上が必要

---

### 3. WordPress API 連携のテスト

**状態:** コード実装完了 / テスト未完了

**実装済みファイル:**
- [lib/integrations/wordpress.ts](lib/integrations/wordpress.ts) - WordPress API ヘルパー（セキュリティ強化版）

**必要な作業:**

#### 3.1. テスト用 WordPress サイトの準備
- ローカル環境: Local by Flywheel, XAMPP, Docker など
- または: WordPress.com の無料プラン

#### 3.2. Application Password の作成
1. WordPress 管理画面 > ユーザー > プロフィール
2. 「アプリケーションパスワード」セクション
3. 新しいアプリケーションパスワードを作成

#### 3.3. 接続テスト
```typescript
import { testWordPressConnection } from "@/lib/integrations/wordpress";

const result = await testWordPressConnection(
  "https://your-site.com",
  "username",
  "xxxx xxxx xxxx xxxx xxxx xxxx"  // Application Password
);
```

#### 3.4. セキュリティ対策のテスト
- SSRF 対策: ローカルホストへのアクセスが拒否されることを確認
- XSS 対策: `<script>` タグが除去されることを確認

**参考リンク:**
- [WordPress REST API Handbook](https://developer.wordpress.org/rest-api/)
- [Application Passwords](https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/)

---

## 💡 実装のヒント

### Instagram/X OAuth フローの実装パターン

```typescript
// app/api/integrations/instagram/oauth/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  // 1. 認可コードをアクセストークンに交換
  const tokenResponse = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    body: JSON.stringify({
      client_id: process.env.INSTAGRAM_APP_ID,
      client_secret: process.env.INSTAGRAM_APP_SECRET,
      grant_type: "authorization_code",
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/instagram/oauth`,
      code,
    }),
  });

  const { access_token, user_id } = await tokenResponse.json();

  // 2. Short-Lived Token を Long-Lived Token に交換
  const longLivedResponse = await fetch(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.INSTAGRAM_APP_SECRET}&access_token=${access_token}`
  );

  const { access_token: longLivedToken, expires_in } = await longLivedResponse.json();

  // 3. データベースに保存
  await supabase.from("integrations").insert({
    user_id: currentUserId,
    platform: "instagram",
    access_token: longLivedToken,
    token_expires_at: new Date(Date.now() + expires_in * 1000),
    // ...
  });

  return NextResponse.redirect("/integrations?success=instagram");
}
```

---

## 🎨 Phase 7 関連の残タスク（UI/UX 仕上げと法的対応）

### 1. 設定画面（Settings）の実装

**状態:** 未実装

**必要な作業:**

#### 1.1. 設定画面のルーティング
- `app/settings/page.tsx` - メイン設定画面
- `app/settings/profile/page.tsx` - プロフィール変更
- `app/settings/billing/page.tsx` - プラン・請求管理
- `app/settings/account/page.tsx` - アカウント削除

#### 1.2. プロフィール変更機能
- 名前、メールアドレスの変更
- パスワード変更へのリンク

#### 1.3. プラン管理機能
- 現在のプランの表示
- Stripe Customer Portal へのリンク生成
```typescript
const { url } = await stripe.billingPortal.sessions.create({
  customer: stripeCustomerId,
  return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
});
```

#### 1.4. アカウント削除機能
- 削除前の確認ダイアログ
- Stripe サブスクリプションのキャンセル
- データベースからユーザーデータの削除（または論理削除）

---

### 2. 法的ページの作成

**状態:** 未実装

**必要な作業:**

#### 2.1. 利用規約ページ
- `app/terms/page.tsx`
- サービスの利用条件、禁止事項、責任制限など

#### 2.2. プライバシーポリシーページ
- `app/privacy/page.tsx`
- 個人情報の取得・利用・管理方法
- Cookie ポリシー
- 第三者サービス（Google Analytics, Sentry など）への情報提供

#### 2.3. 特定商取引法に基づく表記
- `app/legal/page.tsx`
- 事業者名、住所、連絡先
- 商品・サービスの内容
- 返金・解約ポリシー
- クーリングオフの有無

#### 2.4. フッターへのリンク追加
- すべてのページからアクセス可能に
- `components/footer.tsx` の作成

#### 2.5. サインアップ時の同意チェックボックス
- 利用規約とプライバシーポリシーへの同意を必須化
```typescript
<label>
  <input type="checkbox" required />
  <a href="/terms">利用規約</a>と<a href="/privacy">プライバシーポリシー</a>に同意します
</label>
```

---

### 3. クリエイティブ生成機能の実装

**状態:** 部分的に実装（画像生成はダミー、動画生成は未実装）

**必要な作業:**

#### 3.1. DALL-E 3 による画像生成の実装
- OpenAI API キーの設定
- `lib/ai/image-generation.ts` - 画像生成ヘルパー
- クレジット消費ロジック（10 クレジット）
- 生成失敗時のポイント返還

**環境変数:**
```bash
OPENAI_API_KEY=your_openai_api_key
```

#### 3.2. Runway Gen-3 Alpha による動画生成の実装
- Runway API キーの設定
- `lib/ai/video-generation.ts` - 動画生成ヘルパー
- クレジット消費ロジック（200 クレジット）
- 生成失敗時のポイント返還

**環境変数:**
```bash
RUNWAY_API_KEY=your_runway_api_key
```

#### 3.3. Deep Research 機能の実装
- Gemini 1.5 Pro への切り替え
- より詳細な分析・リサーチツール
- クレジット消費ロジック（50 クレジット）

#### 3.4. プロンプトインジェクション対策
- 暴力的・性的・違法な内容の検出とブロック
- OpenAI Moderation API の利用
```typescript
const moderation = await openai.moderations.create({ input: prompt });
if (moderation.results[0].flagged) {
  throw new Error("このプロンプトは利用規約に違反しています");
}
```

---

### 4. Generative UI の拡張

**状態:** 部分的に実装（PlanningBoard のみ）

**必要な作業:**

#### 4.1. ErrorCard コンポーネント
- クレジット不足エラー時に「チャージする」ボタン表示
- API エラー時に「再試行する」「サポートに連絡」ボタン表示

```typescript
export const ErrorCard = ({ error, onRetry }: { error: string; onRetry?: () => void }) => (
  <div className="error-card">
    <h3>エラーが発生しました</h3>
    <p>{error}</p>
    {error.includes("クレジット") && (
      <Button onClick={() => router.push("/pricing")}>ポイントをチャージ</Button>
    )}
    {onRetry && <Button onClick={onRetry}>再試行する</Button>}
  </div>
);
```

#### 4.2. Confetti エフェクト
- Webサイト完成時、初投稿成功時に紙吹雪
- `canvas-confetti` パッケージの利用

```bash
npm install canvas-confetti
```

```typescript
import confetti from "canvas-confetti";

// 投稿成功時
confetti({
  particleCount: 100,
  spread: 70,
  origin: { y: 0.6 }
});
```

---

### 5. お問い合わせフォームの実装

**状態:** 未実装

**必要な作業:**

#### 5.1. お問い合わせページ
- `app/contact/page.tsx`
- 名前、メールアドレス、問い合わせ内容の入力フォーム

#### 5.2. API エンドポイント
- `app/api/contact/route.ts`
- Resend でお問い合わせメールを送信

#### 5.3. ヘッダーまたはフッターからのリンク
- すべてのページからアクセス可能に

---

### 6. プラン変更処理の実装

**状態:** 部分的に実装（Stripe Checkout は実装済み）

**必要な作業:**

#### 6.1. アップグレード処理
- Free → Pro: Stripe Checkout で即時決済
- サブスクリプション作成

#### 6.2. ダウングレード処理
- Pro → Free: 次回請求期間末までは Pro 機能維持
- Stripe の `cancel_at_period_end` を使用

```typescript
await stripe.subscriptions.update(subscriptionId, {
  cancel_at_period_end: true,
});
```

#### 6.3. プラン変更完了メール
- アップグレード/ダウングレード完了時にメール送信

---

### 7. 最終テスト

**状態:** 未実施

**テスト項目:**

#### 7.1. 新規ユーザー登録フロー
1. サインアップ
2. メール確認
3. ログイン
4. チャットで画像生成（クレジット消費）
5. クレジットチャージ（Stripe 決済）
6. Instagram 連携
7. 投稿予約
8. 投稿実行

#### 7.2. エラーハンドリング
- クレジット不足時のエラー表示
- API エラー時のエラー表示
- 決済失敗時の処理

#### 7.3. セキュリティテスト
- 他人のデータにアクセスできないこと（RLS）
- SSRF 攻撃の防御（WordPress 連携）
- XSS 攻撃の防御（ユーザー入力のサニタイゼーション）

---

## 📅 優先度

| タスク | 優先度 | 理由 |
|--------|--------|------|
| **Phase 5** |
| パスワードリセット | 高 | ユーザーがパスワードを忘れた場合の救済手段 |
| Google OAuth | 中 | UX 向上、登録障壁の軽減 |
| **Phase 6** |
| Instagram API 連携 | 中 | 実際の投稿機能を使うまでは不要 |
| X API 連携 | 中 | 実際の投稿機能を使うまでは不要、有料プラン必要 |
| WordPress API テスト | 低 | 必要なユーザーのみ使用 |
| **Phase 7** |
| 法的ページ（利用規約・プライバシーポリシー・特商法） | 🔴 **最優先** | 法的義務、本番公開前に必須 |
| 設定画面（プロフィール・プラン管理） | 高 | ユーザーが自分のアカウントを管理するために必須 |
| アカウント削除機能 | 高 | 個人情報保護法で削除権が保証されている |
| 画像生成（DALL-E 3） | 中 | 現在ダミー実装、Pro プラン機能として重要 |
| 動画生成（Runway） | 低 | Pro プラン限定、初期は不要 |
| Deep Research | 低 | 付加価値機能、初期は不要 |
| ErrorCard UI | 中 | UX 向上 |
| Confetti エフェクト | 低 | UX 向上、Nice to have |
| お問い合わせフォーム | 中 | ユーザーサポートのために必要 |
| 最終テスト | 高 | 本番公開前の品質保証 |

---

## ✅ 完了したタスクの記録

完了したタスクは以下に記録し、このファイルから削除してください:

### Phase 6 完了タスク
- ✅ Stripe Webhook の強化（Idempotency、ログ記録）
- ✅ Instagram トークンリフレッシュのコード実装
- ✅ X API レートリミット管理のコード実装
- ✅ Vercel Cron 設定ファイルの作成
- ✅ 予約投稿ワーカーの実装
- ✅ WordPress セキュリティ強化の実装
- ✅ Phase 6 マイグレーションの実行

---

**最終更新日:** 2026-01-04

---

## 📝 メモ

### Phase 7 を本番公開前に優先すべき理由

**法的ページ（利用規約・プライバシーポリシー・特商法）** は本番公開前に必須です。これらがないまま有料サービスを提供すると、以下の法的リスクがあります:

1. **個人情報保護法違反**: プライバシーポリシーなしで個人情報を取得・利用すると違法
2. **特定商取引法違反**: 通信販売で特商法表記がないと行政処分の対象
3. **利用規約なし**: ユーザーとの契約関係が不明確になり、トラブル時に対処困難

**推奨される実装順序:**

1. 🔴 **最優先**: 法的ページ（利用規約・プライバシーポリシー・特商法）
2. 高優先: 設定画面（プロフィール・プラン管理・アカウント削除）
3. 高優先: パスワードリセット機能
4. 中優先: 画像生成（DALL-E 3）の実装
5. 中優先: お問い合わせフォーム
6. 低優先: Instagram/X API 連携（実際に投稿する段階で実装）
7. 低優先: 動画生成、Deep Research、Confetti などの付加価値機能

**最終更新日:** 2026-01-04
