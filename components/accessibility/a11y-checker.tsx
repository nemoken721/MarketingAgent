"use client";

import { useEffect } from "react";

/**
 * アクセシビリティチェッカー（開発環境のみ）
 * 一般的なアクセシビリティ問題を検出してコンソールに警告
 */
export function A11yChecker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const checkAccessibility = () => {
      const issues: string[] = [];

      // 1. alt属性のない画像をチェック
      const imagesWithoutAlt = document.querySelectorAll("img:not([alt])");
      if (imagesWithoutAlt.length > 0) {
        issues.push(
          `${imagesWithoutAlt.length}個の画像にalt属性がありません`
        );
      }

      // 2. ボタンにアクセシブルな名前があるかチェック
      const buttonsWithoutLabel = Array.from(
        document.querySelectorAll("button")
      ).filter(
        (btn) =>
          !btn.textContent?.trim() &&
          !btn.getAttribute("aria-label") &&
          !btn.getAttribute("aria-labelledby")
      );
      if (buttonsWithoutLabel.length > 0) {
        issues.push(
          `${buttonsWithoutLabel.length}個のボタンにラベルがありません`
        );
      }

      // 3. フォーム要素にラベルがあるかチェック
      const inputsWithoutLabel = Array.from(
        document.querySelectorAll("input:not([type='hidden'])")
      ).filter((input) => {
        const id = input.id;
        const hasLabel =
          (id && document.querySelector(`label[for="${id}"]`)) ||
          input.getAttribute("aria-label") ||
          input.getAttribute("aria-labelledby");
        return !hasLabel;
      });
      if (inputsWithoutLabel.length > 0) {
        issues.push(
          `${inputsWithoutLabel.length}個の入力要素にラベルがありません`
        );
      }

      // 4. 見出しの順序をチェック
      const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"));
      let lastLevel = 0;
      headings.forEach((heading) => {
        const level = parseInt(heading.tagName.substring(1));
        if (level > lastLevel + 1) {
          issues.push(
            `見出しレベルがスキップされています: h${lastLevel} の次に h${level}`
          );
        }
        lastLevel = level;
      });

      // 5. カラーコントラストの簡易チェック（完全ではない）
      const checkContrast = (element: Element) => {
        const style = window.getComputedStyle(element);
        const bgColor = style.backgroundColor;
        const color = style.color;

        // rgb値を取得して輝度を計算
        const getRgb = (colorStr: string) => {
          const match = colorStr.match(/\d+/g);
          return match ? match.map(Number) : [0, 0, 0];
        };

        const getLuminance = ([r, g, b]: number[]) => {
          const [rs, gs, bs] = [r, g, b].map((c) => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
        };

        const bgLuminance = getLuminance(getRgb(bgColor));
        const fgLuminance = getLuminance(getRgb(color));

        const ratio =
          (Math.max(bgLuminance, fgLuminance) + 0.05) /
          (Math.min(bgLuminance, fgLuminance) + 0.05);

        return ratio;
      };

      // テキスト要素のコントラストチェック（サンプル）
      const textElements = document.querySelectorAll("p, span, a, button, h1, h2, h3, h4, h5, h6");
      let lowContrastCount = 0;
      textElements.forEach((el) => {
        const ratio = checkContrast(el);
        if (ratio < 4.5) {
          // WCAG AA基準
          lowContrastCount++;
        }
      });

      if (lowContrastCount > 0) {
        issues.push(
          `${lowContrastCount}個の要素がカラーコントラスト基準を満たしていない可能性があります（要手動確認）`
        );
      }

      // 結果を表示
      if (issues.length > 0) {
        console.group("⚠️ アクセシビリティの問題が検出されました");
        issues.forEach((issue) => console.warn(issue));
        console.groupEnd();
      } else {
        console.log("✅ アクセシビリティチェック: 問題は検出されませんでした");
      }
    };

    // ページ読み込み後にチェック
    const timeout = setTimeout(checkAccessibility, 1000);

    return () => clearTimeout(timeout);
  }, []);

  return null;
}
