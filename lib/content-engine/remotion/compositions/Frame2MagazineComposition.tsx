/**
 * Frame 2: 雑誌見出し風 - Remotion Composition
 *
 * アニメーション:
 * - 背景: Ken Burns Zoom-Out
 * - テキスト: Staggered Slide-In from left
 */

import { AbsoluteFill, useCurrentFrame, useVideoConfig, Img } from "remotion";
import type { Frame2Props } from "../../types";
import { CANVAS_SPECS, DEFAULT_BRAND } from "../../types";
import { kenBurnsZoomOut, slideInFromLeft, fadeIn } from "../animations";

export const Frame2MagazineComposition: React.FC<Frame2Props> = ({
  aspectRatio,
  backgroundImage,
  title,
  subtitle,
  decorativeText = "Professional Tips",
  brand,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const spec = CANVAS_SPECS[aspectRatio];
  const mergedBrand = { ...DEFAULT_BRAND, ...brand };

  // Ken Burns効果
  const scale = kenBurnsZoomOut(frame, durationInFrames);

  // テキストアニメーション
  const decorativeAnim = slideInFromLeft(frame, 15, fps);
  const titleAnim = slideInFromLeft(frame, 30, fps);
  const subtitleAnim = slideInFromLeft(frame, 50, fps);
  const accentOpacity = fadeIn(frame, 70, 20);

  return (
    <AbsoluteFill>
      {/* 背景画像 (Ken Burns) */}
      {backgroundImage ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
          }}
        >
          <Img
            src={backgroundImage}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${scale})`,
            }}
          />
        </div>
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom right, #e2e8f0, #94a3b8)",
          }}
        />
      )}

      {/* 白オーバーレイ */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(255, 255, 255, 0.9)",
        }}
      />

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
          justifyContent: "center",
        }}
      >
        <div style={{ padding: "0 32px" }}>
          {/* 装飾用英語テキスト */}
          <p
            style={{
              fontSize: "24px",
              fontStyle: "italic",
              color: "#94a3b8",
              letterSpacing: "0.1em",
              marginBottom: "16px",
              fontFamily: "Georgia, serif",
              transform: `translateX(${decorativeAnim.translateX}px)`,
              opacity: decorativeAnim.opacity,
            }}
          >
            {decorativeText}
          </p>

          {/* メインタイトル */}
          <h1
            style={{
              fontFamily: "'Noto Serif JP', serif",
              fontSize: "60px",
              fontWeight: 700,
              color: "#1e293b",
              lineHeight: 1.25,
              letterSpacing: "0.025em",
              marginBottom: "24px",
              whiteSpace: "pre-line",
              transform: `translateX(${titleAnim.translateX}px)`,
              opacity: titleAnim.opacity,
            }}
          >
            {title}
          </h1>

          {/* 区切り線 */}
          <div
            style={{
              width: "128px",
              borderBottom: "2px solid #cbd5e1",
              marginBottom: "32px",
              opacity: titleAnim.opacity,
            }}
          />

          {/* サブタイトル */}
          {subtitle && (
            <p
              style={{
                fontSize: "24px",
                color: "#475569",
                lineHeight: 1.625,
                letterSpacing: "0.025em",
                maxWidth: "80%",
                transform: `translateX(${subtitleAnim.translateX}px)`,
                opacity: subtitleAnim.opacity,
              }}
            >
              {subtitle}
            </p>
          )}

          {/* ブランドアクセント */}
          <div
            style={{
              marginTop: "48px",
              width: "64px",
              height: "8px",
              borderRadius: "9999px",
              backgroundColor: mergedBrand.primaryColor,
              opacity: accentOpacity,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
