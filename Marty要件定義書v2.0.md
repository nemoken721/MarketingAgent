マーケティングエージェント "Marty" 要件定義書 v2.0
1. プロジェクト概要 (Project Overview)
1.1. 製品定義
製品名: Marty（マーティ）
由来: "Mar"keting + "T"echnolog"y" / 映画『バック・トゥ・ザ・フューチャー』の主人公のような、近未来を感じさせる頼れる相棒。
コンセプト: IT/マーケティングに疎い小規模事業者（実店舗・ひとり社長）のための「自律型AIマーケティングパートナー」。
コアバリュー:
No UI / Chat First: 複雑な管理画面を排除し、自然言語での対話のみで業務を完結させる。
Generative UI: AIがテキストだけでなく、企画書・プレビュー・ボタンなどのUIコンポーネントを動的に生成する。
Agentic Workflow: 調査・企画・制作・承認・投稿・分析までのサイクルをAIが自律的に回す。
All-in-One: 「Webサイト構築（受け皿）」と「SNS運用（集客）」を一元管理する。
1.2. ターゲットユーザー
属性: 実店舗を持つ小規模事業者、個人事業主、フリーランス。
課題: Webサイトがない/古い、SNS運用の時間がない、動画を作りたいが予算がない、何から始めればいいか分からない。
ITリテラシー: 低〜中（チャットツールは使えるが、サーバー設定やドメイン取得は困難）。

2. 技術スタック (Technology Stack)
Claude Codeへの指示において、以下の構成を厳守させること。
2.1. Frontend & UI
Framework: Next.js 15 (App Router)
Language: TypeScript
Styling: Tailwind CSS
Components: Shadcn/UI (Radix UIベース), Lucide React (Icons)
State Management: React Server Components (RSC) を基本とする。
2.2. AI & Agent Architecture
AI SDK: Vercel AI SDK (Core / UI / RSC) - Generative UI実装に必須
LLM (Brain):
Primary (Router/Chat): Google Gemini 2.0 Flash (高速・低コスト)
Secondary (Reasoning/Deep Research): Google Gemini 1.5 Pro (高度な推論・文脈理解)
Orchestration: LangChain / LangGraph (ステートフルなエージェント管理が必要な場合)
Multimedia:
Image Gen: OpenAI DALL-E 3 or Stable Diffusion XL API
Video Gen: Runway Gen-2 API or Haiper API (コスト変動に対応可能な設計)
2.3. Backend & Infrastructure
Database: Supabase (PostgreSQL) - リレーショナルデータおよびベクトル検索用。
Auth: Supabase Auth (Email/Password + Google OAuth)
Storage: Supabase Storage (生成された画像・動画の一時保存)
Hosting: Vercel (Serverless Functions / Edge Middleware)
Payment: Stripe (サブスクリプション + クレジット都度払い)

3. ビジネスロジック & 課金設計 (Business Logic)
3.1. クレジットシステム (Currency: Ma-Point)
高負荷な生成処理（動画・画像）による赤字を防ぐため、ポイント制を導入する。
消費レート定義:
テキスト生成 (企画/キャプション): 0 pt (Fair Use Policy適用)
画像生成 (Instagram等): 10 pt / 枚
動画生成 (Reels/TikTok): 200 pt / 本
Deep Research (高度分析): 50 pt / 回
挙動: 生成アクション実行前に残高を確認し、不足時はStripe決済モーダルを表示する。
3.2. プラン構成 (Plan Structure)
機能
Free Plan
Pro Plan (想定: 9,800円/月)
月次付与クレジット
0 pt (※初回登録特典のみ)
5,000 pt
テキスト生成/対話
無制限 (※レート制限あり)
無制限 (優先レーン)
Webサイト構築
可能 (サーバー契約必須)
可能
SNS連携数
各メディア1アカウント
無制限
動画生成
原則不可 (クレジット購入で可)
可能 (月次付与分で約25本)
自動化レベル
毎回「承認」が必要
全自動運用モード可

3.3. コンテキストアフィリエイト (Contextual Affiliate)
ユーザーの会話内容（文脈）をトリガーに、DB内のツールリストから最適なものを提案する。
ロジック: ベクトル検索またはキーワードマッチングにより、ユーザーの課題（例：「集客できない」「HPがない」）に対応するツールを抽出。
UI: テキストリンクではなく、リッチな「推奨ツールカード（Tool Card）」を表示する。

4. データベース設計 (Database Schema)
Supabaseにて以下のテーブル構成を実装する。
users
id (UUID, PK): ユーザーID
email (String): メールアドレス
plan_tier (String): 'free' | 'pro'
business_info (JSONB): 業種、ターゲット、トーン＆マナー設定
is_server_contracted (Boolean): アフィリエイト経由でのサーバー契約有無
credits
user_id (UUID, FK, PK): ユーザーID
balance (Integer): 現在の保有ポイント
updated_at (Timestamp): 最終更新日時
credit_logs
id (UUID, PK): ログID
user_id (UUID, FK): ユーザーID
amount (Integer): 増減値（例: -10, +500）
type (String): 'usage' | 'purchase' | 'bonus' | 'monthly_grant'
description (String): 処理内容（例: "Instagram Image Generation"）
created_at (Timestamp): 発生日時
integrations
id (UUID, PK): ID
user_id (UUID, FK): ユーザーID
platform (String): 'instagram' | 'x' | 'wordpress'
access_token (String, Encrypted): アクセストークン
refresh_token (String, Encrypted): リフレッシュトークン
expires_at (Timestamp): 有効期限
websites
id (UUID, PK): ID
user_id (UUID, FK): ユーザーID
domain (String): ドメイン名
wp_url (String): WordPress URL
wp_username (String): 管理ユーザー名
wp_app_password (String, Encrypted): アプリケーションパスワード
status (String): 'draft' | 'building' | 'active'
affiliate_tools
id (UUID, PK): ID
name (String): ツール名 (例: "Xserver")
category (String): 'server' | 'mail' | 'line'
description (String): AI提案用の説明文
affiliate_url (String): アフィリエイトリンク
trigger_keywords (Array): トリガーとなるキーワード群

