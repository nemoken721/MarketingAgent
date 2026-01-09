/**
 * Lazy Loading用のダイナミックインポート
 * コード分割によりバンドルサイズを削減し、初期ロード時間を改善
 */

import dynamic from "next/dynamic";

// 重いコンポーネントを遅延ロード
export const LazyImageGenerationModal = dynamic(
  () => import("@/components/image-generation-modal"),
  {
    loading: () => (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    ),
    ssr: false, // クライアントサイドのみでレンダリング
  }
);

export const LazyPurchaseModal = dynamic(
  () => import("@/components/purchase-modal"),
  {
    loading: () => (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    ),
    ssr: false,
  }
);

export const LazyIntegrationModal = dynamic(
  () => import("@/components/integrations/integration-modal"),
  {
    loading: () => (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    ),
    ssr: false,
  }
);

// チャートライブラリの遅延ロード
export const LazyCreditUsageChart = dynamic(
  () => import("@/components/dashboard/credit-usage-chart"),
  {
    loading: () => (
      <div className="w-full h-80 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    ),
    ssr: false, // Rechartsはクライアントサイドのみ
  }
);
