import { NextResponse } from "next/server";
import {
  sendWelcomeEmail,
  sendPasswordResetEmail,
} from "@/lib/email/resend";
import { withErrorHandler, unauthorizedError } from "@/lib/api-error-handler";

/**
 * Supabase Auth Email Hook
 * 認証メールをカスタマイズして Resend 経由で送信
 *
 * Supabase Dashboard で以下を設定:
 * 1. Authentication > Email Templates
 * 2. Email Hooks で以下のエンドポイントを設定
 *    - Send Email Hook: https://your-domain.com/api/auth/email-hook
 * 3. Webhook Secret を環境変数に設定
 */

interface EmailHookRequest {
  user_id: string;
  email_data: {
    token?: string;
    token_hash?: string;
    redirect_to?: string;
    email_action_type: "signup" | "recovery" | "magic_link" | "email_change";
    site_url: string;
  };
  user: {
    id: string;
    email: string;
    aud: string;
    role: string;
  };
}

export const POST = withErrorHandler(async (request: Request) => {
  // Webhook 署名の検証（セキュリティ）
  const signature = request.headers.get("x-supabase-signature");
  const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;

  if (webhookSecret && signature !== webhookSecret) {
    unauthorizedError("Invalid webhook signature");
  }

  const body: EmailHookRequest = await request.json();
  const { email_data, user } = body;

  // メール送信結果
  let success = false;

  // メールアクションのタイプに応じて異なるメールを送信
  switch (email_data.email_action_type) {
    case "signup": {
      // サインアップ確認メール
      const confirmUrl = `${email_data.site_url}/auth/confirm?token=${email_data.token_hash}&type=signup&redirect_to=${email_data.redirect_to || "/"}`;

      success = await sendWelcomeEmail(user.email, confirmUrl);
      break;
    }

    case "recovery": {
      // パスワードリセットメール
      const resetUrl = `${email_data.site_url}/auth/confirm?token=${email_data.token_hash}&type=recovery&redirect_to=${email_data.redirect_to || "/"}`;

      success = await sendPasswordResetEmail(user.email, resetUrl);
      break;
    }

    case "magic_link": {
      // マジックリンクメール（実装省略）
      // 必要に応じて実装
      success = true;
      break;
    }

    case "email_change": {
      // メールアドレス変更確認メール（実装省略）
      // 必要に応じて実装
      success = true;
      break;
    }

    default:
      console.warn("Unknown email action type:", email_data.email_action_type);
      success = false;
  }

  if (!success) {
    console.error("Failed to send email:", {
      email: user.email,
      action: email_data.email_action_type,
    });
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
});
