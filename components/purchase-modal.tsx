"use client";

import { useState } from "react";
import { X, Loader2, Check } from "lucide-react";

interface PurchaseModalProps {
  onClose: () => void;
}

const PLANS = [
  {
    id: "small",
    credits: 500,
    price: 500,
    name: "スモール",
    description: "画像生成50枚分",
  },
  {
    id: "medium",
    credits: 1000,
    price: 900,
    name: "ミディアム",
    description: "画像生成100枚分",
    badge: "10%お得",
  },
  {
    id: "large",
    credits: 5000,
    price: 4000,
    name: "ラージ",
    description: "画像生成500枚分",
    badge: "20%お得",
  },
];

export default function PurchaseModal({ onClose }: PurchaseModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handlePurchase = async (planId: string) => {
    setLoading(true);
    setSelectedPlan(planId);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: planId }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { url } = await response.json();

      // Stripeの決済ページへリダイレクト
      window.location.href = url;
    } catch (error) {
      console.error("Purchase error:", error);
      alert("決済ページの作成に失敗しました");
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-lg max-w-2xl w-full p-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Ma-Pointをチャージ</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-md transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* プラン選択 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {PLANS.map((plan) => (
            <button
              key={plan.id}
              onClick={() => handlePurchase(plan.id)}
              disabled={loading}
              className={`relative p-6 border-2 rounded-lg text-left transition-all hover:border-primary hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed ${
                selectedPlan === plan.id
                  ? "border-primary bg-primary/10"
                  : "border-border"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 right-4 px-2 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded">
                  {plan.badge}
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </div>

              <div className="mb-4">
                <div className="text-3xl font-bold">{plan.credits.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Ma-Point</div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xl font-bold">¥{plan.price.toLocaleString()}</div>
                {loading && selectedPlan === plan.id ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Check className="w-5 h-5 opacity-0" />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* 注意事項 */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>・決済はStripeで安全に処理されます</p>
          <p>・購入後、即座にMa-Pointが付与されます</p>
          <p>・Ma-Pointに有効期限はありません</p>
        </div>
      </div>
    </div>
  );
}
