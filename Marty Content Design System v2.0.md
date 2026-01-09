Marty Content Design System v2.0 (The Visual & Animation Bible)
0. Canvas Specifications (キャンバス定義・解像度)
全てのデザインテンプレートは、単一のコードベースから、以下の2つの出力モードへ完璧にレスポンシブ対応しなければならない。
0.1. Mode A: Reels (動画・リール用)
Aspect Ratio: 9:16 (縦長全画面)
Resolution: 1080px × 1920px
Safe Zone Logic (UI被り防止):
Top Padding: 200px (カメラアイコン回避)
Bottom Padding: 200px (キャプション・プロフィール回避)
Side Padding: 40px (左右のアイコン回避)
Rule: テキストや重要なグラフィック要素は、必ずこのSafe Zoneの内側に配置すること。背景画像のみ全画面 (h-full w-full object-cover) とする。
0.2. Mode B: Feed / Carousel (フィード・画像用)
Aspect Ratio: 4:5 (Instagram最適化サイズ)
Resolution: 1080px × 1350px
Padding Rule: コンテンツの美しさを保つため、四方に均一な 60px 以上のパディングを確保する。Safe Zoneによる巨大な余白は適用しない。

1. Global Design Rules ("鉄の掟")
以下のCSSルール（Tailwind CSSクラス）は、「法的拘束力を持つ」レベルで全てのコンポーネントに強制適用すること。AIによる勝手な変更や省略は認めない。
1.1. Typography (文字の品格)
Font Family: font-family: 'Noto Sans JP', sans-serif; (Google Fontsより 400, 500, 700 をロード)。
Line Height (行間): 本文には必ず leading-relaxed (1.625) 以上を適用する。詰まった行間は「素人っぽさ」の主原因となるため厳禁。
Letter Spacing (字間): 日本語のベタ打ち感を排除するため、常に tracking-wide (0.025em) をベースとする。タイトル等の短文は tracking-widest も許容する。
Contrast: 文字色は真っ黒 (#000) ではなく、text-slate-800 を使用し、視認性と上品さを両立させる。
1.2. Depth & Spacing (奥行きと余白)
Card Design: 吹き出しやパネルには、のっぺり感を消すために shadow-xl を使用する。
Shadow Color: デフォルトの黒影は汚く見えるため、必ず shadow-slate-400/20 (薄いブルーグレーの影) に色を調整する。
Padding Strategy: コンテンツが窮屈にならないよう、「余白は恐れずに取る」。枠線ギリギリの配置は禁止。

2. The 5 Content Frames (詳細テンプレート仕様)
以下の5つのコンポーネントを React + Tailwind で実装する。動画化 (Remotion) を前提としたアニメーション定義を含む。
Frame 1: "The Talk" (LINE風チャット)
Visual Concept: 親近感、リアルな相談。
Layout:
背景: bg-slate-100 (薄いグレー)。
Customer Bubble (左): bg-white, text-slate-800, rounded-2xl rounded-tl-none, shadow-sm.
Shop Bubble (右): bg-[var(--primary-color)], text-white, rounded-2xl rounded-tr-none, shadow-md.
Motion (Reels):
Sequence: 会話のタイムスタンプ順に、下から Slide-Up + Fade-In でポコポコと出現させる。
Timing: 読む速度を考慮し、1吹き出しにつき 1.5秒〜2.0秒 の間隔を空ける。
Frame 2: "The Magazine" (雑誌見出し風)
Visual Concept: 権威性、ノウハウ提供。
Layout:
Structure: 画像とテキストの境界線を明確にする、または全画面画像に白のオーバーレイ (bg-white/90) を重ねる。
Typography: タイトルは font-serif (明朝体), text-3xl, font-bold。
Decoration: タイトルの下に細いボーダー (border-b-2 border-slate-300) と、装飾用の英語筆記体 (font-script) を配置。
Motion (Reels):
Image: 背景画像を Slow Zoom-Out (Ken Burns Effect) でゆっくり動かす。
Text: タイトルと本文を左から Staggered Slide-In (時間差スライド) させる。
Frame 3: "The Memo" (スマホメモ/SNS風)
Visual Concept: エモさ、独り言、本音。
Layout:
UI Components: 上部にフェイクのステータスバー（時計・Wifi・バッテリー）を配置しリアリティを出す。
Canvas: 背景は bg-white または bg-yellow-50 (クリーム色)。罫線 (border-b) を引くオプションあり。
Typography: 手書き風フォント、または font-sans。行間は leading-loose (2.0) でたっぷりと取る。
Motion (Reels):
Text: Typewriter Effect (カーソルが点滅しながら一文字ずつ打たれる演出) を適用する。
Frame 4: "The Cinema" (映画字幕風)
Visual Concept: 世界観、ブランディング。
Layout:
Background: 全画面画像 (object-cover).
Overlay: 視認性確保のため、下部 50% に bg-gradient-to-t from-black/90 to-transparent を重ねる。
Subtitle: 画面下部中央。白文字。font-serif, tracking-widest, サイズはあえて小さめ (text-sm or text-base)。
Motion (Reels):
Image: ゆっくりと横に Pan (移動) させる。
Subtitle: じわっと浮き出る Fade-In。
Frame 5: "The Quiz" (参加型クイズ)
Visual Concept: エンゲージメント向上。
Layout:
Header: 大きな「Q.」の文字と質問文。
Buttons: 2つまたは4つの選択肢エリア。ボタンは border-b-4 (下線太め) で立体感を出し、「押せそう」なデザインにする。
Motion (Reels):
Progress: 画面上部でカウントダウンバーが減っていく。
Interaction: 最後に正解のボタンが Blink (点滅) して強調される。

3. Brand Variable System (着せ替えロジック)
「量産型」を防ぐため、以下のCSS変数をルートレベルで注入し、全てのテンプレートの色と形を動的に変化させる。
--primary-color: ブランドのメインカラー（吹き出し、強調文字、ボタン色に適用）。
--font-stack: sans-serif (ゴシック) か serif (明朝) かの切り替え。
--radius-md: 角丸の強さ。
Pop: 1rem (丸め)
Sharp: 0px (四角)

