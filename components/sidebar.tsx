"use client";

import { Circle, LogOut, Settings, BarChart3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import IntegrationModal from "./integrations/integration-modal";
import PurchaseModal from "./purchase-modal";

interface UserData {
  email?: string;
  credits?: number;
}

interface IntegrationStatus {
  instagram: boolean;
  x: boolean;
  wordpress: boolean;
}

export default function Sidebar() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationStatus>({
    instagram: false,
    x: false,
    wordpress: false,
  });
  const [loading, setLoading] = useState(true);
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<
    "instagram" | "x" | "wordpress" | null
  >(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchIntegrations();

    // クレジット更新イベントをリッスン
    const handleCreditUpdate = () => {
      console.log("✅ creditUpdated イベント受信 → fetchUser実行");
      fetchUser();
    };

    window.addEventListener("creditUpdated", handleCreditUpdate);
    console.log("📡 creditUpdated イベントリスナー登録完了");

    // クレジット残高を3秒ごとに自動更新（念のため）
    const interval = setInterval(() => {
      fetchUser();
    }, 3000);

    return () => {
      window.removeEventListener("creditUpdated", handleCreditUpdate);
      clearInterval(interval);
    };
  }, []);

  const fetchUser = async () => {
    try {
      console.log("🔄 fetchUser実行中...");
      const response = await fetch("/api/auth/user");
      if (response.ok) {
        const data = await response.json();
        console.log("💰 クレジット残高取得:", data.user?.credits);
        setUser({
          email: data.user?.email,
          credits: data.user?.credits || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchIntegrations = async () => {
    try {
      const response = await fetch("/api/integrations");
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data.status);
      }
    } catch (error) {
      console.error("Failed to fetch integrations:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/auth/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleIntegrationClick = (
    platform: "instagram" | "x" | "wordpress"
  ) => {
    setSelectedPlatform(platform);
    setShowIntegrationModal(true);
  };

  const handleIntegrationComplete = () => {
    setShowIntegrationModal(false);
    setSelectedPlatform(null);
    fetchIntegrations(); // 連携状態を再取得
  };

  return (
    <>
      <div className="w-[20%] border-r border-border bg-card p-6 flex flex-col gap-6">
        {/* Logo */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              // ① 新しいチャットを開始（ページリロード）
              router.push("/");
              router.refresh();
            }}
            className="text-2xl font-bold hover:text-primary transition-colors cursor-pointer"
            title="新しいチャットを開始"
          >
            Marty
          </button>
          <div className="flex items-center gap-1">
            <Link
              href="/dashboard"
              className="p-2 hover:bg-muted rounded-md transition-colors"
              title="ダッシュボード"
            >
              <BarChart3 className="w-4 h-4" />
            </Link>
            <Link
              href="/settings"
              className="p-2 hover:bg-muted rounded-md transition-colors"
              title="設定"
            >
              <Settings className="w-4 h-4" />
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-muted rounded-md transition-colors"
              title="ログアウト"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* User Info */}
        {user && (
          <div className="pb-3 border-b border-border">
            <p className="text-xs text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
        )}

        {/* Status Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">
            連携状態
          </h3>
          <div className="space-y-2">
            <StatusItem
              label="Instagram"
              status={integrations.instagram ? "connected" : "disconnected"}
              onClick={() => handleIntegrationClick("instagram")}
            />
            <StatusItem
              label="X (Twitter)"
              status={integrations.x ? "connected" : "disconnected"}
              onClick={() => handleIntegrationClick("x")}
            />
            <StatusItem
              label="Website"
              status={integrations.wordpress ? "connected" : "disconnected"}
              onClick={() => handleIntegrationClick("wordpress")}
            />
          </div>
        </div>

      {/* Ma-Point Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Ma-Point
        </h3>
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">
            {loading ? "..." : user?.credits || 0}
          </div>
          <button
            onClick={() => setShowPurchaseModal(true)}
            className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            チャージ
          </button>
        </div>
      </div>

      {/* Next Post Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">
          次回投稿
        </h3>
        <div className="text-sm text-muted-foreground">
          予定なし
        </div>
      </div>
      </div>

      {/* Integration Modal */}
      {showIntegrationModal && selectedPlatform && (
        <IntegrationModal
          platform={selectedPlatform}
          isConnected={integrations[selectedPlatform]}
          onClose={() => setShowIntegrationModal(false)}
          onComplete={handleIntegrationComplete}
        />
      )}

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <PurchaseModal onClose={() => setShowPurchaseModal(false)} />
      )}
    </>
  );
}

function StatusItem({
  label,
  status,
  onClick,
}: {
  label: string;
  status: "connected" | "disconnected";
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full hover:bg-muted/50 p-2 rounded-md transition-colors"
    >
      <span className="text-sm">{label}</span>
      <Circle
        className={`w-3 h-3 ${
          status === "connected"
            ? "fill-green-500 text-green-500"
            : "fill-red-500 text-red-500"
        }`}
      />
    </button>
  );
}
