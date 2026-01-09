import * as Sentry from "@sentry/nextjs";

/**
 * Sentry サーバーサイド設定
 * Next.js APIルート、サーバーコンポーネントで発生したエラーを監視
 */

// DSNが設定されていない場合は初期化をスキップ
const dsn = process.env.SENTRY_DSN;

if (dsn && dsn !== "https://your-sentry-dsn@sentry.io/project-id") {
  Sentry.init({
    dsn,

    // 開発環境では Sentry を無効化（オプション）
    enabled: process.env.NODE_ENV === "production",

    // トレースのサンプリングレート
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // セキュリティ: 機密情報のフィルタリング
    beforeSend(event) {
      // 環境変数から機密情報を除去
      if (event.contexts?.runtime?.name === "node" && event.extra) {
        delete event.extra.env;
      }

      // リクエストボディから機密情報を削除
      if (event.request?.data) {
        const data = event.request.data;
        const sensitiveFields = [
          "password",
          "token",
          "api_key",
          "secret",
          "credit_card",
          "stripe_key",
          "google_api_key",
        ];

        if (typeof data === "object") {
          sensitiveFields.forEach((field) => {
            if (field in data) {
              (data as Record<string, unknown>)[field] = "[FILTERED]";
            }
          });
        }
      }

      // スタックトレースからファイルパスの機密部分を削除
      if (event.exception?.values) {
        event.exception.values.forEach((exception) => {
          if (exception.stacktrace?.frames) {
            exception.stacktrace.frames.forEach((frame) => {
              if (frame.filename) {
                // ユーザー名などを含むパスを匿名化
                frame.filename = frame.filename.replace(/\/Users\/[^\/]+/, "/Users/[USER]");
                frame.filename = frame.filename.replace(/C:\\Users\\[^\\]+/, "C:\\Users\\[USER]");
              }
            });
          }
        });
      }

      return event;
    },

    // パフォーマンス: 遅いトランザクションのみ記録
    beforeSendTransaction(event) {
      // 100ms未満のトランザクションは送信しない（ノイズ削減）
      if (event.timestamp && event.start_timestamp) {
        const duration = event.timestamp - event.start_timestamp;
        if (duration < 0.1) {
          return null;
        }
      }
      return event;
    },

    // エラーのグルーピングを最適化
    beforeBreadcrumb(breadcrumb) {
      // HTTPリクエストからクエリパラメータの機密情報を削除
      if (breadcrumb.category === "http" && breadcrumb.data?.url) {
        try {
          const url = new URL(breadcrumb.data.url);
          const sensitiveParams = ["token", "password", "api_key", "secret"];
          sensitiveParams.forEach((param) => {
            if (url.searchParams.has(param)) {
              url.searchParams.set(param, "[FILTERED]");
            }
          });
          breadcrumb.data.url = url.toString();
        } catch {
          // URL解析に失敗した場合は無視
        }
      }

      return breadcrumb;
    },

    // 環境名を設定
    environment: process.env.NODE_ENV,

    // リリースバージョン
    release: process.env.VERCEL_GIT_COMMIT_SHA || "development",

    // 追加コンテキスト
    initialScope: {
      tags: {
        runtime: "node",
      },
    },
  });
}
