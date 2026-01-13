/**
 * Satori用フレームコンポーネント
 *
 * Satoriはインラインスタイルのみをサポートするため、
 * Tailwind CSSクラスではなくstyleオブジェクトを使用
 */

import { CANVAS_SPECS, DEFAULT_BRAND } from "../types";
import type { AspectRatio, BrandConfig, ChatMessage } from "../types";

/** キャンバスサイズを取得 */
function getCanvasSize(aspectRatio: AspectRatio) {
  const spec = CANVAS_SPECS[aspectRatio];
  return {
    width: spec.width,
    height: spec.height,
    safeZone: spec.safeZone,
  };
}

/** ブランド設定をマージ */
function mergeBrand(brand?: Partial<BrandConfig>): BrandConfig {
  return { ...DEFAULT_BRAND, ...brand };
}

/** フォントファミリーを取得 */
function getFontFamily(fontStack: "sans-serif" | "serif"): string {
  return fontStack === "serif" ? "Noto Serif JP" : "Noto Sans JP";
}

// ============================================
// Frame 1: LINE風チャット (The Talk)
// ============================================

interface Frame1Props {
  aspectRatio: AspectRatio;
  messages: ChatMessage[];
  brand?: Partial<BrandConfig>;
  headerTitle?: string;
}

export function SatoriFrame1Chat({
  aspectRatio,
  messages,
  brand,
  headerTitle,
}: Frame1Props) {
  const { width, height, safeZone } = getCanvasSize(aspectRatio);
  const mergedBrand = mergeBrand(brand);
  const fontFamily = getFontFamily(mergedBrand.fontStack);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width,
        height,
        backgroundColor: "#f1f5f9", // slate-100
        fontFamily,
      }}
    >
      {/* ヘッダー */}
      {headerTitle && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            borderBottom: "1px solid #e2e8f0",
            backgroundColor: "rgba(255, 255, 255, 0.8)",
          }}
        >
          <span
            style={{
              fontSize: "20px",
              fontWeight: 500,
              color: "#334155",
              letterSpacing: "0.025em",
            }}
          >
            {headerTitle}
          </span>
        </div>
      )}

      {/* チャットエリア */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "flex-end",
          padding: `${safeZone.top}px ${safeZone.left}px ${safeZone.bottom}px ${safeZone.right}px`,
          gap: "24px",
        }}
      >
        {messages.map((message, index) => {
          const isShop = message.sender === "shop";
          return (
            <div
              key={index}
              style={{
                display: "flex",
                width: "100%",
                justifyContent: isShop ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "75%",
                  padding: "16px 24px",
                  fontSize: "24px",
                  lineHeight: 1.625,
                  letterSpacing: "0.025em",
                  backgroundColor: isShop ? mergedBrand.primaryColor : "#ffffff",
                  color: isShop ? "#ffffff" : "#1e293b",
                  borderRadius: isShop
                    ? "16px 0 16px 16px"
                    : "0 16px 16px 16px",
                  boxShadow: isShop
                    ? "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                    : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                }}
              >
                {message.content}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// Frame 2: 雑誌見出し風 (The Magazine)
// ============================================

interface Frame2Props {
  aspectRatio: AspectRatio;
  backgroundImage?: string;
  title: string;
  subtitle?: string;
  decorativeText?: string;
  brand?: Partial<BrandConfig>;
}

export function SatoriFrame2Magazine({
  aspectRatio,
  backgroundImage,
  title,
  subtitle,
  decorativeText = "Professional Tips",
  brand,
}: Frame2Props) {
  const { width, height, safeZone } = getCanvasSize(aspectRatio);
  const mergedBrand = mergeBrand(brand);

  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width,
        height,
        overflow: "hidden",
      }}
    >
      {/* 背景 */}
      {backgroundImage ? (
        <img
          src={backgroundImage}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)",
          }}
        />
      )}

      {/* 白オーバーレイ */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
        }}
      />

      {/* コンテンツ */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          position: "absolute",
          top: safeZone.top,
          bottom: safeZone.bottom,
          left: safeZone.left,
          right: safeZone.right,
          padding: "32px",
        }}
      >
        {/* 装飾テキスト */}
        <p
          style={{
            fontSize: "24px",
            fontStyle: "italic",
            color: "#94a3b8",
            letterSpacing: "0.1em",
            marginBottom: "16px",
            fontFamily: "Georgia, serif",
          }}
        >
          {decorativeText}
        </p>

        {/* メインタイトル */}
        <h1
          style={{
            fontSize: "60px",
            fontWeight: 700,
            color: "#1e293b",
            lineHeight: 1.2,
            letterSpacing: "0.025em",
            marginBottom: "24px",
            fontFamily: "Noto Serif JP",
            whiteSpace: "pre-wrap",
          }}
        >
          {title}
        </h1>

        {/* 区切り線 */}
        <div
          style={{
            width: "128px",
            height: "2px",
            backgroundColor: "#cbd5e1",
            marginBottom: "32px",
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
              fontFamily: "Noto Sans JP",
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
            backgroundColor: mergedBrand.primaryColor,
            borderRadius: "4px",
          }}
        />
      </div>
    </div>
  );
}

