"use client";

import { useState } from "react";
import { Download, ExternalLink, Loader2, ImageIcon, Film } from "lucide-react";
import { Frame1Chat } from "@/lib/content-engine/components/Frame1Chat";
import { Frame2Magazine } from "@/lib/content-engine/components/Frame2Magazine";
import { Frame3Memo } from "@/lib/content-engine/components/Frame3Memo";
import { Frame4Cinema } from "@/lib/content-engine/components/Frame4Cinema";
import { Frame5Quiz } from "@/lib/content-engine/components/Frame5Quiz";
import type { AspectRatio } from "@/lib/content-engine/types";

interface ContentFramePreviewProps {
  data: {
    success: boolean;
    frameType: "frame1" | "frame2" | "frame3" | "frame4" | "frame5";
    frameTypeName: string;
    aspectRatio: AspectRatio;
    aspectRatioName: string;
    data: Record<string, unknown>;
    previewUrl?: string; // オプショナル（Canvas表示時は不要）
    message: string;
    error?: string;
  };
}

/** フレームコンポーネントを動的にレンダリング */
function renderFrame(
  frameType: string,
  aspectRatio: AspectRatio,
  data: Record<string, unknown>
) {
  const brandConfig = {
    primaryColor: "#6366f1",
    fontStack: "sans-serif" as const,
    radiusStyle: "pop" as const,
  };

  const commonProps = {
    aspectRatio,
    brand: brandConfig,
  };

  switch (frameType) {
    case "frame1":
      return (
        <Frame1Chat
          {...commonProps}
          messages={data.messages as any[]}
          headerTitle={data.headerTitle as string}
        />
      );
    case "frame2":
      return (
        <Frame2Magazine
          {...commonProps}
          title={data.title as string}
          subtitle={data.subtitle as string}
          backgroundImage={data.backgroundImage as string}
        />
      );
    case "frame3":
      return (
        <Frame3Memo
          {...commonProps}
          content={data.content as string}
        />
      );
    case "frame4":
      return (
        <Frame4Cinema
          {...commonProps}
          subtitle={data.subtitle as string}
          backgroundImage={data.backgroundImage as string}
        />
      );
    case "frame5":
      return (
        <Frame5Quiz
          {...commonProps}
          question={data.question as string}
          options={data.options as string[]}
          correctIndex={data.correctIndex as number}
        />
      );
    default:
      return <div>Unknown frame type</div>;
  }
}

export function ContentFramePreview({ data }: ContentFramePreviewProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"png" | "jpeg">("png");
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportedUrl, setExportedUrl] = useState<string | null>(null);

  // エラー時の表示
  if (!data.success) {
    return (
      <div className="w-full max-w-md bg-red-500/10 border border-red-500 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
          コンテンツフレームの生成に失敗しました
        </h3>
        <p className="text-sm text-red-600 dark:text-red-400">
          {data.error || "不明なエラー"}
        </p>
      </div>
    );
  }

  // エクスポート処理
  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);

    try {
      const response = await fetch("/api/export/image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          frameType: data.frameType,
          aspectRatio: data.aspectRatio,
          data: data.data,
          format: exportFormat,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setExportError(result.error || "エクスポートに失敗しました");
        return;
      }

      setExportedUrl(result.imageUrl);

      // クレジット更新イベントを発火
      window.dispatchEvent(new Event("creditUpdated"));
    } catch (error) {
      setExportError("エクスポート中にエラーが発生しました");
    } finally {
      setIsExporting(false);
    }
  };

  // スケールを計算（プレビュー用に縮小）
  const previewScale = data.aspectRatio === "reels" ? 0.2 : 0.25;
  const previewWidth = data.aspectRatio === "reels" ? 1080 * previewScale : 1080 * previewScale;
  const previewHeight = data.aspectRatio === "reels" ? 1920 * previewScale : 1350 * previewScale;

  return (
    <div className="w-full max-w-lg bg-background border border-border rounded-lg p-4 space-y-4">
      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            {data.message}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">
              {data.frameTypeName}
            </span>
            <span className="bg-muted px-2 py-0.5 rounded text-xs">
              {data.aspectRatioName}
            </span>
          </div>
        </div>
      </div>

      {/* フレームプレビュー */}
      <div
        className="relative bg-muted rounded-lg overflow-hidden flex items-center justify-center p-4"
        style={{ minHeight: previewHeight + 32 }}
      >
        <div
          style={{
            width: previewWidth,
            height: previewHeight,
            transform: `scale(1)`,
            transformOrigin: "center center",
          }}
          className="relative overflow-hidden rounded-md shadow-lg"
        >
          <div
            style={{
              width: data.aspectRatio === "reels" ? 1080 : 1080,
              height: data.aspectRatio === "reels" ? 1920 : 1350,
              transform: `scale(${previewScale})`,
              transformOrigin: "top left",
            }}
          >
            {renderFrame(data.frameType, data.aspectRatio, data.data)}
          </div>
        </div>
      </div>

      {/* エクスポートされた画像 */}
      {exportedUrl && (
        <div className="bg-green-500/10 border border-green-500 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">
            エクスポート完了
          </h4>
          <a
            href={exportedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-green-600 dark:text-green-400 underline flex items-center gap-1"
          >
            画像を開く
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* エクスポートエラー */}
      {exportError && (
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{exportError}</p>
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex flex-col gap-3">
        {/* フォーマット選択 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">形式:</span>
          <div className="flex rounded-md overflow-hidden border border-border">
            <button
              onClick={() => setExportFormat("png")}
              className={`px-3 py-1 text-sm ${
                exportFormat === "png"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-foreground hover:bg-muted"
              }`}
            >
              PNG
            </button>
            <button
              onClick={() => setExportFormat("jpeg")}
              className={`px-3 py-1 text-sm ${
                exportFormat === "jpeg"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-foreground hover:bg-muted"
              }`}
            >
              JPEG
            </button>
          </div>
        </div>

        {/* ボタン */}
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                エクスポート中...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                画像をエクスポート (10pt)
              </>
            )}
          </button>
          <a
            href={data.previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/80 flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            詳細
          </a>
        </div>
      </div>

      {/* コスト情報 */}
      <div className="bg-muted rounded p-3 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>エクスポートコスト:</span>
          <span>10 Ma-Point (画像) / 200 Ma-Point (動画)</span>
        </div>
      </div>
    </div>
  );
}
