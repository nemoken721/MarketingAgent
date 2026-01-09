import { useEffect, useCallback } from "react";

/**
 * キーボードナビゲーション用カスタムフック
 * アクセシビリティ向上のためのキーボードショートカット
 */

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardNavigation(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const shortcut = shortcuts.find(
        (s) =>
          s.key.toLowerCase() === event.key.toLowerCase() &&
          (s.ctrlKey === undefined || s.ctrlKey === event.ctrlKey) &&
          (s.shiftKey === undefined || s.shiftKey === event.shiftKey) &&
          (s.altKey === undefined || s.altKey === event.altKey) &&
          (s.metaKey === undefined || s.metaKey === event.metaKey)
      );

      if (shortcut) {
        event.preventDefault();
        shortcut.action();
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * モーダルやダイアログのフォーカストラップ
 * Tabキーでフォーカスが外に出ないようにする
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement>,
  isActive: boolean
) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // モーダルを閉じるためのカスタムイベントを発火
        container.dispatchEvent(new CustomEvent("modal-close"));
      }
    };

    container.addEventListener("keydown", handleTabKey as EventListener);
    container.addEventListener("keydown", handleEscapeKey as EventListener);

    // 初期フォーカス
    firstElement?.focus();

    return () => {
      container.removeEventListener("keydown", handleTabKey as EventListener);
      container.removeEventListener(
        "keydown",
        handleEscapeKey as EventListener
      );
    };
  }, [containerRef, isActive]);
}

/**
 * Skip to main content リンク用フック
 * スクリーンリーダーユーザーのためにメインコンテンツへスキップ
 */
export function useSkipToContent() {
  const skipToMain = useCallback(() => {
    const mainContent = document.querySelector("main");
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView();
    }
  }, []);

  return skipToMain;
}
