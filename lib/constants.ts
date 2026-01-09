/**
 * アプリケーション全体で使用する定数の一元管理
 * 本番環境化に伴い、マジックナンバーを排除し保守性を向上
 */

/**
 * クレジット消費量定義
 */
export const CREDIT_COSTS = {
  TEXT_GENERATION: 0,
  IMAGE_GENERATION: 10,
  VIDEO_GENERATION: 200,
  DEEP_RESEARCH: 50,
} as const;

/**
 * プラン定義（Stripe連携用）
 */
export const PLANS = {
  FREE: {
    id: "free",
    name: "Free",
    displayName: "フリープラン",
    monthlyCredits: 100, // 毎月付与されるポイント
    features: [
      "月間100 Ma-Point",
      "テキスト生成（無制限）",
      "画像生成（最大10枚/月）",
      "Instagram連携",
      "X (Twitter) 連携",
    ],
  },
  PRO: {
    id: "pro",
    name: "Pro",
    displayName: "Proプラン",
    monthlyPrice: 2980, // 円
    monthlyCredits: 1000,
    features: [
      "月間1,000 Ma-Point",
      "すべてのフリー機能",
      "動画生成（最大5本/月）",
      "詳細リサーチ（Deep Research）",
      "WordPress自動構築",
      "優先サポート",
    ],
  },
} as const;

/**
 * クレジット購入プラン
 */
export const CREDIT_PURCHASE_PLANS = {
  small: {
    id: "small",
    credits: 500,
    price: 500,
    name: "スモール",
    description: "画像生成50枚分",
  },
  medium: {
    id: "medium",
    credits: 1000,
    price: 900,
    name: "ミディアム",
    description: "画像生成100枚分",
    badge: "10%お得",
  },
  large: {
    id: "large",
    credits: 5000,
    price: 4000,
    name: "ラージ",
    description: "画像生成500枚分",
    badge: "20%お得",
  },
} as const;

/**
 * SNS連携プラットフォーム定義
 */
export const PLATFORMS = {
  INSTAGRAM: "instagram",
  X: "x",
  WORDPRESS: "wordpress",
} as const;

/**
 * 投稿ステータス定義
 */
export const POST_STATUS = {
  DRAFT: "draft",
  PENDING_APPROVAL: "pending_approval",
  SCHEDULED: "scheduled",
  PUBLISHED: "published",
  FAILED: "failed",
} as const;

/**
 * サブスクリプションステータス
 */
export const SUBSCRIPTION_STATUS = {
  ACTIVE: "active",
  PAST_DUE: "past_due",
  CANCELED: "canceled",
  FREE: "free",
} as const;

/**
 * クレジット取引タイプ
 */
export const TRANSACTION_TYPE = {
  USAGE: "usage",
  PURCHASE: "purchase",
  MONTHLY_GRANT: "monthly_grant",
  REFUND: "refund",
} as const;

/**
 * URLパス定数
 */
export const ROUTES = {
  HOME: "/",
  LOGIN: "/auth/login",
  SIGNUP: "/auth/signup",
  FORGOT_PASSWORD: "/auth/forgot-password",
  SETTINGS: "/settings",
  TERMS: "/terms",
  PRIVACY: "/privacy",
  LEGAL: "/legal",
} as const;

/**
 * API エンドポイント
 */
export const API_ENDPOINTS = {
  CHAT: "/api/chat",
  AUTH_USER: "/api/auth/user",
  AUTH_LOGOUT: "/api/auth/logout",
  INTEGRATIONS: "/api/integrations",
  STRIPE_CHECKOUT: "/api/stripe/checkout",
  STRIPE_WEBHOOK: "/api/stripe/webhook",
  STRIPE_PORTAL: "/api/stripe/portal",
} as const;

/**
 * タイムアウト設定（ミリ秒）
 */
export const TIMEOUTS = {
  API_REQUEST: 30000, // 30秒
  IMAGE_GENERATION: 60000, // 60秒
  VIDEO_GENERATION: 180000, // 3分
} as const;

/**
 * レート制限設定
 */
export const RATE_LIMITS = {
  IMAGE_GENERATION_PER_HOUR: 10, // 1時間あたりの画像生成上限（不正利用防止）
  API_REQUESTS_PER_MINUTE: 60, // 1分あたりのAPIリクエスト上限
} as const;

/**
 * セキュリティ設定
 */
export const SECURITY = {
  SESSION_DURATION: 7 * 24 * 60 * 60, // 7日間（秒）
  PASSWORD_MIN_LENGTH: 8,
  MAX_LOGIN_ATTEMPTS: 5,
} as const;

/**
 * アプリケーション情報
 */
export const APP_INFO = {
  NAME: "Marty",
  FULL_NAME: "Marty - AIマーケティングアシスタント",
  DESCRIPTION: "SNS投稿自動化・Webサイト構築を支援するAIエージェント",
  SUPPORT_EMAIL: "support@marty.example.com", // 実際のメールアドレスに置き換える
  VERSION: "3.0.0",
} as const;

/**
 * 型推論用のヘルパー型
 */
export type PlanId = keyof typeof PLANS;
export type PlatformId = (typeof PLATFORMS)[keyof typeof PLATFORMS];
export type PostStatus = (typeof POST_STATUS)[keyof typeof POST_STATUS];
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];
export type TransactionType = (typeof TRANSACTION_TYPE)[keyof typeof TRANSACTION_TYPE];
