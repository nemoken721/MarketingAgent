"use client";

import { ReactNode } from "react";
import { useLiffOptional } from "@/context/liff-context";
import { Footer } from "@/components/footer";

interface LiffLayoutWrapperProps {
  children: ReactNode;
}

/**
 * LIFF環境を検出してレイアウトを条件分岐するラッパー
 * - LINEアプリ内: フッター非表示、画面領域最大化
 * - ブラウザ: 通常表示（フッターあり）
 */
export function LiffLayoutWrapper({ children }: LiffLayoutWrapperProps) {
  const liff = useLiffOptional();

  // LIFF未初期化時（または通常Web閲覧時）は通常レイアウト
  const isInLineClient = liff?.isInClient ?? false;
  const isLoading = liff?.isLoading ?? false;

  // ローディング中は最小限のレイアウト
  if (isLoading && liff?.isInitialized === false) {
    return (
      <div className="flex flex-col min-h-screen">
        <main id="main-content" className="flex-1" tabIndex={-1}>
          {children}
        </main>
      </div>
    );
  }

  // LINEアプリ内の場合はフッターなしで画面最大化
  if (isInLineClient) {
    return (
      <div className="flex flex-col min-h-screen liff-container">
        <main
          id="main-content"
          className="flex-1 pb-safe"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    );
  }

  // 通常のブラウザ閲覧時
  return (
    <div className="flex flex-col min-h-screen">
      <main id="main-content" className="flex-1" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
