"use client";

import { motion } from "framer-motion";
import { Server, Check, ExternalLink, Star, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AffiliateLink {
  providerName: string;
  displayName: string;
  url: string;
  description: string | null;
  features: string[] | null;
  recommendedPlan: string | null;
  priceRange: string | null;
}

interface Props {
  links: AffiliateLink[];
}

export function AffiliateLinksCard({ links }: Props) {
  if (!links || links.length === 0) {
    return (
      <div className="rounded-lg border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white p-6">
        <p className="text-muted-foreground">
          現在、利用可能なサーバー情報はありません。
        </p>
      </div>
    );
  }

  // エックスサーバーを特定して先頭に表示
  const sortedLinks = [...links].sort((a, b) => {
    if (a.providerName === "xserver") return -1;
    if (b.providerName === "xserver") return 1;
    return 0;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full space-y-4"
    >
      {/* メインカード */}
      <div className="rounded-lg border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white overflow-hidden">
        {/* ヘッダー */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-orange-600" />
            <h3 className="text-xl font-semibold text-foreground">
              おすすめレンタルサーバー
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            WordPress構築に最適なレンタルサーバーをご紹介します。
          </p>
        </div>

        {/* コンテンツ */}
        <div className="px-6 pb-6 space-y-6">
          {sortedLinks.map((link, index) => {
            const isXserver = link.providerName === "xserver";

            return (
              <motion.div
                key={link.providerName}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "rounded-lg border p-6 shadow-sm hover:shadow-md transition-shadow",
                  isXserver
                    ? "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-300 ring-2 ring-orange-200"
                    : "bg-white dark:bg-gray-900 border-border"
                )}
              >
                {/* エックスサーバー専用のヘッダー */}
                {isXserver && (
                  <div className="flex items-center gap-2 mb-3 -mt-2">
                    <Crown className="h-5 w-5 text-orange-500" />
                    <span className="text-sm font-bold text-orange-600">
                      Marty一番のおすすめ！
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                  <div>
                    <h4
                      className={cn(
                        "text-lg font-semibold",
                        isXserver ? "text-orange-900 dark:text-orange-200" : "text-foreground"
                      )}
                    >
                      {link.displayName}
                    </h4>
                    {link.priceRange && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                        {link.priceRange}
                      </span>
                    )}
                  </div>
                  {isXserver ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                      <Star className="h-3 w-3 fill-current" />
                      国内シェアNo.1
                    </span>
                  ) : index === 1 ? (
                    <span className="inline-block px-2 py-1 text-xs rounded-full border border-border text-muted-foreground">
                      人気
                    </span>
                  ) : null}
                </div>

                {link.description && (
                  <p
                    className={cn(
                      "text-sm mb-4",
                      isXserver ? "text-orange-800 dark:text-orange-300" : "text-muted-foreground"
                    )}
                  >
                    {link.description}
                  </p>
                )}

                {link.features && link.features.length > 0 && (
                  <div className="mb-4">
                    <p
                      className={cn(
                        "text-sm font-medium mb-2",
                        isXserver ? "text-orange-800 dark:text-orange-300" : "text-foreground"
                      )}
                    >
                      主な特徴:
                    </p>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {link.features.map((feature, idx) => (
                        <li
                          key={idx}
                          className={cn(
                            "flex items-center gap-2 text-sm",
                            isXserver ? "text-orange-700 dark:text-orange-400" : "text-muted-foreground"
                          )}
                        >
                          <Check
                            className={cn(
                              "h-4 w-4 flex-shrink-0",
                              isXserver ? "text-orange-600" : "text-green-600"
                            )}
                          />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {link.recommendedPlan && (
                  <p
                    className={cn(
                      "text-sm mb-4",
                      isXserver ? "text-orange-700 dark:text-orange-400" : "text-muted-foreground"
                    )}
                  >
                    <span className="font-medium">おすすめプラン:</span>{" "}
                    {link.recommendedPlan}
                  </p>
                )}

                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center justify-center gap-2 w-full rounded-md font-medium transition-colors",
                    isXserver
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg py-3 text-base"
                      : "bg-orange-600 hover:bg-orange-700 text-white py-2.5 text-sm"
                  )}
                >
                  {isXserver
                    ? "エックスサーバーを申し込む"
                    : `${link.displayName}の詳細を見る`}
                  <ExternalLink className="h-4 w-4" />
                </a>

                {/* エックスサーバー専用の追加情報 */}
                {isXserver && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-3 text-center">
                    ※ 10日間の無料お試し期間あり。ドメインも同時に取得するとDNS設定が自動で楽です！
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* サーバー選びのポイントカード */}
      <div className="rounded-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-background p-6">
        <div className="flex items-start gap-3">
          <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-2">
            <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-foreground mb-2">
              サーバー選びのポイント
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>
                • <strong className="text-foreground">ドメインとサーバーを同じ会社で契約</strong>
                すると、DNS設定が自動で楽々です
              </li>
              <li>
                •{" "}
                <strong className="text-foreground">
                  WordPress簡単インストール機能があるサーバー
                </strong>
                を選ぶと初心者でも安心
              </li>
              <li>
                • <strong className="text-foreground">無料独自SSL対応</strong>
                のサーバーを選べば、HTTPS化も簡単です
              </li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
