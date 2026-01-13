/**
 * Frame 4: 映画字幕風 - Remotion Composition
 *
 * アニメーション:
 * - 背景: Slow Pan (左から右へ)
 * - 字幕: Fade-In
 */

import { AbsoluteFill, useCurrentFrame, useVideoConfig, Img, interpolate } from "remotion";
import type { Frame4Props } from "../../types";
import { CANVAS_SPECS, DEFAULT_BRAND } from "../../types";
import { fadeIn } from "../animations";

export const Frame4CinemaComposition: React.FC<Frame4Props> = ({
  aspectRatio,
  backgroundImage,
  subtitle,
  brand,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const spec = CANVAS_SPECS[aspectRatio];
  const mergedBrand = { ...DEFAULT_BRAND, ...brand };

  // Slow Pan効果 (左から右へ)
  const panOffset = interpolate(frame, [0, durationInFrames], [0, 50], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 字幕のフェードイン
  const subtitleOpacity = fadeIn(frame, 30, 30);

  // レターボックスのフェードイン
  const letterboxOpacity = fadeIn(frame, 0, 15);

  return (
    <AbsoluteFill>
      {/* 背景画像 (Pan) */}
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
              width: "120%",
              height: "100%",
              objectFit: "cover",
              transform: `translateX(-${panOffset}px)`,
            }}
          />
        </div>
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom right, #0f172a, #1e293b, #0f172a)",
          }}
        />
      )}

      {/* 下部グラデーションオーバーレイ */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          bottom: 0,
          background:
            "linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.4), transparent)",
        }}
      />

      {/* 上部グラデーション */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: "70%",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.3), transparent)",
        }}
      />

      {/* レターボックス (上部) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "64px",
          backgroundColor: "#000",
          opacity: letterboxOpacity,
        }}
      />

      {/* レターボックス (下部) */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "64px",
          backgroundColor: "#000",
          opacity: letterboxOpacity,
        }}
      />

      {/* 字幕エリア */}
      <div
        style={{
          position: "absolute",
          top: spec.safeZone.top,
          bottom: spec.safeZone.bottom,
          left: spec.safeZone.left,
          right: spec.safeZone.right,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "0 32px 48px",
            opacity: subtitleOpacity,
          }}
        >
          <p
            style={{
              color: "#ffffff",
              fontSize: "24px",
              lineHeight: 1.625,
              letterSpacing: "0.1em",
              whiteSpace: "pre-line",
              fontFamily: "'Noto Serif JP', serif",
              textShadow: "0 2px 8px rgba(0,0,0,0.8)",
            }}
          >
            {subtitle}
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};
