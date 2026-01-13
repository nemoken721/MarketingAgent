/**
 * Frame 4: "The Cinema" (映画字幕風)
 *
 * Design System v2.0 Section 2.4 準拠
 *
 * Visual Concept: 世界観、ブランディング
 *
 * Layout:
 * - Background: 全画面画像 (object-cover)
 * - Overlay: 視認性確保のため、下部 50% に
 *   bg-gradient-to-t from-black/90 to-transparent を重ねる
 * - Subtitle: 画面下部中央。白文字。font-serif, tracking-widest,
 *   サイズはあえて小さめ (text-sm or text-base)
 *
 * Motion (Reels):
 * - Image: ゆっくりと横に Pan (移動) させる
 * - Subtitle: じわっと浮き出る Fade-In
 */

import React from "react";
import type { Frame4Props } from "../types";
import { CANVAS_SPECS, DEFAULT_BRAND } from "../types";

export function Frame4Cinema({
  aspectRatio,
  backgroundImage,
  subtitle,
  brand,
}: Frame4Props) {
  const spec = CANVAS_SPECS[aspectRatio];
  const mergedBrand = { ...DEFAULT_BRAND, ...brand };

  const cssVariables = {
    "--primary-color": mergedBrand.primaryColor,
    "--font-stack":
      mergedBrand.fontStack === "serif"
        ? "'Noto Serif JP', serif"
        : "'Noto Sans JP', sans-serif",
    "--radius-md": mergedBrand.radiusStyle === "pop" ? "1rem" : "0px",
  } as React.CSSProperties;

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: spec.width,
        height: spec.height,
        aspectRatio: spec.aspectRatio,
        ...cssVariables,
      }}
    >
      {/* 背景画像 (全画面) */}
      {backgroundImage ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      ) : (
        // プレースホルダー: 映画風のダークグラデーション
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      )}

      {/* 下部グラデーションオーバーレイ */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"
        style={{ top: "50%" }}
      />
      {/* 上部からの軽いグラデーション (映画風) */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent"
        style={{ bottom: "70%" }}
      />

      {/* 字幕エリア (Safe Zone考慮) */}
      <div
        className="absolute flex flex-col justify-end items-center"
        style={{
          top: spec.safeZone.top,
          bottom: spec.safeZone.bottom,
          left: spec.safeZone.left,
          right: spec.safeZone.right,
        }}
      >
        {/* 字幕テキスト */}
        <div className="text-center px-8 pb-12">
          <p
            className="text-white text-2xl leading-relaxed tracking-widest"
            style={{
              fontFamily: "'Noto Serif JP', serif",
              textShadow: "0 2px 8px rgba(0,0,0,0.8)",
            }}
          >
            {subtitle}
          </p>
        </div>
      </div>

      {/* 映画風のレターボックス (オプション: 上下の黒帯) */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-black" />
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-black" />
    </div>
  );
}

/** サンプルデータ */
export const SAMPLE_CINEMA_DATA: Frame4Props = {
  aspectRatio: "reels",
  backgroundImage: undefined,
  subtitle: "あの日、私は決めた。\n「本物」を届ける美容師になると。",
};
