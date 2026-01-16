"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BottomNavigation, TabId } from "./bottom-navigation";
import { CalendarTab } from "../tabs/calendar-tab";
import { AnalyticsTab } from "../tabs/analytics-tab";
import { HomeTab } from "../tabs/home-tab";
import { SettingsTab } from "../tabs/settings-tab";
import { ChatTab } from "../tabs/chat-tab";
import { useChatThreads } from "@/hooks/use-chat-threads";

export function MobileAppShell() {
  const [activeTab, setActiveTab] = useState<TabId>("chat");

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
          {activeTab === "chat" && (
            <ChatTab
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
          )}
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
      />
    </div>
  );
}
