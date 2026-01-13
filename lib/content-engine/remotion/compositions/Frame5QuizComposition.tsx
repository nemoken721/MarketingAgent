/**
 * Frame 5: クイズ - Remotion Composition
 *
 * アニメーション:
 * - プログレスバー: 減少
 * - 選択肢: 順次表示
 * - 正解: 点滅
 */

import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { Frame5Props } from "../../types";
import { CANVAS_SPECS, DEFAULT_BRAND } from "../../types";
import {
  progressBarDecrease,
  slideInFromBottom,
  staggeredDelay,
  fadeIn,
  blink,
} from "../animations";

export const Frame5QuizComposition: React.FC<Frame5Props> = ({
  aspectRatio,
  questionNumber = 1,
  question,
  options,
  correctIndex,
  brand,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const spec = CANVAS_SPECS[aspectRatio];
  const mergedBrand = { ...DEFAULT_BRAND, ...brand };

  const labels = ["A", "B", "C", "D"];

  // プログレスバー減少
  const progressWidth = progressBarDecrease(frame, 0, durationInFrames - 30, 100, 0);

  // Q. のフェードイン
  const qOpacity = fadeIn(frame, 0, 15);

  // 質問文のフェードイン
  const questionOpacity = fadeIn(frame, 15, 20);

  // 正解表示開始フレーム (最後の2秒)
  const showAnswerFrame = durationInFrames - 60;
  const showAnswer = correctIndex !== undefined && frame >= showAnswerFrame;

  return (
    <AbsoluteFill>
      {/* 背景グラデーション */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom right, #f1f5f9, #e2e8f0)",
        }}
      />

      {/* 装飾的な円 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "384px",
          height: "384px",
          borderRadius: "9999px",
          backgroundColor: mergedBrand.primaryColor,
          filter: "blur(64px)",
          opacity: 0.3,
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
        }}
      >
        {/* プログレスバー */}
        <div style={{ padding: "16px" }}>
          <div
            style={{
              height: "8px",
              backgroundColor: "#cbd5e1",
              borderRadius: "9999px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progressWidth}%`,
                backgroundColor: mergedBrand.primaryColor,
                borderRadius: "9999px",
                transition: "width 0.1s linear",
              }}
            />
          </div>
        </div>

        {/* 質問エリア */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 32px",
          }}
        >
          {/* Q. マーク */}
          <span
            style={{
              fontSize: "96px",
              fontWeight: 700,
              color: mergedBrand.primaryColor,
              marginBottom: "24px",
              opacity: qOpacity,
            }}
          >
            Q{questionNumber}.
          </span>

          {/* 質問文 */}
          <h2
            style={{
              fontSize: "36px",
              fontWeight: 700,
              color: "#1e293b",
              lineHeight: 1.625,
              letterSpacing: "0.025em",
              marginBottom: "48px",
              whiteSpace: "pre-line",
              opacity: questionOpacity,
            }}
          >
            {question}
          </h2>

          {/* 選択肢 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            {options.map((option, index) => (
              <QuizOption
                key={index}
                label={labels[index]}
                option={option}
                isCorrect={index === correctIndex}
                showAnswer={showAnswer}
                primaryColor={mergedBrand.primaryColor}
                frame={frame}
                fps={fps}
                index={index}
              />
            ))}
          </div>
        </div>

        {/* フッター */}
        <div
          style={{
            padding: "24px 32px",
            textAlign: "center",
            opacity: fadeIn(frame, 60, 15),
          }}
        >
          <p
            style={{
              fontSize: "20px",
              color: "#64748b",
              letterSpacing: "0.025em",
            }}
          >
            タップして回答 →
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** 選択肢ボタン */
function QuizOption({
  label,
  option,
  isCorrect,
  showAnswer,
  primaryColor,
  frame,
  fps,
  index,
}: {
  label: string;
  option: string;
  isCorrect: boolean;
  showAnswer: boolean;
  primaryColor: string;
  frame: number;
  fps: number;
  index: number;
}) {
  // 順次表示アニメーション
  const delay = staggeredDelay(index, 15) + 60; // 60フレーム後から開始
  const { translateY, opacity } = slideInFromBottom(frame, delay, fps, 40);

  // 正解の点滅
  const blinkOpacity = showAnswer && isCorrect ? blink(frame, 0, 8) : 1;

  const backgroundColor = showAnswer && isCorrect ? "#22c55e" : "#ffffff";
  const borderColor = showAnswer && isCorrect ? "#15803d" : "#cbd5e1";
  const textColor = showAnswer && isCorrect ? "#ffffff" : "#1e293b";

  return (
    <div
      style={{
        width: "100%",
        padding: "24px 32px",
        fontSize: "24px",
        fontWeight: 500,
        lineHeight: 1.625,
        letterSpacing: "0.025em",
        borderRadius: "12px",
        borderBottom: `4px solid ${borderColor}`,
        backgroundColor,
        color: textColor,
        boxShadow: "0 10px 15px -3px rgba(148, 163, 184, 0.2)",
        transform: `translateY(${translateY}px)`,
        opacity: opacity * blinkOpacity,
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <span
          style={{
            fontSize: "30px",
            fontWeight: 700,
            color: showAnswer && isCorrect ? "#ffffff" : primaryColor,
          }}
        >
          {label}
        </span>
        <span style={{ flex: 1, textAlign: "left" }}>{option}</span>
        {showAnswer && isCorrect && (
          <span style={{ fontSize: "30px" }}>✓</span>
        )}
      </span>
    </div>
  );
}
