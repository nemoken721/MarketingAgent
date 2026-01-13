/**
 * Satori Image Exporter
 *
 * Satoriでレンダリング + Supabase Storage アップロード
 */

import { createClient } from "@/lib/supabase/server";
import { renderImage } from "./renderer";
import type { AspectRatio, BrandConfig } from "../types";

/** Supabase Storageのバケット名 */
const STORAGE_BUCKET = "exports";

/** テンプレートID型 */
export type TemplateId = "line_chat" | "magazine" | "memo" | "cinema" | "quiz";

/** 画像フォーマット */
export type ImageFormat = "png" | "jpeg";

/** ファイル名を生成 */
function generateFilename(
  userId: string,
  templateId: string,
  aspectRatio: AspectRatio,
  format: ImageFormat
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const randomId = Math.random().toString(36).substring(2, 8);
  return `${userId}/satori/${templateId}-${aspectRatio}-${timestamp}-${randomId}.${format}`;
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

export interface SatoriExportParams {
  userId: string;
  templateId: TemplateId;
  aspectRatio: AspectRatio;
  textData: Record<string, unknown>;
  backgroundUrl?: string;
  format?: ImageFormat;
  quality?: number;
  brand?: Partial<BrandConfig>;
}

export interface SatoriExportResult {
  imageUrl: string;
  width: number;
  height: number;
  format: ImageFormat;
}

/**
 * Satoriを使用して画像を生成・エクスポート
 *
 * 1. Satoriでレンダリング
 * 2. Supabase Storageにアップロード
 * 3. 公開URLを返却
 */
export async function exportSatoriImage(
  params: SatoriExportParams
): Promise<SatoriExportResult> {
  const {
    userId,
    templateId,
    aspectRatio,
    textData,
    backgroundUrl,
    format = "png",
    quality,
    brand,
  } = params;

  // 1. Satoriでレンダリング
  const renderResult = await renderImage({
    templateId,
    aspectRatio,
    textData,
    backgroundUrl,
    format,
    quality,
    brand,
  });

  // 2. ファイル名を生成
  const filename = generateFilename(userId, templateId, aspectRatio, format);

  // 3. Supabase Storageにアップロード
  const imageUrl = await uploadToStorage(renderResult.buffer, filename, format);

  return {
    imageUrl,
    width: renderResult.width,
    height: renderResult.height,
    format: renderResult.format as ImageFormat,
  };
}
