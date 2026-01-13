/**
 * Satori Image Generation Module
 *
 * @example
 * ```ts
 * import { renderImage } from "@/lib/content-engine/satori";
 *
 * const result = await renderImage({
 *   templateId: "line_chat",
 *   aspectRatio: "reels",
 *   textData: {
 *     messages: [...],
 *     headerTitle: "お客様相談室",
 *   },
 * });
 * ```
 */

export { loadFonts, clearFontCache } from "./fonts";
export type { FontData } from "./fonts";

export { renderImage, renderSvg } from "./renderer";
export type { RenderOptions, RenderResult } from "./renderer";

export {
  SatoriFrame1Chat,
  SatoriFrame2Magazine,
  SatoriFrame3Memo,
  SatoriFrame4Cinema,
  SatoriFrame5Quiz,
} from "./frames";

export { TEMPLATE_TO_FRAME } from "./types";
export type {
  SatoriFrame1Props,
  SatoriFrame2Props,
  SatoriFrame3Props,
  SatoriFrame4Props,
  SatoriFrame5Props,
  SatoriFrameProps,
  GenerateImageRequest,
  GenerateImageResponse,
} from "./types";

export { exportSatoriImage } from "./image-exporter";
export type {
  TemplateId,
  ImageFormat as SatoriImageFormat,
  SatoriExportParams,
  SatoriExportResult,
} from "./image-exporter";
