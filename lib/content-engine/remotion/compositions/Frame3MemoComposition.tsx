/**
 * Frame 3: メモ風 - Remotion Composition
 *
 * アニメーション:
 * - タイプライター効果で一文字ずつ表示
 */

import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { Frame3Props } from "../../types";
import { CANVAS_SPECS, DEFAULT_BRAND } from "../../types";
import { typewriter, fadeIn } from "../animations";

export const Frame3MemoComposition: React.FC<Frame3Props> = ({
  aspectRatio,
  content,
  showLines = true,
  bgStyle = "cream",
  brand,
}) => {
  const frame = useCurrentFrame();
  const spec = CANVAS_SPECS[aspectRatio];
  const mergedBrand = { ...DEFAULT_BRAND, ...brand };

  const bgColor = bgStyle === "cream" ? "#fefce8" : "#ffffff";
  const lines = content.split("\n");

  // ステータスバーのフェードイン
  const statusBarOpacity = fadeIn(frame, 0, 10);

  // タイプライター効果 (全体の文字数を計算)
  const totalChars = content.length;
  const displayedChars = typewriter(frame, 30, totalChars, 2); // 1文字0.067秒

  // 表示する文字を計算
  let charCount = 0;
  const displayLines = lines.map((line) => {
    const start = charCount;
    charCount += line.length + 1; // +1 for newline
    const end = Math.min(displayedChars - start, line.length);
    return end > 0 ? line.substring(0, end) : "";
  });

  // カーソル点滅
  const showCursor = Math.floor(frame / 15) % 2 === 0;
  const cursorVisible = displayedChars < totalChars && showCursor;

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor }}>
      {/* Safe Zone内コンテンツ */}
      <div
        style={{
          position: "absolute",
          top: spec.safeZone.top,
          bottom: spec.safeZone.bottom,
          left: spec.safeZone.left,
          right: spec.safeZone.right,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* フェイクステータスバー */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 32px",
            color: "#475569",
            opacity: statusBarOpacity,
          }}
        >
          <span style={{ fontSize: "24px", fontWeight: 500 }}>
            {new Date().getHours()}:{String(new Date().getMinutes()).padStart(2, "0")}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* WiFiアイコン */}
            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
            </svg>
            {/* バッテリー */}
            <div
              style={{
                width: "32px",
                height: "16px",
                border: "2px solid #475569",
                borderRadius: "2px",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "2px",
                  left: "2px",
                  bottom: "2px",
                  width: "80%",
                  backgroundColor: "#475569",
                  borderRadius: "1px",
                }}
              />
            </div>
          </div>
        </div>

        {/* メモヘッダー */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: "1px solid #e2e8f0",
            opacity: statusBarOpacity,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#d97706",
            }}
          >
            <svg
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span style={{ fontSize: "20px" }}>メモ</span>
          </div>
        </div>

        {/* メモ本文 */}
        <div
          style={{
            flex: 1,
            padding: "24px 32px",
            overflow: "hidden",
          }}
        >
          {displayLines.map((line, index) => (
            <div
              key={index}
              style={{
                padding: "16px 0",
                fontSize: "30px",
                lineHeight: 2,
                letterSpacing: "0.025em",
                color: "#1e293b",
                borderBottom: showLines ? "1px solid #e2e8f0" : "none",
                fontFamily:
                  mergedBrand.fontStack === "serif"
                    ? "'Noto Serif JP', serif"
                    : "'Noto Sans JP', sans-serif",
                minHeight: "1.5em",
              }}
            >
              {line || "\u00A0"}
              {/* タイプライターカーソル */}
              {index === displayLines.findIndex((l, i) =>
                displayLines.slice(0, i + 1).join("\n").length >= displayedChars
              ) && cursorVisible && (
                <span
                  style={{
                    display: "inline-block",
                    width: "3px",
                    height: "1em",
                    backgroundColor: "#1e293b",
                    marginLeft: "2px",
                    verticalAlign: "text-bottom",
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
