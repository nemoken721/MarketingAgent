"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Users,
  Heart,
  Bookmark,
  MessageCircle,
  ArrowRight,
  Loader2,
  BarChart3,
} from "lucide-react";
import { useLiff } from "@/context/liff-context";
import { cn } from "@/lib/utils";

interface AnalyticsData {
  followers: {
    count: number;
    change: number;
    trend: "up" | "down" | "stable";
  };
  engagement: {
    rate: number;
    change: number;
  };
  topPosts: {
    id: string;
    imageUrl: string;
    likes: number;
    saves: number;
    comments: number;
  }[];
  recommendations: string[];
}

/**
 * LIFF 分析・ダッシュボード画面
 * Instagramの運用データをカード形式で表示
 */
export default function LiffAnalyticsPage() {
  const router = useRouter();
  const { profile, accessToken } = useLiff();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!profile?.userId || !accessToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/dashboard/stats", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-Line-User-Id": profile.userId,
          },
        });

        if (response.ok) {
          const result = await response.json();
          setData(result);
          setIsConnected(true);
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [profile?.userId, accessToken]);

  // チャットで改善提案を依頼
  const handleGetRecommendations = () => {
    router.push("/liff/create?mode=analytics-review");
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
          <BarChart3 className="w-5 h-5 text-purple-500" />
          <h1 className="font-bold text-gray-900">アカウント分析</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* 未連携状態 */}
        {!isConnected && (
          <div className="bg-white rounded-2xl p-6 text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-purple-500" />
            </div>
            <h2 className="font-bold text-gray-900 mb-2">
              Instagramを連携しましょう
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              アカウントを連携すると、フォロワー推移や
              <br />
              投稿のパフォーマンスを分析できます
            </p>
            <button
              onClick={() => router.push("/liff/settings?tab=integrations")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-medium"
            >
              連携する
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 連携済み状態 */}
        {isConnected && data && (
          <>
            {/* メトリクスカード */}
            <div className="grid grid-cols-2 gap-3">
              {/* フォロワー数 */}
              <div className="bg-white rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500">フォロワー</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold">
                    {data.followers.count.toLocaleString()}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium mb-1",
                      data.followers.trend === "up"
                        ? "text-green-500"
                        : data.followers.trend === "down"
                        ? "text-red-500"
                        : "text-gray-400"
                    )}
                  >
                    {data.followers.change > 0 ? "+" : ""}
                    {data.followers.change}%
                  </span>
                </div>
              </div>

              {/* エンゲージメント率 */}
              <div className="bg-white rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500">エンゲージ率</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold">
                    {data.engagement.rate}%
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium mb-1",
                      data.engagement.change > 0
                        ? "text-green-500"
                        : data.engagement.change < 0
                        ? "text-red-500"
                        : "text-gray-400"
                    )}
                  >
                    {data.engagement.change > 0 ? "+" : ""}
                    {data.engagement.change}%
                  </span>
                </div>
              </div>
            </div>

            {/* 保存数ランキング */}
            <div className="bg-white rounded-xl p-4">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-purple-500" />
                保存数TOP投稿
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {data.topPosts.map((post, index) => (
                  <div key={post.id} className="flex-shrink-0 w-28">
                    <div className="relative">
                      <div className="w-28 h-28 rounded-lg overflow-hidden bg-gray-100">
                        <img
                          src={post.imageUrl || "/placeholder-image.jpg"}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs font-bold text-purple-500">
                        {index + 1}
                      </div>
                    </div>
                    <div className="mt-2 space-y-0.5">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Bookmark className="w-3 h-3" />
                        <span>{post.saves}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Heart className="w-3 h-3" />
                        <span>{post.likes}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 改善提案 */}
            {data.recommendations && data.recommendations.length > 0 && (
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 text-white">
                <h3 className="font-bold mb-2">AIからの提案</h3>
                <ul className="text-sm space-y-1 mb-3">
                  {data.recommendations.slice(0, 2).map((rec, index) => (
                    <li key={index} className="opacity-90">
                      • {rec}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={handleGetRecommendations}
                  className="w-full py-2 bg-white/20 rounded-lg font-medium text-sm flex items-center justify-center gap-2"
                >
                  詳しく相談する
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}

        {/* 改善提案ボタン（常時表示） */}
        <button
          onClick={handleGetRecommendations}
          className="w-full py-4 bg-white rounded-xl font-medium text-gray-900 flex items-center justify-center gap-2 shadow-sm"
        >
          <MessageCircle className="w-5 h-5 text-blue-500" />
          Martyに相談する
        </button>
      </div>
    </div>
  );
}
