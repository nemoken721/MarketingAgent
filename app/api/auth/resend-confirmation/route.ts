import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/email/resend";
import { withErrorHandler, unauthorizedError } from "@/lib/api-error-handler";

/**
 * メール確認リンクの再送信 API
 */
export const POST = withErrorHandler(async (request: Request) => {
  const supabase = await createClient();

  // ユーザー認証確認
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    unauthorizedError("User not authenticated");
  }

  try {
    // 新しい確認トークンを生成
    const { data, error } = await supabase.auth.resend({
      type: "signup",
      email: user.email!,
    });

    if (error) {
      console.error("Failed to resend confirmation email:", error);
      return NextResponse.json(
        { error: "Failed to resend confirmation email" },
        { status: 500 }
      );
    }

    // または、Resend 経由で直接送信（Supabase Email Hook を使用している場合）
    // const confirmUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?token=${data.token_hash}&type=signup`;
    // await sendWelcomeEmail(user.email!, confirmUrl);

    console.log(`✅ Confirmation email resent to: ${user.email}`);

    return NextResponse.json({
      success: true,
      message: "Confirmation email resent successfully",
    });
  } catch (error) {
    console.error("Unexpected error in resend confirmation:", error);
    return NextResponse.json(
      { error: "Failed to resend confirmation email" },
      { status: 500 }
    );
  }
});
