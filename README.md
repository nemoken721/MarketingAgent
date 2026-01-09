# Marty - AI Marketing Partner

マーケティングエージェント "Marty" は、IT/マーケティングに疎い小規模事業者のための「自律型AIマーケティングパートナー」です。

## 特徴

- **No UI / Chat First**: 複雑な管理画面を排除し、自然言語での対話のみで業務を完結
- **Generative UI**: AIがテキストだけでなく、企画書・プレビュー・ボタンなどのUIコンポーネントを動的に生成
- **Agentic Workflow**: 調査・企画・制作・承認・投稿・分析までのサイクルをAIが自律的に実行
- **All-in-One**: Webサイト構築（受け皿）とSNS運用（集客）を一元管理

## 技術スタック

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Components**: Shadcn/UI, Lucide React
- **AI**:
  - Google Gemini 2.0 Flash (チャットエージェント)
  - OpenAI DALL-E 3 (画像生成)
- **Database**: Supabase (PostgreSQL + Auth + RLS)
- **Payment**: Stripe (クレジット購入)
- **Email**: Resend (トランザクションメール)
- **Analytics**:
  - Recharts (データ可視化)
  - Web Vitals (パフォーマンス計測)
- **Animation**: Framer Motion, Canvas Confetti
- **Hosting**: Vercel
- **Monitoring**: Sentry (オプション)

## セットアップ手順

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example`を`.env.local`にコピーし、必要な環境変数を設定してください。

```bash
cp .env.example .env.local
```

`.env.local`に以下を設定:

```env
# Node環境
NODE_ENV=development

# Google AI (Gemini)
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI（画像生成）
OPENAI_API_KEY=your_openai_api_key

# Stripe（決済）
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Resend（メール）
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com

# アプリケーションURL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

詳細な環境変数の説明は `.env.example` を参照してください。

#### 各サービスのAPIキー取得方法:

