/**
 * Marty Content Engine - Puppeteer Renderer
 *
 * PuppeteerでReactコンポーネントを静止画にレンダリング
 */

import puppeteer, { Browser, Page } from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import type { AspectRatio, BrandConfig } from "../types";
import { CANVAS_SPECS, DEFAULT_BRAND } from "../types";
import type { FrameType, RenderOptions, RenderResult } from "./types";

/** Puppeteerブラウザのシングルトン (パフォーマンス向上) */
let browserInstance: Browser | null = null;

/**
 * Chromiumブラウザを取得
 */
async function getBrowser(): Promise<Browser> {
  if (browserInstance) {
    return browserInstance;
  }

  // ローカル開発環境 vs サーバーレス環境の判定
  const isLocal = process.env.NODE_ENV === "development";

  browserInstance = await puppeteer.launch({
    args: isLocal
      ? ["--no-sandbox", "--disable-setuid-sandbox"]
      : chromium.args,
    defaultViewport: null,
    executablePath: isLocal
      ? process.platform === "win32"
        ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        : process.platform === "darwin"
          ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
          : "/usr/bin/google-chrome"
      : await chromium.executablePath(),
    headless: true,
  });

  return browserInstance;
}

/**
 * ブラウザを終了 (クリーンアップ用)
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

/**
 * Google Fontsの読み込み用CSS
 */
const FONT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Serif+JP:wght@400;500;700&display=swap');

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Noto Sans JP', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.font-serif {
  font-family: 'Noto Serif JP', serif !important;
}

.font-sans {
  font-family: 'Noto Sans JP', sans-serif !important;
}
`;

/**
 * Tailwind CSSをインライン化するためのベーススタイル
 * (Puppeteerで動作する最小限のTailwindユーティリティ)
 */
const TAILWIND_BASE = `
/* Tailwind CSS Reset */
*, ::before, ::after {
  box-sizing: border-box;
  border-width: 0;
  border-style: solid;
  border-color: #e5e7eb;
}

