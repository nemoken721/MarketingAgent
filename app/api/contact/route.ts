import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message } = await request.json();

    // バリデーション
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "すべてのフィールドを入力してください" },
        { status: 400 }
      );
    }

    // メールアドレスの検証
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "有効なメールアドレスを入力してください" },
        { status: 400 }
      );
    }

    // 管理者へのメール送信
    const adminEmail = process.env.ADMIN_EMAIL || "support@marty.example.com";

    const { data, error } = await resend.emails.send({
      from: "Marty Contact Form <noreply@marty.example.com>",
      to: adminEmail,
      replyTo: email,
      subject: `【お問い合わせ】${subject}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">
            新しいお問い合わせ
          </h2>

          <div style="margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>お名前:</strong> ${name}</p>
            <p style="margin: 10px 0;"><strong>メールアドレス:</strong> ${email}</p>
            <p style="margin: 10px 0;"><strong>件名:</strong> ${subject}</p>
          </div>

          <div style="margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>お問い合わせ内容:</strong></p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap;">
              ${message}
            </div>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #666; font-size: 12px;">
            <p>このメールはMartyのお問い合わせフォームから送信されました。</p>
            <p>返信する場合は、上記のメールアドレス（${email}）に直接ご返信ください。</p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: "メールの送信に失敗しました" },
        { status: 500 }
      );
    }

    // ユーザーへの自動返信メール（オプション）
    try {
      await resend.emails.send({
        from: "Marty Support <noreply@marty.example.com>",
        to: email,
        subject: "お問い合わせを受け付けました - Marty",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">お問い合わせありがとうございます</h2>

            <p>${name} 様</p>

            <p>この度は、Martyへお問い合わせいただき、誠にありがとうございます。</p>
            <p>以下の内容でお問い合わせを受け付けました。</p>

            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>件名:</strong> ${subject}</p>
              <p style="margin: 5px 0;"><strong>お問い合わせ内容:</strong></p>
              <div style="white-space: pre-wrap; margin-top: 10px;">
                ${message}
              </div>
            </div>

            <p>担当者が内容を確認の上、2営業日以内にご返信いたします。</p>
            <p>今しばらくお待ちくださいませ。</p>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #666; font-size: 12px;">
              <p><strong>Marty サポートチーム</strong></p>
              <p>営業時間: 平日 10:00〜18:00（土日祝日を除く）</p>
              <p>このメールは自動送信されています。返信の必要はございません。</p>
            </div>
          </div>
        `,
      });
    } catch (autoReplyError) {
      console.error("Auto-reply email error:", autoReplyError);
      // 自動返信の失敗はエラーとしない
    }

    return NextResponse.json({
      success: true,
      message: "お問い合わせを受け付けました",
    });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "送信中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
