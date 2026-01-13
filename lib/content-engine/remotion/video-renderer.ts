/**
 * Marty Content Engine - Video Renderer
 *
 * Remotionを使用した動画レンダリングサービス
 */

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import os from "os";
import { CANVAS_SPECS } from "../types";
import type { FrameType } from "../export/types";
import type { AspectRatio, BrandConfig } from "../types";

/** 動画レンダリング設定 */
export interface VideoRenderOptions {
  frameType: FrameType;
  aspectRatio: AspectRatio;
  data: Record<string, unknown>;
  fps?: 30 | 60;
  duration?: number; // 秒
}

/** レンダリング結果 */
export interface VideoRenderResult {
  filePath: string;
  width: number;
  height: number;
  durationInSeconds: number;
  fps: number;
}

/** デフォルト動画時間 (秒) */
const DEFAULT_DURATION: Record<FrameType, number> = {
  frame1: 8,
  frame2: 6,
  frame3: 10,
  frame4: 5,
  frame5: 8,
};

/** フレームタイプとコンポジションIDのマッピング */
const COMPOSITION_ID_MAP: Record<FrameType, Record<AspectRatio, string>> = {
  frame1: { reels: "Frame1Chat-Reels", feed: "Frame1Chat-Feed" },
  frame2: { reels: "Frame2Magazine-Reels", feed: "Frame2Magazine-Feed" },
  frame3: { reels: "Frame3Memo-Reels", feed: "Frame3Memo-Feed" },
  frame4: { reels: "Frame4Cinema-Reels", feed: "Frame4Cinema-Feed" },
  frame5: { reels: "Frame5Quiz-Reels", feed: "Frame5Quiz-Feed" },
};

/** バンドルキャッシュ */
let bundleLocation: string | null = null;

/**
 * Remotionプロジェクトをバンドル
 */
async function getBundleLocation(): Promise<string> {
  if (bundleLocation) {
    return bundleLocation;
  }

  const entryPoint = path.join(
    process.cwd(),
    "lib/content-engine/remotion/index.ts"
  );

  bundleLocation = await bundle({
    entryPoint,
    // Webpackの設定をオーバーライド
    webpackOverride: (config) => config,
  });

  return bundleLocation;
}

/**
 * 動画をレンダリング
 */
export async function renderVideo(
  options: VideoRenderOptions,
  onProgress?: (progress: number) => void
): Promise<VideoRenderResult> {
  const { frameType, aspectRatio, data, fps = 30 } = options;
  const duration = options.duration || DEFAULT_DURATION[frameType];
  const spec = CANVAS_SPECS[aspectRatio];

  // バンドルを取得
  const bundlePath = await getBundleLocation();

  // コンポジションIDを取得 (Reelsのみ対応)
  const compositionId = COMPOSITION_ID_MAP[frameType].reels;

  // コンポジションを選択
  const composition = await selectComposition({
    serveUrl: bundlePath,
    id: compositionId,
    inputProps: {
      aspectRatio,
      ...data,
    },
  });

  // 一時ファイルパス
  const tempDir = os.tmpdir();
  const outputPath = path.join(
    tempDir,
    `marty-video-${Date.now()}-${Math.random().toString(36).substring(2)}.mp4`
  );

  // レンダリング
  await renderMedia({
    composition: {
      ...composition,
      width: spec.width,
      height: spec.height,
      fps,
      durationInFrames: duration * fps,
    },
    serveUrl: bundlePath,
    codec: "h264",
    outputLocation: outputPath,
    inputProps: {
      aspectRatio,
      ...data,
    },
    onProgress: ({ progress }) => {
      if (onProgress) {
        onProgress(Math.round(progress * 100));
      }
    },
  });

  return {
    filePath: outputPath,
    width: spec.width,
    height: spec.height,
    durationInSeconds: duration,
    fps,
  };
}

/**
 * 一時ファイルを削除
 */
export async function cleanupVideoFile(filePath: string): Promise<void> {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error("Failed to cleanup video file:", error);
  }
}

/**
 * バンドルキャッシュをクリア
 */
export function clearBundleCache(): void {
  bundleLocation = null;
}
