"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  Heart,
  Share2,
  Instagram,
  Twitter,
  Globe,
  Mail,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCard {
  label: string;
  value: string;
  change: number;
  icon: React.ElementType;
}

interface PlatformData {
  platform: string;
  icon: React.ElementType;
  color: string;
  metrics: {
    followers: string;
    reach: string;
    engagement: string;
  };
  chartData: number[];
}

const topMetrics: MetricCard[] = [
  { label: "総リーチ数", value: "24.5K", change: 12.5, icon: Eye },
  { label: "総フォロワー", value: "8,432", change: 3.2, icon: Users },
  { label: "エンゲージメント", value: "4.8%", change: -0.3, icon: Heart },
  { label: "シェア数", value: "1,247", change: 8.7, icon: Share2 },
];

const platformData: PlatformData[] = [
  {
    platform: "Instagram",
    icon: Instagram,
    color: "from-purple-500 to-pink-500",
    metrics: { followers: "5,234", reach: "12.3K", engagement: "5.2%" },
    chartData: [30, 45, 35, 50, 42, 60, 55, 70, 65, 80, 75, 90],
  },
  {
    platform: "X (Twitter)",
    icon: Twitter,
    color: "from-blue-400 to-blue-600",
    metrics: { followers: "2,891", reach: "8.7K", engagement: "3.8%" },
    chartData: [20, 35, 25, 40, 30, 45, 42, 55, 50, 60, 58, 65],
  },
  {
    platform: "Website",
    icon: Globe,
    color: "from-orange-400 to-orange-600",
    metrics: { followers: "-", reach: "3.2K", engagement: "2.1%" },
    chartData: [15, 22, 18, 28, 24, 32, 30, 38, 35, 42, 40, 48],
  },
  {
    platform: "メールマガジン",
    icon: Mail,
    color: "from-green-400 to-green-600",
    metrics: { followers: "307", reach: "285", engagement: "42.1%" },
    chartData: [40, 42, 38, 45, 44, 48, 46, 50, 49, 52, 51, 54],
  },
];

export function AnalyticsCanvas() {
  return (
    <div className="h-full overflow-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            アナリティクス
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            過去30日間のパフォーマンス
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            defaultValue="30days"
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
          >
            <option value="7days">過去7日</option>
            <option value="30days">過去30日</option>
            <option value="90days">過去90日</option>
          </select>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2">
            レポート出力
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {topMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-slate-600 dark:text-blue-400" />
                </div>
                <div
                  className={cn(
                    "flex items-center gap-1 text-sm font-medium",
                    metric.change >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {metric.change >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {Math.abs(metric.change)}%
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metric.value}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {metric.label}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Platform Performance */}
      <div className="grid grid-cols-2 gap-6">
        {platformData.map((platform, index) => {
          const Icon = platform.icon;
          const maxValue = Math.max(...platform.chartData);

          return (
            <motion.div
              key={platform.platform}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5"
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center",
                    platform.color
                  )}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {platform.platform}
                </h3>
              </div>

              {/* Mini Chart */}
              <div className="h-20 flex items-end gap-1 mb-4">
                {platform.chartData.map((value, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-blue-100 dark:bg-blue-900/30 rounded-t"
                    style={{ height: `${(value / maxValue) * 100}%` }}
                  />
                ))}
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    フォロワー
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {platform.metrics.followers}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    リーチ
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {platform.metrics.reach}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    エンゲージ
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {platform.metrics.engagement}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
