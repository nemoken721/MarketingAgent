/**
 * Canvas Component
 *
 * 全てのフレームの親コンテナ。
 * アスペクト比に応じてSafe Zoneを動的に適用。
 *
 * Design System v2.0 Section 0 準拠:
 * - Reels (9:16): 1080x1920, Safe Zone 200px top/bottom, 40px sides
 * - Feed (4:5): 1080x1350, 60px uniform padding
 */

import React from "react";
import { AspectRatio, CANVAS_SPECS, BrandConfig, DEFAULT_BRAND } from "../types";

interface CanvasProps {
  /** アスペクト比モード */
  aspectRatio: AspectRatio;
  /** ブランド設定 */
  brand?: Partial<BrandConfig>;
  /** 背景クラス (オプション) */
  bgClassName?: string;
  /** Safe Zone内のコンテンツ */
  children: React.ReactNode;
  /** デバッグモード: Safe Zoneを可視化 */
  debug?: boolean;
}

export function Canvas({
  aspectRatio,
  brand,
  bgClassName = "bg-slate-100",
  children,
  debug = false,
}: CanvasProps) {
  const spec = CANVAS_SPECS[aspectRatio];
  const mergedBrand = { ...DEFAULT_BRAND, ...brand };

  // CSS変数としてブランド設定を注入
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
      {/* 背景レイヤー (全画面) */}
      <div className={`absolute inset-0 ${bgClassName}`} />

      {/* デバッグ: Safe Zone外の領域を可視化 */}
      {debug && (
        <>
          {/* Top Safe Zone */}
          <div
            className="absolute left-0 right-0 top-0 bg-red-500/30 z-50 pointer-events-none"
            style={{ height: spec.safeZone.top }}
          >
            <span className="absolute bottom-2 left-2 text-xs text-red-800 font-mono">
              Safe Zone Top: {spec.safeZone.top}px
            </span>
          </div>
          {/* Bottom Safe Zone */}
          <div
            className="absolute left-0 right-0 bottom-0 bg-red-500/30 z-50 pointer-events-none"
            style={{ height: spec.safeZone.bottom }}
          >
            <span className="absolute top-2 left-2 text-xs text-red-800 font-mono">
              Safe Zone Bottom: {spec.safeZone.bottom}px
            </span>
          </div>
          {/* Left Safe Zone */}
          <div
            className="absolute left-0 top-0 bottom-0 bg-blue-500/30 z-50 pointer-events-none"
            style={{ width: spec.safeZone.left }}
          />
          {/* Right Safe Zone */}
          <div
            className="absolute right-0 top-0 bottom-0 bg-blue-500/30 z-50 pointer-events-none"
            style={{ width: spec.safeZone.right }}
          />
          {/* Canvas Info */}
          <div className="absolute top-2 right-12 z-50 bg-black/70 text-white text-xs font-mono px-2 py-1 rounded">
            {spec.width}×{spec.height} ({aspectRatio})
          </div>
        </>
      )}

      {/* Safe Zone内のコンテンツ領域 */}
      <div
        className="absolute flex flex-col"
        style={{
          top: spec.safeZone.top,
          bottom: spec.safeZone.bottom,
          left: spec.safeZone.left,
          right: spec.safeZone.right,
        }}
      >
        {children}
      </div>
    </div>
  );
}
