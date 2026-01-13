/**
 * Satori用フォントローダー
 *
 * Google Fontsから Noto Sans JP / Noto Serif JP を読み込む
 */

export interface FontData {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 500 | 700;
  style: "normal";
}

// フォントキャッシュ
let fontCache: FontData[] | null = null;

/**
 * Google FontsからフォントデータをフェッチしてArrayBufferで返す
 */
async function fetchFont(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch font: ${url}`);
  }
  return response.arrayBuffer();
}

/**
 * Satoriで使用するフォントをロード
 * キャッシュがあれば再利用
 */
export async function loadFonts(): Promise<FontData[]> {
  if (fontCache) {
    return fontCache;
  }

  // Google Fonts の直接URLからフォントを取得
  // Noto Sans JP - Regular (400), Medium (500), Bold (700)
  // Noto Serif JP - Regular (400), Bold (700)
  const fontUrls = {
    notoSansJP400:
      "https://fonts.gstatic.com/s/notosansjp/v52/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj75s.ttf",
    notoSansJP500:
      "https://fonts.gstatic.com/s/notosansjp/v52/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFJMj75s.ttf",
    notoSansJP700:
      "https://fonts.gstatic.com/s/notosansjp/v52/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFE0g75s.ttf",
    notoSerifJP400:
      "https://fonts.gstatic.com/s/notoserifjp/v21/xn77YHs72GKoTvER4Gn3b5eMZBaPRkgfU8fEwb0.ttf",
    notoSerifJP700:
      "https://fonts.gstatic.com/s/notoserifjp/v21/xn7mYHs72GKoTvER4Gn3b5eMXNikYkY0T84.ttf",
  };

  try {
    const [
      notoSansJP400Data,
      notoSansJP500Data,
      notoSansJP700Data,
      notoSerifJP400Data,
      notoSerifJP700Data,
    ] = await Promise.all([
      fetchFont(fontUrls.notoSansJP400),
      fetchFont(fontUrls.notoSansJP500),
      fetchFont(fontUrls.notoSansJP700),
      fetchFont(fontUrls.notoSerifJP400),
      fetchFont(fontUrls.notoSerifJP700),
    ]);

    fontCache = [
      { name: "Noto Sans JP", data: notoSansJP400Data, weight: 400, style: "normal" },
      { name: "Noto Sans JP", data: notoSansJP500Data, weight: 500, style: "normal" },
      { name: "Noto Sans JP", data: notoSansJP700Data, weight: 700, style: "normal" },
      { name: "Noto Serif JP", data: notoSerifJP400Data, weight: 400, style: "normal" },
      { name: "Noto Serif JP", data: notoSerifJP700Data, weight: 700, style: "normal" },
    ];

    return fontCache;
  } catch (error) {
    console.error("Failed to load fonts:", error);
    throw new Error("フォントの読み込みに失敗しました");
  }
}

/**
 * フォントキャッシュをクリア (テスト用)
 */
export function clearFontCache(): void {
  fontCache = null;
}
