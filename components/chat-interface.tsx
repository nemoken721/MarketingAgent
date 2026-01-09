"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useChat, Message } from "ai/react";
import { Send, Image, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PlanningBoard } from "./generative-ui/planning-board";
import { ImagePreview } from "./generative-ui/image-preview";
import { ConstructionRoadmap } from "./generative-ui/construction-roadmap";
import { DNSGuideCard } from "./generative-ui/dns-guide-card";
import { ServerAuthForm } from "./generative-ui/server-auth-form";
import { WordPressAdminForm } from "./generative-ui/wordpress-admin-form";
import { ConstructionProgress } from "./generative-ui/construction-progress";
import { SSLSetupForm } from "./generative-ui/ssl-setup-form";
import { AffiliateLinksCard } from "./generative-ui/affiliate-links-card";
import { WordPressOperationProgress } from "./generative-ui/wordpress-operation-progress";
import ImageGenerationModal from "./image-generation-modal";

// LocalStorageのキー
const CHAT_HISTORY_KEY = "marty-chat-history";

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
        if (part.toolInvocation.state === "result") {
          currentBubble.tools.push(part.toolInvocation);
        }
      }
    }
  } else {
    // partsがない場合は従来のロジック
    const textContent = message.content?.trim() || "";
    const meaninglessPatterns = /^[。、.・\s,，．…！？!?]+$/;
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

// ツール結果をレンダリングするヘルパー関数
function renderToolResult(toolInvocation: any) {
  const { toolName, toolCallId } = toolInvocation;

  // SNS投稿企画
  if (toolName === "showPlanningBoard") {
    return (
      <div key={toolCallId} className="mt-2">
        <PlanningBoard data={toolInvocation.result} />
      </div>
    );
  }

  // 画像生成
  if (toolName === "generateImage") {
    return (
      <div key={toolCallId} className="mt-2">
        <ImagePreview data={toolInvocation.result} />
      </div>
    );
  }

  // ホームページ構築ロードマップ
  if (toolName === "showConstructionRoadmap") {
    return (
      <div key={toolCallId} className="mt-4">
        <ConstructionRoadmap
          currentStep={toolInvocation.result.currentStep}
          completedSteps={toolInvocation.result.completedSteps || []}
        />
      </div>
    );
  }

  // ドメイン検索結果
  if (toolName === "checkDomain") {
    const result = toolInvocation.result;
    return (
      <div key={toolCallId} className="mt-2 p-4 border rounded-lg">
        {result.success ? (
          <div>
            <p className={`font-semibold ${result.available ? "text-green-600" : "text-orange-600"}`}>
              {result.message}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {result.available
                ? "このドメインは取得可能です！お好きなサービスで登録できます。"
                : "このドメインは既に他の方が使用されています。別の名前を試してみましょう。"}
            </p>
          </div>
        ) : (
          <div>
            <p className="font-semibold text-red-600">エラー</p>
            <p className="text-sm text-muted-foreground mt-1">{result.error}</p>
          </div>
        )}
      </div>
    );
  }

  // Websiteレコード作成結果
  if (toolName === "createWebsiteRecord") {
    const result = toolInvocation.result;
    if (!result.success) {
      return (
        <div key={toolCallId} className="mt-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">
            エラー: {result.error}
          </p>
        </div>
      );
    }
    return null;
  }

  // DNS設定ガイド
  if (toolName === "showDNSGuide") {
    return (
      <div key={toolCallId} className="mt-4">
        <DNSGuideCard
          serverProvider={toolInvocation.result.serverProvider}
          domainRegistrar={toolInvocation.result.domainRegistrar}
          nameServers={toolInvocation.result.nameServers}
        />
      </div>
    );
  }

  // サーバー認証情報入力フォーム
  if (toolName === "showServerAuthForm") {
    return (
      <div key={toolCallId} className="mt-4">
        <ServerAuthForm
          websiteId={toolInvocation.result.websiteId}
          serverProvider={toolInvocation.result.serverProvider}
        />
      </div>
    );
  }

  // WordPress管理者情報入力フォーム
  if (toolName === "showWordPressAdminForm") {
    return (
      <div key={toolCallId} className="mt-4">
        <WordPressAdminForm
          websiteId={toolInvocation.result.websiteId}
          domain={toolInvocation.result.domain}
        />
      </div>
    );
  }

  // WordPress構築進捗表示
  if (toolName === "showConstructionProgress") {
    return (
      <div key={toolCallId} className="mt-4">
        <ConstructionProgress
          websiteId={toolInvocation.result.websiteId}
        />
      </div>
    );
  }

  // SSL証明書設定フォーム
  if (toolName === "showSSLSetupForm") {
    return (
      <div key={toolCallId} className="mt-4">
        <SSLSetupForm
          websiteId={toolInvocation.result.websiteId}
          domain={toolInvocation.result.domain}
          defaultEmail={toolInvocation.result.email}
        />
      </div>
    );
  }

  // アフィリエイトリンク表示
  if (toolName === "showAffiliateLinks") {
    return (
      <div key={toolCallId} className="mt-4">
        <AffiliateLinksCard
          links={toolInvocation.result.links || []}
        />
      </div>
    );
  }

  // WordPress操作進捗表示
  if (toolName === "showWordPressOperationProgress") {
    return (
      <div key={toolCallId} className="mt-4">
        <WordPressOperationProgress
          title={toolInvocation.result.title}
          operations={toolInvocation.result.operations || []}
        />
      </div>
    );
  }

  return null;
}

// LocalStorageからチャット履歴を読み込む
function loadChatHistory(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(CHAT_HISTORY_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      console.log("📜 チャット履歴を復元:", parsed.length, "件");
      return parsed;
    }
  } catch (error) {
    console.error("チャット履歴の読み込みエラー:", error);
  }
  return [];
}