5. UI/UX詳細仕様 (Generative UI)
5.1. 画面レイアウト
メインエリア (Chat Interface): 画面右側80%。ユーザーとMartyの対話場所。
サイドバー (Dashboard Widget): 画面左側20%。
Status: 各SNS・Webサイトの連携状態（緑/赤ランプ）。
Credit: "Ma-Point" 残高表示と「チャージ」ボタン。
Next Post: 次回投稿予定の簡易表示。
5.2. 動的生成コンポーネント (Generative UI Components)
Vercel AI SDKを使用し、AIの判断で以下のReactコンポーネントをチャットストリーム内にレンダリングする。
PlanningBoard: 週間スケジュールをテーブル形式で表示。各セルをクリックすると詳細編集可能。
PostPreviewCard: スマホ画面を模したプレビュー。画像/動画、キャプション、ハッシュタグを表示。「承認」「修正」ボタン付き。
ToolRecommendationCard: アフィリエイトツールの紹介。ロゴ、メリット、契約ボタン（アフィリエイトリンク）を表示。
WebPreviewCard: 構築中のWebサイトのスクリーンショットと「公開」ボタンを表示。
CreditPurchaseModal: ポイント不足時に起動。Stripe決済画面へ誘導。

6. 機能要件詳細 (Functional Requirements)
6.1. エージェント機能①: Webサイト構築 (Web Builder Agent)
トリガー: ユーザーが「HPがない」と回答、または「サイトを作りたい」と発言。
フロー:
ドメイン検索: チャットで希望ドメインを聞き、空き状況を確認（API使用）。
サーバー契約誘導: 「サイトを動かす場所が必要です」と ToolRecommendationCard (Xserver等) を表示。
契約確認: ユーザーが契約完了メール等の情報を入力（またはID連携）。
WordPress構築: サーバーAPIまたはSelenium等を用いて、WordPressインストール・SSL化・Marty連携プラグイン導入を自動（または半自動）で行う。
コンテンツ生成: ユーザーのビジネス情報を元に、トップページ・会社概要・メニュー等の固定ページを自動生成し、API経由でWordPressに流し込む。
6.2. エージェント機能②: SNS運用 (Social Media Agent)
企画 (Planning):
ユーザーの「来週のネタ考えて」に対し、Geminiがトレンドや過去の反応を分析し、PlanningBoard を提示。
制作 (Production):
承認された企画に対し、コンテンツを生成。
画像: クレジット (10pt) を消費して生成。
動画: クレジット (200pt) を消費して生成。
テキスト: 無料生成。
承認と予約 (Approval & Schedule):
PostPreviewCard を提示。ユーザーが「承認」を押すと、各メディアのAPIを叩いて予約投稿を行う。
承認後の変更は、チャットで「画像のトーンを明るくして」等と指示すれば再生成・差し替えを行う。
6.3. 安全装置 (Safety & Limits)
Fair Use Policy (裏側の制限):
テキスト生成APIに対し、Middleware層でレートリミットを設ける（例: 1ユーザーあたり10分間に50リクエストまで）。
超過時は「少し休憩しましょう」と返し、API課金を防ぐ。
コンテンツフィルター:
公序良俗に反する投稿が生成されないよう、システムプロンプトで厳格に制御する。

7. 外部連携API仕様 (API Integrations)
Martyが裏側で使用する「道具箱 (Tools)」の定義。
social_tools
post_instagram_photo(caption, image_url)
post_instagram_reel(caption, video_url)
post_x_text(text, image_url?)
schedule_post(platform, content, datetime)
web_tools
check_domain(domain_name)
install_wordpress(server_config)
update_wp_page(page_id, content)
creative_tools
generate_image_dalle3(prompt) -> Returns URL
generate_video_runway(image_url, prompt) -> Returns URL
system_tools
check_credit_balance()
deduct_credit(amount)
search_affiliate_tools(keyword)

8. 開発ロードマップ (Development Phases)
Claude Codeには、以下のフェーズ順で実装を指示すること。
Phase 1: MVP基盤 & Generative UI (現在の優先事項)
Next.js 15 + Vercel AI SDK環境構築。
Chat Interface と Sidebar の実装。
Gemini 2.0 Flash との接続。
Generative UI実装: テキスト指示に対して「企画書テーブル (PlanningBoard)」などのコンポーネントが返ってくる仕組みの構築。
Phase 2: エージェントロジック & データベース
Supabase連携。ユーザー認証の実装。
SNS連携機能（API接続）の実装。
「企画→承認→予約」のステート管理ロジックの実装。
Phase 3: クレジットシステム & アフィリエイト
credits テーブルの実装。Stripe決済連携。
アフィリエイト提案ロジックの実装。
動画・画像生成APIの接続とポイント消費処理の実装。
Phase 4: Web構築機能 (Advanced)
ドメイン検索〜WordPress連携の自動化フロー実装。

