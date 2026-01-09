import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Admin Client
 * サービスロールキーを使用した管理者権限のクライアント
 * ユーザー削除などの管理操作に使用
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Supabase URL and Service Role Key must be provided for admin operations"
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
