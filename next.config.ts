import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 画像の最適化設定（Core Web Vitals 向上）
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },
  // 開発インジケーターを非表示
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  },
  // Puppeteer + Remotion用の外部パッケージ設定
  serverExternalPackages: [
    "puppeteer-core",
    "@sparticuz/chromium",
    "@remotion/bundler",
    "@remotion/renderer",
    "@remotion/cli",
    "@remotion/media-parser",
    "esbuild",
  ],
};

// 本番環境でSentryが設定されている場合のみラップ
const sentryEnabled =
  process.env.SENTRY_DSN &&
  process.env.SENTRY_DSN !== "https://your-sentry-dsn@sentry.io/project-id" &&
  process.env.SENTRY_ORG &&
  process.env.SENTRY_PROJECT;

let exportedConfig: NextConfig = nextConfig;

if (sentryEnabled) {
  // 動的インポートを避けるため、Sentryは本番ビルド時のみ有効
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { withSentryConfig } = require("@sentry/nextjs");
  exportedConfig = withSentryConfig(nextConfig, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    silent: true,
    widenClientFileUpload: true,
    hideSourceMaps: true,
  });
}

export default exportedConfig;
