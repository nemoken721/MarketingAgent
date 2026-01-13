/**
 * Marty Content Engine - Video Exporter
 *
 * 動画エクスポートのオーケストレーション
 * Remotionレンダリング + Supabase Storage アップロード
 */

import { createClient } from "@/lib/supabase/server";
import fs from "fs";
import { renderVideo, cleanupVideoFile } from "../remotion/video-renderer";
import type { FrameType } from "./types";
import type { AspectRatio } from "../types";

/** Supabase Storageのバケット名 */
const STORAGE_BUCKET = "exports";

/** ファイル名を生成 */
function generateFilename(
  userId: string,
  frameType: FrameType,
  aspectRatio: AspectRatio
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const randomId = Math.random().toString(36).substring(2, 8);
  return `${userId}/videos/${frameType}-${aspectRatio}-${timestamp}-${randomId}.mp4`;
}

export interface ExportVideoParams {
  userId: string;
  frameType: FrameType;
  aspectRatio: AspectRatio;
  data: Record<string, unknown>;
  fps?: 30 | 60;
  duration?: number;
  onProgress?: (progress: number) => void;
}

export interface ExportVideoResult {
  videoUrl: string;
  width: number;
  height: number;
  durationInSeconds: number;
  fps: number;
}

/**
 * フレームを動画にエクスポート
 *
 * 1. Remotionでレンダリング
 * 2. Supabase Storageにアップロード
 * 3. 一時ファイルを削除
 * 4. 公開URLを返却
 */
export async function exportVideo(
  params: ExportVideoParams
): Promise<ExportVideoResult> {
  const {
    userId,
    frameType,
    aspectRatio,
    data,
    fps = 30,
    duration,
    onProgress,
  } = params;

  let renderResult;

  try {
    // 1. Remotionでレンダリング
    renderResult = await renderVideo(
      {
        frameType,
        aspectRatio,
        data,
        fps,
        duration,
      },
      onProgress
    );

    // 2. ファイル名を生成
    const filename = generateFilename(userId, frameType, aspectRatio);

    // 3. Supabase Storageにアップロード
    const supabase = await createClient();
    const fileBuffer = fs.readFileSync(renderResult.filePath);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filename, fileBuffer, {
        contentType: "video/mp4",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload video: ${uploadError.message}`);
    }

    // 4. 公開URLを取得
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(uploadData.path);

    return {
      videoUrl: urlData.publicUrl,
      width: renderResult.width,
      height: renderResult.height,
      durationInSeconds: renderResult.durationInSeconds,
      fps: renderResult.fps,
    };
  } finally {
    // 5. 一時ファイルを削除
    if (renderResult?.filePath) {
      await cleanupVideoFile(renderResult.filePath);
    }
  }
}

/**
 * ジョブを作成
 */
export async function createExportJob(params: {
  userId: string;
  type: "image" | "video";
  frameType: FrameType;
  aspectRatio: AspectRatio;
  inputData: Record<string, unknown>;
  creditsReserved: number;
}): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("export_jobs")
    .insert({
      user_id: params.userId,
      type: params.type,
      frame_type: params.frameType,
      aspect_ratio: params.aspectRatio,
      input_data: params.inputData,
      credits_reserved: params.creditsReserved,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create export job: ${error.message}`);
  }

  return data.id;
}

/**
 * ジョブステータスを更新
 */
export async function updateExportJob(
  jobId: string,
  updates: {
    status?: "pending" | "processing" | "completed" | "failed";
    progress?: number;
    outputUrl?: string;
    outputWidth?: number;
    outputHeight?: number;
    outputFormat?: string;
    creditsCharged?: number;
    errorMessage?: string;
    startedAt?: Date;
    completedAt?: Date;
  }
): Promise<void> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};

  if (updates.status) updateData.status = updates.status;
  if (updates.progress !== undefined) updateData.progress = updates.progress;
  if (updates.outputUrl) updateData.output_url = updates.outputUrl;
  if (updates.outputWidth) updateData.output_width = updates.outputWidth;
  if (updates.outputHeight) updateData.output_height = updates.outputHeight;
  if (updates.outputFormat) updateData.output_format = updates.outputFormat;
  if (updates.creditsCharged !== undefined)
    updateData.credits_charged = updates.creditsCharged;
  if (updates.errorMessage) updateData.error_message = updates.errorMessage;
  if (updates.startedAt) updateData.started_at = updates.startedAt.toISOString();
  if (updates.completedAt)
    updateData.completed_at = updates.completedAt.toISOString();

  const { error } = await supabase
    .from("export_jobs")
    .update(updateData)
    .eq("id", jobId);

  if (error) {
    console.error("Failed to update export job:", error);
  }
}

/**
 * ジョブを取得
 */
export async function getExportJob(jobId: string): Promise<{
  id: string;
  userId: string;
  type: "image" | "video";
  status: "pending" | "processing" | "completed" | "failed";
  frameType: FrameType;
  aspectRatio: AspectRatio;
  inputData: Record<string, unknown>;
  outputUrl?: string;
  progress: number;
  creditsReserved: number;
  creditsCharged?: number;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
} | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("export_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    type: data.type,
    status: data.status,
    frameType: data.frame_type,
    aspectRatio: data.aspect_ratio,
    inputData: data.input_data,
    outputUrl: data.output_url,
    progress: data.progress,
    creditsReserved: data.credits_reserved,
    creditsCharged: data.credits_charged,
    errorMessage: data.error_message,
    createdAt: data.created_at,
    completedAt: data.completed_at,
  };
}
