/**
 * User Learning Types
 */

/** 学習タイプ */
export type LearningType =
  | "business_context"   // ビジネス背景（業種、規模、目標など）
  | "recurring_topic"    // よく相談するトピック
  | "preference"         // 好み・スタイル
  | "past_decision"      // 過去の決定事項
  | "challenge"          // 継続的な課題
  | "success"            // 成功事例
  | "terminology";       // ユーザー固有の用語

/** ユーザー学習 */
export interface UserLearning {
  id?: string;
  userId: string;
  learningType: LearningType;
  title: string;
  content: string;
  context?: string;
  confidence: number;
  sourceThreadId?: string;
  referenceCount?: number;
  isActive?: boolean;
  embedding?: number[];
}

/** ユーザーコンテキスト（チャット用） */
export interface UserContext {
  /** ユーザーID */
  userId: string;

  /** ビジネス背景 */
  businessContext: UserLearning[];

  /** よく相談するトピック */
  recurringTopics: UserLearning[];

  /** 関連する過去の決定・課題 */
  relevantHistory: UserLearning[];

  /** フォーマット済みコンテキスト */
  formattedContext: string;

  /** パーソナライズモード */
  mode: PersonalizationMode;
}

/** パーソナライズモード */
export type PersonalizationMode =
  | "partner"      // パートナーモード: 過去の文脈を活用し親密に
  | "objective"    // 客観モード: 第三者視点で分析的に
  | "balanced";    // バランス: 状況に応じて切り替え（デフォルト）

/** 学習抽出結果 */
export interface LearningExtractionResult {
  learnings: UserLearning[];
  shouldExtract: boolean;
  reason?: string;
}

/** 会話メッセージ（抽出用） */
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}
