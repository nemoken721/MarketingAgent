import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withErrorHandler } from "@/lib/api-error-handler";

/**
 * メール確認 API
 * Supabase Auth のトークンを検証してメールアドレスを確認
 */
export const POST = withErrorHandler(async (request: Request) => {
  const supabase = await createClient();
  const { token, type } = await request.json();

  if (!token || !type) {
    return NextResponse.json(
      { error: "Token and type are required" },
      { status: 400 }
    );
  }

  try {
    // Supabase Auth のトークンを検証
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type as "signup" | "recovery" | "email",
    });

    if (error) {
      console.error("Email confirmation error:", error);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    // ユーザーが認証された場合、users テーブルの email_confirmed を更新
    if (data.user) {
      const { error: updateError } = await supabase
        .from("users")
        .update({ email_confirmed: true })
        .eq("id", data.user.id);

      if (updateError) {
        console.error("Failed to update email_confirmed:", updateError);
      }

      console.log(`✅ Email confirmed for user: ${data.user.id}`);
    }

    return NextResponse.json({
      success: true,
      message: "Email confirmed successfully",
    });
  } catch (error) {
    console.error("Unexpected error in email confirmation:", error);
    return NextResponse.json(
      { error: "Failed to confirm email" },
      { status: 500 }
    );
  }
});
