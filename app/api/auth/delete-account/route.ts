import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function DELETE() {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  // ユーザー認証チェック
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "認証されていません" },
      { status: 401 }
    );
  }

  try {
    // トランザクション的に関連データを削除
    // 1. integrations テーブルからデータを削除
    const { error: integrationsError } = await supabase
      .from("integrations")
      .delete()
      .eq("user_id", user.id);

    if (integrationsError) {
      console.error("Failed to delete integrations:", integrationsError);
    }

    // 2. credit_ledger テーブルからデータを削除
    const { error: ledgerError } = await supabase
      .from("credit_ledger")
      .delete()
      .eq("user_id", user.id);

    if (ledgerError) {
      console.error("Failed to delete credit_ledger:", ledgerError);
    }

    // 3. credits テーブルからデータを削除
    const { error: creditsError } = await supabase
      .from("credits")
      .delete()
      .eq("user_id", user.id);

    if (creditsError) {
      console.error("Failed to delete credits:", creditsError);
    }

    // 4. users テーブルからデータを削除
    const { error: userError } = await supabase
      .from("users")
      .delete()
      .eq("id", user.id);

    if (userError) {
      console.error("Failed to delete user profile:", userError);
    }

    // 5. 認証ユーザーを削除（Supabase Auth - Admin権限が必要）
    const { error: deleteAuthError } =
      await adminClient.auth.admin.deleteUser(user.id);

    if (deleteAuthError) {
      console.error("Failed to delete auth user:", deleteAuthError);
      return NextResponse.json(
        { error: "アカウントの削除に失敗しました" },
        { status: 500 }
      );
    }

    // 6. セッションを終了
    await supabase.auth.signOut();

    return NextResponse.json({
      success: true,
      message: "アカウントが正常に削除されました",
    });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { error: "アカウントの削除中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
