"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * LIFF ルートページ
 * クエリパラメータに応じて適切なページにリダイレクト
 */
export default function LiffRootPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");

  useEffect(() => {
    // モードに応じてリダイレクト
    switch (mode) {
      case "image":
      case "create":
        router.replace("/liff/create");
        break;
      case "analytics":
        router.replace("/liff/analytics");
        break;
      case "settings":
        router.replace("/liff/settings");
        break;
      default:
        // デフォルトは制作ルーム
        router.replace("/liff/create");
    }
  }, [mode, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-gray-400">読み込み中...</div>
    </div>
  );
}
