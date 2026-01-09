WordPress構築マスタ要件定義書 v2.1 (Final Complete Edition)
1. モジュール概要 (Module Overview)
1.1. 目的
本モジュールは、SaaS「Marty」において、ユーザー（小規模事業者）のサーバー環境にアクセスし、WordPressサイトをゼロから自動構築する「Builder Agent」機能を定義する。
1.2. コア・コンセプト
Trust & Context (New!): ユーザーの不安を取り除くため、作業の全体像（ロードマップ）を可視化し、「なぜその作業が必要か」を不動産の例えを用いて簡潔に説明する。
User-First Guidance: ユーザーの契約状況に応じて最適なフローへ分岐誘導する。
Secure Hand-over: サーバー接続情報を安全なUI経由で受け取り、暗号化して保存する。
Robust Automation: DNS浸透待ちなどの「待ち時間」を考慮し、エラーで停止せずバックグラウンドでリトライする。
Business Ready: テーマ「Lightning」を採用し、ブログ機能と固定ページを組み合わせた集客用サイトを構築する。

2. 責任分界点とワークフロー (Responsibility Boundaries)
AIとユーザーの役割を定義する。AIはユーザーに対し、「次にやるべきこと」とその「理由」をセットで提示する。
フェーズ
実行者
ユーザーへの説明ロジック (Why)
P1. 全体像の共有
AI
「まずはお店を建てるまでの地図をお見せします」
P2. ドメイン/サーバー契約
ユーザー
「お店の『住所（ドメイン）』と『土地（サーバー）』を確保します」
P3. DNS設定
ユーザー
「住所と土地を紐付けて、訪問者が辿り着けるようにします」
P4. 情報の受け渡し
共同
「大工（AI）に土地に入るための『合鍵』を渡します」
P5. 構築・インストール
AI
「土地に建物の土台（WordPress）を作ります」
P6. コンテンツ制作
AI
「内装を整え、看板（記事）を設置します」


3. 機能要件詳細 (Functional Requirements)
3.0. 進捗可視化UI (Progress Visualization - New!)
作業開始時に全体像を示し、現在地を常に把握させるためのGenerative UIコンポーネント。
コンポーネント名: ConstructionRoadmap
仕様:
以下の4ステップをフローチャート形式で表示する。
住所と土地の確保（ドメイン・サーバー）
道案内設定（DNS・接続）
お店の建設（インストール・SSL）
内装・開店（テーマ・記事）
状態表示: 現在のステップをハイライトし、完了したステップには「✅」をつける。
表示タイミング: 「ホームページを作りたい」と言われた直後、および各フェーズの完了時に再表示する。
3.1. 状況分岐とアフィリエイト (Branching & Affiliate)
ドメイン検索機能:
check_domain_availability(domain) を実装。
納得感醸成ロジック:
リンクを提示する前に必ず**「不動産の例え（Real Estate Metaphor）」**を挟む。
「ネット上にお店を持つには、現実と同じで『住所（ドメイン）』と『土地（サーバー）』の2つがどうしても必要になります（これは世界共通のルールです）。」
アフィリエイト管理:
Supabaseの affiliate_tools テーブルからリンクを取得。
推奨ルート: DNS設定の難易度を下げるため、Xserver「WordPressクイックスタート」を最優先で案内する。
3.2. ネームサーバー変更ガイド (DNS Guide - Generative UI)
ユーザーが「ドメインは他社、サーバーはXserver」というパターンの場合、以下のUIを表示する。
コンポーネント名: DNSGuideCard
説明ロジック:
「お名前.comで取得した住所（ドメイン）は、まだどの土地（サーバー）を指すか決まっていません。『この住所の土地はXserverですよ』と役所に届ける手続きが必要です。」
機能:
主要レジストラごとの操作手順を図解。
設定値 (ns1.xserver.jp...) をコピーボタン付きで表示。
3.3. クレデンシャル情報の取得 (Secure Hand-over)
コンポーネント名: ServerAuthForm
説明ロジック:
「土地（サーバー）の準備ができました！ これから私が中に入って建物を建てますので、**工事に入るための『鍵（ID/パスワード）』**を貸してください。」
UX機能:
「Xserverからのメール」の該当箇所を示すヒント画像を表示。
送信時に即時 ssh2 接続テストを行い、成功時のみ暗号化してDB保存。
3.4. 構築エンジン (Builder Engine - SSH/WP-CLI)
サーバー内部での操作ロジック。
SSH接続: ssh2 ライブラリ使用。
WP-CLI制御: curl による自動インストールとコマンド実行ラッパーの実装。
SSL設定のリトライ機構 (Background Retry):
課題: DNS切り替え直後のSSL化失敗。
解決策: 失敗時はDBステータスを ssl_pending にし、Cronジョブ等で1時間おきに再試行。
ユーザーへの通知: 「住所の登録がネット全体に行き渡るまで少し時間がかかります。私はここで待機して、繋がり次第すぐに工事を再開しますので、画面を閉じて待っていて大丈夫ですよ。」
3.5. サイト構成ロジック (Theme & Content)
「ビジネスサイト ＋ ブログ」のハイブリッド構成。
テーマ: Lightning (Generation 3) を固定採用。
プラグイン: vk-all-in-one-expansion-unit, vk-blocks, marty-connector。
ブログ機能の実装:
固定ページ「ホーム」「ブログ（空）」を作成。
wp option update page_for_posts [Blog ID] を実行。
トップページに「最新記事リスト」を配置。

