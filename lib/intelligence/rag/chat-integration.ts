/**
 * Marty Intelligence: Chat API Integration
 * チャットAPIにRAGを統合するためのヘルパー関数
 */

import { createRAGEngine, buildSystemPrompt, buildDefaultSystemPrompt, expandQuery } from "./index";
import type { RAGContext } from "../types";

/** RAG統合設定 */
interface RAGIntegrationConfig {
  /** RAGを有効にするか */
  enabled: boolean;
  /** 検索する最大知識数 */
  maxResults?: number;
  /** カテゴリフィルタ */
  category?: string;
}

/** System Prompt生成結果 */
interface SystemPromptResult {
  /** 生成されたSystem Prompt */
  systemPrompt: string;
  /** RAGコンテキスト（デバッグ用） */
  ragContext?: RAGContext;
  /** RAGが使用されたか */
  ragUsed: boolean;
}

/**
 * ユーザーメッセージからRAGコンテキストを取得し、System Promptを生成
 *
 * @param userMessage - ユーザーの最新メッセージ
 * @param existingSystemPrompt - 既存のSystem Prompt（ツール定義など）
 * @param config - RAG設定
 */
export async function generateSystemPromptWithRAG(
  userMessage: string,
  existingSystemPrompt: string,
  config: RAGIntegrationConfig = { enabled: true }
): Promise<SystemPromptResult> {
  // RAGが無効な場合
  if (!config.enabled) {
    return {
      systemPrompt: existingSystemPrompt,
      ragUsed: false,
    };
  }

  try {
    // OpenAI API Keyがない場合はRAGをスキップ
    if (!process.env.OPENAI_API_KEY) {
      console.warn("[RAG Integration] OPENAI_API_KEY not set, skipping RAG");
      return {
        systemPrompt: prependPersonaToPrompt(existingSystemPrompt),
        ragUsed: false,
      };
    }

    // RAGエンジンを作成
    const ragEngine = createRAGEngine({
      maxResults: config.maxResults || 5,
    });

    // クエリを拡張して検索
    const expandedQuery = expandQuery(userMessage);
    const ragContext = await ragEngine.retrieve(expandedQuery, config.category);

    // RAGコンテキストがある場合
    if (ragContext.retrievedKnowledge.length > 0) {
      console.log(
        `[RAG Integration] Retrieved ${ragContext.retrievedKnowledge.length} knowledge items`
      );

      // RAGベースのSystem Promptを生成
      const ragSystemPrompt = buildSystemPrompt(ragContext);

      // 既存のSystem Prompt（ツール定義部分）と結合
      const combinedPrompt = combinePrompts(ragSystemPrompt, existingSystemPrompt);

      return {
        systemPrompt: combinedPrompt,
        ragContext,
        ragUsed: true,
      };
    }

    // 知識が見つからなかった場合はデフォルトペルソナを使用
    console.log("[RAG Integration] No relevant knowledge found, using default persona");
    return {
      systemPrompt: prependPersonaToPrompt(existingSystemPrompt),
      ragUsed: false,
    };
  } catch (error) {
    console.error("[RAG Integration] Error:", error);
    // エラー時は既存のPromptを使用
    return {
      systemPrompt: existingSystemPrompt,
      ragUsed: false,
    };
  }
}

/**
 * RAG System PromptとTool System Promptを結合
 */
function combinePrompts(ragPrompt: string, toolPrompt: string): string {
  // 既存のPromptからペルソナ部分を除去（RAGのペルソナを使用するため）
  const toolSection = extractToolSection(toolPrompt);

  return `${ragPrompt}

${"=".repeat(50)}
【以下は、あなたが使えるツールと業務ルールです】
${"=".repeat(50)}

${toolSection}`;
}

/**
 * 既存のSystem Promptからツール定義部分を抽出
 */
function extractToolSection(prompt: string): string {
  // "## ツール" や "## 自律動作" 以降を抽出
  const toolMarkers = [
    "## ★★★ 自律動作モード",
    "## 自律動作",
    "## ツール",
    "### 業務ルール",
  ];

  for (const marker of toolMarkers) {
    const index = prompt.indexOf(marker);
    if (index !== -1) {
      return prompt.slice(index);
    }
  }

  // マーカーが見つからない場合は全体を返す
  return prompt;
}

/**
 * 既存のPromptにペルソナを追加
 */
function prependPersonaToPrompt(existingPrompt: string): string {
  const defaultPersona = buildDefaultSystemPrompt();

  return `${defaultPersona}

${"=".repeat(50)}
【以下は、あなたが使えるツールと業務ルールです】
${"=".repeat(50)}

${existingPrompt}`;
}

/**
 * マーケティング相談かどうかを判定
 * RAGを使うべきクエリかどうかを判断
 */
export function shouldUseRAG(message: string): boolean {
  const marketingKeywords = [
    // 戦略系
    "戦略",
    "マーケティング",
    "集客",
    "ブランド",
    "ファン",
    "顧客",
    "リピート",

    // SNS系
    "instagram",
    "インスタ",
    "sns",
    "フォロワー",
    "エンゲージメント",
    "投稿",
    "リール",

    // 質問系
    "どうすれば",
    "どうしたら",
    "教えて",
    "アドバイス",
    "相談",
    "コツ",
    "方法",

    // SEO・広告系
    "seo",
    "広告",
    "アクセス",
    "コンバージョン",

    // ビジネス系
    "売上",
    "収益",
    "成長",
  ];

  const lowerMessage = message.toLowerCase();

  // キーワードが含まれているか
  const hasKeyword = marketingKeywords.some((keyword) =>
    lowerMessage.includes(keyword.toLowerCase())
  );

  // 質問文かどうか（？が含まれる、または疑問系で終わる）
  const isQuestion =
    message.includes("？") ||
    message.includes("?") ||
    lowerMessage.endsWith("か") ||
    lowerMessage.endsWith("ですか") ||
    lowerMessage.endsWith("ますか");

  return hasKeyword || isQuestion;
}

/**
 * カテゴリをメッセージから推測
 */
export function inferCategory(message: string): string | undefined {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("instagram") ||
    lowerMessage.includes("インスタ") ||
    lowerMessage.includes("リール")
  ) {
    return "instagram";
  }

  if (lowerMessage.includes("seo") || lowerMessage.includes("検索")) {
    return "seo";
  }

  if (
    lowerMessage.includes("twitter") ||
    lowerMessage.includes("x") ||
    lowerMessage.includes("ツイート")
  ) {
    return "social";
  }

  // 特定できない場合はundefined（全カテゴリ検索）
  return undefined;
}
