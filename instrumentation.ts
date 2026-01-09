/**
 * Next.js Instrumentation Hook
 * サーバー起動時に一度だけ実行される
 * Sentry などの監視ツールの初期化に使用
 */

export async function register() {
  // Server/Edge Runtime での Sentry 初期化
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// クライアント側での instrumentation は不要
// sentry.client.config.ts は自動的に読み込まれる
