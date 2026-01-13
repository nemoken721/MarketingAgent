/**
 * Satori画像レンダラー
 *
 * ReactコンポーネントをSVG経由でPNG/JPEGに変換
 */

import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { loadFonts } from "./fonts";
import {
  SatoriFrame1Chat,
  SatoriFrame2Magazine,
  SatoriFrame3Memo,
  SatoriFrame4Cinema,
  SatoriFrame5Quiz,
} from "./frames";
import { CANVAS_SPECS, type AspectRatio, type BrandConfig, type ChatMessage } from "../types";
import { TEMPLATE_TO_FRAME } from "./types";

/** レンダリングオプション */
export interface RenderOptions {
  templateId: string;
  aspectRatio: AspectRatio;
  textData: Record<string, unknown>;
  backgroundUrl?: string;
  format?: "png" | "jpeg";
  quality?: number;
  brand?: Partial<BrandConfig>;
}

/** レンダリング結果 */
export interface RenderResult {
  buffer: Buffer;
  width: number;
  height: number;
  format: "png" | "jpeg";
}

/**
 * テンプレートIDに基づいてフレームコンポーネントを生成
 */
function createFrameElement(
  templateId: string,
  aspectRatio: AspectRatio,
  textData: Record<string, unknown>,
  backgroundUrl?: string,
  brand?: Partial<BrandConfig>
): React.ReactElement {
  const frameType = TEMPLATE_TO_FRAME[templateId] || templateId;

  switch (frameType) {
    case "frame1":
      return (
        <SatoriFrame1Chat
          aspectRatio={aspectRatio}
          messages={textData.messages as ChatMessage[]}
          headerTitle={textData.headerTitle as string}
          brand={brand}
        />
      );

    case "frame2":
      return (
        <SatoriFrame2Magazine
          aspectRatio={aspectRatio}
          title={textData.title as string}
          subtitle={textData.subtitle as string}
          decorativeText={textData.decorativeText as string}
          backgroundImage={backgroundUrl || (textData.backgroundImage as string)}
          brand={brand}
        />
      );

    case "frame3":
      return (
        <SatoriFrame3Memo
          aspectRatio={aspectRatio}
          content={textData.content as string}
          showLines={textData.showLines as boolean}
          bgStyle={textData.bgStyle as "white" | "cream"}
          brand={brand}
        />
      );

    case "frame4":
      return (
        <SatoriFrame4Cinema
          aspectRatio={aspectRatio}
          subtitle={textData.subtitle as string}
          backgroundImage={backgroundUrl || (textData.backgroundImage as string)}
          brand={brand}
        />
      );

    case "frame5":
      return (
        <SatoriFrame5Quiz
          aspectRatio={aspectRatio}
          questionNumber={textData.questionNumber as number}
          question={textData.question as string}
          options={textData.options as string[]}
          correctIndex={textData.correctIndex as number}
          brand={brand}
        />
      );

    default:
      throw new Error(`Unknown template: ${templateId}`);
  }
}

/**
 * 画像をレンダリング
 */
export async function renderImage(options: RenderOptions): Promise<RenderResult> {
  const {
    templateId,
    aspectRatio,
    textData,
    backgroundUrl,
    format = "png",
    quality = 90,
    brand,
  } = options;

  // キャンバスサイズを取得
  const spec = CANVAS_SPECS[aspectRatio];
  const width = spec.width;
  const height = spec.height;

  // フォントをロード
  const fonts = await loadFonts();

  // フレーム要素を生成
  const element = createFrameElement(templateId, aspectRatio, textData, backgroundUrl, brand);

  // Satoriでレンダリング (JSX → SVG)
  const svg = await satori(element, {
    width,
    height,
    fonts: fonts.map((f) => ({
      name: f.name,
      data: f.data,
      weight: f.weight,
      style: f.style,
    })),
  });

  // resvg-jsでPNGに変換
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: width,
    },
  });

  const pngData = resvg.render();
  let buffer = pngData.asPng();

  // JPEGの場合は変換（※resvg-jsはPNGのみ出力なので、別途変換が必要な場合がある）
  // Note: 現時点ではPNGのみサポート。JPEGが必要な場合はsharpなどで変換
  if (format === "jpeg") {
    // TODO: sharpを使ってPNG→JPEG変換
    // 現時点ではPNGとして返す
    console.warn("JPEG format requested but returning PNG (JPEG conversion not yet implemented)");
  }

  return {
    buffer: Buffer.from(buffer),
    width,
    height,
    format: "png", // 現時点では常にPNG
  };
}

/**
 * SVGのみをレンダリング（デバッグ用）
 */
export async function renderSvg(options: RenderOptions): Promise<string> {
  const {
    templateId,
    aspectRatio,
    textData,
    backgroundUrl,
    brand,
  } = options;

  const spec = CANVAS_SPECS[aspectRatio];
  const fonts = await loadFonts();
  const element = createFrameElement(templateId, aspectRatio, textData, backgroundUrl, brand);

  const svg = await satori(element, {
    width: spec.width,
    height: spec.height,
    fonts: fonts.map((f) => ({
      name: f.name,
      data: f.data,
      weight: f.weight,
      style: f.style,
    })),
  });

  return svg;
}
