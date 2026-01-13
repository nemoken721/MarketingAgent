"use client";

/**
 * Content Preview Page (Step 3: Debug UI)
 *
 * 全5フレームテンプレートが正しいサイズ（特にReelsのSafe Zone）で
 * 表示されているか確認できるデバッグ画面
 *
 * Design System v2.0 準拠
 */

import { useState } from "react";
import {
  AspectRatio,
  BrandConfig,
  CANVAS_SPECS,
  SAMPLE_CHAT_MESSAGES,
  SAMPLE_MAGAZINE_DATA,
  SAMPLE_MEMO_DATA,
  SAMPLE_CINEMA_DATA,
  SAMPLE_QUIZ_DATA,
} from "@/lib/content-engine";
import type { FrameType as ExportFrameType, ImageFormat } from "@/lib/content-engine/export";

type FrameType = "chat" | "magazine" | "memo" | "cinema" | "quiz";

const FRAME_INFO: Record<FrameType, { title: string; description: string }> = {
  chat: {
    title: "Frame 1: LINE風チャット",
    description: "The Talk - 親近感、リアルな相談",
  },
  magazine: {
    title: "Frame 2: 雑誌見出し風",
    description: "The Magazine - 権威性、ノウハウ提供",
  },
  memo: {
    title: "Frame 3: メモ風",
    description: "The Memo - エモさ、独り言、本音",
  },
  cinema: {
    title: "Frame 4: 映画字幕風",
    description: "The Cinema - 世界観、ブランディング",
  },
  quiz: {
    title: "Frame 5: クイズ",
    description: "The Quiz - エンゲージメント向上",
  },
};

/** フレームタイプをAPI用に変換 */
const FRAME_TYPE_MAP: Record<FrameType, ExportFrameType> = {
  chat: "frame1",
  magazine: "frame2",
  memo: "frame3",
  cinema: "frame4",
  quiz: "frame5",
};

/** フレームタイプに応じたサンプルデータを取得 */
function getFrameData(frame: FrameType, brand: Partial<BrandConfig>) {
  switch (frame) {
    case "chat":
      return { messages: SAMPLE_CHAT_MESSAGES, brand };
    case "magazine":
      return { ...SAMPLE_MAGAZINE_DATA, brand };
    case "memo":
      return { ...SAMPLE_MEMO_DATA, brand };
    case "cinema":
      return { ...SAMPLE_CINEMA_DATA, brand };
    case "quiz":
      return { ...SAMPLE_QUIZ_DATA, brand };
  }
}

