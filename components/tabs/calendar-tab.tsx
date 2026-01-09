"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Instagram, Twitter, Mail, Globe, Check, Clock, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  platform: "instagram" | "twitter" | "email" | "website";
  status: "draft" | "scheduled" | "published";
  time?: string;
}

// Sample data
const sampleEvents: CalendarEvent[] = [
  { id: "1", date: "2026-01-05", title: "新商品紹介投稿", platform: "instagram", status: "published", time: "12:00" },
  { id: "2", date: "2026-01-07", title: "キャンペーン告知", platform: "twitter", status: "scheduled", time: "18:00" },
  { id: "3", date: "2026-01-10", title: "ニュースレター配信", platform: "email", status: "draft" },
  { id: "4", date: "2026-01-12", title: "ブログ更新", platform: "website", status: "scheduled", time: "10:00" },
  { id: "5", date: "2026-01-15", title: "週末セール告知", platform: "instagram", status: "draft" },
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

export function CalendarTab() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "list">("month");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const formatDateKey = (day: number) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const getEventsForDate = (dateKey: string) => {
    return sampleEvents.filter((event) => event.date === dateKey);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white min-w-[100px] text-center">
            {year}年 {monthNames[month]}
          </h2>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* View Toggle */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(["month", "list"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                viewMode === mode
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400"
              )}
            >
              {mode === "month" ? "月表示" : "リスト"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {viewMode === "month" ? (
            <motion.div
              key="month"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4"
            >
              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {dayNames.map((day, i) => (
                  <div
                    key={day}
                    className={cn(
                      "text-center text-xs font-medium py-2",
                      i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-gray-500"
                    )}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for days before first of month */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
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
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedDate(dateKey)}
                      className={cn(
                        "aspect-square p-1 rounded-lg border transition-colors relative",
                        isSelected
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                          : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50",
                        isToday && "ring-2 ring-indigo-500 ring-offset-1"
                      )}
                    >
                      <span
                        className={cn(
                          "text-xs font-medium",
                          dayOfWeek === 0 ? "text-red-500" : dayOfWeek === 6 ? "text-blue-500" : "text-gray-700 dark:text-gray-300"
                        )}
                      >
                        {day}
                      </span>

                      {/* Event indicators */}
                      {events.length > 0 && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                          {events.slice(0, 3).map((event) => {
                            const Icon = platformIcons[event.platform];
                            return (
                              <div
                                key={event.id}
                                className={cn(
                                  "w-4 h-4 rounded-full flex items-center justify-center",
                                  platformColors[event.platform],
                                  event.status === "draft" && "opacity-50 border border-dashed border-white"
                                )}
                              >
                                <Icon className="w-2.5 h-2.5 text-white" />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Selected date events */}
              <AnimatePresence>
                {selectedDate && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 space-y-2 overflow-hidden"
                  >
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {selectedDate} の予定
                    </h3>
                    {getEventsForDate(selectedDate).length > 0 ? (
                      getEventsForDate(selectedDate).map((event) => (
                        <EventCard key={event.id} event={event} />
                      ))
                    ) : (
                      <p className="text-sm text-gray-400 py-4 text-center">
                        予定はありません
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 space-y-3"
            >
              {sampleEvents.map((event) => (
                <EventCard key={event.id} event={event} showDate />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function EventCard({ event, showDate }: { event: CalendarEvent; showDate?: boolean }) {
  const Icon = platformIcons[event.platform];

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-colors",
        event.status === "draft"
          ? "border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30"
          : event.status === "scheduled"
          ? "border-solid border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          : "border-solid border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20"
      )}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
          platformColors[event.platform]
        )}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {event.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {showDate && (
            <span className="text-xs text-gray-500">{event.date}</span>
          )}
          {event.time && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {event.time}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {event.status === "published" && (
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-white" />
          </div>
        )}
        {event.status === "draft" && (
          <div className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            下書き
          </div>
        )}
        {event.status === "scheduled" && (
          <div className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
            予約済
          </div>
        )}
      </div>
    </motion.div>
  );
}
