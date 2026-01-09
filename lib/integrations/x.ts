import { createClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

/**
 * X (Twitter) API レートリミット管理
 *
 * X API には厳格なレートリミットがあるため、
 * リクエスト数を追跡し、制限を超えないように管理
 *
 * @see https://developer.twitter.com/en/docs/twitter-api/rate-limits
 */

interface RateLimitInfo {
  limit: number; // リクエスト制限数
  remaining: number; // 残りリクエスト数
  reset: number; // リセット時刻（Unix timestamp）
}

interface XAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  rateLimitInfo?: RateLimitInfo;
}

/**
 * レートリミット情報をレスポンスヘッダーから抽出
 */
function extractRateLimitInfo(headers: Headers): RateLimitInfo | null {
  const limit = headers.get("x-rate-limit-limit");
  const remaining = headers.get("x-rate-limit-remaining");
  const reset = headers.get("x-rate-limit-reset");

  if (!limit || !remaining || !reset) {
    return null;
  }

  return {
    limit: parseInt(limit),
    remaining: parseInt(remaining),
    reset: parseInt(reset),
  };
}

/**
 * レートリミットエラーかチェック
 */
function isRateLimitError(status: number): boolean {
  return status === 429; // Too Many Requests
}

/**
 * 次のリクエストまでの待機時間を計算（ミリ秒）
 */
function calculateBackoffTime(resetTimestamp: number): number {
  const now = Date.now() / 1000; // 秒単位
  const waitSeconds = Math.max(0, resetTimestamp - now);
  return Math.ceil(waitSeconds * 1000); // ミリ秒に変換
}

/**
 * Exponential Backoff でリトライ
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt); // Exponential Backoff
        console.log(`⏳ Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * X API リクエストを実行（レートリミット対応）
 */
export async function makeXAPIRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  userId?: string
): Promise<XAPIResponse<T>> {
  const bearerToken = process.env.X_BEARER_TOKEN;

  if (!bearerToken) {
    const error = "X API credentials not configured";
    console.error(error);
    Sentry.captureException(new Error(error), {
      tags: { integration: "x", error_type: "config" },
    });
    return { success: false, error };
  }

  try {
    const url = `https://api.twitter.com/2${endpoint}`;

    const response = await withRetry(async () => {
      const res = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      // レートリミット情報を取得
      const rateLimitInfo = extractRateLimitInfo(res.headers);

      // レートリミットエラーの場合
      if (isRateLimitError(res.status)) {
        const waitTime = rateLimitInfo?.reset
          ? calculateBackoffTime(rateLimitInfo.reset)
          : 60000; // デフォルト: 60秒

        console.warn(
          `⚠️  X API rate limit exceeded. Waiting ${waitTime}ms...`
        );

        // データベースに記録
        if (userId) {
          await logRateLimitExceeded(userId, endpoint, rateLimitInfo);
        }

        // 待機してからリトライ
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        throw new Error("Rate limit exceeded, retrying...");
      }

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`X API error: ${res.status} - ${errorText}`);
      }

      return { response: res, rateLimitInfo };
    });

    const data = await response.response.json();

    // レートリミット情報をログ
    if (response.rateLimitInfo) {
      console.log(
        `📊 X API rate limit: ${response.rateLimitInfo.remaining}/${response.rateLimitInfo.limit} remaining`
      );

      // 残りが少ない場合は警告
      if (response.rateLimitInfo.remaining < 10) {
        Sentry.captureMessage("X API rate limit running low", {
          level: "warning",
          extra: {
            endpoint,
            rateLimitInfo: response.rateLimitInfo,
            user_id: userId,
          },
        });
      }
    }

    return {
      success: true,
      data,
      rateLimitInfo: response.rateLimitInfo || undefined,
    };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Failed to call X API";
    console.error("X API request failed:", error);

    Sentry.captureException(error, {
      tags: { integration: "x", error_type: "api_request" },
      extra: { endpoint, user_id: userId },
    });

    return { success: false, error: errorMsg };
  }
}

/**
 * レートリミット超過をデータベースに記録
 */
async function logRateLimitExceeded(
  userId: string,
  endpoint: string,
  rateLimitInfo: RateLimitInfo | null
): Promise<void> {
  try {
    const supabase = await createClient();

    await supabase.from("webhook_logs").insert({
      source: "x",
      event_type: "rate_limit_exceeded",
      status: "failed",
      error_message: `Rate limit exceeded for endpoint: ${endpoint}`,
      metadata: {
        user_id: userId,
        endpoint,
        rate_limit_info: rateLimitInfo,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Failed to log rate limit exceeded:", error);
    // ログ失敗は処理に影響させない
  }
}

/**
 * ツイートを投稿（レートリミット対応）
 */
export async function postTweet(
  userId: string,
  text: string
): Promise<XAPIResponse<{ id: string; text: string }>> {
  return makeXAPIRequest(
    "/tweets",
    {
      method: "POST",
      body: JSON.stringify({ text }),
    },
    userId
  );
}

/**
 * ユーザー情報を取得（レートリミット対応）
 */
export async function getXUserInfo(
  userId: string
): Promise<XAPIResponse<{ id: string; username: string; name: string }>> {
  return makeXAPIRequest("/users/me", { method: "GET" }, userId);
}

/**
 * レートリミット状態を確認
 */
export async function checkRateLimitStatus(): Promise<{
  available: boolean;
  message: string;
  rateLimitInfo?: RateLimitInfo;
}> {
  const result = await makeXAPIRequest("/users/me", { method: "GET" });

  if (!result.success) {
    return {
      available: false,
      message: result.error || "Failed to check rate limit status",
    };
  }

  if (result.rateLimitInfo && result.rateLimitInfo.remaining === 0) {
    const resetDate = new Date(result.rateLimitInfo.reset * 1000);
    return {
      available: false,
      message: `Rate limit exceeded. Resets at ${resetDate.toISOString()}`,
      rateLimitInfo: result.rateLimitInfo,
    };
  }

  return {
    available: true,
    message: "Rate limit OK",
    rateLimitInfo: result.rateLimitInfo,
  };
}