export default function ContentPreviewPage() {
  const [selectedFrame, setSelectedFrame] = useState<FrameType>("chat");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("reels");
  const [showDebug, setShowDebug] = useState(true);
  const [primaryColor, setPrimaryColor] = useState("#3B82F6");
  const [fontStack, setFontStack] = useState<"sans-serif" | "serif">("sans-serif");
  const [radiusStyle, setRadiusStyle] = useState<"pop" | "sharp">("pop");
  const [exportFormat, setExportFormat] = useState<ImageFormat>("png");
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ url?: string; error?: string } | null>(null);

  const spec = CANVAS_SPECS[aspectRatio];
  const brand: Partial<BrandConfig> = { primaryColor, fontStack, radiusStyle };
  const previewScale = aspectRatio === "reels" ? 0.35 : 0.45;

  /** 画像エクスポート */
  const handleExport = async () => {
    setIsExporting(true);
    setExportResult(null);

    try {
      const response = await fetch("/api/export/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frameType: FRAME_TYPE_MAP[selectedFrame],
          aspectRatio,
          data: getFrameData(selectedFrame, brand),
          format: exportFormat,
          quality: exportFormat === "jpeg" ? 90 : undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setExportResult({ url: result.imageUrl });
      } else {
        setExportResult({ error: result.error || "エクスポートに失敗しました" });
      }
    } catch (error) {
      setExportResult({ error: "ネットワークエラーが発生しました" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Marty Content Engine - Preview</h1>
        <p className="text-slate-400 mb-8">Design System v2.0 準拠 | 全5フレームテンプレート</p>

        {/* フレーム選択タブ */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(Object.keys(FRAME_INFO) as FrameType[]).map((frame) => (
            <button
              key={frame}
              onClick={() => setSelectedFrame(frame)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedFrame === frame
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {FRAME_INFO[frame].title}
            </button>
          ))}
        </div>

        {/* コントロールパネル */}
        <div className="bg-slate-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Control Panel</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Aspect Ratio</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
              >
                <option value="reels">Reels (9:16)</option>
                <option value="feed">Feed (4:5)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Primary Color</label>
              <div className="flex gap-2">
                <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
                <input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm font-mono" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Font Stack</label>
              <select value={fontStack} onChange={(e) => setFontStack(e.target.value as "sans-serif" | "serif")} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm">
                <option value="sans-serif">ゴシック体</option>
                <option value="serif">明朝体</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Radius Style</label>
              <select value={radiusStyle} onChange={(e) => setRadiusStyle(e.target.value as "pop" | "sharp")} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm">
                <option value="pop">Pop (丸め)</option>
                <option value="sharp">Sharp (四角)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Debug Mode</label>
              <button
                onClick={() => setShowDebug(!showDebug)}
                className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showDebug ? "bg-green-600 hover:bg-green-700" : "bg-slate-700 hover:bg-slate-600"}`}
              >
                Safe Zone: {showDebug ? "ON" : "OFF"}
              </button>
            </div>
          </div>

          {/* エクスポートセクション */}
          <div className="mt-6 pt-6 border-t border-slate-700">
            <h3 className="text-md font-semibold mb-4">画像エクスポート (10pt)</h3>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Format</label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as ImageFormat)}
                  className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="png">PNG</option>
                  <option value="jpeg">JPEG</option>
                </select>
              </div>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isExporting
                    ? "bg-slate-600 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isExporting ? "エクスポート中..." : "画像をエクスポート"}
              </button>
              {exportResult?.url && (
                <a
                  href={exportResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 transition-colors"
                >
                  ダウンロード
                </a>
              )}
              {exportResult?.error && (
                <span className="text-red-400 text-sm">{exportResult.error}</span>
              )}
            </div>
          </div>
        </div>

        {/* スペック情報 */}
        <div className="bg-slate-800/50 rounded-lg p-4 mb-8 font-mono text-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><span className="text-slate-400">Resolution:</span><span className="ml-2">{spec.width}×{spec.height}</span></div>
            <div><span className="text-slate-400">Safe Top/Bottom:</span><span className="ml-2">{spec.safeZone.top}px</span></div>
            <div><span className="text-slate-400">Safe Left/Right:</span><span className="ml-2">{spec.safeZone.left}px</span></div>
            <div><span className="text-slate-400">Content Area:</span><span className="ml-2">{spec.width - spec.safeZone.left - spec.safeZone.right}×{spec.height - spec.safeZone.top - spec.safeZone.bottom}</span></div>
          </div>
        </div>

        {/* プレビューエリア */}
        <div className="flex flex-col items-center">
          <div className="text-center mb-4">
            <h2 className="text-xl font-semibold">{FRAME_INFO[selectedFrame].title}</h2>
            <p className="text-slate-400">{FRAME_INFO[selectedFrame].description}</p>
          </div>

          <div className="relative bg-slate-800 rounded-2xl p-8 overflow-hidden" style={{ boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }}>
            <div className="absolute top-2 right-2 text-xs text-slate-500 font-mono z-10">Scale: {Math.round(previewScale * 100)}%</div>
            <div style={{ transform: `scale(${previewScale})`, transformOrigin: "top left", width: spec.width, height: spec.height }}>
              <FramePreview frame={selectedFrame} aspectRatio={aspectRatio} brand={brand} showDebug={showDebug} />
            </div>
            <div style={{ width: spec.width * previewScale, height: spec.height * previewScale }} />
          </div>

          <p className="mt-4 text-sm text-slate-500">
            実寸: {spec.width}×{spec.height}px (表示: {Math.round(spec.width * previewScale)}×{Math.round(spec.height * previewScale)}px)
          </p>
        </div>
      </div>
    </div>
  );
}

function FramePreview({ frame, aspectRatio, brand, showDebug }: { frame: FrameType; aspectRatio: AspectRatio; brand: Partial<BrandConfig>; showDebug: boolean }) {
  const spec = CANVAS_SPECS[aspectRatio];
  const mergedBrand = { primaryColor: brand.primaryColor || "#3B82F6", fontStack: brand.fontStack || "sans-serif", radiusStyle: brand.radiusStyle || "pop" };

  const cssVariables = {
    "--primary-color": mergedBrand.primaryColor,
    "--font-stack": mergedBrand.fontStack === "serif" ? "'Noto Serif JP', serif" : "'Noto Sans JP', sans-serif",
    "--radius-md": mergedBrand.radiusStyle === "pop" ? "1rem" : "0px",
  } as React.CSSProperties;

  const DebugOverlay = () => (
    <>
      <div className="absolute left-0 right-0 top-0 bg-red-500/30 z-50 pointer-events-none flex items-end justify-center pb-2" style={{ height: spec.safeZone.top }}>
        <span className="text-red-200 text-lg font-mono">Safe Zone: {spec.safeZone.top}px</span>
      </div>
      <div className="absolute left-0 right-0 bottom-0 bg-red-500/30 z-50 pointer-events-none flex items-start justify-center pt-2" style={{ height: spec.safeZone.bottom }}>
        <span className="text-red-200 text-lg font-mono">Safe Zone: {spec.safeZone.bottom}px</span>
      </div>
      <div className="absolute left-0 top-0 bottom-0 bg-blue-500/30 z-50 pointer-events-none" style={{ width: spec.safeZone.left }} />
      <div className="absolute right-0 top-0 bottom-0 bg-blue-500/30 z-50 pointer-events-none" style={{ width: spec.safeZone.right }} />
      <div className="absolute top-2 right-12 z-50 bg-black/70 text-white text-lg font-mono px-3 py-1 rounded">{spec.width}×{spec.height}</div>
    </>
  );

  const renderFrame = () => {
    switch (frame) {
      case "chat": return <Frame1Preview spec={spec} />;
      case "magazine": return <Frame2Preview spec={spec} />;
      case "memo": return <Frame3Preview spec={spec} />;
      case "cinema": return <Frame4Preview spec={spec} />;
      case "quiz": return <Frame5Preview spec={spec} />;
    }
  };

  return (
    <div className="relative overflow-hidden" style={{ width: spec.width, height: spec.height, aspectRatio: spec.aspectRatio, ...cssVariables }}>
      {renderFrame()}
      {showDebug && <DebugOverlay />}
    </div>
  );
}

// Frame 1: Chat
function Frame1Preview({ spec }: { spec: typeof CANVAS_SPECS["reels"] }) {
  return (
    <>
      <div className="absolute inset-0 bg-slate-100" />
      <div className="absolute flex flex-col" style={{ top: spec.safeZone.top, bottom: spec.safeZone.bottom, left: spec.safeZone.left, right: spec.safeZone.right }}>
        <div className="flex items-center justify-center py-6 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
          <span className="font-sans text-3xl font-medium text-slate-700 tracking-wide">お店とのトーク</span>
        </div>
        <div className="flex-1 flex flex-col justify-end px-8 pb-12 overflow-hidden">
          <div className="flex flex-col gap-8">
            {SAMPLE_CHAT_MESSAGES.map((msg) => (
              <div key={msg.id} className={`flex w-full ${msg.sender === "shop" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] px-8 py-6 text-3xl leading-relaxed tracking-wide ${msg.sender === "shop" ? "bg-[var(--primary-color)] text-white rounded-[var(--radius-md)] rounded-tr-none shadow-md" : "bg-white text-slate-800 rounded-[var(--radius-md)] rounded-tl-none shadow-sm"} shadow-slate-400/20`}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// Frame 2: Magazine
function Frame2Preview({ spec }: { spec: typeof CANVAS_SPECS["reels"] }) {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-400" />
      <div className="absolute inset-0 bg-white/90" />
      <div className="absolute flex flex-col justify-center" style={{ top: spec.safeZone.top, bottom: spec.safeZone.bottom, left: spec.safeZone.left, right: spec.safeZone.right }}>
        <div className="px-8">
          <p className="text-2xl italic text-slate-400 tracking-widest mb-4" style={{ fontFamily: "Georgia, serif" }}>{SAMPLE_MAGAZINE_DATA.decorativeText}</p>
          <h1 className="font-serif text-6xl font-bold text-slate-800 leading-tight tracking-wide mb-6 whitespace-pre-line">{SAMPLE_MAGAZINE_DATA.title}</h1>
          <div className="w-32 border-b-2 border-slate-300 mb-8" />
          {SAMPLE_MAGAZINE_DATA.subtitle && <p className="text-2xl text-slate-600 leading-relaxed tracking-wide max-w-[80%]">{SAMPLE_MAGAZINE_DATA.subtitle}</p>}
          <div className="mt-12 w-16 h-2 rounded-full" style={{ backgroundColor: "var(--primary-color)" }} />
        </div>
      </div>
    </>
  );
}

// Frame 3: Memo
function Frame3Preview({ spec }: { spec: typeof CANVAS_SPECS["reels"] }) {
  const lines = SAMPLE_MEMO_DATA.content.split("\n");
  const now = new Date();
  const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;

  return (
    <>
      <div className="absolute inset-0 bg-yellow-50" />
      <div className="absolute flex flex-col" style={{ top: spec.safeZone.top, bottom: spec.safeZone.bottom, left: spec.safeZone.left, right: spec.safeZone.right }}>
        <div className="flex items-center justify-between px-8 py-4 text-slate-600">
          <span className="text-2xl font-medium">{timeStr}</span>
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" /></svg>
            <div className="w-8 h-4 border-2 border-slate-600 rounded-sm relative"><div className="absolute inset-0.5 bg-slate-600 rounded-sm" style={{ width: "80%" }} /></div>
          </div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2 text-amber-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            <span className="text-xl">メモ</span>
          </div>
        </div>
        <div className="flex-1 px-8 py-6 overflow-hidden">
          {lines.map((line, i) => <div key={i} className="py-4 text-3xl leading-loose tracking-wide text-slate-800 border-b border-slate-200">{line || "\u00A0"}</div>)}
        </div>
      </div>
    </>
  );
}

// Frame 4: Cinema
function Frame4Preview({ spec }: { spec: typeof CANVAS_SPECS["reels"] }) {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" style={{ top: "50%" }} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" style={{ bottom: "70%" }} />
      <div className="absolute top-0 left-0 right-0 h-16 bg-black" />
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-black" />
      <div className="absolute flex flex-col justify-end items-center" style={{ top: spec.safeZone.top, bottom: spec.safeZone.bottom, left: spec.safeZone.left, right: spec.safeZone.right }}>
        <div className="text-center px-8 pb-12">
          <p className="text-white text-2xl leading-relaxed tracking-widest whitespace-pre-line" style={{ fontFamily: "'Noto Serif JP', serif", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>{SAMPLE_CINEMA_DATA.subtitle}</p>
        </div>
      </div>
    </>
  );
}

// Frame 5: Quiz
function Frame5Preview({ spec }: { spec: typeof CANVAS_SPECS["reels"] }) {
  const labels = ["A", "B", "C", "D"];
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200" />
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-30" style={{ backgroundColor: "var(--primary-color)" }} />
      <div className="absolute flex flex-col" style={{ top: spec.safeZone.top, bottom: spec.safeZone.bottom, left: spec.safeZone.left, right: spec.safeZone.right }}>
        <div className="px-4 py-4">
          <div className="h-2 bg-slate-300 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: "70%", backgroundColor: "var(--primary-color)" }} />
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center px-8">
          <span className="text-8xl font-bold mb-6" style={{ color: "var(--primary-color)" }}>Q{SAMPLE_QUIZ_DATA.questionNumber}.</span>
          <h2 className="text-4xl font-bold text-slate-800 leading-relaxed tracking-wide mb-12 whitespace-pre-line">{SAMPLE_QUIZ_DATA.question}</h2>
          <div className="flex flex-col gap-5">
            {SAMPLE_QUIZ_DATA.options.map((opt, i) => (
              <div key={i} className="w-full px-8 py-6 text-2xl font-medium leading-relaxed tracking-wide rounded-xl border-b-4 bg-white border-slate-300 text-slate-800 shadow-lg shadow-slate-400/20">
                <span className="flex items-center gap-4">
                  <span className="text-3xl font-bold" style={{ color: "var(--primary-color)" }}>{labels[i]}</span>
                  <span className="flex-1 text-left">{opt}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="px-8 py-6 text-center"><p className="text-xl text-slate-500 tracking-wide">タップして回答 →</p></div>
      </div>
    </>
  );
}
