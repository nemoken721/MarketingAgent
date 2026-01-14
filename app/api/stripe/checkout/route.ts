import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

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

// ポイントプラン定義
const CREDIT_PLANS = {
  small: {
    credits: 500,
    price: 500, // 500円
    name: "500 Ma-Point",
  },
  medium: {
    credits: 1000,
    price: 900, // 900円 (10%お得)
    name: "1,000 Ma-Point",
  },
  large: {
    credits: 5000,
    price: 4000, // 4000円 (20%お得)
    name: "5,000 Ma-Point",
  },
};

export async function POST(request: Request) {
  const supabase = await createClient();

  // ユーザー認証確認
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { plan } = body;

    // プラン検証
    if (!plan || !(plan in CREDIT_PLANS)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const selectedPlan =
      CREDIT_PLANS[plan as keyof typeof CREDIT_PLANS];

    // Stripe Checkoutセッションを作成
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: {
              name: selectedPlan.name,
              description: `${selectedPlan.credits} Ma-Pointをチャージ`,
            },
            unit_amount: selectedPlan.price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${request.headers.get("origin")}/?success=true`,
      cancel_url: `${request.headers.get("origin")}/?canceled=true`,
      metadata: {
        user_id: user.id,
        credits: selectedPlan.credits.toString(),
        plan: plan,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
