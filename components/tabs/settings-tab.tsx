"use client";

import { motion } from "framer-motion";
import {
  User,
  Bell,
  Palette,
  Shield,
  CreditCard,
  HelpCircle,
  LogOut,
  ChevronRight,
  Moon,
  Sun,
  Globe,
  Link2,
  MessageSquare,
  Smartphone
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface SettingItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  type: "link" | "toggle" | "action";
  value?: boolean;
  danger?: boolean;
}

interface SettingGroup {
  title: string;
  items: SettingItem[];
}

const settingGroups: SettingGroup[] = [
  {
    title: "アカウント",
    items: [
      { id: "profile", label: "プロフィール", description: "名前、メールアドレス", icon: User, type: "link" },
      { id: "notifications", label: "通知設定", description: "プッシュ通知、メール", icon: Bell, type: "link" },
      { id: "security", label: "セキュリティ", description: "パスワード、2段階認証", icon: Shield, type: "link" },
    ],
  },
  {
    title: "連携",
    items: [
      { id: "platforms", label: "プラットフォーム連携", description: "SNS、メール配信", icon: Link2, type: "link" },
      { id: "website", label: "Webサイト連携", description: "WordPress、独自ドメイン", icon: Globe, type: "link" },
    ],
  },
  {
    title: "表示",
    items: [
      { id: "darkmode", label: "ダークモード", icon: Moon, type: "toggle", value: false },
      { id: "language", label: "言語", description: "日本語", icon: MessageSquare, type: "link" },
    ],
  },
  {
    title: "サブスクリプション",
    items: [
      { id: "plan", label: "プラン管理", description: "Pro プラン", icon: CreditCard, type: "link" },
      { id: "usage", label: "使用状況", description: "クレジット残高", icon: Smartphone, type: "link" },
    ],
  },
  {
    title: "サポート",
    items: [
      { id: "help", label: "ヘルプセンター", icon: HelpCircle, type: "link" },
      { id: "logout", label: "ログアウト", icon: LogOut, type: "action", danger: true },
    ],
  },
];

export function SettingsTab() {
  const [darkMode, setDarkMode] = useState(false);

  const handleToggle = (id: string) => {
    if (id === "darkmode") {
      setDarkMode(!darkMode);
      // Here you would implement actual dark mode toggle
    }
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          設定
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          アカウントとアプリの設定
        </p>
      </div>

      {/* User Card */}
      <div className="px-4 py-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <span className="text-white text-xl font-bold">M</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                マーケティング太郎
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                taro@example.com
              </p>
              <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
                <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                  Pro プラン
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </motion.div>
      </div>

      {/* Settings Groups */}
      <div className="px-4 pb-4 space-y-6">
        {settingGroups.map((group, groupIndex) => (
          <motion.div
            key={group.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + groupIndex * 0.05 }}
          >
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
              {group.title}
            </h3>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors",
                      item.danger && "text-red-600 dark:text-red-400"
                    )}
                    onClick={() => {
                      if (item.type === "toggle") {
                        handleToggle(item.id);
                      }
                    }}
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center",
                      item.danger
                        ? "bg-red-100 dark:bg-red-900/30"
                        : "bg-gray-100 dark:bg-gray-700"
                    )}>
                      <Icon className={cn(
                        "w-5 h-5",
                        item.danger
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-600 dark:text-gray-400"
                      )} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className={cn(
                        "text-sm font-medium",
                        item.danger
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-900 dark:text-white"
                      )}>
                        {item.label}
                      </p>
                      {item.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {item.description}
                        </p>
                      )}
                    </div>
                    {item.type === "link" && (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                    {item.type === "toggle" && (
                      <div className={cn(
                        "w-11 h-6 rounded-full transition-colors relative",
                        item.id === "darkmode" && darkMode
                          ? "bg-indigo-600"
                          : "bg-gray-300 dark:bg-gray-600"
                      )}>
                        <div className={cn(
                          "absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform shadow-sm",
                          item.id === "darkmode" && darkMode
                            ? "translate-x-[22px]"
                            : "translate-x-0.5"
                        )} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-6 text-center">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Marty v1.0.0
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          © 2026 Marketing Agent
        </p>
      </div>
    </div>
  );
}
