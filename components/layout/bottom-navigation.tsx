"use client";

import { motion } from "framer-motion";
import { Home, Calendar, BarChart3, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavigationProps {
  activeTab: "home" | "calendar" | "analytics" | "settings";
  onTabChange: (tab: "home" | "calendar" | "analytics" | "settings") => void;
  onMartyPress: () => void;
}

const navItems = [
  { id: "home" as const, icon: Home, label: "Home" },
  { id: "calendar" as const, icon: Calendar, label: "Calendar" },
  { id: "analytics" as const, icon: BarChart3, label: "Data" },
  { id: "settings" as const, icon: Settings, label: "Menu" },
];

export function BottomNavigation({
  activeTab,
  onTabChange,
  onMartyPress,
}: BottomNavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      {/* Glass background */}
      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-800/50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-end justify-around h-[70px] px-2 pb-2 pt-1 max-w-lg mx-auto">
          {/* Left nav items */}
          {navItems.slice(0, 2).map((item) => (
            <NavItem
              key={item.id}
              item={item}
              isActive={activeTab === item.id}
              onClick={() => onTabChange(item.id)}
            />
          ))}

          {/* Center Marty Button */}
          <div className="relative -mt-5 z-10">
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("Marty button clicked!");
                onMartyPress();
              }}
              type="button"
              className="relative w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 flex items-center justify-center group cursor-pointer"
            >
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 via-indigo-400 to-purple-500 blur-md opacity-50 group-hover:opacity-70 transition-opacity pointer-events-none" />

              {/* Icon */}
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10 pointer-events-none"
              >
                <Sparkles className="w-6 h-6 text-white" />
              </motion.div>

              {/* Pulse ring */}
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-full border-2 border-white/30 pointer-events-none"
              />
            </motion.button>

            {/* Label */}
            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 pointer-events-none">
              Marty
            </span>
          </div>

          {/* Right nav items */}
          {navItems.slice(2, 4).map((item) => (
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
