"use client";

/**
 * Skip to Main Content リンク
 * キーボードユーザーとスクリーンリーダーユーザーのために
 * ナビゲーションをスキップしてメインコンテンツに直接移動できるようにする
 */
export function SkipToContent() {
  const handleSkip = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const mainContent = document.querySelector("main");
    if (mainContent) {
      mainContent.setAttribute("tabindex", "-1");
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <a
      href="#main-content"
      onClick={handleSkip}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
    >
      メインコンテンツへスキップ
    </a>
  );
}
