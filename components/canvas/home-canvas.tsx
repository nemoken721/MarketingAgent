"use client";

import { motion } from "framer-motion";
import {
  Sparkles,
  TrendingUp,
  Calendar,
  Users,
  Eye,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";

interface StatCard {
  label: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  icon: React.ElementType;
}

const stats: StatCard[] = [
  { label: "総リーチ", value: "24.5K", change: "+12.5%", changeType: "positive", icon: Eye },
  { label: "フォロワー", value: "8,432", change: "+3.2%", changeType: "positive", icon: Users },
  { label: "投稿数", value: "47", change: "今月", changeType: "neutral", icon: Calendar },
  { label: "エンゲージメント", value: "4.8%", change: "-0.3%", changeType: "negative", icon: TrendingUp },
];

interface Task {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "completed";
  dueDate: string;
}

const tasks: Task[] = [
  { id: "1", title: "Instagram投稿を作成", status: "in_progress", dueDate: "今日" },
  { id: "2", title: "週次レポートを確認", status: "pending", dueDate: "明日" },
  { id: "3", title: "新商品の写真撮影", status: "pending", dueDate: "1/8" },
  { id: "4", title: "メルマガ配信設定", status: "completed", dueDate: "完了" },
];

export function HomeCanvas() {
  return (
    <div className="h-full overflow-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            ダッシュボード
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            マーケティング活動の概要
          </p>
        </motion.div>
      </div>

      {/* AI Suggestion Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-700 via-slate-600 to-blue-600 p-6"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">
              Martyからの提案
            </h3>
            <p className="text-white/90 text-sm mb-3">
              今週のエンゲージメントが先週比15%上昇しています。このタイミングで週末キャンペーンを実施すると効果的です。
            </p>
            <button className="flex items-center gap-1 text-white font-medium text-sm hover:underline">
              詳細を見る
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + index * 0.05 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-slate-600 dark:text-blue-400" />
                </div>
                <span
                  className={`text-sm font-medium ${
                    stat.changeType === "positive"
                      ? "text-green-600"
                      : stat.changeType === "negative"
                        ? "text-red-600"
                        : "text-gray-500"
                  }`}
                >
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stat.value}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {stat.label}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Tasks Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            今週のタスク
          </h2>
          <button className="text-sm text-blue-600 dark:text-blue-400 font-medium">
            すべて見る
          </button>
        </div>
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  task.status === "completed"
                    ? "bg-green-100 dark:bg-green-900/30"
                    : task.status === "in_progress"
                      ? "bg-amber-100 dark:bg-amber-900/30"
                      : "bg-gray-100 dark:bg-gray-700"
                }`}
              >
                {task.status === "completed" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : task.status === "in_progress" ? (
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${
                    task.status === "completed"
                      ? "text-gray-400 line-through"
                      : "text-gray-900 dark:text-white"
                  }`}
                >
                  {task.title}
                </p>
              </div>
              <span className="text-xs text-gray-500">{task.dueDate}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
