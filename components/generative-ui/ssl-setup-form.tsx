"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Lock,
  Mail,
  Shield,
  AlertCircle,
  CheckCircle2,
  Loader2,
  XCircle,
  Rocket,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * SSL証明書設定フォーム & 進捗表示コンポーネント
 * Let's Encryptを使用してSSL証明書を自動インストールする
 */

interface SSLSetupFormProps {
  websiteId: string;
  domain: string;
  defaultEmail?: string;
  className?: string;
}

interface SSLProgress {
  step: number;
  message: string;
  percent: number;
  completed: boolean;
}

export function SSLSetupForm({
  websiteId,
  domain,
  defaultEmail,
  className,
}: SSLSetupFormProps) {
  const [email, setEmail] = useState(defaultEmail || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [progress, setProgress] = useState<SSLProgress>({
    step: 0,
    message: "",
    percent: 0,
    completed: false,
  });
  const [status, setStatus] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // SSL証明書インストール開始
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("メールアドレスを入力してください");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/websites/ssl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteId,
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "SSL証明書のインストールに失敗しました");
      }

      toast.success("SSL証明書のインストールを開始しました！");
      setIsInstalling(true);
    } catch (error: any) {
      console.error("[SSLSetupForm Error]", error);
      toast.error(error.message || "エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 進捗をポーリング
  useEffect(() => {
    if (!isInstalling) return;

    let interval: NodeJS.Timeout;

    const fetchProgress = async () => {
      try {
        const response = await fetch(`/api/websites/${websiteId}/status`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "進捗情報の取得に失敗しました");
        }

        setStatus(data.status);
        setProgress(data.sslProgress);
        setErrorMessage(data.errorMessage);

        // 完了またはエラー時はポーリング停止
        if (
          data.status === "completed" ||
          data.status === "error" ||
          data.sslProgress.completed
        ) {
          setIsInstalling(false);
        }
      } catch (error: any) {
        console.error("[Progress Fetch Error]", error);
        setErrorMessage(error.message);
        setIsInstalling(false);
      }
    };

    // 初回実行
    fetchProgress();

    // 2秒ごとにポーリング
    interval = setInterval(fetchProgress, 2000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [websiteId, isInstalling]);

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
              SSL設定エラー
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">
              SSL証明書のインストール中にエラーが発生しました
            </p>
          </div>
        </div>

        <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-800 dark:text-red-200">
            {errorMessage || "不明なエラーが発生しました"}
          </p>
        </div>

        <div className="mt-4 text-xs text-red-600 dark:text-red-400">
          DNS設定やドメイン設定を確認してください。問題が解決しない場合は、サポートにお問い合わせください。
        </div>
      </motion.div>
    );
  }

  // 完了状態
  if (progress.completed || status === "completed") {
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
              SSL証明書のインストール完了！
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              HTTPSでの安全な通信が可能になりました
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-800 dark:text-green-200">
              DNS伝播確認完了
            </span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-800 dark:text-green-200">
              Let&apos;s Encrypt証明書取得完了
            </span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-800 dark:text-green-200">
              Webサーバー設定完了
            </span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-800 dark:text-green-200">
              自動更新設定完了
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <Rocket className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-semibold mb-1">WordPressサイトの構築が完了しました！</p>
            <p>
              https://{domain} にアクセスして、ログインしてください。
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // インストール中
  if (isInstalling) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "border-2 border-green-500 bg-green-50 dark:bg-green-950/20 rounded-lg p-6",
          className
        )}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-green-900 dark:text-green-100">
              SSL証明書をインストール中...
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              完了までしばらくお待ちください
            </p>
          </div>
        </div>

        {/* 進捗バー */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-900 dark:text-green-100">
              {progress.message}
            </span>
            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
              {progress.percent}%
            </span>
          </div>
          <div className="w-full h-3 bg-green-100 dark:bg-green-900/20 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress.percent}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full relative"
            >
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
            label="DNS伝播確認"
          />
          <StepItem
            completed={progress.step > 3}
            current={progress.step === 3}
            label="Certbotインストール"
          />
          <StepItem
            completed={progress.step > 4}
            current={progress.step === 4}
            label="SSL証明書取得"
          />
          <StepItem
            completed={progress.step > 5}
            current={progress.step === 5}
            label="Webサーバー設定"
          />
          <StepItem
            completed={progress.step > 6}
            current={progress.step === 6}
            label="自動更新設定"
          />
        </div>

        <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
          <p className="text-xs text-green-600 dark:text-green-400">
            ⏱️ SSL設定には通常3〜10分程度かかります。DNS伝播の待機時間により前後します。
          </p>
        </div>
      </motion.div>
    );
  }

  // フォーム表示
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "border-2 border-green-500 bg-green-50 dark:bg-green-950/20 rounded-lg p-6",
        className
      )}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-green-900 dark:text-green-100">
            SSL証明書の設定
          </h3>
          <p className="text-sm text-green-700 dark:text-green-300">
            HTTPSでの安全な通信を有効にします
          </p>
        </div>
      </div>

      <div className="flex gap-2 p-3 mb-4 bg-green-100 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <AlertCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-green-800 dark:text-green-200">
          <p className="font-medium mb-1">SSL証明書とは？</p>
          <p>
            Let&apos;s Encryptが提供する<strong>無料のSSL証明書</strong>を自動インストールします。
            これにより、サイトが「https://」で始まる安全な通信に対応します。
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-green-800 dark:text-green-200 mb-1">
            <Mail className="w-4 h-4 inline mr-1" />
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="例: admin@example.com"
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-green-300 dark:border-slate-600 rounded-md text-green-900 dark:text-white placeholder-green-500 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            証明書の有効期限通知に使用されます
          </p>
        </div>

        <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 dark:text-blue-200">
            SSL証明書は<strong>90日ごとに自動更新</strong>されます。手動での更新作業は不要です。
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-4 py-3 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-muted disabled:text-muted-foreground transition-colors flex items-center justify-center gap-2 font-semibold"
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>設定中...</span>
            </>
          ) : (
            <>
              <Lock className="w-5 h-5" />
              <span>SSL証明書をインストール</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          ⚠️ DNS設定が完了していることを確認してから実行してください。
          DNS伝播には最大10分程度かかる場合があります。
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
        current && "bg-green-100 dark:bg-green-900/20",
        !completed && !current && "bg-card"
      )}
    >
      {completed && (
        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
      )}
      {current && <Loader2 className="w-4 h-4 text-green-600 animate-spin" />}
      {!completed && !current && (
        <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
      )}
      <span
        className={cn(
          "text-sm",
          completed && "text-green-800 dark:text-green-200 font-medium",
          current && "text-green-800 dark:text-green-200 font-semibold",
          !completed && !current && "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </div>
  );
}
