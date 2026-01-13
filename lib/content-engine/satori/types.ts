/**
 * Satori用型定義
 */

import type { AspectRatio, BrandConfig, ChatMessage } from "../types";

/** 共通のSatoriコンポーネントProps */
export interface SatoriBaseProps {
  aspectRatio: AspectRatio;
  brand?: Partial<BrandConfig>;
}

/** Frame 1: LINE風チャット */
export interface SatoriFrame1Props extends SatoriBaseProps {
  messages: ChatMessage[];
  headerTitle?: string;
}

/** Frame 2: 雑誌見出し風 */
export interface SatoriFrame2Props extends SatoriBaseProps {
  backgroundImage?: string;
  title: string;
  subtitle?: string;
  decorativeText?: string;
}

/** Frame 3: メモ風 */
export interface SatoriFrame3Props extends SatoriBaseProps {
  content: string;
  showLines?: boolean;
  bgStyle?: "white" | "cream";
}

/** Frame 4: 映画字幕風 */
export interface SatoriFrame4Props extends SatoriBaseProps {
  backgroundImage?: string;
  subtitle: string;
}

/** Frame 5: クイズ */
export interface SatoriFrame5Props extends SatoriBaseProps {
  questionNumber?: number;
  question: string;
  options: string[];
  correctIndex?: number;
}

/** 全フレームのProps統合型 */
export type SatoriFrameProps =
  | { type: "frame1"; data: SatoriFrame1Props }
  | { type: "frame2"; data: SatoriFrame2Props }
  | { type: "frame3"; data: SatoriFrame3Props }
  | { type: "frame4"; data: SatoriFrame4Props }
  | { type: "frame5"; data: SatoriFrame5Props };

/** 画像生成リクエスト */
export interface GenerateImageRequest {
  templateId: "line_chat" | "magazine" | "memo" | "cinema" | "quiz";
  textData: Record<string, unknown>;
  backgroundUrl?: string;
  aspectRatio: AspectRatio;
  format?: "png" | "jpeg";
  quality?: number;
}

/** 画像生成レスポンス */
export interface GenerateImageResponse {
  success: boolean;
  imageUrl?: string;
  width?: number;
  height?: number;
  creditsUsed?: number;
  error?: string;
}

/** テンプレートIDとフレームタイプのマッピング */
export const TEMPLATE_TO_FRAME: Record<string, string> = {
  line_chat: "frame1",
  magazine: "frame2",
  memo: "frame3",
  cinema: "frame4",
  quiz: "frame5",
};