/* Layout */
.relative { position: relative; }
.absolute { position: absolute; }
.inset-0 { inset: 0; }
.flex { display: flex; }
.flex-col { flex-direction: column; }
.flex-1 { flex: 1 1 0%; }
.items-center { align-items: center; }
.items-baseline { align-items: baseline; }
.items-start { align-items: flex-start; }
.items-end { align-items: flex-end; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.justify-start { justify-content: flex-start; }
.justify-end { justify-content: flex-end; }
.gap-2 { gap: 0.5rem; }
.gap-3 { gap: 0.75rem; }
.gap-4 { gap: 1rem; }
.gap-5 { gap: 1.25rem; }
.gap-8 { gap: 2rem; }

/* Sizing */
.w-full { width: 100%; }
.w-6 { width: 1.5rem; }
.w-8 { width: 2rem; }
.w-16 { width: 4rem; }
.w-32 { width: 8rem; }
.w-64 { width: 16rem; }
.w-96 { width: 24rem; }
.h-2 { height: 0.5rem; }
.h-4 { height: 1rem; }
.h-6 { height: 1.5rem; }
.h-16 { height: 4rem; }
.h-64 { height: 16rem; }
.h-96 { height: 24rem; }
.h-full { height: 100%; }
.max-w-\\[75\\%\\] { max-width: 75%; }
.max-w-\\[80\\%\\] { max-width: 80%; }
.min-h-screen { min-height: 100vh; }

/* Spacing */
.p-4 { padding: 1rem; }
.p-8 { padding: 2rem; }
.px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
.px-4 { padding-left: 1rem; padding-right: 1rem; }
.px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
.px-8 { padding-left: 2rem; padding-right: 2rem; }
.py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
.py-4 { padding-top: 1rem; padding-bottom: 1rem; }
.py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
.pb-2 { padding-bottom: 0.5rem; }
.pb-12 { padding-bottom: 3rem; }
.pt-2 { padding-top: 0.5rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-4 { margin-bottom: 1rem; }
.mb-6 { margin-bottom: 1.5rem; }
.mb-8 { margin-bottom: 2rem; }
.mb-12 { margin-bottom: 3rem; }
.mt-12 { margin-top: 3rem; }

/* Typography */
.text-sm { font-size: 0.875rem; line-height: 1.25rem; }
.text-base { font-size: 1rem; line-height: 1.5rem; }
.text-lg { font-size: 1.125rem; line-height: 1.75rem; }
.text-xl { font-size: 1.25rem; line-height: 1.75rem; }
.text-2xl { font-size: 1.5rem; line-height: 2rem; }
.text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
.text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
.text-6xl { font-size: 3.75rem; line-height: 1; }
.text-8xl { font-size: 6rem; line-height: 1; }
.font-medium { font-weight: 500; }
.font-bold { font-weight: 700; }
.italic { font-style: italic; }
.leading-tight { line-height: 1.25; }
.leading-relaxed { line-height: 1.625; }
.leading-loose { line-height: 2; }
.tracking-wide { letter-spacing: 0.025em; }
.tracking-widest { letter-spacing: 0.1em; }
.text-left { text-align: left; }
.text-center { text-align: center; }
.whitespace-pre-line { white-space: pre-line; }

/* Colors */
.text-white { color: #fff; }
.text-slate-400 { color: #94a3b8; }
.text-slate-500 { color: #64748b; }
.text-slate-600 { color: #475569; }
.text-slate-700 { color: #334155; }
.text-slate-800 { color: #1e293b; }
.text-amber-600 { color: #d97706; }
.text-green-500 { color: #22c55e; }
.text-red-200 { color: #fecaca; }
.bg-white { background-color: #fff; }
.bg-black { background-color: #000; }
.bg-slate-100 { background-color: #f1f5f9; }
.bg-slate-200 { background-color: #e2e8f0; }
.bg-slate-300 { background-color: #cbd5e1; }
.bg-yellow-50 { background-color: #fefce8; }
.bg-green-500 { background-color: #22c55e; }
.bg-white\\/80 { background-color: rgba(255, 255, 255, 0.8); }
.bg-white\\/90 { background-color: rgba(255, 255, 255, 0.9); }
.bg-black\\/30 { background-color: rgba(0, 0, 0, 0.3); }
.bg-black\\/40 { background-color: rgba(0, 0, 0, 0.4); }
.bg-black\\/70 { background-color: rgba(0, 0, 0, 0.7); }
.bg-black\\/90 { background-color: rgba(0, 0, 0, 0.9); }
.bg-red-500\\/30 { background-color: rgba(239, 68, 68, 0.3); }
.bg-blue-500\\/30 { background-color: rgba(59, 130, 246, 0.3); }

/* Gradients */
.bg-gradient-to-br { background-image: linear-gradient(to bottom right, var(--tw-gradient-stops)); }
.bg-gradient-to-t { background-image: linear-gradient(to top, var(--tw-gradient-stops)); }
.bg-gradient-to-b { background-image: linear-gradient(to bottom, var(--tw-gradient-stops)); }
.from-slate-100 { --tw-gradient-from: #f1f5f9; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(241, 245, 249, 0)); }
.from-slate-200 { --tw-gradient-from: #e2e8f0; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(226, 232, 240, 0)); }
.from-slate-900 { --tw-gradient-from: #0f172a; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(15, 23, 42, 0)); }
.from-black\\/90 { --tw-gradient-from: rgba(0, 0, 0, 0.9); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, transparent); }
.from-black\\/30 { --tw-gradient-from: rgba(0, 0, 0, 0.3); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, transparent); }
.via-slate-800 { --tw-gradient-stops: var(--tw-gradient-from), #1e293b, var(--tw-gradient-to, rgba(30, 41, 59, 0)); }
.via-black\\/40 { --tw-gradient-stops: var(--tw-gradient-from), rgba(0, 0, 0, 0.4), var(--tw-gradient-to, transparent); }
.to-slate-200 { --tw-gradient-to: #e2e8f0; }
.to-slate-400 { --tw-gradient-to: #94a3b8; }
.to-slate-900 { --tw-gradient-to: #0f172a; }
.to-transparent { --tw-gradient-to: transparent; }

/* Borders */
.border { border-width: 1px; }
.border-2 { border-width: 2px; }
.border-b { border-bottom-width: 1px; }
.border-b-2 { border-bottom-width: 2px; }
.border-b-4 { border-bottom-width: 4px; }
.border-slate-200 { border-color: #e2e8f0; }
.border-slate-300 { border-color: #cbd5e1; }
.border-slate-600 { border-color: #475569; }
.border-green-700 { border-color: #15803d; }
.rounded { border-radius: 0.25rem; }
.rounded-sm { border-radius: 0.125rem; }
.rounded-lg { border-radius: 0.5rem; }
.rounded-xl { border-radius: 0.75rem; }
.rounded-2xl { border-radius: 1rem; }
.rounded-full { border-radius: 9999px; }
.rounded-tl-none { border-top-left-radius: 0; }
.rounded-tr-none { border-top-right-radius: 0; }
.rounded-r-sm { border-top-right-radius: 0.125rem; border-bottom-right-radius: 0.125rem; }

/* Effects */
.shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
.shadow-md { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1); }
.shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1); }
.shadow-xl { box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); }
.shadow-slate-400\\/20 { --tw-shadow-color: rgba(148, 163, 184, 0.2); }
.opacity-20 { opacity: 0.2; }
.opacity-30 { opacity: 0.3; }
.blur-3xl { filter: blur(64px); }
.backdrop-blur-sm { backdrop-filter: blur(4px); }

/* Misc */
.overflow-hidden { overflow: hidden; }
.bg-cover { background-size: cover; }
.bg-center { background-position: center; }
.pointer-events-none { pointer-events: none; }
.z-10 { z-index: 10; }
.z-50 { z-index: 50; }
`;

/**
 * フレームタイプに応じたHTMLを生成
 */
function generateFrameHTML(
  frameType: FrameType,
  aspectRatio: AspectRatio,
  data: Record<string, unknown>,
  brand: BrandConfig
): string {
  const spec = CANVAS_SPECS[aspectRatio];
  const cssVars = `
    --primary-color: ${brand.primaryColor};
    --font-stack: ${brand.fontStack === "serif" ? "'Noto Serif JP', serif" : "'Noto Sans JP', sans-serif"};
    --radius-md: ${brand.radiusStyle === "pop" ? "1rem" : "0px"};
  `;

  switch (frameType) {
    case "frame1":
      return generateFrame1HTML(spec, cssVars, data as { messages: { id: string; sender: string; content: string }[]; headerTitle?: string });
    case "frame2":
      return generateFrame2HTML(spec, cssVars, data as { title: string; subtitle?: string; decorativeText?: string; backgroundImage?: string });
    case "frame3":
      return generateFrame3HTML(spec, cssVars, data as { content: string; showLines?: boolean; bgStyle?: string });
    case "frame4":
      return generateFrame4HTML(spec, cssVars, data as { subtitle: string; backgroundImage?: string });
    case "frame5":
      return generateFrame5HTML(spec, cssVars, data as { questionNumber?: number; question: string; options: string[]; correctIndex?: number });
    default:
      throw new Error(`Unknown frame type: ${frameType}`);
  }
}

/** Frame 1: LINE風チャット */
function generateFrame1HTML(
  spec: typeof CANVAS_SPECS["reels"],
  cssVars: string,
  data: { messages: { id: string; sender: string; content: string }[]; headerTitle?: string }
): string {
  const messages = data.messages
    .map(
      (msg) => `
      <div class="flex w-full ${msg.sender === "shop" ? "justify-end" : "justify-start"}">
        <div class="max-w-[75%] px-8 py-6 text-3xl leading-relaxed tracking-wide ${
          msg.sender === "shop"
            ? "bg-[var(--primary-color)] text-white rounded-[var(--radius-md)] rounded-tr-none shadow-md"
            : "bg-white text-slate-800 rounded-[var(--radius-md)] rounded-tl-none shadow-sm"
        } shadow-slate-400/20">
          ${msg.content}
        </div>
      </div>
    `
    )
    .join("");

  return `
    <div class="absolute inset-0 bg-slate-100"></div>
    <div class="absolute flex flex-col" style="top: ${spec.safeZone.top}px; bottom: ${spec.safeZone.bottom}px; left: ${spec.safeZone.left}px; right: ${spec.safeZone.right}px;">
      <div class="flex items-center justify-center py-6 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <span class="font-sans text-3xl font-medium text-slate-700 tracking-wide">${data.headerTitle || "お店とのトーク"}</span>
      </div>
      <div class="flex-1 flex flex-col justify-end px-8 pb-12 overflow-hidden">
        <div class="flex flex-col gap-8">
          ${messages}
        </div>
      </div>
    </div>
  `;
}

/** Frame 2: 雑誌見出し風 */
function generateFrame2HTML(
  spec: typeof CANVAS_SPECS["reels"],
  cssVars: string,
  data: { title: string; subtitle?: string; decorativeText?: string; backgroundImage?: string }
): string {
  const bg = data.backgroundImage
    ? `<div class="absolute inset-0 bg-cover bg-center" style="background-image: url(${data.backgroundImage})"></div>`
    : `<div class="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-400"></div>`;

  return `
    ${bg}
    <div class="absolute inset-0 bg-white/90"></div>
    <div class="absolute flex flex-col justify-center" style="top: ${spec.safeZone.top}px; bottom: ${spec.safeZone.bottom}px; left: ${spec.safeZone.left}px; right: ${spec.safeZone.right}px;">
      <div class="px-8">
        <p class="text-2xl italic text-slate-400 tracking-widest mb-4" style="font-family: Georgia, serif;">${data.decorativeText || "Professional Tips"}</p>
        <h1 class="font-serif text-6xl font-bold text-slate-800 leading-tight tracking-wide mb-6 whitespace-pre-line">${data.title}</h1>
        <div class="w-32 border-b-2 border-slate-300 mb-8"></div>
        ${data.subtitle ? `<p class="text-2xl text-slate-600 leading-relaxed tracking-wide max-w-[80%]">${data.subtitle}</p>` : ""}
        <div class="mt-12 w-16 h-2 rounded-full" style="background-color: var(--primary-color);"></div>
      </div>
    </div>
  `;
}

/** Frame 3: メモ風 */
function generateFrame3HTML(
  spec: typeof CANVAS_SPECS["reels"],
  cssVars: string,
  data: { content: string; showLines?: boolean; bgStyle?: string }
): string {
  const bgColor = data.bgStyle === "white" ? "bg-white" : "bg-yellow-50";
  const lines = data.content.split("\n");
  const linesHTML = lines
    .map(
      (line) => `
      <div class="py-4 text-3xl leading-loose tracking-wide text-slate-800 ${data.showLines !== false ? "border-b border-slate-200" : ""}">
        ${line || "&nbsp;"}
      </div>
    `
    )
    .join("");

  const now = new Date();
  const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;

  return `
    <div class="absolute inset-0 ${bgColor}"></div>
    <div class="absolute flex flex-col" style="top: ${spec.safeZone.top}px; bottom: ${spec.safeZone.bottom}px; left: ${spec.safeZone.left}px; right: ${spec.safeZone.right}px;">
      <div class="flex items-center justify-between px-8 py-4 text-slate-600">
        <span class="text-2xl font-medium">${timeStr}</span>
        <div class="flex items-center gap-3">
          <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"></path></svg>
          <div class="w-8 h-4 border-2 border-slate-600 rounded-sm relative"><div class="absolute inset-0.5 bg-slate-600 rounded-sm" style="width: 80%;"></div></div>
        </div>
      </div>
      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <div class="flex items-center gap-2 text-amber-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
          <span class="text-xl">メモ</span>
        </div>
      </div>
      <div class="flex-1 px-8 py-6 overflow-hidden">
        ${linesHTML}
      </div>
    </div>
  `;
}

/** Frame 4: 映画字幕風 */
function generateFrame4HTML(
  spec: typeof CANVAS_SPECS["reels"],
  cssVars: string,
  data: { subtitle: string; backgroundImage?: string }
): string {
  const bg = data.backgroundImage
    ? `<div class="absolute inset-0 bg-cover bg-center" style="background-image: url(${data.backgroundImage})"></div>`
    : `<div class="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"></div>`;

  return `
    ${bg}
    <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" style="top: 50%;"></div>
    <div class="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" style="bottom: 70%;"></div>
    <div class="absolute top-0 left-0 right-0 h-16 bg-black"></div>
    <div class="absolute bottom-0 left-0 right-0 h-16 bg-black"></div>
    <div class="absolute flex flex-col justify-end items-center" style="top: ${spec.safeZone.top}px; bottom: ${spec.safeZone.bottom}px; left: ${spec.safeZone.left}px; right: ${spec.safeZone.right}px;">
      <div class="text-center px-8 pb-12">
        <p class="text-white text-2xl leading-relaxed tracking-widest whitespace-pre-line font-serif" style="text-shadow: 0 2px 8px rgba(0,0,0,0.8);">${data.subtitle}</p>
      </div>
    </div>
  `;
}

/** Frame 5: クイズ */
function generateFrame5HTML(
  spec: typeof CANVAS_SPECS["reels"],
  cssVars: string,
  data: { questionNumber?: number; question: string; options: string[]; correctIndex?: number }
): string {
  const labels = ["A", "B", "C", "D"];
  const optionsHTML = data.options
    .map(
      (opt, i) => `
      <div class="w-full px-8 py-6 text-2xl font-medium leading-relaxed tracking-wide rounded-xl border-b-4 bg-white border-slate-300 text-slate-800 shadow-lg shadow-slate-400/20">
        <span class="flex items-center gap-4">
          <span class="text-3xl font-bold" style="color: var(--primary-color);">${labels[i]}</span>
          <span class="flex-1 text-left">${opt}</span>
        </span>
      </div>
    `
    )
    .join("");

  return `
    <div class="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200"></div>
    <div class="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-30" style="background-color: var(--primary-color);"></div>
    <div class="absolute flex flex-col" style="top: ${spec.safeZone.top}px; bottom: ${spec.safeZone.bottom}px; left: ${spec.safeZone.left}px; right: ${spec.safeZone.right}px;">
      <div class="px-4 py-4">
        <div class="h-2 bg-slate-300 rounded-full overflow-hidden">
          <div class="h-full rounded-full" style="width: 70%; background-color: var(--primary-color);"></div>
        </div>
      </div>
      <div class="flex-1 flex flex-col justify-center px-8">
        <span class="text-8xl font-bold mb-6" style="color: var(--primary-color);">Q${data.questionNumber || 1}.</span>
        <h2 class="text-4xl font-bold text-slate-800 leading-relaxed tracking-wide mb-12 whitespace-pre-line">${data.question}</h2>
        <div class="flex flex-col gap-5">
          ${optionsHTML}
        </div>
      </div>
      <div class="px-8 py-6 text-center"><p class="text-xl text-slate-500 tracking-wide">タップして回答 →</p></div>
    </div>
  `;
}

/**
 * フレームをPuppeteerでレンダリングして画像バッファを返す
 */
export async function renderFrame(
  frameType: FrameType,
  aspectRatio: AspectRatio,
  data: Record<string, unknown>,
  options: RenderOptions
): Promise<RenderResult> {
  const spec = CANVAS_SPECS[aspectRatio];
  const brand: BrandConfig = {
    ...DEFAULT_BRAND,
    ...(data.brand as Partial<BrandConfig>),
  };

  const cssVars = `
    --primary-color: ${brand.primaryColor};
    --font-stack: ${brand.fontStack === "serif" ? "'Noto Serif JP', serif" : "'Noto Sans JP', sans-serif"};
    --radius-md: ${brand.radiusStyle === "pop" ? "1rem" : "0px"};
  `;

  const frameHTML = generateFrameHTML(frameType, aspectRatio, data, brand);

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    ${FONT_CSS}
    ${TAILWIND_BASE}
    :root {
      ${cssVars}
    }
    #canvas {
      width: ${spec.width}px;
      height: ${spec.height}px;
      position: relative;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div id="canvas">
    ${frameHTML}
  </div>
</body>
</html>
  `;

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({
      width: spec.width,
      height: spec.height,
      deviceScaleFactor: 1,
    });

    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    // フォントの読み込みを待つ
    await page.evaluate(() => document.fonts.ready);

    // 少し待機して完全にレンダリングされるのを待つ
    await new Promise((resolve) => setTimeout(resolve, 500));

    const canvas = await page.$("#canvas");
    if (!canvas) {
      throw new Error("Canvas element not found");
    }

    const buffer = await canvas.screenshot({
      type: options.format,
      quality: options.format === "jpeg" ? options.quality || 90 : undefined,
    });

    return {
      buffer: Buffer.from(buffer),
      width: spec.width,
      height: spec.height,
      format: options.format,
    };
  } finally {
    await page.close();
  }
}
