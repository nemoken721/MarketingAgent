import * as Sentry from "@sentry/nextjs";

/**
 * Sentry クライアントサイド設定
 * ブラウザで発生したエラーを監視
 */

// DSNが設定されていない場合は初期化をスキップ
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn && dsn !== "https://your-sentry-dsn@sentry.io/project-id") {
  Sentry.init({
    dsn,

    // 開発環境では Sentry を無効化（オプション）
    enabled: process.env.NODE_ENV === "production",

    // トレースのサンプリングレート（0.0 ~ 1.0）
    // 本番環境では 0.1 (10%) 程度に設定してコストを抑える
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Replay機能のサンプリングレート（ユーザーセッションの記録）
    replaysSessionSampleRate: 0.1, // 10%のセッションを記録
    replaysOnErrorSampleRate: 1.0, // エラー発生時は100%記録

    // 統合設定
    integrations: [
      Sentry.replayIntegration({
        // プライバシー保護: 入力内容をマスク
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // セキュリティ: 機密情報のフィルタリング
    beforeSend(event) {
      // パスワード、トークン、APIキーなどの機密情報を除去
      if (event.request) {
        // クエリパラメータから機密情報を削除
        if (event.request.url) {
          const url = new URL(event.request.url);
          const sensitiveParams = ["token", "password", "api_key", "secret"];
          sensitiveParams.forEach((param) => {
            if (url.searchParams.has(param)) {
              url.searchParams.set(param, "[FILTERED]");
            }
          });
          event.request.url = url.toString();
        }

        // ヘッダーから Authorization を削除
        if (event.request.headers) {
          delete event.request.headers.Authorization;
          delete event.request.headers.Cookie;
        }
      }

      // フォームデータから機密情報を削除
      if (event.request?.data) {
        const data = event.request.data;
        const sensitiveFields = ["password", "token", "api_key", "secret", "credit_card"];

        if (typeof data === "object") {
          sensitiveFields.forEach((field) => {
            if (field in data) {
              (data as Record<string, unknown>)[field] = "[FILTERED]";
            }
          });
        }
      }

      return event;
    },

    // エラーのグルーピングを最適化
    beforeBreadcrumb(breadcrumb) {
      // コンソールログは記録しない（ノイズ削減）
      if (breadcrumb.category === "console") {
        return null;
      }
      return breadcrumb;
    },

    // 環境名を設定
    environment: process.env.NODE_ENV,

    // リリースバージョン（CI/CDで動的に設定することも可能）
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "development",
  });
} else if (process.env.NODE_ENV === "development") {
  // Sentryが無効化されていることをログ出力（開発時のみ）
  console.debug("[Sentry] DSN not configured, skipping initialization");
}
