/**
 * Marty Content Engine - Type Definitions
 *
 * Pixel Perfect Implementation Requirements:
 * - Reels: 1080x1920 (9:16), Safe Zone 200px top/bottom, 40px sides
 * - Feed: 1080x1350 (4:5), 60px uniform padding
 */

/** アスペクト比モード */
export type AspectRatio = "reels" | "feed";

/** キャンバス仕様 */
export interface CanvasSpec {
  width: number;
  height: number;
  aspectRatio: string;
  safeZone: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

/** キャンバス仕様の定義 (Design System v2.0 Section 0) */
export const CANVAS_SPECS: Record<AspectRatio, CanvasSpec> = {
  reels: {
    width: 1080,
    height: 1920,
    aspectRatio: "9/16",
    safeZone: {
      top: 200,    // カメラアイコン回避
      bottom: 200, // キャプション・プロフィール回避
      left: 40,    // 左右のアイコン回避
      right: 40,
    },
  },
  feed: {
    width: 1080,
    height: 1350,
    aspectRatio: "4/5",
    safeZone: {
      top: 60,     // 均一パディング
      bottom: 60,
      left: 60,
      right: 60,
    },
  },
};

/** ブランド設定 (Design System v2.0 Section 3) */
export interface BrandConfig {
  /** メインカラー (吹き出し、強調文字、ボタン) */
  primaryColor: string;
  /** フォントスタック: sans-serif (ゴシック) or serif (明朝) */
  fontStack: "sans-serif" | "serif";
  /** 角丸スタイル */
  radiusStyle: "pop" | "sharp";
}

/** デフォルトブランド設定 */
export const DEFAULT_BRAND: BrandConfig = {
  primaryColor: "#3B82F6", // blue-500
  fontStack: "sans-serif",
  radiusStyle: "pop",
};

/** チャットメッセージ (Frame 1用) */
export interface ChatMessage {
  /** メッセージID */
  id: string;
  /** 送信者: customer=お客様(左), shop=お店(右) */
  sender: "customer" | "shop";
  /** メッセージ内容 */
  content: string;
  /** タイムスタンプ表示 (オプション) */
  timestamp?: string;
}

/** Frame 1: LINE風チャットのProps */
export interface Frame1Props {
  /** アスペクト比 */
  aspectRatio: AspectRatio;
  /** チャットメッセージ配列 */
  messages: ChatMessage[];
  /** ブランド設定 (オプション) */
  brand?: Partial<BrandConfig>;
  /** ヘッダータイトル (オプション) */
  headerTitle?: string;
}

/** Frame 2: 雑誌見出し風のProps */
export interface Frame2Props {
  aspectRatio: AspectRatio;
  /** 背景画像URL */
  backgroundImage?: string;
  /** メインタイトル */
  title: string;
  /** サブタイトル/本文 */
  subtitle?: string;
  /** 装飾用英語テキスト */
  decorativeText?: string;
  brand?: Partial<BrandConfig>;
}

/** Frame 3: メモ風のProps */
export interface Frame3Props {
  aspectRatio: AspectRatio;
  /** メモの内容 */
  content: string;
  /** 罫線表示 */
  showLines?: boolean;
  /** 背景色: white or cream */
  bgStyle?: "white" | "cream";
  brand?: Partial<BrandConfig>;
}

/** Frame 4: 映画字幕風のProps */
export interface Frame4Props {
  aspectRatio: AspectRatio;
  /** 背景画像URL (省略時はグラデーション) */
  backgroundImage?: string;
  /** 字幕テキスト */
  subtitle: string;
  brand?: Partial<BrandConfig>;
}

/** Frame 5: クイズのProps */
export interface Frame5Props {
  aspectRatio: AspectRatio;
  /** クイズ番号 */
  questionNumber?: number;
  /** 質問文 */
  question: string;
  /** 選択肢 (2〜4個) */
  options: string[];
  /** 正解のインデックス (0始まり) */
  correctIndex?: number;
  brand?: Partial<BrandConfig>;
}
