Marty LINE連携・実装要件定義書 (v1.0)
1. プロジェクト概要
プロダクト名: Marty (EC・D2C特化型AIマーケティングエージェント)
コアコンセプト: 「ツールではなく、LINEの中にいるAI社員」
ターゲット: 年商数億規模のD2C経営者、オーナー
技術スタック:
Frontend: React (Existing Web App) + LIFF SDK
Backend: Python/Node.js (API Server)
Infra: Google Cloud / AWS
Interface: LINE Official Account (Messaging API)
2. システムアーキテクチャ (Hybrid Model)
コストを最小化し、UXを最大化する「LINE × LIFF」のハイブリッド構成を採用する。
2.1 役割分担
コンポーネント
役割
課金属性
LINEトーク画面
【入り口・通知】

素材(画像)の送信、完了通知の受け取り、メニュー選択
従量課金

(Reply APIは無料)
LIFF (Webアプリ)
【作業場・脳みそ】

チャット対話、画像生成プレビュー、詳細設定、承認
無料

(Web通信のみ)

2.2 データフロー
素材送信: ユーザーがLINEに画像を送信 → Webhookでサーバーへ保存 → DBに記録。
LIFF起動: ユーザーがメニューからLIFF起動 → DBから「さっきの画像」を取得 → チャット画面に表示。
生成・調整: LIFF内でAIとチャット（WebSocket/API） → プレビュー生成。
承認: LIFFで「予約」ボタン押下 → サーバーでスケジュール登録。
通知: 投稿完了時のみ、LINEのPush APIで通知。

3. LINE公式アカウント仕様 (Messaging API)
3.1 リッチメニュー構成
画面下部に固定表示されるメニュー。LIFFへの主要な導線となる。
レイアウト: 小サイズ（高さハーフ）または大サイズ（3分割）
ボタン構成:
【左：画像から作成】 (Main Action)
Action: LIFF起動 (/create?mode=image)
役割: 写真アップロード済み、またはこれからアップロードして作成開始。
【中：アカウント診断/分析】
Action: LIFF起動 (/analytics)
役割: 現状のインスタ運用データの確認。
【右：設定・プラン】
Action: LIFF起動 (/settings)
役割: プロフィール設定、課金プラン変更。
3.2 Bot応答ロジック (Webhook)
ユーザーのアクションに対し、**Reply API（無料）**のみを使用して即時応答する。
トリガー
ユーザーの行動
Botの応答 (Reply API)
裏側の処理
画像受信
画像・動画を送信
「画像を受け取りました！📸

制作ルームを開いて投稿を作成しましょう👇」

＋ [制作ルームを開く] ボタン(LIFFリンク)
画像をS3等へ保存。

session_contextに画像IDを紐付け。
テキスト
「投稿作って」等
「制作ルームで詳しく伺いますね！こちらへどうぞ👇」

＋ [制作ルームを開く] ボタン
特になし（LIFFへ誘導）。
挨拶
友だち追加時
「採用ありがとうございます！AI社員のMartyです。

まずは商品の写真を1枚送ってください！」
ユーザーID (Ub...) をDBに登録。


