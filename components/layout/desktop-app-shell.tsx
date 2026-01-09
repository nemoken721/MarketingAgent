"use client";

import { useState, useCallback, useRef } from "react";
import { DesktopNavRail, CanvasMode } from "./desktop-nav-rail";
import { DesktopChatPanel } from "./desktop-chat-panel";
import { DesktopCanvas } from "./desktop-canvas";
import { useChatThreads } from "@/hooks/use-chat-threads";
import { ChatThread } from "@/types/chat";
import { ContentPreview } from "../canvas/operation-canvas";

export function DesktopAppShell() {
  const [activeMode, setActiveMode] = useState<CanvasMode>("home");
  const [showHistory, setShowHistory] = useState(false);
  const [contextData, setContextData] = useState<Record<string, any>>({});

  // コンテンツプレビュー追跡用のstate
  const [contentPreviews, setContentPreviews] = useState<ContentPreview[]>([]);
  const [currentDomain, setCurrentDomain] = useState<string | undefined>();
  const hasAutoSwitchedRef = useRef(false);

  // スレッド管理フック
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
    setCurrentMessages,
  } = useChatThreads();

  const handleModeChange = useCallback((mode: CanvasMode) => {
    setActiveMode(mode);
    // Reset context when changing modes
    setContextData({});
  }, []);

  const handleToggleHistory = useCallback(() => {
    setShowHistory((prev) => !prev);
  }, []);

  const handleContextChange = useCallback((data: Record<string, any>) => {
    setContextData((prev) => ({ ...prev, ...data }));

    // コンテンツプレビューを検出して自動切り替え
    if (data.content_preview) {
      const preview = data.content_preview as ContentPreview;
      setContentPreviews((prev) => {
        // 重複チェック
        if (prev.some((p) => p.id === preview.id)) {
          return prev.map((p) => (p.id === preview.id ? preview : p));
        }
        return [...prev, preview];
      });

      // ドメインを設定
      if (data.domain) {
        setCurrentDomain(data.domain);
      }

      // 自動でCanvasを切り替え（初回のみ）
      if (!hasAutoSwitchedRef.current) {
        setActiveMode("operation");
        setShowHistory(false);
        hasAutoSwitchedRef.current = true;
      }
    }
  }, []);

  /**
   * スレッド選択時の処理
   * - メッセージを読み込む
   * - Canvas状態を復元する
   * - 履歴パネルを閉じる
   */
  const handleThreadSelect = useCallback(
    async (threadId: string) => {
      const result = await selectThread(threadId);
      if (result) {
        const thread = result.thread as ChatThread;

        // Canvas状態を復元
        if (thread.canvasMode) {
          setActiveMode(thread.canvasMode as CanvasMode);
        }
        if (thread.canvasContext) {
          setContextData(thread.canvasContext);
        }

        // 履歴パネルを閉じてチャットを表示
        setShowHistory(false);
      }
    },
    [selectThread]
  );

  /**
   * 新規会話開始（現在のスレッドをクリア）
   */
  const handleNewThread = useCallback(() => {
    // 現在のスレッドをクリア（新規状態へ）
    clearCurrentThread();
    // 履歴パネルを閉じる
    setShowHistory(false);
    // プレビューもクリア
    setContentPreviews([]);
    hasAutoSwitchedRef.current = false;
  }, [clearCurrentThread]);

  /**
   * スレッド削除
   */
  const handleDeleteThread = useCallback(
    async (threadId: string) => {
      if (window.confirm("このスレッドを削除しますか？")) {
        await deleteThread(threadId);
      }
    },
    [deleteThread]
  );

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-gray-950 z-50">
      {/* Navigation Rail (64px) */}
      <DesktopNavRail
        activeMode={activeMode}
        onModeChange={handleModeChange}
        showHistory={showHistory}
        onToggleHistory={handleToggleHistory}
      />

      {/* Chat Panel (320px) */}
      <DesktopChatPanel
        currentCanvas={activeMode}
        contextData={contextData}
        showHistory={showHistory}
        onContextChange={handleContextChange}
        // スレッド関連props
        threads={threads}
        currentThreadId={currentThreadId}
        currentThread={currentThread}
        currentMessages={currentMessages}
        threadsLoading={threadsLoading}
        onThreadSelect={handleThreadSelect}
        onNewThread={handleNewThread}
        onCreateThread={createThread}
        onDeleteThread={handleDeleteThread}
        onGenerateTitle={generateTitle}
        onSaveMessage={saveMessage}
        setCurrentMessages={setCurrentMessages}
      />

      {/* Main Canvas (remaining width) */}
      <div className="flex-1 h-full overflow-hidden">
        <DesktopCanvas
          mode={activeMode}
          onContextChange={handleContextChange}
          contentPreviews={contentPreviews}
          currentDomain={currentDomain}
        />
      </div>
    </div>
  );
}
