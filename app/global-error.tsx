"use client";

import { useEffect } from "react";

/**
 * グローバルエラーバウンダリ
 * ルートレイアウトを含むすべてのエラーをキャッチ
 */
export default function GlobalError({
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
      console.error("Global Error:", error);
    });
  }, [error]);

  return (
    <html lang="ja">
      <body>
        <div style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          fontFamily: "system-ui, sans-serif",
        }}>
          <div style={{
            maxWidth: "28rem",
            width: "100%",
            padding: "2rem",
            border: "1px solid #e5e7eb",
            borderRadius: "0.5rem",
            textAlign: "center",
          }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}>
              システムエラー
            </h1>
            <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
              申し訳ございません。システムで重大なエラーが発生しました。
            </p>
            {error.digest && (
              <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "1.5rem" }}>
                エラーID: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "0.375rem",
                cursor: "pointer",
                marginRight: "0.5rem",
              }}
            >
              再読み込み
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                display: "inline-block",
                padding: "0.5rem 1rem",
                border: "1px solid #e5e7eb",
                borderRadius: "0.375rem",
                textDecoration: "none",
                color: "#374151",
              }}
            >
              ホームに戻る
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
