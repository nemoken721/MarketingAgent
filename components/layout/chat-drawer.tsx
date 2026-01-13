"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "ai/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  ImageIcon,
  X,
  Minus,
  Maximize2,
  History,
  Plus,
  Trash2,
  ChevronLeft,
  Search,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatThread, ChatMessage as ChatMessageType, CanvasMode } from "@/types/chat";

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
import ImageGenerationModal from "../image-generation-modal";

interface ChatDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTab: string;
  contextData?: Record<string, any>;
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
}

export function ChatDrawer({
  open,
  onOpenChange,
  currentTab,
  contextData,
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
}: ChatDrawerProps) {
  const [showImageModal, setShowImageModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);
  const messageCountRef = useRef(0);
  // 新規作成されたスレッドIDを追跡（非同期の競合を防ぐ）
  const pendingThreadIdRef = useRef<string | null>(null);
  // 前回のスレッドIDを追跡（スレッド切り替え検出用）
  const prevThreadIdRef = useRef<string | null | undefined>(undefined);

  // Context Injection: Include current tab info in chat
  const { messages, input, handleInputChange, handleSubmit, isLoading, error, setMessages } = useChat({
    api: "/api/chat",
    body: {
      context: {
        currentTab,
        threadId: currentThreadId,
        ...contextData,
      },
    },
    onFinish: async (message) => {
      // 現在のスレッドID（状態またはref）
      const threadId = currentThreadId || pendingThreadIdRef.current;

      // メッセージをDBに保存（threadIdOverrideを使用）
      if (onSaveMessage && threadId && message.content) {
        await onSaveMessage(
          "assistant",
          message.content,
          message.toolInvocations,
          undefined,
          true, // embeddingを生成
          threadId // threadIdOverride
        );
        messageCountRef.current += 1;

        // 3メッセージ後にタイトル自動生成
        if (messageCountRef.current === 3 && onGenerateTitle && threadId) {
          onGenerateTitle(threadId);
        }
      }

      // pendingを解除
      pendingThreadIdRef.current = null;
    },
    onResponse: (response) => {
      console.log("Response received:", response.status);
    },
    onError: (error) => {
      console.error("Chat error:", error);
    },
  });

  // スレッド切り替え時のみメッセージを復元（メッセージ追加時は更新しない）
  // currentMessagesの参照変更による無限ループを防ぐため、currentThreadIdのみを依存配列に含める
  const currentMessagesRef = useRef(currentMessages);
  currentMessagesRef.current = currentMessages;

  useEffect(() => {
    // スレッドIDが変更されたかチェック
    const threadChanged = prevThreadIdRef.current !== currentThreadId;
    prevThreadIdRef.current = currentThreadId;

    // スレッドが変更されていない場合は何もしない（ストリーミング中のメッセージを保護）
    if (!threadChanged) {
      return;
    }

    console.log("[ChatDrawer] Thread changed, syncing messages:", currentThreadId);

    const msgs = currentMessagesRef.current;
    if (msgs.length > 0) {
      setMessages(
        msgs.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          createdAt: new Date(msg.createdAt),
          // toolCallsをtoolInvocationsに変換（useChat用）
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

  // Auto-scroll to latest message
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current && prevMessagesLengthRef.current > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  // Filter meaningless messages
  const filterMessage = (content: string) => {
    const text = content?.trim() || "";
    const meaninglessPatterns = /^[。、.・\s,，．…！？!?]+$/;
    return text.length > 0 && !meaninglessPatterns.test(text);
  };

  // カスタム送信ハンドラ
  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 処理中は送信しない
    if (isLoading) {
      console.log("[ChatDrawer] Blocked submit - still loading");
      return;
    }

    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    let activeThreadId = currentThreadId;

    // スレッドがない場合は新規作成（これは待つ必要がある）
    if (!activeThreadId && onCreateThread) {
      const newThread = await onCreateThread(currentTab as CanvasMode);
      if (!newThread) return;
      activeThreadId = newThread.id;
      pendingThreadIdRef.current = newThread.id; // onFinish用に保存
    }

    // 通常の送信処理（即座に実行）
    handleSubmit(e);

    // ユーザーメッセージを保存（バックグラウンドで）
    if (onSaveMessage && activeThreadId) {
      onSaveMessage("user", trimmedInput, undefined, undefined, true, activeThreadId)
        .then(() => {
          messageCountRef.current += 1;
        })
        .catch((err) => {
          console.error("[ChatDrawer] Failed to save user message:", err);
        });
    }
  };

  // 検索実行
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

  // 新規スレッド作成
  const handleNewThread = async () => {
    // まずuseChatのメッセージをクリア
    setMessages([]);
    messageCountRef.current = 0;
    pendingThreadIdRef.current = null;

    // スレッドをクリア（新規状態へ）
    if (onClearThread) {
      onClearThread();
    }

    setShowHistory(false);
  };

  // スレッド選択
  const handleSelectThread = async (threadId: string) => {
    if (onSelectThread) {
      await onSelectThread(threadId);
      setShowHistory(false);
    }
  };

  // スレッド削除
  const handleDeleteThread = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteThread && confirm("この会話を削除しますか？")) {
      await onDeleteThread(threadId);
    }
  };

  const [isExpanded, setIsExpanded] = useState(false);

  // 相対時間の計算
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

  return (
    <>
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-[100]"
            onClick={() => onOpenChange(false)}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.1, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.velocity.y > 500 || info.offset.y > 100) {
                onOpenChange(false);
              }
            }}
            className={cn(
              "fixed flex flex-col bg-white dark:bg-gray-900 rounded-t-[20px] bottom-0 left-0 right-0 z-[101]",
              "shadow-[0_-10px_40px_rgba(0,0,0,0.2)]",
              isExpanded ? "h-[calc(100%-24px)]" : "h-[400px]"
            )}
          >
            {/* Handle */}
            <div className="flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                {showHistory ? (
                  <>
                    <button
                      onClick={() => setShowHistory(false)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      履歴
                    </h3>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">M</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {currentThread?.title || "Marty"}
                      </h3>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        {currentTab === "calendar" && "カレンダーを表示中"}
                        {currentTab === "analytics" && "アナリティクスを表示中"}
                        {currentTab === "home" && "ダッシュボード"}
                        {currentTab === "settings" && "設定"}
                      </p>
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1">
                {!showHistory && (
                  <>
                    <button
                      onClick={handleNewThread}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      title="新しい会話"
                    >
                      <Plus className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => setShowHistory(true)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      title="履歴"
                    >
                      <History className="w-4 h-4 text-gray-500" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  {isExpanded ? (
                    <Minus className="w-4 h-4 text-gray-500" />
                  ) : (
                    <Maximize2 className="w-4 h-4 text-gray-500" />
                  )}
                </button>
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            {showHistory ? (
              // 履歴ビュー
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* 検索バー */}
                <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        placeholder="過去の会話を検索..."
                        className="w-full px-3 py-2 pl-9 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-800 text-sm"
                      />
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                    <button
                      onClick={handleSearch}
                      disabled={isSearching}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm disabled:opacity-50"
                    >
                      {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "検索"}
                    </button>
                  </div>
                </div>

                {/* 新規会話ボタン */}
                <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                  <button
                    onClick={handleNewThread}
                    className="w-full flex items-center gap-2 px-3 py-2.5 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 rounded-lg text-indigo-600 dark:text-indigo-400 text-sm font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    新しい会話を始める
                  </button>
                </div>

                {/* スレッドリスト */}
                <div className="flex-1 overflow-y-auto">
                  {threadsLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : searchResults.length > 0 ? (
                    // 検索結果
                    <div className="p-3 space-y-2">
                      <p className="text-xs text-gray-500 mb-2">検索結果</p>
                      {searchResults.map((result) => (
                        <button
                          key={result.messageId}
                          onClick={() => handleSelectThread(result.threadId)}
                          className="w-full text-left p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-1">
                            {result.threadTitle}
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                            {result.content}
                          </p>
                        </button>
                      ))}
                    </div>
                  ) : threads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                      <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-sm">まだ会話履歴がありません</p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {threads.map((thread) => (
                        <button
                          key={thread.id}
                          onClick={() => handleSelectThread(thread.id)}
                          className={cn(
                            "w-full text-left p-3 rounded-lg transition-colors group",
                            thread.id === currentThreadId
                              ? "bg-indigo-50 dark:bg-indigo-950/30"
                              : "hover:bg-gray-50 dark:hover:bg-gray-800"
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {thread.title}
                              </h4>
                              {thread.preview && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                                  {thread.preview}
                                </p>
                              )}
                              <p className="text-[10px] text-gray-400 mt-1">
                                {getRelativeTime(thread.lastMessageAt)}
                              </p>
                            </div>
                            <button
                              onClick={(e) => handleDeleteThread(thread.id, e)}
                              className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </button>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // チャットビュー
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center space-y-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          何でも聞いてください
                        </p>
                      </div>
                    </div>
                  ) : (
                    <AnimatePresence initial={false}>
                      {messages.map((message, index) => {
                        const textContent = message.content?.trim() || "";
                        const hasTextContent = filterMessage(textContent);
                        const hasCompletedToolInvocations = message.toolInvocations?.some(
                          (ti: any) => ti.state === "result"
                        );

                        if (!hasTextContent && !hasCompletedToolInvocations) {
                          return null;
                        }

                        return (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                              "flex",
                              message.role === "user" ? "justify-end" : "justify-start"
                            )}
                          >
                            <div
                              className={cn(
                                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                                message.role === "user"
                                  ? "bg-indigo-600 text-white rounded-br-md"
                                  : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md"
                              )}
                            >
                              {hasTextContent && (
                                <div className="whitespace-pre-wrap break-words">
                                  {textContent.replace(/^[。、.・,，．…！？!?\s]+/, "")}
                                </div>
                              )}

                              {/* Tool Invocations (Generative UI) */}
                              {message.toolInvocations?.map((toolInvocation: any) => {
                                const { toolName, toolCallId, state } = toolInvocation;

                                if (state === "result") {
                                  return renderToolResult(toolName, toolCallId, toolInvocation.result);
                                }
                                return null;
                              })}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                  <form onSubmit={handleCustomSubmit} className="flex gap-2 items-end">
                    <button
                      type="button"
                      onClick={() => setShowImageModal(true)}
                      className="p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
                    >
                      <ImageIcon className="w-5 h-5 text-gray-500" />
                    </button>
                    <div className="flex-1 relative">
                      <textarea
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleCustomSubmit(e as any);
                          }
                        }}
                        placeholder="メッセージを入力..."
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-gray-50 dark:bg-gray-800 text-sm"
                        rows={1}
                        style={{ minHeight: "44px", maxHeight: "120px" }}
                      />
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      type="submit"
                      className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors flex-shrink-0"
                    >
                      <Send className="w-5 h-5" />
                    </motion.button>
                  </form>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>

    {showImageModal && (
      <ImageGenerationModal onClose={() => setShowImageModal(false)} />
    )}
    </>
  );
}

// Render tool results as Generative UI
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

    case "generateContentFrame":
      if (!result) return null;
      return (
        <div key={toolCallId} className="mt-2">
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
        <div key={toolCallId} className="mt-2 p-3 border rounded-lg text-xs">
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
          <div key={toolCallId} className="mt-2 p-2 bg-red-50 dark:bg-red-950/20 rounded-lg">
            <p className="text-xs text-red-600">エラー: {result.error}</p>
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

    default:
      return null;
  }
}
