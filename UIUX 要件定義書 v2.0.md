UI/UX 要件定義書 v2.0 (The Marty OS Experience)
1. デザインコンセプト (Design Philosophy)
1.1. Core Concept: "The Center Command"
Martyは「困ったときのヘルプ」ではない。マーケティング業務を遂行するための「司令塔」である。 したがって、チャットインターフェースは画面の隅ではなく、**常にユーザーの手元（中心）**に存在し、**あらゆる業務の起点（Launcher）**となる。
1.2. Visual Theme: "Trust & Modernity"
Base: Clean White / Light Gray (信頼感、業務ツールとしての清潔感)
Accent: Marty Blue / Gradients (知性、AIらしさ)
Texture: Glassmorphism (すりガラス効果) を多用し、「画面の上にチャットが乗っている」というレイヤー構造を直感的に伝える。

2. 【Mobile】画面レイアウト仕様 (Mobile Layout Spec)
スマホアプリ（またはPWA）としての体験を最優先する。
2.1. ボトムナビゲーションバー (The Command Dock)
画面最下部に固定されるナビゲーションエリア。通常のアプリとは異なり、中央のボタンを強調する構造を持つ。
高さ: 64px 〜 70px
構成要素 (左から順に):
[🏠 Home]: ダッシュボード
[📅 Calendar]: マーケティングカレンダー
[ 🤖 Marty ]: センターコマンドボタン（Primary Action）
[📊 Data]: アナリティクス統合
[⚙️ Menu]: 設定・アカウント
デザイン詳細:
背景: 半透明のホワイト (bg-white/90, backdrop-blur-md)。
アイコン: 線画（Outline）スタイル。選択時は塗りつぶし（Solid）。
2.2. センターコマンドボタン (The Magic Button)
本アプリの象徴。単なるアイコンではなく、物理的なボタンのような存在感を持たせる。
配置: バーの中央。他のアイコンより 20px ほど上に飛び出している（Floating）。
形状: 完全な円形 (rounded-full)。サイズ 56px x 56px。
カラー: ブランドカラーのグラデーション、または鮮やかなブルー。わずかなドロップシャドウ (shadow-lg) を付け、浮遊感を出す。
インタラクション:
Tap: 軽快な「ポヨヨン」というアニメーション（Scale down -> Scale up）と共に、チャットシートが展開する。
2.3. ハーフモーダル・チャット (Half-Modal Chat Sheet)
ボタンを押すと出現するチャット画面。
挙動: 画面下からスライドインするシート（Bottom Sheet）。
初期状態: 画面の 50% (ハーフ) の高さで止まる。
重要: 上半分には、背面の「カレンダー」や「グラフ」が透けて（または少し暗くなって）見えている状態を維持する。
これにより、ユーザーは**「後ろの画面を見ながら指示」**ができる。
拡張状態: シートの上端をつまんで引き上げると、全画面 (Full Screen) になる。
閉じる: 下にスワイプ、または背面の暗い部分をタップすると格納される。

3. 【Mobile】主要画面の詳細 (Screen Details)
3.1. 📅 Calendar Tab (The Hub)
SNS、ブログ、メルマガなど、全ての施策を時系列で管理する画面。
表示形式: 月表示（Month）とリスト表示（List）の切り替え。
カードデザイン:
日付のマスの中に、メディアアイコン（📸, ✖️, 📧）とタイトルが表示される。
Draft（下書き）: 薄い色 ＋ 点線枠。
Scheduled（予約済）: 濃い色 ＋ 実線枠。
Published（公開済）: 色付き背景 ＋ チェックマーク。
UX: 予定をタップすると詳細が開く。しかし、修正は**「Martyボタンを押してチャットで指示」**するのが基本動線。
3.2. 📊 Data Tab (Unified Analytics)
全メディアの成果を一元管理する画面。
トップ: 「総リーチ数」「総フォロワー数」などの重要KPIを大きく表示。
詳細エリア:
縦スクロールで「Instagram」「Webサイト」「メルマガ」ごとのカードが並ぶ。
各カードには直近7日間の折れ線グラフ（Sparkline）を表示。

4. 【PC】画面レイアウト仕様 (Desktop Layout Spec)
画面の広さを活かし、「作業しながら相談できる」2ペイン構造を採用する。
左サイドバー (Navigation & History):
幅 250px 固定。
メニュー（Home, Calendar...）と、**「過去のチャット履歴（Auto-Tagged Threads）」**のリストを表示。
中央〜右エリア (Split View):
画面を左右に分割するのではなく、**「右下にチャットパネルが常駐する」スタイル、または「オーバーレイ」**スタイルを採用。
推奨: 画面右下に、スマホ版と同じ「Martyボタン」を配置。クリックすると、スマホ同様のパネルが右下からせり上がる（Popover）。
これにより、PCでも「カレンダーを見ながら指示」という体験を統一する。

5. インタラクション要件 (The "Magic" Logic)
ユーザーに「魔法だ」と思わせるための裏側の仕組み。
5.1. Context Injection (文脈注入)
ユーザーがMartyボタンを押した瞬間、フロントエンドは以下の処理を走らせる。
スナップショット取得: 現在開いているタブ（例: Calendar）、表示期間（例: 2026-02）、表示中のアイテム（例: 2/5の投稿データ）をJSON化する。
System Promptへの注入:
「User is currently viewing the Calendar. Visible items: [...]」という不可視のメッセージをAIに先行送信する。
ユーザー体験:
User: 「2/5のやつ、画像変えて」
AI: （JSONを見て理解）「承知しました。2月5日のInstagram投稿ですね。」
5.2. Auto-Tagging & Threading (自動整理)
チャット履歴の管理ロジック。
ユーザー: 明示的に「新規チャット」を作る必要はない。
AI: 会話の流れが変わった（例: インスタの話 → HPの話）と判断したら、裏側で thread_id を切り替え、適切なタイトル（例: "HP修正案件"）を付けて保存する。
履歴画面: ユーザーが履歴を見た時だけ、綺麗にフォルダ分けされた状態で表示される。
5.3. Generative UI (動的コンポーネント)
AIの回答はテキストだけではない。
回答例: 「カレンダーに予定を追加しました。」
UI動作: テキストが表示されると同時に、背面のカレンダー画面が**アニメーション付きで更新（予定がポンと現れる）**される。
リロード不要: SWR や TanStack Query を用い、裏側のDB更新を即座にUIに反映させる。

6. 技術スタック指示 (Tech Stack for Claude Code)
Frontend Components
Framework: Next.js 15 (App Router)
UI Library: Shadcn/UI (Radix UI base)
Styling: Tailwind CSS
Animations: Framer Motion (必須。モーダルの開閉やボタンのバウンスに使用)
Icons: Lucide React
Key Libraries
Bottom Sheet: vaul (React用ドロワーライブラリ。スマホネイティブな操作感を実現するために必須)
Calendar: react-big-calendar or @fullcalendar/react
Charts: recharts


追記：PC版プレビューのコスト最適化要件
PC版の右ペイン（Split View）の実装において、APIコストを抑制するために以下の技術戦略を採用すること。

Web Preview:

AIにHTMLを生成させて表示するのではなく、実際の構築済みサイトのURLを iframe で読み込む形式にすること。

修正時はサーバー側でファイルを更新し、iframeをリロードさせるだけで反映させること。

Generative UI (Charts/Calendar):

AIには「画像」ではなく、**「構造化データ (JSON)」**のみを生成させること。

描画（Rendering）はクライアントサイドのライブラリ（Recharts等）に任せること。