**Gemini API**:
1. [Google AI Studio](https://aistudio.google.com/app/apikey)にアクセス
2. "Create API Key"をクリック
3. APIキーをコピー

**Supabase**:
1. [Supabase](https://supabase.com/)でプロジェクトを作成
2. Project Settings > API からURLとAnon Keyを取得
3. データベーススキーマを作成（詳細は [DEPLOYMENT.md](DEPLOYMENT.md) を参照）

**OpenAI**:
1. [OpenAI Platform](https://platform.openai.com/api-keys)にアクセス
2. "Create new secret key"をクリック
3. APIキーをコピー

**Stripe**:
1. [Stripe Dashboard](https://dashboard.stripe.com/apikeys)にアクセス
2. テスト用APIキー（`sk_test_`で始まる）をコピー
3. Webhookエンドポイントを設定（詳細は [DEPLOYMENT.md](DEPLOYMENT.md) を参照）

**Resend**:
1. [Resend](https://resend.com/api-keys)にアクセス
2. "Create API Key"をクリック
3. APIキーをコピー

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## 実装済み機能

### Phase 1: MVP基盤 & Generative UI ✅
- ✅ チャットインターフェース
- ✅ サイドバー（連携状態、クレジット残高、次回投稿）
- ✅ Gemini 2.0 Flash との接続
- ✅ Generative UI: PlanningBoard（企画書テーブル）
- ✅ Supabaseデータベース連携
- ✅ ユーザー認証（サインアップ/ログイン/ログアウト）
- ✅ Row Level Security (RLS) による認証保護

### Phase 2: UI/UX改善 ✅
- ✅ トースト通知システム（Sonner）
- ✅ スケルトンローディングUI
- ✅ エラーバウンダリ
- ✅ エラーカードコンポーネント
- ✅ アニメーションシステム（Framer Motion）
- ✅ 成功時の紙吹雪エフェクト

### Phase 3: コア機能 ✅
- ✅ DALL-E 3 画像生成機能
  - カスタムプロンプト入力
  - サイズ・品質選択（1024x1024 / 1024x1792 / 1792x1024, 標準/HD）
  - 画像プレビュー・ダウンロード
  - クレジット消費（100pt/枚）
- ✅ お問い合わせフォーム
  - Resendメール送信
  - 管理者通知 + 自動返信
  - バリデーション・成功画面

### Phase 4: ダッシュボード & アナリティクス ✅
- ✅ 総合ダッシュボード
  - 統計カード（総投稿数、スケジュール済み、今日の投稿、平均エンゲージメント）
  - クレジット使用グラフ（Recharts）
  - プラットフォーム分布
  - 最近のアクティビティフィード
- ✅ クレジット購入システム（Stripe）
  - 3つの購入プラン（100pt/500pt/1000pt）
  - Stripe Checkout統合
  - Webhook処理

### Phase 5: パフォーマンス & アクセシビリティ ✅
- ✅ 画像最適化（AVIF/WebP, レスポンシブ画像）
- ✅ コード分割・Lazy Loading（モーダル、グラフ）
- ✅ Core Web Vitals計測（LCP, FID, CLS, FCP, TTFB）
- ✅ キーボードナビゲーション
  - カスタムショートカット
  - フォーカストラップ
  - Skip to Content
- ✅ スクリーンリーダー対応（ARIA属性、VisuallyHidden）
- ✅ アクセシビリティチェッカー（開発環境）
- ✅ カラーコントラスト対応（WCAG 2.1 AA）
- ✅ アニメーション削減（prefers-reduced-motion）

### Phase 6: 本番環境デプロイ準備 ✅
- ✅ 環境変数テンプレート（`.env.example`）
- ✅ デプロイガイド（`DEPLOYMENT.md`）
- ✅ セキュリティチェックリスト（`SECURITY_CHECKLIST.md`）
- ✅ 本番環境テストチェックリスト（`PRODUCTION_TESTING.md`）
- ✅ パフォーマンス & アクセシビリティドキュメント（`PERFORMANCE_ACCESSIBILITY.md`）

## ドキュメント

- **[DEPLOYMENT.md](DEPLOYMENT.md)**: 本番環境へのデプロイ手順
- **[SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md)**: セキュリティチェックリスト
- **[PRODUCTION_TESTING.md](PRODUCTION_TESTING.md)**: 本番環境テスト項目
- **[PERFORMANCE_ACCESSIBILITY.md](PERFORMANCE_ACCESSIBILITY.md)**: パフォーマンスとアクセシビリティガイド

## 今後の開発予定

- SNS連携機能（Instagram, X/Twitter, WordPress自動投稿）
- Cron Jobsによる自動投稿スケジューリング
- アフィリエイトツール統合
- Web構築機能（WordPress自動構築）

## ディレクトリ構成

```
MarketingAgent/
├── app/                               # Next.js App Router
│   ├── api/                          # APIルート
│   │   ├── auth/                     # 認証API
│   │   │   ├── logout/
│   │   │   └── user/
│   │   ├── chat/                     # チャットAPI (Gemini接続)
│   │   ├── contact/                  # お問い合わせAPI (Resend)
│   │   ├── dashboard/                # ダッシュボードAPI
│   │   │   └── stats/
│   │   ├── generate-image/           # 画像生成API (DALL-E 3)
│   │   └── stripe/                   # Stripe Webhook
│   ├── auth/                         # 認証ページ
│   │   ├── login/
│   │   ├── signup/
│   │   └── callback/
│   ├── contact/                      # お問い合わせページ
│   ├── dashboard/                    # ダッシュボードページ
│   ├── settings/                     # 設定ページ
│   ├── error.tsx                     # エラーバウンダリ
│   ├── global-error.tsx              # グローバルエラー
│   ├── layout.tsx                    # ルートレイアウト
│   ├── page.tsx                      # ホームページ
│   └── globals.css                   # グローバルスタイル（アクセシビリティ対応）
├── components/                       # Reactコンポーネント
│   ├── accessibility/                # アクセシビリティコンポーネント
│   │   ├── a11y-checker.tsx         # 開発環境用チェッカー
│   │   ├── skip-to-content.tsx      # Skip to Contentリンク
│   │   └── visually-hidden.tsx      # スクリーンリーダー用
│   ├── auth/                         # 認証コンポーネント
│   │   └── auth-form.tsx
│   ├── dashboard/                    # ダッシュボードコンポーネント
│   │   ├── credit-usage-chart.tsx   # Rechartsグラフ
│   │   ├── post-stats-cards.tsx     # 統計カード
│   │   └── recent-activity.tsx      # アクティビティフィード
│   ├── generative-ui/                # Generative UIコンポーネント
│   │   └── planning-board.tsx
│   ├── ui/                           # 再利用可能UIコンポーネント
│   │   ├── animated-container.tsx   # アニメーション付きコンテナ
│   │   ├── error-card.tsx           # エラー表示カード
│   │   └── skeleton.tsx             # スケルトンローディング
│   ├── chat-interface.tsx            # チャット画面
│   ├── footer.tsx                    # フッター
│   ├── image-generation-modal.tsx    # 画像生成モーダル
│   ├── purchase-modal.tsx            # クレジット購入モーダル
│   ├── sidebar.tsx                   # サイドバー
│   └── web-vitals.tsx                # Web Vitals計測
├── hooks/                            # カスタムフック
│   └── use-keyboard-navigation.ts    # キーボードナビゲーション
├── lib/                              # ユーティリティ
│   ├── supabase/                     # Supabaseクライアント
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── animations.ts                 # Framer Motionプリセット
│   ├── confetti.ts                   # 紙吹雪エフェクト
│   ├── lazy-components.ts            # 動的インポート
│   └── utils.ts
├── supabase/                         # データベース関連
│   ├── migrations/                   # SQLマイグレーション
│   │   └── 20260101_initial_schema.sql
│   └── SETUP.md                     # Supabaseセットアップガイド
├── middleware.ts                     # 認証ミドルウェア
├── DEPLOYMENT.md                     # デプロイガイド
├── SECURITY_CHECKLIST.md             # セキュリティチェックリスト
├── PRODUCTION_TESTING.md             # 本番環境テストガイド
├── PERFORMANCE_ACCESSIBILITY.md      # パフォーマンス&アクセシビリティガイド
├── .env.example                      # 環境変数テンプレート
└── ...設定ファイル
```

## ライセンス

Private
