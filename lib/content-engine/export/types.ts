/**
 * Marty Content Engine - Export Types
 *
 * 静止画/動画エクスポート機能の型定義
 */

import type {
  AspectRatio,
  Frame1Props,
  Frame2Props,
  Frame3Props,
  Frame4Props,
  Frame5Props,
} from "../types";

/** フレームタイプ */
export type FrameType = "frame1" | "frame2" | "frame3" | "frame4" | "frame5";

/** 画像フォーマット */
export type ImageFormat = "png" | "jpeg";

/** フレームタイプとPropsのマッピング */
export type FramePropsMap = {
  frame1: Omit<Frame1Props, "aspectRatio">;
  frame2: Omit<Frame2Props, "aspectRatio">;
  frame3: Omit<Frame3Props, "aspectRatio">;
  frame4: Omit<Frame4Props, "aspectRatio">;
  frame5: Omit<Frame5Props, "aspectRatio">;
};

/** 画像エクスポートリクエスト */
export interface ImageExportRequest<T extends FrameType = FrameType> {
  /** フレームタイプ */
  frameType: T;
  /** アスペクト比 */
  aspectRatio: AspectRatio;
  /** フレームデータ */
  data: FramePropsMap[T];
  /** 出力フォーマット */
  format: ImageFormat;
  /** JPEG品質 (0-100) */
  quality?: number;
}

/** 画像エクスポート成功レスポンス */
export interface ImageExportSuccessResponse {
  success: true;
  /** 生成された画像のURL (Supabase Storage) */
  imageUrl: string;
  /** 画像の幅 */
  width: number;
  /** 画像の高さ */
  height: number;
  /** フォーマット */
  format: ImageFormat;
  /** 消費クレジット */
  creditsUsed: number;
  /** 残りクレジット */
  remainingCredits: number;
}

/** 画像エクスポートエラーレスポンス */
export interface ImageExportErrorResponse {
  success: false;
  error: string;
  code:
    | "UNAUTHORIZED"
    | "INSUFFICIENT_CREDITS"
    | "VALIDATION_ERROR"
    | "RENDER_ERROR"
    | "STORAGE_ERROR";
  /** 必要クレジット (INSUFFICIENT_CREDITS時) */
  required?: number;
  /** 現在のクレジット (INSUFFICIENT_CREDITS時) */
  current?: number;
}

/** 画像エクスポートレスポンス */
export type ImageExportResponse =
  | ImageExportSuccessResponse
  | ImageExportErrorResponse;

/** 動画ジョブステータス */
export type VideoJobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

/** 動画エクスポートリクエスト */
export interface VideoExportRequest<T extends FrameType = FrameType> {
  /** フレームタイプ */
  frameType: T;
  /** アスペクト比 */
  aspectRatio: AspectRatio;
  /** フレームデータ */
  data: FramePropsMap[T];
  /** 動画の長さ (秒) - デフォルトは自動計算 */
  duration?: number;
  /** FPS */
  fps?: 30 | 60;
}

/** 動画エクスポート開始レスポンス */
export interface VideoExportJobResponse {
  success: true;
  /** ジョブID */
  jobId: string;
  /** ステータス */
  status: "pending";
  /** 予約クレジット */
  creditsReserved: number;
  /** 推定レンダリング時間 (秒) */
  estimatedDuration: number;
}

/** 動画ジョブステータスレスポンス */
export interface VideoJobStatusResponse {
  jobId: string;
  status: VideoJobStatus;
  /** 進捗 (0-100) */
  progress?: number;
  /** 完了時の動画URL */
  videoUrl?: string;
  /** 失敗時のエラーメッセージ */
  error?: string;
  /** 最終的に消費されたクレジット */
  creditsCharged?: number;
}

/** Puppeteerレンダリングオプション */
export interface RenderOptions {
  /** 出力フォーマット */
  format: ImageFormat;
  /** JPEG品質 */
  quality?: number;
  /** デバッグモード (Safe Zone表示) */
  debug?: boolean;
}

/** レンダリング結果 */
export interface RenderResult {
  /** 画像バッファ */
  buffer: Buffer;
  /** 幅 */
  width: number;
  /** 高さ */
  height: number;
  /** フォーマット */
  format: ImageFormat;
}
