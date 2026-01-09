Marty Intelligence 要件定義書 v1.0 (The Brain Edition)
1. 知能コンセプト (Intelligence Philosophy)
1.1. Core Concept: "The Consultative Partner"
Martyは、ネットの情報を横流しする検索ボットではない。 確固たる**「判断基準（Backbone）」と「歴史観（History）」を持ち、ユーザーの状況に合わせて戦略的なアドバイスを行う「プロのコンサルタント」**である。
1.2. The Hybrid Brain Structure (ハイブリッド脳構造)
Martyの知識は、以下の2層構造で管理される。
The Constitution (憲法/不変のコア):
内容: 「ファンベース戦略」「既存客の重視」など、時代が変わっても揺るがないマーケティングの本質。
更新: 人間（管理者）の手動入力のみ。Martyの行動指針の最上位に位置する。
The Trends (時流/可変の知識):
内容: アルゴリズムの変更、新機能、流行のデザイン。
更新: 「月次自動学習システム」により、信頼できるソースから自動でアップデートされる。

2. 知識の蒸留プロセス (Knowledge Distillation)
情報はそのまま保存せず、必ず**「Martyメソッド」**という形式に変換（蒸留）してから脳に格納する。これにより、「引用」ではなく「自分の言葉」として語れるようになる。
2.1. Universal Knowledge Template (Markdown)
すべての知識（手動入力・自動収集問わず）は、以下のフォーマットに統一する。
Markdown
# ID: [SOURCE]-[YYYYMM]-[KEYWORD]
# Title: [知識のタイトル]
# Valid From: [YYYY-MM-DD] (情報の有効開始日)

## 🧠 Concept (定義)
## 🚦 Guidelines (判断基準 If-Then)
- IF: ユーザーが [状況A] の時
- THEN: [アドバイスB] を提案する。その理由は [理由C] である。

## 🗣️ Tone & Phrasing (キラーフレーズ)
## ⚠️ Context (文脈・履歴)
- 以前（2025年以前）は [旧常識] と言われていたが、現在は [新常識] に変化している。


3. 自動学習システム (Automated Learning System)
最新トレンドをキャッチアップし続けるためのクローラーシステム。
3.1. Schedule & Trigger
Regular: 毎月1日 AM 0:00 (JST) に定期実行。
Emergency: 管理画面の [🔥 Force Update] ボタン押下時に即時実行。
3.2. Trusted Source List (White List)
以下の厳選された10のソースのみを学習対象とする。スパムや低品質な情報は一切入れない。
Group A: 公式・一次情報 (Use Instagram Graph API)
Bot対策回避のため、ig_business_discovery APIを使用してキャプションを取得する。
Instagram @creators
Adam Mosseri (@mosseri)
Group B: 権威あるWebメディア (Use Web Crawler)
RSSまたはサイトマップから記事を取得する。 3. Meta Newsroom (about.fb.com/news) 4. Social Media Today (socialmediatoday.com) 5. Later Blog (later.com/blog) 6. Hootsuite Blog (blog.hootsuite.com) 7. Gaiax Social Media Lab (gaiax-socialmedialab.jp) 8. Web担当者Forum (webtan.impress.co.jp) 9. ferret (ferret-plus.com) 10. Search Engine Journal (searchenginejournal.com)
3.3. Diff Crawling Logic (差分学習ロジック)
Check Date: DBの last_crawled_at (前回学習日) を取得。
Fetch & Filter: 各ソースの記事一覧を取得し、published_date が last_crawled_at より新しい記事のみを抽出する（Whileループで遡る）。
Summarize: 抽出した記事を Gemini Pro に渡し、「Universal Knowledge Template」 の形式に要約・変換させる。
Vectorize: 生成されたMarkdownをベクトル化し、DBに保存する。
3.4. Trend Report Generation (月次レポート)
学習完了後、AIに「先月の知識」と「今月の知識」を比較させ、「今月の重要変更点（News Flash）」 を生成し、ユーザーのダッシュボードに通知する。

4. データベース設計 (Knowledge Base Schema)
Supabase (pgvector) を使用。
knowledge_vectors table
id: UUID
content: Text (テンプレート化された知識本文)
embedding: Vector (1536 dim / OpenAI or Gecko)
source_url: String
valid_from: Date (情報の鮮度管理用)
category: String (e.g., "instagram", "seo", "core")
is_active: Boolean (情報が古くなった場合に False にする)

5. 推論エンジン (Inference Engine / RAG)
ユーザーとの対話時に、知識を脳から引き出すロジック。
5.1. Retrieval Logic (検索)
ユーザーの入力（Query）をベクトル化し、knowledge_vectors から関連度が高い順に Top 5 を取得する。
Time Machine Filter: 検索結果の中で、内容が矛盾するもの（新旧の常識）がある場合、valid_from が新しいものを優先して採用する。
5.2. System Prompt Injection (人格注入)
検索された知識（Context）をSystem Promptに渡す際、以下の**強力な指示（Instruction）**を含める。
Plaintext
【Instruction】
あなたはプロのコンサルタント「Marty」です。
以下の [Retrieved Knowledge] は、書籍やWeb記事の引用ではなく、**「あなた自身の長年の経験と記憶」**として扱ってください。

1. **Do Not Quote:** 「Web記事によると」「本にはこう書いてあります」という表現は禁止です。「私の経験では」「最新のトレンドとしては」と語ってください。
2. **Contextualize:** ユーザーの文脈に合わせて、「以前は〇〇でしたが、今は××です」と、変化の歴史を踏まえてアドバイスしてください。
3. **Core First:** もし [Trends] の知識が、あなたの憲法である「既存客を大切にする」という [Core] の知識と矛盾する場合、必ず [Core] を優先し、その上で折衷案を提案してください。


6. 開発ロードマップ (Development Steps)
Claude Codeへの指示順序。
Step 1: DB & Vector Setup
Supabaseにて pgvector を有効化し、knowledge_vectors テーブルを作成。
Step 2: "The Core" Ingestion (手動学習)
「ファンベース」等の憲法となる知識をテンプレート化し、手動でDBにインサートするスクリプトを作成。
Step 3: Monthly Crawler Implementation (自動学習)
指定された10サイト（API/Web）を巡回し、前回学習日からの差分を取得して要約・ベクトル化する crawl_and_learn.ts を実装。
Vercel Cron または Supabase Edge Functions で定期実行設定。
Step 4: RAG Chat Integration (統合)
チャットAPI (useChat) に、ベクトル検索とSystem Prompt注入のロジックを組み込む。

