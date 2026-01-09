# セキュリティチェックリスト

このドキュメントでは、Martyアプリケーションのセキュリティ対策とデプロイ前の確認事項をまとめています。

## 目次

1. [認証とアクセス制御](#認証とアクセス制御)
2. [データベースセキュリティ](#データベースセキュリティ)
3. [API セキュリティ](#apiセキュリティ)
4. [環境変数と機密情報](#環境変数と機密情報)
5. [入力検証とサニタイゼーション](#入力検証とサニタイゼーション)
6. [HTTPS と SSL/TLS](#httpsとssltls)
7. [CORS 設定](#cors設定)
8. [レート制限](#レート制限)
9. [エラーハンドリング](#エラーハンドリング)
10. [依存関係の脆弱性](#依存関係の脆弱性)
11. [サードパーティ統合](#サードパーティ統合)
12. [モニタリングとログ](#モニタリングとログ)

---

## 認証とアクセス制御

### ✅ チェック項目

- [ ] **Supabase認証が正しく設定されている**
  - メール認証が有効
  - パスワードポリシーが適切（最低8文字）
  - セッション管理が適切

- [ ] **認証済みユーザーのみがアクセスできるページが保護されている**
  - `/dashboard` - ログイン必須
  - `/settings` - ログイン必須
  - `/api/*` - 認証チェック実装済み

- [ ] **JWT トークンが安全に管理されている**
  - トークンはhttpOnlyクッキーに保存
  - クライアントサイドのlocalStorageには保存しない
  - トークンの有効期限が適切

- [ ] **パスワードリセットフローが安全**
  - リセットリンクの有効期限が設定されている
  - ワンタイムリンクが使用されている

### 🔒 実装例

```typescript
// サーバーコンポーネントで認証チェック
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 認証済みユーザーのみアクセス可能
  return <Dashboard />;
}
```

---

## データベースセキュリティ

### ✅ チェック項目

- [ ] **Row Level Security (RLS) が有効**
  ```sql
  -- すべてのテーブルでRLSを有効化
  ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
  ```

- [ ] **適切なRLSポリシーが設定されている**
  - ユーザーは自分のデータのみアクセス可能
  - 管理者権限が必要な操作は適切に制限

- [ ] **データベース関数が `SECURITY DEFINER` で保護されている**
  ```sql
  CREATE OR REPLACE FUNCTION deduct_credits(...)
  RETURNS void AS $$
  BEGIN
    -- クレジット残高チェック
    IF current_balance < p_amount THEN
      RAISE EXCEPTION 'Insufficient credits';
    END IF;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  ```

- [ ] **SQLインジェクション対策**
  - Supabaseクライアントを使用（パラメータ化クエリ）
  - 直接SQL文字列を連結しない

- [ ] **機密データの暗号化**
  - パスワードはハッシュ化（Supabaseが自動処理）
  - APIキーは暗号化して保存（必要な場合）

### 🔒 実装例

```typescript
// ✅ 良い例 - パラメータ化クエリ
const { data } = await supabase
  .from("credits")
  .select("balance")
  .eq("user_id", userId)
  .single();

// ❌ 悪い例 - 直接SQL文字列連結（使用しない）
// const query = `SELECT * FROM credits WHERE user_id = '${userId}'`;
```

---

## API セキュリティ

### ✅ チェック項目

- [ ] **すべてのAPIエンドポイントで認証チェック**
  ```typescript
  export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (!user || error) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // API処理
  }
  ```

- [ ] **APIレスポンスに機密情報を含めない**
  - データベースエラーの詳細を露出しない
  - スタックトレースを返さない
  - 内部実装の詳細を隠す

- [ ] **CSRF 対策**
  - Next.js App RouterではデフォルトでCSRF保護あり
  - `SameSite=Lax` クッキー設定

- [ ] **リクエストサイズ制限**
  - ファイルアップロードサイズ制限
  - JSONペイロードサイズ制限

### 🔒 実装例

```typescript
// エラーレスポンスの例
// ✅ 良い例
return NextResponse.json(
  { error: "Invalid request" },
  { status: 400 }
);

// ❌ 悪い例
return NextResponse.json(
  { error: error.message, stack: error.stack },
  { status: 500 }
);
```

---

## 環境変数と機密情報

### ✅ チェック項目

- [ ] **.env ファイルが .gitignore に含まれている**
  ```
  # .gitignore
  .env
  .env.local
  .env*.local
  ```

- [ ] **本番環境の環境変数が Vercel で設定されている**
  - すべての必須環境変数が設定済み
  - 本番用APIキー（`sk_live_`など）を使用

- [ ] **クライアント側に露出する環境変数が最小限**
  - `NEXT_PUBLIC_*` プレフィックスのみクライアント側で利用可能
  - APIキーやシークレットは `NEXT_PUBLIC_` を使用しない

- [ ] **APIキーのローテーション計画**
  - 定期的にAPIキーを更新
  - 漏洩時の対処手順を用意

### 🔒 チェック方法

```bash
# .env ファイルが Git にコミットされていないか確認
git status --ignored

# クライアント側に露出する環境変数を確認
npm run build
# Build output で NEXT_PUBLIC_ 変数のみが含まれているか確認
```

---

## 入力検証とサニタイゼーション

### ✅ チェック項目

- [ ] **すべてのユーザー入力を検証**
  - フォーム入力のバリデーション
  - APIリクエストボディの検証
  - URLパラメータの検証

- [ ] **XSS（クロスサイトスクリプティング）対策**
  - Reactが自動的にエスケープ（`dangerouslySetInnerHTML` を使用しない）
  - ユーザー生成コンテンツをサニタイズ

- [ ] **ファイルアップロードの検証**
  - ファイル形式の検証（MIME type）
  - ファイルサイズの制限
  - ファイル名のサニタイズ

### 🔒 実装例

```typescript
// フォームバリデーション例
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // バリデーション
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    toast.error("有効なメールアドレスを入力してください");
    return;
  }

  if (!message || message.length < 10) {
    toast.error("メッセージは10文字以上入力してください");
    return;
  }

  // API呼び出し
};
```

---

## HTTPS と SSL/TLS

### ✅ チェック項目

- [ ] **本番環境でHTTPSを強制**
  - Vercelが自動的にHTTPSにリダイレクト
  - `next.config.ts` で設定確認

- [ ] **SSL証明書が有効**
  - Vercelが自動的にLet's Encrypt証明書を発行
  - 証明書の有効期限を監視

- [ ] **セキュアクッキー設定**
  - `Secure` フラグが設定されている
  - `SameSite=Lax` または `Strict`

- [ ] **HSTS（HTTP Strict Transport Security）ヘッダー**
  ```typescript
  // next.config.ts
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          }
        ]
      }
    ]
  }
  ```

---

## CORS 設定

### ✅ チェック項目

- [ ] **CORS ポリシーが適切に設定されている**
  - 本番ドメインのみ許可
  - ワイルドカード（`*`）を使用しない

### 🔒 実装例

```typescript
// API Route でのCORS設定例
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
```

---

## レート制限

### ✅ チェック項目

- [ ] **APIエンドポイントのレート制限**
  - ログインエンドポイント: 5回/分
  - 画像生成エンドポイント: 10回/時間
  - お問い合わせフォーム: 3回/時間

- [ ] **Vercel Edge Functions のレート制限設定**
  - Vercel Dashboard > Settings > Rate Limiting

- [ ] **Supabase のレート制限確認**
  - 認証エンドポイントのレート制限が有効

### 🔒 実装例

```typescript
// 簡易的なレート制限（Redis推奨）
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const identifier = request.ip || "anonymous";
  const { success } = await rateLimit(identifier, {
    limit: 5,
    window: 60, // 60秒
  });

  if (!success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    );
  }

  // API処理
}
```

---

## エラーハンドリング

### ✅ チェック項目

- [ ] **グローバルエラーハンドラーが設定されている**
  - `app/error.tsx` が実装されている
  - `app/global-error.tsx` が実装されている

- [ ] **エラーメッセージが適切**
  - ユーザーフレンドリーなメッセージ
  - 技術的詳細を露出しない

- [ ] **エラーログが記録されている**
  - Sentryでエラー監視
  - 本番環境のみログ送信

### 🔒 実装例

```typescript
// エラーハンドリング例
try {
  const response = await openai.images.generate({...});
  return NextResponse.json({ success: true, imageUrl: response.data[0].url });
} catch (error) {
  // エラーログ（Sentryに送信）
  console.error("[Image Generation Error]", error);

  // ユーザーフレンドリーなメッセージ
  return NextResponse.json(
    { error: "画像の生成に失敗しました。しばらくしてから再度お試しください。" },
    { status: 500 }
  );
}
```

---

## 依存関係の脆弱性

### ✅ チェック項目

- [ ] **npm audit で脆弱性をチェック**
  ```bash
  npm audit
  npm audit fix
  ```

- [ ] **依存関係を最新に保つ**
  ```bash
  npm outdated
  npm update
  ```

- [ ] **Dependabot が有効**
  - GitHub リポジトリで Dependabot を有効化
  - セキュリティアラートを受け取る

- [ ] **脆弱性のあるパッケージを使用しない**
  - 定期的に `npm audit` を実行
  - Critical/High の脆弱性は即座に対応

---

## サードパーティ統合

### ✅ チェック項目

- [ ] **Stripe Webhook が署名検証している**
  ```typescript
  const sig = request.headers.get("stripe-signature")!;
  const event = stripe.webhooks.constructEvent(
    body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
  ```

- [ ] **OpenAI API キーが保護されている**
  - サーバーサイドのみで使用
  - クライアント側に露出しない

- [ ] **Supabase Service Role Key が保護されている**
  - 本番環境のみ使用
  - 管理操作にのみ使用

- [ ] **外部APIへのリクエストがタイムアウト設定されている**
  ```typescript
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒

  try {
    const response = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
  ```

---

## モニタリングとログ

### ✅ チェック項目

- [ ] **Sentry でエラー監視**
  - エラー発生時に通知
  - スタックトレースを記録
  - ユーザー影響を追跡

- [ ] **Vercel Analytics で性能監視**
  - Core Web Vitals を監視
  - パフォーマンス低下を検知

- [ ] **セキュリティイベントをログ記録**
  - ログイン失敗
  - 認証エラー
  - レート制限違反
  - 不正なAPIリクエスト

- [ ] **ログに機密情報を含めない**
  - パスワード
  - APIキー
  - クレジットカード情報
  - 個人識別情報（PII）

### 🔒 ログ例

```typescript
// ✅ 良い例
console.log("[Auth] Login attempt for user:", userId);

// ❌ 悪い例
console.log("[Auth] Login attempt:", { email, password });
```

---

## デプロイ前チェックリスト

本番環境にデプロイする前に、以下をすべて確認してください：

### 認証・認可
- [ ] Supabase RLS が有効
- [ ] 認証フローが正常に動作
- [ ] セッション管理が適切

### データベース
- [ ] RLS ポリシーが設定済み
- [ ] データベース関数が保護されている
- [ ] バックアップが設定されている

### API セキュリティ
- [ ] すべてのエンドポイントで認証チェック
- [ ] レート制限が設定されている
- [ ] エラーメッセージが適切

### 環境変数
- [ ] すべての環境変数が Vercel に設定されている
- [ ] 本番用 API キーを使用
- [ ] .env ファイルが Git に含まれていない

### HTTPS/SSL
- [ ] HTTPS が強制されている
- [ ] SSL 証明書が有効
- [ ] セキュアクッキー設定

### 入力検証
- [ ] すべてのフォーム入力を検証
- [ ] XSS 対策が実装されている
- [ ] ファイルアップロード検証

### モニタリング
- [ ] Sentry エラー監視が有効
- [ ] Vercel Analytics が有効
- [ ] セキュリティイベントをログ記録

### 依存関係
- [ ] npm audit で脆弱性なし
- [ ] 依存関係が最新
- [ ] Dependabot が有効

### サードパーティ
- [ ] Stripe Webhook 署名検証
- [ ] 外部 API タイムアウト設定
- [ ] API キーが保護されている

---

## セキュリティインシデント対応

### 1. API キー漏洩時の対応

1. **即座にキーを無効化**
   - 該当するサービスのダッシュボードでキーを削除
   - 新しいキーを生成

2. **環境変数を更新**
   - Vercel Dashboard で新しいキーに更新
   - Redeploy を実行

3. **影響範囲を調査**
   - アクセスログを確認
   - 不正利用がないか確認

4. **再発防止策**
   - .gitignore に .env が含まれているか確認
   - コードレビューで機密情報が含まれていないか確認

### 2. 不正アクセス検知時の対応

1. **ユーザーアカウントを一時停止**
   - Supabase Dashboard でユーザーを無効化

2. **セッションを無効化**
   - すべてのセッションをログアウト

3. **調査と対応**
   - アクセスログを分析
   - 影響範囲を特定
   - 必要に応じてユーザーに通知

4. **セキュリティ強化**
   - 多要素認証の導入を検討
   - レート制限を強化

---

## 参考リンク

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/security)
- [Vercel Security](https://vercel.com/docs/security)
- [Stripe Security Best Practices](https://stripe.com/docs/security)

---

**最終更新日**: 2025年1月

このチェックリストは定期的に見直し、最新のセキュリティベストプラクティスに従って更新してください。
