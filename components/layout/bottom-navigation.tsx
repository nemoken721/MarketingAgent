"use client";

import { motion } from "framer-motion";
import { Home, Calendar, BarChart3, Settings, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export type TabId = "home" | "calendar" | "chat" | "analytics" | "settings";

interface BottomNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const navItems = [
  { id: "home" as const, icon: Home, label: "Home" },
  { id: "calendar" as const, icon: Calendar, label: "Calendar" },
  { id: "chat" as const, icon: MessageSquare, label: "Chat" },
  { id: "analytics" as const, icon: BarChart3, label: "Data" },
  { id: "settings" as const, icon: Settings, label: "Menu" },
];

export function BottomNavigation({
  activeTab,
  onTabChange,
}: BottomNavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      {/* Glass background */}
      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-800/50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-around h-[70px] px-2 pb-2 pt-1 max-w-lg mx-auto">
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              isActive={activeTab === item.id}
              onClick={() => onTabChange(item.id)}
            />
          ))}
        </div>
      </div>

      {/* Safe area spacer for iOS */}
      <div className="h-[env(safe-area-inset-bottom)] bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl" />
    </div>
  );
}

function NavItem({
  item,
  isActive,
  onClick,
}: {
  item: (typeof navItems)[number];
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-col items-center justify-center w-16 h-full gap-0.5"
    >
      <motion.div
        animate={{ scale: isActive ? 1.1 : 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        <Icon
          className={cn(
            "w-6 h-6 transition-colors",
            isActive
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-gray-400 dark:text-gray-500"
          )}
          strokeWidth={isActive ? 2.5 : 2}
        />
      </motion.div>
      <span
        className={cn(
          "text-[10px] font-medium transition-colors",
          isActive
            ? "text-indigo-600 dark:text-indigo-400"
            : "text-gray-400 dark:text-gray-500"
        )}
      >
        {item.label}
      </span>
    </motion.button>
  );
}
