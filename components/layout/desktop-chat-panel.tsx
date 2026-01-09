"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useChat, Message } from "ai/react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ImageIcon, Sparkles, Plus, Trash2, Loader2, Square, CheckCircle2, Circle, ChevronDown, ChevronUp, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

// ツール名を日本語に変換
function getToolDisplayName(toolName: string): string {
  const toolNames: Record<string, string> = {
    // WordPress操作
    createWordPressPage: "ページ作成",
    updateWordPressPage: "ページ更新",
    getWordPressPages: "ページ一覧取得",
    deleteWordPressPage: "ページ削除",
    addWordPressCustomCSS: "CSS追加",
    getWordPressThemeInfo: "テーマ情報取得",
    installWordPressPlugin: "プラグインインストール",
    activateWordPressPlugin: "プラグイン有効化",
    getWordPressPlugins: "プラグイン一覧取得",
    uploadWordPressMedia: "メディアアップロード",
    getWordPressMedia: "メディア取得",
    // 画像生成
    generateImage: "画像生成",
    // 表示系
    showWordPressOperationProgress: "操作進捗表示",
    showPlanningBoard: "計画ボード表示",
    showConstructionRoadmap: "構築ロードマップ表示",
    showDNSGuide: "DNS設定ガイド表示",
    showServerAuthForm: "サーバー認証フォーム表示",
    showWordPressAdminForm: "WordPress管理フォーム表示",
    showConstructionProgress: "構築進捗表示",
    showSSLSetupForm: "SSL設定フォーム表示",
    showAffiliateLinks: "アフィリエイトリンク表示",
    // その他
    switchCanvas: "Canvas切り替え",
    analyzeImage: "画像分析",
  };
  return toolNames[toolName] || toolName;
}

// シンプルなステータス表示 - 思考中/作業中のみ
function SimpleStatusIndicator({
  messages,
  isLoading
}: {
  messages: Message[];
  isLoading: boolean;
}) {
  if (!isLoading) return null;

  // 最新メッセージからツール呼び出しを確認
  const lastMessage = messages[messages.length - 1];
  const toolInvocations = lastMessage?.role === "assistant"
    ? (lastMessage.toolInvocations || [])
    : [];

  const hasActiveTools = toolInvocations.some(
    (ti: any) => ti.state === "call" || ti.state === "partial-call"
  );

  return (
    <div className="mx-3 mb-2 flex items-center gap-2 text-sm text-blue-300">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"
      />
      <span>{hasActiveTools ? "作業中..." : "思考中..."}</span>
    </div>
  );
}

