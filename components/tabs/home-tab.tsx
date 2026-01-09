"use client";

import { motion } from "framer-motion";
import {
  Sparkles,
  Plus,
  Instagram,
  Twitter,
  Mail,
  Globe,
  ArrowRight,
  Zap,
  Target,
  TrendingUp,
  Calendar,
  PenTool
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
}

const quickActions: QuickAction[] = [
  {
    id: "create-post",
    label: "投稿を作成",
    description: "AIが最適な投稿を提案",
    icon: PenTool,
    gradient: "from-indigo-500 to-purple-500",
  },
  {
    id: "schedule",
    label: "スケジュール",
    description: "投稿を予約する",
    icon: Calendar,
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    id: "analytics",
    label: "分析レポート",
    description: "パフォーマンスを確認",
    icon: TrendingUp,
    gradient: "from-green-500 to-emerald-500",
  },
  {
    id: "campaign",
    label: "キャンペーン",
    description: "新しい企画を開始",
    icon: Target,
    gradient: "from-orange-500 to-red-500",
  },
];

const connectedPlatforms = [
  { id: "instagram", name: "Instagram", icon: Instagram, connected: true, color: "text-pink-500" },
  { id: "twitter", name: "X (Twitter)", icon: Twitter, connected: true, color: "text-blue-500" },
  { id: "email", name: "メール", icon: Mail, connected: false, color: "text-green-500" },
  { id: "website", name: "Website", icon: Globe, connected: true, color: "text-orange-500" },
];

export function HomeTab() {
  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header */}
      <div className="px-4 pt-safe-top">
        <div className="py-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">
              おかえりなさい
            </p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
              ダッシュボード
            </h1>
          </motion.div>
        </div>
      </div>

      {/* AI Suggestion Card */}
      <div className="px-4 mb-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-white/80 text-sm font-medium">Martyからの提案</span>
            </div>
            <p className="text-white font-medium mb-3">
              今週のエンゲージメントが15%上昇しています。この勢いで週末キャンペーンを実施しませんか？
            </p>
            <button className="flex items-center gap-1 text-white/90 text-sm font-medium hover:text-white transition-colors">
              詳細を見る
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mb-6">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          クイックアクション
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, index) => (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + index * 0.05 }}
              whileTap={{ scale: 0.97 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm text-left group"
            >
              <div className={cn(
                "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3",
                action.gradient
              )}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {action.label}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {action.description}
              </p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Connected Platforms */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            連携プラットフォーム
          </h2>
          <button className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
            管理
          </button>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm divide-y divide-gray-100 dark:divide-gray-700"
        >
          {connectedPlatforms.map((platform) => {
            const Icon = platform.icon;
            return (
              <div
                key={platform.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("w-5 h-5", platform.color)} />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {platform.name}
                  </span>
                </div>
                <div className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full",
                  platform.connected
                    ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-500"
                )}>
                  {platform.connected ? "接続済み" : "未接続"}
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Today's Stats Mini */}
      <div className="px-4 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              今日のハイライト
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                2,847
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                インプレッション
              </p>
            </div>
            <div className="text-center border-x border-gray-100 dark:border-gray-700">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                128
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                エンゲージ
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                +12
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                フォロワー
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
