import { z } from "zod";

/**
 * 環境変数のバリデーションスキーマ
 * セキュリティと堅牢性のため、すべての環境変数を型安全に管理
 */

// サーバーサイド専用の環境変数
const serverSchema = z.object({
  // Google AI (Gemini)
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1, "Gemini API key is required"),

  // Supabase (サーバー側で使用する場合)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("Invalid Supabase URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "Supabase anon key is required"),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1, "Stripe secret key is required"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "Stripe webhook secret is required"),

  // Sentry (サーバー側)
  SENTRY_DSN: z.string().url("Invalid Sentry DSN").optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(), // ビルド時のみ使用

  // Resend (トランザクションメール)
  RESEND_API_KEY: z.string().optional(), // Phase 4 で追加
  RESEND_FROM_EMAIL: z.string().email("Invalid from email").optional(),

  // Node環境
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

// クライアントサイドで使用可能な環境変数（NEXT_PUBLIC_ プレフィックス）
const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("Invalid Supabase URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "Supabase anon key is required"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1, "Stripe publishable key is required"),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url("Invalid Sentry DSN").optional(),
});

// 型推論用
type ServerEnv = z.infer<typeof serverSchema>;
type ClientEnv = z.infer<typeof clientSchema>;

/**
 * ビルド時かどうかを判定
 * Next.jsのビルド時は環境変数が設定されていないため、バリデーションをスキップ
 */
function isBuildTime(): boolean {
  // Vercelのビルド時は VERCEL_ENV が設定される前に実行される
  // また、next build コマンド実行時は NODE_ENV が production になる
  return process.env.NEXT_PHASE === "phase-production-build" ||
    (process.env.NODE_ENV === "production" && !process.env.VERCEL_ENV);
}

/**
 * サーバーサイドの環境変数を取得
 * ビルド時/ランタイム時に自動的にバリデーション
 */
function getServerEnv(): ServerEnv {
  // サーバーサイドでのみ実行されることを確認
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() can only be called on the server side");
  }

  // ビルド時はダミー値を返す（バリデーションをスキップ）
  if (isBuildTime()) {
    return {
      GOOGLE_GENERATIVE_AI_API_KEY: "build-time-placeholder",
      NEXT_PUBLIC_SUPABASE_URL: "https://placeholder.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "build-time-placeholder",
      STRIPE_SECRET_KEY: "sk_test_placeholder",
      STRIPE_WEBHOOK_SECRET: "whsec_placeholder",
      NODE_ENV: "production",
    } as ServerEnv;
  }

  const parsed = serverSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Invalid server environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid server environment variables");
  }

  return parsed.data;
}

/**
 * クライアントサイドの環境変数を取得
 */
function getClientEnv(): ClientEnv {
  // ビルド時はダミー値を返す
  if (isBuildTime()) {
    return {
      NEXT_PUBLIC_SUPABASE_URL: "https://placeholder.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "build-time-placeholder",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_placeholder",
    } as ClientEnv;
  }

  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  });

  if (!parsed.success) {
    console.error("❌ Invalid client environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid client environment variables");
  }

  return parsed.data;
}

/**
 * 環境判定ユーティリティ
 */
export const isDevelopment = process.env.NODE_ENV === "development";
export const isProduction = process.env.NODE_ENV === "production";
export const isTest = process.env.NODE_ENV === "test";

/**
 * エクスポート（遅延評価 - ビルド時のエラーを防ぐ）
 * 使用例:
 * - サーバー: import { env } from "@/lib/env"
 * - クライアント: import { clientEnv } from "@/lib/env"
 */

// 遅延評価用のキャッシュ
let _serverEnv: ServerEnv | null = null;
let _clientEnv: ClientEnv | null = null;

// サーバー環境変数を遅延取得（ランタイム時のみ評価）
export const env: ServerEnv = new Proxy({} as ServerEnv, {
  get(_target, prop: keyof ServerEnv) {
    if (typeof window !== "undefined") {
      throw new Error("env can only be accessed on the server side");
    }
    if (!_serverEnv) {
      _serverEnv = getServerEnv();
    }
    return _serverEnv[prop];
  },
});

// クライアント環境変数を遅延取得
export const clientEnv: ClientEnv = new Proxy({} as ClientEnv, {
  get(_target, prop: keyof ClientEnv) {
    if (!_clientEnv) {
      _clientEnv = getClientEnv();
    }
    return _clientEnv[prop];
  },
});
