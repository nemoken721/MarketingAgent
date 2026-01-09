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
 * サーバーサイドの環境変数を取得
 * ビルド時/ランタイム時に自動的にバリデーション
 */
function getServerEnv(): ServerEnv {
  // サーバーサイドでのみ実行されることを確認
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() can only be called on the server side");
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
 * エクスポート
 * 使用例:
 * - サーバー: import { env } from "@/lib/env"
 * - クライアント: import { clientEnv } from "@/lib/env"
 */
export const env = typeof window === "undefined" ? getServerEnv() : ({} as ServerEnv);
export const clientEnv = getClientEnv();
