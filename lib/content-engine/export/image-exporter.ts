/**
 * Marty Content Engine - Image Exporter
 *
 * 画像エクスポートのオーケストレーション
 * Puppeteerレンダリング + Supabase Storage アップロード
 */

import { createClient } from "@/lib/supabase/server";
import { renderFrame } from "./puppeteer-renderer";
import type { FrameType, ImageFormat, RenderResult } from "./types";
import type { AspectRatio, BrandConfig } from "../types";

/** Supabase Storageのバケット名 */
const STORAGE_BUCKET = "exports";

/** ファイル名を生成 */
function generateFilename(
  userId: string,
  frameType: FrameType,
  aspectRatio: AspectRatio,
  format: ImageFormat
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const randomId = Math.random().toString(36).substring(2, 8);
  return `${userId}/images/${frameType}-${aspectRatio}-${timestamp}-${randomId}.${format}`;
}

/** 画像をSupabase Storageにアップロード */
async function uploadToStorage(
  buffer: Buffer,
  filename: string,
  format: ImageFormat
): Promise<string> {
  const supabase = await createClient();

  const contentType = format === "png" ? "image/png" : "image/jpeg";

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filename, buffer, {
      contentType,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Storage upload error:", error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // 公開URLを取得
  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

export interface ExportImageParams {
  userId: string;
  frameType: FrameType;
  aspectRatio: AspectRatio;
  data: Record<string, unknown>;
  format: ImageFormat;
  quality?: number;
}

export interface ExportImageResult {
  imageUrl: string;
  width: number;
  height: number;
  format: ImageFormat;
}

/**
 * フレームを画像にエクスポート
 *
 * 1. Puppeteerでレンダリング
 * 2. Supabase Storageにアップロード
 * 3. 公開URLを返却
 */
export async function exportImage(
  params: ExportImageParams
): Promise<ExportImageResult> {
  const { userId, frameType, aspectRatio, data, format, quality } = params;

  // 1. Puppeteerでレンダリング
  const renderResult: RenderResult = await renderFrame(
    frameType,
    aspectRatio,
    data,
    {
      format,
      quality,
    }
  );

  // 2. ファイル名を生成
  const filename = generateFilename(userId, frameType, aspectRatio, format);

  // 3. Supabase Storageにアップロード
  const imageUrl = await uploadToStorage(renderResult.buffer, filename, format);

  return {
    imageUrl,
    width: renderResult.width,
    height: renderResult.height,
    format: renderResult.format,
  };
}

/**
 * エクスポート用のStorageバケットを確認/作成
 * (初回セットアップ用)
 */
export async function ensureStorageBucket(): Promise<void> {
  const supabase = await createClient();

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error("Failed to list buckets:", listError);
    return;
  }

  const bucketExists = buckets?.some((b: { name: string }) => b.name === STORAGE_BUCKET);

  if (!bucketExists) {
    const { error: createError } = await supabase.storage.createBucket(
      STORAGE_BUCKET,
      {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: ["image/png", "image/jpeg", "video/mp4"],
      }
    );

    if (createError) {
      console.error("Failed to create bucket:", createError);
    } else {
      console.log(`✅ Created storage bucket: ${STORAGE_BUCKET}`);
    }
  }
}
