"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  Globe,
  ExternalLink,
  RefreshCw,
  Smartphone,
  Monitor,
  Tablet,
  ChevronLeft,
  ChevronRight,
  Instagram,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

// コンテンツプレビューの型
export type ContentType = "wordpress" | "instagram" | "twitter" | "page" | "image";

export interface ContentPreview {
  id: string;
  type: ContentType;
  title: string;
  url?: string;
  content?: string;
  imageUrl?: string;
  domain?: string;
  pageId?: number;
  createdAt: Date;
}

interface OperationCanvasProps {
  onContextChange?: (data: Record<string, any>) => void;
  previews?: ContentPreview[];
  currentDomain?: string;
}

type ViewMode = "desktop" | "tablet" | "mobile";

const viewModes: { id: ViewMode; icon: React.ElementType; label: string; width: string }[] = [
  { id: "desktop", icon: Monitor, label: "PC", width: "100%" },
  { id: "tablet", icon: Tablet, label: "タブレット", width: "768px" },
  { id: "mobile", icon: Smartphone, label: "スマホ", width: "375px" },
];

const contentTypeIcons: Record<ContentType, React.ElementType> = {
  wordpress: Globe,
  instagram: Instagram,
  twitter: Globe,
  page: FileText,
  image: Eye,
};

const contentTypeLabels: Record<ContentType, string> = {
  wordpress: "WordPress",
  instagram: "Instagram",
  twitter: "Twitter",
  page: "ページ",
  image: "画像",
};

export function OperationCanvas({
  onContextChange,
  previews: externalPreviews,
  currentDomain,
}: OperationCanvasProps) {
  const [previews, setPreviews] = useState<ContentPreview[]>(externalPreviews || []);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // 外部からのプレビュー更新を反映
  useEffect(() => {
    if (externalPreviews && externalPreviews.length > 0) {
      setPreviews(externalPreviews);
      // 新しいプレビューが追加されたら最新のものを選択
      setSelectedIndex(externalPreviews.length - 1);
    }
  }, [externalPreviews]);

  // コンテキストを更新
  useEffect(() => {
    if (onContextChange) {
      onContextChange({
        current_canvas: "operation",
        previews_count: previews.length,
        current_domain: currentDomain,
        selected_preview: previews[selectedIndex],
      });
    }
  }, [previews, currentDomain, selectedIndex, onContextChange]);

  const selectedPreview = previews[selectedIndex];

  // リフレッシュ
  const handleRefresh = () => {
    setIsRefreshing(true);
    setIframeKey((prev) => prev + 1);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // 前後のプレビューに移動
  const goToPrevious = () => {
    setSelectedIndex((prev) => Math.max(0, prev - 1));
  };

  const goToNext = () => {
    setSelectedIndex((prev) => Math.min(previews.length - 1, prev + 1));
  };

  // ビューモードの幅を取得
  const getIframeWidth = () => {
    const mode = viewModes.find((m) => m.id === viewMode);
    return mode?.width || "100%";
  };

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-blue-500" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                Operation
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {currentDomain ? (
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    {currentDomain}
                  </span>
                ) : (
                  "コンテンツプレビュー"
                )}
              </p>
            </div>
          </div>

          {/* View Mode Selector */}
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {viewModes.map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setViewMode(mode.id)}
                    className={cn(
                      "p-2 rounded-md transition-colors",
                      viewMode === mode.id
                        ? "bg-white dark:bg-gray-600 shadow-sm"
                        : "hover:bg-gray-200 dark:hover:bg-gray-600"
                    )}
                    title={mode.label}
                  >
                    <Icon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing || !selectedPreview?.url}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={cn("w-4 h-4 text-gray-500", isRefreshing && "animate-spin")}
              />
            </button>

            {selectedPreview?.url && (
              <a
                href={selectedPreview.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-gray-500" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Preview List (Horizontal Thumbnails) */}
      {previews.length > 1 && (
        <div className="flex-shrink-0 px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={goToPrevious}
              disabled={selectedIndex === 0}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {previews.map((preview, index) => {
              const Icon = contentTypeIcons[preview.type];
              return (
                <motion.button
                  key={preview.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedIndex(index)}
                  className={cn(
                    "flex-shrink-0 px-3 py-2 rounded-lg border transition-colors",
                    selectedIndex === index
                      ? "bg-blue-50 dark:bg-blue-900/30 border-blue-500"
                      : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-blue-300"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-gray-500" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
                      {preview.title}
                    </span>
                  </div>
                </motion.button>
              );
            })}

            <button
              onClick={goToNext}
              disabled={selectedIndex === previews.length - 1}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Preview Area */}
      <div className="flex-1 overflow-hidden p-4">
        <AnimatePresence mode="wait">
          {previews.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center"
            >
              <Eye className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-center">
                プレビューがありません
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2 text-center">
                Martyにページ作成やコンテンツ生成を依頼すると、
                <br />
                ここにプレビューが表示されます
              </p>
            </motion.div>
          ) : selectedPreview ? (
            <motion.div
              key={selectedPreview.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full flex flex-col"
            >
              {/* Preview Info Bar */}
              <div className="flex-shrink-0 mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {(() => {
                    const Icon = contentTypeIcons[selectedPreview.type];
                    return (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                        <Icon className="w-3 h-3" />
                        {contentTypeLabels[selectedPreview.type]}
                      </span>
                    );
                  })()}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {selectedPreview.title}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(selectedPreview.createdAt).toLocaleTimeString("ja-JP", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {/* Preview Content */}
              <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex items-center justify-center">
                {selectedPreview.url ? (
                  <div
                    className="h-full transition-all duration-300 bg-white"
                    style={{ width: getIframeWidth(), maxWidth: "100%" }}
                  >
                    <iframe
                      key={iframeKey}
                      src={selectedPreview.url}
                      className="w-full h-full border-0"
                      title={selectedPreview.title}
                      sandbox="allow-scripts allow-same-origin"
                    />
                  </div>
                ) : selectedPreview.imageUrl ? (
                  <img
                    src={selectedPreview.imageUrl}
                    alt={selectedPreview.title}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : selectedPreview.content ? (
                  <div className="p-6 overflow-auto w-full h-full">
                    <div
                      className="prose dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedPreview.content }}
                    />
                  </div>
                ) : (
                  <div className="text-gray-400 text-center p-6">
                    プレビューを表示できません
                  </div>
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
