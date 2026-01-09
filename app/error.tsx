"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, Home, AlertCircle } from "lucide-react";

/**
 * ページレベルのエラーバウンダリ
 * クライアントコンポーネントでエラーが発生した際に表示
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sentry にエラーを送信（初期化されている場合のみ）
    import("@sentry/nextjs").then((Sentry) => {
      if (Sentry.getClient()) {
        Sentry.captureException(error);
      }
    }).catch(() => {
      // Sentryが利用できない場合はコンソールにログ
      console.error("Error:", error);
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-lg p-8 text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-2">エラーが発生しました</h1>
        <p className="text-muted-foreground mb-6">
          申し訳ございません。予期しないエラーが発生しました。
          {error.digest && (
            <span className="block text-xs mt-2">エラーID: {error.digest}</span>
          )}
        </p>

        {/* 開発環境のみエラーメッセージを表示 */}
        {process.env.NODE_ENV === "development" && (
          <div className="mb-6 p-4 bg-muted rounded text-left">
            <p className="text-xs font-mono text-red-600 break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            再試行
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
          >
            <Home className="w-4 h-4" />
            ホームに戻る
          </Link>
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          問題が解決しない場合は、
          <a href="mailto:support@marty.example.com" className="underline">
            サポート
          </a>
          までお問い合わせください。
        </p>
      </div>
    </div>
  );
}
