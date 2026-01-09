マーケティングエージェント "Marty" 本番環境要件定義書 v3.0
1. プロジェクト概要 (Production Overview)
製品名: Marty（マーティ）
フェーズ: Production (本番運用)
目的:
不特定多数のユーザー（SMB事業者）に対し、安定したマーケティング自動化サービスを提供する。
クレジットカード決済、アフィリエイト収益、APIコスト管理を厳格に行い、黒字化モデルを確立する。
ユーザーのセキュリティとプライバシーを保護し、日本の法令（特商法、個人情報保護法）に準拠する。
2. 本番環境 技術スタック (Production Tech Stack)
堅牢性と可観測性（エラー検知）を強化するため、MVP構成に以下を追加・変更する。
Frontend: Next.js 15 (App Router)
Language: TypeScript (Strict Mode)
UI/UX: Tailwind CSS, Shadcn/UI, Framer Motion (マイクロインタラクション用)
AI Engine:
Chat/Reasoning: Google Gemini 2.0 Flash (Main), Gemini 1.5 Pro (Deep Research)
Image: OpenAI DALL-E 3 (Pro Only/Credit)
Video: Runway Gen-3 Alpha API (Credit Only)
Database: Supabase (PostgreSQL) - RLS (Row Level Security) を完全適用
Auth: Supabase Auth (Email/Password + Google OAuth) - メール確認(Verify)必須化
Email: Resend (トランザクションメール送信、ドメイン認証済み)
Monitoring: Sentry (エラー監視・ログ収集)
Payment: Stripe (本番環境キー、Webhook署名検証)
Cron Jobs: Vercel Cron (予約投稿の定期実行)
3. 機能要件詳細 (Production Features)
3.1. 認証とセキュリティ (Auth & Security)
メールアドレス確認: サインアップ後、確認メールのリンクを踏むまでログインを制限する（スパム登録防止）。
パスワードリセット: 「パスワードを忘れた場合」のフロー実装。
セッション管理: トークンの有効期限管理と、期限切れ時の自動ログアウト/リフレッシュ処理。
Terms & Privacy: 初回登録時に「利用規約」「プライバシーポリシー」への同意チェックボックスを実装。
3.2. ビジネスロジック・課金 (Billing & Credits)
Stripe Webhookの堅牢化:
決済成功 (invoice.payment_succeeded) でのポイント付与。
決済失敗 (invoice.payment_failed) 時の自動メール通知と機能制限。
署名検証 (Signature Verification) を実装し、偽装リクエストを遮断。
クレジットの排他制御:
ポイント消費時、データベースのトランザクション処理を行い、同時リクエストによる「二重消費」や「マイナス残高」を防ぐ。
プラン変更処理:
Free → Pro へのアップグレード即時反映。
Pro → Free へのダウングレード予約（次回請求期間末までPro機能維持）。
3.3. エージェント機能の本番化 (Agent Hardening)
A. SNS連携 (Official API Integration)
Instagram Graph API:
instagram_business_basic などの正しいスコープを取得。
トークン自動更新: 60日で切れるLong-lived Tokenを、Vercel Cronを使って定期的に自動リフレッシュするバックグラウンド処理を実装。
エラーハンドリング: 「API制限超過」「画像サイズ不適合」などのAPIエラーをキャッチし、チャットでユーザーに分かりやすく通知する。
X (Twitter) API:
Free/Basic/Pro API Tier の制限（投稿数制限）をシステム側で管理し、上限に達したらユーザーに通知。
B. Webサイト構築機能 (Production Builder)
ドメイン・サーバー連携の検証:
MVPでは「契約したこと」を自己申告にしていたが、本番では「契約完了メールのヘッダー情報」または「ドメインのDNSレコード確認」等を用いて、可能な限り実在性を確認するステップを挟む（不正アフィリエイト防止）。
WordPressセットアップ:
セットアップ完了後、セキュリティプラグイン（SiteGuard等）を自動インストールリストに含める。
C. クリエイティブ生成 (Multimedia)
生成制限:
プロンプトインジェクション対策（暴力的・性的な生成指示のブロック）。
生成失敗時（APIエラー時）のポイント自動返還ロジック。
4. データベース設計 (Production Schema)
Supabaseにて、RLS（行レベルセキュリティ）を設定し、他人のデータが見えないよう厳格に管理する。
profiles (旧 users)
id (UUID, PK): auth.usersのIDと紐付け
email (String): メールアドレス
stripe_customer_id (String): Stripe顧客ID
subscription_status (String): 'active' | 'past_due' | 'canceled' | 'free'
plan_tier (String): 'free' | 'pro'
credits (Integer): 現在のポイント残高（頻繁に更新されるため別テーブル推奨だが、MVP延長ならここでも可。今回は排他制御のため独立テーブル推奨）
credit_ledger (クレジット台帳)
id (UUID, PK)
user_id (UUID, FK)
amount (Integer): 変動量 (-10, +500)
balance_after (Integer): 変動後の残高
transaction_type (String): 'usage', 'purchase', 'monthly_grant', 'refund'
reference_id (String): 生成された投稿IDやStripe決済ID
created_at (Timestamp)
integrations
既存のカラムに加え、以下を追加
token_expires_at (Timestamp): トークン有効期限
is_valid (Boolean): 連携が生きているかフラグ
last_error (Text): 最後に発生したAPIエラーログ
posts
id (UUID, PK)
user_id (UUID, FK)
platform (String)
content (JSONB): テキスト、画像URL等のセット
scheduled_at (Timestamp): 予約日時
published_at (Timestamp): 投稿完了日時
status (String): 'draft', 'pending_approval', 'scheduled', 'published', 'failed'
error_message (Text): 投稿失敗時の理由
5. UI/UX詳細仕様 (Production UI)
5.1. 法的表記ページ
フッターおよび設定メニューから以下へアクセス可能にする。
利用規約 (Terms of Service)
プライバシーポリシー (Privacy Policy)
特定商取引法に基づく表記 (Legal Notice): 事業者名、住所、連絡先、返金ポリシー等の記載。
5.2. アカウント設定画面
チャット外の設定画面を整備する。
プロフィール変更
プラン管理（Stripe Customer Portalへのリンク）
クレジットカード変更
退会（アカウント削除）機能
5.3. Generative UIの拡張
ErrorCard: APIエラーやクレジット不足が発生した際、単なるテキストではなく「チャージする」「再試行する」「サポートに連絡」などのアクションボタン付きカードを表示。
Confetti: Webサイト完成時や初投稿成功時に、紙吹雪エフェクトを出してUXを高める。
6. 非機能要件 (Non-Functional Requirements)
6.1. パフォーマンス
Core Web Vitals: LCP 2.5秒以内、CLS 0.1未満を目指す。画像の最適化（Next/Image）を徹底。
Edge Caching: 静的アセットはVercel Edge Networkでキャッシュする。
6.2. 運用保守
ログ監視: Sentryを導入し、クライアントサイドのエラー（白画面など）と、サーバーサイドのエラー（API失敗）をリアルタイムで検知・通知する体制を作る。
お問い合わせ: ユーザーがバグ報告できるフォーム（またはメールリンク）を設置。

7. 開発・移行ロードマップ (Migration Plan)
Claude Codeへの指示は、以下の順序で「本番化リファクタリング」を行ってください。
Phase 4: 本番インフラ整備
環境変数の分離: .env.local (開発用) と Vercel Dashboard (本番用) の変数を整理。
Sentry導入: エラー監視の組み込み。
Resend導入: 認証メール送信処理の実装。
Phase 5: データベースと認証の強化
RLS設定: supbase/policies.sql を作成し、全テーブルに「自分のデータしか読み書きできない」ポリシーを適用。
テーブル移行: credit_ledger テーブルなど、本番用スキーマへのマイグレーション実行。
Phase 6: APIとロジックの堅牢化
Instagram/X API: 本番クレデンシャルへの切り替えと、トークンリフレッシュ処理の実装。
Stripe Webhook: 署名検証ロジックの追加。
Cron Jobs: vercel.json にCron設定を追加し、予約投稿ワーカーを作成。
Phase 7: UI/UXの仕上げと法的対応
設定画面: 退会、プラン変更画面の実装。
静的ページ: 規約、特商法ページの作成。
最終テスト: 新規ユーザーとして登録から課金、投稿までの一連フローのQAテスト。