// チャット内のツール履歴表示コンポーネント（吹き出しなし）
function ToolHistoryItem({ toolInvocation }: { toolInvocation: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isSuccess = toolInvocation.result?.success !== false;
  const toolName = getToolDisplayName(toolInvocation.toolName);

  return (
    <div className="my-1">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-300 transition-colors"
      >
        {isSuccess ? (
          <CheckCircle2 className="w-3 h-3 text-green-500" />
        ) : (
          <Circle className="w-3 h-3 text-red-500" />
        )}
        <span>{toolName}</span>
        <ChevronDown className={cn(
          "w-3 h-3 transition-transform",
          isExpanded && "rotate-180"
        )} />
      </button>

      {isExpanded && toolInvocation.result && (
        <div className="mt-1 ml-5 p-2 bg-slate-800/50 rounded text-xs text-gray-400 max-h-32 overflow-auto">
          {toolInvocation.result.pageUrl && (
            <a
              href={toolInvocation.result.pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline block mb-1"
            >
              {toolInvocation.result.pageUrl}
            </a>
          )}
          {toolInvocation.result.error && (
            <span className="text-red-400">{toolInvocation.result.error}</span>
          )}
          {!toolInvocation.result.pageUrl && !toolInvocation.result.error && (
            <span className="text-green-400">完了</span>
          )}
        </div>
      )}
    </div>
  );
}

// AI状態表示コンポーネント（シンプル版 - 進捗ログと併用）
function AIStatusIndicator({ isThinking, hasTools }: { isThinking: boolean; hasTools: boolean }) {
  // 進捗ログがあるので、このインジケーターは不要
  return null;
}

// Generative UI Components
import { PlanningBoard } from "../generative-ui/planning-board";
import { ImagePreview } from "../generative-ui/image-preview";
import { ConstructionRoadmap } from "../generative-ui/construction-roadmap";
import { DNSGuideCard } from "../generative-ui/dns-guide-card";
import { ServerAuthForm } from "../generative-ui/server-auth-form";
import { WordPressAdminForm } from "../generative-ui/wordpress-admin-form";
import { ConstructionProgress } from "../generative-ui/construction-progress";
import { SSLSetupForm } from "../generative-ui/ssl-setup-form";
import { AffiliateLinksCard } from "../generative-ui/affiliate-links-card";
import { WordPressOperationProgress } from "../generative-ui/wordpress-operation-progress";
import ImageGenerationModal from "../image-generation-modal";
import type { CanvasMode } from "./desktop-nav-rail";
import { ChatThread, ChatMessage } from "@/types/chat";

// 吹き出し分割用の型定義
interface MessageBubble {
  id: string;
  texts: string[];
  tools: any[];
}

// メッセージをstep-startで分割して複数の吹き出しに変換
function splitMessageIntoBubbles(message: Message): MessageBubble[] {
  const bubbles: MessageBubble[] = [];
  let currentBubble: MessageBubble = { id: `${message.id}-0`, texts: [], tools: [] };
  let bubbleIndex = 0;
  const meaninglessPatterns = /^[。、.・\s,，．…！？!?]+$/;

  // partsがある場合はpartsベースで分割
  const parts = (message as any).parts;
  if (parts && Array.isArray(parts)) {
    for (const part of parts) {
      if (part.type === "step-start") {
        // 現在のバブルに内容があれば保存して新規作成
        if (currentBubble.texts.length > 0 || currentBubble.tools.length > 0) {
          bubbles.push(currentBubble);
          bubbleIndex++;
          currentBubble = { id: `${message.id}-${bubbleIndex}`, texts: [], tools: [] };
        }
      } else if (part.type === "text" && part.text) {
        const text = part.text.trim();
        if (text.length > 0 && !meaninglessPatterns.test(text)) {
          currentBubble.texts.push(text);
        }
      } else if (part.type === "tool-invocation" && part.toolInvocation) {
        if (part.toolInvocation.state === "result") {
          currentBubble.tools.push(part.toolInvocation);
        }
      }
    }
  } else {
    // partsがない場合は従来のロジック
    const textContent = message.content?.trim() || "";
    if (textContent.length > 0 && !meaninglessPatterns.test(textContent)) {
      currentBubble.texts.push(textContent);
    }
    if (message.toolInvocations) {
      for (const ti of message.toolInvocations) {
        if ((ti as any).state === "result") {
          currentBubble.tools.push(ti);
        }
      }
    }
  }

  // 最後のバブルを追加
  if (currentBubble.texts.length > 0 || currentBubble.tools.length > 0) {
    bubbles.push(currentBubble);
  }

  return bubbles;
}

interface DesktopChatPanelProps {
  currentCanvas: CanvasMode;
  contextData?: Record<string, any>;
  showHistory: boolean;
  // Canvas連携
  onContextChange?: (data: Record<string, any>) => void;
  // スレッド関連
  threads?: ChatThread[];
  currentThreadId?: string | null;
  currentThread?: ChatThread | null;
  currentMessages?: ChatMessage[];
  threadsLoading?: boolean;
  onThreadSelect?: (threadId: string) => void;
  onNewThread?: () => void;
  onCreateThread?: (canvasMode?: CanvasMode, canvasContext?: Record<string, any>) => Promise<ChatThread | null>;
  onDeleteThread?: (threadId: string) => void;
  onGenerateTitle?: (threadId: string) => Promise<string | null>;
  onSaveMessage?: (
    role: "user" | "assistant" | "system",
    content: string,
    toolCalls?: any[],
    metadata?: Record<string, any>,
    generateEmbedding?: boolean,
    threadIdOverride?: string
  ) => Promise<ChatMessage | null>;
  setCurrentMessages?: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
}

export function DesktopChatPanel({
  currentCanvas,
  contextData,
  showHistory,
  onContextChange,
  threads = [],
  currentThreadId,
  currentThread,
  currentMessages = [],
  threadsLoading = false,
  onThreadSelect,
  onNewThread,
  onCreateThread,
  onDeleteThread,
  onGenerateTitle,
  onSaveMessage,
  setCurrentMessages,
}: DesktopChatPanelProps) {
  const [showImageModal, setShowImageModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);
  const [titleGeneratedForThread, setTitleGeneratedForThread] = useState<string | null>(null);
  // 新規作成されたスレッドIDを追跡（非同期の競合を防ぐ）
  const pendingThreadIdRef = useRef<string | null>(null);
  const messageCountRef = useRef(0);
  // 前回のスレッドIDを追跡（スレッド切り替え検出用）
  const prevThreadIdRef = useRef<string | null | undefined>(undefined);

  // Convert ChatMessage[] to AI SDK Message[]
  const initialMessages: Message[] = currentMessages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: new Date(m.createdAt),
    toolInvocations: m.toolCalls?.length > 0 ? m.toolCalls : undefined,
  }));

  // Context Injection with useChat
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: originalHandleSubmit,
    isLoading,
    error,
    setMessages,
    stop,
  } = useChat({
    api: "/api/chat",
    body: {
      context: {
        currentCanvas,
        threadId: currentThreadId,
        ...contextData,
      },
    },
    initialMessages: currentThreadId ? initialMessages : [],
    onResponse: (response) => {
      console.log("Response received:", response.status);
    },
    onFinish: async (message) => {
      // 現在のスレッドID（状態またはref）
      const threadId = currentThreadId || pendingThreadIdRef.current;

      // AIの応答をDBに保存
      if (threadId && onSaveMessage && message.content) {
        await onSaveMessage(
          "assistant",
          message.content,
          message.toolInvocations as any[],
          undefined,
          true, // generateEmbedding
          threadId // threadIdOverride
        );
        messageCountRef.current += 1;

        // タイトル自動生成（3メッセージ目以降、まだ生成していない場合）
        if (
          onGenerateTitle &&
          messageCountRef.current >= 3 &&
          titleGeneratedForThread !== threadId
        ) {
          setTitleGeneratedForThread(threadId);
          await onGenerateTitle(threadId);
        }
      }

      // pendingを解除
      pendingThreadIdRef.current = null;
    },
    onError: (error) => {
      console.error("Chat error:", error);
    },
  });

  // スレッド切り替え時のみメッセージを更新（メッセージ追加時は更新しない）
  useEffect(() => {
    // スレッドIDが変更されたかチェック
    const threadChanged = prevThreadIdRef.current !== currentThreadId;
    prevThreadIdRef.current = currentThreadId;

    // スレッドが変更されていない場合は何もしない（ストリーミング中のメッセージを保護）
    if (!threadChanged) {
      return;
    }

    console.log("[DesktopChatPanel] Thread changed, syncing messages:", currentThreadId);

    if (currentThreadId && currentMessages.length > 0) {
      const newMessages: Message[] = currentMessages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: new Date(m.createdAt),
        toolInvocations: m.toolCalls?.length > 0 ? m.toolCalls : undefined,
      }));
      setMessages(newMessages);
      messageCountRef.current = currentMessages.length;
    } else if (!currentThreadId) {
      setMessages([]);
      messageCountRef.current = 0;
      pendingThreadIdRef.current = null;
    }
  }, [currentThreadId, currentMessages, setMessages]);

  // カスタム送信ハンドラ（ユーザーメッセージをDBに保存）
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // 処理中は送信しない
      if (isLoading) {
        console.log("[DesktopChatPanel] Blocked submit - still loading");
        return;
      }

      const trimmedInput = input.trim();
      if (!trimmedInput) return;

      let activeThreadId = currentThreadId;

      // スレッドがない場合は新規作成（これは待つ必要がある）
      if (!activeThreadId && onCreateThread) {
        const newThread = await onCreateThread(currentCanvas, contextData);
        if (!newThread) return;
        activeThreadId = newThread.id;
        pendingThreadIdRef.current = newThread.id; // onFinish用に保存
        messageCountRef.current = 0;
      }

      // 元のハンドラを即座に呼び出し
      originalHandleSubmit(e);

      // ユーザーメッセージをDBに保存（バックグラウンドで）
      if (activeThreadId && onSaveMessage) {
        onSaveMessage("user", trimmedInput, undefined, undefined, true, activeThreadId)
          .then(() => {
            messageCountRef.current += 1;
          })
          .catch((err) => {
            console.error("[DesktopChatPanel] Failed to save user message:", err);
          });
      }
    },
    [input, isLoading, currentThreadId, currentCanvas, contextData, onCreateThread, onSaveMessage, originalHandleSubmit]
  );

  // Auto-scroll - only within chat container
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current && prevMessagesLengthRef.current > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
      }, 100);
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  // コンテンツ作成を検出してCanvasに通知（プレビュー表示用）
  const processedPreviewsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!onContextChange) return;

    // メッセージ内のコンテンツ作成ツール結果を検出
    for (const message of messages) {
      if (message.role !== "assistant") continue;

      const parts = (message as any).parts;
      const toolInvocations = parts
        ? parts.filter((p: any) => p.type === "tool-invocation" && p.toolInvocation?.state === "result")
            .map((p: any) => p.toolInvocation)
        : message.toolInvocations?.filter((ti: any) => ti.state === "result") || [];

      for (const ti of toolInvocations) {
        // WordPress ページ作成
        if (ti.toolName === "createWordPressPage" && ti.result?.success && ti.result?.pageUrl) {
          const previewId = `wp-page-${ti.result.pageId || ti.toolCallId}`;
          if (!processedPreviewsRef.current.has(previewId)) {
            processedPreviewsRef.current.add(previewId);
            onContextChange({
              content_preview: {
                id: previewId,
                type: "wordpress",
                title: ti.result.title || "ページ",
                url: ti.result.pageUrl,
                domain: ti.result.domain,
                pageId: ti.result.pageId,
                createdAt: new Date(),
              },
              domain: ti.result.domain,
            });
          }
        }

        // showWordPressOperationProgress からページURLを抽出
        if (ti.toolName === "showWordPressOperationProgress" && ti.result) {
          const ops = ti.result.operations || [];
          for (const op of ops) {
            if (op.url && op.type === "page") {
              const previewId = `wp-progress-${op.pageId || op.id || ti.toolCallId}`;
              if (!processedPreviewsRef.current.has(previewId)) {
                processedPreviewsRef.current.add(previewId);
                onContextChange({
                  content_preview: {
                    id: previewId,
                    type: "wordpress",
                    title: op.name || op.title || "ページ",
                    url: op.url,
                    domain: ti.result.domain,
                    pageId: op.pageId,
                    createdAt: new Date(op.timestamp || Date.now()),
                  },
                  domain: ti.result.domain,
                });
              }
            }
          }
        }

        // 画像生成
        if (ti.toolName === "generateImage" && ti.result?.success && ti.result?.imageUrl) {
          const previewId = `image-${ti.toolCallId}`;
          if (!processedPreviewsRef.current.has(previewId)) {
            processedPreviewsRef.current.add(previewId);
            onContextChange({
              content_preview: {
                id: previewId,
                type: "image",
                title: ti.result.prompt || "生成画像",
                imageUrl: ti.result.imageUrl,
                createdAt: new Date(),
              },
            });
          }
        }

        // WordPress ページ更新
        if (ti.toolName === "updateWordPressPage" && ti.result?.success && ti.result?.pageUrl) {
          const previewId = `wp-update-${ti.result.pageId || ti.toolCallId}`;
          if (!processedPreviewsRef.current.has(previewId)) {
            processedPreviewsRef.current.add(previewId);
            onContextChange({
              content_preview: {
                id: previewId,
                type: "wordpress",
                title: `更新: ページID ${ti.result.pageId}`,
                url: ti.result.pageUrl,
                domain: ti.result.domain,
                pageId: ti.result.pageId,
                createdAt: new Date(),
              },
              domain: ti.result.domain,
            });
          }
        }

        // WordPress カスタムCSS追加（CSSを追加した場合、対象ページを表示）
        if (ti.toolName === "addWordPressCustomCSS" && ti.result?.success) {
          const previewId = `wp-css-${ti.toolCallId}`;
          if (!processedPreviewsRef.current.has(previewId)) {
            processedPreviewsRef.current.add(previewId);
            // targetPageUrlがあればそれを使用、なければサイトトップ
            const previewUrl = ti.result.targetPageUrl || (ti.result.domain ? `https://${ti.result.domain}/` : undefined);
            if (previewUrl) {
              onContextChange({
                content_preview: {
                  id: previewId,
                  type: "wordpress",
                  title: "カスタムCSS適用",
                  url: previewUrl,
                  domain: ti.result.domain,
                  createdAt: new Date(),
                },
                domain: ti.result.domain,
              });
            }
          }
        }
      }
    }
  }, [messages, onContextChange]);

  const filterMessage = (content: string) => {
    const text = content?.trim() || "";
    const meaninglessPatterns = /^[。、.・\s,，．…！？!?]+$/;
    return text.length > 0 && !meaninglessPatterns.test(text);
  };

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "今日";
    if (diffDays === 1) return "昨日";
    if (diffDays < 7) return `${diffDays}日前`;

    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="w-[480px] h-full bg-gray-850 border-r border-gray-800 flex flex-col overflow-hidden" style={{ backgroundColor: "#1a1a2e" }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-blue-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              {showHistory ? "履歴" : currentThread?.title || "Marty"}
            </h2>
            <p className="text-[10px] text-gray-400">
              {showHistory
                ? `${threads.length}件のスレッド`
                : currentThread
                ? `${currentThread.messageCount}件のメッセージ`
                : `${currentCanvas} を表示中`}
            </p>
          </div>
        </div>

        {/* 新規スレッドボタン（常に表示） */}
        {onNewThread && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onNewThread}
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            title="新しい会話"
          >
            <Plus className="w-4 h-4" />
          </motion.button>
        )}
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {showHistory ? (
          <motion.div
            key="history"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 overflow-y-auto p-3 space-y-2"
          >
            {threadsLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <p className="text-sm text-gray-400 mb-3">まだスレッドがありません</p>
                {onNewThread && (
                  <button
                    onClick={onNewThread}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                  >
                    新しい会話を始める
                  </button>
                )}
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500 px-2 mb-3">過去のスレッド</p>
                {threads.map((thread) => (
                  <motion.div
                    key={thread.id}
                    whileHover={{ scale: 1.01 }}
                    className={cn(
                      "group relative p-3 rounded-xl transition-colors cursor-pointer",
                      currentThreadId === thread.id
                        ? "bg-blue-600/20 border border-blue-500/50"
                        : "bg-gray-800/50 hover:bg-gray-800"
                    )}
                    onClick={() => onThreadSelect?.(thread.id)}
                  >
                    <p className="text-sm font-medium text-white truncate pr-8">
                      {thread.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 truncate">
                      {thread.preview || "メッセージなし"}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-2">
                      {formatDate(thread.lastMessageAt)}
                    </p>

                    {/* 削除ボタン */}
                    {onDeleteThread && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteThread(thread.id);
                        }}
                        className="absolute top-3 right-3 p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded transition-all"
                        title="削除"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-400" />
                      </button>
                    )}
                  </motion.div>
                ))}
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 overflow-y-auto p-3 space-y-3"
          >
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-400">何でも聞いてください</p>
                </div>
              </div>
            ) : (
              messages.map((message, messageIndex) => {
                // ユーザーメッセージは従来通り1つの吹き出し
                if (message.role === "user") {
                  const textContent = message.content?.trim() || "";
                  if (!textContent) return null;

                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-end"
                    >
                      <div className="max-w-[90%] rounded-2xl px-3 py-2 text-sm bg-blue-600 text-white rounded-br-md">
                        <div className="whitespace-pre-wrap break-words">{textContent}</div>
                      </div>
                    </motion.div>
                  );
                }

                // アシスタントメッセージはstep-startで分割して複数の吹き出しに
                const bubbles = splitMessageIntoBubbles(message);

                // 表示するバブルがない場合はスキップ
                if (bubbles.length === 0) return null;

                return bubbles.map((bubble, bubbleIndex) => {
                  const hasText = bubble.texts.length > 0;
                  const hasTools = bubble.tools.length > 0;

                  // ツール呼び出しのみの場合は吹き出しなしで表示
                  const hasOnlyTools = !hasText && hasTools;

                  // UIを表示しないツール（内部処理用）
                  const internalTools = ["useExistingSite", "switchCanvas"];
                  const visibleTools = bubble.tools.filter(
                    (tool) => !internalTools.includes(tool.toolName)
                  );
                  const hasVisibleTools = visibleTools.length > 0;

                  // 空のバブルはスキップ
                  if (!hasText && !hasVisibleTools) {
                    // 内部ツールのみの場合はコンパクトに表示
                    if (bubble.tools.length > 0) {
                      return (
                        <div key={bubble.id} className="pl-2 border-l-2 border-slate-700 my-1">
                          {bubble.tools.map((tool) => (
                            <ToolHistoryItem
                              key={tool.toolCallId}
                              toolInvocation={tool}
                            />
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }

                  // ツールのみの場合は吹き出しなしで表示
                  if (hasOnlyTools) {
                    return (
                      <div key={bubble.id} className="pl-2 border-l-2 border-slate-700 my-1">
                        {visibleTools.map((tool) => (
                          <ToolHistoryItem
                            key={tool.toolCallId}
                            toolInvocation={tool}
                          />
                        ))}
                      </div>
                    );
                  }

                  return (
                    <React.Fragment key={bubble.id}>
                      {/* ツール履歴（テキストの前に表示） */}
                      {hasVisibleTools && (
                        <div className="pl-2 border-l-2 border-slate-700 my-1">
                          {visibleTools.map((tool) => (
                            <ToolHistoryItem
                              key={tool.toolCallId}
                              toolInvocation={tool}
                            />
                          ))}
                        </div>
                      )}

                      {/* テキスト吹き出し */}
                      {hasText && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: bubbleIndex * 0.05 }}
                          className="flex justify-start"
                        >
                          <div className="max-w-[90%] rounded-2xl px-3 py-2 text-sm bg-slate-700 text-white rounded-bl-md">
                            <div className="whitespace-pre-wrap break-words">
                              {bubble.texts.join("\n\n").replace(/^[。、.・,，．…！？!?\s]+/, "")}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </React.Fragment>
                  );
                });
              })
            )}

            <div ref={messagesEndRef} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* シンプルなステータス表示 */}
      {!showHistory && (
        <SimpleStatusIndicator
          messages={messages}
          isLoading={isLoading}
        />
      )}

      {/* Input Area */}
      {!showHistory && (
        <div className="p-3 border-t border-gray-800">
          <form onSubmit={handleSubmit} className="flex gap-2 items-end">
            <button
              type="button"
              onClick={() => setShowImageModal(true)}
              disabled={isLoading}
              className={cn(
                "p-2 border border-gray-700 rounded-lg transition-colors",
                isLoading
                  ? "opacity-50 cursor-not-allowed bg-gray-800/50"
                  : "hover:bg-gray-800"
              )}
            >
              <ImageIcon className="w-4 h-4 text-gray-400" />
            </button>
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !isLoading) {
                    e.preventDefault();
                    handleSubmit(e as any);
                  }
                }}
                placeholder={isLoading ? "Martyが応答中..." : "メッセージを入力..."}
                disabled={isLoading}
                className={cn(
                  "w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none transition-all",
                  isLoading && "opacity-60 cursor-not-allowed bg-gray-800/50"
                )}
                rows={1}
                style={{ minHeight: "38px", maxHeight: "100px" }}
              />
            </div>

            {/* 送信/停止ボタン */}
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.button
                  key="stop"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => stop()}
                  className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  title="応答を停止"
                >
                  <Square className="w-4 h-4" />
                </motion.button>
              ) : (
                <motion.button
                  key="send"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={!input.trim()}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    input.trim()
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-gray-700 text-gray-500 cursor-not-allowed"
                  )}
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </form>
        </div>
      )}

      {showImageModal && (
        <ImageGenerationModal onClose={() => setShowImageModal(false)} />
      )}
    </div>
  );
}

