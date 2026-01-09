"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  TrendingUp,
  Calendar,
  CreditCard,
  Instagram,
  Twitter,
  Globe,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedContainer } from "@/components/ui/animated-container";
import CreditUsageChart from "@/components/dashboard/credit-usage-chart";
import PostStatsCards from "@/components/dashboard/post-stats-cards";
import RecentActivity from "@/components/dashboard/recent-activity";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/dashboard/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        router.push("/auth/login");
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <AnimatedContainer>
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              ホームに戻る
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">ダッシュボード</h1>
                <p className="text-muted-foreground">
                  投稿状況とクレジット使用状況を確認できます
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <PostStatsCards stats={stats} />

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Credit Usage Chart */}
            <AnimatedContainer delay={0.1}>
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center gap-2 mb-6">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">クレジット使用推移</h2>
                </div>
                <CreditUsageChart data={stats?.creditUsage || []} />
              </div>
            </AnimatedContainer>

            {/* Platform Distribution */}
            <AnimatedContainer delay={0.2}>
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">プラットフォーム別投稿</h2>
                </div>
                <div className="space-y-4">
                  <PlatformStat
                    icon={<Instagram className="w-5 h-5" />}
                    name="Instagram"
                    count={stats?.platforms?.instagram || 0}
                    total={stats?.totalPosts || 0}
                    color="bg-pink-500"
                  />
                  <PlatformStat
                    icon={<Twitter className="w-5 h-5" />}
                    name="X (Twitter)"
                    count={stats?.platforms?.twitter || 0}
                    total={stats?.totalPosts || 0}
                    color="bg-blue-500"
                  />
                  <PlatformStat
                    icon={<Globe className="w-5 h-5" />}
                    name="WordPress"
                    count={stats?.platforms?.wordpress || 0}
                    total={stats?.totalPosts || 0}
                    color="bg-blue-600"
                  />
                </div>
              </div>
            </AnimatedContainer>
          </div>

          {/* Recent Activity */}
          <AnimatedContainer delay={0.3}>
            <RecentActivity activities={stats?.recentActivities || []} />
          </AnimatedContainer>
        </AnimatedContainer>
      </div>
    </div>
  );
}

function PlatformStat({
  icon,
  name,
  count,
  total,
  color,
}: {
  icon: React.ReactNode;
  name: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{name}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {count} ({percentage}%)
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