4. LIFF (Webアプリ) 詳細仕様
現在のレスポンシブWebアプリをベースに、LIFF特有の挙動を組み込む。
4.1 画面共通仕様 (Mobile First)
認証: liff.init() を使用し、LINE User IDを取得して自動ログイン（ログイン画面はスキップ）。
ヘッダー: liff.isInClient() が true の場合、グローバルヘッダー（ロゴなど）を非表示にし、画面領域を最大化する。
フッター: 必要に応じて削除（リッチメニューがあるため）。
4.2 機能別画面仕様
A. チャット＆制作画面 (/chat or /create)
UI構造:
Base Layer (チャット):
LINEライクな吹き出しUI。
初期表示: LINEで送信された画像があれば、自動的に「この画像ですね」と表示済み状態にする。
機能: AIとの対話、追加の画像アップロード（クリップアイコン）。
Overlay Layer (操作パネル/ボトムシート):
トリガー: チャット内の「調整する」ボタン、またはAIからの提案時。
挙動: 画面下部からスライドイン（ハーフモーダル or フルスクリーン）。
内容:
生成画像のカルーセルプレビュー（拡大可能）。
パラメータ調整（「明るく」「高級感」「文字少なめ」などのタグ選択）。
【投稿予約する】 ボタン（CV地点）。
B. 分析・ダッシュボード画面 (/analytics)
内容: Instagramのフォロワー推移、保存数ランキングなどをスマホで見やすくカード形式で表示。
UI: グラフは見やすさ重視（Chart.js等）。「改善提案」ボタンを押し、チャット画面へ遷移させる導線を設置。
4.3 技術実装ポイント (React)
ルーティング: react-router-dom を使用。LINEのリッチメニューからはクエリパラメータ付きURL (https://liff.line.me/ID/path?q=...) で遷移し、初期状態を制御する。
状態管理: LINEで送られた画像データは、Backend経由で取得し、Redux/Zustand等のストアに格納して表示する。

5. データモデル & API要件
5.1 データベース拡張 (User Table)
既存のUserテーブルにLINE連携用のカラムを追加する。
SQL
ALTER TABLE users ADD COLUMN line_user_id VARCHAR(255) UNIQUE INDEX;
ALTER TABLE users ADD COLUMN line_display_name VARCHAR(255);
-- Email等は任意入力として保持（BAN対策）

5.2 API エンドポイント (Backend)
Method
Endpoint
役割
POST
/api/webhook/line
LINEプラットフォームからのWebhook受信。

画像保存、Replyメッセージ送信処理。
GET
/api/user/context
LIFF起動時にコール。

LINE User IDをキーに、直近アップロードされた画像や未完了タスクを取得。
POST
/api/chat/message
LIFF内チャットの送受信（コスト無料）。
POST
/api/generate/image
画像生成・合成リクエスト（Satori/AI）。


6. 開発プロセス・ロードマップ
現在の「レスポンシブWeb開発」の流れを止めず、スムーズにLINE対応へ移行する手順。
Phase 1: 環境セットアップ (Day 1-2)
LINE Developers: プロバイダー作成、チャネル作成（Messaging API, LINE Login）。
LIFF登録: 現在の開発環境URL（ngrok等）またはStaging URLをLIFFのエンドポイントとして登録。
Bot設定: 「応答メッセージ」をオフ、「Webhook」をオンに設定。
Phase 2: LIFF組み込み & UI調整 (Day 3-5)
SDK導入: Reactアプリに @line/liff をインストール。
条件分岐実装: App.tsx 等のルートで liff.init() を実行。
LIFF内なら → ヘッダー非表示、ID連携処理。
PCブラウザなら → 通常表示。
チャットUI実装: LIFF内チャット（Botとの対話画面）と、操作パネル（ボトムシート）の実装。
※ここはLINE APIではなく、純粋なReact開発。
Phase 3: Webhook & 画像連携 (Day 6-8)
Webhook実装: Python/Nodeバックエンドに /api/webhook/line を作成。
画像保存ロジック: LINEから画像が届いたらS3に保存し、DBにパスを記録する処理。
連携確認: LINEで画像送信 → Botが「受け取りました」と返信 → LIFFを開くとその画像が表示されていることを確認。
Phase 4: 本番運用準備 (Day 9-10)
リッチメニュー作成: デザイン作成（Canva等でOK）し、LINE Managerで設定。
エラーハンドリング: ID連携失敗時や、画像ロード失敗時のフォールバック処理。

7. 重要確認事項（Checklist）
[ ] コスト管理: 「Push Message（こちらからの通知）」は、投稿完了時や重要なお知らせ以外で使わないロジックになっているか？
[ ] UX一貫性: LINEのトーク画面で会話を続けようとするユーザーに対し、Botが優しく「制作ルーム（LIFF）」へ誘導できているか？
[ ] BAN対策: 初回起動時などに、任意でメールアドレスやブランド情報の登録フォーム（自社DBへの保存）を用意しているか？