// Render tool results
function renderToolResult(toolName: string, toolCallId: string, result: any) {
  switch (toolName) {
    case "showPlanningBoard":
      return (
        <div key={toolCallId} className="mt-2">
          <PlanningBoard data={result} />
        </div>
      );
    case "generateImage":
      return (
        <div key={toolCallId} className="mt-2">
          <ImagePreview data={result} />
        </div>
      );
    case "showConstructionRoadmap":
      return (
        <div key={toolCallId} className="mt-3">
          <ConstructionRoadmap
            currentStep={result.currentStep}
            completedSteps={result.completedSteps || []}
          />
        </div>
      );
    case "checkDomain":
      return (
        <div key={toolCallId} className="mt-2 p-3 border border-gray-700 rounded-lg text-xs">
          {result.success ? (
            <p className={result.available ? "text-green-400" : "text-orange-400"}>
              {result.message}
            </p>
          ) : (
            <p className="text-red-400">{result.error}</p>
          )}
        </div>
      );
    case "createWebsiteRecord":
      if (!result.success) {
        return (
          <div key={toolCallId} className="mt-2 p-2 bg-red-900/20 rounded-lg">
            <p className="text-xs text-red-400">エラー: {result.error}</p>
          </div>
        );
      }
      return null;
    case "showDNSGuide":
      return (
        <div key={toolCallId} className="mt-3">
          <DNSGuideCard
            serverProvider={result.serverProvider}
            domainRegistrar={result.domainRegistrar}
            nameServers={result.nameServers}
          />
        </div>
      );
    case "showServerAuthForm":
      return (
        <div key={toolCallId} className="mt-3">
          <ServerAuthForm
            websiteId={result.websiteId}
            serverProvider={result.serverProvider}
          />
        </div>
      );
    case "showWordPressAdminForm":
      return (
        <div key={toolCallId} className="mt-3">
          <WordPressAdminForm
            websiteId={result.websiteId}
            domain={result.domain}
          />
        </div>
      );
    case "showConstructionProgress":
      return (
        <div key={toolCallId} className="mt-3">
          <ConstructionProgress websiteId={result.websiteId} />
        </div>
      );
    case "showSSLSetupForm":
      return (
        <div key={toolCallId} className="mt-3">
          <SSLSetupForm
            websiteId={result.websiteId}
            domain={result.domain}
            defaultEmail={result.email}
          />
        </div>
      );
    case "showAffiliateLinks":
      return (
        <div key={toolCallId} className="mt-3">
          <AffiliateLinksCard links={result.links || []} />
        </div>
      );
    case "showWordPressOperationProgress":
      return (
        <div key={toolCallId} className="mt-3">
          <WordPressOperationProgress
            title={result.title}
            operations={result.operations || []}
          />
        </div>
      );
    default:
      return null;
  }
}
