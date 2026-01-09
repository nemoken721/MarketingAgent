"use client";

import { FileText, Calendar, Clock, TrendingUp } from "lucide-react";
import { AnimatedCard } from "@/components/ui/animated-container";

interface PostStatsCardsProps {
  stats: {
    totalPosts?: number;
    scheduledPosts?: number;
    publishedToday?: number;
    averageEngagement?: number;
  } | null;
}

export default function PostStatsCards({ stats }: PostStatsCardsProps) {
  const cards = [
    {
      title: "総投稿数",
      value: stats?.totalPosts || 0,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
      change: "+12%",
    },
    {
      title: "スケジュール済み",
      value: stats?.scheduledPosts || 0,
      icon: Calendar,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/20",
      change: "+5%",
    },
    {
      title: "今日の投稿",
      value: stats?.publishedToday || 0,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900/20",
      change: "0%",
    },
    {
      title: "平均エンゲージメント",
      value: `${stats?.averageEngagement || 0}%`,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
      change: "+8%",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <AnimatedCard key={card.title} delay={index * 0.1}>
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${card.color}`} />
                </div>
                <span className="text-xs text-green-600 font-medium">
                  {card.change}
                </span>
              </div>
              <h3 className="text-2xl font-bold mb-1">{card.value}</h3>
              <p className="text-sm text-muted-foreground">{card.title}</p>
            </div>
          </AnimatedCard>
        );
      })}
    </div>
  );
}
