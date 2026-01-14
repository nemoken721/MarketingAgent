"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Settings,
  User,
  CreditCard,
  Link2,
  Mail,
  ChevronRight,
  Check,
  Loader2,
  Instagram,
  Crown,
  Sparkles,
} from "lucide-react";
import { useLiff } from "@/context/liff-context";
import { cn } from "@/lib/utils";

interface UserProfile {
  email?: string;
  plan: "free" | "pro";
  credits: number;
  lineConnected: boolean;
  instagramConnected: boolean;
}

/**
 * LIFF 設定画面
 * プロフィール設定、プラン管理、連携設定
 */
export default function LiffSettingsPage() {
  const searchParams = useSearchParams();
  const { profile, accessToken, closeWindow } = useLiff();
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const activeTab = searchParams.get("tab") || "profile";

  useEffect(() => {
    const fetchProfile = async () => {
      if (!profile?.userId || !accessToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/auth/user", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-Line-User-Id": profile.userId,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUserProfile({
            email: data.user?.email,
            plan: data.user?.profile?.plan_tier || "free",
            credits: data.user?.credits || 0,
            lineConnected: true,
            instagramConnected: !!data.user?.profile?.instagram_connected,
          });
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [profile?.userId, accessToken]);

  // メールアドレス登録
  const handleSaveEmail = async () => {
    if (!email.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/user/update-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-Line-User-Id": profile?.userId || "",
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setUserProfile((prev) =>
          prev ? { ...prev, email } : null
        );
        setShowEmailForm(false);
      }
    } catch (error) {
      console.error("Failed to save email:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-safe">
      {/* ヘッダー */}
      <header className="bg-white border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-500" />
          <h1 className="font-bold text-gray-900">設定</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* プロフィールカード */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center gap-4">
            {profile?.pictureUrl ? (
              <img
                src={profile.pictureUrl}
                alt=""
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="font-bold text-gray-900">
                {profile?.displayName || "ユーザー"}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                {userProfile?.plan === "pro" ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium rounded-full">
                    <Crown className="w-3 h-3" />
                    Pro
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                    Free
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* クレジット残高 */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">残りクレジット</p>
              <p className="text-3xl font-bold">{userProfile?.credits || 0}</p>
            </div>
            <button className="px-4 py-2 bg-white/20 rounded-lg text-sm font-medium">
              購入する
            </button>
          </div>
        </div>

        {/* メニューリスト */}
        <div className="bg-white rounded-xl divide-y">
          {/* メールアドレス登録（BAN対策） */}
          <div className="p-4">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowEmailForm(!showEmailForm)}
            >
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">メールアドレス</p>
                  <p className="text-xs text-gray-500">
                    {userProfile?.email || "未登録（任意）"}
                  </p>
                </div>
              </div>
              {userProfile?.email ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </div>

            {showEmailForm && !userProfile?.email && (
              <div className="mt-3 space-y-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500">
                  万が一のアカウント復旧に使用します
                </p>
                <button
                  onClick={handleSaveEmail}
                  disabled={!email.trim() || isSaving}
                  className="w-full py-2 bg-blue-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {isSaving ? "保存中..." : "保存する"}
                </button>
              </div>
            )}
          </div>

          {/* Instagram連携 */}
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Instagram className="w-5 h-5 text-pink-500" />
                <div>
                  <p className="font-medium text-gray-900">Instagram</p>
                  <p className="text-xs text-gray-500">
                    {userProfile?.instagramConnected
                      ? "連携済み"
                      : "未連携"}
                  </p>
                </div>
              </div>
              {userProfile?.instagramConnected ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <button className="px-3 py-1 text-sm text-blue-500 font-medium">
                  連携する
                </button>
              )}
            </div>
          </div>

          {/* プランアップグレード */}
          {userProfile?.plan === "free" && (
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="font-medium text-gray-900">Proプラン</p>
                    <p className="text-xs text-gray-500">
                      無制限の画像生成・優先サポート
                    </p>
                  </div>
                </div>
                <button className="px-3 py-1 text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-medium">
                  詳細
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ヘルプ・サポート */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="font-medium text-gray-900">ヘルプ・お問い合わせ</p>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        {/* バージョン情報 */}
        <p className="text-center text-xs text-gray-400 pt-4">
          Marty v1.0.0
        </p>
      </div>
    </div>
  );
}