4. データベース設計 (Database Schema)
websites テーブル (拡張)
id: UUID
user_id: UUID
domain: String
server_host: String, server_user: String
server_pass_encrypted: String (AES-256暗号化必須)
current_step: Integer (1-4, ロードマップ表示用)
status: Enum (draft, dns_wait, building, ssl_pending, active, error)
affiliate_tools テーブル
id: UUID, name: String, url: String, guide_content: Text

5. 人格・対話ガイドライン (Persona Spec)
AIの System Prompt に以下の指示を厳格に適用すること。
5.1. 「不動産屋兼大工」のメタファー
ユーザーの不安を解消するため、常に以下の例えを使って説明する。
ドメイン = 「お店の住所」
サーバー = 「お店を建てる土地」
WordPress = 「建物の土台・骨組み」
テーマ = 「内装・インテリア」
DNS設定 = 「住所と土地を紐付ける役所への届け出」
5.2. Context-First Communication (文脈提示の原則)
アクションを促す際は、必ず 「現在地確認」→「理由」→「アクション」 の順で話す。
NG: 「ドメインを取得してください。」
OK:
[Roadmap表示] 「まずはステップ1の『住所決め』ですね。」
[理由] 「ネット上にお店を出すには、世界に一つだけの住所（ドメイン）が必要です。」
[指示] 「希望の店名を入力してください。空いているか確認します。」
5.3. 寄り添う姿勢
ユーザーが躊躇している場合、「お金がかかる部分なので慎重になりますよね。でも、これは一度取得すればずっとあなた自身の資産になりますよ」と、ビジネスパートナーとして背中を押す発言をする。

6. 開発フェーズ (Development Roadmap)
Step 1: UI基盤とロードマップ (The Visuals)
ConstructionRoadmap コンポーネントの実装。
「不動産メタファー」を用いた対話プロンプトの設計。
Step 2: データベース & 認証
websites テーブルと暗号化ロジックの実装。
ServerAuthForm の実装と接続テスト。
Step 3: 構築エンジン (The Core)
SSH接続クラスとWP-CLIラッパーの実装。
Lightningテーマ導入ロジック。
Step 4: エラーハンドリング & リトライ
CronジョブによるSSL再試行の実装。
待機中の安心させるメッセージングの実装。

