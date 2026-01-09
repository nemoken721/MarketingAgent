"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BottomNavigation } from "./bottom-navigation";
import { ChatDrawer } from "./chat-drawer";
import { CalendarTab } from "../tabs/calendar-tab";
import { AnalyticsTab } from "../tabs/analytics-tab";
import { HomeTab } from "../tabs/home-tab";
import { SettingsTab } from "../tabs/settings-tab";
import { useChatThreads } from "@/hooks/use-chat-threads";
import { CanvasMode } from "@/types/chat";

type TabId = "home" | "calendar" | "analytics" | "settings";

export function MobileAppShell() {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [chatOpen, setChatOpen] = useState(false);
  const [contextData, setContextData] = useState<Record<string, any>>({});

  // スレッド管理
  const {
    threads,
    currentThreadId,
    currentThread,
    currentMessages,
    isLoading: threadsLoading,
    createThread,
    selectThread,
    deleteThread,
    generateTitle,
    saveMessage,
    clearCurrentThread,
    searchMessages,
  } = useChatThreads();

  // Update context data based on active tab
  useEffect(() => {
    const tabContextMap: Record<TabId, Record<string, any>> = {
      home: {
        view: "dashboard",
        description: "ホームダッシュボード - クイックアクションとサマリー",
      },
      calendar: {
        view: "calendar",
        description: "コンテンツカレンダー - 投稿スケジュール管理",
        features: ["投稿の予約", "下書き管理", "公開済みコンテンツの確認"],
      },
      analytics: {
        view: "analytics",
        description: "アナリティクス - パフォーマンス分析",
        metrics: ["リーチ数", "フォロワー数", "エンゲージメント率", "シェア数"],
        platforms: ["Instagram", "Twitter", "Website", "メールマガジン"],
      },
      settings: {
        view: "settings",
        description: "設定 - アカウントと連携管理",
        options: ["プロフィール", "SNS連携", "通知設定", "サブスクリプション"],
      },
    };

    setContextData(tabContextMap[activeTab]);
  }, [activeTab]);

  const handleMartyPress = () => {
    setChatOpen(true);
  };

  const renderTabContent = () => {
    const variants = {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -10 },
    };

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          {activeTab === "home" && <HomeTab />}
          {activeTab === "calendar" && <CalendarTab />}
          {activeTab === "analytics" && <AnalyticsTab />}
          {activeTab === "settings" && <SettingsTab />}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Main content area */}
      <main className="flex-1 overflow-hidden pb-[calc(70px+env(safe-area-inset-bottom))]">
        {renderTabContent()}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onMartyPress={handleMartyPress}
      />

      {/* Chat Drawer (Half-Modal) */}
      <ChatDrawer
        open={chatOpen}
        onOpenChange={setChatOpen}
        currentTab={activeTab}
        contextData={contextData}
        // スレッド管理props
        threads={threads}
        currentThreadId={currentThreadId}
        currentThread={currentThread}
        currentMessages={currentMessages}
        threadsLoading={threadsLoading}
        onCreateThread={createThread}
        onSelectThread={selectThread}
        onDeleteThread={deleteThread}
        onGenerateTitle={generateTitle}
        onSaveMessage={saveMessage}
        onClearThread={clearCurrentThread}
        onSearchMessages={searchMessages}
      />
    </div>
  );
}
