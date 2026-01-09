import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

/**
 * API エラーハンドリングユーティリティ
 * セキュリティと堅牢性のため、エラーレスポンスを統一的に管理
 */

export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "APIError";
  }
}

/**
 * エラーレスポンスの型定義
 */
interface ErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * API エラーハンドラー
 * すべてのエラーを Sentry に送信し、適切なレスポンスを返す
 */
export function handleAPIError(error: unknown): NextResponse<ErrorResponse> {
  // APIError の場合
  if (error instanceof APIError) {
    // 4xx エラーは Sentry に送信しない（クライアントエラー）
    if (error.statusCode >= 500) {
      Sentry.captureException(error);
    }

    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  // 一般的な Error の場合
  if (error instanceof Error) {
    Sentry.captureException(error);

    // 本番環境では詳細なエラーメッセージを隠す（セキュリティ）
    const message =
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : error.message;

    return NextResponse.json(
      {
        error: message,
        ...(process.env.NODE_ENV === "development" && {
          details: error.stack,
        }),
      },
      { status: 500 }
    );
  }

  // 未知のエラー
  Sentry.captureException(error);

  return NextResponse.json(
    {
      error: "Unknown error occurred",
    },
    { status: 500 }
  );
}

/**
 * API ルートのラッパー
 * エラーを自動的にキャッチして処理
 */
export function withErrorHandler<T>(
  handler: (request: Request) => Promise<T>
) {
  return async (request: Request): Promise<T | NextResponse<ErrorResponse>> => {
    try {
      return await handler(request);
    } catch (error) {
      return handleAPIError(error);
    }
  };
}

/**
 * Supabase エラーのハンドリング
 */
export function handleSupabaseError(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new APIError(500, String(error.message), "SUPABASE_ERROR");
  }
  throw new APIError(500, "Database error occurred", "DATABASE_ERROR");
}

/**
 * Stripe エラーのハンドリング
 */
export function handleStripeError(error: unknown): never {
  if (error && typeof error === "object" && "type" in error) {
    const stripeError = error as { type: string; message: string };

    // カード関連のエラー（クライアントエラー）
    if (stripeError.type === "card_error") {
      throw new APIError(400, stripeError.message, "CARD_ERROR");
    }

    // レート制限エラー
    if (stripeError.type === "rate_limit_error") {
      throw new APIError(429, "Too many requests", "RATE_LIMIT_ERROR");
    }

    // その他の Stripe エラー
    throw new APIError(500, stripeError.message, "STRIPE_ERROR");
  }

  throw new APIError(500, "Payment processing error", "PAYMENT_ERROR");
}

/**
 * 認証エラー
 */
export function unauthorizedError(message = "Unauthorized"): never {
  throw new APIError(401, message, "UNAUTHORIZED");
}

/**
 * 認可エラー
 */
export function forbiddenError(message = "Forbidden"): never {
  throw new APIError(403, message, "FORBIDDEN");
}

/**
 * リソース not found エラー
 */
export function notFoundError(resource = "Resource"): never {
  throw new APIError(404, `${resource} not found`, "NOT_FOUND");
}

/**
 * バリデーションエラー
 */
export function validationError(message: string, details?: unknown): never {
  const error = new APIError(400, message, "VALIDATION_ERROR");
  if (details) {
    Sentry.captureException(error, { extra: { details } });
  }
  throw error;
}
