"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Plug,
  FileText,
  Terminal,
  Clock,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * WordPress操作進捗表示コンポーネント
 * プラグインインストール、ページ作成、WP-CLIコマンド実行などの進捗を表示
 */

export type OperationType = "plugin" | "page" | "wpcli";
export type OperationStatus = "pending" | "in_progress" | "completed" | "error";

export interface WordPressOperation {
  id: string;
  type: OperationType;
  name: string;
  description?: string;
  status: OperationStatus;
  result?: {
    success: boolean;
    message: string;
    url?: string;
    pageId?: number;
  };
  startedAt?: Date;
  completedAt?: Date;
}

interface WordPressOperationProgressProps {
  operations: WordPressOperation[];
  title?: string;
  className?: string;
}

const operationIcons: Record<OperationType, React.ReactNode> = {
  plugin: <Plug className="w-4 h-4" />,
  page: <FileText className="w-4 h-4" />,
  wpcli: <Terminal className="w-4 h-4" />,
};

const operationLabels: Record<OperationType, string> = {
  plugin: "プラグイン",
  page: "ページ",
  wpcli: "コマンド",
};

export function WordPressOperationProgress({
  operations,
  title = "WordPress操作",
  className,
}: WordPressOperationProgressProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  // 進行中のタスクがあるかチェック
  const hasInProgress = operations.some((op) => op.status === "in_progress");
  const completedCount = operations.filter((op) => op.status === "completed").length;
  const errorCount = operations.filter((op) => op.status === "error").length;
  const totalCount = operations.length;

  // 経過時間計測
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (hasInProgress) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [hasInProgress]);

  // 全完了時
  const allCompleted = completedCount === totalCount && totalCount > 0;
  // エラー発生時
  const hasErrors = errorCount > 0;

  // ステータスに基づいた色
  const borderColor = hasErrors
    ? "border-red-500"
    : allCompleted
    ? "border-green-500"
    : hasInProgress
    ? "border-blue-500"
    : "border-gray-300";

  const bgColor = hasErrors
    ? "bg-red-50 dark:bg-red-950/20"
    : allCompleted
    ? "bg-green-50 dark:bg-green-950/20"
    : hasInProgress
    ? "bg-blue-50 dark:bg-blue-950/20"
    : "bg-card";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "border-2 rounded-lg p-6",
        borderColor,
        bgColor,
        className
      )}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              hasErrors
                ? "bg-red-500"
                : allCompleted
                ? "bg-green-500"
                : hasInProgress
                ? "bg-blue-500"
                : "bg-gray-400"
            )}
          >
            {hasErrors ? (
              <XCircle className="w-5 h-5 text-white" />
            ) : allCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-white" />
            ) : hasInProgress ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Clock className="w-5 h-5 text-white" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">
              {completedCount}/{totalCount} 完了
              {errorCount > 0 && ` (${errorCount}件のエラー)`}
            </p>
          </div>
        </div>

        {/* 経過時間 */}
        {hasInProgress && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{formatTime(elapsedTime)}</span>
          </div>
        )}
      </div>

      {/* 進捗バー */}
      <div className="mb-4">
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: `${(completedCount / Math.max(totalCount, 1)) * 100}%`,
            }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className={cn(
              "h-full rounded-full",
              hasErrors
                ? "bg-red-500"
                : allCompleted
                ? "bg-green-500"
                : "bg-blue-500"
            )}
          />
        </div>
      </div>

      {/* 操作リスト */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {operations.map((operation, index) => (
            <OperationItem key={operation.id} operation={operation} index={index} />
          ))}
        </AnimatePresence>
      </div>

      {/* 完了メッセージ */}
      {allCompleted && !hasErrors && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg"
        >
          <p className="text-sm text-green-800 dark:text-green-200 font-medium">
            すべての操作が完了しました
          </p>
        </motion.div>
      )}

      {/* エラーメッセージ */}
      {hasErrors && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg"
        >
          <p className="text-sm text-red-800 dark:text-red-200">
            一部の操作でエラーが発生しました。詳細を確認してください。
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * 個別の操作アイテムコンポーネント
 */
function OperationItem({
  operation,
  index,
}: {
  operation: WordPressOperation;
  index: number;
}) {
  const statusColors: Record<OperationStatus, string> = {
    pending: "bg-gray-100 dark:bg-gray-800",
    in_progress: "bg-blue-100 dark:bg-blue-900/30",
    completed: "bg-green-100 dark:bg-green-900/30",
    error: "bg-red-100 dark:bg-red-900/30",
  };

  const statusIcons: Record<OperationStatus, React.ReactNode> = {
    pending: (
      <div className="w-4 h-4 rounded-full border-2 border-gray-400 dark:border-gray-500" />
    ),
    in_progress: <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />,
    completed: <CheckCircle2 className="w-4 h-4 text-green-600" />,
    error: <XCircle className="w-4 h-4 text-red-600" />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "p-3 rounded-lg transition-colors",
        statusColors[operation.status]
      )}
    >
      <div className="flex items-start gap-3">
        {/* ステータスアイコン */}
        <div className="mt-0.5">{statusIcons[operation.status]}</div>

        {/* コンテンツ */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full",
                operation.type === "plugin" && "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
                operation.type === "page" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
                operation.type === "wpcli" && "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              )}
            >
              {operationIcons[operation.type]}
              {operationLabels[operation.type]}
            </span>
            <span className="font-medium text-foreground truncate">
              {operation.name}
            </span>
          </div>

          {/* 説明または結果メッセージ */}
          {operation.status === "completed" && operation.result ? (
            <div className="text-sm text-green-700 dark:text-green-300">
              {operation.result.message}
              {operation.result.url && (
                <a
                  href={operation.result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 ml-2 text-blue-600 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  表示
                </a>
              )}
            </div>
          ) : operation.status === "error" && operation.result ? (
            <div className="text-sm text-red-700 dark:text-red-300">
              {operation.result.message}
            </div>
          ) : operation.status === "in_progress" ? (
            <div className="text-sm text-blue-700 dark:text-blue-300">
              実行中...
            </div>
          ) : operation.description ? (
            <div className="text-sm text-muted-foreground">
              {operation.description}
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * 時間をフォーマット
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * サーバーコンポーネント用のラッパー
 * AIがcanvas表示するときに使用
 */
export function createOperationsFromResults(results: {
  type: OperationType;
  name: string;
  success: boolean;
  message: string;
  url?: string;
  pageId?: number;
}[]): WordPressOperation[] {
  return results.map((result, index) => ({
    id: `op-${index}-${Date.now()}`,
    type: result.type,
    name: result.name,
    status: result.success ? "completed" : "error",
    result: {
      success: result.success,
      message: result.message,
      url: result.url,
      pageId: result.pageId,
    },
    completedAt: new Date(),
  }));
}
