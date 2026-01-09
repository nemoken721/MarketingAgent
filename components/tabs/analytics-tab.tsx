"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Users, Eye, Heart, Share2, Instagram, Twitter, Globe, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  change: number;
  icon: React.ElementType;
}

interface PlatformCardProps {
  platform: string;
  icon: React.ElementType;
  color: string;
  metrics: {
    followers: string;
    reach: string;
    engagement: string;
  };
  sparklineData: number[];
}

// Sample data
const topMetrics: MetricCardProps[] = [
  { label: "総リーチ数", value: "24.5K", change: 12.5, icon: Eye },
  { label: "総フォロワー", value: "8,432", change: 3.2, icon: Users },
  { label: "エンゲージメント", value: "4.8%", change: -0.3, icon: Heart },
  { label: "シェア数", value: "1,247", change: 8.7, icon: Share2 },
];

const platformData: PlatformCardProps[] = [
  {
    platform: "Instagram",
    icon: Instagram,
    color: "from-purple-500 to-pink-500",
    metrics: { followers: "5,234", reach: "12.3K", engagement: "5.2%" },
    sparklineData: [30, 45, 35, 50, 42, 60, 55],
  },
  {
    platform: "X (Twitter)",
    icon: Twitter,
    color: "from-blue-400 to-blue-600",
    metrics: { followers: "2,891", reach: "8.7K", engagement: "3.8%" },
    sparklineData: [20, 35, 25, 40, 30, 45, 42],
  },
  {
    platform: "Website",
    icon: Globe,
    color: "from-orange-400 to-orange-600",
    metrics: { followers: "-", reach: "3.2K", engagement: "2.1%" },
    sparklineData: [15, 22, 18, 28, 24, 32, 30],
  },
  {
    platform: "メールマガジン",
    icon: Mail,
    color: "from-green-400 to-green-600",
    metrics: { followers: "307", reach: "285", engagement: "42.1%" },
    sparklineData: [40, 42, 38, 45, 44, 48, 46],
  },
];

export function AnalyticsTab() {
  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          アナリティクス
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          過去7日間のパフォーマンス
        </p>
      </div>

      {/* Top Metrics */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {topMetrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <metric.icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div
                  className={cn(
                    "flex items-center gap-0.5 text-xs font-medium",
                    metric.change >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {metric.change >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {Math.abs(metric.change)}%
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metric.value}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {metric.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Platform Cards */}
      <div className="px-4 pb-4 space-y-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          プラットフォーム別
        </h3>
        {platformData.map((platform, index) => (
          <motion.div
            key={platform.platform}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + index * 0.1 }}
          >
            <PlatformCard {...platform} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function PlatformCard({ platform, icon: Icon, color, metrics, sparklineData }: PlatformCardProps) {
  const maxValue = Math.max(...sparklineData);
  const minValue = Math.min(...sparklineData);
  const range = maxValue - minValue || 1;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
      <div className="flex items-start gap-3">
        {/* Platform Icon */}
        <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0", color)}>
          <Icon className="w-5 h-5 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900 dark:text-white">
              {platform}
            </h4>
            {/* Sparkline */}
            <svg className="w-16 h-8" viewBox="0 0 64 32">
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-indigo-500"
                points={sparklineData
                  .map((value, i) => {
                    const x = (i / (sparklineData.length - 1)) * 60 + 2;
                    const y = 30 - ((value - minValue) / range) * 26;
                    return `${x},${y}`;
                  })
                  .join(" ")}
              />
            </svg>
          </div>

          {/* Metrics */}
          <div className="flex gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                フォロワー
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {metrics.followers}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                リーチ
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {metrics.reach}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                エンゲージ
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {metrics.engagement}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
