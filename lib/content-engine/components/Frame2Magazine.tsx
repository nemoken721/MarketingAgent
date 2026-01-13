/**
 * Frame 2: "The Magazine" (雑誌見出し風)
 *
 * Design System v2.0 Section 2.2 準拠
 *
 * Visual Concept: 権威性、ノウハウ提供
 *
 * Layout:
 * - Structure: 画像とテキストの境界線を明確にする、
 *   または全画面画像に白のオーバーレイ (bg-white/90) を重ねる
 * - Typography: タイトルは font-serif (明朝体), text-3xl, font-bold
 * - Decoration: タイトルの下に細いボーダー (border-b-2 border-slate-300)
 *   装飾用の英語筆記体 (font-script)
 *
 * Motion (Reels):
 * - Image: 背景画像を Slow Zoom-Out (Ken Burns Effect)
 * - Text: タイトルと本文を左から Staggered Slide-In (時間差スライド)
 */

import React from "react";
import type { Frame2Props } from "../types";
import { CANVAS_SPECS, DEFAULT_BRAND } from "../types";

export function Frame2Magazine({
  aspectRatio,
  backgroundImage,
  title,
  subtitle,
  decorativeText = "Professional Tips",
  brand,
}: Frame2Props) {
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
        <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-400" />
      )}

      {/* 白オーバーレイ */}
      <div className="absolute inset-0 bg-white/90" />

      {/* Safe Zone内コンテンツ */}
      <div
        className="absolute flex flex-col justify-center"
        style={{
          top: spec.safeZone.top,
          bottom: spec.safeZone.bottom,
          left: spec.safeZone.left,
          right: spec.safeZone.right,
        }}
      >
        <div className="px-8">
          {/* 装飾用英語テキスト (上部) */}
          <p
            className="text-2xl italic text-slate-400 tracking-widest mb-4"
            style={{ fontFamily: "Georgia, serif" }}
          >
            {decorativeText}
          </p>

          {/* メインタイトル (明朝体) */}
          <h1
            className="font-serif text-6xl font-bold text-slate-800 leading-tight tracking-wide mb-6"
            style={{ fontFamily: "'Noto Serif JP', serif" }}
          >
            {title}
          </h1>

          {/* 区切り線 */}
          <div className="w-32 border-b-2 border-slate-300 mb-8" />

          {/* サブタイトル/本文 */}
          {subtitle && (
            <p className="text-2xl text-slate-600 leading-relaxed tracking-wide max-w-[80%]">
              {subtitle}
            </p>
          )}

          {/* ブランドアクセント (下部) */}
          <div
            className="mt-12 w-16 h-2 rounded-full"
            style={{ backgroundColor: "var(--primary-color)" }}
          />
        </div>
      </div>
    </div>
  );
}

/** サンプルデータ */
export const SAMPLE_MAGAZINE_DATA: Frame2Props = {
  aspectRatio: "reels",
  title: "プロが教える\n髪のダメージケア\n5つの習慣",
  subtitle:
    "毎日のちょっとした心がけで、サロン帰りのような美髪をキープできます。",
  decorativeText: "Beauty Professional Tips",
  backgroundImage: undefined,
};