// ============================================
// Frame 3: メモ風 (The Memo)
// ============================================

interface Frame3Props {
  aspectRatio: AspectRatio;
  content: string;
  showLines?: boolean;
  bgStyle?: "white" | "cream";
  brand?: Partial<BrandConfig>;
}

export function SatoriFrame3Memo({
  aspectRatio,
  content,
  showLines = true,
  bgStyle = "cream",
  brand,
}: Frame3Props) {
  const { width, height, safeZone } = getCanvasSize(aspectRatio);
  const mergedBrand = mergeBrand(brand);
  const fontFamily = getFontFamily(mergedBrand.fontStack);
  const bgColor = bgStyle === "cream" ? "#fefce8" : "#ffffff";

  const lines = content.split("\n");
  const now = new Date();
  const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
  const dateStr = now.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width,
        height,
        backgroundColor: bgColor,
        fontFamily,
      }}
    >
      {/* Safe Zone内 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          position: "absolute",
          top: safeZone.top,
          bottom: safeZone.bottom,
          left: safeZone.left,
          right: safeZone.right,
        }}
      >
        {/* ステータスバー */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 32px",
            color: "#475569",
          }}
        >
          <span style={{ fontSize: "24px", fontWeight: 500 }}>{timeStr}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "16px" }}>📶</span>
            <span style={{ fontSize: "16px" }}>🔋</span>
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
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#d97706" }}>
            <span style={{ fontSize: "20px" }}>←</span>
            <span style={{ fontSize: "20px" }}>メモ</span>
          </div>
          <span style={{ fontSize: "20px", color: "#d97706" }}>↑</span>
        </div>

        {/* メモ本文 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "24px 32px",
          }}
        >
          {lines.map((line, index) => (
            <div
              key={index}
              style={{
                padding: "16px 0",
                fontSize: "30px",
                lineHeight: 2,
                letterSpacing: "0.025em",
                color: "#1e293b",
                borderBottom: showLines ? "1px solid #e2e8f0" : "none",
              }}
            >
              {line || "\u00A0"}
            </div>
          ))}
        </div>

        {/* 日付 */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <p style={{ fontSize: "20px", color: "#94a3b8" }}>{dateStr}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Frame 4: 映画字幕風 (The Cinema)
// ============================================

interface Frame4Props {
  aspectRatio: AspectRatio;
  backgroundImage?: string;
  subtitle: string;
  brand?: Partial<BrandConfig>;
}

export function SatoriFrame4Cinema({
  aspectRatio,
  backgroundImage,
  subtitle,
  brand,
}: Frame4Props) {
  const { width, height, safeZone } = getCanvasSize(aspectRatio);
  const mergedBrand = mergeBrand(brand);

  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width,
        height,
        overflow: "hidden",
      }}
    >
      {/* 背景 */}
      {backgroundImage ? (
        <img
          src={backgroundImage}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background:
              "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          }}
        />
      )}

      {/* 下部グラデーション */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          bottom: 0,
          background:
            "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)",
        }}
      />

      {/* 上部グラデーション */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "30%",
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 100%)",
        }}
      />

      {/* レターボックス上 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "64px",
          backgroundColor: "#000000",
        }}
      />

      {/* レターボックス下 */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "64px",
          backgroundColor: "#000000",
        }}
      />

      {/* 字幕 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          alignItems: "center",
          position: "absolute",
          top: safeZone.top,
          bottom: safeZone.bottom,
          left: safeZone.left,
          right: safeZone.right,
        }}
      >
        <div
          style={{
            display: "flex",
            textAlign: "center",
            padding: "32px 48px",
          }}
        >
          <p
            style={{
              color: "#ffffff",
              fontSize: "24px",
              lineHeight: 1.625,
              letterSpacing: "0.1em",
              fontFamily: "Noto Serif JP",
              textShadow: "0 2px 8px rgba(0,0,0,0.8)",
              whiteSpace: "pre-wrap",
            }}
          >
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Frame 5: クイズ (The Quiz)
// ============================================

interface Frame5Props {
  aspectRatio: AspectRatio;
  questionNumber?: number;
  question: string;
  options: string[];
  correctIndex?: number;
  brand?: Partial<BrandConfig>;
}

export function SatoriFrame5Quiz({
  aspectRatio,
  questionNumber = 1,
  question,
  options,
  correctIndex,
  brand,
}: Frame5Props) {
  const { width, height, safeZone } = getCanvasSize(aspectRatio);
  const mergedBrand = mergeBrand(brand);
  const fontFamily = getFontFamily(mergedBrand.fontStack);
  const labels = ["A", "B", "C", "D"];
  const showAnswer = correctIndex !== undefined;

  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width,
        height,
        background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
        fontFamily,
      }}
    >
      {/* 背景装飾 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "384px",
          height: "384px",
          borderRadius: "50%",
          backgroundColor: mergedBrand.primaryColor,
          opacity: 0.3,
          filter: "blur(48px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "256px",
          height: "256px",
          borderRadius: "50%",
          backgroundColor: mergedBrand.primaryColor,
          opacity: 0.2,
          filter: "blur(48px)",
        }}
      />

      {/* コンテンツ */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          position: "absolute",
          top: safeZone.top,
          bottom: safeZone.bottom,
          left: safeZone.left,
          right: safeZone.right,
        }}
      >
        {/* プログレスバー */}
        <div style={{ padding: "16px" }}>
          <div
            style={{
              height: "8px",
              backgroundColor: "#cbd5e1",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: "70%",
                backgroundColor: mergedBrand.primaryColor,
                borderRadius: "4px",
              }}
            />
          </div>
        </div>

        {/* 質問エリア */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            padding: "0 32px",
          }}
        >
          {/* Q. マーク */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            <span
              style={{
                fontSize: "80px",
                fontWeight: 700,
                color: mergedBrand.primaryColor,
              }}
            >
              Q{questionNumber}.
            </span>
          </div>

          {/* 質問文 */}
          <h2
            style={{
              fontSize: "40px",
              fontWeight: 700,
              color: "#1e293b",
              lineHeight: 1.625,
              letterSpacing: "0.025em",
              marginBottom: "48px",
              whiteSpace: "pre-wrap",
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
            {options.map((option, index) => {
              const isCorrect = index === correctIndex;
              const bgColor =
                showAnswer && isCorrect ? "#22c55e" : "#ffffff";
              const borderColor =
                showAnswer && isCorrect ? "#15803d" : "#cbd5e1";
              const textColor =
                showAnswer && isCorrect ? "#ffffff" : "#1e293b";

              return (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    width: "100%",
                    padding: "24px 32px",
                    fontSize: "24px",
                    fontWeight: 500,
                    backgroundColor: bgColor,
                    color: textColor,
                    borderRadius: "12px",
                    borderBottom: `4px solid ${borderColor}`,
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "30px",
                      fontWeight: 700,
                      color:
                        showAnswer && isCorrect
                          ? "#ffffff"
                          : mergedBrand.primaryColor,
                    }}
                  >
                    {labels[index]}
                  </span>
                  <span style={{ flex: 1 }}>{option}</span>
                  {showAnswer && isCorrect && (
                    <span style={{ fontSize: "30px" }}>✓</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* フッター */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "24px",
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
    </div>
  );
}
