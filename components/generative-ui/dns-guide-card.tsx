"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Network,
  Copy,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * DNS設定ガイドカードコンポーネント
 * ドメインレジストラごとのネームサーバー変更手順を表示
 */

interface DNSGuideCardProps {
  serverProvider: "xserver" | "conoha" | "other";
  domainRegistrar?: "onamae" | "muumuu" | "other";
  nameServers: string[];
  className?: string;
}

interface RegistrarGuide {
  name: string;
  steps: string[];
  loginUrl: string;
}

const registrarGuides: Record<string, RegistrarGuide> = {
  onamae: {
    name: "お名前.com",
    loginUrl: "https://www.onamae.com/navi/login",
    steps: [
      "お名前.com Naviにログイン",
      "「ネームサーバーの設定」>「ネームサーバーの変更」をクリック",
      "対象のドメインにチェックを入れる",
      "「他のネームサーバーを利用」を選択",
      "下記のネームサーバーを入力",
      "「確認」をクリックして完了",
    ],
  },
  muumuu: {
    name: "ムームードメイン",
    loginUrl: "https://muumuu-domain.com/login",
    steps: [
      "ムームードメインのコントロールパネルにログイン",
      "「ドメイン管理」>「ドメイン操作」>「ネームサーバ設定変更」を選択",
      "対象のドメインの「ネームサーバ設定変更」をクリック",
      "「GMOペパボ以外 のネームサーバを使用する」を選択",
      "下記のネームサーバーを入力",
      "「ネームサーバ設定変更」をクリックして完了",
    ],
  },
  other: {
    name: "その他のドメイン会社",
    loginUrl: "",
    steps: [
      "ドメイン管理画面にログイン",
      "「ネームサーバー設定」または「DNS設定」を探す",
      "「カスタムネームサーバー」または「他社ネームサーバーを利用」を選択",
      "下記のネームサーバーを入力",
      "設定を保存",
    ],
  },
};

export function DNSGuideCard({
  serverProvider,
  domainRegistrar = "other",
  nameServers,
  className,
}: DNSGuideCardProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const guide = registrarGuides[domainRegistrar] || registrarGuides.other;

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success("クリップボードにコピーしました");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/20 rounded-lg overflow-hidden",
        className
      )}
    >
      {/* ヘッダー */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer bg-blue-100 dark:bg-blue-900/30"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
            <Network className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">
              DNS設定ガイド
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {guide.name} での設定手順
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-blue-700 dark:text-blue-300" />
        ) : (
          <ChevronDown className="w-5 h-5 text-blue-700 dark:text-blue-300" />
        )}
      </div>

      {/* コンテンツ */}
      <motion.div
        initial={false}
        animate={{ height: isExpanded ? "auto" : 0 }}
        className="overflow-hidden"
      >
        <div className="p-4 space-y-4">
          {/* 説明 */}
          <div className="flex gap-2 p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">なぜこの設定が必要？</p>
              <p>
                {guide.name}で取得した住所（ドメイン）は、まだどの土地（サーバー）を指すか決まっていません。
                「この住所の土地は{" "}
                {serverProvider === "xserver"
                  ? "Xserver"
                  : serverProvider === "conoha"
                  ? "ConoHa WING"
                  : "あなたのサーバー"}
                ですよ」と役所に届ける手続きが必要です。
              </p>
            </div>
          </div>

          {/* 手順 */}
          <div>
            <h4 className="font-semibold text-foreground mb-3">設定手順</h4>
            <ol className="space-y-2">
              {guide.steps.map((step, index) => (
                <li key={index} className="flex gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center font-semibold">
                    {index + 1}
                  </span>
                  <span className="text-sm text-foreground flex-1">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* ネームサーバー情報 */}
          <div>
            <h4 className="font-semibold text-foreground mb-3">
              入力するネームサーバー
            </h4>
            <div className="space-y-2">
              {nameServers.map((ns, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-3 bg-card border border-border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">
                      ネームサーバー{index + 1}
                    </p>
                    <code className="text-sm font-mono font-semibold text-foreground">
                      {ns}
                    </code>
                  </div>
                  <button
                    onClick={() => copyToClipboard(ns, index)}
                    className="flex-shrink-0 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2"
                  >
                    {copiedIndex === index ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm">コピー済み</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span className="text-sm">コピー</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ログインリンク */}
          {guide.loginUrl && (
            <div className="pt-2">
              <a
                href={guide.loginUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                <span>{guide.name}にログイン</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* 注意事項 */}
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              ⏱️ DNS設定の反映には<strong>24〜48時間</strong>
              かかる場合があります。設定後は少し時間を置いてから次のステップに進んでください。
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
