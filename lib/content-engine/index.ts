/**
 * Marty Content Engine
 *
 * SNSコンテンツ生成エンジン
 * React + Tailwind CSSによるPixel Perfect実装
 *
 * Design System v2.0 / Functional Requirements v2.0 準拠
 */

// Types
export * from "./types";

// Components
export { Canvas } from "./components/Canvas";

// Frame 1: LINE風チャット (The Talk)
export { Frame1Chat, SAMPLE_CHAT_MESSAGES } from "./components/Frame1Chat";

// Frame 2: 雑誌見出し風 (The Magazine)
export { Frame2Magazine, SAMPLE_MAGAZINE_DATA } from "./components/Frame2Magazine";

// Frame 3: メモ風 (The Memo)
export { Frame3Memo, SAMPLE_MEMO_DATA } from "./components/Frame3Memo";

// Frame 4: 映画字幕風 (The Cinema)
export { Frame4Cinema, SAMPLE_CINEMA_DATA } from "./components/Frame4Cinema";

// Frame 5: クイズ (The Quiz)
export { Frame5Quiz, SAMPLE_QUIZ_DATA } from "./components/Frame5Quiz";
