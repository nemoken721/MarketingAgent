/**
 * Frame 1: LINE風チャット - Remotion Composition
 *
 * アニメーション:
 * - チャットバブルが下から順にスライドイン + フェードイン
 * - 1.5-2.0秒間隔で表示
 */

import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { Frame1Props, ChatMessage } from "../../types";
import { CANVAS_SPECS, DEFAULT_BRAND } from "../../types";
import { slideInFromBottom, staggeredDelay, fadeIn } from "../animations";

export const Frame1ChatComposition: React.FC<Frame1Props> = ({
  aspectRatio,
  messages,
  brand,
  headerTitle = "お店とのトーク",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
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

  // ヘッダーのフェードイン
  const headerOpacity = fadeIn(frame, 0, 15);

  return (
    <AbsoluteFill style={cssVariables}>
      {/* 背景 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "#f1f5f9", // bg-slate-100
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
        {/* ヘッダー */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px 0",
            borderBottom: "1px solid #e2e8f0",
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(4px)",
            opacity: headerOpacity,
          }}
        >
          <span
            style={{
              fontFamily: "'Noto Sans JP', sans-serif",
              fontSize: "30px",
              fontWeight: 500,
              color: "#334155",
              letterSpacing: "0.025em",
            }}
          >
            {headerTitle}
          </span>
        </div>

        {/* チャットエリア */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "0 32px 48px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "32px",
            }}
          >
            {messages.map((msg, index) => (
              <ChatBubble
                key={msg.id}
                message={msg}
                frame={frame}
                fps={fps}
                index={index}
                primaryColor={mergedBrand.primaryColor}
                radiusStyle={mergedBrand.radiusStyle}
              />
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** チャットバブル (アニメーション付き) */
function ChatBubble({
  message,
  frame,
  fps,
  index,
  primaryColor,
  radiusStyle,
}: {
  message: ChatMessage;
  frame: number;
  fps: number;
  index: number;
  primaryColor: string;
  radiusStyle: "pop" | "sharp";
}) {
  const delay = staggeredDelay(index, 45); // 1.5秒間隔
  const { translateY, opacity } = slideInFromBottom(frame, delay, fps, 80);

  const isShop = message.sender === "shop";
  const borderRadius = radiusStyle === "pop" ? "16px" : "0px";

  const bubbleStyle: React.CSSProperties = {
    maxWidth: "75%",
    padding: "24px 32px",
    fontSize: "30px",
    lineHeight: 1.625,
    letterSpacing: "0.025em",
    borderRadius,
    boxShadow: "0 4px 6px -1px rgba(148, 163, 184, 0.2)",
    transform: `translateY(${translateY}px)`,
    opacity,
    ...(isShop
      ? {
          backgroundColor: primaryColor,
          color: "#ffffff",
          borderTopRightRadius: "0",
        }
      : {
          backgroundColor: "#ffffff",
          color: "#1e293b",
          borderTopLeftRadius: "0",
        }),
  };

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        justifyContent: isShop ? "flex-end" : "flex-start",
      }}
    >
      <div style={bubbleStyle}>{message.content}</div>
    </div>
  );
}
