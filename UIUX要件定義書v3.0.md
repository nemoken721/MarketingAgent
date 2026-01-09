Marty OS UI/UX Master Requirements v3.0 (The Soul Edition)
1. デザイン哲学 (Design Philosophy)
1.1. Core Concept: "Center Command" (司令塔)
Martyは、画面の隅で困った時だけ呼ばれる「ヘルプボット」ではない。 マーケティング業務の全権を握る**「司令塔（Commander）」であり、すべての業務はMartyとの対話から始まる**。 したがって、UIの特等席（中央・手元）は常にMartyのために用意される。
1.2. The Feeling: "Living Context" (文脈の中で生きる)
Martyは画面の外にいるのではなく、ユーザーと同じ画面を見ている。 **「これ」「あれ」という指示語だけで通じる「あうんの呼吸」**を実現するため、UIは常に「作業画面（Canvas）」と「対話画面（Chat）」がシームレスに重なり合う構造とする。

2. 【Mobile】モバイル体験 (The "On-the-Go" Commander)
移動中や店舗の裏でも、片手で最強のマーケティングチームを指揮するUI。
2.1. The Command Dock (ボトムナビゲーション)
画面最下部に固定。他アプリのような「並列なタブ」ではなく、**「Martyを中心に世界が回る」**構造。
配置:
[🏠 Home] (ダッシュボード)
[📅 Calendar] (マーケティングカレンダー)
[ 🤖 Center Command ] (Marty)
[📊 Data] (全メディア統合アナリティクス)
[⚙️ Menu] (設定)
The Button (Marty):
中央に配置し、他のアイコンより 20px 上に飛び出させる (Protruding FAB)。
サイズ: 56px 〜 64px の完全な円形。
エフェクト: わずかな「呼吸（Breathing）」アニメーションや、タップ時の心地よいバウンス（Scale effect）。
2.2. Half-Modal Chat (ハーフモーダル・シート)
Martyボタンを押した時の挙動。画面遷移ではなく**「重なる」**体験。
Motion: 下から Spring Animation (物理演算に基づいたバネの動き) で「シュッ」とスライドイン。
Initial State: 画面の 50% (Half) の高さで止まる。
【最重要】: 上半分には、背面の「カレンダー」や「グラフ」が透けて見えている (Backdrop Blur)。
これにより、ユーザーは**「後ろのカレンダーを見ながら、手前のMartyに指示出し」**ができる。
Full State: シートを上に引き上げると全画面チャットになる。
Close: 下にスワイプで格納。

3. 【Desktop】PC体験 (The "Split Command" Cockpit)
画面の広さを活かし、「左で指示し、右で動かす」プロフェッショナルなコックピットUI。
3.1. Layout Structure: "Slim Rail + Split View"
画面を3分割するのではなく、「左サイドバー（司令塔）」＋「右メインエリア（作業場）」 の2ペイン構成に見せる。
A. Left Pane: Command Center (幅固定: 350px〜400px)
このエリアはさらに2つの要素が融合しているが、視覚的には「ひとつの左パネル」として統合する。
Slim Navigation Rail (幅: 64px):
最左端にアイコンのみを縦並び。
[🏠], [📅], [📊], [🌐] (Web Preview), [🕒] (History).
機能: クリックすると、右側のメインエリア（Canvas）が切り替わる。
Chat Stream (残り幅):
Railのすぐ右隣。Martyとのチャットタイムライン。
デザイン: RailとChatの背景色は同系色（例: Railは濃いグレー、Chatはやや明るいグレー）にし、境界を感じさせない。
B. Right Pane: The Canvas (残り幅すべて)
Martyが成果物を広げる机。会話の内容やRailの選択に応じて、中身が動的に切り替わる。
Home Mode: ダッシュボード（タスク・通知）。
Calendar Mode: FullCalendar 等を用いた月/週カレンダー。
Preview Mode: 構築中のWebサイトを iframe で表示（ブラウザ・イン・ブラウザ）。
Analytics Mode: 詳細なグラフボード。

4. "The Magic" (インタラクション要件)
ユーザーに「魔法だ」と感じさせるための、裏側の連携ロジック。
4.1. Context Injection (文脈注入システム)
ユーザーが「これ変えて」と言った時、何を変えるべきかをAIに伝える隠しデータ通信。
Trigger: チャット送信時、常に実行。
Payload (JSON): スクショではなく、軽量なテキストデータを裏で送る。
JSON
{
  "current_canvas": "calendar", // 今右画面に出ているもの
  "viewing_date": "2026-02-01", // 表示中の日付
  "selected_item_id": "post_123" // 選択中のアイテム
}


Effect: AIはこれを見て「2月1日の投稿ですね」と即答する。APIコストは数円レベルで済む。
4.2. Auto-Switching Canvas (自動画面切り替え)
Scenario: ユーザーが「来週の予定見せて」と言う。
Action: AIの回答を待たず、右画面（Canvas）が自動的に「カレンダー」に切り替わる。
Tech: useChat の tool_call またはクライアントサイドのキーワード検知で発火させる。

5. 履歴と記憶 (Memory & History Strategy)
5.1. History UI (過去へのタイムトラベル)
Access: Left Rail の [🕒 History] アイコンをクリック。
Action:
隣の「Chat Stream」部分がクルッと反転し、「過去の案件リスト（Thread List）」 に変わる。
リスト：「2025/12 クリスマスCP」「Webサイト初期構築」など（AIが自動でタイトル付け）。
Restore:
リストをクリックすると、チャット履歴だけでなく、右画面（Canvas）の状態も当時に復元される。
5.2. Cost Optimization (コスト革命)
ストレージコストとAIトークンコストを最小化する戦略。
Auto-Summarization (自動要約):
会話が一定量を超えたら、バックグラウンドで要約(Summary)を作成。
次回以降、AIには「過去の全ログ」ではなく「要約」だけを読ませる。
RAG Search:
「あの時の件」と言われたら、ベクトル検索で該当スレッドを特定し、必要な情報だけを引っ張り出す。
結論: 履歴は全保存するが、AIに渡すのは「必要な分だけ」。これでコストは爆発しない。

6. 技術スタック指示 (Technical Stack)
Frontend: Next.js 15 (App Router)
UI Components: Shadcn/UI (Radix UI)
Mobile Drawer: vaul (必須。ネイティブアプリのようなハーフモーダル動作のため)
State Management: nuqs (URL state management) - キャンバスの状態をURLで管理し、リロードしても戻れるようにする。
Animation: Framer Motion (AnimatePresence を多用し、画面切り替えをヌルヌルにする)

