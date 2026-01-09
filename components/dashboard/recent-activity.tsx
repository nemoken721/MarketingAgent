"use client";

import { Activity, CreditCard, FileText, Image, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

interface RecentActivityProps {
  activities: Array<{
    id: string;
    type: "credit_purchase" | "credit_usage" | "post_created" | "image_generated";
    description: string;
    amount?: number;
    createdAt: string;
  }>;
}

export default function RecentActivity({ activities }: RecentActivityProps) {
  // サンプルデータ
  const sampleActivities = [
    {
      id: "1",
      type: "credit_purchase" as const,
      description: "クレジットを購入しました",
      amount: 500,
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: "2",
      type: "post_created" as const,
      description: "Instagramに投稿を作成しました",
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    },
    {
      id: "3",
      type: "image_generated" as const,
      description: "AI画像を生成しました",
      amount: -100,
      createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    },
    {
      id: "4",
      type: "credit_usage" as const,
      description: "投稿作成でクレジットを使用しました",
      amount: -50,
      createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    },
  ];

  const displayActivities =
    activities && activities.length > 0 ? activities : sampleActivities;

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "credit_purchase":
        return <CreditCard className="w-5 h-5 text-green-600" />;
      case "credit_usage":
        return <CreditCard className="w-5 h-5 text-red-600" />;
      case "post_created":
        return <FileText className="w-5 h-5 text-blue-600" />;
      case "image_generated":
        return <Image className="w-5 h-5 text-purple-600" />;
      default:
        return <Activity className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getActivityBgColor = (type: string) => {
    switch (type) {
      case "credit_purchase":
        return "bg-green-100 dark:bg-green-900/20";
      case "credit_usage":
        return "bg-red-100 dark:bg-red-900/20";
      case "post_created":
        return "bg-blue-100 dark:bg-blue-900/20";
      case "image_generated":
        return "bg-purple-100 dark:bg-purple-900/20";
      default:
        return "bg-muted";
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold">最近のアクティビティ</h2>
      </div>

      <div className="space-y-4">
        {displayActivities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div
              className={`w-10 h-10 ${getActivityBgColor(activity.type)} rounded-lg flex items-center justify-center flex-shrink-0`}
            >
              {getActivityIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{activity.description}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(activity.createdAt), {
                  addSuffix: true,
                  locale: ja,
                })}
              </p>
            </div>
            {activity.amount && (
              <div
                className={`text-sm font-semibold ${
                  activity.amount > 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {activity.amount > 0 ? "+" : ""}
                {activity.amount}pt
              </div>
            )}
          </div>
        ))}
      </div>

      {displayActivities.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>アクティビティがありません</p>
        </div>
      )}
    </div>
  );
}
