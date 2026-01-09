"use client";

import { motion } from "framer-motion";
import { Home, Calendar, BarChart3, Eye, History, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type CanvasMode = "home" | "calendar" | "analytics" | "operation" | "history";

interface DesktopNavRailProps {
  activeMode: CanvasMode;
  onModeChange: (mode: CanvasMode) => void;
  showHistory: boolean;
  onToggleHistory: () => void;
}

const navItems: { id: CanvasMode; icon: React.ElementType; label: string }[] = [
  { id: "home", icon: Home, label: "Home" },
  { id: "calendar", icon: Calendar, label: "Calendar" },
  { id: "analytics", icon: BarChart3, label: "Analytics" },
  { id: "operation", icon: Eye, label: "Operation" },
];

export function DesktopNavRail({
  activeMode,
  onModeChange,
  showHistory,
  onToggleHistory,
}: DesktopNavRailProps) {
  return (
    <div className="w-16 h-full bg-gray-900 flex flex-col items-center py-4 border-r border-gray-800">
      {/* Logo / Brand */}
      <div className="mb-6">
        <motion.div
          whileHover={{ scale: 1.1 }}
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-blue-600 flex items-center justify-center cursor-pointer"
        >
          <Sparkles className="w-5 h-5 text-white" />
        </motion.div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 flex flex-col items-center gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeMode === item.id && !showHistory;

          return (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                onModeChange(item.id);
                if (showHistory) onToggleHistory();
              }}
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all group relative",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon className="w-5 h-5" />

              {/* Tooltip */}
              <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </nav>

      {/* History Button (Bottom) */}
      <div className="mt-auto pt-4 border-t border-gray-800">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleHistory}
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center transition-all group relative",
            showHistory
              ? "bg-amber-600 text-white"
              : "text-gray-400 hover:bg-gray-800 hover:text-white"
          )}
        >
          <History className="w-5 h-5" />

          {/* Tooltip */}
          <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            History
          </span>
        </motion.button>
      </div>
    </div>
  );
}
