/**
 * User Learning Extractor
 * 会話から学習ポイントを抽出
 */

import type {
  UserLearning,
  LearningType,
  LearningExtractionResult,
  ConversationMessage,
} from "./types";

/** 抽出設定 */
interface ExtractionConfig {
  /** 最小メッセージ数（これ以上で抽出を試行） */
  minMessages?: number;
  /** ユーザーID */
  userId: string;
  /** スレッドID */
  threadId?: string;
}

/**
 * 会話から学習ポイントを抽出
 * Geminiを使用して会話を分析し、保存すべき学習を特定
 */
export async function extractLearningsFromConversation(
  messages: ConversationMessage[],
  config: ExtractionConfig
): Promise<LearningExtractionResult> {
  const minMessages = config.minMessages ?? 4;

  // メッセージ数が少なすぎる場合はスキップ
  if (messages.length < minMessages) {
    return {
      learnings: [],
      shouldExtract: false,
      reason: "Not enough messages",
    };
  }

  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!geminiKey) {
    return {
      learnings: [],
      shouldExtract: false,
      reason: "Gemini API key not configured",
    };
  }

  try {
    // 会話をテキストに変換
    const conversationText = messages
      .map((m) => `${m.role === "user" ? "ユーザー" : "Marty"}: ${m.content}`)
      .join("\n\n");

    // Gemini Flashで抽出（低コスト）
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: buildExtractionPrompt(conversationText),
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2000,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error("[LearningExtractor] Gemini API error:", response.status);
      return { learnings: [], shouldExtract: false, reason: "API error" };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // JSONを抽出
    const learnings = parseExtractionResponse(text, config.userId, config.threadId);

    return {
      learnings,
      shouldExtract: learnings.length > 0,
    };
  } catch (error) {
    console.error("[LearningExtractor] Error:", error);
    return { learnings: [], shouldExtract: false, reason: "Extraction failed" };
  }
}

/**
 * 抽出用プロンプトを構築
 */
function buildExtractionPrompt(conversation: string): string {
  return `あなたはユーザーの会話を分析し、将来のやり取りに役立つ情報を抽出するアシスタントです。

以下の会話を分析し、保存すべき「学習ポイント」をJSON形式で抽出してください。

## 抽出すべき学習タイプ

1. **business_context**: ビジネスの背景情報
   - 業種、事業内容、会社規模
   - ターゲット顧客層
   - ビジネスの目標・KPI

2. **recurring_topic**: 繰り返し相談されるトピック
   - よく質問するテーマ
   - 継続的に取り組んでいる施策

3. **preference**: 好みやスタイル
   - コミュニケーションスタイル（詳細派/要点派）
   - デザインや表現の好み

4. **past_decision**: 重要な決定事項
   - 採用を決めた戦略や施策
   - 却下した選択肢とその理由

5. **challenge**: 継続的な課題
   - 解決したい問題
   - ボトルネック

6. **success**: 成功事例
   - うまくいった施策
   - 良い結果が出た取り組み

7. **terminology**: 固有の用語
   - ユーザー独自の言い回し
   - 社内用語

## 抽出ルール

- 明確に述べられた情報のみ抽出（推測は低確信度）
- 一般的すぎる情報は除外
- プライバシーに関わる個人情報は除外
- 各学習の確信度(0.5-1.0)を設定

## 出力形式

\`\`\`json
{
  "learnings": [
    {
      "learningType": "business_context",
      "title": "飲食店を経営",
      "content": "東京で居酒屋を3店舗経営。30-40代のビジネスマンがメインターゲット。",
      "confidence": 0.95
    }
  ]
}
\`\`\`

学習ポイントがない場合は空配列を返してください。

---

## 会話内容

${conversation}

---

上記の会話から学習ポイントを抽出してください。JSON形式で出力:`;
}

/**
 * 抽出レスポンスをパース
 */
function parseExtractionResponse(
  text: string,
  userId: string,
  threadId?: string
): UserLearning[] {
  try {
    // JSONブロックを抽出
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : text;

    // JSONをパース
    const parsed = JSON.parse(jsonStr);
    const rawLearnings = parsed.learnings || [];

    // UserLearning形式に変換
    return rawLearnings
      .filter((l: Record<string, unknown>) => l.learningType && l.title && l.content)
      .map((l: Record<string, unknown>) => ({
        userId,
        learningType: l.learningType as LearningType,
        title: l.title as string,
        content: l.content as string,
        confidence: typeof l.confidence === "number" ? l.confidence : 0.8,
        sourceThreadId: threadId,
        isActive: true,
      }));
  } catch (error) {
    console.error("[LearningExtractor] Parse error:", error);
    return [];
  }
}

/**
 * 埋め込みベクトルを生成
 */
export async function generateLearningEmbedding(
  learning: UserLearning
): Promise<number[]> {
  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!geminiKey) return [];

  try {
    const text = `${learning.title}: ${learning.content}`;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: { parts: [{ text: text.slice(0, 2000) }] },
        }),
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data.embedding?.values || [];
  } catch {
    return [];
  }
}