// LocalStorageにチャット履歴を保存する
function saveChatHistory(messages: Message[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
    console.log("💾 チャット履歴を保存:", messages.length, "件");
  } catch (error) {
    console.error("チャット履歴の保存エラー:", error);
  }
}

// LocalStorageのチャット履歴をクリアする
function clearChatHistory() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CHAT_HISTORY_KEY);
    console.log("🗑️ チャット履歴をクリア");
  } catch (error) {
    console.error("チャット履歴のクリアエラー:", error);
  }
}

export default function ChatInterface() {
  const [isInitialized, setIsInitialized] = useState(false);

  const { messages, input, handleInputChange, handleSubmit, error, setMessages } = useChat({
    api: "/api/chat",
    onResponse: (response) => {
      console.log("✅ サーバーからレスポンス受信:", response.status, response.statusText);
    },
    onFinish: (message) => {
      console.log("✅ メッセージ受信完了:", message);
    },
    onError: (error) => {
      console.error("❌ チャットエラー:", error);
    },
  });

  const [showImageModal, setShowImageModal] = useState(false);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);

  // クライアントサイドでのみ履歴を読み込む（初回のみ）
  useEffect(() => {
    if (!isInitialized) {
      const savedMessages = loadChatHistory();
      if (savedMessages.length > 0) {
        setMessages(savedMessages);
      }
      setIsInitialized(true);
    }
  }, [isInitialized, setMessages]);

  // メッセージが変更されたらLocalStorageに保存
  useEffect(() => {
    if (isInitialized && messages.length > 0) {
      saveChatHistory(messages);
    }
  }, [messages, isInitialized]);

  // チャット履歴をクリアする関数
  const handleClearHistory = useCallback(() => {
    if (window.confirm("チャット履歴を削除しますか？この操作は取り消せません。")) {
      clearChatHistory();
      setMessages([]);
    }
  }, [setMessages]);

  // ③ 自動スクロール - メッセージが新しく追加されたときだけスクロール
  useEffect(() => {
    // メッセージが増えた場合のみスクロール（初回レンダリング時は除外）
    if (messages.length > prevMessagesLengthRef.current && prevMessagesLengthRef.current > 0) {
      // 少し遅延させてDOMが更新されるのを待つ
      setTimeout(() => {
        lastMessageRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start" // 吹き出しの上端が見えるようにスクロール
        });
      }, 100);
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Martyへようこそ</h2>
              <p className="text-muted-foreground">
                何でも気軽に話しかけてください
              </p>
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
                  ref={messageIndex === messages.length - 1 ? lastMessageRef : null}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-end"
                >
                  <div className="max-w-[80%] rounded-lg px-4 py-2 bg-primary text-primary-foreground">
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
                  const isLastBubble = messageIndex === messages.length - 1 && bubbleIndex === bubbles.length - 1;
                  const hasText = bubble.texts.length > 0;
                  const hasTools = bubble.tools.length > 0;

                  // 空のバブルはスキップ
                  if (!hasText && !hasTools) return null;

                  return (
                    <motion.div
                      key={bubble.id}
                      ref={isLastBubble ? lastMessageRef : null}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: bubbleIndex * 0.1 }}
                      className="flex justify-start mb-2"
                    >
                      <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted">
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
      </div>

      {/* Input Area */}
      <div className="border-t border-border p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(e);
          }}
          className="flex gap-2"
        >
          <button
            type="button"
            onClick={() => setShowImageModal(true)}
            className="px-4 py-2 border border-input rounded-lg hover:bg-muted flex items-center gap-2 transition-colors"
            title="AI画像生成"
          >
            <Image className="w-4 h-4" />
          </button>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              className="px-4 py-2 border border-input rounded-lg hover:bg-red-100 dark:hover:bg-red-950/30 hover:border-red-300 dark:hover:border-red-700 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 flex items-center gap-2 transition-colors"
              title="チャット履歴をクリア"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}
            placeholder="メッセージを入力... (Enterで送信、Shift+Enterで改行)"
            className="flex-1 px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            rows={1}
            style={{ minHeight: "42px", maxHeight: "200px" }}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            送信
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
