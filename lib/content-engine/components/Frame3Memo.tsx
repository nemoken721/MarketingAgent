/**
 * Frame 3: "The Memo" (スマホメモ/SNS風)
 *
 * Design System v2.0 Section 2.3 準拠
 *
 * Visual Concept: エモさ、独り言、本音
 *
 * Layout:
 * - UI Components: 上部にフェイクのステータスバー（時計・Wifi・バッテリー）
 * - Canvas: 背景は bg-white または bg-yellow-50 (クリーム色)
 * - Typography: 手書き風フォント、または font-sans。行間は leading-loose (2.0)
 * - 罫線 (border-b) オプションあり
 *
 * Motion (Reels):
 * - Text: Typewriter Effect (カーソルが点滅しながら一文字ずつ打たれる演出)
 */

import React from "react";
import type { Frame3Props } from "../types";
import { CANVAS_SPECS, DEFAULT_BRAND } from "../types";

/** フェイクステータスバー */
function FakeStatusBar() {
  const now = new Date();
  const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="flex items-center justify-between px-8 py-4 text-slate-600">
      {/* 時刻 */}
      <span className="text-2xl font-medium">{timeStr}</span>

      {/* 右側アイコン群 */}
      <div className="flex items-center gap-3">
        {/* WiFiアイコン */}
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
        </svg>
        {/* バッテリーアイコン */}
        <div className="flex items-center gap-1">
          <div className="w-8 h-4 border-2 border-slate-600 rounded-sm relative">
            <div className="absolute inset-0.5 bg-slate-600 rounded-sm" style={{ width: "80%" }} />
          </div>
          <div className="w-1 h-2 bg-slate-600 rounded-r-sm" />
        </div>
      </div>
    </div>
  );
}

/** メモアプリ風ヘッダー */
function MemoHeader() {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
      {/* 戻るボタン */}
      <div className="flex items-center gap-2 text-amber-600">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="text-xl">メモ</span>
      </div>

      {/* 共有ボタン */}
      <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
        />
      </svg>
    </div>
  );
}

export function Frame3Memo({
  aspectRatio,
  content,
  showLines = true,
  bgStyle = "cream",
  brand,
}: Frame3Props) {
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

  const bgColor = bgStyle === "cream" ? "bg-yellow-50" : "bg-white";

  // コンテンツを行に分割
  const lines = content.split("\n");

  return (
    <div
      className={`relative overflow-hidden ${bgColor}`}
      style={{
        width: spec.width,
        height: spec.height,
        aspectRatio: spec.aspectRatio,
        ...cssVariables,
      }}
    >
      {/* Safe Zone内コンテンツ */}
      <div
        className="absolute flex flex-col"
        style={{
          top: spec.safeZone.top,
          bottom: spec.safeZone.bottom,
          left: spec.safeZone.left,
          right: spec.safeZone.right,
        }}
      >
        {/* フェイクステータスバー */}
        <FakeStatusBar />

        {/* メモヘッダー */}
        <MemoHeader />

        {/* メモ本文エリア */}
        <div className="flex-1 px-8 py-6 overflow-hidden">
          <div className="flex flex-col">
            {lines.map((line, index) => (
              <div
                key={index}
                className={`
                  py-4
                  text-3xl
                  leading-loose
                  tracking-wide
                  text-slate-800
                  ${showLines ? "border-b border-slate-200" : ""}
                `}
                style={{ fontFamily: "var(--font-stack)" }}
              >
                {line || "\u00A0"} {/* 空行の場合はスペースを入れる */}
              </div>
            ))}
          </div>
        </div>

        {/* 日付 (下部) */}
        <div className="px-8 py-4 text-center">
          <p className="text-xl text-slate-400">
            {new Date().toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

/** サンプルデータ */
export const SAMPLE_MEMO_DATA: Frame3Props = {
  aspectRatio: "reels",
  content: `今日、常連のお客様から
言われた言葉。

「ここに来ると
いつも元気になれるんです」

この仕事をしていて
本当によかったと思った。

明日からも頑張ろう。`,
  showLines: true,
  bgStyle: "cream",
};
