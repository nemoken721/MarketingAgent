"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "ai/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  ImageIcon,
  Plus,
  History,
  Trash2,
  ChevronLeft,
  Search,
  Loader2,
  MessageSquare,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatThread, ChatMessage as ChatMessageType, CanvasMode } from "@/types/chat";
import type { Message } from "ai/react";

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
        // 意味のある内容のみ追加
        const meaninglessPatterns = /^[。、.・\s,，．…！？!?]+$/;
        if (text.length > 0 && !meaninglessPatterns.test(text)) {
          currentBubble.texts.push(text);
        }
      } else if (part.type === "tool-invocation" && part.toolInvocation) {
        // AI SDK v4対応: tool-invocationパートを処理
        if (part.toolInvocation.state === "result") {
          currentBubble.tools.push(part.toolInvocation);
        }
      } else if (part.type === "tool-result" && part.result !== undefined) {
        // AI SDK v4: tool-resultパートを処理（新しい形式）
        currentBubble.tools.push({
          toolName: part.toolName,
          toolCallId: part.toolCallId,
          result: part.result,
          state: "result",
        });
      }
    }
  } else {
    // partsがない場合は従来のロジック
    const textContent = message.content?.trim() || "";
    const meaninglessPatterns = /^[。、.・\s,，．…！？!?]+$/;
    if (textContent.length > 0 && !meaninglessPatterns.test(textContent)) {
      currentBubble.texts.push(textContent);
    }
    if ((message as any).toolInvocations) {
      for (const ti of (message as any).toolInvocations) {
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

// Generative UI Components
import { PlanningBoard } from "../generative-ui/planning-board";
import { ImagePreview } from "../generative-ui/image-preview";
import { ContentFramePreview } from "../generative-ui/content-frame-preview";
import { ConstructionRoadmap } from "../generative-ui/construction-roadmap";
import { DNSGuideCard } from "../generative-ui/dns-guide-card";
import { ServerAuthForm } from "../generative-ui/server-auth-form";
import { WordPressAdminForm } from "../generative-ui/wordpress-admin-form";
import { ConstructionProgress } from "../generative-ui/construction-progress";
import { SSLSetupForm } from "../generative-ui/ssl-setup-form";
import { AffiliateLinksCard } from "../generative-ui/affiliate-links-card";
import { WordPressOperationProgress } from "../generative-ui/wordpress-operation-progress";
import ImageGenerationModal from "../image-generation-modal";

interface ChatTabProps {
  // スレッド管理props
  threads?: ChatThread[];
  currentThreadId?: string | null;
  currentThread?: ChatThread | null;
  currentMessages?: ChatMessageType[];
  threadsLoading?: boolean;
  onCreateThread?: (canvasMode?: CanvasMode) => Promise<ChatThread | null>;
  onSelectThread?: (threadId: string) => Promise<any>;
  onDeleteThread?: (threadId: string) => Promise<boolean>;
  onGenerateTitle?: (threadId: string) => Promise<string | null>;
  onSaveMessage?: (
    role: "user" | "assistant" | "system",
    content: string,
    toolCalls?: any[],
    metadata?: Record<string, any>,
    generateEmbedding?: boolean,
    threadIdOverride?: string
  ) => Promise<ChatMessageType | null>;
  onClearThread?: () => void;
  onSearchMessages?: (query: string, limit?: number) => Promise<any[]>;
  // LINE連携用（LIFFから起動時）
  lineContext?: {
    lineUserId?: string;
    recentImages?: any[];
    sessionContext?: any;
  };
}

export function ChatTab({
  threads = [],
  currentThreadId,
  currentThread,
  currentMessages = [],
  threadsLoading,
  onCreateThread,
  onSelectThread,
  onDeleteThread,
  onGenerateTitle,
  onSaveMessage,
  onClearThread,
  onSearchMessages,
  lineContext,
}: ChatTabProps) {
  const [showImageModal, setShowImageModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);
  const messageCountRef = useRef(0);
  const pendingThreadIdRef = useRef<string | null>(null);
  const prevThreadIdRef = useRef<string | null | undefined>(undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
    api: "/api/chat",
    body: {
      context: {
        currentTab: "chat",
        threadId: currentThreadId,
        lineContext,
      },
    },
    onFinish: async (message) => {
      const threadId = currentThreadId || pendingThreadIdRef.current;

      if (onSaveMessage && threadId && message.content) {
        await onSaveMessage(
          "assistant",
          message.content,
          message.toolInvocations,
          undefined,
          true,
          threadId
        );
        messageCountRef.current += 1;

        if (messageCountRef.current === 3 && onGenerateTitle && threadId) {
          onGenerateTitle(threadId);
        }
      }

      pendingThreadIdRef.current = null;
    },
    onError: (error) => {
      console.error("Chat error:", error);
      setChatError(`チャットエラー: ${error.message || String(error)}`);
    },
  });

  // スレッド切り替え時のメッセージ復元
  const currentMessagesRef = useRef(currentMessages);
  currentMessagesRef.current = currentMessages;

  useEffect(() => {
    const threadChanged = prevThreadIdRef.current !== currentThreadId;
    prevThreadIdRef.current = currentThreadId;

    if (!threadChanged) return;

    const msgs = currentMessagesRef.current;
    if (msgs.length > 0) {
      setMessages(
        msgs.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          createdAt: new Date(msg.createdAt),
          ...(msg.toolCalls && msg.toolCalls.length > 0
            ? { toolInvocations: msg.toolCalls }
            : {}),
        }))
      );
      messageCountRef.current = msgs.length;
    } else if (!currentThreadId) {
      setMessages([]);
      messageCountRef.current = 0;
    }
  }, [currentThreadId, setMessages]);

  // 自動スクロール
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current && prevMessagesLengthRef.current > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  const filterMessage = (content: string) => {
    const text = content?.trim() || "";
    const meaninglessPatterns = /^[。、.・\s,，．…！？!?]+$/;
    return text.length > 0 && !meaninglessPatterns.test(text);
  };

  // テキストエリアの高さを自動調整
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };

  const handleCustomSubmit = async (e?: React.FormEvent) => {
    try {
      if (e) {
        e.preventDefault();
      }

      // エラーをクリア
      setChatError(null);

      if (isLoading) return;

      const trimmedInput = input.trim();
      if (!trimmedInput) return;

      let activeThreadId = currentThreadId;

      // スレッドがない場合は作成を試みる（失敗しても続行 - 匿名モード）
      if (!activeThreadId && onCreateThread) {
        try {
          const newThread = await onCreateThread("chat" as CanvasMode);
          if (newThread) {
            activeThreadId = newThread.id;
            pendingThreadIdRef.current = newThread.id;
          }
          // スレッド作成に失敗してもチャットは続行
        } catch (threadError) {
          console.warn("Thread creation failed, continuing without thread:", threadError);
          // 未ログイン時はスレッドなしでチャット続行
        }
      }

      // ユーザーメッセージを保存（スレッドがある場合のみ）
      if (onSaveMessage && activeThreadId) {
        onSaveMessage("user", trimmedInput, undefined, undefined, true, activeThreadId)
          .then(() => {
            messageCountRef.current += 1;
          })
          .catch((err) => {
            console.error("Failed to save user message:", err);
          });
      }

      // handleSubmitを呼び出し（イベントなしで呼び出し - inputステートを使用）
      handleSubmit();

      // テキストエリアの高さをリセット
      if (textareaRef.current) {
        textareaRef.current.style.height = "48px";
      }
    } catch (error) {
      console.error("Submit error:", error);
      setChatError(`送信エラー: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // ボタンクリック用のハンドラー
  const handleButtonClick = () => {
    handleCustomSubmit();
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !onSearchMessages) return;
    setIsSearching(true);
    try {
      const results = await onSearchMessages(searchQuery, 10);
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  };

  const handleNewThread = async () => {
    setMessages([]);
    messageCountRef.current = 0;
    pendingThreadIdRef.current = null;

    if (onClearThread) {
      onClearThread();
    }

    setShowHistory(false);
  };

  const handleSelectThread = async (threadId: string) => {
    if (onSelectThread) {
      await onSelectThread(threadId);
      setShowHistory(false);
    }
  };

  const handleDeleteThread = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteThread && confirm("この会話を削除しますか？")) {
      await onDeleteThread(threadId);
    }
  };

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "たった今";
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 7) return `${days}日前`;
    return date.toLocaleDateString("ja-JP");
  };

  // 履歴画面
  if (showHistory) {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-gray-900">
        {/* ヘッダー */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <button
            onClick={() => setShowHistory(false)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            会話履歴
          </h3>
        </div>

        {/* 検索バー */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="過去の会話を検索..."
                className="w-full px-4 py-3 pl-10 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-800"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-50"
            >
              {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : "検索"}
            </button>
          </div>
        </div>

        {/* 新規会話ボタン */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <button
            onClick={handleNewThread}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400 font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            新しい会話を始める
          </button>
        </div>

        {/* スレッドリスト */}
        <div className="flex-1 overflow-y-auto">
          {threadsLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : searchResults.length > 0 ? (
            <div className="p-4 space-y-2">
              <p className="text-sm text-gray-500 mb-3">検索結果</p>
              {searchResults.map((result) => (
                <button
                  key={result.messageId}
                  onClick={() => handleSelectThread(result.threadId)}
                  className="w-full text-left p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mb-1">
                    {result.threadTitle}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 line-clamp-2">
                    {result.content}
                  </p>
                </button>
              ))}
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-lg">まだ会話履歴がありません</p>
              <p className="text-sm mt-1">Martyに話しかけてみましょう</p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => handleSelectThread(thread.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl transition-colors group",
                    thread.id === currentThreadId
                      ? "bg-indigo-50 dark:bg-indigo-950/30"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-white truncate">
                        {thread.title}
                      </h4>
                      {thread.preview && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                          {thread.preview}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {getRelativeTime(thread.lastMessageAt)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteThread(thread.id, e)}
                      className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // メインチャット画面
  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <span className="text-white text-lg font-semibold">M</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {currentThread?.title || "Marty"}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              AIアシスタント
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNewThread}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="新しい会話"
          >
            <Plus className="w-5 h-5 text-gray-500" />
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="履歴"
          >
            <History className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* LINE連携の画像プレビュー */}
      {lineContext?.recentImages && lineContext.recentImages.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-indigo-50 dark:bg-indigo-950/30">
          <p className="text-sm text-indigo-600 dark:text-indigo-400 mb-2">
            LINEからアップロードされた画像
          </p>
          <div className="flex gap-2 overflow-x-auto">
            {lineContext.recentImages.slice(0, 5).map((img: any) => (
              <img
                key={img.id}
                src={img.file_path}
                alt="Uploaded"
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />
            ))}
          </div>
        </div>
      )}

      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Martyへようこそ
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  何でも気軽に話しかけてください
                </p>
              </div>
              {/* クイックアクション */}
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {["投稿を作って", "分析を見せて", "予定を教えて"].map((action) => (
                  <button
                    key={action}
                    onClick={() => {
                      handleInputChange({ target: { value: action } } as any);
                    }}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>
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
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-indigo-600 text-white rounded-br-md">
                    <div className="whitespace-pre-wrap break-words">{textContent}</div>
                  </div>
                </motion.div>
              );
            }

            // アシスタントメッセージはstep-startで分割して複数の吹き出しに
            const bubbles = splitMessageIntoBubbles(message);

            // 表示するバブルがない場合はスキップ
            if (bubbles.length === 0) return null;

            return (
              <AnimatePresence key={message.id} mode="popLayout">
                {bubbles.map((bubble, bubbleIndex) => {
                  const hasText = bubble.texts.length > 0;
                  const hasTools = bubble.tools.length > 0;

                  // 空のバブルはスキップ
                  if (!hasText && !hasTools) return null;

                  return (
                    <motion.div
                      key={bubble.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: bubbleIndex * 0.1 }}
                      className="flex justify-start mb-2"
                    >
                      <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md">
                        {/* テキストコンテンツ */}
                        {hasText && (
                          <div className="whitespace-pre-wrap break-words">
                            {bubble.texts.join("\n\n").replace(/^[。、.・,，．…！？!?\s]+/, "")}
                          </div>
                        )}

                        {/* ツール結果 */}
                        {bubble.tools.map((tool) => renderToolResult(tool))}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* エラー表示 */}
      {chatError && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{chatError}</p>
          <button
            type="button"
            onClick={() => setChatError(null)}
            className="text-xs text-red-500 underline mt-1"
          >
            閉じる
          </button>
        </div>
      )}

      {/* 入力エリア */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <form
          ref={formRef}
          onSubmit={handleCustomSubmit}
          className="flex gap-3 items-end"
        >
          <button
            type="button"
            onClick={() => setShowImageModal(true)}
            className="p-3 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
          >
            <ImageIcon className="w-5 h-5 text-gray-500" />
          </button>
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                handleInputChange(e);
                adjustTextareaHeight();
              }}
              onKeyDown={(e) => {
                // PCではEnterで送信、Shift+Enterで改行
                // モバイルでは改行ボタンを使用するため、Enterで送信しない
                const isMobile = window.innerWidth < 768;
                if (e.key === "Enter" && !e.shiftKey && !isMobile) {
                  e.preventDefault();
                  handleButtonClick();
                }
              }}
              placeholder="メッセージを入力..."
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-gray-50 dark:bg-gray-800 text-base"
              rows={1}
              style={{ minHeight: "48px", maxHeight: "120px" }}
            />
          </div>
          <button
            type="button"
            onClick={handleButtonClick}
            disabled={isLoading || !input.trim()}
            className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex-shrink-0 active:scale-95"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>

      {/* Image Generation Modal */}
      {showImageModal && (
        <ImageGenerationModal onClose={() => setShowImageModal(false)} />
      )}
    </div>
  );
}

// ツール結果をレンダリングするヘルパー関数 (PC版と同じシグネチャ)
function renderToolResult(toolInvocation: any) {
  const { toolName, toolCallId, result } = toolInvocation;

  switch (toolName) {
    case "showPlanningBoard":
      return (
        <div key={toolCallId} className="mt-3">
          <PlanningBoard data={result} />
        </div>
      );

    case "generateImage":
      return (
        <div key={toolCallId} className="mt-3">
          <ImagePreview data={result} />
        </div>
      );

    case "generateContentFrame":
      if (!result) return null;
      return (
        <div key={toolCallId} className="mt-3">
          <ContentFramePreview data={result} />
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
        <div key={toolCallId} className="mt-3 p-3 border rounded-xl text-sm">
          {result.success ? (
            <p className={result.available ? "text-green-600" : "text-orange-600"}>
              {result.message}
            </p>
          ) : (
            <p className="text-red-600">{result.error}</p>
          )}
        </div>
      );

    case "createWebsiteRecord":
      if (!result.success) {
        return (
          <div key={toolCallId} className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-xl">
            <p className="text-sm text-red-600">エラー: {result.error}</p>
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
