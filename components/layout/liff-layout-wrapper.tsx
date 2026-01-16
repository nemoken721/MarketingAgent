"use client";

import { ReactNode, useEffect, useState } from "react";
import { useLiffOptional } from "@/context/liff-context";
import { Footer } from "@/components/footer";
import { usePathname } from "next/navigation";

interface LiffLayoutWrapperProps {
  children: ReactNode;
}

const MOBILE_BREAKPOINT = 1024;

/**
 * LIFF環境を検出してレイアウトを条件分岐するラッパー
 * - LINEアプリ内: フッター非表示、画面領域最大化
 * - モバイルブラウザ（ホームページ）: フッター非表示（MobileAppShellが独自のナビゲーションを持つため）
 * - デスクトップブラウザ: 通常表示（フッターあり）
 */
export function LiffLayoutWrapper({ children }: LiffLayoutWrapperProps) {
  const liff = useLiffOptional();
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  // 画面サイズの検出
  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  // LIFF未初期化時（または通常Web閲覧時）は通常レイアウト
  const isInLineClient = liff?.isInClient ?? false;
  const isLoading = liff?.isLoading ?? false;

  // ホームページ（ResponsiveShell使用ページ）かどうか
  const isHomePage = pathname === "/";

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

  // モバイルでホームページの場合はフッターなし（MobileAppShellが独自のナビを持つため）
  if (isMobile && isHomePage) {
    return (
      <div className="flex flex-col min-h-screen">
        <main id="main-content" className="flex-1" tabIndex={-1}>
          {children}
        </main>
      </div>
    );
  }

  // 通常のブラウザ閲覧時（デスクトップ、または他のページ）
  return (
    <div className="flex flex-col min-h-screen">
      <main id="main-content" className="flex-1" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
