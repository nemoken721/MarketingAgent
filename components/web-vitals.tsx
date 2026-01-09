"use client";

import { useEffect } from "react";

/**
 * Web Vitals計測コンポーネント
 * Core Web Vitalsをコンソールとアナリティクスに送信
 *
 * Note: Next.js 15ではweb-vitalsライブラリを直接使用
 */
export function WebVitals() {
  useEffect(() => {
    // 動的にweb-vitalsをインポート
    import("web-vitals").then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
      const reportMetric = (metric: { name: string; value: number; id: string }) => {
        // メトリクスをコンソールに出力（開発環境）
        if (process.env.NODE_ENV === "development") {
          console.log(`[Web Vitals] ${metric.name}:`, metric);
        }

        // 本番環境ではアナリティクスに送信
        if (process.env.NODE_ENV === "production") {
          // Google Analytics に送信
          if (typeof window !== "undefined" && (window as any).gtag) {
            (window as any).gtag("event", metric.name, {
              value: Math.round(
                metric.name === "CLS" ? metric.value * 1000 : metric.value
              ),
              event_label: metric.id,
              non_interaction: true,
            });
          }
        }
      };

      onCLS(reportMetric);
      onINP(reportMetric);
      onFCP(reportMetric);
      onLCP(reportMetric);
      onTTFB(reportMetric);
    }).catch(() => {
      // web-vitalsが利用できない場合は何もしない
      console.debug("[Web Vitals] web-vitals library not available");
    });
  }, []);

  return null;
}
