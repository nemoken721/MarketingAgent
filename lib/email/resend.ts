import { Resend } from "resend";
import { env } from "@/lib/env";

/**
 * Resend クライアント
 * トランザクションメール送信サービス
 */

const resend = new Resend(env.RESEND_API_KEY);

/**
 * メール送信の基本パラメータ
 */
interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/**
 * メール送信ヘルパー関数
 * エラーハンドリングとロギングを統一
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  try {
    const fromEmail = env.RESEND_FROM_EMAIL || "noreply@marty.example.com";

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
    });

    if (error) {
      console.error("❌ Resend email error:", error);
      return false;
    }

    console.log("✅ Email sent successfully:", data?.id);
    return true;
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    return false;
  }
}

/**
 * ウェルカムメール送信
 */
export async function sendWelcomeEmail(
  email: string,
  confirmUrl: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html lang="ja">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Marty へようこそ</title>
      </head>
      <body style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Marty</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">AIマーケティングアシスタント</p>
        </div>

        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin-top: 0;">アカウント登録ありがとうございます</h2>

          <p>Marty へのご登録ありがとうございます。</p>

          <p>以下のボタンをクリックして、メールアドレスを確認してください。</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmUrl}"
               style="display: inline-block; background: #667eea; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              メールアドレスを確認
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px;">
            ボタンが機能しない場合は、以下のURLをブラウザにコピー&ペーストしてください:<br>
            <a href="${confirmUrl}" style="color: #667eea; word-break: break-all;">${confirmUrl}</a>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            このメールに心当たりがない場合は、無視してください。
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
Marty へようこそ

アカウント登録ありがとうございます。

以下のリンクをクリックして、メールアドレスを確認してください:
${confirmUrl}

このメールに心当たりがない場合は、無視してください。

---
Marty - AIマーケティングアシスタント
  `;

  return sendEmail({
    to: email,
    subject: "Marty へようこそ - メールアドレスの確認",
    html,
    text,
  });
}

/**
 * パスワードリセットメール送信
 */
export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html lang="ja">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>パスワードリセット</title>
      </head>
      <body style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Marty</h1>
        </div>

        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin-top: 0;">パスワードリセットのリクエスト</h2>

          <p>パスワードリセットのリクエストを受け付けました。</p>

          <p>以下のボタンをクリックして、新しいパスワードを設定してください。</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}"
               style="display: inline-block; background: #667eea; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              パスワードをリセット
            </a>
          </div>

          <p style="color: #ef4444; font-size: 14px; background: #fef2f2; padding: 12px; border-left: 4px solid #ef4444; border-radius: 4px;">
            <strong>重要:</strong> このリンクは1時間で無効になります。
          </p>

          <p style="color: #6b7280; font-size: 14px;">
            ボタンが機能しない場合は、以下のURLをブラウザにコピー&ペーストしてください:<br>
            <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            このリクエストに心当たりがない場合は、このメールを無視してください。<br>
            パスワードは変更されません。
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
パスワードリセットのリクエスト

パスワードリセットのリクエストを受け付けました。

以下のリンクをクリックして、新しいパスワードを設定してください:
${resetUrl}

重要: このリンクは1時間で無効になります。

このリクエストに心当たりがない場合は、このメールを無視してください。

---
Marty - AIマーケティングアシスタント
  `;

  return sendEmail({
    to: email,
    subject: "Marty - パスワードリセットのリクエスト",
    html,
    text,
  });
}

/**
 * ポイント購入完了メール送信
 */
export async function sendCreditPurchaseEmail(
  email: string,
  credits: number,
  amount: number
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html lang="ja">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ポイント購入完了</title>
      </head>
      <body style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Marty</h1>
        </div>

        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin-top: 0;">ポイント購入完了</h2>

          <p>Ma-Point の購入が完了しました。ありがとうございます。</p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">購入ポイント</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold; font-size: 18px; color: #667eea;">${credits.toLocaleString()} pt</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">お支払い金額</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold; font-size: 18px;">¥${amount.toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <p style="color: #059669; background: #d1fae5; padding: 12px; border-left: 4px solid #059669; border-radius: 4px;">
            ポイントはすぐにご利用いただけます。
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://marty.example.com"}"
               style="display: inline-block; background: #667eea; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Marty を開く
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            ご不明な点がございましたら、サポートまでお問い合わせください。
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
ポイント購入完了

Ma-Point の購入が完了しました。ありがとうございます。

購入ポイント: ${credits.toLocaleString()} pt
お支払い金額: ¥${amount.toLocaleString()}

ポイントはすぐにご利用いただけます。

---
Marty - AIマーケティングアシスタント
  `;

  return sendEmail({
    to: email,
    subject: "Marty - ポイント購入完了",
    html,
    text,
  });
}

export { resend };
