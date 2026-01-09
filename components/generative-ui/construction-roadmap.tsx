"use client";

import { motion } from "framer-motion";
import { Building2, Network, ServerCog, Sparkles, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * WordPress構築進捗ロードマップコンポーネント
 * 4つのステップをフローチャート形式で表示
 */

interface ConstructionRoadmapProps {
  currentStep: number; // 1-4
  completedSteps?: number[]; // 完了したステップの配列
  className?: string;
}

interface Step {
  id: number;
  title: string;
  subtitle: string;
  icon: typeof Building2;
  description: string;
}

const steps: Step[] = [
  {
    id: 1,
    title: "住所と土地の確保",
    subtitle: "ドメイン・サーバー",
    icon: Building2,
    description: "お店を出すための「住所（ドメイン）」と「土地（サーバー）」を準備します",
  },
  {
    id: 2,
    title: "道案内設定",
    subtitle: "DNS・接続",
    icon: Network,
    description: "訪問者が迷わず辿り着けるよう、住所と土地を紐付けます",
  },
  {
    id: 3,
    title: "お店の建設",
    subtitle: "インストール・SSL",
    icon: ServerCog,
    description: "WordPress を設置し、セキュリティ証明書（SSL）を取得します",
  },
  {
    id: 4,
    title: "内装・開店",
    subtitle: "テーマ・記事",
    icon: Sparkles,
    description: "デザインを整え、最初のコンテンツを配置します",
  },
];

export function ConstructionRoadmap({
  currentStep,
  completedSteps = [],
  className,
}: ConstructionRoadmapProps) {
  const isCompleted = (stepId: number) => completedSteps.includes(stepId);
  const isCurrent = (stepId: number) => stepId === currentStep;
  const isPending = (stepId: number) => stepId > currentStep && !isCompleted(stepId);

  return (
    <div className={cn("w-full", className)}>
      {/* タイトル */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 text-center"
      >
        <h3 className="text-lg font-semibold text-foreground">
          ホームページ構築ロードマップ
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          お店を開くまでの道のり（{currentStep}/4 ステップ）
        </p>
      </motion.div>

      {/* ステップ一覧 */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const completed = isCompleted(step.id);
          const current = isCurrent(step.id);
          const pending = isPending(step.id);

          return (
            <div key={step.id}>
              {/* ステップカード */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "relative flex items-start gap-4 p-4 rounded-lg border-2 transition-all",
                  completed && "border-green-500 bg-green-50 dark:bg-green-950/20",
                  current && "border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-md",
                  pending && "border-border bg-muted/30 opacity-60"
                )}
              >
                {/* アイコン */}
                <div
                  className={cn(
                    "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                    completed && "bg-green-500 text-white",
                    current && "bg-blue-500 text-white",
                    pending && "bg-muted text-muted-foreground"
                  )}
                >
                  {completed ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <Icon className="w-6 h-6" />
                  )}
                </div>

                {/* テキスト */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4
                      className={cn(
                        "font-semibold",
                        completed && "text-green-700 dark:text-green-400",
                        current && "text-blue-700 dark:text-blue-400",
                        pending && "text-muted-foreground"
                      )}
                    >
                      {step.title}
                    </h4>
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        completed && "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
                        current && "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
                        pending && "bg-muted text-muted-foreground"
                      )}
                    >
                      {step.subtitle}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "text-sm mt-1",
                      completed && "text-green-600 dark:text-green-500",
                      current && "text-blue-600 dark:text-blue-500",
                      pending && "text-muted-foreground"
                    )}
                  >
                    {step.description}
                  </p>
                </div>

                {/* ステップ番号バッジ */}
                <div
                  className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                    completed && "bg-green-500 text-white",
                    current && "bg-blue-500 text-white",
                    pending && "bg-muted text-muted-foreground"
                  )}
                >
                  {step.id}
                </div>

                {/* 現在のステップを示すパルスアニメーション */}
                {current && (
                  <motion.div
                    className="absolute -inset-1 rounded-lg bg-blue-400/20 -z-10"
                    animate={{
                      scale: [1, 1.02, 1],
                      opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                )}
              </motion.div>

              {/* 接続線（最後のステップ以外） */}
              {index < steps.length - 1 && (
                <div className="flex justify-center py-2">
                  <div
                    className={cn(
                      "w-0.5 h-6 rounded-full",
                      completed || (current && step.id < currentStep)
                        ? "bg-green-500"
                        : "bg-border"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 進捗メッセージ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 p-4 bg-muted/50 rounded-lg border border-border"
      >
        <p className="text-sm text-muted-foreground text-center">
          {currentStep === 1 && "まずは最初のステップ「住所と土地の確保」から始めましょう！"}
          {currentStep === 2 && "いいですね！次はDNS設定で住所と土地を紐付けます。"}
          {currentStep === 3 && "準備完了！いよいよWordPressを設置します。"}
          {currentStep === 4 && "あと少しです！デザインとコンテンツを整えて開店しましょう。"}
          {completedSteps.length === 4 && "🎉 おめでとうございます！ホームページが完成しました！"}
        </p>
      </motion.div>
    </div>
  );
}
