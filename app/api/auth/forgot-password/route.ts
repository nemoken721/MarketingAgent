import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "メールアドレスを入力してください" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // パスワードリセットメールを送信
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/reset-password`,
    });

    if (error) {
      console.error("Password reset error:", error);
      // セキュリティのため、メールアドレスが存在しない場合でも成功レスポンスを返す
      // これにより、攻撃者がメールアドレスの存在を確認できないようにする
    }

    // 常に成功レスポンスを返す（セキュリティ上の理由）
    return NextResponse.json({
      success: true,
      message: "パスワードリセット用のメールを送信しました",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "エラーが発生しました" },
      { status: 500 }
    );
  }
}
