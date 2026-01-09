/**
 * チャット履歴機能の型定義
 */

// Canvas モード
// "operation" - コンテンツプレビュー（WordPress, Instagram等）
export type CanvasMode = "home" | "calendar" | "analytics" | "operation" | "history";

// スレッド
export interface ChatThread {
  id: string;
  userId: string;
  title: string;
  preview: string | null;
  canvasMode: CanvasMode;
  canvasContext: Record<string, any>;
  messageCount: number;
  isArchived: boolean;
  summary: string | null;
  isSummarized: boolean;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

// スレッド作成リクエスト
export interface CreateThreadRequest {
  canvasMode?: CanvasMode;
  canvasContext?: Record<string, any>;
}

// スレッド更新リクエスト
export interface UpdateThreadRequest {
  title?: string;
  isArchived?: boolean;
  canvasMode?: CanvasMode;
  canvasContext?: Record<string, any>;
}

// チャットメッセージ
export interface ChatMessage {
  id: string;
  threadId: string | null;
  userId: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls: any[];
  metadata: Record<string, any>;
  createdAt: string;
}

// メッセージ保存リクエスト
export interface SaveMessageRequest {
  threadId: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: any[];
  metadata?: Record<string, any>;
}

// スレッド一覧レスポンス
export interface ThreadListResponse {
  threads: ChatThread[];
  total: number;
}

// スレッド詳細レスポンス（メッセージ付き）
export interface ThreadDetailResponse {
  thread: ChatThread;
  messages: ChatMessage[];
}

// タイトル生成レスポンス
export interface GenerateTitleResponse {
  title: string;
}

// 要約レスポンス
export interface SummarizeResponse {
  summary: string;
}

// RAG検索リクエスト
export interface SearchRequest {
  query: string;
  limit?: number;
  threshold?: number;
}

// RAG検索結果
export interface SearchResult {
  id: string;
  threadId: string;
  content: string;
  role: string;
  similarity: number;
}

// RAG検索レスポンス
export interface SearchResponse {
  results: SearchResult[];
  relatedThreads: ChatThread[];
}

// DB→フロントエンド変換ヘルパー型
export interface ChatThreadRow {
  id: string;
  user_id: string;
  title: string;
  preview: string | null;
  canvas_mode: string;
  canvas_context: Record<string, any>;
  message_count: number;
  is_archived: boolean;
  summary: string | null;
  is_summarized: boolean;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageRow {
  id: string;
  thread_id: string | null;
  user_id: string;
  session_id: string;
  role: string;
  content: string;
  tool_calls: any[];
  metadata: Record<string, any>;
  created_at: string;
}

// 変換関数の型
export function toThread(row: ChatThreadRow): ChatThread {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    preview: row.preview,
    canvasMode: row.canvas_mode as CanvasMode,
    canvasContext: row.canvas_context,
    messageCount: row.message_count,
    isArchived: row.is_archived,
    summary: row.summary,
    isSummarized: row.is_summarized,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    userId: row.user_id,
    sessionId: row.session_id,
    role: row.role as "user" | "assistant" | "system",
    content: row.content,
    toolCalls: row.tool_calls,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}
