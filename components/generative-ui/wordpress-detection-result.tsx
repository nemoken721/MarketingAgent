"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Server, Globe, Package, Palette, AlertCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * WordPress検出結果表示コンポーネント
 * detectWordPressStatus ツールの結果をUIで表示
 */

interface WordPressDetectionResultProps {
  websiteId: string;
  detection: {
    installed: boolean;
    wpVersion: string | null;
    siteUrl: string | null;
    hasWpCli: boolean;
    themes?: string[];
    plugins?: string[];
  };
  showManageButton?: boolean;
  showInstallButton?: boolean;
  onManage?: () => void;
  onInstall?: () => void;
  className?: string;
}

export function WordPressDetectionResult({
  websiteId,
  detection,
  showManageButton = true,
  showInstallButton = true,
  onManage,
  onInstall,
  className,
}: WordPressDetectionResultProps) {
  const { installed, wpVersion, siteUrl, hasWpCli, themes = [], plugins = [] } = detection;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border bg-card p-6 shadow-sm",
        installed ? "border-green-200 bg-green-50/50" : "border-orange-200 bg-orange-50/50",
        className
      )}
    >
      {/* ヘッダー */}
      <div className="flex items-start gap-4 mb-4">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl",
            installed ? "bg-green-100" : "bg-orange-100"
          )}
        >
          {installed ? (
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          ) : (
            <XCircle className="h-6 w-6 text-orange-600" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground">
            {installed ? "WordPressを検出しました" : "WordPressが見つかりません"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {installed
              ? "既存のWordPressサイトを管理できます"
              : "WordPressの新規インストールが必要です"}
          </p>
        </div>
      </div>

      {/* WordPress情報（検出時のみ） */}
      {installed && (
        <div className="space-y-3 mb-6">
          {/* バージョン */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/80">
            <Server className="h-5 w-5 text-primary" />
            <div>
              <span className="text-sm text-muted-foreground">バージョン</span>
              <p className="font-medium">{wpVersion || "不明"}</p>
            </div>
          </div>

          {/* サイトURL */}
          {siteUrl && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/80">
              <Globe className="h-5 w-5 text-primary" />
              <div>
                <span className="text-sm text-muted-foreground">サイトURL</span>
                <p className="font-medium text-primary">
                  <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {siteUrl}
                  </a>
                </p>
              </div>
            </div>
          )}

          {/* テーマ */}
          {themes.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/80">
              <Palette className="h-5 w-5 text-primary" />
              <div>
                <span className="text-sm text-muted-foreground">インストール済みテーマ</span>
                <p className="font-medium">{themes.slice(0, 3).join(", ")}{themes.length > 3 ? ` 他${themes.length - 3}件` : ""}</p>
              </div>
            </div>
          )}

          {/* プラグイン */}
          {plugins.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/80">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <span className="text-sm text-muted-foreground">インストール済みプラグイン</span>
                <p className="font-medium">{plugins.slice(0, 3).join(", ")}{plugins.length > 3 ? ` 他${plugins.length - 3}件` : ""}</p>
              </div>
            </div>
          )}

          {/* WP-CLI警告 */}
          {!hasWpCli && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">WP-CLIが見つかりません</p>
                <p className="text-xs text-yellow-700">
                  一部の管理機能を使用するにはWP-CLIのインストールが必要です
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 未検出時のメッセージ */}
      {!installed && (
        <div className="mb-6 p-4 rounded-lg bg-white/80">
          <p className="text-sm text-muted-foreground">
            指定されたサーバーにWordPressがインストールされていないようです。
            新規インストールを行うことで、すぐにWebサイトを構築できます。
          </p>
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex gap-3">
        {installed && showManageButton && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onManage}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            このサイトを管理する
            <ArrowRight className="h-4 w-4" />
          </motion.button>
        )}

        {!installed && showInstallButton && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onInstall}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            WordPressをインストール
            <ArrowRight className="h-4 w-4" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
