"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { CanvasMode } from "./desktop-nav-rail";

// Canvas Views
import { HomeCanvas } from "../canvas/home-canvas";
import { CalendarCanvas } from "../canvas/calendar-canvas";
import { AnalyticsCanvas } from "../canvas/analytics-canvas";
import { OperationCanvas, ContentPreview } from "../canvas/operation-canvas";

interface DesktopCanvasProps {
  mode: CanvasMode;
  onContextChange?: (context: Record<string, any>) => void;
  contentPreviews?: ContentPreview[];
  currentDomain?: string;
}

export function DesktopCanvas({ mode, onContextChange, contentPreviews, currentDomain }: DesktopCanvasProps) {
  const variants = {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
  };

  return (
    <div className="flex-1 h-full bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          {mode === "home" && <HomeCanvas />}
          {mode === "calendar" && <CalendarCanvas onContextChange={onContextChange} />}
          {mode === "analytics" && <AnalyticsCanvas />}
          {mode === "operation" && (
            <OperationCanvas
              onContextChange={onContextChange}
              previews={contentPreviews}
              currentDomain={currentDomain}
            />
          )}
          {mode === "history" && <HomeCanvas />} {/* History shows home by default */}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
