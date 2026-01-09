"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Instagram,
  Twitter,
  Mail,
  Globe,
  Check,
  Clock,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  platform: "instagram" | "twitter" | "email" | "website";
  status: "draft" | "scheduled" | "published";
  time?: string;
}

interface CalendarCanvasProps {
  onContextChange?: (context: Record<string, any>) => void;
}

const sampleEvents: CalendarEvent[] = [
  { id: "1", date: "2026-01-05", title: "新商品紹介投稿", platform: "instagram", status: "published", time: "12:00" },
  { id: "2", date: "2026-01-07", title: "キャンペーン告知", platform: "twitter", status: "scheduled", time: "18:00" },
  { id: "3", date: "2026-01-10", title: "ニュースレター配信", platform: "email", status: "draft" },
  { id: "4", date: "2026-01-12", title: "ブログ更新", platform: "website", status: "scheduled", time: "10:00" },
  { id: "5", date: "2026-01-15", title: "週末セール告知", platform: "instagram", status: "draft" },
  { id: "6", date: "2026-01-20", title: "月次レポート", platform: "email", status: "scheduled", time: "09:00" },
];

const platformIcons = {
  instagram: Instagram,
  twitter: Twitter,
  email: Mail,
  website: Globe,
};

const platformColors = {
  instagram: "bg-gradient-to-br from-purple-500 to-pink-500",
  twitter: "bg-blue-500",
  email: "bg-green-500",
  website: "bg-orange-500",
};

export function CalendarCanvas({ onContextChange }: CalendarCanvasProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

  const goToPrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const goToNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const formatDateKey = (day: number) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const getEventsForDate = (dateKey: string) => {
    return sampleEvents.filter((event) => event.date === dateKey);
  };

  // Update context when date is selected
  useEffect(() => {
    if (onContextChange) {
      onContextChange({
        current_canvas: "calendar",
        viewing_date: selectedDate || formatDateKey(new Date().getDate()),
        viewing_month: `${year}-${String(month + 1).padStart(2, "0")}`,
      });
    }
  }, [selectedDate, year, month, onContextChange]);

  return (
    <div className="h-full flex">
      {/* Calendar Grid */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={goToPrevMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white min-w-[120px] text-center">
              {year}年 {monthNames[month]}
            </h1>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            予定を追加
          </button>
        </div>

        {/* Calendar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
            {dayNames.map((day, i) => (
              <div
                key={day}
                className={cn(
                  "py-3 text-center text-sm font-medium",
                  i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-gray-500"
                )}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {/* Empty cells */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="h-24 border-b border-r border-gray-100 dark:border-gray-700" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateKey = formatDateKey(day);
              const events = getEventsForDate(dateKey);
              const isToday = new Date().toISOString().split("T")[0] === dateKey;
              const isSelected = selectedDate === dateKey;
              const dayOfWeek = new Date(year, month, day).getDay();

              return (
                <motion.button
                  key={day}
                  whileHover={{ backgroundColor: "rgba(59, 130, 246, 0.05)" }}
                  onClick={() => setSelectedDate(dateKey)}
                  className={cn(
                    "h-24 p-2 border-b border-r border-gray-100 dark:border-gray-700 text-left transition-colors relative",
                    isSelected && "bg-blue-50 dark:bg-blue-950/30",
                    isToday && "ring-2 ring-inset ring-blue-500"
                  )}
                >
                  <span
                    className={cn(
                      "text-sm font-medium",
                      dayOfWeek === 0 ? "text-red-500" : dayOfWeek === 6 ? "text-blue-500" : "text-gray-700 dark:text-gray-300"
                    )}
                  >
                    {day}
                  </span>

                  {/* Events */}
                  <div className="mt-1 space-y-1">
                    {events.slice(0, 2).map((event) => {
                      const Icon = platformIcons[event.platform];
                      return (
                        <div
                          key={event.id}
                          className={cn(
                            "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-white truncate",
                            platformColors[event.platform],
                            event.status === "draft" && "opacity-50"
                          )}
                        >
                          <Icon className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{event.title}</span>
                        </div>
                      );
                    })}
                    {events.length > 2 && (
                      <span className="text-[10px] text-gray-400">+{events.length - 2} more</span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sidebar - Selected Date Detail */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
          >
            <div className="w-80 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {selectedDate}
                </h3>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3">
                {getEventsForDate(selectedDate).length > 0 ? (
                  getEventsForDate(selectedDate).map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))
                ) : (
                  <p className="text-sm text-gray-400 text-center py-8">
                    この日の予定はありません
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EventCard({ event }: { event: CalendarEvent }) {
  const Icon = platformIcons[event.platform];

  return (
    <div
      className={cn(
        "p-3 rounded-xl border transition-colors",
        event.status === "draft"
          ? "border-dashed border-gray-300 dark:border-gray-600"
          : event.status === "published"
            ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20"
            : "border-gray-200 dark:border-gray-700"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
            platformColors[event.platform]
          )}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {event.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {event.time && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {event.time}
              </span>
            )}
            {event.status === "published" && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <Check className="w-3 h-3" />
                公開済み
              </span>
            )}
            {event.status === "draft" && (
              <span className="text-xs text-gray-400">下書き</span>
            )}
            {event.status === "scheduled" && (
              <span className="text-xs text-blue-600">予約済み</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
