"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  ChatThread,
  ChatMessage,
  CanvasMode,
  CreateThreadRequest,
  UpdateThreadRequest,
} from "@/types/chat";

const STORAGE_KEY = "marty_current_thread_id";

/**
 * スレッド管理カスタムフック
 */
export function useChatThreads() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [currentThread, setCurrentThread] = useState<ChatThread | null>(null);
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialized = useRef(false);

  /**
   * スレッド一覧を取得
   */
  const fetchThreads = useCallback(async (archived = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/chat-threads?archived=${archived}&limit=50`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "スレッド一覧の取得に失敗しました");
      }

      setThreads(data.threads);
    } catch (err: any) {
      setError(err.message);
      console.error("[useChatThreads] fetchThreads error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 新規スレッドを作成
   */
  const createThread = useCallback(
    async (canvasMode?: CanvasMode, canvasContext?: Record<string, any>) => {
      setIsLoading(true);
      setError(null);

      try {
        const body: CreateThreadRequest = {
          canvasMode: canvasMode || "home",
          canvasContext: canvasContext || {},
        };

        const res = await fetch("/api/chat-threads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "スレッドの作成に失敗しました");
        }

        const newThread = data.thread as ChatThread;

        // スレッド一覧の先頭に追加
        setThreads((prev) => [newThread, ...prev]);

        // 新しいスレッドを選択
        setCurrentThreadId(newThread.id);
        setCurrentThread(newThread);
        setCurrentMessages([]);

        return newThread;
      } catch (err: any) {
        setError(err.message);
        console.error("[useChatThreads] createThread error:", err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * スレッドを選択（詳細とメッセージを取得）
   */
  const selectThread = useCallback(async (threadId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/chat-threads/${threadId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "スレッドの取得に失敗しました");
      }

      setCurrentThreadId(threadId);
      setCurrentThread(data.thread as ChatThread);
      setCurrentMessages(data.messages as ChatMessage[]);

      return data;
    } catch (err: any) {
      setError(err.message);
      console.error("[useChatThreads] selectThread error:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * スレッドを更新
   */
  const updateThread = useCallback(
    async (threadId: string, updates: UpdateThreadRequest) => {
      try {
        const res = await fetch(`/api/chat-threads/${threadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "スレッドの更新に失敗しました");
        }

        const updatedThread = data.thread as ChatThread;

        // スレッド一覧を更新
        setThreads((prev) =>
          prev.map((t) => (t.id === threadId ? updatedThread : t))
        );

        // 現在のスレッドを更新
        if (currentThreadId === threadId) {
          setCurrentThread(updatedThread);
        }

        return updatedThread;
      } catch (err: any) {
        setError(err.message);
        console.error("[useChatThreads] updateThread error:", err);
        return null;
      }
    },
    [currentThreadId]
  );

  /**
   * スレッドを削除
   */
  const deleteThread = useCallback(
    async (threadId: string) => {
      try {
        const res = await fetch(`/api/chat-threads/${threadId}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "スレッドの削除に失敗しました");
        }

        // スレッド一覧から削除
        setThreads((prev) => prev.filter((t) => t.id !== threadId));

        // 現在のスレッドが削除された場合はクリア
        if (currentThreadId === threadId) {
          setCurrentThreadId(null);
          setCurrentThread(null);
          setCurrentMessages([]);
        }

        return true;
      } catch (err: any) {
        setError(err.message);
        console.error("[useChatThreads] deleteThread error:", err);
        return false;
      }
    },
    [currentThreadId]
  );

  /**
   * スレッドをアーカイブ
   */
  const archiveThread = useCallback(
    async (threadId: string) => {
      return updateThread(threadId, { isArchived: true });
    },
    [updateThread]
  );

  /**
   * タイトルを自動生成
   */
  const generateTitle = useCallback(async (threadId: string) => {
    try {
      const res = await fetch(
        `/api/chat-threads/${threadId}/generate-title`,
        { method: "POST" }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "タイトルの生成に失敗しました");
      }

      // スレッド一覧を更新
      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, title: data.title } : t))
      );

      // 現在のスレッドを更新
      if (currentThreadId === threadId) {
        setCurrentThread((prev) =>
          prev ? { ...prev, title: data.title } : null
        );
      }

      return data.title;
    } catch (err: any) {
      console.error("[useChatThreads] generateTitle error:", err);
      return null;
    }
  }, [currentThreadId]);

  /**
   * メッセージを保存
   * @param threadIdOverride - 新規スレッド作成時など、currentThreadIdがまだ更新されていない場合に使用
   */
  const saveMessage = useCallback(
    async (
      role: "user" | "assistant" | "system",
      content: string,
      toolCalls?: any[],
      metadata?: Record<string, any>,
      generateEmbedding?: boolean,
      threadIdOverride?: string
    ) => {
      const targetThreadId = threadIdOverride || currentThreadId;

      if (!targetThreadId) {
        console.warn("[useChatThreads] No thread ID for saveMessage");
        return null;
      }

      try {
        const res = await fetch("/api/chat-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            threadId: targetThreadId,
            role,
            content,
            toolCalls,
            metadata,
            generateEmbedding: generateEmbedding ?? false,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "メッセージの保存に失敗しました");
        }

        // ローカルの messages を更新
        const newMessage = data.message as ChatMessage;
        setCurrentMessages((prev) => [...prev, newMessage]);

        // スレッドのプレビューを更新（ローカル）
        setThreads((prev) =>
          prev.map((t) =>
            t.id === targetThreadId
              ? {
                  ...t,
                  preview: content.slice(0, 100),
                  messageCount: t.messageCount + 1,
                  lastMessageAt: new Date().toISOString(),
                }
              : t
          )
        );

        return newMessage;
      } catch (err: any) {
        console.error("[useChatThreads] saveMessage error:", err);
        return null;
      }
    },
    [currentThreadId]
  );

  /**
   * スレッドを要約
   */
  const summarizeThread = useCallback(async (threadId: string) => {
    try {
      const res = await fetch(
        `/api/chat-threads/${threadId}/summarize`,
        { method: "POST" }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "要約の生成に失敗しました");
      }

      // スレッド一覧を更新
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId
            ? { ...t, summary: data.summary, isSummarized: true }
            : t
        )
      );

      // 現在のスレッドを更新
      if (currentThreadId === threadId) {
        setCurrentThread((prev) =>
          prev ? { ...prev, summary: data.summary, isSummarized: true } : null
        );
      }

      return data.summary;
    } catch (err: any) {
      console.error("[useChatThreads] summarizeThread error:", err);
      return null;
    }
  }, [currentThreadId]);

  /**
   * RAG検索（関連メッセージを検索）
   */
  const searchMessages = useCallback(async (query: string, limit = 10) => {
    try {
      const res = await fetch("/api/chat-threads/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "検索に失敗しました");
      }

      return data.results as Array<{
        messageId: string;
        threadId: string;
        threadTitle: string;
        content: string;
        role: string;
        createdAt: string;
        similarity: number | null;
      }>;
    } catch (err: any) {
      console.error("[useChatThreads] searchMessages error:", err);
      return [];
    }
  }, []);

  /**
   * 現在のスレッドをクリア（新規会話状態へ）
   */
  const clearCurrentThread = useCallback(() => {
    setCurrentThreadId(null);
    setCurrentThread(null);
    setCurrentMessages([]);
  }, []);

  /**
   * currentThreadIdをlocalStorageに永続化
   */
  useEffect(() => {
    if (isInitialized.current) {
      if (currentThreadId) {
        localStorage.setItem(STORAGE_KEY, currentThreadId);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [currentThreadId]);

  /**
   * 初回マウント時にスレッド一覧を取得し、保存されたスレッドを復元
   */
  useEffect(() => {
    const initializeThreads = async () => {
      await fetchThreads();

      // localStorageから前回のスレッドIDを復元
      const savedThreadId = localStorage.getItem(STORAGE_KEY);
      if (savedThreadId) {
        // スレッドを選択（メッセージも取得）
        const result = await selectThread(savedThreadId);
        // スレッドが存在しない場合（削除済み等）はlocalStorageをクリア
        if (!result) {
          console.warn("[useChatThreads] Saved thread not found, clearing localStorage");
          localStorage.removeItem(STORAGE_KEY);
        }
      }

      isInitialized.current = true;
    };

    initializeThreads();
  }, []);

  return {
    // 状態
    threads,
    currentThreadId,
    currentThread,
    currentMessages,
    isLoading,
    error,

    // アクション
    fetchThreads,
    createThread,
    selectThread,
    updateThread,
    deleteThread,
    archiveThread,
    generateTitle,
    saveMessage,
    clearCurrentThread,
    summarizeThread,
    searchMessages,

    // セッター（外部からの直接更新用）
    setCurrentMessages,
  };
}
