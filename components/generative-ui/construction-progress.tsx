"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Wrench,
  CheckCircle2,
  XCircle,
  Loader2,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * WordPress構築進捗表示コンポーネント
 * リアルタイムで構築進捗を表示する
 */

interface ConstructionProgressProps {
  websiteId: string;
  onComplete?: () => void;
  className?: string;
}

interface BuildProgress {
  step: number;
  message: string;
  percent: number;
  completed: boolean;
}

export function ConstructionProgress({
  websiteId,
  onComplete,
  className,
}: ConstructionProgressProps) {
  const [progress, setProgress] = useState<BuildProgress>({
    step: 0,
    message: "構築準備中...",
    percent: 0,
    completed: false,
  });
  const [status, setStatus] = useState<string>("building");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchProgress = async () => {
      try {
        const response = await fetch(`/api/websites/${websiteId}/status`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "進捗情報の取得に失敗しました");
        }

        setStatus(data.status);
        setProgress(data.buildProgress);
        setErrorMessage(data.errorMessage);

        // 完了またはエラー時はポーリング停止
        if (
          data.status === "ssl_pending" ||
          data.status === "error" ||
          data.buildProgress.completed
        ) {
          setIsPolling(false);
          if (onComplete && data.status === "ssl_pending") {
            onComplete();
          }
        }
      } catch (error: any) {
        console.error("[Progress Fetch Error]", error);
        setErrorMessage(error.message);
        setIsPolling(false);
      }
    };

    // 初回実行
    fetchProgress();

    // 2秒ごとにポーリング
    if (isPolling) {
      interval = setInterval(fetchProgress, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [websiteId, isPolling, onComplete]);

  // エラー状態
  if (status === "error" || errorMessage) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "border-2 border-red-500 bg-red-50 dark:bg-red-950/20 rounded-lg p-6",
          className
        )}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
            <XCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-red-900 dark:text-red-100">
              構築エラー
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">
              WordPress構築中にエラーが発生しました
            </p>
          </div>
        </div>

        <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-800 dark:text-red-200">
            {errorMessage || "不明なエラーが発生しました"}
          </p>
        </div>

        <div className="mt-4 text-xs text-red-600 dark:text-red-400">
          サーバー接続情報やドメイン設定を確認してください。問題が解決しない場合は、サポートにお問い合わせください。
        </div>
      </motion.div>
    );
  }

  // 完了状態
  if (progress.completed || status === "ssl_pending") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "border-2 border-green-500 bg-green-50 dark:bg-green-950/20 rounded-lg p-6",
          className
        )}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-green-900 dark:text-green-100">
              構築完了！
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              WordPressのインストールが完了しました
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-800 dark:text-green-200">
              WP-CLIインストール完了
            </span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-800 dark:text-green-200">
              WordPressダウンロード完了
            </span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-800 dark:text-green-200">
              Lightningテーマインストール完了
            </span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-800 dark:text-green-200">
              プラグインインストール完了
            </span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-800 dark:text-green-200">
              ブログ機能設定完了
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <Rocket className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <p className="text-sm text-blue-800 dark:text-blue-200">
            次のステップ: SSL証明書の設定を行います
          </p>
        </div>
      </motion.div>
    );
  }

  // 構築中
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/20 rounded-lg p-6",
        className
      )}
    >
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
          <Wrench className="w-6 h-6 text-white animate-pulse" />
        </div>
        <div>
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">
            WordPress構築中...
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            完了までしばらくお待ちください
          </p>
        </div>
      </div>

      {/* 進捗バー */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {progress.message}
          </span>
          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
            {progress.percent}%
          </span>
        </div>
        <div className="w-full h-3 bg-blue-100 dark:bg-blue-900/20 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress.percent}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full relative"
          >
            {/* アニメーション効果 */}
            <motion.div
              className="absolute inset-0 bg-white/30"
              animate={{
                x: ["-100%", "100%"],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          </motion.div>
        </div>
      </div>

      {/* ステップ表示 */}
      <div className="space-y-2">
        <StepItem
          completed={progress.step > 1}
          current={progress.step === 1}
          label="サーバー接続"
        />
        <StepItem
          completed={progress.step > 2}
          current={progress.step === 2}
          label="WP-CLIインストール"
        />
        <StepItem
          completed={progress.step > 3}
          current={progress.step === 3}
          label="WordPressダウンロード"
        />
        <StepItem
          completed={progress.step > 4}
          current={progress.step === 4}
          label="Lightningテーマインストール"
        />
        <StepItem
          completed={progress.step > 5}
          current={progress.step === 5}
          label="プラグインインストール"
        />
        <StepItem
          completed={progress.step > 6}
          current={progress.step === 6}
          label="ブログ機能設定"
        />
      </div>

      {/* 注意事項 */}
      <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-600 dark:text-blue-400">
          ⏱️ 構築には通常3〜5分程度かかります。画面を閉じても構築は続行されます。
        </p>
      </div>
    </motion.div>
  );
}

/**
 * ステップアイテムコンポーネント
 */
function StepItem({
  completed,
  current,
  label,
}: {
  completed: boolean;
  current: boolean;
  label: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg transition-colors",
        completed && "bg-green-100 dark:bg-green-900/20",
        current && "bg-blue-100 dark:bg-blue-900/20",
        !completed && !current && "bg-card"
      )}
    >
      {completed && (
        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
      )}
      {current && <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />}
      {!completed && !current && (
        <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
      )}
      <span
        className={cn(
          "text-sm",
          completed && "text-green-800 dark:text-green-200 font-medium",
          current && "text-blue-800 dark:text-blue-200 font-semibold",
          !completed && !current && "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </div>
  );
}
