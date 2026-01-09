Marty Functional Requirements v2.0 (The Definitive Edition)
1. システム基本概念 (Core Concepts)
1.1. Product Philosophy: "Ready to Post"
定義: ユーザーによる修正、編集、見直しを不要とする「完パケ（完成品）」を提供する。
目標: 「アドバイス」で終わらせず、「制作代行」までを完全に自動化し、プロレベルの品質を担保する。
禁止事項: 「下書き」レベルの提出。AI特有の崩れた画像生成。
1.2. The Hybrid Intelligence (脳の構造)
Core Layer (不変の憲法): 「ファンベース戦略」「既存客の重視」など、管理者のみが更新可能な絶対的な行動規範。
Trend Layer (可変の知識): 後述する「月次自動学習システム」により更新される最新トレンド。
判断ロジック: Trend（流行）がCore（憲法）と矛盾する場合、必ずCoreを優先しつつ、流行を取り入れた折衷案を提示する。

2. 自動学習システム要件 (Automated Learning Engine)
2.1. Crawler Logic (月次アップデート)
頻度: 毎月1日 AM 0:00 (JST) 定期実行 ＋ 管理者による「強制実行ボタン」。
収集戦略 (Diff Crawling): 前回学習日 (last_crawled_at) 以降に公開された記事のみを収集・要約・ベクトル化してDBに格納する。
通知機能: 学習完了後、前月との差分を分析し、「今月のトレンド変更点」をユーザーダッシュボードに通知する。
2.2. Trusted Source Whitelist (情報源の厳格な指定)
以下の10ソース以外からの学習を禁止する。
Group A: Official / Primary (via API/Text)
Instagram @creators: 公式のベストプラクティス。
Adam Mosseri (@mosseri): アルゴリズム変更の一次情報。
Meta Newsroom: 公式プレスリリース。
Group B: Global Authority (via Web Crawling) 4. Social Media Today: 最新ニュースの最速ソース。 5. Later Blog: デザイン・ビジュアルトレンドの分析。 6. Hootsuite Blog: 検証データ・実験結果。 7. Search Engine Journal: SEO・技術的アルゴリズム解説。
Group C: Domestic Context (via Web Crawling) 8. Gaiax Social Media Lab: 日本国内の事例・統計。 9. Web担当者Forum: 企業コンプライアンス・運用論。 10. ferret: 初心者向けの噛み砕いた解説・トーン。

3. コンテンツ生成フロー要件 (Content Generation Logic)
3.1. The 3 Output Paths (出力パスの分岐)
ユーザーの「素材有無」に基づき、以下の3形式へ分岐・出力する。
Path A: Carousel (読むインスタ)
Input: 素材なし。テーマのみ。
Format: Aspect Ratio 4:5 (1080x1350) の静止画 × 5枚連番。
Structure: 表紙 → 導入 → 解説(2枚) → まとめ/誘導。
Path B: Feed (一枚の写真で語る)
Input: ユーザー提供写真 1枚。
Format: Aspect Ratio 4:5 (1080x1350) の静止画 × 1枚。
Logic: 写真の雰囲気を解析(Vision API)し、キャッチコピーを配置。
Path C: Reels (見るラジオ/動画)
Input: 素材あり(写真複数枚) or なし(AI生成)。
Format: Aspect Ratio 9:16 (1080x1920) のMP4動画。
Logic: 画像スライドショー ＋ 動的アニメーションテキスト ＋ 音声合成(TTS)。
3.2. Safe Zone Logic (UI被り防止ロジック)
動画生成時（Path C）において、プラットフォームのUI要素による視認性低下を防ぐため、以下のロジックを実装する。
判定: 出力モードが Reels の場合のみ発動。
処理: 上下 200px、左右 40px の領域を「コンテンツ配置禁止区域」とし、テキスト要素を強制的にこの内側に配置する座標計算を行う。
3.3. Uniqueness Engine (脱・量産型ロジック)
全ユーザーが同じような投稿になることを防ぐため、以下の変数を生成プロセスに注入する。
Brand DNA: ユーザー設定（カラー、フォント、口調）を適用。
Specific Episode Injection: 生成プロンプト実行前に、必ず「ワン・クエスチョン（昨日のお客様との具体的な会話など）」をユーザーに入力させ、それをネタの核とする。

4. クリエイティブ生成制御 (Generation Constraints)
4.1. "Faceless" Prompt Strategy (AI臭の排除)
画像生成AI（DALL-E 3等）を使用する場合、以下のプロンプト制御を強制する。
Negative Prompts: human face, smiling face, distorted fingers, text, watermark.
Positive Strategy:
Parts Shot: 手元、道具、髪のアップ。
Back View: 人物の後ろ姿。
Scene: 店内の風景、光と影、インテリア。
Goal: 「不気味なAI顔」の生成リスクをゼロにするため、意図的に顔を描画させない。
4.2. Copywriting Framework
テキスト生成には以下のフレームワークを適用し、素人感を排除する。
PAS法: Problem（問題）→ Agitation（煽り）→ Solution（解決）。
Targeting: 「みなさん」ではなく「〇〇で悩んでいるあなた」への呼びかけ。
Style Transfer: ユーザーの過去投稿を分析し、文体（絵文字の量、改行の癖、語尾）を模倣する。
4.3. Rendering Engine (技術選定)
Code-Based Rendering:
画像・動画内の文字やレイアウトは、生成AI（画像生成）ではなく、Reactコンポーネント + Tailwind CSS で描画する。
これにより、文字崩れやレイアウト崩れを100%防止する。
Export Tools:
静止画: vercel/og または puppeteer。
動画: Remotion (React video framework)。

