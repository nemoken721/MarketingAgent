import { createClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

/**
 * クレジットシステムのヘルパー関数
 * Phase 5: データベース関数を使用した排他制御付きトランザクション処理
 */

// ポイントレート定義（constants.ts と統一）
export const CREDIT_COSTS = {
  TEXT_GENERATION: 0, // テキスト生成は無料
  IMAGE_GENERATION: 10, // 画像生成: 10pt/枚
  VIDEO_GENERATION: 200, // 動画生成: 200pt/本
  DEEP_RESEARCH: 50, // 高度分析: 50pt/回
} as const;

/**
 * ユーザーが管理者かどうかをチェック
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  console.log(`🔍 Checking admin status for user: ${userId}`);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", userId)
    .single();

  console.log(`🔍 Admin check result:`, { data, error: error?.message });

  if (error) {
    console.error("Failed to check admin status:", error);
    return false;
  }

  const isAdmin = data?.is_admin === true;
  console.log(`🔍 User ${userId} is admin: ${isAdmin}`);
  return isAdmin;
}

/**
 * ユーザーの現在のクレジット残高を取得
 */
export async function getCreditBalance(
  userId: string
): Promise<number | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("credits")
    .select("balance")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Failed to fetch credit balance:", error);
    return null;
  }

  return data?.balance ?? 0;
}

/**
 * ポイントが十分にあるかチェック
 * 管理者の場合は常にtrue（無制限）を返す
 */
export async function checkCreditSufficient(
  userId: string,
  requiredAmount: number
): Promise<{ sufficient: boolean; balance: number; isAdmin?: boolean }> {
  // 管理者チェック - 管理者は無制限
  const admin = await isUserAdmin(userId);
  if (admin) {
    console.log(`✅ Admin user detected (${userId}): Credit check bypassed`);
    return { sufficient: true, balance: 999999, isAdmin: true };
  }

  const balance = await getCreditBalance(userId);

  if (balance === null) {
    return { sufficient: false, balance: 0 };
  }

  return {
    sufficient: balance >= requiredAmount,
    balance,
  };
}

/**
 * クレジットを消費する（Phase 5: データベース関数使用）
 * データベース側でトランザクション処理と排他制御を実行
 * 管理者の場合はクレジット消費をスキップ
 * @param userId ユーザーID
 * @param amount 消費するポイント数
 * @param description 消費理由の説明
 * @param referenceId 参照ID（投稿IDなど、オプション）
 * @returns 成功時は新しい残高、失敗時はnull
 */
export async function deductCredit(
  userId: string,
  amount: number,
  description: string,
  referenceId?: string
): Promise<number | null> {
  try {
    // 管理者チェック - 管理者はクレジット消費をスキップ
    const admin = await isUserAdmin(userId);
    if (admin) {
      console.log(`✅ Admin user (${userId}): Credit deduction skipped for "${description}"`);
      return 999999; // 仮想的な残高を返す
    }

    const supabase = await createClient();

    // データベース関数を呼び出し（排他制御付き）
    const { data, error } = await supabase.rpc("consume_credits", {
      p_user_id: userId,
      p_amount: amount,
      p_description: description,
      p_reference_id: referenceId || null,
    });

    if (error) {
      console.error("Failed to deduct credit:", error);
      Sentry.captureException(error, {
        extra: { userId, amount, description },
      });
      return null;
    }

    if (!data || !data.success) {
      console.error("Credit deduction failed:", data);
      return null;
    }

    console.log(
      `✅ Credit deducted: ${amount} pts from user ${userId}. New balance: ${data.new_balance}`
    );

    return data.new_balance;
  } catch (error) {
    console.error("Unexpected error in deductCredit:", error);
    Sentry.captureException(error);
    return null;
  }
}

/**
 * クレジットを追加する（Phase 5: データベース関数使用）
 * データベース側でトランザクション処理と排他制御を実行
 * @param userId ユーザーID
 * @param amount 追加するポイント数
 * @param type トランザクションタイプ
 * @param description 追加理由の説明
 * @param referenceId 参照ID（Stripe決済IDなど、オプション）
 * @returns 成功時は新しい残高、失敗時はnull
 */
export async function addCredit(
  userId: string,
  amount: number,
  type: "purchase" | "bonus" | "monthly_grant" | "refund",
  description: string,
  referenceId?: string
): Promise<number | null> {
  try {
    const supabase = await createClient();

    // データベース関数を呼び出し（排他制御付き）
    const { data, error } = await supabase.rpc("grant_credits", {
      p_user_id: userId,
      p_amount: amount,
      p_transaction_type: type,
      p_description: description,
      p_reference_id: referenceId || null,
    });

    if (error) {
      console.error("Failed to add credit:", error);
      Sentry.captureException(error, {
        extra: { userId, amount, type, description },
      });
      return null;
    }

    if (!data || !data.success) {
      console.error("Credit addition failed:", data);
      return null;
    }

    console.log(
      `✅ Credit granted: ${amount} pts to user ${userId}. New balance: ${data.new_balance}`
    );

    return data.new_balance;
  } catch (error) {
    console.error("Unexpected error in addCredit:", error);
    Sentry.captureException(error);
    return null;
  }
}
