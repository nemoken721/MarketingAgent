import * as Sentry from "@sentry/nextjs";

/**
 * Sentry Edge Runtime 設定
 * Next.js Middleware など、Edge Functions で発生したエラーを監視
 */

// DSNが設定されていない場合は初期化をスキップ
const dsn = process.env.SENTRY_DSN;

if (dsn && dsn !== "https://your-sentry-dsn@sentry.io/project-id") {
  Sentry.init({
    dsn,

    // 開発環境では Sentry を無効化（オプション）
    enabled: process.env.NODE_ENV === "production",

    // Edge Runtime では Replay などの機能が制限される
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // セキュリティ: 機密情報のフィルタリング
    beforeSend(event) {
      // リクエストヘッダーから認証情報を削除
      if (event.request?.headers) {
        delete event.request.headers.Authorization;
        delete event.request.headers.Cookie;
      }

      return event;
    },

    // 環境名を設定
    environment: process.env.NODE_ENV,

    // リリースバージョン
    release: process.env.VERCEL_GIT_COMMIT_SHA || "development",
  });
}
