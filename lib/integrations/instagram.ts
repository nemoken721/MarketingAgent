import { createClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

/**
 * Instagram Graph API トークンリフレッシュ
 *
 * Long-lived tokens は60日で期限切れになるため、
 * 定期的にリフレッシュが必要
 *
 * @see https://developers.facebook.com/docs/instagram-basic-display-api/guides/long-lived-access-tokens
 */

interface InstagramTokenRefreshResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // 秒単位（通常は5184000秒 = 60日）
}

interface RefreshResult {
  success: boolean;
  newExpiresAt?: Date;
  error?: string;
}

/**
 * Instagram Long-Lived トークンをリフレッシュ
 *
 * @param accessToken - 現在のアクセストークン
 * @returns リフレッシュ結果
 */
export async function refreshInstagramToken(
  accessToken: string
): Promise<RefreshResult> {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;

  if (!appId || !appSecret) {
    const error = "Instagram API credentials not configured";
    console.error(error);
    Sentry.captureException(new Error(error), {
      tags: { integration: "instagram", error_type: "config" },
    });
    return { success: false, error };
  }

  try {
    // Instagram Graph API でトークンをリフレッシュ
    const url = new URL("https://graph.instagram.com/refresh_access_token");
    url.searchParams.append("grant_type", "ig_refresh_token");
    url.searchParams.append("access_token", accessToken);

    const response = await fetch(url.toString(), {
      method: "GET",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Instagram API error: ${response.status} - ${errorText}`
      );
    }

    const data: InstagramTokenRefreshResponse = await response.json();

    // 新しい有効期限を計算（expires_in は秒単位）
    const newExpiresAt = new Date(Date.now() + data.expires_in * 1000);

    console.log(
      `✅ Instagram token refreshed. New expiry: ${newExpiresAt.toISOString()}`
    );

    return {
      success: true,
      newExpiresAt,
    };
  } catch (error) {
    const errorMsg =
      error instanceof Error
        ? error.message
        : "Failed to refresh Instagram token";
    console.error("Instagram token refresh failed:", error);

    Sentry.captureException(error, {
      tags: { integration: "instagram", error_type: "token_refresh" },
    });

    return { success: false, error: errorMsg };
  }
}

/**
 * データベース内のすべての Instagram 連携のトークンをリフレッシュ
 *
 * Cron Job から呼び出される想定
 *
 * @returns リフレッシュされたトークン数
 */
export async function refreshAllInstagramTokens(): Promise<{
  refreshed: number;
  failed: number;
  errors: Array<{ userId: string; error: string }>;
}> {
  const supabase = await createClient();

  // 有効期限が30日以内の連携を取得（余裕を持ってリフレッシュ）
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const { data: integrations, error: fetchError } = await supabase
    .from("integrations")
    .select("id, user_id, access_token, token_expires_at, is_valid")
    .eq("platform", "instagram")
    .eq("is_valid", true)
    .lt("token_expires_at", thirtyDaysFromNow.toISOString());

  if (fetchError) {
    console.error("Failed to fetch Instagram integrations:", fetchError);
    Sentry.captureException(fetchError, {
      tags: { integration: "instagram", error_type: "fetch" },
    });
    return { refreshed: 0, failed: 0, errors: [] };
  }

  if (!integrations || integrations.length === 0) {
    console.log("ℹ️  No Instagram tokens need refreshing");
    return { refreshed: 0, failed: 0, errors: [] };
  }

  console.log(
    `🔄 Refreshing ${integrations.length} Instagram token(s)...`
  );

  let refreshed = 0;
  let failed = 0;
  const errors: Array<{ userId: string; error: string }> = [];

  for (const integration of integrations) {
    try {
      const result = await refreshInstagramToken(integration.access_token);

      if (result.success && result.newExpiresAt) {
        // データベースを更新
        const { error: updateError } = await supabase
          .from("integrations")
          .update({
            token_expires_at: result.newExpiresAt.toISOString(),
            last_error: null,
          })
          .eq("id", integration.id);

        if (updateError) {
          throw updateError;
        }

        refreshed++;
        console.log(
          `✅ Refreshed token for user ${integration.user_id}`
        );
      } else {
        throw new Error(result.error || "Unknown error");
      }
    } catch (error) {
      failed++;
      const errorMsg =
        error instanceof Error ? error.message : "Unknown error";
      errors.push({ userId: integration.user_id, error: errorMsg });

      console.error(
        `❌ Failed to refresh token for user ${integration.user_id}:`,
        error
      );

      // 連携を無効化してエラーを記録
      const { error: updateError } = await supabase
        .from("integrations")
        .update({
          is_valid: false,
          last_error: errorMsg,
        })
        .eq("id", integration.id);

      if (updateError) {
        console.error("Failed to update integration status:", updateError);
      }

      Sentry.captureException(error, {
        tags: { integration: "instagram", error_type: "token_refresh" },
        extra: { user_id: integration.user_id },
      });
    }
  }

  console.log(
    `📊 Token refresh complete: ${refreshed} succeeded, ${failed} failed`
  );

  return { refreshed, failed, errors };
}

/**
 * トークンの有効期限をチェック
 *
 * @param expiresAt - 有効期限
 * @returns 有効期限切れかどうか
 */
export function isTokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return true;

  const expiryDate = new Date(expiresAt);
  const now = new Date();

  // 7日以内に期限切れの場合も true を返す（事前にリフレッシュ）
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  return expiryDate <= sevenDaysFromNow;
}
