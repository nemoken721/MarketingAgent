/**
 * Frame 5: "The Quiz" (参加型クイズ)
 *
 * Design System v2.0 Section 2.5 準拠
 *
 * Visual Concept: エンゲージメント向上
 *
 * Layout:
 * - Header: 大きな「Q.」の文字と質問文
 * - Buttons: 2つまたは4つの選択肢エリア。
 *   ボタンは border-b-4 (下線太め) で立体感を出し、「押せそう」なデザイン
 *
 * Motion (Reels):
 * - Progress: 画面上部でカウントダウンバーが減っていく
 * - Interaction: 最後に正解のボタンが Blink (点滅) して強調される
 */

import React from "react";
import type { Frame5Props } from "../types";
import { CANVAS_SPECS, DEFAULT_BRAND } from "../types";

/** 選択肢ボタン */
function QuizOption({
  label,
  option,
  isCorrect,
  showAnswer,
  primaryColor,
}: {
  label: string;
  option: string;
  isCorrect: boolean;
  showAnswer: boolean;
  primaryColor: string;
}) {
  const baseClasses = `
    w-full
    px-8 py-6
    text-2xl font-medium
    leading-relaxed tracking-wide
    rounded-xl
    border-b-4
    transition-all duration-300
    shadow-lg shadow-slate-400/20
  `;

  // 正解表示時のスタイル
  if (showAnswer && isCorrect) {
    return (
      <button
        className={`${baseClasses} bg-green-500 border-green-700 text-white`}
      >
        <span className="flex items-center gap-4">
          <span className="text-3xl font-bold">{label}</span>
          <span className="flex-1 text-left">{option}</span>
          <span className="text-3xl">✓</span>
        </span>
      </button>
    );
  }

  // 通常状態
  return (
    <button
      className={`${baseClasses} bg-white border-slate-300 text-slate-800 hover:border-slate-400`}
    >
      <span className="flex items-center gap-4">
        <span
          className="text-3xl font-bold"
          style={{ color: primaryColor }}
        >
          {label}
        </span>
        <span className="flex-1 text-left">{option}</span>
      </span>
    </button>
  );
}

export function Frame5Quiz({
  aspectRatio,
  questionNumber = 1,
  question,
  options,
  correctIndex,
  brand,
}: Frame5Props) {
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

  // 選択肢のラベル (A, B, C, D)
  const labels = ["A", "B", "C", "D"];

  // 正解表示するかどうか (静止画では常にfalse、Remotion動画では制御)
  const showAnswer = correctIndex !== undefined;

  return (
    <div
      className="relative overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200"
      style={{
        width: spec.width,
        height: spec.height,
        aspectRatio: spec.aspectRatio,
        ...cssVariables,
      }}
    >
      {/* 背景装飾 */}
      <div
        className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-30"
        style={{ backgroundColor: "var(--primary-color)" }}
      />
      <div
        className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl opacity-20"
        style={{ backgroundColor: "var(--primary-color)" }}
      />

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
        {/* プログレスバー (Reels用) */}
        <div className="px-4 py-4">
          <div className="h-2 bg-slate-300 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: "70%",
                backgroundColor: "var(--primary-color)",
              }}
            />
          </div>
        </div>

        {/* 質問エリア */}
        <div className="flex-1 flex flex-col justify-center px-8">
          {/* Q. マーク */}
          <div className="flex items-baseline gap-4 mb-6">
            <span
              className="text-8xl font-bold"
              style={{ color: "var(--primary-color)" }}
            >
              Q{questionNumber}.
            </span>
          </div>

          {/* 質問文 */}
          <h2
            className="text-4xl font-bold text-slate-800 leading-relaxed tracking-wide mb-12"
            style={{ fontFamily: "var(--font-stack)" }}
          >
            {question}
          </h2>

          {/* 選択肢 */}
          <div className="flex flex-col gap-5">
            {options.map((option, index) => (
              <QuizOption
                key={index}
                label={labels[index]}
                option={option}
                isCorrect={index === correctIndex}
                showAnswer={showAnswer}
                primaryColor={mergedBrand.primaryColor}
              />
            ))}
          </div>
        </div>

        {/* フッター (ヒント) */}
        <div className="px-8 py-6 text-center">
          <p className="text-xl text-slate-500 tracking-wide">
            タップして回答 →
          </p>
        </div>
      </div>
    </div>
  );
}

/** サンプルデータ */
export const SAMPLE_QUIZ_DATA: Frame5Props = {
  aspectRatio: "reels",
  questionNumber: 1,
  question: "髪のダメージを\n最も防げるドライヤーの\n使い方は？",
  options: [
    "熱風で一気に乾かす",
    "冷風のみで乾かす",
    "温風→冷風の順で仕上げる",
    "自然乾燥させる",
  ],
  correctIndex: 2,
};
