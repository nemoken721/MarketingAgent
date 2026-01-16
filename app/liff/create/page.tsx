"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useLiff } from "@/context/liff-context";
import { ChatTab } from "@/components/tabs/chat-tab";
import { useChatThreads } from "@/hooks/use-chat-threads";

/**
 * LIFF 制作ルーム
 * LINEアプリ内でのAIチャット画面
 * ChatTabコンポーネントを使用して統一されたチャット体験を提供
 */
export default function LiffCreatePage() {
  const { profile, accessToken, isInClient, isInitialized, isLoading: isLiffLoading } = useLiff();
  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const [lineContext, setLineContext] = useState<{
    lineUserId?: string;
    recentImages?: any[];
    sessionContext?: any;
  }>({});

  // スレッド管理
  const {
    threads,
    currentThreadId,
    currentThread,
    currentMessages,
    isLoading: threadsLoading,
    createThread,
    selectThread,
    deleteThread,
    generateTitle,
    saveMessage,
    clearCurrentThread,
    searchMessages,
  } = useChatThreads();

  // 初期化: LINEから送信された画像を取得
  useEffect(() => {
    const fetchContext = async () => {
      // LIFF初期化待ち
      if (isLiffLoading || !isInitialized) {
        return;
      }

      if (!profile?.userId || !accessToken) {
        setIsLoadingContext(false);
        return;
      }

      try {
        const response = await fetch("/api/user/context", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-Line-User-Id": profile.userId,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setLineContext({
            lineUserId: profile.userId,
            recentImages: data.recentImages || [],
            sessionContext: data.sessionContext,
          });
        }
      } catch (error) {
        console.error("Failed to fetch context:", error);
      } finally {
        setIsLoadingContext(false);
      }
    };

    fetchContext();
  }, [profile?.userId, accessToken, isLiffLoading, isInitialized]);

  // ローディング中
  if (isLiffLoading || !isInitialized || isLoadingContext) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
        <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900">
      <ChatTab
        threads={threads}
        currentThreadId={currentThreadId}
        currentThread={currentThread}
        currentMessages={currentMessages}
        threadsLoading={threadsLoading}
        onCreateThread={createThread}
        onSelectThread={selectThread}
        onDeleteThread={deleteThread}
        onGenerateTitle={generateTitle}
        onSaveMessage={saveMessage}
        onClearThread={clearCurrentThread}
        onSearchMessages={searchMessages}
        lineContext={lineContext}
      />
    </div>
  );
}
