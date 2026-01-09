"use client";

import { useState } from "react";
import { X, Instagram, Loader2, CheckCircle } from "lucide-react";

interface IntegrationModalProps {
  platform: "instagram" | "x" | "wordpress";
  isConnected: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function IntegrationModal({
  platform,
  isConnected,
  onClose,
  onComplete,
}: IntegrationModalProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"initial" | "authenticating" | "success">(
    "initial"
  );

  const platformNames = {
    instagram: "Instagram",
    x: "X (Twitter)",
    wordpress: "WordPress",
  };

  const handleConnect = async () => {
    setLoading(true);
    setStep("authenticating");

    // ダミーのOAuth処理をシミュレート（2秒待機）
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      // 現在はInstagramのみ実装
      if (platform === "instagram") {
        const response = await fetch("/api/integrations/instagram", {
          method: "POST",
        });

        if (!response.ok) {
          throw new Error("Failed to connect");
        }

        setStep("success");
        setTimeout(() => {
          onComplete();
        }, 1500);
      } else {
        // 他のプラットフォームは未実装
        alert(`${platformNames[platform]}の連携は準備中です`);
        onClose();
      }
    } catch (error) {
      console.error("Integration error:", error);
      alert("連携に失敗しました");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm(`${platformNames[platform]}の連携を解除しますか?`)) {
      return;
    }

    setLoading(true);

    try {
      if (platform === "instagram") {
        const response = await fetch("/api/integrations/instagram", {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to disconnect");
        }

        onComplete();
      }
    } catch (error) {
      console.error("Disconnect error:", error);
      alert("連携解除に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">
            {platformNames[platform]}連携
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-md"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {step === "initial" && (
            <>
              {/* Platform Icon */}
              <div className="flex justify-center">
                {platform === "instagram" && (
                  <div className="w-16 h-16 bg-gradient-to-tr from-purple-600 via-pink-600 to-orange-600 rounded-2xl flex items-center justify-center">
                    <Instagram className="w-10 h-10 text-white" />
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  {isConnected
                    ? `${platformNames[platform]}は連携済みです`
                    : `${platformNames[platform]}アカウントを連携して、自動投稿を有効にしましょう`}
                </p>
                {platform === "instagram" && !isConnected && (
                  <p className="text-xs text-muted-foreground">
                    ※この画面はダミーのOAuth処理です。実際のInstagram
                    APIには接続していません。
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {!isConnected ? (
                  <button
                    onClick={handleConnect}
                    disabled={loading || platform !== "instagram"}
                    className="w-full py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {platform === "instagram"
                      ? "連携する"
                      : "準備中（未実装）"}
                  </button>
                ) : (
                  <button
                    onClick={handleDisconnect}
                    disabled={loading}
                    className="w-full py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50"
                  >
                    連携を解除
                  </button>
                )}
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="w-full py-2 bg-muted text-foreground rounded-md hover:bg-muted/80 disabled:opacity-50"
                >
                  キャンセル
                </button>
              </div>
            </>
          )}

          {step === "authenticating" && (
            <div className="text-center space-y-4 py-8">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">
                {platformNames[platform]}に接続しています...
              </p>
              <p className="text-xs text-muted-foreground">
                （ダミーOAuth処理を実行中）
              </p>
            </div>
          )}

          {step === "success" && (
            <div className="text-center space-y-4 py-8">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
              <p className="text-sm font-medium">連携が完了しました!</p>
              <p className="text-xs text-muted-foreground">
                これで{platformNames[platform]}への自動投稿が可能になります
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
