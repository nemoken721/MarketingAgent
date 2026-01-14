import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { addCredit } from "@/lib/credits";
import { sendCreditPurchaseEmail } from "@/lib/email/resend";
import * as Sentry from "@sentry/nextjs";

// 遅延初期化（ビルド時にエラーを防ぐ）
function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(secretKey, {
    apiVersion: "2025-02-24.acacia",
  });
}

/**
 * Webhook ログを記録
 */
async function logWebhook(
  source: string,
  eventType: string,
  status: "success" | "failed" | "skipped",
  errorMessage?: string,
  metadata?: Record<string, any>
) {
  try {
    const supabase = await createClient();
    await supabase.from("webhook_logs").insert({
      source,
      event_type: eventType,
      status,
      error_message: errorMessage || null,
      metadata: metadata || {},
    });
  } catch (error) {
    console.error("Failed to log webhook:", error);
    // ログ失敗はWebhook処理自体には影響させない
  }
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    await logWebhook("stripe", "unknown", "failed", "No signature provided");
    return NextResponse.json(
      { error: "No signature provided" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    // Webhook署名を検証（環境変数の存在確認を強化）
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      const error = new Error("STRIPE_WEBHOOK_SECRET is not configured");
      Sentry.captureException(error, { level: "fatal" });
      throw error;
    }

    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    Sentry.captureException(err, {
      tags: { webhook: "stripe", error_type: "signature_verification" },
    });
    await logWebhook(
      "stripe",
      "unknown",
      "failed",
      "Signature verification failed"
    );
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  // ============================================================================
  // Idempotency チェック（重複処理防止）
  // ============================================================================
  const supabase = await createClient();

  const { data: existingEvent } = await supabase
    .from("stripe_events")
    .select("id")
    .eq("id", event.id)
    .single();

  if (existingEvent) {
    console.log(`⏭️  Skipping already processed event: ${event.id}`);
    await logWebhook("stripe", event.type, "skipped", "Event already processed", {
      event_id: event.id,
    });
    return NextResponse.json({ received: true, status: "already_processed" });
  }

  // ============================================================================
  // checkout.session.completed イベントを処理
  // ============================================================================
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // メタデータからユーザーIDとクレジット数を取得
    const userId = session.metadata?.user_id;
    const credits = session.metadata?.credits;
    const plan = session.metadata?.plan;

    if (!userId || !credits) {
      const errorMsg = "Missing metadata in checkout session";
      console.error(errorMsg, { session_id: session.id });
      Sentry.captureException(new Error(errorMsg), {
        tags: { webhook: "stripe", event_type: event.type },
        extra: { session_id: session.id, metadata: session.metadata },
      });
      await logWebhook("stripe", event.type, "failed", errorMsg, {
        session_id: session.id,
      });
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    try {
      // クレジットを追加（grant_credits関数を使用）
      const newBalance = await addCredit(
        userId,
        parseInt(credits),
        "purchase",
        `Stripeでポイント購入 (${plan}プラン)`,
        session.payment_intent as string // 参照IDとしてPayment Intentを記録
      );

      if (newBalance === null) {
        throw new Error("Failed to add credits");
      }

      console.log(
        `✅ Credits added: ${credits} pts to user ${userId}. New balance: ${newBalance}`
      );

      // ユーザーのメールアドレスを取得して確認メールを送信
      const { data: userData } = await supabase
        .from("users")
        .select("email")
        .eq("id", userId)
        .single();

      if (userData?.email) {
        const amount = session.amount_total ? session.amount_total / 100 : 0;

        // 購入完了メールを送信（エラーがあってもWebhookは成功とする）
        await sendCreditPurchaseEmail(
          userData.email,
          parseInt(credits),
          amount
        ).catch((error) => {
          console.error("Failed to send purchase confirmation email:", error);
          Sentry.captureException(error, {
            tags: { email: "purchase_confirmation" },
            extra: { user_id: userId, credits, amount },
          });
        });
      }

      // ============================================================================
      // Stripe イベントを記録（重複処理防止）
      // ============================================================================
      await supabase.from("stripe_events").insert({
        id: event.id,
        type: event.type,
        payload: event.data.object as any,
      });

      // Webhook ログを記録
      await logWebhook("stripe", event.type, "success", undefined, {
        user_id: userId,
        credits: parseInt(credits),
        new_balance: newBalance,
        session_id: session.id,
      });

      return NextResponse.json({ received: true, newBalance });
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to add credits";
      console.error("Failed to process checkout.session.completed:", error);

      Sentry.captureException(error, {
        tags: { webhook: "stripe", event_type: event.type },
        extra: {
          user_id: userId,
          credits,
          session_id: session.id,
        },
      });

      await logWebhook("stripe", event.type, "failed", errorMsg, {
        user_id: userId,
        credits,
        session_id: session.id,
      });

      return NextResponse.json(
        { error: "Failed to add credits" },
        { status: 500 }
      );
    }
  }

  // ============================================================================
  // 他のイベントタイプは記録して無視
  // ============================================================================
  console.log(`ℹ️  Received unsupported event type: ${event.type}`);
  await logWebhook("stripe", event.type, "skipped", "Unsupported event type");

  return NextResponse.json({ received: true, status: "ignored" });
}
